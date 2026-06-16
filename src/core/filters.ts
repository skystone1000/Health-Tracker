import type { DietType, FoodItem } from "./schema";

export interface FilterCriteria {
  dietType: DietType;
  exclusions?: string[];
  search?: string;
  category?: string;
}

/**
 * Does a set of diet tags satisfy the chosen diet? veg ⊇ vegan; nonveg allows
 * everything. Shared by foods and recipes (both carry `dietTypes`).
 */
export function dietAllows(tags: DietType[], dietType: DietType): boolean {
  switch (dietType) {
    case "vegan":
      return tags.includes("vegan");
    case "veg":
      return tags.includes("veg") || tags.includes("vegan");
    case "nonveg":
      return true;
  }
}

/** Does a food satisfy the diet type? */
export function matchesDiet(food: FoodItem, dietType: DietType): boolean {
  return dietAllows(food.dietTypes, dietType);
}

/** Is a food excluded by any exclusion keyword (id, name, alias, allergen, category)? */
export function isExcluded(food: FoodItem, exclusions: string[]): boolean {
  if (exclusions.length === 0) return false;
  const haystack = [
    food.id,
    food.name,
    food.category,
    ...food.aliases,
    ...food.allergens,
  ]
    .join(" ")
    .toLowerCase();
  return exclusions.some((ex) => {
    const needle = ex.trim().toLowerCase();
    return needle.length > 0 && haystack.includes(needle);
  });
}

/**
 * Single source of truth for food visibility — used by the Food DB list AND
 * the auto-generate planner, so excluded items never leak into a plan.
 */
export function applyFilters(
  foods: FoodItem[],
  criteria: FilterCriteria,
): FoodItem[] {
  const exclusions = criteria.exclusions ?? [];
  const search = criteria.search?.trim().toLowerCase() ?? "";
  return foods.filter((food) => {
    if (!matchesDiet(food, criteria.dietType)) return false;
    if (isExcluded(food, exclusions)) return false;
    if (criteria.category && food.category !== criteria.category) return false;
    if (search) {
      const hay = [food.name, food.category, ...food.aliases]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });
}
