import { Badge, Button, Card, CardContent, CardHeader } from "@/components/ui";
import { dayLabel } from "@/core/date";
import type { DayScore } from "@/core/week-planner";
import type { FoodItem, Plan } from "@/core/schema";
import { mealTotals } from "@/core/totals";
import { fmt } from "@/lib/format";

/** One day of the week grid: its meals, its totals and its controls. */
export function DayCard({
  plan,
  score,
  foodsById,
  locked,
  onToggleLock,
  onShuffle,
  onOpen,
}: {
  plan: Plan;
  score?: DayScore;
  foodsById: Map<string, FoodItem>;
  locked: boolean;
  onToggleLock: () => void;
  onShuffle: () => void;
  onOpen: () => void;
}) {
  const empty = plan.meals.every((m) => m.items.length === 0);
  const off = score ? Math.abs(score.kcalDeviation) : 0;

  return (
    <Card className={locked ? "border-primary/40" : undefined}>
      <CardHeader className="flex-row items-center justify-between gap-2 pb-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{dayLabel(plan.date)}</div>
          {score && !empty && (
            <div className="text-xs text-muted-foreground">
              {fmt(score.kcal)} kcal · {fmt(score.protein)} g protein
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title={locked ? "Unlock this day" : "Lock this day"}
            aria-label={locked ? "Unlock this day" : "Lock this day"}
            onClick={onToggleLock}
          >
            {locked ? "🔒" : "🔓"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Shuffle this day"
            aria-label="Shuffle this day"
            disabled={locked || empty}
            onClick={onShuffle}
          >
            🔄
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {score && !empty && (
          <div className="flex flex-wrap gap-1.5">
            <Badge variant={off <= 0.08 ? "success" : off <= 0.15 ? "warning" : "outline"}>
              {score.kcalDeviation >= 0 ? "+" : "−"}
              {fmt(Math.abs(score.kcalDeviation) * 100)}% kcal
            </Badge>
            <Badge variant={score.proteinRatio >= 0.9 ? "success" : "warning"}>
              {fmt(score.proteinRatio * 100)}% protein
            </Badge>
            <Badge variant="secondary">{score.groups} food groups</Badge>
          </div>
        )}

        {empty && (
          <p className="text-sm text-muted-foreground">
            Nothing planned — generate the week, or add foods in the day view.
          </p>
        )}

        {plan.meals.map((meal) => {
          if (meal.items.length === 0) return null;
          const mt = mealTotals(meal, foodsById);
          return (
            <div key={meal.name}>
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {meal.name}
                </span>
                <span className="text-xs text-muted-foreground">{fmt(mt.energy_kcal)} kcal</span>
              </div>
              <ul className="mt-1 space-y-0.5">
                {meal.items.map((item, i) => {
                  const food = foodsById.get(item.foodId);
                  if (!food) return null;
                  return (
                    <li key={`${item.foodId}-${i}`} className="flex justify-between gap-2 text-sm">
                      <span className="truncate">{food.name}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {fmt(item.quantity)} {food.servingUnit}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}

        <Button variant="outline" size="sm" className="w-full" onClick={onOpen}>
          Open day
        </Button>
      </CardContent>
    </Card>
  );
}
