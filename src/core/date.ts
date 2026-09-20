/**
 * Calendar helpers for plans. Deliberately **local-time**: a plan's id is
 * `plan-<YYYY-MM-DD>` and `new Date().toISOString()` is UTC, so east of UTC
 * (e.g. IST) anything before 05:30 would be filed under the previous day.
 *
 * Pure and Intl-free — the labels are table-driven so tests do not depend on
 * the runner's locale.
 */

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/** `YYYY-MM-DD` from a Date's **local** calendar parts. */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Local-midnight Date for a `YYYY-MM-DD` string. */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

/** Today's date in the user's own timezone. */
export function todayISO(): string {
  return toISODate(new Date());
}

/** Shift an ISO date by whole days (handles month/year/DST boundaries). */
export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** First day of the week containing `iso`. `weekStartsOn`: 0=Sun, 1=Mon. */
export function startOfWeek(iso: string, weekStartsOn: 0 | 1 = 1): string {
  const day = parseISODate(iso).getDay();
  return addDays(iso, -((day - weekStartsOn + 7) % 7));
}

/** `Mon` */
export function shortDayName(iso: string): string {
  return DAY_NAMES[parseISODate(iso).getDay()];
}

/** `Mon 21 Sep` */
export function dayLabel(iso: string): string {
  const d = parseISODate(iso);
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}

/** `21 Sep - 27 Sep` for a 7-day range starting at `startDate`. */
export function weekRangeLabel(startDate: string, days = 7): string {
  const end = addDays(startDate, days - 1);
  const a = parseISODate(startDate);
  const b = parseISODate(end);
  return `${a.getDate()} ${MONTH_NAMES[a.getMonth()]} – ${b.getDate()} ${MONTH_NAMES[b.getMonth()]}`;
}
