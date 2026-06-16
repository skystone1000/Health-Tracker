import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { BODY_REGIONS, ExerciseSchema, MUSCLE_GROUPS } from "./schema";

const read = (rel: string) =>
  JSON.parse(readFileSync(resolve(__dirname, "../../../public/data", rel), "utf-8"));

describe("exercise seed data integrity", () => {
  const exercises = read("exercises.default.json");

  it("every default exercise matches the Exercise schema", () => {
    for (const ex of exercises) {
      const parsed = ExerciseSchema.safeParse(ex);
      if (!parsed.success) throw new Error(`${ex.id}: ${parsed.error.message}`);
      expect(parsed.success).toBe(true);
    }
  });

  it("exercise ids are unique", () => {
    const ids = exercises.map((e: { id: string }) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every default exercise carries >=3 evidences", () => {
    for (const ex of exercises) {
      expect(ex.evidences.length, ex.id).toBeGreaterThanOrEqual(3);
    }
  });

  it("covers every body region", () => {
    const regions = new Set(exercises.map((e: { region: string }) => e.region));
    for (const region of BODY_REGIONS) expect(regions.has(region), region).toBe(true);
  });

  it("covers every muscle group across the catalogue", () => {
    const muscles = new Set(
      exercises.flatMap((e: { primaryMuscles: string[] }) => e.primaryMuscles),
    );
    for (const m of MUSCLE_GROUPS) expect(muscles.has(m), m).toBe(true);
  });
});
