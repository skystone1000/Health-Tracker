import {
  clampPortion,
  plateGroup,
  portionBounds,
  quantityForKcal,
  type PlateGroup,
  type PlateQuotas,
} from "./food-groups";
import { pickWeighted, type Rng } from "./random";
import type { FoodItem, MealType, Plan, UserProfile } from "./schema";
import { planTotals, toVector } from "./totals";

/**
 * Layer 3.5 — build ONE balanced day.
 *
 * Unlike `planner.ts`'s `autoGeneratePlan` (index rotation over three buckets),
 * this picks each item with a *weighted random draw* over the ICMR plate-group
 * quotas, so two runs with different seeds give two different, equally valid
 * days. The week engine (`week-planner.ts`) calls this once per day, threading
 * a shared usage history so the days differ from each other too.
 */

/** A meal draws from these; `protein` resolves to pulses or flesh by diet. */
export type Slot = PlateGroup | "protein";

export interface MealTemplate {
  name: string;
  /** Facet matched against `food.mealTypes`. */
  mealType: MealType;
  /** Share of the day's calories. */
  kcalShare: number;
  slots: Slot[];
}

/**
 * Four meals at the shares the app already uses (25/35/30/10), now with the
 * plate groups each one should draw from. Breakfast gets cereal + dairy +
 * fruit; the two main meals get cereal + protein + vegetable.
 */
export const DEFAULT_MEAL_TEMPLATES: MealTemplate[] = [
  {
    name: "Breakfast",
    mealType: "breakfast",
    kcalShare: 0.25,
    slots: ["cereals", "dairy", "fruits"],
  },
  {
    name: "Lunch",
    mealType: "lunch",
    kcalShare: 0.35,
    slots: ["cereals", "protein", "vegetables", "dairy"],
  },
  {
    name: "Dinner",
    mealType: "dinner",
    kcalShare: 0.3,
    slots: ["cereals", "protein", "vegetables"],
  },
  {
    name: "Snacks",
    mealType: "snack",
    kcalShare: 0.1,
    slots: ["nutsSeeds", "fruits"],
  },
];

/** Relative share of a meal's calories per slot (normalised over used slots). */
const SLOT_KCAL_WEIGHT: Record<Slot, number> = {
  cereals: 4,
  protein: 3,
  pulses: 3,
  flesh: 3,
  dairy: 1.5,
  vegetables: 1.5,
  fruits: 1.5,
  nutsSeeds: 1,
  sweets: 1,
  beverages: 0.5,
  fatsOils: 0,
  condiments: 0,
  other: 1.5,
};

/**
 * How many days a week one food may appear. Staples are *meant* to recur — no
 * dietician asks for a different grain every day — while the sabji and the dal
 * are the variety levers.
 */
export const WEEKLY_REPEAT_CAP: Record<PlateGroup, number> = {
  cereals: 7,
  dairy: 7,
  beverages: 7,
  pulses: 3,
  flesh: 3,
  fruits: 3,
  nutsSeeds: 4,
  vegetables: 2,
  sweets: 2,
  other: 3,
  fatsOils: 7,
  condiments: 7,
};

/** Running memory of what the week has used so far. */
export interface UsageHistory {
  dayIndex: number;
  /** foodId → index of the last day it was used on. */
  lastUsedDay: Map<string, number>;
  /** foodId → number of days it has been used this week. */
  useCount: Map<string, number>;
  /** foodIds already used today. */
  usedToday: Set<string>;
  /** Grams already planned per plate group today. */
  gramsToday: Map<PlateGroup, number>;
}

export function emptyHistory(): UsageHistory {
  return {
    dayIndex: 0,
    lastUsedDay: new Map(),
    useCount: new Map(),
    usedToday: new Set(),
    gramsToday: new Map(),
  };
}

/** Move the history on to a new day (clears the per-day parts). */
export function startDay(history: UsageHistory, dayIndex: number): void {
  history.dayIndex = dayIndex;
  history.usedToday = new Set();
  history.gramsToday = new Map();
}

/** Record that `grams` of `food` were planned today. */
export function recordUse(
  history: UsageHistory,
  food: FoodItem,
  grams: number,
): void {
  const group = plateGroup(food);
  history.usedToday.add(food.id);
  history.gramsToday.set(group, (history.gramsToday.get(group) ?? 0) + grams);
  if (history.lastUsedDay.get(food.id) !== history.dayIndex) {
    history.useCount.set(food.id, (history.useCount.get(food.id) ?? 0) + 1);
    history.lastUsedDay.set(food.id, history.dayIndex);
  }
}

export interface DayPlanContext {
  date: string;
  profile: UserProfile;
  targetCalories: number;
  targetProtein: number;
  /** Already diet-filtered and plannable. */
  foods: FoodItem[];
  quotas: PlateQuotas;
  history: UsageHistory;
  rng: Rng;
}

/** 1 when the food is tagged for this meal, 0.35 when untagged, 0.08 otherwise. */
function mealFit(food: FoodItem, mealType: MealType): number {
  if (food.mealTypes.length === 0) return 0.35; // half-faceted DB must not starve
  return food.mealTypes.includes(mealType) ? 1 : 0.08;
}

/** 0 blocks the food; otherwise recent and frequent use is penalised. */
function varietyWeight(food: FoodItem, history: UsageHistory): number {
  if (history.usedToday.has(food.id)) return 0;
  const used = history.useCount.get(food.id) ?? 0;
  if (used >= (WEEKLY_REPEAT_CAP[plateGroup(food)] ?? 3)) return 0;
  const last = history.lastUsedDay.get(food.id);
  const gap = last === undefined ? 99 : history.dayIndex - last;
  const recency = gap <= 1 ? 0.15 : gap === 2 ? 0.5 : 1;
  return recency / (1 + used);
}

/** How far this food's group still is from its daily quota (0.05..1). */
function quotaWeight(
  group: PlateGroup,
  quotas: PlateQuotas,
  history: UsageHistory,
): number {
  const quota = quotas[group] ?? 0;
  if (quota <= 0) return 0.25; // no published quota (sweets, beverages)
  const used = history.gramsToday.get(group) ?? 0;
  return Math.max(0.05, (quota - used) / quota);
}

/**
 * Nudge towards protein-dense foods while the day is short on protein.
 *
 * The cap is deliberately mild. A stronger bias (perKcal/6 capped at 2) was
 * measured and made vegan days better (16 % of energy from protein) but veg and
 * nonveg days worse (12.9 % / 13.3 %); this setting holds all three diets at
 * 13.4-14.1 %, which is the better worst case. The structural fix for vegan
 * days is SLOT_FALLBACK below, not a heavier thumb on the scale here.
 */
function proteinBias(food: FoodItem, deficitRatio: number): number {
  if (deficitRatio <= 0) return 1;
  const v = toVector(food.nutrients);
  const perKcal = (v.protein_g / (v.energy_kcal || 1)) * 100;
  return 1 + deficitRatio * Math.min(perKcal / 10, 1.5);
}

/**
 * What a slot becomes when its own group is empty for this user. A vegan has no
 * dairy, so without this the dairy slot simply vanishes and its calories are
 * handed to the cereal and fruit slots — pushing the day's protein share down.
 * Falling back to a plant protein is what a vegan diet actually does (soy,
 * tofu, nuts in place of milk and curd), and it keeps the plate's shape.
 */
const SLOT_FALLBACK: Partial<Record<Slot, Slot>> = {
  dairy: "protein",
  flesh: "protein",
  fruits: "nutsSeeds",
};

function candidatesForSlot(
  slot: Slot,
  foods: FoodItem[],
  dietType: UserProfile["dietType"],
): FoodItem[] {
  if (slot === "protein") {
    const groups: PlateGroup[] =
      dietType === "nonveg" ? ["pulses", "flesh"] : ["pulses"];
    return foods.filter((f) => groups.includes(plateGroup(f)));
  }
  return foods.filter((f) => plateGroup(f) === slot);
}

/**
 * Build one day. Every slot that finds a candidate contributes an item; slots
 * that come up empty (no dairy in a vegan DB, no fruit left under the repeat
 * cap) simply hand their calories to the rest of the meal.
 */
export function generateDayPlan(
  ctx: DayPlanContext,
  templates: MealTemplate[] = DEFAULT_MEAL_TEMPLATES,
): Plan {
  const plan: Plan = {
    id: `plan-${ctx.date}`,
    date: ctx.date,
    meals: templates.map((t) => ({ name: t.name, items: [] })),
  };
  if (ctx.foods.length === 0) return plan;

  let proteinSoFar = 0;

  templates.forEach((template, mealIndex) => {
    const mealKcal = ctx.targetCalories * template.kcalShare;
    const deficitRatio =
      ctx.targetProtein > 0
        ? Math.max(0, (ctx.targetProtein - proteinSoFar) / ctx.targetProtein)
        : 0;

    // 1. Choose a food per slot (weighted random — this is what makes two
    //    seeds give two different days).
    const chosen: { food: FoodItem; slot: Slot }[] = [];
    for (const templateSlot of template.slots) {
      let slot = templateSlot;
      let pool = candidatesForSlot(slot, ctx.foods, ctx.profile.dietType);
      // Nothing available for this slot (no dairy for a vegan, no fruit left
      // under the repeat cap)? Fall back rather than dropping the slot.
      if (pool.length === 0) {
        const fallback = SLOT_FALLBACK[slot];
        if (fallback) {
          slot = fallback;
          pool = candidatesForSlot(slot, ctx.foods, ctx.profile.dietType);
        }
      }
      const food = pickWeighted(
        pool,
        (f) =>
          quotaWeight(plateGroup(f), ctx.quotas, ctx.history) *
          mealFit(f, template.mealType) *
          varietyWeight(f, ctx.history) *
          proteinBias(f, deficitRatio),
        ctx.rng,
      );
      if (food) {
        chosen.push({ food, slot });
        // Reserve it immediately so a later slot in the same meal cannot
        // pick it again.
        ctx.history.usedToday.add(food.id);
      }
    }

    // 2. Split the meal's calories over the slots that produced an item.
    const weightSum = chosen.reduce(
      (sum, c) => sum + (SLOT_KCAL_WEIGHT[c.slot] || 1),
      0,
    );

    plan.meals[mealIndex].items = chosen.map(({ food, slot }) => {
      const share = (SLOT_KCAL_WEIGHT[slot] || 1) / (weightSum || 1);
      const quantity = clampPortion(food, quantityForKcal(food, mealKcal * share));
      recordUse(ctx.history, food, quantity);
      proteinSoFar +=
        (toVector(food.nutrients).protein_g / food.referenceQuantity) * quantity;
      return { foodId: food.id, quantity };
    });
  });

  const foodsById = new Map(ctx.foods.map((f) => [f.id, f]));
  const balanced = balanceDay(
    plan,
    foodsById,
    ctx.targetCalories,
    ctx.targetProtein,
  );

  // Selection recorded pre-balance grams (so quota pressure decays *during*
  // the day — that is what rotates pulses vs flesh for an omnivore). Rebuild
  // the day's group totals from the final quantities so the week's accounting
  // matches what the user will actually eat.
  ctx.history.gramsToday = new Map();
  for (const meal of balanced.meals) {
    for (const item of meal.items) {
      const food = foodsById.get(item.foodId);
      if (!food) continue;
      const group = plateGroup(food);
      ctx.history.gramsToday.set(
        group,
        (ctx.history.gramsToday.get(group) ?? 0) + item.quantity,
      );
    }
  }

  return balanced;
}

// ---------------------------------------------------------------------------
// Repair pass — the guarantee behind "balanced"
// ---------------------------------------------------------------------------

/** A day's energy must land inside this multiple of the target. */
export const KCAL_BAND = { min: 0.92, max: 1.08 } as const;

/** A day must reach this share of the protein target. */
export const PROTEIN_FLOOR = 0.9;

const MAX_PASSES = 6;

/** Grams trade passes for the protein floor (each moves one item up, some down). */
const PROTEIN_PASSES = 12;

const roundTo5 = (grams: number) => Math.round(grams / 5) * 5;

function allItems(plan: Plan) {
  return plan.meals.flatMap((meal) => meal.items);
}

function proteinDensity(food: FoodItem): number {
  const v = toVector(food.nutrients);
  return v.protein_g / (v.energy_kcal || 1);
}

/**
 * Scale every item by `factor`, clamped to each food's portion bounds. Returns
 * true when at least one quantity actually moved (false ⇒ everything is pinned
 * at a bound and further passes are pointless).
 */
function scaleItems(
  plan: Plan,
  foodsById: Map<string, FoodItem>,
  factor: number,
): boolean {
  let moved = false;
  for (const item of allItems(plan)) {
    const food = foodsById.get(item.foodId);
    if (!food) continue;
    const { min, max } = portionBounds(food);
    const next = roundTo5(Math.min(Math.max(item.quantity * factor, min), max));
    if (next !== item.quantity) {
      item.quantity = Math.max(5, next);
      moved = true;
    }
  }
  return moved;
}

/**
 * Bring a day inside the calorie band and over the protein floor, only ever
 * changing quantities (never the food choices — those carry the variety and
 * meal-fit decisions made above).
 *
 * Order matters: calories first, then protein (growing the protein-dense items
 * usually costs few calories), then one final trim so the protein top-up cannot
 * push the day back over its ceiling. Pure — returns a new plan.
 */
export function balanceDay(
  plan: Plan,
  foodsById: Map<string, FoodItem>,
  targetCalories: number,
  targetProtein: number,
): Plan {
  const next = structuredClone(plan);
  if (allItems(next).length === 0 || targetCalories <= 0) return next;

  // 1. Calories into band.
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const kcal = planTotals(next, foodsById).energy_kcal;
    if (kcal <= 0) break;
    const ratio = targetCalories / kcal;
    if (ratio >= KCAL_BAND.min && ratio <= KCAL_BAND.max) break;
    if (!scaleItems(next, foodsById, ratio)) break;
  }

  // 2. Protein floor — shift calories from the least protein-dense items to the
  //    most. Growing alone does not work: the day is already at its calorie
  //    ceiling, so step 3 would just scale the gain back off again. Trading
  //    grams between items raises protein at (roughly) constant energy.
  if (targetProtein > 0) {
    const ranked = allItems(next)
      .map((item) => ({ item, food: foodsById.get(item.foodId) }))
      .filter((x): x is { item: (typeof x)["item"]; food: FoodItem } => !!x.food)
      .sort((a, b) => proteinDensity(b.food) - proteinDensity(a.food));

    for (let pass = 0; pass < PROTEIN_PASSES; pass++) {
      if (planTotals(next, foodsById).protein_g >= targetProtein * PROTEIN_FLOOR) break;
      let changed = false;

      // Grow the densest item that still has headroom.
      for (const { item, food } of ranked) {
        const grown = roundTo5(Math.min(item.quantity * 1.25, portionBounds(food).max));
        if (grown > item.quantity) {
          item.quantity = grown;
          changed = true;
          break;
        }
      }

      // Pay for those calories from the least dense items, lowest first.
      for (let i = ranked.length - 1; i >= 0; i--) {
        if (planTotals(next, foodsById).energy_kcal <= targetCalories * KCAL_BAND.max) break;
        const { item, food } = ranked[i];
        const shrunk = roundTo5(Math.max(item.quantity * 0.8, portionBounds(food).min));
        if (shrunk < item.quantity) {
          item.quantity = shrunk;
          changed = true;
        }
      }

      if (!changed) break;
    }
  }

  // 3. Final ceiling trim, so the protein top-up cannot overshoot the day.
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const kcal = planTotals(next, foodsById).energy_kcal;
    if (kcal <= targetCalories * KCAL_BAND.max || kcal <= 0) break;
    if (!scaleItems(next, foodsById, (targetCalories / kcal) * 1.02)) break;
  }

  return next;
}
