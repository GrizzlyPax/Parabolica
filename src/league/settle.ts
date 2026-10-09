// The settle loop: the one function that makes wall-clock time real.
// A race occupies a real-time broadcast window: it starts at its scheduled
// moment (or when its predecessor ends, whichever is later — broadcasts
// queue) and runs at LIVE_TICK_MS per tick. Races whose window has fully
// passed are settled into digests; a race whose window contains `now` is
// reported as live so the UI can join the broadcast mid-race. Determinism
// makes the live view and the headless settle the same race.
// Pure (input league is never mutated) and synchronous.
// See docs/COMMISSIONER_MODE_TECH.md (Problem 3).

import RaceEngine, { Driver, RosterDriver } from '../RaceEngine';
import { SimVariables, CANON_VARIABLES } from '../simlab/types';
import { getTrackById, Track } from '../generators/tracks';
import { updateSeasonWithRaceResult } from '../types/season';
import { LeagueState, RaceDigest, SettleResult, LiveRace } from './types';
import { rosterStateAt } from './league';
import { pickHighlights } from './highlights';
import { weatherForRace, isNeutralWeather } from '../data/weather';
import { applyFavours } from '../cards/apply';

export { HIGHLIGHTS_PER_RACE } from './highlights';

/** How many of the most recent digests keep their full event log. */
export const FULL_EVENT_RETENTION = 3;
/** Real-time ms per tick on a live broadcast (1x — broadcasts are not pausable). */
export const LIVE_TICK_MS = 100;

export interface SettleOptions {
  /** Wall-clock "now" (epoch ms). Injected for testability. */
  now: number;
  /** Physics overrides; defaults to canon. Decrees will hook in here. */
  simVars?: SimVariables;
  /** Progress callback — one call per settled race (drives backfill UI). */
  onRaceSettled?: (digest: RaceDigest, settledCount: number, dueCount: number) => void;
}

function findFastestLap(drivers: Driver[]): number | null {
  let fastestId: number | null = null;
  let fastest = Infinity;
  for (const d of drivers) {
    const best = d.lapTimes.length > 0 ? Math.min(...d.lapTimes) : Infinity;
    if (best < fastest) {
      fastest = best;
      fastestId = d.id;
    }
  }
  return fastestId;
}

/**
 * Track + weather favours (Tracks & Weather v2): the favoured stats gain +10 grade
 * for the race, field-wide, baked into the roster the engine loads. The ONE
 * place favours apply to a league race; anything that reloads a roster for a
 * race (the lab's tag override) must come through here too.
 */
export function favouredRoster(league: LeagueState, raceIndex: number, track: Track, roster: RosterDriver[]): RosterDriver[] {
  const weather = weatherForRace(league.leagueSeed, raceIndex, league.setup.ruleset?.weather.weights);
  return applyFavours(roster, [...track.favours, ...weather.favours]);
}

/**
 * Configure `engine` to run scheduled race `raceIndex` exactly as the settle
 * loop scores it: same sim variables, same seed, same roster, same lap
 * count/length, same track events. The headless settle AND the live
 * broadcast (App's handleWatchLive) both go through here — this is the
 * single source of truth for how a league race is built. Any divergence
 * (a forgotten updateConfig, different simVars) makes the watched race a
 * different race than the one that enters the standings.
 */
export function prepareScheduledRace(
  engine: RaceEngine,
  league: LeagueState,
  raceIndex: number,
  track: Track,
  simVars: SimVariables
): void {
  const race = league.schedule[raceIndex];
  engine.setSimVars(simVars);
  engine.setSeed(race.seed);
  // Weather is part of the fixed universe — same seed+index → same storm, so
  // the live broadcast and the headless settle see identical conditions (#149).
  engine.setWeather(weatherForRace(league.leagueSeed, raceIndex, league.setup.ruleset?.weather.weights));
  engine.loadGeneratedRoster(favouredRoster(league, raceIndex, track, rosterStateAt(league, raceIndex)));
  engine.updateConfig({
    // The sim runs off config, not trackInfo — these decide the outcome
    totalLaps: track.laps,
    lapLength: track.length,
    tyreWear: track.tyreWear,
  });
  engine.setTrackInfo({
    id: track.id,
    name: track.name,
    emoji: track.emoji,
    funEmoji: track.funEmoji,
    description: track.description,
    laps: track.laps,
    // Layout is render-only (the live view needs it; headless ignores it)
    layout: {
      trackPath: track.layout.trackPath,
      pitLanePath: track.layout.pitLanePath,
      straightStart: track.layout.straightStart,
      straightEnd: track.layout.straightEnd,
      totalLength: track.layout.totalLength,
    },
  });
}

/** Build a fresh engine prepared exactly like the live broadcast runs it, so a
 * headless settle, a mid-race snapshot, and a watched race are the same race. */
function prepareEngine(
  league: LeagueState,
  raceIndex: number,
  track: Track,
  simVars: SimVariables
): RaceEngine {
  const engine = RaceEngine.createForWorker();
  prepareScheduledRace(engine, league, raceIndex, track, simVars);
  // Digests need the whole race, not the live-UI window (no effect on outcome)
  engine.updateConfig({ maxStoredEvents: Number.MAX_SAFE_INTEGER });
  return engine;
}

export function runScheduledRace(
  league: LeagueState,
  raceIndex: number,
  track: Track,
  simVars: SimVariables
): { digest: RaceDigest; drivers: Driver[] } {
  const engine = prepareEngine(league, raceIndex, track, simVars);
  const weather = engine.getWeather();
  const { drivers, raceState, events } = engine.runHeadless();

  // Crash pairs: every retirement's involvedDriverIds, as unordered pairs.
  const crashPairs: [number, number][] = [];
  for (const d of drivers) {
    const inv = d.dnfInfo?.involvedDriverIds ?? [];
    for (const other of inv) {
      if (other === d.id) continue;
      const pair: [number, number] = d.id < other ? [d.id, other] : [other, d.id];
      if (!crashPairs.some(p => p[0] === pair[0] && p[1] === pair[1])) crashPairs.push(pair);
    }
  }
  const lapHistory = engine.getLapHistory();

  const digest: RaceDigest = {
    index: raceIndex,
    trackId: track.id,
    trackName: track.name,
    trackEmoji: track.funEmoji,
    finishOrder: raceState.finishOrder,
    dnfDriverIds: drivers.filter(d => d.status === 'dnf').map(d => d.id),
    gridOrder: lapHistory[0]?.order,
    damagedDriverIds: drivers.filter(d => d.isDamaged && d.status !== 'dnf').map(d => d.id),
    crashPairs,
    fastestLapDriverId: findFastestLap(drivers),
    totalTicks: raceState.totalTicks,
    // Only record non-neutral weather (keeps neutral races/digests clean)
    weather: weather && !isNeutralWeather(weather)
      ? { id: weather.id, name: weather.name, emoji: weather.emoji }
      : undefined,
    highlights: pickHighlights(events),
    events,
  };
  return { digest, drivers };
}

/** Strip full event logs from all but the newest digests. */
function applyRetention(digests: RaceDigest[]): RaceDigest[] {
  const cutoff = digests.length - FULL_EVENT_RETENTION;
  return digests.map((d, i) => {
    if (i >= cutoff) return d;
    if (d.events === undefined) return d;
    const { events: _dropped, ...kept } = d;
    return kept;
  });
}

/** When the last settled broadcast ended (queue anchor for the next one).
 * Digests from before live broadcasts existed lack endedAt; fall back to 0 so
 * the next race anchors to its scheduled time. */
function lastBroadcastEnd(league: LeagueState): number {
  const last = league.digests[league.digests.length - 1];
  return last?.endedAt ?? 0;
}

/**
 * Settle every race whose broadcast window has fully passed. Refuses to
 * re-run history: races at or before settledThrough are never touched, and
 * when nothing settles the input league is returned unchanged (same
 * reference, so callers can cheap-check `===`). If `now` falls inside a
 * race's window, that race is reported as `live` and not settled — joining
 * the broadcast is the UI's job.
 */
export function settleLeague(league: LeagueState, options: SettleOptions): SettleResult {
  // Physics: explicit override > the league's ruleset > canon.
  const simVars = options.simVars ?? league.setup.ruleset?.simVars ?? CANON_VARIABLES;

  const pending = league.schedule.filter(r => r.index > league.settledThrough);
  let prevEnd = lastBroadcastEnd(league);
  let season = league.season;
  const newlySettled: RaceDigest[] = [];
  let live: LiveRace | undefined;
  const working: LeagueState = league;

  for (const race of pending) {
    const startedAt = Math.max(race.scheduledAt, prevEnd);
    if (startedAt > options.now) break; // not on the air yet

    const track = getTrackById(race.trackId);
    if (!track) {
      // A calendar entry pointing at a track that no longer exists means the
      // save predates a content change — surface loudly rather than skipping
      // silently and corrupting standings.
      throw new Error(`settleLeague: unknown track '${race.trackId}' at race ${race.index}`);
    }

    // Run the race to learn how long its broadcast lasts (deterministic, so
    // this is the same race a viewer would watch live).
    const { digest } = runScheduledRace(working, race.index, track, simVars);
    const endedAt = startedAt + digest.totalTicks * LIVE_TICK_MS;

    if (endedAt > options.now) {
      // The race is on the air right now — don't settle it, report it.
      live = { index: race.index, trackId: race.trackId, startedAt, endsAt: endedAt };
      break;
    }

    digest.startedAt = startedAt;
    digest.endedAt = endedAt;
    season = updateSeasonWithRaceResult(
      season,
      digest.finishOrder,
      digest.dnfDriverIds,
      digest.trackName,
      digest.trackEmoji,
      digest.fastestLapDriverId
    );
    newlySettled.push(digest);
    prevEnd = endedAt;
    options.onRaceSettled?.(digest, newlySettled.length, pending.length);
  }

  if (newlySettled.length === 0) {
    return { league, newlySettled: [], live };
  }

  const settled: LeagueState = {
    ...league,
    interventionLog: working.interventionLog,
    settledThrough: newlySettled[newlySettled.length - 1].index,
    season,
    digests: applyRetention([...league.digests, ...newlySettled]),
  };
  return { league: settled, newlySettled, live };
}

/** Epoch ms when the next broadcast begins (queue-aware), or null when the
 * season is done. May be in the past if that race is live or overdue. */
export function nextRaceAt(league: LeagueState): number | null {
  const next = league.schedule.find(r => r.index > league.settledThrough);
  return next ? Math.max(next.scheduledAt, lastBroadcastEnd(league)) : null;
}

/** The state of a live broadcast at a glance, for UI that isn't watching. */
export interface LiveSnapshot {
  /** Driver ids in current race order (DNFs last). */
  runningOrder: number[];
  lap: number;
  totalLaps: number;
}

/**
 * Where the live race stands right now: replay the broadcast headlessly to
 * the current wall-clock tick (determinism makes this exact, not an
 * estimate). Costs one partial sim — fine on a several-second poll, too
 * heavy for a 60fps loop.
 */
export function liveRaceSnapshot(
  league: LeagueState,
  live: LiveRace,
  now: number,
  simVars: SimVariables = CANON_VARIABLES
): LiveSnapshot | null {
  const track = getTrackById(live.trackId);
  if (!track) return null;
  const engine = prepareEngine(league, live.index, track, simVars);
  engine.reset();
  engine.fastForward(Math.floor((Math.min(now, live.endsAt) - live.startedAt) / LIVE_TICK_MS));

  const drivers = engine.getDrivers(); // already in race order
  const racing = drivers.filter(d => d.status !== 'dnf');
  const dnf = drivers.filter(d => d.status === 'dnf');
  const leaderLap = Math.max(0, ...racing.map(d => d.currentLap));
  return {
    runningOrder: [...racing, ...dnf].map(d => d.id),
    lap: Math.min(track.laps, leaderLap + 1),
    totalLaps: track.laps,
  };
}

/** True once every scheduled race has settled. */
export function isSeasonOver(league: LeagueState): boolean {
  return league.settledThrough >= league.schedule.length - 1;
}
