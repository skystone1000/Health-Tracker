import { useMemo } from "react";
import { summarizeForDate, useAppStore } from "@/store/useAppStore";
import type { ActivitySummary } from "@/core/activity/summary";
import type { ActivityLogEntry } from "@/core/activity/schema";
import { todayStr } from "@/lib/activity";

/** Memoised summary of today's logged activity (sessions, minutes, kcal). */
export function useTodayActivity(): ActivitySummary {
  const log = useAppStore((s) => s.activityLog);
  return useMemo(() => summarizeForDate(log, todayStr()), [log]);
}

/** Today's raw log entries, newest first. */
export function useTodayEntries(): ActivityLogEntry[] {
  const log = useAppStore((s) => s.activityLog);
  return useMemo(() => log.filter((e) => e.date === todayStr()), [log]);
}
