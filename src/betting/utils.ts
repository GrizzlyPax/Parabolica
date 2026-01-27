// Betting Utility Functions
// Pure functions for betting calculations - safe to import in Web Workers

import { Driver } from '../RaceEngine';
import { CANON_VARIABLES, SimVariables } from '../simlab/types';

// ============================================
// TYPES
// ============================================

export type BetType = 'win' | 'podium' | 'points' | 'finishes' | 'dnf';

// Rating system types
export type RatingTier = 'legendary' | 'elite' | 'solid' | 'hopeless';

export interface RatingDescriptor {
  tier: RatingTier;
  label: string;
}

// Vibe-based rating descriptors
const DRIVER_DESCRIPTORS: Record<RatingTier, string[]> = {
  legendary: ['Otherworldly', 'Phenomenal', 'Transcendent', 'Untouchable', 'Generational'],
  elite: ['Exceptional', 'Dominant', 'Fearsome', 'Formidable', 'Commanding'],
  solid: ['Capable', 'Steady', 'Respectable', 'Dependable', 'Workmanlike'],
  hopeless: ['Struggling', 'Erratic', 'Hapless', 'Outmatched', 'Lost'],
};

const CAR_DESCRIPTORS: Record<RatingTier, string[]> = {
  legendary: ['Monster', 'Rocket Ship', 'Engineering Marvel', 'Dominant Machine'],
  elite: ['Powerful', 'Race-Winning', 'Top-Tier', 'Championship-Ready'],
  solid: ['Competitive', 'Reliable', 'Midfield Weapon', 'Points-Capable'],
  hopeless: ['Struggling', 'Underpowered', 'Unreliable', 'Backmarker'],
};

function getRandomDescriptor(descriptors: string[]): string {
  return descriptors[Math.floor(Math.random() * descriptors.length)];
}

/**
 * Calculate a driver's overall rating tier based on their stats
 * Returns a vibe-based descriptor instead of numbers
 */
export function getDriverRating(driver: Driver, simVars?: SimVariables): RatingDescriptor {
  const w = (simVars ?? CANON_VARIABLES).betting.driverRatingWeights;
  // Combine driver stats into overall score (0-1 scale)
  const speedScore = (driver.stats.baseSpeed - 0.85) / 0.30;
  const consistencyScore = (driver.stats.consistency - 0.3) / 0.50;
  const luckScore = (driver.stats.luck - 0.3) / 0.50;

  // Weighted average using canon variables (dynamic!)
  const overall = consistencyScore * w.consistency + speedScore * w.speed + luckScore * w.luck;

  let tier: RatingTier;
  if (overall >= 0.75) tier = 'legendary';
  else if (overall >= 0.5) tier = 'elite';
  else if (overall >= 0.25) tier = 'solid';
  else tier = 'hopeless';

  return {
    tier,
    label: getRandomDescriptor(DRIVER_DESCRIPTORS[tier]),
  };
}

/**
 * Calculate a car's overall rating tier based on its stats
 * Returns a vibe-based descriptor instead of numbers
 */
export function getCarRating(driver: Driver): RatingDescriptor {
  if (!driver.carStats) {
    return { tier: 'solid', label: getRandomDescriptor(CAR_DESCRIPTORS.solid) };
  }

  // Car stats are 1-5 scale, normalize to 0-1
  const powerScore = (driver.carStats.power - 1) / 4;
  const gripScore = (driver.carStats.grip - 1) / 4;
  const reliabilityScore = (driver.carStats.reliability - 1) / 4;

  // Weighted average
  const overall = powerScore * 0.4 + gripScore * 0.35 + reliabilityScore * 0.25;

  let tier: RatingTier;
  if (overall >= 0.75) tier = 'legendary';
  else if (overall >= 0.5) tier = 'elite';
  else if (overall >= 0.25) tier = 'solid';
  else tier = 'hopeless';

  return {
    tier,
    label: getRandomDescriptor(CAR_DESCRIPTORS[tier]),
  };
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

  // Deterministic jitter based on driver rank to avoid resorting on re-render
  // Uses rank as seed for consistent +/- 10% variation
  const jitter = (seed: number) => {
    const hash = ((rank * 31 + seed) % 20) / 100;
    return 0.9 + hash;
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
