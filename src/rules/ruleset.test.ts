import { describe, it, expect } from 'vitest';
import { defaultRuleset, resolveRuleset, isDefaultRuleset, serializeRuleset, parseRuleset, describeRuleset, describeChance, describeOdds, applyLabPreset, upgradeRuleset } from './ruleset';
import { Tag, Rarity, pickTagByRarity, toRarity, upgradeRarityOdds, RARITIES } from '../data/tags';
import { upgradePreset } from '../racecontrol/notebook';
import { RULE_CARDS, RULE_CARDS_BY_ID, ruleCardsForScope } from '../data/ruleCards';
import { CANON_VARIABLES } from '../simlab/types';
import { rollGenesisTags, buildRoster } from './genesis';
import { generateRosterFromTeams } from '../generators/drivers';
import { generateCarsForKingdoms } from '../generators/cars';
import { TEAMS } from '../data/teams';
import { mulberry32 } from '../engine/rng';
import { weatherForRace } from '../data/weather';

describe('ruleset (#241)', () => {
  it('no cards = the default, byte for byte', () => {
    expect(isDefaultRuleset(resolveRuleset([], RULE_CARDS_BY_ID))).toBe(true);
    expect(resolveRuleset([], RULE_CARDS_BY_ID).simVars).toEqual(CANON_VARIABLES);
  });

  it('every card resolves, changes something, and round-trips through JSON', () => {
    for (const c of RULE_CARDS) {
      const rs = resolveRuleset([c.id], RULE_CARDS_BY_ID);
      expect(isDefaultRuleset(rs), c.id).toBe(false);
      expect(rs.cards).toEqual([c.id]);
      expect(describeRuleset(rs).length, c.id).toBeGreaterThan(0);
      expect(parseRuleset(serializeRuleset(rs))).toEqual(rs);
    }
  });

  it('cards compose in hand order and never mutate CANON', () => {
    const rs = resolveRuleset(['demolition-derby', 'unreliable-cars', 'tag-soup'], RULE_CARDS_BY_ID);
    expect(rs.simVars.crashes.baseCrashChance).toBeCloseTo(CANON_VARIABLES.crashes.baseCrashChance * 2.5);
    expect(rs.simVars.mechanical.baseFailureChance).toBeCloseTo(CANON_VARIABLES.mechanical.baseFailureChance * 3);
    expect(rs.tags.slotCap).toBe(6);
    expect(CANON_VARIABLES.crashes.baseCrashChance).toBe(defaultRuleset().simVars.crashes.baseCrashChance);
  });

  it('scopes: Quick Race gets race + both, Founding gets season + both', () => {
    expect(ruleCardsForScope('race').map(c => c.id)).toContain('rain');
    expect(ruleCardsForScope('race').map(c => c.id)).not.toContain('always-raining');
    expect(ruleCardsForScope('season').map(c => c.id)).toContain('always-raining');
    expect(ruleCardsForScope('season').map(c => c.id)).not.toContain('rain');
    expect(ruleCardsForScope('race').map(c => c.id)).toContain('demolition-derby');
  });

  it('"Always Raining" makes every race wet; "No Tags" empties the grid', () => {
    const wet = resolveRuleset(['always-raining'], RULE_CARDS_BY_ID);
    for (let i = 0; i < 20; i++) expect(weatherForRace(7, i, wet.weather.weights).id).toBe('rain');
    const rng = mulberry32(1);
    const roster = generateRosterFromTeams(TEAMS.slice(0, 6).map(t => t.id), rng);
    const none = rollGenesisTags(roster, 99, resolveRuleset(['no-tags'], RULE_CARDS_BY_ID));
    expect([...none.values()].every(t => t.length === 0)).toBe(true);
  });

  it('a tag card re-rolls ONLY tags: names, stats and cars stay put', () => {
    const rng = mulberry32(42);
    const roster = generateRosterFromTeams(TEAMS.slice(0, 6).map(t => t.id), rng);
    const cars = generateCarsForKingdoms(TEAMS.slice(0, 6).map(t => t.id), mulberry32(43));
    const a = buildRoster(roster, cars, 5, defaultRuleset());
    const b = buildRoster(roster, cars, 5, resolveRuleset(['tag-soup'], RULE_CARDS_BY_ID));
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
    expect(rs.tags.rarityOdds).toEqual({ bronze: 60, silver: 30, gold: 9, iridium: 1 });
    expect(describeChance(rs.tags.genesisChance)).toBe('1 in 6');
    expect(describeOdds(rs.tags.rarityOdds)).toBe('60% bronze · 30% silver · 9% gold · 1% iridium');
  });
  it('bucket odds do not move when a bucket gets more tags', () => {
    const odds = { bronze: 60, silver: 30, gold: 9, iridium: 1 };
    const mk = (id: string, rarity: Rarity): Tag => ({ id, name: id, emoji: '·', description: '', target: 'driver', trigger: 'passive', rarity, effects: {} });
    const small = [mk('c1', 'bronze'), mk('r1', 'gold')];
    const big = [...small, mk('c2', 'bronze'), mk('c3', 'bronze'), mk('c4', 'bronze'), mk('c5', 'bronze')];
    const count = (pool: Tag[]) => {
      const rng = mulberry32(7); let rare = 0;
      for (let i = 0; i < 20000; i++) if (pickTagByRarity(pool, odds, rng)?.rarity === 'gold') rare++;
      return rare / 20000;
    };
    // gold bucket is 9% of hits; iridium (empty) falls into it, so ~10%
    expect(count(small)).toBeCloseTo(0.10, 1);
    expect(count(big)).toBeCloseTo(count(small), 2);
  });
});

// #385: rarity became metals. Saves, Lab presets and the ledger from before
// still name common…legendary; they must load, and replay the same races.
describe('rarity metals: old saves still load', () => {
  const legacyOdds = { common: 50, uncommon: 30, rare: 15, legendary: 5 };
  const legacyTag = (id: string, rarity: string): Tag => ({ id, name: id, emoji: '·', description: '', target: 'driver', trigger: 'passive', rarity: rarity as Rarity, effects: {} });

  it('maps every old name to its metal, in order', () => {
    expect(['common', 'uncommon', 'rare', 'legendary'].map(toRarity)).toEqual(RARITIES);
    expect(toRarity('gold')).toBe('gold');
    expect(upgradeRarityOdds(legacyOdds)).toEqual({ bronze: 50, silver: 30, gold: 15, iridium: 5 });
  });

  it('a saved ruleset with old odds keys and an old Lab tag parses onto metals', () => {
    const old = JSON.parse(serializeRuleset(defaultRuleset()));
    old.tags.rarityOdds = legacyOdds;
    old.lab = { name: 'old', tagEdits: { x: legacyTag('x', 'legendary') }, knobEdits: {} };
    const rs = parseRuleset(JSON.stringify(old))!;
    expect(rs.tags.rarityOdds).toEqual({ bronze: 50, silver: 30, gold: 15, iridium: 5 });
    expect(rs.lab!.tagEdits.x.rarity).toBe('iridium');
    expect(describeOdds(rs.tags.rarityOdds)).toBe('50% bronze · 30% silver · 15% gold · 5% iridium');
  });

  it('an old Lab preset (local or ledger) upgrades its tag edits', () => {
    const preset = { id: 'p', name: 'old', createdAt: 0, tagEdits: { x: legacyTag('x', 'uncommon') }, knobEdits: {} };
    expect(upgradePreset(preset as never).tagEdits.x.rarity).toBe('silver');
    expect(applyLabPreset(defaultRuleset(), preset).lab!.tagEdits.x.rarity).toBe('silver');
  });

  it('the genesis draw picks the same tags from old and new names (same seed)', () => {
    const pool = (names: string[]) => names.map((r, i) => legacyTag(`t${i}`, r));
    const oldPool = pool(['common', 'common', 'uncommon', 'rare', 'legendary']);
    const newPool = pool(['bronze', 'bronze', 'silver', 'gold', 'iridium']);
    const draw = (p: Tag[], odds: Record<string, number>) => { const rng = mulberry32(42); return Array.from({ length: 200 }, () => pickTagByRarity(p, odds as never, rng)?.id); };
    expect(draw(oldPool, legacyOdds)).toEqual(draw(newPool, upgradeRarityOdds(legacyOdds)));
  });

  it('upgradeRuleset leaves the input alone', () => {
    const old = defaultRuleset() as unknown as { tags: { rarityOdds: Record<string, number> } };
    old.tags.rarityOdds = { ...legacyOdds };
    const up = upgradeRuleset(old as never);
    expect(Object.keys(old.tags.rarityOdds)).toEqual(['common', 'uncommon', 'rare', 'legendary']);
    expect(up.tags.rarityOdds.iridium).toBe(5);
  });
});
