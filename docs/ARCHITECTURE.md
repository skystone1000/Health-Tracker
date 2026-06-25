# Architecture — Nourish

High-level design of the app. Read this first for the _why_ and the shape of the
system; read [CODEBASE.md](CODEBASE.md) for the file-by-file map and
[FEATURES.md](FEATURES.md) for what each feature does.

## One-paragraph summary

Nourish is an **offline-first single-page app**. A pure, framework-agnostic
**nutrition core** (`src/core/`, no React, no DOM) does all the math — targets,
filters, totals, planning, recipe nutrition. A thin React UI (`src/features/`)
renders it. State lives in a single **Zustand store** persisted to
`localStorage`; reference data (foods, recipes, RDA) is **baked JSON** fetched at
startup. There is **no backend** and **no runtime third-party API calls**.

## Layered design

```
┌──────────────────────── React UI (src/features/, src/components/) ─────────┐
│  onboarding · dashboard · planner · foods · recipes · exercise · yoga · data│
│  Reads/writes the store; renders pure-core outputs. No business logic here.│
└───────────────┬────────────────────────────────────────────────────────────┘
                │ selectors + actions
┌───────────────▼──────────────── Zustand store (src/store/) ────────────────┐
│  reference data (defaultFoods/Recipes/Exercises/Asanas, rda) — not persisted│
│  user data (profile, custom*/overrides, plans, fitness, routines,           │
│  sequences, activityLog) → localStorage; export/import as a Zod Backup      │
└───────────────┬────────────────────────────────────────────────────────────┘
                │ calls pure functions
┌───────────────▼──────────────── Pure core (src/core/) ─────────────────────┐
│  nutrition: schema · nutrition-engine · planner · filters · totals · recipes│
│  movement:  activity/ (shared MET engine) · exercise/ · yoga/ · fitness     │
│  Pure, deterministic, unit-tested. No React, no DOM, no fetch.              │
└───────────────┬────────────────────────────────────────────────────────────┘
                │ reads
┌───────────────▼──────────────── Seed data (public/data/) ──────────────────┐
│  foods · recipes · rda · exercises · asanas (default JSON)                   │
└──────────────────────────────────────────────────────────────────────────┘
```

**Rule of thumb:** business logic and math go in `src/core/` (and get a test);
the React layer only orchestrates and displays. If you're tempted to compute
nutrition inside a component, add a function to `core/` instead.

## Key decisions & rationale

- **DOM-free `core/`** — so the same engine can power a future **React Native
  (Expo) mobile app**. Keep `core/` free of React/`window`/`fetch`.
- **Baked JSON, no runtime APIs** — nutrient data is curated at build time and
  shipped as JSON. The app works fully offline; no API keys to leak.
- **Single source of truth for filters** — `core/filters.ts` `applyFilters`/
  `dietAllows` are used by the food list, the planner's auto-generate, _and_
  recipe filtering. Diet/exclusion rules can never diverge.
- **One totals engine** — meals, plans and recipe-per-serving nutrition all go
  through `core/totals.ts` (`nutrientsForQuantity` + `sumVectors`). No duplicated
  summation math.
- **Layered planner** — `targetsOnly` → `mealBuilder` → `autoGenerate` are one
  engine; each mode reuses the layer below (see [FEATURES.md](FEATURES.md)).
- **Zod everywhere at the boundary** — schemas validate seed JSON on load, food/
  recipe edits before save, and imported backups. The TS types are inferred from
  the same schemas (`z.infer`), so there is one definition per concept.
- **Exercise and Yoga are two bounded domains** (`core/exercise/`, `core/yoga/`)
  that never import each other. They share exactly one thing: the MET-based
  calorie engine in `core/activity/` (`metCalories` — one source of truth for
  "calories burned"). Difficulty and the activity-log shape also live there.
  New muscle groups, equipment and asana families are added as **data** (a key
  list), not code branches (open/closed).
- **Movement prefs are decoupled from the diet profile** — `FitnessProfile`
  (`core/fitness.ts`) is a separate persisted field, so the nutrition engine
  stays unaware of exercise/yoga concepts.
- **Counter-poses are id references, not object graphs** — an asana's
  `counterAsanaIds` link to other asanas exactly like recipe→food ids, with a
  referential-integrity test in `core/yoga/data.test.ts`. Counter logic lives in
  `core/yoga/counterpose.ts`; the sequence engine uses it to insert gentle
  counters after backbends.
- **Yoga theory is structured, cited data** — `core/yoga/{theory,styles}.ts`
  hold the Learn-page curriculum and traditions as typed, content-integrity-
  tested data (not hardcoded JSX). Patanjali's eight limbs are reference content,
  kept distinct from the Ashtanga *Vinyasa* style.
- **Calories burned are informational in v1** — shown beside intake; nutrition
  targets are unchanged. The dashboard depends only on one narrow aggregation
  (`summarizeForDate` over `activityLog`), so "eat-back calories" can later be
  switched on in one place.
- **One backup aggregator** — `core/backup.ts` `BackupSchema` composes the
  persisted slices of every domain (nutrition + movement). It lives apart from
  `schema.ts` to avoid a cycle (domain schemas import `schema.ts` for `Evidence`).

## Data flow examples

- **Onboarding → targets:** form → `UserProfileSchema` validate → store
  `profile` → `useTargets()` calls `computeTargets(profile, rda)` → dashboard/
  planner render rings + `NutrientTable`.
- **Auto-generate plan:** `autoGeneratePlan(profile, calories, foods)` (filters
  internally) → `Plan` → `planTotals` vs targets → UI.
- **Add recipe to plan:** `addRecipeToPlan(recipe, meal)` scales ingredients to
  one serving and appends to today's `Plan` in the store.
- **Generate a workout:** `FitnessProfile` → `generateRoutine(fitness, exercises)`
  (filters by equipment/difficulty/limitations internally) → `WorkoutRoutine` →
  `saveRoutine`. Logging a day → `dayEstimatedKcal` (via `metCalories`) →
  `activityLog` → dashboard `Activity today` card.
- **Generate a yoga flow:** `FitnessProfile` → `generateSequence(fitness, asanas)`
  (level + contraindication filtered, safely ordered) → `Sequence`; logging →
  `sequenceEstimatedKcal` → `activityLog`.

## Tech stack

React 18 · Vite · TypeScript (strict) · Tailwind (shadcn-style hand-built
primitives in `src/components/ui.tsx`) · Zustand · Zod · Recharts · Vitest.

## Testing strategy

The core is covered by Vitest unit tests (`src/core/*.test.ts`) including a
**data-integrity test** (`data.test.ts`) that validates the seed JSON against the
schemas, enforces the ≥3-evidence rule for foods, and checks every recipe
references a real food id. Run `npm test`. UI is verified manually / via the
preview browser tooling.

## Constraints to preserve

1. Don't import React/DOM/`fetch` into `src/core/`.
2. Any new persisted state must be wired in **five** places: the store state +
   `partialize`, `core/backup.ts` `BackupSchema`, `exportBackup`, `importBackup`,
   and `resetUserData`. (Currently: profile, custom foods/overrides, recipes,
   plans, fitness, custom exercises/overrides, custom asanas/overrides, workout
   routines, yoga sequences, activityLog.)
3. New nutrients must be added to `NUTRIENT_KEYS`/`NUTRIENT_META` and the grouped
   schemas — they then flow through totals, targets and the editor automatically.
4. Keep the exercise and yoga domains independent of each other; put anything
   they both need in `core/activity/` (the shared movement primitive).
