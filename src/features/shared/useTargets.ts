import { useMemo } from "react";
import { computeTargets, type TargetBreakdown } from "@/core/nutrition-engine";
import { useAppStore } from "@/store/useAppStore";

/** Memoised Layer-1 targets for the current profile (null until ready). */
export function useTargets(): TargetBreakdown | null {
  const profile = useAppStore((s) => s.profile);
  const rda = useAppStore((s) => s.rda);
  return useMemo(
    () => (profile && rda ? computeTargets(profile, rda) : null),
    [profile, rda],
  );
}
