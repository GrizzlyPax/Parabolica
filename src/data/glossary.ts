// The glossary (#235 prep): one model of everything in the sim, built FROM
// the data modules so it can never drift. docs/GLOSSARY.md (npm run
// glossary) and the in-game Glossary screen both render this.

import { ALL_TAGS, ActionTarget, Tag, TagAction, TRIGGER_LABELS, RARITIES, describeCondition, describeDuration, getTagById, isGenesisTag } from './tags';
import { defaultRuleset, describeChance, describeOdds } from '../rules/ruleset';
import { RULE_CARDS } from './ruleCards';
import type { RuleCard } from '../rules/ruleset';
import { ACQUISITION_RULES, AcquisitionRule, AcquisitionTrigger } from './acquisitions';
import { IN_RACE_RULES, InRaceRule, InRaceDuration } from './inRace';
import { WEATHER_TYPES } from './weather';
import { TAG_CALIBRATION, calibrationFor } from './tagCalibration';
import { describeCalibration } from '../racecontrol/calibrate';
import { CURRENT_TRACKS, HISTORIC_TRACKS } from '../generators/tracks';
import { CURRENT_TEAMS, HISTORIC_TEAMS } from './teams';
import { BASE_DECK_TEAMS, TEAM_KINDS } from './deckTeams';
import { BASE_DECK_TRACKS } from './deckTracks';
import { BASE_DECK_WEATHER } from './deckWeather';
import { STAT_LABELS } from '../cards/deck';
import { GODS } from '../league/gods';
import { INTL_FIRST_NAMES, INTL_LAST_NAMES, ABSURD_FIRST_NAMES, ABSURD_LAST_NAMES, MONONYMS, NAME_TIER_WEIGHTS } from '../generators/names';
import { LEAGUE_ADJECTIVES, LEAGUE_NOUNS } from '../generators/leagueName';
import { BACKSTORY_TEMPLATES, BACKSTORY_FILLS, QUIRKS } from '../generators/drivers';
import { CAR_QUIRKS, CAR_PREFIXES_GENERIC, CAR_SUFFIXES, CAR_ACRONYMS } from '../generators/cars';
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

export type TagGroup = 'genesis' | 'acquired' | 'in-race';

export interface GlossaryTag {
  tag: Tag;
  group: TagGroup;
  /** "always on", "on a pit stop (70% chance)", "while running top 3" */
  fires: string;
  lasts: string;
  effects: GlossaryEffect[];
  /** How you get it, in words. */
  source: string;
  /** What it does after a race, in words (#233). Empty = nothing. */
  does: string[];
}

const TARGET_WORDS: Record<ActionTarget, string> = { self: 'themselves', teammate: 'their teammate', rival: 'whoever they crashed with', random: 'a random driver' };

/** "20%: spreads 👻 Haunted to their teammate" */
export function describeAction(a: TagAction): string {
  const pct = a.chance >= 1 ? 'always' : `${Math.round(a.chance * 100)}%`;
  if (a.do === 'expire-self') return `${pct}: wears off`;
  const t = getTagById(a.tagId);
  const name = t ? `${t.emoji} ${t.name}` : a.tagId;
  if (a.do === 'remove-tag') return `${pct}: shakes off ${name}`;
  return `${pct}: gives ${name} to ${TARGET_WORDS[a.to]}`;
}

export function tagGroup(t: Tag): TagGroup {
  if (t.sources?.includes('in-race')) return 'in-race';
  if (t.sources?.includes('acquired')) return 'acquired';
  return 'genesis';
}

export function describeTrigger(t: AcquisitionTrigger): string {
  switch (t.on) {
    case 'streak': return `${t.count} ${t.stat === 'dnf' ? 'retirements' : t.stat === 'win' ? 'wins' : 'podiums'} in a row`;
    case 'climb': return `gained ${t.places}+ places from the grid${t.finishedTop ? ` and finished top ${t.finishedTop}` : ''}`;
    case 'crashed-out': return 'retired in a crash';
    case 'survived-crash': return `damaged in a crash and still classified${t.finishedTop ? ` in the top ${t.finishedTop}` : ''}`;
    case 'fastest-lap': return 'set the fastest lap';
    case 'lottery': return `${(t.chance * 100).toFixed(1)}% lottery per driver per race`;
  }
}

export function describeInRaceDuration(d: InRaceDuration): string {
  if (d === 'race') return 'rest of the race';
  if (d === 'until-pit') return 'until the next pit stop';
  if ('laps' in d) return `${d.laps} lap${d.laps === 1 ? '' : 's'}`;
  return `rest of the race, then ${d.races} more race${d.races === 1 ? '' : 's'}`;
}

const EVENT_WORDS: Record<string, string> = {
  crash: 'surviving a crash', driver_error: 'a driver error', tire_warning: 'tyres falling off the cliff',
  slow_pit_stop: 'a slow pit stop', quick_pit_stop: 'a lightning pit stop', pit_exit: 'leaving the pits',
  overtake: 'an overtake', mechanical_failure: 'a mechanical failure', unsafety_car_deployed: 'the safety car',
};

export function describeInRaceRule(r: InRaceRule): string {
  const ev = EVENT_WORDS[r.on] ?? r.on.replace(/_/g, ' ');
  return `${ev}${r.match ? ` (${String(r.match).replace(/^\/\^?|\/$/g, '')})` : ''} → ${describeInRaceDuration(r.duration)}`;
}

export function buildGlossaryTags(): GlossaryTag[] {
  return ALL_TAGS.map(tag => {
    const group = tagGroup(tag);
    const chance = tag.triggerChance !== undefined && tag.triggerChance < 1 ? ` (${Math.round(tag.triggerChance * 100)}% chance)` : '';
    const fires = tag.condition ? `while ${describeCondition(tag.condition)}` : `${TRIGGER_LABELS[tag.trigger]}${chance}`;
    let source = '';
    let lasts = describeDuration(tag.duration);
    if (group === 'genesis') source = `born with it (${isGenesisTag(tag) ? 'in the genesis pool' : 'not in the pool'}), or granted by the Commissionary`;
    if (group === 'acquired') {
      const rules = ACQUISITION_RULES.filter(r => r.tagId === tag.id);
      const givers = ALL_TAGS.filter(o => o.afterRace?.some(a => a.do === 'attach-tag' && a.tagId === tag.id)).map(o => `passed on by ${o.emoji} ${o.name}`);
      const ways = [...rules.map(r => `${r.family}: ${describeTrigger(r.when)}`), ...givers];
      source = ways.length ? ways.join('; ') : 'no rule awards it yet';
    }
    if (group === 'in-race') {
      const rules = IN_RACE_RULES.filter(r => r.tagId === tag.id);
      source = rules.length ? rules.map(r => `mid-race, after ${EVENT_WORDS[r.on] ?? r.on}`).join('; ') : 'no rule awards it yet';
      lasts = rules.length ? describeInRaceDuration(rules[0].duration) : lasts;
    }
    return { tag, group, fires, lasts, effects: effectsOf(tag.effects), source, does: (tag.afterRace ?? []).map(describeAction) };
  });
}

export interface Glossary {
  tags: GlossaryTag[];
  cards: RuleCard[];
  acquisitionRules: AcquisitionRule[];
  inRaceRules: InRaceRule[];
  weather: typeof WEATHER_TYPES;
  tracks: typeof CURRENT_TRACKS;
  historicTracks: typeof HISTORIC_TRACKS;
  /** The 28 base-deck teams: shown now, on the grid after #356. */
  deckTeams: typeof BASE_DECK_TEAMS;
  /** The 6 stat-combo tracks and Neutral + 5 dry weathers: shown now, raced after #359. */
  deckTracks: typeof BASE_DECK_TRACKS;
  deckWeather: typeof BASE_DECK_WEATHER;
  teams: typeof CURRENT_TEAMS;
  historicTeams: typeof HISTORIC_TEAMS;
  gods: typeof GODS;
  /** Flavour pools, each with its size and a few samples. */
  pools: { id: string; title: string; where: string; size: number; samples: string[] }[];
  counts: Record<string, number>;
}

export function buildGlossary(): Glossary {
  const tags = buildGlossaryTags();
  return {
    tags, cards: RULE_CARDS, acquisitionRules: ACQUISITION_RULES, inRaceRules: IN_RACE_RULES,
    weather: WEATHER_TYPES, tracks: CURRENT_TRACKS,
    historicTracks: HISTORIC_TRACKS, deckTeams: BASE_DECK_TEAMS, deckTracks: BASE_DECK_TRACKS, deckWeather: BASE_DECK_WEATHER, teams: CURRENT_TEAMS, historicTeams: HISTORIC_TEAMS, gods: GODS,
    pools: [
      { id: 'names-intl-first', title: `Driver first names · international (${Math.round(NAME_TIER_WEIGHTS.international * 100)}% of drivers)`, where: 'src/generators/names.ts INTL_FIRST_NAMES', size: INTL_FIRST_NAMES.length, samples: INTL_FIRST_NAMES.slice(0, 8) },
      { id: 'names-intl-last', title: 'Driver last names · international', where: 'src/generators/names.ts INTL_LAST_NAMES', size: INTL_LAST_NAMES.length, samples: INTL_LAST_NAMES.slice(0, 8) },
      { id: 'names-absurd-first', title: `Driver first names · absurd (${Math.round(NAME_TIER_WEIGHTS.absurd * 100)}%)`, where: 'src/generators/names.ts ABSURD_FIRST_NAMES', size: ABSURD_FIRST_NAMES.length, samples: ABSURD_FIRST_NAMES.slice(0, 8) },
      { id: 'names-absurd-last', title: 'Driver last names · absurd', where: 'src/generators/names.ts ABSURD_LAST_NAMES', size: ABSURD_LAST_NAMES.length, samples: ABSURD_LAST_NAMES.slice(0, 8) },
      { id: 'names-mononym', title: `Driver mononyms (${Math.round(NAME_TIER_WEIGHTS.mononym * 100)}%)`, where: 'src/generators/names.ts MONONYMS', size: MONONYMS.length, samples: MONONYMS.slice(0, 8) },
      { id: 'league-adjectives', title: 'League names · adjectives ("The ___ Circuit")', where: 'src/generators/leagueName.ts LEAGUE_ADJECTIVES', size: LEAGUE_ADJECTIVES.length, samples: LEAGUE_ADJECTIVES.slice(0, 8) },
      { id: 'league-nouns', title: 'League names · nouns', where: 'src/generators/leagueName.ts LEAGUE_NOUNS', size: LEAGUE_NOUNS.length, samples: LEAGUE_NOUNS.slice(0, 8) },
      { id: 'backstory-templates', title: 'Driver backstory templates ({slot} fills below)', where: 'src/generators/drivers.ts BACKSTORY_TEMPLATES', size: BACKSTORY_TEMPLATES.length, samples: BACKSTORY_TEMPLATES.slice(0, 4) },
      { id: 'backstory-fills', title: `Backstory fills (${Object.keys(BACKSTORY_FILLS).length} slots)`, where: 'src/generators/drivers.ts BACKSTORY_FILLS', size: Object.values(BACKSTORY_FILLS).reduce((n, v) => n + v.length, 0), samples: Object.entries(BACKSTORY_FILLS).slice(0, 4).map(([k, v]) => `{${k}}: ${v.slice(0, 3).join(' / ')}`) },
      { id: 'driver-quirks', title: 'Driver quirks', where: 'src/generators/drivers.ts QUIRKS', size: QUIRKS.length, samples: QUIRKS.slice(0, 5) },
      { id: 'car-quirks', title: 'Car quirks', where: 'src/generators/cars.ts CAR_QUIRKS', size: CAR_QUIRKS.length, samples: CAR_QUIRKS.slice(0, 4) },
      { id: 'car-names', title: 'Car name parts (prefix · suffix · acronym)', where: 'src/generators/cars.ts CAR_PREFIXES_GENERIC / CAR_SUFFIXES / CAR_ACRONYMS', size: CAR_PREFIXES_GENERIC.length + CAR_SUFFIXES.length + CAR_ACRONYMS.length, samples: [...CAR_PREFIXES_GENERIC.slice(0, 3), ...CAR_SUFFIXES.slice(0, 3), ...CAR_ACRONYMS.slice(0, 3)] },
      { id: 'identity-emoji', title: 'Procedural team emoji', where: 'src/generators/teamIdentity.ts IDENTITY_EMOJI', size: IDENTITY_EMOJI.length, samples: IDENTITY_EMOJI.slice(0, 10) },
    ],
    counts: {
      tags: tags.length,
      genesis: tags.filter(t => t.group === 'genesis').length,
      acquired: tags.filter(t => t.group === 'acquired').length,
      inRace: tags.filter(t => t.group === 'in-race').length,
      cards: RULE_CARDS.length, rules: ACQUISITION_RULES.length + IN_RACE_RULES.length,
      weather: WEATHER_TYPES.length, tracks: CURRENT_TRACKS.length,
      historicTracks: HISTORIC_TRACKS.length, deckTeams: BASE_DECK_TEAMS.length, deckTracks: BASE_DECK_TRACKS.length, deckWeather: BASE_DECK_WEATHER.length, teams: CURRENT_TEAMS.length, historicTeams: HISTORIC_TEAMS.length, gods: GODS.length,
    },
  };
}

/** Render the whole glossary as markdown — docs/GLOSSARY.md. */
export function renderGlossaryMd(g: Glossary, version: string): string {
  const L: string[] = [];
  const fx = (e: GlossaryEffect[]) => e.length ? e.map(x => `${x.value} ${x.label}`).join(', ') : '—';
  L.push(`# Parabolica World Deck`, '', `*Everything in the sim and the world, generated from the data modules by \`npm run glossary\` — do not edit by hand; edit the source files named in each section and re-run. Engine v${version}. How to add content: docs/WORLD_DECK.md.*`, '');
  L.push(`${g.counts.deckTeams} teams · ${g.counts.tracks} tracks · ${g.counts.tags} tags (${g.counts.genesis} genesis · ${g.counts.acquired} acquired · ${g.counts.inRace} in-race) · ${g.counts.cards} rule cards · ${g.counts.rules} rules · ${g.counts.weather} weathers · ${g.counts.gods} gods`, '');
  L.push('## Base-deck teams', '', '*Source: `src/data/deckTeams.ts` (from docs/story/team-identity.md; not canon yet). The 28 world factions, seven of each kind: Quick Race draws its 11 and Season Mode its CPU teams from these. Logo = the icon in `ink` on the team colour.*', '');
  for (const k of TEAM_KINDS) {
    L.push(`### ${k.title}`, '', '| Team | Colour · ink | Icon | Line |', '|---|---|---|---|');
    for (const t of g.deckTeams.filter(x => x.kind === k.kind)) L.push(`| **${t.name}** \`${t.id}\` | ${t.color} · ${t.ink} | \`${t.iconId}\` | ${t.description} |`);
    L.push('');
  }
  const favs = (f: { stat: keyof typeof STAT_LABELS; pct: number }[]) => f.length ? f.map(x => `+${x.pct}% ${STAT_LABELS[x.stat]}`).join(' · ') : '—';
  L.push('## Tracks', '', '*Source: `src/data/deckTracks.ts` (docs/TRACKS_WEATHER.md). Six stat-combo tracks; each favours one driver stat and one car/team stat for the race, field-wide (+10%, through the card math at race build). Every race and season calendar draws from these; the 31 themed circuits, track events and track characters retired with Tracks & Weather v2.*', '', '| Track | Favours | Layout |', '|---|---|---|');
  for (const t of g.deckTracks) L.push(`| **${t.name}** \`${t.id}\` | ${favs(t.favours)} | ${t.layoutId} |`);
  L.push('', '## Weather', '', '*Source: `src/data/deckWeather.ts`. Neutral + five dry weathers, favours × intensity, stacking with the track. No rain until Wet arrives in v0.6; the old weathers and the inflictions retired (the inflictions are parked as Horror-deck material).*', '', '| Weather | Odds | Favours |', '|---|---|---|');
  for (const w of g.deckWeather) L.push(`| **${w.name}** \`${w.id}\` | ${w.odds}% | ${favs(w.favours)} |`);
  L.push('');
  L.push('', '## Gods (retiring)', '', '*Source: `src/league/gods.ts`. Parked: founding no longer asks, and gods retire with Commissioner leagues (#339). Not shown in the World Deck.*', '', '| God | Epithet | Hunger | Appetite |', '|---|---|---|---|');
  for (const d of g.gods) L.push(`| ${d.emoji} **${d.name}** \`${d.id}\` | ${d.epithet} | ${d.hunger} | ${d.appetite} |`);
  L.push('');
  const rs = defaultRuleset();
  L.push('## How genesis tags are rolled', '',
    `Each driver gets three slots: driver, car (their own chassis), team (one roll, shared by teammates). Per slot:`, '',
    `1. **Does it hit?** ${describeChance(rs.tags.genesisChance)}.`,
    `2. **Which bucket?** ${describeOdds(rs.tags.rarityOdds)}. Fixed odds — adding tags to a bucket never changes how often it comes up, only which tag you get.`,
    `3. **Which tag?** An even pick inside the bucket. An empty bucket falls to the next more common one.`, '',
    `Bucket sizes in the default pool: ${RARITIES.map(r => `${r} ${g.tags.filter(t => t.group === 'genesis' && isGenesisTag(t.tag) && t.tag.rarity === r).length}`).join(' · ')}. Cards change the hit chance and the odds.`, '');
  L.push('## How tags enter the world', '', '| Door | What it means |', '|---|---|',
    '| Genesis | Rolled when a driver, car or team is born (chance and pool set by the ruleset) |',
    '| Commissionary | Attached by you, from the next race (`attach-tag`) |',
    '| Acquired | Awarded by the settle loop for what happened in a race (`acquire-tag`), from the next race |',
    '| In-race | Picked up mid-race from a race event; may expire by lap, at the next stop, or carry over |',
    '');
  const groups: [TagGroup, string][] = [['genesis', 'Genesis tags'], ['acquired', 'Acquired tags'], ['in-race', 'In-race tags']];
  for (const [grp, title] of groups) {
    const measured = grp === 'genesis';
    L.push(`## ${title}`, '');
    if (measured) L.push(`Measured: each tag alone on one driver over ${TAG_CALIBRATION.races} seeded races vs the same races untagged (Race Control → Tag calibration; \`npm run calibrate\`, batch ${TAG_CALIBRATION.batchSeed}).`, '');
    L.push(`| Tag | Rarity | Target | Fires | Effect | Lasts | After a race | How you get it |${measured ? ' Measured |' : ''}`, `|---|---|---|---|---|---|---|---|${measured ? '---|' : ''}`);
    for (const t of g.tags.filter(x => x.group === grp)) {
      const c = measured ? calibrationFor(t.tag.id) : undefined;
      L.push(`| ${t.tag.emoji} **${t.tag.name}** \`${t.tag.id}\` — ${t.tag.description} | ${t.tag.rarity} | ${t.tag.target} | ${t.fires} | ${fx(t.effects)} | ${t.lasts} | ${t.does.join('; ') || '—'} | ${t.source} |${measured ? ` ${c ? describeCalibration(c) : 'not measured'} |` : ''}`);
    }
    L.push('');
  }
  L.push('## Rule cards', '', '| Rule card | Scope | Weight | Does |', '|---|---|---|---|');
  for (const c of g.cards) L.push(`| ${c.emoji} **${c.name}** \`${c.id}\` | ${c.scope} | ${c.weight} | ${c.readout} |`);
  L.push('', '## Acquisition rules (after a race)', '', '| Rule | Family | Trigger | Awards |', '|---|---|---|---|');
  for (const r of g.acquisitionRules) { const t = ALL_TAGS.find(x => x.id === r.tagId); L.push(`| \`${r.id}\` | ${r.family} | ${describeTrigger(r.when)} | ${t?.emoji ?? ''} ${t?.name ?? r.tagId} |`); }
  L.push('', '## In-race rules (during a race)', '', '| Rule | After | Awards | Lasts |', '|---|---|---|---|');
  for (const r of g.inRaceRules) { const t = ALL_TAGS.find(x => x.id === r.tagId); L.push(`| \`${r.id}\` | ${EVENT_WORDS[r.on] ?? r.on}${r.match ? ` (${String(r.match).replace(/^\/\^?|\/$/g, '')})` : ''} | ${t?.emoji ?? ''} ${t?.name ?? r.tagId} | ${describeInRaceDuration(r.duration)} |`); }
  L.push('', '## Flavour pools', '', '*Names, backstories, quirks. Each is a plain list in the file named; add lines, keep the voice.*', '', '| Pool | Size | Where | Samples |', '|---|---|---|---|');
  for (const p of g.pools) L.push(`| **${p.title}** | ${p.size} | \`${p.where}\` | ${p.samples.map(x => x.replace(/\|/g, '\\|')).join(' · ')} |`);
  L.push('');
  return L.join('\n');
}
