import { Tag, getTagById, RaceContext, evaluateTagCondition, describeCondition, TRIGGER_LABELS } from './data/tags';
import { IN_RACE_RULES, InRaceRule, InRaceDuration } from './data/inRace';
import { WeatherState, isNeutralWeather } from './data/weather';
import type { Card, CardStat } from './cards/types';
import { SimVariables, CANON_VARIABLES } from './simlab/types';
import { Rng, mulberry32, deriveSeed, randomSeed } from './engine/rng';

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

// The shape loadGeneratedRoster() accepts: a generated driver with car/team
// stats and tags attached. Also what season persistence snapshots, so a saved
// season can reload the exact same grid.
export interface RosterDriver {
  id: number;
  fullName: string;
  shortName: string;
  emoji: string;
  color: string;
  /** Text/icon colour on the team colour (white or near-black). */
  ink?: string;
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
  /** Racing number 2–99 (#313 / #337). Display only. */
  number?: number;
  /** Trait cards baked into the stats (Quick Race #337, Season Mode). Display only. */
  cards?: Card[];
  /** Every tag on this driver (driver, car and team tags together — a tag's
   * `target` says which). Genesis rolls, interventions and acquisitions all
   * land here; capped per driver by the league (MAX_TAGS_PER_DRIVER). */
  tags: Tag[];
}

export interface Driver {
  id: number;
  name: string;
  shortName: string;      // Abbreviated name for tight spaces
  emoji: string;          // Kingdom emoji avatar
  position: number;
  color: string;
  ink?: string;           // Text/icon colour on the team colour
  stats: DriverStats;
  currentLap: number;
  lapTimes: number[];     // Time (in ticks) for each completed lap
  sectorTimes: number[];  // Cumulative race time (in ticks) at each sector crossing (S1, S2, S3, S1, S2, S3, ...)
  lastTickSpeed: number;  // Speed from the most recent tick (for debug display)
  /** Smoothed speed (units/tick, ~1s window) — what the SPEED column shows. */
  speedSmooth: number;
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
  number?: number;        // Racing number; display only
  cards?: Card[];         // Trait cards already baked into the stats; display only
  // Tire/Pit/Crash state
  tireState: TireState;
  status: DriverStatus;
  pitStops: PitStopInfo[];
  hasPitted: boolean;
  usedCompounds: TireCompound[];  // Track which compounds have been used (for mandatory variety)
  dnfInfo: DNFInfo | null;
  pitProgress: number;      // 0-1 during pit stop (overall progress through pit lane)
  pitPhase: PitPhase | null;    // Current phase: entry (driving to box), stopped (pit work), exit (driving out)
  /** Acceleration stat applies until this tick (set at pit exit / SC restart). */
  accelBoostUntilTick?: number;
  pitBoxPosition: number;       // 0-1 position along pit lane where this driver's pit box is
  pitWorkProgress: number;      // 0-1 progress through the stationary pit work phase
  currentPitWorkDuration: number;   // Duration of pit work (stationary part, affected by team stat)
  /** Tick when the current pit stop began (pit-lane entry) — used to record
   * the stop's true duration at exit. */
  currentPitEntryTick?: number;
  currentPitIsSlowStop: boolean; // Whether current pit stop is a slow stop
  currentPitIsQuickStop: boolean; // Whether current pit stop is a quick stop
  isDamaged: boolean;       // Survived a crash but with damage
  damageSpeedPenalty: number; // 0.85 if damaged (15% slower), 1.0 if undamaged
  // Final classification
  lapsBehind: number;       // How many laps behind the winner (0 = on lead lap)
  finishTick: number | null; // Tick when this driver was classified
  /** Time penalty added at the flag (#249 stop rule), in ticks, and why. */
  penaltyTicks: number;
  penaltyReason: string | null;
  // Tags — the full stack (driver + car + team), see RosterDriver.tags
  tags: Tag[];
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
  maxStoredEvents: number;        // Event log cap (UI default 500; league settle raises it so digests keep the whole race)
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
  criticalAt: number;     // Wear % when performance cliff begins
  cliffSeverity: number;  // How steep the performance drop is (0-1, higher = steeper)
  blowoutRisk: number;    // Base blowout chance per tick when past critical (0-1)
  lifeLaps: number;       // Laps from fresh to the cliff (#246)
}

// Tire tuning lives in CANON_VARIABLES (simlab/types.ts) — the single source of
// truth shared by live races, Sim Lab, and Bet Lab. A stale copy here previously
// gave live races 5× the blowout risk that the labs calibrated against.
export const TIRE_COMPOUNDS: Record<TireCompound, TireCompoundProperties> = CANON_VARIABLES.tires;

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
  wasQuickStop?: boolean; // True if the crew nailed it
}

// Event types for the analytics system
export type RaceEventType =
  | 'luck_trigger'     // Luck bonus activated (luckBonus > 1)
  | 'endurance_decay'  // Endurance dropped below threshold
  | 'lap_complete'     // Driver finished a lap
  | 'lead_change'      // New race leader
  | 'overtake'         // Driver passed another
  | 'race_finish'      // Driver crossed finish line
  | 'penalty'          // Time penalty applied at the flag (stop rule)
  | 'grid_set'         // Qualifying done, grid staggered
  | 'battle'           // Stuck behind the same car long enough to call it one
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
  | 'unsafety_car_recalled'  // The Unsafety Car is returning to the void
  // Mistakes layer (#82)
  | 'driver_error'     // Non-terminal mistake: spin / lock-up / wide moment
  | 'tag_acquired'     // A tag was picked up mid-race (#232b)
  | 'tag_expired';     // …and ran out

export interface RaceEvent {
  tick: number;
  /** 1-based lap the event happened on (absent on driverless track events
   * and on event logs saved before this field existed). */
  lap?: number;
  type: RaceEventType;
  driverId: number;
  driverName: string;
  emoji: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
  magnitude: number;  // 0-1 significance
}

// Track info for display purposes

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
  /** The track's favoured stats (display; already baked into the roster). */
  favours?: CardStat[];
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

/** One thing acting on a driver right now (or waiting to), in UI terms.
 * Built by getEffectStack — the legibility layer (#243). */
export interface EffectStackEntry {
  source: 'tag' | 'weather' | 'track' | 'track_event' | 'infliction' | 'damage' | 'safety_car';
  id: string;
  name: string;
  emoji: string;
  /** Is it contributing this tick? */
  active: boolean;
  /** Plain words: why it is (or isn't) active — "needs rain", "fired, 140 ticks left". */
  reason: string;
  /** Live contribution. Multipliers are 1 = none; crash is additive, 0 = none. */
  speed: number;
  consistency: number;
  luck: number;
  crash: number;
  pit: number;
  /** For tags: the tag definition, so the UI can show tier/description. */
  tag?: Tag;
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
  pitLaneSpeedLimit: 6,        // Units/tick in pit lane (#246: a stop costs ~25% of a lap all-in)
  pitWorkBaseDuration: 30,     // Base ticks for stationary pit work
  mandatoryPitStops: 2,
  crashProximityThreshold: 0.03,
  baseCrashChance: 0.0001,  // Reduced for realistic ~20% DNF rate
  enableCrashes: true,
  enableTireWear: true,
  maxStoredEvents: 500,     // UI safety cap; league settle raises it
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
  // Drivers currently within crash-proximity of another car (rebuilt each tick)
  private driversInTraffic: Set<number> = new Set();
  private trackInfo: TrackInfo | null = null;

  // Track event state
  // Legacy track effects array (kept for getActiveTrackEffects() API compatibility)
  private activeTrackEffects: ActiveTrackEffect[] = [];

  // === UNIFIED EFFECT STORAGE ===
  // All effects (from tags and track events) go here
  private unifiedEffects: Map<number, ActiveEffect[]> = new Map();

  // Lap chart history (#208/#173): one running-order snapshot per leader-lap.
  // Recorded inside tick(), so it's complete from lap 1 whether the race runs
  // headless, live, or is fast-forwarded into mid-broadcast.
  private lapPositionHistory: { lap: number; order: number[]; sc: boolean }[] = [];
  private lastRecordedLap = 0;

  // Tag activation state - tracks which tags have activated and when
  private activeTagEffects: Map<number, { tagId: string; speedModifier: number; consistencyModifier: number; luckModifier: number; expiresAtTick: number | null }[]> = new Map();
  private tagActivatedThisRace: Set<string> = new Set();  // "driverId-tagId" to track one-time activations
  // In-race tags (#232b): what each driver picked up mid-race and when it ends.
  private inRaceRules: InRaceRule[] = IN_RACE_RULES;
  private inRaceTags: Map<number, { tagId: string; sinceLap: number; duration: InRaceDuration; expiresAtLap: number | null }[]> = new Map();
  /** Tags picked up with a {races:n} duration — the league carries them over. */
  private inRaceCarryovers: { driverId: number; tagId: string; races: number; lap: number }[] = [];
  /** Events trimmed off raceEvents by the UI cap, in order — so getFullEvents()
   * can hand reports the whole race (#245). Cleared with raceEvents. */
  private droppedEvents: RaceEvent[] = [];

  // Simulation variable overrides (for Sim Lab tuning)
  private simVars: SimVariables | null = null;

  // RNG used by all simulation rolls. Defaults to Math.random (live Quick Race
  // behavior unchanged); call setSeed() for a deterministic, replayable race.
  private rng: Rng = Math.random;

  // Base seed for SIDE streams that must not perturb the main `rng` ordering —
  // e.g. each driver's stable pit-strategy offset (#195 anti-herding). Derived
  // streams (deriveSeed) stay independent of the race rolls, so a feature that
  // reads them is byte-identical to today whenever its gate knob is 0.
  private strategySeed: number = randomSeed();
  // Tag activation rolls (triggerChance). Derived from the race seed like the
  // strategy stream, keyed per driver+tag so adding a tag to one driver never
  // moves another driver's rolls. See tryActivateTag.
  private tagRngs: Map<string, Rng> = new Map();

  // #82 mistakes layer: per-driver tick until which no new mistake may start
  // (active recovery + refractory window). Cleared per race.
  private mistakeBlockedUntilTick: Map<number, number> = new Map();

  /** Mistake flavor variants (#82): the feed story each error tells. */
  private static readonly MISTAKE_FLAVORS = [
    { id: 'spin', name: 'Spin', emoji: '🌀', text: 'spins! The car swaps ends and rejoins down the order' },
    { id: 'lockup', name: 'Lock-up', emoji: '🛞', text: 'locks up hard into the corner and shoots up the escape road' },
    { id: 'wide', name: 'Wide Moment', emoji: '↩️', text: 'runs wide and scrabbles back across the grass' },
    { id: 'flatspot', name: 'Flat Spot', emoji: '🫨', text: 'flat-spots the tires — the car vibrates like a paint shaker' },
  ] as const;

  // Conditional tags (e.g. Front Runner "when leading") are evaluated live each
  // tick against this cache, not stored as permanent effects — that's the #156
  // fix. Rebuilt once per tick; reads engine state only, so it adds no RNG.
  private raceContextCache: Map<number, RaceContext> = new Map();
  // Active weather/track condition ids for this race (e.g. 'rain'). Empty until
  // the weather layer (C2) populates it; Rain Dancer stays dormant until then.
  private currentConditions: Set<string> = new Set();
  // This race's weather (C2). Applies a field-wide lean to every driver and
  // sets currentConditions so condition-gated tags wake. Null = no weather
  // (Quick Race). Set per race; not cleared by reset() (it's race setup).
  private weather: WeatherState | null = null;

  private constructor() {
    this.initializeDrivers();
  }

  static getInstance(): RaceEngine {
    if (!RaceEngine.instance) {
      RaceEngine.instance = new RaceEngine();
    }
    return RaceEngine.instance;
  }

  /**
   * Seed the simulation RNG. Every roll after this point is deterministic:
   * the same seed + same roster + same config replays the identical race.
   * Call immediately before start()/runHeadless() — rolls consumed between
   * seeding and the race would shift the stream.
   */
  setSeed(seed: number): void {
    this.rng = mulberry32(seed);
    this.strategySeed = seed; // side streams replay with the race
    this.tagRngs.clear();
    this.currentSeed = seed;
  }

  /** The seed this race was built from, or null for an unseeded (Math.random) race. */
  getSeed(): number | null { return this.currentSeed; }
  private currentSeed: number | null = null;

  /** One roll from the side stream for (driver, tag) — see tagRngs. */
  private tagRoll(driverId: number, tagId: string): number {
    const key = `${driverId}:${tagId}`;
    let r = this.tagRngs.get(key);
    if (!r) {
      r = mulberry32(deriveSeed(this.strategySeed, 'tag', key));
      this.tagRngs.set(key, r);
    }
    return r();
  }

  /** Restore the default unseeded behavior (live Quick Race). */
  clearSeed(): void {
    this.rng = Math.random;
    this.strategySeed = randomSeed(); // stable within a live race, fresh each one
    this.tagRngs.clear();
    this.currentSeed = null;
  }

  /**
   * Override simulation variables (Sim Lab tuning, league canon, future
   * decrees). Pass null to restore the hardcoded defaults. Replays only
   * match when this is identical between runs — the league settle and the
   * live broadcast must both run CANON (or the same decree set).
   */
  setSimVars(simVars: SimVariables | null): void {
    this.simVars = simVars;
  }

  // === SIM VARIABLE HELPERS ===
  // These methods return overridden values from simVars or fall back to hardcoded defaults

  private getTireCompound(compound: TireCompound): TireCompoundProperties {
    if (this.simVars) {
      const v = this.simVars.tires[compound];
      return {
        speedBonus: v.speedBonus,
        lifeLaps: v.lifeLaps,
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

  private getPitVars() {
    if (this.simVars) return this.simVars.pits;
    return CANON_VARIABLES.pits;
  }

  private getPerformanceVars() {
    if (this.simVars) return this.simVars.performance;
    return CANON_VARIABLES.performance;
  }

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

  private getSafetyCarVars() {
    if (this.simVars) return this.simVars.safetyCar;
    return CANON_VARIABLES.safetyCar;
  }

  private getDriverSpeedVars() {
    if (this.simVars) return this.simVars.driverSpeed;
    return CANON_VARIABLES.driverSpeed;
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
        tags: [],
        currentLap: 0,
        lapTimes: [],
        sectorTimes: [],
        lastTickSpeed: 0,
        speedSmooth: 0,
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
        penaltyTicks: 0,
        penaltyReason: null,
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
  loadGeneratedRoster(roster: RosterDriver[]): void {
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
        ink: d.ink,
        stats: { ...d.stats },
        currentLap: 0,
        lapTimes: [],
        sectorTimes: [],
        lastTickSpeed: 0,
        speedSmooth: 0,
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
        number: d.number,
        cards: d.cards,
        tags: [...(d.tags ?? [])],
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
        penaltyTicks: 0,
        penaltyReason: null,
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
    this.droppedEvents = [];
    this.mistakeBlockedUntilTick.clear();
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
      lap: driver ? Math.min(this.config.totalLaps, driver.currentLap + 1) : undefined,
      type,
      driverId: driver?.id ?? -1,
      driverName: driver?.name ?? 'Track Event',
      emoji: eventEmoji || driver?.emoji || '🏁',
      description,
      impact,
      magnitude: Math.min(1, Math.max(0, magnitude)),
    });
    if (driver && type !== 'tag_acquired' && type !== 'tag_expired') this.applyInRaceRules(type, driver, description);
  }

  // === IN-RACE ACQUISITION (#232b) ===

  /** Replace the rule set (rulesets/cards will plumb this). */
  setInRaceRules(rules: InRaceRule[]): void { this.inRaceRules = rules; }

  private applyInRaceRules(type: RaceEventType, driver: Driver, description: string): void {
    if (type === 'pit_exit') this.expireInRaceTags(driver, e => e.duration === 'until-pit');
    for (const rule of this.inRaceRules) {
      if (rule.on !== type) continue;
      if (rule.match && !rule.match.test(description)) continue;
      const tag = getTagById(rule.tagId);
      if (!tag) continue;
      this.attachInRaceTag(driver, tag, rule);
    }
  }

  /** Put a tag on a driver mid-race. Transient states bypass the slot cap.
   * Mutates the driver object passed in (the one the caller holds). */
  private attachInRaceTag(driver: Driver, tag: Tag, rule: InRaceRule): void {
    if (driver.tags.some(t => t.id === tag.id)) return;
    driver.tags = [...driver.tags, tag];
    const lap = driver.currentLap;
    const d = rule.duration;
    const expiresAtLap = typeof d === 'object' && 'laps' in d ? lap + d.laps : null;
    const list = this.inRaceTags.get(driver.id) ?? [];
    list.push({ tagId: tag.id, sinceLap: lap, duration: d, expiresAtLap });
    this.inRaceTags.set(driver.id, list);
    if (typeof d === 'object' && 'races' in d) this.inRaceCarryovers.push({ driverId: driver.id, tagId: tag.id, races: d.races, lap });
    // Passive, ungated tags act through the unified effect system; a gated
    // one is read live by getConditionalModifier, so it needs no activation.
    if (tag.trigger === 'passive' && !tag.condition) this.tryActivateTag(driver, tag, {});
    this.logEvent('tag_acquired', driver, `${tag.name}: ${rule.text}`, tag.effects.speedModifier && tag.effects.speedModifier > 1 ? 'positive' : 'negative', 0.6, tag.emoji);
  }

  private expireInRaceTags(driver: Driver, pred: (e: { tagId: string; duration: InRaceDuration; expiresAtLap: number | null }) => boolean): void {
    const list = this.inRaceTags.get(driver.id);
    if (!list) return;
    const keep: typeof list = [];
    for (const e of list) {
      if (!pred(e)) { keep.push(e); continue; }
      driver.tags = driver.tags.filter(t => t.id !== e.tagId);
      const effects = this.unifiedEffects.get(driver.id);
      if (effects) for (const fx of effects) if (fx.source === 'tag' && fx.sourceId === e.tagId) fx.expiresAtTick = this.raceState.totalTicks;
      this.tagActivatedThisRace.delete(`${driver.id}-${e.tagId}`); // may be picked up again
      const tag = getTagById(e.tagId);
      this.logEvent('tag_expired', driver, `${tag?.name ?? e.tagId} wears off`, 'neutral', 0.3, tag?.emoji);
    }
    if (keep.length) this.inRaceTags.set(driver.id, keep); else this.inRaceTags.delete(driver.id);
  }

  /** Lap-based expiries, checked every tick. */
  private expireInRaceTagsByLap(): void {
    for (const [driverId, list] of this.inRaceTags) {
      if (!list.some(e => e.expiresAtLap !== null)) continue;
      const driver = this.drivers.find(d => d.id === driverId);
      if (!driver) continue;
      this.expireInRaceTags(driver, e => e.expiresAtLap !== null && driver.currentLap >= e.expiresAtLap);
    }
  }

  /** How a mid-race tag got there and how long it has left (for the card). */
  getInRaceTagInfo(driverId: number, tagId: string): { sinceLap: number; duration: InRaceDuration; expiresAtLap: number | null } | null {
    return this.inRaceTags.get(driverId)?.find(e => e.tagId === tagId) ?? null;
  }

  /** Tags picked up mid-race that the league should carry into coming races. */
  getInRaceCarryovers(): { driverId: number; tagId: string; races: number; lap: number }[] {
    return [...this.inRaceCarryovers];
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

  /** Per-leader-lap running-order snapshots for the lap chart (#208). Complete
   * from lap 1 — populated during fast-forward and headless runs too. */
  getLapHistory(): { lap: number; order: number[]; sc: boolean }[] {
    return this.lapPositionHistory;
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

  /** Every event of the race, uncapped (the UI cap only trims getEvents). */
  getFullEvents(): RaceEvent[] {
    return this.droppedEvents.length ? [...this.droppedEvents, ...this.raceEvents] : this.raceEvents;
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

  /**
   * Synchronously advance the prepared race by `ticks` ticks — joining a live
   * broadcast mid-race. Call after seed/roster/config are set, then start()
   * to continue in real time. Determinism makes the join exact: the same seed
   * replays the same race, so tick N computed now is tick N always.
   */
  fastForward(ticks: number): void {
    const target = Math.max(0, Math.floor(ticks));
    while (!this.raceState.raceFinished && this.raceState.totalTicks < target) {
      this.tick();
    }
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
        speedSmooth: 0,
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
        penaltyTicks: 0,
        penaltyReason: null,
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
    this.droppedEvents = [];
    this.mistakeBlockedUntilTick.clear();
    // Reset track event state
    this.activeTrackEffects = [];
    this.lapPositionHistory = [];
    this.gridOrder = [];
    this.qualiScores.clear();
    this.stuckBehind.clear();
    this.lastRecordedLap = 0;
    // Reset tag activation state
    this.activeTagEffects = new Map();
    this.tagActivatedThisRace = new Set();
    this.inRaceTags = new Map();
    this.inRaceCarryovers = [];
    // Reset unified effect storage
    this.unifiedEffects = new Map();
    // Conditional-tag context is rebuilt each tick; clear stale data (the active
    // race conditions in currentConditions are race setup, so they persist).
    this.raceContextCache = new Map();
    this.notifyListeners();
    this.notifyStateListeners();
    this.notifyEventListeners();
  }

  private calculateSpeed(driver: Driver): TickFactors {
    // Get tunable variables from simVars (or CANON defaults)
    const carStatVars = this.getCarStatVars();
    const perfVars = this.getPerformanceVars();
    const speedVars = this.getDriverSpeedVars();

    // Use simVars for base speed range and consistency, fallback to config
    const baseSpeedMin = speedVars.baseSpeedMin;
    const baseSpeedMax = speedVars.baseSpeedMax;
    const consistencyWeight = speedVars.consistencyWeight;
    const enduranceDecay = this.config.enduranceDecay;

    // Base random roll
    const baseRoll = this.rng();
    const baseSpeed = baseSpeedMin + baseRoll * (baseSpeedMax - baseSpeedMin);

    // === CAR STATS (from simVars) ===
    // Car power affects top speed
    const carPower = driver.carStats?.power ?? 3; // Default to 3 stars if no car
    const carPowerModifier = carStatVars.powerBase + carPower * carStatVars.powerPerStar;

    // Car grip affects how much consistency helps
    const carGrip = driver.carStats?.grip ?? 3;
    const carGripModifier = carStatVars.gripBase + carGrip * carStatVars.gripPerStar;

    // Stats modifier from driver's baseSpeed stat, multiplied by car power
    // Apply speedStatMultiplier to compress/expand the effect of the speed stat
    // When speedStatMultiplier = 1.0, full effect; when = 0.5, half the stat differential matters
    const speedStatEffect = 1 + (driver.stats.baseSpeed - 1) * speedVars.speedStatMultiplier;
    const statsModifier = speedStatEffect * carPowerModifier;

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
    if (this.rng() < perfVars.luckProcChance) {
      // Luck proc! Driver's luck stat determines how big the boost is
      // Apply luck modifier from tags/effects (e.g., Cursed Chassis has 0.7x luck)
      const effectiveLuck = driver.stats.luck * this.getTagLuckModifier(driver.id);
      const minBoost = perfVars.luckMinBoostBase + effectiveLuck * perfVars.luckMinBoostPerStat;
      const maxBoost = perfVars.luckMaxBoostBase + effectiveLuck * perfVars.luckMaxBoostPerStat;
      luckBonus = 1 + minBoost + this.rng() * (maxBoost - minBoost);
    }

    // Endurance factor: speed degrades over laps
    const lapProgress = driver.currentLap / this.config.totalLaps;
    const baseEndurancePenalty = lapProgress * enduranceDecay * perfVars.endurancePenaltyMultiplier;
    const enduranceResistance = driver.stats.endurance; // Higher = less penalty
    const actualPenalty = baseEndurancePenalty * (2 - enduranceResistance);
    const enduranceFactor = Math.max(1 - perfVars.enduranceMaxPenalty, 1 - actualPenalty);

    // Track event speed modifier (from active effects like speed_boost/speed_penalty)
    const trackEventModifier = this.getActiveSpeedModifier(driver.id);

    // Tag speed modifier (from activated tags)
    const tagSpeedModifier = this.getTagSpeedModifier(driver.id);
    const tagConsistencyModifier = this.getTagConsistencyModifier(driver.id);

    // Field-wide environment lean (C2 weather + C3 track tags): speed scales the
    // whole field (duration, not order); consistency shrink adds variance that
    // rewards consistent drivers.
    const envSpeedModifier = this.getEnvSpeedModifier();
    const envConsistencyModifier = this.getEnvConsistencyModifier();

    // Apply tag + environment consistency modifiers to the consistency effect
    const adjustedConsistencyEffect = consistencyEffect * tagConsistencyModifier * envConsistencyModifier;

    // === REBALANCE V1 (gated: both factors are exactly 1 when canon-dormant) ===
    // Acceleration: matters in the moments it should — the launch, pit exits,
    // and Unsafety Car restarts (window length accelLaunchTicks).
    let accelFactor = 1;
    if (perfVars.accelEffect > 0) {
      const inWindow = this.raceState.totalTicks <= perfVars.accelLaunchTicks ||
        (driver.accelBoostUntilTick !== undefined && this.raceState.totalTicks < driver.accelBoostUntilTick);
      if (inWindow) {
        accelFactor = 1 + (driver.stats.acceleration - 1) * perfVars.accelEffect;
      }
    }
    // Aggression's reward: aggressive drivers thrive in traffic (the same
    // proximity that risks crashes). Pairs with the wear/blowout cost.
    let trafficFactor = 1;
    if (perfVars.aggressionTrafficBoost > 0 && this.driversInTraffic.has(driver.id)) {
      const normalizedAggression = (driver.stats.aggression - 0.3) / 0.5;
      trafficFactor = 1 + Math.max(0, normalizedAggression) * perfVars.aggressionTrafficBoost;
    }

    // Calculate final speed (car modifiers already incorporated into statsModifier and consistencyEffect)
    const finalSpeed = baseSpeed * statsModifier * adjustedConsistencyEffect * luckBonus * enduranceFactor * trackEventModifier * tagSpeedModifier * envSpeedModifier * accelFactor * trafficFactor;

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

    // (Crash damage is the 'damaged' in-race tag now — #232b.)

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
      if (this.rng() > blowoutVars.safetyCarReduction) return false;
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

    return this.rng() < finalChance;
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
      if (this.rng() > crashVars.safetyCarsReduction) return false;
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

    return this.rng() < finalChance;
  }

  /** Wear per tick, in "cliff units": a compound reaches criticalAt after
   * lifeLaps laps at mid aggression and 3★ tyre management (#246). Life is in
   * laps, not race share, so a long race means more stops — like racing. */
  private calculateTireWear(driver: Driver): number {
    if (!this.config.enableTireWear) return 0;
    const compound = this.getTireCompound(driver.tireState.compound);
    const tireVars = this.getTireVars();
    const distancePerTick = driver.lastTickSpeed || 7;
    const lapFraction = distancePerTick / this.config.lapLength;
    const wearPerLap = compound.criticalAt / compound.lifeLaps;
    // Aggression 0.3–0.8 → ×1.0–1.4; mid (0.55) is the calibration point.
    const normalizedAggression = (driver.stats.aggression - 0.3) / 0.5;
    const aggressionFactor = (1 + normalizedAggression * tireVars.aggressionWearMultiplier) / (1 + 0.5 * tireVars.aggressionWearMultiplier);
    const tireMgmtStars = driver.teamStats?.tireManagement ?? 3;
    const tireMgmtFactor = 1 + (3 - tireMgmtStars) * tireVars.teamTireMgmtWearPerStar;
    return wearPerLap * lapFraction * aggressionFactor * tireMgmtFactor;
  }

  /** Wear this driver adds over one racing lap at their current pace. */
  private wearPerLapFor(driver: Driver): number {
    const perTick = this.calculateTireWear(driver);
    const distancePerTick = driver.lastTickSpeed || 7;
    return perTick * (this.config.lapLength / distancePerTick);
  }

  /** The stop rule as it stands for this driver: stops and compounds still owed. */
  private stopsOwed(driver: Driver): { stops: number; compounds: TireCompound[]; needed: number } {
    const pitVars = this.getPitVars();
    const all: TireCompound[] = ['soft', 'medium', 'hard'];
    const used = driver.usedCompounds || [];
    const compounds = pitVars.requireAllCompounds ? all.filter(c => !used.includes(c)) : [];
    const stops = Math.max(0, pitVars.minStops - driver.pitStops.length);
    return { stops, compounds, needed: Math.max(stops, compounds.length) };
  }

  /**
   * The pit decision (#246 pass 1). Checked once per lap at the pit-entry zone,
   * in this order — every path is a sentence you could say on the radio:
   *   1. never on the last lap;
   *   2. tyres are at the cliff → box ("cliff");
   *   3. tyres WILL be at the cliff before the next chance → box ("ahead of
   *      the cliff"), leaned by the driver's archetype: aggressive camps dip
   *      into the cliff, conservative camps pit a lap early;
   *   4. a stop is owed by the rule and the Unsafety Car is out → cheap stop;
   *   5. a stop is owed and the room is running out → forced stop;
   *   6. otherwise stay out.
   * There is no random "window" roll any more: stops come from tyres and the
   * rule, and the spread comes from archetypes, aggression and pace.
   */
  private shouldDriverPit(driver: Driver): boolean {
    if (driver.status !== 'racing') return false;
    const lapProgress = driver.position / this.config.lapLength;
    const atPitEntry = lapProgress >= this.PIT_ENTRY_POSITION && lapProgress < this.PIT_ENTRY_POSITION + 0.05;
    if (!atPitEntry) return false;
    if (driver.currentLap >= this.config.totalLaps - 1) return false; // last lap

    const compound = this.getTireCompound(driver.tireState.compound);
    const pitVars = this.getPitVars();
    const wear = driver.tireState.wear;
    const lapsLeft = this.config.totalLaps - driver.currentLap;

    // 2 + 3. The cliff, now or next lap. Archetype leans the point.
    const lean = 1 + this.getStrategyArchetype(driver) * pitVars.strategyWearLean;
    const pitAtWear = compound.criticalAt * lean;
    if (wear >= pitAtWear) { this.pitReasons.set(driver.id, 'cliff'); return true; }
    if (lapsLeft > pitVars.lastPitLapBuffer && wear + this.wearPerLapFor(driver) >= pitAtWear) {
      this.pitReasons.set(driver.id, 'ahead of the cliff');
      return true;
    }

    const owed = this.stopsOwed(driver);
    if (owed.needed === 0) return false;

    // 4. Cheap stop under the Unsafety Car when a stop is owed.
    if (pitVars.scPitChance > 0 && this.raceState.unsafetyCarActive && wear >= pitVars.scPitMinWear && lapsLeft > pitVars.lastPitLapBuffer) {
      if (this.rng() < pitVars.scPitChance) { this.pitReasons.set(driver.id, 'safety car'); return true; }
    }

    // 5. Forced: the room to complete the rule is running out (while there is room).
    if (lapsLeft > pitVars.lastPitLapBuffer && lapsLeft - pitVars.lastPitLapBuffer <= owed.needed) {
      this.pitReasons.set(driver.id, 'the rule'); return true;
    }
    return false;
  }

  /** Why each driver last boxed — read by the pit_entry event. */
  private pitReasons = new Map<number, string>();

  // === QUALIFYING (#246 pass 2) ===
  /** Grid order (driver ids, P1 first) and each driver's qualifying score,
   * set by runQualifying() on the first tick. Empty until then. */
  private gridOrder: number[] = [];
  private qualiScores = new Map<number, number>();
  getGridOrder(): number[] { return [...this.gridOrder]; }
  getGridSlot(driverId: number): number { const i = this.gridOrder.indexOf(driverId); return i < 0 ? -1 : i + 1; }

  private getGridVars() {
    if (this.simVars) return this.simVars.grid;
    return CANON_VARIABLES.grid;
  }

  // === OVERTAKING (#246 pass 3) ===
  private getOvertakingVars() {
    if (this.simVars) return this.simVars.overtaking;
    return CANON_VARIABLES.overtaking;
  }
  /** Who each driver is stuck behind right now, and for how many ticks. */
  private stuckBehind = new Map<number, { aheadId: number; ticks: number }>();
  /** Speeds resolved this tick, by driver, for the pace comparison. */
  private tickSpeeds = new Map<number, number>();
  /** Resolved total distance (lap × L + position) this tick, for cars already moved. */
  private tickDistance = new Map<number, number>();
  getBattles(): { chaserId: number; aheadId: number; ticks: number }[] {
    return [...this.stuckBehind.entries()].map(([chaserId, v]) => ({ chaserId, aheadId: v.aheadId, ticks: v.ticks }));
  }
  /** Per-track passing dial (simVars overtaking.trackDifficulty, keyed by track
   * id). Every v0.5 track is normal; the dial stays for later tuning. */
  private trackOvertakingDifficulty(): number {
    const table = this.getOvertakingVars().trackDifficulty;
    return table[this.trackInfo?.id ?? ''] ?? 1;
  }

  /**
   * Resolve a chaser against the car directly ahead on the same lap. Returns
   * the position the chaser actually reaches this tick. A pass is an event:
   * while the chaser is on the car ahead it rolls to get by — pace edge,
   * fresher tyres and aggression help, a consistent defender and a technical
   * track hurt — and until the roll lands it is held in the dirty air.
   */
  private resolveOvertake(driver: Driver, intended: number, _speed: number): number {
    const L = this.config.lapLength;
    const ov = this.getOvertakingVars();
    const myLap = driver.currentLap;
    const intendedTotal = myLap * L + intended;
    // Nearest racing car ahead on the same lap at the start of the tick.
    let ahead: Driver | null = null;
    let aheadStart = Infinity;
    for (const o of this.drivers) {
      if (o.id === driver.id || o.status !== 'racing' || o.currentLap !== myLap) continue;
      if (o.position > driver.position && o.position < aheadStart) { ahead = o; aheadStart = o.position; }
    }
    if (!ahead) { this.stuckBehind.delete(driver.id); return intended; }
    const aheadTotal = this.tickDistance.get(ahead.id) ?? (myLap * L + ahead.position);
    const gap = ov.followGap * L;
    if (intendedTotal < aheadTotal - gap) { this.stuckBehind.delete(driver.id); return intended; }

    // On the car ahead. Under the Unsafety Car nobody passes.
    const prev = this.stuckBehind.get(driver.id);
    const ticks = prev && prev.aheadId === ahead.id ? prev.ticks + 1 : 1;
    let p = 0;
    if (!this.raceState.unsafetyCarActive) {
      // Steady pace (package × tyre state), not this tick's noisy roll.
      const steady = (d: Driver) => this.packagePace(d) * this.getTireSpeedModifier(d);
      const pace = Math.max(0, 1 + (steady(driver) / Math.max(0.01, steady(ahead)) - 1) * ov.paceWeight);
      const tyre = Math.max(0.2, 1 + ((ahead.tireState.wear - driver.tireState.wear) / 100) * ov.tyreWeight);
      const aggrN = (driver.stats.aggression - 0.3) / 0.5;
      const aggr = 1 - ov.aggressionSwing / 2 + aggrN * ov.aggressionSwing;
      const defend = 1 + (ahead.stats.consistency - 0.55) * ov.defenderWeight;
      p = Math.min(0.6, ov.attemptBase * pace * tyre * aggr / Math.max(0.2, defend) / this.trackOvertakingDifficulty());
    }
    if (p > 0 && this.rng() < p) {
      this.stuckBehind.delete(driver.id);
      this.logEvent('overtake', driver, `passes ${ahead.shortName}${ticks >= ov.battleTicks ? ' after a fight' : ''}`, 'positive', 0.6);
      this.evaluateDriverTags(driver, { isOvertaking: true });
      return Math.max(intended, aheadTotal - myLap * L + gap * 0.5);
    }
    this.stuckBehind.set(driver.id, { aheadId: ahead.id, ticks });
    if (ticks === ov.battleTicks) this.logEvent('battle', driver, `is all over ${ahead.shortName}`, 'neutral', 0.5);
    return Math.min(intended, aheadTotal - myLap * L - gap);
  }

  /** Each driver's deterministic pace from the package (speed stat × car power). */
  private packagePace(driver: Driver): number {
    const speedVars = this.getDriverSpeedVars();
    const carStatVars = this.getCarStatVars();
    const carPowerModifier = carStatVars.powerBase + (driver.carStats?.power ?? 3) * carStatVars.powerPerStar;
    return (1 + (driver.stats.baseSpeed - 1) * speedVars.speedStatMultiplier) * carPowerModifier;
  }

  /**
   * Qualifying: one hot lap per driver, scored from the package plus a noise
   * roll the driver's consistency shrinks, with a small chance of a ruined
   * lap. Draws from a side seed stream (deriveSeed(seed,'quali',id)) so the
   * race's main RNG is untouched. Sets the grid and staggers the start:
   * P1 on the line, each slot `slotSpacing` of a lap behind.
   */
  private runQualifying(): void {
    const g = this.getGridVars();
    const scored = this.drivers.map(d => {
      const r = mulberry32(deriveSeed(this.strategySeed, 'quali', d.id));
      const z = (r() + r() + r() - 1.5) * 2; // ~N(0,1)
      const sd = g.qualiNoise * (1.2 - d.stats.consistency);
      const flub = r() < g.qualiFlubChance ? 0.95 : 1;
      const grip = (this.getCarStatVars().gripBase + (d.carStats?.grip ?? 3) * this.getCarStatVars().gripPerStar);
      const score = this.packagePace(d) * (1 + z * sd) * flub * (0.98 + 0.02 * grip);
      return { id: d.id, score };
    });
    scored.sort((a, b) => b.score - a.score);
    this.gridOrder = scored.map(x => x.id);
    this.qualiScores = new Map(scored.map(x => [x.id, x.score]));
    const slot = new Map(this.gridOrder.map((id, i) => [id, i]));
    this.drivers = this.drivers.map(d => ({ ...d, position: -(slot.get(d.id) ?? 0) * g.slotSpacing * this.config.lapLength }));
    const pole = this.drivers.find(d => d.id === this.gridOrder[0]);
    if (pole) this.logEvent('grid_set', pole, `takes pole; ${this.drivers.length} cars on the grid`, 'positive', 0.6);
  }
  private readonly PIT_ENTRY_POSITION = 0.85; // Near end of lap
  private readonly PIT_EXIT_POSITION = 0.15;  // Early in lap


  /** The stop rule at the flag (#249): each unmet stop or compound costs a
   * share of the driver's own average lap. Returns the penalty in ticks. */
  private assessStopRule(driver: Driver): { ticks: number; reason: string | null } {
    const pitVars = this.getPitVars();
    const owed = this.stopsOwed(driver);
    if (owed.needed === 0) return { ticks: 0, reason: null };
    const avgLap = driver.lapTimes.length ? driver.lapTimes.reduce((a, b) => a + b, 0) / driver.lapTimes.length : this.config.lapLength / 7;
    const ticks = Math.round(owed.needed * pitVars.penaltyLapFraction * avgLap);
    const parts: string[] = [];
    if (owed.stops > 0) parts.push(`${owed.stops} stop${owed.stops > 1 ? 's' : ''} short`);
    if (owed.compounds.length > 0) parts.push(`never used ${owed.compounds.join(' or ')}`);
    return { ticks, reason: parts.join(', ') };
  }

  /** Apply the stop rule to a driver being classified now. */
  private classifyWithPenalty(driver: Driver, finishTick: number): Partial<Driver> {
    const { ticks, reason } = this.assessStopRule(driver);
    if (ticks > 0) {
      this.logEvent('penalty', driver, `+${(ticks / Math.max(1, driver.lapTimes.at(-1) ?? 100)).toFixed(1)} laps penalty — ${reason}`, 'negative', 0.9);
    }
    return { finishTick, penaltyTicks: ticks, penaltyReason: reason };
  }

  /** Stable per-race strategy archetype: -1 (short stints, aggressive),
   * 0 (standard), +1 (long stints, conservative). Drawn from the side seed
   * stream — replays with the race, never touches the main RNG. Roughly a
   * third of the field lands in each group, so strategies align in 2-3
   * camps the way real teams converge, rather than per-driver scatter. */
  private getStrategyArchetype(driver: Driver): number {
    const r = mulberry32(deriveSeed(this.strategySeed, 'pitstrat', driver.id))();
    return r < 1 / 3 ? -1 : r < 2 / 3 ? 0 : 1;
  }

  // Calculate pit WORK duration (the stationary part where tires are changed)
  // This is separate from pit lane driving time which is based on speed limit
  private calculatePitWorkDuration(driver: Driver): { duration: number; isSlowStop: boolean; isQuickStop: boolean } {
    const pitVars = this.getPitVars();

    // Base duration for pit work (tire change, etc.)
    const baseDuration = pitVars.basePitDuration;

    // Check for slow/quick pit stop based on team's pit crew stat
    // Pit crew: 1 star = 35% slow / 8% quick, 5 stars = 7% slow / 28% quick
    const pitCrewStat = driver.teamStats?.pitCrew ?? 3;
    const slowStopChance = pitVars.slowStopBase - pitCrewStat * pitVars.slowStopPerStar;
    const quickStopChance = pitVars.quickStopBase + pitCrewStat * pitVars.quickStopPerStar;

    const roll = this.rng();
    const isSlowStop = roll < slowStopChance;
    const isQuickStop = !isSlowStop && roll < (slowStopChance + quickStopChance);

    let finalDuration = baseDuration;
    if (isSlowStop) {
      // Slow stop adds extra time to pit work
      finalDuration = Math.floor(baseDuration * pitVars.slowStopMultiplier);
    } else if (isQuickStop) {
      // Quick stop cuts pit work time
      finalDuration = Math.floor(baseDuration * pitVars.quickStopMultiplier);
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

  /**
   * Which compound goes on (#246). If the rule still owes compounds, pick
   * from those; otherwise anything but the one coming off. Prefer the
   * compound whose life best fits the laps left — the last stop wants one
   * that can go the distance, earlier stops the shorter ones — with the
   * archetype breaking ties softer (aggressive) or harder (conservative).
   */
  private selectNewTires(driver: Driver): TireCompound {
    const all: TireCompound[] = ['soft', 'medium', 'hard'];
    const owed = this.stopsOwed(driver);
    const pool = owed.compounds.length ? owed.compounds : all.filter(c => c !== driver.tireState.compound);
    const lapsLeft = this.config.totalLaps - driver.currentLap;
    const stopsAfterThis = Math.max(0, owed.needed - 1);
    const arch = this.getStrategyArchetype(driver); // -1 aggressive … +1 conservative
    const stintTarget = lapsLeft / (stopsAfterThis + 1);
    const score = (c: TireCompound) => {
      const v = this.getTireCompound(c);
      const shortfall = Math.max(0, stintTarget - v.lifeLaps - 0.5);
      const pace = (1 - v.speedBonus) * 100;          // softer = lower = better
      return shortfall * 4 + pace + arch * 0.6 * (2 - all.indexOf(c));
    };
    return [...pool].sort((a, b) => score(a) - score(b))[0] ?? 'medium';
  }


  // === CRASH DETECTION METHODS ===

  private detectProximityPairs(): Array<[Driver, Driver]> {
    if (!this.config.enableCrashes) return [];

    // Grace period at race start - everyone starts bunched up
    const crashVars = this.getCrashVars();
    if (this.raceState.totalTicks < crashVars.crashGracePeriod) return [];

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
      if (this.rng() > crashVars.safetyCarsReduction) {
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
    // A car held in line behind another (#246 pass 3) is following, not
    // wrecking: the risk of a battle lives in the pass attempts, not the queue.
    const held = this.stuckBehind.has(d1.id) || this.stuckBehind.has(d2.id);
    if (held) crashChance *= this.getOvertakingVars().heldCrashFactor;

    // Random roll
    if (this.rng() < crashChance) {
      // CRASH!
      const dnfDriverIds: number[] = [];
      const damagedDriverIds: number[] = [];

      // Initial collision - survival chance each
      for (const driver of [d1, d2]) {
        if (this.rng() < crashVars.initialSurvivalChance) {
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
        if (this.rng() < crashVars.pileupParticipationChance) {
          if (this.rng() < crashVars.pileupSurvivalChance) {
            damagedDriverIds.push(nearby.id);
          } else {
            dnfDriverIds.push(nearby.id);
          }
        }
      }

      return { crashed: true, dnfDriverIds, damagedDriverIds };
    }

    // Close call event (tension builder)
    if (this.rng() < crashChance * crashVars.secondaryAccidentMultiplier) {
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
    // Trigger chance (default 100%). Rolled on the TAG side stream, never the
    // main `rng`: a tag's presence must not reshuffle the race for everyone
    // else — a zero-effect Quirk has to be byte-inert (#231). A certain
    // trigger draws nothing at all.
    const triggerChance = tag.triggerChance ?? 1.0;
    if (triggerChance < 1 && this.tagRoll(driver.id, tag.id) > triggerChance) {
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
    for (const tag of driver.tags) {
      // Conditional tags are gated live every tick (getConditional*), not stored
      // as a one-time activation — skip them here so they don't become always-on.
      if (tag.condition) continue;
      this.tryActivateTag(driver, tag, context);
    }
  }

  // === CONDITIONAL TAG EVALUATION (the live, per-tick gate — see #156) ===

  /** Rebuild the per-driver race context used to gate conditional tags. Called
   * once per tick after positions and traffic settle. Deterministic (no RNG). */
  private rebuildRaceContexts(): void {
    const ordered = this.getDrivers(); // race order: P1 at index 0
    const fieldSize = ordered.filter(d => d.status !== 'dnf').length;
    const lapLength = this.config.lapLength;
    const totalLaps = this.config.totalLaps;
    const dist = (d: Driver) => d.currentLap * lapLength + d.position;
    const conditions = [...this.currentConditions];

    this.raceContextCache = new Map();
    ordered.forEach((d, i) => {
      const ahead = i > 0 ? ordered[i - 1] : null;
      const behind = i < ordered.length - 1 ? ordered[i + 1] : null;
      this.raceContextCache.set(d.id, {
        position: i + 1,
        fieldSize,
        lapProgress: totalLaps > 0 ? Math.min(1, d.currentLap / totalLaps) : 0,
        gapAhead: ahead ? dist(ahead) - dist(d) : Infinity,
        gapBehind: behind ? dist(d) - dist(behind) : Infinity,
        inTraffic: this.driversInTraffic.has(d.id),
        tireWear: d.tireState?.wear ?? 0,
        isDamaged: d.isDamaged,
        safetyCar: this.raceState.unsafetyCarActive,
        conditions,
      });
    });
  }

  /** Combined multiplier from this driver's currently-satisfied conditional tags. */
  private getConditionalModifier(driverId: number, modifier: 'speedModifier' | 'consistencyModifier' | 'luckModifier' | 'pitSpeedModifier'): number {
    const ctx = this.raceContextCache.get(driverId);
    if (!ctx) return 1;
    const driver = this.drivers.find(d => d.id === driverId);
    if (!driver) return 1;

    let result = 1;
    for (const tag of driver.tags) {
      if (!tag.condition) continue;
      if (!evaluateTagCondition(tag.condition, ctx)) continue;
      const v = tag.effects[modifier];
      if (typeof v === 'number') result *= v;
    }
    return result;
  }

  /** Combined crash-resistance delta from this driver's satisfied conditional tags. */
  private getConditionalCrashResistance(driverId: number): number {
    const ctx = this.raceContextCache.get(driverId);
    if (!ctx) return 0;
    const driver = this.drivers.find(d => d.id === driverId);
    if (!driver) return 0;

    let result = 0;
    for (const tag of driver.tags) {
      if (!tag.condition) continue;
      if (!evaluateTagCondition(tag.condition, ctx)) continue;
      result += tag.effects.crashResistance ?? 0;
    }
    return result;
  }

  /** Directly set the active conditions (e.g. ['rain']) — used by tests. The
   * normal path is setWeather, which recomputes from its source. */
  setRaceConditions(ids: string[]): void {
    this.currentConditions = new Set(ids);
  }

  /** Recompute the active condition set from the weather, so
   * condition-gated tags see it (none stamp anything until Wet, v0.6). */
  private recomputeConditions(): void {
    this.currentConditions = new Set(this.weather?.conditions ?? []);
  }

  /** Set this race's weather (C2): applies a field-wide lean and stamps its
   * conditions so condition-gated tags (Rain Dancer) wake. Pass null for none. */
  setWeather(weather: WeatherState | null): void {
    this.weather = weather;
    this.recomputeConditions();
  }

  getWeather(): WeatherState | null {
    return this.weather;
  }

  /** #82 mistakes layer — non-terminal driver errors (spin, lock-up, wide
   * moment): real time lost, car intact. Rides the unified effect system
   * (expiry + timing-tower icon for free) and logs a dedicated
   * 'driver_error' event so the lab and season digests can count mistakes
   * directly. One mistake at a time per driver plus a refractory window;
   * suppressed under the Unsafety Car (consistent with crash/blowout/mech).
   * DETERMINISM INVARIANT: gated on mistakeBaseChance — at canon 0 this
   * method draws NO RNG, so seed streams stay byte-identical to today
   * (same pattern as accelEffect). Spec: BALANCE_DOMINANCE_PASS.md §3. */
  private processMistakes(): void {
    const perfVars = this.getPerformanceVars();
    if (perfVars.mistakeBaseChance <= 0) return; // dormant: no RNG drawn
    if (this.raceState.unsafetyCarActive) return;

    const now = this.raceState.totalTicks;
    for (const driver of this.drivers) {
      if (driver.status !== 'racing') continue;
      if ((this.mistakeBlockedUntilTick.get(driver.id) ?? 0) > now) continue;

      // pMistake = base × (1 + (1−normC)·cWeight) × (1 + normA·aWeight)
      // (stats span 0.3–0.8; norm maps that to 0–1)
      const normC = Math.min(1, Math.max(0, (driver.stats.consistency - 0.3) / 0.5));
      const normA = Math.min(1, Math.max(0, (driver.stats.aggression - 0.3) / 0.5));
      let pMistake = perfVars.mistakeBaseChance
        * (1 + (1 - normC) * perfVars.mistakeConsistencyWeight)
        * (1 + normA * perfVars.mistakeAggressionWeight);
      if (driver.isDamaged) pMistake *= 1 + perfVars.mistakeDamageWeight;

      if (this.rng() >= pMistake) continue;

      const flavor = RaceEngine.MISTAKE_FLAVORS[
        Math.floor(this.rng() * RaceEngine.MISTAKE_FLAVORS.length)
      ];
      this.mistakeBlockedUntilTick.set(
        driver.id,
        now + perfVars.mistakeDurationTicks + perfVars.mistakeCooldownTicks
      );
      this.createTrackEffect(
        `mistake-${flavor.id}`,
        flavor.name,
        flavor.emoji,
        [driver.id],
        now + perfVars.mistakeDurationTicks,
        { speedModifier: perfVars.mistakeSpeedPenalty }
      );
      this.logEvent(
        'driver_error',
        driver,
        `${flavor.name}: ${driver.name} ${flavor.text}`,
        'negative',
        0.8,
        flavor.emoji
      );
    }
  }

  /** Tag ids currently contributing effects for a driver: conditional tags
   * whose gate is open this tick + stored tag activations still live. Display
   * surface for the timing tower (lit vs dormant chips). */
  getActiveTagIds(driverId: number): string[] {
    const active: string[] = [];

    const ctx = this.raceContextCache.get(driverId);
    const driver = this.drivers.find(d => d.id === driverId);
    if (driver && ctx) {
      for (const tag of driver.tags) {
        if (tag.condition && evaluateTagCondition(tag.condition, ctx)) active.push(tag.id);
      }
    }

    const effects = this.unifiedEffects.get(driverId);
    if (effects) {
      for (const e of effects) {
        if (e.source === 'tag' &&
            (e.expiresAtTick === null || e.expiresAtTick > this.raceState.totalTicks)) {
          active.push(e.sourceId);
        }
      }
    }
    return active;
  }

  // === ENVIRONMENT EFFECTS (weather, field-wide) ===
  // Dry weathers and tracks favour stats through the card math at roster build
  // (src/cards/apply.ts); these leans are empty until Wet returns in v0.6.

  private getEnvSpeedModifier(): number {
    return this.weather?.effects.speedModifier ?? 1;
  }

  private getEnvConsistencyModifier(): number {
    return this.weather?.effects.consistencyModifier ?? 1;
  }

  /**
   * Everything acting on one driver, with plain-words reasons — the data the
   * tag card and the focus row's effect stack read (#243). Inert entries
   * (dormant gated tags, triggered tags that haven't fired) are included with
   * active=false so the UI can say WHY a chip is dim.
   */
  getEffectStack(driverId: number): EffectStackEntry[] {
    const driver = this.drivers.find(d => d.id === driverId);
    if (!driver) return [];
    const ctx = this.raceContextCache.get(driverId);
    const now = this.raceState.totalTicks;
    const out: EffectStackEntry[] = [];
    const liveTagEffects = (this.unifiedEffects.get(driverId) ?? []).filter(e => e.source === 'tag');

    for (const tag of driver.tags) {
      const fx = tag.effects;
      const base = { source: 'tag' as const, id: tag.id, name: tag.name, emoji: tag.emoji, tag,
        speed: fx.speedModifier ?? 1, consistency: fx.consistencyModifier ?? 1, luck: fx.luckModifier ?? 1,
        crash: fx.crashResistance ?? 0, pit: fx.pitSpeedModifier ?? 1 };
      if (tag.condition) {
        const open = ctx ? evaluateTagCondition(tag.condition, ctx) : false;
        const words = describeCondition(tag.condition);
        out.push({ ...base, active: open, reason: open ? `on: ${words}` : `needs: ${words}` });
        continue;
      }
      if (tag.trigger === 'passive') {
        const ir = this.getInRaceTagInfo(driverId, tag.id);
        if (ir) {
          const left = ir.duration === 'until-pit' ? 'until the next stop' : ir.duration === 'race' ? 'rest of race'
            : ir.expiresAtLap !== null ? `${Math.max(0, ir.expiresAtLap - driver.currentLap)} lap${ir.expiresAtLap - driver.currentLap === 1 ? '' : 's'} left`
            : 'carries into the next race';
          out.push({ ...base, active: true, reason: `picked up L${ir.sinceLap + 1} · ${left}` });
        } else {
          out.push({ ...base, active: true, reason: 'always on' });
        }
        continue;
      }
      const live = liveTagEffects.find(e => e.sourceId === tag.id && (e.expiresAtTick === null || e.expiresAtTick > now));
      const fired = this.tagActivatedThisRace.has(`${driverId}-${tag.id}`);
      const chance = tag.triggerChance ?? 1;
      const chanceWords = chance < 1 ? ` (${Math.round(chance * 100)}% chance)` : '';
      if (live) {
        const left = live.expiresAtTick === null ? 'rest of race' : `${live.expiresAtTick - now} ticks left`;
        out.push({ ...base, active: true, reason: `fired ${TRIGGER_LABELS[tag.trigger]} · ${left}` });
      } else if (fired) {
        out.push({ ...base, active: false, speed: 1, consistency: 1, luck: 1, crash: 0, pit: 1, reason: `fired earlier this race · spent` });
      } else {
        out.push({ ...base, active: false, speed: 1, consistency: 1, luck: 1, crash: 0, pit: 1, reason: `waits for: ${TRIGGER_LABELS[tag.trigger]}${chanceWords}` });
      }
    }

    // Environment: weather, field-wide (favours are baked into the stats)
    if (this.weather && !isNeutralWeather(this.weather) && Object.keys(this.weather.effects).length) {
      const w = this.weather.effects;
      out.push({ source: 'weather', id: this.weather.id, name: this.weather.name, emoji: this.weather.emoji, active: true,
        reason: 'field-wide', speed: w.speedModifier ?? 1, consistency: w.consistencyModifier ?? 1, luck: 1, crash: w.crashResistance ?? 0, pit: 1 });
    }

    // Mistakes and other timed strikes on this driver (unified effects, source 'track')
    for (const e of this.unifiedEffects.get(driverId) ?? []) {
      if (e.source !== 'track') continue;
      if (e.expiresAtTick !== null && e.expiresAtTick <= now) continue;
      const isInfliction = e.sourceId.startsWith('infliction-');
      const left = e.expiresAtTick === null ? 'rest of race' : `${e.expiresAtTick - now} ticks left`;
      out.push({ source: isInfliction ? 'infliction' : 'track_event', id: e.sourceId, name: e.sourceName, emoji: e.sourceEmoji,
        active: true, reason: left, speed: e.speedModifier, consistency: e.consistencyModifier, luck: e.luckModifier, crash: e.crashResistance, pit: e.pitSpeedModifier });
    }


    if (this.raceState.unsafetyCarActive) {
      out.push({ source: 'safety_car', id: 'safety-car', name: 'Safety car', emoji: '🚨', active: true, reason: 'field held to the SC speed limit',
        speed: 1, consistency: 1, luck: 1, crash: 0, pit: 1 });
    }
    return out;
  }

  private getEnvCrashResistance(): number {
    return this.weather?.effects.crashResistance ?? 0;
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

  // Legacy getters that now combine stored effects (one-time activations + track
  // events) with live conditional-tag contributions (gated every tick).
  private getTagSpeedModifier(driverId: number): number {
    return this.getEffectModifier(driverId, 'speedModifier') * this.getConditionalModifier(driverId, 'speedModifier');
  }

  private getTagConsistencyModifier(driverId: number): number {
    return this.getEffectModifier(driverId, 'consistencyModifier') * this.getConditionalModifier(driverId, 'consistencyModifier');
  }

  private getTagLuckModifier(driverId: number): number {
    return this.getEffectModifier(driverId, 'luckModifier') * this.getConditionalModifier(driverId, 'luckModifier');
  }

  private getTagCrashResistance(driverId: number): number {
    // Stored effects + live conditional tags + field-wide environment (weather
    // rain/fog and hazardous tracks raise everyone's crash risk; a Rain Dancer's
    // own resistance offsets it).
    const combined = this.getEffectCrashResistance(driverId)
      + this.getConditionalCrashResistance(driverId)
      + this.getEnvCrashResistance();
    return Math.max(-0.5, Math.min(0.5, combined));
  }

  private getTagPitModifier(driverId: number): number {
    return this.getEffectModifier(driverId, 'pitSpeedModifier') * this.getConditionalModifier(driverId, 'pitSpeedModifier');
  }

  private tick(): void {
    this.raceState.totalTicks++;
    const previousLeader = this.raceState.currentLeader;
    if (this.raceState.totalTicks === 1) this.runQualifying();

    // === TRACK EVENT SYSTEM ===
    // Clean up expired effects
    this.cleanupExpiredEffects();
    this.expireInRaceTagsByLap();

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
    // Who's in traffic this tick (aggression's reward window — see calculateSpeed)
    this.driversInTraffic.clear();
    for (const pair of proximityPairs) {
      this.driversInTraffic.add(pair[0].id);
      this.driversInTraffic.add(pair[1].id);
    }

    // Refresh conditional-tag context now that position + traffic are known this
    // tick, before crash resistance and speed modifiers are read below.
    this.rebuildRaceContexts();

    this.processMistakes();

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

        // Unsafety Car (#246): a car stranded on track brings it out some of the
        // time; a real pileup (3+ cars) always does. Every crash used to summon it.
        const totalInvolved = result.dnfDriverIds.length + result.damagedDriverIds.length;
        const stranded = result.dnfDriverIds.length;
        const scVars = this.getSafetyCarVars();
        if (totalInvolved >= 3 || (stranded > 0 && this.rng() < scVars.deployChancePerDnf)) {
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

    // Move front-to-back so each chaser can see where the car ahead ended up.
    const Lm = this.config.lapLength;
    this.drivers = [...this.drivers].sort((a, b) => (b.currentLap * Lm + b.position) - (a.currentLap * Lm + a.position));
    this.tickSpeeds.clear();
    this.tickDistance.clear();
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
          // True pit-lane time: entry → exit. (The old formula subtracted the
          // PREVIOUS stop's tick, so stops 2+ recorded the whole stint length
          // as their 'duration' — 85s 'stops' in race reports.)
          const totalPitDuration = this.raceState.totalTicks
            - (driver.currentPitEntryTick ?? this.raceState.totalTicks);

          const pitStop: PitStopInfo = {
            lap: newLap,
            tick: this.raceState.totalTicks,
            duration: totalPitDuration,
            tiresBefore: driver.tireState.compound,
            tiresAfter: newCompound,
            wasSlowStop: driver.currentPitIsSlowStop || false,
            wasQuickStop: driver.currentPitIsQuickStop || false,
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
            // Rejoining traffic from a standstill: acceleration's moment
            accelBoostUntilTick: this.raceState.totalTicks + this.getPerformanceVars().accelLaunchTicks,
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

        this.logEvent('pit_entry', driver, `Boxes — ${this.pitReasons.get(driver.id) ?? 'tyres'}`, 'neutral', 0.4);

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
          currentPitEntryTick: this.raceState.totalTicks,
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

      // Dirty air: a car that spent last tick stuck behind someone loses pace.
      const dirtyAir = this.stuckBehind.has(driver.id) ? 1 - this.getOvertakingVars().dirtyAir : 1;
      const adjustedSpeed = factors.finalSpeed * tireModifier * powerMultiplier * unsafetyCarLimit * dirtyAir;

      // Update factors with tire modifier for analytics
      factors.tireModifier = tireModifier;

      this.tickSpeeds.set(driver.id, adjustedSpeed);
      let newPosition = this.resolveOvertake(driver, driver.position + adjustedSpeed, adjustedSpeed);
      this.tickDistance.set(driver.id, driver.currentLap * this.config.lapLength + newPosition);
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
        speedSmooth: driver.speedSmooth > 0 ? driver.speedSmooth * 0.85 + adjustedSpeed * 0.15 : adjustedSpeed,
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
          ...this.classifyWithPenalty(this.drivers[driverIndex], this.raceState.totalTicks),
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
              ...this.classifyWithPenalty(this.drivers[driverIndex], this.raceState.totalTicks),
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
              ...this.classifyWithPenalty({ ...this.drivers[driverIndex], lapTimes: newLapTimes }, this.raceState.totalTicks),
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
        // Then by finish tick plus any flag penalty (earlier = better position)
        return ((a.finishTick || 0) + a.penaltyTicks) - ((b.finishTick || 0) + b.penaltyTicks);
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

    // Record one position snapshot per leader-lap for the lap chart. A lap-0
    // snapshot (the starting grid) lands on the first tick, so the chart has
    // content the moment a race begins.
    if (this.lapPositionHistory.length === 0 && sorted.length > 0) {
      this.lapPositionHistory.push({ lap: 0, order: this.gridOrder.length ? [...this.gridOrder] : sorted.map(d => d.id), sc: false });
    }
    const leaderLap = sorted.length
      ? Math.max(0, ...sorted.filter(d => d.status !== 'dnf').map(d => d.currentLap))
      : 0;
    if (leaderLap >= 1 && leaderLap > this.lastRecordedLap) {
      this.lapPositionHistory.push({
        lap: leaderLap,
        order: sorted.map(d => d.id),
        sc: this.raceState.unsafetyCarActive,
      });
      this.lastRecordedLap = leaderLap;
    }

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

        // Real passes are logged where they happen (resolveOvertake); a jump of
        // 3+ places in one tick is someone else's misfortune, worth a line.
        if (positionsGained >= 3) {
          this.logEvent('overtake', driver, `gains ${positionsGained} places in one go`, 'positive', Math.min(1, positionsGained / 5));
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

    // Cap stored events to prevent memory issues in long live races.
    // League settle raises maxStoredEvents so backfilled digests keep everything.
    if (this.raceEvents.length > this.config.maxStoredEvents) {
      // Keep the trimmed head in the full log so reports see the whole race.
      const dropped = this.raceEvents.length - this.config.maxStoredEvents;
      this.droppedEvents.push(...this.raceEvents.slice(0, dropped));
      this.raceEvents = this.raceEvents.slice(-this.config.maxStoredEvents);
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
    const message = deployMessages[Math.floor(this.rng() * deployMessages.length)];

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
    const scVars = this.getSafetyCarVars();
    const newPosition = this.raceState.unsafetyCarPosition + scVars.unsafetyCarSpeed;

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

    // The restart scramble: acceleration's moment for the whole field
    const accelWindow = this.getPerformanceVars().accelLaunchTicks;
    this.drivers = this.drivers.map(d =>
      d.status === 'racing'
        ? { ...d, accelBoostUntilTick: this.raceState.totalTicks + accelWindow }
        : d
    );

    // Sentient recall messages
    const recallMessages = [
      'The Unsafety Car retreats to The Void. For now.',
      'The Unsafety Car grows bored. It departs.',
      'Satisfied, the Unsafety Car returns to slumber.',
      'The Unsafety Car vanishes. It will remember this.',
      'The Void reclaims its champion. Racing resumes.',
    ];
    const message = recallMessages[Math.floor(this.rng() * recallMessages.length)];

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
    const scVars = this.getSafetyCarVars();
    const TARGET_GAP = scVars.targetGap;         // Gap between cars under SC
    const SC_CRUISE_SPEED = scVars.cruiseSpeed;  // Safety car cruise speed
    const CATCH_UP_SPEED = scVars.catchUpSpeed;  // Speed when catching up to SC

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

      // If the field is still catching up to the SC, match the catch-up pace
      // rather than braking for a "correct" gap — but NEVER closer than half
      // the target gap. Without this floor the whole queue piled onto a
      // single point during the catch-up phase.
      if (fieldIsCatchingUp && currentGap <= TARGET_GAP * 1.5 && currentGap >= TARGET_GAP * 0.5) {
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
  static createForWorker(simVars?: SimVariables, seed?: number): RaceEngine {
    // Bypass singleton pattern - directly instantiate
    const engine = new RaceEngine();
    if (simVars) {
      engine.simVars = simVars;
    }
    if (seed !== undefined) {
      engine.setSeed(seed);
    }
    return engine;
  }

  /**
   * Run a complete race synchronously (for headless simulation).
   * Does not use setInterval - calls tick() directly in a loop.
   * Returns the final state when race is complete.
   * Pass a seed for a deterministic race (same seed + roster + config =
   * identical result, replayable live via setSeed() + start()).
   */
  runHeadless(seed?: number): { drivers: Driver[]; raceState: RaceState; events: RaceEvent[] } {
    if (seed !== undefined) {
      this.setSeed(seed);
    }
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
      events: this.getFullEvents().slice(), // uncapped: digests and reports see the whole race
    };
  }
}

export default RaceEngine;
