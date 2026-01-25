// Shared types for race components

import { Driver, RaceState } from '../../RaceEngine';
import { Bet } from '../../MarbleMode';

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
  betInfo?: BetInfo;
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

// Bet information for a driver
export interface BetInfo {
  totalAmount: number;
  bets: Array<{
    type: string;
    amount: number;
    isWinning: boolean;
  }>;
  overallStatus: 'winning' | 'losing' | 'pending';
}

// View types
export type RaceView = 'track' | 'detail' | 'standings';

// Session state for universal header
export type SessionState = 'racing' | 'safety-car' | 'final-lap' | 'finished';

// Props for TimingTower
export interface TimingTowerProps {
  drivers: Driver[];
  columns: ColumnConfig[];
  raceState: RaceState;
  totalLaps: number;
  lapLength: number;
  activeBets?: Bet[];
  focusedDriverIds?: Set<number>; // Multi-driver focus
  onDriverClick?: (driverId: number) => void;
  condensed?: boolean;
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
