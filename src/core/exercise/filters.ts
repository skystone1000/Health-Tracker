import { DIFFICULTY_RANK, type Difficulty } from "@/core/activity/schema";
import type {
  BodyRegion,
  Equipment,
  Exercise,
  MuscleGroup,
} from "./schema";

/**
 * Single source of truth for exercise selection — used by the library UI and
 * the routine engine, so catalogue and generator can never diverge.
 */

export function withinDifficulty(ex: Exercise, max: Difficulty): boolean {
  return DIFFICULTY_RANK[ex.difficulty] <= DIFFICULTY_RANK[max];
}

/** True if the exercise can be done with at least one available equipment. */
export function hasAvailableEquipment(
  ex: Exercise,
  available: Equipment[],
): boolean {
  if (!available.length) return true;
  return ex.equipment.some((e) => available.includes(e));
}

/** True if a limitation keyword matches the exercise (name/alias/muscle). */
export function isLimited(ex: Exercise, limitations: string[]): boolean {
  if (!limitations.length) return false;
  const hay = [
    ex.id,
    ex.name,
    ...ex.aliases,
    ...ex.primaryMuscles,
    ...ex.secondaryMuscles,
  ]
    .join(" ")
    .toLowerCase();
  return limitations.some((l) => {
    const t = l.trim().toLowerCase();
    return t.length > 0 && hay.includes(t);
  });
}

export interface ExerciseFilter {
  search?: string;
  muscle?: MuscleGroup;
  region?: BodyRegion;
  equipment?: Equipment;
  difficulty?: Difficulty;
}

/** Apply UI filters to a list of exercises. */
export function applyExerciseFilters(
  list: Exercise[],
  f: ExerciseFilter,
): Exercise[] {
  const q = f.search?.trim().toLowerCase();
  return list.filter((ex) => {
    if (q) {
      const hay = [ex.name, ...ex.aliases, ...ex.primaryMuscles]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (f.muscle && !ex.primaryMuscles.includes(f.muscle)) return false;
    if (f.region && ex.region !== f.region) return false;
    if (f.equipment && !ex.equipment.includes(f.equipment)) return false;
    if (f.difficulty && ex.difficulty !== f.difficulty) return false;
    return true;
  });
}
