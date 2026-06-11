// The settle loop: the one function that makes wall-clock time real.
// Every race whose scheduled moment has passed is simulated headlessly and
// deterministically from its founding seed, in order, accumulating standings
// and digests. Pure (input league is never mutated) and synchronous — designed
// to drop into a Web Worker when backfill UI lands.
// See docs/COMMISSIONER_MODE_TECH.md (Problem 3).

import RaceEngine, { RaceEvent, Driver } from '../RaceEngine';
import { SimVariables, CANON_VARIABLES } from '../simlab/types';
import { getTrackById, getDynamicEventDescription, Track } from '../generators/tracks';
import { updateSeasonWithRaceResult } from '../types/season';
import { LeagueState, RaceDigest, SettleResult } from './types';
import { rosterStateAt } from './league';

/** How many of the most recent digests keep their full event log. */
export const FULL_EVENT_RETENTION = 3;
/** How many top-magnitude events every digest keeps forever. */
export const HIGHLIGHTS_PER_RACE = 12;

export interface SettleOptions {
  /** Wall-clock "now" (epoch ms). Injected for testability. */
  now: number;
  /** Physics overrides; defaults to canon. Decrees will hook in here. */
  simVars?: SimVariables;
  /** Progress callback — one call per settled race (drives backfill UI). */
  onRaceSettled?: (digest: RaceDigest, settledCount: number, dueCount: number) => void;
}

function pickHighlights(events: RaceEvent[]): RaceEvent[] {
  return [...events]
    .sort((a, b) => b.magnitude - a.magnitude)
    .slice(0, HIGHLIGHTS_PER_RACE)
    .sort((a, b) => a.tick - b.tick);
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

function runScheduledRace(
  league: LeagueState,
  raceIndex: number,
  track: Track,
  simVars: SimVariables
): { digest: RaceDigest; drivers: Driver[] } {
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

/**
 * Settle every due race. Refuses to re-run history: races at or before
 * settledThrough are never touched, and an empty due-list returns the input
 * league unchanged (same reference, so callers can cheap-check `===`).
 */
export function settleLeague(league: LeagueState, options: SettleOptions): SettleResult {
  const simVars = options.simVars ?? CANON_VARIABLES;

  const due = league.schedule.filter(
    r => r.index > league.settledThrough && r.scheduledAt <= options.now
  );
  if (due.length === 0) {
    return { league, newlySettled: [] };
  }

  let season = league.season;
  const newlySettled: RaceDigest[] = [];

  for (const race of due) {
    const track = getTrackById(race.trackId);
    if (!track) {
      // A calendar entry pointing at a track that no longer exists means the
      // save predates a content change — surface loudly rather than skipping
      // silently and corrupting standings.
      throw new Error(`settleLeague: unknown track '${race.trackId}' at race ${race.index}`);
    }

    const { digest } = runScheduledRace(league, race.index, track, simVars);
    season = updateSeasonWithRaceResult(
      season,
      digest.finishOrder,
      digest.dnfDriverIds,
      digest.trackName,
      digest.trackEmoji,
      digest.fastestLapDriverId
    );
    newlySettled.push(digest);
    options.onRaceSettled?.(digest, newlySettled.length, due.length);
  }

  const settled: LeagueState = {
    ...league,
    settledThrough: due[due.length - 1].index,
    season,
    digests: applyRetention([...league.digests, ...newlySettled]),
  };
  return { league: settled, newlySettled };
}

/** Epoch ms of the next unsettled race, or null when the season is done. */
export function nextRaceAt(league: LeagueState): number | null {
  const next = league.schedule.find(r => r.index > league.settledThrough);
  return next ? next.scheduledAt : null;
}

/** True once every scheduled race has settled. */
export function isSeasonOver(league: LeagueState): boolean {
  return league.settledThrough >= league.schedule.length - 1;
}
