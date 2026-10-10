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
// The rookie start (#660): a run opens on an OFFER of six rookies (pick two,
// one free re-roll) and three car setups; the offer, the re-roll and the pick
// are facts on the run (`RunFacts.rookies`), each roll on its own stream. The
// picked pair, a 2★ car wearing the setup and the player's own look become
// league 0's carried team, so every league is built the same way; the CPU
// draft then fills the rookie field (`draftPicks` stay the roster facts).
// Hooks left on purpose: `LeagueContext` (the boss round #593), stakes (#596).

import { deriveSeed } from '../engine/rng';
import type { Ruleset } from '../rules/ruleset';
import type { RaceDigest } from '../league/types';
import { DEFAULT_TEAMS, type CarriedTeam, type LeagueContext, type TeamIdentity } from '../season/genesis';
import { draftState, quickDraft } from '../season/draft';
import { carriedCards, teamCardState } from '../season/pack';
import { carriedEffects } from '../season/effects';
import { driverXp, rankUpsOf } from '../season/xp';
import { OFFER_PICKS, isCarSetup, rookieOffer, rookiePlayerCar, rookiePlayerTeamStats, type CarSetupId } from '../season/rookies';
import { inkFor } from '../icons/ink';
import type { PoolDriver } from '../season/genesis';
import { constructorStandings, poolFor, seasonState, settleRound, type SeasonFacts, type SeasonHuman, type SeasonSetup, type SeasonStore } from '../season/season';
import { seasonCalendar } from '../season/setup';

export const LEAGUES_PER_RUN = 4;
export const RACES_PER_LEAGUE = 6;

/**
 * The ladder, bottom to top, with the rival levels (#626; Steward's re-fit
 * for the rookie start, Pax Oct 10, the Rookie Pick Report): `field` is the
 * grade points added to every stat of every rival at race build; the nemesis
 * (the Juniors' own, then last league's runner-up promoted with you) gets
 * `nemesis` on top. One table, so Steward can re-fit it (#629). Runs won
 * about 32%; race 1 is no longer a stomp.
 */
export const LEAGUE_LADDER: readonly { name: string; level: number; field: number; nemesis: number }[] = [
  { name: 'Juniors', level: 1, field: 0, nemesis: 6 },
  { name: 'Regional', level: 2, field: 7, nemesis: 12 },
  { name: 'National', level: 3, field: 22, nemesis: 14 },
  { name: 'Top flight', level: 4, field: 37, nemesis: 12 },
];

/** How a run starts: the rookie pick (#660). The draft is retired. */
export type RunStart = 'rookie';

/** The player's team id in a run: their own team, never a pool slot. */
export const PLAYER_TEAM_ID = 'you';

/** The rookie pick (#660), as a fact. */
export interface RookiePick {
  /** Two of the offer's ids. */
  driverIds: [number, number];
  setup: CarSetupId;
}

/** The rookie start's facts: which deal of the offer stands, and the pick once made. */
export interface RookieStart {
  /** The free re-roll was used: the offer is the second deal. */
  rerolled: boolean;
  pick?: RookiePick;
}

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
  /** The rookie start (#660): the offer's deal and the pick. */
  rookies: RookieStart;
  /** One per league entered, bottom first; the last is the one in play. */
  leagues: LeagueFacts[];
}

export type RunPhase =
  /** The run waits on the rookie pick (#660). */
  | 'start'
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
  return { draftPicks: [], lineups: [], cardFacts: [], effectFacts: [], rankUps: [], results: [] };
}

/** A run before its rookie pick. The player's team wears PLAYER_TEAM_ID whatever League Setup chose. */
export function newRun(setup: Omit<RunSetup, 'start' | 'races' | 'teamCount'> & Partial<Pick<RunSetup, 'start' | 'races' | 'teamCount'>>): RunFacts {
  return {
    setup: { teamCount: DEFAULT_TEAMS, races: RACES_PER_LEAGUE, start: 'rookie', ...setup, team: { ...setup.team, teamId: PLAYER_TEAM_ID } },
    rookies: { rerolled: false },
    leagues: [emptyLeague()],
  };
}

// ---------------------------------------------------------------------------
// The rookie start (#660)

/** The six rookies on offer: the first deal, or the re-roll once taken. */
export function rookieOfferFor(run: RunFacts): PoolDriver[] {
  return rookieOffer(run.setup.seed, run.rookies.rerolled ? 1 : 0);
}

/** Take the free re-roll. Pure; throws once it is spent or the pick is made. */
export function rerollRookies(run: RunFacts): RunFacts {
  if (run.rookies.pick) throw new Error('run: the rookies are picked');
  if (run.rookies.rerolled) throw new Error('run: the re-roll is spent');
  return { ...run, rookies: { ...run.rookies, rerolled: true } };
}

/** Why a rookie pick is illegal, or null. */
export function validateRookiePick(run: RunFacts, pick: RookiePick): string | null {
  if (run.rookies.pick) return 'the rookies are picked';
  const offer = new Set(rookieOfferFor(run).map(d => d.id));
  if (pick.driverIds.length !== OFFER_PICKS || pick.driverIds[0] === pick.driverIds[1]) return `pick ${OFFER_PICKS} different rookies`;
  if (!pick.driverIds.every(id => offer.has(id))) return 'both rookies must be from the offer';
  if (!isCarSetup(pick.setup)) return `no car setup '${String(pick.setup)}'`;
  return null;
}

/**
 * Pick two rookies and a setup: the team is made, and league 0 opens in the
 * Paddock with the CPU field drafted behind the scenes. Pure; throws on an
 * illegal pick.
 */
export function pickRookies(run: RunFacts, pick: RookiePick): RunFacts {
  const why = validateRookiePick(run, pick);
  if (why) throw new Error(`run: ${why}`);
  const picked: RunFacts = { ...run, rookies: { ...run.rookies, pick } };
  const facts = seasonFactsFor(picked, 0);
  return withCurrentLeague(picked, { ...facts, draftPicks: quickDraft(poolFor(facts)) });
}

/** The player's team at the start: the two rookies, a 2★ car wearing the
 * setup, their own look with 2★ team stats, no cards yet. Undefined before the pick. */
export function rookieTeam(run: RunFacts): CarriedTeam | undefined {
  const pick = run.rookies.pick;
  if (!pick) return undefined;
  const { seed, team } = run.setup;
  const offer = rookieOfferFor(run);
  const drivers = pick.driverIds.map(id => {
    const d = offer.find(x => x.id === id);
    if (!d) throw new Error(`run: rookie ${id} is not on offer`);
    return d;
  });
  return {
    teamId: team.teamId,
    drivers,
    car: rookiePlayerCar(seed, `car-${team.teamId}`, pick.setup),
    team: { id: team.teamId, name: team.name, color: team.color, ink: team.ink ?? inkFor(team.color), emoji: '🏁', iconId: team.iconId, deckTeamId: team.deckTeamId, teamStats: rookiePlayerTeamStats(), traits: [] },
    cards: { drivers: {}, car: { traits: [], upgrade: [] }, team: { traits: [], facility: [] }, locker: [] },
  };
}

/** League 0 keeps the run seed (so it IS today's Season); later leagues fan out. */
export function leagueSeed(run: RunFacts, index: number): number {
  return index === 0 ? run.setup.seed : deriveSeed(run.setup.seed, 'run', 'league', index);
}

export function leagueContext(index: number, races: number): LeagueContext {
  const rung = LEAGUE_LADDER[Math.min(index, LEAGUE_LADDER.length - 1)];
  return { index, name: rung.name, fieldShift: rung.field, nemesisShift: rung.nemesis, bossRound: races - 1 };
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
    // League 0 carries the rookie pick in (#660); each league above, the team that won the one below.
    carry: index === 0 ? rookieTeam(run) : carriedTeam(seasonFactsFor(run, index - 1)),
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
  const started = !!run.rookies.pick;
  const finished = started && seasonState(league).phase === 'finished';
  const won = finished && leagueWon(league);
  const phase: RunPhase = !started ? 'start' : !finished ? 'league' : !won ? 'run-lost' : leagueIndex >= LEAGUES_PER_RUN - 1 ? 'run-won' : 'league-won';
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
  return {
    teamId, drivers, car: { ...strip(car), avatarSeed: car.avatarSeed ?? pool.seed }, team,
    // Cards as they stand after the last race, gear re-dated so its races left hold.
    cards: carriedCards(teamCardState(prev, teamId, prev.setup.calendar.length), prev.setup.calendar.length), nemesis: runnerUp(prev), effects: carriedEffects(prev, teamId),
    // XP and every rank-up pick ride up the run (#646).
    xp: Object.fromEntries(roster.driverIds.map(id => [id, driverXp(prev, id)])),
    rankUps: rankUpsOf(prev),
  };
}

/** The nemesis for the league above (#626): the league's runner-up (P2 in
 * the Constructors'), as a look only. Undefined before the league is over. */
export function runnerUp(prev: SeasonFacts): TeamIdentity | undefined {
  if (seasonState(prev).phase !== 'finished') return undefined;
  const second = constructorStandings(prev)[1];
  const t = second && poolFor(prev).teams.find(x => x.id === second.teamId);
  if (!t) return undefined;
  const { name, color, ink, emoji, iconId, deckTeamId } = t;
  return { name, color, ink, emoji, iconId, deckTeamId };
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
/** 2 since the rookie start (#660): a drafted run (schema 1) is archived, not loaded. */
export const RUN_SCHEMA_VERSION = 2;

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
    if (!r.rookies || typeof r.rookies.rerolled !== 'boolean') return null;
    return { ...r, leagues: r.leagues.map(l => ({ ...l, effectFacts: l.effectFacts ?? [], rankUps: l.rankUps ?? [] })) };
  } catch { return null; }
}

export function clearRun(store: SeasonStore | null = defaultStore()): void {
  try { store?.removeItem(RUN_KEY); } catch { /* nothing to do */ }
}
