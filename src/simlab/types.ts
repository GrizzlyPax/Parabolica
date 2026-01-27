// === SIM LAB TYPES ===
// Shared types for worker communication and results aggregation

// === CONFIGURATION ===

export interface SimLabConfig {
  batchSize: number;           // 100, 250, 500, 1000
  trackSelection: 'random' | 'all';  // Track selection mode
  // Note: totalLaps removed - uses track's hardcoded lap count
}

// === WORKER MESSAGES ===

// Main thread -> Worker
export type WorkerInMessage =
  | { type: 'START'; config: SimLabConfig; variables?: SimVariables; label?: 'canon' | 'heretic' }
  | { type: 'ABORT' };

// Worker -> Main thread
export type WorkerOutMessage =
  | { type: 'PROGRESS'; completed: number; total: number; currentTrack: string }
  | { type: 'COMPLETE'; results: SimLabResults }
  | { type: 'ERROR'; message: string };

// === AGGREGATED RESULTS ===

export interface SimLabResults {
  config: SimLabConfig;
  totalRaces: number;
  totalDriverRaces: number;   // totalRaces * driversPerRace
  executionTimeMs: number;

  // By driver stat buckets (quintiles)
  statBucketResults: StatBucketResults;

  // By tag
  tagResults: TagResults;

  // DNF analysis
  dnfResults: DNFResults;

  // Pit stop analysis
  pitStopResults: PitStopResults;

  // Track analysis (if using 'all' tracks)
  trackResults: TrackResults;

  // Event analysis
  eventResults: EventResults;
}

// === STAT BUCKET ANALYSIS ===
// Group drivers into quintiles (1-5) based on their stat values

export interface StatBucket {
  bucket: 1 | 2 | 3 | 4 | 5;  // 1=lowest 20%, 5=highest 20%
  entries: number;            // How many driver-races in this bucket
  wins: number;
  podiums: number;
  pointsFinishes: number;     // Finished in top 10 (earned points)
  dnfs: number;
  totalFinishPosition: number; // Sum of finish positions (for averaging)
}

export interface StatBucketResults {
  // Driver stats - each mapped to 5 buckets
  speed: StatBucket[];
  consistency: StatBucket[];
  luck: StatBucket[];
  acceleration: StatBucket[];
  endurance: StatBucket[];
  aggression: StatBucket[];
  // Car stats
  carPower: StatBucket[];
  carGrip: StatBucket[];
  carReliability: StatBucket[];
  // Team stats
  pitCrew: StatBucket[];
  tireManagement: StatBucket[];
}

// === TAG ANALYSIS ===

export interface TagPerformance {
  tagId: string;
  tagName: string;
  tagEmoji: string;
  tagType: 'driver' | 'car' | 'team';
  appearances: number;        // How many driver-races with this tag
  wins: number;
  podiums: number;
  pointsFinishes: number;     // Finished in top 10 (earned points)
  dnfs: number;
  totalFinishPosition: number;
}

export interface TagResults {
  driverTags: TagPerformance[];
  carTags: TagPerformance[];
  teamTags: TagPerformance[];
}

// === DNF ANALYSIS ===

export interface DNFResults {
  totalDNFs: number;
  totalDriverRaces: number;   // For calculating rate
  byReason: {
    crash: number;
    mechanical: number;
    tire_failure: number;
  };
  // Which portion of race are most dangerous?
  byRacePhase: {
    early: number;    // First 33% of race (by lap)
    mid: number;      // Middle 33% of race
    late: number;     // Final 33% of race
  };
  // Safety car stats
  safetyCars: {
    totalDeployments: number;
    racesWithSafetyCar: number;
    totalLapsUnderSC: number;
    totalRaceLaps: number;  // For calculating % of laps under SC
  };
}

// === PIT STOP ANALYSIS ===

export interface PitStopResults {
  totalPitStops: number;
  totalRaces: number;
  slowStops: number;
  quickStops: number;
  // Compound usage counts
  compoundUsage: {
    soft: number;
    medium: number;
    hard: number;
  };
  // Winner analysis
  winnerTotalPitStops: number;
  winnerRaces: number;
  // Tire stint analysis
  tireStints: {
    soft: { totalLaps: number; stintCount: number; blowouts: number };
    medium: { totalLaps: number; stintCount: number; blowouts: number };
    hard: { totalLaps: number; stintCount: number; blowouts: number };
  };
  // Starting tire performance
  startingTirePerformance: {
    soft: { starts: number; wins: number; podiums: number; pointsFinishes: number; dnfs: number };
    medium: { starts: number; wins: number; podiums: number; pointsFinishes: number; dnfs: number };
    hard: { starts: number; wins: number; podiums: number; pointsFinishes: number; dnfs: number };
  };
}

// === EVENT ANALYSIS ===
// Track how events affect driver performance

export interface EventPerformance {
  eventId: string;              // Unique ID (track event id or tag id)
  eventName: string;            // Display name
  eventEmoji: string;           // Emoji for display
  eventSource: 'track' | 'tag'; // Where this event comes from
  tagType?: 'driver' | 'car' | 'team'; // If source is 'tag'
  description?: string;         // What the event does
  flavorText?: string;          // Flavor text for the event

  // Occurrences
  totalTriggers: number;        // How many times this event fired
  racesTriggered: number;       // How many races had this event fire at least once

  // Affected driver performance (drivers who received the effect)
  affectedDriverRaces: number;  // Total driver-races affected by this event
  affectedWins: number;         // Wins by affected drivers (in races they were affected)
  affectedPodiums: number;      // Podiums by affected drivers
  affectedPointsFinishes: number; // Points finishes by affected drivers
  affectedDNFs: number;         // DNFs by affected drivers
  affectedTotalPosition: number; // Sum of finish positions (for averaging)

  // Unaffected driver performance (drivers in races where event fired, but weren't affected)
  unaffectedDriverRaces: number;
  unaffectedWins: number;
  unaffectedPodiums: number;
  unaffectedPointsFinishes: number;
  unaffectedDNFs: number;
  unaffectedTotalPosition: number;

  // Impact classification from RaceEvent
  positiveImpacts: number;      // How many times it was positive
  negativeImpacts: number;      // How many times it was negative
  neutralImpacts: number;       // How many times it was neutral
}

export interface EventResults {
  // Track events (one per track)
  trackEvents: EventPerformance[];
  // Tag events (tags that trigger during races)
  tagEvents: EventPerformance[];
}

// === TRACK ANALYSIS ===

export interface TrackPerformance {
  trackId: string;
  trackName: string;
  trackEmoji: string;
  racesRun: number;
  totalDNFs: number;
  dnfBreakdown: {
    crash: number;
    mechanical: number;
    tire_failure: number;
  };
  totalFinishers: number;
  totalLeadChanges: number;
  totalTicks: number;       // For average race time
  eventName: string;
  eventEmoji: string;
  eventDescription: string;
  eventFlavorText: string;
}

export interface TrackResults {
  tracks: TrackPerformance[];
}

// === ACCUMULATOR TYPES (used during simulation) ===

export interface SimLabAccumulators {
  totalRaces: number;
  totalDriverRaces: number;

  // Stat buckets: statName -> bucket (1-5) -> accumulator
  statBuckets: Record<string, Map<number, StatBucket>>;

  // Tags: tagId -> accumulator
  tagAccumulators: Map<string, TagPerformance>;

  // DNF tracking
  dnfByReason: { crash: number; mechanical: number; tire_failure: number };
  dnfByPhase: { early: number; mid: number; late: number };

  // Safety car tracking
  safetyCars: { totalDeployments: number; racesWithSafetyCar: number; totalLapsUnderSC: number; totalRaceLaps: number };

  // Pit stops
  pitStopCount: number;
  slowStopCount: number;
  quickStopCount: number;
  compoundUsage: { soft: number; medium: number; hard: number };
  winnerPitStops: number;
  winnerCount: number;

  // Tire stint tracking
  tireStints: {
    soft: { totalLaps: number; stintCount: number; blowouts: number };
    medium: { totalLaps: number; stintCount: number; blowouts: number };
    hard: { totalLaps: number; stintCount: number; blowouts: number };
  };

  // Starting tire performance
  startingTirePerformance: {
    soft: { starts: number; wins: number; podiums: number; pointsFinishes: number; dnfs: number };
    medium: { starts: number; wins: number; podiums: number; pointsFinishes: number; dnfs: number };
    hard: { starts: number; wins: number; podiums: number; pointsFinishes: number; dnfs: number };
  };

  // Tracks
  trackAccumulators: Map<string, TrackPerformance>;

  // Events
  eventAccumulators: Map<string, EventPerformance>;
  // Track which drivers were affected by events in each race (for performance correlation)
  currentRaceEventEffects: Map<number, { eventId: string; impact: 'positive' | 'negative' | 'neutral' }[]>;
}

// Helper type for driver with tags
export interface DriverWithTags {
  id: number;
  stats: {
    baseSpeed: number;
    consistency: number;
    luck: number;
    acceleration: number;
    endurance: number;
    aggression: number;
  };
  carStats?: {
    power: number;
    grip: number;
    reliability: number;
  };
  teamStats?: {
    pitCrew: number;
    tireManagement: number;
  };
  driverTag?: { id: string; name: string; emoji: string };
  carTag?: { id: string; name: string; emoji: string };
  teamTag?: { id: string; name: string; emoji: string };
}

// Points system (standard F1-style)
export const POINTS_SYSTEM = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

// === SIM VARIABLES (TUNABLE CONSTANTS) ===
// These represent the actual hardcoded values in RaceEngine that can be overridden

export interface TireCompoundConfig {
  speedBonus: number;      // Multiplier (1.08 = +8% for soft)
  wearRate: number;        // Higher = faster degradation
  criticalAt: number;      // Wear % when cliff starts (70 for soft)
  cliffSeverity: number;   // How harsh the cliff is (0.85 for soft)
  blowoutRisk: number;     // Base blowout chance per tick
}

export interface SimVariables {
  // === TIRE SYSTEM ===
  tires: {
    soft: TireCompoundConfig;
    medium: TireCompoundConfig;
    hard: TireCompoundConfig;
    // Degradation curve
    precliffStart: number;        // When pre-cliff penalty starts (40)
    precliffMaxPenalty: number;   // Max speed loss before critical (0.05 = 5%)
    cliffExponent: number;        // Exponential curve steepness (1.5)
    cliffMultiplier: number;      // Cliff severity multiplier (0.4)
    flatPenalty: number;          // Immediate penalty at critical (0.05)
    minSpeedFloor: number;        // Minimum speed multiplier (0.60)
    // Wear factors
    aggressionWearMultiplier: number; // How much aggression affects wear (0.4)
  };

  // === CRASH SYSTEM ===
  crashes: {
    baseCrashChance: number;          // Base probability when in proximity (0.0003)
    crashProximityThreshold: number;  // How close = crash risk (0.03 = 3% of lap)
    crashGracePeriod: number;         // Ticks before crashes can happen (50)
    // Survival rates
    initialSurvivalChance: number;    // Chance to survive initial collision (0.40)
    pileupParticipationChance: number; // Chance to join pileup (0.25)
    pileupSurvivalChance: number;     // Chance to survive pileup with damage (0.50)
    secondaryAccidentMultiplier: number; // Multiplier for secondary crash (10)
    // Modifiers
    consistencyFactor: number;        // How much low consistency increases risk (0.5)
    tireWearFactor: number;           // Tire wear crash modifier (200 divisor)
    luckReduction: number;            // Max luck crash reduction (0.3 = 30%)
    safetyCarsReduction: number;      // SC crash reduction (0.05 = 95% reduction)
  };

  // === MECHANICAL FAILURE ===
  mechanical: {
    baseFailureChance: number;        // Base mechanical failure per tick (0.0004)
    reliabilityBase: number;          // Base reliability protection (0.4)
    reliabilityPerStar: number;       // Added protection per star (0.2)
    luckBase: number;                 // Base luck factor (1.4)
    luckMultiplier: number;           // Luck reduction multiplier (0.75)
  };

  // === PIT SYSTEM ===
  pits: {
    basePitDuration: number;          // Base pit stop ticks (60)
    slowStopMultiplier: number;       // Slow stop time multiplier (1.5)
    quickStopMultiplier: number;      // Quick stop time multiplier (0.75)
    // Pit crew formulas
    slowStopBase: number;             // Base slow stop chance (0.42)
    slowStopPerStar: number;          // Slow stop reduction per star (0.07)
    quickStopBase: number;            // Base quick stop chance (0.03)
    quickStopPerStar: number;         // Quick stop bonus per star (0.05)
    // Pit window
    basePitChance: number;            // Base pit decision chance (0.20)
    wearPitBonus: number;             // Additional chance from wear (0.30)
    luckPitAdjustment: number;        // Luck pit timing adjustment (0.4)
  };

  // === PERFORMANCE FACTORS ===
  performance: {
    // Luck system
    luckProcChance: number;           // Chance for luck boost per tick (0.03)
    luckMinBoostBase: number;         // Base min boost (0.05)
    luckMinBoostPerStat: number;      // Min boost per luck point (0.125)
    luckMaxBoostBase: number;         // Base max boost (0.15)
    luckMaxBoostPerStat: number;      // Max boost per luck point (0.1875)
    // Endurance
    enduranceDecay: number;           // Base fatigue rate (0.1)
    enduranceMaxPenalty: number;      // Max fatigue penalty (0.15 = 15%)
    endurancePenaltyMultiplier: number; // Endurance penalty factor (0.5)
    // Damage
    damageSpeedPenalty: number;       // Speed multiplier when damaged (0.85)
  };

  // === CAR STAT FORMULAS ===
  carStats: {
    powerBase: number;                // Base power multiplier (0.88)
    powerPerStar: number;             // Power added per star (0.04)
    gripBase: number;                 // Base grip multiplier (0.775)
    gripPerStar: number;              // Grip added per star (0.075)
    reliabilityBase: number;          // Base reliability (0.4)
    reliabilityPerStar: number;       // Reliability per star (0.2)
    tireManagementBase: number;       // Base tire management (0.775)
    tireManagementPerStar: number;    // Tire management per star (0.075)
    pitCrewBase: number;              // Base pit crew (0.48)
    pitCrewPerStar: number;           // Pit crew per star reduction (0.08)
  };

  // === SAFETY CAR ===
  safetyCar: {
    targetGap: number;                // Target spacing between cars (0.16)
    cruiseSpeed: number;              // Normal SC speed (0.50)
    catchUpSpeed: number;             // Speed when catching up (0.65)
    unsafetyCarSpeed: number;         // Unsafety car per-tick speed (0.0035)
  };

  // === BLOWOUT SYSTEM ===
  blowouts: {
    riskExponent: number;             // Exponential curve (2)
    riskMultiplier: number;           // Max risk multiplier (4)
    aggressionBonus: number;          // Aggression blowout risk (0.5)
    safetyCarReduction: number;       // SC blowout reduction (0.02 = 98% reduction)
  };
}

// Default "Canon" values - the current hardcoded constants
export const CANON_VARIABLES: SimVariables = {
  tires: {
    soft: { speedBonus: 1.08, wearRate: 4.0, criticalAt: 70, cliffSeverity: 0.85, blowoutRisk: 0.0003 },
    medium: { speedBonus: 1.00, wearRate: 2.8, criticalAt: 75, cliffSeverity: 0.5, blowoutRisk: 0.0002 },
    hard: { speedBonus: 0.94, wearRate: 2.2, criticalAt: 80, cliffSeverity: 0.3, blowoutRisk: 0.0001 },
    precliffStart: 40,
    precliffMaxPenalty: 0.05,
    cliffExponent: 1.5,
    cliffMultiplier: 0.4,
    flatPenalty: 0.05,
    minSpeedFloor: 0.60,
    aggressionWearMultiplier: 0.4,
  },
  crashes: {
    baseCrashChance: 0.0001,
    crashProximityThreshold: 0.03,
    crashGracePeriod: 50,
    initialSurvivalChance: 0.70,
    pileupParticipationChance: 0.25,
    pileupSurvivalChance: 0.50,
    secondaryAccidentMultiplier: 10,
    consistencyFactor: 0.5,
    tireWearFactor: 200,
    luckReduction: 0.3,
    safetyCarsReduction: 0.05,
  },
  mechanical: {
    baseFailureChance: 0.00005,
    reliabilityBase: 0.4,
    reliabilityPerStar: 0.2,
    luckBase: 1.4,
    luckMultiplier: 0.75,
  },
  pits: {
    basePitDuration: 60,
    slowStopMultiplier: 1.5,
    quickStopMultiplier: 0.75,
    slowStopBase: 0.42,
    slowStopPerStar: 0.07,
    quickStopBase: 0.03,
    quickStopPerStar: 0.05,
    basePitChance: 0.20,
    wearPitBonus: 0.30,
    luckPitAdjustment: 0.4,
  },
  performance: {
    luckProcChance: 0.03,
    luckMinBoostBase: 0.05,
    luckMinBoostPerStat: 0.125,
    luckMaxBoostBase: 0.15,
    luckMaxBoostPerStat: 0.1875,
    enduranceDecay: 0.1,
    enduranceMaxPenalty: 0.15,
    endurancePenaltyMultiplier: 0.5,
    damageSpeedPenalty: 0.85,
  },
  carStats: {
    powerBase: 0.88,
    powerPerStar: 0.04,
    gripBase: 0.775,
    gripPerStar: 0.075,
    reliabilityBase: 0.4,
    reliabilityPerStar: 0.2,
    tireManagementBase: 0.775,
    tireManagementPerStar: 0.075,
    pitCrewBase: 0.48,
    pitCrewPerStar: 0.08,
  },
  safetyCar: {
    targetGap: 0.16,
    cruiseSpeed: 0.50,
    catchUpSpeed: 0.65,
    unsafetyCarSpeed: 0.0035,
  },
  blowouts: {
    riskExponent: 2,
    riskMultiplier: 4,
    aggressionBonus: 0.5,
    safetyCarReduction: 0.02,
  },
};

// Helper to deep clone variables
export function cloneVariables(vars: SimVariables): SimVariables {
  return JSON.parse(JSON.stringify(vars));
}

// === COMPARISON RESULTS ===
// Results from running Canon vs Heretic side by side

export interface ComparisonResults {
  canon: SimLabResults;
  heretic: SimLabResults;
  hereticVariables: SimVariables;  // What was changed
  variablesDiff: VariablesDiff[];  // Summary of what changed
}

export interface VariablesDiff {
  path: string;           // e.g., "tires.soft.wearRate"
  label: string;          // Human-readable label
  canonValue: number;
  hereticValue: number;
  percentChange: number;  // (heretic - canon) / canon * 100
}
