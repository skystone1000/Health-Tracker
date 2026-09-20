import { todayISO } from "./date";
import { applyFilters } from "./filters";
import { quantityForKcal } from "./food-groups";
import { computeTargets, type MacroSplit } from "./nutrition-engine";
import {
  type FoodItem,
  type NutrientVector,
  type Plan,
  type RdaTable,
  type UserProfile,
} from "./schema";
import { toVector } from "./totals";

/**
 * The planner is layered — each layer builds on the one below, reusing the
 * same engine and filters (no duplicated logic):
 *   Layer 1  computeTargets()      → target panel only
 *   Layer 2  createEmptyPlan()     → editable meals the user fills
 *   Layer 3  autoGeneratePlan()    → greedy fill producing a Layer-2 plan
 */

export const DEFAULT_MEAL_NAMES = ["Breakfast", "Lunch", "Dinner", "Snacks"];

/** Share of daily calories allotted to each default meal. */
const MEAL_KCAL_SHARE: Record<string, number> = {
  Breakfast: 0.25,
  Lunch: 0.35,
  Dinner: 0.3,
  Snacks: 0.1,
};

// Layer 1 — re-export so callers have one planner entry point.
export { computeTargets };

// Layer 2 -------------------------------------------------------------------

/** Create an empty plan with the default meal structure. */
export function createEmptyPlan(
  date: string = todayISO(),
  mealNames: string[] = DEFAULT_MEAL_NAMES,
): Plan {
  return {
    id: `plan-${date}`,
    date,
    meals: mealNames.map((name) => ({ name, items: [] })),
  };
}

// Layer 3 -------------------------------------------------------------------

const proteinPer100kcal = (f: FoodItem) => {
  const v = toVector(f.nutrients);
  return (v.protein_g / (v.energy_kcal || 1)) * 100;
};

function pick<T>(arr: T[], index: number): T | undefined {
  return arr.length ? arr[index % arr.length] : undefined;
}

/**
 * Deterministically assemble a full day's plan that approaches the calorie/
 * protein targets while respecting diet type and exclusions. For each meal it
 * draws one protein-rich, one carb-rich and one produce item from rotating
 * buckets (variety across meals) and scales quantities to the meal's kcal share.
 */
/**
 * Categories that are never auto-planned as a food in their own right. Oil,
 * sugar and spices are cooking inputs — high in energy or carbs by mass, so the
 * carb/protein buckets below would otherwise happily serve you 40 g of
 * turmeric. They remain fully usable in recipes and manual meal building.
 */
export const NON_PLANNABLE_CATEGORIES: string[] = [
  "Fats & Oils",
  "Spices & Condiments",
];

export function autoGeneratePlan(
  profile: UserProfile,
  targetCalories: number,
  foods: FoodItem[],
  options: { mealNames?: string[]; date?: string } = {},
): Plan {
  const mealNames = options.mealNames ?? DEFAULT_MEAL_NAMES;
  const plan = createEmptyPlan(options.date ?? todayISO(), mealNames);

  const available = applyFilters(foods, {
    dietType: profile.dietType,
    exclusions: profile.exclusions,
  }).filter((f) => !NON_PLANNABLE_CATEGORIES.includes(f.category));
  if (available.length === 0) return plan;

  const proteinFoods = [...available].sort(
    (a, b) => proteinPer100kcal(b) - proteinPer100kcal(a),
  );
  const produceFoods = available.filter((f) =>
    ["Vegetables", "Fruits"].includes(f.category),
  );
  const carbFoods = available.filter(
    (f) => toVector(f.nutrients).carbs_g >= 15 && !produceFoods.includes(f),
  );

  plan.meals.forEach((meal, mealIndex) => {
    const mealKcal = targetCalories * (MEAL_KCAL_SHARE[meal.name] ?? 0.25);
    const chosen: FoodItem[] = [];

    const protein = pick(proteinFoods, mealIndex);
    if (protein) chosen.push(protein);
    const carb = pick(
      carbFoods.filter((f) => f.id !== protein?.id),
      mealIndex,
    );
    if (carb) chosen.push(carb);
    const produce = pick(
      produceFoods.filter((f) => !chosen.some((c) => c.id === f.id)),
      mealIndex,
    );
    if (produce) chosen.push(produce);

    // Distribute the meal's calories: protein 40%, carb 45%, produce 15%.
    const shares = [0.4, 0.45, 0.15];
    meal.items = chosen.map((food, i) => ({
      foodId: food.id,
      quantity: quantityForKcal(food, mealKcal * (shares[i] ?? 0.2)),
    }));
  });

  return plan;
}

/** Convenience wrapper: compute targets then auto-generate against them. */
export function generateRecommendedPlan(
  profile: UserProfile,
  rda: RdaTable,
  foods: FoodItem[],
  split?: MacroSplit,
): { targets: NutrientVector; plan: Plan } {
  const { targets, calories } = computeTargets(profile, rda, split);
  const plan = autoGeneratePlan(profile, calories, foods);
  return { targets, plan };
}
