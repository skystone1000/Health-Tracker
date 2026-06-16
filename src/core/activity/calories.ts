import type { BurnsCalories } from "./schema";

/**
 * MET-based calorie estimation — the SINGLE source of truth for "calories
 * burned" across the whole app (both exercise and yoga reuse this).
 *
 *   kcal = MET × bodyMass(kg) × duration(hours)
 *
 * Pure and deterministic. Returns 0 for non-positive inputs.
 */
export function metCalories(
  metValue: number,
  weightKg: number,
  minutes: number,
): number {
  if (metValue <= 0 || weightKg <= 0 || minutes <= 0) return 0;
  const kcal = metValue * weightKg * (minutes / 60);
  return Math.round(kcal * 10) / 10;
}

/** Convenience overload for anything implementing {@link BurnsCalories}. */
export function activityCalories(
  activity: BurnsCalories,
  weightKg: number,
  minutes: number,
): number {
  return metCalories(activity.metValue, weightKg, minutes);
}
