# Codebase map — Nourish

File-by-file guide. Use this to find **exactly which file to open** for a task,
so you don't have to grep the whole tree. Pair with
[ARCHITECTURE.md](ARCHITECTURE.md) (the why) and [FEATURES.md](FEATURES.md).

## Directory tree

```
public/data/                 Seed JSON (validated on load)
  foods.default.json         ~129 curated foods, full nutrient panel + evidences
  recipes.default.json       ~43 recipes referencing food ids (+ references, yieldGrams)
  rda.icmr-nin-2020.json     Micronutrient RDA by sex + age bracket
  exercises.default.json     Curated exercises (all regions/muscles) + ≥3 evidences
  asanas.default.json        Curated asanas (all families) + ≥3 evidences
  medicines.default.json     Curated allopathy/homeo/biochemic medicines + >=2 evidences

src/core/                    PURE logic (no React/DOM) — every file has a test
  date.ts                    toISODate/todayISO/addDays/startOfWeek/dayLabel (LOCAL time, never UTC)
  random.ts                  mulberry32/hashSeed/shuffle/pickWeighted (seeded, pure)
  food-groups.ts             PlateGroup taxonomy, ICMR daily quotas, portion bounds, quantityForKcal
  day-planner.ts             meal templates + slot selection + balanceDay -> one balanced day
  week-planner.ts            generateWeekPlan / regenerateDayInWeek / scoreWeek (Layer 4)
  schema.ts                  Zod schemas + inferred types; NUTRIENT_KEYS/META; MICRO_FALLBACK;
                             FOOD_CATEGORIES / MEAL_TYPES / FOOD_REGIONS / PREP_STYLES / ITEM_TYPES; Reference
  grouping.ts                groupFoods() — pure facet grouping for the food list
  nutrition-engine.ts        BMR, TDEE, calorie goal, macro & micro targets
  planner.ts                 createEmptyPlan + autoGeneratePlan (Layers 1-3)
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
  medicine/                  PURE medicine domain
    schema.ts                Medicine, MedicineSystem, categories (system-scoped), forms, StockUnit, MedicineStockEntry
    filters.ts               search + system/category/owned filters (applyMedicineFilters)
    stock.ts                 pure derived views: expiringSoon / expired / lowStock / cabinetSummary
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
  medicine.ts                SYSTEM/CATEGORY/FORM/UNIT display labels

src/components/
  ui.tsx                     Button, Card, Input, Label, Select, Badge, Progress, Modal, Tabs
  Layout.tsx                 Sidebar nav + theme toggle + <Outlet/>

src/features/
  onboarding/Onboarding.tsx  3-step profile wizard
  dashboard/Dashboard.tsx    Stats, macro rings, micronutrient coverage chart
  planner/Planner.tsx        Mode tabs + meal builder + live totals
  planner/FoodPicker.tsx     Modal to add a food to a meal
  planner/WeekPlanner.tsx    7-day grid: generate/regenerate, week score, week nav
  planner/DayCard.tsx        One day: meals, per-day badges, lock & shuffle
  planner/usePlannerLocks.ts localStorage-backed locked dates (UI pref)
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
  medicine/MedicineLibrary.tsx  Searchable/filterable medicine grid + owned toggle
  medicine/MedicineDetail.tsx   Read-only detail + not-medical-advice disclaimer
  medicine/MedicineEditor.tsx   Add custom / edit-as-override + stock (owned/qty/expiry)
  medicine/MyCabinet.tsx        Owned medicines grouped by expiry/stock status
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
| Add a food or dish (full guide) | [`ADD_FOOD.md`](ADD_FOOD.md) — data shape, enums, diet tags, sourcing rules, verify |
| Add/edit a default food | `public/data/foods.default.json` (≥3 evidences verified / ≥2 needsReview) |
| Add a default recipe | `public/data/recipes.default.json` (ingredient `foodId`s must exist; needs ≥1 reference) |
| Add a food category / meal type / region / prep style | `src/core/schema.ts` (`FOOD_CATEGORIES`, `MEAL_TYPES`, `FOOD_REGIONS`, `PREP_STYLES`) — grouping & filters follow |
| Change how the food list groups | `src/core/grouping.ts` `groupFoods` (+ `GROUP_KEYS` / `GROUP_LABELS`) |
| Stop a category being auto-planned | `src/core/planner.ts` `NON_PLANNABLE_CATEGORIES` |
| Add a reference link to a recipe | `public/data/recipes.default.json` `references[]`; rendered by `RecipeDetail.tsx` |
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
| Change auto-generate logic (one day) | `src/core/planner.ts` `autoGeneratePlan` |
| Change weekly generation / variety caps | `src/core/week-planner.ts`, `src/core/day-planner.ts` (`WEEKLY_REPEAT_CAP`) |
| Change what a meal is made of | `src/core/day-planner.ts` `DEFAULT_MEAL_TEMPLATES` |
| Change food-group quotas (ICMR plate) | `src/core/food-groups.ts` `PLATE_QUOTA_2000` / `dailyQuotas` |
| Change sane portion sizes | `src/core/food-groups.ts` `PORTION_BOUNDS` / `DISH_BOUNDS` |
| Change the calorie/protein bands | `src/core/day-planner.ts` `KCAL_BAND` / `PROTEIN_FLOOR` |
| Change how a week is scored | `src/core/week-planner.ts` `scoreWeek` |
| Map a new food category to a plate group | `src/core/food-groups.ts` `CATEGORY_TO_PLATE_GROUP` |
| Work with dates (plan ids, week starts) | `src/core/date.ts` — never `toISOString()`, it is UTC |
| Change routine generation | `src/core/exercise/routine-engine.ts` `generateRoutine` |
| Change yoga sequencing | `src/core/yoga/sequence-engine.ts` `generateSequence` |
| Change calories-burned math | `src/core/activity/calories.ts` `metCalories` (single source) |
| Add a persisted field | `src/store/useAppStore.ts` (state, partialize, export/import, resetUserData) + `src/core/backup.ts` `BackupSchema` |
| Add a page/route | `src/App.tsx` + `src/components/Layout.tsx` (nav) + `src/features/<name>/` |
| Tweak a UI primitive | `src/components/ui.tsx` |
| Add/edit a default medicine | `public/data/medicines.default.json` (>=2 evidences; `core/medicine/data.test.ts`) |
| Change medicine filtering | `src/core/medicine/filters.ts` `applyMedicineFilters` |
| Change expiry / low-stock / cabinet grouping | `src/core/medicine/stock.ts` |
| Add a medicine category/system/form | `src/core/medicine/schema.ts` (enums) + labels in `src/lib/medicine.ts` |
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
