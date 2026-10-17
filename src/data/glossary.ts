// The glossary (#235 prep): one model of everything in the sim, built FROM
// the data modules so it can never drift. docs/GLOSSARY.md (npm run
// glossary) and the in-game Glossary screen both render this.

import { defaultRuleset, describeChance, describeOdds } from '../rules/ruleset';
import { RULE_CARDS } from './ruleCards';
import type { RuleCard } from '../rules/ruleset';
import { MOTORSPORT_DECK, METAL_LADDER, STAT_LABELS, type Card } from '../cards';
import { RARITIES } from '../cards/rarity';
import { IN_RACE_EFFECTS, type InRaceEffect, type InRaceDuration } from '../RaceEngine';
import { WEATHER_TYPES } from './weather';
import { CURRENT_TRACKS, HISTORIC_TRACKS } from '../generators/tracks';
import { CURRENT_TEAMS, HISTORIC_TEAMS } from './teams';
import { BASE_DECK_TEAMS, TEAM_KINDS } from './deckTeams';
import { BASE_DECK_TRACKS } from './deckTracks';
import { BASE_DECK_WEATHER } from './deckWeather';
import { US_PLACES } from './states';
import { US_FIRST_NAMES, US_LAST_NAMES, US_SHARE, INTL_FIRST_NAMES, INTL_LAST_NAMES, ABSURD_FIRST_NAMES, ABSURD_LAST_NAMES, NAME_TIER_WEIGHTS, ONE_WORD_CHANCE } from '../generators/names';
import { LEAGUE_ADJECTIVES, LEAGUE_NOUNS } from '../generators/leagueName';
import { BACKSTORY_TEMPLATES, BACKSTORY_FILLS, QUIRKS } from '../generators/drivers';
import { CAR_QUIRKS, CAR_PEOPLE_NAMES, CAR_NICKNAMES, CAR_HOUSEHOLD, CAR_HERITAGE_PLACES, generateCarName } from '../generators/cars';
import { mulberry32 } from '../engine/rng';
import { IDENTITY_EMOJI } from '../generators/teamIdentity';

export interface GlossaryEffect { label: string; value: string; good: boolean }

function pct(mult: number): string { const d = Math.round((mult - 1) * 100); return `${d > 0 ? '+' : ''}${d}%`; }

export function effectsOf(fx: { speedModifier?: number; consistencyModifier?: number; luckModifier?: number; crashResistance?: number; pitSpeedModifier?: number }): GlossaryEffect[] {
  const out: GlossaryEffect[] = [];
  if (fx.speedModifier !== undefined && fx.speedModifier !== 1) out.push({ label: 'speed', value: pct(fx.speedModifier), good: fx.speedModifier > 1 });
  if (fx.consistencyModifier !== undefined && fx.consistencyModifier !== 1) out.push({ label: 'consistency', value: pct(fx.consistencyModifier), good: fx.consistencyModifier > 1 });
  if (fx.luckModifier !== undefined && fx.luckModifier !== 1) out.push({ label: 'luck', value: pct(fx.luckModifier), good: fx.luckModifier > 1 });
  if (fx.crashResistance !== undefined && fx.crashResistance !== 0) out.push({ label: 'crash risk', value: `${fx.crashResistance > 0 ? '−' : '+'}${Math.round(Math.abs(fx.crashResistance) * 100)}%`, good: fx.crashResistance > 0 });
  if (fx.pitSpeedModifier !== undefined && fx.pitSpeedModifier !== 1) out.push({ label: 'pit time', value: pct(fx.pitSpeedModifier), good: fx.pitSpeedModifier < 1 });
  return out;
}

export function describeInRaceDuration(d: InRaceDuration): string {
  if (d === 'race') return 'rest of the race';
  if (d === 'until-pit') return 'until the next pit stop';
  return `${d.laps} lap${d.laps === 1 ? '' : 's'}`;
}

const EVENT_WORDS: Record<string, string> = {
  crash: 'surviving a crash', driver_error: 'a driver error', tire_warning: 'tyres falling off the cliff',
  slow_pit_stop: 'a slow pit stop', quick_pit_stop: 'a lightning pit stop', pit_exit: 'leaving the pits',
  overtake: 'an overtake', mechanical_failure: 'a mechanical failure', unsafety_car_deployed: 'the safety car',
};

/** "a driver error (Spin) → 2 laps" */
export function describeInRaceEffect(r: InRaceEffect): string {
  const ev = EVENT_WORDS[r.on] ?? r.on.replace(/_/g, ' ');
  return `${ev}${r.match ? ` (${String(r.match).replace(/^\/\^?|\/$/g, '')})` : ''} → ${describeInRaceDuration(r.duration)}`;
}

/** "+5 Speed · +5 Grip" — what a card adds, in grade points of each stat. */
export function describeCard(c: Card): string {
  if (c.kind === 'effect') return `${STAT_LABELS[c.stats[0].stat]} ${c.direction === 'up' ? 'up' : 'down'}`;
  return c.stats.map(s => `+${s.pct} ${STAT_LABELS[s.stat]}`).join(' · ');
}

export interface Glossary {
  /** The Motorsport deck (src/cards/deck.ts): traits, gear, effects. */
  deck: readonly Card[];
  inRaceEffects: InRaceEffect[];
  cards: RuleCard[];
  weather: typeof WEATHER_TYPES;
  tracks: typeof CURRENT_TRACKS;
  historicTracks: typeof HISTORIC_TRACKS;
  /** The 28 base-deck teams: shown now, on the grid after #356. */
  deckTeams: typeof BASE_DECK_TEAMS;
  /** The 6 stat-combo tracks and Neutral + 5 dry weathers: shown now, raced after #359. */
  deckTracks: typeof BASE_DECK_TRACKS;
  deckWeather: typeof BASE_DECK_WEATHER;
  /** Ace America's 52 places and their State-step looks (#695). */
  places: typeof US_PLACES;
  teams: typeof CURRENT_TEAMS;
  historicTeams: typeof HISTORIC_TEAMS;
  /** Flavour pools, each with its size and a few samples. */
  pools: { id: string; title: string; where: string; size: number; samples: string[] }[];
  counts: Record<string, number>;
}

export function buildGlossary(): Glossary {
  return {
    deck: MOTORSPORT_DECK, inRaceEffects: IN_RACE_EFFECTS, cards: RULE_CARDS,
    weather: WEATHER_TYPES, tracks: CURRENT_TRACKS,
    historicTracks: HISTORIC_TRACKS, deckTeams: BASE_DECK_TEAMS, deckTracks: BASE_DECK_TRACKS, deckWeather: BASE_DECK_WEATHER, places: US_PLACES, teams: CURRENT_TEAMS, historicTeams: HISTORIC_TEAMS,
    pools: [
      { id: 'names-us-first', title: `Driver first names · American (${Math.round(NAME_TIER_WEIGHTS.international * 100)}% of drivers have a real name; each half is American ${Math.round(US_SHARE * 100)}% of the time)`, where: 'src/generators/names.ts US_FIRST_NAMES', size: US_FIRST_NAMES.length, samples: US_FIRST_NAMES.slice(0, 8) },
      { id: 'names-us-last', title: 'Driver last names · American', where: 'src/generators/names.ts US_LAST_NAMES', size: US_LAST_NAMES.length, samples: US_LAST_NAMES.slice(0, 8) },
      { id: 'names-intl-first', title: `Driver first names · international (the other ${Math.round((1 - US_SHARE) * 100)}% of each real half)`, where: 'src/generators/names.ts INTL_FIRST_NAMES', size: INTL_FIRST_NAMES.length, samples: INTL_FIRST_NAMES.slice(0, 8) },
      { id: 'names-intl-last', title: 'Driver last names · international', where: 'src/generators/names.ts INTL_LAST_NAMES', size: INTL_LAST_NAMES.length, samples: INTL_LAST_NAMES.slice(0, 8) },
      { id: 'names-absurd-first', title: `Driver first names · absurd (${Math.round(NAME_TIER_WEIGHTS.absurd * 100)}% both halves, ${Math.round(NAME_TIER_WEIGHTS.hybrid * 100)}% one half on a real name; ${Math.round(ONE_WORD_CHANCE * 100)}% of all names show as one word)`, where: 'src/generators/names.ts ABSURD_FIRST_NAMES', size: ABSURD_FIRST_NAMES.length, samples: ABSURD_FIRST_NAMES.slice(0, 8) },
      { id: 'names-absurd-last', title: 'Driver last names · absurd', where: 'src/generators/names.ts ABSURD_LAST_NAMES', size: ABSURD_LAST_NAMES.length, samples: ABSURD_LAST_NAMES.slice(0, 8) },
      { id: 'league-adjectives', title: 'League names · adjectives ("The ___ Circuit")', where: 'src/generators/leagueName.ts LEAGUE_ADJECTIVES', size: LEAGUE_ADJECTIVES.length, samples: LEAGUE_ADJECTIVES.slice(0, 8) },
      { id: 'league-nouns', title: 'League names · nouns', where: 'src/generators/leagueName.ts LEAGUE_NOUNS', size: LEAGUE_NOUNS.length, samples: LEAGUE_NOUNS.slice(0, 8) },
      { id: 'backstory-templates', title: 'Driver backstory templates ({slot} fills below)', where: 'src/generators/drivers.ts BACKSTORY_TEMPLATES', size: BACKSTORY_TEMPLATES.length, samples: BACKSTORY_TEMPLATES.slice(0, 4) },
      { id: 'backstory-fills', title: `Backstory fills (${Object.keys(BACKSTORY_FILLS).length} slots)`, where: 'src/generators/drivers.ts BACKSTORY_FILLS', size: Object.values(BACKSTORY_FILLS).reduce((n, v) => n + v.length, 0), samples: Object.entries(BACKSTORY_FILLS).slice(0, 4).map(([k, v]) => `{${k}}: ${v.slice(0, 3).join(' / ')}`) },
      { id: 'driver-quirks', title: 'Driver quirks', where: 'src/generators/drivers.ts QUIRKS', size: QUIRKS.length, samples: QUIRKS.slice(0, 5) },
      { id: 'car-quirks', title: 'Car quirks', where: 'src/generators/cars.ts CAR_QUIRKS', size: CAR_QUIRKS.length, samples: CAR_QUIRKS.slice(0, 4) },
      { id: 'car-names', title: 'Car names · a sample rack (people 35 · heritage 20 · nicknames 20 · codes 15 · household 10)', where: 'src/generators/cars.ts generateCarName (docs/story/car-names.md)', size: CAR_PEOPLE_NAMES.length + CAR_NICKNAMES.length + CAR_HOUSEHOLD.length + CAR_HERITAGE_PLACES.length, samples: (() => { const r = mulberry32(569); return Array.from({ length: 10 }, () => generateCarName(r)); })() },
      { id: 'car-names-people', title: "Car names · people's names", where: 'src/generators/cars.ts CAR_PEOPLE_NAMES', size: CAR_PEOPLE_NAMES.length, samples: CAR_PEOPLE_NAMES.slice(0, 8) },
      { id: 'car-names-nicknames', title: 'Car names · workshop nicknames', where: 'src/generators/cars.ts CAR_NICKNAMES', size: CAR_NICKNAMES.length, samples: CAR_NICKNAMES.slice(0, 6) },
      { id: 'car-names-household', title: 'Car names · farm and household words', where: 'src/generators/cars.ts CAR_HOUSEHOLD', size: CAR_HOUSEHOLD.length, samples: CAR_HOUSEHOLD.slice(0, 6) },
      { id: 'identity-emoji', title: 'Procedural team emoji', where: 'src/generators/teamIdentity.ts IDENTITY_EMOJI', size: IDENTITY_EMOJI.length, samples: IDENTITY_EMOJI.slice(0, 10) },
    ],
    counts: {
      deck: MOTORSPORT_DECK.length,
      traits: MOTORSPORT_DECK.filter(c => c.kind === 'trait').length,
      gear: MOTORSPORT_DECK.filter(c => c.kind === 'equipment' || c.kind === 'upgrade' || c.kind === 'facility').length,
      effects: MOTORSPORT_DECK.filter(c => c.kind === 'effect').length,
      inRaceEffects: IN_RACE_EFFECTS.length,
      cards: RULE_CARDS.length,
      weather: WEATHER_TYPES.length, tracks: CURRENT_TRACKS.length,
      historicTracks: HISTORIC_TRACKS.length, deckTeams: BASE_DECK_TEAMS.length, deckTracks: BASE_DECK_TRACKS.length, deckWeather: BASE_DECK_WEATHER.length, teams: CURRENT_TEAMS.length, historicTeams: HISTORIC_TEAMS.length,
    },
  };
}

/** Render the whole glossary as markdown — docs/GLOSSARY.md. */
export function renderGlossaryMd(g: Glossary, version: string): string {
  const L: string[] = [];
  L.push(`# Ace America World Deck`, '', `*Everything in the sim and the world, generated from the data modules by \`npm run glossary\` — do not edit by hand; edit the source files named in each section and re-run. Engine v${version}. How to add content: docs/WORLD_DECK.md.*`, '');
  L.push(`${g.counts.deckTeams} teams · ${g.counts.tracks} tracks · ${g.counts.deck} cards (${g.counts.traits} traits · ${g.counts.gear} gear · ${g.counts.effects} effects) · ${g.counts.inRaceEffects} in-race effects · ${g.counts.cards} rule cards · ${g.counts.weather} weathers`, '');
  L.push('## Base-deck teams', '', '*Source: `src/data/deckTeams.ts` (from docs/story/team-identity.md; not canon yet). The 28 world factions, seven of each kind: Quick Race draws its 11 and Season Mode its CPU teams from these. Logo = the icon in `ink` on the team colour.*', '');
  for (const k of TEAM_KINDS) {
    L.push(`### ${k.title}`, '', '| Team | Colour · ink | Icon | Line |', '|---|---|---|---|');
    for (const t of g.deckTeams.filter(x => x.kind === k.kind)) L.push(`| **${t.name}** \`${t.id}\` | ${t.color} · ${t.ink} | \`${t.iconId}\` | ${t.description} |`);
    L.push('');
  }
  const favs = (f: { stat: keyof typeof STAT_LABELS; pct: number }[]) => f.length ? f.map(x => `+${x.pct} ${STAT_LABELS[x.stat]}`).join(' · ') : '—';
  L.push('## Tracks', '', '*Source: `src/data/deckTracks.ts` (docs/TRACKS_WEATHER.md). Six stat-combo tracks; each favours one driver stat and one car/team stat for the race, field-wide (+10 grade points, through the card math at race build). Each has a tyre-wear dial (#536): wear per tick × `tyreWear`. Every race and season calendar draws from these; the 31 themed circuits, track events and track characters retired with Tracks & Weather v2.*', '', '| Track (the Nationals landmark) | Kind | Favours | Tyre wear | Layout |', '|---|---|---|---|---|');
  for (const t of g.deckTracks) L.push(`| **${t.name}** \`${t.id}\` | ${t.kind} | ${favs(t.favours)} | ×${t.tyreWear} | ${t.layoutId} |`);
  L.push('', '## Weather', '', '*Source: `src/data/deckWeather.ts`. Neutral + five dry weathers, favours (grade points) × intensity, stacking with the track. No rain until Wet arrives in v0.6; the old weathers and the inflictions retired (the inflictions are parked as Horror-deck material).*', '', '| Weather | Odds | Favours |', '|---|---|---|');
  for (const w of g.deckWeather) L.push(`| **${w.name}** \`${w.id}\` | ${w.odds}% | ${favs(w.favours)} |`);
  L.push('');
  L.push('## States', '', '*Source: `src/data/states.ts` (#695). Ace America\'s 52 places: 50 states, DC and Puerto Rico. A look is the accents the UI takes while you race for that state (primary = the state bar, buttons and sash edge; ink from `inkFor`; ground = the step\'s background). Radio\'s 52 looks, picked by Pax (docs/story/states.md).*', '', '| Place | Primary · secondary · accent · ground | Ink | Note |', '|---|---|---|---|');
  for (const p of g.places) L.push(`| **${p.name}** \`${p.id}\`${p.kind === 'state' ? '' : ` (${p.kind})`} | ${p.look ? `${p.look.primary} · ${p.look.secondary} · ${p.look.accent} · ${p.look.ground ?? '—'}` : '—'} | ${p.look?.ink ?? '—'} | ${p.look?.flag.note ?? '—'} |`);
  L.push('');
  L.push('');
  const rs = defaultRuleset();
  L.push('## How genesis traits are rolled', '',
    `Each driver gets three slots: driver, car (their own chassis), team (one roll, shared by teammates). Per slot:`, '',
    `1. **Does it hit?** ${describeChance(rs.traits.genesisChance)}.`,
    `2. **Which metal?** ${describeOdds(rs.traits.rarityOdds)}. Fixed odds — adding cards to a metal never changes how often it comes up, only which card you get.`,
    `3. **Which card?** An even pick among that metal's trait cards for the slot. An empty metal falls to the next more common one.`, '',
    `A card adds grade points to its stats at race build (src/cards/apply.ts): ${RARITIES.map(r => `${r} ${METAL_LADDER[r].stats} stat${METAL_LADDER[r].stats > 1 ? 's' : ''} × +${METAL_LADDER[r].pct}`).join(' · ')}. Rule cards change the hit chance and the odds. Season Mode deals gear from packs the same way (docs/CARDS.md).`, '');
  L.push('## The Motorsport deck', '', '*Source: `src/cards/deck.ts` (docs/CARDS.md), generated from the stat grid. Traits are born with (genesis); gear (equipment, upgrades, facilities) comes from packs; effects are one-race modifiers.*', '', '| Card | Kind | On | Metal | Does |', '|---|---|---|---|---|');
  for (const c of g.deck) L.push(`| **${c.name}** \`${c.id}\` | ${c.kind} | ${c.target} | ${c.rarity ?? '—'} | ${describeCard(c)} |`);
  L.push('', '## In-race effects', '', '*Source: `src/RaceEngine.ts` IN_RACE_EFFECTS. Timed states a race puts on a car; they show in the timing tower and the feed and expire on their own.*', '', '| Effect | After | Does | Lasts |', '|---|---|---|---|');
  for (const r of g.inRaceEffects) L.push(`| ${r.emoji} **${r.name}** \`${r.id}\` — ${r.text} | ${EVENT_WORDS[r.on] ?? r.on}${r.match ? ` (${String(r.match).replace(/^\/\^?|\/$/g, '')})` : ''} | ${effectsOf(r.effects).map(x => `${x.value} ${x.label}`).join(', ') || '—'} | ${describeInRaceDuration(r.duration)} |`);
  L.push('', '## Rule cards', '', '| Rule card | Scope | Weight | Does |', '|---|---|---|---|');
  for (const c of g.cards) L.push(`| ${c.emoji} **${c.name}** \`${c.id}\` | ${c.scope} | ${c.weight} | ${c.readout} |`);
  L.push('', '## Flavour pools', '', '*Names, backstories, quirks. Each is a plain list in the file named; add lines, keep the voice.*', '', '| Pool | Size | Where | Samples |', '|---|---|---|---|');
  for (const p of g.pools) L.push(`| **${p.title}** | ${p.size} | \`${p.where}\` | ${p.samples.map(x => x.replace(/\|/g, '\\|')).join(' · ')} |`);
  L.push('');
  return L.join('\n');
}
