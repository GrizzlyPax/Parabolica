// === SIM LAB TYPES ===
// Shared types for worker communication and results aggregation

// === CONFIGURATION ===

export interface SimLabConfig {
  batchSize: number;           // 100, 250, 500, 1000
  chaosLevel: number;          // 0-1 (from RaceConfig)
  trackSelection: 'random' | 'all';  // Track selection mode
  // Note: totalLaps removed - uses track's hardcoded lap count
}

// === WORKER MESSAGES ===

// Main thread -> Worker
export type WorkerInMessage =
  | { type: 'START'; config: SimLabConfig }
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
  safetyCars: { totalDeployments: number; racesWithSafetyCar: number };

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
