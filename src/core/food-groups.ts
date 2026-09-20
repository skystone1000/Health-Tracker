import type { DietType, FoodItem } from "./schema";

/**
 * The food-group ("plate") layer of the planner.
 *
 * `core/nutrition-engine.ts` says how many calories and grams of each nutrient
 * a user needs; it says nothing about *which foods* those should come from.
 * This module adds that layer, using ICMR-NIN "My Plate for the Day" (Dietary
 * Guidelines for Indians, 2024) — the same body whose RDA table the app already
 * ships, so the advice never comes from two authorities at once.
 *
 * Named `PlateGroup`, not `FoodGroup`, because `core/grouping.ts` already
 * exports a `FoodGroup` interface for the food list's UI buckets.
 */
export const PLATE_GROUPS = [
  "cereals",
  "pulses",
  "flesh",
  "dairy",
  "vegetables",
  "fruits",
  "nutsSeeds",
  "sweets",
  "beverages",
  "fatsOils",
  "condiments",
  "other",
] as const;
export type PlateGroup = (typeof PLATE_GROUPS)[number];

/**
 * `FOOD_CATEGORIES` (schema.ts) → plate group. A new food category MUST get an
 * entry here, or its foods silently fall into "other" and are planned last —
 * `food-groups.test.ts` guards the mapping.
 */
export const CATEGORY_TO_PLATE_GROUP: Record<string, PlateGroup> = {
  "Grains & Cereals": "cereals",
  "Legumes & Pulses": "pulses",
  Eggs: "flesh",
  "Meat & Seafood": "flesh",
  Dairy: "dairy",
  Vegetables: "vegetables",
  Fruits: "fruits",
  "Nuts, Seeds & Dry Fruits": "nutsSeeds",
  "Sweets & Desserts": "sweets",
  Beverages: "beverages",
  "Fats & Oils": "fatsOils",
  "Spices & Condiments": "condiments",
};

/** The plate group a food belongs to ("other" for a user's custom category). */
export function plateGroup(food: FoodItem): PlateGroup {
  return CATEGORY_TO_PLATE_GROUP[food.category] ?? "other";
}

/**
 * Cooking inputs. Oil, sugar and spices are energy- or carb-dense by mass, so a
 * calorie-driven picker would happily serve 40 g of turmeric. They stay fully
 * usable in recipes and in the manual meal builder.
 */
export const NON_PLANNABLE_GROUPS: PlateGroup[] = ["fatsOils", "condiments"];

export const PLANNABLE_GROUPS: PlateGroup[] = PLATE_GROUPS.filter(
  (g) => !NON_PLANNABLE_GROUPS.includes(g),
);

export function isPlannable(food: FoodItem): boolean {
  return !NON_PLANNABLE_GROUPS.includes(plateGroup(food));
}

/** The calorie level the published ICMR quantities are stated for. */
export const REFERENCE_KCAL = 2000;

/**
 * ICMR-NIN "My Plate for the Day", grams/day at 2000 kcal.
 * `protein` is the guideline's combined "pulses, eggs and flesh foods"
 * allowance — `dailyQuotas` splits it by diet type.
 */
export const PLATE_QUOTA_2000 = {
  cereals: 250,
  protein: 85,
  dairy: 300,
  vegetables: 400,
  fruits: 100,
  nutsSeeds: 35,
} as const;

/** Share of the combined protein allowance that goes to flesh foods (nonveg). */
export const NONVEG_FLESH_SHARE = 0.45;

/**
 * Vegan multiplier for pulses and nuts/seeds. The guideline publishes no vegan
 * plate; dropping 300 g of milk removes protein, calcium and B-vitamins, so we
 * grow the two groups that can carry them. Documented as ours, not ICMR's.
 */
export const VEGAN_REPLACEMENT_FACTOR = 1.3;

export type PlateQuotas = Record<PlateGroup, number>;

/**
 * Daily grams per plate group for this user — ICMR quantities scaled linearly
 * to their calorie target and adapted to their diet type.
 */
export function dailyQuotas(
  targetCalories: number,
  dietType: DietType,
): PlateQuotas {
  const scale = Math.max(0, targetCalories) / REFERENCE_KCAL;
  const quotas = {} as PlateQuotas;
  for (const group of PLATE_GROUPS) quotas[group] = 0;

  const protein = PLATE_QUOTA_2000.protein * scale;
  const vegan = dietType === "vegan";

  quotas.cereals = PLATE_QUOTA_2000.cereals * scale;
  quotas.vegetables = PLATE_QUOTA_2000.vegetables * scale;
  quotas.fruits = PLATE_QUOTA_2000.fruits * scale;
  quotas.dairy = vegan ? 0 : PLATE_QUOTA_2000.dairy * scale;
  quotas.nutsSeeds =
    PLATE_QUOTA_2000.nutsSeeds * scale * (vegan ? VEGAN_REPLACEMENT_FACTOR : 1);

  if (dietType === "nonveg") {
    quotas.flesh = protein * NONVEG_FLESH_SHARE;
    quotas.pulses = protein * (1 - NONVEG_FLESH_SHARE);
  } else {
    quotas.flesh = 0;
    quotas.pulses = protein * (vegan ? VEGAN_REPLACEMENT_FACTOR : 1);
  }

  return quotas;
}

/** Grams of a food that supply `kcal` calories, rounded to 5 g (min 5 g). */
export function quantityForKcal(food: FoodItem, kcal: number): number {
  const perRef = food.nutrients.energy_kcal || 1;
  const grams = (kcal / perRef) * food.referenceQuantity;
  return Math.max(5, Math.round(grams / 5) * 5);
}

/**
 * Sane serving range per plate group, in grams. Without these a low-density
 * food asked to carry 700 kcal turns into 1.4 kg of cucumber.
 */
export const PORTION_BOUNDS: Record<PlateGroup, { min: number; max: number }> = {
  cereals: { min: 30, max: 200 },
  pulses: { min: 25, max: 200 },
  flesh: { min: 50, max: 200 },
  dairy: { min: 50, max: 250 },
  vegetables: { min: 50, max: 250 },
  fruits: { min: 50, max: 200 },
  nutsSeeds: { min: 10, max: 45 },
  sweets: { min: 20, max: 60 },
  beverages: { min: 100, max: 250 },
  fatsOils: { min: 5, max: 15 },
  condiments: { min: 1, max: 10 },
  other: { min: 20, max: 200 },
};

/**
 * A composed dish (`itemType: "dish"`) is measured cooked, so a normal plate of
 * it weighs far more than a raw ingredient's serving — khichdi is 300 g, rice
 * flour is not.
 */
export const DISH_BOUNDS = { min: 100, max: 400 } as const;

export function portionBounds(food: FoodItem): { min: number; max: number } {
  if (food.itemType === "dish") return { ...DISH_BOUNDS };
  return { ...PORTION_BOUNDS[plateGroup(food)] };
}

/** Pull a quantity into the food's sane range and round it to 5 g. */
export function clampPortion(food: FoodItem, grams: number): number {
  const { min, max } = portionBounds(food);
  const rounded = Math.round(Math.min(Math.max(grams, min), max) / 5) * 5;
  return Math.max(5, rounded);
}
