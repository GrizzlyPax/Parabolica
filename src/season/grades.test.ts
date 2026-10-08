// #452: grades read the generator's own ranges, cards add on the same math
// as the sim, and the bands cover 0–100 evenly.
import { describe, it, expect } from 'vitest';
import { DRIVER_STAT_ROLLS } from '../generators/drivers';
import { STAR_RATING } from '../generators/cars';
import { applyCards } from '../cards/apply';
import { CARDS_BY_ID } from '../cards/deck';
import { GRADES, grade, gradeTone, overall, rating, readStat } from './grades';

const card = (id: string) => CARDS_BY_ID.get(id)!;

describe('grades', () => {
  it('0 is the worst possible roll and 100 the best, from the generator ranges', () => {
    for (const [stat, { min, span }] of Object.entries(DRIVER_STAT_ROLLS)) {
      expect(rating(stat as never, min)).toBeCloseTo(0);
      expect(rating(stat as never, min + span)).toBeCloseTo(100);
    }
    expect(rating('power', STAR_RATING.min)).toBe(0);
    expect(rating('pitCrew', STAR_RATING.max)).toBe(100);
    expect(rating('grip', 3)).toBe(50);
  });

  it('thirteen even bands, F to A+, and S past 100', () => {
    expect(grade(0)).toBe('F');
    expect(grade(100)).toBe('A+');
    expect(grade(100.01)).toBe('S');
    expect(grade(50)).toBe('C+'); // the middle of 13 letters (F … A+)
    const seen = new Set(Array.from({ length: 1001 }, (_, i) => grade(i / 10)));
    expect([...seen]).toEqual([...GRADES]);
    expect([gradeTone('S'), gradeTone('A−'), gradeTone('B+'), gradeTone('C'), gradeTone('D−'), gradeTone('F')]).toEqual(['s', 'a', 'b', 'c', 'd', 'f']);
  });

  it('card points add up to exactly what applyCards gives the sim', () => {
    const raw = 0.947;
    const cards = [card('tr-driver-gold-speed+consistency'), card('eq-silver-speed')];
    const r = readStat('baseSpeed', raw, cards);
    const simmed = applyCards({ driver: { baseSpeed: raw } as never }, cards).driver!.baseSpeed;
    expect(r.total).toBeCloseTo(rating('baseSpeed', simmed), 9);
    expect(r.parts.map(p => p.pct)).toEqual([10, 5]);
    expect(r.baseGrade).toBe(grade(r.base));
    expect(overall([r, readStat('luck', 0.55, [])]).total).toBeCloseTo((r.total + rating('luck', 0.55)) / 2);
  });
});
