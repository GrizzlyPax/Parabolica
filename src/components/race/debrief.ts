// The race debrief (#581): what happened to your drivers, as plain facts.
// Pax (Oct 10): no judgment calls. Grid → finish, the pit strategy, and the
// notable moments, each one read straight off the race record (grid order,
// pit stops, event log, lap chart). Display only: no engine change, no rolls.
import type { Driver, RaceEvent } from '../../RaceEngine';
import type { LapSample } from './lapChartData';

export interface DebriefMoment {
  lap: number;
  /** "Slow stop", "Spin", "Retired"… */
  what: string;
  /** Measured detail: "+4.8s vs a normal stop", "engine". */
  detail?: string;
  tone: 'good' | 'bad';
}

export interface DriverDebrief {
  driverId: number;
  grid: number;
  /** Classified place, or 0 for a retirement or a cut. */
  finish: number;
  /** Out of the race: retired, or taken by a lap cut (#694). */
  out?: 'dnf' | 'cut';
  /** "1 stop · H→M" */
  strategy: string;
  /** The biggest moments, at most three, in lap order. */
  moments: DebriefMoment[];
}

export interface WinnerEdge { driverId: number; grid: number; strategy: string; led: number; laps: number }

export interface DebriefInput {
  drivers: Driver[];
  samples: LapSample[];
  events: RaceEvent[];
  /** Grid order, pole first. */
  grid: number[];
  /** Classified order at the flag. */
  finishOrder: number[];
}

const COMPOUND: Record<string, string> = { soft: 'S', medium: 'M', hard: 'H', wet: 'W' };
const s1 = (ticks: number) => `${(ticks / 10).toFixed(1)}s`;

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** "1 stop · H→M" (or "No stops · M"). */
export function strategyOf(d: Driver): string {
  const first = d.usedCompounds?.[0];
  const tyres = first ? [first, ...d.pitStops.map(p => p.tiresAfter)].map(c => COMPOUND[c] ?? '?').join('→') : '';
  const n = d.pitStops.length;
  const stops = n === 0 ? 'No stops' : `${n} stop${n === 1 ? '' : 's'}`;
  return tyres ? `${stops} · ${tyres}` : stops;
}

const DNF_WHY: Record<string, string> = { crash: 'crash', mechanical: 'engine', tire_failure: 'tyre blowout' };

/** Which moments make the cut when there are more than three: the bigger the story, the lower the number. */
const RANK = { retired: 0, penalty: 1, damage: 2, slow: 3, mistake: 4, tyres: 5, quick: 6 } as const;

function momentsFor(d: Driver, events: RaceEvent[], normalStop: number): DebriefMoment[] {
  const out: (DebriefMoment & { rank: number })[] = [];
  const add = (rank: number, m: DebriefMoment) => out.push({ ...m, rank });

  for (const p of d.pitStops) {
    if (!p.wasSlowStop && !p.wasQuickStop) continue;
    const diff = p.duration - normalStop;
    const vs = normalStop > 0 ? `${diff >= 0 ? '+' : '−'}${s1(Math.abs(diff))} vs a normal stop` : undefined;
    if (p.wasSlowStop) add(RANK.slow, { lap: p.lap, what: 'Slow stop', detail: vs, tone: 'bad' });
    else add(RANK.quick, { lap: p.lap, what: 'Quick stop', detail: vs, tone: 'good' });
  }
  for (const e of events) {
    if (e.driverId !== d.id || !e.lap) continue;
    if (e.type === 'driver_error') add(RANK.mistake, { lap: e.lap, what: e.description.split(':')[0] || 'Mistake', tone: 'bad' });
    else if (e.type === 'crash' && /damaged/.test(e.description)) add(RANK.damage, { lap: e.lap, what: 'Contact', detail: 'car damaged', tone: 'bad' });
    else if (e.type === 'tire_warning') add(RANK.tyres, { lap: e.lap, what: 'Tyres went off', tone: 'bad' });
    else if (e.type === 'penalty') add(RANK.penalty, { lap: e.lap, what: 'Penalty', detail: e.description.replace(/^\+[\d.]+ laps penalty — /, ''), tone: 'bad' });
  }
  if (d.status === 'dnf' && d.dnfInfo) {
    add(RANK.retired, { lap: Math.max(1, d.dnfInfo.lap), what: 'Retired', detail: DNF_WHY[d.dnfInfo.reason] ?? d.dnfInfo.reason, tone: 'bad' });
  }
  if (d.status === 'eliminated') {
    add(RANK.retired, { lap: Math.max(1, d.eliminatedLap ?? 1), what: 'Cut', detail: `after lap ${d.eliminatedLap ?? '?'}`, tone: 'bad' });
  }
  return out
    .sort((a, b) => a.rank - b.rank || a.lap - b.lap)
    .slice(0, 3)
    .sort((a, b) => a.lap - b.lap || a.rank - b.rank)
    .map(({ rank: _rank, ...m }) => m);
}

/** Your drivers, each with grid → finish, strategy and up to three moments. */
export function driverDebrief(input: DebriefInput, ids: readonly number[]): DriverDebrief[] {
  const normalStop = median(input.drivers.flatMap(d => d.pitStops.filter(p => !p.wasSlowStop && !p.wasQuickStop).map(p => p.duration)));
  return ids.flatMap(id => {
    const d = input.drivers.find(x => x.id === id);
    if (!d) return [];
    return [{
      driverId: id,
      grid: input.grid.indexOf(id) + 1,
      finish: d.status === 'dnf' || d.status === 'eliminated' ? 0 : input.finishOrder.indexOf(id) + 1,
      ...(d.status === 'dnf' ? { out: 'dnf' as const } : d.status === 'eliminated' ? { out: 'cut' as const } : {}),
      strategy: strategyOf(d),
      moments: momentsFor(d, input.events, normalStop),
    }];
  });
}

/** The winner: where they started, how they stopped, how many laps they led. */
export function winnerEdge(input: DebriefInput): WinnerEdge | null {
  const id = input.finishOrder[0];
  const w = input.drivers.find(d => d.id === id);
  if (!w) return null;
  const laps = input.samples.filter(s => s.lap >= 1);
  return {
    driverId: id,
    grid: input.grid.indexOf(id) + 1,
    strategy: strategyOf(w),
    led: laps.filter(s => s.order[0] === id).length,
    laps: laps.length,
  };
}
