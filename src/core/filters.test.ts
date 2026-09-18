import { describe, expect, it } from "vitest";
import { applyFilters, isExcluded, matchesDiet } from "./filters";
import { makeFood } from "./test-fixtures";

const paneer = makeFood({ id: "paneer", category: "Dairy", dietTypes: ["veg"] });
const tofu = makeFood({ id: "tofu", dietTypes: ["veg", "vegan"] });
const chicken = makeFood({
  id: "chicken",
  category: "Meat",
  dietTypes: ["nonveg"],
});
const peanut = makeFood({
  id: "peanut",
  aliases: ["groundnut"],
  allergens: ["peanut"],
  dietTypes: ["veg", "vegan"],
});

const all = [paneer, tofu, chicken, peanut];

describe("matchesDiet", () => {
  it("vegan only sees vegan-tagged foods", () => {
    expect(matchesDiet(tofu, "vegan")).toBe(true);
    expect(matchesDiet(paneer, "vegan")).toBe(false);
    expect(matchesDiet(chicken, "vegan")).toBe(false);
  });

  it("veg sees veg and vegan but not nonveg", () => {
    expect(matchesDiet(paneer, "veg")).toBe(true);
    expect(matchesDiet(tofu, "veg")).toBe(true);
    expect(matchesDiet(chicken, "veg")).toBe(false);
  });

  it("nonveg sees everything", () => {
    expect(all.every((f) => matchesDiet(f, "nonveg"))).toBe(true);
  });
});

describe("isExcluded", () => {
  it("matches by allergen or alias keyword", () => {
    expect(isExcluded(peanut, ["peanut"])).toBe(true);
    expect(isExcluded(peanut, ["groundnut"])).toBe(true);
    expect(isExcluded(tofu, ["peanut"])).toBe(false);
  });

  it("is empty-safe", () => {
    expect(isExcluded(peanut, [])).toBe(false);
  });
});

describe("applyFilters", () => {
  it("combines diet + exclusions (single source of truth)", () => {
    const result = applyFilters(all, {
      dietType: "vegan",
      exclusions: ["peanut"],
    });
    expect(result.map((f) => f.id)).toEqual(["tofu"]);
  });

  it("supports search and category", () => {
    expect(
      applyFilters(all, { dietType: "nonveg", search: "chick" }).map((f) => f.id),
    ).toEqual(["chicken"]);
    expect(
      applyFilters(all, { dietType: "nonveg", category: "Dairy" }).map((f) => f.id),
    ).toEqual(["paneer"]);
  });
});

describe("applyFilters — facets and romanised aliases", () => {
  const bhopla = makeFood({
    id: "bhopla-sabji",
    name: "Bhopla Sabji (pumpkin)",
    aliases: ["Bhoplyachi bhaji", "Kaddu ki sabzi", "Pumpkin sabzi"],
    category: "Vegetables",
    mealTypes: ["side"],
    region: "Maharashtrian",
    dietTypes: ["veg", "vegan"],
  });
  const idli = makeFood({
    id: "idli",
    name: "Idli",
    aliases: ["Idly"],
    category: "Grains & Cereals",
    mealTypes: ["breakfast"],
    region: "South Indian",
    dietTypes: ["veg", "vegan"],
  });
  const foods = [bhopla, idli];

  it("finds a food by its romanised regional alias", () => {
    const hits = applyFilters(foods, { dietType: "veg", search: "bhopla" });
    expect(hits.map((f) => f.id)).toEqual(["bhopla-sabji"]);
  });

  it("matches an alias case-insensitively", () => {
    const hits = applyFilters(foods, { dietType: "veg", search: "KADDU" });
    expect(hits.map((f) => f.id)).toEqual(["bhopla-sabji"]);
  });

  it("filters by meal type", () => {
    const hits = applyFilters(foods, { dietType: "veg", mealType: "breakfast" });
    expect(hits.map((f) => f.id)).toEqual(["idli"]);
  });

  it("filters by region", () => {
    const hits = applyFilters(foods, { dietType: "veg", region: "Maharashtrian" });
    expect(hits.map((f) => f.id)).toEqual(["bhopla-sabji"]);
  });

  it("ignores facet filters that are not set", () => {
    expect(applyFilters(foods, { dietType: "veg" })).toHaveLength(2);
  });
});
