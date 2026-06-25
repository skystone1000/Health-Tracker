import { describe, expect, it } from "vitest";
import { AsanaSchema, type Asana } from "./schema";
import {
  OPPOSING_FAMILIES,
  isReasonableCounter,
  suggestCounters,
} from "./counterpose";
import { YOGA_THEORY } from "./theory";
import { EIGHT_LIMBS, YOGA_STYLE_INFO } from "./styles";
import { YOGA_STYLES } from "./schema";

const make = (
  over: Partial<Asana> & Pick<Asana, "id" | "sanskritName" | "englishName" | "family">,
): Asana =>
  AsanaSchema.parse({
    difficulty: "beginner",
    metValue: 2.5,
    focus: ["flexibility"],
    ...over,
  });

describe("counterpose", () => {
  const backbend = make({ id: "cobra", sanskritName: "Bhujangasana", englishName: "Cobra", family: "backbend" });
  const forward = make({ id: "fold", sanskritName: "Paschimottanasana", englishName: "Seated Forward Bend", family: "forwardBend" });
  const rest = make({ id: "child", sanskritName: "Balasana", englishName: "Child", family: "restorative" });
  const all = [backbend, forward, rest];

  it("a forward bend is a reasonable counter to a backbend", () => {
    expect(isReasonableCounter(backbend, forward)).toBe(true);
  });

  it("restorative is a universal counter", () => {
    expect(isReasonableCounter(backbend, rest)).toBe(true);
  });

  it("a pose never counters itself", () => {
    expect(isReasonableCounter(backbend, backbend)).toBe(false);
  });

  it("suggestCounters returns opposing-family poses", () => {
    const suggestions = suggestCounters(backbend, all).map((a) => a.id);
    expect(suggestions).toContain("fold");
    expect(suggestions).not.toContain("cobra");
  });

  it("every family has an opposing-families entry", () => {
    const families = Object.keys(OPPOSING_FAMILIES);
    expect(families.length).toBeGreaterThan(0);
  });
});

describe("yoga theory content", () => {
  it("every section has a title, summary, non-empty body and >=1 source", () => {
    for (const s of YOGA_THEORY) {
      expect(s.title.length, s.id).toBeGreaterThan(0);
      expect(s.summary.length, s.id).toBeGreaterThan(0);
      expect(s.body.length, s.id).toBeGreaterThan(0);
      expect(s.sources.length, s.id).toBeGreaterThanOrEqual(1);
    }
  });

  it("section ids are unique", () => {
    const ids = YOGA_THEORY.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("covers the core curriculum topics", () => {
    const ids = new Set(YOGA_THEORY.map((s) => s.id));
    for (const id of ["what-is-yoga", "history", "four-paths", "eight-limbs", "styles", "glossary"])
      expect(ids.has(id), id).toBe(true);
  });
});

describe("styles reference", () => {
  it("describes every yoga style enum value", () => {
    const described = new Set(YOGA_STYLE_INFO.map((s) => s.id));
    for (const style of YOGA_STYLES) expect(described.has(style), style).toBe(true);
  });

  it("lists all eight limbs", () => {
    expect(EIGHT_LIMBS).toHaveLength(8);
  });
});
