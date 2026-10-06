// Betting Utility Functions
// Pure functions for betting calculations - safe to import in Web Workers

import { Driver } from '../RaceEngine';
import { CANON_VARIABLES, SimVariables } from '../simlab/types';

// ============================================
// TYPES
// ============================================

export type BetType = 'win' | 'podium' | 'points' | 'finishes' | 'dnf';

// ============================================
// FIELD RANK (how a driver / car stacks up against this grid)
// ============================================
// Shown instead of absolute ratings: "3rd of 22" says how you compare
// without handing out an overall number. Ties share a rank ("=5th").

/** Driver skill on a 0–1 scale (weights: simVars.betting.driverRatingWeights). */
export function driverSkillScore(driver: Pick<Driver, 'stats'>, simVars?: SimVariables): number {
  const w = (simVars ?? CANON_VARIABLES).betting.driverRatingWeights;
  const speedScore = (driver.stats.baseSpeed - 0.85) / 0.30;
  const consistencyScore = (driver.stats.consistency - 0.3) / 0.50;
  const luckScore = (driver.stats.luck - 0.3) / 0.50;
  return consistencyScore * w.consistency + speedScore * w.speed + luckScore * w.luck;
}

/** Car package on a 0–1 scale: power 40%, grip 35%, reliability 25%. Missing stats read as mid (3★). */
export function carPackageScore(driver: Pick<Driver, 'carStats'>): number {
  const c = driver.carStats;
  const power = ((c?.power ?? 3) - 1) / 4;
  const grip = ((c?.grip ?? 3) - 1) / 4;
  const reliability = ((c?.reliability ?? 3) - 1) / 4;
  return power * 0.4 + grip * 0.35 + reliability * 0.25;
}

/** purple = 1st; then thirds of the rest of the field: green, yellow, red. */
export type RankTone = 'best' | 'high' | 'mid' | 'low';

export interface FieldRank {
  /** 1 = best. Always unique: ties are broken (see fieldRanks). */
  rank: number;
  /** Field size. */
  of: number;
  tone: RankTone;
}

export function rankTone(rank: number, of: number): RankTone {
  if (rank <= 1) return 'best';
  const frac = (rank - 1) / Math.max(1, of - 1);
  if (frac <= 1 / 3) return 'high';
  if (frac <= 2 / 3) return 'mid';
  return 'low';
}

/**
 * Rank every item, best first. `score` returns one number or a list compared
 * in order (the later entries break ties in the earlier ones). Anything still
 * level is ordered by id, so every item gets its own rank — no ties.
 */
export function fieldRanks<T extends { id: number }>(items: T[], score: (t: T) => number | number[]): Map<number, FieldRank> {
  const keyed = items.map(t => { const k = score(t); return { id: t.id, k: Array.isArray(k) ? k : [k] }; });
  keyed.sort((a, b) => {
    for (let i = 0; i < Math.max(a.k.length, b.k.length); i++) {
      const d = (b.k[i] ?? 0) - (a.k[i] ?? 0);
      if (Math.abs(d) > 1e-9) return d;
    }
    return a.id - b.id;
  });
  const out = new Map<number, FieldRank>();
  keyed.forEach((x, i) => out.set(x.id, { rank: i + 1, of: items.length, tone: rankTone(i + 1, items.length) }));
  return out;
}

/**
 * Driver and car ranks for a whole grid. Drivers: skill score, then raw speed.
 * Cars are shared by teammates, so they are ranked once per team: overall
 * package, then power, grip, reliability, then the team's pit crew; anything
 * still level falls back to roster order. Both teammates get their car's rank.
 */
export function rosterRanks(drivers: Pick<Driver, 'id' | 'stats' | 'carStats' | 'teamStats' | 'kingdomId'>[]): { driver: Map<number, FieldRank>; car: Map<number, FieldRank> } {
  const teamOf = (d: typeof drivers[number]) => d.kingdomId ?? `solo-${d.id}`;
  const teams = [...new Map(drivers.map(d => [teamOf(d), d])).values()];
  const teamIndex = new Map(teams.map((d, i) => [teamOf(d), i]));
  const carByTeam = fieldRanks(teams.map((d, i) => ({ id: i, d })), ({ d }) => [
    carPackageScore(d), d.carStats?.power ?? 3, d.carStats?.grip ?? 3, d.carStats?.reliability ?? 3, d.teamStats?.pitCrew ?? 3,
  ]);
  return {
    driver: fieldRanks(drivers, d => [driverSkillScore(d), d.stats.baseSpeed]),
    car: new Map(drivers.map(d => [d.id, carByTeam.get(teamIndex.get(teamOf(d))!)!])),
  };
}

/** 1 → "1st", 22 → "22nd", 13 → "13th". */
export function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`;
}

export interface DriverOdds {
  win: number;
  podium: number;
  points: number;
  finishes: number;
  dnf: number;
}

// ============================================
// DRIVER STRENGTH & RANKINGS
// ============================================

/**
 * Calculate strength score for any driver.
 * Weights pulled from provided simVars or CANON_VARIABLES.betting.strengthWeights
 */
export function calcDriverStrength(d: Driver, simVars?: SimVariables): number {
  const w = (simVars ?? CANON_VARIABLES).betting.strengthWeights;
  // Normalize stats to 0-1 scale
  const ss = (d.stats.baseSpeed - 0.85) / 0.30;      // Speed
  const cs = (d.stats.consistency - 0.3) / 0.50;     // Consistency
  const ls = (d.stats.luck - 0.3) / 0.50;            // Luck
  const cp = (d.carStats?.power ?? 3) / 5;           // Car Power
  const cg = (d.carStats?.grip ?? 3) / 5;            // Car Grip
  const cr = (d.carStats?.reliability ?? 3) / 5;     // Car Reliability
  const pc = (d.teamStats?.pitCrew ?? 3) / 5;        // Pit Crew
  // Apply weights from canon variables
  return cp * w.carPower + cs * w.consistency + ss * w.speed +
         pc * w.pitCrew + cg * w.carGrip + ls * w.luck + cr * w.carReliability;
}

/**
 * Pre-compute driver rankings once for all odds calculations.
 * Returns a Map of driverId -> rank (1-indexed).
 * This avoids O(n²) sorting when calculating odds for each driver.
 */
export function computeDriverRankings(drivers: Driver[], simVars?: SimVariables): Map<number, number> {
  const rankings = new Map<number, number>();
  const sorted = drivers
    .map(d => ({ id: d.id, strength: calcDriverStrength(d, simVars) }))
    .sort((a, b) => b.strength - a.strength || a.id - b.id);

  sorted.forEach((d, index) => {
    rankings.set(d.id, index + 1);
  });

  return rankings;
}

// ============================================
// ODDS CALCULATION
// ============================================

/**
 * Calculate betting odds for a driver based on their stats
 *
 * System: Payout = Base Multiplier × Driver Modifier
 * - Base is fixed per bet type (WIN=10×, PODIUM=4×, etc.)
 * - Driver Modifier ranges from 0.5× (favorites) to 5× (longshots)
 */
export function calculateDriverOdds(
  driver: Driver,
  rank: number,
  _totalDrivers: number,
  simVars?: SimVariables
): DriverOdds {
  const BASE_MULTIPLIERS = (simVars ?? CANON_VARIABLES).betting.baseMultipliers;

  // Get car reliability for DNF/finishes calculations
  const carReliability = (driver.carStats?.reliability ?? 3) / 5;

  // Driver modifier based on rank: favorites ~0.6×, midfield ~1.2×, longshots ~3×
  // This creates a nice spread without being too punishing or too generous
  let driverMod: number;
  if (rank <= 3) {
    driverMod = 0.5 + (rank - 1) * 0.15;  // 0.5, 0.65, 0.8
  } else if (rank <= 6) {
    driverMod = 0.9 + (rank - 3) * 0.15;  // 1.05, 1.2, 1.35
  } else if (rank <= 10) {
    driverMod = 1.4 + (rank - 6) * 0.2;   // 1.6, 1.8, 2.0, 2.2
  } else if (rank <= 15) {
    driverMod = 2.4 + (rank - 10) * 0.3;  // 2.7, 3.0, 3.3, 3.6, 3.9
  } else {
    driverMod = 4.0 + (rank - 15) * 0.4;  // 4.4, 4.8, 5.2...
  }

  // DNF modifier: based on reliability and aggression (inverse - unreliable = lower modifier = easier bet)
  const dnfLikelihood = (1 - carReliability) * 0.6 + (driver.stats.aggression - 0.3) / 0.5 * 0.4;
  // More likely to DNF = lower modifier (1.0), less likely = higher modifier (2.5)
  const dnfMod = 1.0 + (1 - dnfLikelihood) * 1.5;

  // Finishes modifier: inverse of DNF (reliable drivers = lower modifier)
  const finishesMod = 0.8 + dnfLikelihood * 1.5;  // Reliable: 0.8×, unreliable: up to 2.3×

  // Deterministic jitter based on driver rank to avoid resorting on re-render.
  // Capped at ±3%: the smallest gap between adjacent rank modifiers is ~6%,
  // so anything larger lets a worse-ranked driver show shorter odds.
  const jitter = (seed: number) => {
    const hash = ((rank * 31 + seed) % 20) / 100;
    return 0.97 + hash * 0.3;
  };

  // Final odds = Base × Driver Modifier (with stable jitter)
  return {
    win: Math.round(BASE_MULTIPLIERS.win * driverMod * jitter(1) * 10) / 10,
    podium: Math.round(BASE_MULTIPLIERS.podium * driverMod * jitter(2) * 10) / 10,
    points: Math.round(BASE_MULTIPLIERS.points * driverMod * jitter(3) * 10) / 10,
    finishes: Math.round(BASE_MULTIPLIERS.finishes * finishesMod * jitter(4) * 10) / 10,
    dnf: Math.round(BASE_MULTIPLIERS.dnf * dnfMod * jitter(5) * 10) / 10,
  };
}
