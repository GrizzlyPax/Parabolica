// The run (#696; docs/V08_PLAN.md, docs/STORY_BIBLE.md → The run): three
// STEPS, Locals → State → Nationals. Win the table at a step and you take
// its TITLE (Ace Toledo → Ace Ohio → Ace America) and go up with your whole
// garage; anything else ends the run. Each step is a Season (`SeasonFacts`).
//
// Facts, not state. A run is `RunFacts`: its setup (the seed, your state and
// your garage), the titles won, and, per step entered, the step's own facts
// (lineups, card facts, results; `draftPicks` stay the roster facts, settled
// by the CPU draft behind the scenes) with NO setup of its own. Each step's
// SeasonSetup is derived here: its seed, its calendar, its field and your
// team carried up. So a saved run is small, and a run replayed from its
// facts is the run.
//
// The start (#693, Pax Oct 14): rookies are DEALT, near-identical (no pick,
// no archetypes, no car setups): your pair, car and team stats roll on the
// run seed's own stream (`dealRookies`) and become step 0's carried team.
//
// Geography is the difficulty: at Locals you race your town's garages at
// your own level; at State every town's Ace, lifted by the state's size
// (STATE_FIELD: 5 / 10 / 20 towns → +20 / +27 / +34 grade points). Nationals
// is a slot (#694 designs it; not built): winning State wins the run today.
//
// Parked behind seams, not deleted: the nemesis (NEMESIS_IN_RUN), boss rounds
// (`LeagueContext.bossRound`), stakes (`RunSetup.stake`). Packs stay as they
// are until stamps (#704) replace them (`RunSetup.kit`).

import { deriveSeed } from '../engine/rng';
import type { Ruleset } from '../rules/ruleset';
import type { RaceDigest } from '../league/types';
import { DEFAULT_TEAMS, type CarriedTeam, type LeagueContext, type TeamIdentity } from '../season/genesis';
import { draftState, quickDraft } from '../season/draft';
import { carriedStamps, teamStamps, titleStamp, TITLE_STAMP_STATS } from '../season/stamps';
import { DRIVER_STATS, type DriverStatKey } from '../cards';
import { carriedEffects } from '../season/effects';
import { dealRookies } from '../season/rookies';
import { inkFor } from '../icons/ink';
import { fieldSize, placeById, US_PLACES, type FieldSize, type UsPlace } from '../data/states';
import { isOut, type SeasonFormat, type LapCut } from '../season/format';
import type { Step } from '../look/step';
import { constructorStandings, poolFor, seasonState, settleRound, type SeasonFacts, type SeasonHuman, type SeasonSetup, type SeasonStore } from '../season/season';
import { seasonCalendar } from '../season/setup';

/** The player's team id in a run: their own garage, never a pool slot. */
export const PLAYER_TEAM_ID = 'you';

/** One step of the run. */
export interface StepPlan {
  id: Step;
  name: string;
  /** Races at this step; 0 = not built. */
  races: number;
  /** Rival garages at this step: a number, 'state' for the state's field size, 'nation' for every other state's Ace. */
  field: number | 'state' | 'nation';
}

/** Locals 5 races, State 6, Nationals 4 (Pax, #693; Pax's answers Oct 15, #694). */
export const STEP_PLAN: readonly StepPlan[] = [
  { id: 'locals', name: 'Locals', races: 5, field: 5 },
  { id: 'state', name: 'State', races: 6, field: 'state' },
  { id: 'nationals', name: 'Nationals', races: 4, field: 'nation' },
];

/** The Hundred's cuts (#694, Pax Oct 15): when the leader completes laps 1 / 2 / 3, 30 / 20 / 10 states go on. Data. */
export const HUNDRED_CUTS: readonly LapCut[] = [{ afterLap: 1, keep: 30 }, { afterLap: 2, keep: 20 }, { afterLap: 3, keep: 10 }];
/** Nationals (#694): race 1 the Hundred (100 cars, the cuts inside it, a car that doesn't finish is out), then a three-race Final from zero. */
export const NATIONALS_FORMAT: SeasonFormat = {
  hundred: { race: 0, lapCuts: [...HUNDRED_CUTS] },
  finalFrom: 1,
  stages: ['The Hundred', 'The Final', 'The Final', 'The Final'],
};
/** Rival Aces at Nationals: grade points on every stat (Steward's fit, #694). */
export const NATIONALS_SHIFT = 40;
export const STEPS_PER_RUN = STEP_PLAN.length;

/** Rival strength at State by the state's size (Steward's fit, #693): grade points on every rival stat at race build. */
export const STATE_FIELD: Record<FieldSize, number> = { 5: 20, 10: 27, 20: 34 };
/** Locals: your town's garages, rookies like you. */
export const LOCALS_SHIFT = 0;

/** The nemesis is parked for the slice (Pax, Oct 10); it returns with multi-season play. */
export const NEMESIS_IN_RUN = false;

/** How kit arrives: stamps in Parcels (#704). The seam stays for another kit. */
export type KitSystem = 'stamps';

export interface RunSetup {
  seed: number;
  /** Your state: a place id ('oh'). The town is drawn from its pool (`townOf`). */
  stateId: string;
  /** Your garage: the identity you wear all run (teamId is PLAYER_TEAM_ID). */
  garage: SeasonHuman;
  /** The flavour page's renames (#697): your two dealt drivers and the chassis. Labels only. */
  names?: StartNames;
  ruleset?: Ruleset;
  kit: KitSystem;
  /** Difficulty setting (#596); plain Paddock until stakes land. */
  stake?: string;
}

/** A title won, as a fact: "Ace Toledo" at Locals, with the title stamps each driver picked (#704). */
export interface TitleFact {
  step: Step;
  name: string;
  stamps?: TitleStamp[];
}
/** A driver's title stamps: the stats picked (TITLE_STAMP_STATS of them), each +TITLE_STAMP_LEVELS. */
export interface TitleStamp { driverId: number; stats: DriverStatKey[] }
/** The picks a promotion takes: per driver id, the stats. */
export type TitlePicks = Record<number, DriverStatKey[]>;

/** A step's facts: a Season without its setup, which the run derives. */
export type LeagueFacts = Omit<SeasonFacts, 'setup'>;

export interface RunFacts {
  setup: RunSetup;
  /** Titles won so far, bottom first. */
  titles: TitleFact[];
  /** One per step entered, bottom first; the last is the one in play. */
  leagues: LeagueFacts[];
}

export type RunPhase =
  /** The current step is being raced. */
  | 'league'
  /** The step is over and won; the next one waits on `promote`. */
  | 'league-won'
  /** The last built step is won: the run is won. */
  | 'run-won'
  /** A step was lost: the run is over. */
  | 'run-lost';

export interface LadderRung {
  index: number;
  step: Step;
  name: string;
  /** The title this rung is for. */
  title: string;
  status: 'won' | 'lost' | 'current' | 'ahead';
  /** Not built yet (Nationals, #694). */
  later?: boolean;
}

export interface RunState {
  leagueIndex: number;
  phase: RunPhase;
  /** The step in play (or the one just finished), as a Season. */
  league: SeasonFacts;
  ladder: LadderRung[];
  /** Steps won so far. */
  won: number;
}

export function emptyLeague(): LeagueFacts {
  return { draftPicks: [], lineups: [], cardFacts: [], effectFacts: [], results: [] };
}

/** A run from its start: your state and garage; step 0 drafted behind the scenes, open in the Paddock. */
export function newRun(setup: Omit<RunSetup, 'kit' | 'garage'> & { kit?: KitSystem; garage: Omit<SeasonHuman, 'teamId'> & { teamId?: string } }): RunFacts {
  if (!placeById(setup.stateId)) throw new Error(`run: no state '${setup.stateId}'`);
  const garage: SeasonHuman = { ...setup.garage, teamId: PLAYER_TEAM_ID, ink: setup.garage.ink ?? inkFor(setup.garage.color), deckTeamId: undefined };
  const run: RunFacts = { setup: { kit: 'stamps', ...setup, garage }, titles: [], leagues: [emptyLeague()] };
  return withCurrentLeague(run, drafted(currentLeague(run)));
}

/** The CPU draft settles the field: your reserved pair and car, the rivals' fresh rolls. */
function drafted(facts: SeasonFacts): SeasonFacts {
  return { ...facts, draftPicks: quickDraft(poolFor(facts)) };
}

// ---------------------------------------------------------------------------
// Geography

export function stateOf(run: RunFacts): UsPlace {
  const p = placeById(run.setup.stateId);
  if (!p) throw new Error(`run: no state '${run.setup.stateId}'`);
  return p;
}

/** Your town, drawn from the state's pool on the run seed. */
export function townOf(run: RunFacts): string {
  const s = stateOf(run);
  return s.cities[Math.abs(Math.floor(run.setup.seed)) % s.cities.length];
}

/** The other towns of the state, for the State step's rivals, in pool order starting after yours. */
export function rivalTowns(run: RunFacts): string[] {
  const s = stateOf(run);
  const i = s.cities.indexOf(townOf(run));
  return [...s.cities.slice(i + 1), ...s.cities.slice(0, i)];
}

/** The title a step is for: Ace <town> · Ace <state> · Ace America. */
export function titleFor(run: RunFacts, step: Step): string {
  return titleName(step, townOf(run), stateOf(run).name);
}

/** The same, from the place names alone (a league's locale carries them, so a screen needs no run). */
export function titleName(step: Step, town: string, stateName: string): string {
  if (step === 'locals') return `Ace ${town}`;
  if (step === 'state') return `Ace ${stateName}`;
  if (step === 'nationals') return 'Ace America';
  return step === 'globals' ? 'Ace Earth' : 'Ace Universe';
}

/** The other states at Nationals (#694): every state but yours, each with a town and, when it has a look, its colour. The pool order is the states'. */
export function rivalStates(run: RunFacts): { stateId: string; town: string; color?: string }[] {
  return US_PLACES.filter(p => p.kind === 'state' && p.id !== run.setup.stateId)
    .map(p => ({ stateId: p.id, town: p.cities[Math.abs(Math.floor(run.setup.seed)) % p.cities.length], ...(p.look ? { color: p.look.primary } : {}) }));
}

/** Rival garages at a step (not counting you). */
export function fieldAt(run: RunFacts, index: number): number {
  const plan = STEP_PLAN[Math.min(index, STEP_PLAN.length - 1)];
  return plan.field === 'state' ? fieldSize(stateOf(run)) : plan.field === 'nation' ? rivalStates(run).length : plan.field;
}

/** Grade points on every rival stat at race build, by step. */
export function fieldShiftAt(run: RunFacts, index: number): number {
  const plan = STEP_PLAN[Math.min(index, STEP_PLAN.length - 1)];
  return plan.id === 'locals' ? LOCALS_SHIFT : plan.id === 'nationals' ? NATIONALS_SHIFT : STATE_FIELD[fieldSize(stateOf(run))];
}

// ---------------------------------------------------------------------------
// Derived setups

/** Step 0 keeps the run seed; later steps fan out. */
export function leagueSeed(run: RunFacts, index: number): number {
  return index === 0 ? run.setup.seed : deriveSeed(run.setup.seed, 'run', 'league', index);
}

export function leagueContext(run: RunFacts, index: number): LeagueContext {
  const plan = STEP_PLAN[Math.min(index, STEP_PLAN.length - 1)];
  const town = townOf(run);
  const rivals = plan.id === 'nationals' ? rivalStates(run) : undefined;
  return {
    index, step: plan.id, name: plan.name,
    fieldShift: fieldShiftAt(run, index), nemesisShift: 0, bossRound: Math.max(0, plan.races - 1),
    locale: { stateId: stateOf(run).id, town, rivalTowns: plan.id === 'locals' ? [] : rivals ? rivals.map(r => r.town) : rivalTowns(run), ...(rivals ? { rivals } : {}) },
    ...(plan.id === 'nationals' ? { format: NATIONALS_FORMAT } : {}),
  };
}

// Derived setups are pure in (run, index); memoised per run object since the
// screens ask many times a render and a carry walks the steps below it.
const derived = new WeakMap<RunFacts, Map<number, SeasonFacts>>();

/** Step `index` of the run as a full Season (setup derived). */
export function seasonFactsFor(run: RunFacts, index: number): SeasonFacts {
  const league = run.leagues[index];
  if (!league) throw new Error(`run: no step ${index} (the run has ${run.leagues.length})`);
  let cache = derived.get(run);
  if (!cache) { cache = new Map(); derived.set(run, cache); }
  const hit = cache.get(index);
  if (hit) return hit;
  const setup = leagueSetup(run, index);
  const facts: SeasonFacts = { setup, ...league };
  cache.set(index, facts);
  return facts;
}

/** The SeasonSetup of step `index`: seed, calendar, your garage, the field, and your team carried in. */
export function leagueSetup(run: RunFacts, index: number): SeasonSetup {
  const plan = STEP_PLAN[Math.min(index, STEP_PLAN.length - 1)];
  if (!plan.races) throw new Error(`run: ${plan.name} is not built yet`);
  const seed = leagueSeed(run, index);
  return {
    seed,
    teamCount: fieldAt(run, index) + 1,
    humans: [run.setup.garage],
    calendar: seasonCalendar(seed, plan.races),
    ruleset: run.setup.ruleset,
    league: leagueContext(run, index),
    // Step 0 carries the dealt rookies in; each step above, the garage that won the one below, wearing its title stamps.
    carry: index === 0 ? startingTeam(run) : withTitleStamps(carriedTeam(seasonFactsFor(run, index - 1)), run),
  };
}

/** Names the player gives on the start's flavour page (#697); blank = the dealt name. */
export interface StartNames {
  drivers?: [string, string];
  car?: string;
}

/** A dealt driver under a new full name: the first word is the first name, the rest the last. */
export function renamedDriver<D extends { firstName: string; lastName: string; fullName: string }>(d: D, full?: string): D {
  const name = full?.trim().replace(/\s+/g, ' ');
  if (!name) return d;
  const cut = name.indexOf(' ');
  return { ...d, fullName: name, firstName: cut < 0 ? name : name.slice(0, cut), lastName: cut < 0 ? '' : name.slice(cut + 1) };
}

/** Your garage at the start: the dealt pair, car and team stats, your own look, no cards yet. */
export function startingTeam(run: RunFacts): CarriedTeam {
  const { seed, garage, names } = run.setup;
  const dealt = dealRookies(seed);
  const car = names?.car?.trim() ? { ...dealt.car, name: names.car.trim() } : dealt.car;
  return {
    teamId: garage.teamId,
    drivers: [renamedDriver(dealt.drivers[0], names?.drivers?.[0]), renamedDriver(dealt.drivers[1], names?.drivers?.[1])],
    car,
    team: { id: garage.teamId, name: garage.name, color: garage.color, ink: garage.ink ?? inkFor(garage.color), emoji: '', iconId: garage.iconId, teamStats: dealt.teamStats, traits: [] },
    cards: { drivers: {}, car: [], titles: {} },
  };
}

export function currentLeague(run: RunFacts): SeasonFacts {
  return seasonFactsFor(run, run.leagues.length - 1);
}

/** The run with its current step's facts replaced (the setup is derived, so it is dropped). */
export function withCurrentLeague(run: RunFacts, facts: SeasonFacts): RunFacts {
  const { setup: _setup, ...league } = facts;
  return { ...run, leagues: [...run.leagues.slice(0, -1), league] };
}

/** P1 in the table after every race: the title (at Nationals, the Final's table, and only if you are still in). */
export function leagueWon(facts: SeasonFacts): boolean {
  if (seasonState(facts).phase !== 'finished') return false;
  const you = facts.setup.humans[0]?.teamId;
  if (!you || isOut(facts, you)) return false;
  return constructorStandings(facts)[0]?.teamId === you;
}

/** Out of the step before its end (a Nationals cut, #694): the run is over. */
export function runOut(facts: SeasonFacts): boolean {
  const you = facts.setup.humans[0]?.teamId;
  return !!you && isOut(facts, you);
}

/** The last step that is built: winning it wins the run. */
export const LAST_BUILT_STEP = STEP_PLAN.reduce((last, s, i) => (s.races ? i : last), 0);

export function runState(run: RunFacts): RunState {
  const leagueIndex = run.leagues.length - 1;
  const league = currentLeague(run);
  const finished = seasonState(league).phase === 'finished';
  const won = finished && leagueWon(league);
  const phase: RunPhase = runOut(league) ? 'run-lost' : !finished ? 'league' : !won ? 'run-lost' : leagueIndex >= LAST_BUILT_STEP ? 'run-won' : 'league-won';
  const ladder: LadderRung[] = STEP_PLAN.map((s, i) => ({
    index: i, step: s.id, name: s.name, title: titleFor(run, s.id), later: !s.races || undefined,
    status: i < leagueIndex ? 'won' : i > leagueIndex ? 'ahead' : won ? 'won' : phase === 'run-lost' ? 'lost' : 'current',
  }));
  return { leagueIndex, phase, league, ladder, won: leagueIndex + (won ? 1 : 0) };
}

/** Titles as facts: those recorded (`promote`), plus the one just won and not yet claimed. */
export function titlesOf(run: RunFacts, picks?: TitlePicks): TitleFact[] {
  const state = runState(run);
  const held = [...run.titles];
  const step = STEP_PLAN[state.leagueIndex].id;
  if ((state.phase === 'league-won' || state.phase === 'run-won') && !held.some(t => t.step === step)) {
    const stamps = titleStampsFor(run, step, picks);
    held.push({ step, name: titleFor(run, step), ...(stamps.length ? { stamps } : {}) });
  }
  return held;
}

/** The title stamps a step grants, from the picks (or the default: the first stats in table order). Validated: every driver, the step's count, distinct driver stats. */
export function titleStampsFor(run: RunFacts, step: Step, picks?: TitlePicks): TitleStamp[] {
  const n = TITLE_STAMP_STATS[step] ?? 0;
  if (!n) return [];
  const league = currentLeague(run);
  const roster = draftState(poolFor(league), league.draftPicks).rosters[league.setup.humans[0].teamId];
  return roster.driverIds.map(driverId => {
    const stats = picks?.[driverId] ?? (DRIVER_STATS.slice(0, n) as DriverStatKey[]);
    if (stats.length !== n || new Set(stats).size !== n || stats.some(s => !DRIVER_STATS.includes(s))) throw new Error(`run: driver ${driverId} picks ${n} different driver stat${n === 1 ? '' : 's'} for the ${step} title`);
    return { driverId, stats };
  });
}

/** The carry with every title stamp won so far on each driver's ribbon. */
function withTitleStamps(carry: CarriedTeam, run: RunFacts): CarriedTeam {
  const titles: Record<number, string[]> = {};
  for (const t of run.titles) for (const s of t.stamps ?? []) titles[s.driverId] = [...(titles[s.driverId] ?? []), ...s.stats.map(st => titleStamp(t.step, st).id)];
  return { ...carry, cards: { ...carry.cards, titles } };
}

/** The garage at the end of a step, ready to carry up: the drivers and car
 * with the faces they were born with, the team, and every card they hold. */
export function carriedTeam(prev: SeasonFacts): CarriedTeam {
  const pool = poolFor(prev);
  const teamId = prev.setup.humans[0].teamId;
  const roster = draftState(pool, prev.draftPicks).rosters[teamId];
  if (!roster || roster.carId === null) throw new Error(`run: ${teamId} has no team to carry`);
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
    // The stamps as they stand after the last race (title stamps are added from the run's record).
    cards: carriedStamps(teamStamps(prev, teamId, prev.setup.calendar.length)),
    // The nemesis is parked (NEMESIS_IN_RUN): the runner-up stays home.
    nemesis: NEMESIS_IN_RUN ? runnerUp(prev) : undefined,
    effects: carriedEffects(prev, teamId),
  };
}

/** The step's runner-up (P2 in the table), as a look only: the nemesis seam. Undefined before the step is over. */
export function runnerUp(prev: SeasonFacts): TeamIdentity | undefined {
  if (seasonState(prev).phase !== 'finished') return undefined;
  const second = constructorStandings(prev)[1];
  const t = second && poolFor(prev).teams.find(x => x.id === second.teamId);
  if (!t) return undefined;
  const { name, color, ink, emoji, iconId, deckTeamId } = t;
  return { name, color, ink, emoji, iconId, deckTeamId };
}

/**
 * Up a step: the title goes on the record, the next step opens with your
 * garage carried in and its field drafted behind the scenes. Pure; throws
 * unless the step is won and the step above is built.
 */
export function promote(run: RunFacts, picks?: TitlePicks): RunFacts {
  const state = runState(run);
  if (state.phase !== 'league-won') throw new Error(`run: cannot promote in phase ${state.phase}`);
  const titles = titlesOf(run, picks);
  const next: RunFacts = { ...run, titles, leagues: [...run.leagues, emptyLeague()] };
  return withCurrentLeague(next, drafted(currentLeague(next)));
}

/** The run won: the last title on the record (the screens call it from the finale). */
export function claimTitles(run: RunFacts, picks?: TitlePicks): RunFacts {
  return { ...run, titles: titlesOf(run, picks) };
}

/** Every step re-settled from its facts (lineups and cards as recorded),
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
/** 3 since Ace America's run (#696): a v0.7 run (schemas 1–2) is archived, not loaded. */
export const RUN_SCHEMA_VERSION = 5;

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
    if (!r?.setup || typeof r.setup.seed !== 'number' || !r.setup.garage || !placeById(r.setup.stateId ?? '') || !Array.isArray(r.leagues)) return null;
    if (r.leagues.length < 1 || r.leagues.length > STEPS_PER_RUN || !r.leagues.every(isLeague)) return null;
    return { ...r, titles: Array.isArray(r.titles) ? r.titles : [], leagues: r.leagues.map(l => ({ ...l, effectFacts: l.effectFacts ?? [] })) };
  } catch { return null; }
}

export function clearRun(store: SeasonStore | null = defaultStore()): void {
  try { store?.removeItem(RUN_KEY); } catch { /* nothing to do */ }
}

export { DEFAULT_TEAMS };
