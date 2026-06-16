import { metCalories } from "@/core/activity/calories";
import type { Exercise, WorkoutDay } from "./schema";

/** Rough wall-clock minutes a single set occupies (work + rest). */
export const MINUTES_PER_SET = 2.5;

export interface SessionVolume {
  exercises: number;
  totalSets: number;
  totalReps: number;
  estimatedMinutes: number;
}

/** Pure totals for one workout day. */
export function dayVolume(day: WorkoutDay): SessionVolume {
  let totalSets = 0;
  let totalReps = 0;
  for (const item of day.items) {
    totalSets += item.sets.length;
    for (const s of item.sets) totalReps += s.reps ?? 0;
  }
  return {
    exercises: day.items.length,
    totalSets,
    totalReps,
    estimatedMinutes: Math.round(totalSets * MINUTES_PER_SET),
  };
}

/** Estimated calories burned for a workout day (sum of per-exercise METs). */
export function dayEstimatedKcal(
  day: WorkoutDay,
  exercisesById: Map<string, Exercise>,
  weightKg: number,
): number {
  let kcal = 0;
  for (const item of day.items) {
    const ex = exercisesById.get(item.exerciseId);
    if (!ex) continue;
    kcal += metCalories(ex.metValue, weightKg, item.sets.length * MINUTES_PER_SET);
  }
  return Math.round(kcal * 10) / 10;
}
