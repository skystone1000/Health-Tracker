import { z } from "zod";
import { EvidenceSchema, VerificationSchema } from "@/core/schema";
import { DifficultySchema } from "@/core/activity/schema";

/**
 * Yoga domain types — deliberately distinct vocabulary from exercise
 * (asanas, families, holds, breath) so the two domains read differently even
 * though they share the calorie engine. Pure (no React/DOM).
 */

export const ASANA_FAMILIES = [
  "standing",
  "seated",
  "reclining",
  "kneeling",
  "squatting",
  "forwardBend",
  "backbend",
  "twist",
  "lateralBend",
  "balance",
  "inversion",
  "armBalance",
  "restorative",
  "pranayama",
  "meditation",
] as const;
export const AsanaFamilySchema = z.enum(ASANA_FAMILIES);
export type AsanaFamily = z.infer<typeof AsanaFamilySchema>;

export const YOGA_FOCI = [
  "flexibility",
  "strength",
  "balance",
  "relaxation",
  "breath",
] as const;
export const YogaFocusSchema = z.enum(YOGA_FOCI);
export type YogaFocus = z.infer<typeof YogaFocusSchema>;

/** Yoga traditions / styles a pose belongs to (the "types of yoga" axis). */
export const YOGA_STYLES = [
  "hatha",
  "vinyasa",
  "ashtanga",
  "iyengar",
  "kundalini",
  "yin",
  "restorative",
  "power",
  "sivananda",
] as const;
export const YogaStyleSchema = z.enum(YOGA_STYLES);
export type YogaStyle = z.infer<typeof YogaStyleSchema>;

export const AsanaSchema = z.object({
  id: z.string(),
  sanskritName: z.string(),
  englishName: z.string(),
  aliases: z.array(z.string()).default([]),
  family: AsanaFamilySchema,
  difficulty: DifficultySchema,
  metValue: z.number().positive(), // satisfies BurnsCalories (yoga ≈ 2.0–4.0)
  focus: z.array(YogaFocusSchema).min(1),
  steps: z.array(z.string()).default([]),
  benefits: z.array(z.string()).default([]), // pros
  cons: z.array(z.string()).default([]), // practice cautions (non-medical)
  contraindications: z.array(z.string()).default([]), // who should avoid
  // traditions this asana is practised in + free-form filter tags
  styles: z.array(YogaStyleSchema).default([]),
  tags: z.array(z.string()).default([]),
  // viparit / counter poses — references to other asana ids
  counterAsanaIds: z.array(z.string()).default([]),
  defaultHoldSec: z.number().int().positive().optional(),
  evidences: z.array(EvidenceSchema).default([]),
  verification: VerificationSchema.default({
    status: "unverified",
    confidence: "low",
  }),
  source: z.enum(["default", "user"]).default("default"),
});
export type Asana = z.infer<typeof AsanaSchema>;

// --- sequences (an ordered flow of asanas) ---

export const SequencePoseSchema = z.object({
  asanaId: z.string(),
  holdSec: z.number().int().positive(),
  side: z.enum(["left", "right", "both"]).optional(),
});
export type SequencePose = z.infer<typeof SequencePoseSchema>;

export const SequenceSchema = z.object({
  id: z.string(),
  name: z.string(),
  focus: YogaFocusSchema,
  totalMin: z.number().nonnegative().default(0),
  poses: z.array(SequencePoseSchema).default([]),
  source: z.enum(["default", "user"]).default("user"),
});
export type Sequence = z.infer<typeof SequenceSchema>;
