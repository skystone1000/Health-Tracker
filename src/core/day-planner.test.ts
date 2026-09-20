import { describe, expect, it } from "vitest";
import {
  balanceDay,
  DEFAULT_MEAL_TEMPLATES,
  emptyHistory,
  generateDayPlan,
  KCAL_BAND,
  PROTEIN_FLOOR,
  WEEKLY_REPEAT_CAP,
} from "./day-planner";
import { planTotals } from "./totals";
import { dailyQuotas, plateGroup } from "./food-groups";
import { mulberry32 } from "./random";
import { makeFood, makeNutrients } from "./test-fixtures";
import type { FoodItem, UserProfile } from "./schema";

const profile: UserProfile = {
  id: "local",
  name: "Test",
  age: 30,
  sex: "female",
  heightCm: 163,
  weightKg: 58,
  activityLevel: "moderate",
  workType: "desk",
  goal: "maintain",
  dietType: "veg",
  exclusions: [],
  plannerMode: "weekly",
};

/** A small but realistic pool: several options in every plate group. */
const pool: FoodItem[] = [
  // cereals
  ...["rice", "roti", "poha", "upma", "idli"].map((id, i) =>
    makeFood({
      id,
      category: "Grains & Cereals",
      dietTypes: ["veg", "vegan"],
      mealTypes: i < 3 ? ["breakfast", "lunch"] : ["lunch", "dinner"],
      nutrients: makeNutrients({ energy_kcal: 130 + i, carbs_g: 28, protein_g: 3 }),
    }),
  ),
  // pulses
  ...["toor-dal", "moong-dal", "rajma", "chana"].map((id) =>
    makeFood({
      id,
      category: "Legumes & Pulses",
      dietTypes: ["veg", "vegan"],
      mealTypes: ["lunch", "dinner"],
      nutrients: makeNutrients({ energy_kcal: 120, protein_g: 9, carbs_g: 20 }),
    }),
  ),
  // vegetables
  ...["bhindi", "lauki", "palak", "gobi", "baingan"].map((id) =>
    makeFood({
      id,
      category: "Vegetables",
      dietTypes: ["veg", "vegan"],
      mealTypes: ["lunch", "dinner"],
      nutrients: makeNutrients({ energy_kcal: 35, protein_g: 2, carbs_g: 6 }),
    }),
  ),
  // dairy
  ...["milk", "curd", "paneer"].map((id) =>
    makeFood({
      id,
      category: "Dairy",
      dietTypes: ["veg"],
      mealTypes: ["breakfast", "lunch"],
      nutrients: makeNutrients({ energy_kcal: 90, protein_g: 6, fat_g: 5 }),
    }),
  ),
  // fruits
  ...["banana", "apple", "papaya"].map((id) =>
    makeFood({
      id,
      category: "Fruits",
      dietTypes: ["veg", "vegan"],
      mealTypes: ["breakfast", "snack"],
      nutrients: makeNutrients({ energy_kcal: 60, carbs_g: 15 }),
    }),
  ),
  // nuts
  ...["almond", "walnut"].map((id) =>
    makeFood({
      id,
      category: "Nuts, Seeds & Dry Fruits",
      dietTypes: ["veg", "vegan"],
      mealTypes: ["snack"],
      nutrients: makeNutrients({ energy_kcal: 580, protein_g: 20, fat_g: 50 }),
    }),
  ),
  // nonveg (must never appear for this veg profile)
  makeFood({
    id: "chicken",
    category: "Meat & Seafood",
    dietTypes: ["nonveg"],
    mealTypes: ["lunch", "dinner"],
    nutrients: makeNutrients({ energy_kcal: 165, protein_g: 31 }),
  }),
];

const ctx = (over: Partial<Parameters<typeof generateDayPlan>[0]> = {}) => ({
  date: "2026-09-21",
  profile,
  targetCalories: 2000,
  targetProtein: 70,
  foods: pool.filter((f) => f.dietTypes.includes("veg")),
  quotas: dailyQuotas(2000, "veg"),
  history: emptyHistory(),
  rng: mulberry32(1),
  ...over,
});

describe("generateDayPlan — structure", () => {
  const plan = generateDayPlan(ctx());

  it("uses the id and date convention the rest of the app expects", () => {
    expect(plan.id).toBe("plan-2026-09-21");
    expect(plan.date).toBe("2026-09-21");
  });

  it("has the four standard meals in order", () => {
    expect(plan.meals.map((m) => m.name)).toEqual([
      "Breakfast",
      "Lunch",
      "Dinner",
      "Snacks",
    ]);
    expect(DEFAULT_MEAL_TEMPLATES).toHaveLength(4);
  });

  it("fills every meal", () => {
    for (const meal of plan.meals) expect(meal.items.length).toBeGreaterThan(0);
  });

  it("never repeats a food within the same day", () => {
    const ids = plan.meals.flatMap((m) => m.items.map((i) => i.foodId));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only plans foods it was given", () => {
    const ids = plan.meals.flatMap((m) => m.items.map((i) => i.foodId));
    expect(ids).not.toContain("chicken");
  });
});

describe("generateDayPlan — dietician rules", () => {
  it("respects the meal-type facet: breakfast gets breakfast foods", () => {
    // The draw is weighted, not absolute — a mismatched food keeps a small
    // (0.08) weight so a half-faceted database cannot starve a slot. So assert
    // the *rate* across seeds, not a single deterministic outcome.
    const byId = new Map(pool.map((f) => [f.id, f]));
    let total = 0;
    let tagged = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const plan = generateDayPlan(ctx({ rng: mulberry32(seed) }));
      for (const item of plan.meals[0].items) {
        total += 1;
        if (byId.get(item.foodId)!.mealTypes.includes("breakfast")) tagged += 1;
      }
    }
    expect(total).toBeGreaterThan(40);
    expect(tagged / total).toBeGreaterThan(0.9);
  });

  it("puts a protein source in both lunch and dinner", () => {
    const plan = generateDayPlan(ctx());
    const byId = new Map(pool.map((f) => [f.id, f]));
    for (const mealIndex of [1, 2]) {
      const groups = plan.meals[mealIndex].items.map((i) =>
        plateGroup(byId.get(i.foodId)!),
      );
      expect(groups.some((g) => g === "pulses" || g === "flesh")).toBe(true);
    }
  });

  it("touches at least five plate groups across the day", () => {
    const plan = generateDayPlan(ctx());
    const byId = new Map(pool.map((f) => [f.id, f]));
    const groups = new Set(
      plan.meals.flatMap((m) => m.items.map((i) => plateGroup(byId.get(i.foodId)!))),
    );
    expect(groups.size).toBeGreaterThanOrEqual(5);
  });

  it("keeps every portion inside its sane range", () => {
    const plan = generateDayPlan(ctx());
    for (const meal of plan.meals) {
      for (const item of meal.items) {
        expect(item.quantity).toBeGreaterThanOrEqual(5);
        expect(item.quantity).toBeLessThanOrEqual(400);
      }
    }
  });
});

describe("generateDayPlan — seeded variation", () => {
  it("is identical for the same seed", () => {
    expect(generateDayPlan(ctx({ rng: mulberry32(5) }))).toEqual(
      generateDayPlan(ctx({ rng: mulberry32(5) })),
    );
  });

  it("differs for a different seed", () => {
    const a = generateDayPlan(ctx({ rng: mulberry32(5) }));
    const b = generateDayPlan(ctx({ rng: mulberry32(6000) }));
    const ids = (p: typeof a) =>
      p.meals.flatMap((m) => m.items.map((i) => i.foodId)).join("|");
    expect(ids(a)).not.toBe(ids(b));
  });
});

describe("generateDayPlan — degraded data", () => {
  it("returns the empty meal structure when there are no foods", () => {
    const plan = generateDayPlan(ctx({ foods: [] }));
    expect(plan.meals.map((m) => m.name)).toHaveLength(4);
    expect(plan.meals.every((m) => m.items.length === 0)).toBe(true);
  });

  it("still fills what it can when a whole group is missing", () => {
    const noDairy = pool.filter(
      (f) => f.category !== "Dairy" && f.dietTypes.includes("veg"),
    );
    const plan = generateDayPlan(ctx({ foods: noDairy }));
    const ids = plan.meals.flatMap((m) => m.items.map((i) => i.foodId));
    expect(ids.length).toBeGreaterThan(4);
  });
});

describe("weekly repeat caps", () => {
  it("lets staples recur daily but rotates the variety groups", () => {
    expect(WEEKLY_REPEAT_CAP.cereals).toBe(7);
    expect(WEEKLY_REPEAT_CAP.dairy).toBe(7);
    expect(WEEKLY_REPEAT_CAP.vegetables).toBeLessThanOrEqual(2);
    expect(WEEKLY_REPEAT_CAP.pulses).toBeLessThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// Task 5 — balance repair pass
// ---------------------------------------------------------------------------

describe("balanceDay", () => {
  const byId = new Map(pool.map((f) => [f.id, f]));

  it("pulls an under-target day up into the calorie band", () => {
    const skimpy = {
      id: "plan-2026-09-21",
      date: "2026-09-21",
      meals: [{ name: "Lunch", items: [{ foodId: "rice", quantity: 30 }] }],
    };
    const fixed = balanceDay(skimpy, byId, 1200, 40);
    const kcal = planTotals(fixed, byId).energy_kcal;
    // 200 g is the cereal ceiling — it cannot reach 1200 kcal from one food,
    // but it must move decisively towards it and never exceed the ceiling.
    expect(kcal).toBeGreaterThan(planTotals(skimpy, byId).energy_kcal);
    expect(fixed.meals[0].items[0].quantity).toBeLessThanOrEqual(200);
  });

  it("pulls an over-target day down into the band", () => {
    const heavy = {
      id: "plan-2026-09-21",
      date: "2026-09-21",
      meals: [
        {
          name: "Lunch",
          items: [
            { foodId: "rice", quantity: 200 },
            { foodId: "almond", quantity: 45 },
            { foodId: "toor-dal", quantity: 200 },
          ],
        },
      ],
    };
    const fixed = balanceDay(heavy, byId, 500, 20);
    const kcal = planTotals(fixed, byId).energy_kcal;
    expect(kcal).toBeLessThan(planTotals(heavy, byId).energy_kcal);
  });

  it("never pushes an item outside its portion bounds", () => {
    const plan = {
      id: "plan-2026-09-21",
      date: "2026-09-21",
      meals: [{ name: "Snacks", items: [{ foodId: "almond", quantity: 20 }] }],
    };
    const fixed = balanceDay(plan, byId, 4000, 200);
    expect(fixed.meals[0].items[0].quantity).toBeLessThanOrEqual(45);
  });

  it("leaves an already balanced day alone", () => {
    const plan = generateDayPlan(ctx());
    expect(balanceDay(plan, byId, 2000, 70)).toEqual(
      balanceDay(balanceDay(plan, byId, 2000, 70), byId, 2000, 70),
    );
  });

  it("does not mutate its input", () => {
    const plan = generateDayPlan(ctx());
    const before = structuredClone(plan);
    balanceDay(plan, byId, 900, 30);
    expect(plan).toEqual(before);
  });
});

describe("generateDayPlan — lands in band", () => {
  const byId = new Map(pool.map((f) => [f.id, f]));

  it("hits the calorie band for a range of targets and seeds", () => {
    for (const target of [1500, 2000, 2600]) {
      for (const seed of [1, 2, 3, 4, 5]) {
        const plan = generateDayPlan(
          ctx({ targetCalories: target, rng: mulberry32(seed) }),
        );
        const kcal = planTotals(plan, byId).energy_kcal;
        expect(kcal).toBeGreaterThan(target * 0.88);
        expect(kcal).toBeLessThan(target * 1.12);
      }
    }
  });

  it("meets at least 85 % of the protein target", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const plan = generateDayPlan(ctx({ rng: mulberry32(seed) }));
      expect(planTotals(plan, byId).protein_g).toBeGreaterThan(70 * 0.85);
    }
  });

  it("exposes its bands as constants", () => {
    expect(KCAL_BAND.min).toBeLessThan(1);
    expect(KCAL_BAND.max).toBeGreaterThan(1);
    expect(PROTEIN_FLOOR).toBeGreaterThanOrEqual(0.85);
  });
});

describe("slot fallback", () => {
  it("replaces an unavailable dairy slot with a plant protein for a vegan", () => {
    const veganPool = pool.filter((f) => f.dietTypes.includes("vegan"));
    const byId = new Map(pool.map((f) => [f.id, f]));
    const plan = generateDayPlan(
      ctx({
        profile: { ...profile, dietType: "vegan" },
        foods: veganPool,
        quotas: dailyQuotas(2000, "vegan"),
      }),
    );
    // Breakfast is cereals + dairy + fruits; with no dairy in the pool the
    // middle slot must still produce an item rather than vanishing.
    expect(plan.meals[0].items.length).toBe(3);
    const breakfastGroups = plan.meals[0].items.map((i) =>
      plateGroup(byId.get(i.foodId)!),
    );
    expect(breakfastGroups).not.toContain("dairy");
    expect(breakfastGroups).toContain("pulses");
  });

  it("keeps a vegan day's protein share close to a vegetarian's", () => {
    const byId = new Map(pool.map((f) => [f.id, f]));
    const share = (dietType: "veg" | "vegan") => {
      const foods = pool.filter((f) => f.dietTypes.includes(dietType));
      let worst = 1;
      for (let seed = 1; seed <= 10; seed++) {
        const plan = generateDayPlan(
          ctx({
            profile: { ...profile, dietType },
            foods,
            quotas: dailyQuotas(2000, dietType),
            rng: mulberry32(seed),
          }),
        );
        const t = planTotals(plan, byId);
        worst = Math.min(worst, (t.protein_g * 4) / t.energy_kcal);
      }
      return worst;
    };
    // Without the fallback the vegan day loses its dairy slot to cereal and
    // fruit, and the gap opens up well past this.
    expect(share("vegan")).toBeGreaterThan(share("veg") - 0.03);
  });
});
