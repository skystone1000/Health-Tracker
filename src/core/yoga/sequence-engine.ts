import type { FitnessProfile, YogaGoal } from "@/core/fitness";
import { isContraindicated, withinLevel } from "./filters";
import type {
  Asana,
  AsanaFamily,
  Sequence,
  SequencePose,
  YogaFocus,
} from "./schema";

/**
 * Deterministic yoga sequence builder. Orders poses for a safe progression
 * (centering → warm-up → standing → peak → cool-down → rest) and respects
 * level + contraindications via `filters.ts`.
 */

const GOAL_TO_FOCUS: Record<YogaGoal, YogaFocus> = {
  flexibility: "flexibility",
  stress: "relaxation",
  strength: "strength",
  balance: "balance",
};

/** Safe class arc — one (preferred) asana picked per family in this order. */
const FAMILY_ORDER: AsanaFamily[] = [
  "pranayama",
  "standing",
  "balance",
  "backbend",
  "forwardBend",
  "twist",
  "armBalance",
  "inversion",
  "seated",
  "meditation",
  "restorative",
];

const GOAL_LABELS: Record<YogaGoal, string> = {
  flexibility: "Flexibility flow",
  stress: "Stress-relief flow",
  strength: "Strength flow",
  balance: "Balance flow",
};

export function generateSequence(
  fitness: FitnessProfile,
  asanas: Asana[],
): Sequence {
  const focus = GOAL_TO_FOCUS[fitness.yogaGoal];
  const pool = asanas.filter(
    (a) =>
      withinLevel(a, fitness.yogaLevel) &&
      !isContraindicated(a, fitness.limitations),
  );

  const poses: SequencePose[] = [];
  for (const family of FAMILY_ORDER) {
    const inFamily = pool.filter((a) => a.family === family);
    if (!inFamily.length) continue;
    const preferred = inFamily.find((a) => a.focus.includes(focus));
    const chosen = preferred ?? inFamily[0];
    poses.push({ asanaId: chosen.id, holdSec: chosen.defaultHoldSec ?? 30 });
  }

  const totalSec = poses.reduce((s, p) => s + p.holdSec, 0);
  return {
    id: `sequence-${fitness.yogaGoal}-${fitness.yogaLevel}`,
    name: `${GOAL_LABELS[fitness.yogaGoal]} (${fitness.yogaLevel})`,
    focus,
    totalMin: Math.round((totalSec / 60) * 10) / 10,
    poses,
    source: "user",
  };
}
