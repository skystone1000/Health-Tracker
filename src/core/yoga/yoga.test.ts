import { describe, expect, it } from "vitest";
import { AsanaSchema, type Asana } from "./schema";
import { applyAsanaFilters, isContraindicated, withinLevel } from "./filters";
import { generateSequence, sequenceIdFor } from "./sequence-engine";
import { sequenceEstimatedKcal, sequenceTotals } from "./duration";
import { defaultFitnessProfile, type FitnessProfile } from "@/core/fitness";

const make = (
  over: Partial<Asana> & Pick<Asana, "id" | "sanskritName" | "englishName">,
): Asana =>
  AsanaSchema.parse({
    family: "standing",
    difficulty: "beginner",
    metValue: 2.5,
    focus: ["flexibility"],
    defaultHoldSec: 30,
    ...over,
  });

const catalogue: Asana[] = [
  make({ id: "tadasana", sanskritName: "Tadasana", englishName: "Mountain", family: "standing" }),
  make({ id: "vrksasana", sanskritName: "Vrksasana", englishName: "Tree", family: "balance", focus: ["balance"] }),
  make({ id: "bhujangasana", sanskritName: "Bhujangasana", englishName: "Cobra", family: "backbend", contraindications: ["pregnancy", "back-injury"] }),
  make({ id: "paschimottanasana", sanskritName: "Paschimottanasana", englishName: "Seated Forward Bend", family: "forwardBend" }),
  make({ id: "bakasana", sanskritName: "Bakasana", englishName: "Crow", family: "armBalance", difficulty: "advanced", focus: ["strength"] }),
  make({ id: "savasana", sanskritName: "Savasana", englishName: "Corpse", family: "restorative", focus: ["relaxation"], defaultHoldSec: 120 }),
  make({ id: "nadi", sanskritName: "Nadi Shodhana", englishName: "Alternate Nostril Breathing", family: "pranayama", focus: ["breath"], defaultHoldSec: 60 }),
];

describe("yoga filters", () => {
  it("withinLevel respects difficulty rank", () => {
    expect(withinLevel(catalogue[4], "beginner")).toBe(false);
    expect(withinLevel(catalogue[4], "advanced")).toBe(true);
  });

  it("isContraindicated matches user limitations", () => {
    expect(isContraindicated(catalogue[2], ["pregnancy"])).toBe(true);
    expect(isContraindicated(catalogue[2], ["wrist"])).toBe(false);
  });

  it("applyAsanaFilters filters by family/focus/search", () => {
    expect(applyAsanaFilters(catalogue, { family: "balance" })).toHaveLength(1);
    expect(applyAsanaFilters(catalogue, { focus: "breath" })).toHaveLength(1);
    expect(applyAsanaFilters(catalogue, { search: "cobra" })).toHaveLength(1);
  });
});

describe("generateSequence", () => {
  const profile: FitnessProfile = {
    ...defaultFitnessProfile(),
    yogaGoal: "flexibility",
    yogaLevel: "beginner",
  };

  it("is deterministic", () => {
    expect(generateSequence(profile, catalogue)).toEqual(
      generateSequence(profile, catalogue),
    );
  });

  it("excludes asanas above the chosen level", () => {
    const seq = generateSequence(profile, catalogue);
    expect(seq.poses.map((p) => p.asanaId)).not.toContain("bakasana");
  });

  it("excludes contraindicated asanas", () => {
    const seq = generateSequence(
      { ...profile, limitations: ["pregnancy"] },
      catalogue,
    );
    expect(seq.poses.map((p) => p.asanaId)).not.toContain("bhujangasana");
  });

  it("orders pranayama before standing and rest last", () => {
    const seq = generateSequence(profile, catalogue);
    const ids = seq.poses.map((p) => p.asanaId);
    expect(ids.indexOf("nadi")).toBeLessThan(ids.indexOf("tadasana"));
    expect(ids[ids.length - 1]).toBe("savasana");
  });
});

describe("sequence style bias & counter-poses", () => {
  const profile: FitnessProfile = {
    ...defaultFitnessProfile(),
    yogaGoal: "flexibility",
    yogaLevel: "beginner",
  };

  it("Yin style lengthens holds vs balanced", () => {
    const balanced = generateSequence(profile, catalogue);
    const yin = generateSequence(profile, catalogue, "yin");
    expect(yin.totalMin).toBeGreaterThan(balanced.totalMin);
    expect(yin.id).toBe(sequenceIdFor(profile, "yin"));
  });

  it("inserts a gentle counter-pose after a backbend", () => {
    const cobra = make({ id: "cobra", sanskritName: "Bhujangasana", englishName: "Cobra", family: "backbend", counterAsanaIds: ["child"] });
    const child = make({ id: "child", sanskritName: "Balasana", englishName: "Child", family: "restorative", focus: ["relaxation"] });
    const seq = generateSequence(profile, [cobra, child]);
    const ids = seq.poses.map((p) => p.asanaId);
    expect(ids.indexOf("child")).toBe(ids.indexOf("cobra") + 1);
  });
});

describe("sequence duration & kcal", () => {
  it("totals hold durations", () => {
    const seq = generateSequence(defaultFitnessProfile(), catalogue);
    const t = sequenceTotals(seq);
    expect(t.poses).toBe(seq.poses.length);
    expect(t.totalSec).toBeGreaterThan(0);
  });

  it("estimates kcal from per-pose METs", () => {
    const byId = new Map(catalogue.map((a) => [a.id, a]));
    const seq = {
      id: "s",
      name: "s",
      focus: "relaxation" as const,
      totalMin: 2,
      poses: [{ asanaId: "savasana", holdSec: 120 }],
      source: "user" as const,
    };
    // 2.5 MET, 70 kg, 2 min → 2.5*70*(2/60) ≈ 5.8
    expect(sequenceEstimatedKcal(seq, byId, 70)).toBeCloseTo(5.8, 1);
  });
});
