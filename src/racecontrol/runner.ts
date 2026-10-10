// Race Control runner: the ONE way the lab builds a race.
//
// Parity rule: a lab race is the race players race. Since #612 the lab
// builds its field the way Season Mode and Quick Race do: the Season pool
// (10 teams × 2 drivers, a rack of cars, CPU-drafted), `leagueForRound` and
// `prepareScheduledRace` — the same path the live broadcast and the settle
// use — so whatever the lab measures is what the game plays. Nothing here
// touches Math.random: a batch is fully described by (batchSeed, race index,
// cards), and the same spec gives the same race in the browser worker, in
// `npm run lab`, and in a vitest. (Before #612 the lab raced 11 World Deck
// teams through createLeague; those fingerprints are a different field.)
//
// Seed streams (all from deriveSeed(batchSeed, 'lab', i)):
//   universe seed  → oneRaceSeason(seed, …)   (the pool, the draft, genesis traits)
//   track          → CURRENT_TRACKS pick   (or i % n when every track is wanted)
// The race itself then runs on league.schedule[0].seed = deriveSeed(seed,'season','race',0),
// weather on deriveSeed(seed,'weather',0) — exactly as a Season round does.
import RaceEngine from '../RaceEngine';
import type { Driver, RaceEvent, RaceState, RosterDriver } from '../RaceEngine';
import type { LeagueState } from '../league/types';
import { prepareScheduledRace } from '../league/settle';
import { CURRENT_TRACKS, type Track } from '../generators/tracks';
import { resolveRuleset, type Ruleset } from '../rules/ruleset';
import { RULE_CARDS_BY_ID } from '../data/ruleCards';
import { deriveSeed, mulberry32 } from '../engine/rng';
import { weatherForRace, type WeatherState } from '../data/weather';
import { oneRaceSeason } from '../season/quickRace';
import { DEFAULT_TEAMS } from '../season/genesis';
import type { SimVariables } from '../simlab/types';

/** Teams on a lab grid: the Season pool's. */
export const GRID_TEAMS = DEFAULT_TEAMS;

/** Everything needed to rebuild one lab race, anywhere. */
export interface LabRaceSpec {
  /** The batch this race belongs to and its index in it — the replication key. */
  batchSeed: number;
  index: number;
  /** Derived universe seed (the Season seed). */
  seed: number;
  trackId: string;
  /** Card hand the race plays under (resolved with resolveRuleset). */
  cardIds: string[];
}

export type TrackMode = 'random' | 'all';

/** Spec for race `index` of a batch. Pure. */
export function labSpec(batchSeed: number, index: number, cardIds: string[], trackMode: TrackMode = 'random'): LabRaceSpec {
  const rng = mulberry32(deriveSeed(batchSeed, 'lab', index));
  const seed = Math.floor(rng() * 2 ** 31);
  const pick = rng();
  const track = trackMode === 'all'
    ? CURRENT_TRACKS[index % CURRENT_TRACKS.length]
    : CURRENT_TRACKS[Math.floor(pick * CURRENT_TRACKS.length)];
  return { batchSeed, index, seed, trackId: track.id, cardIds };
}

export interface LabRaceResult {
  spec: LabRaceSpec;
  league: LeagueState;
  track: Track;
  roster: RosterDriver[];
  weather: WeatherState | null;
  drivers: Driver[];
  raceState: RaceState;
  events: RaceEvent[];
  gridOrder: number[];
}

export function labRuleset(cardIds: string[]): Ruleset {
  return resolveRuleset(cardIds, RULE_CARDS_BY_ID);
}

/**
 * Build and run one lab race. `variables` overrides the ruleset's simVars (the
 * Heretic).
 */
export function runLabRace(spec: LabRaceSpec, options: { variables?: SimVariables; engine?: RaceEngine } = {}): LabRaceResult {
  const ruleset = labRuleset(spec.cardIds);
  const { league, track } = oneRaceSeason(spec.seed, spec.trackId, ruleset);
  const engine = options.engine ?? RaceEngine.createForWorker();
  prepareScheduledRace(engine, league, 0, track, options.variables ?? ruleset.simVars);
  engine.updateConfig({ maxStoredEvents: Number.MAX_SAFE_INTEGER });

  const roster = league.roster;
  const { drivers, raceState, events } = engine.runHeadless(league.schedule[0].seed);
  return {
    spec, league, track, roster,
    weather: weatherForRace(league.leagueSeed, 0, ruleset.weather.weights),
    drivers, raceState, events,
    gridOrder: engine.getGridOrder(),
  };
}

/** Classified finishing position (1-based; DNFs after the finishers in retirement order). */
export function finishPosition(result: LabRaceResult, driverId: number): number {
  const i = result.raceState.finishOrder.indexOf(driverId);
  if (i >= 0) return i + 1;
  const dnfs = result.drivers.filter(d => d.status === 'dnf').sort((a, b) => (b.dnfInfo?.tick ?? 0) - (a.dnfInfo?.tick ?? 0));
  return result.raceState.finishOrder.length + 1 + Math.max(0, dnfs.findIndex(d => d.id === driverId));
}

/**
 * A short, stable digest of a race for replication checks: the same spec must
 * give the same fingerprint in every runtime. Finish order + DNFs + ticks.
 */
export function raceFingerprint(result: LabRaceResult): string {
  const parts = [
    result.raceState.finishOrder.join(','),
    result.drivers.filter(d => d.status === 'dnf').map(d => `${d.id}${d.dnfInfo?.reason[0] ?? ''}`).join(','),
    result.raceState.totalTicks,
  ];
  return fnv(parts.join('|'));
}

export function batchFingerprint(fingerprints: string[]): string {
  return fnv(fingerprints.join('|'));
}

function fnv(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
