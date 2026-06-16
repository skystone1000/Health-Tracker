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

src/core/                    PURE logic (no React/DOM) — every file has a test
  schema.ts                  Zod schemas + inferred types; NUTRIENT_KEYS/META; MICRO_FALLBACK
  nutrition-engine.ts        BMR, TDEE, calorie goal, macro & micro targets
  planner.ts                 createEmptyPlan + autoGeneratePlan (3 layers)
  filters.ts                 dietAllows / matchesDiet / isExcluded / applyFilters
  totals.ts                  toVector, vectorToNutrients, nutrientsForQuantity, sums, progress
  recipes.ts                 recipeNutritionPerServing, filterRecipes, recipesForFood
  test-fixtures.ts           makeFood / makeNutrients helpers for tests
  *.test.ts                  Vitest specs (incl. data.test.ts integrity checks)

src/store/
  useAppStore.ts             Zustand store + persistence + export/import;
                             selectors: selectAllFoods, selectFoodsById, selectAllRecipes

src/lib/
  utils.ts                   cn(), round(), clamp()
  format.ts                  fmt(), fmtNutrient(), pct(), progressTone()
  profile.ts                 defaultProfile(), WORK_TO_ACTIVITY, labels
  download.ts                downloadJson(), readJsonFile()

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
  data/DataPage.tsx          Export / import / reset
  shared/useTargets.ts       Memoised computeTargets() hook
  shared/Ring.tsx            SVG circular progress
  shared/NutrientTable.tsx   Grouped value/target/% table with bars
  shared/NutrientCoverage.tsx Recharts micronutrient bar chart

src/App.tsx                  Routes + data init + theme application
src/main.tsx                 React root + BrowserRouter
```

## "I want to… → open this"

| Task | Files |
|---|---|
| Add/edit a default food | `public/data/foods.default.json` (≥3 evidences; `data.test.ts` enforces) |
| Add a default recipe | `public/data/recipes.default.json` (ingredient `foodId`s must exist) |
| Change a nutrient formula (BMR/TDEE/macros) | `src/core/nutrition-engine.ts` (+ its test) |
| Change RDA values | `public/data/rda.icmr-nin-2020.json` |
| Add a new nutrient | `src/core/schema.ts` (`*_KEYS`, `NUTRIENT_META`, `MICRO_FALLBACK`) — flows everywhere |
| Change diet/exclusion rules | `src/core/filters.ts` (single source of truth) |
| Change auto-generate logic | `src/core/planner.ts` `autoGeneratePlan` |
| Add a persisted field | `src/store/useAppStore.ts` (state, partialize, backup) + `schema.ts` `BackupSchema` |
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
