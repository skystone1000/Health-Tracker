import type { Difficulty } from "@/core/activity/schema";
import type {
  BodyRegion,
  Equipment,
  MuscleGroup,
  SplitType,
} from "@/core/exercise/schema";
import type { FitnessGoal, YogaGoal } from "@/core/fitness";
import type { AsanaFamily, YogaFocus, YogaStyle } from "@/core/yoga/schema";

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  forearms: "Forearms",
  core: "Core",
  quads: "Quads",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  calves: "Calves",
  fullBody: "Full body",
  cardio: "Cardio",
};

export const REGION_LABELS: Record<BodyRegion, string> = {
  upper: "Upper body",
  lower: "Lower body",
  core: "Core",
  fullBody: "Full body",
  cardio: "Cardio",
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  bodyweight: "Bodyweight",
  dumbbell: "Dumbbell",
  barbell: "Barbell",
  machine: "Machine",
  kettlebell: "Kettlebell",
  bands: "Resistance bands",
  cardioMachine: "Cardio machine",
};

export const SPLIT_LABELS: Record<SplitType, string> = {
  fullBody: "Full-body",
  upperLower: "Upper / Lower",
  pushPullLegs: "Push / Pull / Legs",
};

export const GOAL_LABELS: Record<FitnessGoal, string> = {
  strength: "Strength",
  hypertrophy: "Muscle gain",
  endurance: "Endurance",
  weightLoss: "Weight loss",
  general: "General fitness",
};

export const FAMILY_LABELS: Record<AsanaFamily, string> = {
  standing: "Standing",
  seated: "Seated",
  reclining: "Reclining",
  kneeling: "Kneeling",
  squatting: "Squatting",
  forwardBend: "Forward bend",
  backbend: "Backbend",
  twist: "Twist",
  lateralBend: "Lateral bend",
  balance: "Balance",
  inversion: "Inversion",
  armBalance: "Arm balance",
  restorative: "Restorative",
  pranayama: "Pranayama (breath)",
  meditation: "Meditation",
};

export const FOCUS_LABELS: Record<YogaFocus, string> = {
  flexibility: "Flexibility",
  strength: "Strength",
  balance: "Balance",
  relaxation: "Relaxation",
  breath: "Breath",
};

export const STYLE_LABELS: Record<YogaStyle, string> = {
  hatha: "Hatha",
  vinyasa: "Vinyasa / Flow",
  ashtanga: "Ashtanga",
  iyengar: "Iyengar",
  kundalini: "Kundalini",
  yin: "Yin",
  restorative: "Restorative",
  power: "Power",
  sivananda: "Sivananda",
};

/** Curated tag suggestions for the library filter (schema stays free-form). */
export const KNOWN_TAGS = [
  "foundational",
  "calming",
  "energizing",
  "hip-opener",
  "heart-opener",
  "shoulder-opener",
  "side-stretch",
  "hamstrings",
  "core",
  "balance",
  "focus",
  "spine",
  "digestion",
  "restorative",
  "counter-pose",
  "transition",
  "advanced",
  "meditation",
  "breath",
] as const;

export const YOGA_GOAL_LABELS: Record<YogaGoal, string> = {
  flexibility: "Flexibility",
  stress: "Stress relief",
  strength: "Strength",
  balance: "Balance",
};

/** Today's date as an ISO yyyy-mm-dd string. */
export const todayStr = (): string => new Date().toISOString().slice(0, 10);
