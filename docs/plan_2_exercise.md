# Plan 2 — Exercise & Yoga for Nourish

Implementation plan for adding **Exercise** and **Yoga** to Nourish, the
offline-first React + Vite diet tracker. This plan follows the existing
architecture (pure `core/`, Zustand store, baked JSON, thin React features) and
applies SOLID principles so the new domains stay modular and loosely coupled.

> Read [`docs/ARCHITECTURE.md`](ARCHITECTURE.md), [`docs/CODEBASE.md`](CODEBASE.md)
> and [`docs/FEATURES.md`](FEATURES.md) first. This plan extends, not replaces,
> the patterns described there.

---

## 1. Scope & decisions

Locked decisions for v1 (from product discussion):

| Decision | Choice |
|---|---|
| **Core scope** | Catalog (library) + customised plan generation + daily logging + calories-burned estimation. |
| **Calorie link to nutrition** | **Side-by-side only.** Calories burned are estimated and displayed next to intake; they do **not** change nutrition targets in v1. A clean hook is left so target adjustment ("eat-back calories") can be enabled later without refactoring. |
| **Yoga vs Exercise** | **Two separate top-level sections** (distinct sidebar items, routes, and data). Shared math is reused; the user experience keeps them clearly different. |
| **Reference data** | **Baked JSON** (`public/data/*.json`), Zod-validated on load, with the same evidence discipline as foods. |

**Out of scope for v1 (roadmap):** target adjustment from activity, wearable/health-kit
import, social/streaks, video demos, rest-timer audio.

---

## 2. Architectural principles (how this stays modular & SOLID)

The repo already enforces a layered, DOM-free core. We preserve that and add two
new bounded domains plus one shared activity primitive.

- **SRP (Single Responsibility):** every new `core/` file does exactly one thing
  (schema, calorie math, routine generation, filtering, totals). No file mixes
  data-shape, math, and orchestration.
- **OCP (Open/Closed):** new muscle groups, equipment, difficulty levels, and
  asana families are added as **data** (JSON + a key list), never by editing
  branching logic. Engines iterate over registries, not hard-coded switches.
- **LSP / ISP (substitution / small interfaces):** Exercise and Asana both
  satisfy a minimal `BurnsCalories` shape (`metValue`, duration) consumed by the
  shared calorie engine. Components depend on narrow selectors, not the whole
  store.
- **DIP (Dependency Inversion):** React features depend on pure-core functions
  and store selectors — never the reverse. `core/` never imports React, the
  store, the DOM, or `fetch` (unchanged constraint).
- **DRY / one source of truth:** one MET-based calorie engine serves *both*
  exercise and yoga; one filter pattern, one totals pattern — mirroring how
  `core/filters.ts` and `core/totals.ts` are reused today.

**Loose coupling boundaries:**

```
features/exercise  ─┐                        ┌─ core/exercise/*  (pure)
features/yoga      ─┤── selectors+actions ──►│─ core/yoga/*      (pure)
features/dashboard ─┘        (store)         └─ core/activity/*  (pure, shared)
```

The dashboard reads activity *only* through a selector (`selectTodayActivity`),
so Exercise/Yoga can change internally without touching the dashboard.

---

## 3. Target file layout

New files only; existing files get small, additive edits (Section 7).

```
public/data/
  exercises.default.json        Curated exercises, full metadata + ≥3 evidences
  asanas.default.json           Curated yoga asanas + ≥3 evidences
  met.reference.json            MET values table (Compendium of Physical Activities)

src/core/activity/              SHARED pure primitive (used by exercise + yoga)
  schema.ts                     Base ActivityLog, MET types, BurnsCalories interface
  calories.ts                   metCalories(met, weightKg, minutes) — single source
  calories.test.ts

src/core/exercise/             PURE exercise domain (no React/DOM)
  schema.ts                     Exercise, MuscleGroup, Equipment, ExerciseSet,
                                WorkoutRoutine, WorkoutSession, WorkoutLog (Zod)
  filters.ts                    by muscle group / equipment / difficulty / split
  routine-engine.ts            generateRoutine(fitnessProfile, exercises)
  volume.ts                     session totals: sets, reps, tonnage, est. kcal
  *.test.ts                     one spec per file + data.test.ts integrity

src/core/yoga/                 PURE yoga domain (no React/DOM)
  schema.ts                     Asana, AsanaFamily, Sequence, YogaLog (Zod)
  filters.ts                    by family / difficulty / focus / contraindication
  sequence-engine.ts           generateSequence(yogaProfile, asanas)
  duration.ts                  sequence totals: total minutes, est. kcal
  *.test.ts                     one spec per file + data.test.ts integrity

src/features/exercise/
  ExerciseLibrary.tsx           Searchable/filterable exercise grid
  ExerciseDetail.tsx            Instructions, target muscles, evidences
  ExerciseEditor.tsx            Add/override exercise (mirrors FoodEditor)
  WorkoutPlan.tsx               Generated routine + manual edit
  WorkoutLogView.tsx            Log a session / view history

src/features/yoga/
  AsanaLibrary.tsx              Searchable/filterable asana grid
  AsanaDetail.tsx               Steps, benefits, contraindications, evidences
  AsanaEditor.tsx               Add/override asana
  SequenceBuilder.tsx           Generated flow + manual edit
  YogaLogView.tsx               Log a session / view history

src/features/shared/
  useActivity.ts                Memoised selector hook for today's activity
  ActivitySummary.tsx           Reusable "burned vs intake" card (dashboard + logs)

src/lib/
  activity.ts                   labels, default fitness profile, enum→label maps
```

> **SRP note on file size:** if `ExerciseLibrary.tsx` or `WorkoutPlan.tsx` grow
> past ~200 lines, split the filter bar and the grid into child components —
> matching how `foods/` keeps `FoodDatabase` and `FoodPicker` separate.

---

## 4. Data model (Zod schemas)

All types are `z.infer`red from schemas (repo rule: change the schema, not a
separate type). Validate seed JSON on load and all user edits.

### 4.1 Shared activity (`core/activity/schema.ts`)

```ts
// Minimal interface every burnable activity satisfies (LSP/ISP)
BurnsCalories = { metValue: number }            // MET intensity

ActivityKind = "exercise" | "yoga"

// A logged unit of activity (one row of history)
ActivityLogEntry = {
  id, date (ISO yyyy-mm-dd), kind: ActivityKind,
  refId,                  // exercise/asana/routine id
  durationMin: number,
  estimatedKcal: number,  // computed via calories.ts at log time
  note?: string,
}
```

### 4.2 Exercise (`core/exercise/schema.ts`)

```ts
MuscleGroup =                 // OCP: extend the key list, not code
  "chest" | "back" | "shoulders" | "biceps" | "triceps" | "forearms" |
  "core" | "quads" | "hamstrings" | "glutes" | "calves" | "fullBody" | "cardio"

BodyRegion = "upper" | "lower" | "core" | "fullBody" | "cardio"  // for splits
Equipment  = "bodyweight" | "dumbbell" | "barbell" | "machine" |
             "kettlebell" | "bands" | "cardioMachine"
Difficulty = "beginner" | "intermediate" | "advanced"

Exercise = {
  id, name, aliases[],
  primaryMuscles: MuscleGroup[], secondaryMuscles: MuscleGroup[],
  region: BodyRegion, equipment: Equipment[], difficulty: Difficulty,
  metValue: number,                       // satisfies BurnsCalories
  instructions: string[], cues?: string[],
  defaultSets?: number, defaultReps?: number,
  evidences: Evidence[],                  // reuse Evidence schema from core/schema.ts
  source: "default" | "user",
}

ExerciseSet      = { reps?: number, weightKg?: number, durationSec?: number }
RoutineExercise  = { exerciseId, sets: ExerciseSet[] }
WorkoutDay       = { label, region: BodyRegion, items: RoutineExercise[] }
WorkoutRoutine   = { id, name, splitType, daysPerWeek, days: WorkoutDay[], source }
WorkoutLog       = ActivityLogEntry & { kind: "exercise", sets?: ExerciseSet[] }
```

### 4.3 Yoga (`core/yoga/schema.ts`) — deliberately distinct vocabulary

```ts
AsanaFamily =                 // covers all asana categories
  "standing" | "seated" | "forwardBend" | "backbend" | "twist" |
  "balance" | "inversion" | "armBalance" | "restorative" |
  "pranayama" | "meditation"

Asana = {
  id, sanskritName, englishName, aliases[],
  family: AsanaFamily, difficulty: Difficulty,
  metValue: number,                       // satisfies BurnsCalories (yoga ~2.3–4.0)
  focus: ("flexibility"|"strength"|"balance"|"relaxation"|"breath")[],
  steps: string[], benefits: string[],
  contraindications: string[],            // e.g. ["pregnancy","knee-injury"]
  defaultHoldSec?: number,
  evidences: Evidence[],
  source: "default" | "user",
}

SequencePose = { asanaId, holdSec: number, side?: "left"|"right"|"both" }
YogaSequence = { id, name, focus, totalMin, poses: SequencePose[], source }
YogaLog      = ActivityLogEntry & { kind: "yoga", poses?: SequencePose[] }
```

### 4.4 Fitness profile (extends onboarding)

Add an **optional** `fitness` block to `UserProfile` (in `core/schema.ts`) so
existing profiles stay valid (backward-compatible, `.optional()`):

```ts
FitnessProfile = {
  experience: Difficulty,
  daysPerWeek: 1..7,
  equipment: Equipment[],
  goal: "strength" | "hypertrophy" | "endurance" | "weightLoss" | "general",
  splitPreference: "fullBody" | "upperLower" | "pushPullLegs",
  limitations: string[],            // feeds yoga contraindication filtering too
  yogaGoal: "flexibility" | "stress" | "strength" | "balance",
  yogaLevel: Difficulty,
}
```

---

## 5. Core engines (pure, tested)

### 5.1 Calorie engine — one source of truth (`core/activity/calories.ts`)

```ts
// MET formula: kcal = MET × weightKg × hours
metCalories(metValue: number, weightKg: number, minutes: number): number
```

Used by **both** exercise volume and yoga duration totals. Weight comes from the
user profile (passed in — core stays pure). This is the single place calories-
burned is computed; nothing else duplicates it. Leaves the future "eat-back"
hook trivial: dashboard can later add `selectTodayActivity().estimatedKcal` to
the calorie target in one place.

### 5.2 Routine engine (`core/exercise/routine-engine.ts`)

`generateRoutine(fitness: FitnessProfile, exercises: Exercise[]) → WorkoutRoutine`

- Deterministic (like `autoGeneratePlan`): same inputs → same output (testable).
- Picks a split from `splitPreference` × `daysPerWeek` (e.g. PPL for 6 days,
  upper/lower for 4, full-body for 2–3).
- Filters the catalog by available `equipment` and `difficulty ≤ experience`
  (reuses `exercise/filters.ts` — no duplicated selection logic).
- Balances each day across the day's `BodyRegion`/muscle groups; respects
  `limitations` (excludes flagged movements).
- Sets/reps presets keyed by `goal` (strength 5×5, hypertrophy 3×10, endurance
  2×15, etc.) held in a small data table (OCP).

### 5.3 Sequence engine (`core/yoga/sequence-engine.ts`)

`generateSequence(yoga: FitnessProfile, asanas: Asana[]) → YogaSequence`

- Builds a flow ordered by safe progression: warm-up → standing → peak (by
  `focus`) → cool-down → restorative/pranayama.
- Filters by `yogaLevel` and removes asanas whose `contraindications` intersect
  `limitations` (reuses `yoga/filters.ts`).
- Targets a duration band derived from level; deterministic and unit-tested.

### 5.4 Totals (`exercise/volume.ts`, `yoga/duration.ts`)

Mirror `core/totals.ts`: pure functions returning session/day summaries (total
sets, reps, tonnage, total minutes, and `estimatedKcal` via the shared engine).

---

## 6. Store integration (`src/store/useAppStore.ts`)

New persisted user data (reference data — `exercises.default`, `asanas.default`,
`met` — is **loaded, not persisted**, exactly like foods/recipes/rda):

```
customExercises[]    exerciseOverrides{}     // mirror customFoods/foodOverrides
customAsanas[]       asanaOverrides{}
workoutRoutines[]    yogaSequences[]
activityLog[]        // unified ActivityLogEntry history (exercise + yoga)
profile.fitness?     // optional FitnessProfile (added to existing profile object)
```

**Persisted-state 5-places rule (mandatory — see ARCHITECTURE.md §2):** every new
field above must be wired in all five:

1. store **state** + actions (`addWorkoutLog`, `logYogaSession`, `generateAndSaveRoutine`, `upsertCustomExercise`, …)
2. **`partialize`** (persist the user data)
3. **`BackupSchema`** in `core/schema.ts`
4. **`exportBackup` / `importBackup`**
5. **`resetUserData`**

New selectors (loose-coupling seam): `selectAllExercises`, `selectExercisesById`,
`selectAllAsanas`, `selectActiveRoutine`, **`selectTodayActivity`** (aggregates
today's `activityLog` into `{ sessions, totalMin, estimatedKcal }` — the only
thing the dashboard depends on).

---

## 7. UI / UX integration (smooth, consistent experience)

Goal: feel native to Nourish — same shadcn-style primitives
(`src/components/ui.tsx`), same card/grid/badge language as foods & recipes, same
light/dark theming, responsive sidebar→topbar.

### 7.1 Navigation (`src/components/Layout.tsx` + `src/App.tsx`)

Add two **separate** sidebar sections with distinct icons:

```
Dashboard · Planner · Foods · Recipes · 🏋 Exercise · 🧘 Yoga · Data
```

Routes (added to `App.tsx`):

```
/exercise            ExerciseLibrary
/exercise/:id        ExerciseDetail
/exercise/plan       WorkoutPlan          (generate / edit routine)
/exercise/log        WorkoutLogView       (log session + history)
/yoga                AsanaLibrary
/yoga/:id            AsanaDetail
/yoga/sequence       SequenceBuilder
/yoga/log            YogaLogView
```

### 7.2 Onboarding (`features/onboarding/Onboarding.tsx`)

Add an **optional 4th step** — "Activity & fitness" — collecting `FitnessProfile`.
Skippable so nutrition-only users are unaffected (`fitness` is optional). If
skipped, libraries still work; plan generation prompts the user to fill it in.

### 7.3 Dashboard (`features/dashboard/Dashboard.tsx`)

Add an **Activity summary card** (the reusable `ActivitySummary.tsx`) showing
today's **calories burned beside calories consumed** (side-by-side, per the
decision) plus sessions/minutes. Reads only `selectTodayActivity` — no coupling
to exercise/yoga internals. A small comment/flag marks where eat-back target
adjustment would later plug in.

### 7.4 Exercise & Yoga screens (parallel structure, distinct identity)

- **Library** — searchable grid filtered by muscle group / equipment / difficulty
  (exercise) or family / focus / level (yoga). Reuses the FoodDatabase visual
  pattern; each card shows MET/est-kcal and a Verified✓ badge from evidences.
- **Detail** — instructions/steps, target muscles or benefits +
  contraindications, evidence list, "Add to plan/sequence".
- **Editor** — add/override custom items, mirroring `FoodEditor` (override
  defaults; ≥3 evidences → verified). 
- **Plan / Sequence** — one click "Generate from my profile" → editable routine /
  flow; manual add/remove; shows volume/duration + estimated burn.
- **Log** — log a completed session (auto-fills estimated kcal via the shared
  engine), with a simple history list.

Yoga keeps a calmer visual treatment (Sanskrit + English names, breath/focus
tags) to reinforce that it is **different from** exercise, while sharing layout
scaffolding for consistency.

---

## 8. Seed data & integrity

- `exercises.default.json` — initial curated set spanning **all regions**: upper
  (chest/back/shoulders/arms), lower (quads/hamstrings/glutes/calves), core, and
  cardio/full-body. Each exercise carries **≥3 evidences** from authoritative
  sources (ACSM, Compendium of Physical Activities for MET, exercise-science
  references).
- `asanas.default.json` — asanas across **all families** (standing, seated,
  forward bends, backbends, twists, balance, inversions, arm balances,
  restorative, pranayama). Each with ≥3 evidences.
- `met.reference.json` — MET values keyed by activity (2011 Compendium).
- **Integrity tests** (`core/exercise/data.test.ts`, `core/yoga/data.test.ts`)
  mirror `core/data.test.ts`: validate JSON against schemas, enforce ≥3
  evidences, and check every routine/sequence reference resolves to a real id.

---

## 9. Documentation updates (definition of done)

Per CLAUDE.md §2, update in the **same change**:

- `docs/FEATURES.md` — new "Exercise" and "Yoga" feature sections + dashboard
  activity card.
- `docs/CODEBASE.md` — new files in the tree + "I want to… → open this" rows
  (add an exercise, add an asana, change calorie formula, change routine logic,
  add a muscle group / asana family).
- `docs/ARCHITECTURE.md` — note the shared `core/activity` calorie primitive, the
  two new bounded domains, and the extended persisted-state list.
- `README.md` — mention Exercise & Yoga in the feature list.

---

## 10. Implementation phases (incremental, each shippable & green)

Each phase ends with `npm run typecheck && npm test && npm run build` green
(CLAUDE.md §4), plus browser verification for UI phases.

1. **Foundation (shared + schemas).** `core/activity/*`, `core/exercise/schema.ts`,
   `core/yoga/schema.ts`, optional `FitnessProfile` on `UserProfile`. Tests for
   the calorie engine. No UI yet.
2. **Seed data + integrity.** Add the three JSON files (a curated starter set)
   and the data integrity tests. Wire reference-data loading in the store.
3. **Exercise domain.** `filters.ts`, `routine-engine.ts`, `volume.ts` + tests.
   Store: custom/override/routine/log state through the 5 persistence points.
4. **Yoga domain.** `filters.ts`, `sequence-engine.ts`, `duration.ts` + tests +
   store wiring.
5. **Exercise UI.** Library, Detail, Editor, Plan, Log + routes + sidebar.
   Browser-verify.
6. **Yoga UI.** Library, Detail, Editor, Sequence, Log + routes + sidebar.
   Browser-verify.
7. **Cross-cutting UI.** Onboarding step 4, dashboard `ActivitySummary`
   (side-by-side burned vs intake), shared `useActivity` hook.
8. **Docs + final verify.** Update all four docs; full typecheck/test/build +
   export→import backup round-trip test (ensures new persisted fields survive).

---

## 11. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Calorie estimates perceived as exact | Label as "estimated"; v1 keeps them side-by-side, not feeding targets. |
| Profile schema change breaks existing localStorage | `fitness` is `.optional()`; backup import tolerates its absence; add a migration-safe parse test. |
| Scope creep (logging → full tracker) | v1 logging is a flat `activityLog`; rich history UI is roadmap. |
| Yoga blurring into "just exercise" | Separate sections, distinct vocabulary/visuals, separate data + engines. |
| Core purity regressions | `core/exercise` & `core/yoga` import nothing from React/store/DOM; reuse the shared calorie engine; lint/test guards. |

---

## 12. Why this is loosely coupled & SOLID (summary)

- Two **independent bounded domains** (`exercise`, `yoga`) that never import each
  other; the only shared code is the tiny `core/activity` calorie primitive.
- Features talk to domains **only through store selectors/actions** — internals
  can change freely (DIP).
- New movement types, equipment, muscle groups, and asana families are added as
  **data**, not code branches (OCP).
- Each engine and schema file has **one responsibility** and its own test (SRP).
- The dashboard depends on **one narrow selector** (`selectTodayActivity`), not
  on exercise/yoga modules — so the calorie integration can deepen later with a
  one-line change, no rewrites.
