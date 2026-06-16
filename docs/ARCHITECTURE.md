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
│  onboarding · dashboard · planner · foods · recipes · data                 │
│  Reads/writes the store; renders pure-core outputs. No business logic here.│
└───────────────┬────────────────────────────────────────────────────────────┘
                │ selectors + actions
┌───────────────▼──────────────── Zustand store (src/store/) ────────────────┐
│  reference data (defaultFoods, defaultRecipes, rda) — loaded, not persisted │
│  user data (profile, customFoods, foodOverrides, customRecipes, plans)      │
│  persisted to localStorage; export/import as a Zod-validated Backup         │
└───────────────┬────────────────────────────────────────────────────────────┘
                │ calls pure functions
┌───────────────▼──────────────── Nutrition core (src/core/) ────────────────┐
│  schema (Zod types) · nutrition-engine · planner · filters · totals · recipes│
│  Pure, deterministic, unit-tested. No React, no DOM, no fetch.              │
└───────────────┬────────────────────────────────────────────────────────────┘
                │ reads
┌───────────────▼──────────────── Seed data (public/data/) ──────────────────┐
│  foods.default.json · recipes.default.json · rda.icmr-nin-2020.json         │
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

## Data flow examples

- **Onboarding → targets:** form → `UserProfileSchema` validate → store
  `profile` → `useTargets()` calls `computeTargets(profile, rda)` → dashboard/
  planner render rings + `NutrientTable`.
- **Auto-generate plan:** `autoGeneratePlan(profile, calories, foods)` (filters
  internally) → `Plan` → `planTotals` vs targets → UI.
- **Add recipe to plan:** `addRecipeToPlan(recipe, meal)` scales ingredients to
  one serving and appends to today's `Plan` in the store.

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
2. Any new persisted state must be added to the store's `partialize`, the
   `Backup` schema, `exportBackup`, `importBackup`, and `resetUserData`.
3. New nutrients must be added to `NUTRIENT_KEYS`/`NUTRIENT_META` and the grouped
   schemas — they then flow through totals, targets and the editor automatically.
