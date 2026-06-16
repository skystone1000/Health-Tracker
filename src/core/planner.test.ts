import { describe, expect, it } from "vitest";
import { autoGeneratePlan, createEmptyPlan } from "./planner";
import { planTotals } from "./totals";
import { makeFood, makeNutrients } from "./test-fixtures";
import type { FoodItem, UserProfile } from "./schema";

const profile: UserProfile = {
  id: "local",
  name: "Test",
  age: 28,
  sex: "male",
  heightCm: 178,
  weightKg: 74,
  activityLevel: "moderate",
  workType: "desk",
  goal: "maintain",
  dietType: "veg",
  exclusions: ["peanut"],
  plannerMode: "autoGenerate",
};

const foods: FoodItem[] = [
  makeFood({
    id: "tofu",
    category: "Legumes",
    dietTypes: ["veg", "vegan"],
    nutrients: makeNutrients({ energy_kcal: 144, protein_g: 17, carbs_g: 3, fat_g: 9 }),
  }),
  makeFood({
    id: "chicken",
    category: "Meat",
    dietTypes: ["nonveg"],
    nutrients: makeNutrients({ energy_kcal: 165, protein_g: 31, fat_g: 3.6 }),
  }),
  makeFood({
    id: "rice",
    category: "Grains",
    dietTypes: ["veg", "vegan"],
    nutrients: makeNutrients({ energy_kcal: 130, protein_g: 2.7, carbs_g: 28 }),
  }),
  makeFood({
    id: "spinach",
    category: "Vegetables",
    dietTypes: ["veg", "vegan"],
    nutrients: makeNutrients({ energy_kcal: 23, protein_g: 2.9, carbs_g: 3.6 }),
  }),
  makeFood({
    id: "peanut",
    category: "Legumes",
    allergens: ["peanut"],
    dietTypes: ["veg", "vegan"],
    nutrients: makeNutrients({ energy_kcal: 567, protein_g: 26, fat_g: 49 }),
  }),
];

describe("createEmptyPlan", () => {
  it("has the four default meals, all empty", () => {
    const plan = createEmptyPlan("2026-06-15");
    expect(plan.meals.map((m) => m.name)).toEqual([
      "Breakfast",
      "Lunch",
      "Dinner",
      "Snacks",
    ]);
    expect(plan.meals.every((m) => m.items.length === 0)).toBe(true);
  });
});

describe("autoGeneratePlan", () => {
  const plan = autoGeneratePlan(profile, 2400, foods);
  const foodsById = new Map(foods.map((f) => [f.id, f]));

  it("never includes diet-violating or excluded foods", () => {
    const usedIds = plan.meals.flatMap((m) => m.items.map((i) => i.foodId));
    expect(usedIds).not.toContain("chicken"); // nonveg for a veg profile
    expect(usedIds).not.toContain("peanut"); // excluded
  });

  it("is deterministic", () => {
    const again = autoGeneratePlan(profile, 2400, foods);
    expect(again).toEqual(plan);
  });

  it("lands within a reasonable band of the calorie target", () => {
    const totals = planTotals(plan, foodsById);
    expect(totals.energy_kcal).toBeGreaterThan(2400 * 0.7);
    expect(totals.energy_kcal).toBeLessThan(2400 * 1.3);
  });

  it("returns an empty-meal plan when nothing passes the filters", () => {
    const vegan = autoGeneratePlan(
      { ...profile, dietType: "vegan", exclusions: foods.map((f) => f.id) },
      2400,
      foods,
    );
    expect(vegan.meals.every((m) => m.items.length === 0)).toBe(true);
  });
});
