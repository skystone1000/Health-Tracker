import { describe, expect, it } from "vitest";
import { ExerciseSchema, type Exercise } from "./schema";
import {
  applyExerciseFilters,
  hasAvailableEquipment,
  isLimited,
  withinDifficulty,
} from "./filters";
import { generateRoutine } from "./routine-engine";
import { dayEstimatedKcal, dayVolume } from "./volume";
import { defaultFitnessProfile, type FitnessProfile } from "@/core/fitness";

const make = (over: Partial<Exercise> & Pick<Exercise, "id" | "name">): Exercise =>
  ExerciseSchema.parse({
    primaryMuscles: ["chest"],
    region: "upper",
    equipment: ["bodyweight"],
    difficulty: "beginner",
    metValue: 4,
    ...over,
  });

const catalogue: Exercise[] = [
  make({ id: "pushup", name: "Push-up", primaryMuscles: ["chest"], region: "upper" }),
  make({ id: "pullup", name: "Pull-up", primaryMuscles: ["back"], region: "upper", difficulty: "intermediate" }),
  make({ id: "ohp", name: "Overhead Press", primaryMuscles: ["shoulders"], region: "upper", equipment: ["barbell"] }),
  make({ id: "curl", name: "Biceps Curl", primaryMuscles: ["biceps"], region: "upper", equipment: ["dumbbell"] }),
  make({ id: "dips", name: "Dips", primaryMuscles: ["triceps"], region: "upper" }),
  make({ id: "squat", name: "Squat", primaryMuscles: ["quads"], region: "lower" }),
  make({ id: "rdl", name: "Romanian Deadlift", primaryMuscles: ["hamstrings"], region: "lower", equipment: ["barbell"] }),
  make({ id: "hipthrust", name: "Hip Thrust", primaryMuscles: ["glutes"], region: "lower", equipment: ["barbell"] }),
  make({ id: "calf", name: "Calf Raise", primaryMuscles: ["calves"], region: "lower" }),
  make({ id: "plank", name: "Plank", primaryMuscles: ["core"], region: "core" }),
];

describe("exercise filters", () => {
  it("withinDifficulty respects the difficulty rank", () => {
    expect(withinDifficulty(catalogue[1], "beginner")).toBe(false);
    expect(withinDifficulty(catalogue[1], "intermediate")).toBe(true);
  });

  it("hasAvailableEquipment matches any available item", () => {
    expect(hasAvailableEquipment(catalogue[2], ["bodyweight"])).toBe(false);
    expect(hasAvailableEquipment(catalogue[2], ["barbell"])).toBe(true);
    expect(hasAvailableEquipment(catalogue[2], [])).toBe(true);
  });

  it("isLimited matches name/muscle keywords", () => {
    expect(isLimited(catalogue[0], ["chest"])).toBe(true);
    expect(isLimited(catalogue[0], ["knee"])).toBe(false);
  });

  it("applyExerciseFilters filters by search/muscle/region", () => {
    expect(applyExerciseFilters(catalogue, { search: "press" })).toHaveLength(1);
    expect(applyExerciseFilters(catalogue, { muscle: "quads" })).toHaveLength(1);
    expect(applyExerciseFilters(catalogue, { region: "lower" })).toHaveLength(4);
  });
});

describe("generateRoutine", () => {
  const beginnerBodyweight: FitnessProfile = {
    ...defaultFitnessProfile(),
    equipment: ["bodyweight"],
    experience: "beginner",
    daysPerWeek: 3,
    splitPreference: "fullBody",
    goal: "general",
  };

  it("produces the requested number of days", () => {
    const r = generateRoutine(beginnerBodyweight, catalogue);
    expect(r.days).toHaveLength(3);
  });

  it("is deterministic (same inputs → identical routine)", () => {
    const a = generateRoutine(beginnerBodyweight, catalogue);
    const b = generateRoutine(beginnerBodyweight, catalogue);
    expect(a).toEqual(b);
  });

  it("only includes available, allowed equipment", () => {
    const r = generateRoutine(beginnerBodyweight, catalogue);
    const byId = new Map(catalogue.map((e) => [e.id, e]));
    for (const day of r.days)
      for (const item of day.items)
        expect(byId.get(item.exerciseId)!.equipment).toContain("bodyweight");
  });

  it("respects limitations", () => {
    const r = generateRoutine(
      { ...beginnerBodyweight, limitations: ["chest"] },
      catalogue,
    );
    const ids = r.days.flatMap((d) => d.items.map((i) => i.exerciseId));
    expect(ids).not.toContain("pushup");
  });

  it("applies the goal's set/rep preset", () => {
    const r = generateRoutine(
      { ...beginnerBodyweight, goal: "strength" },
      catalogue,
    );
    const firstItem = r.days[0].items[0];
    expect(firstItem.sets).toHaveLength(5); // strength = 5×5
    expect(firstItem.sets[0].reps).toBe(5);
  });

  it("builds a 3-day Push/Pull/Legs split when requested", () => {
    const r = generateRoutine(
      {
        ...beginnerBodyweight,
        splitPreference: "pushPullLegs",
        daysPerWeek: 3,
        equipment: ["bodyweight", "barbell", "dumbbell"],
      },
      catalogue,
    );
    expect(r.days.map((d) => d.region)).toEqual(["upper", "upper", "lower"]);
  });
});

describe("volume", () => {
  it("sums sets and reps for a day", () => {
    const r = generateRoutine(
      { ...defaultFitnessProfile(), goal: "hypertrophy", equipment: ["bodyweight"] },
      catalogue,
    );
    const v = dayVolume(r.days[0]);
    expect(v.totalSets).toBe(v.exercises * 4); // hypertrophy = 4 sets
    expect(v.totalReps).toBe(v.totalSets * 10);
    expect(v.estimatedMinutes).toBeGreaterThan(0);
  });

  it("estimates kcal from per-exercise METs", () => {
    const byId = new Map(catalogue.map((e) => [e.id, e]));
    const day = {
      label: "x",
      region: "upper" as const,
      items: [{ exerciseId: "pushup", sets: [{ reps: 10 }, { reps: 10 }] }],
    };
    // 2 sets × 2.5 min = 5 min @ 4 MET, 70 kg → 4*70*(5/60) ≈ 23.3
    expect(dayEstimatedKcal(day, byId, 70)).toBeCloseTo(23.3, 1);
  });
});
