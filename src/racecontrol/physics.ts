// Physics calibration: what the race rules produce, measured.
//
// Pointed at the simulation variables: run a seeded batch of card-free races
// (the No Traits card) and read the numbers that say whether racing
// looks like racing — how much pace decides the result, how often pole wins,
// stops, passes, DNFs, safety cars. Change a variable, run the same batch,
// compare. Metrics mirror scripts/mechanics-probe.mjs (#246).
import { labSpec, runLabRace, raceFingerprint, batchFingerprint, type LabRaceResult } from './runner';
import RaceEngine from '../RaceEngine';
import { CANON_VARIABLES, type SimVariables } from '../simlab/types';
import { livePace, packageScore } from './pace';

export const PHYSICS_CARDS = ['no-traits'];
export const PHYSICS_RACES = 100;

export type MetricFormat = 'pct' | 'num1' | 'num2' | 'int' | 'corr';

export interface PhysicsMetric {
  id: string;
  label: string;
  value: number;
  format: MetricFormat;
  /** What a reader should make of it, in one line. */
  hint: string;
  /** A sane band for the live game; outside it the row is flagged. */
  band?: [number, number];
}

export interface PhysicsReport {
  batchSeed: number;
  races: number;
  cards: string[];
  fingerprint: string;
  metrics: PhysicsMetric[];
}

export interface PhysicsProgress { done: number; total: number; track: string }

const rank = (v: number[]) => { const idx = v.map((x, i) => [x, i] as const).sort((p, q) => q[0] - p[0]); const r = new Array<number>(v.length); idx.forEach(([, i], k) => { r[i] = k + 1; }); return r; };
const spearman = (a: number[], b: number[]) => { const n = a.length; const ra = rank(a), rb = rank(b); let s = 0; for (let i = 0; i < n; i++) s += (ra[i] - rb[i]) ** 2; return 1 - 6 * s / (n * (n * n - 1)); };
const mean = (v: number[]) => v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;

interface Acc {
  rho: number[]; speedPowerRho: number[]; gridRho: number[]; poleWins: number[]; top3PackageWins: number[]; stops: number[]; lapped: number[]; margin: number[];
  starters: number; dnf: number; crashes: number; mech: number; blowouts: number; penalties: number; finishers: number;
  quick: number; slow: number; pitStops: number; passes: number; battles: number; sc: number; closeCalls: number; ticks: number[]; leaders: number[];
  firstStopFrac: number[]; stopLapSd: number[];
}

function emptyAcc(): Acc {
  return { rho: [], speedPowerRho: [], gridRho: [], poleWins: [], top3PackageWins: [], stops: [], lapped: [], margin: [], starters: 0, dnf: 0, crashes: 0, mech: 0, blowouts: 0, penalties: 0, finishers: 0, quick: 0, slow: 0, pitStops: 0, passes: 0, battles: 0, sc: 0, closeCalls: 0, ticks: [], leaders: [], firstStopFrac: [], stopLapSd: [] };
}

function accumulate(acc: Acc, r: LabRaceResult, hist: { order: number[] }[], simVars: SimVariables) {
  const { drivers, raceState, events, track } = r;
  const finish = raceState.finishOrder;
  const byId = new Map(drivers.map(d => [d.id, d]));
  const classified = finish.filter(id => byId.get(id)?.status !== 'dnf');
  const finPos = classified.map((_, i) => classified.length - i);
  if (classified.length > 5) {
    acc.rho.push(spearman(classified.map(id => packageScore(byId.get(id)!)), finPos));
    acc.speedPowerRho.push(spearman(classified.map(id => livePace(byId.get(id)!, simVars)), finPos));
  }
  const gridIds = r.gridOrder;
  if (gridIds.length && finish.length) {
    acc.poleWins.push(gridIds[0] === finish[0] ? 1 : 0);
    acc.gridRho.push(spearman(classified.map(id => classified.length - gridIds.indexOf(id)), finPos));
  }
  const byPace = [...drivers].sort((a, b) => packageScore(b) - packageScore(a)).map(d => d.id);
  if (finish.length) acc.top3PackageWins.push(byPace.indexOf(finish[0]) < 3 ? 1 : 0);
  for (const d of drivers) {
    acc.starters++;
    if (d.status === 'dnf') {
      acc.dnf++;
      const why = d.dnfInfo?.reason ?? '';
      if (why === 'tire_failure') acc.blowouts++; else if (why === 'crash') acc.crashes++; else acc.mech++;
      continue;
    }
    acc.finishers++;
    acc.stops.push(d.pitStops.length);
    acc.lapped.push(d.lapsBehind > 0 ? 1 : 0);
    if (d.penaltyTicks > 0) acc.penalties++;
    if (d.pitStops[0]) acc.firstStopFrac.push((d.pitStops[0].lap ?? 0) / track.laps);
    for (const p of d.pitStops) { acc.pitStops++; if (p.wasQuickStop) acc.quick++; if (p.wasSlowStop) acc.slow++; }
  }
  const stopLaps = drivers.flatMap(d => d.pitStops.map(p => p.lap ?? 0));
  if (stopLaps.length) { const m = mean(stopLaps); acc.stopLapSd.push(Math.sqrt(mean(stopLaps.map(x => (x - m) ** 2)))); }
  const w = byId.get(finish[0]), second = byId.get(finish[1]);
  if (w && second && second.status !== 'dnf' && w.finishTick && second.finishTick) acc.margin.push((second.finishTick - w.finishTick) / (w.lapTimes.at(-1) || 100));
  acc.ticks.push(raceState.totalTicks);
  acc.sc += events.filter(e => e.type === 'unsafety_car_deployed').length / 2; // the engine logs it twice (#246)
  acc.closeCalls += events.filter(e => e.type === 'close_call').length;
  acc.passes += events.filter(e => e.type === 'overtake' && /passes/.test(e.description)).length;
  acc.battles += events.filter(e => e.type === 'battle').length;
  acc.leaders.push(new Set(hist.map(h => h.order[0])).size);
}

function report(acc: Acc, races: number): PhysicsMetric[] {
  const n = Math.max(1, races);
  return [
    { id: 'paceRho', label: 'Pace decides the result', value: mean(acc.rho), format: 'corr', hint: 'Spearman between the full package (all 11 stats, the Paddock OVR) and finishing order among finishers. 1 = pure stats, 0 = lottery. F1 sits around 0.7.', band: [0.45, 0.85] },
    { id: 'speedPowerRho', label: 'Speed × Power alone', value: mean(acc.speedPowerRho), format: 'corr', hint: 'The same, scored on the engine pace term only (Speed × car Power, live variables). Low once other stats matter; no band.' },
    { id: 'gridRho', label: 'Grid decides the result', value: mean(acc.gridRho), format: 'corr', hint: 'Spearman between grid slot and finish. Should be a bit below pace: qualifying matters, but races are won on Sunday.', band: [0.4, 0.85] },
    { id: 'poleWins', label: 'Pole wins', value: mean(acc.poleWins), format: 'pct', hint: 'How often the pole-sitter wins. F1: roughly 40–50%.', band: [0.15, 0.6] },
    { id: 'top3Wins', label: 'Top-3 package wins', value: mean(acc.top3PackageWins), format: 'pct', hint: 'The winner had one of the three best full packages (Paddock OVR).', band: [0.4, 0.9] },
    { id: 'passes', label: 'Passes per race', value: acc.passes / n, format: 'int', hint: 'On-track position changes that were real overtakes (not pit shuffles). F1: 30–80 depending on the track.', band: [20, 120] },
    { id: 'battles', label: 'Battles per race', value: acc.battles / n, format: 'int', hint: 'Stretches where a car was held up behind another and fought.', band: [10, 100] },
    { id: 'leaders', label: 'Distinct leaders', value: mean(acc.leaders), format: 'num1', hint: 'Different cars that led at least one lap.', band: [1.5, 6] },
    { id: 'margin', label: 'Winning margin', value: mean(acc.margin), format: 'pct', hint: 'Gap from first to second as a share of a lap.', band: [0.02, 0.6] },
    { id: 'stops', label: 'Stops per finisher', value: mean(acc.stops), format: 'num2', hint: 'Pit stops per classified car. The rule asks for two; the cliff asks for whatever the tyres say.', band: [1.5, 3.2] },
    { id: 'firstStop', label: 'First stop at', value: mean(acc.firstStopFrac), format: 'pct', hint: 'Race distance when the first stop happens.', band: [0.15, 0.5] },
    { id: 'stopSpread', label: 'Stop-lap spread', value: mean(acc.stopLapSd), format: 'num1', hint: 'Standard deviation of stop laps. Low = everyone boxes together (herding).', band: [1.5, 6] },
    { id: 'quick', label: 'Quick stops', value: acc.quick / Math.max(1, acc.pitStops), format: 'pct', hint: 'Share of stops the crew nailed.', band: [0.03, 0.15] },
    { id: 'slow', label: 'Slow stops', value: acc.slow / Math.max(1, acc.pitStops), format: 'pct', hint: 'Share of stops that went wrong.', band: [0.03, 0.15] },
    { id: 'dnf', label: 'DNF rate', value: acc.dnf / Math.max(1, acc.starters), format: 'pct', hint: 'Starters who did not finish. F1 2020s: 10–20%.', band: [0.08, 0.25] },
    { id: 'dnfCrash', label: '… crashes', value: acc.crashes / Math.max(1, acc.dnf), format: 'pct', hint: 'Share of DNFs that were crashes.' },
    { id: 'dnfMech', label: '… mechanical', value: acc.mech / Math.max(1, acc.dnf), format: 'pct', hint: 'Share of DNFs that were the car giving up.' },
    { id: 'dnfBlowout', label: '… blowouts', value: acc.blowouts / Math.max(1, acc.dnf), format: 'pct', hint: 'Share of DNFs that were tyre failures.', band: [0, 0.2] },
    { id: 'sc', label: 'Safety cars per race', value: acc.sc / n, format: 'num2', hint: 'F1: about 0.6 per race.', band: [0.3, 1.2] },
    { id: 'closeCalls', label: 'Close calls per race', value: acc.closeCalls / n, format: 'int', hint: 'Near-misses logged. Feeds Shaken / Bad Blood.', band: [3, 40] },
    { id: 'lapped', label: 'Lapped finishers', value: mean(acc.lapped), format: 'pct', hint: 'Finishers at least a lap down.', band: [0, 0.4] },
    { id: 'penalties', label: 'Penalised finishers', value: acc.penalties / Math.max(1, acc.finishers), format: 'pct', hint: 'Finishers who broke the stop rule and ate a time penalty.', band: [0, 0.1] },
    { id: 'ticks', label: 'Race length', value: mean(acc.ticks), format: 'int', hint: 'Ticks per race. ×36 ÷ 1000 ≈ km/h scale used by the speed column.' },
  ];
}

export interface PhysicsOptions {
  batchSeed: number;
  races?: number;
  cards?: string[];
  variables?: SimVariables;
}

/** One yield per race; returns the report. Deterministic for (batchSeed, races, cards, variables). */
export function* physicsSteps(options: PhysicsOptions): Generator<PhysicsProgress, PhysicsReport, boolean | void> {
  const races = options.races ?? PHYSICS_RACES;
  const cards = options.cards ?? PHYSICS_CARDS;
  const engine = RaceEngine.createForWorker();
  const acc = emptyAcc();
  const fps: string[] = [];
  for (let i = 0; i < races; i++) {
    const r = runLabRace(labSpec(options.batchSeed, i, cards, 'all'), { engine, variables: options.variables });
    fps.push(raceFingerprint(r));
    accumulate(acc, r, engine.getLapHistory(), options.variables ?? r.league.setup.ruleset?.simVars ?? CANON_VARIABLES);
    const go = yield { done: i + 1, total: races, track: r.track.name };
    if (go === false) break;
  }
  return { batchSeed: options.batchSeed, races: fps.length, cards, fingerprint: batchFingerprint(fps), metrics: report(acc, fps.length) };
}

export function measurePhysics(options: PhysicsOptions): PhysicsReport {
  const g = physicsSteps(options);
  let next = g.next();
  while (!next.done) next = g.next();
  return next.value;
}

export async function measurePhysicsAsync(options: PhysicsOptions, onProgress?: (p: PhysicsProgress) => boolean | void): Promise<PhysicsReport> {
  const g = physicsSteps(options);
  let next = g.next();
  while (!next.done) {
    const go = onProgress?.(next.value);
    await new Promise(r => setTimeout(r, 0));
    next = g.next(go);
  }
  return next.value;
}

export function formatMetric(v: number, f: MetricFormat): string {
  switch (f) {
    case 'pct': return `${(v * 100).toFixed(v < 0.1 ? 1 : 0)}%`;
    case 'corr': return v.toFixed(2);
    case 'num1': return v.toFixed(1);
    case 'num2': return v.toFixed(2);
    case 'int': return Math.round(v).toString();
  }
}

export function metricOutOfBand(m: PhysicsMetric): boolean {
  return !!m.band && (m.value < m.band[0] || m.value > m.band[1]);
}

/** The metric definitions (label, meaning, band, format) by id — the ledger stores only id + value. */
export const METRIC_DEFS: Record<string, Omit<PhysicsMetric, 'value'>> = Object.fromEntries(report(emptyAcc(), 1).map(({ value: _v, ...def }) => [def.id, def]));

/** A ledger-sized report: ids and values only. */
export function compactReport(r: PhysicsReport): PhysicsReport {
  return { ...r, metrics: r.metrics.map(m => ({ id: m.id, value: m.value } as PhysicsMetric)) };
}
/** Put labels, bands and formats back on a compact report. */
export function expandReport(r: PhysicsReport): PhysicsReport {
  return { ...r, metrics: r.metrics.map(m => ({ ...(METRIC_DEFS[m.id] ?? { id: m.id, label: m.id, format: 'num2', hint: '' }), value: m.value })) };
}
