import { addDays, startOfWeek, todayISO } from "./date";
import {
  emptyHistory,
  generateDayPlan,
  recordUse,
  startDay,
  type UsageHistory,
} from "./day-planner";
import { applyFilters } from "./filters";
import { dailyQuotas, isPlannable, PLANNABLE_GROUPS, plateGroup } from "./food-groups";
import { mulberry32, type Rng } from "./random";
import type { FoodItem, Plan, UserProfile } from "./schema";
import { planTotals } from "./totals";

/**
 * Layer 4 — a week of plans.
 *
 * A week is not a new entity: it is seven ordinary dated `Plan`s, so the
 * dashboard, totals engine and backup keep working untouched. What this module
 * adds is *memory* — one `UsageHistory` threaded through all seven days so they
 * differ from each other — plus best-of-N scoring so a fresh seed gives a new
 * week without giving a worse one.
 */

export interface WeekTargets {
  calories: number;
  protein: number;
}

export interface WeekPlanOptions {
  /** Same seed ⇒ same week. The UI passes `Date.now()` to get a new one. */
  seed?: number;
  startDate?: string;
  days?: number;
  /** Dates to keep from `existing` instead of regenerating. */
  lockedDates?: string[];
  /** The user's current plans, used to honour `lockedDates`. */
  existing?: Plan[];
  /** How many candidate weeks to build before keeping the best. */
  candidates?: number;
}

export interface WeekPlan {
  startDate: string;
  days: Plan[];
  seed: number;
}

export const DEFAULT_WEEK_DAYS = 7;
export const DEFAULT_CANDIDATES = 3;

/** Diet-filtered, plannable food pool for this profile. */
export function plannablePool(
  profile: UserProfile,
  foods: FoodItem[],
): FoodItem[] {
  return applyFilters(foods, {
    dietType: profile.dietType,
    exclusions: profile.exclusions,
  }).filter(isPlannable);
}

/** Feed an existing (locked or user-edited) day into the variety memory. */
function absorbDay(
  history: UsageHistory,
  plan: Plan,
  foodsById: Map<string, FoodItem>,
): void {
  for (const meal of plan.meals) {
    for (const item of meal.items) {
      const food = foodsById.get(item.foodId);
      if (food) recordUse(history, food, item.quantity);
    }
  }
}

function buildWeek(
  profile: UserProfile,
  targets: WeekTargets,
  pool: FoodItem[],
  startDate: string,
  days: number,
  rng: Rng,
  locked: Map<string, Plan>,
  foodsById: Map<string, FoodItem>,
): Plan[] {
  const history = emptyHistory();
  const quotas = dailyQuotas(targets.calories, profile.dietType);
  const out: Plan[] = [];

  for (let i = 0; i < days; i++) {
    const date = addDays(startDate, i);
    startDay(history, i);

    const lockedDay = locked.get(date);
    if (lockedDay) {
      absorbDay(history, lockedDay, foodsById);
      out.push(structuredClone(lockedDay));
      continue;
    }

    out.push(
      generateDayPlan({
        date,
        profile,
        targetCalories: targets.calories,
        targetProtein: targets.protein,
        foods: pool,
        quotas,
        history,
        rng,
      }),
    );
  }

  return out;
}

/**
 * Generate a week. Builds `candidates` independent weeks from derived seeds and
 * returns the highest-scoring one — variation without quality drift.
 */
export function generateWeekPlan(
  profile: UserProfile,
  targets: WeekTargets,
  foods: FoodItem[],
  options: WeekPlanOptions = {},
): WeekPlan {
  const seed = options.seed ?? Date.now();
  const startDate = options.startDate ?? startOfWeek(todayISO());
  const days = Math.max(1, options.days ?? DEFAULT_WEEK_DAYS);
  const candidateCount = Math.max(1, options.candidates ?? DEFAULT_CANDIDATES);

  const pool = plannablePool(profile, foods);
  const foodsById = new Map(foods.map((f) => [f.id, f]));
  const locked = new Map<string, Plan>();
  for (const date of options.lockedDates ?? []) {
    const plan = (options.existing ?? []).find((p) => p.date === date);
    if (plan) locked.set(date, plan);
  }

  let best: { days: Plan[]; score: number } | null = null;
  for (let c = 0; c < candidateCount; c++) {
    // Derived seeds keep every candidate reproducible from the one seed.
    const rng = mulberry32((seed + c * 7919) >>> 0);
    const candidate = buildWeek(
      profile, targets, pool, startDate, days, rng, locked, foodsById,
    );
    const score = scoreWeek({ startDate, days: candidate, seed }, foodsById, targets).total;
    if (!best || score > best.score) best = { days: candidate, score };
  }

  return { startDate, days: best!.days, seed };
}

/**
 * Regenerate exactly one date, leaving the rest of the week intact. Used by the
 * per-day 🔄 button — the other six days feed the variety memory, so the new
 * day works *around* them.
 */
export function regenerateDayInWeek(
  profile: UserProfile,
  targets: WeekTargets,
  foods: FoodItem[],
  week: WeekPlan,
  date: string,
  seed: number,
): WeekPlan {
  const index = week.days.findIndex((d) => d.date === date);
  if (index === -1) return week;

  const pool = plannablePool(profile, foods);
  const foodsById = new Map(foods.map((f) => [f.id, f]));
  const history = emptyHistory();

  // Absorb every other day first so the new one avoids their choices.
  week.days.forEach((day, i) => {
    if (i === index) return;
    startDay(history, i);
    absorbDay(history, day, foodsById);
  });
  startDay(history, index);

  const fresh = generateDayPlan({
    date,
    profile,
    targetCalories: targets.calories,
    targetProtein: targets.protein,
    foods: pool,
    quotas: dailyQuotas(targets.calories, profile.dietType),
    history,
    rng: mulberry32(seed >>> 0),
  });

  const days = [...week.days];
  days[index] = fresh;
  return { ...week, days };
}

// ---------------------------------------------------------------------------
// Scoring — used to pick the best candidate week and to explain it in the UI
// ---------------------------------------------------------------------------

export interface DayScore {
  date: string;
  kcal: number;
  /** Signed share off target: +0.05 = 5 % over. */
  kcalDeviation: number;
  protein: number;
  /** Achieved / target protein. */
  proteinRatio: number;
  /** Distinct plannable plate groups touched. */
  groups: number;
}

export interface WeekScore {
  days: DayScore[];
  distinctFoods: number;
  /** Most days any single food appears on. */
  maxRepeats: number;
  /** Items shared with the previous day, summed over the week. */
  consecutiveRepeats: number;
  avgGroups: number;
  /** 0–100 — higher is better. */
  total: number;
}

/** Target number of plate groups a day should touch (ICMR asks for ≥8 groups). */
export const TARGET_GROUPS_PER_DAY = 5;

export function scoreWeek(
  week: WeekPlan,
  foodsById: Map<string, FoodItem>,
  targets: WeekTargets,
): WeekScore {
  const dayIds = week.days.map((day) => [
    ...new Set(day.meals.flatMap((m) => m.items.map((i) => i.foodId))),
  ]);

  const days: DayScore[] = week.days.map((day) => {
    const totals = planTotals(day, foodsById);
    const groups = new Set(
      day.meals
        .flatMap((m) => m.items.map((i) => foodsById.get(i.foodId)))
        .filter((f): f is FoodItem => !!f)
        .map(plateGroup)
        .filter((g) => PLANNABLE_GROUPS.includes(g)),
    );
    return {
      date: day.date,
      kcal: totals.energy_kcal,
      kcalDeviation:
        targets.calories > 0 ? totals.energy_kcal / targets.calories - 1 : 0,
      protein: totals.protein_g,
      proteinRatio: targets.protein > 0 ? totals.protein_g / targets.protein : 0,
      groups: groups.size,
    };
  });

  const counts = new Map<string, number>();
  for (const ids of dayIds) {
    for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  let consecutiveRepeats = 0;
  for (let i = 1; i < dayIds.length; i++) {
    const prev = new Set(dayIds[i - 1]);
    consecutiveRepeats += dayIds[i].filter((id) => prev.has(id)).length;
  }

  const n = Math.max(1, days.length);
  const avgGroups = days.reduce((s, d) => s + d.groups, 0) / n;

  // Penalties, each capped so one bad dimension cannot dominate the rest.
  const kcalPenalty =
    (days.reduce((s, d) => s + Math.min(Math.abs(d.kcalDeviation), 0.5), 0) / n) * 120;
  const proteinPenalty =
    (days.reduce((s, d) => s + Math.max(0, 1 - d.proteinRatio), 0) / n) * 60;
  const groupPenalty =
    (days.reduce(
      (s, d) => s + Math.max(0, TARGET_GROUPS_PER_DAY - d.groups),
      0,
    ) / n) * 8;
  const repeatPenalty = (consecutiveRepeats / n) * 3;

  const total = Math.max(
    0,
    Math.min(100, 100 - kcalPenalty - proteinPenalty - groupPenalty - repeatPenalty),
  );

  return {
    days,
    distinctFoods: counts.size,
    maxRepeats: counts.size === 0 ? 0 : Math.max(...counts.values()),
    consecutiveRepeats,
    avgGroups,
    total,
  };
}
