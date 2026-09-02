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
