import { z } from "zod";
import { EvidenceSchema, VerificationSchema } from "@/core/schema";
import { DifficultySchema } from "@/core/activity/schema";

/**
 * Exercise domain types. Pure (no React/DOM). New muscle groups, regions or
 * equipment are added to these key lists (OCP) — engines iterate the registries
 * rather than branching on hard-coded names.
 */

export const MUSCLE_GROUPS = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "forearms",
  "core",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "fullBody",
  "cardio",
] as const;
export const MuscleGroupSchema = z.enum(MUSCLE_GROUPS);
export type MuscleGroup = z.infer<typeof MuscleGroupSchema>;

export const BODY_REGIONS = [
  "upper",
  "lower",
  "core",
  "fullBody",
  "cardio",
] as const;
export const BodyRegionSchema = z.enum(BODY_REGIONS);
export type BodyRegion = z.infer<typeof BodyRegionSchema>;

export const EQUIPMENT = [
  "bodyweight",
  "dumbbell",
  "barbell",
  "machine",
  "kettlebell",
  "bands",
  "cardioMachine",
] as const;
export const EquipmentSchema = z.enum(EQUIPMENT);
export type Equipment = z.infer<typeof EquipmentSchema>;

export const ExerciseSchema = z.object({
  id: z.string(),
  name: z.string(),
  aliases: z.array(z.string()).default([]),
  primaryMuscles: z.array(MuscleGroupSchema).min(1),
  secondaryMuscles: z.array(MuscleGroupSchema).default([]),
  region: BodyRegionSchema,
  equipment: z.array(EquipmentSchema).min(1),
  difficulty: DifficultySchema,
  metValue: z.number().positive(), // satisfies BurnsCalories
  instructions: z.array(z.string()).default([]),
  cues: z.array(z.string()).default([]),
  defaultSets: z.number().int().positive().optional(),
  defaultReps: z.number().int().positive().optional(),
  evidences: z.array(EvidenceSchema).default([]),
  verification: VerificationSchema.default({
    status: "unverified",
    confidence: "low",
  }),
  source: z.enum(["default", "user"]).default("default"),
});
export type Exercise = z.infer<typeof ExerciseSchema>;

// --- routines (a structured, multi-day plan) ---

export const ExerciseSetSchema = z.object({
  reps: z.number().int().nonnegative().optional(),
  weightKg: z.number().nonnegative().optional(),
  durationSec: z.number().nonnegative().optional(),
});
export type ExerciseSet = z.infer<typeof ExerciseSetSchema>;

export const RoutineExerciseSchema = z.object({
  exerciseId: z.string(),
  sets: z.array(ExerciseSetSchema).default([]),
});
export type RoutineExercise = z.infer<typeof RoutineExerciseSchema>;

export const WorkoutDaySchema = z.object({
  label: z.string(),
  region: BodyRegionSchema,
  items: z.array(RoutineExerciseSchema).default([]),
});
export type WorkoutDay = z.infer<typeof WorkoutDaySchema>;

export const SPLIT_TYPES = ["fullBody", "upperLower", "pushPullLegs"] as const;
export const SplitTypeSchema = z.enum(SPLIT_TYPES);
export type SplitType = z.infer<typeof SplitTypeSchema>;

export const WorkoutRoutineSchema = z.object({
  id: z.string(),
  name: z.string(),
  splitType: SplitTypeSchema,
  daysPerWeek: z.number().int().min(1).max(7),
  days: z.array(WorkoutDaySchema).default([]),
  source: z.enum(["default", "user"]).default("user"),
});
export type WorkoutRoutine = z.infer<typeof WorkoutRoutineSchema>;
