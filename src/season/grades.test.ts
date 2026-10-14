// #623: stat levels. Points read the generator's own ranges (0–100), cards add
// on the same math as the sim, level = ceil(points / 5) with the four bands.
import { describe, it, expect } from 'vitest';
import { DRIVER_STAT_ROLLS } from '../generators/drivers';
import { STAR_RATING } from '../generators/cars';
import { applyCards } from '../cards/apply';
import { CARDS_BY_ID } from '../cards/deck';
import { METAL_LADDER } from '../cards';
import { RUN_CURSES } from '../cards';
import { PLAYER_CARD_SCALE } from './pack';
import { level, levelDelta, levelTone, overall, rating, readStat } from './grades';

const card = (id: string) => CARDS_BY_ID.get(id)!;

describe('stat levels', () => {
  it('0 is the worst possible roll and 100 the best, from the generator ranges', () => {
    for (const [stat, { min, span }] of Object.entries(DRIVER_STAT_ROLLS)) {
      expect(rating(stat as never, min)).toBeCloseTo(0);
      expect(rating(stat as never, min + span)).toBeCloseTo(100);
    }
    expect(rating('power', STAR_RATING.min)).toBe(0);
    expect(rating('pitCrew', STAR_RATING.max)).toBe(100);
    expect(rating('grip', 3)).toBe(50);
  });

  it('level = ceil(points / 5), min 1; natural rolls 1–20; past 20 with cards', () => {
    expect(level(0)).toBe(1);
    expect(level(5)).toBe(1);
    expect(level(5.01)).toBe(2);
    expect(level(55)).toBe(11); // the edge case on the issue: yellow (it read B− green)
    expect(level(100)).toBe(20);
    expect(level(130)).toBe(26);
    const natural = new Set(Array.from({ length: 1001 }, (_, i) => level(i / 10)));
    expect(Math.min(...natural)).toBe(1);
    expect(Math.max(...natural)).toBe(20);
  });

  it('four bands: red 1–6 · yellow 7–11 · green 12–20 · purple 21+', () => {
    expect([1, 6, 7, 11, 12, 20, 21].map(levelTone)).toEqual(['d', 'd', 'c', 'c', 'a', 'a', 's']);
    expect(levelTone(level(55))).toBe('c');
  });

  it('card text in levels at the run\'s 3×: Bronze +3 · Silver +6 · Gold +6/+6 · Iridium +9 ×3 · curse −6', () => {
    const lv = (r: keyof typeof METAL_LADDER) => levelDelta(METAL_LADDER[r].pct * PLAYER_CARD_SCALE);
    expect([lv('bronze'), lv('silver'), lv('gold'), lv('iridium')]).toEqual(['+3', '+6', '+6', '+9']);
    expect([METAL_LADDER.gold.stats, METAL_LADDER.iridium.stats]).toEqual([2, 3]);
    expect(levelDelta(RUN_CURSES[0].stats[0].pct)).toBe('−12');
  });

  it('card points add up to exactly what applyCards gives the sim', () => {
    const raw = 0.947;
    const cards = [card('tr-driver-gold-speed+consistency'), card('eq-silver-speed')];
    const r = readStat('baseSpeed', raw, cards);
    const simmed = applyCards({ driver: { baseSpeed: raw } as never }, cards).driver!.baseSpeed;
    expect(r.total).toBeCloseTo(rating('baseSpeed', simmed), 9);
    expect(r.parts.map(p => p.pct)).toEqual([10, 10]);
    expect(r.parts.map(p => p.points)).toEqual([10, 10]); // #335: a card's pct IS its grade points
    expect(r.baseLevel).toBe(level(r.base));
    expect(r.level).toBe(level(r.total));
    expect(overall([r, readStat('luck', 0.55, [])]).total).toBeCloseTo((r.total + rating('luck', 0.55)) / 2);
  });

});
