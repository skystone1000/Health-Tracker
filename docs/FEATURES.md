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

Searchable grid of ~120 foods — Indian staples, dishes, fruits, dry fruits and
cooking ingredients. Each food shows kcal/protein per reference quantity, diet
tags, a **Verified ✓ / Needs review / Unverified** badge, a `dish` badge for
composed preparations, and a "🍲 N recipes" link to its recipe options.

**Filters:** search (matches name, category and **romanised regional aliases** —
"bhopla" and "kaddu" both find the pumpkin sabji), category, meal type, region,
and "respect my diet".

**Group by (toggle):** a `Group by` select switches the flat grid into collapsible
sections — by **Category, Meal type, Region, Preparation, Type (ingredient/dish)
or Diet**. Sections carry a count badge, follow the schema's enum order rather
than alphabetical, and put facet-less foods in an "Unclassified" group sorted
last. Multi-valued facets (meal type, diet) list a food under every group it
belongs to. `No grouping` restores the plain grid. The choice is remembered in
`localStorage` (a UI preference — deliberately *not* in the store or the backup).

Foods carry four optional facets: `mealTypes`, `region`, `prep`, `itemType`.
Regional names live in `aliases` as plain ASCII, so no extra fonts are needed.
Code: `features/foods/FoodDatabase.tsx`, `core/grouping.ts`, `core/filters.ts`.

## 5. Food editor & add-food

View/edit any food's **full nutrient panel** (energy, macros, all vitamins &
minerals) and its **evidence sources** (source / reference / value seen / URL).
Editing a default food creates a user **override** (reset to restore default);
new foods are saved as custom. A food with ≥3 evidences is auto-marked verified.
Code: `features/foods/FoodEditor.tsx`.

**Data verification:** a `verified` food carries **≥3** evidences from
authoritative sources (IFCT/ICMR-NIN, USDA FoodData Central, Open Food Facts,
INDB, Nutritionix); a `needsReview` one carries **≥2**. The lower tier exists so
thinly-sourced regional dishes can ship honestly badged "⚠ Needs review" instead
of carrying an invented third citation. Every evidence must link to **the item**
(a record page or an item-specific search) — bare homepages are rejected.
A read-only **Sources** block in the food detail renders them as links.
Enforced by `core/data.test.ts`. See [ADD_FOOD.md](ADD_FOOD.md).

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
- **References:** every recipe cites where its **method** and its **nutrition
  basis** come from (`references[]`, rendered as links in the detail view and
  editable in the recipe editor).
- **Dishes exist twice** — as a `FoodItem` with its own measured panel *and* as a
  recipe, linked by a shared `id`. `yieldGrams` (cooked weight of the whole
  recipe) lets `data.test.ts` check the two agree within ±25 %; without it,
  water-absorbing dishes like khichdi could not be compared at all.
  ~43 recipes ship by default, covering Indian breakfasts (upma, idli, dosa,
  poha, thepla), sabjis, dals, khichdis, South Indian staples (sambar, rasam,
  curd rice, pongal) and sweets.

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

A detailed library of ~40 asanas spanning **every family** (standing, seated,
reclining, kneeling, squatting, forward bends, backbends, twists, lateral bends,
balance, inversions, arm balances, restorative, pranayama, meditation), each with
Sanskrit + English names, **styles/traditions** it belongs to, **tags**, steps,
**benefits (pros)**, **cautions (cons)**, **who-should-avoid (contraindications)**,
**counter / viparit poses**, and ≥3 evidences.

- **Library** — search + filter by family, focus, level, **style** (Hatha,
  Vinyasa, Ashtanga, Iyengar, Yin, Restorative, Power, Kundalini, Sivananda) or
  **tag**. Cross-linked from the Learn page (`/yoga?style=…`).
- **Detail / edit** — shows pros, cons, who-should-avoid (with a not-medical-
  advice disclaimer) and clickable **counter poses**; the editor edits styles,
  tags, cons and a counter-pose picker with a "Suggest" button
  (`suggestCounters`). Custom asanas or overrides of defaults.
- **Sequence builder** — "Generate" builds a **deterministic flow** for the
  user's yoga goal & level, safely ordered (breath → standing → peak → seated →
  rest), skipping contraindicated asanas, **biased by a chosen style** (Yin holds
  longer, Power shorter) and **auto-inserting a gentle counter-pose after deep
  backbends** using each asana's `counterAsanaIds`.
- **Logging** — log a practice; calories estimated per pose via the shared MET
  engine.

Each card and the detail modal show a contained, full-body pose **illustration**
(`AsanaImage`, convention path `public/images/asanas/<id>.webp`, 🧘 fallback until
populated — see [`docs/plan_4_yoga_images.md`](plan_4_yoga_images.md)).

Code: `features/yoga/{AsanaLibrary,AsanaEditor,SequenceBuilder,YogaLearn,AsanaImage}.tsx`,
`core/yoga/{schema,filters,sequence-engine,duration,counterpose,styles,theory}.ts`,
`core/activity/calories.ts`, `lib/images.ts`. Seed: `public/data/asanas.default.json`.

### 11a. Learn yoga (theory & education)

A `/yoga/learn` knowledge base explaining yoga theory in plain language: what
yoga is, history & origins, the four classical paths (Karma/Bhakti/Raja/Jnana),
Patanjali's eight limbs, Hatha, pranayama, the three gunas, the chakras, modern
styles & how to choose, and a glossary — each section **cited** and content-
integrity tested. Note: Patanjali's "Ashtanga" (eight limbs) is philosophy,
modelled as reference content, distinct from the Ashtanga *Vinyasa* style.
Code: `features/yoga/YogaLearn.tsx`, `core/yoga/{theory,styles}.ts`.

## 12. Activity vs intake (calories burned)

Exercise and yoga logs feed a single `activityLog`. The dashboard's **Activity
today** card shows calories burned, active minutes and the net (food − burn)
**beside** intake. In v1 this is informational only — nutrition targets are
**not** adjusted (a clean hook in `core/activity/calories.ts` +
`summarizeForDate` leaves "eat-back calories" easy to enable later).
Code: `core/activity/{calories,summary}.ts`, `features/shared/ActivitySummary.tsx`,
`features/shared/ActivityHistory.tsx`.

## 13. Medicine inventory

A curated reference library of common medicines across three systems —
**allopathy** (popular OTC tablets), **homeopathy** (mother tinctures, dilutions,
potencies) and **biochemic** (the Schuessler tissue salts + combinations) — plus
a personal **"My cabinet"** layer marking what the user owns, with quantity and
expiry.

- **Library** — searchable grid; filter by **system**, a **system-scoped
  category**, and an **"In my cabinet"** toggle. Verified/owned badges. Detail
  view shows common uses, cautions, who-should-avoid, sources, and a prominent
  **not-medical-advice disclaimer**.
- **Add / edit** — create custom medicines or edit a default (stored as an
  override; defaults stay pristine), mirroring the food/exercise editors. The
  same editor captures the stock fields (owned / quantity / unit / expiry).
- **My cabinet** — owned medicines grouped into **Expired / Expiring soon (≤30
  days) / Low stock / OK**, computed by pure `core/medicine/stock.ts`.

Informational only: no recommender, no dose calculator, no interaction checker,
and no effect on nutrition targets or the activity log. Dose reminders/scheduling
are roadmap.

Code: `features/medicine/{MedicineLibrary,MedicineDetail,MedicineEditor,MyCabinet}.tsx`,
`core/medicine/{schema,filters,stock}.ts`, `lib/medicine.ts`.
Seed: `public/data/medicines.default.json`.

## Not yet built (roadmap)

Activity feeding nutrition targets ("eat-back" calories), multi-day plan & workout
history UI, accounts/cloud sync, barcode scan, the `tools/ingest/` build-time data
pipeline to grow the databases, and the React Native mobile client.
