// A season's FORMAT (#694, Nationals; Steward's schedule Oct 14): the plain
// season has none (every team races every round, points from round 1). A
// format adds a KNOCKOUT race (a car that doesn't finish is out; a state is
// out when both its cars are), CUTS (after a race, keep the top N teams by
// their best finisher) and a FINAL (points count from that race on). All of
// it is derived from the results, so the facts stay the facts.
//
// Nationals: race 1 the Hundred (knockout) · race 2 → 30 states · race 3 →
// 20 · race 4 → 10 · races 5–7 the Final, points from zero. Ace America is
// P1 of the Final's table.
import { draftState } from './draft';
import type { RaceDigest } from '../league/types';
import { poolFor, type SeasonFacts } from './season';

export interface SeasonFormat {
  /** The race (0-based) in which a car that doesn't finish is out. */
  knockoutRace?: number;
  /** After race `after` (0-based), the top `keep` teams by best finisher stay. */
  cuts: { after: number; keep: number }[];
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
  /** Teams out, with the race (0-based) after which they went. */
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
 * it). Without a format everyone is. Pure in the facts.
 */
export function aliveAt(facts: SeasonFacts, round: number = facts.results.length): AliveState {
  const pool = poolFor(facts);
  const rosters = draftState(pool, facts.draftPicks).rosters;
  const order = pool.teams.map(t => t.id);
  let teams = order.filter(id => rosters[id]);
  const alive = new Map(teams.map(id => [id, [...rosters[id].driverIds]]));
  const outAt: Record<string, number> = {};
  const format = formatOf(facts);
  if (!format) return { teams, drivers: teams.flatMap(id => alive.get(id)!), outAt };
  const through = Math.min(round, facts.results.length);
  for (let r = 0; r < through; r++) {
    const digest = facts.results[r];
    if (format.knockoutRace === r) {
      const dnf = new Set(digest.dnfDriverIds);
      for (const id of teams) alive.set(id, alive.get(id)!.filter(d => !dnf.has(d)));
      for (const id of teams) if (!alive.get(id)!.length) outAt[id] = r;
      teams = teams.filter(id => outAt[id] === undefined);
    }
    const cut = format.cuts.find(c => c.after === r);
    if (cut) {
      const ranked = [...teams].sort((a, b) => {
        const fa = bestFinish(digest, alive.get(a)!), fb = bestFinish(digest, alive.get(b)!);
        for (let i = 0; i < Math.max(fa.length, fb.length); i++) {
          const d = (fa[i] ?? Infinity) - (fb[i] ?? Infinity);
          if (d) return d;
        }
        return order.indexOf(a) - order.indexOf(b);
      });
      for (const id of ranked.slice(cut.keep)) outAt[id] = r;
      teams = ranked.slice(0, cut.keep).sort((a, b) => order.indexOf(a) - order.indexOf(b));
    }
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

/** The stage a round is, for the screens: its name, who is still in, what the race decides. */
export function stageOf(facts: SeasonFacts, round: number): { name: string; alive: number; drivers: number; decides: string } | null {
  const format = formatOf(facts);
  if (!format) return null;
  const a = aliveAt(facts, round);
  const cut = format.cuts.find(c => c.after === round);
  const decides = format.knockoutRace === round ? 'a car that doesn\'t finish is out'
    : cut ? `the top ${cut.keep} stay`
    : round >= format.finalFrom ? 'points from zero; most points is the title'
    : '';
  const name = format.stages?.[round] ?? (round >= format.finalFrom ? 'The Final' : `Race ${round + 1}`);
  return { name, alive: a.teams.length, drivers: a.drivers.length, decides };
}
