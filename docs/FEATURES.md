# Features — Nourish

What the app does for the user, and where each feature lives in code. Pair with
[ARCHITECTURE.md](ARCHITECTURE.md) and [CODEBASE.md](CODEBASE.md).

## 1. Onboarding & personalized targets

A 4-step wizard collects age, sex, height, weight, work type, activity level,
goal, diet type and exclusions → `UserProfile`. An **optional 4th step**
("Fitness") captures a `FitnessProfile` (experience, days/week, equipment, goal,
split, yoga goal/level, injuries) used by the Exercise and Yoga features.
Code: `features/onboarding/Onboarding.tsx`, `features/shared/FitnessForm.tsx`,
`core/nutrition-engine.ts`, `core/fitness.ts`.

**Formulas (`nutrition-engine.ts`):**
- **BMR** — Mifflin-St Jeor: male `10·kg + 6.25·cm − 5·age + 5`; female `… − 161`.
- **TDEE** = BMR × activity factor (`sedentary 1.2 · light 1.375 · moderate 1.55
  · active 1.725 · veryActive 1.9`). Work type maps to a default activity level.
- **Calorie goal** = TDEE × goal factor (`lose 0.82 · maintain 1.0 · gain 1.12`).
- **Macros** — % split (default 25/30/45 P/F/C) with a protein floor of 0.83–1.6
  g/kg by activity; fiber 14 g/1000 kcal; sugar cap 10% energy.
- **Micros** — looked up from `rda.icmr-nin-2020.json` by sex+age; missing values
  fall back to USDA DRI (`MICRO_FALLBACK` in `schema.ts`).

## 2. Dashboard

Shows BMR/TDEE/calorie/protein stats, macro **rings** (today vs target), an
**Activity today** card (calories burned, active time and net vs intake — see
§10) and a **micronutrient coverage** bar chart. If today has a saved plan,
rings/chart reflect it; otherwise they show zero against targets.
Code: `features/dashboard/Dashboard.tsx`, `shared/Ring.tsx`,
`shared/NutrientCoverage.tsx`, `shared/useTargets.ts`,
`shared/ActivitySummary.tsx`, `shared/useActivity.ts`.

## 3. Layered planner (3 modes)

One engine, three modes (user picks; stored on `profile.plannerMode`):

1. **Targets only** — `computeTargets()` → rings + full `NutrientTable`.
2. **Meal builder** — add foods to Breakfast/Lunch/Dinner/Snacks; quantities
   editable; live totals vs target recompute via `planTotals`.
3. **Auto-generate** — `autoGeneratePlan()` deterministically fills meals
   (protein/carb/produce buckets, per-meal calorie shares, respecting diet +
   exclusions), producing a normal editable plan.

Each layer reuses the one below; nothing is duplicated.
Code: `features/planner/Planner.tsx`, `planner/FoodPicker.tsx`, `core/planner.ts`,
`core/totals.ts`.

## 4. Food database

Searchable, category- and diet-filterable grid. Each food shows kcal/protein per
reference quantity, diet tags, a **Verified ✓ / Needs review / Unverified** badge,
and a "🍲 N recipes" link to its recipe options.
Code: `features/foods/FoodDatabase.tsx`, `core/filters.ts`.

## 5. Food editor & add-food

View/edit any food's **full nutrient panel** (energy, macros, all vitamins &
minerals) and its **evidence sources** (source / reference / value seen / URL).
Editing a default food creates a user **override** (reset to restore default);
new foods are saved as custom. A food with ≥3 evidences is auto-marked verified.
Code: `features/foods/FoodEditor.tsx`.

**Data verification:** every default food carries ≥3 evidences from authoritative
sources (IFCT/ICMR-NIN, USDA FoodData Central, Open Food Facts, INDB),
cross-checked before being marked verified. Enforced by `core/data.test.ts`.

## 6. Recipes

A recipe is a dish built from food items; its nutrition is **computed from
ingredients** (`recipeNutritionPerServing`, reusing the totals engine), shown
per serving and as a share of daily targets.

- Browse/search recipes, filter by diet (excluded ingredients hide the recipe).
- **Per-food options:** each food links to recipes that use it (`?food=<id>`,
  driven by `baseFoodIds` + ingredients via `recipesForFood`).
- **Add to plan:** add one serving's ingredients to a chosen meal in today's plan.
- **Custom recipes:** users add their own (ingredients picked from the food DB,
  steps, servings); `baseFoodIds` is derived so they appear under their foods.

Code: `features/recipes/Recipes.tsx`, `RecipeDetail.tsx`, `RecipeEditor.tsx`,
`core/recipes.ts`. Seed: `public/data/recipes.default.json`.

## 7. Diet filtering & exclusions

`veg ⊇ vegan`; `nonveg` sees everything. Exclusions match id/name/alias/
allergen/category substrings. The same `applyFilters`/`dietAllows` drives the
food list, auto-generate, and recipe filtering.
Code: `core/filters.ts`.

## 8. Local storage & backup

All user data (profile, custom foods, overrides, custom recipes, plans, theme)
persists to `localStorage`. **Export** downloads a Zod-validated JSON backup;
**import** restores it; **reset** wipes user data.
Code: `features/data/DataPage.tsx`, `store/useAppStore.ts`, `lib/download.ts`.

## 9. Theming & responsive

Light/dark mode (CSS variables in `index.css`, `dark` class toggled in
`App.tsx`); responsive sidebar→topbar layout. Mobile-app readiness comes from the
DOM-free `core/`.

## 10. Exercise (separate from Yoga)

A library of exercises covering **every body region** (upper, lower, core, cardio,
full-body) and muscle group, each with a MET value, target muscles, equipment,
difficulty, instructions and **≥3 evidences** (Verified ✓ badge).

- **Library** — search + filter by muscle, region or equipment.
- **Add / edit** — create custom exercises or edit a default (stored as an
  override; defaults stay pristine), mirroring the food editor.
- **Workout plan** — "Generate" builds a **deterministic routine** from the
  `FitnessProfile`: a split (`fullBody` / `upperLower` / `pushPullLegs`) sized to
  days-per-week, filtered to available equipment and difficulty, respecting
  injuries; sets/reps preset by goal.
- **Logging** — log a completed day; calories burned are estimated via the shared
  MET engine and added to today's `activityLog`.

Code: `features/exercise/{ExerciseLibrary,ExerciseEditor,WorkoutPlan}.tsx`,
`core/exercise/{schema,filters,routine-engine,volume}.ts`,
`core/activity/calories.ts`. Seed: `public/data/exercises.default.json`.

## 11. Yoga (separate from Exercise)

A distinct library of asanas spanning **every family** (standing, seated, forward
bends, backbends, twists, balance, inversions, arm balances, restorative,
pranayama, meditation), each with Sanskrit + English names, focus tags, steps,
benefits, **contraindications** and ≥3 evidences.

- **Library** — search + filter by family, focus or level.
- **Add / edit** — custom asanas or overrides of defaults.
- **Sequence builder** — "Generate" builds a **deterministic flow** for the
  user's yoga goal & level, safely ordered (breath → standing → balance → peak →
  seated → meditation → rest) and skipping asanas whose contraindications match
  the user's injuries.
- **Logging** — log a practice; calories estimated per pose via the shared MET
  engine.

Code: `features/yoga/{AsanaLibrary,AsanaEditor,SequenceBuilder}.tsx`,
`core/yoga/{schema,filters,sequence-engine,duration}.ts`,
`core/activity/calories.ts`. Seed: `public/data/asanas.default.json`.

## 12. Activity vs intake (calories burned)

Exercise and yoga logs feed a single `activityLog`. The dashboard's **Activity
today** card shows calories burned, active minutes and the net (food − burn)
**beside** intake. In v1 this is informational only — nutrition targets are
**not** adjusted (a clean hook in `core/activity/calories.ts` +
`summarizeForDate` leaves "eat-back calories" easy to enable later).
Code: `core/activity/{calories,summary}.ts`, `features/shared/ActivitySummary.tsx`,
`features/shared/ActivityHistory.tsx`.

## Not yet built (roadmap)

Activity feeding nutrition targets ("eat-back" calories), multi-day plan & workout
history UI, accounts/cloud sync, barcode scan, the `tools/ingest/` build-time data
pipeline to grow the databases, and the React Native mobile client.
