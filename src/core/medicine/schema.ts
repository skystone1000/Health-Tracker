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
