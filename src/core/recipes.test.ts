import { describe, expect, it } from "vitest";
import {
  filterRecipes,
  recipeNutritionPerServing,
  recipesForFood,
} from "./recipes";
import { makeFood, makeNutrients } from "./test-fixtures";
import type { FoodItem, Recipe } from "./schema";

const foods: FoodItem[] = [
  makeFood({
    id: "dal",
    dietTypes: ["veg", "vegan"],
    nutrients: makeNutrients({ energy_kcal: 120, protein_g: 7, carbs_g: 22 }),
  }),
  makeFood({
    id: "paneer",
    category: "Dairy",
    dietTypes: ["veg"],
    nutrients: makeNutrients({ energy_kcal: 265, protein_g: 18, fat_g: 21 }),
  }),
  makeFood({
    id: "chicken",
    dietTypes: ["nonveg"],
    nutrients: makeNutrients({ energy_kcal: 165, protein_g: 31 }),
  }),
];
const foodsById = new Map(foods.map((f) => [f.id, f]));

const dalTadka: Recipe = {
  id: "dal-tadka",
  name: "Dal Tadka",
  cuisine: "Indian",
  dietTypes: ["veg", "vegan"],
  baseFoodIds: ["dal"],
  servings: 2,
  ingredients: [{ foodId: "dal", quantity: 300 }],
  steps: ["Boil", "Temper"],
  source: "default",
};

const paneerDish: Recipe = {
  id: "paneer-bhurji",
  name: "Paneer Bhurji",
  cuisine: "Indian",
  dietTypes: ["veg"],
  baseFoodIds: ["paneer"],
  servings: 1,
  ingredients: [{ foodId: "paneer", quantity: 120 }],
  steps: [],
  source: "default",
};

const chickenDish: Recipe = {
  id: "chicken-bowl",
  name: "Chicken Bowl",
  cuisine: "Continental",
  dietTypes: ["nonveg"],
  baseFoodIds: ["chicken"],
  servings: 1,
  ingredients: [{ foodId: "chicken", quantity: 150 }],
  steps: [],
  source: "default",
};

const recipes = [dalTadka, paneerDish, chickenDish];

describe("recipeNutritionPerServing", () => {
  it("sums ingredients and divides by servings", () => {
    // 300 g dal = 3× the 100 g reference = 360 kcal; ÷2 servings = 180
    const per = recipeNutritionPerServing(dalTadka, foodsById);
    expect(per.energy_kcal).toBeCloseTo(180);
    expect(per.protein_g).toBeCloseTo(10.5);
  });
});

describe("recipesForFood", () => {
  it("matches base foods and ingredient foods", () => {
    expect(recipesForFood(recipes, "dal").map((r) => r.id)).toEqual([
      "dal-tadka",
    ]);
    expect(recipesForFood(recipes, "paneer").map((r) => r.id)).toEqual([
      "paneer-bhurji",
    ]);
  });
});

describe("filterRecipes", () => {
  it("respects diet type", () => {
    const veg = filterRecipes(recipes, foodsById, { dietType: "veg" });
    expect(veg.map((r) => r.id)).not.toContain("chicken-bowl");
    const vegan = filterRecipes(recipes, foodsById, { dietType: "vegan" });
    expect(vegan.map((r) => r.id)).toEqual(["dal-tadka"]);
  });

  it("excludes recipes whose ingredients are excluded", () => {
    const result = filterRecipes(recipes, foodsById, {
      dietType: "veg",
      exclusions: ["paneer"],
    });
    expect(result.map((r) => r.id)).toEqual(["dal-tadka"]);
  });

  it("filters by food and search", () => {
    expect(
      filterRecipes(recipes, foodsById, {
        dietType: "veg",
        foodId: "paneer",
      }).map((r) => r.id),
    ).toEqual(["paneer-bhurji"]);
    expect(
      filterRecipes(recipes, foodsById, {
        dietType: "nonveg",
        search: "bowl",
      }).map((r) => r.id),
    ).toEqual(["chicken-bowl"]);
  });
});
