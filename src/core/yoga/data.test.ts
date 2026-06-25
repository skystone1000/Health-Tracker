import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ASANA_FAMILIES, AsanaSchema, YOGA_STYLES, type Asana } from "./schema";

const read = (rel: string) =>
  JSON.parse(readFileSync(resolve(__dirname, "../../../public/data", rel), "utf-8"));

describe("asana seed data integrity", () => {
  const asanas: Asana[] = read("asanas.default.json").map((a: unknown) =>
    AsanaSchema.parse(a),
  );

  it("every default asana matches the Asana schema", () => {
    for (const a of read("asanas.default.json")) {
      const parsed = AsanaSchema.safeParse(a);
      if (!parsed.success) throw new Error(`${a.id}: ${parsed.error.message}`);
      expect(parsed.success).toBe(true);
    }
  });

  it("asana ids are unique", () => {
    const ids = asanas.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every default asana carries >=3 evidences", () => {
    for (const a of asanas)
      expect(a.evidences.length, a.id).toBeGreaterThanOrEqual(3);
  });

  it("verified asanas have benefits (pros) and cons", () => {
    for (const a of asanas) {
      expect(a.benefits.length, `${a.id} benefits`).toBeGreaterThan(0);
      expect(a.cons.length, `${a.id} cons`).toBeGreaterThan(0);
    }
  });

  it("covers every asana family", () => {
    const families = new Set(asanas.map((a) => a.family));
    for (const fam of ASANA_FAMILIES) expect(families.has(fam), fam).toBe(true);
  });

  it("represents every yoga style across the catalogue", () => {
    const styles = new Set(asanas.flatMap((a) => a.styles));
    for (const style of YOGA_STYLES) expect(styles.has(style), style).toBe(true);
  });

  it("every counterAsanaId references a real asana", () => {
    const ids = new Set(asanas.map((a) => a.id));
    for (const a of asanas)
      for (const cid of a.counterAsanaIds)
        expect(ids.has(cid), `${a.id} → ${cid}`).toBe(true);
  });

  it("no asana lists itself as its own counter", () => {
    for (const a of asanas)
      expect(a.counterAsanaIds.includes(a.id), a.id).toBe(false);
  });
});
