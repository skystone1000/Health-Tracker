# AGENTS.md — working rules for this repository (Nourish)

You are working on **Nourish**, an offline-first React + Vite diet & nutrition
tracker. Follow these rules on every task.

## 1. Always read the docs first (mandatory)

Before reading source files, exploring, or making changes, **read these three
docs in order** — they give you the full context cheaply:

1. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — design, layers, constraints (the _why_).
2. [`docs/CODEBASE.md`](docs/CODEBASE.md) — file-by-file map + an "I want to… → open this" table.
3. [`docs/FEATURES.md`](docs/FEATURES.md) — every feature and where it lives.

Then **open only the specific files** the task needs (use the CODEBASE.md table
to pick them). Do not read the whole tree — the docs exist so you don't have to.

## 2. Keep the docs in sync (mandatory)

Whenever you **change code, add a feature, add a route, add a nutrient, change a
formula, or alter the data model**, update the affected doc(s) in the same change:

- New/changed feature or flow → `docs/FEATURES.md`
- New/moved/renamed file, new route, new "where do I edit X" → `docs/CODEBASE.md`
- New cross-cutting decision, constraint, or data-flow → `docs/ARCHITECTURE.md`
- User-facing setup/run/usage change → `README.md`
- Change to how yoga asanas or exercises are added/validated/rendered →
  `docs/ADD_YOGA_ASANA.md` / `docs/ADD_EXERCISE.md` (keep these "how to add one"
  guides accurate so they stay usable without re-reading the whole project).

**All Markdown files live in `docs/`** — the only exceptions are `README.md` and
`AGENTS.md`, which stay at the repo root. Create every new `.md` (plans, guides,
notes) inside `docs/`.

**To add a single asana or exercise, follow `docs/ADD_YOGA_ASANA.md` /
`docs/ADD_EXERCISE.md`** — they are the self-contained source of truth for the
data shape, enums, rules, image convention and verification steps. Yoga asana
images: `docs/plan_4_yoga_images.md`.

Treat docs as part of the definition of done. A code change that makes a doc
stale is incomplete.

## 3. Architectural constraints (don't break these)

- **`src/core/` is pure.** No React, no DOM, no `window`, no `fetch`. All
  nutrition/business logic lives here and must stay portable (a React Native app
  will reuse it). Put math in `core/`, not in components.
- **One source of truth.** Diet/exclusion logic → `core/filters.ts`; summation →
  `core/totals.ts`; targets → `core/nutrition-engine.ts`. Reuse, don't duplicate.
- **Validate at boundaries with Zod.** Seed JSON, food/recipe edits, and imported
  backups all parse through schemas in `core/schema.ts`. Types are `z.infer`red
  from those schemas — change the schema, not a separate type.
- **Persisted state is wired in 5 places.** Any new persisted field must be added
  to the store state, `partialize`, `BackupSchema`, `exportBackup`/`importBackup`,
  and `resetUserData`.
- **Seed data rules.** Default foods need **≥3 evidences**; recipe ingredient/
  base `foodId`s must reference real foods. `src/core/data.test.ts` enforces both.

## 4. Verify before claiming done

Run and confirm green:

```bash
npm run typecheck    # tsc --noEmit
npm test             # vitest (add/adjust a test for any core change)
npm run build        # production build must succeed
```

For UI changes, also verify in the browser preview (start the dev server, drive
the relevant flow, screenshot/inspect) — don't assert it works without checking.

## 5. Style

- TypeScript strict; imports via the `@/` alias.
- Match existing patterns and the shadcn-style primitives in
  `src/components/ui.tsx`. Don't introduce a UI library without reason.
- Keep components thin; push logic into `core/`.
