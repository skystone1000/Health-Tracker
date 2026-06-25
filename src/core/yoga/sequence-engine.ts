import type { FitnessProfile, YogaGoal } from "@/core/fitness";
import { isContraindicated, withinLevel } from "./filters";
import type {
  Asana,
  AsanaFamily,
  Sequence,
  SequencePose,
  YogaFocus,
  YogaStyle,
} from "./schema";

/**
 * Deterministic yoga sequence builder. Orders poses for a safe progression
 * (centering → warm-up → standing → peak → cool-down → rest), respects level +
 * contraindications via `filters.ts`, can be biased by a chosen style, and
 * inserts a gentle counter-pose (viparit) after deep backbends.
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
  "kneeling",
  "standing",
  "balance",
  "lateralBend",
  "backbend",
  "forwardBend",
  "twist",
  "armBalance",
  "inversion",
  "squatting",
  "seated",
  "reclining",
  "meditation",
  "restorative",
];

const GOAL_LABELS: Record<YogaGoal, string> = {
  flexibility: "Flexibility flow",
  stress: "Stress-relief flow",
  strength: "Strength flow",
  balance: "Balance flow",
};

/** Style biases the hold length (slow Yin holds long, Power flows short). */
const STYLE_HOLD_MULTIPLIER: Partial<Record<YogaStyle, number>> = {
  yin: 2.5,
  restorative: 2.0,
  power: 0.6,
  ashtanga: 0.7,
  vinyasa: 0.8,
};

/** Deterministic id for a sequence — used by the engine and the UI lookup. */
export function sequenceIdFor(fitness: FitnessProfile, style?: YogaStyle): string {
  return `sequence-${fitness.yogaGoal}-${fitness.yogaLevel}${style ? `-${style}` : ""}`;
}

export function generateSequence(
  fitness: FitnessProfile,
  asanas: Asana[],
  style?: YogaStyle,
): Sequence {
  const focus = GOAL_TO_FOCUS[fitness.yogaGoal];
  const mult = (style && STYLE_HOLD_MULTIPLIER[style]) || 1;
  const byId = new Map(asanas.map((a) => [a.id, a]));
  const pool = asanas.filter(
    (a) =>
      withinLevel(a, fitness.yogaLevel) &&
      !isContraindicated(a, fitness.limitations),
  );

  // Prefer asanas matching the chosen style, then the goal's focus.
  const score = (a: Asana) =>
    (style && a.styles.includes(style) ? 2 : 0) +
    (a.focus.includes(focus) ? 1 : 0);

  const used = new Set<string>();
  const poses: SequencePose[] = [];
  const holdFor = (a: Asana) =>
    Math.max(5, Math.round((a.defaultHoldSec ?? 30) * mult));

  for (const family of FAMILY_ORDER) {
    const inFamily = pool.filter((a) => a.family === family && !used.has(a.id));
    if (!inFamily.length) continue;
    const chosen = [...inFamily].sort((a, b) => score(b) - score(a))[0];
    used.add(chosen.id);
    poses.push({ asanaId: chosen.id, holdSec: holdFor(chosen) });

    // After a backbend, insert its gentle counter-pose (viparit) if available.
    if (chosen.family === "backbend") {
      const counterId = chosen.counterAsanaIds.find(
        (id) => byId.has(id) && !used.has(id),
      );
      if (counterId) {
        const counter = byId.get(counterId)!;
        used.add(counter.id);
        poses.push({
          asanaId: counter.id,
          holdSec: Math.min(20, counter.defaultHoldSec ?? 20),
        });
      }
    }
  }

  const totalSec = poses.reduce((s, p) => s + p.holdSec, 0);
  return {
    id: sequenceIdFor(fitness, style),
    name: `${GOAL_LABELS[fitness.yogaGoal]} (${fitness.yogaLevel})${
      style ? ` · ${style}` : ""
    }`,
    focus,
    totalMin: Math.round((totalSec / 60) * 10) / 10,
    poses,
    source: "user",
  };
}
