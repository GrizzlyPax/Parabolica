// A season's FORMAT (#694, Nationals; Pax's answers Oct 15): the plain season
// has none (every team races every round, points from round 1). A format
// names one race as THE HUNDRED, with LAP CUTS inside it (when the leader
// completes lap N, the teams are ranked by their best-placed running car and
// everything below the line is eliminated; the engine does the cutting,
// RaceConfig.lapCuts) and a car that doesn't finish it is out; the races
// after it are THE FINAL (points from zero). All of it is derived from the
// digests, so the facts stay the facts.
//
// Nationals: race 1 the Hundred (100 cars; cuts to 30 / 20 / 10 states after
// laps 1 / 2 / 3), then a three-race Final from zero. Ace America is P1 of
// the Final's table. The Final's first race starts as the Hundred finished.
import { draftState } from './draft';
import type { LapCut } from '../RaceEngine';
import type { RaceDigest } from '../league/types';
import { poolFor, type SeasonFacts } from './season';

export type { LapCut };

export interface SeasonFormat {
  /** The race (0-based) with lap cuts inside it; a car that doesn't finish it is out. */
  hundred?: { race: number; lapCuts: LapCut[] };
  /** Points count from this race (0-based) on. */
  finalFrom: number;
  /** The stages' names, for the screens: one per race. */
  stages?: string[];
}

export interface AliveState {
  /** Teams still in, in draft order. */
  teams: string[];
  /** Drivers still in (a team may be down to one). */
  drivers: number[];
  /** Teams out, with the race (0-based) that took them. */
  outAt: Record<string, number>;
}

export function formatOf(facts: SeasonFacts): SeasonFormat | undefined {
  return facts.setup.league?.format;
}

/** A team's best finishing position in a digest among `drivers` (1-based); a car that didn't finish ranks after the whole field. */
export function bestFinish(digest: RaceDigest, drivers: readonly number[]): number[] {
  const after = digest.finishOrder.length + 1;
  return drivers.map(id => { const i = digest.finishOrder.indexOf(id); return i < 0 ? after : i + 1; }).sort((a, b) => a - b);
}

/**
 * Who is still in going into `round` (the state after the results before
 * it). Without a format everyone is. Pure in the facts: after the Hundred,
 * the cars that finished it are in (the cut and the retired are not).
 */
export function aliveAt(facts: SeasonFacts, round: number = facts.results.length): AliveState {
  const pool = poolFor(facts);
  const rosters = draftState(pool, facts.draftPicks).rosters;
  const order = pool.teams.map(t => t.id);
  let teams = order.filter(id => rosters[id]);
  const alive = new Map(teams.map(id => [id, [...rosters[id].driverIds]]));
  const outAt: Record<string, number> = {};
  const format = formatOf(facts);
  if (!format?.hundred) return { teams, drivers: teams.flatMap(id => alive.get(id)!), outAt };
  const r = format.hundred.race;
  if (r < Math.min(round, facts.results.length)) {
    const finished = new Set(facts.results[r].finishOrder);
    for (const id of teams) alive.set(id, alive.get(id)!.filter(d => finished.has(d)));
    for (const id of teams) if (!alive.get(id)!.length) outAt[id] = r;
    teams = teams.filter(id => outAt[id] === undefined);
  }
  return { teams, drivers: teams.flatMap(id => alive.get(id)!), outAt };
}

/** Is this team out going into `round`? */
export function isOut(facts: SeasonFacts, teamId: string, round: number = facts.results.length): boolean {
  return aliveAt(facts, round).outAt[teamId] !== undefined;
}

/** The results that score: all, or the Final's under a format. */
export function scoredRounds(facts: SeasonFacts): number[] {
  const format = formatOf(facts);
  return facts.results.map((_, i) => i).filter(i => !format || i >= format.finalFrom);
}

/** The lap cuts a round runs with (the Hundred's), or none. */
export function lapCutsFor(facts: SeasonFacts, round: number): LapCut[] | undefined {
  const h = formatOf(facts)?.hundred;
  return h && h.race === round ? h.lapCuts : undefined;
}

/** A fixed grid for a round: the race after the Hundred starts as the Hundred finished (no qualifying). */
export function gridFor(facts: SeasonFacts, round: number): number[] | undefined {
  const h = formatOf(facts)?.hundred;
  if (!h || round !== h.race + 1) return undefined;
  return facts.results[h.race]?.finishOrder;
}

/** The stage a round is, for the screens: its name, who is still in, what the race decides. */
export function stageOf(facts: SeasonFacts, round: number): { name: string; alive: number; drivers: number; decides: string } | null {
  const format = formatOf(facts);
  if (!format) return null;
  const a = aliveAt(facts, round);
  const h = format.hundred;
  const decides = h && h.race === round
    ? `${h.lapCuts.map(c => c.keep).join(' / ')} states go on after laps ${h.lapCuts.map(c => c.afterLap).join(' / ')}; a car that doesn't finish is out`
    : round >= format.finalFrom ? 'points from zero; most points is the title'
    : '';
  const name = format.stages?.[round] ?? (round >= format.finalFrom ? 'The Final' : `Race ${round + 1}`);
  return { name, alive: a.teams.length, drivers: a.drivers.length, decides };
}
