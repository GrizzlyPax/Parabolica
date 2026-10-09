// Genesis on trait cards (#337, #334): the one roster path for Quick Race,
// leagues and the lab, on its own seed streams.
import { describe, it, expect } from 'vitest';
import { buildRoster, rollGenesisTraits } from './genesis';
import { defaultRuleset, resolveRuleset } from './ruleset';
import { RULE_CARDS_BY_ID } from '../data/ruleCards';
import { generateRosterFromTeams } from '../generators/drivers';
import { generateCarsForKingdoms } from '../generators/cars';
import { generateGenesisRoster } from '../league/league';
import { TEAMS } from '../data/teams';
import { mulberry32, deriveSeed } from '../engine/rng';

const GRID = TEAMS.slice(0, 11).map(t => t.id);
const NO_CARDS = resolveRuleset(['no-tags'], RULE_CARDS_BY_ID);

function universe(seed: number) {
  return {
    drivers: generateRosterFromTeams(GRID, mulberry32(deriveSeed(seed, 'genesis', 'drivers'))),
    cars: generateCarsForKingdoms(GRID, mulberry32(deriveSeed(seed, 'genesis', 'cars'))),
  };
}

describe('genesis on cards', () => {
  it('same seed → the same grid twice; different seeds differ', () => {
    const u = universe(7);
    const a = buildRoster(u.drivers, u.cars, 7, defaultRuleset());
    const b = buildRoster(u.drivers, u.cars, 7, defaultRuleset());
    expect(b).toEqual(a);
    const c = buildRoster(u.drivers, u.cars, 8, defaultRuleset());
    expect(c.map(d => d.cards!.map(x => x.id))).not.toEqual(a.map(d => d.cards!.map(x => x.id)));
  });

  it('deals trait cards (never gear or effects) and bakes them into the stats as grade points (#335)', () => {
    let hits = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const u = universe(seed);
      const plain = buildRoster(u.drivers, u.cars, seed, NO_CARDS);
      const carded = buildRoster(u.drivers, u.cars, seed, defaultRuleset());
      for (let i = 0; i < carded.length; i++) {
        const d = carded[i];
        for (const c of d.cards!) { expect(c.kind).toBe('trait'); hits++; }
        const speedPct = d.cards!.flatMap(c => c.stats).filter(s => s.stat === 'baseSpeed').reduce((s, x) => s + x.pct, 0);
        expect(d.stats.baseSpeed).toBeCloseTo(plain[i].stats.baseSpeed + (speedPct * 0.30) / 100, 10);
        const powerPct = d.cards!.flatMap(c => c.stats).filter(s => s.stat === 'power').reduce((s, x) => s + x.pct, 0);
        expect(d.carStats!.power).toBeCloseTo(plain[i].carStats!.power + (powerPct * 4) / 100, 10);
      }
    }
    // Three slots per driver at 1-in-6 each: about 0.5 cards per driver (the team slot is shared).
    expect(hits / (20 * 22)).toBeGreaterThan(0.3);
    expect(hits / (20 * 22)).toBeLessThan(0.75);
  });

  it('teammates share the team trait; the driver and car traits are their own', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const u = universe(seed);
      const traits = rollGenesisTraits(u.drivers, seed, defaultRuleset());
      for (const d of u.drivers) {
        const mate = u.drivers.find(x => x.kingdomId === d.kingdomId && x.id !== d.id)!;
        const team = (id: number) => traits.get(id)!.filter(c => c.target === 'team').map(c => c.id);
        expect(team(d.id)).toEqual(team(mate.id));
      }
    }
  });

  it('racing numbers: 2–99, unique on the grid, stable for a seed', () => {
    const u = universe(3);
    const a = buildRoster(u.drivers, u.cars, 3, defaultRuleset());
    const nums = a.map(d => d.number!);
    expect(new Set(nums).size).toBe(22);
    for (const n of nums) { expect(n).toBeGreaterThanOrEqual(2); expect(n).toBeLessThanOrEqual(99); }
    expect(buildRoster(u.drivers, u.cars, 3, defaultRuleset()).map(d => d.number)).toEqual(nums);
  });

  it('the rule cards steer the roll: No Traits deals no cards; Trait Soup deals many', () => {
    const u = universe(5);
    const none = buildRoster(u.drivers, u.cars, 5, NO_CARDS);
    expect(none.every(d => d.cards!.length === 0)).toBe(true);
    const soup = buildRoster(u.drivers, u.cars, 5, resolveRuleset(['tag-soup'], RULE_CARDS_BY_ID));
    expect(soup.reduce((s, d) => s + d.cards!.length, 0)).toBeGreaterThan(none.length);
  });

  it('a league grid is this path: generateGenesisRoster deals cards and numbers', () => {
    const grid = generateGenesisRoster(11, GRID);
    expect(grid.every(d => Array.isArray(d.cards) && typeof d.number === 'number')).toBe(true);
    expect(grid.some(d => d.cards!.length > 0)).toBe(true);
    // No Traits keeps the same people and cars: only what they're born with differs.
    const clean = generateGenesisRoster(11, GRID, [], NO_CARDS);
    expect(clean.map(d => d.fullName)).toEqual(grid.map(d => d.fullName));
    expect(clean.map(d => d.carName)).toEqual(grid.map(d => d.carName));
    expect(clean.every(d => d.cards!.length === 0)).toBe(true);
  });
});
