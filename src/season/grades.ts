// Stat levels (#623, Pax Oct 10; Steward's Levels and XP Report): every stat
// on one 0–100 points scale, read as a LEVEL. 0 = the worst roll the
// generator can give, 100 = the best, taken from the generator's own ranges
// (DRIVER_STAT_ROLLS, STAR_RATING), so a re-tune keeps the scale honest.
//
// Level = ceil(points / 5), min 1: natural rolls land on 1–20; cards push
// past 20 (purple). Colour bands, the four F1 colours: red 1–6 · yellow 7–11
// · green 12–20 · purple 21+. One vocabulary: stats have levels; drivers have
// ranks (ranks.ts); leagues are tiers. Pure; display only, never feeds the sim.
import { statRange } from '../cards/apply';
import type { Card, StatKey } from '../cards/types';

export { statRange };

/** Grade points per level. */
export const POINTS_PER_LEVEL = 5;
/** The top natural level (100 points). */
export const MAX_NATURAL_LEVEL = 20;

/** A raw stat value on the 0–100 points scale (unrounded). */
export function rating(stat: StatKey, raw: number): number {
  const { min, span } = statRange(stat);
  return ((raw - min) / span) * 100;
}

/** Points → level: ceil(points / 5), min 1. */
export function level(points: number): number {
  return Math.max(1, Math.ceil(points / POINTS_PER_LEVEL - 1e-9));
}

/** Points as a level change, for card text: +3, −6 (one decimal when it isn't whole). */
export function levelDelta(points: number): string {
  const v = Math.round((points / POINTS_PER_LEVEL) * 10) / 10;
  return `${v >= 0 ? '+' : '−'}${Math.abs(v)}`;
}

/** Colour band of a level, as the tone classes the screens already style:
 * 's' purple 21+ · 'a' green 12–20 · 'c' yellow 7–11 · 'd' red 1–6. */
export type LevelTone = 's' | 'a' | 'c' | 'd';
export function levelTone(lv: number): LevelTone {
  return lv > MAX_NATURAL_LEVEL ? 's' : lv >= 12 ? 'a' : lv >= 7 ? 'c' : 'd';
}

export interface StatPart { card: Card; pct: number; points: number }

export interface StatReading {
  stat: StatKey;
  /** The rolled value, 0–100 points. */
  base: number;
  /** Each card's contribution, in points on the same scale. */
  parts: StatPart[];
  /** base + parts. */
  total: number;
  level: number;
  baseLevel: number;
}

/** One stat with its cards: the same math as applyCards (a card's pct IS its
 * grade points, #335), split per card so the screen can show where each
 * point comes from. */
export function readStat(stat: StatKey, raw: number, cards: readonly Card[]): StatReading {
  const base = rating(stat, raw);
  // A window card (#647) counts for half the race, not in the sum.
  const parts = cards
    .filter(c => c.kind !== 'effect' && !c.window)
    .flatMap(c => c.stats.filter(s => s.stat === stat).map(s => ({ card: c, pct: s.pct, points: s.pct })));
  const total = base + parts.reduce((a, p) => a + p.points, 0);
  return { stat, base, parts, total, level: level(total), baseLevel: level(base) };
}

/** The overall level: the mean of the readings' totals. */
export function overall(readings: readonly StatReading[]): { total: number; level: number } {
  const total = readings.reduce((a, r) => a + r.total, 0) / Math.max(1, readings.length);
  return { total, level: level(total) };
}
