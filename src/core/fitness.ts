import { z } from "zod";
import { DifficultySchema } from "@/core/activity/schema";
import { EquipmentSchema, SplitTypeSchema } from "@/core/exercise/schema";

/**
 * The user's movement preferences. Kept SEPARATE from the nutrition
 * `UserProfile` so the diet engine stays unaware of exercise/yoga concepts
 * (loose coupling) — it is persisted as its own store field.
 */

export const FITNESS_GOALS = [
  "strength",
  "hypertrophy",
  "endurance",
  "weightLoss",
  "general",
] as const;
export const FitnessGoalSchema = z.enum(FITNESS_GOALS);
export type FitnessGoal = z.infer<typeof FitnessGoalSchema>;

export const YOGA_GOALS = ["flexibility", "stress", "strength", "balance"] as const;
export const YogaGoalSchema = z.enum(YOGA_GOALS);
export type YogaGoal = z.infer<typeof YogaGoalSchema>;

export const FitnessProfileSchema = z.object({
  experience: DifficultySchema.default("beginner"),
  daysPerWeek: z.number().int().min(1).max(7).default(3),
  equipment: z.array(EquipmentSchema).min(1).default(["bodyweight"]),
  goal: FitnessGoalSchema.default("general"),
  splitPreference: SplitTypeSchema.default("fullBody"),
  limitations: z.array(z.string()).default([]),
  yogaGoal: YogaGoalSchema.default("flexibility"),
  yogaLevel: DifficultySchema.default("beginner"),
});
export type FitnessProfile = z.infer<typeof FitnessProfileSchema>;

export function defaultFitnessProfile(): FitnessProfile {
  return {
    experience: "beginner",
    daysPerWeek: 3,
    equipment: ["bodyweight"],
    goal: "general",
    splitPreference: "fullBody",
    limitations: [],
    yogaGoal: "flexibility",
    yogaLevel: "beginner",
  };
}
