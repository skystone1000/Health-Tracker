# How to add a new Yoga asana

Self-contained checklist for adding one asana to **Nourish**. Follow it without
re-reading the whole codebase. (For the bigger picture see
[`FEATURES.md`](FEATURES.md) §11 and
[`ARCHITECTURE.md`](ARCHITECTURE.md).)

> **Keep this file current.** If the asana schema, enums, validation, image
> convention, or yoga UI change, update this guide in the same commit.

---

## TL;DR

1. Add one object to [`public/data/asanas.default.json`](../public/data/asanas.default.json).
2. Add its image `public/images/asanas/<id>.webp` (prompt in [`plan_4_yoga_images.md`](plan_4_yoga_images.md)).
3. Run `npm test && npm run typecheck && npm run build`.

No component or store changes are needed — the library, filters, detail/editor,
sequence engine, calorie estimate and image all pick it up automatically.

---

## 1. Add the data

Append one entry to the JSON array in
[`public/data/asanas.default.json`](../public/data/asanas.default.json). Copy this
template and fill it in:

```json
{
  "id": "kebab-case-id",
  "sanskritName": "Sanskrit Name",
  "englishName": "English Name",
  "aliases": ["common name"],
  "family": "standing",
  "difficulty": "beginner",
  "metValue": 2.5,
  "focus": ["flexibility"],
  "steps": ["Step one.", "Step two."],
  "benefits": ["A pro.", "Another pro."],
  "cons": ["A caution."],
  "contraindications": ["who should avoid, e.g. pregnancy"],
  "styles": ["hatha"],
  "tags": ["calming"],
  "counterAsanaIds": [],
  "defaultHoldSec": 30,
  "evidences": [
    { "source": "Light on Yoga — B.K.S. Iyengar (1966)", "ref": "Pose name" },
    { "source": "Yoga Journal pose library", "ref": "Pose", "url": "https://www.yogajournal.com/poses/..." },
    { "source": "Compendium of Physical Activities (2011)", "ref": "code 02150 hatha yoga", "value_seen": "MET 2.5" }
  ],
  "verification": { "status": "verified", "confidence": "high", "lastReviewed": "YYYY-MM-DD" },
  "source": "default"
}
```

### Field rules (enforced by `src/core/yoga/schema.ts` + `data.test.ts`)

- **`id`** — unique, lowercase kebab-case. This is also the **image filename**.
- **`family`** — one of: `standing`, `seated`, `reclining`, `kneeling`,
  `squatting`, `forwardBend`, `backbend`, `twist`, `lateralBend`, `balance`,
  `inversion`, `armBalance`, `restorative`, `pranayama`, `meditation`.
- **`difficulty`** — `beginner` | `intermediate` | `advanced`.
- **`focus`** — ≥1 of: `flexibility`, `strength`, `balance`, `relaxation`, `breath`.
- **`styles`** — any of: `hatha`, `vinyasa`, `ashtanga`, `iyengar`, `kundalini`,
  `yin`, `restorative`, `power`, `sivananda`.
- **`tags`** — free-form strings. Reuse the curated list in
  [`src/lib/activity.ts`](../src/lib/activity.ts) `KNOWN_TAGS` so it shows in the
  filter dropdown (new tags work too, just won't be in the dropdown until added).
- **`metValue`** — positive number (yoga ≈ 1.3–4.0). Drives the calorie estimate.
- **`benefits`** and **`cons`** — both must be **non-empty** (pros & cons).
- **`contraindications`** — "who should avoid" keywords (matched against the
  user's injury limitations to auto-skip the pose in generated sequences).
- **`counterAsanaIds`** — viparit/counter poses; each must reference an existing
  asana `id`, and **never the pose's own id**. Tip: set the natural opposite
  (backbend ↔ forward bend; twist → neutral/rest). Consider adding the reciprocal
  on the other pose too.
- **`evidences`** — **≥3** required for the pose to pass integrity tests.
- **`verification.status`** — `verified` once it has ≥3 evidences, else
  `unverified`.

## 2. Add the image

- Generate it with the shared **style prefix + negative prompt** (real human
  figure, sage-green activewear, cream background — **not** a stick/mannequin)
  and save as `public/images/asanas/<id>.webp` (square, ~1024², ≤150 KB).
- See [`plan_4_yoga_images.md`](plan_4_yoga_images.md) for the prompt template
  and style/negative blocks; add a new prompt block there for the new pose.
- **If the pose is complex (inversion, arm balance, twist) or the model renders
  it wrong, pull an online reference photo first** (search "<English> <Sanskrit>
  yoga pose") and match the limb placement — accuracy beats style polish.
- Until the file exists a 🧘 placeholder shows — no error.

## 3. Special cases

- **New family** → add to `ASANA_FAMILIES` in
  [`src/core/yoga/schema.ts`](../src/core/yoga/schema.ts), a label in
  `FAMILY_LABELS` ([`src/lib/activity.ts`](../src/lib/activity.ts)), and add a
  counter mapping in `OPPOSING_FAMILIES`
  ([`src/core/yoga/counterpose.ts`](../src/core/yoga/counterpose.ts)). `data.test.ts`
  requires ≥1 asana of every family, so include one.
- **New style** → add to `YOGA_STYLES` in `schema.ts` and `STYLE_LABELS` in
  `lib/activity.ts`. `data.test.ts` requires ≥1 asana per style.
- **New tag** → add to `KNOWN_TAGS` in `lib/activity.ts` (optional).

## 4. Verify (must be green)

```bash
npm test          # incl. src/core/yoga/data.test.ts (schema, ≥3 evidences,
                  #   family + style coverage, counter-id integrity, pros+cons)
npm run typecheck
npm run build
```

If you changed UI-visible behaviour, also check the Yoga library, the asana
detail modal, and the sequence builder in the dev server.

## 5. Where things live (for reference)

| Thing | File |
|---|---|
| Asana schema & enums | `src/core/yoga/schema.ts` |
| Filtering | `src/core/yoga/filters.ts` |
| Counter-pose logic | `src/core/yoga/counterpose.ts` |
| Sequence generation | `src/core/yoga/sequence-engine.ts` |
| Calorie estimate (MET) | `src/core/activity/calories.ts` |
| Labels / tags | `src/lib/activity.ts` |
| Library / detail / editor UI | `src/features/yoga/*` |
| Integrity tests | `src/core/yoga/data.test.ts` |
| Image convention | `src/lib/images.ts`, `plan_4_yoga_images.md` |
