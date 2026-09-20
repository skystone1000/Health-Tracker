# 🌱 Nourish — Personalized Health & Diet Tracker

Nourish builds a personalized diet plan from your age, sex, height, weight and
activity level, tracks the **full nutrient panel** (energy, macros, all vitamins
& minerals) per food, suggests **recipes** for each ingredient, and lets you edit
everything. It's an **offline-first single-page app** — all your data is JSON in
your browser, with no backend.

> Originally specced in [`docs/plan_1_scratch.md`](docs/plan_1_scratch.md).

## Features at a glance

- **Personalized targets** — Mifflin-St Jeor BMR × activity, configurable macro
  split, ICMR-NIN 2020 RDA (USDA-DRI fallbacks) for every vitamin & mineral.
- **Layered planner** — _Targets only_ → _Meal builder_ (any date) →
  _Auto-generate full day_ → _Week_, one engine, you pick the mode.
- **7-day meal planner** — generates a whole week balanced against ICMR-NIN
  "My Plate for the Day" food-group quotas, respecting your diet type and
  exclusions. Every **Regenerate** gives a different week (seeded, best-of-3);
  lock 🔒 a day to keep it or shuffle 🔄 one on its own.
- **Food database** — Indian-first, curated, each food with a full nutrient panel
  and **≥3 source evidences** behind a "Verified ✓" badge. Fully editable; add
  your own foods.
- **Recipes** — cooking options for each food, nutrition computed per serving,
  one-click "add to today's plan", plus your own custom recipes.
- **Exercise** — a library of exercises across every region (upper, lower, core,
  cardio, full-body) and muscle group, a **routine generated from your profile**
  (equipment, experience, goal, split), session logging, and MET-based calorie
  estimates. Fully editable; add your own.
- **Yoga** — a detailed library of asanas spanning every family, each tagged with
  **styles/traditions** (Hatha, Vinyasa, Ashtanga, Iyengar, Yin, Restorative,
  Power, Kundalini, Sivananda), **pros, cons, who-should-avoid** and **counter
  (viparit) poses**. Filter by style/tag/family/level, generate a **style-biased
  sequence** (safely ordered, contraindication-aware, with auto counter-poses),
  log practices, and read a **Learn Yoga** theory section (history, the four
  paths, Patanjali's eight limbs, pranayama, gunas, chakras, styles & glossary).
- **Activity vs intake** — calories burned are estimated and shown **beside**
  your food intake on the dashboard (targets are left unchanged in v1).
- **Diet filters** — Veg / Non-veg / Vegan + exclusions, applied consistently
  across foods, recipes and the auto-planner.
- **Local JSON storage** with full **export / import** backup. Light/dark mode,
  responsive.

## Quick start

**Prerequisites:** Node.js ≥ 18 and npm.

```bash
git clone <this-repo>
cd Health-Tracker
npm install
npm run dev          # → http://localhost:5173
```

On first load you'll go through a short onboarding wizard; everything is saved
locally in your browser.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server (HMR) |
| `npm test` | Run the Vitest suite (engine, filters, totals, planner, recipes, data integrity) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | Type-check + production build to `dist/` |
| `npm run preview` | Serve the production build locally |

## Documentation — start here to understand or extend the app

Read these **in order** before diving into code (they're written to give full
context without reading the whole tree):

1. **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — design, layers, key
   decisions and the constraints to preserve (_why it's built this way_).
2. **[docs/CODEBASE.md](docs/CODEBASE.md)** — file-by-file map plus an
   **"I want to… → open this file"** table (_where things are_).
3. **[docs/FEATURES.md](docs/FEATURES.md)** — every feature, its formulas, and the
   code behind it (_what it does_).

There is also a **[CLAUDE.md](CLAUDE.md)** at the repo root with working rules for
AI assistants (read the three docs first, edit only the files you need, and keep
docs + tests in sync with code).

## How to implement something new or fix a bug

1. Read the three docs above (the CODEBASE.md table points you straight to the
   right file).
2. Make the change. Remember:
   - Business logic / math → `src/core/` (keep it free of React & DOM).
   - Add or update a test in `src/core/*.test.ts` for any core change.
   - New persisted state → wire it into the store **and** the `Backup` schema.
3. Verify: `npm run typecheck && npm test && npm run build`, and check the UI in
   the browser for visible changes.
4. **Update the docs** you affected (FEATURES / CODEBASE / ARCHITECTURE / README).

## Project layout

```
public/data/    foods · recipes · rda · exercises · asanas (default JSON)
src/core/       pure, tested engine: schema · nutrition-engine · planner · filters · totals · recipes
                · date · random · food-groups · day-planner · week-planner
                · fitness · backup · activity/ · exercise/ · yoga/
src/store/      Zustand store + localStorage persistence + export/import
src/features/   onboarding · dashboard · planner · foods · recipes · exercise · yoga · data
src/components/ ui primitives + layout
docs/           ARCHITECTURE · CODEBASE · FEATURES (+ the plans)
```

## Data & sources

Nutrient values are curated from authoritative databases (IFCT/ICMR-NIN, USDA
FoodData Central, Open Food Facts, INDB) and cross-checked across **≥3 sources**
before being marked verified — see each food's **Evidence sources** in the
editor. Values are approximate and **not medical advice**; consult a professional
for clinical dietary needs.

## Tech stack

React 18 · Vite · TypeScript (strict) · Tailwind CSS (shadcn-style components) ·
Zustand · Zod · Recharts · Vitest.
