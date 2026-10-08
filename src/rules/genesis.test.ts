// #337: Quick Race runs on trait cards. The card path is separate from the
// tag path (leagues, the lab) and lives on its own seed streams.
import { describe, it, expect } from 'vitest';
import { buildCardRoster, buildRoster, rollGenesisTraits } from './genesis';
import { defaultRuleset, resolveRuleset } from './ruleset';
import { RULE_CARDS_BY_ID } from '../data/ruleCards';
import { generateRosterFromTeams } from '../generators/drivers';
import { generateCarsForKingdoms } from '../generators/cars';
import { generateGenesisRoster } from '../league/league';
import { TEAMS } from '../data/teams';
import { mulberry32, deriveSeed } from '../engine/rng';

const GRID = TEAMS.slice(0, 11).map(t => t.id);

function universe(seed: number) {
  return {
    drivers: generateRosterFromTeams(GRID, mulberry32(deriveSeed(seed, 'genesis', 'drivers'))),
    cars: generateCarsForKingdoms(GRID, mulberry32(deriveSeed(seed, 'genesis', 'cars'))),
  };
}

describe('Quick Race on cards', () => {
  it('same seed → the same grid twice; different seeds differ', () => {
    const u = universe(7);
    const a = buildCardRoster(u.drivers, u.cars, 7, defaultRuleset());
    const b = buildCardRoster(u.drivers, u.cars, 7, defaultRuleset());
    expect(b).toEqual(a);
    const c = buildCardRoster(u.drivers, u.cars, 8, defaultRuleset());
    expect(c.map(d => d.cards!.map(x => x.id))).not.toEqual(a.map(d => d.cards!.map(x => x.id)));
  });

  it('deals trait cards (never gear or effects), bakes them into the stats, and leaves engine tags empty', () => {
    let hits = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const u = universe(seed);
      const plain = buildRoster(u.drivers, u.cars, seed, resolveRuleset(['no-tags'], RULE_CARDS_BY_ID));
      const carded = buildCardRoster(u.drivers, u.cars, seed, defaultRuleset());
      for (let i = 0; i < carded.length; i++) {
        const d = carded[i];
        expect(d.tags).toEqual([]);
        for (const c of d.cards!) { expect(c.kind).toBe('trait'); hits++; }
        const speedPct = d.cards!.flatMap(c => c.stats).filter(s => s.stat === 'baseSpeed').reduce((s, x) => s + x.pct, 0);
        expect(d.stats.baseSpeed).toBeCloseTo(plain[i].stats.baseSpeed * (1 + speedPct / 100), 10);
        const powerPct = d.cards!.flatMap(c => c.stats).filter(s => s.stat === 'power').reduce((s, x) => s + x.pct, 0);
        expect(d.carStats!.power).toBeCloseTo(plain[i].carStats!.power * (1 + powerPct / 100), 10);
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
    const a = buildCardRoster(u.drivers, u.cars, 3, defaultRuleset());
    const nums = a.map(d => d.number!);
    expect(new Set(nums).size).toBe(22);
    for (const n of nums) { expect(n).toBeGreaterThanOrEqual(2); expect(n).toBeLessThanOrEqual(99); }
    expect(buildCardRoster(u.drivers, u.cars, 3, defaultRuleset()).map(d => d.number)).toEqual(nums);
  });

  it('the rule cards still steer the roll: No Tags deals no cards; Tag Soup deals many', () => {
    const u = universe(5);
    const none = buildCardRoster(u.drivers, u.cars, 5, resolveRuleset(['no-tags'], RULE_CARDS_BY_ID));
    expect(none.every(d => d.cards!.length === 0)).toBe(true);
    const soup = buildCardRoster(u.drivers, u.cars, 5, resolveRuleset(['tag-soup'], RULE_CARDS_BY_ID));
    expect(soup.reduce((s, d) => s + d.cards!.length, 0)).toBeGreaterThan(none.length);
  });

  it('leagues keep the tag path: generateGenesisRoster without the flag deals tags, with it cards', () => {
    const tags = generateGenesisRoster(11, GRID);
    const cards = generateGenesisRoster(11, GRID, [], defaultRuleset(), true);
    expect(tags.every(d => d.cards === undefined)).toBe(true);
    expect(cards.every(d => d.tags.length === 0 && Array.isArray(d.cards))).toBe(true);
    // Same people and cars either way: only what they're born with differs.
    expect(cards.map(d => d.fullName)).toEqual(tags.map(d => d.fullName));
    expect(cards.map(d => d.carName)).toEqual(tags.map(d => d.carName));
  });
});
