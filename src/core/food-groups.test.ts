import { describe, expect, it } from "vitest";
import {
  clampPortion,
  dailyQuotas,
  isPlannable,
  PLANNABLE_GROUPS,
  plateGroup,
  portionBounds,
  quantityForKcal,
  REFERENCE_KCAL,
} from "./food-groups";
import { makeFood, makeNutrients } from "./test-fixtures";

const rice = makeFood({
  id: "rice",
  category: "Grains & Cereals",
  nutrients: makeNutrients({ energy_kcal: 130, carbs_g: 28, protein_g: 2.7 }),
});
const oil = makeFood({ id: "oil", category: "Fats & Oils" });
const dal = makeFood({ id: "dal", category: "Legumes & Pulses" });
const milk = makeFood({ id: "milk", category: "Dairy" });
const egg = makeFood({ id: "egg", category: "Eggs", dietTypes: ["nonveg"] });
const almond = makeFood({ id: "almond", category: "Nuts, Seeds & Dry Fruits" });
const upma = makeFood({
  id: "upma",
  category: "Grains & Cereals",
  itemType: "dish",
  nutrients: makeNutrients({ energy_kcal: 150 }),
});

describe("plateGroup", () => {
  it("maps every food category onto an ICMR plate group", () => {
    expect(plateGroup(rice)).toBe("cereals");
    expect(plateGroup(dal)).toBe("pulses");
    expect(plateGroup(egg)).toBe("flesh");
    expect(plateGroup(milk)).toBe("dairy");
    expect(plateGroup(almond)).toBe("nutsSeeds");
    expect(plateGroup(oil)).toBe("fatsOils");
  });

  it("files an unknown (user-authored) category under 'other'", () => {
    expect(plateGroup(makeFood({ id: "x", category: "Space food" }))).toBe("other");
  });
});

describe("isPlannable", () => {
  it("excludes cooking inputs but keeps real foods", () => {
    expect(isPlannable(oil)).toBe(false);
    expect(isPlannable(makeFood({ id: "haldi", category: "Spices & Condiments" }))).toBe(false);
    expect(isPlannable(rice)).toBe(true);
    expect(PLANNABLE_GROUPS).not.toContain("fatsOils");
  });
});

describe("dailyQuotas", () => {
  it("matches ICMR 'My Plate for the Day' at the 2000 kcal reference", () => {
    const q = dailyQuotas(REFERENCE_KCAL, "nonveg");
    expect(q.cereals).toBe(250);
    expect(q.vegetables).toBe(400);
    expect(q.fruits).toBe(100);
    expect(q.dairy).toBe(300);
    expect(q.nutsSeeds).toBe(35);
    // 85 g protein allowance, split 55/45 for an omnivore
    expect(q.pulses + q.flesh).toBeCloseTo(85, 5);
    expect(q.flesh).toBeGreaterThan(0);
  });

  it("scales linearly with the calorie target", () => {
    const q = dailyQuotas(3000, "veg");
    expect(q.cereals).toBeCloseTo(375, 5);
    expect(q.vegetables).toBeCloseTo(600, 5);
  });

  it("gives a vegetarian the whole protein allowance as pulses", () => {
    const q = dailyQuotas(REFERENCE_KCAL, "veg");
    expect(q.flesh).toBe(0);
    expect(q.pulses).toBeCloseTo(85, 5);
    expect(q.dairy).toBe(300);
  });

  it("drops dairy for a vegan and redistributes onto pulses and nuts", () => {
    const veg = dailyQuotas(REFERENCE_KCAL, "veg");
    const vegan = dailyQuotas(REFERENCE_KCAL, "vegan");
    expect(vegan.dairy).toBe(0);
    expect(vegan.pulses).toBeGreaterThan(veg.pulses);
    expect(vegan.nutsSeeds).toBeGreaterThan(veg.nutsSeeds);
  });

  it("never returns a quota for a cooking input", () => {
    expect(dailyQuotas(REFERENCE_KCAL, "veg").fatsOils).toBe(0);
  });
});

describe("quantityForKcal", () => {
  it("scales from the food's reference quantity and rounds to 5 g", () => {
    // rice: 130 kcal / 100 g → 260 kcal needs 200 g
    expect(quantityForKcal(rice, 260)).toBe(200);
  });

  it("never returns less than 5 g", () => {
    expect(quantityForKcal(rice, 0)).toBe(5);
  });
});

describe("portionBounds / clampPortion", () => {
  it("keeps an ingredient inside its group's sane serving range", () => {
    expect(clampPortion(almond, 500)).toBe(portionBounds(almond).max);
    expect(clampPortion(almond, 1)).toBe(portionBounds(almond).min);
  });

  it("allows a cooked dish a bigger plate than a raw ingredient", () => {
    expect(portionBounds(upma).max).toBeGreaterThan(portionBounds(rice).max);
  });

  it("rounds to the nearest 5 g", () => {
    expect(clampPortion(rice, 123)).toBe(125);
  });
});
