import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FOOD_CATEGORIES,
  FoodItemSchema,
  RdaTableSchema,
  RecipeSchema,
  type FoodItem,
  type Recipe,
} from "./schema";
import { dietAllows } from "./filters";
import { nutrientsForQuantity } from "./totals";

const read = (rel: string) =>
  JSON.parse(readFileSync(resolve(__dirname, "../../public/data", rel), "utf-8"));

/**
 * Bare landing pages tell a reader nothing about where a number came from.
 * Every citation must point at the item — a record page or a search that lands
 * on it. See "URL policy" in docs/plan_5_indian_foods.md.
 */
const BARE_HOMEPAGES = [
  "https://fdc.nal.usda.gov/",
  "https://www.nin.res.in/",
  "https://world.openfoodfacts.org/",
  "https://indb.co.in/",
  "https://www.indb.co.in/",
];
const isUsableSourceUrl = (url?: string) => {
  if (!url) return false;
  const trimmed = url.trim();
  if (!/^https?:\/\//.test(trimmed)) return false;
  return !BARE_HOMEPAGES.includes(trimmed.replace(/\/?$/, "/"));
};

describe("seed data integrity", () => {
  const foods: FoodItem[] = read("foods.default.json");
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
    const ids = foods.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every default food uses a known category", () => {
    for (const food of foods) {
      expect(FOOD_CATEGORIES as readonly string[], food.id).toContain(
        food.category,
      );
    }
  });

  it("evidence count matches verification status", () => {
    // verified claims more than needsReview, so it has to be backed by more.
    for (const food of foods) {
      const min = food.verification.status === "verified" ? 3 : 2;
      expect(food.evidences.length, food.id).toBeGreaterThanOrEqual(min);
    }
  });

  it("verified foods have status set", () => {
    for (const food of foods) {
      expect(["verified", "needsReview", "unverified"]).toContain(
        food.verification.status,
      );
    }
  });

  it("every evidence links to the item, not a bare homepage", () => {
    for (const food of foods) {
      for (const ev of food.evidences) {
        expect(isUsableSourceUrl(ev.url), `${food.id} → ${ev.source}: ${ev.url}`)
          .toBe(true);
      }
    }
  });

  it("every dish food declares at least one meal type", () => {
    for (const food of foods) {
      if (food.itemType !== "dish") continue;
      expect(food.mealTypes.length, food.id).toBeGreaterThan(0);
    }
  });

  it("RDA table matches the schema and covers both sexes", () => {
    expect(RdaTableSchema.safeParse(rda).success).toBe(true);
    const sexes = new Set(rda.brackets.map((b: { sex: string }) => b.sex));
    expect(sexes).toEqual(new Set(["male", "female"]));
  });
});

describe("recipe seed data integrity", () => {
  const recipes: Recipe[] = read("recipes.default.json");
  const foods: FoodItem[] = read("foods.default.json");
  const foodsById = new Map(foods.map((f) => [f.id, f]));
  const foodIds = new Set(foods.map((f) => f.id));

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
    const ids = recipes.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every recipe carries at least one usable reference", () => {
    for (const recipe of recipes) {
      expect(recipe.references.length, recipe.id).toBeGreaterThanOrEqual(1);
      for (const ref of recipe.references) {
        expect(isUsableSourceUrl(ref.url), `${recipe.id}: ${ref.url}`).toBe(true);
      }
    }
  });

  /**
   * Only the restrictive claims constrain ingredients: a vegan recipe cannot
   * contain a non-vegan food, and a veg one cannot contain meat. `nonveg` is
   * permissive (it means "shown to everyone"), so it constrains nothing — a
   * chicken bowl may of course contain rice.
   */
  it("a veg/vegan recipe never contains an ingredient that breaks that diet", () => {
    for (const recipe of recipes) {
      for (const diet of recipe.dietTypes) {
        if (diet === "nonveg") continue;
        for (const ing of recipe.ingredients) {
          const food = foodsById.get(ing.foodId);
          if (!food) continue;
          expect(
            dietAllows(food.dietTypes, diet),
            `${recipe.id} claims ${diet} but ${food.id} (${food.dietTypes.join("/")}) breaks it`,
          ).toBe(true);
        }
      }
    }
  });

  /**
   * A dish exists twice: as a food with its own measured panel, and as a recipe
   * built from ingredients. They are allowed to differ (cooking losses, oil
   * absorption) but not to disagree wildly — that would mean one of them is
   * simply wrong. Linked by convention: recipe id === dish food id.
   */
  it("a dish food's energy agrees with its recipe within 25%", () => {
    for (const recipe of recipes) {
      const dish = foodsById.get(recipe.id);
      if (!dish || dish.itemType !== "dish" || !recipe.yieldGrams) continue;

      const totalKcal = recipe.ingredients.reduce((sum, ing) => {
        const food = foodsById.get(ing.foodId);
        return food ? sum + nutrientsForQuantity(food, ing.quantity).energy_kcal : sum;
      }, 0);
      const recipeKcalPer100g = (totalKcal / recipe.yieldGrams) * 100;
      const dishKcalPer100g =
        (dish.nutrients.energy_kcal / dish.referenceQuantity) * 100;
      const drift =
        Math.abs(dishKcalPer100g - recipeKcalPer100g) / recipeKcalPer100g;

      expect(
        drift,
        `${recipe.id}: dish ${dishKcalPer100g.toFixed(0)} kcal/100g vs recipe ${recipeKcalPer100g.toFixed(0)} kcal/100g`,
      ).toBeLessThanOrEqual(0.25);
    }
  });
});
