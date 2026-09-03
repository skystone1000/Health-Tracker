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
