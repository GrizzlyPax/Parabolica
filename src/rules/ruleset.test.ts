import { describe, it, expect } from 'vitest';
import { defaultRuleset, resolveRuleset, isDefaultRuleset, serializeRuleset, parseRuleset, describeRuleset, describeChance, describeOdds } from './ruleset';
import { Tag, Rarity, pickTagByRarity } from '../data/tags';
import { CARDS, CARDS_BY_ID, cardsForScope } from '../data/cards';
import { CANON_VARIABLES } from '../simlab/types';
import { rollGenesisTags, buildRoster } from './genesis';
import { generateRosterFromTeams } from '../generators/drivers';
import { generateCarsForKingdoms } from '../generators/cars';
import { TEAMS } from '../data/teams';
import { mulberry32 } from '../engine/rng';
import { weatherForRace } from '../data/weather';

describe('ruleset (#241)', () => {
  it('no cards = the default, byte for byte', () => {
    expect(isDefaultRuleset(resolveRuleset([], CARDS_BY_ID))).toBe(true);
    expect(resolveRuleset([], CARDS_BY_ID).simVars).toEqual(CANON_VARIABLES);
  });

  it('every card resolves, changes something, and round-trips through JSON', () => {
    for (const c of CARDS) {
      const rs = resolveRuleset([c.id], CARDS_BY_ID);
      expect(isDefaultRuleset(rs), c.id).toBe(false);
      expect(rs.cards).toEqual([c.id]);
      expect(describeRuleset(rs).length, c.id).toBeGreaterThan(0);
      expect(parseRuleset(serializeRuleset(rs))).toEqual(rs);
    }
  });

  it('cards compose in hand order and never mutate CANON', () => {
    const rs = resolveRuleset(['demolition-derby', 'unreliable-cars', 'tag-soup'], CARDS_BY_ID);
    expect(rs.simVars.crashes.baseCrashChance).toBeCloseTo(CANON_VARIABLES.crashes.baseCrashChance * 2.5);
    expect(rs.simVars.mechanical.baseFailureChance).toBeCloseTo(CANON_VARIABLES.mechanical.baseFailureChance * 3);
    expect(rs.tags.slotCap).toBe(6);
    expect(CANON_VARIABLES.crashes.baseCrashChance).toBe(defaultRuleset().simVars.crashes.baseCrashChance);
  });

  it('scopes: Quick Race gets race + both, Founding gets season + both', () => {
    expect(cardsForScope('race').map(c => c.id)).toContain('rain');
    expect(cardsForScope('race').map(c => c.id)).not.toContain('always-raining');
    expect(cardsForScope('season').map(c => c.id)).toContain('always-raining');
    expect(cardsForScope('season').map(c => c.id)).not.toContain('rain');
    expect(cardsForScope('race').map(c => c.id)).toContain('demolition-derby');
  });

  it('"Always Raining" makes every race wet; "No Tags" empties the grid', () => {
    const wet = resolveRuleset(['always-raining'], CARDS_BY_ID);
    for (let i = 0; i < 20; i++) expect(weatherForRace(7, i, wet.weather.weights).id).toBe('rain');
    const rng = mulberry32(1);
    const roster = generateRosterFromTeams(TEAMS.slice(0, 6).map(t => t.id), rng);
    const none = rollGenesisTags(roster, 99, resolveRuleset(['no-tags'], CARDS_BY_ID));
    expect([...none.values()].every(t => t.length === 0)).toBe(true);
  });

  it('a tag card re-rolls ONLY tags: names, stats and cars stay put', () => {
    const rng = mulberry32(42);
    const roster = generateRosterFromTeams(TEAMS.slice(0, 6).map(t => t.id), rng);
    const cars = generateCarsForKingdoms(TEAMS.slice(0, 6).map(t => t.id), mulberry32(43));
    const a = buildRoster(roster, cars, 5, defaultRuleset());
    const b = buildRoster(roster, cars, 5, resolveRuleset(['tag-soup'], CARDS_BY_ID));
    expect(b.map(d => [d.fullName, d.stats, d.carStats])).toEqual(a.map(d => [d.fullName, d.stats, d.carStats]));
    const tagsA = a.reduce((n, d) => n + d.tags.length, 0), tagsB = b.reduce((n, d) => n + d.tags.length, 0);
    expect(tagsB).toBeGreaterThan(tagsA);
    // and the same ruleset + seed is reproducible
    expect(buildRoster(roster, cars, 5, defaultRuleset())).toEqual(a);
  });
});

describe('genesis roll odds (#241 → rarity buckets)', () => {
  it('defaults: 1 in 6 per slot, 60/30/9/1 buckets', () => {
    const rs = defaultRuleset();
    expect(rs.tags.genesisChance).toBeCloseTo(1 / 6);
    expect(rs.tags.rarityOdds).toEqual({ common: 60, uncommon: 30, rare: 9, legendary: 1 });
    expect(describeChance(rs.tags.genesisChance)).toBe('1 in 6');
    expect(describeOdds(rs.tags.rarityOdds)).toBe('60% common · 30% uncommon · 9% rare · 1% legendary');
  });
  it('bucket odds do not move when a bucket gets more tags', () => {
    const odds = { common: 60, uncommon: 30, rare: 9, legendary: 1 };
    const mk = (id: string, rarity: Rarity): Tag => ({ id, name: id, emoji: '·', description: '', target: 'driver', trigger: 'passive', rarity, effects: {} });
    const small = [mk('c1', 'common'), mk('r1', 'rare')];
    const big = [...small, mk('c2', 'common'), mk('c3', 'common'), mk('c4', 'common'), mk('c5', 'common')];
    const count = (pool: Tag[]) => {
      const rng = mulberry32(7); let rare = 0;
      for (let i = 0; i < 20000; i++) if (pickTagByRarity(pool, odds, rng)?.rarity === 'rare') rare++;
      return rare / 20000;
    };
    // rare bucket is 9% of hits; legendary (empty) falls into it, so ~10%
    expect(count(small)).toBeCloseTo(0.10, 1);
    expect(count(big)).toBeCloseTo(count(small), 2);
  });
});
