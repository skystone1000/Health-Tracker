import type { ActivityLogEntry } from "./schema";

export interface ActivitySummary {
  sessions: number;
  totalMin: number;
  totalKcal: number;
}

/** Filter log entries to a single ISO date (yyyy-mm-dd). */
export function entriesForDate(
  entries: ActivityLogEntry[],
  date: string,
): ActivityLogEntry[] {
  return entries.filter((e) => e.date === date);
}

/** Aggregate a set of log entries into a display summary. Pure. */
export function summarizeActivity(entries: ActivityLogEntry[]): ActivitySummary {
  let totalMin = 0;
  let totalKcal = 0;
  for (const e of entries) {
    totalMin += e.durationMin;
    totalKcal += e.estimatedKcal;
  }
  return {
    sessions: entries.length,
    totalMin: Math.round(totalMin),
    totalKcal: Math.round(totalKcal),
  };
}
