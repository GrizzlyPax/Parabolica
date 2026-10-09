// Stat grades (#452, Pax Oct 8): every stat on one 0–100 scale, read as a
// letter. 0 = the worst roll the generator can give, 100 = the best, taken
// from the generator's own ranges (DRIVER_STAT_ROLLS, STAR_RATING), so a
// re-tune keeps the scale honest. Cards add percentages of the raw value on
// top, so a carded stat can pass 100: that is grade S.
//
// Thirteen even bands (F … A+): natural rolls are uniform, so each letter is
// as common as the next. Pure; display only, never feeds the sim.
import { DRIVER_STAT_ROLLS } from '../generators/drivers';
import { STAR_RATING } from '../generators/cars';
import type { Card, StatKey } from '../cards/types';

export const GRADES = ['F', 'D−', 'D', 'D+', 'C−', 'C', 'C+', 'B−', 'B', 'B+', 'A−', 'A', 'A+'] as const;
export type Grade = (typeof GRADES)[number] | 'S';

/** The raw roll range of a stat: [worst, span]. */
export function statRange(stat: StatKey): { min: number; span: number } {
  if (stat in DRIVER_STAT_ROLLS) return DRIVER_STAT_ROLLS[stat as keyof typeof DRIVER_STAT_ROLLS];
  return { min: STAR_RATING.min, span: STAR_RATING.max - STAR_RATING.min };
}

/** A raw stat value on the 0–100 scale (unrounded). */
export function rating(stat: StatKey, raw: number): number {
  const { min, span } = statRange(stat);
  return ((raw - min) / span) * 100;
}

export function grade(value: number): Grade {
  if (value > 100) return 'S';
  return GRADES[Math.min(GRADES.length - 1, Math.max(0, Math.floor(value / (100 / GRADES.length))))];
}

/** Colour family of a grade (Pax, Oct 9: the full ramp, S purple · A green · B light green · C yellow · D orange · F red). */
export function gradeTone(g: Grade): 's' | 'a' | 'b' | 'c' | 'd' | 'f' {
  return g === 'S' ? 's' : (g[0].toLowerCase() as 'a' | 'b' | 'c' | 'd' | 'f');
}

export interface StatPart { card: Card; pct: number; points: number }

export interface StatReading {
  stat: StatKey;
  /** The rolled value, 0–100. */
  base: number;
  /** Each card's contribution, in points on the same scale. */
  parts: StatPart[];
  /** base + parts. */
  total: number;
  grade: Grade;
  baseGrade: Grade;
}

/** One stat with its cards: the same math as applyCards (base × (1 + Σ% / 100)),
 * split per card so the screen can show where each point comes from. */
export function readStat(stat: StatKey, raw: number, cards: readonly Card[]): StatReading {
  const { span } = statRange(stat);
  const base = rating(stat, raw);
  const parts = cards
    .filter(c => c.kind !== 'effect')
    .flatMap(c => c.stats.filter(s => s.stat === stat).map(s => ({ card: c, pct: s.pct, points: ((raw * s.pct) / 100 / span) * 100 })));
  const total = base + parts.reduce((a, p) => a + p.points, 0);
  return { stat, base, parts, total, grade: grade(total), baseGrade: grade(base) };
}

/** The overall grade: the mean of the readings' totals. */
export function overall(readings: readonly StatReading[]): { total: number; grade: Grade } {
  const total = readings.reduce((a, r) => a + r.total, 0) / Math.max(1, readings.length);
  return { total, grade: grade(total) };
}
