import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "./useAppStore";
import { PLANNER_MODES } from "@/core/schema";
import type { Plan } from "@/core/schema";

const plan = (date: string, foodId = "rice"): Plan => ({
  id: `plan-${date}`,
  date,
  meals: [{ name: "Lunch", items: [{ foodId, quantity: 100 }] }],
});

describe("PLANNER_MODES", () => {
  it("offers a weekly mode", () => {
    expect(PLANNER_MODES).toContain("weekly");
  });
});

describe("savePlans", () => {
  beforeEach(() => {
    useAppStore.setState({ plans: [] });
  });

  it("inserts a whole week in one update", () => {
    const week = ["2026-09-21", "2026-09-22", "2026-09-23"].map((d) => plan(d));
    useAppStore.getState().savePlans(week);
    expect(useAppStore.getState().plans).toHaveLength(3);
  });

  it("replaces existing plans for the same dates and keeps the others", () => {
    useAppStore.getState().savePlans([plan("2026-09-21"), plan("2026-09-30")]);
    useAppStore.getState().savePlans([plan("2026-09-21", "roti")]);
    const plans = useAppStore.getState().plans;
    expect(plans).toHaveLength(2);
    expect(plans.find((p) => p.date === "2026-09-21")!.meals[0].items[0].foodId).toBe("roti");
    expect(plans.some((p) => p.date === "2026-09-30")).toBe(true);
  });

  it("is a no-op for an empty array", () => {
    useAppStore.getState().savePlans([plan("2026-09-21")]);
    useAppStore.getState().savePlans([]);
    expect(useAppStore.getState().plans).toHaveLength(1);
  });
});

describe("backup round-trip with a generated week", () => {
  it("exports and re-imports all seven days (no new persisted slice needed)", () => {
    const week = [
      "2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24",
      "2026-09-25", "2026-09-26", "2026-09-27",
    ].map((d) => plan(d));

    useAppStore.setState({ plans: [], profile: null });
    useAppStore.getState().savePlans(week);

    const backup = useAppStore.getState().exportBackup();
    expect(backup.plans).toHaveLength(7);

    useAppStore.getState().resetUserData();
    expect(useAppStore.getState().plans).toHaveLength(0);

    const result = useAppStore.getState().importBackup(backup);
    expect(result).toEqual({ ok: true });
    expect(useAppStore.getState().plans.map((p) => p.date)).toEqual(
      week.map((p) => p.date),
    );
  });
});
