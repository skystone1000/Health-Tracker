import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import type { ActivitySummary as Summary } from "@/core/activity/summary";
import { fmt } from "@/lib/format";

/**
 * Reusable "calories burned vs consumed" card. Purely props-driven so it has no
 * dependency on the exercise/yoga modules (used by the dashboard and the logs).
 * In v1 the figures are shown side-by-side; nutrition targets are unchanged.
 */
export function ActivitySummaryCard({
  summary,
  consumedKcal,
  targetKcal,
}: {
  summary: Summary;
  consumedKcal?: number;
  targetKcal?: number;
}) {
  const showIntake = consumedKcal !== undefined;
  const net =
    showIntake && summary.totalKcal
      ? consumedKcal! - summary.totalKcal
      : undefined;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Activity today</CardTitle>
        {summary.sessions === 0 ? (
          <Badge variant="secondary">No sessions yet</Badge>
        ) : (
          <Badge variant="success">
            {summary.sessions} session{summary.sessions === 1 ? "" : "s"}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Metric label="Burned" value={fmt(summary.totalKcal)} unit="kcal" />
        <Metric label="Active time" value={fmt(summary.totalMin)} unit="min" />
        {showIntake && (
          <Metric label="Consumed" value={fmt(consumedKcal!)} unit="kcal" />
        )}
        {net !== undefined && (
          <Metric
            label="Net (food − burn)"
            value={fmt(net)}
            unit="kcal"
            hint={
              targetKcal
                ? `target ${fmt(targetKcal)} kcal`
                : undefined
            }
          />
        )}
      </CardContent>
    </Card>
  );
}

function Metric({
  label,
  value,
  unit,
  hint,
}: {
  label: string;
  value: string;
  unit: string;
  hint?: string;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold">
        {value}
        <span className="ml-1 text-sm font-normal text-muted-foreground">
          {unit}
        </span>
      </div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
