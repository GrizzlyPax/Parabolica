// Seeded RNG for deterministic simulation (COMMISSIONER_MODE_TECH.md, Problem 1).
// No dependencies: mulberry32 is a well-known 32-bit PRNG with good statistical
// quality for game simulation, and deriveSeed lets one league seed fan out into
// independent per-race and per-generation streams.

export type Rng = () => number;

/**
 * mulberry32 PRNG. Returns a function producing floats in [0, 1), exactly like
 * Math.random, but fully determined by the seed.
 */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Derive a child seed from a parent seed plus any labels, e.g.
 * deriveSeed(leagueSeed, 'race', 3) or deriveSeed(leagueSeed, 'genesis').
 * Same inputs always give the same child seed; different labels give
 * independent streams.
 */
export function deriveSeed(parent: number, ...labels: (string | number)[]): number {
  let h = parent >>> 0;
  for (const label of labels) {
    const s = String(label);
    for (let i = 0; i < s.length; i++) {
      h = Math.imul(h ^ s.charCodeAt(i), 2654435761);
      h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
  }
  return h >>> 0;
}

/**
 * Unbiased Fisher–Yates shuffle (returns a new array). Replaces the
 * `.sort(() => Math.random() - 0.5)` idiom, which is both biased and
 * nondeterministic.
 */
export function shuffle<T>(arr: readonly T[], rng: Rng = Math.random): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Pick a random element (deterministic under a seeded rng). */
export function pick<T>(arr: readonly T[], rng: Rng = Math.random): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** A fresh unpredictable seed, for league creation. */
export function randomSeed(): number {
  return Math.floor(Math.random() * 0x100000000) >>> 0;
}
