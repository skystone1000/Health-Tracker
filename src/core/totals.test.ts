import { describe, expect, it } from "vitest";
import {
  mealTotals,
  nutrientsForQuantity,
  progressVsTarget,
  sumVectors,
  emptyVector,
} from "./totals";
import { makeFood } from "./test-fixtures";
import type { Meal } from "./schema";

const rice = makeFood({
  id: "rice",
  nutrients: {
    energy_kcal: 130,
    macros: { protein_g: 2.7, carbs_g: 28, fiber_g: 0.4, fat_g: 0.3, sugar_g: 0.1 },
    vitamins: {
      vit_a_ug: 0,
      vit_c_mg: 0,
      vit_d_ug: 0,
      thiamin_b1_mg: 0.02,
      riboflavin_b2_mg: 0,
      niacin_b3_mg: 0,
      folate_b9_ug: 0,
      vit_b12_ug: 0,
      vit_e_mg: 0,
      vit_k_ug: 0,
    },
    minerals: {
      calcium_mg: 10,
      iron_mg: 0.2,
      magnesium_mg: 12,
      potassium_mg: 35,
      sodium_mg: 1,
      zinc_mg: 0.5,
      phosphorus_mg: 43,
      selenium_ug: 7.5,
    },
  },
});

describe("nutrientsForQuantity", () => {
  it("scales linearly from the 100 g reference", () => {
    const v = nutrientsForQuantity(rice, 200);
    expect(v.energy_kcal).toBeCloseTo(260);
    expect(v.carbs_g).toBeCloseTo(56);
  });

  it("handles partial servings", () => {
    const v = nutrientsForQuantity(rice, 50);
    expect(v.energy_kcal).toBeCloseTo(65);
  });
});

describe("sumVectors", () => {
  it("adds vectors key by key", () => {
    const sum = sumVectors([
      nutrientsForQuantity(rice, 100),
      nutrientsForQuantity(rice, 100),
    ]);
    expect(sum.energy_kcal).toBeCloseTo(260);
  });

  it("emptyVector is the additive identity", () => {
    const sum = sumVectors([emptyVector(), nutrientsForQuantity(rice, 100)]);
    expect(sum.energy_kcal).toBeCloseTo(130);
  });
});

describe("mealTotals", () => {
  it("sums all items in a meal, ignoring unknown foods", () => {
    const meal: Meal = {
      name: "Lunch",
      items: [
        { foodId: "rice", quantity: 150 },
        { foodId: "ghost", quantity: 100 },
      ],
    };
    const totals = mealTotals(meal, new Map([["rice", rice]]));
    expect(totals.energy_kcal).toBeCloseTo(195);
  });
});

describe("progressVsTarget", () => {
  it("reports value, remaining and percent met", () => {
    const totals = nutrientsForQuantity(rice, 100);
    const target = { ...emptyVector(), energy_kcal: 260, carbs_g: 56 };
    const rows = progressVsTarget(totals, target);
    const energy = rows.find((r) => r.key === "energy_kcal")!;
    expect(energy.pct).toBeCloseTo(50);
    expect(energy.remaining).toBeCloseTo(130);
  });
});
