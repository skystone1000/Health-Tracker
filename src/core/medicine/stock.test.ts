import { describe, expect, it } from "vitest";
import type { MedicineStockEntry } from "./schema";
import { cabinetSummary, expired, expiringSoon, lowStock } from "./stock";

const today = "2026-09-03";

const entry = (
  over: Partial<MedicineStockEntry> & { medicineId: string },
): MedicineStockEntry => ({
  owned: true,
  quantity: 5,
  unit: "strips",
  ...over,
});

describe("stock derived views", () => {
  const stock: MedicineStockEntry[] = [
    entry({ medicineId: "past", expiryDate: "2026-08-01" }), // expired
    entry({ medicineId: "soon", expiryDate: "2026-09-20" }), // within 30 days
    entry({ medicineId: "edge", expiryDate: "2026-10-03" }), // exactly +30 days => soon
    entry({ medicineId: "far", expiryDate: "2027-01-01" }), // ok
    entry({ medicineId: "low", quantity: 1, expiryDate: "2027-01-01" }), // low stock
    entry({ medicineId: "unowned", owned: false, expiryDate: "2026-08-01" }), // ignored
    entry({ medicineId: "nodate", expiryDate: undefined }), // ok, no expiry
  ];

  it("expired lists only owned items with a past expiry", () => {
    expect(expired(stock, today).map((e) => e.medicineId)).toEqual(["past"]);
  });

  it("expiringSoon includes the exact 30-day boundary, excludes expired", () => {
    expect(expiringSoon(stock, today).map((e) => e.medicineId).sort()).toEqual([
      "edge",
      "soon",
    ]);
  });

  it("lowStock lists owned items at or below the threshold", () => {
    expect(lowStock(stock, 1).map((e) => e.medicineId)).toEqual(["low"]);
  });

  it("cabinetSummary buckets each owned entry once, by priority", () => {
    const s = cabinetSummary(stock, today);
    expect(s.expired.map((e) => e.medicineId)).toEqual(["past"]);
    expect(s.expiringSoon.map((e) => e.medicineId).sort()).toEqual(["edge", "soon"]);
    expect(s.lowStock.map((e) => e.medicineId)).toEqual(["low"]);
    expect(s.ok.map((e) => e.medicineId).sort()).toEqual(["far", "nodate"]);
    // "unowned" appears in no bucket
    const all = [...s.expired, ...s.expiringSoon, ...s.lowStock, ...s.ok];
    expect(all.some((e) => e.medicineId === "unowned")).toBe(false);
  });
});
