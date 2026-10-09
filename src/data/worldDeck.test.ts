// World Deck content checks (docs/WORLD_DECK.md): the rules every content
// contribution must pass. Run `npm test` after adding teams, tracks, cards,
// weather or flavour lines.
import { describe, it, expect } from 'vitest';
import { RULE_CARDS } from './ruleCards';
import { IN_RACE_EFFECTS } from '../RaceEngine';
import { WEATHER_TYPES } from './weather';
import { CURRENT_TEAMS, HISTORIC_TEAMS } from './teams';
import { BASE_DECK_TEAMS, TEAM_KINDS } from './deckTeams';
import { BASE_DECK_TRACKS, FAVOUR_PCT } from './deckTracks';
import { BASE_DECK_WEATHER } from './deckWeather';
import { DRIVER_STATS, CAR_STATS, TEAM_STATS } from '../cards/deck';
import { resolveIcon } from '../icons/registry';
import { CURRENT_TRACKS, HISTORIC_TRACKS, LAYOUTS } from '../generators/tracks';
import { INTL_FIRST_NAMES, INTL_LAST_NAMES, ABSURD_FIRST_NAMES, ABSURD_LAST_NAMES } from '../generators/names';
import { LEAGUE_ADJECTIVES, LEAGUE_NOUNS } from '../generators/leagueName';
import { BACKSTORY_TEMPLATES, BACKSTORY_FILLS, QUIRKS } from '../generators/drivers';
import { CAR_QUIRKS } from '../generators/cars';
import { resolveRuleset, defaultRuleset } from '../rules/ruleset';
import { RULE_CARDS_BY_ID } from './ruleCards';

const HEX = /^#[0-9a-fA-F]{6}$/;
const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const uniq = (xs: string[], what: string) => {
  const seen = new Set<string>();
  for (const x of xs) { expect(seen.has(x), `${what}: duplicate "${x}"`).toBe(false); seen.add(x); }
};
const nonEmpty = (s: string | undefined, what: string) => expect((s ?? '').trim().length, `${what} is empty`).toBeGreaterThan(0);

describe('ids are unique, kebab-case, and every record has a name and emoji', () => {
  const registries: [string, { id: string; name: string; emoji: string }[]][] = [
    ['cards', RULE_CARDS], ['weather', WEATHER_TYPES],
    ['teams', [...CURRENT_TEAMS, ...HISTORIC_TEAMS]], ['tracks', [...CURRENT_TRACKS, ...HISTORIC_TRACKS]],
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
  it('in-race effects', () => { uniq(IN_RACE_EFFECTS.map(r => r.id), 'in-race effects'); });
});

describe('references point at things that exist', () => {
  it('cards resolve and change something', () => {
    const base = JSON.stringify(defaultRuleset());
    for (const c of RULE_CARDS) expect(JSON.stringify(resolveRuleset([c.id], RULE_CARDS_BY_ID)), `card ${c.id} does nothing`).not.toBe(base);
  });
});

describe('in-race effects are well-formed', () => {
  it('every effect has a name, a line and sane modifiers', () => {
    for (const r of IN_RACE_EFFECTS) {
      nonEmpty(r.name, `${r.id} name`); nonEmpty(r.text, `${r.id} text`); nonEmpty(r.emoji, `${r.id} emoji`);
      for (const [k, v] of Object.entries(r.effects)) {
        if (v === undefined) continue;
        if (k === 'crashResistance') expect(Math.abs(v), `${r.id} ${k}`).toBeLessThanOrEqual(0.5);
        else { expect(v, `${r.id} ${k}`).toBeGreaterThan(0.5); expect(v, `${r.id} ${k}`).toBeLessThan(1.5); }
      }
    }
  });
});

describe('teams, tracks, weather', () => {
  it('the grid is the 28 base-deck teams: one hex colour + a white or near-black ink', () => {
    expect(CURRENT_TEAMS.map(t => t.id)).toEqual(BASE_DECK_TEAMS.map(t => t.id));
    expect(HISTORIC_TEAMS).toEqual([]);
    for (const t of CURRENT_TEAMS) {
      expect(t.color, `${t.id} color`).toMatch(HEX);
      expect(['#FFFFFF', '#0A0A0C'], `${t.id} ink`).toContain(t.ink.toUpperCase());
      expect(t.kind, t.id).toBeTruthy();
      nonEmpty(t.description, `${t.id} description`);
      expect('accentColor' in t || 'secondaryColor' in t, t.id).toBe(false);
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
  it('weather weights are positive, sum to 100 and neutral is the most common', () => {
    for (const w of WEATHER_TYPES) expect(w.weight).toBeGreaterThan(0);
    expect(WEATHER_TYPES.reduce((s, w) => s + w.weight, 0)).toBe(100);
    expect(Math.max(...WEATHER_TYPES.map(w => w.weight))).toBe(WEATHER_TYPES.find(w => w.id === 'neutral')!.weight);
    expect(WEATHER_TYPES.map(w => w.id)).toEqual(BASE_DECK_WEATHER.map(w => w.id));
  });
  it('the six race tracks are the deck tracks, each on its layout drawing with its favours', () => {
    expect(CURRENT_TRACKS.map(t => t.id)).toEqual(BASE_DECK_TRACKS.map(t => t.id));
    for (const t of CURRENT_TRACKS) {
      const deck = BASE_DECK_TRACKS.find(d => d.id === t.id)!;
      expect(t.layout.id).toBe(LAYOUTS[deck.layoutId].id);
      expect(t.favours).toEqual(deck.favours);
    }
    expect(HISTORIC_TRACKS).toEqual([]);
  });
});

describe('flavour pools', () => {
  const pools: [string, string[]][] = [
    ['INTL_FIRST_NAMES', INTL_FIRST_NAMES], ['INTL_LAST_NAMES', INTL_LAST_NAMES], ['ABSURD_FIRST_NAMES', ABSURD_FIRST_NAMES], ['ABSURD_LAST_NAMES', ABSURD_LAST_NAMES],
    ['LEAGUE_ADJECTIVES', LEAGUE_ADJECTIVES], ['LEAGUE_NOUNS', LEAGUE_NOUNS], ['QUIRKS', QUIRKS], ['CAR_QUIRKS', CAR_QUIRKS],
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

// #402: the 28 base-deck teams (docs/story/team-identity.md), data + World
// Deck only until the grid swap (#356).
describe('base-deck teams', () => {
  it('28 teams, seven of each kind', () => {
    expect(BASE_DECK_TEAMS).toHaveLength(28);
    for (const k of TEAM_KINDS) expect(BASE_DECK_TEAMS.filter(t => t.kind === k.kind)).toHaveLength(7);
  });

  it('unique ids and colours; none of the old 22 team ids remain', () => {
    const ids = BASE_DECK_TEAMS.map(t => t.id);
    expect(new Set(ids).size).toBe(28);
    expect(new Set(BASE_DECK_TEAMS.map(t => t.color.toLowerCase())).size).toBe(28);
    const OLD = ['for-rory', 'breadbowl', 'mcelodeon', 'haazmat', 'daddyslacks', 'asteroid-martian', 'furbabies', 'haudy'];
    for (const id of OLD) expect(ids.includes(id), id).toBe(false);
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

// #408: Tracks & Weather v2, dry half (v0.5). Data + World Deck only until
// the swap (#359); the favour shape is the card math's {stat, pct}.
describe('stat-combo tracks + dry weather', () => {
  const machine = [...CAR_STATS, ...TEAM_STATS] as string[];

  it('6 tracks: one driver stat + one car/team stat each, every driver stat once', () => {
    expect(BASE_DECK_TRACKS).toHaveLength(6);
    expect(new Set(BASE_DECK_TRACKS.map(t => t.id)).size).toBe(6);
    for (const t of BASE_DECK_TRACKS) {
      expect(t.favours, t.id).toHaveLength(2);
      expect(DRIVER_STATS as string[], t.id).toContain(t.favours[0].stat);
      expect(machine, t.id).toContain(t.favours[1].stat);
      expect(t.favours.every(f => f.pct === FAVOUR_PCT), t.id).toBe(true);
    }
    expect(BASE_DECK_TRACKS.map(t => t.favours[0].stat).sort()).toEqual([...DRIVER_STATS].sort());
  });

  it('each track reuses a different existing layout drawing', () => {
    expect(new Set(BASE_DECK_TRACKS.map(t => t.layoutId)).size).toBe(6);
    for (const t of BASE_DECK_TRACKS) expect(LAYOUTS[t.layoutId], t.id).toBeTruthy();
  });

  it('Neutral 60% + five dry weathers at 8%, two favours each, no rain', () => {
    expect(BASE_DECK_WEATHER).toHaveLength(6);
    expect(BASE_DECK_WEATHER.reduce((s, w) => s + w.odds, 0)).toBe(100);
    const [neutral, ...dry] = BASE_DECK_WEATHER;
    expect(neutral.id).toBe('neutral');
    expect(neutral.odds).toBe(60);
    expect(neutral.favours).toEqual([]);
    for (const w of dry) {
      expect(w.odds, w.id).toBe(8);
      expect(w.favours, w.id).toHaveLength(2);
      expect(w.favours.every(f => f.pct === FAVOUR_PCT), w.id).toBe(true);
      expect(w.kind, w.id).toBe('consistent');
      expect(w.id, w.id).not.toMatch(/wet|rain/);
    }
  });
});
