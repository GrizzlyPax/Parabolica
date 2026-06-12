// The settle loop: the one function that makes wall-clock time real.
// A race occupies a real-time broadcast window: it starts at its scheduled
// moment (or when its predecessor ends, whichever is later — broadcasts
// queue) and runs at LIVE_TICK_MS per tick. Races whose window has fully
// passed are settled into digests; a race whose window contains `now` is
// reported as live so the UI can join the broadcast mid-race. Determinism
// makes the live view and the headless settle the same race.
// Pure (input league is never mutated) and synchronous.
// See docs/COMMISSIONER_MODE_TECH.md (Problem 3).

import RaceEngine, { Driver } from '../RaceEngine';
import { SimVariables, CANON_VARIABLES } from '../simlab/types';
import { getTrackById, getDynamicEventDescription, Track } from '../generators/tracks';
import { updateSeasonWithRaceResult } from '../types/season';
import { LeagueState, RaceDigest, SettleResult, LiveRace } from './types';
import { rosterStateAt } from './league';
import { pickHighlights } from './highlights';

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

/** Build an engine prepared exactly like the live broadcast runs it, so a
 * headless settle, a mid-race snapshot, and a watched race are the same race. */
function prepareEngine(
  league: LeagueState,
  raceIndex: number,
  track: Track,
  simVars: SimVariables
): RaceEngine {
  const race = league.schedule[raceIndex];
  const engine = RaceEngine.createForWorker(simVars, race.seed);
  engine.loadGeneratedRoster(rosterStateAt(league, raceIndex));
  engine.updateConfig({
    totalLaps: track.laps,
    lapLength: track.length,
    // Digests need the whole race, not the live-UI window
    maxStoredEvents: Number.MAX_SAFE_INTEGER,
  });
  engine.setTrackInfo({
    id: track.id,
    name: track.name,
    emoji: track.emoji,
    funEmoji: track.funEmoji,
    description: track.description,
    laps: track.laps,
    event: track.event ? {
      id: track.event.id,
      name: track.event.name,
      emoji: track.event.emoji,
      description: getDynamicEventDescription(track.event, track.laps),
      flavorText: track.event.flavorText,
    } : undefined,
    // Track events change outcomes — settle must run them like live races do
    eventTrigger: track.event?.trigger,
    eventEffect: track.event?.effect,
  });
  return engine;
}

function runScheduledRace(
  league: LeagueState,
  raceIndex: number,
  track: Track,
  simVars: SimVariables
): { digest: RaceDigest; drivers: Driver[] } {
  const engine = prepareEngine(league, raceIndex, track, simVars);
  const { drivers, raceState, events } = engine.runHeadless();

  const digest: RaceDigest = {
    index: raceIndex,
    trackId: track.id,
    trackName: track.name,
    trackEmoji: track.funEmoji,
    finishOrder: raceState.finishOrder,
    dnfDriverIds: drivers.filter(d => d.status === 'dnf').map(d => d.id),
    fastestLapDriverId: findFastestLap(drivers),
    totalTicks: raceState.totalTicks,
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
  const simVars = options.simVars ?? CANON_VARIABLES;

  const pending = league.schedule.filter(r => r.index > league.settledThrough);
  let prevEnd = lastBroadcastEnd(league);
  let season = league.season;
  const newlySettled: RaceDigest[] = [];
  let live: LiveRace | undefined;

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
    const { digest } = runScheduledRace(league, race.index, track, simVars);
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
