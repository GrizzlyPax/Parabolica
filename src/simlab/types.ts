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

  // Weather analysis (distribution + condition-reactive tag splits)
  weatherResults: WeatherResults;

  // Track tag analysis (race-level: how each track character bends races)
  trackTagResults: TrackTagResults;

  // Event analysis
  eventResults: EventResults;

  // Field spread analysis
  fieldSpreadResults: FieldSpreadResults;
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

// === FIELD SPREAD ANALYSIS ===
// How spread out is the field at the finish?

export interface FieldSpreadResults {
  totalRaces: number;
  totalFinishers: number;           // Drivers who finished (not DNF)

  // Leader margin (gap from P1 to P2 at finish)
  leaderMarginTotal: number;        // Sum of P1-P2 gaps as % of lap (for averaging)
  leaderMarginRaces: number;        // Races where we could calculate (need 2+ finishers)

  // Lead lap finishers
  leadLapFinishers: number;         // Total drivers finishing on lead lap
  totalFinishersForLeadLap: number; // Total finishers in races with a leader

  // Winner stat profiles (sum of stat values for winners, to calculate averages)
  winnerStats: {
    speed: number;
    consistency: number;
    luck: number;
    acceleration: number;
    endurance: number;
    aggression: number;
    carPower: number;
    carGrip: number;
    carReliability: number;
    pitCrew: number;
    tireManagement: number;
  };
  winnerCount: number;              // For averaging winner stats
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

// === WEATHER ANALYSIS ===

export interface WeatherPerformance {
  weatherId: string;
  weatherName: string;
  weatherEmoji: string;
  races: number;
  driverRaces: number;
  dnfs: number;
  crashes: number;
  totalTicks: number;       // For average race duration per weather
}

/** A condition-reactive tag (e.g. Rain Dancer) split by whether its weather
 * condition was active that race — the "how does it do in its weather?" view. */
export interface ReactiveTagPerformance {
  tagId: string;
  tagName: string;
  tagEmoji: string;
  conditionId: string;       // the condition it reacts to (e.g. 'rain')
  inAppearances: number;     // driver-races where the condition was active
  inWins: number;
  outAppearances: number;    // driver-races where it was not
  outWins: number;
}

/** A tag's win rate broken out by weather — the full tag × weather matrix. */
export interface TagWeatherPerformance {
  tagId: string;
  tagName: string;
  tagEmoji: string;
  byWeather: { weatherId: string; appearances: number; wins: number }[];
}

export interface WeatherResults {
  weathers: WeatherPerformance[];
  reactiveTags: ReactiveTagPerformance[];
  tagWeatherMatrix: TagWeatherPerformance[];
}

// === TRACK TAG ANALYSIS ===

/** Race-level stats per track tag (track tags are field-wide, so the signal
 * is how they bend the whole race — DNFs, crashes, pace — not who wins). */
export interface TrackTagPerformance {
  tagId: string;
  tagName: string;
  tagEmoji: string;
  races: number;
  driverRaces: number;
  dnfs: number;
  crashes: number;
  totalTicks: number;
  totalLeadChanges: number;
}

export interface TrackTagResults {
  trackTags: TrackTagPerformance[];
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

  // Weather: weatherId -> distribution accumulator; reactive tags split by condition
  weatherAccumulators: Map<string, WeatherPerformance>;
  reactiveTagAccumulators: Map<string, ReactiveTagPerformance>;
  // Full tag × weather matrix: tagId -> weatherId -> { appearances, wins }
  tagWeatherAccumulators: Map<string, { tagId: string; tagName: string; tagEmoji: string; byWeather: Map<string, { appearances: number; wins: number }> }>;
  // Track tags: tagId -> race-level accumulator
  trackTagAccumulators: Map<string, TrackTagPerformance>;

  // Events
  eventAccumulators: Map<string, EventPerformance>;
  // Track which drivers were affected by events in each race (for performance correlation)
  currentRaceEventEffects: Map<number, { eventId: string; impact: 'positive' | 'negative' | 'neutral' }[]>;

  // Field spread tracking
  fieldSpread: {
    totalFinishers: number;
    leaderMarginTotal: number;      // Sum of P1-P2 gaps as % of lap
    leaderMarginRaces: number;      // Races with 2+ finishers
    leadLapFinishers: number;       // Drivers on lead lap
    totalFinishersForLeadLap: number;
    winnerStats: {
      speed: number;
      consistency: number;
      luck: number;
      acceleration: number;
      endurance: number;
      aggression: number;
      carPower: number;
      carGrip: number;
      carReliability: number;
      pitCrew: number;
      tireManagement: number;
    };
    winnerCount: number;
  };
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
    teamTireMgmtWearPerStar: number;  // Team tire mgmt wear scaling around 3★ neutral (0 = stat dormant)
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
    wearPitDenominator: number;       // Wear % that saturates the wear bonus (70)
    luckPitBase: number;              // Luck multiplier baseline before adjustment (1.2)
    luckPitAdjustment: number;        // Luck pit timing adjustment (0.4)
    lastPitLapBuffer: number;         // No non-critical stop with <= this many laps left (2)
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
    // Rebalance v1 (gated: 0 = legacy behavior, stat dormant)
    accelLaunchTicks: number;         // Window length for acceleration to matter (launch/pit exit/SC restart)
    accelEffect: number;              // How much of the accel stat applies in windows (0 = stat dormant)
    aggressionTrafficBoost: number;   // Max speed bonus for aggressive drivers in traffic (0 = no reward)
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
    targetGap: number;                // Target spacing between queued cars, in laps (0.02 ≈ 0.25s)
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

  // === DRIVER SPEED (Field Compression) ===
  driverSpeed: {
    speedStatMultiplier: number;      // How much driver speed stat matters (1.0 = full, 0.5 = half effect)
    consistencyWeight: number;        // How much consistency reduces variance (0.5)
    baseSpeedMin: number;             // Minimum base speed per tick (3)
    baseSpeedMax: number;             // Maximum base speed per tick (12)
  };

  // === BETTING ODDS (Marble Mode) ===
  // Weights calibrated to actual race outcomes - update when balance changes!
  betting: {
    // Strength calculation weights (should sum to 1.0)
    // These determine odds ranking - higher weight = more important for favorites
    strengthWeights: {
      carPower: number;       // Car power star rating impact
      consistency: number;    // Driver consistency stat impact
      speed: number;          // Driver speed stat impact
      pitCrew: number;        // Team pit crew rating impact
      carGrip: number;        // Car grip star rating impact
      luck: number;           // Driver luck stat impact
      carReliability: number; // Car reliability star rating impact
    };
    // Base payout multipliers per bet type
    baseMultipliers: {
      win: number;            // Picking the race winner
      podium: number;         // Picking a top 3 finish
      points: number;         // Picking a top 10 finish
      finishes: number;       // Picking that they finish (no DNF)
      dnf: number;            // Picking that they DNF
    };
    // Driver rating weights for vibe descriptors (should sum to 1.0)
    driverRatingWeights: {
      consistency: number;    // How much consistency affects rating
      speed: number;          // How much speed affects rating
      luck: number;           // How much luck affects rating
    };
  };
}

// Default "Canon" values - tuned for ~40% Lead Lap, ~22% DNF, compressed field
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
    teamTireMgmtWearPerStar: 0.03,      // Rebalance v2 (lab-verified Δ+2.0%): crews that preserve rubber
  },
  crashes: {
    baseCrashChance: 0.00008,           // Reduced from 0.0001 for stable DNF rate
    crashProximityThreshold: 0.025,     // Tighter proximity window
    crashGracePeriod: 50,
    initialSurvivalChance: 0.70,
    pileupParticipationChance: 0.15,    // Reduced pileup chaos
    pileupSurvivalChance: 0.55,         // Slightly better survival
    secondaryAccidentMultiplier: 10,
    consistencyFactor: 0.4,             // Reduced consistency crash impact
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
    wearPitDenominator: 70,
    luckPitBase: 1.2,
    luckPitAdjustment: 0.4,
    lastPitLapBuffer: 2,
  },
  performance: {
    luckProcChance: 0.045,              // Rebalance v2: more visible fortune (win-impact neutral, survival real)
    luckMinBoostBase: 0.02,             // Reduced luck boost range
    luckMinBoostPerStat: 0.125,
    luckMaxBoostBase: 0.08,             // Reduced luck boost range
    luckMaxBoostPerStat: 0.25,
    enduranceDecay: 0.1,
    enduranceMaxPenalty: 0.15,
    endurancePenaltyMultiplier: 0.5,
    damageSpeedPenalty: 0.85,
    accelLaunchTicks: 80,
    accelEffect: 0.5,                   // Rebalance v2 (lab-verified Δ+2.6%): launches, pit exits, SC restarts
    aggressionTrafficBoost: 0.10,       // Rebalance v2 (lab-verified Δ+1.4% with DNF cost intact): the gamble pays
  },
  carStats: {
    powerBase: 0.93,                    // Higher base, less per-star spread
    powerPerStar: 0.018,
    gripBase: 0.82,                     // Higher base, less per-star spread
    gripPerStar: 0.045,
    reliabilityBase: 0.4,
    reliabilityPerStar: 0.2,
    tireManagementBase: 0.8,            // Slightly higher base
    tireManagementPerStar: 0.06,        // Reduced spread
    pitCrewBase: 0.5,                   // Slightly higher base
    pitCrewPerStar: 0.07,               // Reduced spread
  },
  safetyCar: {
    // 0.02 laps ≈ a 0.25s gap at typical lap times. The old value (0.16 laps
    // per car!) demanded a multi-lap train that could never form, so the
    // controller collapsed the field onto a single point instead.
    targetGap: 0.02,
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
  driverSpeed: {
    speedStatMultiplier: 0.12,  // Heavy compression: speed stat has 12% effect (was 100%)
    consistencyWeight: 0.35,    // Reduced consistency impact
    baseSpeedMin: 5,            // Tighter speed range (was 3)
    baseSpeedMax: 10,           // Tighter speed range (was 12)
  },
  betting: {
    // Strength weights calibrated to SimLab Q1→Q5 win rate deltas:
    // Car Power: 7.6%, Consistency: 4.5%, Speed: 4.0%, Pit Crew: 1.4%, Grip: 0.6%, Luck: 0.3%
    strengthWeights: {
      carPower: 0.35,       // Strongest predictor (7.6% delta)
      consistency: 0.22,    // Second strongest (4.5% delta)
      speed: 0.18,          // Compressed field = less impact (4.0% delta)
      pitCrew: 0.10,        // Meaningful impact (1.4% delta)
      carGrip: 0.08,        // Minor impact (0.6% delta)
      luck: 0.04,           // Almost no impact (0.3% delta)
      carReliability: 0.03, // Minimal (negative delta actually)
    },
    baseMultipliers: {
      win: 10,              // 10× base for picking the winner
      podium: 4,            // 4× base for top 3
      points: 2,            // 2× base for top 10
      finishes: 1.5,        // 1.5× base for completing the race
      dnf: 3,               // 3× base for calling a DNF
    },
    driverRatingWeights: {
      consistency: 0.45,    // Consistency matters most for "vibe" rating
      speed: 0.35,          // Speed still matters but less dominant
      luck: 0.20,           // Luck adds flavor
    },
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
