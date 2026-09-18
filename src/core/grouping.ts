import {
  DIET_TYPES,
  FOOD_CATEGORIES,
  FOOD_REGIONS,
  ITEM_TYPES,
  MEAL_TYPES,
  PREP_STYLES,
} from "./schema";
import type { FoodItem } from "./schema";

/**
 * Grouping the food list by one facet. Pure and DOM-free so the same logic can
 * drive a future React Native list — the UI only renders what this returns.
 */
export const GROUP_KEYS = [
  "none",
  "category",
  "mealType",
  "region",
  "prep",
  "itemType",
  "diet",
] as const;
export type GroupKey = (typeof GROUP_KEYS)[number];

export const GROUP_LABELS: Record<GroupKey, string> = {
  none: "None",
  category: "Category",
  mealType: "Meal type",
  region: "Region",
  prep: "Preparation",
  itemType: "Type",
  diet: "Diet",
};

/** Bucket for foods that carry no value for the chosen facet. Always sorts last. */
export const UNCLASSIFIED = "Unclassified";

export interface FoodGroup {
  key: string;
  label: string;
  foods: FoodItem[];
}

/** Display labels for the facet values that aren't already title-case. */
const VALUE_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
  dessert: "Dessert",
  side: "Side",
  raw: "Raw",
  boiled: "Boiled",
  steamed: "Steamed",
  sauteed: "Sauteed",
  fried: "Fried",
  deepFried: "Deep-fried",
  fermented: "Fermented",
  roasted: "Roasted",
  baked: "Baked",
  dried: "Dried",
  ingredient: "Ingredient",
  dish: "Dish",
  veg: "Vegetarian",
  vegan: "Vegan",
  nonveg: "Non-vegetarian",
};

/** The canonical value order per facet; anything unknown sorts after these. */
const ORDER: Record<Exclude<GroupKey, "none">, readonly string[]> = {
  category: FOOD_CATEGORIES,
  mealType: MEAL_TYPES,
  region: FOOD_REGIONS,
  prep: PREP_STYLES,
  itemType: ITEM_TYPES,
  diet: DIET_TYPES,
};

/** The facet value(s) a food belongs to. Multi-valued facets return several. */
function valuesFor(food: FoodItem, key: Exclude<GroupKey, "none">): string[] {
  switch (key) {
    case "category":
      return food.category ? [food.category] : [];
    case "mealType":
      return food.mealTypes;
    case "region":
      return food.region ? [food.region] : [];
    case "prep":
      return food.prep ? [food.prep] : [];
    case "itemType":
      return food.itemType ? [food.itemType] : [];
    case "diet":
      return food.dietTypes;
  }
}

/**
 * Group foods by one facet.
 *
 * - `none` returns a single group holding everything (the UI then renders its
 *   usual flat grid).
 * - Multi-valued facets (mealType, diet) put a food in *every* matching group.
 * - Foods with no value land in `UNCLASSIFIED`, which always sorts last.
 * - Known enum values keep their enum order; unknown values (a user's custom
 *   category) sort alphabetically after them. Empty groups are dropped.
 */
export function groupFoods(foods: FoodItem[], key: GroupKey): FoodGroup[] {
  if (key === "none") {
    return foods.length === 0
      ? []
      : [{ key: "all", label: "All foods", foods }];
  }

  const buckets = new Map<string, FoodItem[]>();
  for (const food of foods) {
    const values = valuesFor(food, key);
    const keys = values.length > 0 ? values : [UNCLASSIFIED];
    for (const value of keys) {
      const bucket = buckets.get(value);
      if (bucket) bucket.push(food);
      else buckets.set(value, [food]);
    }
  }

  const order = ORDER[key];
  const rank = (value: string) => {
    if (value === UNCLASSIFIED) return Number.MAX_SAFE_INTEGER;
    const i = order.indexOf(value);
    return i === -1 ? order.length : i;
  };

  return [...buckets.entries()]
    .map(([value, items]) => ({
      key: value,
      label: VALUE_LABELS[value] ?? value,
      foods: items,
    }))
    .sort((a, b) => {
      const byRank = rank(a.key) - rank(b.key);
      return byRank !== 0 ? byRank : a.key.localeCompare(b.key);
    });
}
