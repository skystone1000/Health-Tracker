import {
  MACRO_KEYS,
  MINERAL_KEYS,
  NUTRIENT_KEYS,
  VITAMIN_KEYS,
  type FoodItem,
  type Meal,
  type NutrientKey,
  type NutrientVector,
  type Nutrients,
  type Plan,
} from "./schema";

/** Empty nutrient vector (all zeros). */
export function emptyVector(): NutrientVector {
  const v = {} as NutrientVector;
  for (const key of NUTRIENT_KEYS) v[key] = 0;
  return v;
}

/** Flatten a food's grouped nutrients into a flat vector (per reference qty). */
export function toVector(n: Nutrients): NutrientVector {
  return {
    energy_kcal: n.energy_kcal,
    ...n.macros,
    ...n.vitamins,
    ...n.minerals,
  };
}

/** Rebuild the grouped Nutrients shape from a flat vector (inverse of toVector). */
export function vectorToNutrients(v: NutrientVector): Nutrients {
  const pick = <T extends readonly NutrientKey[]>(keys: T) =>
    Object.fromEntries(keys.map((k) => [k, v[k] ?? 0]));
  return {
    energy_kcal: v.energy_kcal ?? 0,
    macros: pick(MACRO_KEYS) as Nutrients["macros"],
    vitamins: pick(VITAMIN_KEYS) as Nutrients["vitamins"],
    minerals: pick(MINERAL_KEYS) as Nutrients["minerals"],
  };
}

/** Nutrients contributed by `quantity` of a food (scaled from reference qty). */
export function nutrientsForQuantity(
  food: FoodItem,
  quantity: number,
): NutrientVector {
  const factor = quantity / food.referenceQuantity;
  const base = toVector(food.nutrients);
  const out = {} as NutrientVector;
  for (const key of NUTRIENT_KEYS) out[key] = (base[key] ?? 0) * factor;
  return out;
}

/** Sum any number of nutrient vectors. */
export function sumVectors(vectors: NutrientVector[]): NutrientVector {
  const out = emptyVector();
  for (const v of vectors) {
    for (const key of NUTRIENT_KEYS) out[key] += v[key] ?? 0;
  }
  return out;
}

/** Totals for a single meal. */
export function mealTotals(
  meal: Meal,
  foodsById: Map<string, FoodItem>,
): NutrientVector {
  const vectors = meal.items
    .map((item) => {
      const food = foodsById.get(item.foodId);
      return food ? nutrientsForQuantity(food, item.quantity) : null;
    })
    .filter((v): v is NutrientVector => v !== null);
  return sumVectors(vectors);
}

/** Totals across a whole plan (all meals). */
export function planTotals(
  plan: Plan,
  foodsById: Map<string, FoodItem>,
): NutrientVector {
  return sumVectors(plan.meals.map((m) => mealTotals(m, foodsById)));
}

export interface NutrientProgress {
  key: NutrientKey;
  value: number;
  target: number;
  remaining: number;
  pct: number; // 0..100+ (% of target met)
}

/** Compare totals against targets, key by key. */
export function progressVsTarget(
  totals: NutrientVector,
  targets: NutrientVector,
): NutrientProgress[] {
  return NUTRIENT_KEYS.map((key) => {
    const value = totals[key] ?? 0;
    const target = targets[key] ?? 0;
    const pct = target > 0 ? (value / target) * 100 : 0;
    return {
      key,
      value,
      target,
      remaining: Math.max(target - value, 0),
      pct,
    };
  });
}
