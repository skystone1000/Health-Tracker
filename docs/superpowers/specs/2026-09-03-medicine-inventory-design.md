# Design — Medicine Inventory

**Status:** Approved design (2026-09-03). Next step: implementation plan.
**Feature:** A curated medicine reference library plus a personal "my cabinet"
stock layer, covering **allopathy**, **homeopathy**, and **biochemic** medicines.

Read alongside [ARCHITECTURE.md](../../ARCHITECTURE.md),
[CODEBASE.md](../../CODEBASE.md) and [FEATURES.md](../../FEATURES.md).

---

## 1. Goal & non-goals

**Goal.** Let the user browse a curated, cited library of common medicines and
mark which ones they personally own — with quantity and expiry — so they can see
at a glance what is in their cabinet, what is expiring, and what is running low.
Mirrors how **Foods** already work: pristine curated defaults + a persisted
personal layer (custom entries and overrides).

**Non-goals (deliberate, for safety and YAGNI).**

- **No recommender.** No "what should I take for X" engine.
- **No dose calculator** and **no drug-interaction checker** in v1.
- **No effect on nutrition or activity.** The medicine domain does not touch
  nutrition targets, the `activityLog`, or the dashboard rings. It is a fully
  independent bounded domain, consistent with the exercise↔yoga isolation rule.
- **Informational only**, with a prominent not-medical-advice disclaimer on
  every detail view (same tone as the yoga contraindication disclaimer).

Dose reminders / "currently taking" scheduling are **roadmap**, not v1 — and true
background notifications are not possible in an offline SPA anyway.

---

## 2. Architecture fit

Medicine is a **new bounded pure domain** `src/core/medicine/`, a peer to
`nutrition`, `exercise/` and `yoga/`. It imports none of them. Following the
project's constraints:

- **`core/` stays pure** — no React/DOM/`fetch`. All shape, validation and
  derived-view logic lives here and is unit-tested.
- **Zod at the boundary** — seed JSON, custom/override edits, and imported
  backups all parse through `core/medicine/schema.ts`. Types are `z.infer`red.
- **Reuse the shared `Evidence` schema** from `core/schema.ts` (do not fork it).
- **Layered UI** — `src/features/medicine/` reads/writes the store and renders
  pure-core outputs; no business logic in components.

```
public/data/medicines.default.json      seed (validated on load)

src/core/medicine/
  schema.ts        Zod schemas + inferred types; MEDICINE_SYSTEMS, category enums
  filters.ts       search + system/category/owned filters (applyMedicineFilters)
  stock.ts         derived views: expiringSoon / expired / lowStock over stock
  data.test.ts     seed integrity: schema, >=2-evidence rule, category<->system
  filters.test.ts  filter unit tests
  stock.test.ts    derived-view unit tests

src/features/medicine/
  MedicineLibrary.tsx   searchable/filterable grid
  MedicineDetail.tsx    detail view + disclaimer
  MedicineEditor.tsx    add custom / edit-as-override + stock fields
  MyCabinet.tsx         owned items grouped by stock/expiry status
```

---

## 3. Data model (`core/medicine/schema.ts`)

### 3.1 Reference medicine

```ts
system:   "allopathy" | "homeopathy" | "biochemic"     // top-level filter
category: // system-scoped (see 3.2)
form:     "tablet" | "drops" | "dilution" | "globules"
        | "syrup" | "ointment" | "powder"
```

Fields:

| field             | type       | notes |
|-------------------|------------|-------|
| `id`              | string     | slug, unique |
| `name`            | string     | primary name (e.g. "Paracetamol", "Arnica Montana", "Calcarea Phosphorica") |
| `brandNames`      | string[]?  | e.g. ["Crocin", "Dolo 650"] |
| `system`          | enum       | see above |
| `category`        | enum       | system-scoped, see 3.2 |
| `form`            | enum       | see above |
| `potency`         | string?    | homeopathy/biochemic only, e.g. "30C", "200C", "6X", "1M" |
| `commonUses`      | string[]   | plain-language, informational |
| `dosageNote`      | string?    | informational text only — **not** a recommendation engine |
| `cautions`        | string[]   | general cautions |
| `contraindications`| string[]  | who should avoid |
| `tags`            | string[]   | cross-cutting, e.g. "fever", "cold", "skin" |
| `evidences`       | Evidence[] | shared schema; **>=2** => Verified ✓ |
| `source`          | "default" \| "user" | mirrors foods |

### 3.2 System-scoped categories

- **allopathy:** `analgesic · antipyretic · antibiotic · antacid ·
  antihistamine · cough-cold · antidiarrheal · supplement · topical · other`
- **homeopathy:** `mother-tincture · dilution · potency`
- **biochemic:** `tissue-salt · combination`
  (the 12 Schuessler tissue salts, e.g. *Calcarea Phosphorica 6X*, plus
  BC-No. combination formulas)

A data-integrity test asserts each medicine's `category` is valid **for its
`system`**.

### 3.3 Personal stock (the "my cabinet" layer)

```ts
MedicineStockEntry {
  medicineId: string          // references a default or custom medicine id
  owned: boolean
  quantity: number
  unit: "strips" | "tablets" | "ml" | "vials"
  expiryDate?: string         // ISO date
  notes?: string
}
```

### 3.4 Derived views (`core/medicine/stock.ts`, pure)

- `expiringSoon(stock, today, days = 30)` — owned, not expired, expiry within N days.
- `expired(stock, today)` — owned, expiry in the past.
- `lowStock(stock, threshold = 1)` — owned, `quantity <= threshold`.
- `cabinetSummary(stock, today)` — groups owned entries into
  `{ expired, expiringSoon, lowStock, ok }` for `MyCabinet.tsx`.

No dosing math. Deterministic; `today` is passed in (keeps core DOM/clock-free).

---

## 4. Persistence (the five-place rule)

Three new persisted slices, each wired in **all five** places
(ARCHITECTURE.md §Constraints):

| slice               | holds |
|---------------------|-------|
| `customMedicines`   | user-added medicines (`source: "user"`) |
| `medicineOverrides` | edits to default medicines (defaults stay pristine) |
| `medicineStock`     | `MedicineStockEntry[]` — the personal cabinet |

Wire into: (1) store state + `partialize`, (2) `core/backup.ts` `BackupSchema`,
(3) `exportBackup`, (4) `importBackup`, (5) `resetUserData`. Add store selectors
mirroring foods: `selectAllMedicines` (defaults + overrides + custom merged),
`selectMedicinesById`.

---

## 5. UI

New `/medicine` route (`src/App.tsx`) + a nav entry in
`src/components/Layout.tsx`. Uses the existing shadcn-style primitives in
`src/components/ui.tsx` — no new UI library.

- **`MedicineLibrary.tsx`** — searchable grid. Filters: **system**, **category**
  (scoped to the chosen system), and an **"owned only"** toggle. Each card shows
  name/brand, form, a **Verified ✓ / Needs review** badge, and an **"In my
  cabinet"** badge when owned.
- **`MedicineDetail.tsx`** — common uses, dosage note, cautions,
  who-should-avoid, tags, evidences, and a **prominent not-medical-advice
  disclaimer**.
- **`MedicineEditor.tsx`** — add a custom medicine or edit a default (stored as
  an override; defaults stay pristine). Also edits the **stock fields**
  (owned / quantity / unit / expiry / notes) for that medicine.
- **`MyCabinet.tsx`** — owned medicines grouped into **Expiring soon /
  Expired / Low stock / OK**, driven by `cabinetSummary`.

---

## 6. Seed data (`public/data/medicines.default.json`)

Curated starter set spanning all three systems, each with **>=2 evidences**:

- **Allopathy** — popular OTC tablets: Paracetamol, Ibuprofen, Cetirizine,
  Antacid, ORS, etc.
- **Homeopathy** — common remedies across mother-tincture / dilution / potency
  (e.g. Arnica Montana, Nux Vomica, Belladonna) with a `potency` field.
- **Biochemic** — the 12 Schuessler tissue salts + a couple of BC combinations.

Evidence sources are authoritative references (e.g. official pharmacopoeia /
manufacturer monographs / recognized reference texts). Enforced by
`core/medicine/data.test.ts`.

---

## 7. Testing (definition of done)

- `core/medicine/data.test.ts` — seed validates against schema; every default
  has **>=2 evidences**; every `category` is legal for its `system`.
- `core/medicine/filters.test.ts` — search + system/category/owned filters.
- `core/medicine/stock.test.ts` — `expiringSoon` / `expired` / `lowStock` /
  `cabinetSummary` boundaries (e.g. expiry exactly at 30 days, quantity at
  threshold).
- Green `npm run typecheck && npm test && npm run build`.
- UI verified in the browser preview (library filter, mark-owned, cabinet
  grouping) before claiming done.

---

## 8. Docs to update on implementation

Per CLAUDE.md §2, the same change must update:

- `docs/FEATURES.md` — new "Medicine inventory" feature section.
- `docs/CODEBASE.md` — new files, the `/medicine` route, and "I want to… →
  open this" rows (add/edit a default medicine; change stock/expiry logic).
- `docs/ARCHITECTURE.md` — note the new bounded domain and the three new
  persisted slices in the constraints list.
- `README.md` — if user-facing usage/setup changes.
- (Optional) a `docs/ADD_MEDICINE.md` "how to add one medicine" guide, matching
  `ADD_YOGA_ASANA.md` / `ADD_EXERCISE.md`, if we want the data shape to be
  self-serve. Recommended but can follow the first implementation.

---

## 9. Roadmap (explicitly out of v1)

- "Currently taking" schedule + dose reminders.
- Multi-item quick-add / barcode.
- Interaction / duplicate-ingredient warnings.
- Growing the seed set via the `tools/ingest/` build-time pipeline.
