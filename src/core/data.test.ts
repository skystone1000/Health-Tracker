import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { FoodItemSchema, RdaTableSchema, RecipeSchema } from "./schema";

const read = (rel: string) =>
  JSON.parse(readFileSync(resolve(__dirname, "../../public/data", rel), "utf-8"));

describe("seed data integrity", () => {
  const foods = read("foods.default.json");
  const rda = read("rda.icmr-nin-2020.json");

  it("every default food matches the FoodItem schema", () => {
    for (const food of foods) {
      const parsed = FoodItemSchema.safeParse(food);
      if (!parsed.success) {
        throw new Error(`${food.id}: ${parsed.error.message}`);
      }
      expect(parsed.success).toBe(true);
    }
  });

  it("food ids are unique", () => {
    const ids = foods.map((f: { id: string }) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every default food carries >=3 evidences", () => {
    for (const food of foods) {
      expect(food.evidences.length, food.id).toBeGreaterThanOrEqual(3);
    }
  });

  it("verified foods have status set", () => {
    for (const food of foods) {
      expect(["verified", "needsReview", "unverified"]).toContain(
        food.verification.status,
      );
    }
  });

  it("RDA table matches the schema and covers both sexes", () => {
    expect(RdaTableSchema.safeParse(rda).success).toBe(true);
    const sexes = new Set(rda.brackets.map((b: { sex: string }) => b.sex));
    expect(sexes).toEqual(new Set(["male", "female"]));
  });
});

describe("recipe seed data integrity", () => {
  const recipes = read("recipes.default.json");
  const foodIds = new Set(
    read("foods.default.json").map((f: { id: string }) => f.id),
  );

  it("every recipe matches the Recipe schema", () => {
    for (const recipe of recipes) {
      const parsed = RecipeSchema.safeParse(recipe);
      if (!parsed.success) throw new Error(`${recipe.id}: ${parsed.error.message}`);
      expect(parsed.success).toBe(true);
    }
  });

  it("every ingredient & base food references a real food id", () => {
    for (const recipe of recipes) {
      for (const ing of recipe.ingredients)
        expect(foodIds.has(ing.foodId), `${recipe.id} → ${ing.foodId}`).toBe(
          true,
        );
      for (const base of recipe.baseFoodIds)
        expect(foodIds.has(base), `${recipe.id} base ${base}`).toBe(true);
    }
  });

  it("recipe ids are unique", () => {
    const ids = recipes.map((r: { id: string }) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
