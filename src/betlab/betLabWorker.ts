// Bet Lab Web Worker
// Runs headless race simulations and tracks betting outcomes

import RaceEngine, { Driver, RaceState } from '../RaceEngine';
import { generateRoster, GeneratedDriver } from '../generators/drivers';
import { generateCarsForKingdoms, GeneratedCar } from '../generators/cars';
import { ALL_TRACKS, Track } from '../generators/tracks';
import { TEAMS } from '../data/teams';
import {
  computeDriverRankings,
  calculateDriverOdds,
  BetType,
} from '../betting/utils';
import { SimVariables, CANON_VARIABLES } from '../simlab/types';
import {
  BetLabConfig,
  BetLabResults,
  BetLabAccumulators,
  BetLabWorkerMessage,
  BetLabWorkerResponse,
  BetTypeAnalysis,
  TierAnalysis,
  OddsBucketAnalysis,
  createEmptyAccumulators,
  TIER_LABELS,
} from './types';

// Helper to merge roster with car data
function createRosterWithCars(roster: GeneratedDriver[], cars: Map<string, GeneratedCar>) {
  return roster.map(driver => {
    const car = cars.get(driver.kingdomId);
    return {
      ...driver,
      carStats: car?.stats,
      carName: car?.name,
      teamStats: car?.teamStats,
      driverTag: driver.tag,
      carTag: car?.carTag,
      teamTag: car?.teamTag,
    };
  });
}

let aborted = false;

// Handle messages from main thread
self.onmessage = (e: MessageEvent<BetLabWorkerMessage>) => {
  if (e.data.type === 'ABORT') {
    aborted = true;
    return;
  }

  if (e.data.type === 'START') {
    aborted = false;
    runSimulation(e.data.config, e.data.variables as SimVariables, e.data.label);
  }
};

function postProgress(completed: number, total: number, currentTrack: string) {
  const msg: BetLabWorkerResponse = { type: 'PROGRESS', completed, total, currentTrack };
  self.postMessage(msg);
}

function postComplete(results: BetLabResults) {
  const msg: BetLabWorkerResponse = { type: 'COMPLETE', results };
  self.postMessage(msg);
}

function postError(message: string) {
  const msg: BetLabWorkerResponse = { type: 'ERROR', message };
  self.postMessage(msg);
}

// Determine tier based on rank (mirrors the retired betting UI tiers)
function getTierForRank(rank: number, total: number): 'favorite' | 'contender' | 'longshot' | 'wildcard' {
  const purpleCutoff = Math.max(1, Math.round(total * 0.15));  // Top ~15%
  const greenCutoff = purpleCutoff + Math.max(1, Math.round(total * 0.35));  // Next ~35%
  const yellowCutoff = greenCutoff + Math.max(1, Math.round(total * 0.25));  // Next ~25%

  if (rank <= purpleCutoff) return 'favorite';
  if (rank <= greenCutoff) return 'contender';
  if (rank <= yellowCutoff) return 'longshot';
  return 'wildcard';
}

// Get odds bucket index for a given odds value
function getOddsBucketIndex(odds: number): number {
  if (odds < 2) return 0;      // 1-2×
  if (odds < 5) return 1;      // 2-5×
  if (odds < 10) return 2;     // 5-10×
  if (odds < 20) return 3;     // 10-20×
  return 4;                     // 20×+
}

// Check if a bet would win
function wouldBetWin(
  betType: BetType,
  finishPosition: number | null,
  isDNF: boolean
): boolean {
  switch (betType) {
    case 'win':
      return finishPosition === 1;
    case 'podium':
      return finishPosition !== null && finishPosition <= 3;
    case 'points':
      return finishPosition !== null && finishPosition <= 10;
    case 'finishes':
      return !isDNF;
    case 'dnf':
      return isDNF;
  }
}

// Aggregate betting results for a single race
function aggregateBettingResults(
  acc: BetLabAccumulators,
  drivers: Driver[],
  raceState: RaceState,
  simVars: SimVariables
) {
  const rankings = computeDriverRankings(drivers, simVars);
  const totalDrivers = drivers.length;

  // For each driver, calculate odds and check all bet types
  for (const driver of drivers) {
    const rank = rankings.get(driver.id) ?? totalDrivers;
    const tier = getTierForRank(rank, totalDrivers);
    const odds = calculateDriverOdds(driver, rank, totalDrivers, simVars);

    // Determine actual outcome
    const isDNF = driver.status === 'dnf';
    const finishPosition = isDNF ? null : raceState.finishOrder.indexOf(driver.id) + 1;

    // Test all 5 bet types
    const betTypes: BetType[] = ['win', 'podium', 'points', 'finishes', 'dnf'];
    const stakeAmount = 100; // Standard bet amount for ROI calculations

    for (const betType of betTypes) {
      const betOdds = odds[betType];
      const won = wouldBetWin(betType, finishPosition, isDNF);
      const payout = won ? stakeAmount * betOdds : 0;

      // Update overall bet type accumulator
      const btAcc = acc.byBetType[betType];
      btAcc.totalBets++;
      if (won) btAcc.winningBets++;
      btAcc.totalOddsOffered += betOdds;
      btAcc.totalPayout += payout;
      btAcc.totalStaked += stakeAmount;

      // Update tier accumulator
      const tierAcc = acc.byTier.find(t => t.tier === tier)!;
      const tierBtAcc = tierAcc.byBetType[betType];
      tierBtAcc.totalBets++;
      if (won) tierBtAcc.winningBets++;
      tierBtAcc.totalOddsOffered += betOdds;
      tierBtAcc.totalPayout += payout;
      tierBtAcc.totalStaked += stakeAmount;

      // Update odds bucket accumulator
      const bucketIdx = getOddsBucketIndex(betOdds);
      const bucketAcc = acc.byOddsRange[bucketIdx];
      bucketAcc.totalBets++;
      if (won) bucketAcc.winningBets++;
      bucketAcc.totalOdds += betOdds;
      bucketAcc.totalPayout += payout;
      bucketAcc.totalStaked += stakeAmount;

      acc.totalBets++;
    }

    // Track driver count per tier
    const tierAcc = acc.byTier.find(t => t.tier === tier)!;
    tierAcc.driverCount++;
  }

  acc.totalRaces++;
}

// Finalize results from accumulators
function finalizeResults(
  acc: BetLabAccumulators,
  config: BetLabConfig,
  executionTimeMs: number
): BetLabResults {
  // Calculate overall metrics
  let totalWins = 0;
  let totalPayout = 0;
  let totalStaked = 0;

  // Finalize bet type results
  const betTypeResults: BetTypeAnalysis[] = [];
  const betTypes: BetType[] = ['win', 'podium', 'points', 'finishes', 'dnf'];

  for (const betType of betTypes) {
    const btAcc = acc.byBetType[betType];
    const hitRate = btAcc.totalBets > 0 ? btAcc.winningBets / btAcc.totalBets : 0;
    const avgOdds = btAcc.totalBets > 0 ? btAcc.totalOddsOffered / btAcc.totalBets : 0;
    const impliedProb = avgOdds > 0 ? 1 / avgOdds : 0;
    const roi = btAcc.totalStaked > 0 ? btAcc.totalPayout / btAcc.totalStaked : 0;

    betTypeResults.push({
      betType,
      totalBets: btAcc.totalBets,
      winningBets: btAcc.winningBets,
      hitRate,
      avgOddsOffered: avgOdds,
      impliedProbability: impliedProb,
      actualProbability: hitRate,
      calibrationDelta: hitRate - impliedProb,
      totalPayout: btAcc.totalPayout,
      totalStaked: btAcc.totalStaked,
      roi,
    });

    totalWins += btAcc.winningBets;
    totalPayout += btAcc.totalPayout;
    totalStaked += btAcc.totalStaked;
  }

  // Finalize tier results
  const tierResults: TierAnalysis[] = acc.byTier.map(tierAcc => {
    const avgDriverCount = acc.totalRaces > 0 ? tierAcc.driverCount / acc.totalRaces : 0;

    const winAcc = tierAcc.byBetType.win;
    const podiumAcc = tierAcc.byBetType.podium;
    const pointsAcc = tierAcc.byBetType.points;
    const finishesAcc = tierAcc.byBetType.finishes;
    const dnfAcc = tierAcc.byBetType.dnf;

    const winRate = winAcc.totalBets > 0 ? winAcc.winningBets / winAcc.totalBets : 0;
    const podiumRate = podiumAcc.totalBets > 0 ? podiumAcc.winningBets / podiumAcc.totalBets : 0;
    const pointsRate = pointsAcc.totalBets > 0 ? pointsAcc.winningBets / pointsAcc.totalBets : 0;
    const finishRate = finishesAcc.totalBets > 0 ? finishesAcc.winningBets / finishesAcc.totalBets : 0;
    const dnfRate = dnfAcc.totalBets > 0 ? dnfAcc.winningBets / dnfAcc.totalBets : 0;

    const avgWinOdds = winAcc.totalBets > 0 ? winAcc.totalOddsOffered / winAcc.totalBets : 0;
    const avgPodiumOdds = podiumAcc.totalBets > 0 ? podiumAcc.totalOddsOffered / podiumAcc.totalBets : 0;

    // Overall ROI for this tier (sum all bet types)
    let tierPayout = 0;
    let tierStaked = 0;
    for (const bt of betTypes) {
      tierPayout += tierAcc.byBetType[bt].totalPayout;
      tierStaked += tierAcc.byBetType[bt].totalStaked;
    }
    const overallROI = tierStaked > 0 ? tierPayout / tierStaked : 0;

    return {
      tier: tierAcc.tier,
      tierLabel: TIER_LABELS[tierAcc.tier],
      driverCount: avgDriverCount,
      winRate,
      podiumRate,
      pointsRate,
      finishRate,
      dnfRate,
      avgWinOdds,
      avgPodiumOdds,
      overallROI,
    };
  });

  // Finalize odds bucket results
  const oddsBucketResults: OddsBucketAnalysis[] = acc.byOddsRange.map(bucket => {
    const hitRate = bucket.totalBets > 0 ? bucket.winningBets / bucket.totalBets : 0;
    const avgOdds = bucket.totalBets > 0 ? bucket.totalOdds / bucket.totalBets : (bucket.minOdds + Math.min(bucket.maxOdds, 30)) / 2;
    const impliedProb = avgOdds > 0 ? 1 / avgOdds : 0;
    const roi = bucket.totalStaked > 0 ? bucket.totalPayout / bucket.totalStaked : 0;

    // Calibration: compare actual hit rate to implied probability
    let calibration: 'good' | 'high' | 'low' = 'good';
    const diff = hitRate - impliedProb;
    if (diff > 0.03) calibration = 'high';  // Hitting more than expected
    else if (diff < -0.03) calibration = 'low';  // Hitting less than expected

    return {
      range: bucket.range,
      minOdds: bucket.minOdds,
      maxOdds: bucket.maxOdds,
      totalBets: bucket.totalBets,
      winningBets: bucket.winningBets,
      hitRate,
      impliedProbability: impliedProb,
      calibration,
      roi,
    };
  });

  const overallHitRate = acc.totalBets > 0 ? totalWins / acc.totalBets : 0;
  const overallROI = totalStaked > 0 ? totalPayout / totalStaked : 0;

  return {
    config,
    totalRaces: acc.totalRaces,
    totalBets: acc.totalBets,
    executionTimeMs,
    overallHitRate,
    overallROI,
    totalPayout,
    totalStaked,
    betTypeResults,
    tierResults,
    oddsBucketResults,
  };
}

// Main simulation loop
async function runSimulation(
  config: BetLabConfig,
  variables: SimVariables | undefined,
  _label: 'canon' | 'heretic'
) {
  const startTime = performance.now();

  try {
    // Use provided variables or fall back to canon
    const simVars = variables ?? CANON_VARIABLES;

    // Create engine with variables (use static factory for worker context)
    const engine = RaceEngine.createForWorker(simVars);

    // Create accumulators
    const acc = createEmptyAccumulators();

    // Determine tracks to use
    const tracks: Track[] = config.trackSelection === 'all'
      ? ALL_TRACKS
      : [ALL_TRACKS[Math.floor(Math.random() * ALL_TRACKS.length)]];

    // Progress interval (report every race for small batches, every ~1% for larger)
    const progressInterval = config.batchSize <= 100 ? 1 : Math.max(1, Math.floor(config.batchSize / 100));

    // Send initial progress
    postProgress(0, config.batchSize, 'Starting...');
    await new Promise(resolve => setTimeout(resolve, 10));

    // Run races
    for (let i = 0; i < config.batchSize && !aborted; i++) {
      // Pick track (cycle through all or use random)
      const track = config.trackSelection === 'all'
        ? tracks[i % tracks.length]
        : tracks[Math.floor(Math.random() * tracks.length)];

      // Generate fresh roster and cars for each race
      const roster = generateRoster();
      const teamIds = TEAMS.map(t => t.id);
      const cars = generateCarsForKingdoms(teamIds);
      const rosterWithCars = createRosterWithCars(roster, cars);

      // Load roster into engine
      engine.loadGeneratedRoster(rosterWithCars);

      // Configure engine
      engine.updateConfig({
        totalLaps: track.laps,
        lapLength: track.length,
      });

      // Set track info
      engine.setTrackInfo({
        id: track.id,
        name: track.name,
        emoji: track.emoji,
        funEmoji: track.funEmoji,
        description: track.description,
        laps: track.laps,
        layout: track.layout ? {
          trackPath: track.layout.trackPath,
          pitLanePath: track.layout.pitLanePath,
          straightStart: track.layout.straightStart,
          straightEnd: track.layout.straightEnd,
          totalLength: track.layout.totalLength,
        } : undefined,
        event: track.event ? {
          id: track.event.id,
          name: track.event.name,
          emoji: track.event.emoji,
          description: track.event.description,
          flavorText: track.event.flavorText,
        } : undefined,
        eventTrigger: track.event?.trigger,
        eventEffect: track.event?.effect,
      });

      // Run race to completion (headless mode)
      const result = engine.runHeadless();
      const drivers = result.drivers;
      const raceState = result.raceState;

      // Aggregate betting results
      aggregateBettingResults(acc, drivers, raceState, simVars);

      // Report progress
      if ((i + 1) % progressInterval === 0 || i === config.batchSize - 1) {
        postProgress(i + 1, config.batchSize, track.name);
        // Yield to allow UI to update - use slightly longer delay for smoother updates
        await new Promise(resolve => setTimeout(resolve, 5));
      }
    }

    if (aborted) {
      postError('Simulation aborted');
      return;
    }

    // Finalize and send results
    const executionTimeMs = performance.now() - startTime;
    const results = finalizeResults(acc, config, executionTimeMs);
    postComplete(results);

  } catch (error) {
    postError(error instanceof Error ? error.message : 'Unknown error during simulation');
  }
}
