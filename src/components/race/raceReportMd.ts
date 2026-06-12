// Race strategy report — plain markdown, no visuals. The copyable handoff
// artifact for balance work: what strategies the teams actually ran, where
// the safety cars fell, who gained and who fell. Built from the same inputs
// as the lap chart, so it works live mid-race AND from a deterministic
// replay of any settled race.
import type { Driver } from '../../RaceEngine';
import type { LapSample } from './lapChartData';

export interface RaceReportMeta {
  /** e.g. "R5 · 🧀 Cheddah" or "🧀 Cheddah (live, lap 9/15)" */
  title: string;
  totalLaps: number;
  /** Condition lines, e.g. ["💨 Windy (heavy)", "🏎️ High-Speed"]. */
  conditions: string[];
  /** Total race ticks if finished (renders duration at 100ms/tick). */
  totalTicks?: number;
  /** Finish order (driver ids) once classified; live uses current order. */
  finishOrder?: number[];
}

const COMPOUND = { soft: 'S', medium: 'M', hard: 'H' } as const;

function fmtSecs(ticks: number): string {
  return `${(ticks / 10).toFixed(1)}s`;
}

function fmtDuration(ticks: number): string {
  const s = Math.round(ticks / 10);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Stint string with lap counts: "S5 → M6 → S4" (last stint open-ended live). */
function stintString(d: Driver, totalLapsRun: number): string {
  const start = d.usedCompounds?.[0];
  if (!start) return '—';
  const pits = d.pitStops ?? [];
  const compounds = [start, ...pits.map(p => p.tiresAfter)];
  const bounds = [0, ...pits.map(p => p.lap), d.status === 'dnf' ? (d.dnfInfo?.lap ?? totalLapsRun) : totalLapsRun];
  return compounds
    .map((c, i) => `${COMPOUND[c] ?? '?'}${Math.max(0, (bounds[i + 1] ?? totalLapsRun) - bounds[i])}`)
    .join(' → ');
}

export function buildRaceReportMd(meta: RaceReportMeta, drivers: Driver[], samples: LapSample[]): string {
  const lines: string[] = [];
  const last = samples.length - 1;
  const lapsRun = last >= 0 ? samples[last].lap : 0;

  // Current/final classification: finishOrder when classified, else the
  // latest sample's running order; DNFs last by retirement recency.
  const order = samples[last]?.order ?? drivers.map(d => d.id);
  const byId = new Map(drivers.map(d => [d.id, d]));
  const running = order.map(id => byId.get(id)).filter((d): d is Driver => !!d && d.status !== 'dnf');
  const classified = meta.finishOrder?.length
    ? meta.finishOrder.map(id => byId.get(id)).filter((d): d is Driver => !!d)
    : running;
  const dnfs = drivers
    .filter(d => d.status === 'dnf')
    .sort((a, b) => (b.dnfInfo?.lap ?? 0) - (a.dnfInfo?.lap ?? 0));

  // Starting grid from the lap-0 snapshot.
  const grid = new Map<number, number>();
  (samples[0]?.order ?? []).forEach((id, i) => grid.set(id, i + 1));

  // Safety-car periods from the per-lap sc flags.
  const scPeriods: { from: number; to: number }[] = [];
  let scStart: number | null = null;
  for (const s of samples) {
    if (s.sc) { if (scStart === null) scStart = s.lap; }
    else if (scStart !== null) { scPeriods.push({ from: scStart, to: s.lap - 1 }); scStart = null; }
  }
  if (scStart !== null) scPeriods.push({ from: scStart, to: lapsRun });

  // === Header ===
  lines.push(`# Race Report — ${meta.title}`);
  lines.push('');
  lines.push(`- Distance: ${meta.totalLaps} laps${lapsRun < meta.totalLaps ? ` (through lap ${lapsRun})` : ''}`);
  if (meta.conditions.length) lines.push(`- Conditions: ${meta.conditions.join(' · ')}`);
  if (meta.totalTicks) lines.push(`- Duration: ${fmtDuration(meta.totalTicks)}`);
  lines.push(`- Field: ${drivers.length} · DNFs: ${dnfs.length}`);
  lines.push(
    scPeriods.length
      ? `- Safety car: ${scPeriods.length}× (laps ${scPeriods.map(p => p.from === p.to ? `${p.from}` : `${p.from}–${p.to}`).join(', ')})`
      : '- Safety car: none'
  );
  lines.push('');

  // === Classification + strategy ===
  lines.push('## Classification & strategy');
  lines.push('');
  lines.push('| P | Driver | Team | Grid | Δ | Stints | Pits |');
  lines.push('|---|--------|------|------|---|--------|------|');
  classified.forEach((d, i) => {
    const p = i + 1;
    const g = grid.get(d.id);
    const delta = g !== undefined ? g - p : 0;
    const deltaStr = delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '·';
    const pits = (d.pitStops ?? [])
      .map(ps => `L${ps.lap}${ps.wasSlowStop ? ' (slow)' : ''}`)
      .join(', ') || '—';
    lines.push(`| ${p} | ${d.name} | ${d.teamName ?? '—'} | ${g ?? '—'} | ${deltaStr} | ${stintString(d, lapsRun)} | ${pits} |`);
  });
  dnfs.forEach(d => {
    const g = grid.get(d.id);
    lines.push(`| DNF | ${d.name} | ${d.teamName ?? '—'} | ${g ?? '—'} | out L${d.dnfInfo?.lap ?? '?'} (${d.dnfInfo?.reason ?? '?'}) | ${stintString(d, lapsRun)} | ${(d.pitStops ?? []).map(ps => `L${ps.lap}`).join(', ') || '—'} |`);
  });
  lines.push('');

  // === Pit stop detail ===
  const allStops = drivers
    .flatMap(d => (d.pitStops ?? []).map(ps => ({ d, ps })))
    .sort((a, b) => a.ps.tick - b.ps.tick);
  if (allStops.length) {
    lines.push('## Pit stops');
    lines.push('');
    lines.push('| Lap | Driver | Change | Stationary | Note |');
    lines.push('|-----|--------|--------|------------|------|');
    for (const { d, ps } of allStops) {
      lines.push(
        `| ${ps.lap} | ${d.name} | ${COMPOUND[ps.tiresBefore] ?? '?'}→${COMPOUND[ps.tiresAfter] ?? '?'} | ${fmtSecs(ps.duration)} | ${ps.wasSlowStop ? 'slow stop' : ''} |`
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}
