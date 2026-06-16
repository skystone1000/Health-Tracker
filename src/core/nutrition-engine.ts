import {
  ACTIVITY_LEVELS,
  MICRO_FALLBACK,
  type ActivityLevel,
  type NutrientVector,
  type RdaTable,
  type UserProfile,
  VITAMIN_KEYS,
  MINERAL_KEYS,
  NUTRIENT_KEYS,
} from "./schema";

/**
 * Activity multipliers applied to BMR to estimate TDEE.
 * Values are the widely-used Harris/Mifflin activity factors.
 */
export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  veryActive: 1.9,
};

/** Calorie adjustment applied to TDEE for the chosen goal. */
export const GOAL_FACTORS = {
  lose: 0.82, // ~18% deficit
  maintain: 1.0,
  gain: 1.12, // ~12% surplus
} as const;

export interface MacroSplit {
  proteinPct: number;
  fatPct: number;
  carbsPct: number;
}

/** Sensible default split (% of energy). Carbs absorb the remainder. */
export const DEFAULT_SPLIT: MacroSplit = {
  proteinPct: 25,
  fatPct: 30,
  carbsPct: 45,
};

/**
 * Basal Metabolic Rate via the Mifflin-St Jeor equation (most validated).
 *   male:   10·kg + 6.25·cm − 5·age + 5
 *   female: 10·kg + 6.25·cm − 5·age − 161
 */
export function bmrMifflinStJeor(profile: UserProfile): number {
  const base =
    10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age;
  return profile.sex === "male" ? base + 5 : base - 161;
}

/** Total Daily Energy Expenditure = BMR × activity factor. */
export function tdee(profile: UserProfile): number {
  return bmrMifflinStJeor(profile) * ACTIVITY_FACTORS[profile.activityLevel];
}

/** Daily calorie goal after applying the goal adjustment to TDEE. */
export function calorieGoal(profile: UserProfile): number {
  return tdee(profile) * GOAL_FACTORS[profile.goal];
}

/** Recommended protein floor (g/kg bodyweight) based on activity/goal. */
export function proteinPerKg(profile: UserProfile): number {
  if (profile.workType === "athlete" || profile.activityLevel === "veryActive")
    return 1.6;
  if (profile.goal === "gain" || profile.activityLevel === "active") return 1.2;
  return 0.83; // ICMR-NIN 2020 adult RDA
}

export interface MacroTargets {
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  fiber_g: number;
  sugar_g: number;
}

/**
 * Convert a calorie goal into gram targets for each macronutrient.
 * Protein is the greater of the % split and the per-kg floor; the remaining
 * energy is divided between fat and carbs by their relative percentages.
 */
export function macroTargets(
  calories: number,
  profile: UserProfile,
  split: MacroSplit = DEFAULT_SPLIT,
): MacroTargets {
  let protein_g = (calories * (split.proteinPct / 100)) / 4;
  const floor = profile.weightKg * proteinPerKg(profile);
  if (protein_g < floor) protein_g = floor;

  const remaining = Math.max(calories - protein_g * 4, 0);
  const fatShare = split.fatPct / (split.fatPct + split.carbsPct);
  const fat_g = (remaining * fatShare) / 9;
  const carbs_g = (remaining * (1 - fatShare)) / 4;

  // Fiber: 14 g per 1000 kcal (USDA DRI). Sugar: limit to 10% of energy.
  const fiber_g = (14 * calories) / 1000;
  const sugar_g = (calories * 0.1) / 4;

  return { protein_g, fat_g, carbs_g, fiber_g, sugar_g };
}

/** Look up micronutrient targets from the RDA table for this profile. */
export function microTargets(
  profile: UserProfile,
  rda: RdaTable,
): Partial<NutrientVector> {
  const bracket = rda.brackets.find(
    (b) =>
      b.sex === profile.sex &&
      profile.age >= b.minAge &&
      profile.age <= b.maxAge,
  );
  const result: Partial<NutrientVector> = {};
  for (const key of [...VITAMIN_KEYS, ...MINERAL_KEYS]) {
    const fromTable = bracket?.values?.[key];
    result[key] = fromTable ?? MICRO_FALLBACK[key] ?? 0;
  }
  return result;
}

export interface TargetBreakdown {
  bmr: number;
  tdee: number;
  calories: number;
  proteinPerKg: number;
  targets: NutrientVector;
}

/**
 * Top-level Layer-1 computation: full personalized target panel
 * (energy + macros + all vitamins & minerals).
 */
export function computeTargets(
  profile: UserProfile,
  rda: RdaTable,
  split: MacroSplit = DEFAULT_SPLIT,
): TargetBreakdown {
  const bmrVal = bmrMifflinStJeor(profile);
  const tdeeVal = tdee(profile);
  const calories = calorieGoal(profile);
  const macros = macroTargets(calories, profile, split);
  const micros = microTargets(profile, rda);

  const targets = {} as NutrientVector;
  for (const key of NUTRIENT_KEYS) targets[key] = 0;
  targets.energy_kcal = calories;
  targets.protein_g = macros.protein_g;
  targets.fat_g = macros.fat_g;
  targets.carbs_g = macros.carbs_g;
  targets.fiber_g = macros.fiber_g;
  targets.sugar_g = macros.sugar_g;
  for (const key of [...VITAMIN_KEYS, ...MINERAL_KEYS]) {
    targets[key] = micros[key] ?? 0;
  }

  return {
    bmr: bmrVal,
    tdee: tdeeVal,
    calories,
    proteinPerKg: proteinPerKg(profile),
    targets,
  };
}

export { ACTIVITY_LEVELS };
