// The run (#597, docs/V07_PLAN.md): a ladder of LEAGUES_PER_RUN leagues, each
// a Season of RACES_PER_LEAGUE races. Win the league (P1 in the Constructors')
// to move up with your whole team; anything else ends the run.
//
// Facts, not state. A run is `RunFacts`: its setup and, per league entered,
// the league's own facts (draft picks, lineups, card facts, results) with NO
// setup of its own. Each league's SeasonSetup is derived here: its seed from
// the run seed, its calendar, and the team carried up from the league before
// (drivers, car, team, traits, gear and locker; timers ride with #332). So a
// saved run is small, and a run replayed from its facts is the run.
//
// League 0 is exactly today's Season (same seed, same pool, same calendar):
// the run changes no race result. Hooks left on purpose: `LeagueContext`
// (rival levels #626, the boss round #593), `RunSetup.start` (the rookie pick
// #594 replaces the draft), XP (#592) will be its own fact log here.

import { deriveSeed } from '../engine/rng';
import type { Ruleset } from '../rules/ruleset';
import type { RaceDigest } from '../league/types';
import { DEFAULT_TEAMS, type CarriedTeam, type LeagueContext } from '../season/genesis';
import { draftState, quickDraft } from '../season/draft';
import { carriedCards, teamCardState } from '../season/pack';
import { constructorStandings, poolFor, seasonState, settleRound, type SeasonFacts, type SeasonHuman, type SeasonSetup, type SeasonStore } from '../season/season';
import { seasonCalendar } from '../season/setup';

export const LEAGUES_PER_RUN = 4;
export const RACES_PER_LEAGUE = 6;

/** The ladder, bottom to top. `level` is the rivals' level (#626 sets what it means). */
export const LEAGUE_LADDER: readonly { name: string; level: number }[] = [
  { name: 'Juniors', level: 1 },
  { name: 'Regional', level: 2 },
  { name: 'National', level: 3 },
  { name: 'Top flight', level: 4 },
];

/** How a run starts: today's draft, until the rookie pick (#594) lands. */
export type RunStart = 'draft';

export interface RunSetup {
  seed: number;
  teamCount: number;
  /** The player's team: the identity they wear all run. */
  team: SeasonHuman;
  /** Races per league (RACES_PER_LEAGUE; League Setup's choice is honoured). */
  races: number;
  ruleset?: Ruleset;
  start: RunStart;
  /** Difficulty setting (#596); plain Paddock until stakes land. */
  stake?: string;
}

/** A league's facts: a Season without its setup, which the run derives. */
export type LeagueFacts = Omit<SeasonFacts, 'setup'>;

export interface RunFacts {
  setup: RunSetup;
  /** One per league entered, bottom first; the last is the one in play. */
  leagues: LeagueFacts[];
}

export type RunPhase =
  /** The current league is being raced. */
  | 'league'
  /** The league is over and won; the next one waits on `promote`. */
  | 'league-won'
  /** The top league is won: the run is won. */
  | 'run-won'
  /** A league was lost: the run is over. */
  | 'run-lost';

export interface LadderRung {
  index: number;
  name: string;
  level: number;
  status: 'won' | 'lost' | 'current' | 'ahead';
}

export interface RunState {
  leagueIndex: number;
  phase: RunPhase;
  /** The league in play (or the one just finished), as a Season. */
  league: SeasonFacts;
  ladder: LadderRung[];
  /** Leagues won so far. */
  won: number;
}

export function emptyLeague(): LeagueFacts {
  return { draftPicks: [], lineups: [], cardFacts: [], results: [] };
}

export function newRun(setup: Omit<RunSetup, 'start' | 'races' | 'teamCount'> & Partial<Pick<RunSetup, 'start' | 'races' | 'teamCount'>>): RunFacts {
  return {
    setup: { teamCount: DEFAULT_TEAMS, races: RACES_PER_LEAGUE, start: 'draft', ...setup },
    leagues: [emptyLeague()],
  };
}

/** League 0 keeps the run seed (so it IS today's Season); later leagues fan out. */
export function leagueSeed(run: RunFacts, index: number): number {
  return index === 0 ? run.setup.seed : deriveSeed(run.setup.seed, 'run', 'league', index);
}

export function leagueContext(index: number, races: number): LeagueContext {
  const rung = LEAGUE_LADDER[Math.min(index, LEAGUE_LADDER.length - 1)];
  return { index, name: rung.name, fieldShift: 0, nemesisShift: 0, bossRound: races - 1 };
}

// Derived setups are pure in (run, index); memoised per run object since the
// screens ask many times a render and a carry walks the leagues below it.
const derived = new WeakMap<RunFacts, Map<number, SeasonFacts>>();

/** League `index` of the run as a full Season (setup derived). */
export function seasonFactsFor(run: RunFacts, index: number): SeasonFacts {
  const league = run.leagues[index];
  if (!league) throw new Error(`run: no league ${index} (the run has ${run.leagues.length})`);
  let cache = derived.get(run);
  if (!cache) { cache = new Map(); derived.set(run, cache); }
  const hit = cache.get(index);
  if (hit) return hit;
  const setup = leagueSetup(run, index);
  const facts: SeasonFacts = { setup, ...league };
  cache.set(index, facts);
  return facts;
}

/** The SeasonSetup of league `index`: seed, calendar, the player, and the team
 * carried up from the league before. */
export function leagueSetup(run: RunFacts, index: number): SeasonSetup {
  const seed = leagueSeed(run, index);
  const { teamCount, races, ruleset, team } = run.setup;
  return {
    seed,
    teamCount,
    humans: [team],
    calendar: seasonCalendar(seed, races),
    ruleset,
    league: leagueContext(index, races),
    carry: index === 0 ? undefined : carriedTeam(seasonFactsFor(run, index - 1)),
  };
}

export function currentLeague(run: RunFacts): SeasonFacts {
  return seasonFactsFor(run, run.leagues.length - 1);
}

/** The run with its current league's facts replaced (the setup is derived, so it is dropped). */
export function withCurrentLeague(run: RunFacts, facts: SeasonFacts): RunFacts {
  const { setup: _setup, ...league } = facts;
  return { ...run, leagues: [...run.leagues.slice(0, -1), league] };
}

/** P1 in the Constructors' after every race. */
export function leagueWon(facts: SeasonFacts): boolean {
  if (seasonState(facts).phase !== 'finished') return false;
  const you = facts.setup.humans[0]?.teamId;
  return constructorStandings(facts)[0]?.teamId === you;
}

export function runState(run: RunFacts): RunState {
  const leagueIndex = run.leagues.length - 1;
  const league = currentLeague(run);
  const finished = seasonState(league).phase === 'finished';
  const won = finished && leagueWon(league);
  const phase: RunPhase = !finished ? 'league' : !won ? 'run-lost' : leagueIndex >= LEAGUES_PER_RUN - 1 ? 'run-won' : 'league-won';
  const ladder: LadderRung[] = LEAGUE_LADDER.map((r, i) => ({
    index: i, name: r.name, level: r.level,
    status: i < leagueIndex ? 'won' : i > leagueIndex ? 'ahead' : won ? 'won' : phase === 'run-lost' ? 'lost' : 'current',
  }));
  return { leagueIndex, phase, league, ladder, won: leagueIndex + (won ? 1 : 0) };
}

/** The player's team at the end of a league, ready to carry up: the drafted
 * drivers and car with the faces they were born with, the team, and every
 * card they hold (traits, gear in slots, the locker). */
export function carriedTeam(prev: SeasonFacts): CarriedTeam {
  const pool = poolFor(prev);
  const teamId = prev.setup.humans[0].teamId;
  const roster = draftState(pool, prev.draftPicks).rosters[teamId];
  if (!roster || roster.carId === null) throw new Error(`run: ${teamId} has no drafted team to carry`);
  const strip = <T extends { reservedFor?: string }>(x: T): T => { const { reservedFor: _r, ...rest } = x; return rest as T; };
  const drivers = roster.driverIds.map(id => {
    const d = pool.drivers.find(x => x.id === id);
    if (!d) throw new Error(`run: driver ${id} is not in the pool`);
    return { ...strip(d), avatarSeed: d.avatarSeed ?? pool.seed };
  });
  const car = pool.cars.find(c => c.id === roster.carId);
  const team = pool.teams.find(t => t.id === teamId);
  if (!car || !team) throw new Error(`run: ${teamId} has no car or team to carry`);
  return { teamId, drivers, car: { ...strip(car), avatarSeed: car.avatarSeed ?? pool.seed }, team, cards: carriedCards(teamCardState(prev, teamId)) };
}

/**
 * Up a rung: the next league, with the team carried in and the whole draft
 * settled (your picks are your own drivers and car; the CPUs draft the fresh
 * field), so it opens in the Paddock. Pure; throws unless the league is won
 * and there is a league above.
 */
export function promote(run: RunFacts): RunFacts {
  const state = runState(run);
  if (state.phase !== 'league-won') throw new Error(`run: cannot promote in phase ${state.phase}`);
  const next: RunFacts = { ...run, leagues: [...run.leagues, emptyLeague()] };
  const facts = currentLeague(next);
  const picks = quickDraft(poolFor(facts));
  return withCurrentLeague(next, { ...facts, draftPicks: picks });
}

/** Every league re-settled from its facts (lineups and cards as recorded),
 * for the replay check: each digest list must equal the recorded one. */
export function replayRun(run: RunFacts): RaceDigest[][] {
  return run.leagues.map((_, i) => {
    let facts: SeasonFacts = { ...seasonFactsFor(run, i), results: [] };
    const recorded = run.leagues[i].results.length;
    for (let r = 0; r < recorded; r++) facts = settleRound(facts);
    return facts.results;
  });
}

// ---------------------------------------------------------------------------
// Save / restore: facts only, one slot

export const RUN_KEY = 'parabolica.run.v1';
export const RUN_SCHEMA_VERSION = 1;

interface RunEnvelope { schemaVersion: number; savedAt: number; data: RunFacts }

function defaultStore(): SeasonStore | null {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
}

export function saveRun(run: RunFacts, store: SeasonStore | null = defaultStore(), now: number = Date.now()): boolean {
  if (!store) return false;
  try {
    const envelope: RunEnvelope = { schemaVersion: RUN_SCHEMA_VERSION, savedAt: now, data: run };
    store.setItem(RUN_KEY, JSON.stringify(envelope));
    return true;
  } catch { return false; }
}

const isLeague = (l: unknown): l is LeagueFacts =>
  !!l && typeof l === 'object' && ['draftPicks', 'lineups', 'cardFacts', 'results'].every(k => Array.isArray((l as Record<string, unknown>)[k]));

export function loadRun(store: SeasonStore | null = defaultStore()): RunFacts | null {
  if (!store) return null;
  try {
    const raw = store.getItem(RUN_KEY);
    if (!raw) return null;
    const envelope = JSON.parse(raw) as RunEnvelope;
    if (envelope?.schemaVersion !== RUN_SCHEMA_VERSION) return null;
    const r = envelope.data;
    if (!r?.setup || typeof r.setup.seed !== 'number' || !r.setup.team || !Array.isArray(r.leagues)) return null;
    if (r.leagues.length < 1 || r.leagues.length > LEAGUES_PER_RUN || !r.leagues.every(isLeague)) return null;
    return r;
  } catch { return null; }
}

export function clearRun(store: SeasonStore | null = defaultStore()): void {
  try { store?.removeItem(RUN_KEY); } catch { /* nothing to do */ }
}
