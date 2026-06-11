// Shared types for race components

import { Driver, RaceState } from '../../RaceEngine';

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
  intervalGap: string;
  leaderGap: string;
  lastLapTime: number | null;
  lastLapClass: LapTimeClass;
  bestLapTime: number | null;
  bestLapClass: LapTimeClass;
  statusEmoji?: string;
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
export type RaceView = 'track' | 'detail';

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
  positionDeltas?: Map<number, number>;
  fastestLapOverall?: number;
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

// Props for UniversalHeader
export interface UniversalHeaderProps {
  currentLap: number;
  totalLaps: number;
  sessionState: SessionState;
  trackName: string;
  trackEmoji: string; // Fun/theme emoji for the track
  trackFlagEmoji?: string; // Flag emoji for the track location
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
