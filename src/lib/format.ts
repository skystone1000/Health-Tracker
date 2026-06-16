import { NUTRIENT_META, type NutrientKey } from "@/core/schema";

/** Format a number with sensible precision for display. */
export function fmt(value: number, decimals?: number): string {
  if (!Number.isFinite(value)) return "0";
  const d = decimals ?? (value >= 100 ? 0 : value >= 10 ? 1 : 2);
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: d,
  });
}

/** "12 g", "480 mg" etc. */
export function fmtNutrient(value: number, key: NutrientKey): string {
  return `${fmt(value)} ${NUTRIENT_META[key].unit}`;
}

export function pct(value: number): string {
  return `${Math.round(value)}%`;
}

/** Colour token for how close a value is to its target (for progress bars). */
export function progressTone(p: number): string {
  if (p < 70) return "bg-amber-500";
  if (p <= 110) return "bg-primary";
  return "bg-orange-500";
}
