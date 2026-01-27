import { Tag, getTagById } from './data/tags';
import { SimVariables, CANON_VARIABLES } from './simlab/types';

export interface DriverStats {
  baseSpeed: number;      // Base speed multiplier (0.85 - 1.15)
  consistency: number;    // How consistent they are (0.3 - 0.8)
  luck: number;           // Luck factor for random boosts (0.3 - 0.8)
  acceleration: number;   // How fast they accelerate from start (0.85 - 1.15)
  endurance: number;      // How well they maintain speed over laps (0.85 - 1.15)
  aggression: number;     // How risky they are with tire wear (0.3 - 0.8), higher = more risk/reward
}

// Car stats (1-5 stars each) - affects both drivers on the team
export interface CarStats {
  power: number;        // 1-5 stars - Multiplies with driver speed
  grip: number;         // 1-5 stars - Multiplies with driver consistency
  reliability: number;  // 1-5 stars - Reduces mechanical failure chance
}

// Team stats (1-5 stars each) - team operational quality
export interface TeamStats {
  tireManagement: number;  // 1-5 stars - Higher = more aggressive tire strategy (faster but more wear)
  pitCrew: number;         // 1-5 stars - Reduces chance of slow pit stops
}

export interface Driver {
  id: number;
  name: string;
  shortName: string;      // Abbreviated name for tight spaces
  emoji: string;          // Kingdom emoji avatar
  position: number;
  color: string;
  accentColor?: string;   // Secondary/accent team color
  stats: DriverStats;
  currentLap: number;
  lapTimes: number[];     // Time (in ticks) for each completed lap
  sectorTimes: number[];  // Cumulative race time (in ticks) at each sector crossing (S1, S2, S3, S1, S2, S3, ...)
  lastTickSpeed: number;  // Speed from the most recent tick (for debug display)
  lastTickFactors: TickFactors | null; // Breakdown of what affected speed
  // Extended info for generated drivers
  firstName?: string;
  lastName?: string;
  teamName?: string;
  kingdomId?: string;     // Reference to kingdom (team)
  driverSlot?: 1 | 2;     // 1 = primary driver, 2 = secondary driver
  backstory?: string;
  quirk?: string;
  // Car stats (shared by team)
  carStats?: CarStats;    // The car this driver is using (from their kingdom)
  carName?: string;       // Name of the car
  // Team stats (shared by team)
  teamStats?: TeamStats;  // Team operational stats (tire management, pit crew)
  // Tire/Pit/Crash state
  tireState: TireState;
  status: DriverStatus;
  pitStops: PitStopInfo[];
  hasPitted: boolean;
  usedCompounds: TireCompound[];  // Track which compounds have been used (for mandatory variety)
  dnfInfo: DNFInfo | null;
  pitProgress: number;      // 0-1 during pit stop (overall progress through pit lane)
  pitPhase: PitPhase | null;    // Current phase: entry (driving to box), stopped (pit work), exit (driving out)
  pitBoxPosition: number;       // 0-1 position along pit lane where this driver's pit box is
  pitWorkProgress: number;      // 0-1 progress through the stationary pit work phase
  currentPitWorkDuration: number;   // Duration of pit work (stationary part, affected by team stat)
  currentPitIsSlowStop: boolean; // Whether current pit stop is a slow stop
  currentPitIsQuickStop: boolean; // Whether current pit stop is a quick stop
  isDamaged: boolean;       // Survived a crash but with damage
  damageSpeedPenalty: number; // 0.85 if damaged (15% slower), 1.0 if undamaged
  // Final classification
  lapsBehind: number;       // How many laps behind the winner (0 = on lead lap)
  finishTick: number | null; // Tick when this driver was classified
  // Tags
  driverTag?: Tag;          // Optional driver tag
  carTag?: Tag;             // Optional car tag (shared by team)
  teamTag?: Tag;            // Optional team tag (shared by team)
}

export interface TickFactors {
  baseRoll: number;       // The raw random roll
  statsModifier: number;  // Modifier from driver stats
  consistencyEffect: number;
  luckBonus: number;
  enduranceFactor: number;
  tireModifier: number;   // Tire performance impact (1.0 = neutral, <1 = degraded)
  carPowerModifier: number;  // Car power multiplier (from car stats)
  carGripModifier: number;   // Car grip multiplier (affects consistency)
  trackEventModifier?: number; // Track event speed modifier (speed_boost/speed_penalty)
  finalSpeed: number;     // The resulting speed
}

export interface RaceConfig {
  totalLaps: number;              // How many laps to complete
  lapLength: number;              // Distance units per lap
  tickInterval: number;           // Ms between ticks
  baseSpeedMin: number;           // Minimum base speed per tick
  baseSpeedMax: number;           // Maximum base speed per tick
  consistencyWeight: number;      // How much consistency stat matters
  luckWeight: number;             // How much luck stat matters
  enduranceDecay: number;         // How much endurance matters per lap
  enableRandomEvents: boolean;    // Random boost/slowdown events
  randomEventChance: number;      // Probability of random event per tick (0-1)
  // Tire/Pit/Crash settings
  tireWearRate: number;           // Base wear per tick (default: 0.02)
  pitLaneSpeedLimit: number;      // Speed in pit lane (units/tick, much slower than racing)
  pitWorkBaseDuration: number;    // Base ticks for stationary pit work (tire change, etc.)
  mandatoryPitStops: number;      // Required stops (default: 1)
  crashProximityThreshold: number; // Track % for collision risk (default: 0.03)
  baseCrashChance: number;        // Crash probability when in proximity (default: 0.001)
  enableCrashes: boolean;         // Toggle crash system
  enableTireWear: boolean;        // Toggle tire wear system
}

export interface RaceState {
  totalTicks: number;
  currentLeader: number | null;
  leadChanges: number;
  raceFinished: boolean;
  finishOrder: number[];  // Driver IDs in order they finished
  winnerFinishTick: number | null;  // Tick when winner crossed the line (triggers final lap)
  winnerLap: number;  // The lap the winner was on when they finished
  // Unsafety Car state
  unsafetyCarActive: boolean;
  unsafetyCarPosition: number;  // Track position 0-1
  unsafetyCarLap: number;  // Current lap the Unsafety Car is on
  unsafetyCarLapsRemaining: number;  // Laps until it exits
  unsafetyCarWaitingForLeader: boolean;  // True while waiting at pit exit for leader
  unsafetyCarCooldownUntilLap: number;  // Can't deploy again until leader reaches this lap
}

// === TIRE SYSTEM TYPES ===

export type TireCompound = 'soft' | 'medium' | 'hard';

export interface TireState {
  compound: TireCompound;
  wear: number;           // 0-100 (0=fresh, 100=destroyed)
  lapsOnTires: number;
}

export interface TireCompoundProperties {
  speedBonus: number;     // Multiplier when fresh
  wearRate: number;       // How fast they degrade
  criticalAt: number;     // Wear % when performance cliff begins
  cliffSeverity: number;  // How steep the performance drop is (0-1, higher = steeper)
  blowoutRisk: number;    // Base blowout chance per tick when past critical (0-1)
}

export const TIRE_COMPOUNDS: Record<TireCompound, TireCompoundProperties> = {
  // Soft: Fast but SHORT-LIVED - only ~25% of race distance before critical
  // wearRate is now relative to race: higher = fewer laps before critical
  soft:   { speedBonus: 1.08, wearRate: 4.0, criticalAt: 70, cliffSeverity: 0.85, blowoutRisk: 0.0015 },
  // Medium: Balanced - ~35% of race distance before critical
  medium: { speedBonus: 1.00, wearRate: 2.8, criticalAt: 75, cliffSeverity: 0.5, blowoutRisk: 0.0008 },
  // Hard: Slow but durable - ~45% of race distance before critical
  hard:   { speedBonus: 0.94, wearRate: 2.2, criticalAt: 80, cliffSeverity: 0.3, blowoutRisk: 0.0003 }
};

// === DRIVER STATUS TYPES ===

export type DriverStatus = 'racing' | 'pitting' | 'finished' | 'dnf';

// Pit stop phases: entry (driving to box), stopped (pit work), exit (driving to pit exit)
export type PitPhase = 'entry' | 'stopped' | 'exit';

export type DNFReason = 'crash' | 'mechanical' | 'tire_failure';

export interface DNFInfo {
  reason: DNFReason;
  tick: number;
  lap: number;
  involvedDriverIds?: number[];
}

export interface PitStopInfo {
  lap: number;
  tick: number;
  duration: number;
  tiresBefore: TireCompound;
  tiresAfter: TireCompound;
  wasSlowStop: boolean;  // True if pit crew fumbled
}

// Event types for the analytics system
export type RaceEventType =
  | 'luck_trigger'     // Luck bonus activated (luckBonus > 1)
  | 'endurance_decay'  // Endurance dropped below threshold
  | 'lap_complete'     // Driver finished a lap
  | 'lead_change'      // New race leader
  | 'overtake'         // Driver passed another
  | 'race_finish'      // Driver crossed finish line
  // Tire/Pit/Crash events
  | 'pit_entry'        // Driver enters pit lane
  | 'pit_exit'         // Driver exits with fresh tires
  | 'slow_pit_stop'    // Pit crew fumbled - double time
  | 'quick_pit_stop'   // Perfect pit stop - faster than normal
  | 'tire_warning'     // Tires at critical wear
  | 'tire_failure'     // Catastrophic failure (DNF)
  | 'mechanical_failure' // Engine/gearbox failure (DNF)
  | 'crash'            // Collision occurred
  | 'dnf'              // Driver retired
  | 'close_call'       // Near miss (drama)
  // Track events
  | 'track_event'      // Track event triggered
  | 'track_event_effect' // Effect from track event applied to driver
  // Tag events
  | 'tag_activation'   // A driver/car/team tag triggered
  // Unsafety Car events
  | 'unsafety_car_deployed'  // The Unsafety Car has been deployed
  | 'unsafety_car_recalled'; // The Unsafety Car is returning to the void

export interface RaceEvent {
  tick: number;
  type: RaceEventType;
  driverId: number;
  driverName: string;
  emoji: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
  magnitude: number;  // 0-1 significance
}

// Track info for display purposes
import type { TrackEventTrigger, TrackEventEffect } from './generators/tracks';

export interface TrackInfo {
  id: string;
  name: string;
  emoji: string;
  funEmoji: string;  // Theme/fun emoji for the track
  description: string;
  laps: number;
  // Layout info for rendering
  layout?: {
    trackPath: string;
    pitLanePath: string;
    straightStart: { x: number; y: number };
    straightEnd: { x: number; y: number };
    totalLength: number;
  };
  // Track event info (for display)
  event?: {
    id: string;
    name: string;
    emoji: string;
    description: string;
    flavorText: string;
  };
  // Full event data (for engine processing)
  eventTrigger?: TrackEventTrigger;
  eventEffect?: TrackEventEffect;
}

// Track active event state during race (legacy - kept for API compatibility)
export interface ActiveTrackEffect {
  effectType: string;
  affectedDriverIds: number[];
  expiresAtTick: number;
  speedModifier?: number;  // For speed_boost/speed_penalty
  crashRiskModifier?: number;  // For crash_risk
  pitDelayModifier?: number;  // For pit_delay
}

// === UNIFIED EFFECT SYSTEM ===
// Both tags and track events create effects through this unified interface
export interface ActiveEffect {
  id: string;                    // Unique effect ID
  source: 'track' | 'tag';       // Where it came from
  sourceId: string;              // e.g., "fog-rolls-in" or "clutch-performer"
  sourceName: string;            // Display name
  sourceEmoji: string;           // For UI
  affectedDriverIds: number[];   // Which drivers are affected (for track events)
  expiresAtTick: number | null;  // null = permanent (rest of race)

  // All modifiers (multiplicative except crashResistance which is additive)
  speedModifier: number;         // 1.0 = no change
  consistencyModifier: number;   // 1.0 = no change
  luckModifier: number;          // 1.0 = no change
  crashResistance: number;       // 0 = no change, +0.3 = 30% less likely, -0.25 = 25% more likely
  pitSpeedModifier: number;      // 1.0 = no change, 0.75 = 25% faster, 1.5 = 50% slower
}

type RaceListener = (drivers: Driver[]) => void;
type EventListener = (events: RaceEvent[]) => void;

// Default driver data (fallback when no generated roster)
// Stats use compressed ranges: baseSpeed/accel/endurance: 0.85-1.15, consistency/luck/aggression: 0.3-0.8
const DEFAULT_DRIVERS = [
  { name: "Nyarlathotep", emoji: "👁️", color: "#8B0000", stats: { baseSpeed: 1.10, consistency: 0.55, luck: 0.70, acceleration: 1.05, endurance: 0.92, aggression: 0.75 } },
  { name: "Cthulhu", emoji: "🐙", color: "#006400", stats: { baseSpeed: 0.98, consistency: 0.75, luck: 0.45, acceleration: 0.90, endurance: 1.12, aggression: 0.40 } },
  { name: "Azathoth", emoji: "🌀", color: "#00008B", stats: { baseSpeed: 1.14, consistency: 0.32, luck: 0.78, acceleration: 1.12, endurance: 0.88, aggression: 0.80 } },
  { name: "Yog-Sothoth", emoji: "🔮", color: "#4B0082", stats: { baseSpeed: 0.92, consistency: 0.80, luck: 0.38, acceleration: 0.94, endurance: 1.08, aggression: 0.35 } },
  { name: "Shub-Niggurath", emoji: "🐐", color: "#800080", stats: { baseSpeed: 1.02, consistency: 0.60, luck: 0.55, acceleration: 1.00, endurance: 1.00, aggression: 0.55 } },
  { name: "Hastur", emoji: "👑", color: "#008B8B", stats: { baseSpeed: 0.88, consistency: 0.68, luck: 0.80, acceleration: 0.88, endurance: 1.10, aggression: 0.45 } },
  { name: "Dagon", emoji: "🐟", color: "#B8860B", stats: { baseSpeed: 1.12, consistency: 0.42, luck: 0.48, acceleration: 1.14, endurance: 0.90, aggression: 0.70 } },
  { name: "Ithaqua", emoji: "❄️", color: "#2F4F4F", stats: { baseSpeed: 0.95, consistency: 0.72, luck: 0.62, acceleration: 0.92, endurance: 1.15, aggression: 0.38 } },
  { name: "Tsathoggua", emoji: "🦥", color: "#8B4513", stats: { baseSpeed: 1.08, consistency: 0.52, luck: 0.65, acceleration: 1.08, endurance: 0.94, aggression: 0.65 } },
  { name: "Ghatanothoa", emoji: "💀", color: "#191970", stats: { baseSpeed: 1.00, consistency: 0.65, luck: 0.58, acceleration: 0.98, endurance: 1.04, aggression: 0.50 } },
];

export const DEFAULT_CONFIG: RaceConfig = {
  totalLaps: 10,
  lapLength: 500,
  tickInterval: 100,
  baseSpeedMin: 3,
  baseSpeedMax: 12,
  consistencyWeight: 0.5,
  luckWeight: 0.3,
  enduranceDecay: 0.1,
  enableRandomEvents: true,
  randomEventChance: 0.05,
  // Tire/Pit/Crash defaults
  tireWearRate: 0.02,
  pitLaneSpeedLimit: 4,        // Units/tick in pit lane (much slower than racing ~7-8)
  pitWorkBaseDuration: 30,     // Base ticks for stationary pit work
  mandatoryPitStops: 2,
  crashProximityThreshold: 0.03,
  baseCrashChance: 0.0001,  // Reduced for realistic ~20% DNF rate
  enableCrashes: true,
  enableTireWear: true,
};

// Helper to select starting tires based on driver stats
function selectStartingTires(stats: DriverStats): TireCompound {
  if (stats.baseSpeed > 1.08) return 'soft';
  if (stats.endurance > 1.08) return 'hard';
  return 'medium';
}

type StateListener = (state: RaceState) => void;
type ConfigListener = (config: RaceConfig) => void;

class RaceEngine {
  private static instance: RaceEngine | null = null;
  private drivers: Driver[] = [];
  private listeners: Set<RaceListener> = new Set();
  private stateListeners: Set<StateListener> = new Set();
  private configListeners: Set<ConfigListener> = new Set();
  private eventListeners: Set<EventListener> = new Set();
  private intervalId: number | null = null;
  private isRunning = false;
  private config: RaceConfig = { ...DEFAULT_CONFIG };

  // Render throttling: cap UI updates to ~30fps regardless of simulation speed
  private lastNotifyTime: number = 0;
  private readonly MIN_NOTIFY_INTERVAL = 33; // ms (~30fps)
  private raceState: RaceState = {
    totalTicks: 0,
    currentLeader: null,
    leadChanges: 0,
    raceFinished: false,
    finishOrder: [],
    winnerFinishTick: null,
    winnerLap: 0,
    // Unsafety Car initial state
    unsafetyCarActive: false,
    unsafetyCarPosition: 0,
    unsafetyCarLap: 0,
    unsafetyCarLapsRemaining: 0,
    unsafetyCarWaitingForLeader: false,
    unsafetyCarCooldownUntilLap: 0,
  };
  private raceEvents: RaceEvent[] = [];
  private lapStartTick: Map<number, number> = new Map(); // driverId -> tick when current lap started
  private lastSector: Map<number, number> = new Map(); // driverId -> last sector (0=S1, 1=S2, 2=S3)
  private previousPositions: Map<number, number> = new Map(); // driverId -> previous rank (for overtake detection)
  private trackInfo: TrackInfo | null = null;

  // Track event state
  // Legacy track effects array (kept for getActiveTrackEffects() API compatibility)
  private activeTrackEffects: ActiveTrackEffect[] = [];

  // === UNIFIED EFFECT STORAGE ===
  // All effects (from tags and track events) go here
  private unifiedEffects: Map<number, ActiveEffect[]> = new Map();
  private trackEventTriggeredLaps: Set<number> = new Set();  // Laps where one-time events have triggered
  private lastEventCheckLap: number = 0;  // For interval-based triggers
  private leaderLapCount: Map<number, number> = new Map();  // Track how many laps each driver has led

  // Tag activation state - tracks which tags have activated and when
  private activeTagEffects: Map<number, { tagId: string; speedModifier: number; consistencyModifier: number; luckModifier: number; expiresAtTick: number | null }[]> = new Map();
  private tagActivatedThisRace: Set<string> = new Set();  // "driverId-tagId" to track one-time activations

  // Simulation variable overrides (for Sim Lab tuning)
  private simVars: SimVariables | null = null;

  private constructor() {
    this.initializeDrivers();
  }

  static getInstance(): RaceEngine {
    if (!RaceEngine.instance) {
      RaceEngine.instance = new RaceEngine();
    }
    return RaceEngine.instance;
  }

  // === SIM VARIABLE HELPERS ===
  // These methods return overridden values from simVars or fall back to hardcoded defaults

  private getTireCompound(compound: TireCompound): TireCompoundProperties {
    if (this.simVars) {
      const v = this.simVars.tires[compound];
      return {
        speedBonus: v.speedBonus,
        wearRate: v.wearRate,
        criticalAt: v.criticalAt,
        cliffSeverity: v.cliffSeverity,
        blowoutRisk: v.blowoutRisk,
      };
    }
    return TIRE_COMPOUNDS[compound];
  }

  private getCrashVars() {
    if (this.simVars) return this.simVars.crashes;
    return CANON_VARIABLES.crashes;
  }

  private getMechanicalVars() {
    if (this.simVars) return this.simVars.mechanical;
    return CANON_VARIABLES.mechanical;
  }

  // @ts-expect-error - Will be used for pit stop overrides
  private getPitVars() {
    if (this.simVars) return this.simVars.pits;
    return CANON_VARIABLES.pits;
  }

  // @ts-expect-error - Will be used for performance overrides
  private getPerformanceVars() {
    if (this.simVars) return this.simVars.performance;
    return CANON_VARIABLES.performance;
  }

  // @ts-expect-error - Will be used for car stat overrides
  private getCarStatVars() {
    if (this.simVars) return this.simVars.carStats;
    return CANON_VARIABLES.carStats;
  }

  private getTireVars() {
    if (this.simVars) return this.simVars.tires;
    return CANON_VARIABLES.tires;
  }

  private getBlowoutVars() {
    if (this.simVars) return this.simVars.blowouts;
    return CANON_VARIABLES.blowouts;
  }

  // @ts-expect-error - Will be used for safety car overrides
  private getSafetyCarVars() {
    if (this.simVars) return this.simVars.safetyCar;
    return CANON_VARIABLES.safetyCar;
  }

  private initializeDrivers(): void {
    this.drivers = DEFAULT_DRIVERS.map((d, index) => {
      const startingCompound = selectStartingTires(d.stats);
      return {
        id: index,
        name: d.name,
        shortName: d.name.slice(0, 10),
        emoji: d.emoji,
        position: 0,
        color: d.color,
        stats: { ...d.stats },
        currentLap: 0,
        lapTimes: [],
        sectorTimes: [],
        lastTickSpeed: 0,
        lastTickFactors: null,
        // Tire/Pit/Crash initial state
        tireState: {
          compound: startingCompound,
          wear: 0,
          lapsOnTires: 0,
        },
        status: 'racing' as DriverStatus,
        pitStops: [],
        hasPitted: false,
        usedCompounds: [startingCompound],  // Track starting compound
        dnfInfo: null,
        pitProgress: 0,
        pitPhase: null,
        pitBoxPosition: 0,  // Will be set after all drivers are created
        pitWorkProgress: 0,
        currentPitWorkDuration: 0,
        currentPitIsSlowStop: false,
        currentPitIsQuickStop: false,
        isDamaged: false,
        damageSpeedPenalty: 1.0,
        lapsBehind: 0,
        finishTick: null,
      };
    });
    // Assign pit box positions based on driver order (no teams for default drivers)
    this.assignPitBoxPositions();
    this.lapStartTick = new Map(this.drivers.map(d => [d.id, 0]));
    this.lastSector = new Map(this.drivers.map(d => [d.id, 0]));
  }

  // Assign pit box positions to all drivers
  private assignPitBoxPositions(): void {
    const positions = this.calculatePitBoxPositions(this.drivers);
    this.drivers.forEach(driver => {
      driver.pitBoxPosition = positions.get(driver.id) || 0.5;
    });
  }

  // Load a custom roster of generated drivers
  loadGeneratedRoster(roster: Array<{
    id: number;
    fullName: string;
    shortName: string;
    emoji: string;
    color: string;
    accentColor?: string;
    stats: DriverStats;
    firstName?: string;
    lastName?: string;
    teamName?: string;
    kingdomId?: string;
    driverSlot?: 1 | 2;
    backstory?: string;
    quirk?: string;
    carStats?: CarStats;
    carName?: string;
    teamStats?: TeamStats;
    driverTag?: Tag;
    carTag?: Tag;
    teamTag?: Tag;
  }>): void {
    this.stop();
    this.drivers = roster.map(d => {
      const startingCompound = selectStartingTires(d.stats);
      return {
        id: d.id,
        name: d.fullName,
        shortName: d.shortName,
        emoji: d.emoji,
        position: 0,
        color: d.color,
        accentColor: d.accentColor,
        stats: { ...d.stats },
        currentLap: 0,
        lapTimes: [],
        sectorTimes: [],
        lastTickSpeed: 0,
        lastTickFactors: null,
        firstName: d.firstName,
        lastName: d.lastName,
        teamName: d.teamName,
        kingdomId: d.kingdomId,
        driverSlot: d.driverSlot,
        backstory: d.backstory,
        quirk: d.quirk,
        carStats: d.carStats,
        carName: d.carName,
        teamStats: d.teamStats,
        driverTag: d.driverTag,
        carTag: d.carTag,
        teamTag: d.teamTag,
        // Tire/Pit/Crash initial state
        tireState: {
          compound: startingCompound,
          wear: 0,
          lapsOnTires: 0,
        },
        status: 'racing' as DriverStatus,
        pitStops: [],
        hasPitted: false,
        usedCompounds: [startingCompound],  // Track starting compound
        dnfInfo: null,
        pitProgress: 0,
        pitPhase: null,
        pitBoxPosition: 0,  // Will be set after all drivers are created
        pitWorkProgress: 0,
        currentPitWorkDuration: 0,
        currentPitIsSlowStop: false,
        currentPitIsQuickStop: false,
        isDamaged: false,
        damageSpeedPenalty: 1.0,
        lapsBehind: 0,
        finishTick: null,
      };
    });
    // Assign pit box positions based on team names (alphabetically)
    this.assignPitBoxPositions();
    this.lapStartTick = new Map(this.drivers.map(d => [d.id, 0]));
    this.lastSector = new Map(this.drivers.map(d => [d.id, 0]));
    this.previousPositions = new Map();
    this.raceState = {
      totalTicks: 0,
      currentLeader: null,
      leadChanges: 0,
      raceFinished: false,
      finishOrder: [],
      winnerFinishTick: null,
      winnerLap: 0,
      unsafetyCarActive: false,
      unsafetyCarPosition: 0,
      unsafetyCarLap: 0,
      unsafetyCarLapsRemaining: 0,
      unsafetyCarWaitingForLeader: false,
      unsafetyCarCooldownUntilLap: 0,
    };
    this.raceEvents = [];
    this.notifyListeners();
    this.notifyStateListeners();
    this.notifyEventListeners();
  }

  subscribe(listener: RaceListener): () => void {
    this.listeners.add(listener);
    listener(this.getDrivers());
    return () => this.listeners.delete(listener);
  }

  subscribeToState(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    listener(this.raceState);
    return () => this.stateListeners.delete(listener);
  }

  subscribeToConfig(listener: ConfigListener): () => void {
    this.configListeners.add(listener);
    listener(this.config);
    return () => this.configListeners.delete(listener);
  }

  subscribeToEvents(listener: EventListener): () => void {
    this.eventListeners.add(listener);
    listener(this.raceEvents);
    return () => this.eventListeners.delete(listener);
  }

  private notifyListeners(): void {
    const drivers = this.getDrivers();
    this.listeners.forEach(listener => listener(drivers));
  }

  private notifyStateListeners(): void {
    this.stateListeners.forEach(listener => listener({ ...this.raceState }));
  }

  private notifyConfigListeners(): void {
    this.configListeners.forEach(listener => listener({ ...this.config }));
  }

  private notifyEventListeners(): void {
    this.eventListeners.forEach(listener => listener([...this.raceEvents]));
  }

  private logEvent(
    type: RaceEventType,
    driver: Driver | null,
    description: string,
    impact: 'positive' | 'negative' | 'neutral',
    magnitude: number,
    eventEmoji?: string
  ): void {
    this.raceEvents.push({
      tick: this.raceState.totalTicks,
      type,
      driverId: driver?.id ?? -1,
      driverName: driver?.name ?? 'Track Event',
      emoji: eventEmoji || driver?.emoji || '🏁',
      description,
      impact,
      magnitude: Math.min(1, Math.max(0, magnitude)),
    });
  }

  // Calculate pit box positions for all drivers based on team names (alphabetical)
  // Returns a map of driver ID to pit box position (0-1 along pit lane)
  private calculatePitBoxPositions(drivers: Driver[]): Map<number, number> {
    // Get unique teams sorted alphabetically
    const teams = [...new Set(drivers.map(d => d.teamName || d.name))].sort();

    // Create a map of team name to index
    const teamIndex = new Map<string, number>();
    teams.forEach((team, idx) => teamIndex.set(team, idx));

    // Calculate pit box position for each driver
    // Pit boxes are distributed between 0.1 and 0.9 of the pit lane
    // (leaving room at entry/exit)
    const pitBoxPositions = new Map<number, number>();
    const totalSlots = drivers.length;
    const pitBoxStart = 0.15;  // Start 15% into pit lane
    const pitBoxEnd = 0.85;    // End 85% into pit lane
    const pitBoxRange = pitBoxEnd - pitBoxStart;

    // Sort drivers by team (alphabetically), then by driver slot
    const sortedDrivers = [...drivers].sort((a, b) => {
      const teamA = a.teamName || a.name;
      const teamB = b.teamName || b.name;
      if (teamA !== teamB) return teamA.localeCompare(teamB);
      // Within same team, primary driver (slot 1) comes first
      return (a.driverSlot || 1) - (b.driverSlot || 1);
    });

    // Assign pit box positions
    sortedDrivers.forEach((driver, idx) => {
      const position = pitBoxStart + (idx / (totalSlots - 1 || 1)) * pitBoxRange;
      pitBoxPositions.set(driver.id, position);
    });

    return pitBoxPositions;
  }

  // Get pit lane distance in track units (used for timing calculations)
  private getPitLaneDistance(): number {
    // Pit lane is approximately 30% of the track length
    return this.config.lapLength * 0.30;
  }

  getDrivers(): Driver[] {
    // Helper to calculate effective track position for a driver
    // Pitting drivers have a "virtual" position based on pit progress
    const getEffectivePosition = (driver: Driver): number => {
      if (driver.status !== 'pitting') {
        return driver.position;
      }

      // Pit lane maps: entry (85%) -> start/finish (100%/0% at 50% progress) -> exit (15%)
      // We use lapLength as the track length for calculations
      const lapLength = this.config.lapLength;
      const pitProgress = driver.pitProgress;

      if (pitProgress <= 0.5) {
        // First half: 85% -> 100% of lap (entry to start/finish)
        // Map 0-0.5 progress to 0.85-1.0 position
        const progressRatio = pitProgress / 0.5; // 0 to 1
        const positionRatio = 0.85 + (progressRatio * 0.15); // 0.85 to 1.0
        return Math.floor(positionRatio * lapLength);
      } else {
        // Second half: 0% -> 15% of lap (start/finish to exit)
        // Map 0.5-1.0 progress to 0.0-0.15 position
        const progressRatio = (pitProgress - 0.5) / 0.5; // 0 to 1
        const positionRatio = progressRatio * 0.15; // 0.0 to 0.15
        return Math.floor(positionRatio * lapLength);
      }
    };

    // Sort by: status (finished > racing/pitting > dnf), then laps, then effective position
    return [...this.drivers].sort((a, b) => {
      // DNF drivers go last
      if (a.status === 'dnf' && b.status !== 'dnf') return 1;
      if (b.status === 'dnf' && a.status !== 'dnf') return -1;

      // Finished drivers ranked by finish order
      if (a.status === 'finished' && b.status === 'finished') {
        const aPos = this.raceState.finishOrder.indexOf(a.id);
        const bPos = this.raceState.finishOrder.indexOf(b.id);
        if (aPos !== -1 && bPos !== -1) return aPos - bPos;
      }

      // Standard sort: laps then effective position
      // Racing and pitting drivers are now sorted together using effective position
      if (a.currentLap !== b.currentLap) {
        return b.currentLap - a.currentLap;
      }
      return getEffectivePosition(b) - getEffectivePosition(a);
    });
  }

  getConfig(): RaceConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<RaceConfig>): void {
    this.config = { ...this.config, ...updates };
    // If tick interval changed and race is running, restart the interval
    if (updates.tickInterval !== undefined && this.isRunning) {
      this.stop();
      this.start();
    }
    this.notifyConfigListeners();
  }

  getRaceState(): RaceState {
    return { ...this.raceState };
  }

  getEvents(): RaceEvent[] {
    return [...this.raceEvents];
  }

  getTrackLength(): number {
    return this.config.lapLength;
  }

  getTotalRaceDistance(): number {
    return this.config.lapLength * this.config.totalLaps;
  }

  setTrackInfo(info: TrackInfo): void {
    this.trackInfo = info;
  }

  getTrackInfo(): TrackInfo | null {
    return this.trackInfo;
  }

  // Get the most recent track event (for notifications)
  getLatestTrackEvent(): RaceEvent | null {
    const trackEvents = this.raceEvents.filter(e => e.type === 'track_event');
    return trackEvents.length > 0 ? trackEvents[trackEvents.length - 1] : null;
  }

  // Get active track effects
  getActiveTrackEffects(): ActiveTrackEffect[] {
    return [...this.activeTrackEffects];
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastNotifyTime = 0; // Reset throttle on race start

    this.intervalId = window.setInterval(() => {
      this.tick();
    }, this.config.tickInterval);
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  reset(): void {
    this.stop();
    // Reset driver race state without replacing the roster
    this.drivers = this.drivers.map(d => {
      const startingCompound = selectStartingTires(d.stats);
      return {
        ...d,
        position: 0,
        currentLap: 0,
        lapTimes: [],
        sectorTimes: [],
        lastTickSpeed: 0,
        lastTickFactors: null,
        tireState: {
          compound: startingCompound,
          wear: 0,
          lapsOnTires: 0,
        },
        status: 'racing' as DriverStatus,
        pitStops: [],
        hasPitted: false,
        usedCompounds: [startingCompound],
        dnfInfo: null,
        pitProgress: 0,
        pitPhase: null,
        // pitBoxPosition preserved from ...d spread
        pitWorkProgress: 0,
        currentPitWorkDuration: 0,
        currentPitIsSlowStop: false,
        currentPitIsQuickStop: false,
        isDamaged: false,
        damageSpeedPenalty: 1.0,
        lapsBehind: 0,
        finishTick: null,
      };
    });
    // Re-assign pit box positions in case roster changed
    this.assignPitBoxPositions();
    this.lapStartTick = new Map(this.drivers.map(d => [d.id, 0]));
    this.lastSector = new Map(this.drivers.map(d => [d.id, 0]));
    this.previousPositions = new Map();
    this.raceState = {
      totalTicks: 0,
      currentLeader: null,
      leadChanges: 0,
      raceFinished: false,
      finishOrder: [],
      winnerFinishTick: null,
      winnerLap: 0,
      unsafetyCarActive: false,
      unsafetyCarPosition: 0,
      unsafetyCarLap: 0,
      unsafetyCarLapsRemaining: 0,
      unsafetyCarWaitingForLeader: false,
      unsafetyCarCooldownUntilLap: 0,
    };
    this.raceEvents = [];
    // Reset track event state
    this.activeTrackEffects = [];
    this.trackEventTriggeredLaps = new Set();
    this.lastEventCheckLap = 0;
    this.leaderLapCount = new Map();
    // Reset tag activation state
    this.activeTagEffects = new Map();
    this.tagActivatedThisRace = new Set();
    // Reset unified effect storage
    this.unifiedEffects = new Map();
    this.notifyListeners();
    this.notifyStateListeners();
    this.notifyEventListeners();
  }

  private calculateSpeed(driver: Driver): TickFactors {
    const { baseSpeedMin, baseSpeedMax, consistencyWeight, enduranceDecay } = this.config;

    // Base random roll
    const baseRoll = Math.random();
    const baseSpeed = baseSpeedMin + baseRoll * (baseSpeedMax - baseSpeedMin);

    // === CAR STATS ===
    // Car power affects top speed (1 star = 0.92x, 5 stars = 1.08x)
    const carPower = driver.carStats?.power ?? 3; // Default to 3 stars if no car
    const carPowerModifier = 0.88 + carPower * 0.04; // 0.92, 0.96, 1.00, 1.04, 1.08

    // Car grip affects how much consistency helps (1 star = 0.85x, 5 stars = 1.15x)
    const carGrip = driver.carStats?.grip ?? 3;
    const carGripModifier = 0.775 + carGrip * 0.075; // 0.85, 0.925, 1.00, 1.075, 1.15

    // Stats modifier from driver's baseSpeed stat, multiplied by car power
    const statsModifier = driver.stats.baseSpeed * carPowerModifier;

    // Consistency effect: high consistency = less variance from the mean
    // Car grip multiplies the effectiveness of driver consistency
    const meanSpeed = (baseSpeedMin + baseSpeedMax) / 2;
    const variance = baseSpeed - meanSpeed;
    const effectiveConsistency = driver.stats.consistency * carGripModifier; // Grip boosts consistency
    const consistencyEffect = 1 - (variance * (1 - Math.min(1, effectiveConsistency)) * consistencyWeight);

    // Luck bonus: TIME-BASED proc (same chance for everyone each tick)
    // Driver's luck stat affects the MAGNITUDE of the boost, not the frequency
    // Tag/effect luck modifiers multiply the effective luck stat
    let luckBonus = 1;
    const luckProcChance = 0.03; // 3% chance per tick for everyone
    if (Math.random() < luckProcChance) {
      // Luck proc! Driver's luck stat determines how big the boost is
      // Apply luck modifier from tags/effects (e.g., Cursed Chassis has 0.7x luck)
      const effectiveLuck = driver.stats.luck * this.getTagLuckModifier(driver.id);
      // Low luck (0.3) = 5-15% boost, High luck (0.8) = 15-30% boost
      const minBoost = 0.05 + effectiveLuck * 0.125; // 0.0875 to 0.15
      const maxBoost = 0.15 + effectiveLuck * 0.1875; // 0.20625 to 0.30
      luckBonus = 1 + minBoost + Math.random() * (maxBoost - minBoost);
    }

    // Endurance factor: SOFTENED - speed degrades slightly over laps
    // Max penalty is now 15% instead of 50%
    const lapProgress = driver.currentLap / this.config.totalLaps;
    const baseEndurancePenalty = lapProgress * enduranceDecay * 0.5; // Halved base decay
    const enduranceResistance = driver.stats.endurance; // Higher = less penalty
    const actualPenalty = baseEndurancePenalty * (2 - enduranceResistance); // 0.85-1.15 stat
    const enduranceFactor = Math.max(0.85, 1 - actualPenalty); // Cap at 15% max penalty

    // Track event speed modifier (from active effects like speed_boost/speed_penalty)
    const trackEventModifier = this.getActiveSpeedModifier(driver.id);

    // Tag speed modifier (from activated tags)
    const tagSpeedModifier = this.getTagSpeedModifier(driver.id);
    const tagConsistencyModifier = this.getTagConsistencyModifier(driver.id);

    // Apply tag consistency modifier to the consistency effect
    const adjustedConsistencyEffect = consistencyEffect * tagConsistencyModifier;

    // Calculate final speed (car modifiers already incorporated into statsModifier and consistencyEffect)
    const finalSpeed = baseSpeed * statsModifier * adjustedConsistencyEffect * luckBonus * enduranceFactor * trackEventModifier * tagSpeedModifier;

    return {
      baseRoll,
      statsModifier,
      consistencyEffect,
      luckBonus,
      enduranceFactor,
      tireModifier: 1, // Placeholder, updated after tire calculation in tick()
      carPowerModifier,
      carGripModifier,
      trackEventModifier,
      finalSpeed: Math.max(1, finalSpeed), // Minimum speed of 1
    };
  }

  // === TIRE SYSTEM METHODS ===

  private getTireSpeedModifier(driver: Driver): number {
    if (!this.config.enableTireWear) return 1;

    const tire = driver.tireState;
    const compound = this.getTireCompound(tire.compound);
    const tireVars = this.getTireVars();

    // Fresh tire bonus from compound
    let modifier = compound.speedBonus;

    // Gradual degradation before cliff (gentle loss from precliffStart to critical)
    const precliffStart = tireVars.precliffStart;
    if (tire.wear > precliffStart && tire.wear < compound.criticalAt) {
      const wearInPrecliff = tire.wear - precliffStart;
      const precliffRange = compound.criticalAt - precliffStart;
      const precliffProgress = wearInPrecliff / precliffRange;
      // Lose up to precliffMaxPenalty speed gradually before cliff
      modifier -= precliffProgress * tireVars.precliffMaxPenalty;
    }

    // THE CLIFF: Compound-specific steep performance drop after critical wear
    if (tire.wear >= compound.criticalAt) {
      const wearBeyondCritical = tire.wear - compound.criticalAt;
      const remainingRange = 100 - compound.criticalAt;
      const cliffProgress = Math.min(1, wearBeyondCritical / remainingRange);

      // Cliff severity determines how harsh the drop is
      const cliffPenalty = Math.pow(cliffProgress, tireVars.cliffExponent) * compound.cliffSeverity * tireVars.cliffMultiplier;
      modifier -= cliffPenalty;

      // Additional flat penalty once in cliff zone
      modifier -= tireVars.flatPenalty;
    }

    // Apply damage penalty if car is damaged
    modifier *= driver.damageSpeedPenalty;

    // Floor at minSpeedFloor (allows for truly punishing degradation)
    return Math.max(tireVars.minSpeedFloor, modifier);
  }

  // Check if a driver's tires blow out this tick (returns true if blowout occurs)
  private checkTireBlowout(driver: Driver): boolean {
    if (!this.config.enableTireWear) return false;
    if (driver.status !== 'racing') return false;

    const blowoutVars = this.getBlowoutVars();

    // SAFETY CAR: Greatly reduce blowout risk - low speeds = less tire stress
    if (this.isUnderSafetyCar()) {
      if (Math.random() > blowoutVars.safetyCarReduction) return false;
    }

    const tire = driver.tireState;
    const compound = this.getTireCompound(tire.compound);

    // No risk until past critical wear
    if (tire.wear < compound.criticalAt) return false;

    // Calculate blowout probability based on how far past critical
    const wearBeyondCritical = tire.wear - compound.criticalAt;
    const remainingRange = 100 - compound.criticalAt;
    const riskProgress = wearBeyondCritical / remainingRange;

    // Risk scales exponentially: starts at base risk, can reach riskMultiplier at 100% wear
    const riskMultiplier = 1 + Math.pow(riskProgress, blowoutVars.riskExponent) * blowoutVars.riskMultiplier;
    const blowoutChance = compound.blowoutRisk * riskMultiplier;

    // Aggressive drivers have higher blowout risk
    const normalizedAggression = (driver.stats.aggression - 0.3) / 0.5; // 0 to 1
    const finalChance = blowoutChance * (1 + normalizedAggression * blowoutVars.aggressionBonus);

    return Math.random() < finalChance;
  }

  /**
   * Check for mechanical failure based on car reliability and driver luck
   * Base chance is very low but can be modified by:
   * - Car reliability (1-5 stars): Low reliability = more failures
   * - Driver luck: Unlucky drivers have worse mechanical fortune
   */
  private checkMechanicalFailure(driver: Driver): boolean {
    if (driver.status !== 'racing') return false;

    const mechVars = this.getMechanicalVars();
    const crashVars = this.getCrashVars();

    // SAFETY CAR: Greatly reduce mechanical failures - cars under less stress
    if (this.isUnderSafetyCar()) {
      if (Math.random() > crashVars.safetyCarsReduction) return false;
    }

    // Base mechanical failure chance per tick
    const baseMechanicalChance = mechVars.baseFailureChance;

    // Car reliability reduces failure chance
    const carReliability = driver.carStats?.reliability ?? 3;
    const reliabilityProtection = mechVars.reliabilityBase + carReliability * mechVars.reliabilityPerStar;

    // Driver luck also affects mechanical fortune
    const luckFactor = mechVars.luckBase - driver.stats.luck * mechVars.luckMultiplier;

    // Final chance: base / reliability * luck factor
    const finalChance = (baseMechanicalChance / reliabilityProtection) * luckFactor;

    return Math.random() < finalChance;
  }

  private calculateTireWear(driver: Driver): number {
    if (!this.config.enableTireWear) return 0;

    const compound = this.getTireCompound(driver.tireState.compound);
    const tireVars = this.getTireVars();

    // Calculate wear rate relative to total race distance
    const totalRaceDistance = this.config.totalLaps * this.config.lapLength;
    const distancePerTick = driver.lastTickSpeed || 10;

    // Base wear per tick = (100 / expected ticks to hit 100%) * compound rate
    const expectedTicksForRace = totalRaceDistance / distancePerTick;
    const baseWearPerTick = 100 / expectedTicksForRace;

    // Compound wear rate determines how fast they degrade relative to race distance
    const compoundWear = baseWearPerTick * compound.wearRate;

    // High aggression = pushes tires harder = more wear
    // Aggression ranges from 0.3 to 0.8, so normalize it
    const normalizedAggression = (driver.stats.aggression - 0.3) / 0.5; // 0 to 1
    const aggressionFactor = 1 + normalizedAggression * tireVars.aggressionWearMultiplier;

    return compoundWear * aggressionFactor;
  }

  // === PIT STOP METHODS ===

  // Pit lane entry/exit positions as fraction of lap (0-1)
  private readonly PIT_ENTRY_POSITION = 0.85; // Near end of lap
  private readonly PIT_EXIT_POSITION = 0.15;  // Early in lap

  private shouldDriverPit(driver: Driver): boolean {
    if (driver.status !== 'racing') return false;

    // Only check for pit entry when driver is near the pit entry point (85% of lap)
    const lapProgress = driver.position / this.config.lapLength;
    const atPitEntry = lapProgress >= this.PIT_ENTRY_POSITION && lapProgress < this.PIT_ENTRY_POSITION + 0.05;

    if (!atPitEntry) return false;

    // NO PITTING ON LAST LAP - too late!
    const isLastLap = driver.currentLap >= this.config.totalLaps - 1;
    if (isLastLap) {
      return false;
    }

    const compound = this.getTireCompound(driver.tireState.compound);
    const wearPercent = driver.tireState.wear;
    const pitStopsDone = driver.pitStops.length;
    const mandatoryStops = this.config.mandatoryPitStops;

    // Check if we need more stops for compound variety (must use all 3 compounds with 2 stops)
    const allCompounds: TireCompound[] = ['soft', 'medium', 'hard'];
    const usedCompounds = driver.usedCompounds || [];
    const compoundsRemaining = allCompounds.filter(c => !usedCompounds.includes(c)).length;
    const stopsRemaining = mandatoryStops - pitStopsDone;
    const mustPitForCompounds = compoundsRemaining > 0 && stopsRemaining > 0;

    // Force pit if tires critical (but not on last lap - handled above)
    if (wearPercent >= compound.criticalAt) {
      return true;
    }

    // Already done all mandatory stops and used all compounds? No need to pit again
    if (pitStopsDone >= mandatoryStops && compoundsRemaining === 0) {
      return false;
    }

    // Calculate pit windows for 2-stop strategy on 10 lap race:
    // Stop 1: Around lap 3-4 (first third)
    // Stop 2: Around lap 6-7 (second third)
    const aggressiveness = (driver.stats.baseSpeed - driver.stats.consistency) / 2;

    // For multiple stops, split race into segments
    const stopsNeeded = mandatoryStops - pitStopsDone;
    if (stopsNeeded <= 0) return false;

    // Calculate window for next stop
    const lapsRemaining = this.config.totalLaps - driver.currentLap;
    const segmentLength = lapsRemaining / (stopsNeeded + 1); // +1 for final stint
    const nextStopIdealLap = driver.currentLap + segmentLength;

    // Driver personality adjusts timing by ±1 lap
    const driverOffset = Math.floor(aggressiveness * 2);
    const adjustedIdealLap = Math.max(driver.currentLap + 1, nextStopIdealLap + driverOffset);

    // Window spans 2 laps around ideal
    const windowStart = Math.max(2, Math.floor(adjustedIdealLap) - 1);
    const windowEnd = Math.min(this.config.totalLaps - 2, Math.floor(adjustedIdealLap) + 1);

    const isInPitWindow = driver.currentLap >= windowStart && driver.currentLap <= windowEnd;

    // Force pit if we're in the last window for mandatory stops
    const lapsUntilTooLate = this.config.totalLaps - driver.currentLap - 2; // Can't pit in last 2 laps
    if (mustPitForCompounds && lapsUntilTooLate <= stopsRemaining) {
      return true; // Must pit now or won't complete mandatory stops
    }

    if (isInPitWindow) {
      // Higher wear = more likely to pit now
      // Base 20% chance, up to 50% at high wear
      const wearFactor = Math.min(1, wearPercent / 70);
      const pitChance = 0.20 + (wearFactor * 0.30);

      // Luck affects pit timing too - lucky drivers might wait longer
      const adjustedChance = pitChance * (1.2 - driver.stats.luck * 0.4);

      return Math.random() < adjustedChance;
    }

    return false;
  }

  // Calculate pit WORK duration (the stationary part where tires are changed)
  // This is separate from pit lane driving time which is based on speed limit
  private calculatePitWorkDuration(driver: Driver): { duration: number; isSlowStop: boolean; isQuickStop: boolean } {
    // Base duration for pit work (tire change, etc.)
    const baseDuration = this.config.pitWorkBaseDuration;

    // Check for slow/quick pit stop based on team's pit crew stat
    // Pit crew: 1 star = 35% slow / 8% quick, 5 stars = 7% slow / 28% quick
    const pitCrewStat = driver.teamStats?.pitCrew ?? 3;
    const slowStopChance = 0.42 - pitCrewStat * 0.07; // 35%, 28%, 21%, 14%, 7%
    const quickStopChance = 0.03 + pitCrewStat * 0.05; // 8%, 13%, 18%, 23%, 28%

    const roll = Math.random();
    const isSlowStop = roll < slowStopChance;
    const isQuickStop = !isSlowStop && roll < (slowStopChance + quickStopChance);

    let finalDuration = baseDuration;
    if (isSlowStop) {
      // Slow stop adds 50% more time to pit work
      finalDuration = Math.floor(baseDuration * 1.5);
    } else if (isQuickStop) {
      // Quick stop cuts pit work time by 25%
      finalDuration = Math.floor(baseDuration * 0.75);
    }

    // Apply pit speed modifier from tags/effects
    // < 1 = faster pits (e.g., Pit Lane Special 0.75x)
    // > 1 = slower pits (e.g., track pit_delay event)
    const pitModifier = this.getTagPitModifier(driver.id);
    finalDuration = Math.floor(finalDuration * pitModifier);

    return { duration: finalDuration, isSlowStop, isQuickStop };
  }

  // Calculate how much pit lane progress per tick based on speed limit
  private getPitLaneProgressPerTick(): number {
    // Pit lane distance is ~30% of track length
    const pitLaneDistance = this.getPitLaneDistance();
    // At pit lane speed limit, how much of the pit lane do we cover per tick?
    // pitProgress goes 0→1 over the full pit lane
    return this.config.pitLaneSpeedLimit / pitLaneDistance;
  }

  private selectNewTires(driver: Driver): TireCompound {
    const allCompounds: TireCompound[] = ['soft', 'medium', 'hard'];
    const usedCompounds = driver.usedCompounds || [];
    const remainingLaps = this.config.totalLaps - driver.currentLap;

    // Filter to compounds not yet used
    const unusedCompounds = allCompounds.filter(c => !usedCompounds.includes(c));

    // If all compounds used (shouldn't happen with 2 mandatory stops), pick based on stint length
    if (unusedCompounds.length === 0) {
      if (remainingLaps <= 2) return 'soft';
      if (remainingLaps <= 4) return 'medium';
      return 'hard';
    }

    // Must use an unused compound - pick strategically based on remaining laps
    if (remainingLaps <= 3 && unusedCompounds.includes('soft')) {
      return 'soft';  // Short sprint to finish
    }
    if (remainingLaps <= 5 && unusedCompounds.includes('medium')) {
      return 'medium';  // Medium stint
    }
    if (unusedCompounds.includes('hard')) {
      return 'hard';  // Long stint
    }
    // Fallback to whatever is unused
    return unusedCompounds[0];
  }

  // === CRASH DETECTION METHODS ===

  // Grace period at race start - no crashes for first 50 ticks (5 seconds)
  // This allows the pack to spread out from the grid
  private static readonly CRASH_GRACE_PERIOD = 50;

  private detectProximityPairs(): Array<[Driver, Driver]> {
    if (!this.config.enableCrashes) return [];

    // Grace period at race start - everyone starts bunched up
    if (this.raceState.totalTicks < RaceEngine.CRASH_GRACE_PERIOD) return [];

    const activeDrivers = this.drivers.filter(d => d.status === 'racing');
    const proximityPairs: Array<[Driver, Driver]> = [];

    for (let i = 0; i < activeDrivers.length; i++) {
      for (let j = i + 1; j < activeDrivers.length; j++) {
        const d1 = activeDrivers[i];
        const d2 = activeDrivers[j];

        // Must be on same lap
        if (d1.currentLap !== d2.currentLap) continue;

        // Calculate position difference as fraction of track
        const posDiff = Math.abs(d1.position - d2.position) / this.config.lapLength;

        if (posDiff < this.config.crashProximityThreshold) {
          proximityPairs.push([d1, d2]);
        }
      }
    }

    return proximityPairs;
  }

  private processCrashRisk(pair: [Driver, Driver]): { crashed: boolean; dnfDriverIds: number[]; damagedDriverIds: number[] } {
    const [d1, d2] = pair;
    const crashVars = this.getCrashVars();

    // Check if either driver has divine protection
    if (this.isDriverProtected(d1.id) || this.isDriverProtected(d2.id)) {
      return { crashed: false, dnfDriverIds: [], damagedDriverIds: [] };
    }

    // SAFETY CAR: Greatly reduce crash risk - everyone is going slow and single file
    if (this.isUnderSafetyCar()) {
      if (Math.random() > crashVars.safetyCarsReduction) {
        return { crashed: false, dnfDriverIds: [], damagedDriverIds: [] };
      }
    }

    // Base crash chance (from simVars if set, otherwise config)
    let crashChance = this.simVars ? crashVars.baseCrashChance : this.config.baseCrashChance;

    // Modifiers
    const avgConsistency = (d1.stats.consistency + d2.stats.consistency) / 2;
    crashChance *= (1 + (crashVars.consistencyFactor - avgConsistency)); // Low consistency = higher risk

    const avgTireWear = (d1.tireState.wear + d2.tireState.wear) / 2;
    crashChance *= (1 + avgTireWear / crashVars.tireWearFactor); // Worn tires = higher risk

    const avgLuck = (d1.stats.luck + d2.stats.luck) / 2;
    crashChance *= (1 - avgLuck * crashVars.luckReduction); // Luck can save you

    // Apply crash resistance from tags/effects (additive resistance, capped at -0.5 to +0.5)
    // Positive resistance = less likely to crash, negative resistance = more likely
    const avgCrashResistance = (this.getTagCrashResistance(d1.id) + this.getTagCrashResistance(d2.id)) / 2;
    crashChance *= (1 - avgCrashResistance);

    // Random roll
    if (Math.random() < crashChance) {
      // CRASH!
      const dnfDriverIds: number[] = [];
      const damagedDriverIds: number[] = [];

      // Initial collision - survival chance each
      for (const driver of [d1, d2]) {
        if (Math.random() < crashVars.initialSurvivalChance) {
          // Survives with damage
          damagedDriverIds.push(driver.id);
        } else {
          dnfDriverIds.push(driver.id);
        }
      }

      // At least one must DNF
      if (dnfDriverIds.length === 0) {
        // Move one from damaged to DNF
        const unlucky = damagedDriverIds.pop()!;
        dnfDriverIds.push(unlucky);
      }

      // Check for pileup - other nearby drivers
      const proximityThreshold = this.simVars ? crashVars.crashProximityThreshold : this.config.crashProximityThreshold;
      const nearbyDrivers = this.drivers.filter(d =>
        d.status === 'racing' &&
        d.id !== d1.id &&
        d.id !== d2.id &&
        d.currentLap === d1.currentLap &&
        Math.abs(d.position - d1.position) / this.config.lapLength < proximityThreshold
      );

      // Only check up to 2 nearby drivers for pileup
      const pileupCandidates = nearbyDrivers.slice(0, 2);

      for (const nearby of pileupCandidates) {
        if (Math.random() < crashVars.pileupParticipationChance) {
          if (Math.random() < crashVars.pileupSurvivalChance) {
            damagedDriverIds.push(nearby.id);
          } else {
            dnfDriverIds.push(nearby.id);
          }
        }
      }

      return { crashed: true, dnfDriverIds, damagedDriverIds };
    }

    // Close call event (tension builder)
    if (Math.random() < crashChance * crashVars.secondaryAccidentMultiplier) {
      this.logEvent(
        'close_call',
        d1,
        `Nearly collided with ${d2.name}!`,
        'neutral',
        0.4
      );
    }

    return { crashed: false, dnfDriverIds: [], damagedDriverIds: [] };
  }

  // === TRACK EVENT SYSTEM ===

  /**
   * Check if the track event should trigger based on current race state
   */
  private shouldTrackEventTrigger(leaderLap: number): boolean {
    if (!this.trackInfo?.eventTrigger) return false;

    const trigger = this.trackInfo.eventTrigger;
    const totalLaps = this.config.totalLaps;

    switch (trigger.type) {
      case 'lap':
        // Trigger on specific laps (not repeating)
        if (trigger.laps.includes(leaderLap) && !this.trackEventTriggeredLaps.has(leaderLap)) {
          return true;
        }
        return false;

      case 'interval':
        // Trigger every N laps
        if (leaderLap > 0 && leaderLap % trigger.every === 0 && leaderLap !== this.lastEventCheckLap) {
          return true;
        }
        return false;

      case 'random':
        // Random chance per lap (check only once per lap transition)
        if (leaderLap !== this.lastEventCheckLap && Math.random() < trigger.chance) {
          return true;
        }
        return false;

      case 'halfway':
        // Trigger at halfway point
        const halfwayLap = Math.floor(totalLaps / 2);
        if (leaderLap === halfwayLap && !this.trackEventTriggeredLaps.has(halfwayLap)) {
          return true;
        }
        return false;

      case 'condition':
        // Special conditions
        if (trigger.condition === 'leader_3_laps') {
          // Check if any driver has led for 3 consecutive laps
          const currentLeaderId = this.raceState.currentLeader;
          if (currentLeaderId !== null) {
            const count = (this.leaderLapCount.get(currentLeaderId) || 0);
            if (count >= 3 && !this.trackEventTriggeredLaps.has(leaderLap)) {
              return true;
            }
          }
        }
        return false;

      case 'final_laps':
        // Trigger in final N laps
        const finalLapsStart = totalLaps - trigger.count;
        if (leaderLap >= finalLapsStart && !this.trackEventTriggeredLaps.has(leaderLap)) {
          return true;
        }
        return false;
    }
  }

  /**
   * Apply the track event effect to the race
   */
  private applyTrackEventEffect(): void {
    if (!this.trackInfo?.eventEffect || !this.trackInfo?.event) return;

    const effect = this.trackInfo.eventEffect;
    const event = this.trackInfo.event;
    const racingDrivers = this.drivers.filter(d => d.status === 'racing');

    // Log the event trigger - pass event name and flavor text separately, emoji as last param
    this.logEvent(
      'track_event',
      null,
      `${event.name}: ${event.flavorText}`,
      'neutral',
      1.0,
      event.emoji
    );

    // Sort drivers by position for targeting
    const sortedDrivers = [...racingDrivers].sort((a, b) => {
      const aDistance = a.currentLap * this.config.lapLength + a.position;
      const bDistance = b.currentLap * this.config.lapLength + b.position;
      return bDistance - aDistance;
    });

    const getTargets = (
      targets: string,
      count: number
    ): Driver[] => {
      switch (targets) {
        case 'bottom':
          return sortedDrivers.slice(-count);
        case 'top':
          return sortedDrivers.slice(0, count);
        case 'random':
          const shuffled = [...racingDrivers].sort(() => Math.random() - 0.5);
          return shuffled.slice(0, count);
        case 'leader':
          return sortedDrivers.slice(0, 1);
        case 'last':
          return sortedDrivers.slice(-count);
        default:
          return [];
      }
    };

    // All track events now use apply_tag through the unified effect system
    // Look up the condition tag
    const tag = getTagById(effect.triggerTag);
    if (!tag) {
      console.warn(`Track event references unknown tag: ${effect.triggerTag}`);
      return;
    }

    // Get target drivers based on effect targets
    const targets = getTargets(effect.targets, effect.count || 1);
    const durationTicks = effect.duration * 10;
    const expiresAt = this.raceState.totalTicks + durationTicks;
    const targetIds = targets.map(d => d.id);

    // Create effect using the tag's effects
    this.createTrackEffect(
      `${event.id}-${tag.id}`,
      `${event.name} (${tag.name})`,
      tag.emoji,
      targetIds,
      expiresAt,
      {
        speedModifier: tag.effects.speedModifier,
        consistencyModifier: tag.effects.consistencyModifier,
        luckModifier: tag.effects.luckModifier,
        crashResistance: tag.effects.crashResistance,
        pitSpeedModifier: tag.effects.pitSpeedModifier,
      }
    );

    // Log the event for each affected driver
    for (const driver of targets) {
      this.logEvent(
        'track_event_effect',
        driver,
        tag.activationText || `Affected by ${tag.name}`,
        tag.effects.speedModifier && tag.effects.speedModifier > 1 ? 'positive' :
        tag.effects.crashResistance && tag.effects.crashResistance < 0 ? 'negative' : 'neutral',
        0.7,
        tag.emoji
      );
    }
  }

  /**
   * Get speed modifier from active track effects for a specific driver
   */
  getActiveSpeedModifier(driverId: number): number {
    let modifier = 1;
    for (const effect of this.activeTrackEffects) {
      if (effect.affectedDriverIds.includes(driverId)) {
        if (effect.speedModifier !== undefined) {
          modifier *= effect.speedModifier;
        }
      }
    }
    return modifier;
  }

  /**
   * Get crash risk modifier from active track effects
   */
  getActiveCrashRiskModifier(): number {
    let modifier = 1;
    for (const effect of this.activeTrackEffects) {
      if (effect.crashRiskModifier !== undefined) {
        modifier *= effect.crashRiskModifier;
      }
    }
    return modifier;
  }

  /**
   * Clean up expired effects from all storage systems
   */
  private cleanupExpiredEffects(): void {
    // Clean up legacy track effects
    this.activeTrackEffects = this.activeTrackEffects.filter(
      effect => effect.expiresAtTick > this.raceState.totalTicks
    );

    // Clean up legacy tag effects
    for (const [driverId, effects] of this.activeTagEffects.entries()) {
      const activeEffects = effects.filter(e => e.expiresAtTick === null || e.expiresAtTick > this.raceState.totalTicks);
      if (activeEffects.length === 0) {
        this.activeTagEffects.delete(driverId);
      } else {
        this.activeTagEffects.set(driverId, activeEffects);
      }
    }

    // Clean up unified effect storage
    for (const [driverId, effects] of this.unifiedEffects.entries()) {
      const activeEffects = effects.filter(e => e.expiresAtTick === null || e.expiresAtTick > this.raceState.totalTicks);
      if (activeEffects.length === 0) {
        this.unifiedEffects.delete(driverId);
      } else {
        this.unifiedEffects.set(driverId, activeEffects);
      }
    }
  }

  // === TAG TRIGGER SYSTEM ===

  /**
   * Evaluate if a tag should trigger based on its trigger type and current race state
   */
  private shouldTagTrigger(driver: Driver, tag: Tag, context: { isOvertaking?: boolean; isPitting?: boolean; isFinalLap?: boolean; isRaceStart?: boolean; inCrashProximity?: boolean }): boolean {
    // Check if already activated (for non-passive tags)
    const activationKey = `${driver.id}-${tag.id}`;
    if (tag.trigger !== 'passive' && this.tagActivatedThisRace.has(activationKey)) {
      return false;
    }

    // Check trigger condition
    switch (tag.trigger) {
      case 'passive':
        // Passive tags are always "active" but we only log them once
        return !this.tagActivatedThisRace.has(activationKey);
      case 'race_start':
        return context.isRaceStart === true;
      case 'pit_stop':
        return context.isPitting === true;
      case 'overtake':
        return context.isOvertaking === true;
      case 'crash_proximity':
        return context.inCrashProximity === true;
      case 'final_lap':
        return context.isFinalLap === true;
      default:
        return false;
    }
  }

  /**
   * Attempt to activate a tag for a driver
   */
  private tryActivateTag(driver: Driver, tag: Tag, context: { isOvertaking?: boolean; isPitting?: boolean; isFinalLap?: boolean; isRaceStart?: boolean; inCrashProximity?: boolean }): boolean {
    if (!this.shouldTagTrigger(driver, tag, context)) {
      return false;
    }

    // Check trigger chance (default 100%)
    const triggerChance = tag.triggerChance ?? 1.0;
    if (Math.random() > triggerChance) {
      return false;
    }

    // Mark as activated
    const activationKey = `${driver.id}-${tag.id}`;
    this.tagActivatedThisRace.add(activationKey);

    // Determine effect duration (passive = rest of race, others = temporary)
    const duration = tag.trigger === 'passive' ? null : 200; // ~200 ticks for triggered effects
    const expiresAtTick = duration ? this.raceState.totalTicks + duration : null;

    // Add to unified effect system (includes all modifiers: speed, consistency, luck, crashResistance, pitSpeed)
    const effect = this.createTagEffect(tag, driver.id, expiresAtTick);
    this.addEffect(driver.id, effect);

    // Also add to legacy storage for backward compatibility
    const legacyEffects = this.activeTagEffects.get(driver.id) || [];
    legacyEffects.push({
      tagId: tag.id,
      speedModifier: tag.effects.speedModifier ?? 1,
      consistencyModifier: tag.effects.consistencyModifier ?? 1,
      luckModifier: tag.effects.luckModifier ?? 1,
      expiresAtTick,
    });
    this.activeTagEffects.set(driver.id, legacyEffects);

    // Only log event for non-passive tags (passive tags are always active, no need to announce)
    if (tag.trigger !== 'passive') {
      const activationText = tag.activationText || 'tag activated!';
      this.logEvent(
        'tag_activation',
        driver,
        `${tag.name}: ${activationText}`,
        tag.effects.speedModifier && tag.effects.speedModifier > 1 ? 'positive' :
          tag.effects.speedModifier && tag.effects.speedModifier < 1 ? 'negative' : 'neutral',
        0.7,
        tag.emoji
      );
    }

    return true;
  }

  /**
   * Check and activate tags for a driver based on current context
   */
  private evaluateDriverTags(driver: Driver, context: { isOvertaking?: boolean; isPitting?: boolean; isFinalLap?: boolean; isRaceStart?: boolean; inCrashProximity?: boolean }): void {
    // Check driver tag
    if (driver.driverTag) {
      this.tryActivateTag(driver, driver.driverTag, context);
    }
    // Check car tag
    if (driver.carTag) {
      this.tryActivateTag(driver, driver.carTag, context);
    }
    // Check team tag
    if (driver.teamTag) {
      this.tryActivateTag(driver, driver.teamTag, context);
    }
  }

  // === UNIFIED EFFECT SYSTEM METHODS ===

  /**
   * Add an effect to a driver using the unified effect system
   */
  private addEffect(driverId: number, effect: ActiveEffect): void {
    const effects = this.unifiedEffects.get(driverId) || [];
    effects.push(effect);
    this.unifiedEffects.set(driverId, effects);
  }

  /**
   * Create a unified effect from a tag
   */
  private createTagEffect(tag: Tag, driverId: number, expiresAtTick: number | null): ActiveEffect {
    return {
      id: `tag-${tag.id}-${driverId}-${this.raceState.totalTicks}`,
      source: 'tag',
      sourceId: tag.id,
      sourceName: tag.name,
      sourceEmoji: tag.emoji,
      affectedDriverIds: [driverId],
      expiresAtTick,
      speedModifier: tag.effects.speedModifier ?? 1,
      consistencyModifier: tag.effects.consistencyModifier ?? 1,
      luckModifier: tag.effects.luckModifier ?? 1,
      crashResistance: tag.effects.crashResistance ?? 0,
      pitSpeedModifier: tag.effects.pitSpeedModifier ?? 1,
    };
  }

  /**
   * Create a unified effect from a track event
   */
  private createTrackEffect(
    eventId: string,
    eventName: string,
    eventEmoji: string,
    driverIds: number[],
    expiresAtTick: number,
    modifiers: Partial<Pick<ActiveEffect, 'speedModifier' | 'consistencyModifier' | 'luckModifier' | 'crashResistance' | 'pitSpeedModifier'>>
  ): void {
    for (const driverId of driverIds) {
      this.addEffect(driverId, {
        id: `track-${eventId}-${driverId}-${this.raceState.totalTicks}`,
        source: 'track',
        sourceId: eventId,
        sourceName: eventName,
        sourceEmoji: eventEmoji,
        affectedDriverIds: driverIds,
        expiresAtTick,
        speedModifier: modifiers.speedModifier ?? 1,
        consistencyModifier: modifiers.consistencyModifier ?? 1,
        luckModifier: modifiers.luckModifier ?? 1,
        crashResistance: modifiers.crashResistance ?? 0,
        pitSpeedModifier: modifiers.pitSpeedModifier ?? 1,
      });
    }
  }

  /**
   * Get combined modifier for a driver from all active effects (multiplicative)
   */
  private getEffectModifier(driverId: number, modifier: 'speedModifier' | 'consistencyModifier' | 'luckModifier' | 'pitSpeedModifier'): number {
    const effects = this.unifiedEffects.get(driverId);
    if (!effects || effects.length === 0) return 1;

    let result = 1;
    for (const effect of effects) {
      result *= effect[modifier];
    }
    return result;
  }

  /**
   * Get combined crash resistance for a driver from all active effects (additive)
   */
  private getEffectCrashResistance(driverId: number): number {
    const effects = this.unifiedEffects.get(driverId);
    if (!effects || effects.length === 0) return 0;

    let result = 0;
    for (const effect of effects) {
      result += effect.crashResistance;
    }
    // Cap at reasonable bounds (-0.5 to +0.5)
    return Math.max(-0.5, Math.min(0.5, result));
  }

  // Legacy getters that now use unified system
  private getTagSpeedModifier(driverId: number): number {
    return this.getEffectModifier(driverId, 'speedModifier');
  }

  private getTagConsistencyModifier(driverId: number): number {
    return this.getEffectModifier(driverId, 'consistencyModifier');
  }

  private getTagLuckModifier(driverId: number): number {
    return this.getEffectModifier(driverId, 'luckModifier');
  }

  private getTagCrashResistance(driverId: number): number {
    return this.getEffectCrashResistance(driverId);
  }

  private getTagPitModifier(driverId: number): number {
    return this.getEffectModifier(driverId, 'pitSpeedModifier');
  }

  private tick(): void {
    this.raceState.totalTicks++;
    const previousLeader = this.raceState.currentLeader;

    // === TRACK EVENT SYSTEM ===
    // Clean up expired effects
    this.cleanupExpiredEffects();

    // === TAG TRIGGER EVALUATION ===
    const isRaceStart = this.raceState.totalTicks === 1;

    // Evaluate passive and race_start tags on first tick
    if (isRaceStart) {
      for (const driver of this.drivers) {
        this.evaluateDriverTags(driver, { isRaceStart: true });
      }
    }

    // Evaluate final_lap tags when entering final lap (check each driver individually)
    for (const driver of this.drivers) {
      if (driver.status === 'racing' && driver.currentLap >= this.config.totalLaps - 1) {
        this.evaluateDriverTags(driver, { isFinalLap: true });
      }
    }

    // === CRASH DETECTION (before movement) ===
    const proximityPairs = this.detectProximityPairs();
    const crashedThisTick: Set<number> = new Set();
    const damagedThisTick: Set<number> = new Set();

    for (const pair of proximityPairs) {
      // Skip if either driver already crashed this tick
      if (crashedThisTick.has(pair[0].id) || crashedThisTick.has(pair[1].id)) continue;

      // Evaluate crash_proximity tags for both drivers in proximity
      this.evaluateDriverTags(pair[0], { inCrashProximity: true });
      this.evaluateDriverTags(pair[1], { inCrashProximity: true });

      const result = this.processCrashRisk(pair);
      if (result.crashed) {
        result.dnfDriverIds.forEach(id => crashedThisTick.add(id));
        result.damagedDriverIds.forEach(id => damagedThisTick.add(id));

        // Log the crash event
        const involvedNames = [...result.dnfDriverIds, ...result.damagedDriverIds]
          .map(id => this.drivers.find(d => d.id === id)?.name)
          .filter(Boolean)
          .join(', ');
        this.logEvent(
          'crash',
          pair[0],
          `CRASH! Involving: ${involvedNames}`,
          'negative',
          1.0
        );

        // Check for pileup (2+ drivers involved) - deploy Unsafety Car
        const totalInvolved = result.dnfDriverIds.length + result.damagedDriverIds.length;
        if (totalInvolved >= 2) {
          this.deployUnsafetyCar(pair[0].currentLap);
        }
      }
    }

    // Apply crash results to drivers
    this.drivers = this.drivers.map(driver => {
      if (crashedThisTick.has(driver.id)) {
        this.logEvent('dnf', driver, 'Retired from the race due to crash damage', 'negative', 0.9, '💥');
        return {
          ...driver,
          status: 'dnf' as DriverStatus,
          dnfInfo: {
            reason: 'crash' as DNFReason,
            tick: this.raceState.totalTicks,
            lap: driver.currentLap,
            involvedDriverIds: Array.from(crashedThisTick),
          },
        };
      }
      if (damagedThisTick.has(driver.id) && !driver.isDamaged) {
        this.logEvent('crash', driver, 'Survived the crash but car is damaged (-15% speed)', 'negative', 0.6, '💥');
        return {
          ...driver,
          isDamaged: true,
          damageSpeedPenalty: 0.85,
        };
      }
      return driver;
    });

    // === UNSAFETY CAR PROCESSING ===
    // Process Unsafety Car movement if active
    this.processUnsafetyCar();

    // Track which drivers completed laps or finished this tick
    const lapCompletions: Array<{ driver: Driver; lap: number }> = [];
    // Track finishers with their final distance (to sort who truly finished first)
    const tickFinishers: Array<{ driverId: number; finalDistance: number }> = [];
    // Track drivers who crossed start/finish while in pit lane after winner finished
    const pitLapFinishers: Array<{ driverId: number; newLap: number; newLapTimes: number[]; lapsBehind: number; newPitProgress: number }> = [];

    this.drivers = this.drivers.map(driver => {
      // Skip DNF drivers
      if (driver.status === 'dnf') {
        return driver;
      }

      // Check if driver already finished the race
      if (driver.status === 'finished' || driver.currentLap >= this.config.totalLaps) {
        return { ...driver, status: 'finished' as DriverStatus };
      }

      // === PIT STOP HANDLING (Three-Phase System) ===
      // Phase 1: Entry - driving to pit box at speed limit
      // Phase 2: Stopped - stationary pit work (tire change)
      // Phase 3: Exit - driving from pit box to pit exit at speed limit
      if (driver.status === 'pitting') {
        const pitBoxPos = driver.pitBoxPosition;
        const progressPerTick = this.getPitLaneProgressPerTick();
        let newPitProgress = driver.pitProgress;
        let newPitPhase = driver.pitPhase;
        let newPitWorkProgress = driver.pitWorkProgress;

        // Determine which phase we're in and advance accordingly
        if (newPitPhase === 'entry') {
          // Driving to pit box at speed limit
          newPitProgress += progressPerTick;

          // Check if we've reached the pit box
          if (newPitProgress >= pitBoxPos) {
            newPitProgress = pitBoxPos; // Snap to pit box
            newPitPhase = 'stopped';
            newPitWorkProgress = 0;
          }
        } else if (newPitPhase === 'stopped') {
          // Stationary at pit box - advance pit work progress
          const workDuration = driver.currentPitWorkDuration || this.config.pitWorkBaseDuration;
          newPitWorkProgress += (1 / workDuration);

          // Check if pit work is complete
          if (newPitWorkProgress >= 1) {
            newPitWorkProgress = 1;
            newPitPhase = 'exit';
          }
        } else if (newPitPhase === 'exit') {
          // Driving from pit box to exit at speed limit
          newPitProgress += progressPerTick;
        }

        // Track lap/sector crossings
        // Start/finish line is at ~50% of pit lane (middle)
        const crossingThreshold = 0.5;
        const justCrossedStartFinish = driver.pitProgress < crossingThreshold && newPitProgress >= crossingThreshold;

        let newLap = driver.currentLap;
        const newLapTimes = [...driver.lapTimes];
        const newSectorTimes = [...driver.sectorTimes];

        if (justCrossedStartFinish) {
          // Crossed start/finish while in pit lane - increment lap
          const lapStartTick = this.lapStartTick.get(driver.id) || 0;
          const lapTime = this.raceState.totalTicks - lapStartTick;
          newLapTimes.push(lapTime);
          newLap = driver.currentLap + 1;
          this.lapStartTick.set(driver.id, this.raceState.totalTicks);

          // Record S3 completion time (crossing start/finish in pit lane)
          newSectorTimes.push(this.raceState.totalTicks);
          // Reset sector tracking for new lap
          this.lastSector.set(driver.id, 0);

          // Check if winner has already finished - if so, classify this driver as finished (lapped)
          if (this.raceState.winnerFinishTick !== null && !this.raceState.finishOrder.includes(driver.id)) {
            const lapsBehind = this.raceState.winnerLap - newLap;
            pitLapFinishers.push({
              driverId: driver.id,
              newLap,
              newLapTimes,
              lapsBehind,
              newPitProgress,
            });
          }
        }

        // Check if pit stop is complete (exited pit lane)
        if (newPitProgress >= 1 && newPitPhase === 'exit') {
          // Exit pit
          const newCompound = this.selectNewTires(driver);
          const totalPitDuration = this.raceState.totalTicks - (driver.pitStops.length > 0
            ? driver.pitStops[driver.pitStops.length - 1].tick
            : this.lapStartTick.get(driver.id) || 0);

          const pitStop: PitStopInfo = {
            lap: newLap,
            tick: this.raceState.totalTicks,
            duration: totalPitDuration,
            tiresBefore: driver.tireState.compound,
            tiresAfter: newCompound,
            wasSlowStop: driver.currentPitIsSlowStop || false,
          };

          const exitMessage = driver.currentPitIsSlowStop
            ? `Fresh ${newCompound} tires finally fitted after slow stop!`
            : `Fresh ${newCompound} tires fitted!`;
          this.logEvent('pit_exit', driver, exitMessage, 'positive', 0.5);

          // Exit at pit exit position (15% of lap = 0.15 * lapLength)
          const pitExitPosition = Math.floor(this.config.lapLength * this.PIT_EXIT_POSITION);

          // Add new compound to used compounds list
          const updatedUsedCompounds = driver.usedCompounds.includes(newCompound)
            ? driver.usedCompounds
            : [...driver.usedCompounds, newCompound];

          return {
            ...driver,
            status: 'racing' as DriverStatus,
            currentLap: newLap,
            lapTimes: newLapTimes,
            sectorTimes: newSectorTimes,
            position: pitExitPosition,
            pitProgress: 0,
            pitPhase: null,
            pitWorkProgress: 0,
            currentPitWorkDuration: 0,
            currentPitIsSlowStop: false,
            currentPitIsQuickStop: false,
            hasPitted: true,
            usedCompounds: updatedUsedCompounds,
            tireState: { compound: newCompound, wear: 0, lapsOnTires: 0 },
            pitStops: [...driver.pitStops, pitStop],
          };
        }

        // Still pitting - update state
        return {
          ...driver,
          currentLap: newLap,
          lapTimes: newLapTimes,
          sectorTimes: newSectorTimes,
          pitProgress: newPitProgress,
          pitPhase: newPitPhase,
          pitWorkProgress: newPitWorkProgress,
        };
      }

      // Check if driver should pit
      if (this.shouldDriverPit(driver)) {
        // Evaluate pit_stop tags when entering the pits
        this.evaluateDriverTags(driver, { isPitting: true });

        // Calculate pit WORK duration (stationary part) and slow/quick status
        const { duration, isSlowStop, isQuickStop } = this.calculatePitWorkDuration(driver);

        this.logEvent('pit_entry', driver, `Entering pit lane for tire change`, 'neutral', 0.4);

        // If slow stop, log it immediately so viewers know what's happening
        if (isSlowStop) {
          this.logEvent('slow_pit_stop', driver, `SLOW STOP!`, 'negative', 0.8);
        } else if (isQuickStop) {
          this.logEvent('quick_pit_stop', driver, `LIGHTNING STOP!`, 'positive', 0.7);
        }

        return {
          ...driver,
          status: 'pitting' as DriverStatus,
          pitProgress: 0,
          pitPhase: 'entry' as PitPhase,
          pitWorkProgress: 0,
          currentPitWorkDuration: duration,
          currentPitIsSlowStop: isSlowStop,
          currentPitIsQuickStop: isQuickStop,
        };
      }

      // === NORMAL RACING ===
      const factors = this.calculateSpeed(driver);

      // Apply tire speed modifier and track it for analytics
      const tireModifier = this.getTireSpeedModifier(driver);

      // Apply any active power effects (speed boost/penalty)
      const powerMultiplier = this.getSpeedMultiplierForDriver(driver.id);

      // Apply Unsafety Car speed limit if active and driver is behind it
      const unsafetyCarLimit = this.getUnsafetyCarSpeedLimit(driver);

      const adjustedSpeed = factors.finalSpeed * tireModifier * powerMultiplier * unsafetyCarLimit;

      // Update factors with tire modifier for analytics
      factors.tireModifier = tireModifier;

      let newPosition = driver.position + adjustedSpeed;
      let newLap = driver.currentLap;
      const newLapTimes = [...driver.lapTimes];

      // Calculate tire wear
      const wearIncrease = this.calculateTireWear(driver);
      const newTireWear = Math.min(100, driver.tireState.wear + wearIncrease);
      const compound = this.getTireCompound(driver.tireState.compound);

      // Tire warning event when entering critical zone
      if (newTireWear >= compound.criticalAt && driver.tireState.wear < compound.criticalAt) {
        const compoundName = driver.tireState.compound === 'soft' ? 'Softs' : driver.tireState.compound === 'medium' ? 'Mediums' : 'Hards';
        this.logEvent('tire_warning', driver, `${compoundName} are falling off the cliff! ${Math.floor(newTireWear)}% worn`, 'negative', 0.7);
      }

      // Check for tire blowout (uses new probability-based system)
      if (this.checkTireBlowout(driver)) {
        const compoundName = driver.tireState.compound.charAt(0).toUpperCase() + driver.tireState.compound.slice(1);
        this.logEvent('tire_failure', driver, `${compoundName} tire blowout! Pushed too hard on worn rubber`, 'negative', 1.0, '💨');
        return {
          ...driver,
          status: 'dnf' as DriverStatus,
          dnfInfo: { reason: 'tire_failure' as DNFReason, tick: this.raceState.totalTicks, lap: driver.currentLap },
        };
      }

      // Check for mechanical failure (affected by car reliability and driver luck)
      if (this.checkMechanicalFailure(driver)) {
        this.logEvent('mechanical_failure', driver, `Mechanical failure! Engine gave out`, 'negative', 1.0, '⚙️');
        return {
          ...driver,
          status: 'dnf' as DriverStatus,
          dnfInfo: { reason: 'mechanical' as DNFReason, tick: this.raceState.totalTicks, lap: driver.currentLap },
        };
      }

      // Log factor-based events (luck, chaos, endurance)
      if (factors.luckBonus > 1) {
        const bonus = ((factors.luckBonus - 1) * 100).toFixed(0);
        this.logEvent(
          'luck_trigger',
          driver,
          `Fortune smiled with a ${bonus}% speed boost`,
          'positive',
          (factors.luckBonus - 1) / 0.3
        );
      }

      if (factors.enduranceFactor < 0.95) {
        const fatigue = ((1 - factors.enduranceFactor) * 100).toFixed(0);
        this.logEvent(
          'endurance_decay',
          driver,
          `Fatigue setting in - ${fatigue}% speed reduction`,
          'negative',
          (1 - factors.enduranceFactor) / 0.15
        );
      }

      // === SECTOR TIMING ===
      // Sectors: S1 (0-33%), S2 (33-66%), S3 (66-100%)
      // Record cumulative race time when crossing sector boundaries
      const newSectorTimes = [...driver.sectorTimes];
      const lapLength = this.config.lapLength;
      const positionInLap = newPosition % lapLength;
      const lapProgress = positionInLap / lapLength;

      // Determine current sector (0=S1, 1=S2, 2=S3)
      const currentSector = lapProgress < 0.333 ? 0 : lapProgress < 0.666 ? 1 : 2;
      const prevSector = this.lastSector.get(driver.id) ?? 0;

      // Check for sector crossing (moving forward through sectors within a lap)
      // S1->S2: crossed 33% boundary
      // S2->S3: crossed 66% boundary
      // S3->S1: handled separately in lap completion (crossed 100%/0% boundary)
      if (prevSector === 0 && currentSector === 1) {
        // Crossed into S2 - record S1 time (cumulative race time at S1 completion)
        newSectorTimes.push(this.raceState.totalTicks);
      } else if (prevSector === 1 && currentSector === 2) {
        // Crossed into S3 - record S2 time
        newSectorTimes.push(this.raceState.totalTicks);
      }
      // Note: S3 completion (crossing start/finish) is recorded below in lap completion

      // Update last sector for next tick
      this.lastSector.set(driver.id, currentSector);

      // Check for lap completion
      if (newPosition >= this.config.lapLength) {
        newLap++;
        const lapStartTick = this.lapStartTick.get(driver.id) || 0;
        const lapTime = this.raceState.totalTicks - lapStartTick;
        newLapTimes.push(lapTime);
        this.lapStartTick.set(driver.id, this.raceState.totalTicks);

        // Record S3 completion time (crossing start/finish line)
        newSectorTimes.push(this.raceState.totalTicks);
        // Reset sector tracking for new lap
        this.lastSector.set(driver.id, 0);

        // Check if driver finished the race
        if (newLap >= this.config.totalLaps) {
          const finalDistance = newLap * this.config.lapLength + newPosition;
          newPosition = this.config.lapLength;
          if (!this.raceState.finishOrder.includes(driver.id)) {
            tickFinishers.push({ driverId: driver.id, finalDistance });
          }
        } else {
          newPosition = newPosition - this.config.lapLength;
          lapCompletions.push({ driver, lap: newLap });
        }
      }

      return {
        ...driver,
        position: newPosition,
        currentLap: newLap,
        lapTimes: newLapTimes,
        sectorTimes: newSectorTimes,
        lastTickSpeed: adjustedSpeed,
        lastTickFactors: factors,
        tireState: {
          ...driver.tireState,
          wear: newTireWear,
          lapsOnTires: newLap > driver.currentLap ? driver.tireState.lapsOnTires + 1 : driver.tireState.lapsOnTires,
        },
      };
    });

    // Sort finishers by distance (who went furthest = finished first) and add to finish order
    tickFinishers.sort((a, b) => b.finalDistance - a.finalDistance);
    const raceFinishes: Array<{ driver: Driver; position: number; lapsBehind: number }> = [];
    for (const finisher of tickFinishers) {
      this.raceState.finishOrder.push(finisher.driverId);
      const driverIndex = this.drivers.findIndex(d => d.id === finisher.driverId);
      if (driverIndex !== -1) {
        // If this is the first finisher (the winner), record the winning lap
        if (this.raceState.winnerFinishTick === null) {
          this.raceState.winnerFinishTick = this.raceState.totalTicks;
          this.raceState.winnerLap = this.config.totalLaps;
        }
        // Update driver with finish info
        this.drivers[driverIndex] = {
          ...this.drivers[driverIndex],
          status: 'finished' as DriverStatus,
          finishTick: this.raceState.totalTicks,
          lapsBehind: 0, // Finishers who complete all laps are on the lead lap
        };
        raceFinishes.push({ driver: this.drivers[driverIndex], position: this.raceState.finishOrder.length, lapsBehind: 0 });
      }
    }

    // After winner has finished, check if any lapped drivers completed their current lap
    // They should be classified as finished (lapped)
    if (this.raceState.winnerFinishTick !== null) {
      // Handle drivers who completed a lap on track
      for (const { driver, lap } of lapCompletions) {
        // This driver just completed a lap - if winner has finished, classify them
        if (!this.raceState.finishOrder.includes(driver.id) && driver.status !== 'dnf') {
          const lapsBehind = this.raceState.winnerLap - lap;
          this.raceState.finishOrder.push(driver.id);
          const driverIndex = this.drivers.findIndex(d => d.id === driver.id);
          if (driverIndex !== -1) {
            this.drivers[driverIndex] = {
              ...this.drivers[driverIndex],
              status: 'finished' as DriverStatus,
              finishTick: this.raceState.totalTicks,
              lapsBehind,
            };
            raceFinishes.push({ driver: this.drivers[driverIndex], position: -1, lapsBehind }); // Position set after re-sort
          }
        }
      }

      // Handle drivers who completed a lap while in the pit lane
      for (const { driverId, newLap, newLapTimes, lapsBehind } of pitLapFinishers) {
        if (!this.raceState.finishOrder.includes(driverId)) {
          this.raceState.finishOrder.push(driverId);
          const driverIndex = this.drivers.findIndex(d => d.id === driverId);
          if (driverIndex !== -1) {
            this.drivers[driverIndex] = {
              ...this.drivers[driverIndex],
              status: 'finished' as DriverStatus,
              currentLap: newLap,
              lapTimes: newLapTimes,
              finishTick: this.raceState.totalTicks,
              lapsBehind,
            };
            raceFinishes.push({ driver: this.drivers[driverIndex], position: -1, lapsBehind });
          }
        }
      }

      // Re-sort finishOrder: lead-lap finishers first (by finishTick), then lapped finishers
      // This ensures lapped cars don't get classified ahead of lead-lap cars still racing
      this.raceState.finishOrder.sort((aId, bId) => {
        const a = this.drivers.find(d => d.id === aId);
        const b = this.drivers.find(d => d.id === bId);
        if (!a || !b) return 0;
        // First sort by laps behind (fewer laps behind = better position)
        if (a.lapsBehind !== b.lapsBehind) {
          return a.lapsBehind - b.lapsBehind;
        }
        // Then by finish tick (earlier = better position)
        return (a.finishTick || 0) - (b.finishTick || 0);
      });

      // Update positions in raceFinishes for logging
      for (const finish of raceFinishes) {
        finish.position = this.raceState.finishOrder.indexOf(finish.driver.id) + 1;
      }
    }

    // Log lap completion events
    for (const { driver, lap } of lapCompletions) {
      this.logEvent(
        'lap_complete',
        driver,
        `Completed lap ${lap}`,
        'neutral',
        0.3
      );
    }

    // === TRACK EVENT TRIGGER CHECK ===
    // Find the leader's current lap for event triggering
    const sortedForEvent = [...this.drivers]
      .filter(d => d.status === 'racing')
      .sort((a, b) => {
        const aDistance = a.currentLap * this.config.lapLength + a.position;
        const bDistance = b.currentLap * this.config.lapLength + b.position;
        return bDistance - aDistance;
      });

    const leaderForEvent = sortedForEvent[0];
    if (leaderForEvent && lapCompletions.length > 0) {
      // Update leader lap count (for condition-based triggers)
      if (previousLeader === leaderForEvent.id) {
        this.leaderLapCount.set(leaderForEvent.id, (this.leaderLapCount.get(leaderForEvent.id) || 0) + 1);
      } else if (previousLeader !== null) {
        // Leader changed, reset counts
        this.leaderLapCount.set(leaderForEvent.id, 1);
      }

      // Check if any lap completions should trigger the track event
      const highestLapCompleted = Math.max(...lapCompletions.map(lc => lc.lap));

      // Only check event triggers once per lap (using leader's lap)
      if (highestLapCompleted > this.lastEventCheckLap) {
        if (this.shouldTrackEventTrigger(highestLapCompleted)) {
          this.applyTrackEventEffect();
          this.trackEventTriggeredLaps.add(highestLapCompleted);
        }
        this.lastEventCheckLap = highestLapCompleted;
      }
    }

    // Log race finish events
    for (const { driver, position, lapsBehind } of raceFinishes) {
      const suffix = position === 1 ? 'st' : position === 2 ? 'nd' : position === 3 ? 'rd' : 'th';
      const lappedText = lapsBehind > 0 ? ` (+${lapsBehind} Lap${lapsBehind > 1 ? 's' : ''})` : '';
      this.logEvent(
        'race_finish',
        driver,
        `Crossed the finish line in ${position}${suffix} place!${lappedText}`,
        position <= 3 ? 'positive' : 'neutral',
        position === 1 ? 1.0 : position <= 3 ? 0.7 : 0.4
      );
    }

    // Determine current leader and detect lead changes
    const sorted = this.getDrivers();
    const newLeader = sorted[0]?.id ?? null;
    if (newLeader !== previousLeader && previousLeader !== null && newLeader !== null) {
      this.raceState.leadChanges++;
      const leaderDriver = this.drivers.find(d => d.id === newLeader);
      if (leaderDriver) {
        this.logEvent(
          'lead_change',
          leaderDriver,
          `Seized the lead!`,
          'positive',
          0.8
        );
      }
    }
    this.raceState.currentLeader = newLeader;

    // Detect overtakes by comparing current positions to previous
    const currentRanks = new Map<number, number>();
    sorted.forEach((driver, index) => {
      currentRanks.set(driver.id, index + 1);
    });

    // Check for position changes (only log significant ones, not every tick)
    for (const driver of this.drivers) {
      const prevRank = this.previousPositions.get(driver.id);
      const currRank = currentRanks.get(driver.id);
      if (prevRank !== undefined && currRank !== undefined && prevRank > currRank) {
        const positionsGained = prevRank - currRank;

        // Evaluate overtake tags when a driver gains positions
        this.evaluateDriverTags(driver, { isOvertaking: true });

        if (positionsGained >= 2) {  // Only log if gained 2+ positions
          this.logEvent(
            'overtake',
            driver,
            `Surged forward ${positionsGained} positions!`,
            'positive',
            Math.min(1, positionsGained / 5)
          );
        }
      }
    }
    this.previousPositions = currentRanks;

    // Check if race is finished
    // Race ends when winner has finished AND all other drivers are either:
    // - finished (including lapped drivers who completed their current lap)
    // - DNF
    const allDone = this.drivers.every(d =>
      d.status === 'finished' ||
      d.status === 'dnf'
    );
    if (allDone && this.raceState.winnerFinishTick !== null) {
      this.raceState.raceFinished = true;
      this.stop();
    }

    // Keep only last 500 events to prevent memory issues
    if (this.raceEvents.length > 500) {
      this.raceEvents = this.raceEvents.slice(-500);
    }

    // Throttle UI updates to ~30fps for smooth rendering at high simulation speeds
    // Always notify on race finish to ensure final state is captured
    const now = performance.now();
    const shouldNotify = this.raceState.raceFinished ||
                         (now - this.lastNotifyTime >= this.MIN_NOTIFY_INTERVAL);

    if (shouldNotify) {
      this.lastNotifyTime = now;
      this.notifyListeners();
      this.notifyStateListeners();
      this.notifyEventListeners();
    }
  }

  isRaceRunning(): boolean {
    return this.isRunning;
  }

  // === UNSAFETY CAR SYSTEM ===
  // The Unsafety Car emerges from The Void when pileups occur

  private readonly UNSAFETY_CAR_SPEED = 0.0035;  // Brisk pace - SC periods should feel like a pause, not a crawl
  private readonly UNSAFETY_CAR_LAPS = 1;  // Stays out for 1 lap
  // Note: PIT_EXIT_POSITION and PIT_ENTRY_POSITION are defined in the pit stop section above

  private readonly UNSAFETY_CAR_COOLDOWN_LAPS = 3;  // Must wait 3 laps before SC can deploy again

  /**
   * Deploy the Unsafety Car from the pit exit
   * Called when a pileup (2+ drivers involved in crash) occurs
   */
  private deployUnsafetyCar(crashLap: number): void {
    // Don't deploy if already active
    if (this.raceState.unsafetyCarActive) return;
    // No Unsafety Car on opening lap (lap 0) - too chaotic
    if (crashLap <= 0) return;
    // No Unsafety Car in final lap
    if (crashLap >= this.config.totalLaps - 1) return;

    // Check cooldown - can't deploy if leader hasn't reached cooldown lap yet
    const leader = this.getLeader();
    if (leader && leader.currentLap < this.raceState.unsafetyCarCooldownUntilLap) {
      return;  // Still on cooldown
    }

    // Deploy at pit exit position
    // If leader has already passed pit exit, place SC on next lap so it's waiting ahead
    let deployLap = leader ? leader.currentLap : crashLap;
    if (leader) {
      const trackLength = this.config.lapLength;
      const leaderTrackPos = (leader.position % trackLength) / trackLength;
      if (leaderTrackPos > this.PIT_EXIT_POSITION) {
        // Leader already passed the pit exit, so SC waits on the next lap
        deployLap = leader.currentLap + 1;
      }
    }

    this.raceState.unsafetyCarActive = true;
    this.raceState.unsafetyCarPosition = this.PIT_EXIT_POSITION;
    this.raceState.unsafetyCarLap = deployLap;
    this.raceState.unsafetyCarLapsRemaining = this.UNSAFETY_CAR_LAPS;
    this.raceState.unsafetyCarWaitingForLeader = true;

    // Sentient deployment messages
    const deployMessages = [
      'The Unsafety Car stirs... It has been summoned.',
      'The Unsafety Car awakens. It is displeased.',
      'From The Void, the Unsafety Car emerges. It hungers.',
      'The Unsafety Car has noticed the chaos. It approves.',
      'The Unsafety Car rises. None shall pass.',
    ];
    const message = deployMessages[Math.floor(Math.random() * deployMessages.length)];

    this.logEvent(
      'unsafety_car_deployed',
      null,
      message,
      'neutral',
      1.0,
      '🕳️'
    );
  }

  /**
   * Process Unsafety Car movement and field bunching
   * Called each tick when the Unsafety Car is active
   */
  private processUnsafetyCar(): void {
    if (!this.raceState.unsafetyCarActive) return;

    const leader = this.getLeader();
    if (!leader) return;

    const trackLength = this.config.lapLength;
    const leaderTrackPos = (leader.position % trackLength) / trackLength;  // 0-1 position on track

    // If waiting for leader, check if leader has caught up
    if (this.raceState.unsafetyCarWaitingForLeader) {
      // Leader catches up when they reach the SC's position (within 2% of a lap)
      const leaderTotalDistance = leader.currentLap + leaderTrackPos;
      const unsafetyCarTotalDistance = this.raceState.unsafetyCarLap + this.raceState.unsafetyCarPosition;
      const catchingThreshold = 0.02;  // 2% of a lap

      // Leader must actually reach the waiting SC before it pulls out
      if (leaderTotalDistance >= unsafetyCarTotalDistance - catchingThreshold) {
        this.raceState.unsafetyCarWaitingForLeader = false;
        this.logEvent(
          'unsafety_car_deployed',
          null,
          'The Unsafety Car pulls out. Follow, if you dare.',
          'neutral',
          0.8,
          '🕳️'
        );
      }
      return;  // Don't move while waiting - SC stays stationary at pit exit
    }

    // Move the Unsafety Car slowly around the track
    const newPosition = this.raceState.unsafetyCarPosition + this.UNSAFETY_CAR_SPEED;

    if (newPosition >= 1.0) {
      // Completed a lap
      this.raceState.unsafetyCarPosition = newPosition - 1.0;
      this.raceState.unsafetyCarLap++;
      this.raceState.unsafetyCarLapsRemaining--;

      // Check if it's time to recall the Unsafety Car
      if (this.raceState.unsafetyCarLapsRemaining <= 0) {
        this.recallUnsafetyCar();
        return;
      }
    } else {
      this.raceState.unsafetyCarPosition = newPosition;
    }

    // Check if Unsafety Car should exit into pit lane (at pit entry)
    if (this.raceState.unsafetyCarLapsRemaining <= 0 &&
        this.raceState.unsafetyCarPosition >= this.PIT_ENTRY_POSITION) {
      this.recallUnsafetyCar();
    }
  }

  /**
   * Recall the Unsafety Car back to The Void
   */
  private recallUnsafetyCar(): void {
    // Set cooldown - SC can't deploy again until leader reaches this lap
    const leader = this.getLeader();
    const currentLeaderLap = leader ? leader.currentLap : this.raceState.unsafetyCarLap;
    this.raceState.unsafetyCarCooldownUntilLap = currentLeaderLap + this.UNSAFETY_CAR_COOLDOWN_LAPS;

    this.raceState.unsafetyCarActive = false;
    this.raceState.unsafetyCarPosition = 0;
    this.raceState.unsafetyCarLap = 0;
    this.raceState.unsafetyCarLapsRemaining = 0;
    this.raceState.unsafetyCarWaitingForLeader = false;

    // Sentient recall messages
    const recallMessages = [
      'The Unsafety Car retreats to The Void. For now.',
      'The Unsafety Car grows bored. It departs.',
      'Satisfied, the Unsafety Car returns to slumber.',
      'The Unsafety Car vanishes. It will remember this.',
      'The Void reclaims its champion. Racing resumes.',
    ];
    const message = recallMessages[Math.floor(Math.random() * recallMessages.length)];

    this.logEvent(
      'unsafety_car_recalled',
      null,
      message,
      'neutral',
      1.0,
      '🕳️'
    );
  }

  /**
   * Get the current leader (racing driver with most progress)
   */
  private getLeader(): Driver | null {
    const racingDrivers = this.drivers.filter(d => d.status === 'racing');
    if (racingDrivers.length === 0) return null;

    return racingDrivers.reduce((leader, driver) => {
      const leaderProgress = leader.currentLap * this.config.lapLength + leader.position;
      const driverProgress = driver.currentLap * this.config.lapLength + driver.position;
      return driverProgress > leaderProgress ? driver : leader;
    });
  }

  /**
   * Calculate speed limit under Unsafety Car conditions
   * Returns a multiplier (0-1) to apply to driver speed, or 1.0 if not affected
   *
   * REAL SAFETY CAR BEHAVIOR:
   * - Drivers race at FULL SPEED until they catch the back of the queue
   * - Once in the queue, maintain a GAP to the car ahead (not nose-to-tail)
   * - Lapped cars (not on lead lap) can unlap themselves by passing
   * - NO overtaking within the queue (except lapped cars unlapping)
   */
  getUnsafetyCarSpeedLimit(driver: Driver): number {
    if (!this.raceState.unsafetyCarActive) return 1.0;
    if (this.raceState.unsafetyCarWaitingForLeader) return 1.0;  // No limit while SC is waiting
    if (driver.status !== 'racing') return 1.0;

    const trackLength = this.config.lapLength;
    const driverTrackPos = (driver.position % trackLength) / trackLength;
    const driverTotalDistance = driver.currentLap + driverTrackPos;
    const unsafetyCarTotalDistance = this.raceState.unsafetyCarLap + this.raceState.unsafetyCarPosition;

    // Get the leader to determine lead lap
    const leader = this.getLeader();
    const leadLap = leader ? leader.currentLap : this.raceState.unsafetyCarLap;

    // LAPPED CARS CAN UNLAP: If driver is not on lead lap, they can pass at full speed
    if (driver.currentLap < leadLap) {
      return 1.0;  // Lapped car - can unlap at full speed
    }

    // Distance relative to SC: positive = driver is behind SC, negative = driver is ahead
    const distanceBehindSC = unsafetyCarTotalDistance - driverTotalDistance;

    // If we're ahead of the SC, slow down to let it catch up
    if (distanceBehindSC <= 0) {
      return 0.12;  // Very slow - let SC pass
    }

    // Find the car directly ahead of this driver
    const racingDrivers = this.drivers.filter(d => d.status === 'racing' && d.id !== driver.id);
    const driversSortedByProgress = racingDrivers.map(d => {
      const pos = (d.position % trackLength) / trackLength;
      return { driver: d, totalDistance: d.currentLap + pos };
    }).sort((a, b) => b.totalDistance - a.totalDistance);  // Descending (leader first)

    // Find the car immediately ahead of us (on lead lap only - ignore lapped cars)
    const carAhead = driversSortedByProgress.find(d =>
      d.totalDistance > driverTotalDistance && d.driver.currentLap >= leadLap
    );

    // UNIFORM GAP SYSTEM: All cars converge to exactly the same target gap
    // This creates a properly spaced train like a real safety car lineup
    const TARGET_GAP = 0.16;  // 16% of a lap - wider gaps prevent visual bunching
    const SC_CRUISE_SPEED = 0.50;  // Safety car cruise speed - ~50% race pace
    const CATCH_UP_SPEED = 0.65;  // Speed when the whole field is catching up to SC

    // Check if the leader is still catching up to the SC
    // If so, the ENTIRE field should be in catch-up mode, not just the leader
    const leaderData = driversSortedByProgress[0];
    let leaderGapToSC = 0;
    if (leaderData) {
      leaderGapToSC = unsafetyCarTotalDistance - leaderData.totalDistance;
    }
    const fieldIsCatchingUp = leaderGapToSC > TARGET_GAP * 1.5;  // Leader is > 18% behind SC

    // Get the gap we need to manage (either to car ahead or to SC if we're the leader)
    let currentGap: number;

    if (carAhead) {
      currentGap = carAhead.totalDistance - driverTotalDistance;

      // CRITICAL: If the field is still catching up to the SC, don't slow down
      // just because our gap to car ahead is "correct" - we need to follow the leader!
      if (fieldIsCatchingUp && currentGap <= TARGET_GAP * 1.5) {
        // Gap to car ahead is good, but leader is still catching SC
        // Match leader's catch-up speed so we don't fall behind
        return CATCH_UP_SPEED;
      }
    } else if (distanceBehindSC > 0) {
      // We're the leader - gap to safety car
      currentGap = distanceBehindSC;
    } else {
      // Something weird - just cruise
      return SC_CRUISE_SPEED;
    }

    // PROPORTIONAL SPEED CONTROL: Smoothly adjust speed based on gap error
    // Gap error = how far off from target we are
    const gapError = currentGap - TARGET_GAP;

    // If gap is perfect (within 1%), just cruise at SC speed
    if (Math.abs(gapError) < 0.01) {
      return SC_CRUISE_SPEED;
    }

    // If too close (gap < target): slow down
    // If too far (gap > target): speed up
    // The further from target, the more we adjust

    if (gapError < 0) {
      // TOO CLOSE - need to slow down to create space
      // More negative error = slower speed
      const closeness = Math.abs(gapError) / TARGET_GAP;  // 0 to 1+ (how close relative to target)

      if (closeness > 0.8) {
        return 0.10;  // Emergency brake - way too close
      } else if (closeness > 0.5) {
        return 0.18;  // Hard brake - quite close
      } else if (closeness > 0.2) {
        return 0.28;  // Light brake - a bit close
      } else {
        return 0.35;  // Slight slow - almost at target
      }
    } else {
      // TOO FAR - need to speed up to close the gap
      // GENTLE catch-up speeds - only slightly faster than cruise to prevent bunching
      const farness = gapError / TARGET_GAP;  // How far relative to target

      if (farness > 2.0) {
        return 0.60;  // Very far behind - close up
      } else if (farness > 1.0) {
        return 0.58;  // Pretty far - close up gently
      } else if (farness > 0.5) {
        return 0.55;  // Somewhat far - slight increase
      } else {
        return 0.52;  // Almost there - just above cruise
      }
    }
  }

  /**
   * Check if crashes should be suppressed during Safety Car
   * Returns true if crash risk should be greatly reduced
   */
  isUnderSafetyCar(): boolean {
    return this.raceState.unsafetyCarActive && !this.raceState.unsafetyCarWaitingForLeader;
  }

  /**
   * Get Unsafety Car state for UI rendering
   */
  getUnsafetyCarState(): {
    active: boolean;
    position: number;
    lap: number;
    waitingForLeader: boolean;
  } {
    return {
      active: this.raceState.unsafetyCarActive,
      position: this.raceState.unsafetyCarPosition,
      lap: this.raceState.unsafetyCarLap,
      waitingForLeader: this.raceState.unsafetyCarWaitingForLeader,
    };
  }

  // === ACTIVE EFFECTS SYSTEM ===
  // Used for temporary speed modifiers and crash protection

  private activeEffects: Map<number, { expiresAtTick: number; speedMultiplier: number; isProtected: boolean }> = new Map();

  // Called during tick to apply active effects
  getSpeedMultiplierForDriver(driverId: number): number {
    const effect = this.activeEffects.get(driverId);
    if (!effect) return 1.0;

    if (this.raceState.totalTicks > effect.expiresAtTick) {
      this.activeEffects.delete(driverId);
      return 1.0;
    }

    return effect.speedMultiplier;
  }

  isDriverProtected(driverId: number): boolean {
    const effect = this.activeEffects.get(driverId);
    if (!effect) return false;

    if (this.raceState.totalTicks > effect.expiresAtTick) {
      this.activeEffects.delete(driverId);
      return false;
    }

    return effect.isProtected;
  }

  // === HEADLESS SIMULATION METHODS (for Web Worker / Monte Carlo) ===

  /**
   * Create a new independent RaceEngine instance (not the singleton).
   * Used for parallel headless simulation in Web Workers.
   * @param simVars Optional simulation variable overrides for tuning
   */
  static createForWorker(simVars?: SimVariables): RaceEngine {
    // Bypass singleton pattern - directly instantiate
    const engine = new RaceEngine();
    if (simVars) {
      engine.simVars = simVars;
    }
    return engine;
  }

  /**
   * Run a complete race synchronously (for headless simulation).
   * Does not use setInterval - calls tick() directly in a loop.
   * Returns the final state when race is complete.
   */
  runHeadless(): { drivers: Driver[]; raceState: RaceState; events: RaceEvent[] } {
    // Reset to fresh state
    this.reset();

    // Run until race finishes (with safety limit to prevent infinite loops)
    const maxTicks = 100000;
    while (!this.raceState.raceFinished && this.raceState.totalTicks < maxTicks) {
      this.tick();
    }

    return {
      drivers: this.getDrivers(),
      raceState: { ...this.raceState },
      events: [...this.raceEvents],
    };
  }
}

export default RaceEngine;
