import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { matchesDiet } from "./filters";
import { computeTargets } from "./nutrition-engine";
import { generateWeekPlan, plannablePool, scoreWeek } from "./week-planner";
import { RdaTableSchema, type FoodItem, type UserProfile } from "./schema";
import { planTotals } from "./totals";

/**
 * The unit tests use a hand-built pool. This one runs the engine against the
 * REAL shipped database, which is where data gaps (too few fruits, too little
 * dairy) actually bite. If a band here fails, the fix is usually *data* — add
 * foods per docs/ADD_FOOD.md — not a looser assertion.
 */
const read = (rel: string) =>
  JSON.parse(readFileSync(resolve(__dirname, "../../public/data", rel), "utf-8"));

const foods: FoodItem[] = read("foods.default.json");
const rda = RdaTableSchema.parse(read("rda.icmr-nin-2020.json"));

const baseProfile: UserProfile = {
  id: "local",
  name: "Test",
  age: 30,
  sex: "male",
  heightCm: 175,
  weightKg: 72,
  activityLevel: "moderate",
  workType: "desk",
  goal: "maintain",
  dietType: "veg",
  exclusions: [],
  plannerMode: "weekly",
};

const byId = new Map(foods.map((f) => [f.id, f]));
const diets = ["veg", "vegan", "nonveg"] as const;

describe("week planner on the real seed database", () => {
  for (const dietType of diets) {
    const profile = { ...baseProfile, dietType };
    const { calories, targets } = computeTargets(profile, rda);
    const weekTargets = { calories, protein: targets.protein_g };

    it(`has a workable food pool for a ${dietType} user`, () => {
      expect(plannablePool(profile, foods).length).toBeGreaterThan(30);
    });

    it(`generates seven in-band days for a ${dietType} user, across seeds`, () => {
      for (const seed of [1, 2, 3, 4, 5]) {
        const week = generateWeekPlan(profile, weekTargets, foods, {
          seed,
          startDate: "2026-09-21",
        });
        expect(week.days).toHaveLength(7);
        for (const day of week.days) {
          const totals = planTotals(day, byId);
          expect(totals.energy_kcal).toBeGreaterThan(calories * 0.85);
          expect(totals.energy_kcal).toBeLessThan(calories * 1.15);

          /**
           * Protein is asserted as a **share of the day's energy**, not as a
           * share of `targets.protein_g`, and here is why:
           * `nutrition-engine.ts`'s DEFAULT_SPLIT asks for 25 % of energy from
           * protein (2.25 g/kg for this profile — 162 g). The median food in
           * this database carries 3.1 g protein per 100 kcal, so a plate that
           * also honours the ICMR cereal/vegetable/fruit quotas tops out around
           * 14-19 % of energy. Hitting 25 % would mean a soya-and-tofu-only
           * day, which is neither Indian nor balanced.
           *
           * So the planner maximises protein *within* the plate (see
           * `balanceDay` step 2, which trades grams from the least to the most
           * protein-dense items) and this test holds it to what a balanced
           * plate can actually deliver. The gap to 25 % is a property of the
           * target engine, not of the planner — see docs/plan_6 "Outcome".
           *
           * Measured over 3 diets x 15 seeds x 7 days (315 days): the floor is
           * 12.73 % of energy (veg 12.73, vegan 13.29, nonveg 14.16). The bar
           * below sits just under that, so a regression in the selection bias,
           * the slot fallback or `balanceDay` trips it.
           *
           * NOTE: every low-protein food added to the seed data (grapes took
           * veg from 13.42 % to 12.73 %) dilutes this floor, so this assertion
           * will eventually fire on a data change rather than a code change.
           * That is intended — it forces a look. If it fires after adding
           * fruit, re-measure all three diets and either add a protein-dense
           * food alongside it or re-tune `proteinBias` / `SLOT_FALLBACK` in
           * day-planner.ts; do not simply lower the bar.
           */
          const proteinEnergyShare = (totals.protein_g * 4) / totals.energy_kcal;
          expect(proteinEnergyShare).toBeGreaterThan(0.125);
          // Regression guard against the planner simply giving up on protein.
          expect(totals.protein_g).toBeGreaterThan(targets.protein_g * 0.5);
        }
      }
    });

    it(`never violates the ${dietType} diet`, () => {
      const week = generateWeekPlan(profile, weekTargets, foods, {
        seed: 7,
        startDate: "2026-09-21",
      });
      for (const day of week.days) {
        for (const item of day.meals.flatMap((m) => m.items)) {
          // `nonveg` legitimately eats veg food too, so the rule is the
          // single source of truth in filters.ts, not a tag equality check.
          expect(matchesDiet(byId.get(item.foodId)!, dietType)).toBe(true);
        }
      }
    });

    it(`scores a ${dietType} week acceptably and reports its variety`, () => {
      const week = generateWeekPlan(profile, weekTargets, foods, {
        seed: 11,
        startDate: "2026-09-21",
      });
      const score = scoreWeek(week, byId, weekTargets);
      expect(score.total).toBeGreaterThan(60);
      expect(score.avgGroups).toBeGreaterThanOrEqual(dietType === "vegan" ? 4 : 5);
      expect(score.distinctFoods).toBeGreaterThanOrEqual(20);
    });
  }

  it("respects a user's exclusions end to end", () => {
    const profile = { ...baseProfile, exclusions: ["rice", "milk"] };
    const { calories, targets } = computeTargets(profile, rda);
    const week = generateWeekPlan(
      profile,
      { calories, protein: targets.protein_g },
      foods,
      { seed: 3, startDate: "2026-09-21" },
    );
    const names = week.days.flatMap((d) =>
      d.meals.flatMap((m) => m.items.map((i) => byId.get(i.foodId)!.name.toLowerCase())),
    );
    for (const name of names) {
      expect(name).not.toContain("rice");
      expect(name).not.toContain("milk");
    }
  });
});

/**
 * Not a pass/fail rule — a *report*. These groups are thin in the seed data and
 * a thin group means a repetitive week. See docs/ADD_FOOD.md.
 */
describe("seed coverage report", () => {
  it("prints how many plannable foods each diet has per plate group", () => {
    for (const dietType of diets) {
      const pool = plannablePool({ ...baseProfile, dietType }, foods);
      const counts = new Map<string, number>();
      for (const food of pool) {
        counts.set(food.category, (counts.get(food.category) ?? 0) + 1);
      }
      // eslint-disable-next-line no-console
      console.log(`[coverage] ${dietType}:`, Object.fromEntries(counts));
      expect(pool.length).toBeGreaterThan(0);
    }
  });
});
