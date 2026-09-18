import type { FoodItem, Nutrients } from "./schema";

function nutrients(partial: Partial<{
  energy_kcal: number;
  protein_g: number;
  carbs_g: number;
  fiber_g: number;
  fat_g: number;
  sugar_g: number;
}>): Nutrients {
  return {
    energy_kcal: partial.energy_kcal ?? 0,
    macros: {
      protein_g: partial.protein_g ?? 0,
      carbs_g: partial.carbs_g ?? 0,
      fiber_g: partial.fiber_g ?? 0,
      fat_g: partial.fat_g ?? 0,
      sugar_g: partial.sugar_g ?? 0,
    },
    vitamins: {
      vit_a_ug: 0,
      vit_c_mg: 0,
      vit_d_ug: 0,
      thiamin_b1_mg: 0,
      riboflavin_b2_mg: 0,
      niacin_b3_mg: 0,
      folate_b9_ug: 0,
      vit_b12_ug: 0,
      vit_e_mg: 0,
      vit_k_ug: 0,
    },
    minerals: {
      calcium_mg: 0,
      iron_mg: 0,
      magnesium_mg: 0,
      potassium_mg: 0,
      sodium_mg: 0,
      zinc_mg: 0,
      phosphorus_mg: 0,
      selenium_ug: 0,
    },
  };
}

/** Build a FoodItem for tests with sensible defaults. */
export function makeFood(over: Partial<FoodItem> & { id: string }): FoodItem {
  return {
    name: over.id,
    aliases: [],
    category: "Misc",
    dietTypes: ["veg"],
    allergens: [],
    servingUnit: "g",
    referenceQuantity: 100,
    nutrients: nutrients({}),
    evidences: [],
    verification: { status: "verified", confidence: "high" },
    source: "default",
    editable: true,
    mealTypes: [],
    itemType: "ingredient",
    ...over,
  };
}

export { nutrients as makeNutrients };
