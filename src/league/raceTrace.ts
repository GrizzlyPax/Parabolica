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
import { buildRaceReportMd } from '../components/race/raceReportMd';
import { weatherForRace, isNeutralWeather } from '../data/weather';
import { favourText } from '../cards/favourText';
import { TireCompound } from '../RaceEngine';

export interface DriverStrategy {
  driverId: number;
  name: string;
  color: string;
  ink?: string;
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

/** Deterministic replay of race `raceIndex` — the shared engine run behind
 * the chart trace and the markdown report. */
function replayRace(league: LeagueState, raceIndex: number) {
  const race = league.schedule[raceIndex];
  if (!race) return null;
  const track = getTrackById(race.trackId);
  if (!track) return null;
  const engine = RaceEngine.createForWorker();
  prepareScheduledRace(engine, league, raceIndex, track, CANON_VARIABLES);
  const { drivers, raceState } = engine.runHeadless();
  return { engine, track, drivers, raceState };
}

/** Replay race `raceIndex` of the league and reconstruct its full trace. */
export function traceRace(league: LeagueState, raceIndex: number): RaceTrace | null {
  const replay = replayRace(league, raceIndex);
  if (!replay) return null;
  const { engine, track, drivers, raceState } = replay;

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
      ink: d.ink,
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

/** Markdown strategy report for a settled race (#196 detailed tier / #195
 * audit artifact) — plain text for clipboard, balance handoff, and diffing. */
export function raceReportForLeague(league: LeagueState, raceIndex: number): string | null {
  const replay = replayRace(league, raceIndex);
  if (!replay) return null;
  const { engine, track, drivers, raceState } = replay;

  const weather = weatherForRace(league.leagueSeed, raceIndex);
  const conditions = [
    ...(!isNeutralWeather(weather) ? [`${weather.emoji} ${weather.name}`] : []),
    ...(track.favours.length ? [`${track.name}: ${favourText(track.favours)}`] : []),
  ];
  return buildRaceReportMd(
    {
      title: `R${raceIndex + 1} · ${track.funEmoji} ${track.name}`,
      totalLaps: track.laps,
      conditions,
      totalTicks: raceState.totalTicks,
      finishOrder: raceState.finishOrder,
    },
    drivers,
    engine.getLapHistory()
  );
}
