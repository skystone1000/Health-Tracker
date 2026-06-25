# Codebase map — Nourish

File-by-file guide. Use this to find **exactly which file to open** for a task,
so you don't have to grep the whole tree. Pair with
[ARCHITECTURE.md](ARCHITECTURE.md) (the why) and [FEATURES.md](FEATURES.md).

## Directory tree

```
public/data/                 Seed JSON (validated on load)
  foods.default.json         24 curated foods, full nutrient panel + ≥3 evidences
  recipes.default.json       12 recipes referencing food ids
  rda.icmr-nin-2020.json     Micronutrient RDA by sex + age bracket
  exercises.default.json     Curated exercises (all regions/muscles) + ≥3 evidences
  asanas.default.json        Curated asanas (all families) + ≥3 evidences

src/core/                    PURE logic (no React/DOM) — every file has a test
  schema.ts                  Zod schemas + inferred types; NUTRIENT_KEYS/META; MICRO_FALLBACK
  nutrition-engine.ts        BMR, TDEE, calorie goal, macro & micro targets
  planner.ts                 createEmptyPlan + autoGeneratePlan (3 layers)
  filters.ts                 dietAllows / matchesDiet / isExcluded / applyFilters
  totals.ts                  toVector, vectorToNutrients, nutrientsForQuantity, sums, progress
  recipes.ts                 recipeNutritionPerServing, filterRecipes, recipesForFood
  fitness.ts                 FitnessProfileSchema + defaultFitnessProfile (movement prefs)
  backup.ts                  BackupSchema — aggregates ALL persisted slices (export/import)
  test-fixtures.ts           makeFood / makeNutrients helpers for tests
  activity/                  SHARED movement primitive (used by exercise + yoga)
    schema.ts                Difficulty, DIFFICULTY_RANK, ActivityLogEntry, BurnsCalories
    calories.ts              metCalories() — single source of truth for kcal burned
    summary.ts               entriesForDate, summarizeActivity
  exercise/                  PURE exercise domain
    schema.ts                Exercise, MuscleGroup, BodyRegion, Equipment, WorkoutRoutine…
    filters.ts               difficulty/equipment/limitation filters + applyExerciseFilters
    routine-engine.ts        generateRoutine(fitness, exercises) — deterministic split
    volume.ts                dayVolume + dayEstimatedKcal
  yoga/                      PURE yoga domain
    schema.ts                Asana (styles/tags/cons/counterAsanaIds), AsanaFamily, YogaStyle, Sequence
    filters.ts               family/focus/level/style/tag filters + applyAsanaFilters
    sequence-engine.ts       generateSequence(fitness, asanas, style?) — style-biased, counter-aware
    duration.ts              sequenceTotals + sequenceEstimatedKcal
    counterpose.ts           OPPOSING_FAMILIES, isReasonableCounter, suggestCounters (viparit)
    styles.ts                YOGA_STYLE_INFO + EIGHT_LIMBS (traditions / Patanjali reference)
    theory.ts                YOGA_THEORY — the cited "Learn yoga" curriculum
  *.test.ts                  Vitest specs (incl. data.test.ts integrity checks per domain)

src/store/
  useAppStore.ts             Zustand store + persistence + export/import;
                             selectors: selectAllFoods, selectFoodsById, selectAllRecipes

src/lib/
  utils.ts                   cn(), round(), clamp()
  format.ts                  fmt(), fmtNutrient(), pct(), progressTone()
  profile.ts                 defaultProfile(), WORK_TO_ACTIVITY, labels
  download.ts                downloadJson(), readJsonFile()
  images.ts                  asanaImageUrl(id) — convention-based public image paths

src/components/
  ui.tsx                     Button, Card, Input, Label, Select, Badge, Progress, Modal, Tabs
  Layout.tsx                 Sidebar nav + theme toggle + <Outlet/>

src/features/
  onboarding/Onboarding.tsx  3-step profile wizard
  dashboard/Dashboard.tsx    Stats, macro rings, micronutrient coverage chart
  planner/Planner.tsx        Mode tabs + meal builder + live totals
  planner/FoodPicker.tsx     Modal to add a food to a meal
  foods/FoodDatabase.tsx     Searchable/filterable food grid
  foods/FoodEditor.tsx       Full nutrient-panel + evidences editor / add-food
  recipes/Recipes.tsx        Recipe grid + ?food= filter
  recipes/RecipeDetail.tsx   Ingredients, method, per-serving nutrition, add-to-plan
  recipes/RecipeEditor.tsx   Create/edit custom recipes
  exercise/ExerciseLibrary.tsx Searchable/filterable exercise grid
  exercise/ExerciseEditor.tsx  View / edit / add an exercise (override or custom)
  exercise/WorkoutPlan.tsx     Generate + view routine, log a session
  yoga/AsanaLibrary.tsx      Asana grid; filter by family/focus/level/style/tag
  yoga/AsanaEditor.tsx       Detail+edit: pros/cons/avoid/counter, styles, tags, counter picker
  yoga/SequenceBuilder.tsx   Generate + view a flow (style-biased), log a practice
  yoga/YogaLearn.tsx         /yoga/learn — theory & education knowledge base
  yoga/AsanaImage.tsx        Asana illustration with 🧘 fallback (convention-based path)
  data/DataPage.tsx          Export / import / reset
  shared/useTargets.ts       Memoised computeTargets() hook
  shared/useActivity.ts      Memoised today's-activity summary/entries hooks
  shared/Ring.tsx            SVG circular progress
  shared/NutrientTable.tsx   Grouped value/target/% table with bars
  shared/NutrientCoverage.tsx Recharts micronutrient bar chart
  shared/ActivitySummary.tsx Burned-vs-intake card (dashboard + logs)
  shared/ActivityHistory.tsx Today's logged sessions (per kind) with delete
  shared/FitnessForm.tsx     Reusable FitnessProfile editor (onboarding + plans)

src/App.tsx                  Routes + data init + theme application
src/main.tsx                 React root + BrowserRouter
```

## "I want to… → open this"

| Task | Files |
|---|---|
| Add/edit a default food | `public/data/foods.default.json` (≥3 evidences; `data.test.ts` enforces) |
| Add a default recipe | `public/data/recipes.default.json` (ingredient `foodId`s must exist) |
| Add a new asana (full guide) | [`ADD_YOGA_ASANA.md`](ADD_YOGA_ASANA.md) — data shape, enums, rules, image, verify |
| Add a new exercise (full guide) | [`ADD_EXERCISE.md`](ADD_EXERCISE.md) — data shape, enums, rules, verify |
| Add/edit a default exercise | `public/data/exercises.default.json` (≥3 evidences; `exercise/data.test.ts`) |
| Add/edit a default asana | `public/data/asanas.default.json` (≥3 evidences; `yoga/data.test.ts`) |
| Generate/populate asana images | [`docs/plan_4_yoga_images.md`](plan_4_yoga_images.md) → `public/images/asanas/<id>.webp` |
| Change a nutrient formula (BMR/TDEE/macros) | `src/core/nutrition-engine.ts` (+ its test) |
| Change RDA values | `public/data/rda.icmr-nin-2020.json` |
| Add a new nutrient | `src/core/schema.ts` (`*_KEYS`, `NUTRIENT_META`, `MICRO_FALLBACK`) — flows everywhere |
| Add a muscle group / asana family | `src/core/exercise/schema.ts` `MUSCLE_GROUPS` / `src/core/yoga/schema.ts` `ASANA_FAMILIES` (+ labels in `lib/activity.ts`) |
| Add a yoga style / tag | `src/core/yoga/schema.ts` `YOGA_STYLES` / `src/lib/activity.ts` `KNOWN_TAGS` (+ `STYLE_LABELS`) |
| Set a pose's counter (viparit) | `public/data/asanas.default.json` `counterAsanaIds` (must reference real ids; `yoga/data.test.ts` checks) |
| Edit yoga theory / Learn page | `src/core/yoga/theory.ts` (sections) + `src/core/yoga/styles.ts` (styles & eight limbs) |
| Change counter-pose suggestion logic | `src/core/yoga/counterpose.ts` `OPPOSING_FAMILIES` / `suggestCounters` |
| Change yoga sequencing | `src/core/yoga/sequence-engine.ts` `generateSequence` (style bias, counter insertion) |
| Change diet/exclusion rules | `src/core/filters.ts` (single source of truth) |
| Change auto-generate logic | `src/core/planner.ts` `autoGeneratePlan` |
| Change routine generation | `src/core/exercise/routine-engine.ts` `generateRoutine` |
| Change yoga sequencing | `src/core/yoga/sequence-engine.ts` `generateSequence` |
| Change calories-burned math | `src/core/activity/calories.ts` `metCalories` (single source) |
| Add a persisted field | `src/store/useAppStore.ts` (state, partialize, export/import, resetUserData) + `src/core/backup.ts` `BackupSchema` |
| Add a page/route | `src/App.tsx` + `src/components/Layout.tsx` (nav) + `src/features/<name>/` |
| Tweak a UI primitive | `src/components/ui.tsx` |
| Adjust theme colors | `src/index.css` (CSS variables) + `tailwind.config.js` |

## Conventions

- Imports use the `@/` alias for `src/` (e.g. `@/core/schema`).
- Nutrients have two shapes: **grouped** (`Nutrients`, in JSON/editor) and **flat
  vector** (`NutrientVector`, for math). Convert with `toVector` /
  `vectorToNutrients` in `totals.ts`.
- Foods/recipes carry `source: "default" | "user"`. Editing a default food stores
  an **override** (defaults stay pristine); custom items live in `customFoods` /
  `customRecipes`.
- Every change to `core/` should come with or update a `*.test.ts`. Run
  `npm test` and `npm run typecheck` before considering work done.
