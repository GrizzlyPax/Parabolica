import { describe, it, expect } from 'vitest';
import { defaultRuleset, resolveRuleset, isDefaultRuleset, serializeRuleset, parseRuleset, describeRuleset, describeChance, describeOdds, applyLabPreset, upgradeRuleset } from './ruleset';
import { toRarity, upgradeRarityOdds, rollRarity, RARITIES } from '../cards/rarity';
import { upgradePreset } from '../racecontrol/notebook';
import { RULE_CARDS, RULE_CARDS_BY_ID, ruleCardsForScope } from '../data/ruleCards';
import { CANON_VARIABLES } from '../simlab/types';
import { rollGenesisTraits, buildRoster } from './genesis';
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
    const rs = resolveRuleset(['demolition-derby', 'unreliable-cars', 'trait-soup'], RULE_CARDS_BY_ID);
    expect(rs.simVars.crashes.baseCrashChance).toBeCloseTo(CANON_VARIABLES.crashes.baseCrashChance * 2.5);
    expect(rs.simVars.mechanical.baseFailureChance).toBeCloseTo(CANON_VARIABLES.mechanical.baseFailureChance * 3);
    expect(rs.traits.genesisChance).toBe(0.45);
    expect(CANON_VARIABLES.crashes.baseCrashChance).toBe(defaultRuleset().simVars.crashes.baseCrashChance);
  });

  it('scopes: Quick Race gets race + both, Founding gets season + both', () => {
    expect(ruleCardsForScope('race').map(c => c.id)).toContain('rain');
    expect(ruleCardsForScope('race').map(c => c.id)).not.toContain('always-raining');
    expect(ruleCardsForScope('season').map(c => c.id)).toContain('always-raining');
    expect(ruleCardsForScope('season').map(c => c.id)).not.toContain('rain');
    expect(ruleCardsForScope('race').map(c => c.id)).toContain('demolition-derby');
  });

  it('"Windswept" favours every race the same way; "No Traits" empties the grid', () => {
    const wet = resolveRuleset(['always-raining'], RULE_CARDS_BY_ID);
    for (let i = 0; i < 20; i++) expect(weatherForRace(7, i, wet.weather.weights).id).toBe('aggression-grip');
    const rng = mulberry32(1);
    const roster = generateRosterFromTeams(TEAMS.slice(0, 6).map(t => t.id), rng);
    const none = rollGenesisTraits(roster, 99, resolveRuleset(['no-traits'], RULE_CARDS_BY_ID));
    expect([...none.values()].every(t => t.length === 0)).toBe(true);
  });

  it('a trait card re-rolls ONLY the cards: names, numbers and cars stay put', () => {
    const rng = mulberry32(42);
    const roster = generateRosterFromTeams(TEAMS.slice(0, 6).map(t => t.id), rng);
    const cars = generateCarsForKingdoms(TEAMS.slice(0, 6).map(t => t.id), mulberry32(43));
    const a = buildRoster(roster, cars, 5, defaultRuleset());
    const b = buildRoster(roster, cars, 5, resolveRuleset(['trait-soup'], RULE_CARDS_BY_ID));
    expect(b.map(d => [d.fullName, d.number, d.carName])).toEqual(a.map(d => [d.fullName, d.number, d.carName]));
    const cardsA = a.reduce((n, d) => n + d.cards!.length, 0), cardsB = b.reduce((n, d) => n + d.cards!.length, 0);
    expect(cardsB).toBeGreaterThan(cardsA);
    // and the same ruleset + seed is reproducible
    expect(buildRoster(roster, cars, 5, defaultRuleset())).toEqual(a);
  });
});

describe('genesis roll odds (#241 → metals)', () => {
  it('defaults: 1 in 6 per slot, 60/30/9/1 metals', () => {
    const rs = defaultRuleset();
    expect(rs.traits.genesisChance).toBeCloseTo(1 / 6);
    expect(rs.traits.rarityOdds).toEqual({ bronze: 60, silver: 30, gold: 9, iridium: 1 });
    expect(describeChance(rs.traits.genesisChance)).toBe('1 in 6');
    expect(describeOdds(rs.traits.rarityOdds)).toBe('60% bronze · 30% silver · 9% gold · 1% iridium');
  });
  it('the metal roll follows the odds', () => {
    const odds = { bronze: 60, silver: 30, gold: 9, iridium: 1 };
    const rng = mulberry32(7); let gold = 0;
    for (let i = 0; i < 20000; i++) if (rollRarity(odds, rng) === 'gold') gold++;
    expect(gold / 20000).toBeCloseTo(0.09, 1);
  });
});

// #385: rarity became metals. Saves, Lab presets and the ledger from before
// still name common…legendary; they must load, and replay the same races.
describe('rarity metals: old saves still load', () => {
  const legacyOdds = { common: 50, uncommon: 30, rare: 15, legendary: 5 };

  it('maps every old name to its metal, in order', () => {
    expect(['common', 'uncommon', 'rare', 'legendary'].map(toRarity)).toEqual(RARITIES);
    expect(toRarity('gold')).toBe('gold');
    expect(upgradeRarityOdds(legacyOdds)).toEqual({ bronze: 50, silver: 30, gold: 15, iridium: 5 });
  });

  it('a pre-#334 ruleset (odds under `tags`, old keys, a Lab tag edit) parses onto traits + metals', () => {
    const old = JSON.parse(serializeRuleset(defaultRuleset()));
    old.tags = { pool: ['x'], genesisChance: 0.25, rarityOdds: legacyOdds, slotCap: 3 };
    delete old.traits;
    old.lab = { name: 'old', tagEdits: { x: { id: 'x', rarity: 'legendary' } }, knobEdits: { 'crashes.baseCrashChance': 0.5 } };
    const rs = parseRuleset(JSON.stringify(old))!;
    expect(rs.traits.genesisChance).toBe(0.25);
    expect(rs.traits.rarityOdds).toEqual({ bronze: 50, silver: 30, gold: 15, iridium: 5 });
    expect('tags' in rs).toBe(false);
    expect(rs.lab).toEqual({ name: 'old', knobEdits: { 'crashes.baseCrashChance': 0.5 } });
    expect(describeOdds(rs.traits.rarityOdds)).toBe('50% bronze · 30% silver · 15% gold · 5% iridium');
  });

  it('an old Lab preset (local or ledger) drops its tag edits and keeps its knobs', () => {
    const preset = { id: 'p', name: 'old', createdAt: 0, tagEdits: { x: { id: 'x', rarity: 'uncommon' } }, knobEdits: { 'crashes.baseCrashChance': 0.5 } };
    const up = upgradePreset(preset as never);
    expect('tagEdits' in up).toBe(false);
    expect(up.knobEdits).toEqual(preset.knobEdits);
    expect(applyLabPreset(defaultRuleset(), up).lab).toEqual({ name: 'old', knobEdits: preset.knobEdits });
  });

  it('the metal roll picks the same metals from old and new odds names (same seed)', () => {
    const draw = (odds: Record<string, number>) => { const rng = mulberry32(42); return Array.from({ length: 200 }, () => rollRarity(odds as never, rng)); };
    expect(draw(legacyOdds)).toEqual(draw(upgradeRarityOdds(legacyOdds)));
  });

  it('upgradeRuleset leaves the input alone', () => {
    const old = defaultRuleset() as unknown as { traits: { rarityOdds: Record<string, number> } };
    old.traits.rarityOdds = { ...legacyOdds };
    const up = upgradeRuleset(old as never);
    expect(Object.keys(old.traits.rarityOdds)).toEqual(['common', 'uncommon', 'rare', 'legendary']);
    expect(up.traits.rarityOdds.iridium).toBe(5);
  });
});

describe('retired rule-card ids (#579)', () => {
  it('tag-soup / no-tags still resolve to Trait Soup / No Traits, and normalise to the new ids', async () => {
    const { RULE_CARD_ALIASES, canonicalCardIds } = await import('../data/ruleCards');
    expect(RULE_CARD_ALIASES).toEqual({ 'tag-soup': 'trait-soup', 'no-tags': 'no-traits' });
    expect(RULE_CARDS_BY_ID.get('tag-soup')?.id).toBe('trait-soup');
    expect(RULE_CARDS_BY_ID.get('no-tags')?.name).toBe('No Traits');
    expect(resolveRuleset(['no-tags'], RULE_CARDS_BY_ID)).toEqual(resolveRuleset(['no-traits'], RULE_CARDS_BY_ID));
    expect(canonicalCardIds(['rain', 'tag-soup'])).toEqual(['rain', 'trait-soup']);
    const { labSpec } = await import('../racecontrol/runner');
    expect(labSpec(7, 0, ['no-tags']).cardIds).toEqual(['no-traits']);
    const { upgradeRuns } = await import('../racecontrol/notebook');
    const [run] = upgradeRuns([{ kind: 'physics', result: { cards: ['no-tags'] } }]);
    expect(run.result.cards).toEqual(['no-traits']);
  });
});

describe('Spec Cars (#582)', () => {
  it('every car is 3 stars before cards; without the card, cars are as rolled', () => {
    const ids = TEAMS.slice(0, 6).map(t => t.id);
    const roster = generateRosterFromTeams(ids, mulberry32(3));
    const cars = generateCarsForKingdoms(ids, mulberry32(4));
    const spec = buildRoster(roster, cars, 5, resolveRuleset(['spec-cars', 'no-traits'], RULE_CARDS_BY_ID));
    for (const d of spec) expect([d.carStats?.power, d.carStats?.grip, d.carStats?.reliability]).toEqual([3, 3, 3]);
    const plain = buildRoster(roster, cars, 5, resolveRuleset(['no-traits'], RULE_CARDS_BY_ID));
    expect(new Set(plain.map(d => `${d.carStats?.power}${d.carStats?.grip}${d.carStats?.reliability}`)).size).toBeGreaterThan(1);
    expect(resolveRuleset([], RULE_CARDS_BY_ID).cars).toBeUndefined();
    expect(describeRuleset(resolveRuleset(['spec-cars'], RULE_CARDS_BY_ID))).toContain('Spec cars: every car 3★ (power, grip, reliability) before cards');
  });
});
