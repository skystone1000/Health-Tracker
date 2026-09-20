import { describe, expect, it } from "vitest";
import { hashSeed, mulberry32, pickWeighted, shuffle } from "./random";

describe("mulberry32", () => {
  it("produces the same stream for the same seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("produces a different stream for a different seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(43);
    expect(a()).not.toBe(b());
  });

  it("stays in [0, 1)", () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("hashSeed", () => {
  it("is stable and differs per input", () => {
    expect(hashSeed("2026-09-21")).toBe(hashSeed("2026-09-21"));
    expect(hashSeed("2026-09-21")).not.toBe(hashSeed("2026-09-22"));
  });

  it("returns a non-negative 32-bit integer", () => {
    const h = hashSeed("nourish");
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(2 ** 32);
  });
});

describe("shuffle", () => {
  it("keeps every element and does not mutate the input", () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(input, mulberry32(1));
    expect(out).toHaveLength(5);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });

  it("is seed-deterministic", () => {
    expect(shuffle([1, 2, 3, 4, 5], mulberry32(9))).toEqual(
      shuffle([1, 2, 3, 4, 5], mulberry32(9)),
    );
  });
});

describe("pickWeighted", () => {
  it("returns undefined for an empty pool", () => {
    expect(pickWeighted([], () => 1, mulberry32(1))).toBeUndefined();
  });

  it("never picks a zero-weight item", () => {
    const rng = mulberry32(3);
    for (let i = 0; i < 200; i++) {
      const picked = pickWeighted(
        ["good", "banned"],
        (x) => (x === "banned" ? 0 : 1),
        rng,
      );
      expect(picked).toBe("good");
    }
  });

  it("returns undefined when every weight is zero", () => {
    expect(pickWeighted(["a", "b"], () => 0, mulberry32(1))).toBeUndefined();
  });

  it("favours heavier items without ever excluding lighter ones", () => {
    const rng = mulberry32(11);
    const counts = { heavy: 0, light: 0 };
    for (let i = 0; i < 2000; i++) {
      const picked = pickWeighted(
        ["heavy", "light"] as const,
        (x) => (x === "heavy" ? 9 : 1),
        rng,
      );
      counts[picked!] += 1;
    }
    expect(counts.heavy).toBeGreaterThan(counts.light * 4);
    expect(counts.light).toBeGreaterThan(50);
  });
});
