import { describe, expect, it } from "vitest";
import { activityCalories, metCalories } from "./calories";
import { summarizeActivity, entriesForDate } from "./summary";
import type { ActivityLogEntry } from "./schema";

describe("metCalories", () => {
  it("uses kcal = MET × kg × hours", () => {
    // 8 MET, 70 kg, 60 min → 8 * 70 * 1 = 560
    expect(metCalories(8, 70, 60)).toBe(560);
    // 4 MET, 60 kg, 30 min → 4 * 60 * 0.5 = 120
    expect(metCalories(4, 60, 30)).toBe(120);
  });

  it("returns 0 for non-positive inputs", () => {
    expect(metCalories(0, 70, 60)).toBe(0);
    expect(metCalories(8, 0, 60)).toBe(0);
    expect(metCalories(8, 70, 0)).toBe(0);
  });

  it("activityCalories delegates via the BurnsCalories interface", () => {
    expect(activityCalories({ metValue: 8 }, 70, 60)).toBe(560);
  });
});

describe("activity summary", () => {
  const log: ActivityLogEntry[] = [
    { id: "a", date: "2026-06-17", kind: "exercise", refId: "x", label: "Push day", durationMin: 30, estimatedKcal: 200 },
    { id: "b", date: "2026-06-17", kind: "yoga", refId: "y", label: "Flow", durationMin: 20, estimatedKcal: 60 },
    { id: "c", date: "2026-06-16", kind: "yoga", refId: "y", label: "Flow", durationMin: 25, estimatedKcal: 70 },
  ];

  it("filters entries by date", () => {
    expect(entriesForDate(log, "2026-06-17")).toHaveLength(2);
  });

  it("aggregates sessions, minutes and kcal", () => {
    const s = summarizeActivity(entriesForDate(log, "2026-06-17"));
    expect(s).toEqual({ sessions: 2, totalMin: 50, totalKcal: 260 });
  });
});
