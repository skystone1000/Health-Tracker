import { metCalories } from "@/core/activity/calories";
import type { Asana, Sequence } from "./schema";

export interface SequenceTotals {
  poses: number;
  totalSec: number;
  totalMin: number;
}

/** Pure totals for a sequence (count + duration). */
export function sequenceTotals(seq: Sequence): SequenceTotals {
  const totalSec = seq.poses.reduce((s, p) => s + p.holdSec, 0);
  return {
    poses: seq.poses.length,
    totalSec,
    totalMin: Math.round((totalSec / 60) * 10) / 10,
  };
}

/** Estimated calories burned across a sequence (per-pose MET × hold). */
export function sequenceEstimatedKcal(
  seq: Sequence,
  asanasById: Map<string, Asana>,
  weightKg: number,
): number {
  let kcal = 0;
  for (const pose of seq.poses) {
    const asana = asanasById.get(pose.asanaId);
    if (!asana) continue;
    kcal += metCalories(asana.metValue, weightKg, pose.holdSec / 60);
  }
  return Math.round(kcal * 10) / 10;
}
