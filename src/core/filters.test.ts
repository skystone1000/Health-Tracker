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
