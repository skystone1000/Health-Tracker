import { describe, expect, it } from "vitest";
import { MedicineSchema, type Medicine } from "./schema";
import { applyMedicineFilters } from "./filters";

const make = (over: Partial<Medicine> & { id: string }): Medicine =>
  MedicineSchema.parse({
    name: over.id,
    system: "allopathy",
    category: "analgesic",
    form: "tablet",
    ...over,
  });

const list: Medicine[] = [
  make({ id: "paracetamol", name: "Paracetamol", brandNames: ["Crocin"] }),
  make({ id: "cetirizine", name: "Cetirizine", category: "antihistamine" }),
  make({ id: "arnica", name: "Arnica", system: "homeopathy", category: "potency" }),
];

describe("applyMedicineFilters", () => {
  it("returns everything with an empty filter", () => {
    expect(applyMedicineFilters(list, {})).toHaveLength(3);
  });

  it("searches name and brand names case-insensitively", () => {
    expect(applyMedicineFilters(list, { search: "crocin" }).map((m) => m.id)).toEqual([
      "paracetamol",
    ]);
  });

  it("filters by system", () => {
    expect(
      applyMedicineFilters(list, { system: "homeopathy" }).map((m) => m.id),
    ).toEqual(["arnica"]);
  });

  it("filters by category", () => {
    expect(
      applyMedicineFilters(list, { category: "antihistamine" }).map((m) => m.id),
    ).toEqual(["cetirizine"]);
  });

  it("filters to owned-only using the supplied owned-id set", () => {
    const owned = new Set(["paracetamol"]);
    expect(
      applyMedicineFilters(list, { ownedOnly: true }, owned).map((m) => m.id),
    ).toEqual(["paracetamol"]);
  });
});
