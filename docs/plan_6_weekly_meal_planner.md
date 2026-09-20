# Plan 6 — Weekly (7-day) dynamic meal planner

> **For agentic workers:** REQUIRED SUB-SKILL: use `superpowers:subagent-driven-development`
> (recommended) or `superpowers:executing-plans` to implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-day auto-generate with a **7-day meal plan** that is
nutritionally balanced per ICMR-NIN food-group guidance, respects the user's diet
type and exclusions, and produces a **different but equally valid week every time
"Regenerate" is pressed**.

**Architecture:** A week is **seven ordinary dated `Plan` objects** — no new
persisted slice, so the dashboard, totals engine and backup keep working
untouched. Variation comes from a **seeded PRNG in `core/`** (`mulberry32`): the
engine stays pure and deterministic for a given seed (testable), while the UI
passes a fresh seed on every click (dynamic). Selection is a **weighted random
draw over food-group quotas** (ICMR "My Plate for the Day", scaled to the user's
calorie target), then a **repair pass** pulls each day into its calorie/protein
band.

**Tech Stack:** TypeScript (strict) · Zod · Zustand · React 18 + Vite · Vitest ·
Tailwind + the hand-built primitives in `src/components/ui.tsx`.

Pair with [ARCHITECTURE.md](ARCHITECTURE.md) (the why), [CODEBASE.md](CODEBASE.md)
(file map) and [FEATURES.md](FEATURES.md) (what each feature does).

> **Status: implemented** (2026-09-19). See "Outcome" at the end. All tasks end
> green on `npm run typecheck && npm test && npm run build`.

---

# Part I — Functional design (the dietician's brief)

## 0. Where we start from

| Thing | Today |
|---|---|
| Planner scope | **One day** (`plan-<today>`), regenerated in place |
| `autoGeneratePlan` | **Deterministic** — same profile ⇒ byte-identical plan, forever |
| Food selection | 3 buckets (protein-dense / carb-dense / produce), `pick(arr, mealIndex)` = index rotation |
| Balance model | Meal kcal share (25/35/30/10) × item share (40/45/15). No food-group quotas, no protein guarantee |
| Meal fit | None — `mealTypes` facets exist on 108/120 foods but the planner ignores them |
| Portion sanity | `Math.max(5, …)` only — a 900-kcal target on a low-density food yields absurd grams |
| Variety | None across days (there is only one day) |

Two of the user's three asks are therefore *structurally* impossible today: the
planner has no concept of a week, and its output cannot change.

## 1. What "balanced" means here (and why)

The nutrition target engine (`core/nutrition-engine.ts`) already answers *how
many* calories, grams of protein/fat/carb/fibre and micronutrients a user needs.
It does **not** answer *which food groups* those calories should come from — and
that is exactly what makes a plan feel like real food instead of a spreadsheet.

We adopt **ICMR-NIN "My Plate for the Day" (Dietary Guidelines for Indians,
2024)** as the food-group layer, because the seed database is Indian-first and
the RDA table already in the repo (`rda.icmr-nin-2020.json`) is from the same
body — one authority, no mixed advice.

**Reference quantities at 2000 kcal/day** ([ICMR-NIN, My Plate for the Day](https://www.nin.res.in/downloads/My_Plate_for_the_day_J24.pdf),
[Dietary Guidelines for Indians 2024](https://nin.res.in/dietaryguidelines/pdfjs/locale/DGI_2024.pdf)):

| Plate group | g/day @2000 kcal | Notes |
|---|---:|---|
| Cereals & nutri-cereals (millets) | 250 | ≤45 % of total energy |
| Pulses, eggs & flesh foods | 85 | ~14–15 % of total energy |
| Milk & curd | 300 | milk + nuts together ≈8–10 % energy each |
| Vegetables | 400 | with fruit + GLV + roots ≈ half the plate |
| Fruits | 100 | |
| Nuts & seeds | 35 | |
| Fats & oils | 27 | **cooking input — not auto-planned** |

Plus the guideline's headline rule: **draw from at least 8 food groups a day**.

**Scaling.** All quotas scale linearly with the user's target: `quota × (targetCalories / 2000)`.
A 2600 kcal target gets 325 g cereals; a 1500 kcal target gets 187 g.

**Diet-type adaptation** (the guideline only publishes an omnivore plate, so the
substitutions below are ours and are documented as such):

| Diet | Adaptation |
|---|---|
| `veg` | The 85 g protein allowance goes 100 % to pulses/legumes; dairy 300 g kept |
| `nonveg` | Protein allowance splits **55 % pulses / 45 % flesh & eggs** — dal stays a daily item rather than being displaced |
| `vegan` | Dairy quota → 0; pulses and nuts/seeds quotas ×1.3 to carry the displaced protein, calcium and B-group load |

**Per-day acceptance bands** (what the engine guarantees, and what the tests assert):

| Metric | Band |
|---|---|
| Energy | 92–108 % of target (test band 88–112 % to stay robust on thin data) |
| Protein | ≥ 90 % of target (test floor 85 %) |
| Plate groups touched | ≥ 5 of the 7 plannable groups (≥ 4 for vegan, which has no dairy) |
| Portion sanity | Every item inside its group's min/max portion (no 900 g of anything, no 5 g "meals") |
| Diet compliance | 100 % — a `vegan` week contains zero dairy/egg/flesh items, exclusions never appear |

## 2. Meal structure

Four meals, unchanged kcal shares (they match Indian eating patterns and the
existing UI), now with **slots** that say which plate group each meal draws from:

| Meal | kcal share | Slots |
|---|---:|---|
| Breakfast | 25 % | cereals · dairy · fruits |
| Lunch | 35 % | cereals · **protein** · vegetables · dairy |
| Dinner | 30 % | cereals · **protein** · vegetables |
| Snacks | 10 % | nuts & seeds · fruits |

`protein` is a *virtual* slot: it resolves to pulses for veg/vegan, and to pulses
**or** flesh for nonveg, weighted by whichever quota is further from being met.
This is how one template serves all three diets without branching.

Slots are matched against the food's `mealTypes` facet (shipped in plan 5), so
upma lands at breakfast and khichdi at dinner. Foods with no facet are still
eligible at a lower weight — the database is not fully faceted (12/120 foods
carry no `mealTypes`) and a half-tagged DB must not starve the planner.

## 3. What "dynamic" means

Pressing **Regenerate** must give a *different* week, not a reshuffle of the same
five foods, and must not silently get worse. Four mechanisms:

1. **Weighted random draw, not index rotation.** Each candidate food gets a
   weight = `quota deficit × meal fit × variety × protein bias`; one is drawn
   with probability proportional to weight. Good foods are *likely*, not
   *certain* — which is exactly what makes two runs differ while both stay sane.
2. **Seeded PRNG.** The seed is an argument. Same seed ⇒ identical week (so it is
   unit-testable and a week can be reproduced); the UI passes `Date.now()` on
   every click ⇒ a new week each time.
3. **Best-of-N.** Each generation builds 3 candidate weeks from derived seeds and
   keeps the highest-scoring one (`scoreWeek`). Variation without quality drift.
4. **Variety memory across the week.** A running usage history penalises foods
   used yesterday, and caps repeats *per plate group* — see below.

**Repeat caps are group-aware, not global.** A dietician does not tell someone to
eat a different grain every day; roti and rice *should* recur, while the sabji
and the dal should not. Caps per week:

| Group | Max days/week | Why |
|---|---:|---|
| Cereals, dairy | 7 | Staples — daily is correct |
| Pulses, flesh | 3 | Rotate dals/proteins for amino-acid and micronutrient spread |
| Vegetables | 2 | The main variety lever; also spreads phytonutrients |
| Fruits, nuts & seeds | 3–4 | Seasonal repetition is normal |
| Sweets | 2 | Treat ceiling |

Additionally: **no food twice in one day**, and a food used yesterday is heavily
down-weighted today.

## 4. Editability & locking

The week is not a black box:

- Every generated day is a **normal `Plan`** — open it in the existing meal
  builder and edit quantities or swap foods.
- **Lock a day** (🔒) to keep it through regeneration; locked days still feed the
  variety history, so the unlocked days work *around* them.
- **Shuffle one day** (🔄) regenerates a single date against the rest of the week.

## 5. Known seed-data gaps (functional risk)

Counted from `public/data/foods.default.json` (120 foods):

| Group | Foods | Consequence |
|---|---:|---|
| Dairy | **3** | A 7-day plan will repeat the same milk/curd — acceptable (staple) but dull |
| Fruits | **8** | With a 3×/week cap, ~3 fruits/day is not reachable; the fruit slot will sometimes come up empty |
| Eggs + Meat & Seafood | **3** | A nonveg week has almost no flesh variety |
| Vegetables | 23 | Fine — 2×/week cap ⇒ 14 slots from 23 candidates |

The engine degrades gracefully (an empty slot redistributes its calories), and
Task 9 adds a coverage test that *reports* these gaps. Closing them is a data
task — see Task 11, to be done with [ADD_FOOD.md](ADD_FOOD.md).

---

# Part II — Technical design (the engineer's brief)

## 6. Key decisions

| Decision | Rationale |
|---|---|
| **A week = 7 dated `Plan`s in the existing `plans` array** | No new persisted slice ⇒ none of the five-place wiring (store/partialize/BackupSchema/export-import/reset). The dashboard already looks up `plan-<date>`, so every generated day lights up its own date for free. |
| **Seeded PRNG lives in `core/random.ts`** | `core/` must stay deterministic and unit-testable. `Math.random()` anywhere in `core/` would make every planner test flaky. The seed is data, passed in. |
| **New modules, `planner.ts` untouched in behaviour** | `autoGeneratePlan` stays as the Layer-3 single-day engine (its tests keep passing); the week engine is Layer 4 built on new, focused files. |
| **`PlateGroup` ≠ `FoodGroup`** | `core/grouping.ts` already exports a `FoodGroup` *interface* (a UI bucket). The nutrition concept is named `PlateGroup` in `core/food-groups.ts` so the two never collide. |
| **Locks & week offset are `localStorage` UI prefs** | Same precedent as the food list's "Group by" — not user data, must not enter the backup. |
| **Date helpers move to `core/date.ts` and use *local* time** | `new Date().toISOString().slice(0,10)` is UTC: at 00:30 IST it returns *yesterday*, so an Indian user's plan lands on the wrong date. Fixing it once, in core, also removes the duplicated `today()` in `core/planner.ts` and `features/planner/Planner.tsx`. |

## 7. File structure

```
src/core/
  date.ts              NEW  toISODate/todayISO/addDays/startOfWeek/dayLabel (local time)
  random.ts            NEW  mulberry32, hashSeed, shuffle, pickWeighted (seeded, pure)
  food-groups.ts       NEW  PlateGroup taxonomy, ICMR quotas, portion bounds, quantityForKcal
  day-planner.ts       NEW  meal templates, slot selection, balanceDay → one balanced Plan
  week-planner.ts      NEW  generateWeekPlan, regenerateDayInWeek, scoreWeek (Layer 4)
  planner.ts           MOD  import quantityForKcal from food-groups (DRY), use core/date
  schema.ts            MOD  PLANNER_MODES += "weekly"
  *.test.ts            NEW  one spec per new module + week-planner.data.test.ts (real seed JSON)

src/store/
  useAppStore.ts       MOD  savePlans(plans) — batch upsert in one set()

src/features/planner/
  WeekPlanner.tsx      NEW  week grid, generate/regenerate, per-day lock & shuffle, week score
  DayCard.tsx          NEW  one day column (meals, items, kcal, lock/shuffle/open)
  Planner.tsx          MOD  "Week" mode tab + date-aware day view
  usePlannerLocks.ts   NEW  localStorage-backed lock set (UI pref)
```

## 8. Data flow

```
profile + rda ──computeTargets()──► { calories, targets.protein_g }
                                          │
foods (default+custom+overrides) ──applyFilters(diet, exclusions)──► pool
                                          │
      seed ──mulberry32()──► rng ─────────┤
                                          ▼
                              generateWeekPlan()           ← Layer 4 (new)
                                ├─ best-of-3 candidates, scoreWeek() picks the winner
                                └─ per day: generateDayPlan()   ← Layer 3.5 (new)
                                      ├─ slots → weighted draw (quota × fit × variety × protein)
                                      ├─ kcal share → quantityForKcal → clampPortion
                                      └─ balanceDay() → kcal band + protein floor
                                          ▼
                              WeekPlan { startDate, seed, days: Plan[7] }
                                          ▼
                    store.savePlans(week.days)  →  plans[] → localStorage
                                          ▼
                    Dashboard/day planner read plan-<date> unchanged
```

---

# Part III — Tasks

Each task is independently shippable and ends green on
`npm run typecheck && npm test && npm run build`.

---

### Task 1: Local-time date helpers in core

**Files:**
- Create: `src/core/date.ts`
- Create: `src/core/date.test.ts`
- Modify: `src/core/planner.ts` (drop the private `today()`)
- Modify: `src/features/planner/Planner.tsx:31` (drop the duplicated `today()`)

- [ ] **Step 1: Write the failing test**

Create `src/core/date.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  addDays,
  dayLabel,
  parseISODate,
  shortDayName,
  startOfWeek,
  toISODate,
  todayISO,
} from "./date";

describe("toISODate", () => {
  it("uses local calendar parts, not UTC", () => {
    // 00:30 on 21 Sep local time. toISOString() would report the 20th for
    // any timezone east of UTC — the bug this function exists to avoid.
    const d = new Date(2026, 8, 21, 0, 30, 0);
    expect(toISODate(d)).toBe("2026-09-21");
  });

  it("zero-pads month and day", () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("parseISODate", () => {
  it("round-trips through toISODate", () => {
    expect(toISODate(parseISODate("2026-02-29"))).toBe("2026-03-01"); // 2026 is not a leap year
    expect(toISODate(parseISODate("2026-12-31"))).toBe("2026-12-31");
  });
});

describe("addDays", () => {
  it("crosses month and year boundaries", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("walks a full week", () => {
    expect(addDays("2026-09-21", 6)).toBe("2026-09-27");
  });
});

describe("startOfWeek", () => {
  it("returns the Monday of that week by default", () => {
    // 2026-09-21 is a Monday; 2026-09-27 is the Sunday that ends the week.
    expect(startOfWeek("2026-09-21")).toBe("2026-09-21");
    expect(startOfWeek("2026-09-24")).toBe("2026-09-21");
    expect(startOfWeek("2026-09-27")).toBe("2026-09-21");
  });

  it("supports Sunday-start weeks", () => {
    expect(startOfWeek("2026-09-24", 0)).toBe("2026-09-20");
  });
});

describe("labels", () => {
  it("formats without Intl so tests are locale-proof", () => {
    expect(shortDayName("2026-09-21")).toBe("Mon");
    expect(dayLabel("2026-09-21")).toBe("Mon 21 Sep");
  });
});

describe("todayISO", () => {
  it("is a well-formed ISO date", () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/core/date.test.ts
```

Expected: FAIL — `Failed to resolve import "./date"`.

- [ ] **Step 3: Write the implementation**

Create `src/core/date.ts`:

```ts
/**
 * Calendar helpers for plans. Deliberately **local-time**: a plan's id is
 * `plan-<YYYY-MM-DD>` and `new Date().toISOString()` is UTC, so east of UTC
 * (e.g. IST) anything before 05:30 would be filed under the previous day.
 *
 * Pure and Intl-free — the labels are table-driven so tests do not depend on
 * the runner's locale.
 */

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/** `YYYY-MM-DD` from a Date's **local** calendar parts. */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Local-midnight Date for a `YYYY-MM-DD` string. */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

/** Today's date in the user's own timezone. */
export function todayISO(): string {
  return toISODate(new Date());
}

/** Shift an ISO date by whole days (handles month/year/DST boundaries). */
export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** First day of the week containing `iso`. `weekStartsOn`: 0=Sun, 1=Mon. */
export function startOfWeek(iso: string, weekStartsOn: 0 | 1 = 1): string {
  const day = parseISODate(iso).getDay();
  return addDays(iso, -((day - weekStartsOn + 7) % 7));
}

/** `Mon` */
export function shortDayName(iso: string): string {
  return DAY_NAMES[parseISODate(iso).getDay()];
}

/** `Mon 21 Sep` */
export function dayLabel(iso: string): string {
  const d = parseISODate(iso);
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}

/** `21 Sep – 27 Sep` for a 7-day range starting at `startDate`. */
export function weekRangeLabel(startDate: string, days = 7): string {
  const end = addDays(startDate, days - 1);
  const a = parseISODate(startDate);
  const b = parseISODate(end);
  return `${a.getDate()} ${MONTH_NAMES[a.getMonth()]} – ${b.getDate()} ${MONTH_NAMES[b.getMonth()]}`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/core/date.test.ts
```

Expected: PASS (12 assertions across 8 tests).

- [ ] **Step 5: Use it in `core/planner.ts`**

In `src/core/planner.ts`, delete the private helper:

```ts
function today(): string {
  return new Date().toISOString().slice(0, 10);
}
```

and add to the imports at the top of the file:

```ts
import { todayISO } from "./date";
```

then replace both default-parameter uses — `date: string = today()` becomes
`date: string = todayISO()`, and `options.date ?? today()` becomes
`options.date ?? todayISO()`.

- [ ] **Step 6: Use it in the Planner UI**

In `src/features/planner/Planner.tsx`, delete line 31:

```ts
const today = () => new Date().toISOString().slice(0, 10);
```

add to the imports:

```ts
import { todayISO } from "@/core/date";
```

and replace the three `today()` call sites (`planId`, `useState(… createEmptyPlan(today()))`,
`autoGeneratePlan(…, { date: today() })`, `clearPlan`) with `todayISO()`.

- [ ] **Step 7: Verify the whole suite**

```bash
npm run typecheck && npm test
```

Expected: typecheck clean; all suites pass (planner tests unchanged).

- [ ] **Step 8: Commit**

```bash
git add src/core/date.ts src/core/date.test.ts src/core/planner.ts src/features/planner/Planner.tsx && git commit -m "Feature - Local-time date helpers in core"
```

---

### Task 2: Seeded randomness in core

**Files:**
- Create: `src/core/random.ts`
- Create: `src/core/random.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/core/random.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { hashSeed, mulberry32, pickWeighted, shuffle } from "./random";

describe("mulberry32", () => {
  it("produces the same stream for the same seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("produces a different stream for a different seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(43);
    expect(a()).not.toBe(b());
  });

  it("stays in [0, 1)", () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("hashSeed", () => {
  it("is stable and differs per input", () => {
    expect(hashSeed("2026-09-21")).toBe(hashSeed("2026-09-21"));
    expect(hashSeed("2026-09-21")).not.toBe(hashSeed("2026-09-22"));
  });

  it("returns a non-negative 32-bit integer", () => {
    const h = hashSeed("nourish");
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(2 ** 32);
  });
});

describe("shuffle", () => {
  it("keeps every element and does not mutate the input", () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(input, mulberry32(1));
    expect(out).toHaveLength(5);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });

  it("is seed-deterministic", () => {
    expect(shuffle([1, 2, 3, 4, 5], mulberry32(9))).toEqual(
      shuffle([1, 2, 3, 4, 5], mulberry32(9)),
    );
  });
});

describe("pickWeighted", () => {
  it("returns undefined for an empty pool", () => {
    expect(pickWeighted([], () => 1, mulberry32(1))).toBeUndefined();
  });

  it("never picks a zero-weight item", () => {
    const rng = mulberry32(3);
    for (let i = 0; i < 200; i++) {
      const picked = pickWeighted(
        ["good", "banned"],
        (x) => (x === "banned" ? 0 : 1),
        rng,
      );
      expect(picked).toBe("good");
    }
  });

  it("returns undefined when every weight is zero", () => {
    expect(pickWeighted(["a", "b"], () => 0, mulberry32(1))).toBeUndefined();
  });

  it("favours heavier items without ever excluding lighter ones", () => {
    const rng = mulberry32(11);
    const counts = { heavy: 0, light: 0 };
    for (let i = 0; i < 2000; i++) {
      const picked = pickWeighted(
        ["heavy", "light"] as const,
        (x) => (x === "heavy" ? 9 : 1),
        rng,
      );
      counts[picked!] += 1;
    }
    expect(counts.heavy).toBeGreaterThan(counts.light * 4);
    expect(counts.light).toBeGreaterThan(50);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/core/random.test.ts
```

Expected: FAIL — `Failed to resolve import "./random"`.

- [ ] **Step 3: Write the implementation**

Create `src/core/random.ts`:

```ts
/**
 * Seeded randomness for the planner.
 *
 * `core/` must stay deterministic — a bare `Math.random()` would make every
 * planner test flaky and make a generated week impossible to reproduce. So the
 * seed is *data*: the engine is a pure function of (inputs, seed), and only the
 * UI decides to pass a fresh seed on each click.
 */

/** A seeded random source returning values in [0, 1). */
export type Rng = () => number;

/**
 * mulberry32 — a small, fast, well-distributed 32-bit PRNG. Public domain
 * (Tommy Ettinger). Chosen over an LCG because its low bits are usable and it
 * needs no dependency.
 */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a — turn any string (a date, a profile id) into a 32-bit seed. */
export function hashSeed(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** Fisher–Yates. Returns a new array; never mutates the input. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Draw one item with probability proportional to its weight. Weights below
 * zero, NaN or Infinity are treated as 0. Returns `undefined` when the pool is
 * empty or every weight is 0 — callers treat that as "this slot stays empty".
 */
export function pickWeighted<T>(
  items: readonly T[],
  weight: (item: T) => number,
  rng: Rng,
): T | undefined {
  let total = 0;
  const weights = items.map((item) => {
    const w = weight(item);
    const safe = Number.isFinite(w) && w > 0 ? w : 0;
    total += safe;
    return safe;
  });
  if (total <= 0) return undefined;

  let roll = rng() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll < 0) return items[i];
  }
  // Floating-point tail: return the last item with a non-zero weight.
  for (let i = items.length - 1; i >= 0; i--) if (weights[i] > 0) return items[i];
  return undefined;
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/core/random.test.ts
```

Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/random.ts src/core/random.test.ts && git commit -m "Feature - Seeded PRNG primitives for the planner"
```

---

### Task 3: Plate groups, ICMR quotas and portion bounds

**Files:**
- Create: `src/core/food-groups.ts`
- Create: `src/core/food-groups.test.ts`
- Modify: `src/core/planner.ts` (reuse `quantityForKcal` — DRY)

- [ ] **Step 1: Write the failing test**

Create `src/core/food-groups.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  clampPortion,
  dailyQuotas,
  isPlannable,
  PLANNABLE_GROUPS,
  plateGroup,
  portionBounds,
  quantityForKcal,
  REFERENCE_KCAL,
} from "./food-groups";
import { makeFood, makeNutrients } from "./test-fixtures";

const rice = makeFood({
  id: "rice",
  category: "Grains & Cereals",
  nutrients: makeNutrients({ energy_kcal: 130, carbs_g: 28, protein_g: 2.7 }),
});
const oil = makeFood({ id: "oil", category: "Fats & Oils" });
const dal = makeFood({ id: "dal", category: "Legumes & Pulses" });
const milk = makeFood({ id: "milk", category: "Dairy" });
const egg = makeFood({ id: "egg", category: "Eggs", dietTypes: ["nonveg"] });
const almond = makeFood({ id: "almond", category: "Nuts, Seeds & Dry Fruits" });
const upma = makeFood({
  id: "upma",
  category: "Grains & Cereals",
  itemType: "dish",
  nutrients: makeNutrients({ energy_kcal: 150 }),
});

describe("plateGroup", () => {
  it("maps every food category onto an ICMR plate group", () => {
    expect(plateGroup(rice)).toBe("cereals");
    expect(plateGroup(dal)).toBe("pulses");
    expect(plateGroup(egg)).toBe("flesh");
    expect(plateGroup(milk)).toBe("dairy");
    expect(plateGroup(almond)).toBe("nutsSeeds");
    expect(plateGroup(oil)).toBe("fatsOils");
  });

  it("files an unknown (user-authored) category under 'other'", () => {
    expect(plateGroup(makeFood({ id: "x", category: "Space food" }))).toBe("other");
  });
});

describe("isPlannable", () => {
  it("excludes cooking inputs but keeps real foods", () => {
    expect(isPlannable(oil)).toBe(false);
    expect(isPlannable(makeFood({ id: "haldi", category: "Spices & Condiments" }))).toBe(false);
    expect(isPlannable(rice)).toBe(true);
    expect(PLANNABLE_GROUPS).not.toContain("fatsOils");
  });
});

describe("dailyQuotas", () => {
  it("matches ICMR 'My Plate for the Day' at the 2000 kcal reference", () => {
    const q = dailyQuotas(REFERENCE_KCAL, "nonveg");
    expect(q.cereals).toBe(250);
    expect(q.vegetables).toBe(400);
    expect(q.fruits).toBe(100);
    expect(q.dairy).toBe(300);
    expect(q.nutsSeeds).toBe(35);
    // 85 g protein allowance, split 55/45 for an omnivore
    expect(q.pulses + q.flesh).toBeCloseTo(85, 5);
    expect(q.flesh).toBeGreaterThan(0);
  });

  it("scales linearly with the calorie target", () => {
    const q = dailyQuotas(3000, "veg");
    expect(q.cereals).toBeCloseTo(375, 5);
    expect(q.vegetables).toBeCloseTo(600, 5);
  });

  it("gives a vegetarian the whole protein allowance as pulses", () => {
    const q = dailyQuotas(REFERENCE_KCAL, "veg");
    expect(q.flesh).toBe(0);
    expect(q.pulses).toBeCloseTo(85, 5);
    expect(q.dairy).toBe(300);
  });

  it("drops dairy for a vegan and redistributes onto pulses and nuts", () => {
    const veg = dailyQuotas(REFERENCE_KCAL, "veg");
    const vegan = dailyQuotas(REFERENCE_KCAL, "vegan");
    expect(vegan.dairy).toBe(0);
    expect(vegan.pulses).toBeGreaterThan(veg.pulses);
    expect(vegan.nutsSeeds).toBeGreaterThan(veg.nutsSeeds);
  });

  it("never returns a quota for a cooking input", () => {
    expect(dailyQuotas(REFERENCE_KCAL, "veg").fatsOils).toBe(0);
  });
});

describe("quantityForKcal", () => {
  it("scales from the food's reference quantity and rounds to 5 g", () => {
    // rice: 130 kcal / 100 g → 260 kcal needs 200 g
    expect(quantityForKcal(rice, 260)).toBe(200);
  });

  it("never returns less than 5 g", () => {
    expect(quantityForKcal(rice, 0)).toBe(5);
  });
});

describe("portionBounds / clampPortion", () => {
  it("keeps an ingredient inside its group's sane serving range", () => {
    expect(clampPortion(almond, 500)).toBe(portionBounds(almond).max);
    expect(clampPortion(almond, 1)).toBe(portionBounds(almond).min);
  });

  it("allows a cooked dish a bigger plate than a raw ingredient", () => {
    expect(portionBounds(upma).max).toBeGreaterThan(portionBounds(rice).max);
  });

  it("rounds to the nearest 5 g", () => {
    expect(clampPortion(rice, 123)).toBe(125);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/core/food-groups.test.ts
```

Expected: FAIL — `Failed to resolve import "./food-groups"`.

- [ ] **Step 3: Write the implementation**

Create `src/core/food-groups.ts`:

```ts
import type { DietType, FoodItem } from "./schema";

/**
 * The food-group ("plate") layer of the planner.
 *
 * `core/nutrition-engine.ts` says how many calories and grams of each nutrient
 * a user needs; it says nothing about *which foods* those should come from.
 * This module adds that layer, using ICMR-NIN "My Plate for the Day" (Dietary
 * Guidelines for Indians, 2024) — the same body whose RDA table the app already
 * ships, so the advice never comes from two authorities at once.
 *
 * Named `PlateGroup`, not `FoodGroup`, because `core/grouping.ts` already
 * exports a `FoodGroup` interface for the food list's UI buckets.
 */
export const PLATE_GROUPS = [
  "cereals",
  "pulses",
  "flesh",
  "dairy",
  "vegetables",
  "fruits",
  "nutsSeeds",
  "sweets",
  "beverages",
  "fatsOils",
  "condiments",
  "other",
] as const;
export type PlateGroup = (typeof PLATE_GROUPS)[number];

/**
 * `FOOD_CATEGORIES` (schema.ts) → plate group. A new food category MUST get an
 * entry here, or its foods silently fall into "other" and are planned last —
 * `food-groups.test.ts` guards the mapping.
 */
export const CATEGORY_TO_PLATE_GROUP: Record<string, PlateGroup> = {
  "Grains & Cereals": "cereals",
  "Legumes & Pulses": "pulses",
  Eggs: "flesh",
  "Meat & Seafood": "flesh",
  Dairy: "dairy",
  Vegetables: "vegetables",
  Fruits: "fruits",
  "Nuts, Seeds & Dry Fruits": "nutsSeeds",
  "Sweets & Desserts": "sweets",
  Beverages: "beverages",
  "Fats & Oils": "fatsOils",
  "Spices & Condiments": "condiments",
};

/** The plate group a food belongs to ("other" for a user's custom category). */
export function plateGroup(food: FoodItem): PlateGroup {
  return CATEGORY_TO_PLATE_GROUP[food.category] ?? "other";
}

/**
 * Cooking inputs. Oil, sugar and spices are energy- or carb-dense by mass, so a
 * calorie-driven picker would happily serve 40 g of turmeric. They stay fully
 * usable in recipes and in the manual meal builder.
 */
export const NON_PLANNABLE_GROUPS: PlateGroup[] = ["fatsOils", "condiments"];

export const PLANNABLE_GROUPS: PlateGroup[] = PLATE_GROUPS.filter(
  (g) => !NON_PLANNABLE_GROUPS.includes(g),
);

export function isPlannable(food: FoodItem): boolean {
  return !NON_PLANNABLE_GROUPS.includes(plateGroup(food));
}

/** The calorie level the published ICMR quantities are stated for. */
export const REFERENCE_KCAL = 2000;

/**
 * ICMR-NIN "My Plate for the Day", grams/day at 2000 kcal.
 * `protein` is the guideline's combined "pulses, eggs and flesh foods"
 * allowance — `dailyQuotas` splits it by diet type.
 */
export const PLATE_QUOTA_2000 = {
  cereals: 250,
  protein: 85,
  dairy: 300,
  vegetables: 400,
  fruits: 100,
  nutsSeeds: 35,
} as const;

/** Share of the combined protein allowance that goes to flesh foods (nonveg). */
export const NONVEG_FLESH_SHARE = 0.45;

/**
 * Vegan multiplier for pulses and nuts/seeds. The guideline publishes no vegan
 * plate; dropping 300 g of milk removes protein, calcium and B-vitamins, so we
 * grow the two groups that can carry them. Documented as ours, not ICMR's.
 */
export const VEGAN_REPLACEMENT_FACTOR = 1.3;

export type PlateQuotas = Record<PlateGroup, number>;

/**
 * Daily grams per plate group for this user — ICMR quantities scaled linearly
 * to their calorie target and adapted to their diet type.
 */
export function dailyQuotas(
  targetCalories: number,
  dietType: DietType,
): PlateQuotas {
  const scale = Math.max(0, targetCalories) / REFERENCE_KCAL;
  const quotas = {} as PlateQuotas;
  for (const group of PLATE_GROUPS) quotas[group] = 0;

  const protein = PLATE_QUOTA_2000.protein * scale;
  const vegan = dietType === "vegan";

  quotas.cereals = PLATE_QUOTA_2000.cereals * scale;
  quotas.vegetables = PLATE_QUOTA_2000.vegetables * scale;
  quotas.fruits = PLATE_QUOTA_2000.fruits * scale;
  quotas.dairy = vegan ? 0 : PLATE_QUOTA_2000.dairy * scale;
  quotas.nutsSeeds =
    PLATE_QUOTA_2000.nutsSeeds * scale * (vegan ? VEGAN_REPLACEMENT_FACTOR : 1);

  if (dietType === "nonveg") {
    quotas.flesh = protein * NONVEG_FLESH_SHARE;
    quotas.pulses = protein * (1 - NONVEG_FLESH_SHARE);
  } else {
    quotas.flesh = 0;
    quotas.pulses = protein * (vegan ? VEGAN_REPLACEMENT_FACTOR : 1);
  }

  return quotas;
}

/** Grams of a food that supply `kcal` calories, rounded to 5 g (min 5 g). */
export function quantityForKcal(food: FoodItem, kcal: number): number {
  const perRef = food.nutrients.energy_kcal || 1;
  const grams = (kcal / perRef) * food.referenceQuantity;
  return Math.max(5, Math.round(grams / 5) * 5);
}

/**
 * Sane serving range per plate group, in grams. Without these a low-density
 * food asked to carry 700 kcal turns into 1.4 kg of cucumber.
 */
export const PORTION_BOUNDS: Record<PlateGroup, { min: number; max: number }> = {
  cereals: { min: 30, max: 200 },
  pulses: { min: 25, max: 200 },
  flesh: { min: 50, max: 200 },
  dairy: { min: 50, max: 250 },
  vegetables: { min: 50, max: 250 },
  fruits: { min: 50, max: 200 },
  nutsSeeds: { min: 10, max: 45 },
  sweets: { min: 20, max: 60 },
  beverages: { min: 100, max: 250 },
  fatsOils: { min: 5, max: 15 },
  condiments: { min: 1, max: 10 },
  other: { min: 20, max: 200 },
};

/**
 * A composed dish (`itemType: "dish"`) is measured cooked, so a normal plate of
 * it weighs far more than a raw ingredient's serving — khichdi is 300 g, rice
 * flour is not.
 */
export const DISH_BOUNDS = { min: 100, max: 400 } as const;

export function portionBounds(food: FoodItem): { min: number; max: number } {
  if (food.itemType === "dish") return { ...DISH_BOUNDS };
  return { ...PORTION_BOUNDS[plateGroup(food)] };
}

/** Pull a quantity into the food's sane range and round it to 5 g. */
export function clampPortion(food: FoodItem, grams: number): number {
  const { min, max } = portionBounds(food);
  const rounded = Math.round(Math.min(Math.max(grams, min), max) / 5) * 5;
  return Math.max(5, rounded);
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/core/food-groups.test.ts
```

Expected: PASS (13 tests).

- [ ] **Step 5: Remove the duplicate `quantityForKcal` from `planner.ts`**

In `src/core/planner.ts`, delete the private helpers:

```ts
const kcalPerRef = (f: FoodItem) => f.nutrients.energy_kcal || 1;

/** Grams of a food needed to contribute `kcal` calories, rounded to 5 g. */
function quantityForKcal(food: FoodItem, kcal: number): number {
  const grams = (kcal / kcalPerRef(food)) * food.referenceQuantity;
  return Math.max(5, Math.round(grams / 5) * 5);
}
```

and import the shared one instead:

```ts
import { quantityForKcal } from "./food-groups";
```

The formula is identical, so `planner.test.ts` must stay green unchanged.

- [ ] **Step 6: Verify**

```bash
npm run typecheck && npm test
```

Expected: typecheck clean; `planner.test.ts` still passes (15 tests in the file).

- [ ] **Step 7: Commit**

```bash
git add src/core/food-groups.ts src/core/food-groups.test.ts src/core/planner.ts && git commit -m "Feature - ICMR plate groups, daily quotas and portion bounds"
```

---

### Task 4: Day planner — templates and slot selection

**Files:**
- Create: `src/core/day-planner.ts`
- Create: `src/core/day-planner.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/core/day-planner.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  DEFAULT_MEAL_TEMPLATES,
  emptyHistory,
  generateDayPlan,
  WEEKLY_REPEAT_CAP,
} from "./day-planner";
import { dailyQuotas, plateGroup } from "./food-groups";
import { mulberry32 } from "./random";
import { makeFood, makeNutrients } from "./test-fixtures";
import type { FoodItem, UserProfile } from "./schema";

const profile: UserProfile = {
  id: "local",
  name: "Test",
  age: 30,
  sex: "female",
  heightCm: 163,
  weightKg: 58,
  activityLevel: "moderate",
  workType: "desk",
  goal: "maintain",
  dietType: "veg",
  exclusions: [],
  plannerMode: "weekly",
};

/** A small but realistic pool: several options in every plate group. */
const pool: FoodItem[] = [
  // cereals
  ...["rice", "roti", "poha", "upma", "idli"].map((id, i) =>
    makeFood({
      id,
      category: "Grains & Cereals",
      dietTypes: ["veg", "vegan"],
      mealTypes: i < 3 ? ["breakfast", "lunch"] : ["lunch", "dinner"],
      nutrients: makeNutrients({ energy_kcal: 130 + i, carbs_g: 28, protein_g: 3 }),
    }),
  ),
  // pulses
  ...["toor-dal", "moong-dal", "rajma", "chana"].map((id) =>
    makeFood({
      id,
      category: "Legumes & Pulses",
      dietTypes: ["veg", "vegan"],
      mealTypes: ["lunch", "dinner"],
      nutrients: makeNutrients({ energy_kcal: 120, protein_g: 9, carbs_g: 20 }),
    }),
  ),
  // vegetables
  ...["bhindi", "lauki", "palak", "gobi", "baingan"].map((id) =>
    makeFood({
      id,
      category: "Vegetables",
      dietTypes: ["veg", "vegan"],
      mealTypes: ["lunch", "dinner"],
      nutrients: makeNutrients({ energy_kcal: 35, protein_g: 2, carbs_g: 6 }),
    }),
  ),
  // dairy
  ...["milk", "curd", "paneer"].map((id) =>
    makeFood({
      id,
      category: "Dairy",
      dietTypes: ["veg"],
      mealTypes: ["breakfast", "lunch"],
      nutrients: makeNutrients({ energy_kcal: 90, protein_g: 6, fat_g: 5 }),
    }),
  ),
  // fruits
  ...["banana", "apple", "papaya"].map((id) =>
    makeFood({
      id,
      category: "Fruits",
      dietTypes: ["veg", "vegan"],
      mealTypes: ["breakfast", "snack"],
      nutrients: makeNutrients({ energy_kcal: 60, carbs_g: 15 }),
    }),
  ),
  // nuts
  ...["almond", "walnut"].map((id) =>
    makeFood({
      id,
      category: "Nuts, Seeds & Dry Fruits",
      dietTypes: ["veg", "vegan"],
      mealTypes: ["snack"],
      nutrients: makeNutrients({ energy_kcal: 580, protein_g: 20, fat_g: 50 }),
    }),
  ),
  // nonveg (must never appear for this veg profile)
  makeFood({
    id: "chicken",
    category: "Meat & Seafood",
    dietTypes: ["nonveg"],
    mealTypes: ["lunch", "dinner"],
    nutrients: makeNutrients({ energy_kcal: 165, protein_g: 31 }),
  }),
];

const ctx = (over: Partial<Parameters<typeof generateDayPlan>[0]> = {}) => ({
  date: "2026-09-21",
  profile,
  targetCalories: 2000,
  targetProtein: 70,
  foods: pool.filter((f) => f.dietTypes.includes("veg")),
  quotas: dailyQuotas(2000, "veg"),
  history: emptyHistory(),
  rng: mulberry32(1),
  ...over,
});

describe("generateDayPlan — structure", () => {
  const plan = generateDayPlan(ctx());

  it("uses the id and date convention the rest of the app expects", () => {
    expect(plan.id).toBe("plan-2026-09-21");
    expect(plan.date).toBe("2026-09-21");
  });

  it("has the four standard meals in order", () => {
    expect(plan.meals.map((m) => m.name)).toEqual([
      "Breakfast",
      "Lunch",
      "Dinner",
      "Snacks",
    ]);
    expect(DEFAULT_MEAL_TEMPLATES).toHaveLength(4);
  });

  it("fills every meal", () => {
    for (const meal of plan.meals) expect(meal.items.length).toBeGreaterThan(0);
  });

  it("never repeats a food within the same day", () => {
    const ids = plan.meals.flatMap((m) => m.items.map((i) => i.foodId));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only plans foods it was given", () => {
    const ids = plan.meals.flatMap((m) => m.items.map((i) => i.foodId));
    expect(ids).not.toContain("chicken");
  });
});

describe("generateDayPlan — dietician rules", () => {
  it("respects the meal-type facet: breakfast gets breakfast foods", () => {
    // The draw is weighted, not absolute — a mismatched food keeps a small
    // (0.08) weight so a half-faceted database cannot starve a slot. So assert
    // the *rate* across seeds, not a single deterministic outcome.
    const byId = new Map(pool.map((f) => [f.id, f]));
    let total = 0;
    let tagged = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const plan = generateDayPlan(ctx({ rng: mulberry32(seed) }));
      for (const item of plan.meals[0].items) {
        total += 1;
        if (byId.get(item.foodId)!.mealTypes.includes("breakfast")) tagged += 1;
      }
    }
    expect(total).toBeGreaterThan(40);
    expect(tagged / total).toBeGreaterThan(0.9);
  });

  it("puts a protein source in both lunch and dinner", () => {
    const plan = generateDayPlan(ctx());
    const byId = new Map(pool.map((f) => [f.id, f]));
    for (const mealIndex of [1, 2]) {
      const groups = plan.meals[mealIndex].items.map((i) =>
        plateGroup(byId.get(i.foodId)!),
      );
      expect(groups.some((g) => g === "pulses" || g === "flesh")).toBe(true);
    }
  });

  it("touches at least five plate groups across the day", () => {
    const plan = generateDayPlan(ctx());
    const byId = new Map(pool.map((f) => [f.id, f]));
    const groups = new Set(
      plan.meals.flatMap((m) => m.items.map((i) => plateGroup(byId.get(i.foodId)!))),
    );
    expect(groups.size).toBeGreaterThanOrEqual(5);
  });

  it("keeps every portion inside its sane range", () => {
    const plan = generateDayPlan(ctx());
    for (const meal of plan.meals) {
      for (const item of meal.items) {
        expect(item.quantity).toBeGreaterThanOrEqual(5);
        expect(item.quantity).toBeLessThanOrEqual(400);
      }
    }
  });
});

describe("generateDayPlan — seeded variation", () => {
  it("is identical for the same seed", () => {
    expect(generateDayPlan(ctx({ rng: mulberry32(5) }))).toEqual(
      generateDayPlan(ctx({ rng: mulberry32(5) })),
    );
  });

  it("differs for a different seed", () => {
    const a = generateDayPlan(ctx({ rng: mulberry32(5) }));
    const b = generateDayPlan(ctx({ rng: mulberry32(6000) }));
    const ids = (p: typeof a) =>
      p.meals.flatMap((m) => m.items.map((i) => i.foodId)).join("|");
    expect(ids(a)).not.toBe(ids(b));
  });
});

describe("generateDayPlan — degraded data", () => {
  it("returns the empty meal structure when there are no foods", () => {
    const plan = generateDayPlan(ctx({ foods: [] }));
    expect(plan.meals.map((m) => m.name)).toHaveLength(4);
    expect(plan.meals.every((m) => m.items.length === 0)).toBe(true);
  });

  it("still fills what it can when a whole group is missing", () => {
    const noDairy = pool.filter(
      (f) => f.category !== "Dairy" && f.dietTypes.includes("veg"),
    );
    const plan = generateDayPlan(ctx({ foods: noDairy }));
    const ids = plan.meals.flatMap((m) => m.items.map((i) => i.foodId));
    expect(ids.length).toBeGreaterThan(4);
  });
});

describe("weekly repeat caps", () => {
  it("lets staples recur daily but rotates the variety groups", () => {
    expect(WEEKLY_REPEAT_CAP.cereals).toBe(7);
    expect(WEEKLY_REPEAT_CAP.dairy).toBe(7);
    expect(WEEKLY_REPEAT_CAP.vegetables).toBeLessThanOrEqual(2);
    expect(WEEKLY_REPEAT_CAP.pulses).toBeLessThanOrEqual(3);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/core/day-planner.test.ts
```

Expected: FAIL — `Failed to resolve import "./day-planner"`.

- [ ] **Step 3: Write the implementation**

Create `src/core/day-planner.ts`:

```ts
import {
  clampPortion,
  plateGroup,
  quantityForKcal,
  type PlateGroup,
  type PlateQuotas,
} from "./food-groups";
import { pickWeighted, type Rng } from "./random";
import type { FoodItem, MealType, Plan, UserProfile } from "./schema";
import { toVector } from "./totals";

/**
 * Layer 3.5 — build ONE balanced day.
 *
 * Unlike `planner.ts`'s `autoGeneratePlan` (index rotation over three buckets),
 * this picks each item with a *weighted random draw* over the ICMR plate-group
 * quotas, so two runs with different seeds give two different, equally valid
 * days. The week engine (`week-planner.ts`) calls this once per day, threading
 * a shared usage history so the days differ from each other too.
 */

/** A meal draws from these; `protein` resolves to pulses or flesh by diet. */
export type Slot = PlateGroup | "protein";

export interface MealTemplate {
  name: string;
  /** Facet matched against `food.mealTypes`. */
  mealType: MealType;
  /** Share of the day's calories. */
  kcalShare: number;
  slots: Slot[];
}

/**
 * Four meals at the shares the app already uses (25/35/30/10), now with the
 * plate groups each one should draw from. Breakfast gets cereal + dairy +
 * fruit; the two main meals get cereal + protein + vegetable.
 */
export const DEFAULT_MEAL_TEMPLATES: MealTemplate[] = [
  {
    name: "Breakfast",
    mealType: "breakfast",
    kcalShare: 0.25,
    slots: ["cereals", "dairy", "fruits"],
  },
  {
    name: "Lunch",
    mealType: "lunch",
    kcalShare: 0.35,
    slots: ["cereals", "protein", "vegetables", "dairy"],
  },
  {
    name: "Dinner",
    mealType: "dinner",
    kcalShare: 0.3,
    slots: ["cereals", "protein", "vegetables"],
  },
  {
    name: "Snacks",
    mealType: "snack",
    kcalShare: 0.1,
    slots: ["nutsSeeds", "fruits"],
  },
];

/** Relative share of a meal's calories per slot (normalised over used slots). */
const SLOT_KCAL_WEIGHT: Record<Slot, number> = {
  cereals: 4,
  protein: 3,
  pulses: 3,
  flesh: 3,
  dairy: 1.5,
  vegetables: 1.5,
  fruits: 1.5,
  nutsSeeds: 1,
  sweets: 1,
  beverages: 0.5,
  fatsOils: 0,
  condiments: 0,
  other: 1.5,
};

/**
 * How many days a week one food may appear. Staples are *meant* to recur — no
 * dietician asks for a different grain every day — while the sabji and the dal
 * are the variety levers.
 */
export const WEEKLY_REPEAT_CAP: Record<PlateGroup, number> = {
  cereals: 7,
  dairy: 7,
  beverages: 7,
  pulses: 3,
  flesh: 3,
  fruits: 3,
  nutsSeeds: 4,
  vegetables: 2,
  sweets: 2,
  other: 3,
  fatsOils: 7,
  condiments: 7,
};

/** Running memory of what the week has used so far. */
export interface UsageHistory {
  dayIndex: number;
  /** foodId → index of the last day it was used on. */
  lastUsedDay: Map<string, number>;
  /** foodId → number of days it has been used this week. */
  useCount: Map<string, number>;
  /** foodIds already used today. */
  usedToday: Set<string>;
  /** Grams already planned per plate group today. */
  gramsToday: Map<PlateGroup, number>;
}

export function emptyHistory(): UsageHistory {
  return {
    dayIndex: 0,
    lastUsedDay: new Map(),
    useCount: new Map(),
    usedToday: new Set(),
    gramsToday: new Map(),
  };
}

/** Move the history on to a new day (clears the per-day parts). */
export function startDay(history: UsageHistory, dayIndex: number): void {
  history.dayIndex = dayIndex;
  history.usedToday = new Set();
  history.gramsToday = new Map();
}

/** Record that `grams` of `food` were planned today. */
export function recordUse(
  history: UsageHistory,
  food: FoodItem,
  grams: number,
): void {
  const group = plateGroup(food);
  history.usedToday.add(food.id);
  history.gramsToday.set(group, (history.gramsToday.get(group) ?? 0) + grams);
  if (history.lastUsedDay.get(food.id) !== history.dayIndex) {
    history.useCount.set(food.id, (history.useCount.get(food.id) ?? 0) + 1);
    history.lastUsedDay.set(food.id, history.dayIndex);
  }
}

export interface DayPlanContext {
  date: string;
  profile: UserProfile;
  targetCalories: number;
  targetProtein: number;
  /** Already diet-filtered and plannable. */
  foods: FoodItem[];
  quotas: PlateQuotas;
  history: UsageHistory;
  rng: Rng;
}

/** 1 when the food is tagged for this meal, 0.35 when untagged, 0.08 otherwise. */
function mealFit(food: FoodItem, mealType: MealType): number {
  if (food.mealTypes.length === 0) return 0.35; // half-faceted DB must not starve
  return food.mealTypes.includes(mealType) ? 1 : 0.08;
}

/** 0 blocks the food; otherwise recent and frequent use is penalised. */
function varietyWeight(food: FoodItem, history: UsageHistory): number {
  if (history.usedToday.has(food.id)) return 0;
  const used = history.useCount.get(food.id) ?? 0;
  if (used >= (WEEKLY_REPEAT_CAP[plateGroup(food)] ?? 3)) return 0;
  const last = history.lastUsedDay.get(food.id);
  const gap = last === undefined ? 99 : history.dayIndex - last;
  const recency = gap <= 1 ? 0.15 : gap === 2 ? 0.5 : 1;
  return recency / (1 + used);
}

/** How far this food's group still is from its daily quota (0.05..1). */
function quotaWeight(
  group: PlateGroup,
  quotas: PlateQuotas,
  history: UsageHistory,
): number {
  const quota = quotas[group] ?? 0;
  if (quota <= 0) return 0.25; // no published quota (sweets, beverages)
  const used = history.gramsToday.get(group) ?? 0;
  return Math.max(0.05, (quota - used) / quota);
}

/** Nudge towards protein-dense foods while the day is short on protein. */
function proteinBias(food: FoodItem, deficitRatio: number): number {
  if (deficitRatio <= 0) return 1;
  const v = toVector(food.nutrients);
  const perKcal = (v.protein_g / (v.energy_kcal || 1)) * 100;
  return 1 + deficitRatio * Math.min(perKcal / 10, 1.5);
}

function candidatesForSlot(
  slot: Slot,
  foods: FoodItem[],
  dietType: UserProfile["dietType"],
): FoodItem[] {
  if (slot === "protein") {
    const groups: PlateGroup[] =
      dietType === "nonveg" ? ["pulses", "flesh"] : ["pulses"];
    return foods.filter((f) => groups.includes(plateGroup(f)));
  }
  return foods.filter((f) => plateGroup(f) === slot);
}

/**
 * Build one day. Every slot that finds a candidate contributes an item; slots
 * that come up empty (no dairy in a vegan DB, no fruit left under the repeat
 * cap) simply hand their calories to the rest of the meal.
 */
export function generateDayPlan(
  ctx: DayPlanContext,
  templates: MealTemplate[] = DEFAULT_MEAL_TEMPLATES,
): Plan {
  const plan: Plan = {
    id: `plan-${ctx.date}`,
    date: ctx.date,
    meals: templates.map((t) => ({ name: t.name, items: [] })),
  };
  if (ctx.foods.length === 0) return plan;

  let proteinSoFar = 0;

  templates.forEach((template, mealIndex) => {
    const mealKcal = ctx.targetCalories * template.kcalShare;
    const deficitRatio =
      ctx.targetProtein > 0
        ? Math.max(0, (ctx.targetProtein - proteinSoFar) / ctx.targetProtein)
        : 0;

    // 1. Choose a food per slot (weighted random — this is what makes two
    //    seeds give two different days).
    const chosen: { food: FoodItem; slot: Slot }[] = [];
    for (const slot of template.slots) {
      const pool = candidatesForSlot(slot, ctx.foods, ctx.profile.dietType);
      const food = pickWeighted(
        pool,
        (f) =>
          quotaWeight(plateGroup(f), ctx.quotas, ctx.history) *
          mealFit(f, template.mealType) *
          varietyWeight(f, ctx.history) *
          proteinBias(f, deficitRatio),
        ctx.rng,
      );
      if (food) {
        chosen.push({ food, slot });
        // Reserve it immediately so a later slot in the same meal cannot
        // pick it again.
        ctx.history.usedToday.add(food.id);
      }
    }

    // 2. Split the meal's calories over the slots that produced an item.
    const weightSum = chosen.reduce(
      (sum, c) => sum + (SLOT_KCAL_WEIGHT[c.slot] || 1),
      0,
    );

    plan.meals[mealIndex].items = chosen.map(({ food, slot }) => {
      const share = (SLOT_KCAL_WEIGHT[slot] || 1) / (weightSum || 1);
      const quantity = clampPortion(food, quantityForKcal(food, mealKcal * share));
      recordUse(ctx.history, food, quantity);
      proteinSoFar +=
        (toVector(food.nutrients).protein_g / food.referenceQuantity) * quantity;
      return { foodId: food.id, quantity };
    });
  });

  return plan;
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/core/day-planner.test.ts
```

Expected: PASS (14 tests). If "touches at least five plate groups" fails, the
weights are too aggressive — raise the floor in `quotaWeight` from `0.05` to
`0.1` and re-run; do **not** weaken the assertion.

- [ ] **Step 5: Commit**

```bash
git add src/core/day-planner.ts src/core/day-planner.test.ts && git commit -m "Feature - Day planner with plate-group slots and seeded selection"
```

---

### Task 5: Balance repair pass (calorie band + protein floor)

**Files:**
- Modify: `src/core/day-planner.ts` (add `balanceDay`, call it from `generateDayPlan`)
- Modify: `src/core/day-planner.test.ts` (add the band tests)

- [ ] **Step 1: Write the failing test**

Append to `src/core/day-planner.test.ts`:

```ts
import { balanceDay, KCAL_BAND, PROTEIN_FLOOR } from "./day-planner";
import { planTotals } from "./totals";

describe("balanceDay", () => {
  const byId = new Map(pool.map((f) => [f.id, f]));

  it("pulls an under-target day up into the calorie band", () => {
    const skimpy = {
      id: "plan-2026-09-21",
      date: "2026-09-21",
      meals: [{ name: "Lunch", items: [{ foodId: "rice", quantity: 30 }] }],
    };
    const fixed = balanceDay(skimpy, byId, 1200, 40);
    const kcal = planTotals(fixed, byId).energy_kcal;
    // 200 g is the cereal ceiling — it cannot reach 1200 kcal from one food,
    // but it must move decisively towards it and never exceed the ceiling.
    expect(kcal).toBeGreaterThan(planTotals(skimpy, byId).energy_kcal);
    expect(fixed.meals[0].items[0].quantity).toBeLessThanOrEqual(200);
  });

  it("pulls an over-target day down into the band", () => {
    const heavy = {
      id: "plan-2026-09-21",
      date: "2026-09-21",
      meals: [
        {
          name: "Lunch",
          items: [
            { foodId: "rice", quantity: 200 },
            { foodId: "almond", quantity: 45 },
            { foodId: "toor-dal", quantity: 200 },
          ],
        },
      ],
    };
    const fixed = balanceDay(heavy, byId, 500, 20);
    const kcal = planTotals(fixed, byId).energy_kcal;
    expect(kcal).toBeLessThan(planTotals(heavy, byId).energy_kcal);
  });

  it("never pushes an item outside its portion bounds", () => {
    const plan = {
      id: "plan-2026-09-21",
      date: "2026-09-21",
      meals: [{ name: "Snacks", items: [{ foodId: "almond", quantity: 20 }] }],
    };
    const fixed = balanceDay(plan, byId, 4000, 200);
    expect(fixed.meals[0].items[0].quantity).toBeLessThanOrEqual(45);
  });

  it("leaves an already balanced day alone", () => {
    const plan = generateDayPlan(ctx());
    expect(balanceDay(plan, byId, 2000, 70)).toEqual(
      balanceDay(balanceDay(plan, byId, 2000, 70), byId, 2000, 70),
    );
  });

  it("does not mutate its input", () => {
    const plan = generateDayPlan(ctx());
    const before = structuredClone(plan);
    balanceDay(plan, byId, 900, 30);
    expect(plan).toEqual(before);
  });
});

describe("generateDayPlan — lands in band", () => {
  const byId = new Map(pool.map((f) => [f.id, f]));

  it("hits the calorie band for a range of targets and seeds", () => {
    for (const target of [1500, 2000, 2600]) {
      for (const seed of [1, 2, 3, 4, 5]) {
        const plan = generateDayPlan(
          ctx({ targetCalories: target, rng: mulberry32(seed) }),
        );
        const kcal = planTotals(plan, byId).energy_kcal;
        expect(kcal).toBeGreaterThan(target * 0.88);
        expect(kcal).toBeLessThan(target * 1.12);
      }
    }
  });

  it("meets at least 85 % of the protein target", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const plan = generateDayPlan(ctx({ rng: mulberry32(seed) }));
      expect(planTotals(plan, byId).protein_g).toBeGreaterThan(70 * 0.85);
    }
  });

  it("exposes its bands as constants", () => {
    expect(KCAL_BAND.min).toBeLessThan(1);
    expect(KCAL_BAND.max).toBeGreaterThan(1);
    expect(PROTEIN_FLOOR).toBeGreaterThanOrEqual(0.85);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/core/day-planner.test.ts
```

Expected: FAIL — `balanceDay is not exported by ./day-planner`.

- [ ] **Step 3: Write the implementation**

Add to `src/core/day-planner.ts` (imports first — extend the existing ones):

```ts
import { portionBounds } from "./food-groups";
import { planTotals } from "./totals";
```

then append:

```ts
// ---------------------------------------------------------------------------
// Repair pass — the guarantee behind "balanced"
// ---------------------------------------------------------------------------

/** A day's energy must land inside this multiple of the target. */
export const KCAL_BAND = { min: 0.92, max: 1.08 } as const;

/** A day must reach this share of the protein target. */
export const PROTEIN_FLOOR = 0.9;

const MAX_PASSES = 6;

function allItems(plan: Plan) {
  return plan.meals.flatMap((meal) => meal.items);
}

function proteinDensity(food: FoodItem): number {
  const v = toVector(food.nutrients);
  return v.protein_g / (v.energy_kcal || 1);
}

/**
 * Scale every item by `factor`, clamped to each food's portion bounds. Returns
 * true when at least one quantity actually moved (false ⇒ everything is pinned
 * at a bound and further passes are pointless).
 */
function scaleItems(
  plan: Plan,
  foodsById: Map<string, FoodItem>,
  factor: number,
): boolean {
  let moved = false;
  for (const item of allItems(plan)) {
    const food = foodsById.get(item.foodId);
    if (!food) continue;
    const { min, max } = portionBounds(food);
    const next = Math.round(Math.min(Math.max(item.quantity * factor, min), max) / 5) * 5;
    if (next !== item.quantity) {
      item.quantity = Math.max(5, next);
      moved = true;
    }
  }
  return moved;
}

/**
 * Bring a day inside the calorie band and over the protein floor, only ever
 * changing quantities (never the food choices — those carry the variety and
 * meal-fit decisions made above).
 *
 * Order matters: calories first, then protein (growing the protein-dense items
 * usually costs few calories), then one final trim so the protein top-up cannot
 * push the day back over its ceiling. Pure — returns a new plan.
 */
export function balanceDay(
  plan: Plan,
  foodsById: Map<string, FoodItem>,
  targetCalories: number,
  targetProtein: number,
): Plan {
  const next = structuredClone(plan);
  if (allItems(next).length === 0 || targetCalories <= 0) return next;

  // 1. Calories into band.
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const kcal = planTotals(next, foodsById).energy_kcal;
    if (kcal <= 0) break;
    const ratio = targetCalories / kcal;
    if (ratio >= KCAL_BAND.min && ratio <= KCAL_BAND.max) break;
    if (!scaleItems(next, foodsById, ratio)) break;
  }

  // 2. Protein floor — grow the densest items first, within their bounds.
  if (targetProtein > 0) {
    const dense = allItems(next)
      .map((item) => ({ item, food: foodsById.get(item.foodId) }))
      .filter((x): x is { item: (typeof x)["item"]; food: FoodItem } => !!x.food)
      .sort((a, b) => proteinDensity(b.food) - proteinDensity(a.food));

    for (const { item, food } of dense) {
      if (planTotals(next, foodsById).protein_g >= targetProtein * PROTEIN_FLOOR) break;
      const { max } = portionBounds(food);
      const grown = Math.round(Math.min(item.quantity * 1.3, max) / 5) * 5;
      item.quantity = Math.max(item.quantity, grown);
    }
  }

  // 3. Final ceiling trim, so the protein top-up cannot overshoot the day.
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const kcal = planTotals(next, foodsById).energy_kcal;
    if (kcal <= targetCalories * KCAL_BAND.max || kcal <= 0) break;
    if (!scaleItems(next, foodsById, (targetCalories / kcal) * 1.02)) break;
  }

  return next;
}
```

Finally, make `generateDayPlan` return a balanced day. Replace its closing
`return plan;` with:

```ts
  const foodsById = new Map(ctx.foods.map((f) => [f.id, f]));
  const balanced = balanceDay(
    plan,
    foodsById,
    ctx.targetCalories,
    ctx.targetProtein,
  );

  // Selection recorded pre-balance grams (so quota pressure decays *during*
  // the day — that is what rotates pulses vs flesh for an omnivore). Rebuild
  // the day's group totals from the final quantities so the week's accounting
  // matches what the user will actually eat.
  ctx.history.gramsToday = new Map();
  for (const meal of balanced.meals) {
    for (const item of meal.items) {
      const food = foodsById.get(item.foodId);
      if (!food) continue;
      const group = plateGroup(food);
      ctx.history.gramsToday.set(
        group,
        (ctx.history.gramsToday.get(group) ?? 0) + item.quantity,
      );
    }
  }

  return balanced;
```

Leave the `recordUse(ctx.history, food, quantity)` call inside the item map
exactly as Task 4 wrote it — the rebuild above replaces those grams rather than
adding to them.

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/core/day-planner.test.ts
```

Expected: PASS (22 tests). If the calorie-band loop fails for 2600 kcal, the
pool's portion ceilings genuinely cannot reach the target — widen
`DISH_BOUNDS.max` or add a 5th meal template rather than loosening the band.

- [ ] **Step 5: Verify the suite and commit**

```bash
npm run typecheck && npm test
```

```bash
git add src/core/day-planner.ts src/core/day-planner.test.ts && git commit -m "Feature - Day balance pass for calorie band and protein floor"
```

---

### Task 6: Week engine — generate 7 balanced, varied days

**Files:**
- Create: `src/core/week-planner.ts`
- Create: `src/core/week-planner.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/core/week-planner.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { generateWeekPlan } from "./week-planner";
import { makeFood, makeNutrients } from "./test-fixtures";
import { planTotals } from "./totals";
import type { FoodItem, UserProfile } from "./schema";

const profile: UserProfile = {
  id: "local",
  name: "Test",
  age: 30,
  sex: "male",
  heightCm: 175,
  weightKg: 70,
  activityLevel: "moderate",
  workType: "desk",
  goal: "maintain",
  dietType: "veg",
  exclusions: ["peanut"],
  plannerMode: "weekly",
};

const group = (
  ids: string[],
  category: string,
  mealTypes: FoodItem["mealTypes"],
  kcal: number,
  protein: number,
  diet: FoodItem["dietTypes"] = ["veg", "vegan"],
) =>
  ids.map((id) =>
    makeFood({
      id,
      category,
      dietTypes: diet,
      mealTypes,
      nutrients: makeNutrients({ energy_kcal: kcal, protein_g: protein, carbs_g: 20 }),
    }),
  );

const foods: FoodItem[] = [
  ...group(["rice", "roti", "poha", "upma", "idli", "dosa", "millet"], "Grains & Cereals", ["breakfast", "lunch", "dinner"], 135, 3),
  ...group(["toor", "moong", "rajma", "chana", "masoor", "urad"], "Legumes & Pulses", ["lunch", "dinner"], 120, 9),
  ...group(["bhindi", "lauki", "palak", "gobi", "baingan", "methi", "tinda", "kaddu"], "Vegetables", ["lunch", "dinner"], 35, 2),
  ...group(["milk", "curd", "paneer"], "Dairy", ["breakfast", "lunch"], 90, 6, ["veg"]),
  ...group(["banana", "apple", "papaya", "guava"], "Fruits", ["breakfast", "snack"], 60, 1),
  ...group(["almond", "walnut", "cashew"], "Nuts, Seeds & Dry Fruits", ["snack"], 580, 20),
  ...group(["chicken", "fish"], "Meat & Seafood", ["lunch", "dinner"], 165, 28, ["nonveg"]),
  ...group(["peanut"], "Nuts, Seeds & Dry Fruits", ["snack"], 567, 26),
  ...group(["ghee"], "Fats & Oils", [], 884, 0),
];

const targets = { calories: 2200, protein: 80 };
const byId = new Map(foods.map((f) => [f.id, f]));
const idsOf = (plan: { meals: { items: { foodId: string }[] }[] }) =>
  plan.meals.flatMap((m) => m.items.map((i) => i.foodId));

describe("generateWeekPlan — shape", () => {
  const week = generateWeekPlan(profile, targets, foods, {
    seed: 1,
    startDate: "2026-09-21",
  });

  it("returns seven consecutive dated plans", () => {
    expect(week.days).toHaveLength(7);
    expect(week.days.map((d) => d.date)).toEqual([
      "2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24",
      "2026-09-25", "2026-09-26", "2026-09-27",
    ]);
    expect(week.startDate).toBe("2026-09-21");
  });

  it("uses the plan id convention so the dashboard finds each day", () => {
    for (const day of week.days) expect(day.id).toBe(`plan-${day.date}`);
  });

  it("reports the seed it used", () => {
    expect(week.seed).toBe(1);
  });
});

describe("generateWeekPlan — preferences", () => {
  it("never plans a food the diet or exclusions forbid", () => {
    const week = generateWeekPlan(profile, targets, foods, { seed: 2, startDate: "2026-09-21" });
    const ids = week.days.flatMap(idsOf);
    expect(ids).not.toContain("chicken");
    expect(ids).not.toContain("fish");
    expect(ids).not.toContain("peanut"); // excluded by name
  });

  it("never plans dairy or flesh for a vegan", () => {
    const week = generateWeekPlan(
      { ...profile, dietType: "vegan", exclusions: [] },
      targets,
      foods,
      { seed: 3, startDate: "2026-09-21" },
    );
    const ids = week.days.flatMap(idsOf);
    for (const banned of ["milk", "curd", "paneer", "chicken", "fish"]) {
      expect(ids).not.toContain(banned);
    }
  });

  it("uses flesh foods for an omnivore", () => {
    const week = generateWeekPlan(
      { ...profile, dietType: "nonveg", exclusions: [] },
      targets,
      foods,
      { seed: 4, startDate: "2026-09-21" },
    );
    const ids = week.days.flatMap(idsOf);
    expect(ids.some((id) => id === "chicken" || id === "fish")).toBe(true);
  });

  it("never plans a cooking input", () => {
    const week = generateWeekPlan(profile, targets, foods, { seed: 5, startDate: "2026-09-21" });
    expect(week.days.flatMap(idsOf)).not.toContain("ghee");
  });
});

describe("generateWeekPlan — balance", () => {
  const week = generateWeekPlan(profile, targets, foods, { seed: 6, startDate: "2026-09-21" });

  it("keeps every day inside the calorie band", () => {
    for (const day of week.days) {
      const kcal = planTotals(day, byId).energy_kcal;
      expect(kcal).toBeGreaterThan(targets.calories * 0.88);
      expect(kcal).toBeLessThan(targets.calories * 1.12);
    }
  });

  it("meets the protein floor every day", () => {
    for (const day of week.days) {
      expect(planTotals(day, byId).protein_g).toBeGreaterThan(targets.protein * 0.85);
    }
  });
});

describe("generateWeekPlan — variety", () => {
  const week = generateWeekPlan(profile, targets, foods, { seed: 7, startDate: "2026-09-21" });

  it("uses a wide slice of the database", () => {
    const distinct = new Set(week.days.flatMap(idsOf));
    expect(distinct.size).toBeGreaterThanOrEqual(15);
  });

  it("does not repeat a vegetable more than twice in the week", () => {
    const counts = new Map<string, number>();
    for (const day of week.days) {
      for (const id of new Set(idsOf(day))) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
    for (const veg of ["bhindi", "lauki", "palak", "gobi", "baingan", "methi", "tinda", "kaddu"]) {
      expect(counts.get(veg) ?? 0).toBeLessThanOrEqual(2);
    }
  });

  it("gives consecutive days different main items", () => {
    for (let i = 1; i < week.days.length; i++) {
      const prev = new Set(idsOf(week.days[i - 1]));
      const overlap = idsOf(week.days[i]).filter((id) => prev.has(id));
      // Staples may recur; a day must still bring several new items.
      expect(overlap.length).toBeLessThan(idsOf(week.days[i]).length);
    }
  });
});

describe("generateWeekPlan — dynamic regeneration", () => {
  it("is reproducible for the same seed", () => {
    const a = generateWeekPlan(profile, targets, foods, { seed: 8, startDate: "2026-09-21" });
    const b = generateWeekPlan(profile, targets, foods, { seed: 8, startDate: "2026-09-21" });
    expect(a.days).toEqual(b.days);
  });

  it("produces a materially different week for a new seed", () => {
    const a = generateWeekPlan(profile, targets, foods, { seed: 8, startDate: "2026-09-21" });
    const b = generateWeekPlan(profile, targets, foods, { seed: 99, startDate: "2026-09-21" });
    const aIds = a.days.map((d) => idsOf(d).join("|"));
    const bIds = b.days.map((d) => idsOf(d).join("|"));
    const changedDays = aIds.filter((ids, i) => ids !== bIds[i]).length;
    expect(changedDays).toBeGreaterThanOrEqual(5);
  });

  it("stays valid across many different seeds", () => {
    for (let seed = 100; seed < 120; seed++) {
      const week = generateWeekPlan(profile, targets, foods, { seed, startDate: "2026-09-21" });
      for (const day of week.days) {
        expect(day.meals.every((m) => m.items.length > 0)).toBe(true);
        const kcal = planTotals(day, byId).energy_kcal;
        expect(kcal).toBeGreaterThan(targets.calories * 0.85);
        expect(kcal).toBeLessThan(targets.calories * 1.15);
      }
    }
  });
});

describe("generateWeekPlan — degraded input", () => {
  it("returns seven empty days rather than throwing when nothing passes filters", () => {
    const week = generateWeekPlan(
      { ...profile, exclusions: foods.map((f) => f.id) },
      targets,
      foods,
      { seed: 1, startDate: "2026-09-21" },
    );
    expect(week.days).toHaveLength(7);
    expect(week.days.every((d) => d.meals.every((m) => m.items.length === 0))).toBe(true);
  });

  it("supports a shorter horizon", () => {
    const week = generateWeekPlan(profile, targets, foods, {
      seed: 1,
      startDate: "2026-09-21",
      days: 3,
    });
    expect(week.days).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/core/week-planner.test.ts
```

Expected: FAIL — `Failed to resolve import "./week-planner"`.

- [ ] **Step 3: Write the implementation**

Create `src/core/week-planner.ts`:

```ts
import { addDays, startOfWeek, todayISO } from "./date";
import {
  emptyHistory,
  generateDayPlan,
  startDay,
  recordUse,
  type UsageHistory,
} from "./day-planner";
import { dailyQuotas, isPlannable } from "./food-groups";
import { applyFilters } from "./filters";
import { mulberry32, type Rng } from "./random";
import type { FoodItem, Plan, UserProfile } from "./schema";

/**
 * Layer 4 — a week of plans.
 *
 * A week is not a new entity: it is seven ordinary dated `Plan`s, so the
 * dashboard, totals engine and backup keep working untouched. What this module
 * adds is *memory* — one `UsageHistory` threaded through all seven days so they
 * differ from each other, plus best-of-N scoring so a fresh seed gives a new
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
```

> `scoreWeek` is added in Task 7. To keep this task green on its own, add a
> temporary import-free stub at the bottom of the file and replace it in Task 7:
>
> ```ts
> // Replaced by the real implementation in Task 7.
> function scoreWeek(
>   _week: WeekPlan,
>   _foodsById: Map<string, FoodItem>,
>   _targets: WeekTargets,
> ): { total: number } {
>   return { total: 0 };
> }
> ```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/core/week-planner.test.ts
```

Expected: PASS (17 tests).

- [ ] **Step 5: Verify and commit**

```bash
npm run typecheck && npm test
```

```bash
git add src/core/week-planner.ts src/core/week-planner.test.ts && git commit -m "Feature - Week planner generating seven varied balanced days"
```

---

### Task 7: Week scoring (drives best-of-N and the UI summary)

**Files:**
- Modify: `src/core/week-planner.ts` (replace the stub with the real `scoreWeek`)
- Modify: `src/core/week-planner.test.ts` (add scoring tests)

- [ ] **Step 1: Write the failing test**

Append to `src/core/week-planner.test.ts`:

```ts
import { scoreWeek } from "./week-planner";

describe("scoreWeek", () => {
  const week = generateWeekPlan(profile, targets, foods, { seed: 21, startDate: "2026-09-21" });

  it("reports one entry per day", () => {
    const score = scoreWeek(week, byId, targets);
    expect(score.days).toHaveLength(7);
    expect(score.days[0].date).toBe("2026-09-21");
  });

  it("measures calories, protein and plate groups per day", () => {
    const day = scoreWeek(week, byId, targets).days[0];
    expect(day.kcal).toBeGreaterThan(0);
    expect(day.proteinRatio).toBeGreaterThan(0.5);
    expect(day.groups).toBeGreaterThanOrEqual(4);
  });

  it("summarises the week's variety", () => {
    const score = scoreWeek(week, byId, targets);
    expect(score.distinctFoods).toBeGreaterThanOrEqual(15);
    expect(score.maxRepeats).toBeLessThanOrEqual(7);
  });

  it("scores a good week higher than a monotonous one", () => {
    const monotonous = {
      ...week,
      days: week.days.map((d) => ({ ...structuredClone(week.days[0]), id: `plan-${d.date}`, date: d.date })),
    };
    expect(scoreWeek(week, byId, targets).total).toBeGreaterThan(
      scoreWeek(monotonous, byId, targets).total,
    );
  });

  it("scores an empty week at the floor", () => {
    const empty = {
      ...week,
      days: week.days.map((d) => ({ id: d.id, date: d.date, meals: [] })),
    };
    expect(scoreWeek(empty, byId, targets).total).toBeLessThan(40);
  });

  it("is between 0 and 100", () => {
    const total = scoreWeek(week, byId, targets).total;
    expect(total).toBeGreaterThanOrEqual(0);
    expect(total).toBeLessThanOrEqual(100);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/core/week-planner.test.ts
```

Expected: FAIL — `scoreWeek is not exported by ./week-planner`.

- [ ] **Step 3: Write the implementation**

In `src/core/week-planner.ts`, delete the temporary stub and add these imports:

```ts
import { plateGroup, PLANNABLE_GROUPS } from "./food-groups";
import { planTotals } from "./totals";
```

then append:

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/core/week-planner.test.ts
```

Expected: PASS (23 tests) — the best-of-N path in `generateWeekPlan` now uses
real scores, so re-run the whole file, not just the new block.

- [ ] **Step 5: Verify and commit**

```bash
npm run typecheck && npm test
```

```bash
git add src/core/week-planner.ts src/core/week-planner.test.ts && git commit -m "Feature - Week scoring drives best-of-N generation"
```

---

### Task 8: Locked days and single-day reshuffle

**Files:**
- Modify: `src/core/week-planner.test.ts` (add lock/shuffle tests)

`generateWeekPlan` and `regenerateDayInWeek` already implement this (Task 6);
this task proves it and is where a regression would be caught.

- [ ] **Step 1: Write the failing test**

Append to `src/core/week-planner.test.ts`:

```ts
import { regenerateDayInWeek } from "./week-planner";

describe("locked days", () => {
  const first = generateWeekPlan(profile, targets, foods, { seed: 30, startDate: "2026-09-21" });

  it("keeps a locked day byte-identical through a regeneration", () => {
    const again = generateWeekPlan(profile, targets, foods, {
      seed: 31,
      startDate: "2026-09-21",
      lockedDates: ["2026-09-22"],
      existing: first.days,
    });
    const locked = again.days.find((d) => d.date === "2026-09-22");
    expect(locked).toEqual(first.days.find((d) => d.date === "2026-09-22"));
  });

  it("still regenerates the unlocked days", () => {
    const again = generateWeekPlan(profile, targets, foods, {
      seed: 31,
      startDate: "2026-09-21",
      lockedDates: ["2026-09-22"],
      existing: first.days,
    });
    const changed = again.days.filter(
      (d, i) => idsOf(d).join("|") !== idsOf(first.days[i]).join("|"),
    );
    expect(changed.length).toBeGreaterThanOrEqual(4);
  });

  it("ignores a locked date with no stored plan", () => {
    const again = generateWeekPlan(profile, targets, foods, {
      seed: 32,
      startDate: "2026-09-21",
      lockedDates: ["2030-01-01"],
      existing: first.days,
    });
    expect(again.days).toHaveLength(7);
  });
});

describe("regenerateDayInWeek", () => {
  const week = generateWeekPlan(profile, targets, foods, { seed: 40, startDate: "2026-09-21" });

  it("changes only the requested day", () => {
    const next = regenerateDayInWeek(profile, targets, foods, week, "2026-09-23", 12345);
    next.days.forEach((day, i) => {
      if (day.date === "2026-09-23") return;
      expect(day).toEqual(week.days[i]);
    });
  });

  it("actually produces a different day", () => {
    const next = regenerateDayInWeek(profile, targets, foods, week, "2026-09-23", 12345);
    const before = week.days.find((d) => d.date === "2026-09-23")!;
    const after = next.days.find((d) => d.date === "2026-09-23")!;
    expect(idsOf(after).join("|")).not.toBe(idsOf(before).join("|"));
  });

  it("keeps the reshuffled day in band", () => {
    const next = regenerateDayInWeek(profile, targets, foods, week, "2026-09-23", 999);
    const day = next.days.find((d) => d.date === "2026-09-23")!;
    const kcal = planTotals(day, byId).energy_kcal;
    expect(kcal).toBeGreaterThan(targets.calories * 0.88);
    expect(kcal).toBeLessThan(targets.calories * 1.12);
  });

  it("returns the week unchanged for an unknown date", () => {
    expect(regenerateDayInWeek(profile, targets, foods, week, "2030-01-01", 1)).toEqual(week);
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
npx vitest run src/core/week-planner.test.ts
```

Expected: PASS. If "actually produces a different day" is flaky, the pool is too
small for the variety caps — raise the seed or widen the fixture pool, never
delete the assertion.

- [ ] **Step 3: Commit**

```bash
git add src/core/week-planner.test.ts && git commit -m "Test - Locked days and single-day reshuffle"
```

---

### Task 9: Integration test against the real seed database

**Files:**
- Create: `src/core/week-planner.data.test.ts`

- [ ] **Step 1: Write the test**

Create `src/core/week-planner.data.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { computeTargets } from "./nutrition-engine";
import { generateWeekPlan, plannablePool, scoreWeek } from "./week-planner";
import { RdaTableSchema, type FoodItem, type UserProfile } from "./schema";
import { planTotals } from "./totals";

/**
 * The unit tests use a hand-built pool. This one runs the engine against the
 * REAL shipped database, which is where data gaps (too few fruits, too little
 * dairy) actually bite. If a band here fails, the fix is usually *data* — add
 * foods per docs/ADD_FOOD.md — not a looser assertion.
 */
const read = (rel: string) =>
  JSON.parse(readFileSync(resolve(__dirname, "../../public/data", rel), "utf-8"));

const foods: FoodItem[] = read("foods.default.json");
const rda = RdaTableSchema.parse(read("rda.icmr-nin-2020.json"));

const baseProfile: UserProfile = {
  id: "local",
  name: "Test",
  age: 30,
  sex: "male",
  heightCm: 175,
  weightKg: 72,
  activityLevel: "moderate",
  workType: "desk",
  goal: "maintain",
  dietType: "veg",
  exclusions: [],
  plannerMode: "weekly",
};

const byId = new Map(foods.map((f) => [f.id, f]));
const diets = ["veg", "vegan", "nonveg"] as const;

describe("week planner on the real seed database", () => {
  for (const dietType of diets) {
    const profile = { ...baseProfile, dietType };
    const { calories, targets } = computeTargets(profile, rda);
    const weekTargets = { calories, protein: targets.protein_g };

    it(`has a workable food pool for a ${dietType} user`, () => {
      expect(plannablePool(profile, foods).length).toBeGreaterThan(30);
    });

    it(`generates seven in-band days for a ${dietType} user, across seeds`, () => {
      for (const seed of [1, 2, 3, 4, 5]) {
        const week = generateWeekPlan(profile, weekTargets, foods, {
          seed,
          startDate: "2026-09-21",
        });
        expect(week.days).toHaveLength(7);
        for (const day of week.days) {
          const totals = planTotals(day, byId);
          expect(totals.energy_kcal).toBeGreaterThan(calories * 0.85);
          expect(totals.energy_kcal).toBeLessThan(calories * 1.15);
          expect(totals.protein_g).toBeGreaterThan(targets.protein_g * 0.8);
        }
      }
    });

    it(`never violates the ${dietType} diet`, () => {
      const week = generateWeekPlan(profile, weekTargets, foods, {
        seed: 7,
        startDate: "2026-09-21",
      });
      for (const day of week.days) {
        for (const item of day.meals.flatMap((m) => m.items)) {
          expect(byId.get(item.foodId)!.dietTypes).toContain(dietType);
        }
      }
    });

    it(`scores a ${dietType} week acceptably and reports its variety`, () => {
      const week = generateWeekPlan(profile, weekTargets, foods, {
        seed: 11,
        startDate: "2026-09-21",
      });
      const score = scoreWeek(week, byId, weekTargets);
      expect(score.total).toBeGreaterThan(60);
      expect(score.avgGroups).toBeGreaterThanOrEqual(dietType === "vegan" ? 4 : 5);
      expect(score.distinctFoods).toBeGreaterThanOrEqual(20);
    });
  }

  it("respects a user's exclusions end to end", () => {
    const profile = { ...baseProfile, exclusions: ["rice", "milk"] };
    const { calories, targets } = computeTargets(profile, rda);
    const week = generateWeekPlan(
      profile,
      { calories, protein: targets.protein_g },
      foods,
      { seed: 3, startDate: "2026-09-21" },
    );
    const names = week.days.flatMap((d) =>
      d.meals.flatMap((m) => m.items.map((i) => byId.get(i.foodId)!.name.toLowerCase())),
    );
    for (const name of names) {
      expect(name).not.toContain("rice");
      expect(name).not.toContain("milk");
    }
  });
});

/**
 * Not a pass/fail rule — a *report*. These groups are thin in the seed data and
 * a thin group means a repetitive week. See Task 11 / docs/ADD_FOOD.md.
 */
describe("seed coverage report", () => {
  it("prints how many plannable foods each diet has per plate group", () => {
    for (const dietType of diets) {
      const pool = plannablePool({ ...baseProfile, dietType }, foods);
      const counts = new Map<string, number>();
      for (const food of pool) {
        counts.set(food.category, (counts.get(food.category) ?? 0) + 1);
      }
      // eslint-disable-next-line no-console
      console.log(`[coverage] ${dietType}:`, Object.fromEntries(counts));
      expect(pool.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run it**

```bash
npx vitest run src/core/week-planner.data.test.ts
```

Expected: PASS (14 tests) plus three `[coverage]` lines in the output.

If a band fails, read the coverage output first: a group with ≤3 members cannot
fill 7 days. Fix the data (Task 11), not the test.

- [ ] **Step 3: Commit**

```bash
git add src/core/week-planner.data.test.ts && git commit -m "Test - Week planner against the real seed database"
```

---

### Task 10: Store and schema wiring

**Files:**
- Modify: `src/core/schema.ts` (`PLANNER_MODES`)
- Modify: `src/store/useAppStore.ts` (`savePlans`)
- Create: `src/store/useAppStore.test.ts`

No new persisted slice is introduced — a week is seven entries in the existing
`plans` array, so `partialize`, `BackupSchema`, `exportBackup`, `importBackup`
and `resetUserData` need **no change**. State that explicitly in the commit so a
future reader does not go hunting.

- [ ] **Step 1: Write the failing test**

Create `src/store/useAppStore.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "./useAppStore";
import { PLANNER_MODES } from "@/core/schema";
import type { Plan } from "@/core/schema";

const plan = (date: string, foodId = "rice"): Plan => ({
  id: `plan-${date}`,
  date,
  meals: [{ name: "Lunch", items: [{ foodId, quantity: 100 }] }],
});

describe("PLANNER_MODES", () => {
  it("offers a weekly mode", () => {
    expect(PLANNER_MODES).toContain("weekly");
  });
});

describe("savePlans", () => {
  beforeEach(() => {
    useAppStore.setState({ plans: [] });
  });

  it("inserts a whole week in one update", () => {
    const week = ["2026-09-21", "2026-09-22", "2026-09-23"].map((d) => plan(d));
    useAppStore.getState().savePlans(week);
    expect(useAppStore.getState().plans).toHaveLength(3);
  });

  it("replaces existing plans for the same dates and keeps the others", () => {
    useAppStore.getState().savePlans([plan("2026-09-21"), plan("2026-09-30")]);
    useAppStore.getState().savePlans([plan("2026-09-21", "roti")]);
    const plans = useAppStore.getState().plans;
    expect(plans).toHaveLength(2);
    expect(plans.find((p) => p.date === "2026-09-21")!.meals[0].items[0].foodId).toBe("roti");
    expect(plans.some((p) => p.date === "2026-09-30")).toBe(true);
  });

  it("is a no-op for an empty array", () => {
    useAppStore.getState().savePlans([plan("2026-09-21")]);
    useAppStore.getState().savePlans([]);
    expect(useAppStore.getState().plans).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/store/useAppStore.test.ts
```

Expected: FAIL — `PLANNER_MODES` has no `"weekly"`, `savePlans is not a function`.

- [ ] **Step 3: Add the mode**

In `src/core/schema.ts`, change:

```ts
export const PLANNER_MODES = ["targetsOnly", "mealBuilder", "autoGenerate"] as const;
```

to:

```ts
export const PLANNER_MODES = [
  "targetsOnly",
  "mealBuilder",
  "autoGenerate",
  "weekly",
] as const;
```

Adding an enum member is backward-compatible: every persisted profile still
parses, and the default stays `mealBuilder`.

- [ ] **Step 4: Add the batch action**

In `src/store/useAppStore.ts`, declare it in the `AppState` interface beside
`savePlan`:

```ts
  savePlans: (plans: Plan[]) => void;
```

and implement it next to `savePlan`:

```ts
      /**
       * Upsert many plans in a single update — the weekly planner writes seven
       * days at once, and seven sequential `savePlan` calls would mean seven
       * store notifications and seven localStorage writes.
       */
      savePlans: (incoming) =>
        set((state) => {
          if (incoming.length === 0) return {};
          const byId = new Map(state.plans.map((p) => [p.id, p]));
          for (const plan of incoming) byId.set(plan.id, plan);
          return { plans: [...byId.values()] };
        }),
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
npx vitest run src/store/useAppStore.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 6: Verify and commit**

```bash
npm run typecheck && npm test
```

```bash
git add src/core/schema.ts src/store/useAppStore.ts src/store/useAppStore.test.ts && git commit -m "Feature - Weekly planner mode and batch plan save"
```

---

### Task 11: Close the seed-data gaps the coverage report reveals

**Files:**
- Modify: `public/data/foods.default.json`
- Follow: [`docs/ADD_FOOD.md`](ADD_FOOD.md) — it is the source of truth for the
  data shape, enums, diet tags, evidence rules and verification steps.

This is a **data** task, not a code task; it is what turns a technically correct
week into one a person would actually enjoy. Do it only after reading
`ADD_FOOD.md` in full.

Targets, from the coverage report in Task 9:

| Group | Now | Add | Suggested items (all common, well-sourced) |
|---|---:|---:|---|
| Fruits | 8 | **+6** | mosambi, chikoo, pomegranate, watermelon, custard apple, orange |
| Dairy | 3 | **+4** | buttermilk (chaas), lassi (unsweetened), curd (low-fat), khoya |
| Eggs / Meat & Seafood | 3 | **+4** | boiled egg white, rohu fish, chicken breast (tandoori), prawns |

- [ ] **Step 1: Confirm the gap is real**

```bash
npx vitest run src/core/week-planner.data.test.ts 2>&1 | grep coverage
```

Expected: three `[coverage]` lines; note the `Fruits`, `Dairy`, `Eggs` and
`Meat & Seafood` counts.

- [ ] **Step 2: Add the foods**

For each food, follow `docs/ADD_FOOD.md` exactly: full 24-nutrient panel,
`category` from `FOOD_CATEGORIES`, correct `dietTypes`, `mealTypes` facet,
`region`, `prep`, `itemType`, and **≥3 evidences for `verified` / ≥2 for
`needsReview`**, each linking to the item (never a bare homepage).

- [ ] **Step 3: Verify the data integrity suite**

```bash
npx vitest run src/core/data.test.ts
```

Expected: PASS — schema, evidence-count, evidence-URL and diet rules all hold.

- [ ] **Step 4: Verify the planner improves**

```bash
npx vitest run src/core/week-planner.data.test.ts
```

Expected: PASS, with `distinctFoods` and `avgGroups` higher than before.

- [ ] **Step 5: Commit**

```bash
git add public/data/foods.default.json && git commit -m "Data - More fruits, dairy and flesh foods for weekly variety"
```

---

### Task 12: Week planner UI

**Files:**
- Create: `src/features/planner/usePlannerLocks.ts`
- Create: `src/features/planner/DayCard.tsx`
- Create: `src/features/planner/WeekPlanner.tsx`

- [ ] **Step 1: Write the lock hook**

Create `src/features/planner/usePlannerLocks.ts`:

```ts
import { useCallback, useState } from "react";

/**
 * Which dates the user has locked against regeneration.
 *
 * A UI preference, not user data — same call as the food list's "Group by": it
 * lives in `localStorage`, deliberately outside the store and the backup, so it
 * never has to be wired through `partialize`/`BackupSchema`/export/import/reset.
 */
const KEY = "nourish.planner.locks";

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((d) => typeof d === "string") : [];
  } catch {
    return [];
  }
}

export function usePlannerLocks() {
  const [locked, setLocked] = useState<string[]>(read);

  const persist = useCallback((next: string[]) => {
    setLocked(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* private mode — locks simply do not survive a reload */
    }
  }, []);

  const toggle = useCallback(
    (date: string) =>
      persist(locked.includes(date) ? locked.filter((d) => d !== date) : [...locked, date]),
    [locked, persist],
  );

  const isLocked = useCallback((date: string) => locked.includes(date), [locked]);

  return { locked, toggle, isLocked, clear: () => persist([]) };
}
```

- [ ] **Step 2: Write the day card**

Create `src/features/planner/DayCard.tsx`:

```tsx
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
          {score && (
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
            disabled={locked}
            onClick={onShuffle}
          >
            🔄
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {score && (
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
```

- [ ] **Step 3: Write the week planner**

Create `src/features/planner/WeekPlanner.tsx`:

```tsx
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
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

Expected: clean. (`WeekPlanner` is not routed yet — Task 13 wires it.)

- [ ] **Step 5: Commit**

```bash
git add src/features/planner/WeekPlanner.tsx src/features/planner/DayCard.tsx src/features/planner/usePlannerLocks.ts && git commit -m "Feature - Week planner grid with locks, shuffle and balance score"
```

---

### Task 13: Wire the Week mode into the Planner (and make the day view date-aware)

**Files:**
- Modify: `src/features/planner/Planner.tsx`

The day view is currently hard-wired to today, so "Open day" from the week grid
would have nowhere to go. Give it a `selectedDate`.

- [ ] **Step 1: Add the Week tab and the selected date**

In `src/features/planner/Planner.tsx`, extend the imports:

```ts
import { addDays, dayLabel, todayISO } from "@/core/date";
import { WeekPlanner } from "./WeekPlanner";
```

add the tab:

```ts
const MODE_TABS: { value: PlannerMode; label: string }[] = [
  { value: "targetsOnly", label: "Targets only" },
  { value: "mealBuilder", label: "Meal builder" },
  { value: "autoGenerate", label: "Auto-generate" },
  { value: "weekly", label: "Week" },
];
```

and replace the `planId` / `stored` / `plan` state block with a date-aware one:

```ts
  const [date, setDate] = useState<string>(todayISO());
  const planId = `plan-${date}`;
  const stored = plans.find((p) => p.id === planId);
  const [plan, setPlan] = useState<Plan>(stored ?? createEmptyPlan(date));

  // Follow the selected date and any week regeneration that rewrites it.
  useEffect(() => {
    setPlan(plans.find((p) => p.id === `plan-${date}`) ?? createEmptyPlan(date));
  }, [date, plans]);
```

(add `useEffect` to the `react` import).

Then replace every remaining `today()`/`todayISO()` literal inside the day
handlers with `date`:

```ts
  const autoGenerate = () => {
    if (!breakdown) return;
    persist(autoGeneratePlan(profile, breakdown.calories, allFoods, { date }));
  };

  const clearPlan = () => persist(createEmptyPlan(date));
```

- [ ] **Step 2: Render the week mode and the date strip**

Add, directly after the live-summary `<Card>`:

```tsx
      {mode === "weekly" && (
        <WeekPlanner
          onOpenDay={(d) => {
            setDate(d);
            setMode("mealBuilder");
          }}
        />
      )}
```

and wrap the day-mode block's controls with a date picker so the user can see
which day they are editing — inside the existing
`{(mode === "mealBuilder" || mode === "autoGenerate") && (<>` block, above the
button row:

```tsx
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setDate(addDays(date, -1))}>
              ◀
            </Button>
            <span className="min-w-[8rem] text-center text-sm font-medium">
              {date === todayISO() ? `Today · ${dayLabel(date)}` : dayLabel(date)}
            </span>
            <Button variant="outline" size="sm" onClick={() => setDate(addDays(date, 1))}>
              ▶
            </Button>
            {date !== todayISO() && (
              <Button variant="ghost" size="sm" onClick={() => setDate(todayISO())}>
                Jump to today
              </Button>
            )}
          </div>
```

Also update the summary card's title so it does not lie on a non-today date:

```tsx
          <CardTitle>
            {mode === "targetsOnly"
              ? "Your daily targets"
              : mode === "weekly"
                ? "This week vs target"
                : `${date === todayISO() ? "Today" : dayLabel(date)} vs target`}
          </CardTitle>
```

- [ ] **Step 3: Typecheck and build**

```bash
npm run typecheck && npm run build
```

Expected: both clean.

- [ ] **Step 4: Verify in the browser**

Start the dev server through the preview tooling (never `npm run dev` in Bash),
then drive the flow:

1. Open **Planner → Week**.
2. Press **Generate week** — 7 day cards fill; note the balance score.
3. Press **Regenerate week** — the foods change, the score stays ≥ 55.
4. Lock a day (🔒), regenerate — that card is unchanged, the others differ.
5. Shuffle one day (🔄) — only that card changes.
6. **Open day** on a future date — the meal builder shows that date, editable.
7. Check the **Dashboard** on a date the week covers — the rings reflect it.
8. Read the console: no errors or React key warnings.

Capture a screenshot of the week grid for the commit/PR description.

- [ ] **Step 5: Commit**

```bash
git add src/features/planner/Planner.tsx && git commit -m "Feature - Week mode and date-aware day view in the planner"
```

---

### Task 14: Documentation

**Files:**
- Modify: `docs/FEATURES.md` (§3 planner)
- Modify: `docs/CODEBASE.md` (tree + "I want to…" table)
- Modify: `docs/ARCHITECTURE.md` (decisions + data flow + constraints)
- Modify: `docs/ADD_FOOD.md` (new-category note)
- Modify: `README.md` (feature list, if it enumerates features)

Docs are part of the definition of done (CLAUDE.md §2).

- [ ] **Step 1: FEATURES.md — rewrite §3**

Replace the "Layered planner (3 modes)" section with a four-mode version:

```markdown
## 3. Layered planner (4 modes)

One engine, four modes (user picks; stored on `profile.plannerMode`):

1. **Targets only** — `computeTargets()` → rings + full `NutrientTable`.
2. **Meal builder** — add foods to Breakfast/Lunch/Dinner/Snacks for **any
   date** (◀ ▶ day nav); quantities editable; live totals via `planTotals`.
3. **Auto-generate** — `autoGeneratePlan()` deterministically fills one day.
4. **Week** — `generateWeekPlan()` fills **seven dated days at once**.

### Weekly planner

- **Balanced against ICMR-NIN "My Plate for the Day"** — cereals, pulses/flesh,
  dairy, vegetables, fruits and nuts each get a daily gram quota scaled from the
  published 2000 kcal plate to the user's own calorie target
  (`core/food-groups.ts`). Vegan drops the dairy quota and grows pulses/nuts by
  1.3×; an omnivore splits the 85 g protein allowance 55/45 pulses/flesh.
- **Every day lands in band** — a repair pass (`balanceDay`) pulls each day to
  92–108 % of its calorie target and ≥90 % of its protein target by adjusting
  quantities only, never overriding the food choices, and never outside a food's
  sane portion range.
- **Dynamic** — regeneration is a *weighted random draw*, seeded by
  `core/random.ts`. The same seed reproduces a week exactly (so it is testable);
  the UI passes a fresh seed each click, so **every press gives a new week**.
  Three candidate weeks are built per press and the best-scoring one is kept.
- **Variety is group-aware** — staples may recur daily (cereals, dairy) while
  vegetables cap at 2 days/week, dals and flesh at 3, sweets at 2; a food is
  never repeated within one day, and yesterday's foods are heavily down-weighted.
- **Meal fit** — slots are matched against the food's `mealTypes` facet, so
  breakfast gets breakfast foods. Unfacetted foods stay eligible at lower weight.
- **Lock & shuffle** — 🔒 keeps a day through regeneration (it still feeds the
  variety memory); 🔄 reshuffles one day against the rest of the week.
- **Balance score** — `scoreWeek()` grades the week 0–100 on calorie deviation,
  protein adequacy, food groups per day and consecutive repeats; the same score
  picks the best candidate and is shown as a badge.
- A week is **seven ordinary dated `Plan`s**, so each day shows up on the
  dashboard for its own date and stays editable in the meal builder.

Code: `features/planner/Planner.tsx`, `WeekPlanner.tsx`, `DayCard.tsx`,
`usePlannerLocks.ts`, `core/week-planner.ts`, `core/day-planner.ts`,
`core/food-groups.ts`, `core/random.ts`, `core/date.ts`.
```

- [ ] **Step 2: CODEBASE.md — tree entries**

Under `src/core/`, add:

```
  date.ts                    toISODate/todayISO/addDays/startOfWeek/dayLabel (LOCAL time)
  random.ts                  mulberry32/hashSeed/shuffle/pickWeighted (seeded, pure)
  food-groups.ts             PlateGroup taxonomy, ICMR daily quotas, portion bounds
  day-planner.ts             meal templates + slot selection + balanceDay → one balanced day
  week-planner.ts            generateWeekPlan / regenerateDayInWeek / scoreWeek (Layer 4)
```

Under `src/features/`, add:

```
  planner/WeekPlanner.tsx    7-day grid: generate/regenerate, week score, nav
  planner/DayCard.tsx        One day: meals, per-day badges, lock & shuffle
  planner/usePlannerLocks.ts localStorage-backed locked dates (UI pref)
```

and add these rows to the "I want to… → open this" table:

```markdown
| Change weekly generation / variety caps | `src/core/week-planner.ts`, `src/core/day-planner.ts` (`WEEKLY_REPEAT_CAP`) |
| Change what a meal is made of | `src/core/day-planner.ts` `DEFAULT_MEAL_TEMPLATES` |
| Change food-group quotas (ICMR plate) | `src/core/food-groups.ts` `PLATE_QUOTA_2000` / `dailyQuotas` |
| Change sane portion sizes | `src/core/food-groups.ts` `PORTION_BOUNDS` / `DISH_BOUNDS` |
| Change the calorie/protein bands | `src/core/day-planner.ts` `KCAL_BAND` / `PROTEIN_FLOOR` |
| Map a new food category to a plate group | `src/core/food-groups.ts` `CATEGORY_TO_PLATE_GROUP` |
| Work with dates (plan ids, week starts) | `src/core/date.ts` — never `toISOString()`, it is UTC |
```

- [ ] **Step 3: ARCHITECTURE.md — decisions**

Add to "Key decisions & rationale":

```markdown
- **The planner is four layers, not three.** `targetsOnly` → `mealBuilder` →
  `autoGenerate` (one day) → `weekly` (seven days). Layer 4 reuses Layer 3.5
  (`day-planner.ts`) once per day, threading a shared usage history; nothing is
  duplicated.
- **A week is seven dated `Plan`s, not a new entity.** No new persisted slice, so
  the five-place wiring rule is untouched, and each generated day appears on the
  dashboard under its own date automatically.
- **Randomness is seeded and lives in `core/random.ts`.** `core/` must stay
  deterministic and testable, so the seed is an argument: same seed ⇒ same week;
  the UI passes a fresh seed per click, which is what makes "regenerate" dynamic.
  Three candidates are generated per press and `scoreWeek` keeps the best, so
  variation never costs quality.
- **Food-group balance comes from ICMR-NIN "My Plate for the Day" (2024)**,
  scaled linearly to the user's calorie target (`core/food-groups.ts`). The app
  already uses ICMR-NIN RDAs, so the nutrient targets and the plate advice come
  from one authority. Vegan/omnivore adaptations are ours and are labelled as
  such in the code.
- **Repeat caps are per plate group, not global.** Staples (cereals, dairy) may
  recur daily because that is what a dietician expects; vegetables, dals and
  sweets rotate. A global "no repeats" rule would be nutritionally wrong.
- **Dates are local, never UTC.** `core/date.ts` builds `YYYY-MM-DD` from local
  calendar parts: `toISOString()` files anything before 05:30 IST under the
  previous day, which would put a plan on the wrong date.
```

Add to "Data flow examples":

```markdown
- **Generate a week:** `computeTargets` → `{calories, protein}` →
  `generateWeekPlan(profile, targets, foods, {seed, startDate, lockedDates})` →
  best of 3 candidates by `scoreWeek` → 7 `Plan`s → `savePlans` → `plans[]` →
  each day renders on the dashboard for its own date.
```

- [ ] **Step 4: ADD_FOOD.md — one note**

In the section that covers `category`, add:

```markdown
> **New category?** Add it to `FOOD_CATEGORIES` in `src/core/schema.ts` **and**
> map it in `CATEGORY_TO_PLATE_GROUP` in `src/core/food-groups.ts`. Without the
> mapping the food lands in the `other` plate group and the weekly planner will
> almost never choose it.
```

- [ ] **Step 5: Commit**

```bash
git add docs/FEATURES.md docs/CODEBASE.md docs/ARCHITECTURE.md docs/ADD_FOOD.md && git commit -m "Docs - Weekly meal planner"
```

---

### Task 15: Final verification

- [ ] **Step 1: Full suite**

```bash
npm run typecheck && npm test && npm run build
```

Expected: typecheck clean · all suites pass · build succeeds.

- [ ] **Step 2: Browser pass**

Re-run the eight checks from Task 13 Step 4 on the production build preview, and
additionally:

- Export a backup from **Data** → confirm the JSON contains the seven new plans
  under `plans` and imports cleanly into a reset app.
- Switch diet type in **Onboarding** to `vegan`, regenerate the week, confirm no
  dairy appears anywhere.

- [ ] **Step 3: Update this plan's status**

Change the status line at the top of this file to
`> **Status: implemented.**` and add a short "Outcome" section recording the
final numbers (score range observed, distinct foods per week, any constants
tuned during implementation).

- [ ] **Step 4: Commit**

```bash
git add docs/plan_6_weekly_meal_planner.md && git commit -m "Docs - Plan 6 marked implemented"
```

---

# Part IV — Risks, alternatives and scope

## Risks

| Risk | Mitigation |
|---|---|
| Thin groups (3 dairy, 8 fruits) make weeks repetitive | Task 9 reports coverage; Task 11 adds data. The engine degrades gracefully meanwhile. |
| Weighted randomness occasionally picks an odd combination (curd + banana + almond breakfast) | Meal-type facets already gate this; `scoreWeek` best-of-3 filters the worst. A future "pairing rules" table is the escalation, not a band-aid now. |
| `plans[]` grows unbounded (7 entries/week) | Each plan is a few hundred bytes; ~36 KB/year. Revisit only if `localStorage` pressure appears. |
| Portion clamps fight a very high calorie target (>3200 kcal) | The final trim loop exits when nothing can move; the day lands under target and the score says so. Adding a 5th meal template is the fix if users hit it. |
| Test flakiness from randomness | Every test seeds explicitly. No `Math.random()` anywhere in `core/`. |

## Deliberately out of scope

- **Recipe-level planning** (planning "Palak paneer" as a recipe rather than its
  foods). `addRecipeToPlan` already exists; wiring recipes into the generator is
  a follow-up plan.
- **Shopping list** from a week — a natural next feature, not this one.
- **Leftovers / batch cooking** (cook once, eat twice).
- **Eat-back calories** from the activity log — still informational (see
  ARCHITECTURE.md).
- **Micronutrient-driven selection.** The weekly engine balances energy, protein
  and food groups; micronutrient adequacy is *reported* (the existing coverage
  chart) but does not steer selection. Group diversity is the proxy, which is
  what the ICMR guideline itself relies on.

## Sources

- ICMR-NIN, **"My Plate for the Day"** — <https://www.nin.res.in/downloads/My_Plate_for_the_day_J24.pdf>
- ICMR-NIN, **Dietary Guidelines for Indians (2024)** — <https://nin.res.in/dietaryguidelines/pdfjs/locale/DGI_2024.pdf>
- ICMR-NIN, **RDA 2020** — already shipped as `public/data/rda.icmr-nin-2020.json`
- Ducrot et al., *Meal planning is associated with food variety, diet quality and
  body weight status* (Int J Behav Nutr Phys Act, 2017) —
  <https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5288891/>
- FAO/WHO dietary-diversity indicators (rationale for group-count scoring) —
  <https://inddex.nutrition.tufts.edu/data4diets/data-source/dietary-diversity>

---

# Part V — Outcome

Implemented on branch `feature/weekly-meal-planner`. **239 tests pass** (was
142), typecheck clean, production build succeeds.

## What shipped

| Task | Result |
|---|---|
| 1 Local-time dates | `core/date.ts` + 9 tests; the UTC plan-date bug is fixed and `today()` no longer duplicated in two files |
| 2 Seeded PRNG | `core/random.ts` + 11 tests |
| 3 Plate groups & quotas | `core/food-groups.ts` + 13 tests; `planner.ts` now reuses its `quantityForKcal` |
| 4 Day selection | `core/day-planner.ts` + 14 tests |
| 5 Balance pass | `balanceDay` + 8 tests — calorie band and protein floor held on the first run, no constant tuning needed |
| 6-8 Week engine | `core/week-planner.ts` + 30 tests (shape, preferences, balance, variety, determinism, locks, single-day reshuffle) |
| 9 Real-data integration | `week-planner.data.test.ts` + 14 tests across veg/vegan/nonveg |
| 10 Schema & store | `PLANNER_MODES += "weekly"`, `savePlans`, + 5 store tests incl. a backup round-trip of a whole week |
| 11 Seed data | **9 foods added** (120 -> 129) — see "Data task" below |
| 12-13 UI | `WeekPlanner.tsx`, `DayCard.tsx`, `usePlannerLocks.ts`, Week tab + date-aware day view |
| 14 Docs | FEATURES / CODEBASE / ARCHITECTURE / ADD_FOOD / README updated |
| 15 Verification | Full suite + browser pass (desktop and 375 px mobile), veg and vegan profiles |

## Measured behaviour (real seed database, 15 seeds x 3 diets x 7 days)

| Metric | Result |
|---|---|
| Energy per day | 92-108 % of target (band held) |
| Protein share of energy | floor **13.4 %** (veg 13.42 · vegan 13.38 · nonveg 14.12) |
| Balance score | 77-83 (veg), 80 (vegan), 83 (nonveg) |
| Distinct foods per week | 52-60 |
| Regeneration | same seed ⇒ identical week; new seed ⇒ ≥5 of 7 days differ |
| Locked days | byte-identical through regeneration; the other 6 all changed |

## Three things the plan did not anticipate

**1. The protein target is unreachable, and that is not the planner's fault.**
`nutrition-engine.ts`'s `DEFAULT_SPLIT` asks for **25 % of energy from protein**
(2.25 g/kg — 162 g for the test profile). The median food in this database
carries 3.1 g protein per 100 kcal, so a plate that also honours the ICMR
cereal/vegetable/fruit quotas tops out at 13-21 % of energy. Reaching 25 %
would mean a soya-and-tofu-only day.

Two consequences, both deliberate:
- `balanceDay` step 2 was rewritten to **trade grams** from the least
  protein-dense items to the most, instead of only growing the dense ones. The
  original approach was self-defeating: the day sits at its calorie ceiling, so
  the final trim scaled the gain straight back off. The trade lifted veg days
  from ~107 g to as much as 150 g, and nonveg to 163 g (101 % of target).
- The data test asserts protein as a **share of the day's energy** (>12.5 %),
  not as a share of `targets.protein_g`, with the reasoning in a comment at the
  assertion. **If you want the badge to read ~100 %, lower `DEFAULT_SPLIT`'s
  protein share to ~15 % — that is a target-engine decision, not a planner one.**

**2. A vegan day silently lost its dairy slot.** With no dairy in the pool the
breakfast/lunch dairy slots vanished and their calories went to cereal and
fruit, dragging the vegan protein share down to 11.3 % — and adding watermelon
and pear (Task 11) made it worse, which is how the regression surfaced.
`SLOT_FALLBACK` in `day-planner.ts` now turns an unfillable dairy or flesh slot
into a plant-protein slot (and fruit into nuts/seeds), which is what a vegan
diet actually does. Vegan protein share went 11.3 % → 13.4 % and the week score
72 → 80. A stronger selection-time protein bias was also measured and rejected:
it helped vegan (16 %) but hurt veg and nonveg (12.9 / 13.3), a worse floor.

**3. The "This week vs target" ring card was lying.** In weekly mode it showed a
single day's totals under a week heading. The rings are now not rendered in
weekly mode at all — `WeekPlanner` already carries a real week summary plus
per-day badges.

## Data task (Task 11)

Two of the plan's suggested foods (orange, pomegranate) **already existed** —
that list was written from the category counts, not the contents.

**Added (9), every panel pulled from USDA FoodData Central, no invented
numbers:** watermelon, pear, grapes, buttermilk (chaas, low fat), curd/yogurt
(low fat), milk (toned/skim), egg white, prawns/shrimp (cooked), mutton/goat
(cooked). Each ships with 3 evidences — a USDA record page carrying the real
fdcId and the values actually read, plus IFCT-2017 and Open Food Facts pointers
**without a `value_seen`**, because those pages were not read. They are badged
`needsReview`, which is exactly what that tier exists for.

> **Getting the data.** `api.nal.usda.gov` with `DEMO_KEY` is rate limited to
> ~30 requests/hour per IP and was saturated for most of this work. The FDC
> portal's own endpoints are not: `POST
> https://fdc.nal.usda.gov/portal-data/external/search` with
> `{"generalSearchInput": "...", "includeDataTypes": {"SR Legacy": true}}` for
> ids, then `GET https://fdc.nal.usda.gov/portal-data/external/<fdcId>` for the
> full record (values live under `foodNutrients[].value`, not `.amount`). Use
> those for the next data pass, or get a free FDC API key.

**Still not added, and why:**
- *sapota (chikoo), custard apple* — the USDA record genuinely lacks 4 and 7 of
  the 24 nutrients (checked against the full detail record, not just the
  abbreviated search response). Writing an unmeasured nutrient as `0` would be a
  false claim that the food contains none of it, and this file's convention is
  that `0` means genuinely zero — every other fruit carries a real sugar value,
  and only vitamin D and B12 are zero. They need IFCT 2017 values entered by
  hand.
- *mosambi (sweet lime), lassi, khoya* — no matching USDA record at all; same
  remedy.

## Effect of the new foods

| | Before | After |
|---|---|---|
| Foods | 120 | **129** |
| Fruits · Dairy · Eggs · Meat & Seafood | 8 · 3 · 1 · 2 | **11 · 6 · 2 · 4** |
| Flesh foods used over 70 nonveg days | 4 (chicken 23, rohu 22, egg 3, white 4) | **6, evenly spread** (goat 19, chicken 16, prawns 16, rohu 13, egg 2, white 1) |
| Distinct foods per week (max) | 52-60 | **63-66** |
| Min protein share — veg / vegan / nonveg | 13.42 / 13.38 / 14.12 % | 12.73 / 13.29 / **14.16** % |
| Min week score — veg / vegan / nonveg | 77 / 80 / 83 | 77 / 80 / **84** |

The nonveg week is the clear winner: chicken and rohu were both pinned at their
3x/week cap, and goat and prawns broke that up. The veg protein floor slipped
0.7 pp because grapes added another low-protein fruit to the rotation — the data
test's comment now records this and says what to do when a future fruit trips
the bar.

## Remaining gaps

Nothing in the plan is outstanding except the five foods listed above, which
need IFCT 2017 values entered by hand per [ADD_FOOD.md](ADD_FOOD.md).
