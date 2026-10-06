// The acquisition engine (#232): after each race settles, decide which tags
// the sim hands out or takes away. Pure — a function of the league so far,
// this race's digest, and a seed derived from the league seed and race index.
// Output is log entries, appended to the same append-only log the
// Commissionary's interventions use; rosterStateAt applies them in race order,
// so history stays unrewritable and the whole thing recomputes from inputs.

import { mulberry32, deriveSeed } from '../engine/rng';
import { getTagById, Tag, TagDuration } from '../data/tags';
import { ACQUISITION_RULES, AcquisitionRule, AcquisitionTrigger } from '../data/acquisitions';
import { Intervention, LeagueState, RaceDigest, TagChange } from './types';
import { SeasonState } from '../types/season';
import { canAttachTag } from './league';
import { defaultRuleset } from '../rules/ruleset';
import { RosterDriver } from '../RaceEngine';

interface DriverView {
  id: number;
  name: string;
  /** Finish position per race so far, -1 = DNF (season.driverStats). */
  results: number[];
  tags: Tag[];
}

function streak(results: number[], stat: 'win' | 'podium' | 'dnf', count: number): boolean {
  if (results.length < count) return false;
  const tail = results.slice(-count);
  return tail.every(r => stat === 'dnf' ? r === -1 : stat === 'win' ? r === 1 : r >= 1 && r <= 3);
}

function fires(trigger: AcquisitionTrigger, d: DriverView, digest: RaceDigest, rng: () => number): boolean {
  switch (trigger.on) {
    case 'streak':
      return streak(d.results, trigger.stat, trigger.count);
    case 'climb': {
      const grid = digest.gridOrder?.indexOf(d.id);
      const fin = digest.finishOrder.indexOf(d.id);
      if (grid === undefined || grid < 0 || fin < 0) return false;
      if (trigger.finishedTop !== undefined && fin >= trigger.finishedTop) return false;
      return grid - fin >= trigger.places;
    }
    case 'crashed-out':
      return digest.dnfDriverIds.includes(d.id) && (digest.crashPairs ?? []).some(p => p.includes(d.id));
    case 'survived-crash': {
      if (!(digest.damagedDriverIds ?? []).includes(d.id)) return false;
      const pos = digest.finishOrder.indexOf(d.id);
      return pos >= 0 && (trigger.finishedTop === undefined || pos < trigger.finishedTop);
    }
    case 'fastest-lap':
      return digest.fastestLapDriverId === d.id;
    case 'lottery':
      return rng() < trigger.chance;
    default:
      return false;
  }
}

/** First race index a tag acquired after race `earnedAt` runs out, or null. */
function expiryIndex(earnedAt: number, duration: TagDuration | undefined): number | null {
  if (!duration || duration === 'permanent' || duration === 'season') return null;
  return earnedAt + 1 + duration.races;
}

export interface AcquisitionResult {
  entries: Intervention[];
  changes: TagChange[];
}

/**
 * Evaluate every rule for every driver after race `digest.index` has settled.
 * `season` is the stat state AFTER this race; `roster` is the stack each
 * driver carried INTO this race (so a tag awarded now can't award again from
 * the same race). Deterministic: the lottery draws from
 * deriveSeed(leagueSeed, 'tags', raceIndex, driverId).
 */
export function evaluateAcquisitions(
  league: LeagueState,
  digest: RaceDigest,
  season: SeasonState,
  roster: RosterDriver[],
  rules: AcquisitionRule[] = ACQUISITION_RULES
): AcquisitionResult {
  const cap = (league.setup.ruleset ?? defaultRuleset()).tags.slotCap;
  const nextRace = digest.index + 1;
  const entries: Intervention[] = [];
  const changes: TagChange[] = [];
  // Tags already scheduled to expire at `nextRace` (emitted by earlier races)
  // are gone when the next race runs — treat them as absent for the cap.
  const expiringNext = new Set(
    league.interventionLog
      .filter(e => e.type === 'expire-tag' && e.atRaceIndex <= nextRace)
      .map(e => `${e.targetDriverId}:${e.tagId}`)
  );

  for (const d of roster) {
    const stats = season.driverStats.get(d.id);
    const view: DriverView = { id: d.id, name: d.fullName, results: stats?.raceResults ?? [], tags: d.tags };
    const rng = mulberry32(deriveSeed(league.leagueSeed, 'tags', digest.index, d.id));
    // Working stack for this driver as the NEXT race will see it.
    let stack = d.tags.filter(t => !expiringNext.has(`${d.id}:${t.id}`));

    for (const rule of rules) {
      const tag = getTagById(rule.tagId);
      if (!tag) continue;
      // Every driver draws once per lottery rule so streams stay stable.
      const hit = fires(rule.when, view, digest, rng);
      if (!hit) continue;
      if (!canAttachTag(stack, tag, cap)) continue; // has it, or no room
      stack = [...stack, tag];
      const headline = rule.headline.replace('{driver}', d.fullName).replace('{tag}', `${tag.emoji} ${tag.name}`);
      entries.push({ type: 'acquire-tag', atRaceIndex: nextRace, targetDriverId: d.id, tagId: tag.id, ruleId: rule.id, reason: headline, earnedAtRaceIndex: digest.index });
      changes.push({ kind: 'acquire', driverId: d.id, tagId: tag.id, headline });
      const ends = expiryIndex(digest.index, tag.duration);
      if (ends !== null) entries.push({ type: 'expire-tag', atRaceIndex: ends, targetDriverId: d.id, tagId: tag.id });
    }
  }
  return { entries, changes };
}

/** Which timed tags run out going INTO race `raceIndex` — for digest headlines. */
export function expiriesAt(league: LeagueState, raceIndex: number, roster: RosterDriver[]): TagChange[] {
  const out: TagChange[] = [];
  for (const e of league.interventionLog) {
    if (e.type !== 'expire-tag' || e.atRaceIndex !== raceIndex) continue;
    const tag = getTagById(e.tagId);
    const d = roster.find(x => x.id === e.targetDriverId);
    if (!tag || !d) continue;
    out.push({ kind: 'expire', driverId: d.id, tagId: tag.id, headline: `${d.fullName} is no longer ${tag.emoji} ${tag.name}` });
  }
  return out;
}


/** Mid-race pickups with a {races:n} duration become league log entries, so
 * the driver carries them into the next race(s) (#232b). */
export function carryoverEntries(league: LeagueState, digest: RaceDigest, roster: RosterDriver[]): AcquisitionResult {
  const cap = (league.setup.ruleset ?? defaultRuleset()).tags.slotCap;
  const nextRace = digest.index + 1;
  const entries: Intervention[] = [];
  const changes: TagChange[] = [];
  for (const c of digest.inRaceCarryovers ?? []) {
    const tag = getTagById(c.tagId);
    const d = roster.find(x => x.id === c.driverId);
    if (!tag || !d) continue;
    if (!canAttachTag(d.tags, tag, cap)) continue;
    const headline = `${d.fullName} carries ${tag.emoji} ${tag.name} into the next race (picked up on lap ${c.lap + 1})`;
    entries.push({ type: 'acquire-tag', atRaceIndex: nextRace, targetDriverId: d.id, tagId: tag.id, ruleId: 'in-race-carryover', reason: headline, earnedAtRaceIndex: digest.index });
    entries.push({ type: 'expire-tag', atRaceIndex: nextRace + c.races, targetDriverId: d.id, tagId: tag.id });
    changes.push({ kind: 'acquire', driverId: d.id, tagId: tag.id, headline });
  }
  return { entries, changes };
}
