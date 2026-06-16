import { z } from "zod";

/**
 * Shared activity primitives used by BOTH the exercise and yoga domains.
 * This module is intentionally tiny and depends on nothing else in `core/`,
 * so the two domains stay decoupled from each other (they share only this).
 */

// Difficulty is shared vocabulary across exercises and asanas.
export const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;
export const DifficultySchema = z.enum(DIFFICULTIES);
export type Difficulty = z.infer<typeof DifficultySchema>;

/** Ordinal rank so "difficulty ≤ experience" comparisons are one source of truth. */
export const DIFFICULTY_RANK: Record<Difficulty, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
};

/** Anything that burns calories exposes a MET intensity (LSP/ISP seam). */
export interface BurnsCalories {
  metValue: number;
}

export const ACTIVITY_KINDS = ["exercise", "yoga"] as const;
export const ActivityKindSchema = z.enum(ACTIVITY_KINDS);
export type ActivityKind = z.infer<typeof ActivityKindSchema>;

/**
 * One logged unit of activity (a single row of history). Deliberately generic:
 * it carries a human `label` so the log view never has to resolve `refId`,
 * keeping the history UI decoupled from the exercise/yoga catalogs.
 */
export const ActivityLogEntrySchema = z.object({
  id: z.string(),
  date: z.string(), // ISO yyyy-mm-dd
  kind: ActivityKindSchema,
  refId: z.string(), // exercise / asana / routine / sequence id
  label: z.string(),
  durationMin: z.number().nonnegative(),
  estimatedKcal: z.number().nonnegative(),
  note: z.string().optional(),
});
export type ActivityLogEntry = z.infer<typeof ActivityLogEntrySchema>;
