import { NUTRIENT_META, type NutrientVector } from "@/core/schema";
import { progressVsTarget } from "@/core/totals";
import { Progress } from "@/components/ui";
import { fmt, pct, progressTone } from "@/lib/format";

const GROUP_TITLES = {
  energy: "Energy",
  macro: "Macronutrients",
  vitamin: "Vitamins",
  mineral: "Minerals",
} as const;

/** Full nutrient breakdown: value, target, % met with a progress bar. */
export function NutrientTable({
  totals,
  targets,
}: {
  totals: NutrientVector;
  targets: NutrientVector;
}) {
  const rows = progressVsTarget(totals, targets);
  const groups: (keyof typeof GROUP_TITLES)[] = [
    "energy",
    "macro",
    "vitamin",
    "mineral",
  ];

  return (
    <div className="space-y-5">
      {groups.map((group) => {
        const groupRows = rows.filter(
          (r) => NUTRIENT_META[r.key].group === group,
        );
        return (
          <div key={group}>
            <h4 className="mb-2 text-sm font-semibold text-muted-foreground">
              {GROUP_TITLES[group]}
            </h4>
            <div className="space-y-2">
              {groupRows.map((r) => {
                const meta = NUTRIENT_META[r.key];
                return (
                  <div key={r.key} className="grid grid-cols-[1fr_auto] gap-x-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm">{meta.label}</span>
                      <span className="text-sm tabular-nums text-muted-foreground">
                        {fmt(r.value)} / {fmt(r.target)} {meta.unit}
                      </span>
                    </div>
                    <span className="w-10 text-right text-sm font-medium tabular-nums">
                      {pct(r.pct)}
                    </span>
                    <Progress
                      value={r.pct}
                      className="col-span-2 mt-1"
                      indicatorClassName={progressTone(r.pct)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
