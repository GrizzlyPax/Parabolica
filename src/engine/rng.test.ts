import { describe, it, expect } from 'vitest';
import { mulberry32, deriveSeed, shuffle, pick } from './rng';

describe('mulberry32', () => {
  it('produces identical sequences for the same seed', () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    for (let i = 0; i < 1000; i++) {
      expect(a()).toBe(b());
    }
  });

  it('produces different sequences for different seeds', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });

  it('stays in [0, 1) and covers the range', () => {
    const rng = mulberry32(99);
    let min = 1;
    let max = 0;
    for (let i = 0; i < 10000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      min = Math.min(min, v);
      max = Math.max(max, v);
    }
    expect(min).toBeLessThan(0.01);
    expect(max).toBeGreaterThan(0.99);
  });

  it('has a roughly uniform mean (sanity, not a statistics suite)', () => {
    const rng = mulberry32(7);
    let sum = 0;
    const n = 10000;
    for (let i = 0; i < n; i++) sum += rng();
    expect(sum / n).toBeGreaterThan(0.48);
    expect(sum / n).toBeLessThan(0.52);
  });
});

describe('deriveSeed', () => {
  it('is deterministic for the same inputs', () => {
    expect(deriveSeed(42, 'race', 3)).toBe(deriveSeed(42, 'race', 3));
  });

  it('differs across labels, indices, and parents', () => {
    const seeds = new Set([
      deriveSeed(42, 'race', 0),
      deriveSeed(42, 'race', 1),
      deriveSeed(42, 'genesis'),
      deriveSeed(43, 'race', 0),
    ]);
    expect(seeds.size).toBe(4);
  });

  it('returns an unsigned 32-bit integer', () => {
    const s = deriveSeed(123, 'anything');
    expect(Number.isInteger(s)).toBe(true);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThan(0x100000000);
  });
});

describe('shuffle', () => {
  it('is deterministic under a seeded rng and does not mutate the input', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const a = shuffle(input, mulberry32(5));
    const b = shuffle(input, mulberry32(5));
    expect(a).toEqual(b);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('is a permutation', () => {
    const input = Array.from({ length: 50 }, (_, i) => i);
    const out = shuffle(input, mulberry32(11));
    expect([...out].sort((x, y) => x - y)).toEqual(input);
  });
});

describe('pick', () => {
  it('is deterministic under a seeded rng and always in range', () => {
    const arr = ['a', 'b', 'c', 'd'];
    const rng = mulberry32(3);
    for (let i = 0; i < 100; i++) {
      expect(arr).toContain(pick(arr, rng));
    }
    expect(pick(arr, mulberry32(8))).toBe(pick(arr, mulberry32(8)));
  });
});
