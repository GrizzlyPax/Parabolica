// #696: rookies are dealt near-identical. Level 5 ± the wobble on every stat,
// a 2★ car and team, no traits, American two-word names; your pair on its own
// stream, the field on the pool's. No archetypes, no setups, no pick.
import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../engine/rng';
import { ROOKIE_GRADE, ROOKIE_WOBBLE, ROOKIE_ID_BASE, dealRookies, rookieDriver, rookieCar, rookieTeamStats, gradeToRaw } from './rookies';
import { rating } from './grades';
import { DRIVER_STATS, type DriverStatKey } from '../cards';
import { US_FIRST_NAMES, US_LAST_NAMES, INTL_FIRST_NAMES, INTL_LAST_NAMES, generateAmericanDriverName, RUN_US_SHARE } from '../generators/names';

describe('dealt rookies (#696)', () => {
  it('every stat is level 5 ± the wobble, no traits, a two-word name', () => {
    const rng = mulberry32(9);
    for (let i = 0; i < 40; i++) {
      const d = rookieDriver(i, 10 + i, rng);
      expect(d.traits).toEqual([]);
      expect(d.number).toBe(10 + i);
      expect(d.fullName.split(' ')).toHaveLength(2);
      for (const st of DRIVER_STATS) expect(Math.abs(rating(st, d.stats[st as DriverStatKey]) - ROOKIE_GRADE)).toBeLessThanOrEqual(ROOKIE_WOBBLE + 1e-9);
    }
    expect(gradeToRaw('power', 25)).toBe(2);
    expect(gradeToRaw('baseSpeed', 0)).toBe(0.85);
    const car = rookieCar('car-x', mulberry32(3));
    expect(car.traits).toEqual([]);
    for (const v of Object.values(car.stats)) expect(Math.abs(v - 2)).toBeLessThanOrEqual(0.2 + 1e-9);
    for (const v of Object.values(rookieTeamStats(mulberry32(4)))) expect(Math.abs(v - 2)).toBeLessThanOrEqual(0.2 + 1e-9);
  });

  it('your pair, car and team stats are dealt on the run seed: deterministic, ids above the stride, faces on the seed', () => {
    const a = dealRookies(21), b = dealRookies(21), c = dealRookies(22);
    expect(a).toEqual(b);
    expect(a.drivers.map(d => d.fullName)).not.toEqual(c.drivers.map(d => d.fullName));
    expect(a.drivers.map(d => d.id)).toEqual([ROOKIE_ID_BASE, ROOKIE_ID_BASE + 1]);
    expect(a.drivers.every(d => d.avatarSeed === 21)).toBe(true);
    expect(a.car).toMatchObject({ id: 'car-you', avatarSeed: 21, traits: [] });
    expect(a.drivers[0].number).not.toBe(a.drivers[1].number);
  });

  it('names are American: each half from the US pool about 92% of the time, the rest international, never absurd or one word', () => {
    const rng = mulberry32(5);
    let us = 0, n = 0;
    for (let i = 0; i < 2000; i++) {
      const name = generateAmericanDriverName(rng);
      expect(name.lastName).not.toBe('');
      expect(name.isCorrupted).toBe(false);
      if (US_FIRST_NAMES.includes(name.firstName)) us++; else expect(INTL_FIRST_NAMES.includes(name.firstName)).toBe(true);
      if (US_LAST_NAMES.includes(name.lastName)) us++; else expect(INTL_LAST_NAMES.includes(name.lastName)).toBe(true);
      n += 2;
    }
    expect(us / n).toBeGreaterThan(RUN_US_SHARE - 0.03);
    expect(us / n).toBeLessThan(RUN_US_SHARE + 0.03);
  });
});
