import { DIFFICULTY_RANK, type Difficulty } from "@/core/activity/schema";
import type { Asana, AsanaFamily, YogaFocus } from "./schema";

/**
 * Single source of truth for asana selection — used by the library UI and the
 * sequence engine. Includes contraindication safety (kept distinct from the
 * exercise domain's equipment/difficulty model).
 */

export function withinLevel(asana: Asana, max: Difficulty): boolean {
  return DIFFICULTY_RANK[asana.difficulty] <= DIFFICULTY_RANK[max];
}

/** True if any user limitation matches one of the asana's contraindications. */
export function isContraindicated(asana: Asana, limitations: string[]): boolean {
  if (!limitations.length) return false;
  return asana.contraindications.some((c) => {
    const contra = c.toLowerCase();
    return limitations.some((l) => {
      const t = l.trim().toLowerCase();
      return t.length > 0 && (contra.includes(t) || t.includes(contra));
    });
  });
}

export interface AsanaFilter {
  search?: string;
  family?: AsanaFamily;
  focus?: YogaFocus;
  difficulty?: Difficulty;
}

export function applyAsanaFilters(list: Asana[], f: AsanaFilter): Asana[] {
  const q = f.search?.trim().toLowerCase();
  return list.filter((a) => {
    if (q) {
      const hay = [a.sanskritName, a.englishName, ...a.aliases]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (f.family && a.family !== f.family) return false;
    if (f.focus && !a.focus.includes(f.focus)) return false;
    if (f.difficulty && a.difficulty !== f.difficulty) return false;
    return true;
  });
}
