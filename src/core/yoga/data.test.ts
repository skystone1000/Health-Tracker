import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ASANA_FAMILIES, AsanaSchema } from "./schema";

const read = (rel: string) =>
  JSON.parse(readFileSync(resolve(__dirname, "../../../public/data", rel), "utf-8"));

describe("asana seed data integrity", () => {
  const asanas = read("asanas.default.json");

  it("every default asana matches the Asana schema", () => {
    for (const a of asanas) {
      const parsed = AsanaSchema.safeParse(a);
      if (!parsed.success) throw new Error(`${a.id}: ${parsed.error.message}`);
      expect(parsed.success).toBe(true);
    }
  });

  it("asana ids are unique", () => {
    const ids = asanas.map((a: { id: string }) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every default asana carries >=3 evidences", () => {
    for (const a of asanas) {
      expect(a.evidences.length, a.id).toBeGreaterThanOrEqual(3);
    }
  });

  it("covers every asana family", () => {
    const families = new Set(asanas.map((a: { family: string }) => a.family));
    for (const fam of ASANA_FAMILIES) expect(families.has(fam), fam).toBe(true);
  });
});
