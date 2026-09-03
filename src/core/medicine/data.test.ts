import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CATEGORIES_BY_SYSTEM,
  MEDICINE_SYSTEMS,
  MedicineSchema,
  type Medicine,
} from "./schema";

const read = (rel: string) =>
  JSON.parse(readFileSync(resolve(__dirname, "../../../public/data", rel), "utf-8"));

describe("medicine seed data integrity", () => {
  const raw = read("medicines.default.json");
  const medicines: Medicine[] = raw.map((m: unknown) => MedicineSchema.parse(m));

  it("every default medicine matches the Medicine schema", () => {
    for (const m of raw) {
      const parsed = MedicineSchema.safeParse(m);
      if (!parsed.success) throw new Error(`${m.id}: ${parsed.error.message}`);
      expect(parsed.success).toBe(true);
    }
  });

  it("medicine ids are unique", () => {
    const ids = medicines.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every default medicine carries >=2 evidences", () => {
    for (const m of medicines)
      expect(m.evidences.length, m.id).toBeGreaterThanOrEqual(2);
  });

  it("every category is valid for its system", () => {
    for (const m of medicines) {
      const allowed = CATEGORIES_BY_SYSTEM[m.system] as readonly string[];
      expect(allowed.includes(m.category), `${m.id}: ${m.category}`).toBe(true);
    }
  });

  it("covers every medicine system", () => {
    const systems = new Set(medicines.map((m) => m.system));
    for (const s of MEDICINE_SYSTEMS) expect(systems.has(s), s).toBe(true);
  });
});
