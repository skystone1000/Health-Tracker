import { describe, expect, it } from "vitest";
import {
  MedicineSchema,
  MedicineStockEntrySchema,
  categoriesForSystem,
  MEDICINE_SYSTEMS,
} from "./schema";

const baseMedicine = {
  id: "paracetamol",
  name: "Paracetamol",
  system: "allopathy",
  category: "analgesic",
  form: "tablet",
  commonUses: ["Fever", "Mild pain"],
  evidences: [
    { source: "WHO EML", ref: "2023" },
    { source: "NHS medicines", ref: "Paracetamol" },
  ],
};

describe("MedicineSchema", () => {
  it("parses a valid allopathy medicine and applies array defaults", () => {
    const m = MedicineSchema.parse(baseMedicine);
    expect(m.brandNames).toEqual([]);
    expect(m.cautions).toEqual([]);
    expect(m.contraindications).toEqual([]);
    expect(m.tags).toEqual([]);
    expect(m.source).toBe("default");
    expect(m.verification.status).toBe("unverified");
  });

  it("rejects a category that does not belong to the system", () => {
    const bad = { ...baseMedicine, system: "homeopathy", category: "analgesic" };
    const parsed = MedicineSchema.safeParse(bad);
    expect(parsed.success).toBe(false);
  });

  it("accepts a homeopathy medicine with a valid category + potency", () => {
    const m = MedicineSchema.parse({
      id: "arnica-30c",
      name: "Arnica Montana",
      system: "homeopathy",
      category: "potency",
      form: "globules",
      potency: "30C",
      commonUses: ["Bruises"],
      evidences: [
        { source: "GHP", ref: "Arnica" },
        { source: "HPUS", ref: "Arnica montana" },
      ],
    });
    expect(m.potency).toBe("30C");
  });

  it("exposes the valid categories for each system", () => {
    expect(categoriesForSystem("biochemic")).toContain("tissue-salt");
    expect(categoriesForSystem("homeopathy")).toContain("mother-tincture");
    expect(MEDICINE_SYSTEMS).toHaveLength(3);
  });
});

describe("MedicineStockEntrySchema", () => {
  it("parses a stock entry with defaults", () => {
    const s = MedicineStockEntrySchema.parse({
      medicineId: "paracetamol",
      owned: true,
      quantity: 2,
      unit: "strips",
    });
    expect(s.owned).toBe(true);
    expect(s.expiryDate).toBeUndefined();
  });
});
