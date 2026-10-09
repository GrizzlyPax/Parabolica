// What "the package" means to the pace checks (#507). Race Control's Physics
// calibration and scripts/mechanics-probe.mjs share these, so they can't drift.
//
// - packageScore: the full package, all 11 stats on the grade scale (the
//   Paddock's OVR, src/season/grades.ts). Since Balance Pass One every stat
//   matters, so scoring only Speed × Power read a healthy race as a lottery
//   (Steward, #457). It reads the generators' ranges, not dials, so it never
//   needs a hard-coded number.
// - livePace: the engine's own deterministic pace term (speed stat × car
//   power) from the live simVars, for the "Speed × Power" info row.
import type { Driver } from '../RaceEngine';
import type { SimVariables } from '../simlab/types';
import type { StatKey } from '../cards/types';
import { overall, readStat } from '../season/grades';

type Racer = Pick<Driver, 'stats' | 'carStats' | 'teamStats'>;

const DRIVER: StatKey[] = ['baseSpeed', 'consistency', 'luck', 'acceleration', 'endurance', 'aggression'];
const CAR: StatKey[] = ['power', 'grip', 'reliability'];
const TEAM: StatKey[] = ['tireManagement', 'pitCrew'];

export function packageScore(d: Racer): number {
  const read = (keys: StatKey[], src: Record<string, number> | undefined) =>
    keys.filter(k => typeof src?.[k] === 'number').map(k => readStat(k, src![k], []));
  return overall([
    ...read(DRIVER, d.stats as unknown as Record<string, number>),
    ...read(CAR, d.carStats as unknown as Record<string, number> | undefined),
    ...read(TEAM, d.teamStats as unknown as Record<string, number> | undefined),
  ]).total;
}

export function livePace(d: Racer, v: SimVariables): number {
  return (1 + (d.stats.baseSpeed - 1) * v.driverSpeed.speedStatMultiplier)
    * (v.carStats.powerBase + (d.carStats?.power ?? 3) * v.carStats.powerPerStar);
}
