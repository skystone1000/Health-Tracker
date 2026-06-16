import type { ActivityLevel, UserProfile, WorkType } from "@/core/schema";

/** Map a work type to a default activity level (user can still override). */
export const WORK_TO_ACTIVITY: Record<WorkType, ActivityLevel> = {
  desk: "sedentary",
  onFeet: "light",
  physicalLabor: "active",
  athlete: "veryActive",
};

export const WORK_LABELS: Record<WorkType, string> = {
  desk: "Desk / office work",
  onFeet: "On feet (teacher, retail)",
  physicalLabor: "Physical labour",
  athlete: "Athlete / heavy training",
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sedentary (little exercise)",
  light: "Light (1–2 days/week)",
  moderate: "Moderate (3–5 days/week)",
  active: "Active (6–7 days/week)",
  veryActive: "Very active (athlete)",
};

export function defaultProfile(): UserProfile {
  return {
    id: "local",
    name: "",
    age: 28,
    sex: "male",
    heightCm: 170,
    weightKg: 70,
    activityLevel: "moderate",
    workType: "desk",
    goal: "maintain",
    dietType: "veg",
    exclusions: [],
    plannerMode: "mealBuilder",
  };
}
