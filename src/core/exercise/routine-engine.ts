import type { FitnessGoal, FitnessProfile } from "@/core/fitness";
import { hasAvailableEquipment, isLimited, withinDifficulty } from "./filters";
import type {
  BodyRegion,
  Exercise,
  MuscleGroup,
  RoutineExercise,
  SplitType,
  WorkoutDay,
  WorkoutRoutine,
} from "./schema";

/**
 * Deterministic routine generator: same inputs → same routine (unit-testable,
 * mirroring `core/planner.ts` autoGenerate). Selection reuses `filters.ts`.
 */

/** Sets × reps preset per training goal (OCP: extend the table, not the code). */
const SETS_REPS: Record<FitnessGoal, { sets: number; reps: number }> = {
  strength: { sets: 5, reps: 5 },
  hypertrophy: { sets: 4, reps: 10 },
  endurance: { sets: 3, reps: 15 },
  weightLoss: { sets: 3, reps: 12 },
  general: { sets: 3, reps: 10 },
};

interface DayTemplate {
  label: string;
  region: BodyRegion;
  muscles: MuscleGroup[];
}

const FULL_BODY: DayTemplate = {
  label: "Full body",
  region: "fullBody",
  muscles: ["chest", "back", "quads", "hamstrings", "shoulders", "core"],
};
const UPPER: DayTemplate = {
  label: "Upper body",
  region: "upper",
  muscles: ["chest", "back", "shoulders", "biceps", "triceps"],
};
const LOWER: DayTemplate = {
  label: "Lower body",
  region: "lower",
  muscles: ["quads", "hamstrings", "glutes", "calves", "core"],
};
const PUSH: DayTemplate = {
  label: "Push",
  region: "upper",
  muscles: ["chest", "shoulders", "triceps"],
};
const PULL: DayTemplate = {
  label: "Pull",
  region: "upper",
  muscles: ["back", "biceps", "forearms"],
};
const LEGS: DayTemplate = {
  label: "Legs",
  region: "lower",
  muscles: ["quads", "hamstrings", "glutes", "calves"],
};

const SPLIT_TEMPLATES: Record<SplitType, DayTemplate[]> = {
  fullBody: [FULL_BODY],
  upperLower: [UPPER, LOWER],
  pushPullLegs: [PUSH, PULL, LEGS],
};

const SPLIT_LABELS: Record<SplitType, string> = {
  fullBody: "Full-body",
  upperLower: "Upper / Lower",
  pushPullLegs: "Push / Pull / Legs",
};

/** Build a `days`-length rotation by cycling the split's base templates. */
function rotation(split: SplitType, days: number): DayTemplate[] {
  const base = SPLIT_TEMPLATES[split];
  return Array.from({ length: days }, (_, i) => base[i % base.length]);
}

function buildSets(goal: FitnessGoal): RoutineExercise["sets"] {
  const { sets, reps } = SETS_REPS[goal];
  return Array.from({ length: sets }, () => ({ reps }));
}

/**
 * Generate a customised routine from the fitness profile and the exercise
 * catalogue. Deterministic: the routine id encodes the inputs.
 */
export function generateRoutine(
  fitness: FitnessProfile,
  exercises: Exercise[],
): WorkoutRoutine {
  const pool = exercises.filter(
    (ex) =>
      hasAvailableEquipment(ex, fitness.equipment) &&
      withinDifficulty(ex, fitness.experience) &&
      !isLimited(ex, fitness.limitations),
  );
  const templates = rotation(fitness.splitPreference, fitness.daysPerWeek);

  const days: WorkoutDay[] = templates.map((tpl, idx) => {
    const used = new Set<string>();
    const items: RoutineExercise[] = [];

    // One exercise per targeted muscle (deterministic catalogue order).
    for (const muscle of tpl.muscles) {
      const pick = pool.find(
        (ex) => !used.has(ex.id) && ex.primaryMuscles.includes(muscle),
      );
      if (pick) {
        used.add(pick.id);
        items.push({ exerciseId: pick.id, sets: buildSets(fitness.goal) });
      }
    }

    // Fallback: ensure at least a few movements per day.
    if (items.length < 3) {
      for (const ex of pool) {
        if (items.length >= 4) break;
        if (used.has(ex.id)) continue;
        if (tpl.region === "fullBody" || ex.region === tpl.region) {
          used.add(ex.id);
          items.push({ exerciseId: ex.id, sets: buildSets(fitness.goal) });
        }
      }
    }

    return { label: `Day ${idx + 1} · ${tpl.label}`, region: tpl.region, items };
  });

  return {
    id: `routine-${fitness.splitPreference}-${fitness.daysPerWeek}-${fitness.goal}`,
    name: `${fitness.daysPerWeek}-day ${SPLIT_LABELS[fitness.splitPreference]}`,
    splitType: fitness.splitPreference,
    daysPerWeek: fitness.daysPerWeek,
    days,
    source: "user",
  };
}
