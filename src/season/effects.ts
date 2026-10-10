// Timed effects (#332): a stat change on a driver, the car or the team that
// lasts N RACES (between races) or N LAPS (inside one race). Gear mileage
// (#627: gear is double strength, gone after 3 races), curses (all bad, forced,
// on the car or team, 3 races) and later Paddock events (#369) are all this.
//
// Facts, not state: an effect is written once, with the round it starts and
// its timer; whether it is live in round R is derived (start ≤ R < start +
// races), so a replay and a save need nothing else. Lap effects run in the
// race they are dealt for: the engine adds the deltas from `fromLap` for
// `laps` laps and takes them off (RaceEngine → LapEffect). Grade points go in
// (the card math: pct × the stat's span / 100); the engine gets raw units.
//
// A team carried up a run (#597) brings its live effects, with the races
// already used subtracted, so "2 races left" is still 2 races left.

import type { Card, CardStat, StatKey } from '../cards/types';
import { statRange, favourPercents } from '../cards/apply';
import type { LapEffect, EffectInfo, DriverStats, CarStats, TeamStats } from '../RaceEngine';
import type { CardHolder } from './pack';
import { draftState } from './draft';
import { poolFor, type SeasonFacts } from './season';

export type EffectSource = EffectInfo['source'];
export type EffectTimer = { races: number } | { laps: number; fromLap?: number };

export interface EffectFact {
  type: 'effect';
  /** The round it is dealt in: live from this round. */
  round: number;
  teamId: string;
  /** Unique within the team's log (the dealer picks it: `curse-r2-grip`). */
  id: string;
  name: string;
  emoji: string;
  source: EffectSource;
  /** Where it sits: one driver, the car (both drivers) or the team (both drivers). */
  target: CardHolder;
  /** Grade points per stat; negative is a curse. */
  stats: CardStat[];
  timer: EffectTimer;
}

export const isRaces = (t: EffectTimer): t is { races: number } => 'races' in t;

/** The effects a team holds that are live in `round`, with what is left. */
export interface ActiveEffect extends EffectFact {
  /** Races still to run including this one (race timers); the lap count (lap timers). */
  left: number;
}

export function effectFactsOf(facts: SeasonFacts): EffectFact[] {
  return [...(facts.setup.carry?.effects ?? []), ...(facts.effectFacts ?? [])];
}

/** Live in round R: a race timer covers rounds [round, round + races); a lap
 * timer lives in its own round only. */
export function activeEffects(facts: SeasonFacts, teamId: string, round: number): ActiveEffect[] {
  return effectFactsOf(facts)
    .filter(e => e.teamId === teamId)
    .flatMap(e => {
      if (isRaces(e.timer)) {
        const left = e.round + e.timer.races - round;
        return round >= e.round && left > 0 ? [{ ...e, left }] : [];
      }
      return round === e.round ? [{ ...e, left: e.timer.laps }] : [];
    });
}

export function describeLeft(e: ActiveEffect): string {
  return isRaces(e.timer) ? `${e.left} race${e.left === 1 ? '' : 's'} left` : `${e.left} lap${e.left === 1 ? '' : 's'}`;
}

export function effectInfo(e: ActiveEffect): EffectInfo {
  return { id: e.id, name: e.name, emoji: e.emoji, source: e.source, left: describeLeft(e) };
}

/** Grade points → raw units for the engine's lap effects. */
export function rawDeltas(stats: CardStat[]): Pick<LapEffect, 'driver' | 'car' | 'team'> {
  const out: { driver: Partial<DriverStats>; car: Partial<CarStats>; team: Partial<TeamStats> } = { driver: {}, car: {}, team: {} };
  for (const [k, pct] of Object.entries(favourPercents(stats))) {
    const key = k as StatKey;
    const delta = ((pct ?? 0) * statRange(key).span) / 100;
    if (key in DRIVER_KEYS) out.driver[key as keyof DriverStats] = delta;
    else if (key in CAR_KEYS) out.car[key as keyof CarStats] = delta;
    else out.team[key as keyof TeamStats] = delta;
  }
  return out;
}
const DRIVER_KEYS = { baseSpeed: 1, consistency: 1, luck: 1, acceleration: 1, endurance: 1, aggression: 1 };
const CAR_KEYS = { power: 1, grip: 1, reliability: 1 };

/** Whether an effect reaches a driver: its own, or the car's / the team's (both drivers). */
export function reaches(e: EffectFact, driverId: number): boolean {
  return e.target.kind !== 'driver' || e.target.id === driverId;
}

/** Everything the roster builder needs for a round: race-timed grade points
 * per driver (own + car + team effects), lap effects per driver, and the
 * display infos. Keyed by driver id. */
export interface RoundEffects {
  points: Record<number, CardStat[]>;
  laps: Record<number, LapEffect[]>;
  infos: Record<number, EffectInfo[]>;
}

export function roundEffects(facts: SeasonFacts, round: number): RoundEffects {
  const pool = poolFor(facts);
  const rosters = draftState(pool, facts.draftPicks).rosters;
  const out: RoundEffects = { points: {}, laps: {}, infos: {} };
  for (const t of pool.teams) {
    const live = activeEffects(facts, t.id, round);
    if (!live.length) continue;
    for (const driverId of rosters[t.id].driverIds) {
      const mine = live.filter(e => reaches(e, driverId));
      if (!mine.length) continue;
      out.points[driverId] = mine.filter(e => isRaces(e.timer)).flatMap(e => e.stats);
      out.laps[driverId] = mine.filter(e => !isRaces(e.timer)).map(e => ({
        id: e.id, name: e.name, emoji: e.emoji, fromLap: (e.timer as { fromLap?: number }).fromLap ?? 0, laps: (e.timer as { laps: number }).laps, ...rawDeltas(e.stats),
      }));
      out.infos[driverId] = mine.map(effectInfo);
    }
  }
  return out;
}

/** The team's live effects on a holder as display cards (#627): the Paddock
 * reads a stat's sum from Card[] (readStat), so a curse shows there as a red
 * line. Not deck cards: ids are the effect's. */
export function effectCards(facts: SeasonFacts, teamId: string, round: number, holder: CardHolder): Card[] {
  return activeEffects(facts, teamId, round)
    .filter(e => isRaces(e.timer) && (e.target.kind === holder.kind && (holder.kind !== 'driver' || e.target.kind !== 'driver' || e.target.id === holder.id)))
    .map(e => ({ id: e.id, name: `${e.name} (${describeLeft(e)})`, kind: 'trait', target: e.target.kind, stats: e.stats, deck: 'motorsport' }));
}

/** Why an effect can't be dealt, or null. The dealer (a pack, a curse, an
 * event) owns the clock rules; this checks the shape and the target. */
export function validateEffect(facts: SeasonFacts, e: EffectFact): string | null {
  const pool = poolFor(facts);
  const roster = draftState(pool, facts.draftPicks).rosters[e.teamId];
  if (!roster) return `unknown team ${e.teamId}`;
  if (e.target.kind === 'driver' && !roster.driverIds.includes(e.target.id)) return `driver ${e.target.id} is not on ${e.teamId}`;
  if (!e.stats.length) return 'an effect changes at least one stat';
  if (isRaces(e.timer) ? e.timer.races < 1 : e.timer.laps < 1) return 'a timer is at least 1';
  if (effectFactsOf(facts).some(x => x.teamId === e.teamId && x.id === e.id)) return `effect ${e.id} is already on ${e.teamId}`;
  return null;
}

/** Deal an effect. Pure; throws when it can't apply. */
export function addEffect(facts: SeasonFacts, e: EffectFact): SeasonFacts {
  const why = validateEffect(facts, e);
  if (why) throw new Error(`effect: ${why}`);
  return { ...facts, effectFacts: [...(facts.effectFacts ?? []), e] };
}

/** The effects still live after a league's last race, re-dated so the races
 * used are subtracted: what carries up a run (#597). Lap effects don't carry. */
export function carriedEffects(facts: SeasonFacts, teamId: string): EffectFact[] {
  const after = facts.setup.calendar.length; // the round after the last
  return activeEffects(facts, teamId, after).map(({ left: _l, ...e }) => ({ ...e, round: e.round - after }));
}
