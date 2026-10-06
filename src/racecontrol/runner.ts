// Race Control runner: the ONE way the lab builds a race.
//
// Parity rule: a lab race is a league race. We build a one-race league with
// `createLeague` and prepare the engine with `prepareScheduledRace` — the same
// two calls the live broadcast and the wall-clock settle use — so whatever the
// lab measures is what the game plays. Nothing here touches Math.random: a
// batch is fully described by (batchSeed, race index, cards), and the same
// spec gives the same race in the browser worker, in `npm run calibrate`, and
// in a vitest.
//
// Seed streams (all from deriveSeed(batchSeed, 'lab', i)):
//   universe seed  → createLeague(seed, …)   (roster, cars, genesis tags)
//   teams          → shuffle(TEAMS).slice(0, 11)
//   track          → CURRENT_TRACKS pick   (or i % n when every track is wanted)
// The race itself then runs on league.schedule[0].seed = deriveSeed(seed,'race',0),
// weather on deriveSeed(seed,'weather',0) — exactly as a league does.
import RaceEngine from '../RaceEngine';
import type { Driver, RaceEvent, RaceState, RosterDriver } from '../RaceEngine';
import { createLeague, rosterStateAt } from '../league/league';
import type { LeagueState } from '../league/types';
import { prepareScheduledRace } from '../league/settle';
import { CURRENT_TRACKS, type Track } from '../generators/tracks';
import { TEAMS } from '../data/teams';
import { resolveRuleset, type Ruleset } from '../rules/ruleset';
import { CARDS_BY_ID } from '../data/cards';
import { deriveSeed, mulberry32, shuffle } from '../engine/rng';
import { getTagById, type Tag } from '../data/tags';
import { weatherForRace, type WeatherState } from '../data/weather';
import { intrinsicTrackTags, type TrackTag } from '../data/trackTags';
import type { SimVariables } from '../simlab/types';

export const GRID_TEAMS = 11;

/** Everything needed to rebuild one lab race, anywhere. */
export interface LabRaceSpec {
  /** The batch this race belongs to and its index in it — the replication key. */
  batchSeed: number;
  index: number;
  /** Derived universe seed (the league seed). */
  seed: number;
  teamIds: string[];
  trackId: string;
  /** Card hand the race plays under (resolved with resolveRuleset). */
  cardIds: string[];
}

export type TrackMode = 'random' | 'all';

/** Spec for race `index` of a batch. Pure. */
export function labSpec(batchSeed: number, index: number, cardIds: string[], trackMode: TrackMode = 'random'): LabRaceSpec {
  const rng = mulberry32(deriveSeed(batchSeed, 'lab', index));
  const seed = Math.floor(rng() * 2 ** 31);
  const teamIds = shuffle(TEAMS, rng).slice(0, GRID_TEAMS).map(t => t.id);
  const pick = rng();
  const track = trackMode === 'all'
    ? CURRENT_TRACKS[index % CURRENT_TRACKS.length]
    : CURRENT_TRACKS[Math.floor(pick * CURRENT_TRACKS.length)];
  return { batchSeed, index, seed, teamIds, trackId: track.id, cardIds };
}

/** A tag forced onto one slot — the calibration lab's "solo carrier". */
export interface TagOverride {
  /** Roster index (0..21) of the carrier. Team tags also land on the teammate. */
  driverIndex: number;
  tagId: string;
}

export interface LabRaceResult {
  spec: LabRaceSpec;
  league: LeagueState;
  track: Track;
  roster: RosterDriver[];
  weather: WeatherState | null;
  trackTags: TrackTag[];
  drivers: Driver[];
  raceState: RaceState;
  events: RaceEvent[];
  gridOrder: number[];
}

export function labRuleset(cardIds: string[]): Ruleset {
  return resolveRuleset(cardIds, CARDS_BY_ID);
}

/**
 * Build and run one lab race. `variables` overrides the ruleset's simVars (the
 * Heretic). `override` forces one tag onto one carrier after genesis — the
 * rest of the grid is untouched, so with the `no-tags` card it is the only tag
 * in the race.
 */
export function runLabRace(spec: LabRaceSpec, options: { variables?: SimVariables; override?: TagOverride; engine?: RaceEngine } = {}): LabRaceResult {
  const ruleset = labRuleset(spec.cardIds);
  const track = CURRENT_TRACKS.find(t => t.id === spec.trackId);
  if (!track) throw new Error(`Unknown track ${spec.trackId}`);
  const league = createLeague(spec.seed, {
    name: 'lab', godId: 'lab', teamIds: spec.teamIds, trackIds: [track.id],
    raceIntervalMs: 1, createdAt: 0, ruleset,
  });
  const engine = options.engine ?? RaceEngine.createForWorker();
  prepareScheduledRace(engine, league, 0, track, options.variables ?? ruleset.simVars);
  engine.updateConfig({ maxStoredEvents: Number.MAX_SAFE_INTEGER });

  let roster = rosterStateAt(league, 0);
  if (options.override) {
    roster = applyOverride(roster, options.override);
    engine.loadGeneratedRoster(roster);
  }

  const { drivers, raceState, events } = engine.runHeadless(league.schedule[0].seed);
  return {
    spec, league, track, roster,
    weather: weatherForRace(league.leagueSeed, 0, ruleset.weather.weights),
    trackTags: intrinsicTrackTags(track.id),
    drivers, raceState, events,
    gridOrder: engine.getGridOrder(),
  };
}

function applyOverride(roster: RosterDriver[], override: TagOverride): RosterDriver[] {
  const tag = getTagById(override.tagId);
  if (!tag) throw new Error(`Unknown tag ${override.tagId}`);
  const carrier = roster[override.driverIndex];
  if (!carrier) throw new Error(`No roster slot ${override.driverIndex}`);
  const carries = (d: RosterDriver) => d.id === carrier.id || (tag.target === 'team' && d.kingdomId === carrier.kingdomId);
  return roster.map(d => carries(d) ? { ...d, tags: [...d.tags.filter(t => t.id !== tag.id), tag] } : d);
}

/** Who carries the tag in a race prepared with `override` (ids). */
export function carriersOf(result: LabRaceResult, override: TagOverride): number[] {
  const tag = getTagById(override.tagId) as Tag;
  const carrier = result.roster[override.driverIndex];
  return result.roster.filter(d => d.id === carrier.id || (tag.target === 'team' && d.kingdomId === carrier.kingdomId)).map(d => d.id);
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
