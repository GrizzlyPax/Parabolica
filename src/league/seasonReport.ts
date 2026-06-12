// End-of-season balance report: one copyable TSV artifact that captures
// everything needed to judge how a season really panned out — final
// standings, every driver's rolled attributes and tags, car/team hardware,
// race-by-race results, interventions, and stat-vs-points correlations.
// Same paste-into-a-sheet format as the SimLab results copy.
// Pure (no React, no DOM); the clipboard write lives in the UI.

import { RosterDriver } from '../RaceEngine';
import { Tag } from '../data/tags';
import { getSeasonStandings, DriverSeasonStats } from '../types/season';
import { LeagueState } from './types';
import { rosterStateAt } from './league';

function fmtTag(tag: Tag | undefined): string {
  return tag ? `${tag.emoji} ${tag.name} (${tag.id})` : '—';
}

function fmtRaceResults(results: number[]): string {
  return results.map(p => (p === -1 ? 'DNF' : `P${p}`)).join(' ');
}

function avgFinish(results: number[]): string {
  const finished = results.filter(p => p !== -1);
  if (finished.length === 0) return '—';
  return (finished.reduce((a, b) => a + b, 0) / finished.length).toFixed(2);
}

/** Broadcast duration at LIVE_TICK_MS (100ms/tick) as m:ss. */
function fmtDuration(totalTicks: number): string {
  const seconds = Math.round(totalTicks / 10);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** Pearson correlation; '—' when degenerate (zero variance / tiny grid). */
function pearson(xs: number[], ys: number[]): string {
  const n = xs.length;
  if (n < 3) return '—';
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const denom = Math.sqrt(dx2 * dy2);
  if (denom === 0) return '—';
  return (num / denom).toFixed(3);
}

/**
 * Build the full season report. Driver attributes/tags reflect the roster
 * state of the FINAL race (interventions included); the intervention log
 * itself is listed so mid-season changes are visible.
 */
export function buildSeasonReport(league: LeagueState): string {
  const rows: string[] = [];
  const addRow = (...cells: (string | number)[]) => rows.push(cells.join('\t'));
  const addBlank = () => rows.push('');

  const lastRaceIndex = league.schedule.length - 1;
  const finalRoster = rosterStateAt(league, Math.max(0, lastRaceIndex));
  const byId = new Map(finalRoster.map(d => [d.id, d]));
  const name = (id: number) => byId.get(id)?.fullName ?? `#${id}`;
  const standings = getSeasonStandings(league.season);

  // === HEADER ===
  addRow('PARABOLICA SEASON REPORT');
  addRow('League', league.setup.name);
  addRow('God', league.setup.godId);
  addRow('League Seed', league.leagueSeed);
  addRow('Engine Version', league.engineVersion);
  addRow('Races', `${league.settledThrough + 1}/${league.schedule.length}`);
  addRow('Race Interval (min)', Math.round(league.setup.raceIntervalMs / 60_000));
  addRow('Founded', new Date(league.setup.createdAt).toISOString());
  addRow('Interventions', league.interventionLog.length);
  addBlank();

  // === FINAL STANDINGS ===
  addRow('FINAL STANDINGS');
  addRow('Pos', 'Driver', 'Team', 'Pts', 'Wins', 'Podiums', 'Best', 'DNFs', 'AvgFinish', 'Results');
  standings.forEach((s: DriverSeasonStats, i: number) => {
    const d = byId.get(s.driverId);
    addRow(
      i + 1,
      d?.fullName ?? `#${s.driverId}`,
      d?.teamName ?? '—',
      s.points,
      s.wins,
      s.podiums,
      s.bestFinish === 99 ? '—' : `P${s.bestFinish}`,
      s.dnfs,
      avgFinish(s.raceResults),
      fmtRaceResults(s.raceResults),
    );
  });
  addBlank();

  // === DRIVER ATTRIBUTES (the rolled stats balance lives or dies on) ===
  addRow('DRIVER ATTRIBUTES (final-race state, interventions applied)');
  addRow('Driver', 'Team', 'Speed', 'Consistency', 'Luck', 'Accel', 'Endurance', 'Aggression', 'Driver Tag');
  for (const d of finalRoster) {
    addRow(
      d.fullName,
      d.teamName ?? '—',
      d.stats.baseSpeed.toFixed(3),
      d.stats.consistency.toFixed(3),
      d.stats.luck.toFixed(3),
      d.stats.acceleration.toFixed(3),
      d.stats.endurance.toFixed(3),
      d.stats.aggression.toFixed(3),
      fmtTag(d.driverTag),
    );
  }
  addBlank();

  // === CARS & TEAMS (one row per team; hardware is shared by both seats) ===
  addRow('CARS & TEAMS');
  addRow('Team', 'Car', 'Power', 'Grip', 'Reliability', 'TireMgmt', 'PitCrew', 'Car Tag', 'Team Tag');
  const seenTeams = new Set<string>();
  for (const d of finalRoster) {
    const key = d.kingdomId ?? d.teamName ?? String(d.id);
    if (seenTeams.has(key)) continue;
    seenTeams.add(key);
    addRow(
      d.teamName ?? key,
      d.carName ?? '—',
      d.carStats?.power ?? '—',
      d.carStats?.grip ?? '—',
      d.carStats?.reliability ?? '—',
      d.teamStats?.tireManagement ?? '—',
      d.teamStats?.pitCrew ?? '—',
      fmtTag(d.carTag),
      fmtTag(d.teamTag),
    );
  }
  addBlank();

  // === RACES ===
  addRow('RACES');
  addRow('R#', 'Track', 'Weather', 'Winner', 'Podium', 'Fastest Lap', 'DNFs', 'Duration');
  for (const digest of league.digests) {
    addRow(
      digest.index + 1,
      digest.trackName,
      digest.weather ? `${digest.weather.emoji} ${digest.weather.name}` : '☀️ Clear',
      name(digest.finishOrder[0]),
      digest.finishOrder.slice(0, 3).map(name).join(' | '),
      digest.fastestLapDriverId !== null ? name(digest.fastestLapDriverId) : '—',
      digest.dnfDriverIds.length > 0 ? digest.dnfDriverIds.map(name).join(', ') : '—',
      fmtDuration(digest.totalTicks),
    );
  }
  addBlank();

  // === INTERVENTIONS ===
  if (league.interventionLog.length > 0) {
    addRow('INTERVENTIONS');
    addRow('From Race', 'Type', 'Target', 'Tag');
    for (const iv of league.interventionLog) {
      addRow(iv.atRaceIndex + 1, iv.type, name(iv.targetDriverId), iv.tagId);
    }
    addBlank();
  }

  // === BALANCE READ: did the rolled stats predict the outcome? ===
  // Pearson r of each attribute vs points (and vs DNFs for the risk stats)
  // across the grid. One season is a small sample — paste several reports
  // together for a real signal.
  const graded = standings
    .map(s => ({ s, d: byId.get(s.driverId) }))
    .filter((x): x is { s: DriverSeasonStats; d: RosterDriver } => x.d !== undefined);
  const points = graded.map(x => x.s.points);
  const dnfs = graded.map(x => x.s.dnfs);
  const stat = (f: (d: RosterDriver) => number) => graded.map(x => f(x.d));

  addRow('STAT vs OUTCOME (Pearson r, one-season sample)');
  addRow('Attribute', 'r vs Points', 'r vs DNFs');
  addRow('Speed', pearson(stat(d => d.stats.baseSpeed), points), pearson(stat(d => d.stats.baseSpeed), dnfs));
  addRow('Consistency', pearson(stat(d => d.stats.consistency), points), pearson(stat(d => d.stats.consistency), dnfs));
  addRow('Luck', pearson(stat(d => d.stats.luck), points), pearson(stat(d => d.stats.luck), dnfs));
  addRow('Acceleration', pearson(stat(d => d.stats.acceleration), points), pearson(stat(d => d.stats.acceleration), dnfs));
  addRow('Endurance', pearson(stat(d => d.stats.endurance), points), pearson(stat(d => d.stats.endurance), dnfs));
  addRow('Aggression', pearson(stat(d => d.stats.aggression), points), pearson(stat(d => d.stats.aggression), dnfs));
  addRow('Car Power', pearson(stat(d => d.carStats?.power ?? 3), points), pearson(stat(d => d.carStats?.power ?? 3), dnfs));
  addRow('Car Grip', pearson(stat(d => d.carStats?.grip ?? 3), points), pearson(stat(d => d.carStats?.grip ?? 3), dnfs));
  addRow('Car Reliability', pearson(stat(d => d.carStats?.reliability ?? 3), points), pearson(stat(d => d.carStats?.reliability ?? 3), dnfs));

  return rows.join('\n');
}
