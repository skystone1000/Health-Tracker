import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import type { ActivityKind } from "@/core/activity/schema";
import { fmt } from "@/lib/format";
import { todayStr } from "@/lib/activity";
import { useAppStore } from "@/store/useAppStore";

/** Today's logged activity for a given kind, with per-entry delete. */
export function ActivityHistory({ kind }: { kind: ActivityKind }) {
  const log = useAppStore((s) => s.activityLog);
  const deleteActivity = useAppStore((s) => s.deleteActivity);
  const today = useMemo(
    () => log.filter((e) => e.kind === kind && e.date === todayStr()),
    [log, kind],
  );

  if (today.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Logged today</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {today.map((e) => (
          <div
            key={e.id}
            className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
          >
            <span className="font-medium">{e.label}</span>
            <span className="flex items-center gap-3 text-muted-foreground">
              {fmt(e.durationMin)} min · {fmt(e.estimatedKcal)} kcal
              <button
                className="text-destructive hover:underline"
                onClick={() => deleteActivity(e.id)}
              >
                ✕
              </button>
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
