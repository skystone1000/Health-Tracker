# Medicine Inventory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a curated medicine reference library (allopathy / homeopathy / biochemic) plus a personal "my cabinet" stock layer (quantity + expiry), as a new bounded pure domain that mirrors the Foods default+custom/override pattern.

**Architecture:** New pure domain `src/core/medicine/` (peer to `nutrition`, `exercise/`, `yoga/`, imports none of them): Zod schema, filters, and pure stock/expiry derived-views. A baked seed JSON (`public/data/medicines.default.json`) loaded at startup. Three new persisted store slices (`customMedicines`, `medicineOverrides`, `medicineStock`) wired through the five persistence sites. A `src/features/medicine/` React area with library/detail/editor/cabinet screens on a new `/medicine` route. Informational only — no recommender, no dosing, no effect on nutrition targets or `activityLog`.

**Tech Stack:** React 18 · Vite · TypeScript (strict) · Tailwind (hand-built shadcn-style primitives in `src/components/ui.tsx`) · Zustand · Zod · Vitest. Imports use the `@/` alias.

**Design spec:** [`docs/superpowers/specs/2026-09-03-medicine-inventory-design.md`](../specs/2026-09-03-medicine-inventory-design.md)

---

## File structure

```
public/data/medicines.default.json         seed (validated on load)

src/core/medicine/
  schema.ts        Zod schemas + inferred types; MEDICINE_SYSTEMS, category enums, forms, units
  schema.test.ts   schema unit tests (category<->system refinement)
  filters.ts       search + system/category/owned filters (applyMedicineFilters) + categoriesForSystem
  filters.test.ts  filter unit tests
  stock.ts         pure derived views: expiringSoon / expired / lowStock / cabinetSummary
  stock.test.ts    derived-view unit tests
  data.test.ts     seed integrity: schema, >=2-evidence rule, unique ids, system coverage

src/lib/
  medicine.ts      display labels (SYSTEM/CATEGORY/FORM/UNIT) — presentation only

src/features/medicine/
  MedicineLibrary.tsx   searchable/filterable grid + "owned only" toggle
  MedicineDetail.tsx    read-only detail + not-medical-advice disclaimer
  MedicineEditor.tsx    add custom / edit-as-override + stock (owned/qty/expiry) editor
  MyCabinet.tsx         owned items grouped by expiry/stock status

Modified:
  src/core/backup.ts         add 3 slices to BackupSchema
  src/store/useAppStore.ts   state, init load, actions, selectors, export/import/reset/partialize
  src/App.tsx                routes
  src/components/Layout.tsx  nav entry
  docs/FEATURES.md, docs/CODEBASE.md, docs/ARCHITECTURE.md
```

**Test command reference (this repo):**
- Single file: `npx vitest run src/core/medicine/schema.test.ts`
- All tests: `npm test` (which is `vitest run`)
- Types: `npm run typecheck`
- Build: `npm run build`

---

## Task 1: Medicine domain schema

**Files:**
- Create: `src/core/medicine/schema.ts`
- Test: `src/core/medicine/schema.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/core/medicine/schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  MedicineSchema,
  MedicineStockEntrySchema,
  categoriesForSystem,
  MEDICINE_SYSTEMS,
} from "./schema";

const baseMedicine = {
  id: "paracetamol",
  name: "Paracetamol",
  system: "allopathy",
  category: "analgesic",
  form: "tablet",
  commonUses: ["Fever", "Mild pain"],
  evidences: [
    { source: "WHO EML", ref: "2023" },
    { source: "NHS medicines", ref: "Paracetamol" },
  ],
};

describe("MedicineSchema", () => {
  it("parses a valid allopathy medicine and applies array defaults", () => {
    const m = MedicineSchema.parse(baseMedicine);
    expect(m.brandNames).toEqual([]);
    expect(m.cautions).toEqual([]);
    expect(m.contraindications).toEqual([]);
    expect(m.tags).toEqual([]);
    expect(m.source).toBe("default");
    expect(m.verification.status).toBe("unverified");
  });

  it("rejects a category that does not belong to the system", () => {
    const bad = { ...baseMedicine, system: "homeopathy", category: "analgesic" };
    const parsed = MedicineSchema.safeParse(bad);
    expect(parsed.success).toBe(false);
  });

  it("accepts a homeopathy medicine with a valid category + potency", () => {
    const m = MedicineSchema.parse({
      id: "arnica-30c",
      name: "Arnica Montana",
      system: "homeopathy",
      category: "potency",
      form: "globules",
      potency: "30C",
      commonUses: ["Bruises"],
      evidences: [
        { source: "GHP", ref: "Arnica" },
        { source: "HPUS", ref: "Arnica montana" },
      ],
    });
    expect(m.potency).toBe("30C");
  });

  it("exposes the valid categories for each system", () => {
    expect(categoriesForSystem("biochemic")).toContain("tissue-salt");
    expect(categoriesForSystem("homeopathy")).toContain("mother-tincture");
    expect(MEDICINE_SYSTEMS).toHaveLength(3);
  });
});

describe("MedicineStockEntrySchema", () => {
  it("parses a stock entry with defaults", () => {
    const s = MedicineStockEntrySchema.parse({
      medicineId: "paracetamol",
      owned: true,
      quantity: 2,
      unit: "strips",
    });
    expect(s.owned).toBe(true);
    expect(s.expiryDate).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/core/medicine/schema.test.ts`
Expected: FAIL — cannot resolve module `./schema`.

- [ ] **Step 3: Write minimal implementation**

Create `src/core/medicine/schema.ts`:

```ts
import { z } from "zod";
import { EvidenceSchema, VerificationSchema } from "@/core/schema";

/**
 * Medicine domain — a curated reference library across three systems plus a
 * personal "cabinet" stock layer. Pure (no React/DOM/fetch). Deliberately
 * informational: no dosing engine, no recommender, no interaction checker.
 */

export const MEDICINE_SYSTEMS = ["allopathy", "homeopathy", "biochemic"] as const;
export const MedicineSystemSchema = z.enum(MEDICINE_SYSTEMS);
export type MedicineSystem = z.infer<typeof MedicineSystemSchema>;

// Categories are scoped to a system (enforced by the refinement below).
export const ALLOPATHY_CATEGORIES = [
  "analgesic",
  "antipyretic",
  "antibiotic",
  "antacid",
  "antihistamine",
  "cough-cold",
  "antidiarrheal",
  "supplement",
  "topical",
  "other",
] as const;
export const HOMEOPATHY_CATEGORIES = [
  "mother-tincture",
  "dilution",
  "potency",
] as const;
export const BIOCHEMIC_CATEGORIES = ["tissue-salt", "combination"] as const;

// Union of every category (all distinct across systems — no collisions).
export const MEDICINE_CATEGORIES = [
  ...ALLOPATHY_CATEGORIES,
  ...HOMEOPATHY_CATEGORIES,
  ...BIOCHEMIC_CATEGORIES,
] as const;
export const MedicineCategorySchema = z.enum(MEDICINE_CATEGORIES);
export type MedicineCategory = z.infer<typeof MedicineCategorySchema>;

export const CATEGORIES_BY_SYSTEM: Record<
  MedicineSystem,
  readonly MedicineCategory[]
> = {
  allopathy: ALLOPATHY_CATEGORIES,
  homeopathy: HOMEOPATHY_CATEGORIES,
  biochemic: BIOCHEMIC_CATEGORIES,
};

/** Valid categories for a given system (drives the scoped category dropdown). */
export function categoriesForSystem(
  system: MedicineSystem,
): readonly MedicineCategory[] {
  return CATEGORIES_BY_SYSTEM[system];
}

export const MEDICINE_FORMS = [
  "tablet",
  "drops",
  "dilution",
  "globules",
  "syrup",
  "ointment",
  "powder",
] as const;
export const MedicineFormSchema = z.enum(MEDICINE_FORMS);
export type MedicineForm = z.infer<typeof MedicineFormSchema>;

export const STOCK_UNITS = ["strips", "tablets", "ml", "vials"] as const;
export const StockUnitSchema = z.enum(STOCK_UNITS);
export type StockUnit = z.infer<typeof StockUnitSchema>;

export const MedicineSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    brandNames: z.array(z.string()).default([]),
    system: MedicineSystemSchema,
    category: MedicineCategorySchema,
    form: MedicineFormSchema,
    // homeopathy/biochemic potency label, e.g. "30C", "200C", "6X", "Q"
    potency: z.string().optional(),
    commonUses: z.array(z.string()).default([]),
    dosageNote: z.string().optional(), // informational only — NOT a recommender
    cautions: z.array(z.string()).default([]),
    contraindications: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    evidences: z.array(EvidenceSchema).default([]),
    verification: VerificationSchema.default({
      status: "unverified",
      confidence: "low",
    }),
    source: z.enum(["default", "user"]).default("default"),
  })
  .superRefine((m, ctx) => {
    const allowed = CATEGORIES_BY_SYSTEM[m.system] as readonly string[];
    if (!allowed.includes(m.category)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `category "${m.category}" is not valid for system "${m.system}"`,
        path: ["category"],
      });
    }
  });
export type Medicine = z.infer<typeof MedicineSchema>;

/** Personal cabinet entry — what the user owns of a given medicine. */
export const MedicineStockEntrySchema = z.object({
  medicineId: z.string(),
  owned: z.boolean().default(true),
  quantity: z.number().nonnegative().default(0),
  unit: StockUnitSchema.default("strips"),
  expiryDate: z.string().optional(), // ISO "YYYY-MM-DD"
  notes: z.string().optional(),
});
export type MedicineStockEntry = z.infer<typeof MedicineStockEntrySchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/core/medicine/schema.test.ts`
Expected: PASS (4 + 1 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/medicine/schema.ts src/core/medicine/schema.test.ts
git commit -m "Feature - Medicine domain schema (systems, categories, stock)"
```

---

## Task 2: Medicine filters

**Files:**
- Create: `src/core/medicine/filters.ts`
- Test: `src/core/medicine/filters.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/core/medicine/filters.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { MedicineSchema, type Medicine } from "./schema";
import { applyMedicineFilters } from "./filters";

const make = (over: Partial<Medicine> & { id: string }): Medicine =>
  MedicineSchema.parse({
    name: over.id,
    system: "allopathy",
    category: "analgesic",
    form: "tablet",
    ...over,
  });

const list: Medicine[] = [
  make({ id: "paracetamol", name: "Paracetamol", brandNames: ["Crocin"] }),
  make({ id: "cetirizine", name: "Cetirizine", category: "antihistamine" }),
  make({ id: "arnica", name: "Arnica", system: "homeopathy", category: "potency" }),
];

describe("applyMedicineFilters", () => {
  it("returns everything with an empty filter", () => {
    expect(applyMedicineFilters(list, {})).toHaveLength(3);
  });

  it("searches name and brand names case-insensitively", () => {
    expect(applyMedicineFilters(list, { search: "crocin" }).map((m) => m.id)).toEqual([
      "paracetamol",
    ]);
  });

  it("filters by system", () => {
    expect(
      applyMedicineFilters(list, { system: "homeopathy" }).map((m) => m.id),
    ).toEqual(["arnica"]);
  });

  it("filters by category", () => {
    expect(
      applyMedicineFilters(list, { category: "antihistamine" }).map((m) => m.id),
    ).toEqual(["cetirizine"]);
  });

  it("filters to owned-only using the supplied owned-id set", () => {
    const owned = new Set(["paracetamol"]);
    expect(
      applyMedicineFilters(list, { ownedOnly: true }, owned).map((m) => m.id),
    ).toEqual(["paracetamol"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/core/medicine/filters.test.ts`
Expected: FAIL — cannot resolve `./filters`.

- [ ] **Step 3: Write minimal implementation**

Create `src/core/medicine/filters.ts`:

```ts
import type { Medicine, MedicineCategory, MedicineSystem } from "./schema";

export interface MedicineFilter {
  search?: string;
  system?: MedicineSystem;
  category?: MedicineCategory;
  ownedOnly?: boolean;
}

/**
 * Single source of truth for medicine selection — used by the library UI.
 * `ownedIds` is the set of medicine ids the user owns (from the stock layer);
 * only consulted when `ownedOnly` is set, keeping this function pure.
 */
export function applyMedicineFilters(
  list: Medicine[],
  f: MedicineFilter,
  ownedIds: ReadonlySet<string> = new Set(),
): Medicine[] {
  const q = f.search?.trim().toLowerCase();
  return list.filter((m) => {
    if (q) {
      const hay = [m.name, ...m.brandNames, ...m.tags].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (f.system && m.system !== f.system) return false;
    if (f.category && m.category !== f.category) return false;
    if (f.ownedOnly && !ownedIds.has(m.id)) return false;
    return true;
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/core/medicine/filters.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/medicine/filters.ts src/core/medicine/filters.test.ts
git commit -m "Feature - Medicine filters (search/system/category/owned)"
```

---

## Task 3: Stock derived views (expiry / low stock / cabinet grouping)

**Files:**
- Create: `src/core/medicine/stock.ts`
- Test: `src/core/medicine/stock.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/core/medicine/stock.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { MedicineStockEntry } from "./schema";
import { cabinetSummary, expired, expiringSoon, lowStock } from "./stock";

const today = "2026-09-03";

const entry = (
  over: Partial<MedicineStockEntry> & { medicineId: string },
): MedicineStockEntry => ({
  owned: true,
  quantity: 5,
  unit: "strips",
  ...over,
});

describe("stock derived views", () => {
  const stock: MedicineStockEntry[] = [
    entry({ medicineId: "past", expiryDate: "2026-08-01" }), // expired
    entry({ medicineId: "soon", expiryDate: "2026-09-20" }), // within 30 days
    entry({ medicineId: "edge", expiryDate: "2026-10-03" }), // exactly +30 days => soon
    entry({ medicineId: "far", expiryDate: "2027-01-01" }), // ok
    entry({ medicineId: "low", quantity: 1, expiryDate: "2027-01-01" }), // low stock
    entry({ medicineId: "unowned", owned: false, expiryDate: "2026-08-01" }), // ignored
    entry({ medicineId: "nodate", expiryDate: undefined }), // ok, no expiry
  ];

  it("expired lists only owned items with a past expiry", () => {
    expect(expired(stock, today).map((e) => e.medicineId)).toEqual(["past"]);
  });

  it("expiringSoon includes the exact 30-day boundary, excludes expired", () => {
    expect(expiringSoon(stock, today).map((e) => e.medicineId).sort()).toEqual([
      "edge",
      "soon",
    ]);
  });

  it("lowStock lists owned items at or below the threshold", () => {
    expect(lowStock(stock, 1).map((e) => e.medicineId)).toEqual(["low"]);
  });

  it("cabinetSummary buckets each owned entry once, by priority", () => {
    const s = cabinetSummary(stock, today);
    expect(s.expired.map((e) => e.medicineId)).toEqual(["past"]);
    expect(s.expiringSoon.map((e) => e.medicineId).sort()).toEqual(["edge", "soon"]);
    expect(s.lowStock.map((e) => e.medicineId)).toEqual(["low"]);
    expect(s.ok.map((e) => e.medicineId).sort()).toEqual(["far", "nodate"]);
    // "unowned" appears in no bucket
    const all = [...s.expired, ...s.expiringSoon, ...s.lowStock, ...s.ok];
    expect(all.some((e) => e.medicineId === "unowned")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/core/medicine/stock.test.ts`
Expected: FAIL — cannot resolve `./stock`.

- [ ] **Step 3: Write minimal implementation**

Create `src/core/medicine/stock.ts`:

```ts
import type { MedicineStockEntry } from "./schema";

/** Deterministic date arithmetic on ISO "YYYY-MM-DD" strings (UTC, no clock). */
function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const owned = (s: MedicineStockEntry[]) => s.filter((e) => e.owned);

/** Owned items whose expiry is strictly before `today`. */
export function expired(
  stock: MedicineStockEntry[],
  today: string,
): MedicineStockEntry[] {
  return owned(stock).filter((e) => e.expiryDate !== undefined && e.expiryDate < today);
}

/** Owned items expiring within `days` (inclusive), not already expired. */
export function expiringSoon(
  stock: MedicineStockEntry[],
  today: string,
  days = 30,
): MedicineStockEntry[] {
  const limit = addDays(today, days);
  return owned(stock).filter(
    (e) =>
      e.expiryDate !== undefined && e.expiryDate >= today && e.expiryDate <= limit,
  );
}

/** Owned items at or below the quantity threshold. */
export function lowStock(
  stock: MedicineStockEntry[],
  threshold = 1,
): MedicineStockEntry[] {
  return owned(stock).filter((e) => e.quantity <= threshold);
}

export interface CabinetSummary {
  expired: MedicineStockEntry[];
  expiringSoon: MedicineStockEntry[];
  lowStock: MedicineStockEntry[];
  ok: MedicineStockEntry[];
}

/**
 * Group owned entries into exactly one bucket each, by priority:
 * expired > expiringSoon > lowStock > ok. Drives the "My cabinet" screen.
 */
export function cabinetSummary(
  stock: MedicineStockEntry[],
  today: string,
  opts: { soonDays?: number; lowThreshold?: number } = {},
): CabinetSummary {
  const soonDays = opts.soonDays ?? 30;
  const lowThreshold = opts.lowThreshold ?? 1;
  const limit = addDays(today, soonDays);
  const summary: CabinetSummary = {
    expired: [],
    expiringSoon: [],
    lowStock: [],
    ok: [],
  };
  for (const e of owned(stock)) {
    if (e.expiryDate !== undefined && e.expiryDate < today) summary.expired.push(e);
    else if (e.expiryDate !== undefined && e.expiryDate <= limit)
      summary.expiringSoon.push(e);
    else if (e.quantity <= lowThreshold) summary.lowStock.push(e);
    else summary.ok.push(e);
  }
  return summary;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/core/medicine/stock.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/medicine/stock.ts src/core/medicine/stock.test.ts
git commit -m "Feature - Medicine stock derived views (expiry/low-stock/cabinet)"
```

---

## Task 4: Display labels

**Files:**
- Create: `src/lib/medicine.ts`

Presentation-only maps (no tests — pure constant lookups, exercised by the UI).

- [ ] **Step 1: Create the labels module**

Create `src/lib/medicine.ts`:

```ts
import type {
  MedicineCategory,
  MedicineForm,
  MedicineSystem,
  StockUnit,
} from "@/core/medicine/schema";

export const SYSTEM_LABELS: Record<MedicineSystem, string> = {
  allopathy: "Allopathy",
  homeopathy: "Homeopathy",
  biochemic: "Biochemic",
};

export const CATEGORY_LABELS: Record<MedicineCategory, string> = {
  // allopathy
  analgesic: "Analgesic",
  antipyretic: "Antipyretic",
  antibiotic: "Antibiotic",
  antacid: "Antacid",
  antihistamine: "Antihistamine",
  "cough-cold": "Cough & cold",
  antidiarrheal: "Antidiarrheal",
  supplement: "Supplement",
  topical: "Topical",
  other: "Other",
  // homeopathy
  "mother-tincture": "Mother tincture",
  dilution: "Dilution",
  potency: "Potency",
  // biochemic
  "tissue-salt": "Tissue salt",
  combination: "Combination",
};

export const FORM_LABELS: Record<MedicineForm, string> = {
  tablet: "Tablet",
  drops: "Drops",
  dilution: "Dilution",
  globules: "Globules",
  syrup: "Syrup",
  ointment: "Ointment",
  powder: "Powder",
};

export const UNIT_LABELS: Record<StockUnit, string> = {
  strips: "strips",
  tablets: "tablets",
  ml: "ml",
  vials: "vials",
};
```

- [ ] **Step 2: Verify it type-checks**

Run: `npm run typecheck`
Expected: PASS (no errors). If a `Record<...>` complains about a missing key, add the missing label — the map must be exhaustive.

- [ ] **Step 3: Commit**

```bash
git add src/lib/medicine.ts
git commit -m "Feature - Medicine display labels"
```

---

## Task 5: Seed data + integrity test

**Files:**
- Create: `public/data/medicines.default.json`
- Test: `src/core/medicine/data.test.ts`

- [ ] **Step 1: Write the failing integrity test**

Create `src/core/medicine/data.test.ts` (mirrors `yoga/data.test.ts`):

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CATEGORIES_BY_SYSTEM,
  MEDICINE_SYSTEMS,
  MedicineSchema,
  type Medicine,
} from "./schema";

const read = (rel: string) =>
  JSON.parse(readFileSync(resolve(__dirname, "../../../public/data", rel), "utf-8"));

describe("medicine seed data integrity", () => {
  const raw = read("medicines.default.json");
  const medicines: Medicine[] = raw.map((m: unknown) => MedicineSchema.parse(m));

  it("every default medicine matches the Medicine schema", () => {
    for (const m of raw) {
      const parsed = MedicineSchema.safeParse(m);
      if (!parsed.success) throw new Error(`${m.id}: ${parsed.error.message}`);
      expect(parsed.success).toBe(true);
    }
  });

  it("medicine ids are unique", () => {
    const ids = medicines.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every default medicine carries >=2 evidences", () => {
    for (const m of medicines)
      expect(m.evidences.length, m.id).toBeGreaterThanOrEqual(2);
  });

  it("every category is valid for its system", () => {
    for (const m of medicines) {
      const allowed = CATEGORIES_BY_SYSTEM[m.system] as readonly string[];
      expect(allowed.includes(m.category), `${m.id}: ${m.category}`).toBe(true);
    }
  });

  it("covers every medicine system", () => {
    const systems = new Set(medicines.map((m) => m.system));
    for (const s of MEDICINE_SYSTEMS) expect(systems.has(s), s).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/core/medicine/data.test.ts`
Expected: FAIL — cannot read `medicines.default.json` (ENOENT).

- [ ] **Step 3: Create the seed file**

Create `public/data/medicines.default.json`. Eight curated entries spanning all three systems; each has ≥2 evidences. All `verification.status` is `"unverified"` for now (evidence review is a separate curation pass; the ≥2-evidence test still passes).

```json
[
  {
    "id": "paracetamol",
    "name": "Paracetamol",
    "brandNames": ["Crocin", "Dolo 650", "Calpol"],
    "system": "allopathy",
    "category": "analgesic",
    "form": "tablet",
    "commonUses": ["Fever", "Mild to moderate pain", "Headache"],
    "dosageNote": "Commonly sold as 500 mg / 650 mg tablets. Follow the package leaflet or a clinician; do not exceed the stated daily maximum.",
    "cautions": ["Overdose can cause serious liver damage", "Avoid combining multiple paracetamol-containing products"],
    "contraindications": ["Severe liver disease"],
    "tags": ["fever", "pain", "otc"],
    "evidences": [
      { "source": "WHO Model List of Essential Medicines", "ref": "23rd list, 2023", "url": "https://www.who.int/publications/i/item/WHO-MHP-HPS-EML-2023.02" },
      { "source": "NHS medicines A to Z", "ref": "Paracetamol", "url": "https://www.nhs.uk/medicines/paracetamol-for-adults/" }
    ]
  },
  {
    "id": "cetirizine",
    "name": "Cetirizine",
    "brandNames": ["Zyrtec", "Cetzine", "Alerid"],
    "system": "allopathy",
    "category": "antihistamine",
    "form": "tablet",
    "commonUses": ["Allergic rhinitis", "Hives", "Itching"],
    "dosageNote": "Typically one 10 mg tablet daily for adults. Follow the leaflet or a clinician.",
    "cautions": ["May cause drowsiness in some people"],
    "contraindications": ["Severe kidney disease without dose adjustment"],
    "tags": ["allergy", "antihistamine", "otc"],
    "evidences": [
      { "source": "WHO Model List of Essential Medicines", "ref": "23rd list, 2023" },
      { "source": "NHS medicines A to Z", "ref": "Cetirizine", "url": "https://www.nhs.uk/medicines/cetirizine/" }
    ]
  },
  {
    "id": "ors",
    "name": "Oral Rehydration Salts (ORS)",
    "brandNames": ["Electral", "WHO ORS"],
    "system": "allopathy",
    "category": "supplement",
    "form": "powder",
    "commonUses": ["Rehydration during diarrhoea", "Fluid and electrolyte replacement"],
    "dosageNote": "Dissolve one sachet in the volume of clean water stated on the packet. Discard unused solution after 24 hours.",
    "cautions": ["Use the exact water volume on the packet — do not over-concentrate"],
    "contraindications": ["Severe dehydration needing intravenous fluids"],
    "tags": ["diarrhoea", "hydration", "otc"],
    "evidences": [
      { "source": "WHO Model List of Essential Medicines", "ref": "Oral rehydration salts" },
      { "source": "WHO/UNICEF ORS guidance", "ref": "Low-osmolarity ORS" }
    ]
  },
  {
    "id": "loperamide",
    "name": "Loperamide",
    "brandNames": ["Imodium"],
    "system": "allopathy",
    "category": "antidiarrheal",
    "form": "tablet",
    "commonUses": ["Short-term relief of acute diarrhoea"],
    "dosageNote": "Follow the package leaflet; not for use when there is blood in the stool or high fever.",
    "cautions": ["Do not use for more than the stated duration without advice"],
    "contraindications": ["Dysentery (blood in stool with fever)", "Children under the labelled age"],
    "tags": ["diarrhoea", "otc"],
    "evidences": [
      { "source": "NHS medicines A to Z", "ref": "Loperamide", "url": "https://www.nhs.uk/medicines/loperamide/" },
      { "source": "WHO Model List of Essential Medicines", "ref": "Loperamide" }
    ]
  },
  {
    "id": "arnica-montana-30c",
    "name": "Arnica Montana",
    "brandNames": [],
    "system": "homeopathy",
    "category": "potency",
    "form": "globules",
    "potency": "30C",
    "commonUses": ["Traditionally used for bruises and soreness after minor injury"],
    "dosageNote": "Homeopathic potency preparation. There is no accepted conventional-medicine dosing; follow a qualified homeopath.",
    "cautions": ["Homeopathic remedies are not a substitute for medical care in serious injury"],
    "contraindications": [],
    "tags": ["bruise", "injury"],
    "evidences": [
      { "source": "German Homoeopathic Pharmacopoeia (GHP)", "ref": "Arnica montana" },
      { "source": "Homoeopathic Pharmacopoeia of the United States (HPUS)", "ref": "Arnica montana" }
    ]
  },
  {
    "id": "calendula-q",
    "name": "Calendula Officinalis (Mother Tincture)",
    "brandNames": [],
    "system": "homeopathy",
    "category": "mother-tincture",
    "form": "drops",
    "potency": "Q",
    "commonUses": ["Traditionally used topically, diluted, for minor skin irritation"],
    "dosageNote": "Mother tincture (Q). Dilute as directed; follow a qualified homeopath.",
    "cautions": ["For external use as directed; avoid on deep or infected wounds"],
    "contraindications": ["Known allergy to Asteraceae/daisy family plants"],
    "tags": ["skin", "topical"],
    "evidences": [
      { "source": "German Homoeopathic Pharmacopoeia (GHP)", "ref": "Calendula officinalis" },
      { "source": "Homoeopathic Pharmacopoeia of the United States (HPUS)", "ref": "Calendula officinalis" }
    ]
  },
  {
    "id": "calcarea-phosphorica-6x",
    "name": "Calcarea Phosphorica 6X",
    "brandNames": [],
    "system": "biochemic",
    "category": "tissue-salt",
    "form": "tablet",
    "potency": "6X",
    "commonUses": ["One of the 12 Schuessler biochemic tissue salts; traditionally associated with bone and teeth support"],
    "dosageNote": "Biochemic tissue-salt tablet, usually taken as directed on the label or by a practitioner.",
    "cautions": ["Traditional biochemic use; not a substitute for medical care"],
    "contraindications": [],
    "tags": ["tissue-salt", "schuessler"],
    "evidences": [
      { "source": "Schuessler biochemic tissue salts reference", "ref": "Calcarea phosphorica (No. 2)" },
      { "source": "German Homoeopathic Pharmacopoeia (GHP)", "ref": "Calcarea phosphorica" }
    ]
  },
  {
    "id": "bio-combination-6",
    "name": "Bio-Combination 6 (Cough & Cold)",
    "brandNames": [],
    "system": "biochemic",
    "category": "combination",
    "form": "tablet",
    "commonUses": ["A traditional biochemic combination of tissue salts marketed for cough and cold symptoms"],
    "dosageNote": "Combination biochemic tablet; take as directed on the label or by a practitioner.",
    "cautions": ["Traditional biochemic use; seek medical care if symptoms are severe or persistent"],
    "contraindications": [],
    "tags": ["cough", "cold", "combination"],
    "evidences": [
      { "source": "Schuessler biochemic tissue salts reference", "ref": "Bio-combination formulas" },
      { "source": "Manufacturer product monograph", "ref": "Bio-Combination 6" }
    ]
  }
]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/core/medicine/data.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add public/data/medicines.default.json src/core/medicine/data.test.ts
git commit -m "Feature - Medicine seed data + integrity test"
```

---

## Task 6: Backup schema — add the three slices

**Files:**
- Modify: `src/core/backup.ts`

- [ ] **Step 1: Add the medicine import**

In `src/core/backup.ts`, after the yoga import line
`import { AsanaSchema, SequenceSchema } from "@/core/yoga/schema";`
add:

```ts
import { MedicineSchema, MedicineStockEntrySchema } from "@/core/medicine/schema";
```

- [ ] **Step 2: Add the three slices to BackupSchema**

In the `BackupSchema` object, after the line
`activityLog: z.array(ActivityLogEntrySchema).default([]),`
add (still inside the `z.object({ ... })`):

```ts
  // medicine
  customMedicines: z.array(MedicineSchema).default([]),
  medicineOverrides: z.record(z.string(), MedicineSchema).default({}),
  medicineStock: z.array(MedicineStockEntrySchema).default([]),
```

- [ ] **Step 3: Verify types compile**

Run: `npm run typecheck`
Expected: PASS. (Existing store `exportBackup` still satisfies `Backup` because the new fields have `.default(...)`; Task 7 fills them in explicitly next.)

- [ ] **Step 4: Commit**

```bash
git add src/core/backup.ts
git commit -m "Feature - Backup schema includes medicine slices"
```

---

## Task 7: Store wiring (state, load, actions, selectors, persistence)

**Files:**
- Modify: `src/store/useAppStore.ts`

This wires the medicine domain into all five persistence sites plus the load step and selectors. Do the edits in order.

- [ ] **Step 1: Add imports**

After the yoga import block
```ts
import { AsanaSchema, type Asana, type Sequence } from "@/core/yoga/schema";
```
add:

```ts
import {
  MedicineSchema,
  type Medicine,
  type MedicineStockEntry,
} from "@/core/medicine/schema";
```

- [ ] **Step 2: Add state fields to the `AppState` interface**

In the `// ---- loaded reference data (not persisted) ----` block, after
`defaultAsanas: Asana[];` add:

```ts
  defaultMedicines: Medicine[];
```

In the `// ---- persisted user data ----` block, after
`activityLog: ActivityLogEntry[];` add:

```ts
  customMedicines: Medicine[];
  medicineOverrides: Record<string, Medicine>;
  medicineStock: MedicineStockEntry[];
```

- [ ] **Step 3: Add action signatures to `AppState`**

In the `// movement actions` region, after `deleteActivity: (id: string) => void;`
add:

```ts
  // medicine actions
  upsertMedicine: (medicine: Medicine) => void;
  deleteMedicine: (id: string) => void;
  resetMedicine: (id: string) => void;
  setStock: (entry: MedicineStockEntry) => void;
  deleteStock: (medicineId: string) => void;
```

- [ ] **Step 4: Add the array parse schema**

After `const AsanaArraySchema = z.array(AsanaSchema);` add:

```ts
const MedicineArraySchema = z.array(MedicineSchema);
```

- [ ] **Step 5: Add initial state values**

In the store body's initial reference-data block, after `defaultAsanas: [],` add:

```ts
      defaultMedicines: [],
```

In the initial persisted block, after `activityLog: [],` add:

```ts
      customMedicines: [],
      medicineOverrides: {},
      medicineStock: [],
```

- [ ] **Step 6: Load the seed in `init()`**

In `init()`, extend the `Promise.all` fetch list and the parse. Replace the
destructured fetch call:

```ts
          const [foodsRes, rdaRes, recipesRes, exercisesRes, asanasRes] =
            await Promise.all([
              fetch("/data/foods.default.json"),
              fetch("/data/rda.icmr-nin-2020.json"),
              fetch("/data/recipes.default.json"),
              fetch("/data/exercises.default.json"),
              fetch("/data/asanas.default.json"),
            ]);
```

with:

```ts
          const [
            foodsRes,
            rdaRes,
            recipesRes,
            exercisesRes,
            asanasRes,
            medicinesRes,
          ] = await Promise.all([
            fetch("/data/foods.default.json"),
            fetch("/data/rda.icmr-nin-2020.json"),
            fetch("/data/recipes.default.json"),
            fetch("/data/exercises.default.json"),
            fetch("/data/asanas.default.json"),
            fetch("/data/medicines.default.json"),
          ]);
```

Replace the `if (...) throw` guard:

```ts
          if (
            !foodsRes.ok ||
            !rdaRes.ok ||
            !recipesRes.ok ||
            !exercisesRes.ok ||
            !asanasRes.ok
          )
            throw new Error("Failed to fetch seed data");
```

with:

```ts
          if (
            !foodsRes.ok ||
            !rdaRes.ok ||
            !recipesRes.ok ||
            !exercisesRes.ok ||
            !asanasRes.ok ||
            !medicinesRes.ok
          )
            throw new Error("Failed to fetch seed data");
```

After `const asanas = AsanaArraySchema.parse(await asanasRes.json());` add:

```ts
          const medicines = MedicineArraySchema.parse(await medicinesRes.json());
```

In the `set({ ... })` that follows, after `defaultAsanas: asanas,` add:

```ts
            defaultMedicines: medicines,
```

- [ ] **Step 7: Add the action implementations**

After the `deleteActivity` action implementation (the block ending
`activityLog: state.activityLog.filter((e) => e.id !== id),\n        })),`),
add:

```ts
      // ---- medicine actions ----
      upsertMedicine: (medicine) =>
        set((state) => {
          if (medicine.source === "user") {
            const exists = state.customMedicines.some(
              (m) => m.id === medicine.id,
            );
            return {
              customMedicines: exists
                ? state.customMedicines.map((m) =>
                    m.id === medicine.id ? medicine : m,
                  )
                : [...state.customMedicines, medicine],
            };
          }
          // editing a default → store an override (defaults stay pristine)
          return {
            medicineOverrides: {
              ...state.medicineOverrides,
              [medicine.id]: medicine,
            },
          };
        }),

      deleteMedicine: (id) =>
        set((state) => ({
          customMedicines: state.customMedicines.filter((m) => m.id !== id),
          medicineStock: state.medicineStock.filter((e) => e.medicineId !== id),
        })),

      resetMedicine: (id) =>
        set((state) => {
          const next = { ...state.medicineOverrides };
          delete next[id];
          return { medicineOverrides: next };
        }),

      setStock: (entry) =>
        set((state) => {
          const exists = state.medicineStock.some(
            (e) => e.medicineId === entry.medicineId,
          );
          return {
            medicineStock: exists
              ? state.medicineStock.map((e) =>
                  e.medicineId === entry.medicineId ? entry : e,
                )
              : [...state.medicineStock, entry],
          };
        }),

      deleteStock: (medicineId) =>
        set((state) => ({
          medicineStock: state.medicineStock.filter(
            (e) => e.medicineId !== medicineId,
          ),
        })),
```

- [ ] **Step 8: Wire export / import / reset / partialize**

In `exportBackup`'s returned object, after `activityLog: s.activityLog,` add:

```ts
          customMedicines: s.customMedicines,
          medicineOverrides: s.medicineOverrides,
          medicineStock: s.medicineStock,
```

In `importBackup`'s `set({ ... })`, after `activityLog: b.activityLog,` add:

```ts
          customMedicines: b.customMedicines,
          medicineOverrides: b.medicineOverrides,
          medicineStock: b.medicineStock,
```

In `resetUserData`'s `set({ ... })`, after `activityLog: [],` add:

```ts
          customMedicines: [],
          medicineOverrides: {},
          medicineStock: [],
```

In the `partialize` return, after `activityLog: state.activityLog,` add:

```ts
        customMedicines: state.customMedicines,
        medicineOverrides: state.medicineOverrides,
        medicineStock: state.medicineStock,
```

- [ ] **Step 9: Add selectors at the bottom of the file**

After `selectAsanasById` (before or after `summarizeForDate`), add:

```ts
/** Effective medicine list: defaults with overrides applied, plus custom. */
export function selectAllMedicines(state: AppState): Medicine[] {
  const withOverrides = state.defaultMedicines.map(
    (m) => state.medicineOverrides[m.id] ?? m,
  );
  return [...withOverrides, ...state.customMedicines];
}

export function selectMedicinesById(state: AppState): Map<string, Medicine> {
  return new Map(selectAllMedicines(state).map((m) => [m.id, m]));
}

/** Map of medicineId → stock entry (the personal cabinet layer). */
export function selectStockById(
  state: AppState,
): Map<string, MedicineStockEntry> {
  return new Map(state.medicineStock.map((e) => [e.medicineId, e]));
}

/** Set of medicine ids the user currently owns (for the library "owned" badge). */
export function selectOwnedMedicineIds(state: AppState): Set<string> {
  return new Set(
    state.medicineStock.filter((e) => e.owned).map((e) => e.medicineId),
  );
}
```

- [ ] **Step 10: Verify types compile**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 11: Run the full test suite**

Run: `npm test`
Expected: PASS — all existing tests plus the new medicine tests.

- [ ] **Step 12: Commit**

```bash
git add src/store/useAppStore.ts
git commit -m "Feature - Medicine store slices, actions, selectors, persistence"
```

---

## Task 8: Medicine detail (read-only view + disclaimer)

**Files:**
- Create: `src/features/medicine/MedicineDetail.tsx`

UI tasks are verified in the browser (Task 12), not unit-tested — matching the project's convention. `MedicineDetail` is a presentational Modal used by the library.

- [ ] **Step 1: Create the component**

Create `src/features/medicine/MedicineDetail.tsx`:

```tsx
import { Badge, Modal } from "@/components/ui";
import type { Medicine } from "@/core/medicine/schema";
import { CATEGORY_LABELS, FORM_LABELS, SYSTEM_LABELS } from "@/lib/medicine";

export function MedicineDetail({
  medicine,
  open,
  onClose,
}: {
  medicine: Medicine | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!medicine) return null;
  const m = medicine;
  return (
    <Modal open={open} onClose={onClose} title={m.name}>
      <div className="space-y-4 text-sm">
        <div className="flex flex-wrap gap-1">
          <Badge>{SYSTEM_LABELS[m.system]}</Badge>
          <Badge variant="outline">{CATEGORY_LABELS[m.category]}</Badge>
          <Badge variant="secondary">{FORM_LABELS[m.form]}</Badge>
          {m.potency && <Badge variant="outline">{m.potency}</Badge>}
        </div>

        {m.brandNames.length > 0 && (
          <p className="text-muted-foreground">
            Also sold as: {m.brandNames.join(", ")}
          </p>
        )}

        {m.commonUses.length > 0 && (
          <section>
            <h3 className="font-semibold">Common uses</h3>
            <ul className="mt-1 list-disc pl-5">
              {m.commonUses.map((u, i) => (
                <li key={i}>{u}</li>
              ))}
            </ul>
          </section>
        )}

        {m.dosageNote && (
          <section>
            <h3 className="font-semibold">Notes</h3>
            <p className="mt-1 text-muted-foreground">{m.dosageNote}</p>
          </section>
        )}

        {m.cautions.length > 0 && (
          <section>
            <h3 className="font-semibold">Cautions</h3>
            <ul className="mt-1 list-disc pl-5">
              {m.cautions.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </section>
        )}

        {m.contraindications.length > 0 && (
          <section>
            <h3 className="font-semibold">Who should avoid</h3>
            <ul className="mt-1 list-disc pl-5">
              {m.contraindications.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </section>
        )}

        <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
          ⚠ This information is for reference only and is not medical advice.
          Always read the package leaflet and consult a qualified doctor or
          pharmacist before taking any medicine.
        </p>

        {m.evidences.length > 0 && (
          <section>
            <h3 className="font-semibold">Sources</h3>
            <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
              {m.evidences.map((e, i) => (
                <li key={i}>
                  {e.url ? (
                    <a
                      href={e.url}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      {e.source}
                    </a>
                  ) : (
                    e.source
                  )}
                  {e.ref ? ` — ${e.ref}` : ""}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/medicine/MedicineDetail.tsx
git commit -m "Feature - Medicine detail view with disclaimer"
```

---

## Task 9: Medicine editor (custom / override + stock fields)

**Files:**
- Create: `src/features/medicine/MedicineEditor.tsx`

Edits a custom medicine or a default-as-override, and edits the stock (owned/qty/unit/expiry/notes) for that medicine. Follows the `ExerciseEditor`/`FoodEditor` modal convention.

- [ ] **Step 1: Create the component**

Create `src/features/medicine/MedicineEditor.tsx`:

```tsx
import { useEffect, useState } from "react";
import { Button, Input, Label, Modal, Select } from "@/components/ui";
import {
  MEDICINE_FORMS,
  MEDICINE_SYSTEMS,
  STOCK_UNITS,
  categoriesForSystem,
  type Medicine,
  type MedicineForm,
  type MedicineStockEntry,
  type MedicineSystem,
  type StockUnit,
} from "@/core/medicine/schema";
import {
  CATEGORY_LABELS,
  FORM_LABELS,
  SYSTEM_LABELS,
  UNIT_LABELS,
} from "@/lib/medicine";
import { useAppStore } from "@/store/useAppStore";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const lines = (s: string): string[] =>
  s
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

export function MedicineEditor({
  medicine,
  open,
  onClose,
}: {
  medicine: Medicine | null; // null => add new
  open: boolean;
  onClose: () => void;
}) {
  const upsertMedicine = useAppStore((s) => s.upsertMedicine);
  const deleteMedicine = useAppStore((s) => s.deleteMedicine);
  const resetMedicine = useAppStore((s) => s.resetMedicine);
  const setStock = useAppStore((s) => s.setStock);
  const stockList = useAppStore((s) => s.medicineStock);
  const overrides = useAppStore((s) => s.medicineOverrides);

  const isEdit = !!medicine;
  const isDefault = medicine?.source === "default";

  const [name, setName] = useState("");
  const [system, setSystem] = useState<MedicineSystem>("allopathy");
  const [category, setCategory] = useState<string>("analgesic");
  const [form, setForm] = useState<MedicineForm>("tablet");
  const [potency, setPotency] = useState("");
  const [brandNames, setBrandNames] = useState("");
  const [commonUses, setCommonUses] = useState("");
  const [cautions, setCautions] = useState("");
  const [contraindications, setContraindications] = useState("");

  // stock fields
  const [owned, setOwned] = useState(false);
  const [quantity, setQuantity] = useState("0");
  const [unit, setUnit] = useState<StockUnit>("strips");
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    const m = medicine;
    setName(m?.name ?? "");
    setSystem(m?.system ?? "allopathy");
    setCategory(m?.category ?? "analgesic");
    setForm(m?.form ?? "tablet");
    setPotency(m?.potency ?? "");
    setBrandNames((m?.brandNames ?? []).join(", "));
    setCommonUses((m?.commonUses ?? []).join("\n"));
    setCautions((m?.cautions ?? []).join("\n"));
    setContraindications((m?.contraindications ?? []).join("\n"));

    const existing = m
      ? stockList.find((e) => e.medicineId === m.id)
      : undefined;
    setOwned(existing?.owned ?? false);
    setQuantity(String(existing?.quantity ?? 0));
    setUnit(existing?.unit ?? "strips");
    setExpiryDate(existing?.expiryDate ?? "");
    setNotes(existing?.notes ?? "");
  }, [open, medicine, stockList]);

  // Keep category valid when the system changes.
  useEffect(() => {
    const valid = categoriesForSystem(system) as readonly string[];
    if (!valid.includes(category)) setCategory(valid[0]);
  }, [system, category]);

  const save = () => {
    const id = medicine?.id ?? slugify(name) || `medicine-${Date.now()}`;
    const next: Medicine = {
      id,
      name: name.trim() || id,
      brandNames: brandNames
        .split(",")
        .map((b) => b.trim())
        .filter(Boolean),
      system,
      category: category as Medicine["category"],
      form,
      potency: potency.trim() || undefined,
      commonUses: lines(commonUses),
      dosageNote: medicine?.dosageNote,
      cautions: lines(cautions),
      contraindications: lines(contraindications),
      tags: medicine?.tags ?? [],
      evidences: medicine?.evidences ?? [],
      verification: medicine?.verification ?? {
        status: "unverified",
        confidence: "low",
      },
      source: isDefault ? "default" : "user",
    };
    upsertMedicine(next);

    const stock: MedicineStockEntry = {
      medicineId: id,
      owned,
      quantity: Number(quantity) || 0,
      unit,
      expiryDate: expiryDate || undefined,
      notes: notes.trim() || undefined,
    };
    setStock(stock);
    onClose();
  };

  const scopedCategories = categoriesForSystem(system);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? medicine!.name : "Add medicine"}
      description={
        isDefault
          ? "Editing a default medicine saves a personal override; the default stays intact."
          : undefined
      }
    >
      <div className="space-y-3">
        <div>
          <Label>Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Paracetamol"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>System</Label>
            <Select
              value={system}
              onChange={(e) => setSystem(e.target.value as MedicineSystem)}
            >
              {MEDICINE_SYSTEMS.map((s) => (
                <option key={s} value={s}>
                  {SYSTEM_LABELS[s]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Category</Label>
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {scopedCategories.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Form</Label>
            <Select
              value={form}
              onChange={(e) => setForm(e.target.value as MedicineForm)}
            >
              {MEDICINE_FORMS.map((f) => (
                <option key={f} value={f}>
                  {FORM_LABELS[f]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Potency (optional)</Label>
            <Input
              value={potency}
              onChange={(e) => setPotency(e.target.value)}
              placeholder="e.g. 30C, 6X, Q"
            />
          </div>
        </div>

        <div>
          <Label>Brand names (comma-separated)</Label>
          <Input
            value={brandNames}
            onChange={(e) => setBrandNames(e.target.value)}
            placeholder="Crocin, Dolo 650"
          />
        </div>
        <div>
          <Label>Common uses (one per line)</Label>
          <textarea
            className="flex min-h-[70px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            value={commonUses}
            onChange={(e) => setCommonUses(e.target.value)}
          />
        </div>
        <div>
          <Label>Cautions (one per line)</Label>
          <textarea
            className="flex min-h-[60px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            value={cautions}
            onChange={(e) => setCautions(e.target.value)}
          />
        </div>
        <div>
          <Label>Who should avoid (one per line)</Label>
          <textarea
            className="flex min-h-[60px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            value={contraindications}
            onChange={(e) => setContraindications(e.target.value)}
          />
        </div>

        <div className="rounded-lg border border-border p-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={owned}
              onChange={(e) => setOwned(e.target.checked)}
            />
            I have this in my cabinet
          </label>
          {owned && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min={0}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <div>
                <Label>Unit</Label>
                <Select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as StockUnit)}
                >
                  {STOCK_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {UNIT_LABELS[u]}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Expiry date</Label>
                <Input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="optional"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-between gap-2 pt-1">
          <div className="flex gap-2">
            {medicine?.source === "user" && (
              <Button
                variant="destructive"
                onClick={() => {
                  deleteMedicine(medicine.id);
                  onClose();
                }}
              >
                Delete
              </Button>
            )}
            {isDefault && overrides[medicine!.id] && (
              <Button
                variant="outline"
                onClick={() => {
                  resetMedicine(medicine!.id);
                  onClose();
                }}
              >
                Reset to default
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/medicine/MedicineEditor.tsx
git commit -m "Feature - Medicine editor (custom/override + stock)"
```

---

## Task 10: Medicine library (grid + filters)

**Files:**
- Create: `src/features/medicine/MedicineLibrary.tsx`

- [ ] **Step 1: Create the component**

Create `src/features/medicine/MedicineLibrary.tsx`:

```tsx
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Button, Card, CardContent, Input, Select } from "@/components/ui";
import { applyMedicineFilters } from "@/core/medicine/filters";
import {
  MEDICINE_SYSTEMS,
  categoriesForSystem,
  type Medicine,
  type MedicineCategory,
  type MedicineSystem,
} from "@/core/medicine/schema";
import { CATEGORY_LABELS, FORM_LABELS, SYSTEM_LABELS } from "@/lib/medicine";
import {
  selectAllMedicines,
  selectOwnedMedicineIds,
  useAppStore,
} from "@/store/useAppStore";
import { MedicineDetail } from "./MedicineDetail";
import { MedicineEditor } from "./MedicineEditor";

export function MedicineLibrary() {
  const all = useAppStore(selectAllMedicines);
  const ownedIds = useAppStore(selectOwnedMedicineIds);
  const overrides = useAppStore((s) => s.medicineOverrides);

  const [search, setSearch] = useState("");
  const [system, setSystem] = useState<MedicineSystem | "">("");
  const [category, setCategory] = useState("");
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [viewing, setViewing] = useState<Medicine | null>(null);
  const [editing, setEditing] = useState<Medicine | null>(null);
  const [adding, setAdding] = useState(false);

  const filtered = useMemo(
    () =>
      applyMedicineFilters(
        all,
        {
          search,
          system: (system || undefined) as MedicineSystem | undefined,
          category: (category || undefined) as MedicineCategory | undefined,
          ownedOnly,
        },
        ownedIds,
      ),
    [all, search, system, category, ownedOnly, ownedIds],
  );

  const categoryOptions = system ? categoriesForSystem(system) : [];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">💊 Medicine</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} medicines · allopathy, homeopathy & biochemic · tap
            any to view details
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/medicine/cabinet">
            <Button variant="secondary">My cabinet →</Button>
          </Link>
          <Button onClick={() => setAdding(true)}>+ Add</Button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        <Input
          className="max-w-xs"
          placeholder="Search medicines…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          className="max-w-[160px]"
          value={system}
          onChange={(e) => {
            setSystem(e.target.value as MedicineSystem | "");
            setCategory("");
          }}
        >
          <option value="">All systems</option>
          {MEDICINE_SYSTEMS.map((s) => (
            <option key={s} value={s}>
              {SYSTEM_LABELS[s]}
            </option>
          ))}
        </Select>
        <Select
          className="max-w-[170px]"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          disabled={!system}
        >
          <option value="">All categories</option>
          {categoryOptions.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-2 rounded-lg border border-border px-3 text-sm">
          <input
            type="checkbox"
            checked={ownedOnly}
            onChange={(e) => setOwnedOnly(e.target.checked)}
          />
          In my cabinet
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((m) => (
          <Card
            key={m.id}
            className="cursor-pointer transition-colors hover:border-primary/40"
            onClick={() => setViewing(m)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold leading-tight">{m.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {SYSTEM_LABELS[m.system]} · {CATEGORY_LABELS[m.category]}
                  </div>
                </div>
                {ownedIds.has(m.id) && <Badge variant="success">✓ owned</Badge>}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1">
                <Badge variant="secondary">{FORM_LABELS[m.form]}</Badge>
                {m.potency && <Badge variant="outline">{m.potency}</Badge>}
                {m.source === "user" && <Badge variant="default">custom</Badge>}
                {overrides[m.id] && <Badge variant="default">edited</Badge>}
              </div>
              <div className="mt-3 flex justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditing(m);
                  }}
                >
                  Edit / stock
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full py-10 text-center text-muted-foreground">
            No medicines match your filters.
          </p>
        )}
      </div>

      <MedicineDetail
        medicine={viewing}
        open={!!viewing}
        onClose={() => setViewing(null)}
      />
      <MedicineEditor
        medicine={editing}
        open={!!editing}
        onClose={() => setEditing(null)}
      />
      <MedicineEditor
        medicine={null}
        open={adding}
        onClose={() => setAdding(false)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/medicine/MedicineLibrary.tsx
git commit -m "Feature - Medicine library grid + filters"
```

---

## Task 11: My Cabinet (owned items grouped by status)

**Files:**
- Create: `src/features/medicine/MyCabinet.tsx`

- [ ] **Step 1: Create the component**

Create `src/features/medicine/MyCabinet.tsx`:

```tsx
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Button, Card, CardContent } from "@/components/ui";
import { cabinetSummary } from "@/core/medicine/stock";
import type { Medicine, MedicineStockEntry } from "@/core/medicine/schema";
import { UNIT_LABELS } from "@/lib/medicine";
import {
  selectMedicinesById,
  useAppStore,
} from "@/store/useAppStore";
import { MedicineEditor } from "./MedicineEditor";

const today = () => new Date().toISOString().slice(0, 10);

function Group({
  title,
  tone,
  entries,
  byId,
  onEdit,
}: {
  title: string;
  tone: "warning" | "success" | "secondary";
  entries: MedicineStockEntry[];
  byId: Map<string, Medicine>;
  onEdit: (m: Medicine) => void;
}) {
  if (entries.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        {title}
        <Badge variant={tone}>{entries.length}</Badge>
      </h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {entries.map((e) => {
          const m = byId.get(e.medicineId);
          return (
            <Card key={e.medicineId}>
              <CardContent className="flex items-center justify-between gap-2 p-3">
                <div>
                  <div className="font-medium">{m?.name ?? e.medicineId}</div>
                  <div className="text-xs text-muted-foreground">
                    {e.quantity} {UNIT_LABELS[e.unit]}
                    {e.expiryDate ? ` · exp ${e.expiryDate}` : ""}
                  </div>
                </div>
                {m && (
                  <Button size="sm" variant="ghost" onClick={() => onEdit(m)}>
                    Edit
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

export function MyCabinet() {
  const stock = useAppStore((s) => s.medicineStock);
  const byId = useAppStore(selectMedicinesById);
  const [editing, setEditing] = useState<Medicine | null>(null);

  const summary = useMemo(() => cabinetSummary(stock, today()), [stock]);
  const ownedCount =
    summary.expired.length +
    summary.expiringSoon.length +
    summary.lowStock.length +
    summary.ok.length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">💊 My cabinet</h1>
          <p className="text-sm text-muted-foreground">
            {ownedCount} medicine{ownedCount === 1 ? "" : "s"} in your cabinet
          </p>
        </div>
        <Link to="/medicine">
          <Button variant="secondary">← Medicine library</Button>
        </Link>
      </header>

      {ownedCount === 0 ? (
        <p className="py-10 text-center text-muted-foreground">
          Nothing here yet. Open a medicine in the{" "}
          <Link to="/medicine" className="underline">
            library
          </Link>{" "}
          and tick “I have this in my cabinet”.
        </p>
      ) : (
        <>
          <Group
            title="Expired"
            tone="warning"
            entries={summary.expired}
            byId={byId}
            onEdit={setEditing}
          />
          <Group
            title="Expiring soon"
            tone="warning"
            entries={summary.expiringSoon}
            byId={byId}
            onEdit={setEditing}
          />
          <Group
            title="Low stock"
            tone="secondary"
            entries={summary.lowStock}
            byId={byId}
            onEdit={setEditing}
          />
          <Group
            title="OK"
            tone="success"
            entries={summary.ok}
            byId={byId}
            onEdit={setEditing}
          />
        </>
      )}

      <MedicineEditor
        medicine={editing}
        open={!!editing}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/medicine/MyCabinet.tsx
git commit -m "Feature - My cabinet (owned medicines grouped by status)"
```

---

## Task 12: Routes + navigation

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Layout.tsx`

- [ ] **Step 1: Add route imports and routes in `App.tsx`**

After `import { YogaLearn } from "@/features/yoga/YogaLearn";` add:

```ts
import { MedicineLibrary } from "@/features/medicine/MedicineLibrary";
import { MyCabinet } from "@/features/medicine/MyCabinet";
```

After the line `<Route path="/yoga/sequence" element={<SequenceBuilder />} />`
add:

```tsx
        <Route path="/medicine" element={<MedicineLibrary />} />
        <Route path="/medicine/cabinet" element={<MyCabinet />} />
```

- [ ] **Step 2: Add the nav entry in `Layout.tsx`**

In the `NAV` array, after `{ to: "/yoga", label: "Yoga", icon: "🧘" },` add:

```ts
  { to: "/medicine", label: "Medicine", icon: "💊" },
```

- [ ] **Step 3: Verify + build**

Run: `npm run typecheck && npm run build`
Expected: PASS (build succeeds).

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/components/Layout.tsx
git commit -m "Feature - Medicine routes and nav entry"
```

---

## Task 13: Update the docs

**Files:**
- Modify: `docs/FEATURES.md`
- Modify: `docs/CODEBASE.md`
- Modify: `docs/ARCHITECTURE.md`

Per CLAUDE.md §2 the docs are part of "done".

- [ ] **Step 1: FEATURES.md — add a feature section**

Insert a new section before `## Not yet built (roadmap)`:

```markdown
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
```

- [ ] **Step 2: CODEBASE.md — tree + table**

In the directory tree, after the `yoga/` block add:

```
  medicine/                  PURE medicine domain
    schema.ts                Medicine, MedicineSystem, categories (system-scoped), forms, StockUnit, MedicineStockEntry
    filters.ts               search + system/category/owned filters (applyMedicineFilters)
    stock.ts                 pure derived views: expiringSoon / expired / lowStock / cabinetSummary
```

Under `src/features/`, after the yoga entries add:

```
  medicine/MedicineLibrary.tsx  Searchable/filterable medicine grid + owned toggle
  medicine/MedicineDetail.tsx   Read-only detail + not-medical-advice disclaimer
  medicine/MedicineEditor.tsx   Add custom / edit-as-override + stock (owned/qty/expiry)
  medicine/MyCabinet.tsx        Owned medicines grouped by expiry/stock status
```

Under `public/data/` add:

```
  medicines.default.json     Curated allopathy/homeo/biochemic medicines + >=2 evidences
```

Under `src/lib/` add:

```
  medicine.ts                SYSTEM/CATEGORY/FORM/UNIT display labels
```

Add these rows to the "I want to… → open this" table:

```markdown
| Add/edit a default medicine | `public/data/medicines.default.json` (>=2 evidences; `core/medicine/data.test.ts`) |
| Change medicine filtering | `src/core/medicine/filters.ts` `applyMedicineFilters` |
| Change expiry / low-stock / cabinet grouping | `src/core/medicine/stock.ts` |
| Add a medicine category/system/form | `src/core/medicine/schema.ts` (enums) + labels in `src/lib/medicine.ts` |
```

- [ ] **Step 3: ARCHITECTURE.md — constraints**

In "Constraints to preserve" §2, update the persisted-field parenthetical to
include the medicine slices. Replace:

```
   routines, yoga sequences, activityLog.)
```

with:

```
   routines, yoga sequences, activityLog, custom medicines/overrides, medicine
   stock.)
```

Add a bullet to "Key decisions & rationale":

```markdown
- **Medicine is a fourth bounded domain** (`core/medicine/`) — a reference
  library (allopathy/homeopathy/biochemic) plus a personal stock/expiry layer.
  It imports no other domain and is deliberately informational: no dosing/
  recommender/interaction logic, and no effect on nutrition targets or the
  activity log. Categories are **system-scoped data** (a Zod refinement), added
  as key lists, not code branches.
```

- [ ] **Step 4: Commit**

```bash
git add docs/FEATURES.md docs/CODEBASE.md docs/ARCHITECTURE.md
git commit -m "Docs - Medicine inventory feature"
```

---

## Task 14: Final verification (green gate + browser)

**Files:** none (verification only).

- [ ] **Step 1: Typecheck**

Run: `npm run typecheck`
Expected: PASS, no errors.

- [ ] **Step 2: Full test suite**

Run: `npm test`
Expected: PASS — all suites including `src/core/medicine/{schema,filters,stock,data}.test.ts`.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: PASS — build completes without errors.

- [ ] **Step 4: Browser smoke test**

Start the dev server via the preview browser tooling (`preview_start` with the
project's dev config, or create `.claude/launch.json` running `npm run dev`).
Then verify the flow:

1. Navigate to `/medicine`. Expect the grid to render 8 seed medicines.
2. Filter: pick system **Homeopathy** → category dropdown enables and shows
   Mother tincture / Dilution / Potency; grid narrows to homeopathy items.
3. Click a card → detail modal shows uses/cautions/sources + the amber
   not-medical-advice disclaimer.
4. Click **Edit / stock** on a card → tick "I have this in my cabinet", set
   quantity `1`, an expiry within 30 days, Save. Card now shows a **✓ owned**
   badge; the "In my cabinet" filter includes it.
5. Go to `/medicine/cabinet` → the item appears under **Expiring soon** (or
   **Low stock** for quantity 1). Read `read_console_messages` — expect no errors.
6. Add a custom medicine via **+ Add**; confirm it appears with a **custom**
   badge and survives a page reload (persistence).

Capture a screenshot of `/medicine` and `/medicine/cabinet` for the summary.

- [ ] **Step 5: Final commit (if any doc tweaks from smoke test)**

```bash
git add -A
git commit -m "Feature - Medicine inventory verification tweaks" || echo "nothing to commit"
```

---

## Notes for the implementer

- **Do not** add medicine data to the dashboard, planner, or `activityLog` — the
  domain is intentionally isolated (ARCHITECTURE.md decision).
- **Five-place rule:** if you add any new persisted medicine field later, wire it
  into store state, `partialize`, `BackupSchema`, `exportBackup`/`importBackup`,
  and `resetUserData` — all five.
- The `MedicineSchema` is a `ZodEffects` (because of `.superRefine`). That's fine
  for `z.array(...)`, `z.record(...)`, and `.parse()`; just don't try to chain
  `.default()`/`.extend()` directly onto it.
- Category dropdowns must always be **scoped to the selected system** via
  `categoriesForSystem` — the schema refinement will reject a mismatch on save.
```
