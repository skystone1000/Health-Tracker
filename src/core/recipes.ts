import { dietAllows, isExcluded } from "./filters";
import type {
  DietType,
  FoodItem,
  NutrientVector,
  Recipe,
} from "./schema";
import { NUTRIENT_KEYS } from "./schema";
import { emptyVector, nutrientsForQuantity, sumVectors } from "./totals";

/**
 * Nutrition for a single serving of a recipe, computed from its ingredients
 * (reuses the same totals engine as meals/plans — no duplicated math).
 */
export function recipeNutritionPerServing(
  recipe: Recipe,
  foodsById: Map<string, FoodItem>,
): NutrientVector {
  const vectors = recipe.ingredients.map((ing) => {
    const food = foodsById.get(ing.foodId);
    return food ? nutrientsForQuantity(food, ing.quantity) : emptyVector();
  });
  const total = sumVectors(vectors);
  const per = {} as NutrientVector;
  const servings = recipe.servings || 1;
  for (const key of NUTRIENT_KEYS) per[key] = total[key] / servings;
  return per;
}

export interface RecipeFilter {
  dietType: DietType;
  exclusions?: string[];
  search?: string;
  foodId?: string; // only recipes that use / are an option for this food
}

/** Recipes that are an option for, or use, a given food. */
export function recipesForFood(recipes: Recipe[], foodId: string): Recipe[] {
  return recipes.filter(
    (r) =>
      r.baseFoodIds.includes(foodId) ||
      r.ingredients.some((i) => i.foodId === foodId),
  );
}

/**
 * Filter recipes by diet, search and exclusions. A recipe is excluded if its
 * own diet tags don't fit, or if any ingredient food is excluded — reusing the
 * food-level filter helpers so the rules stay consistent everywhere.
 */
export function filterRecipes(
  recipes: Recipe[],
  foodsById: Map<string, FoodItem>,
  criteria: RecipeFilter,
): Recipe[] {
  const exclusions = criteria.exclusions ?? [];
  const search = criteria.search?.trim().toLowerCase() ?? "";

  return recipes.filter((recipe) => {
    if (!dietAllows(recipe.dietTypes, criteria.dietType)) return false;
    if (criteria.foodId && !recipesForFood([recipe], criteria.foodId).length)
      return false;

    if (exclusions.length) {
      const ingredientExcluded = recipe.ingredients.some((ing) => {
        const food = foodsById.get(ing.foodId);
        return food ? isExcluded(food, exclusions) : false;
      });
      const nameMatches = exclusions.some((ex) =>
        recipe.name.toLowerCase().includes(ex.trim().toLowerCase()),
      );
      if (ingredientExcluded || nameMatches) return false;
    }

    if (search) {
      const hay = [recipe.name, recipe.cuisine].join(" ").toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });
}
