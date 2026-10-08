// World Deck content checks (docs/WORLD_DECK.md): the rules every content
// contribution must pass. Run `npm test` after adding teams, tracks, tags,
// cards, weather, inflictions, gods or flavour lines.
import { describe, it, expect } from 'vitest';
import { ALL_TAGS, DRIVER_TAGS, CAR_TAGS, TEAM_TAGS, RARITIES, getTagById } from './tags';
import { ACQUISITION_RULES } from './acquisitions';
import { IN_RACE_RULES } from './inRace';
import { RULE_CARDS } from './ruleCards';
import { WEATHER_TYPES } from './weather';
import { TRACK_TAGS } from './trackTags';
import { INFLICTIONS } from './inflictions';
import { CURRENT_TEAMS, HISTORIC_TEAMS } from './teams';
import { BASE_DECK_TEAMS, TEAM_KINDS } from './deckTeams';
import { resolveIcon } from '../icons/registry';
import { CURRENT_TRACKS, HISTORIC_TRACKS, LAYOUTS } from '../generators/tracks';
import { GODS } from '../league/gods';
import { INTL_FIRST_NAMES, INTL_LAST_NAMES, ABSURD_FIRST_NAMES, ABSURD_LAST_NAMES, MONONYMS } from '../generators/names';
import { LEAGUE_ADJECTIVES, LEAGUE_NOUNS } from '../generators/leagueName';
import { BACKSTORY_TEMPLATES, BACKSTORY_FILLS, QUIRKS } from '../generators/drivers';
import { CAR_QUIRKS } from '../generators/cars';
import { resolveRuleset, defaultRuleset } from '../rules/ruleset';
import { RULE_CARDS_BY_ID } from './ruleCards';
import { TAG_CALIBRATION, calibrationFor } from './tagCalibration';
import { effectsHash, bandViolation, CALIBRATION_CARDS } from '../racecontrol/calibrate';
import { isGenesisTag } from './tags';

const HEX = /^#[0-9a-fA-F]{6}$/;
const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const uniq = (xs: string[], what: string) => {
  const seen = new Set<string>();
  for (const x of xs) { expect(seen.has(x), `${what}: duplicate "${x}"`).toBe(false); seen.add(x); }
};
const nonEmpty = (s: string | undefined, what: string) => expect((s ?? '').trim().length, `${what} is empty`).toBeGreaterThan(0);

describe('ids are unique, kebab-case, and every record has a name and emoji', () => {
  const registries: [string, { id: string; name: string; emoji: string }[]][] = [
    ['tags', ALL_TAGS], ['cards', RULE_CARDS], ['weather', WEATHER_TYPES], ['track tags', TRACK_TAGS], ['inflictions', INFLICTIONS],
    ['teams', [...CURRENT_TEAMS, ...HISTORIC_TEAMS]], ['tracks', [...CURRENT_TRACKS, ...HISTORIC_TRACKS]], ['gods', GODS],
  ];
  for (const [what, rows] of registries) {
    it(what, () => {
      uniq(rows.map(r => r.id), what);
      for (const r of rows) {
        expect(r.id, `${what} id "${r.id}" should be kebab-case`).toMatch(ID);
        nonEmpty(r.name, `${what} ${r.id} name`);
        nonEmpty(r.emoji, `${what} ${r.id} emoji`);
      }
    });
  }
  it('rules', () => { uniq(ACQUISITION_RULES.map(r => r.id), 'acquisition rules'); uniq(IN_RACE_RULES.map(r => r.id), 'in-race rules'); });
});

describe('references point at things that exist', () => {
  const conditionIds = new Set([...WEATHER_TYPES.flatMap(w => w.conditions), ...TRACK_TAGS.flatMap(t => t.conditions ?? [])]);
  it('acquisition and in-race rules award real tags', () => {
    for (const r of ACQUISITION_RULES) expect(getTagById(r.tagId), `rule ${r.id} → ${r.tagId}`).toBeDefined();
    for (const r of IN_RACE_RULES) expect(getTagById(r.tagId), `rule ${r.id} → ${r.tagId}`).toBeDefined();
  });
  it('tag actions point at real tags', () => {
    for (const t of ALL_TAGS) for (const a of t.afterRace ?? []) if (a.do !== 'expire-self') expect(getTagById(a.tagId), `${t.id} → ${a.tagId}`).toBeDefined();
  });
  it('condition gates and infliction requirements name conditions that something stamps', () => {
    for (const t of ALL_TAGS) if (t.condition?.when === 'condition') expect(conditionIds.has(t.condition.has), `${t.id} gates on "${t.condition.has}" which nothing stamps`).toBe(true);
    for (const i of INFLICTIONS) for (const c of i.requiresCondition) expect(conditionIds.has(c), `${i.id} needs "${c}" which nothing stamps`).toBe(true);
  });
  it('cards resolve and change something', () => {
    const base = JSON.stringify(defaultRuleset());
    for (const c of RULE_CARDS) expect(JSON.stringify(resolveRuleset([c.id], RULE_CARDS_BY_ID)), `card ${c.id} does nothing`).not.toBe(base);
  });
  it('card tag patches name real tags', () => {
    for (const c of RULE_CARDS) for (const id of [...(c.patch.tags?.only ?? []), ...(c.patch.tags?.add ?? []), ...(c.patch.tags?.remove ?? [])]) expect(getTagById(id), `card ${c.id} → ${id}`).toBeDefined();
  });
});

describe('tags are well-formed', () => {
  it('every tag has a description, a rarity, and sane effects', () => {
    for (const t of ALL_TAGS) {
      nonEmpty(t.description, `tag ${t.id} description`);
      expect(RARITIES.includes(t.rarity), `${t.id} rarity`).toBe(true);
      const fx = t.effects;
      for (const [k, v] of Object.entries(fx)) {
        if (v === undefined) continue;
        if (k === 'crashResistance') expect(Math.abs(v), `${t.id} ${k}`).toBeLessThanOrEqual(0.5);
        else { expect(v, `${t.id} ${k}`).toBeGreaterThan(0.5); expect(v, `${t.id} ${k}`).toBeLessThan(1.5); }
      }
      if (t.triggerChance !== undefined) { expect(t.triggerChance).toBeGreaterThan(0); expect(t.triggerChance).toBeLessThanOrEqual(1); }
      for (const a of t.afterRace ?? []) { expect(a.chance).toBeGreaterThan(0); expect(a.chance).toBeLessThanOrEqual(1); nonEmpty(a.headline, `${t.id} action headline`); }
    }
  });
  it('genesis tags sit in the right list for their target', () => {
    for (const t of DRIVER_TAGS) expect(t.target).toBe('driver');
    for (const t of CAR_TAGS) expect(t.target).toBe('car');
    for (const t of TEAM_TAGS) expect(t.target).toBe('team');
  });
});

describe('teams, tracks, gods, weather', () => {
  it('team colours are hex and the two differ', () => {
    for (const t of [...CURRENT_TEAMS, ...HISTORIC_TEAMS]) {
      expect(t.color, `${t.id} color`).toMatch(HEX); expect(t.accentColor, `${t.id} accent`).toMatch(HEX);
      expect(t.color.toLowerCase()).not.toBe(t.accentColor.toLowerCase());
      nonEmpty(t.description, `${t.id} description`);
    }
  });
  it('tracks have a known layout, sane laps and length, and a vibe', () => {
    const layouts = new Set(Object.values(LAYOUTS).map(l => l.id));
    for (const t of [...CURRENT_TRACKS, ...HISTORIC_TRACKS]) {
      expect(layouts.has(t.layout.id), `${t.id} layout`).toBe(true);
      expect(t.laps).toBeGreaterThanOrEqual(10); expect(t.laps).toBeLessThanOrEqual(30);
      expect(t.length).toBeGreaterThanOrEqual(500); expect(t.length).toBeLessThanOrEqual(1500);
      nonEmpty(t.description, `${t.id} description`); nonEmpty(t.funEmoji, `${t.id} funEmoji`);
    }
  });
  it('gods have an epithet, a hunger and an appetite', () => {
    for (const g of GODS) { nonEmpty(g.epithet, g.id); nonEmpty(g.hunger, g.id); nonEmpty(g.appetite, g.id); }
  });
  it('weather weights are positive and clear is the most common', () => {
    for (const w of WEATHER_TYPES) expect(w.weight).toBeGreaterThan(0);
    expect(Math.max(...WEATHER_TYPES.map(w => w.weight))).toBe(WEATHER_TYPES.find(w => w.id === 'clear')!.weight);
  });
});

describe('flavour pools', () => {
  const pools: [string, string[]][] = [
    ['INTL_FIRST_NAMES', INTL_FIRST_NAMES], ['INTL_LAST_NAMES', INTL_LAST_NAMES], ['ABSURD_FIRST_NAMES', ABSURD_FIRST_NAMES], ['ABSURD_LAST_NAMES', ABSURD_LAST_NAMES],
    ['MONONYMS', MONONYMS], ['LEAGUE_ADJECTIVES', LEAGUE_ADJECTIVES], ['LEAGUE_NOUNS', LEAGUE_NOUNS], ['QUIRKS', QUIRKS], ['CAR_QUIRKS', CAR_QUIRKS],
  ];
  it('no blank or duplicate lines', () => {
    for (const [what, xs] of pools) { for (const x of xs) nonEmpty(x, what); uniq(xs.map(x => x.trim().toLowerCase()), what); }
  });
  it('every backstory template slot has fills', () => {
    const slots = new Set(Object.keys(BACKSTORY_FILLS));
    for (const tpl of BACKSTORY_TEMPLATES) for (const m of tpl.matchAll(/\{(\w+)\}/g)) expect(slots.has(m[1]), `template "${tpl}" uses {${m[1]}} with no fills`).toBe(true);
    for (const [k, v] of Object.entries(BACKSTORY_FILLS)) expect(v.length, `fills for {${k}}`).toBeGreaterThanOrEqual(3);
  });
});

describe('tag calibration is current and in band', () => {
  const genesis = ALL_TAGS.filter(isGenesisTag);
  it('every genesis tag has been measured since its effects last changed (npm run calibrate)', () => {
    expect(TAG_CALIBRATION.cards).toEqual(CALIBRATION_CARDS);
    for (const t of genesis) {
      const c = calibrationFor(t.id);
      expect(c, `${t.id} is not in src/data/tagCalibration.json — run npm run calibrate`).toBeDefined();
      expect(c!.effectsHash, `${t.id} changed since it was calibrated — run npm run calibrate`).toBe(effectsHash(t));
    }
  });
  it('no genesis tag is out of band', () => {
    for (const c of TAG_CALIBRATION.tags) expect(bandViolation(c), `${c.tagId}: ${bandViolation(c)}`).toBeNull();
  });
});

// #402: the 28 base-deck teams (docs/story/team-identity.md), data + World
// Deck only until the grid swap (#356).
describe('base-deck teams', () => {
  it('28 teams, seven of each kind', () => {
    expect(BASE_DECK_TEAMS).toHaveLength(28);
    for (const k of TEAM_KINDS) expect(BASE_DECK_TEAMS.filter(t => t.kind === k.kind)).toHaveLength(7);
  });

  it('unique ids and colours; ids never reuse an old team id', () => {
    const ids = BASE_DECK_TEAMS.map(t => t.id);
    expect(new Set(ids).size).toBe(28);
    expect(new Set(BASE_DECK_TEAMS.map(t => t.color.toLowerCase())).size).toBe(28);
    const old = new Set([...CURRENT_TEAMS, ...HISTORIC_TEAMS].map(t => t.id));
    for (const id of ids) expect(old.has(id), id).toBe(false);
  });

  it('one colour + an ink that is white or near-black; every icon is vendored', () => {
    for (const t of BASE_DECK_TEAMS) {
      expect(t.color, t.id).toMatch(/^#[0-9A-F]{6}$/i);
      expect(['#FFFFFF', '#0A0A0C'], t.id).toContain(t.ink.toUpperCase());
      expect(resolveIcon(t.iconId), `${t.id} icon ${t.iconId}`).toBeTruthy();
      expect(t.description.length, t.id).toBeGreaterThan(10);
      expect('secondaryColor' in t || 'accentColor' in t, t.id).toBe(false);
    }
  });
});
