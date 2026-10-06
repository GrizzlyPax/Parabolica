// The glossary (#235 prep): one model of everything in the sim, built FROM
// the data modules so it can never drift. docs/GLOSSARY.md (npm run
// glossary) and the in-game Glossary screen both render this.

import { ALL_TAGS, ActionTarget, Tag, TagAction, TRIGGER_LABELS, describeCondition, describeDuration, getTagById, isGenesisTag } from './tags';
import { CARDS } from './cards';
import type { Card } from '../rules/ruleset';
import { ACQUISITION_RULES, AcquisitionRule, AcquisitionTrigger } from './acquisitions';
import { IN_RACE_RULES, InRaceRule, InRaceDuration } from './inRace';
import { WEATHER_TYPES } from './weather';
import { TRACK_TAGS, intrinsicTrackTags } from './trackTags';
import { INFLICTIONS } from './inflictions';
import { CURRENT_TRACKS } from '../generators/tracks';

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

export type TagGroup = 'genesis' | 'acquired' | 'in-race' | 'condition';

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
  if (t.target === 'condition') return 'condition';
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
    if (group === 'condition') { source = 'stamped by a track event for one race'; lasts = 'one race'; }
    return { tag, group, fires, lasts, effects: effectsOf(tag.effects), source, does: (tag.afterRace ?? []).map(describeAction) };
  });
}

export interface Glossary {
  tags: GlossaryTag[];
  cards: Card[];
  acquisitionRules: AcquisitionRule[];
  inRaceRules: InRaceRule[];
  weather: typeof WEATHER_TYPES;
  trackTags: typeof TRACK_TAGS;
  inflictions: typeof INFLICTIONS;
  tracks: typeof CURRENT_TRACKS;
  counts: Record<string, number>;
}

export function buildGlossary(): Glossary {
  const tags = buildGlossaryTags();
  return {
    tags, cards: CARDS, acquisitionRules: ACQUISITION_RULES, inRaceRules: IN_RACE_RULES,
    weather: WEATHER_TYPES, trackTags: TRACK_TAGS, inflictions: INFLICTIONS, tracks: CURRENT_TRACKS,
    counts: {
      tags: tags.length,
      genesis: tags.filter(t => t.group === 'genesis').length,
      acquired: tags.filter(t => t.group === 'acquired').length,
      inRace: tags.filter(t => t.group === 'in-race').length,
      condition: tags.filter(t => t.group === 'condition').length,
      cards: CARDS.length, rules: ACQUISITION_RULES.length + IN_RACE_RULES.length,
      weather: WEATHER_TYPES.length, trackTags: TRACK_TAGS.length, inflictions: INFLICTIONS.length, tracks: CURRENT_TRACKS.length,
    },
  };
}

/** Render the whole glossary as markdown — docs/GLOSSARY.md. */
export function renderGlossaryMd(g: Glossary, version: string): string {
  const L: string[] = [];
  const fx = (e: GlossaryEffect[]) => e.length ? e.map(x => `${x.value} ${x.label}`).join(', ') : '—';
  L.push(`# Parabolica Glossary`, '', `*Generated from the data modules by \`npm run glossary\` — do not edit by hand. Engine v${version}.*`, '');
  L.push(`${g.counts.tags} tags (${g.counts.genesis} genesis · ${g.counts.acquired} acquired · ${g.counts.inRace} in-race · ${g.counts.condition} condition) · ${g.counts.cards} cards · ${g.counts.rules} rules · ${g.counts.weather} weathers · ${g.counts.trackTags} track characters · ${g.counts.inflictions} inflictions · ${g.counts.tracks} tracks`, '');
  L.push('## How tags enter the world', '', '| Door | What it means |', '|---|---|',
    '| Genesis | Rolled when a driver, car or team is born (chance and pool set by the ruleset) |',
    '| Commissionary | Attached by you, from the next race (`attach-tag`) |',
    '| Acquired | Awarded by the settle loop for what happened in a race (`acquire-tag`), from the next race |',
    '| In-race | Picked up mid-race from a race event; may expire by lap, at the next stop, or carry over |',
    '| Condition | Stamped on drivers by a track event for that race only |', '');
  const groups: [TagGroup, string][] = [['genesis', 'Genesis tags'], ['acquired', 'Acquired tags'], ['in-race', 'In-race tags'], ['condition', 'Condition tags']];
  for (const [grp, title] of groups) {
    L.push(`## ${title}`, '', '| Tag | Rarity | Target | Fires | Effect | Lasts | After a race | How you get it |', '|---|---|---|---|---|---|---|---|');
    for (const t of g.tags.filter(x => x.group === grp)) {
      L.push(`| ${t.tag.emoji} **${t.tag.name}** \`${t.tag.id}\` — ${t.tag.description} | ${t.tag.rarity ?? 1}× | ${t.tag.target} | ${t.fires} | ${fx(t.effects)} | ${t.lasts} | ${t.does.join('; ') || '—'} | ${t.source} |`);
    }
    L.push('');
  }
  L.push('## Cards', '', '| Card | Scope | Weight | Does |', '|---|---|---|---|');
  for (const c of g.cards) L.push(`| ${c.emoji} **${c.name}** \`${c.id}\` | ${c.scope} | ${c.weight} | ${c.readout} |`);
  L.push('', '## Acquisition rules (after a race)', '', '| Rule | Family | Trigger | Awards |', '|---|---|---|---|');
  for (const r of g.acquisitionRules) { const t = ALL_TAGS.find(x => x.id === r.tagId); L.push(`| \`${r.id}\` | ${r.family} | ${describeTrigger(r.when)} | ${t?.emoji ?? ''} ${t?.name ?? r.tagId} |`); }
  L.push('', '## In-race rules (during a race)', '', '| Rule | After | Awards | Lasts |', '|---|---|---|---|');
  for (const r of g.inRaceRules) { const t = ALL_TAGS.find(x => x.id === r.tagId); L.push(`| \`${r.id}\` | ${EVENT_WORDS[r.on] ?? r.on}${r.match ? ` (${String(r.match).replace(/^\/\^?|\/$/g, '')})` : ''} | ${t?.emoji ?? ''} ${t?.name ?? r.tagId} | ${describeInRaceDuration(r.duration)} |`); }
  L.push('', '## Weather', '', '| Weather | Odds (default) | Stamps | Field-wide at full intensity |', '|---|---|---|---|');
  const total = g.weather.reduce((s, w) => s + w.weight, 0);
  for (const w of g.weather) L.push(`| ${w.emoji} **${w.name}** \`${w.id}\` | ${Math.round(w.weight / total * 100)}% | ${w.conditions.join(', ') || '—'} | ${fx(effectsOf(w.baseEffects))} |`);
  L.push('', '## Track characters', '', '| Character | Field-wide | Stamps |', '|---|---|---|');
  for (const t of g.trackTags) L.push(`| ${t.emoji} **${t.name}** \`${t.id}\` | ${fx(effectsOf(t.passive ?? {}))} | ${(t.conditions ?? []).join(', ') || '—'} |`);
  L.push('', '## Inflictions (mid-race, from conditions)', '', '| Infliction | Needs | Effect | Lasts |', '|---|---|---|---|');
  for (const i of g.inflictions) L.push(`| ${i.emoji} **${i.name}** \`${i.id}\` | ${i.requiresCondition.join(', ')} | ${fx(effectsOf(i.effects))} | ${i.durationTicks} ticks |`);
  L.push('', '## Tracks', '', '| Track | Laps | Length | Character | Event |', '|---|---|---|---|---|');
  for (const t of g.tracks) { const tt = g.trackTags.filter(x => intrinsicTrackTags(t.id).some(i => i.id === x.id)); L.push(`| ${t.funEmoji} **${t.name}** \`${t.id}\` | ${t.laps} | ${t.length}m | ${tt.map(x => `${x.emoji} ${x.name}`).join(', ') || '—'} | ${t.event ? `${t.event.emoji} ${t.event.name}` : '—'} |`); }
  L.push('');
  return L.join('\n');
}
