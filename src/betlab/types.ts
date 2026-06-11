// Bet Lab Types - Monte Carlo testing for betting system calibration

import { BetType } from '../betting/utils';

// === CONFIGURATION ===

export interface BetLabConfig {
  batchSize: number;              // Races to simulate (100, 500, 2000)
  trackSelection: 'random' | 'all';
}

// === ACCUMULATORS (for efficient aggregation during simulation) ===

export interface BetTypeAccumulator {
  totalBets: number;
  winningBets: number;
  totalOddsOffered: number;       // Sum of all odds for averaging
  totalPayout: number;            // Sum of all payouts (0 for losses)
  totalStaked: number;            // Sum of all amounts bet (for ROI)
}

export interface TierAccumulator {
  tier: 'favorite' | 'contender' | 'longshot' | 'wildcard';
  driverCount: number;            // Drivers in this tier per race
  byBetType: Record<BetType, BetTypeAccumulator>;
}

export interface OddsBucketAccumulator {
  range: string;                  // "1-2x", "2-5x", etc.
  minOdds: number;
  maxOdds: number;
  totalBets: number;
  winningBets: number;
  totalOdds: number;
  totalPayout: number;
  totalStaked: number;
}

export interface BetLabAccumulators {
  totalRaces: number;
  totalBets: number;

  // By bet type (win, podium, points, finishes, dnf)
  byBetType: Record<BetType, BetTypeAccumulator>;

  // By tier (favorite, contender, longshot, wildcard)
  byTier: TierAccumulator[];

  // By odds range
  byOddsRange: OddsBucketAccumulator[];
}

// === RESULTS (finalized, immutable) ===

export interface BetTypeAnalysis {
  betType: BetType;
  totalBets: number;
  winningBets: number;
  hitRate: number;                // winningBets / totalBets
  avgOddsOffered: number;         // Average multiplier offered
  impliedProbability: number;     // 1 / avgOdds (what odds imply)
  actualProbability: number;      // hitRate (what actually happens)
  calibrationDelta: number;       // actual - implied (positive = overperforming)
  totalPayout: number;
  totalStaked: number;
  roi: number;                    // totalPayout / totalStaked
}

export interface TierAnalysis {
  tier: 'favorite' | 'contender' | 'longshot' | 'wildcard';
  tierLabel: string;              // "Contenders", "Quality", etc.
  driverCount: number;            // Avg drivers per race in this tier

  // Hit rates by bet type
  winRate: number;
  podiumRate: number;
  pointsRate: number;
  finishRate: number;
  dnfRate: number;

  // Odds info
  avgWinOdds: number;
  avgPodiumOdds: number;

  // ROI
  overallROI: number;
}

export interface OddsBucketAnalysis {
  range: string;
  minOdds: number;
  maxOdds: number;
  totalBets: number;
  winningBets: number;
  hitRate: number;
  impliedProbability: number;     // Based on middle of range
  calibration: 'good' | 'high' | 'low';  // How well calibrated
  roi: number;
}

export interface BetLabResults {
  config: BetLabConfig;
  totalRaces: number;
  totalBets: number;
  executionTimeMs: number;

  // Overall metrics
  overallHitRate: number;
  overallROI: number;
  totalPayout: number;
  totalStaked: number;

  // Detailed breakdowns
  betTypeResults: BetTypeAnalysis[];
  tierResults: TierAnalysis[];
  oddsBucketResults: OddsBucketAnalysis[];
}

// === COMPARISON (Canon vs Heretic) ===

export interface BetLabComparison {
  canon: BetLabResults;
  heretic: BetLabResults;
}

// === WORKER MESSAGES ===

export type BetLabWorkerMessage =
  | { type: 'START'; config: BetLabConfig; variables: unknown; label: 'canon' | 'heretic' }
  | { type: 'ABORT' };

export type BetLabWorkerResponse =
  | { type: 'PROGRESS'; completed: number; total: number; currentTrack: string }
  | { type: 'COMPLETE'; results: BetLabResults }
  | { type: 'ERROR'; message: string };

// === HELPER FUNCTIONS ===

export function createEmptyAccumulators(): BetLabAccumulators {
  const emptyBetType = (): BetTypeAccumulator => ({
    totalBets: 0,
    winningBets: 0,
    totalOddsOffered: 0,
    totalPayout: 0,
    totalStaked: 0,
  });

  return {
    totalRaces: 0,
    totalBets: 0,
    byBetType: {
      win: emptyBetType(),
      podium: emptyBetType(),
      points: emptyBetType(),
      finishes: emptyBetType(),
      dnf: emptyBetType(),
    },
    byTier: [
      { tier: 'favorite', driverCount: 0, byBetType: { win: emptyBetType(), podium: emptyBetType(), points: emptyBetType(), finishes: emptyBetType(), dnf: emptyBetType() } },
      { tier: 'contender', driverCount: 0, byBetType: { win: emptyBetType(), podium: emptyBetType(), points: emptyBetType(), finishes: emptyBetType(), dnf: emptyBetType() } },
      { tier: 'longshot', driverCount: 0, byBetType: { win: emptyBetType(), podium: emptyBetType(), points: emptyBetType(), finishes: emptyBetType(), dnf: emptyBetType() } },
      { tier: 'wildcard', driverCount: 0, byBetType: { win: emptyBetType(), podium: emptyBetType(), points: emptyBetType(), finishes: emptyBetType(), dnf: emptyBetType() } },
    ],
    byOddsRange: [
      { range: '1-2×', minOdds: 1, maxOdds: 2, totalBets: 0, winningBets: 0, totalOdds: 0, totalPayout: 0, totalStaked: 0 },
      { range: '2-5×', minOdds: 2, maxOdds: 5, totalBets: 0, winningBets: 0, totalOdds: 0, totalPayout: 0, totalStaked: 0 },
      { range: '5-10×', minOdds: 5, maxOdds: 10, totalBets: 0, winningBets: 0, totalOdds: 0, totalPayout: 0, totalStaked: 0 },
      { range: '10-20×', minOdds: 10, maxOdds: 20, totalBets: 0, winningBets: 0, totalOdds: 0, totalPayout: 0, totalStaked: 0 },
      { range: '20×+', minOdds: 20, maxOdds: Infinity, totalBets: 0, winningBets: 0, totalOdds: 0, totalPayout: 0, totalStaked: 0 },
    ],
  };
}

// Tier labels for display
export const TIER_LABELS: Record<'favorite' | 'contender' | 'longshot' | 'wildcard', string> = {
  favorite: 'Contenders',
  contender: 'Quality',
  longshot: 'Midfield',
  wildcard: 'Backmarkers',
};
