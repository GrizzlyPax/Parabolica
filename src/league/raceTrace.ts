// Completed-race trace (#173): replay a settled league race from its seed and
// reconstruct exactly how it unfolded — the lap chart (position trace, SC
// bands, pit dots) plus a per-driver strategy summary. Determinism makes the
// reconstruction exact: same seed + roster + config = the same race that
// entered the standings (#149's contract working FOR us).
// Pure and synchronous; one headless sim per call — memoize at the call site.

import RaceEngine from '../RaceEngine';
import { CANON_VARIABLES } from '../simlab/types';
import { getTrackById } from '../generators/tracks';
import { LeagueState } from './types';
import { prepareScheduledRace } from './settle';
import { buildLapChartData, LapChartData } from '../components/race/lapChartData';
import { TireCompound } from '../RaceEngine';

export interface DriverStrategy {
  driverId: number;
  name: string;
  color: string;
  accentColor?: string;
  emoji: string;
  /** Final classification: position number, or null for DNF. */
  finalPosition: number | null;
  /** Compound sequence across the race, e.g. ['soft','medium','soft']. */
  stints: TireCompound[];
  /** Laps on which they pitted. */
  pitLaps: number[];
  dnfLap: number | null;
}

export interface RaceTrace extends LapChartData {
  totalLaps: number;
  fieldSize: number;
  strategies: DriverStrategy[];
}

/** Replay race `raceIndex` of the league and reconstruct its full trace. */
export function traceRace(league: LeagueState, raceIndex: number): RaceTrace | null {
  const race = league.schedule[raceIndex];
  if (!race) return null;
  const track = getTrackById(race.trackId);
  if (!track) return null;

  const engine = RaceEngine.createForWorker();
  prepareScheduledRace(engine, league, raceIndex, track, CANON_VARIABLES);
  const { drivers, raceState } = engine.runHeadless();

  const chart = buildLapChartData(engine.getLapHistory(), drivers);

  const strategies: DriverStrategy[] = drivers.map(d => {
    const finishIdx = raceState.finishOrder.indexOf(d.id);
    // Stints: starting compound, then each pit's tiresAfter.
    const stints: TireCompound[] = [
      ...(d.usedCompounds?.length ? [d.usedCompounds[0]] : []),
      ...(d.pitStops ?? []).map(p => p.tiresAfter),
    ];
    return {
      driverId: d.id,
      name: d.name,
      color: d.color,
      accentColor: d.accentColor,
      emoji: d.emoji,
      finalPosition: d.status === 'dnf' ? null : (finishIdx >= 0 ? finishIdx + 1 : null),
      stints,
      pitLaps: (d.pitStops ?? []).map(p => p.lap),
      dnfLap: d.status === 'dnf' ? (d.dnfInfo?.lap ?? null) : null,
    };
  }).sort((a, b) => (a.finalPosition ?? 99) - (b.finalPosition ?? 99));

  return {
    ...chart,
    totalLaps: track.laps,
    fieldSize: drivers.length,
    strategies,
  };
}
