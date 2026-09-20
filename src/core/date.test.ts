import { describe, expect, it } from "vitest";
import {
  addDays,
  dayLabel,
  parseISODate,
  shortDayName,
  startOfWeek,
  toISODate,
  todayISO,
} from "./date";

describe("toISODate", () => {
  it("uses local calendar parts, not UTC", () => {
    // 00:30 on 21 Sep local time. toISOString() would report the 20th for
    // any timezone east of UTC — the bug this function exists to avoid.
    const d = new Date(2026, 8, 21, 0, 30, 0);
    expect(toISODate(d)).toBe("2026-09-21");
  });

  it("zero-pads month and day", () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("parseISODate", () => {
  it("round-trips through toISODate", () => {
    expect(toISODate(parseISODate("2026-02-29"))).toBe("2026-03-01"); // 2026 is not a leap year
    expect(toISODate(parseISODate("2026-12-31"))).toBe("2026-12-31");
  });
});

describe("addDays", () => {
  it("crosses month and year boundaries", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("walks a full week", () => {
    expect(addDays("2026-09-21", 6)).toBe("2026-09-27");
  });
});

describe("startOfWeek", () => {
  it("returns the Monday of that week by default", () => {
    // 2026-09-21 is a Monday; 2026-09-27 is the Sunday that ends the week.
    expect(startOfWeek("2026-09-21")).toBe("2026-09-21");
    expect(startOfWeek("2026-09-24")).toBe("2026-09-21");
    expect(startOfWeek("2026-09-27")).toBe("2026-09-21");
  });

  it("supports Sunday-start weeks", () => {
    expect(startOfWeek("2026-09-24", 0)).toBe("2026-09-20");
  });
});

describe("labels", () => {
  it("formats without Intl so tests are locale-proof", () => {
    expect(shortDayName("2026-09-21")).toBe("Mon");
    expect(dayLabel("2026-09-21")).toBe("Mon 21 Sep");
  });
});

describe("todayISO", () => {
  it("is a well-formed ISO date", () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
