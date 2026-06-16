import { describe, expect, it } from "vitest";
import {
  bmrMifflinStJeor,
  calorieGoal,
  computeTargets,
  macroTargets,
  tdee,
} from "./nutrition-engine";
import type { RdaTable, UserProfile } from "./schema";

const maleProfile: UserProfile = {
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
  exclusions: [],
  plannerMode: "mealBuilder",
};

const femaleProfile: UserProfile = {
  ...maleProfile,
  sex: "female",
  age: 30,
  heightCm: 162,
  weightKg: 55,
};

const rda: RdaTable = {
  source: "test",
  brackets: [
    {
      sex: "male",
      minAge: 19,
      maxAge: 60,
      values: { iron_mg: 19, vit_c_mg: 80, calcium_mg: 1000 },
    },
    {
      sex: "female",
      minAge: 19,
      maxAge: 50,
      values: { iron_mg: 29, vit_c_mg: 65, calcium_mg: 1000 },
    },
  ],
};

describe("BMR — Mifflin-St Jeor", () => {
  it("computes the male reference case", () => {
    // 10*74 + 6.25*178 - 5*28 + 5 = 1717.5
    expect(bmrMifflinStJeor(maleProfile)).toBeCloseTo(1717.5, 1);
  });

  it("computes the female reference case", () => {
    // 10*55 + 6.25*162 - 5*30 - 161 = 1251.5
    expect(bmrMifflinStJeor(femaleProfile)).toBeCloseTo(1251.5, 1);
  });
});

describe("TDEE & calorie goal", () => {
  it("applies the moderate activity factor", () => {
    expect(tdee(maleProfile)).toBeCloseTo(1717.5 * 1.55, 1);
  });

  it("maintain leaves TDEE unchanged", () => {
    expect(calorieGoal(maleProfile)).toBeCloseTo(tdee(maleProfile), 5);
  });

  it("lose applies a deficit, gain a surplus", () => {
    expect(calorieGoal({ ...maleProfile, goal: "lose" })).toBeLessThan(
      tdee(maleProfile),
    );
    expect(calorieGoal({ ...maleProfile, goal: "gain" })).toBeGreaterThan(
      tdee(maleProfile),
    );
  });
});

describe("macro targets", () => {
  it("macro calories roughly reconstruct the calorie goal", () => {
    const cals = 2400;
    const m = macroTargets(cals, maleProfile);
    const reconstructed = m.protein_g * 4 + m.carbs_g * 4 + m.fat_g * 9;
    expect(reconstructed).toBeCloseTo(cals, 0);
  });

  it("honours the per-kg protein floor for athletes", () => {
    const athlete: UserProfile = {
      ...maleProfile,
      workType: "athlete",
      activityLevel: "veryActive",
    };
    // very low calories so % split would fall below the 1.6 g/kg floor
    const m = macroTargets(1200, athlete);
    expect(m.protein_g).toBeGreaterThanOrEqual(athlete.weightKg * 1.6 - 0.001);
  });
});

describe("computeTargets", () => {
  it("produces a complete target panel with micros from the RDA table", () => {
    const { targets, calories } = computeTargets(maleProfile, rda);
    expect(targets.energy_kcal).toBeCloseTo(calories, 5);
    expect(targets.iron_mg).toBe(19); // from male bracket
    expect(targets.vit_c_mg).toBe(80);
  });

  it("falls back to USDA DRI when a value is missing from the table", () => {
    const { targets } = computeTargets(maleProfile, rda);
    // zinc not in the test bracket → fallback value
    expect(targets.zinc_mg).toBeGreaterThan(0);
  });
});
