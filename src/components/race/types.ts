// Shared types for race components
import type { FieldRank } from '../../betting/utils';
import type { FantasyConfig } from '../../fantasy/types';

import { Driver, RaceState, EffectStackEntry } from '../../RaceEngine';

/** One kind of thing that happened to a driver, with the laps it happened on. */
export interface DriverHistoryEntry {
  key: string;
  emoji: string;
  name: string;
  laps: number[];
  kind: 'tag' | 'event' | 'error' | 'pit' | 'crash' | 'pass' | 'penalty';
}

// Column configuration for TimingTower
export interface ColumnConfig {
  id: string;
  header: string;
  width: string; // CSS grid width (e.g., '28px', 'minmax(50px, 1fr)')
  align: 'left' | 'center' | 'right';
  render: (driver: Driver, context: RowContext) => React.ReactNode;
}

// Context passed to each column's render function
export interface RowContext {
  displayPosition: string;
  positionDelta?: number;
  /** Starting grid slot (1 = pole), or undefined before qualifying. */
  gridSlot?: number;
  /** Where this driver's skill / car package ranks in this field (stats only, not race form). */
  driverRank?: FieldRank;
  carRank?: FieldRank;
  /** The fantasy team that drafted this driver, if any. */
  fantasyTeam?: { name: string; color: string };
  /** A rival in Season Mode (#322): no ranks, no effect stack, cards as metal dots. */
  sealed?: boolean;
  /** Speed vs the running pack's median this tick: 'hot' ≥ +4%, 'quick' ≥ +1%, 'slow' ≤ −3%, else 'pack'. */
  speedTone?: 'hot' | 'quick' | 'pack' | 'slow';
  /** Speed relative to the pack median, −1…+1 over ±8%. */
  speedRel?: number;
  /** In a fight right now: attacking the car ahead or defending from the car behind. */
  battle?: { role: 'attacking' | 'defending'; ticks: number; otherId: number };
  intervalGap: string;
  leaderGap: string;
  lastLapTime: number | null;
  lastLapClass: LapTimeClass;
  bestLapTime: number | null;
  bestLapClass: LapTimeClass;
  statusEmoji?: string;
  /** Tag ids currently contributing effects (conditional gates open / triggered
   * activations live) — drives lit vs dormant tag chips. */
  activeTagIds?: Set<string>;
  /** Everything acting on this driver right now, with reasons (engine.getEffectStack). */
  effectStack?: EffectStackEntry[];
  /** What has happened TO this driver so far, grouped: "🔧 Pit Lane Special · L3, L9". */
  history?: DriverHistoryEntry[];
  isFocused: boolean;
  isFinished: boolean;
  isDNF: boolean;
  isPitting: boolean;
  // For tire history chart
  currentLap: number;
  totalLaps: number;
}

// Lap time styling class
export type LapTimeClass = '' | 'fastest' | 'improved' | 'slower';

// View types
export type RaceView = 'track' | 'detail' | 'lap';

// Session state for universal header
export type SessionState = 'racing' | 'safety-car' | 'final-lap' | 'finished';

// Props for TimingTower
export interface TimingTowerProps {
  drivers: Driver[];
  columns: ColumnConfig[];
  raceState: RaceState;
  totalLaps: number;
  lapLength: number;
  focusedDriverIds?: Set<number>; // Multi-driver focus
  onDriverClick?: (driverId: number) => void;
  condensed?: boolean;
  expandable?: boolean; // Show expanded row details on focus (default true, false for Detail View)
  statusEffects?: Map<number, string>;
  /** Per-driver tag ids currently contributing effects (see RowContext). */
  activeTags?: Map<number, Set<string>>;
  /** Per-driver effect stacks (see RowContext.effectStack). */
  effectStacks?: Map<number, EffectStackEntry[]>;
  /** Per-driver event history (see RowContext.history). */
  histories?: Map<number, DriverHistoryEntry[]>;
  positionDeltas?: Map<number, number>;
  /** Driver ids in starting-grid order (engine.getGridOrder()). */
  gridOrder?: number[];
  /** Live fights (engine.getBattles()). */
  battles?: { chaserId: number; aheadId: number; ticks: number }[];
  fastestLapOverall?: number;
  /** Fantasy teams in play: drafted rows carry their team's colour. */
  fantasy?: FantasyConfig;
  /** Season Mode (#322): drivers whose detail stays dark (rivals). */
  sealed?: ReadonlySet<number>;
  className?: string;
}

// Props for DriverRow
export interface DriverRowProps {
  driver: Driver;
  columns: ColumnConfig[];
  context: RowContext;
  gridTemplate: string;
  isFocused: boolean;
  expandable?: boolean; // Show expanded details when focused (default true)
  onClick?: () => void;
}

// Race speed options
export type RaceSpeed = 0.5 | 1 | 2 | 10;

// A small chip describing an ambient race condition (weather, track tag)
export interface ConditionChip {
  emoji: string;
  label: string;
}

// Props for UniversalHeader
export interface UniversalHeaderProps {
  currentLap: number;
  totalLaps: number;
  sessionState: SessionState;
  trackName: string;
  trackEmoji: string; // Fun/theme emoji for the track
  trackFlagEmoji?: string; // Flag emoji for the track location
  /** Ambient conditions for this race (weather, track character). */
  conditions?: ConditionChip[];
  elapsedTime: number;
  onMenuOpen: () => void;
  /** Show a pulsing LIVE pill (broadcast spectating). */
  liveBadge?: boolean;
  // Race controls
  isRunning?: boolean;
  raceFinished?: boolean;
  raceSpeed?: RaceSpeed;
  onStart?: () => void;
  onStop?: () => void;
  onReset?: () => void;
  onSpeedChange?: (speed: RaceSpeed) => void;
}

// Props for NavPanel
export interface NavPanelProps {
  isOpen: boolean;
  activeView: RaceView;
  onViewChange: (view: RaceView) => void;
  onClose: () => void;
  /** Leave the race entirely (back to main menu / league). */
  onExit?: () => void;
  exitLabel?: string;
  exitDescription?: string;
}

// Driver position on track map
export interface DriverPosition {
  driver: Driver;
  x: number;
  y: number;
  isFocused: boolean;
  isTop: boolean;
  isDNF: boolean;
  isPitting: boolean;
}
