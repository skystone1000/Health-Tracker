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
