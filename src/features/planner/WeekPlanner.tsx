import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { addDays, startOfWeek, todayISO, weekRangeLabel } from "@/core/date";
import {
  generateWeekPlan,
  regenerateDayInWeek,
  scoreWeek,
  type WeekPlan,
} from "@/core/week-planner";
import type { Plan } from "@/core/schema";
import { fmt } from "@/lib/format";
import { useTargets } from "@/features/shared/useTargets";
import { selectAllFoods, selectFoodsById, useAppStore } from "@/store/useAppStore";
import { DayCard } from "./DayCard";
import { usePlannerLocks } from "./usePlannerLocks";

const WEEK_DAYS = 7;

/**
 * Layer 4 UI — a whole week at a glance. "Regenerate" passes a fresh seed, so
 * every press yields a different (still balanced, still diet-respecting) week;
 * locked days survive it.
 */
export function WeekPlanner({ onOpenDay }: { onOpenDay: (date: string) => void }) {
  const profile = useAppStore((s) => s.profile)!;
  const plans = useAppStore((s) => s.plans);
  const savePlans = useAppStore((s) => s.savePlans);
  const allFoods = useAppStore(selectAllFoods);
  const foodsById = useAppStore(selectFoodsById);
  const breakdown = useTargets();
  const { toggle, isLocked, locked } = usePlannerLocks();

  const [startDate, setStartDate] = useState(() => startOfWeek(todayISO()));
  const [seed, setSeed] = useState<number | null>(null);

  const dates = useMemo(
    () => Array.from({ length: WEEK_DAYS }, (_, i) => addDays(startDate, i)),
    [startDate],
  );

  /** The week as it is stored today — empty days for dates with no plan. */
  const week: WeekPlan = useMemo(
    () => ({
      startDate,
      seed: seed ?? 0,
      days: dates.map<Plan>(
        (date) =>
          plans.find((p) => p.date === date) ?? {
            id: `plan-${date}`,
            date,
            meals: [],
          },
      ),
    }),
    [dates, plans, startDate, seed],
  );

  const targets = breakdown
    ? { calories: breakdown.calories, protein: breakdown.targets.protein_g }
    : null;

  const score = useMemo(
    () => (targets ? scoreWeek(week, foodsById, targets) : null),
    [week, foodsById, targets],
  );

  const planned = week.days.filter((d) => d.meals.some((m) => m.items.length > 0)).length;

  if (!breakdown || !targets) return null;

  const generate = () => {
    const nextSeed = Date.now();
    setSeed(nextSeed);
    const fresh = generateWeekPlan(profile, targets, allFoods, {
      seed: nextSeed,
      startDate,
      days: WEEK_DAYS,
      lockedDates: locked,
      existing: week.days,
    });
    savePlans(fresh.days);
  };

  const shuffleDay = (date: string) => {
    const next = regenerateDayInWeek(profile, targets, allFoods, week, date, Date.now());
    const day = next.days.find((d) => d.date === date);
    if (day) savePlans([day]);
  };

  const clearWeek = () =>
    savePlans(dates.map((date) => ({ id: `plan-${date}`, date, meals: [] })));

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>{weekRangeLabel(startDate, WEEK_DAYS)}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {planned} of {WEEK_DAYS} days planned · target {fmt(targets.calories)} kcal ·{" "}
              {fmt(targets.protein)} g protein a day
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setStartDate(addDays(startDate, -7))}>
              ◀ Prev
            </Button>
            <Button variant="outline" size="sm" onClick={() => setStartDate(startOfWeek(todayISO()))}>
              This week
            </Button>
            <Button variant="outline" size="sm" onClick={() => setStartDate(addDays(startDate, 7))}>
              Next ▶
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button onClick={generate}>
              {planned > 0 ? "🔄 Regenerate week" : "⚡ Generate week"}
            </Button>
            <Button variant="outline" onClick={clearWeek}>
              Clear week
            </Button>
            {locked.length > 0 && (
              <Badge variant="outline">🔒 {locked.length} day(s) locked</Badge>
            )}
          </div>

          {score && planned > 0 && (
            <div className="flex flex-wrap gap-2">
              <Badge variant={score.total >= 75 ? "success" : score.total >= 55 ? "warning" : "outline"}>
                Balance score {fmt(score.total)}/100
              </Badge>
              <Badge variant="secondary">{score.distinctFoods} distinct foods</Badge>
              <Badge variant="secondary">{fmt(score.avgGroups)} food groups a day</Badge>
              <Badge variant="secondary">max {score.maxRepeats}× repeat</Badge>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Every regeneration draws a new week from your diet-allowed foods, keeping each
            day inside its calorie and protein bands and rotating vegetables, dals and
            fruit. Lock a day (🔒) to keep it, or shuffle one day (🔄) on its own.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {week.days.map((day, i) => (
          <DayCard
            key={day.date}
            plan={day}
            score={score?.days[i]}
            foodsById={foodsById}
            locked={isLocked(day.date)}
            onToggleLock={() => toggle(day.date)}
            onShuffle={() => shuffleDay(day.date)}
            onOpen={() => onOpenDay(day.date)}
          />
        ))}
      </div>
    </div>
  );
}
