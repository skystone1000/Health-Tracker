# Plan 3 — Detailed Yoga: styles, full asana library, pros/cons, contraindications & counter-poses

Builds directly on the Yoga domain delivered in
[`docs/plan_2_exercise.md`](plan_2_exercise.md). That plan shipped a working yoga
library (`core/yoga/`, `features/yoga/`, `public/data/asanas.default.json`). **This
plan deepens it** into a comprehensive, well-classified, safety-aware asana
reference covering the major yoga traditions, with per-asana **tags, pros, cons,
who-should-avoid, and viparit (counter) asana**.

> Read [`docs/ARCHITECTURE.md`](ARCHITECTURE.md), [`docs/CODEBASE.md`](CODEBASE.md)
> and [`docs/FEATURES.md`](FEATURES.md) first, then plan_2 for the current yoga
> code. This plan extends the existing `Asana` schema and yoga feature — it does
> **not** start from scratch.

---

## 1. Goal & what's new

For **every asana** we will record:

| Requirement (user ask) | Field | Status |
|---|---|---|
| Filter/check by type directly | `family` (functional) + `styles[]` (tradition) + `tags[]` (cross-cutting) | `family` exists; **add** `styles`, `tags` |
| Pros | `benefits[]` | exists |
| Cons | `cons[]` | **new** |
| Who should avoid | `contraindications[]` | exists |
| Viparit (opposite) asana | `counterAsanaIds[]` | **new** |

Plus: model the **yoga styles/traditions** themselves (Hatha, Ashtanga Vinyasa,
Iyengar, Vinyasa, Kundalini, Yin, Restorative, Power, Sivananda…) and a small
**Patanjali "eight limbs" reference** — because that is a *philosophy*, not poses
(see §2). And grow the asana catalogue from the current starter set toward a
comprehensive library (target ~108, phased — §7).

---

## 2. Research summary (grounding the model)

### 2.1 Styles/traditions are a different axis from "pose type"

The popular "types of yoga" are **practice schools/styles**, not pose categories:

- **Hatha** — umbrella term for physical yoga; slower, foundational (asana +
  pranayama + meditation). Good for beginners.
- **Ashtanga (Vinyasa)** — a fixed, demanding sequence of poses tied to breath
  (codified by K. Pattabhi Jois, early 1900s).
- **Vinyasa / Flow** — breath-synchronised flowing sequences; no fixed order.
- **Iyengar** — alignment/precision, heavy prop use (blocks, straps, bolsters).
- **Kundalini** — breathwork, sound, energetic/spiritual focus.
- **Yin** — long passive holds targeting connective tissue.
- **Restorative** — fully prop-supported, no muscular effort; deep rest.
- **Power / Hot (Bikram)**, **Sivananda**, **Kripalu** — further common styles.

### 2.2 Patanjali's "Ashtanga" ≠ Ashtanga Vinyasa (important)

Patanjali's **Ashtanga = the eight limbs** of yoga (yama, niyama, asana,
pranayama, pratyahara, dharana, dhyana, samadhi) — a spiritual/ethical framework
where physical postures are just *one* limb. This is **not** a list of poses, and
must not be modelled as asanas. It belongs as **reference/educational content**
(a "Traditions & philosophy" page). The modern studio "Ashtanga" class is the
*Vinyasa* sequence above — a `style`, not a philosophy.

### 2.3 Asana classification

Wikipedia's *List of asanas* uses the symbolic **84** traditional asanas and
classifies them by **type**: standing, sitting, reclining (prone/supine),
kneeling, balancing, inversion, squatting — alongside the *functional* families
we already use (forward bend, backbend, twist, arm balance). Modern libraries
(Yoga Journal) cover 200+. We will treat **`family`** as the primary
functional/positional category and add free-form **`tags`** for cross-cutting
attributes (hip-opener, heart-opener, core, energising, calming, …).

### 2.4 Counter-pose (pratikriyasana / viparit)

A **counter-pose moves the spine opposite to the previous pose, and is gentler**
than it. Rules from the sources: backbend ↔ gentle forward bend; forward bend ↔
gentle backbend (Cobra/Locust); twist ↔ neutral supine twist; **a twist is never
the counter to a backbend** (forward fold first). We model this as
`counterAsanaIds` (references to other asanas), with integrity + sanity checks.

### 2.5 Contraindications are well documented per pose

E.g. Sarvangasana/Shoulderstand & inversions → avoid with **glaucoma, high blood
pressure, neck injury, pregnancy, menstruation**; Chakrasana/Wheel → avoid with
**back/neck injury, pregnancy, uncontrolled HBP**; strong/closed twists → avoid
in **pregnancy/HBP**. These map to `contraindications` (who should avoid). We add
`cons` for non-medical downsides/cautions (e.g. "easy to overarch the lower
back", "wrist-intensive").

### 2.6 Yoga theory worth teaching (for the "Learn" feature — §3.5)

Beyond styles and poses, there is a coherent body of yoga *theory* the app should
explain in plain language:

- **What yoga is & its history** — "yoga" (Sanskrit *yuj*, "to unite"); roots in
  the Vedas/Upanishads and the **Bhagavad Gita**, systematised in **Patanjali's
  Yoga Sutras**.
- **The four classical paths** (from the Gita) — **Karma** (selfless action),
  **Bhakti** (devotion), **Raja** (mind control / meditation; *includes*
  Patanjali's eight limbs), **Jnana** (knowledge/inquiry). Hatha is the *physical*
  branch through which many pursue Raja yoga.
- **The eight limbs (Ashtanga of Patanjali)** — yama, niyama, asana, pranayama,
  pratyahara, dharana, dhyana, samadhi (the last three together = *samyama*).
- **Pranayama** — breath/energy control; one of the eight limbs.
- **The three gunas** — sattva (balance), rajas (activity), tamas (inertia).
- **The chakras** — the energy-centre model used in many traditions.
- **Modern styles** (§2.1) and **how to choose** one.

This is descriptive/educational content (well covered online) — modelled as
structured data and rendered on a Learn page; **not** medical or religious
prescription.

**Sources:** [Wikipedia — List of asanas](https://en.wikipedia.org/wiki/List_of_asanas) ·
[Wikipedia — Ashtanga (eight limbs)](https://en.wikipedia.org/wiki/Ashtanga_(eight_limbs_of_yoga)) ·
[Wikipedia — Ashtanga (vinyasa) yoga](https://en.wikipedia.org/wiki/Ashtanga_(vinyasa)_yoga) ·
[Yoga Journal — counterposes for backbends](https://www.yogajournal.com/practice/counterposes-for-backbends/) ·
[Gaiam — 8 major styles of yoga](https://www.gaiam.com/blogs/discover/a-beginners-guide-to-8-major-styles-of-yoga) ·
[Art of Living — Sarvangasana benefits & cautions](https://www.artofliving.org/yoga/yoga-poses/shoulder-stand-sarvangasana) ·
[Aura Wellness — Glaucoma & yoga](https://aurawellnesscenter.com/2021/11/28/glaucoma-and-yoga-what-is-safe/).
**Theory (§2.6 / §3.5):**
[Fitsri — The four paths of yoga](https://www.fitsri.com/articles/4-paths-of-yoga) ·
[Sivananda — The four paths (Google Arts & Culture)](https://artsandculture.google.com/story/the-four-paths-of-yoga-sivananda-yoga-vedanta-centres-ashrams/QQURiPuOVM2eIw) ·
[Wikipedia — Pranayama](https://en.wikipedia.org/wiki/Pranayama) ·
[Yoga Journal — the three gunas](https://www.yogajournal.com/lifestyle/health/yoga-philosophy-101-3-gunas/) ·
[Arhanta Yoga — the 7 chakras](https://www.arhantayoga.org/blog/7-chakras-introduction-energy-centers-effect/).
Per-asana curation will also draw on *Light on Yoga* (Iyengar), the AYUSH **Common Yoga Protocol**, and the Yoga Journal pose library — each asana keeping the existing **≥3-evidence** rule.

---

## 3. Data-model extensions (`core/yoga/schema.ts`)

Additive and backward-compatible (new fields default to empty, so existing seed
and user data still validate). Types stay `z.infer`red from the schema.

```ts
// NEW — traditions/styles (the "types of yoga" axis)
export const YOGA_STYLES = [
  "hatha", "vinyasa", "ashtanga", "iyengar", "kundalini",
  "yin", "restorative", "power", "sivananda",
] as const;
export const YogaStyleSchema = z.enum(YOGA_STYLES);

// EXTEND families with the missing positional types from the research
export const ASANA_FAMILIES = [
  "standing", "seated", "reclining", "kneeling", "squatting",
  "forwardBend", "backbend", "twist", "lateralBend",
  "balance", "inversion", "armBalance",
  "restorative", "pranayama", "meditation",
] as const;

export const AsanaSchema = z.object({
  // …all existing fields (id, sanskritName, englishName, aliases, family,
  //   difficulty, metValue, focus, steps, benefits, contraindications,
  //   defaultHoldSec, evidences, verification, source) …

  styles: z.array(YogaStyleSchema).default([]),   // NEW — traditions it belongs to
  tags: z.array(z.string()).default([]),          // NEW — free-form filter tags
  cons: z.array(z.string()).default([]),          // NEW — cautions / downsides
  counterAsanaIds: z.array(z.string()).default([]), // NEW — viparit / counter poses
});
```

- **`benefits`** = pros (already present). **`contraindications`** = "who should
  avoid" (already present). **`cons`** = practice cautions distinct from medical
  contraindications. **`counterAsanaIds`** = viparit asanas (id references, like a
  recipe's `foodId` references).
- **`tags`** are curated but free-form (e.g. `hip-opener`, `heart-opener`,
  `core`, `energizing`, `calming`, `beginner-friendly`, `prop-friendly`,
  `desk-relief`). A `KNOWN_TAGS` list in `lib/activity.ts` powers the filter
  dropdown without locking the schema.

### Yoga traditions reference (non-asana content)

A small pure module `core/yoga/styles.ts` (data + types), covering each style's
description, pace, props, and best-for — plus the **Patanjali eight limbs** as a
separate reference list. No calorie/engine logic; it is descriptive content
rendered on the Learn page (§3.5).

```ts
export interface YogaStyleInfo { id: YogaStyle; name: string; summary: string;
  pace: "gentle" | "moderate" | "vigorous"; usesProps: boolean; bestFor: string[] }
export interface YogaLimb { sanskrit: string; english: string; description: string }
export const EIGHT_LIMBS: YogaLimb[]   // yama … samadhi (Patanjali)
```

---

## 3.5 Yoga theory & education — the "Learn Yoga" knowledge base

**Goal (user ask):** give a *detailed theory* about yoga — what it is, its history,
its types/paths/styles, and supporting concepts — sourced from what's available
online, presented in-app.

### Content model (pure, structured — not free HTML)

A pure module **`core/yoga/theory.ts`** holds the theory as **typed, structured
data** (so it is testable, translatable, and consistent — never a wall of hardcoded
JSX). It composes the styles + eight-limbs data already in `styles.ts`.

```ts
export interface TheorySource { title: string; url?: string }   // citations
export interface TheorySection {
  id: string;                       // slug, e.g. "history", "four-paths"
  title: string;                    // "History & origins"
  summary: string;                  // 1–2 line intro
  body: string[];                   // paragraphs (plain text/markdown-lite)
  bullets?: { term: string; text: string }[];  // e.g. each guna / limb / path
  sources: TheorySource[];          // ≥1 citation per section
}
export const YOGA_THEORY: TheorySection[]   // the ordered curriculum below
```

### The curriculum (sections to author)

1. **What is yoga?** — meaning (*yuj* = union), aim, body–breath–mind.
2. **History & origins** — Vedas/Upanishads → Bhagavad Gita → Patanjali's Yoga
   Sutras → modern global yoga.
3. **The four paths** — Karma, Bhakti, Raja, Jnana (each as a `bullets` entry:
   who it suits + core practice).
4. **Patanjali's eight limbs** — rendered from `EIGHT_LIMBS` (yama … samadhi).
5. **Hatha & the physical practice** — how asana/pranayama relate to the paths.
6. **Pranayama** — breath/energy; a few foundational techniques (links to the
   pranayama asanas already in the library).
7. **The three gunas** — sattva / rajas / tamas.
8. **The chakras** — the seven-centre model (clearly framed as a traditional
   energetic model, not medical claim).
9. **Modern styles & how to choose** — rendered from `styles.ts` (§3), with a
   short "best for…" each.
10. **Glossary** — Sanskrit terms used across the app (asana, vinyasa, drishti,
    bandha, mantra, mudra…).

Each section carries **≥1 cited source**; a content-integrity test asserts every
section has a title, non-empty body, and at least one source (mirrors the
≥3-evidence discipline, scaled to prose).

### UI — `features/yoga/YogaLearn.tsx` at route `/yoga/learn`

- A readable, sectioned page (sticky in-page nav / accordion of the 10 sections),
  using existing `Card`/typography primitives; calm styling consistent with the
  Yoga section.
- **Cross-links:** the eight-limbs and pranayama sections link to relevant asanas;
  the styles section links into the library filtered by that `style`; asana detail
  links back to the matching Learn section ("Part of: Hatha →").
- **Disclaimer banner:** "Educational overview; traditional concepts (e.g.
  chakras, gunas) are presented as part of yoga philosophy, not medical or
  religious advice."
- Surfaced from the Yoga library header ("📖 Learn yoga") and the sidebar.

This replaces the earlier single "Traditions" page with a fuller **Learn** page;
styles/eight-limbs become two of its sections (DRY — one data source, one page).

---

## 4. Counter-asana (viparit) — modelling & integrity

- Stored as `counterAsanaIds: string[]` on each asana (0..n counters).
- **Referential integrity** (in `core/yoga/data.test.ts`, mirroring the recipe
  `foodId` check): every `counterAsanaId` must resolve to a real asana id.
- **Sanity check** (warn-level test): a counter should generally be in an
  *opposing* family (backbend↔forwardBend, twist→neutral) and **not** equal to
  the pose itself. Encode an `OPPOSING_FAMILIES` map in `core/yoga/counterpose.ts`
  and a pure helper `suggestCounters(asana, all)` that powers an "auto-suggest"
  in the editor and validates seed data.
- UI: the asana detail shows **"Counter pose (viparit) →"** as clickable chips
  that open the referenced asana — reusing the existing library/editor modal.

`core/yoga/counterpose.ts` (pure, tested): `OPPOSING_FAMILIES`,
`suggestCounters()`, `isReasonableCounter(a, b)`.

---

## 5. UI / UX changes (feature layer)

Keep the existing shadcn-style primitives and the **separate Yoga section**.

- **`AsanaLibrary.tsx`** — add two filters: **Style** (Hatha/Ashtanga/Yin/…) and
  **Tag** (from `KNOWN_TAGS`), beside the existing family/focus/level filters.
  Cards show a style chip.
- **`AsanaEditor.tsx`** (detail/edit) — render four clearly separated blocks:
  **Benefits (pros)**, **Cautions (cons)**, **Who should avoid
  (contraindications)** with a ⚠ medical-disclaimer line, and **Counter poses
  (viparit)** as clickable chips. Edit mode adds styles (multi-select), tags
  (chips), cons (lines), and a counter-asana picker (search + add, validated
  against real ids) with a "suggest" button using `suggestCounters`.
- **New route `/yoga/learn`** → `YogaLearn.tsx`: the full theory/education
  knowledge base (§3.5) — what yoga is, history, the four paths, eight limbs,
  pranayama, gunas, chakras, styles guide, glossary — rendered from
  `core/yoga/theory.ts` + `styles.ts`. Linked from the Yoga library header
  ("📖 Learn yoga") and the sidebar.
- **`SequenceBuilder.tsx`** — optionally bias generation by chosen **style**
  (e.g. Yin → longer holds, restorative-weighted; Power → vigorous), and use
  `counterAsanaIds` to insert gentle counter-poses after deep backbends
  (improves the existing safe-ordering).

No change to the calorie model — MET stays per asana, reusing `core/activity/`.

---

## 6. Store & persistence

The schema additions are **non-persisted for defaults** (they ship in
`asanas.default.json`). Only user **custom asanas / overrides** persist, and those
already flow through the 5 persistence points via `AsanaSchema` — so adding fields
to the schema requires **no new store wiring** beyond confirming
`core/backup.ts` re-validates (it imports `AsanaSchema`, so it is automatic). A
backup round-trip test will confirm the new fields survive export/import.

---

## 7. Data sourcing & volume (phased)

"All asanas online" is effectively unbounded; we target a **comprehensive curated
library** with the existing **≥3-evidence** discipline rather than scraping.

- **Canonical spine:** Wikipedia *List of asanas* (~84 traditional) for
  names/types/sources, enriched per-pose from *Light on Yoga*, Yoga Journal pose
  library, and AYUSH Common Yoga Protocol.
- **Target:** ~**108** asanas (auspicious, comfortably covers all families &
  styles), reached in waves:
  - **Wave 1 (~40):** current set + most-common poses across all families; full
    new fields (styles/tags/cons/counters).
  - **Wave 2 (~84):** complete the traditional 84.
  - **Wave 3 (~108+):** popular modern additions + each style's signature poses.
- Every asana: ≥3 evidences, valid `counterAsanaIds`, ≥1 `family`, ≥1 `focus`.
- **Integrity tests** (`core/yoga/data.test.ts`) extend the existing ones:
  schema-valid, unique ids, ≥3 evidences, all families covered, **all styles
  represented**, **counter ids resolve**, and `cons`/`benefits` non-empty for
  verified poses.

> Optional future: a build-time `tools/ingest/yoga` pipeline (mirrors the planned
> food ingest) to assemble/validate asana JSON from sources — out of scope here,
> noted for later.

---

## 8. Modularity & SOLID

- **SRP:** styles reference (`styles.ts`), counter-pose logic
  (`counterpose.ts`), filtering (`filters.ts`), schema (`schema.ts`) each own one
  concern; the traditions page is pure presentation over `styles.ts`.
- **OCP:** new styles, families, and tags are added to **data/key-lists**, not
  branching logic; filters and the engine iterate the registries.
- **DIP / loose coupling:** the yoga feature depends on `core/yoga` + store
  selectors only; counter-pose references are plain id links (no object graph
  coupling), exactly like recipe→food references.
- **DRY:** reuses the existing Asana editor/library, the shared MET engine, and
  the recipe-style "id reference + integrity test" pattern — nothing duplicated.
- Keep files focused: if `AsanaEditor.tsx` grows, split the detail view
  (pros/cons/avoid/counter) into a presentational child.

---

## 9. Implementation phases (each ends green: typecheck · test · build)

1. **Schema + reference.** Extend `AsanaSchema` (styles/tags/cons/counterAsanaIds),
   extend `ASANA_FAMILIES`, add `core/yoga/styles.ts` (styles + eight limbs) and
   `core/yoga/counterpose.ts` (+ unit tests). Backward-compatible.
2. **Data Wave 1.** Backfill the existing asanas with the new fields and counter
   poses; expand to ~40. Extend `data.test.ts` (counter integrity, style/family
   coverage). Backup round-trip test.
3. **Theory & Learn page.** Author `core/yoga/theory.ts` (the 10-section
   curriculum, each with sources) + content-integrity test; build
   `features/yoga/YogaLearn.tsx` at `/yoga/learn` with cross-links and the
   disclaimer. Browser-verify.
4. **UI.** Library style+tag filters; editor pros/cons/avoid/counter blocks +
   counter picker with `suggestCounters`; Learn link in header + sidebar.
   Browser-verify each flow.
5. **Sequence integration.** Style-biased generation + auto counter-pose insertion
   after deep backbends.
6. **Data Wave 2 → 3.** Grow to the traditional 84, then ~108; keep tests green.
7. **Docs.** Update FEATURES (yoga section + Learn/theory), CODEBASE (new files,
   table rows: "add a style", "add a tag", "set a counter pose", "edit yoga
   theory"), ARCHITECTURE (counter-pose references + theory reference), README.

---

## 10. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Medical/safety liability of "who should avoid" | Prominent **not-medical-advice** disclaimer on every contraindication block; cite sources; keep `contraindications` conservative. |
| Evidence burden at 108 asanas | Phase it; reuse a small set of authoritative sources; integrity test enforces ≥3 but content can land wave-by-wave. |
| Counter-pose data drift / dangling ids | `data.test.ts` referential-integrity check (like recipes) fails the build on bad ids. |
| Conflating Patanjali philosophy with poses | Eight limbs modelled as **reference content**, never as asanas (§2.2). |
| Theory accuracy / cultural sensitivity | Each Learn section is **cited** (≥1 source) and content-integrity tested; chakras/gunas framed as traditional philosophy with an explicit disclaimer, not medical/religious claims. |
| Scope creep ("literally all poses") | Curated target (~108) with a clear, testable definition of done, not an open-ended scrape. |

---

## 11. Open decisions (recommended defaults — adjust before build)

1. **Library size target** — *recommend ~108 curated, phased*. Alternative: cap
   at the traditional 84, or go exhaustive (200+, much higher curation cost).
2. **`tags` controlled vs free-form** — *recommend curated `KNOWN_TAGS` list*
   (consistent filtering) while the schema stays `string[]` (extensible).
3. **Counter poses: single vs multiple** — *recommend `counterAsanaIds[]`*
   (0..n) so a pose can list a primary + alternates.
4. **Learn page depth** — *recommend the 10-section curriculum in §3.5*
   (what-is-yoga, history, four paths, eight limbs, hatha, pranayama, gunas,
   chakras, styles, glossary), each cited. Deeper scholarship (full Yoga Sutras
   verse-by-verse, per-chakra deep dives) is out of scope for v1.
