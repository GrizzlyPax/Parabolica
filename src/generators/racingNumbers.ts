// Racing numbers (Pax, Oct 8; #313): every driver gets a number 2–99, unique
// on the grid, rolled from the seed and kept forever. #1 is never rolled
// (reserved). Weighted like real F1: single digits are prized, doubles are
// next, and the high numbers are the long tail. A seeded draw without
// replacement, so a 30-driver grid takes almost every single digit.
//
// Pax's spec said single digits weight 12, with the test "every single digit
// taken in ≥ 90% of 1,000 seeded 30-driver grids". At 12 they are taken in
// ~81%; 20 is the smallest round weight that meets the test (~91%), so the
// test wins and the weight is 20 (flagged on #313).
import type { Rng } from '../engine/rng';

export const MIN_RACING_NUMBER = 2;
export const MAX_RACING_NUMBER = 99;

/** The weights, as data (the first matching band wins). */
export const RACING_NUMBER_WEIGHTS: { band: string; test: (n: number) => boolean; weight: number }[] = [
  { band: 'single digits 2–9', test: n => n <= 9, weight: 20 },
  { band: 'doubles 11 · 22 … 99', test: n => n % 11 === 0, weight: 6 },
  { band: '10–29', test: n => n <= 29, weight: 4 },
  { band: '30–49', test: n => n <= 49, weight: 2 },
  { band: '50–99', test: () => true, weight: 1 },
];

export function racingNumberWeight(n: number): number {
  return RACING_NUMBER_WEIGHTS.find(w => w.test(n))!.weight;
}

/** `count` numbers in draw order, distinct while the 98 last; past that the
 * pool refills and numbers repeat (Nationals' hundred cars, #694). Exactly
 * `count` rng() draws, so a longer roll shares its first draws with a shorter one. */
export function rollRacingNumbers(count: number, rng: Rng): number[] {
  const fill = () => { for (let n = MIN_RACING_NUMBER; n <= MAX_RACING_NUMBER; n++) pool.push({ n, w: racingNumberWeight(n) }); };
  const pool: { n: number; w: number }[] = [];
  fill();
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    if (!pool.length) fill();
    const total = pool.reduce((s, p) => s + p.w, 0);
    let x = rng() * total;
    let idx = pool.length - 1;
    for (let j = 0; j < pool.length; j++) {
      x -= pool[j].w;
      if (x < 0) { idx = j; break; }
    }
    out.push(pool[idx].n);
    pool.splice(idx, 1);
  }
  return out;
}
