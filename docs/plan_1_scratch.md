# Nourish — Personalized Health & Diet Tracker — Plan 1

## Context

A **web application (with a future mobile app)** that builds a *complete, personalized diet plan* for a person based on their age, weight, height, sex, and lifestyle/work-activity level. The app must:

- Compute personalized nutrient **targets** and recommend a plan the user can **freely edit**.
- Track the **full nutrient panel** per food item — all macronutrients, vitamins, and minerals.
- Let users filter by **Veg / Non-Veg / Vegan** and **exclude** specific items.
- Show **nutritional content per food item**, fully **editable**, with each item's data **verified against ≥3 authoritative sources** and those **evidences shown in the UI**.
- Let users **add new food items**.
- Store everything as **JSON** — bundled default data + user-generated JSON.

This document defines the architecture, data model, nutrition science, data-sourcing/verification methodology, the layered planner, the UI approach, and a phased build plan.

### Decisions locked
| Decision | Choice |
|---|---|
| Frontend framework | **React + Vite + Tailwind CSS** (full comparison retained below) |
| Planner depth | **Layered**: one shared engine powering 3 modes — *Targets only* → *Targets + Meal Builder* → *Auto-generate full-day plan*. User picks the mode. |
| Food data focus | **Indian-first, then global** (IFCT/ICMR-NIN + INDB seed, USDA/Open Food Facts supplement) |
| App name | **Nourish** |

---

## Goals & Non-Goals

**v1 Goals**
- Onboarding form → personalized calorie/macro/micronutrient **targets**.
- A curated, source-verified **food database** (JSON) with full nutrient panels, diet tags, and evidences.
- Three planner modes sharing one engine; live "intake vs. target" feedback.
- Edit recommended plans, edit any food item's nutrients, add new foods.
- Diet-type filtering + exclusions.
- All data persists locally and is **exportable/importable as JSON**.

**Non-Goals (v1)**
- Accounts / cloud sync / multi-device backend (designed-for, not built).
- Live third-party nutrition API calls at runtime (we **bake verified data into JSON** instead; API ingestion is a build-time/offline tool — see Phase 0).
- Calorie barcode scanning, wearable integration, social features.

---

## Tech Stack & Framework Comparison

**Recommended: React + Vite + TypeScript + Tailwind CSS + shadcn/ui (21st.dev).**
Rationale: 21st.dev and the connected `magic` MCP generate **React + Tailwind + shadcn/ui** components. To actually *use* 21st.dev components (the stated UI source) without hand-porting, a React stack is the natural fit. Vite gives a zero-config SPA with no server — pairs perfectly with bundled JSON data and a future static deploy.

| Option | Pros | Cons | Fit for *Nourish* |
|---|---|---|---|
| **React + Vite** ✅ | Direct 21st.dev/shadcn + `magic` MCP support; huge ecosystem; SPA needs no backend; easy static hosting; clean path to **React Native/Expo** for the mobile app (share logic/types) | Build step; you manage routing/state choices | **Best** — matches UI source and mobile ambition |
| **Next.js (React)** | Everything React has + routing/SSR/SEO; great if you later add accounts/API routes | Needs a Node runtime; heavier than needed for an offline-first SPA | Strong runner-up; pick if a backend is likely soon |
| **Vanilla HTML/CSS/JS** | Truest to "HTML/CSS/JS"; zero build; ultimate simplicity | **Cannot directly use 21st.dev components** (React-based) — you'd hand-port each; state/templating gets painful at this app's complexity | Conflicts with the 21st.dev requirement |
| **Vue + Tailwind** | Gentle learning curve; great DX; Tailwind works | Weaker shadcn/21st.dev fit; `magic` MCP targets React | Viable but loses the UI tooling |
| **Angular** | Batteries-included (router, forms, DI); strong for large teams | Heavyweight, steep curve; no 21st.dev fit; overkill for a solo SPA | Not recommended here |
| **Svelte/SvelteKit** | Tiny bundles, elegant, fast | Smallest ecosystem of these; no 21st.dev fit | Not recommended given UI source |

**Final stack**
- **React 18 + Vite + TypeScript**
- **Tailwind CSS + shadcn/ui**, components sourced/generated via **21st.dev / `magic` MCP**
- **State:** Zustand (lightweight) for profile/plan/filter state
- **Validation:** Zod schemas (also the runtime guard for JSON import)
- **Charts:** Recharts (nutrient progress rings/bars)
- **Persistence:** `localStorage` + JSON file export/import (no backend in v1)
- **Routing:** React Router
- **Testing:** Vitest + React Testing Library; Playwright for one e2e smoke flow

---

## Architecture Overview

Offline-first SPA. A pure, framework-agnostic **nutrition core** (no React) wrapped by a thin React UI. This keeps the engine portable to the future mobile app.

```
┌─────────────────────────── React UI (Vite) ───────────────────────────┐
│  Onboarding · Dashboard · Planner (3 modes) · Food DB · Food Editor    │
│  shadcn/ui + Tailwind (21st.dev / magic MCP)                           │
└───────────────┬───────────────────────────────────────────────────────┘
                │ calls (pure functions, no UI)
┌───────────────▼───────────── core/ (TS, no React) ────────────────────┐
│  nutrition-engine: BMR/TDEE, macro split, micronutrient RDA targets   │
│  planner: targets → meal-builder → auto-generate (layered)            │
│  filters: veg/nonveg/vegan + exclusions                               │
│  totals: sum a meal/day's nutrients vs targets                        │
│  schema: Zod types for FoodItem, UserProfile, Plan                    │
└───────────────┬───────────────────────────────────────────────────────┘
                │ reads/writes
┌───────────────▼───────────── data/ + persistence ─────────────────────┐
│  /data/foods.default.json  (curated, source-verified seed)            │
│  /data/rda.icmr-nin-2020.json  (age/sex nutrient reference values)    │
│  localStorage: user profile, custom foods, saved plans                │
│  JSON export/import (full backup)                                     │
└────────────────────────────────────────────────────────────────────────┘
```

**Why a separate `core/`:** the planner/engine has zero DOM dependencies → unit-testable in isolation and reusable by React Native later. This is the main reuse lever in the codebase.

---

## Data Model (JSON Schemas)

All schemas defined once in `core/schema.ts` (Zod) and reused for validation, editing forms, and import guards.

### FoodItem
```jsonc
{
  "id": "ifct-toor-dal-cooked",
  "name": "Toor Dal (cooked)",
  "aliases": ["Arhar dal", "Pigeon pea"],
  "category": "Legumes",
  "dietTypes": ["veg", "vegan"],          // subset of veg|nonveg|vegan
  "allergens": ["none"],
  "servingUnit": "g",
  "referenceQuantity": 100,                // nutrients are per 100 g/ml
  "nutrients": {
    "energy_kcal": 121,
    "macros": { "protein_g": 7.0, "carbs_g": 22.5, "fiber_g": 5.4, "fat_g": 0.5, "sugar_g": 1.2 },
    "vitamins": { "vit_a_ug": 0, "vit_c_mg": 0.8, "vit_d_ug": 0, "thiamin_b1_mg": 0.15,
                  "riboflavin_b2_mg": 0.05, "niacin_b3_mg": 0.9, "folate_b9_ug": 120,
                  "vit_b12_ug": 0, "vit_e_mg": 0.2, "vit_k_ug": 5 },
    "minerals": { "calcium_mg": 18, "iron_mg": 1.5, "magnesium_mg": 45, "potassium_mg": 350,
                  "sodium_mg": 5, "zinc_mg": 1.1, "phosphorus_mg": 130, "selenium_ug": 8 }
  },
  "evidences": [                            // ≥3 required for "verified" badge
    { "source": "IFCT 2017 (ICMR-NIN)", "ref": "Code C012", "value_seen": "7.0 g protein/100g", "url": "https://www.nin.res.in/" },
    { "source": "USDA FoodData Central", "ref": "FDC 172421", "value_seen": "6.8 g", "url": "https://fdc.nal.usda.gov/" },
    { "source": "Open Food Facts", "ref": "code 80012345", "value_seen": "7.2 g", "url": "https://world.openfoodfacts.org/" }
  ],
  "verification": { "status": "verified", "confidence": "high", "lastReviewed": "2026-06-15" },
  "source": "default",                      // "default" | "user"
  "editable": true
}
```

### UserProfile
```jsonc
{
  "id": "local",
  "age": 28, "sex": "male", "heightCm": 178, "weightKg": 74,
  "activityLevel": "moderate",             // sedentary|light|moderate|active|veryActive
  "workType": "desk",                      // desk|onFeet|physicalLabor|athlete (maps to activity)
  "goal": "maintain",                      // lose|maintain|gain
  "dietType": "veg",                       // veg|nonveg|vegan
  "exclusions": ["peanut", "mushroom"],    // ids or allergen/keyword
  "plannerMode": "mealBuilder"             // targetsOnly|mealBuilder|autoGenerate
}
```

### Plan (a saved day plan)
```jsonc
{
  "id": "plan-2026-06-15", "date": "2026-06-15", "profileSnapshot": { /* ... */ },
  "targets": { "energy_kcal": 2400, "protein_g": 110, /* macros + micros */ },
  "meals": [
    { "name": "Breakfast", "items": [ { "foodId": "ifct-poha", "quantity": 150 } ] },
    { "name": "Lunch", "items": [ /* ... */ ] }
  ],
  "computedTotals": { /* engine output, recalculated on edit */ }
}
```

**Storage layout**
- `/public/data/foods.default.json` — curated seed DB (Phase 0 output).
- `/public/data/rda.icmr-nin-2020.json` — RDA/EAR reference by age+sex.
- `localStorage["nourish.profile"]`, `["nourish.customFoods"]`, `["nourish.plans"]`.
- **Export** = one combined JSON; **Import** = Zod-validated merge.

---

## Nutrition Science (the engine)

**1. BMR — Mifflin-St Jeor** (most validated):
- Male: `10·kg + 6.25·cm − 5·age + 5`
- Female: `10·kg + 6.25·cm − 5·age − 161`

**2. TDEE = BMR × activity factor** (workType maps to these):
`sedentary 1.2 · light 1.375 · moderate 1.55 · active 1.725 · veryActive 1.9`

**3. Calorie goal:** maintain = TDEE; lose = −15–20%; gain = +10–15% (configurable).

**4. Macro split** (defaults, user-tunable): Protein 10–30%, Fat 20–35%, Carbs 45–65% of kcal. Default sensible split (e.g., 25/30/45) with a protein-floor of **0.83 g/kg** (ICMR-NIN 2020 RDA) and an athletic option (1.2–1.6 g/kg).

**5. Micronutrient targets (vitamins + minerals):** looked up from **ICMR-NIN 2020 RDA** tables by age+sex (`rda.icmr-nin-2020.json`); fall back to USDA DRI where an Indian value is unavailable. Reference adult: man 65 kg / woman 55 kg.

All formulas live in `core/nutrition-engine.ts` as pure functions with unit tests covering known reference cases.

**Sources:**
[Mifflin-St Jeor & activity factors](https://www.inchcalculator.com/mifflin-st-jeor-calculator/) ·
[Macro split ranges](https://www.mdapp.co/macro-nutrient-calculator-533/) ·
[ICMR-NIN 2020 RDA report](https://www.nin.res.in/rdabook/brief_note.pdf)

---

## Data Sourcing & 3-Evidence Verification Methodology

Each default food item must carry **≥3 evidences** from independent authoritative sources before it gets the **"Verified ✓"** badge. Indian foods are sourced Indian-first.

**Primary sources (priority order):**
1. **IFCT 2017 / ICMR-NIN** — Indian Food Composition Tables (canonical for Indian foods). [nin.res.in](https://www.nin.res.in/)
2. **Indian Nutrient Databank (INDB)** — nutrient values for Indian *recipes*. [GitHub: Indian-Nutrient-Databank](https://github.com/lindsayjaacks/Indian-Nutrient-Databank-INDB-)
3. **USDA FoodData Central** — 140+ nutrients, free API key. [fdc.nal.usda.gov/api-guide](https://fdc.nal.usda.gov/api-guide)
4. **Open Food Facts** — open product database (branded/packaged). [openfoodfacts.org](https://world.openfoodfacts.org/)

**Verification rule (encoded in a Phase-0 build script):**
- Pull the same food's key nutrients from ≥3 sources.
- If values agree within a tolerance (**±15%** for macros, **±25%** for micros), mark `verified / high`. Use the median value.
- If only 2 sources agree → `verified / medium`. If they diverge → `needsReview` and the item is flagged in the UI.
- Store every source's `value_seen`, `ref`, and `url` in `evidences[]` so the UI can display the receipts.
- User-added foods start `unverified` and show an "Add sources" prompt.

> Note on API keys/scraping: ingestion is a **build-time** tool (`/tools/ingest/`), run to *generate* `foods.default.json`. The shipped app makes **no runtime API calls** — it reads the baked JSON. This keeps the app offline-first and avoids exposing keys.

---

## The Layered Planner (one engine, three modes)

Built bottom-up so each layer reuses the one below — **no repeated code**. The user toggles mode in settings; the UI progressively reveals capability.

```
Layer 1 — Targets only
  Inputs profile → engine → target panel (kcal, macros, all micros) with RDA bars.
        │  (reuses engine + totals=0)
        ▼
Layer 2 — Targets + Meal Builder   ← default
  Layer 1 targets + add foods to meals → totals() recomputes live → "remaining vs target".
        │  (reuses Layer 1 targets + filters + totals)
        ▼
Layer 3 — Auto-generate full-day plan
  Greedy/weighted fill: pick filtered foods to approach targets (protein-priority,
  variety constraint, per-meal kcal split) → produces a Layer-2 plan the user then edits.
```

Shared, non-duplicated pieces: `nutrition-engine` (targets), `filters` (veg/vegan/exclusions), `totals` (sum vs target), `FoodPicker`/`MealList` components. Layer 3 is *only* the auto-fill algorithm on top of Layers 1–2 — it outputs the same `Plan` object the builder edits.

---

## Feature Modules (UI)

- **Onboarding wizard** — age/sex/height/weight/work-type/activity/goal/diet-type/exclusions → targets.
- **Dashboard** — target rings (kcal + macros), micronutrient coverage table (% RDA), today's plan summary.
- **Planner** — mode switch (Targets / Builder / Auto); meals; live remaining-vs-target; per-item quantity edit.
- **Food Database** — searchable, filterable (category, diet type), with "Verified ✓" badges; click → detail.
- **Food Detail / Editor** — full nutrient panel editable; **evidences panel** showing the ≥3 sources with links; edits to default foods are stored as user overrides (defaults stay pristine).
- **Add Food** — form to create a custom food (full nutrient panel + optional evidences).
- **Filters** — global veg/non-veg/vegan toggle + exclusion chips.
- **Data** — export/import JSON backup; "reset to defaults".

---

## Diet Filtering (veg / non-veg / vegan / exclusions)

Pure function `applyDietFilter(foods, profile)` in `core/filters.ts`:
- `vegan` ⊆ `veg` ⊆ `nonveg` visibility logic via each food's `dietTypes`.
- `exclusions` removes foods by id, alias keyword, or allergen.
- Used by the Food DB list **and** Layer-3 auto-generation, so a user never gets excluded items in a generated plan. Single source of truth → no duplication.

---

## UI/UX with 21st.dev / `magic` MCP

- Generate shadcn-based components (cards, tables, forms, dialogs, progress) via the connected **`magic` MCP** (`21st_magic_component_builder` / `_inspiration`).
- Apply the **`frontend-design`** and **`ui-ux-pro-max`** skills during build for a polished, non-generic look (clean health/wellness aesthetic fitting the "Nourish" brand; dark-mode capable; responsive — important for the future mobile app).
- Charts via Recharts for nutrient progress.

---

## Proposed Folder Structure

```
nourish/
├─ public/data/
│  ├─ foods.default.json
│  └─ rda.icmr-nin-2020.json
├─ src/
│  ├─ core/                # pure TS, no React (portable to mobile)
│  │  ├─ schema.ts         # Zod: FoodItem, UserProfile, Plan
│  │  ├─ nutrition-engine.ts
│  │  ├─ planner.ts        # 3 layered modes
│  │  ├─ filters.ts
│  │  └─ totals.ts
│  ├─ store/               # Zustand stores + localStorage persistence
│  ├─ components/          # shadcn/21st.dev components
│  ├─ features/            # onboarding, dashboard, planner, food-db, food-editor
│  ├─ lib/                 # import/export, formatting
│  └─ App.tsx / main.tsx
├─ tools/ingest/           # build-time data ingestion + 3-source verifier
└─ tests/                  # Vitest (core) + Playwright smoke
```

---

## Future Mobile App Path

- v1 keeps **all logic in `core/`** (no DOM deps) → reusable by **React Native (Expo)**.
- Shared TypeScript types/schema (Zod) across web + mobile.
- Same JSON data files ship in the mobile bundle; same export/import format → trivial data portability.
- When a backend is added later, the JSON schema becomes the API contract (drop-in).

---

## Build Phases / Milestones

- **Phase 0 — Data foundation:** build `/tools/ingest/` to pull IFCT/INDB/USDA/Open Food Facts, run the 3-source verifier, emit `foods.default.json` (start with ~80–120 common Indian + global foods) and `rda.icmr-nin-2020.json`. Define `core/schema.ts`.
- **Phase 1 — Engine (TDD):** `nutrition-engine`, `filters`, `totals` as pure functions with unit tests against known reference values.
- **Phase 2 — Scaffold + state:** Vite/React/Tailwind/shadcn setup, Zustand stores, localStorage persistence, JSON export/import.
- **Phase 3 — Onboarding + Dashboard:** profile wizard → Layer-1 targets + dashboard visuals.
- **Phase 4 — Food DB + Editor:** searchable/filterable list, detail view, **evidences panel**, edit + add-food.
- **Phase 5 — Planner layers:** Layer 2 meal builder, then Layer 3 auto-generate; mode switch.
- **Phase 6 — Polish:** `frontend-design`/`ui-ux-pro-max` pass, responsive, dark mode, empty/error states.
- **Phase 7 — Verify & harden:** Playwright smoke flow, import/export round-trip, accessibility check.

---

## Verification Plan

- **Engine unit tests (Vitest):** BMR/TDEE/macro/RDA outputs match hand-computed reference cases (e.g., 28y male 74 kg 178 cm moderate → expected TDEE within tolerance).
- **Filter tests:** vegan profile never sees non-veg/dairy; exclusions remove the right items.
- **Totals tests:** a known meal sums to known nutrient totals; "remaining vs target" correct.
- **Import/export round-trip:** export → wipe localStorage → import → state identical (Zod validates).
- **Data integrity check:** a script asserting every `default` food has ≥3 evidences and `verification.status`.
- **e2e smoke (Playwright):** onboarding → targets shown → add food to meal → totals update → export JSON.
- **Manual run:** `npm run dev`, walk the full flow; use the Claude Preview MCP to screenshot key screens.

---

## Open Risks / Notes

- **Data acquisition is the long pole.** IFCT is primarily a published table (PDF/book), not a clean API; INDB is a dataset, USDA/OFF have APIs. Phase 0 may need PDF/dataset parsing — budget time there. v1 ships a curated subset, expanded over time.
- **RDA completeness:** ICMR-NIN 2020 may lack a few micronutrient values; documented USDA-DRI fallbacks fill gaps.
- **21st.dev vs "HTML/CSS/JS":** resolved by adopting React (the UI source is React-based); noted explicitly above.

---

## Sources
- [USDA FoodData Central API Guide](https://fdc.nal.usda.gov/api-guide)
- [Indian Nutrient Databank (INDB)](https://github.com/lindsayjaacks/Indian-Nutrient-Databank-INDB-)
- [ICMR-NIN 2020 RDA — brief note (PDF)](https://www.nin.res.in/rdabook/brief_note.pdf)
- [Mifflin-St Jeor & activity factors](https://www.inchcalculator.com/mifflin-st-jeor-calculator/)
- [Macronutrient split ranges](https://www.mdapp.co/macro-nutrient-calculator-533/)
- [21st.dev component registry (React/Tailwind/shadcn)](https://github.com/serafimcloud/21st)
- [Open Food Facts](https://world.openfoodfacts.org/)
