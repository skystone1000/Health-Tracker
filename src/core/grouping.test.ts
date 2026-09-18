import { describe, expect, it } from "vitest";
import { groupFoods, UNCLASSIFIED } from "./grouping";
import { makeFood } from "./test-fixtures";

const rice = makeFood({
  id: "rice",
  category: "Grains & Cereals",
  mealTypes: ["lunch", "dinner"],
  region: "Pan-Indian",
  prep: "boiled",
  itemType: "ingredient",
  dietTypes: ["veg", "vegan"],
});
const upma = makeFood({
  id: "upma",
  category: "Grains & Cereals",
  mealTypes: ["breakfast"],
  region: "South Indian",
  prep: "sauteed",
  itemType: "dish",
  dietTypes: ["veg", "vegan"],
});
const paneer = makeFood({
  id: "paneer",
  category: "Dairy",
  mealTypes: ["lunch"],
  region: "North Indian",
  prep: "raw",
  dietTypes: ["veg"],
});
/** No facets at all — the Unclassified case. */
const mystery = makeFood({ id: "mystery", category: "Vegetables" });

const all = [rice, upma, paneer, mystery];

describe("groupFoods", () => {
  it("returns one flat group for 'none'", () => {
    const groups = groupFoods(all, "none");
    expect(groups).toHaveLength(1);
    expect(groups[0].foods).toHaveLength(4);
  });

  it("returns no groups for an empty list", () => {
    expect(groupFoods([], "none")).toEqual([]);
    expect(groupFoods([], "category")).toEqual([]);
  });

  it("groups by category in FOOD_CATEGORIES order, not alphabetically", () => {
    const groups = groupFoods(all, "category");
    // Grains & Cereals precedes Vegetables precedes Dairy in the enum.
    expect(groups.map((g) => g.key)).toEqual([
      "Grains & Cereals",
      "Vegetables",
      "Dairy",
    ]);
    expect(groups[0].foods.map((f) => f.id)).toEqual(["rice", "upma"]);
  });

  it("puts a multi-mealType food in every matching group", () => {
    const groups = groupFoods(all, "mealType");
    const lunch = groups.find((g) => g.key === "lunch");
    const dinner = groups.find((g) => g.key === "dinner");
    expect(lunch?.foods.map((f) => f.id)).toEqual(["rice", "paneer"]);
    expect(dinner?.foods.map((f) => f.id)).toEqual(["rice"]);
  });

  it("sorts Unclassified last", () => {
    const groups = groupFoods(all, "mealType");
    expect(groups[groups.length - 1].key).toBe(UNCLASSIFIED);
    expect(groups[groups.length - 1].foods.map((f) => f.id)).toEqual(["mystery"]);
  });

  it("groups by diet, so a vegan food appears under both veg and vegan", () => {
    const groups = groupFoods(all, "diet");
    expect(groups.find((g) => g.key === "veg")?.foods).toHaveLength(4);
    expect(groups.find((g) => g.key === "vegan")?.foods.map((f) => f.id)).toEqual(
      ["rice", "upma"],
    );
  });

  it("sorts an unknown category after the known ones but before Unclassified", () => {
    const custom = makeFood({ id: "custom", category: "Zebra food" });
    const noCategory = makeFood({ id: "blank", category: "" });
    const groups = groupFoods([custom, rice, noCategory], "category");
    expect(groups.map((g) => g.key)).toEqual([
      "Grains & Cereals",
      "Zebra food",
      UNCLASSIFIED,
    ]);
  });

  it("drops empty groups rather than listing every enum value", () => {
    const groups = groupFoods([paneer], "category");
    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe("Dairy");
  });

  it("labels facet values for display", () => {
    const groups = groupFoods([upma], "prep");
    expect(groups[0].label).toBe("Sauteed");
    expect(groupFoods([upma], "itemType")[0].label).toBe("Dish");
  });
});
