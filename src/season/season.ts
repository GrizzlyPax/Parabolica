// The season loop (#315, docs/SEASON_MODE.md §4–5): a session-based Season
// Mode that walks [Paddock turns → race] for every round on the calendar.
//
// Facts, not state. A season is `SeasonFacts`: the setup, the draft picks,
// every lineup and every settled race digest. Everything else (phase, whose
// turn, standings, the race grid) is derived here, pure, so the same facts
// give the same season on any device, and save/restore is just the facts.
//
// Races go through the ONE race path: `leagueForRound` shapes a round as a
// LeagueState so `prepareScheduledRace` / `runScheduledRace` (league/settle)
// run it unchanged, and the live view replays the same race.
//
// Paddock turns run in reverse constructor standings (last place first; round
// 1 is the draft order reversed). CPU turns are no-ops in v0.5 (hook only), so
// the clock only ever stops on a human.

import { deriveSeed } from '../engine/rng';
import { getTrackById } from '../generators/tracks';
import { runScheduledRace } from '../league/settle';
import type { LeagueState, RaceDigest } from '../league/types';
import { createInitialSeasonState, updateSeasonWithRaceResult, getSeasonStandings, type DriverSeasonStats } from '../types/season';
import { driverPointsInRace } from '../fantasy/types';
import { Ruleset, defaultRuleset } from '../rules/ruleset';
import { CANON_VARIABLES, type SimVariables } from '../simlab/types';
import { version as engineVersion } from '../../package.json';
import { generateSeasonPool, seasonRoster, RACE_LINEUP, type SeasonPool, type SeasonCards, type TeamIdentityOverride, type Lineup, type CarriedTeam, type LeagueContext } from './genesis';
import { draftOrder, draftState, draftedRosters, type DraftPick } from './draft';
import { portraitFor, vehicleFor } from '../generators/avatars';
import type { IconId } from '../icons/registry';
import { packOpened, seasonCardsFor, gearInfos, type CardFact } from './pack';
import { roundEffects, type EffectFact } from './effects';
import { rankUpsTaken, rankUpCardsFor, type RankUpPick } from './xp';

/** 6 since the run (#597, v0.7): a league is 4 × 6; League Setup can still change it. */
export const DEFAULT_CALENDAR_LENGTH = 6;

export interface SeasonHuman {
  teamId: string;
  name: string;
  color: string;
  ink?: string;
  iconId?: string;
  /** The World Deck team this look came from, if any (#660: the pool deals it to no rival). */
  deckTeamId?: string;
}

/** Fixed at League Setup. */
export interface SeasonSetup {
  seed: number;
  teamCount: number;
  humans: SeasonHuman[];
  /** Track ids in running order; one round each. */
  calendar: string[];
  ruleset?: Ruleset;
  /** A run's league (#597): which rung, and the team carried up into it.
   * Derived by src/run/run.ts, never saved; absent = a stand-alone season. */
  league?: LeagueContext;
  carry?: CarriedTeam;
}

export interface SeasonLineup {
  round: number;
  teamId: string;
  driverIds: [number, number];
}

/** The whole season, as facts. */
export interface SeasonFacts {
  setup: SeasonSetup;
  draftPicks: DraftPick[];
  lineups: SeasonLineup[];
  /** Pack applications and gear moves (#316), one ordered log. */
  cardFacts: CardFact[];
  /** Timed effects dealt this league (#332), in order. Absent on older facts = none. */
  effectFacts?: EffectFact[];
  /** Rank-ups taken this league (#646), in order. Absent on older facts = none. */
  rankUps?: RankUpPick[];
  /** Race digests, one per settled round, in order. Event logs are not kept. */
  results: RaceDigest[];
}

/** `racing` is the UI's: between Go and the digest. seasonState never returns it. */
export type SeasonPhase = 'draft' | 'paddock' | 'ready-for-go' | 'racing' | 'finished';

export interface ConstructorStanding {
  teamId: string;
  points: number;
  wins: number;
  /** Points scored each settled round. */
  perRound: number[];
  rank: number;
}

export interface SeasonState {
  /** 0-based round in progress; equals the calendar length once finished. */
  round: number;
  phase: Exclude<SeasonPhase, 'racing'>;
  /** Every team, in Paddock turn order for this round (reverse standings). */
  paddockOrder: string[];
  /** The human team on the clock, or null (CPU-only turns are no-ops; ready or finished). */
  whoseTurn: string | null;
  standings: ConstructorStanding[];
  humans: string[];
}

export function newSeason(setup: SeasonSetup): SeasonFacts {
  return { setup, draftPicks: [], lineups: [], cardFacts: [], effectFacts: [], rankUps: [], results: [] };
}

export function poolFor(facts: SeasonFacts): SeasonPool {
  const { seed, teamCount, ruleset, carry, league } = facts.setup;
  // A run's field is rookies (#660); a stand-alone season rolls genesis.
  return generateSeasonPool(seed, teamCount, ruleset ?? defaultRuleset(), { carry, league, rookies: league !== undefined });
}

/** Each drafted driver's portrait and their team's car vehicle (#489), for
 * the race view. Derived from the seed (icons stream); nothing is saved. */
export function seasonAvatars(facts: SeasonFacts): Map<number, { portrait: IconId; vehicle: IconId }> {
  const pool = poolFor(facts);
  const out = new Map<number, { portrait: IconId; vehicle: IconId }>();
  const carId = (id: string | null) => pool.cars.find(c => c.id === id);
  for (const r of Object.values(draftState(pool, facts.draftPicks).rosters)) {
    const car = carId(r.carId);
    for (const id of r.driverIds) {
      // A driver carried up a run keeps the face they were born with (#597).
      const d = pool.drivers.find(x => x.id === id);
      out.set(id, { portrait: portraitFor(d?.avatarSeed ?? pool.seed, id), vehicle: vehicleFor(car?.avatarSeed ?? pool.seed, r.carId ?? '') });
    }
  }
  return out;
}

export function isHuman(facts: SeasonFacts, teamId: string): boolean {
  return facts.setup.humans.some(h => h.teamId === teamId);
}

export function identitiesFor(facts: SeasonFacts): Record<string, TeamIdentityOverride> {
  return Object.fromEntries(facts.setup.humans.map(h => [h.teamId, { name: h.name, color: h.color, ink: h.ink, iconId: h.iconId }]));
}

/** Rival levels (#626): grade points on every stat of each CPU team at race
 * build: the league's field shift, plus the nemesis's extra. The player's
 * team is never shifted. Empty outside a run. */
export function rivalShifts(facts: SeasonFacts): Record<string, number> {
  const ctx = facts.setup.league;
  if (!ctx || (!ctx.fieldShift && !ctx.nemesisShift)) return {};
  const humans = new Set(facts.setup.humans.map(h => h.teamId));
  const out: Record<string, number> = {};
  for (const t of poolFor(facts).teams) {
    if (humans.has(t.id)) continue;
    out[t.id] = ctx.fieldShift + (t.nemesis ? ctx.nemesisShift : 0);
  }
  return out;
}

/** Cards dealt during the season (packs #316, rank-ups #646), resolved for a
 * round. Genesis traits live on the pool and are added by seasonRoster. */
export function cardsForRound(facts: SeasonFacts, round: number): SeasonCards {
  const cards = seasonCardsFor(facts, round);
  const ranks = rankUpCardsFor(facts, round);
  for (const [id, extra] of Object.entries(ranks)) {
    const driverId = Number(id);
    cards.driver = { ...cards.driver, [driverId]: [...(cards.driver?.[driverId] ?? []), ...extra] };
  }
  return cards;
}

// ---------------------------------------------------------------------------
// Standings

/** Constructor table from the settled rounds: a team scores its drivers' F1
 * points (`driverPointsInRace`). Ties: more wins, then the team earlier in the
 * draft order ranks higher (so in the Paddock the one further back goes first). */
export function constructorStandings(facts: SeasonFacts): ConstructorStanding[] {
  const pool = poolFor(facts);
  const order = draftOrder(pool);
  const rosters = draftState(pool, facts.draftPicks).rosters;
  const lines = pool.teams.map(t => {
    const ids = rosters[t.id].driverIds;
    const perRound = facts.results.map(d => ids.reduce((s, id) => s + driverPointsInRace(d, id), 0));
    const wins = facts.results.filter(d => ids.includes(d.finishOrder[0])).length;
    return { teamId: t.id, points: perRound.reduce((a, b) => a + b, 0), wins, perRound, rank: 0 };
  });
  lines.sort((a, b) => b.points - a.points || b.wins - a.wins || order.indexOf(a.teamId) - order.indexOf(b.teamId));
  lines.forEach((l, i) => { l.rank = i + 1; });
  return lines;
}

/** Drivers' table, through the league's own season machinery. */
export function driverStandings(facts: SeasonFacts): DriverSeasonStats[] {
  const pool = poolFor(facts);
  let season = createInitialSeasonState(facts.setup.calendar.length, pool.drivers.map(d => d.id));
  for (const d of facts.results) {
    season = updateSeasonWithRaceResult(season, d.finishOrder, d.dnfDriverIds, d.trackName, d.trackEmoji, d.fastestLapDriverId);
  }
  return getSeasonStandings(season);
}

// ---------------------------------------------------------------------------
// Paddock

/** Reverse standings; round 0 (nothing settled) is the draft order reversed. */
export function paddockOrder(facts: SeasonFacts): string[] {
  return constructorStandings(facts).map(s => s.teamId).reverse();
}

/** The lineup a team races this round: its fact, else its last lineup, else
 * its first two drafted drivers. CPU teams and quiet humans both get this. */
export function lineupFor(facts: SeasonFacts, round: number, teamId: string): [number, number] {
  const own = facts.lineups.filter(l => l.teamId === teamId && l.round <= round).sort((a, b) => b.round - a.round);
  if (own.length) return own[0].driverIds;
  const roster = draftState(poolFor(facts), facts.draftPicks).rosters[teamId];
  if (!roster || roster.driverIds.length < RACE_LINEUP) throw new Error(`lineupFor: ${teamId} has not drafted ${RACE_LINEUP} drivers`);
  return [roster.driverIds[0], roster.driverIds[1]];
}

/** Has this team finished its Paddock turn for the round? Three decisions:
 * who races, the pack (when the team gets one) and any rank-up owed (#646),
 * in any order. */
export function turnDone(facts: SeasonFacts, round: number, teamId: string): boolean {
  return facts.lineups.some(l => l.round === round && l.teamId === teamId) && packOpened(facts, round, teamId) && rankUpsTaken(facts, round, teamId);
}

/** The CPU hook: no decisions in v0.5. The default lineup races. */
export function cpuTurn(_facts: SeasonFacts, _round: number, _teamId: string): { lineup?: [number, number] } {
  return {};
}

/** Why the lineup is illegal, or null. The team must be on the clock. */
export function validateLineup(facts: SeasonFacts, lineup: SeasonLineup): string | null {
  const state = seasonState(facts);
  if (state.phase !== 'paddock') return `not in the Paddock (${state.phase})`;
  if (lineup.round !== state.round) return `round ${lineup.round} is not the current round (${state.round})`;
  if (lineup.teamId !== state.whoseTurn) return `${lineup.teamId} is not on the clock (${state.whoseTurn} is)`;
  if (facts.lineups.some(l => l.round === lineup.round && l.teamId === lineup.teamId)) return 'the lineup is already set this round';
  const roster = draftState(poolFor(facts), facts.draftPicks).rosters[lineup.teamId];
  const [a, b] = lineup.driverIds;
  if (lineup.driverIds.length !== RACE_LINEUP || a === b) return `a lineup is ${RACE_LINEUP} different drivers`;
  if (!roster.driverIds.includes(a) || !roster.driverIds.includes(b)) return `both drivers must be on ${lineup.teamId}`;
  return null;
}

/** A human sets who races. Pure; throws on an illegal lineup. */
export function setLineup(facts: SeasonFacts, lineup: SeasonLineup): SeasonFacts {
  const why = validateLineup(facts, lineup);
  if (why) throw new Error(`season: ${why}`);
  return { ...facts, lineups: [...facts.lineups, lineup] };
}

// ---------------------------------------------------------------------------
// Derived state

export function seasonState(facts: SeasonFacts): SeasonState {
  const humans = facts.setup.humans.map(h => h.teamId);
  const pool = poolFor(facts);
  const standings = constructorStandings(facts);
  const order = [...standings].map(s => s.teamId).reverse();
  const round = facts.results.length;
  const base = { round, paddockOrder: order, standings, humans };
  if (!draftState(pool, facts.draftPicks).done) return { ...base, phase: 'draft', whoseTurn: null };
  if (round >= facts.setup.calendar.length) return { ...base, phase: 'finished', whoseTurn: null };
  // CPU turns are no-ops, so the clock skips to the first human still to act.
  const next = order.find(id => humans.includes(id) && !turnDone(facts, round, id)) ?? null;
  return { ...base, phase: next ? 'paddock' : 'ready-for-go', whoseTurn: next };
}

export function whoseTurn(facts: SeasonFacts): string | null {
  return seasonState(facts).whoseTurn;
}

// ---------------------------------------------------------------------------
// Race adapter

export function raceSeed(seed: number, round: number): number {
  return deriveSeed(seed, 'season', 'race', round);
}

/** Every team's lineup for a round, in team order. */
export function lineupsFor(facts: SeasonFacts, round: number): Lineup[] {
  const pool = poolFor(facts);
  return pool.teams.map(t => ({ teamId: t.id, driverIds: lineupFor(facts, round, t.id) }));
}

/**
 * The round as a LeagueState, so `prepareScheduledRace` and the live view run
 * it exactly as a league race: the roster is this round's grid with every
 * card baked in, the log is empty, and race `round` carries the season's seed
 * for it. Only `schedule[round]` and `roster` matter to the race path.
 */
export function leagueForRound(facts: SeasonFacts, round: number): LeagueState {
  const { setup } = facts;
  const pool = poolFor(facts);
  const rosters = draftedRosters(pool, facts.draftPicks);
  const effects = roundEffects(facts, round);
  // Gear mileage shows beside the timed effects (#627).
  for (const [id, infos] of Object.entries(gearInfos(facts, round))) effects.infos[Number(id)] = [...(effects.infos[Number(id)] ?? []), ...infos];
  const roster = seasonRoster(pool, rosters, lineupsFor(facts, round), { cards: cardsForRound(facts, round), identities: identitiesFor(facts), shifts: rivalShifts(facts), effects });
  return {
    engineVersion,
    leagueSeed: setup.seed,
    setup: {
      name: 'Season',
      godId: '',
      teamIds: [],
      trackIds: setup.calendar,
      raceIntervalMs: 0,
      createdAt: 0,
      ruleset: setup.ruleset,
    },
    schedule: setup.calendar.map((trackId, index) => ({ index, trackId, scheduledAt: 0, seed: raceSeed(setup.seed, index) })),
    interventionLog: [],
    settledThrough: round - 1,
    roster,
    season: createInitialSeasonState(setup.calendar.length, roster.map(d => d.id)),
    digests: facts.results,
  };
}

/** Skip to the result: run the round headless and append its digest (without
 * the event log; the live view replays the race). The season must be ready. */
export function settleRound(facts: SeasonFacts, simVars: SimVariables = facts.setup.ruleset?.simVars ?? CANON_VARIABLES): SeasonFacts {
  const state = seasonState(facts);
  if (state.phase !== 'ready-for-go') throw new Error(`season: cannot race in phase ${state.phase}`);
  const round = state.round;
  const track = getTrackById(facts.setup.calendar[round]);
  if (!track) throw new Error(`season: unknown track '${facts.setup.calendar[round]}' at round ${round}`);
  const { digest } = runScheduledRace(leagueForRound(facts, round), round, track, simVars);
  const { events: _events, ...kept } = digest;
  return { ...facts, results: [...facts.results, kept] };
}

// ---------------------------------------------------------------------------
// Save / restore: facts only, one slot (Pax, Oct 8)

export const SEASON_KEY = 'parabolica.season.v1';
/** 2 since #585 (two drivers, no bench): older 3-driver seasons are archived, not migrated. */
export const SEASON_SCHEMA_VERSION = 2;

export interface SeasonStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface SeasonEnvelope { schemaVersion: number; savedAt: number; data: SeasonFacts }

function defaultStore(): SeasonStore | null {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
}

export function saveSeason(facts: SeasonFacts, store: SeasonStore | null = defaultStore(), now: number = Date.now()): boolean {
  if (!store) return false;
  try {
    const envelope: SeasonEnvelope = { schemaVersion: SEASON_SCHEMA_VERSION, savedAt: now, data: facts };
    store.setItem(SEASON_KEY, JSON.stringify(envelope));
    return true;
  } catch { return false; }
}

export function loadSeason(store: SeasonStore | null = defaultStore()): SeasonFacts | null {
  if (!store) return null;
  try {
    const raw = store.getItem(SEASON_KEY);
    if (!raw) return null;
    const envelope = JSON.parse(raw) as SeasonEnvelope;
    if (envelope?.schemaVersion !== SEASON_SCHEMA_VERSION) return null;
    const f = envelope.data;
    if (!f?.setup || !Array.isArray(f.draftPicks) || !Array.isArray(f.lineups) || !Array.isArray(f.results)) return null;
    if (!Array.isArray(f.cardFacts)) return null;
    // Single-player since #588: a hotseat season (several humans) is archived, not loaded.
    if (f.setup.humans.length > 1) return null;
    return f;
  } catch { return null; }
}

export function clearSeason(store: SeasonStore | null = defaultStore()): void {
  try { store?.removeItem(SEASON_KEY); } catch { /* nothing to do */ }
}
