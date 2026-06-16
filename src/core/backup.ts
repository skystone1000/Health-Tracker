import { z } from "zod";
import {
  FoodItemSchema,
  PlanSchema,
  RecipeSchema,
  UserProfileSchema,
} from "@/core/schema";
import { FitnessProfileSchema } from "@/core/fitness";
import { ExerciseSchema, WorkoutRoutineSchema } from "@/core/exercise/schema";
import { AsanaSchema, SequenceSchema } from "@/core/yoga/schema";
import { ActivityLogEntrySchema } from "@/core/activity/schema";

/**
 * Full backup payload for JSON export/import. Aggregates every persisted slice
 * from all domains in one place — its single responsibility. New fields default
 * to empty so older backups (without exercise/yoga data) still import cleanly.
 */
export const BackupSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  // nutrition
  profile: UserProfileSchema.nullable(),
  customFoods: z.array(FoodItemSchema).default([]),
  foodOverrides: z.record(z.string(), FoodItemSchema).default({}),
  customRecipes: z.array(RecipeSchema).default([]),
  plans: z.array(PlanSchema).default([]),
  // movement
  fitness: FitnessProfileSchema.nullable().default(null),
  customExercises: z.array(ExerciseSchema).default([]),
  exerciseOverrides: z.record(z.string(), ExerciseSchema).default({}),
  customAsanas: z.array(AsanaSchema).default([]),
  asanaOverrides: z.record(z.string(), AsanaSchema).default({}),
  workoutRoutines: z.array(WorkoutRoutineSchema).default([]),
  yogaSequences: z.array(SequenceSchema).default([]),
  activityLog: z.array(ActivityLogEntrySchema).default([]),
});
export type Backup = z.infer<typeof BackupSchema>;
