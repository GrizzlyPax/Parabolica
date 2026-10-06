// Race strategy report — plain markdown, no visuals. The copyable handoff
// artifact for balance work: what strategies the teams actually ran, where
// the safety cars fell, who gained and who fell. Built from the same inputs
// as the lap chart, so it works live mid-race AND from a deterministic
// replay of any settled race.
import type { Driver, RaceEvent } from '../../RaceEngine';
import type { LapSample } from './lapChartData';

/** Balance-pass extras (#245 run record, first slice). All optional so the
 * live lap-chart copy keeps working. */
export interface RaceReportExtras {
  /** Engine seed; with trackId + teamIds this replays the race exactly. */
  seed?: number | null;
  trackId?: string;
  teamIds?: string[];
  engineVersion?: string;
  /** Ruleset summary lines (cards / "default"). */
  ruleset?: string[];
  weatherIntensity?: number;
  events?: RaceEvent[];
}

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

export function buildRaceReportMd(meta: RaceReportMeta, drivers: Driver[], samples: LapSample[], extras: RaceReportExtras = {}): string {
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
  if (extras.engineVersion) lines.push(`- Engine: v${extras.engineVersion}`);
  if (extras.ruleset?.length) lines.push(`- Rules: ${extras.ruleset.join(' · ')}`);
  if (extras.seed !== undefined) {
    lines.push(extras.seed === null
      ? '- Replay: unseeded race (not reproducible)'
      : `- Replay: seed \`${extras.seed}\`${extras.trackId ? ` · track \`${extras.trackId}\`` : ''}${extras.teamIds ? ` · teams \`${extras.teamIds.join(',')}\`` : ''}`);
  }
  lines.push(
    scPeriods.length
      ? `- Safety car: ${scPeriods.length}× (laps ${scPeriods.map(p => p.from === p.to ? `${p.from}` : `${p.from}–${p.to}`).join(', ')})`
      : '- Safety car: none'
  );
  lines.push('');

  // === Classification + strategy ===
  lines.push('## Classification & strategy');
  lines.push('');
  const bestLap = (d: Driver) => d.lapTimes.length ? fmtSecs(Math.min(...d.lapTimes)) : '—';
  const avgLap = (d: Driver) => d.lapTimes.length ? fmtSecs(d.lapTimes.reduce((a, b) => a + b, 0) / d.lapTimes.length) : '—';
  const tagStr = (d: Driver) => d.tags.length ? d.tags.map(t => `${t.emoji} ${t.name}`).join(', ') : '—';
  lines.push('| P | Driver | Team | Grid | Δ | Best | Avg | Stints | Pits | Tags |');
  lines.push('|---|--------|------|------|---|------|-----|--------|------|------|');
  classified.forEach((d, i) => {
    const p = i + 1;
    const g = grid.get(d.id);
    const delta = g !== undefined ? g - p : 0;
    const deltaStr = delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '·';
    const pits = (d.pitStops ?? [])
      .map(ps => `L${ps.lap}${ps.wasSlowStop ? ' (slow)' : ''}`)
      .join(', ') || '—';
    const pen = d.penaltyTicks > 0 ? ` ⚠ +${(d.penaltyTicks / Math.max(1, d.lapTimes.at(-1) ?? 100)).toFixed(1)}L (${d.penaltyReason})` : '';
    lines.push(`| ${p} | ${d.name}${pen} | ${d.teamName ?? '—'} | ${g ?? '—'} | ${deltaStr} | ${bestLap(d)} | ${avgLap(d)} | ${stintString(d, lapsRun)} | ${pits} | ${tagStr(d)} |`);
  });
  dnfs.forEach(d => {
    const g = grid.get(d.id);
    lines.push(`| DNF | ${d.name} | ${d.teamName ?? '—'} | ${g ?? '—'} | out L${d.dnfInfo?.lap ?? '?'} (${d.dnfInfo?.reason ?? '?'}) | ${bestLap(d)} | ${avgLap(d)} | ${stintString(d, lapsRun)} | ${(d.pitStops ?? []).map(ps => `L${ps.lap}`).join(', ') || '—'} | ${tagStr(d)} |`);
  });
  lines.push('');

  // === Driver / car / team stats (the balance inputs) ===
  lines.push('## Stats (inputs)');
  lines.push('');
  lines.push('| Driver | Spd | Con | Lck | Acc | End | Agg | Car P/G/R | Team TM/PC |');
  lines.push('|--------|-----|-----|-----|-----|-----|-----|-----------|------------|');
  const f2 = (n: number | undefined) => n === undefined ? '—' : n.toFixed(2);
  for (const d of [...classified, ...dnfs]) {
    const st = d.stats, c = d.carStats, t = d.teamStats;
    lines.push(`| ${d.name} | ${f2(st.baseSpeed)} | ${f2(st.consistency)} | ${f2(st.luck)} | ${f2(st.acceleration)} | ${f2(st.endurance)} | ${f2(st.aggression)} | ${c ? `${c.power}/${c.grip}/${c.reliability}` : '—'} | ${t ? `${t.tireManagement}/${t.pitCrew}` : '—'} |`);
  }
  lines.push('');

  // === What the oddities did ===
  const ev = extras.events ?? [];
  if (ev.length) {
    const byDriver = new Map(drivers.map(d => [d.id, d]));
    // === Racing (#246): passes and battles ===
    const passes = ev.filter(e => e.type === 'overtake' && /^passes /.test(e.description));
    const battles = ev.filter(e => e.type === 'battle');
    const pole = ev.find(e => e.type === 'grid_set');
    lines.push('## Racing');
    lines.push('');
    if (pole) lines.push(`- Pole: ${byDriver.get(pole.driverId)?.name ?? pole.driverName}`);
    lines.push(`- Passes: ${passes.length} · battles (2s+ stuck behind the same car): ${battles.length}`);
    const passCount = new Map<number, number>();
    for (const e of passes) passCount.set(e.driverId, (passCount.get(e.driverId) ?? 0) + 1);
    const topPassers = [...passCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (topPassers.length) lines.push(`- Most passes: ${topPassers.map(([id, n]) => `${byDriver.get(id)?.name ?? id} ${n}`).join(' · ')}`);
    const fights = passes.filter(e => /after a fight/.test(e.description));
    if (fights.length) lines.push(`- Won after a fight: ${fights.slice(0, 8).map(e => `L${e.lap ?? '?'} ${byDriver.get(e.driverId)?.name ?? e.driverName} ${e.description.replace(' after a fight', '')}`).join(' · ')}`);
    const penalties = ev.filter(e => e.type === 'penalty');
    if (penalties.length) lines.push(`- Penalties at the flag: ${penalties.map(e => `${byDriver.get(e.driverId)?.name ?? e.driverName} (${e.description})`).join(' · ')}`);
    lines.push('');

    const fired = ev.filter(e => e.type === 'tag_activation' || e.type === 'tag_acquired');
    const hits = ev.filter(e => e.type === 'track_event' || e.type === 'track_event_effect');
    lines.push('## What the oddities did');
    lines.push('');
    if (fired.length) {
      lines.push('Tag activations and mid-race pickups (passive and gated tags act silently):');
      for (const e of fired) lines.push(`- L${e.lap ?? '?'} ${e.emoji} ${byDriver.get(e.driverId)?.name ?? e.driverName}: ${e.description}`);
    } else {
      lines.push('- No triggered tag fired this race.');
    }
    if (hits.length) {
      lines.push('');
      lines.push('Track events and inflictions:');
      for (const e of hits) lines.push(`- L${e.lap ?? '?'} ${e.emoji} ${e.driverId >= 0 && byDriver.get(e.driverId) ? byDriver.get(e.driverId)!.name + ': ' : ''}${e.description}`);
    }
    lines.push('');

    // === Incident log ===
    const NOTABLE = new Set(['crash', 'dnf', 'mechanical_failure', 'tire_failure', 'unsafety_car_deployed', 'unsafety_car_recalled', 'driver_error', 'slow_pit_stop', 'quick_pit_stop', 'close_call', 'track_event']);
    const notable = ev.filter(e => NOTABLE.has(e.type));
    if (notable.length) {
      lines.push('## Incidents');
      lines.push('');
      lines.push('| Lap | Time | Type | Driver | What |');
      lines.push('|-----|------|------|--------|------|');
      for (const e of notable.slice(0, 80)) {
        lines.push(`| ${e.lap ?? '—'} | ${fmtDuration(e.tick)} | ${e.type} | ${byDriver.get(e.driverId)?.name ?? '—'} | ${e.emoji} ${e.description} |`);
      }
      if (notable.length > 80) lines.push(`| … | | | | +${notable.length - 80} more |`);
      lines.push('');
    }
  }

  // === Pit stop detail ===
  const allStops = drivers
    .flatMap(d => (d.pitStops ?? []).map(ps => ({ d, ps })))
    .sort((a, b) => a.ps.lap - b.ps.lap || a.ps.tick - b.ps.tick);
  if (allStops.length) {
    lines.push('## Pit stops');
    lines.push('');
    const entries = (extras.events ?? []).filter(e => e.type === 'pit_entry');
    const whyFor = (d: Driver, ps: { tick: number }) => {
      const e = entries.filter(x => x.driverId === d.id && x.tick <= ps.tick).sort((a, b) => b.tick - a.tick)[0];
      return e ? e.description.replace(/^Boxes — /, '') : '';
    };
    lines.push('| Lap | Driver | Change | Why | Pit lane | Note |');
    lines.push('|-----|--------|--------|-----|----------|------|');
    for (const { d, ps } of allStops) {
      lines.push(
        `| ${ps.lap} | ${d.name} | ${COMPOUND[ps.tiresBefore] ?? '?'}→${COMPOUND[ps.tiresAfter] ?? '?'} | ${whyFor(d, ps)} | ${fmtSecs(ps.duration)} | ${ps.wasSlowStop ? 'slow stop' : ps.wasQuickStop ? 'quick stop' : ''} |`
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}
