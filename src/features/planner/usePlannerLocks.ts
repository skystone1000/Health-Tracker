import { useCallback, useState } from "react";

/**
 * Which dates the user has locked against regeneration.
 *
 * A UI preference, not user data — same call as the food list's "Group by": it
 * lives in `localStorage`, deliberately outside the store and the backup, so it
 * never has to be wired through `partialize`/`BackupSchema`/export/import/reset.
 */
const KEY = "nourish.planner.locks";

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((d) => typeof d === "string") : [];
  } catch {
    return [];
  }
}

export function usePlannerLocks() {
  const [locked, setLocked] = useState<string[]>(read);

  const persist = useCallback((next: string[]) => {
    setLocked(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* private mode — locks simply do not survive a reload */
    }
  }, []);

  const toggle = useCallback(
    (date: string) =>
      persist(locked.includes(date) ? locked.filter((d) => d !== date) : [...locked, date]),
    [locked, persist],
  );

  const isLocked = useCallback((date: string) => locked.includes(date), [locked]);

  return { locked, toggle, isLocked, clear: () => persist([]) };
}
