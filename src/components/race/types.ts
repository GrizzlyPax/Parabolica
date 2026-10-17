import type { IconId } from '../../icons/registry';
// Shared types for race components
import type { FieldRank } from '../../betting/utils';
import type { Step } from '../../look/step';

/** A title as a ribbon (#769): the step it was won at, its name, the state for its colours. */
export interface TitleTag { step: Step; name: string; stateId?: string }

import { Driver, RaceState, EffectStackEntry } from '../../RaceEngine';

/** One kind of thing that happened to a driver, with the laps it happened on. */
export interface DriverHistoryEntry {
  key: string;
  emoji: string;
  name: string;
  laps: number[];
  kind: 'effect' | 'event' | 'error' | 'pit' | 'crash' | 'pass' | 'penalty';
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
  /** Your latest title (#769): your rows wear its ribbon; rivals none. */
  title?: TitleTag;
  /** The garage as the screen names it (#778): its title after Locals; the data name otherwise. */
  teamName?: string;
  /** A rival in Season Mode (#322): no ranks, no effect stack, cards as metal dots. */
  sealed?: boolean;
  /** Your team's car (Season Mode): the row wears a faded team colour (Pax, Oct 9). */
  mine?: boolean;
  /** The nemesis team's driver (#635): tagged NEMESIS. */
  nemesis?: boolean;
  /** Season Mode (#489): this driver's portrait and their car's vehicle. */
  avatar?: { portrait: IconId; vehicle: IconId };
  /** Qualifying board (#617): this driver's lap, gap to pole, and how it went. */
  quali?: { time: string; gap: string; pole: boolean; ruined: boolean };
  /** In a fight right now: attacking the car ahead or defending from the car behind. */
  battle?: { role: 'attacking' | 'defending'; ticks: number; otherId: number };
  intervalGap: string;
  leaderGap: string;
  lastLapTime: number | null;
  lastLapClass: LapTimeClass;
  bestLapTime: number | null;
  bestLapClass: LapTimeClass;
  statusEmoji?: string;
  /** Everything acting on this driver right now, with reasons (engine.getEffectStack). */
  effectStack?: EffectStackEntry[];
  /** What has happened TO this driver so far, grouped: "🔧 Pit Lane Special · L3, L9". */
  history?: DriverHistoryEntry[];
  isFocused: boolean;
  isFinished: boolean;
  isDNF: boolean;
  /** Taken out by a lap cut (#694): shown as OUT, apart from a DNF. */
  isEliminated?: boolean;
  isPitting: boolean;
  // For tire history chart
  currentLap: number;
  totalLaps: number;
}

// Lap time styling class
export type LapTimeClass = '' | 'fastest' | 'improved' | 'slower';

// View types
/** The race's views (#778): the map, the stand's camera, the data screen, the lap chart. */
export type RaceView = 'track' | 'stand' | 'detail' | 'lap';
/** Who the picture is about (#778): every car, your cars, or one car the camera follows. */
export type RaceScope = 'all' | 'mine' | 'follow';

// Session state for universal header
export type SessionState = 'qualifying' | 'racing' | 'safety-car' | 'final-lap' | 'finished';

// Props for TimingTower
export interface TimingTowerProps {
  drivers: Driver[];
  columns: ColumnConfig[];
  raceState: RaceState;
  totalLaps: number;
  lapLength: number;
  focusedDriverIds?: Set<number>; // Multi-driver focus
  onDriverClick?: (driverId: number) => void;
  /** The driver panel's "Driver card" button (#476). */
  onDriverCard?: (driverId: number) => void;
  condensed?: boolean;
  expandable?: boolean; // Show expanded row details on focus (default true, false for Detail View)
  statusEffects?: Map<number, string>;
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
  /** Your latest title (#769), worn by your rows. */
  title?: TitleTag;
  /** Garage data name → the name to show (#778: the title after Locals). */
  teamLabels?: Record<string, string>;
  /** Season Mode (#322): drivers whose detail stays dark (rivals). */
  sealed?: ReadonlySet<number>;
  /** Season Mode: your team's drivers (their rows are tinted). */
  mine?: ReadonlySet<number>;
  /** The nemesis team's drivers (#635). */
  nemesis?: ReadonlySet<number>;
  /** Season Mode (#489): portraits + vehicles by driver id. */
  avatars?: ReadonlyMap<number, { portrait: IconId; vehicle: IconId }>;
  /** The Hundred (#694): window the tower on the leaders, your cars and the next cut line (`keep` teams go on);
   * the rest collapses into "+N running" rows and the cars that are out into one. */
  window?: { keep: number };
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
  /** Open this driver's card (#476). */
  onCard?: () => void;
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
  /** The track's kind, under its name (#750: Board Track, Brickyard…). */
  trackKind?: string;
  /** Ambient conditions for this race (weather, track character). */
  conditions?: ConditionChip[];
  /** This race's priority stats (track + weather favours), shown as a chip. */
  priority?: string[];
  /** The track's tyre-wear dial (#547), shown as a pill beside the priority stats. */
  tyreWear?: number;
  elapsedTime: number;
  /** The views (#778): Track · Detail · Lap chart, as tabs in the masthead. */
  activeView: RaceView;
  onViewChange: (view: RaceView) => void;
  /** The scope (#778): all · mine · follow one, as a control in the masthead. */
  scope?: RaceScope;
  onScopeChange?: (scope: RaceScope) => void;
  /** The car the camera follows under `follow`, by surname. */
  followName?: string;
  /** Whether "Mine" is a thing here (a Season race). */
  hasMine?: boolean;
  /** The way out ("Paddock", "Menu", "Race Control"). */
  onExit?: () => void;
  exitLabel?: string;
  /** Season races: jump to the result. */
  onSkip?: () => void;
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
  /** The program line (#716): the step and the race, in gold, before the track. */
  program?: string;
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
