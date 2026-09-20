/**
 * Seeded randomness for the planner.
 *
 * `core/` must stay deterministic — a bare `Math.random()` would make every
 * planner test flaky and make a generated week impossible to reproduce. So the
 * seed is *data*: the engine is a pure function of (inputs, seed), and only the
 * UI decides to pass a fresh seed on each click.
 */

/** A seeded random source returning values in [0, 1). */
export type Rng = () => number;

/**
 * mulberry32 — a small, fast, well-distributed 32-bit PRNG. Public domain
 * (Tommy Ettinger). Chosen over an LCG because its low bits are usable and it
 * needs no dependency.
 */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a — turn any string (a date, a profile id) into a 32-bit seed. */
export function hashSeed(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** Fisher–Yates. Returns a new array; never mutates the input. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Draw one item with probability proportional to its weight. Weights below
 * zero, NaN or Infinity are treated as 0. Returns `undefined` when the pool is
 * empty or every weight is 0 — callers treat that as "this slot stays empty".
 */
export function pickWeighted<T>(
  items: readonly T[],
  weight: (item: T) => number,
  rng: Rng,
): T | undefined {
  let total = 0;
  const weights = items.map((item) => {
    const w = weight(item);
    const safe = Number.isFinite(w) && w > 0 ? w : 0;
    total += safe;
    return safe;
  });
  if (total <= 0) return undefined;

  let roll = rng() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll < 0) return items[i];
  }
  // Floating-point tail: return the last item with a non-zero weight.
  for (let i = items.length - 1; i >= 0; i--) if (weights[i] > 0) return items[i];
  return undefined;
}
