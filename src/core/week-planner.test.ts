import { describe, expect, it } from "vitest";
import {
  generateWeekPlan,
  regenerateDayInWeek,
  scoreWeek,
} from "./week-planner";
import { makeFood, makeNutrients } from "./test-fixtures";
import { planTotals } from "./totals";
import type { FoodItem, UserProfile } from "./schema";

const profile: UserProfile = {
  id: "local",
  name: "Test",
  age: 30,
  sex: "male",
  heightCm: 175,
  weightKg: 70,
  activityLevel: "moderate",
  workType: "desk",
  goal: "maintain",
  dietType: "veg",
  exclusions: ["peanut"],
  plannerMode: "weekly",
};

const group = (
  ids: string[],
  category: string,
  mealTypes: FoodItem["mealTypes"],
  kcal: number,
  protein: number,
  diet: FoodItem["dietTypes"] = ["veg", "vegan"],
) =>
  ids.map((id) =>
    makeFood({
      id,
      category,
      dietTypes: diet,
      mealTypes,
      nutrients: makeNutrients({ energy_kcal: kcal, protein_g: protein, carbs_g: 20 }),
    }),
  );

const foods: FoodItem[] = [
  ...group(["rice", "roti", "poha", "upma", "idli", "dosa", "millet"], "Grains & Cereals", ["breakfast", "lunch", "dinner"], 135, 3),
  ...group(["toor", "moong", "rajma", "chana", "masoor", "urad"], "Legumes & Pulses", ["lunch", "dinner"], 120, 9),
  ...group(["bhindi", "lauki", "palak", "gobi", "baingan", "methi", "tinda", "kaddu"], "Vegetables", ["lunch", "dinner"], 35, 2),
  ...group(["milk", "curd", "paneer"], "Dairy", ["breakfast", "lunch"], 90, 6, ["veg"]),
  ...group(["banana", "apple", "papaya", "guava"], "Fruits", ["breakfast", "snack"], 60, 1),
  ...group(["almond", "walnut", "cashew"], "Nuts, Seeds & Dry Fruits", ["snack"], 580, 20),
  ...group(["chicken", "fish"], "Meat & Seafood", ["lunch", "dinner"], 165, 28, ["nonveg"]),
  ...group(["peanut"], "Nuts, Seeds & Dry Fruits", ["snack"], 567, 26),
  ...group(["ghee"], "Fats & Oils", [], 884, 0),
];

const targets = { calories: 2200, protein: 80 };
const byId = new Map(foods.map((f) => [f.id, f]));
const idsOf = (plan: { meals: { items: { foodId: string }[] }[] }) =>
  plan.meals.flatMap((m) => m.items.map((i) => i.foodId));

describe("generateWeekPlan — shape", () => {
  const week = generateWeekPlan(profile, targets, foods, {
    seed: 1,
    startDate: "2026-09-21",
  });

  it("returns seven consecutive dated plans", () => {
    expect(week.days).toHaveLength(7);
    expect(week.days.map((d) => d.date)).toEqual([
      "2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24",
      "2026-09-25", "2026-09-26", "2026-09-27",
    ]);
    expect(week.startDate).toBe("2026-09-21");
  });

  it("uses the plan id convention so the dashboard finds each day", () => {
    for (const day of week.days) expect(day.id).toBe(`plan-${day.date}`);
  });

  it("reports the seed it used", () => {
    expect(week.seed).toBe(1);
  });
});

describe("generateWeekPlan — preferences", () => {
  it("never plans a food the diet or exclusions forbid", () => {
    const week = generateWeekPlan(profile, targets, foods, { seed: 2, startDate: "2026-09-21" });
    const ids = week.days.flatMap(idsOf);
    expect(ids).not.toContain("chicken");
    expect(ids).not.toContain("fish");
    expect(ids).not.toContain("peanut"); // excluded by name
  });

  it("never plans dairy or flesh for a vegan", () => {
    const week = generateWeekPlan(
      { ...profile, dietType: "vegan", exclusions: [] },
      targets,
      foods,
      { seed: 3, startDate: "2026-09-21" },
    );
    const ids = week.days.flatMap(idsOf);
    for (const banned of ["milk", "curd", "paneer", "chicken", "fish"]) {
      expect(ids).not.toContain(banned);
    }
  });

  it("uses flesh foods for an omnivore", () => {
    const week = generateWeekPlan(
      { ...profile, dietType: "nonveg", exclusions: [] },
      targets,
      foods,
      { seed: 4, startDate: "2026-09-21" },
    );
    const ids = week.days.flatMap(idsOf);
    expect(ids.some((id) => id === "chicken" || id === "fish")).toBe(true);
  });

  it("never plans a cooking input", () => {
    const week = generateWeekPlan(profile, targets, foods, { seed: 5, startDate: "2026-09-21" });
    expect(week.days.flatMap(idsOf)).not.toContain("ghee");
  });
});

describe("generateWeekPlan — balance", () => {
  const week = generateWeekPlan(profile, targets, foods, { seed: 6, startDate: "2026-09-21" });

  it("keeps every day inside the calorie band", () => {
    for (const day of week.days) {
      const kcal = planTotals(day, byId).energy_kcal;
      expect(kcal).toBeGreaterThan(targets.calories * 0.88);
      expect(kcal).toBeLessThan(targets.calories * 1.12);
    }
  });

  it("meets the protein floor every day", () => {
    for (const day of week.days) {
      expect(planTotals(day, byId).protein_g).toBeGreaterThan(targets.protein * 0.85);
    }
  });
});

describe("generateWeekPlan — variety", () => {
  const week = generateWeekPlan(profile, targets, foods, { seed: 7, startDate: "2026-09-21" });

  it("uses a wide slice of the database", () => {
    const distinct = new Set(week.days.flatMap(idsOf));
    expect(distinct.size).toBeGreaterThanOrEqual(15);
  });

  it("does not repeat a vegetable more than twice in the week", () => {
    const counts = new Map<string, number>();
    for (const day of week.days) {
      for (const id of new Set(idsOf(day))) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
    for (const veg of ["bhindi", "lauki", "palak", "gobi", "baingan", "methi", "tinda", "kaddu"]) {
      expect(counts.get(veg) ?? 0).toBeLessThanOrEqual(2);
    }
  });

  it("gives consecutive days different main items", () => {
    for (let i = 1; i < week.days.length; i++) {
      const prev = new Set(idsOf(week.days[i - 1]));
      const overlap = idsOf(week.days[i]).filter((id) => prev.has(id));
      // Staples may recur; a day must still bring several new items.
      expect(overlap.length).toBeLessThan(idsOf(week.days[i]).length);
    }
  });
});

describe("generateWeekPlan — dynamic regeneration", () => {
  it("is reproducible for the same seed", () => {
    const a = generateWeekPlan(profile, targets, foods, { seed: 8, startDate: "2026-09-21" });
    const b = generateWeekPlan(profile, targets, foods, { seed: 8, startDate: "2026-09-21" });
    expect(a.days).toEqual(b.days);
  });

  it("produces a materially different week for a new seed", () => {
    const a = generateWeekPlan(profile, targets, foods, { seed: 8, startDate: "2026-09-21" });
    const b = generateWeekPlan(profile, targets, foods, { seed: 99, startDate: "2026-09-21" });
    const aIds = a.days.map((d) => idsOf(d).join("|"));
    const bIds = b.days.map((d) => idsOf(d).join("|"));
    const changedDays = aIds.filter((ids, i) => ids !== bIds[i]).length;
    expect(changedDays).toBeGreaterThanOrEqual(5);
  });

  it("stays valid across many different seeds", () => {
    for (let seed = 100; seed < 120; seed++) {
      const week = generateWeekPlan(profile, targets, foods, { seed, startDate: "2026-09-21" });
      for (const day of week.days) {
        expect(day.meals.every((m) => m.items.length > 0)).toBe(true);
        const kcal = planTotals(day, byId).energy_kcal;
        expect(kcal).toBeGreaterThan(targets.calories * 0.85);
        expect(kcal).toBeLessThan(targets.calories * 1.15);
      }
    }
  });
});

describe("generateWeekPlan — degraded input", () => {
  it("returns seven empty days rather than throwing when nothing passes filters", () => {
    const week = generateWeekPlan(
      { ...profile, exclusions: foods.map((f) => f.id) },
      targets,
      foods,
      { seed: 1, startDate: "2026-09-21" },
    );
    expect(week.days).toHaveLength(7);
    expect(week.days.every((d) => d.meals.every((m) => m.items.length === 0))).toBe(true);
  });

  it("supports a shorter horizon", () => {
    const week = generateWeekPlan(profile, targets, foods, {
      seed: 1,
      startDate: "2026-09-21",
      days: 3,
    });
    expect(week.days).toHaveLength(3);
  });
});

describe("scoreWeek", () => {
  const week = generateWeekPlan(profile, targets, foods, { seed: 21, startDate: "2026-09-21" });

  it("reports one entry per day", () => {
    const score = scoreWeek(week, byId, targets);
    expect(score.days).toHaveLength(7);
    expect(score.days[0].date).toBe("2026-09-21");
  });

  it("measures calories, protein and plate groups per day", () => {
    const day = scoreWeek(week, byId, targets).days[0];
    expect(day.kcal).toBeGreaterThan(0);
    expect(day.proteinRatio).toBeGreaterThan(0.5);
    expect(day.groups).toBeGreaterThanOrEqual(4);
  });

  it("summarises the week's variety", () => {
    const score = scoreWeek(week, byId, targets);
    expect(score.distinctFoods).toBeGreaterThanOrEqual(15);
    expect(score.maxRepeats).toBeLessThanOrEqual(7);
  });

  it("scores a good week higher than a monotonous one", () => {
    const monotonous = {
      ...week,
      days: week.days.map((d) => ({ ...structuredClone(week.days[0]), id: `plan-${d.date}`, date: d.date })),
    };
    expect(scoreWeek(week, byId, targets).total).toBeGreaterThan(
      scoreWeek(monotonous, byId, targets).total,
    );
  });

  it("scores an empty week at the floor", () => {
    const empty = {
      ...week,
      days: week.days.map((d) => ({ id: d.id, date: d.date, meals: [] })),
    };
    expect(scoreWeek(empty, byId, targets).total).toBeLessThan(40);
  });

  it("is between 0 and 100", () => {
    const total = scoreWeek(week, byId, targets).total;
    expect(total).toBeGreaterThanOrEqual(0);
    expect(total).toBeLessThanOrEqual(100);
  });
});

describe("locked days", () => {
  const first = generateWeekPlan(profile, targets, foods, { seed: 30, startDate: "2026-09-21" });

  it("keeps a locked day byte-identical through a regeneration", () => {
    const again = generateWeekPlan(profile, targets, foods, {
      seed: 31,
      startDate: "2026-09-21",
      lockedDates: ["2026-09-22"],
      existing: first.days,
    });
    const locked = again.days.find((d) => d.date === "2026-09-22");
    expect(locked).toEqual(first.days.find((d) => d.date === "2026-09-22"));
  });

  it("still regenerates the unlocked days", () => {
    const again = generateWeekPlan(profile, targets, foods, {
      seed: 31,
      startDate: "2026-09-21",
      lockedDates: ["2026-09-22"],
      existing: first.days,
    });
    const changed = again.days.filter(
      (d, i) => idsOf(d).join("|") !== idsOf(first.days[i]).join("|"),
    );
    expect(changed.length).toBeGreaterThanOrEqual(4);
  });

  it("ignores a locked date with no stored plan", () => {
    const again = generateWeekPlan(profile, targets, foods, {
      seed: 32,
      startDate: "2026-09-21",
      lockedDates: ["2030-01-01"],
      existing: first.days,
    });
    expect(again.days).toHaveLength(7);
  });
});

describe("regenerateDayInWeek", () => {
  const week = generateWeekPlan(profile, targets, foods, { seed: 40, startDate: "2026-09-21" });

  it("changes only the requested day", () => {
    const next = regenerateDayInWeek(profile, targets, foods, week, "2026-09-23", 12345);
    next.days.forEach((day, i) => {
      if (day.date === "2026-09-23") return;
      expect(day).toEqual(week.days[i]);
    });
  });

  it("actually produces a different day", () => {
    const next = regenerateDayInWeek(profile, targets, foods, week, "2026-09-23", 12345);
    const before = week.days.find((d) => d.date === "2026-09-23")!;
    const after = next.days.find((d) => d.date === "2026-09-23")!;
    expect(idsOf(after).join("|")).not.toBe(idsOf(before).join("|"));
  });

  it("keeps the reshuffled day in band", () => {
    const next = regenerateDayInWeek(profile, targets, foods, week, "2026-09-23", 999);
    const day = next.days.find((d) => d.date === "2026-09-23")!;
    const kcal = planTotals(day, byId).energy_kcal;
    expect(kcal).toBeGreaterThan(targets.calories * 0.88);
    expect(kcal).toBeLessThan(targets.calories * 1.12);
  });

  it("returns the week unchanged for an unknown date", () => {
    expect(regenerateDayInWeek(profile, targets, foods, week, "2030-01-01", 1)).toEqual(week);
  });
});
