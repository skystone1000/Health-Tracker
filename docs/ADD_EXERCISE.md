# How to add a new Exercise

Self-contained checklist for adding one exercise to **Nourish**. Follow it without
re-reading the whole codebase. (Bigger picture:
[`FEATURES.md`](FEATURES.md) §10 and
[`ARCHITECTURE.md`](ARCHITECTURE.md).)

> **Keep this file current.** If the exercise schema, enums, validation, routine
> engine, or exercise UI change, update this guide in the same commit.

---

## TL;DR

1. Add one object to [`public/data/exercises.default.json`](../public/data/exercises.default.json).
2. Run `npm test && npm run typecheck && npm run build`.

No component or store changes are needed — the library, filters, the workout-plan
routine generator, the volume/calorie estimate, and logging all pick it up
automatically.

---

## 1. Add the data

Append one entry to the JSON array in
[`public/data/exercises.default.json`](../public/data/exercises.default.json). Copy
this template and fill it in:

```json
{
  "id": "kebab-case-id",
  "name": "Exercise Name",
  "aliases": ["common name"],
  "primaryMuscles": ["chest"],
  "secondaryMuscles": ["triceps", "shoulders"],
  "region": "upper",
  "equipment": ["bodyweight"],
  "difficulty": "beginner",
  "metValue": 3.8,
  "instructions": ["Step one.", "Step two."],
  "cues": ["A form cue."],
  "defaultSets": 3,
  "defaultReps": 12,
  "evidences": [
    { "source": "Compendium of Physical Activities (2011)", "ref": "code 02054 resistance training", "value_seen": "MET 3.8" },
    { "source": "ExRx.net", "ref": "Exercise", "url": "https://exrx.net/..." },
    { "source": "NSCA Essentials of Strength Training and Conditioning", "ref": "3rd ed." }
  ],
  "verification": { "status": "verified", "confidence": "high", "lastReviewed": "YYYY-MM-DD" },
  "source": "default"
}
```

### Field rules (enforced by `src/core/exercise/schema.ts` + `data.test.ts`)

- **`id`** — unique, lowercase kebab-case.
- **`primaryMuscles`** (≥1) / **`secondaryMuscles`** — from: `chest`, `back`,
  `shoulders`, `biceps`, `triceps`, `forearms`, `core`, `quads`, `hamstrings`,
  `glutes`, `calves`, `fullBody`, `cardio`.
- **`region`** — `upper` | `lower` | `core` | `fullBody` | `cardio`. Used by the
  routine generator's day templates.
- **`equipment`** (≥1) — `bodyweight`, `dumbbell`, `barbell`, `machine`,
  `kettlebell`, `bands`, `cardioMachine`. The generator only picks exercises whose
  equipment the user has.
- **`difficulty`** — `beginner` | `intermediate` | `advanced`. The generator
  excludes exercises harder than the user's experience.
- **`metValue`** — positive number (drives calories-burned via the shared MET
  engine). Typical: light resistance ≈ 3.5, vigorous ≈ 5–6, cardio ≈ 8–10.
- **`defaultSets` / `defaultReps`** — optional hints (the routine engine sets its
  own sets/reps by training goal).
- **`evidences`** — **≥3** required to pass integrity tests.
- **`verification.status`** — `verified` with ≥3 evidences, else `unverified`.

## 2. Special cases

- **New muscle group** → add to `MUSCLE_GROUPS` in
  [`src/core/exercise/schema.ts`](../src/core/exercise/schema.ts) and a label in
  `MUSCLE_LABELS` ([`src/lib/activity.ts`](../src/lib/activity.ts)). `data.test.ts`
  requires every muscle group to appear in ≥1 exercise, so add one.
- **New equipment / region** → add to `EQUIPMENT` / `BODY_REGIONS` in `schema.ts`
  and the matching label map in `lib/activity.ts`. For a new region, also add a
  day template/rotation in
  [`src/core/exercise/routine-engine.ts`](../src/core/exercise/routine-engine.ts) if
  it should appear in generated splits. `data.test.ts` requires every region to be
  covered.

## 3. Verify (must be green)

```bash
npm test          # incl. src/core/exercise/data.test.ts (schema, ≥3 evidences,
                  #   region + muscle-group coverage, unique ids)
npm run typecheck
npm run build
```

If you changed UI-visible behaviour, also check the Exercise library and the
"My workout plan" generate/log flow in the dev server.

## 4. Where things live (for reference)

| Thing | File |
|---|---|
| Exercise schema & enums | `src/core/exercise/schema.ts` |
| Filtering | `src/core/exercise/filters.ts` |
| Routine generation | `src/core/exercise/routine-engine.ts` |
| Volume + calorie estimate | `src/core/exercise/volume.ts`, `src/core/activity/calories.ts` |
| Labels | `src/lib/activity.ts` |
| Library / editor / plan UI | `src/features/exercise/*` |
| Integrity tests | `src/core/exercise/data.test.ts` |

> Note: exercises have **no per-item image** yet (yoga does — see
> `plan_4_yoga_images.md`). If exercise images are added later, mirror the
> yoga convention (`src/lib/images.ts`) and document it here.
