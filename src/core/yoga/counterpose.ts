import type { Asana, AsanaFamily } from "./schema";

/**
 * Counter-pose (pratikriyasana / viparit) logic. A counter-pose moves the spine
 * the opposite way to the previous pose and is gentler than it. Pure & tested.
 *
 * Sourced rules: backbend ↔ gentle forward bend; forward bend ↔ gentle backbend;
 * a twist is NEVER the counter to a backbend (forward fold first); restorative
 * poses are a universally safe gentle counter.
 */
export const OPPOSING_FAMILIES: Record<AsanaFamily, AsanaFamily[]> = {
  backbend: ["forwardBend"],
  forwardBend: ["backbend"],
  twist: ["forwardBend", "reclining"],
  lateralBend: ["forwardBend"],
  standing: ["forwardBend", "restorative"],
  balance: ["forwardBend", "standing"],
  inversion: ["restorative", "forwardBend"],
  armBalance: ["forwardBend", "restorative"],
  seated: ["backbend"],
  reclining: ["seated"],
  kneeling: ["forwardBend"],
  squatting: ["standing"],
  restorative: [],
  pranayama: [],
  meditation: [],
};

/** A pose can never counter itself; a counter is in an opposing family or rests. */
export function isReasonableCounter(pose: Asana, candidate: Asana): boolean {
  if (candidate.id === pose.id) return false;
  if (candidate.family === "restorative") return true;
  return OPPOSING_FAMILIES[pose.family].includes(candidate.family);
}

/**
 * Suggest counter poses for an asana from the catalogue: opposing-family poses
 * no harder than the original, deterministically ordered, capped at `limit`.
 */
export function suggestCounters(
  pose: Asana,
  all: Asana[],
  limit = 3,
): Asana[] {
  return all
    .filter((a) => isReasonableCounter(pose, a))
    .slice(0, limit);
}
