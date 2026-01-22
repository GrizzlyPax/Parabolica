import { Driver, RaceConfig, RaceState, TrackInfo, TireCompound, RaceEvent } from './RaceEngine';
import { ticksToShortTime, formatGap } from './utils/raceTime';
import { useMemo, useRef, useEffect, useState } from 'react';
import { Bet, calculateLiveBetStatus } from './MarbleMode';
import './WatchMode.css';

export interface PowerActivation {
  power: { name: string; emoji: string; description: string; category: 'blessing' | 'curse' | 'god' };
  targetName?: string;
  timestamp: number;
}

interface WatchModeProps {
  drivers: Driver[];
  config: RaceConfig;
  raceState: RaceState;
  trackInfo: TrackInfo | null;
  onNextRace?: () => void;
  powerActivation?: PowerActivation | null;
  raceEvents?: RaceEvent[];  // For track event notifications
  activeBets?: Bet[];  // Marble Mode: current bets to display in timing tower
}

// Modular notification system for race events
export type NotificationType = 'crash' | 'lead_change' | 'pit_stop' | 'slow_pit_stop' | 'quick_pit_stop' | 'weather' | 'finish' | 'info' | 'overtake' | 'fastest_lap' | 'milestone' | 'power_blessing' | 'power_curse' | 'power_god' | 'track_event' | 'tag_activation';

export interface RaceNotification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  emoji: string;
  tick: number;
  expiresAt: number; // Timestamp for auto-removal
  drivers?: Array<{ id: number; name: string; emoji: string }>;
  color?: string; // Optional team color for styling
}

// Crash/blowout position for SVG effects (separate from notifications)
interface CrashPosition {
  x: number;
  y: number;
  tick: number;
  type: 'crash' | 'blowout';  // Different visual for tire blowouts
}

// Track event effect on a driver (shows emoji pop-up on track)
interface TrackEventEffect {
  driverId: number;
  emoji: string;
  impact: 'positive' | 'negative' | 'neutral';
  tick: number;
}

// Status effect for timing tower (persists longer than visual pop-up)
interface StatusEffect {
  driverId: number;
  emoji: string;
  expiresAtTick: number;
}

// Tire compound colors
const TIRE_COLORS: Record<string, string> = {
  soft: '#e74c3c',
  medium: '#f1c40f',
  hard: '#ecf0f1',
};

// Generate light and dark variants of a hex color
function getColorVariants(hexColor: string): { light: string; dark: string } {
  // Parse hex to RGB
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Light variant: blend toward white (70% original, 30% white)
  const lightR = Math.round(r * 0.6 + 255 * 0.4);
  const lightG = Math.round(g * 0.6 + 255 * 0.4);
  const lightB = Math.round(b * 0.6 + 255 * 0.4);

  // Dark variant: blend toward black (50% original, 50% black)
  const darkR = Math.round(r * 0.4);
  const darkG = Math.round(g * 0.4);
  const darkB = Math.round(b * 0.4);

  const toHex = (n: number) => n.toString(16).padStart(2, '0');

  return {
    light: `#${toHex(lightR)}${toHex(lightG)}${toHex(lightB)}`,
    dark: `#${toHex(darkR)}${toHex(darkG)}${toHex(darkB)}`,
  };
}

// Calculate driver overall rating (50-99)
function calculateDriverRating(driver: Driver): number {
  // Driver stats normalized to 0-1 scale
  const speedNorm = (driver.stats.baseSpeed - 0.85) / 0.30;        // 0.85-1.15 range
  const consistencyNorm = (driver.stats.consistency - 0.3) / 0.50; // 0.3-0.8 range
  const luckNorm = (driver.stats.luck - 0.3) / 0.50;               // 0.3-0.8 range
  const accelNorm = (driver.stats.acceleration - 0.85) / 0.30;     // 0.85-1.15 range
  const enduranceNorm = (driver.stats.endurance - 0.85) / 0.30;    // 0.85-1.15 range
  const aggressionNorm = (driver.stats.aggression - 0.3) / 0.50;   // 0.3-0.8 range (middle is best)

  // Driver weighted average (speed and consistency matter most)
  const driverScore = (
    speedNorm * 0.25 +
    consistencyNorm * 0.20 +
    accelNorm * 0.15 +
    enduranceNorm * 0.15 +
    luckNorm * 0.15 +
    (1 - Math.abs(aggressionNorm - 0.5) * 2) * 0.10  // Aggression: middle values are optimal
  );

  // Scale to 50-99 range (like FIFA/EA sports - nobody is below 50)
  return Math.round(50 + driverScore * 49);
}

// Calculate car overall rating (50-99)
function calculateCarRating(driver: Driver): number {
  if (!driver.carStats) return 50;

  // Car stats normalized to 0-1 scale (1-5 stars)
  const carPower = (driver.carStats.power - 1) / 4;
  const carGrip = (driver.carStats.grip - 1) / 4;
  const carReliability = (driver.carStats.reliability - 1) / 4;

  // Car weighted average (power matters most for pace)
  const carScore = (
    carPower * 0.45 +
    carGrip * 0.35 +
    carReliability * 0.20
  );

  // Scale to 50-99 range
  return Math.round(50 + carScore * 49);
}

// Get color for overall rating (F1 style: red < yellow < green < purple)
function getOverallRatingColor(rating: number): string {
  if (rating >= 90) return '#a855f7';  // Purple - elite
  if (rating >= 80) return '#22c55e';  // Green - great
  if (rating >= 70) return '#eab308';  // Yellow - good
  return '#ef4444';                     // Red - below average
}

// Default fallback track path (oval) if no layout provided
const DEFAULT_TRACK_PATH = 'M 150 60 L 450 60 Q 550 60, 550 150 Q 550 240, 450 240 L 150 240 Q 50 240, 50 150 Q 50 60, 150 60 Z';

// Pit lane entry/exit positions along track (as percentage 0-1)
const PIT_ENTRY_POSITION = 0.85; // Near end of lap
const PIT_EXIT_POSITION = 0.15;  // Early in next lap

// Generate a pit lane path that connects entry point to exit point
// This creates a shortcut through the infield
function generatePitLanePath(entry: { x: number; y: number }, exit: { x: number; y: number }): string {
  // Create a curved path from entry to exit through the center area
  const midX = (entry.x + exit.x) / 2;
  const midY = (entry.y + exit.y) / 2;
  // Curve inward toward center of track
  const controlX = 300; // Center X
  const controlY = 150; // Center Y
  // Offset control point slightly toward the midpoint
  const cx = midX * 0.4 + controlX * 0.6;
  const cy = midY * 0.4 + controlY * 0.6;

  return `M ${entry.x} ${entry.y} Q ${cx} ${cy}, ${exit.x} ${exit.y}`;
}

// Get a point along an SVG path at a given percentage (0-1)
function getPointAlongPath(pathElement: SVGPathElement | null, percentage: number): { x: number; y: number } {
  if (!pathElement) return { x: 300, y: 150 };
  const length = pathElement.getTotalLength();
  const point = pathElement.getPointAtLength(percentage * length);
  return { x: point.x, y: point.y };
}

// Get perpendicular offset direction at a point on the path
function getPerpendicularOffset(pathElement: SVGPathElement | null, percentage: number): { dx: number; dy: number } {
  if (!pathElement) return { dx: 0, dy: 1 };
  const length = pathElement.getTotalLength();
  const pos = percentage * length;

  // Get two points slightly apart to calculate tangent
  const delta = 2;
  const p1 = pathElement.getPointAtLength(Math.max(0, pos - delta));
  const p2 = pathElement.getPointAtLength(Math.min(length, pos + delta));

  // Tangent vector
  const tx = p2.x - p1.x;
  const ty = p2.y - p1.y;
  const tLen = Math.sqrt(tx * tx + ty * ty) || 1;

  // Perpendicular (rotate 90 degrees)
  return { dx: -ty / tLen, dy: tx / tLen };
}

// Map track emojis to background themes
const TRACK_THEMES: Record<string, { bg: string; trackColor: string; accent: string }> = {
  '🏁': { bg: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #1a1a2e 100%)', trackColor: '#2a2a4a', accent: '#4a4a6a' },
  '🏎️': { bg: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)', trackColor: '#3a3a3a', accent: '#5a5a5a' },
  '🌋': { bg: 'linear-gradient(135deg, #1a0a0a 0%, #3d1a1a 50%, #1a0a0a 100%)', trackColor: '#4a2020', accent: '#8a4040' },
  '🏔️': { bg: 'linear-gradient(135deg, #0a1a2a 0%, #1a3a5a 50%, #0a1a2a 100%)', trackColor: '#2a4a6a', accent: '#4a6a8a' },
  '🌊': { bg: 'linear-gradient(135deg, #0a1a2a 0%, #1a2a4a 50%, #0a1a2a 100%)', trackColor: '#1a3a5a', accent: '#3a5a7a' },
  '🏜️': { bg: 'linear-gradient(135deg, #2a1a0a 0%, #4a3a1a 50%, #2a1a0a 100%)', trackColor: '#5a4a2a', accent: '#8a7a4a' },
  '🌲': { bg: 'linear-gradient(135deg, #0a1a0a 0%, #1a3a1a 50%, #0a1a0a 100%)', trackColor: '#2a4a2a', accent: '#4a6a4a' },
  '🌴': { bg: 'linear-gradient(135deg, #1a2a1a 0%, #2a4a2a 50%, #1a2a1a 100%)', trackColor: '#3a5a3a', accent: '#5a7a5a' },
  '🏰': { bg: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a3a 50%, #1a1a1a 100%)', trackColor: '#3a3a4a', accent: '#5a5a6a' },
  '🌌': { bg: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3a 50%, #0a0a1a 100%)', trackColor: '#2a2a4a', accent: '#4a4a8a' },
  '☄️': { bg: 'linear-gradient(135deg, #1a0a1a 0%, #3a1a3a 50%, #1a0a1a 100%)', trackColor: '#4a2a4a', accent: '#6a4a6a' },
  '🌙': { bg: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2a 50%, #0a0a1a 100%)', trackColor: '#2a2a3a', accent: '#4a4a5a' },
  '⚡': { bg: 'linear-gradient(135deg, #1a1a0a 0%, #3a3a1a 50%, #1a1a0a 100%)', trackColor: '#4a4a2a', accent: '#6a6a4a' },
  '🔥': { bg: 'linear-gradient(135deg, #1a0a0a 0%, #3a1a0a 50%, #1a0a0a 100%)', trackColor: '#4a2a1a', accent: '#6a4a3a' },
  '❄️': { bg: 'linear-gradient(135deg, #0a1a2a 0%, #1a2a4a 50%, #0a1a2a 100%)', trackColor: '#2a3a5a', accent: '#4a5a7a' },
  '🌈': { bg: 'linear-gradient(135deg, #1a1a2a 0%, #2a2a4a 50%, #1a1a2a 100%)', trackColor: '#3a3a5a', accent: '#5a5a7a' },
  '🌪️': { bg: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 50%, #1a1a1a 100%)', trackColor: '#3a3a3a', accent: '#5a5a5a' },
  '💎': { bg: 'linear-gradient(135deg, #0a1a2a 0%, #1a3a4a 50%, #0a1a2a 100%)', trackColor: '#2a4a5a', accent: '#4a6a7a' },
  '🔮': { bg: 'linear-gradient(135deg, #1a0a2a 0%, #2a1a4a 50%, #1a0a2a 100%)', trackColor: '#3a2a5a', accent: '#5a4a7a' },
  '👁️': { bg: 'linear-gradient(135deg, #1a0a1a 0%, #2a1a2a 50%, #1a0a1a 100%)', trackColor: '#3a2a3a', accent: '#5a4a5a' },
  '🌸': { bg: 'linear-gradient(135deg, #1a0a1a 0%, #2a1a2a 50%, #1a0a1a 100%)', trackColor: '#3a2a3a', accent: '#6a4a5a' },
  '♾️': { bg: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3a 50%, #0a0a1a 100%)', trackColor: '#2a2a4a', accent: '#4a4a6a' },
};

const DEFAULT_THEME = { bg: 'linear-gradient(135deg, #0d0d0d 0%, #1a1018 50%, #0d0d0d 100%)', trackColor: '#2a2535', accent: '#3a3545' };

function WatchMode({ drivers, config, raceState, trackInfo, onNextRace, powerActivation, raceEvents, activeBets }: WatchModeProps) {
  const trackLength = config.lapLength;
  const totalLaps = config.totalLaps;

  // Refs for SVG path elements (used for positioning drivers)
  const trackPathRef = useRef<SVGPathElement>(null);
  const pitPathRef = useRef<SVGPathElement>(null);
  const [pathsReady, setPathsReady] = useState(false);

  // Smoothed visual positions for drivers (separate from actual game position)
  const smoothedPositionsRef = useRef<Map<number, { x: number; y: number; targetX: number; targetY: number }>>(new Map());
  const SMOOTHING_FACTOR = 0.15; // Lower = smoother but more lag

  // Track which drivers were pitting in the previous frame (to detect pit exit)
  const previouslyPittingRef = useRef<Set<number>>(new Set());

  // Modular notification timeline
  const [notifications, setNotifications] = useState<RaceNotification[]>([]);
  const notificationIdRef = useRef(0);
  const seenCrashesRef = useRef<Set<number>>(new Set());
  const seenSlowPitStopsRef = useRef<Set<number>>(new Set()); // Track drivers who have had slow pit stop notified
  const seenQuickPitStopsRef = useRef<Set<number>>(new Set()); // Track drivers who have had quick pit stop notified
  const lastCrashTickRef = useRef<number>(-1);
  const previousLeaderRef = useRef<number | null>(null);

  // New notification tracking refs
  const fastestLapRef = useRef<{ driverId: number; time: number } | null>(null);
  const halfwayTriggeredRef = useRef(false);
  const lastLapTriggeredRef = useRef(false);
  const leaderSectorRef = useRef<number>(-1); // Track leader's sector for lead change throttling
  const winnerAnnouncedRef = useRef(false); // Track if winner notification sent
  const lastPowerTimestampRef = useRef<number>(0); // Track last power activation to avoid duplicates
  const lastTrackEventTickRef = useRef<number>(-1); // Track last track event tick to avoid duplicates
  const seenTagActivationsRef = useRef<Set<string>>(new Set()); // Track which tag activations we've shown

  // Crash positions for SVG effects only (visual on track)
  const [crashPositions, setCrashPositions] = useState<CrashPosition[]>([]);

  // Track event effects on drivers (emoji pop-ups on track - short duration)
  const [trackEventEffects, setTrackEventEffects] = useState<TrackEventEffect[]>([]);
  const seenTrackEventEffectsRef = useRef<Set<string>>(new Set()); // Track which effects we've shown

  // Status effects for timing tower (longer duration - persists for ~1 lap)
  const [statusEffects, setStatusEffects] = useState<StatusEffect[]>([]);

  // Active power effect for visual display on track (now tracks kingdom for team effects)
  const [activePowerEffect, setActivePowerEffect] = useState<{
    targetKingdomId: string | null;
    category: 'blessing' | 'curse' | 'god';
    expiresAt: number;
  } | null>(null);

  // Driver card state - click to expand (not hover)
  const [expandedDriverId, setExpandedDriverId] = useState<number | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [hoveredTireDriverId, setHoveredTireDriverId] = useState<number | null>(null);
  const [hoveredTagId, setHoveredTagId] = useState<string | null>(null);
  const [tagTooltipPosition, setTagTooltipPosition] = useState<{ top: number; left: number } | null>(null);

  // Sector-based gap tracking (like F1 timing)
  // Gaps only update when a driver crosses a sector boundary
  // 6 sectors = updates at each 1/6 of the track (more frequent than 3)
  const NUM_SECTORS = 6;
  const sectorLength = trackLength / NUM_SECTORS;

  // Track each driver's last sector and their frozen gap values
  const driverSectorsRef = useRef<Map<number, { lastSector: number; leaderGap: string; intervalGap: string }>>(new Map());

  // Frozen sorted order - only updates on sector crossings to match gap updates
  const [frozenSortedDrivers, setFrozenSortedDrivers] = useState<Driver[]>([]);
  const lastSortUpdateSectorRef = useRef<number>(-1);

  // Helper to get current sector (0-5) from position
  const getSector = (position: number): number => {
    return Math.floor((position % trackLength) / sectorLength);
  };

  // Helper to add a notification
  const addNotification = (
    type: NotificationType,
    title: string,
    message: string,
    emoji: string,
    involvedDrivers?: Array<{ id: number; name: string; emoji: string }>,
    durationMs: number = 12000, // Default 12 seconds for ticker - longer for readability
    color?: string // Optional team color
  ) => {
    const now = Date.now();
    const newNotification: RaceNotification = {
      id: notificationIdRef.current++,
      type,
      title,
      message,
      emoji,
      tick: raceState.totalTicks,
      expiresAt: now + durationMs,
      drivers: involvedDrivers,
      color,
    };
    setNotifications(prev => [newNotification, ...prev].slice(0, 15)); // Keep last 15

    // Auto-remove after duration
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
    }, durationMs);
  };

  // Get track path from layout or use default
  const trackPath = trackInfo?.layout?.trackPath || DEFAULT_TRACK_PATH;

  // Signal when paths are mounted
  useEffect(() => {
    if (trackPathRef.current) {
      setPathsReady(true);
    }
  }, [trackPath]);

  // Detect new crashes and tire blowouts, add notifications + SVG effects
  useEffect(() => {
    if (!pathsReady || !trackPathRef.current) return;

    // Get all DNF drivers (crashes and tire failures)
    const dnfDrivers = drivers.filter(d => d.status === 'dnf' && d.dnfInfo);
    const crashedDrivers = dnfDrivers.filter(d => d.dnfInfo?.reason === 'crash');
    const blowoutDrivers = dnfDrivers.filter(d => d.dnfInfo?.reason === 'tire_failure');

    // Find newly crashed drivers we haven't seen
    const newlyCrashed = crashedDrivers.filter(d => !seenCrashesRef.current.has(d.id));
    const newlyBlownOut = blowoutDrivers.filter(d => !seenCrashesRef.current.has(d.id));

    // Handle regular crashes
    if (newlyCrashed.length > 0) {
      newlyCrashed.forEach(d => seenCrashesRef.current.add(d.id));

      let avgX = 0, avgY = 0;
      newlyCrashed.forEach(driver => {
        const lapProgress = driver.position / trackLength;
        const point = getPointAlongPath(trackPathRef.current, lapProgress);
        avgX += point.x;
        avgY += point.y;
      });
      avgX /= newlyCrashed.length;
      avgY /= newlyCrashed.length;

      const currentTick = raceState.totalTicks;
      const isPartOfExistingCrash = currentTick - lastCrashTickRef.current <= 5;

      if (!isPartOfExistingCrash) {
        const isPileup = newlyCrashed.length > 1;
        const driverNames = newlyCrashed.map(d => `${d.emoji} ${d.name}`).join(', ');

        addNotification(
          'crash',
          isPileup ? 'PILEUP!' : 'CRASH!',
          driverNames,
          '💥',
          newlyCrashed.map(d => ({ id: d.id, name: d.name, emoji: d.emoji }))
        );

        const newCrashPos: CrashPosition = { x: avgX, y: avgY, tick: currentTick, type: 'crash' };
        setCrashPositions(prev => [...prev, newCrashPos]);

        setTimeout(() => {
          setCrashPositions(prev => prev.filter(p => p.tick !== currentTick));
        }, 10000);
      }

      lastCrashTickRef.current = currentTick;
    }

    // Handle tire blowouts (different notification and visual)
    if (newlyBlownOut.length > 0) {
      newlyBlownOut.forEach(d => seenCrashesRef.current.add(d.id));

      newlyBlownOut.forEach(driver => {
        const lapProgress = driver.position / trackLength;
        const point = getPointAlongPath(trackPathRef.current, lapProgress);
        const currentTick = raceState.totalTicks;

        addNotification(
          'crash',  // Still uses crash notification type for styling
          'BLOWOUT!',
          `${driver.emoji} ${driver.name} - tire failure!`,
          '💨',  // Different emoji for blowout
          [{ id: driver.id, name: driver.name, emoji: driver.emoji }]
        );

        const newBlowoutPos: CrashPosition = { x: point.x, y: point.y, tick: currentTick + driver.id, type: 'blowout' };
        setCrashPositions(prev => [...prev, newBlowoutPos]);

        setTimeout(() => {
          setCrashPositions(prev => prev.filter(p => p.tick !== currentTick + driver.id));
        }, 10000);
      });
    }

    // Detect slow pit stops - drivers currently pitting with slow stop flag
    const slowPitStopDrivers = drivers.filter(
      d => d.status === 'pitting' && d.currentPitIsSlowStop && !seenSlowPitStopsRef.current.has(d.id)
    );

    if (slowPitStopDrivers.length > 0) {
      slowPitStopDrivers.forEach(driver => {
        seenSlowPitStopsRef.current.add(driver.id);

        addNotification(
          'slow_pit_stop',
          'Slow Stop',
          `${driver.name}`,
          '🛞',
          [{ id: driver.id, name: driver.name, emoji: driver.emoji }],
          12000,
          driver.color
        );
      });
    }

    // Detect quick pit stops - drivers currently pitting with quick stop flag
    const quickPitStopDrivers = drivers.filter(
      d => d.status === 'pitting' && d.currentPitIsQuickStop && !seenQuickPitStopsRef.current.has(d.id)
    );

    if (quickPitStopDrivers.length > 0) {
      quickPitStopDrivers.forEach(driver => {
        seenQuickPitStopsRef.current.add(driver.id);

        addNotification(
          'quick_pit_stop',
          'Fast Stop',
          `${driver.name}`,
          '🛞',
          [{ id: driver.id, name: driver.name, emoji: driver.emoji }],
          12000,
          driver.color
        );
      });
    }
  }, [drivers, pathsReady, trackLength, raceState.totalTicks]);

  // Track if we're in the first few ticks of a race (for position stabilization)
  const raceStartGraceRef = useRef(true);

  // Reset state when race resets
  useEffect(() => {
    if (raceState.totalTicks === 0) {
      seenCrashesRef.current.clear();
      seenSlowPitStopsRef.current.clear(); // Reset slow pit stop tracking
      seenQuickPitStopsRef.current.clear(); // Reset quick pit stop tracking
      setCrashPositions([]);
      setNotifications([]);
      lastCrashTickRef.current = -1;
      previousLeaderRef.current = null;
      notificationIdRef.current = 0;
      driverSectorsRef.current.clear(); // Reset sector tracking
      fastestLapRef.current = null;
      halfwayTriggeredRef.current = false;
      lastLapTriggeredRef.current = false;
      leaderSectorRef.current = -1;
      winnerAnnouncedRef.current = false;
      smoothedPositionsRef.current.clear(); // Reset visual smoothing
      previouslyPittingRef.current.clear(); // Reset pit tracking
      raceStartGraceRef.current = true; // Reset grace period for new race
      lastSortUpdateSectorRef.current = -1; // Reset frozen sort tracking
      setFrozenSortedDrivers([]); // Clear frozen order
    } else if (raceState.totalTicks > 30) {
      // After 30 ticks (~3 seconds), disable grace period
      raceStartGraceRef.current = false;
    }
  }, [raceState.totalTicks]);

  // Detect track events and show notifications
  useEffect(() => {
    if (!raceEvents || raceEvents.length === 0) return;

    // Find track_event type events that we haven't notified about
    const trackEventNotifications = raceEvents.filter(
      e => e.type === 'track_event' && e.tick > lastTrackEventTickRef.current
    );

    if (trackEventNotifications.length > 0) {
      // Get the latest track event
      const latestEvent = trackEventNotifications[trackEventNotifications.length - 1];
      lastTrackEventTickRef.current = latestEvent.tick;

      // Parse description format: "Event Name: Flavor text"
      const desc = latestEvent.description;
      const colonIndex = desc.indexOf(':');
      const eventName = colonIndex > 0 ? desc.substring(0, colonIndex).trim() : desc;
      const flavorText = colonIndex > 0 ? desc.substring(colonIndex + 1).trim() : '';

      addNotification(
        'track_event',
        eventName,
        flavorText,
        latestEvent.emoji,
        undefined,
        10000
      );
    }
  }, [raceEvents]);

  // Track seen Unsafety Car events
  const lastUnsafetyCarTickRef = useRef<number>(0);

  // Detect Unsafety Car deployment/recall and show notifications
  useEffect(() => {
    if (!raceEvents || raceEvents.length === 0) return;

    // Find unsafety_car events we haven't notified about
    const unsafetyCarEvents = raceEvents.filter(
      e => (e.type === 'unsafety_car_deployed' || e.type === 'unsafety_car_recalled') &&
           e.tick > lastUnsafetyCarTickRef.current
    );

    if (unsafetyCarEvents.length > 0) {
      const latestEvent = unsafetyCarEvents[unsafetyCarEvents.length - 1];
      lastUnsafetyCarTickRef.current = latestEvent.tick;

      const isDeployment = latestEvent.type === 'unsafety_car_deployed';
      addNotification(
        'track_event',  // Use track_event type for styling
        isDeployment ? 'THE VOID OPENS' : 'THE VOID CLOSES',
        latestEvent.description,
        '🕳️',
        undefined,
        isDeployment ? 15000 : 8000  // Longer duration for deployment
      );
    }
  }, [raceEvents]);

  // Detect track event effects on individual drivers and show emoji pop-ups
  useEffect(() => {
    if (!raceEvents || raceEvents.length === 0) return;

    // Find track_event_effect events for individual drivers
    const newEffects = raceEvents.filter(e => {
      if (e.type !== 'track_event_effect') return false;
      if (e.driverId < 0) return false; // Skip events without a specific driver (driverId is -1 when null)
      const key = `${e.tick}-${e.driverId}`;
      if (seenTrackEventEffectsRef.current.has(key)) return false;
      return true;
    });

    if (newEffects.length > 0) {
      const effectsToAdd: TrackEventEffect[] = newEffects.map(e => {
        const key = `${e.tick}-${e.driverId}`;
        seenTrackEventEffectsRef.current.add(key);
        // Use the emoji from the event directly (now passed from RaceEngine)
        return {
          driverId: e.driverId,
          emoji: e.emoji || trackInfo?.event?.emoji || '⚡',
          impact: e.impact,
          tick: e.tick,
        };
      });

      setTrackEventEffects(prev => [...prev, ...effectsToAdd]);

      // Also add to status effects (persists longer for timing tower)
      // Status effects last for ~500 ticks (roughly 1 lap worth)
      const statusToAdd: StatusEffect[] = newEffects.map(e => ({
        driverId: e.driverId,
        emoji: e.emoji || trackInfo?.event?.emoji || '⚡',
        expiresAtTick: raceState.totalTicks + 500,
      }));
      setStatusEffects(prev => [...prev, ...statusToAdd]);

      // Remove track visual effects after 10 seconds (matches CSS animation duration)
      setTimeout(() => {
        const ticksToRemove = new Set(effectsToAdd.map(e => `${e.tick}-${e.driverId}`));
        setTrackEventEffects(prev =>
          prev.filter(e => !ticksToRemove.has(`${e.tick}-${e.driverId}`))
        );
      }, 10000);
    }
  }, [raceEvents, trackInfo, raceState.totalTicks]);

  // Detect tag activations and show notifications
  useEffect(() => {
    if (!raceEvents || raceEvents.length === 0) return;

    // Find tag_activation events we haven't shown yet
    const tagActivations = raceEvents.filter(e => {
      if (e.type !== 'tag_activation') return false;
      const key = `${e.tick}-${e.driverId}-${e.description}`;
      if (seenTagActivationsRef.current.has(key)) return false;
      return true;
    });

    for (const event of tagActivations) {
      const key = `${event.tick}-${event.driverId}-${event.description}`;
      seenTagActivationsRef.current.add(key);

      // Find the driver to get their name
      const driver = drivers.find(d => d.id === event.driverId);
      const driverName = driver ? driver.name : 'Unknown Driver';

      addNotification(
        'tag_activation',
        `${event.emoji || '🏷️'} ${driverName}`,
        event.description,
        event.emoji || '🏷️',
        driver ? [{ id: driver.id, name: driver.name, emoji: driver.emoji }] : undefined,
        10000 // 10 seconds duration
      );

      // Also show emoji effect on track for the driver
      if (driver && event.driverId >= 0) {
        const effectToAdd: TrackEventEffect = {
          driverId: event.driverId,
          emoji: event.emoji || '🏷️',
          impact: 'neutral', // Tags are neutral visual effects
          tick: event.tick,
        };
        setTrackEventEffects(prev => [...prev, effectToAdd]);

        // Remove visual effect after 8 seconds
        setTimeout(() => {
          setTrackEventEffects(prev =>
            prev.filter(e => !(e.tick === event.tick && e.driverId === event.driverId))
          );
        }, 8000);
      }
    }
  }, [raceEvents, drivers]);

  // Clean up expired status effects based on tick count
  useEffect(() => {
    setStatusEffects(prev => prev.filter(e => e.expiresAtTick > raceState.totalTicks));
  }, [raceState.totalTicks]);

  // Reset track event tracking when race resets
  useEffect(() => {
    if (raceState.totalTicks === 0) {
      lastTrackEventTickRef.current = -1;
      setTrackEventEffects([]);
      setStatusEffects([]);
      seenTrackEventEffectsRef.current.clear();
      seenTagActivationsRef.current.clear();
    }
  }, [raceState.totalTicks]);

  // Update frozen sorted order only on sector crossings (syncs with gap updates)
  useEffect(() => {
    if (drivers.length === 0) return;

    // Calculate the current sorted order
    const newSortedDrivers = [...drivers].sort((a, b) => {
      const aFinished = a.status === 'finished';
      const bFinished = b.status === 'finished';
      const aDNF = a.status === 'dnf';
      const bDNF = b.status === 'dnf';

      // Finished drivers first
      if (aFinished && bFinished) {
        return raceState.finishOrder.indexOf(a.id) - raceState.finishOrder.indexOf(b.id);
      }
      if (aFinished) return -1;
      if (bFinished) return 1;

      // DNF drivers last
      if (aDNF && bDNF) {
        return (b.dnfInfo?.tick || 0) - (a.dnfInfo?.tick || 0);
      }
      if (aDNF) return 1;
      if (bDNF) return -1;

      // Racing/pitting drivers by distance
      const aDistance = a.currentLap * trackLength + a.position;
      const bDistance = b.currentLap * trackLength + b.position;
      return bDistance - aDistance;
    });

    // Find the leader to check sector crossing
    const racingDrivers = drivers.filter(d => d.status === 'racing' || d.status === 'pitting');
    if (racingDrivers.length === 0) {
      // All drivers finished or DNF - update immediately
      setFrozenSortedDrivers(newSortedDrivers);
      return;
    }

    const leader = racingDrivers.reduce((prev, curr) => {
      const prevDist = prev.currentLap * trackLength + prev.position;
      const currDist = curr.currentLap * trackLength + curr.position;
      return currDist > prevDist ? curr : prev;
    });

    const leaderGlobalSector = getSector(leader.position) + (leader.currentLap * NUM_SECTORS);

    // Update frozen order when:
    // 1. It's empty (race start)
    // 2. Leader crossed a sector boundary
    // 3. A driver finishes (finish order changed)
    // 4. A driver DNFs
    const hasNewFinisher = newSortedDrivers.some(d => d.status === 'finished') &&
      (frozenSortedDrivers.length === 0 ||
       newSortedDrivers.filter(d => d.status === 'finished').length !== frozenSortedDrivers.filter(d => d.status === 'finished').length);
    const hasNewDNF = newSortedDrivers.some(d => d.status === 'dnf') &&
      (frozenSortedDrivers.length === 0 ||
       newSortedDrivers.filter(d => d.status === 'dnf').length !== frozenSortedDrivers.filter(d => d.status === 'dnf').length);

    if (frozenSortedDrivers.length === 0 ||
        leaderGlobalSector !== lastSortUpdateSectorRef.current ||
        hasNewFinisher ||
        hasNewDNF) {
      setFrozenSortedDrivers(newSortedDrivers);
      lastSortUpdateSectorRef.current = leaderGlobalSector;
    }
  }, [drivers, trackLength, raceState.finishOrder, frozenSortedDrivers.length]);

  // Detect lead changes - only trigger on sector crossings to avoid spam
  useEffect(() => {
    if (drivers.length === 0) return;

    // Find current leader (racing drivers only, by distance)
    const racingDrivers = drivers.filter(d => d.status === 'racing' || d.status === 'finished');
    if (racingDrivers.length === 0) return;

    const leader = racingDrivers.reduce((prev, curr) => {
      const prevDist = prev.currentLap * trackLength + prev.position;
      const currDist = curr.currentLap * trackLength + curr.position;
      return currDist > prevDist ? curr : prev;
    });

    // Calculate leader's current sector
    const leaderCurrentSector = getSector(leader.position) + (leader.currentLap * NUM_SECTORS);

    // Only process lead changes when leader crosses a sector boundary
    const leaderCrossedSector = leaderCurrentSector !== leaderSectorRef.current;

    if (previousLeaderRef.current !== null && previousLeaderRef.current !== leader.id) {
      // Lead change occurred! But only notify on sector crossing and skip lap 1
      const prevLeader = drivers.find(d => d.id === previousLeaderRef.current);
      const leaderLap = leader.currentLap;
      if (prevLeader && leaderLap >= 1 && leaderCrossedSector) {
        addNotification(
          'lead_change',
          'LEAD CHANGE',
          `${leader.emoji} ${leader.name} takes the lead!`,
          '🔄'
        );
      }
    }

    previousLeaderRef.current = leader.id;
    if (leaderCrossedSector) {
      leaderSectorRef.current = leaderCurrentSector;
    }
  }, [drivers, trackLength]);

  // Detect milestone events: halfway, last lap, fastest lap, overtakes
  useEffect(() => {
    if (drivers.length === 0 || raceState.totalTicks === 0) return;

    const racingDrivers = drivers.filter(d => d.status === 'racing' || d.status === 'finished');
    if (racingDrivers.length === 0) return;

    // Find the leader's lap for milestone checks
    const leader = racingDrivers.reduce((prev, curr) => {
      const prevDist = prev.currentLap * trackLength + prev.position;
      const currDist = curr.currentLap * trackLength + curr.position;
      return currDist > prevDist ? curr : prev;
    });
    const leaderLap = leader.currentLap;

    // Halfway point notification
    const halfwayLap = Math.floor(totalLaps / 2);
    if (!halfwayTriggeredRef.current && leaderLap >= halfwayLap && halfwayLap > 0) {
      halfwayTriggeredRef.current = true;
      addNotification(
        'milestone',
        'HALFWAY',
        `${leader.emoji} ${leader.name} leads at the halfway point`,
        '🔔'
      );
    }

    // Last lap notification
    if (!lastLapTriggeredRef.current && leaderLap >= totalLaps - 1 && totalLaps > 1) {
      lastLapTriggeredRef.current = true;
      addNotification(
        'milestone',
        'FINAL LAP',
        'White flag! Last lap of the race',
        '🏳️'
      );
    }

    // Fastest lap detection
    const allLapTimes = drivers.flatMap(d =>
      (d.lapTimes || []).map((time, idx) => ({ driverId: d.id, driver: d, time, lap: idx + 1 }))
    );
    if (allLapTimes.length > 0) {
      const fastest = allLapTimes.reduce((prev, curr) => curr.time < prev.time ? curr : prev);
      if (!fastestLapRef.current || fastest.time < fastestLapRef.current.time) {
        // New fastest lap! Only notify if it beats the previous fastest (not on first lap)
        if (fastestLapRef.current && fastest.driverId !== fastestLapRef.current.driverId) {
          addNotification(
            'fastest_lap',
            'FASTEST LAP',
            `${fastest.driver.emoji} ${fastest.driver.name} sets the pace!`,
            '⚡'
          );
        }
        fastestLapRef.current = { driverId: fastest.driverId, time: fastest.time };
      }
    }

    // Winner crossing the line notification
    if (raceState.raceFinished && !winnerAnnouncedRef.current && raceState.finishOrder.length > 0) {
      const winnerId = raceState.finishOrder[0];
      const winner = drivers.find(d => d.id === winnerId);
      if (winner) {
        winnerAnnouncedRef.current = true;
        addNotification(
          'finish',
          'CHECKERED FLAG',
          `${winner.emoji} ${winner.name} wins the race!`,
          '🏁',
          undefined,
          20000 // Keep winner notification longer
        );
      }
    }

  }, [drivers, trackLength, totalLaps, raceState.totalTicks, raceState.raceFinished, raceState.finishOrder]);

  // Handle power activation notifications and visual effects
  useEffect(() => {
    if (!powerActivation || powerActivation.timestamp === lastPowerTimestampRef.current) return;

    lastPowerTimestampRef.current = powerActivation.timestamp;

    const notificationType: NotificationType = powerActivation.power.category === 'blessing'
      ? 'power_blessing'
      : powerActivation.power.category === 'curse'
        ? 'power_curse'
        : 'power_god';

    const targetStr = powerActivation.targetName ? ` → ${powerActivation.targetName}` : '';

    addNotification(
      notificationType,
      powerActivation.power.name.toUpperCase(),
      `${powerActivation.power.description}${targetStr}`,
      powerActivation.power.emoji,
      undefined,
      8000
    );

    // Set visual effect on track
    setActivePowerEffect({
      targetKingdomId: null,
      category: powerActivation.power.category,
      expiresAt: Date.now() + 3000, // Visual effect lasts 3 seconds
    });

    // Clear the effect after duration
    const timer = setTimeout(() => {
      setActivePowerEffect(null);
    }, 3000);

    return () => clearTimeout(timer);
  }, [powerActivation]);

  // Get theme based on track emoji
  const theme = trackInfo ? (TRACK_THEMES[trackInfo.emoji] || DEFAULT_THEME) : DEFAULT_THEME;

  // Real-time sorted drivers (for track position badges - need current positions)
  const realtimeSortedDrivers = [...drivers].sort((a, b) => {
    const aFinished = a.status === 'finished';
    const bFinished = b.status === 'finished';
    const aDNF = a.status === 'dnf';
    const bDNF = b.status === 'dnf';

    // Finished drivers first
    if (aFinished && bFinished) {
      return raceState.finishOrder.indexOf(a.id) - raceState.finishOrder.indexOf(b.id);
    }
    if (aFinished) return -1;
    if (bFinished) return 1;

    // DNF drivers last
    if (aDNF && bDNF) {
      // Sort by when they crashed
      return (b.dnfInfo?.tick || 0) - (a.dnfInfo?.tick || 0);
    }
    if (aDNF) return 1;
    if (bDNF) return -1;

    // Racing/pitting drivers by distance
    const aDistance = a.currentLap * trackLength + a.position;
    const bDistance = b.currentLap * trackLength + b.position;
    return bDistance - aDistance;
  });

  // Use frozen sorted order for timing tower (synced with sector updates)
  // Fall back to realtime if frozen is empty (during initialization)
  const sortedDrivers = frozenSortedDrivers.length > 0 ? frozenSortedDrivers : realtimeSortedDrivers;

  // Separate drivers by status
  const pittingDrivers = drivers.filter(d => d.status === 'pitting');
  const racingDrivers = drivers.filter(d => d.status === 'racing');
  const finishedDrivers = drivers.filter(d => d.status === 'finished');
  const dnfDrivers = drivers.filter(d => d.status === 'dnf');

  // Sort finished drivers by finish order
  const sortedFinished = [...finishedDrivers].sort((a, b) => {
    return raceState.finishOrder.indexOf(a.id) - raceState.finishOrder.indexOf(b.id);
  });

  // How many podium positions are already locked?
  const lockedPositions = Math.min(sortedFinished.length, 3);

  // Get position rank for a driver (1, 2, 3, or null for top 3 badges)
  // Only show badges for positions not yet locked by finishers
  const getPositionRank = (driverId: number): number | null => {
    const activeDrivers = drivers.filter(d => d.status === 'racing' || d.status === 'pitting');

    // Helper to calculate effective position (accounts for pit lane virtual position)
    const getEffectivePosition = (driver: Driver): number => {
      if (driver.status !== 'pitting') {
        return driver.position;
      }
      // Pit lane maps: entry (85%) -> start/finish (100%/0% at 50% progress) -> exit (15%)
      const pitProgress = driver.pitProgress;
      if (pitProgress <= 0.5) {
        // First half: 85% -> 100% of lap
        const progressRatio = pitProgress / 0.5;
        const positionRatio = 0.85 + (progressRatio * 0.15);
        return Math.floor(positionRatio * trackLength);
      } else {
        // Second half: 0% -> 15% of lap
        const progressRatio = (pitProgress - 0.5) / 0.5;
        const positionRatio = progressRatio * 0.15;
        return Math.floor(positionRatio * trackLength);
      }
    };

    const sorted = [...activeDrivers].sort((a, b) => {
      const aDist = a.currentLap * trackLength + getEffectivePosition(a);
      const bDist = b.currentLap * trackLength + getEffectivePosition(b);
      return bDist - aDist;
    });
    const idx = sorted.findIndex(d => d.id === driverId);
    // Only show badge if this position hasn't been locked yet
    const wouldBePosition = idx + 1 + lockedPositions;
    return idx >= 0 && wouldBePosition <= 3 ? wouldBePosition : null;
  };

  // Calculate driver positions along the track path (racing only, not finished)
  // Uses proximity-based lane offsets to prevent overlapping
  // Also applies position smoothing for less jerky visual movement
  const driverPositions = useMemo(() => {
    if (!pathsReady || !trackPathRef.current) return [];

    // Sort drivers by their total race distance for proximity calculation
    const sortedByDistance = [...racingDrivers].sort((a, b) => {
      const aDist = a.currentLap * trackLength + a.position;
      const bDist = b.currentLap * trackLength + b.position;
      return bDist - aDist; // Descending (leader first)
    });

    // Wider proximity and lane settings for 20 drivers
    const PROXIMITY_THRESHOLD = trackLength * 0.06; // 6% of track = close
    const LANE_OFFSET = 12; // Pixels between lanes
    const MAX_LANES = 5; // Cap at 5 lanes to stay on track

    return racingDrivers.map((driver) => {
      // Normalize position to track length to prevent visual glitches when
      // speed boosts push position beyond trackLength before lap counting
      const normalizedPosition = ((driver.position % trackLength) + trackLength) % trackLength;
      const lapProgress = normalizedPosition / trackLength;
      const point = getPointAlongPath(trackPathRef.current, lapProgress);
      const perp = getPerpendicularOffset(trackPathRef.current, lapProgress);

      const driverTrackPos = driver.position;

      // Find all drivers within proximity (considering lap differences)
      const nearbyDrivers = sortedByDistance.filter(other => {
        if (other.id === driver.id) return false;
        const otherPos = other.position;

        // Check proximity on current track position
        const diff = Math.abs(driverTrackPos - otherPos);
        const wrapDiff = Math.min(diff, trackLength - diff);

        // Also check if they're on same lap or adjacent
        const lapDiff = Math.abs(driver.currentLap - other.currentLap);

        return wrapDiff < PROXIMITY_THRESHOLD && lapDiff <= 1;
      });

      // Assign lane based on race position among nearby drivers
      let laneOffset = 0;
      if (nearbyDrivers.length > 0) {
        // Sort group by total distance (race position)
        const group = [...nearbyDrivers, driver].sort((a, b) => {
          const aDist = a.currentLap * trackLength + a.position;
          const bDist = b.currentLap * trackLength + b.position;
          return bDist - aDist; // Leader first
        });

        const laneIndex = group.findIndex(d => d.id === driver.id);
        const totalInGroup = Math.min(group.length, MAX_LANES);

        // Distribute across lanes, capped to stay on track
        const effectiveLaneIndex = Math.min(laneIndex, MAX_LANES - 1);
        laneOffset = (effectiveLaneIndex - (totalInGroup - 1) / 2) * LANE_OFFSET;
      }

      // Add a small consistent offset based on driver ID to prevent exact overlaps
      // This creates a "stagger" effect even when drivers are at exact same position
      const idOffset = ((driver.id % 7) - 3) * 2;

      // Target position (where driver should be)
      const targetX = point.x + perp.dx * (laneOffset + idOffset);
      const targetY = point.y + perp.dy * (laneOffset + idOffset);

      // Get or initialize smoothed position
      let smoothed = smoothedPositionsRef.current.get(driver.id);

      // During race start grace period, snap to positions instantly (no smoothing)
      // This prevents erratic "bounding" as positions stabilize
      const isGracePeriod = raceStartGraceRef.current;

      // Check if this driver just exited the pits (was pitting, now racing)
      const justExitedPit = previouslyPittingRef.current.has(driver.id);

      // Check for large position jumps (lap crossing, speed boosts, etc.)
      // If the target moved more than 100px, snap instead of interpolate
      const distanceToTarget = smoothed
        ? Math.sqrt((targetX - smoothed.x) ** 2 + (targetY - smoothed.y) ** 2)
        : Infinity;
      const shouldSnap = distanceToTarget > 100;

      if (!smoothed || isGracePeriod || justExitedPit || shouldSnap) {
        // First time, grace period, exited pit, or large jump - snap to target position
        // This prevents visual glitches from interpolating across the track
        smoothed = { x: targetX, y: targetY, targetX, targetY };
        smoothedPositionsRef.current.set(driver.id, smoothed);
      } else {
        // Interpolate toward target position
        smoothed.x += (targetX - smoothed.x) * SMOOTHING_FACTOR;
        smoothed.y += (targetY - smoothed.y) * SMOOTHING_FACTOR;
        smoothed.targetX = targetX;
        smoothed.targetY = targetY;
      }

      return {
        driver,
        x: smoothed.x,
        y: smoothed.y,
      };
    });
  }, [racingDrivers, trackLength, pathsReady, SMOOTHING_FACTOR]);

  // Calculate DNF positions
  const dnfPositions = useMemo(() => {
    if (!pathsReady || !trackPathRef.current) return [];

    return dnfDrivers.map((driver) => {
      const lapProgress = driver.position / trackLength;
      const point = getPointAlongPath(trackPathRef.current, lapProgress);
      return { driver, x: point.x, y: point.y };
    });
  }, [dnfDrivers, trackLength, pathsReady]);

  // Calculate pit entry/exit marker positions on track
  const pitMarkers = useMemo(() => {
    if (!pathsReady || !trackPathRef.current) return { entry: { x: 0, y: 0 }, exit: { x: 0, y: 0 }, path: '' };

    const entry = getPointAlongPath(trackPathRef.current, PIT_ENTRY_POSITION);
    const exit = getPointAlongPath(trackPathRef.current, PIT_EXIT_POSITION);
    const path = generatePitLanePath(entry, exit);
    return { entry, exit, path };
  }, [pathsReady]);

  // Calculate Unsafety Car position on track
  const unsafetyCarPosition = useMemo(() => {
    if (!pathsReady || !trackPathRef.current) return null;
    if (!raceState.unsafetyCarActive) return null;

    const point = getPointAlongPath(trackPathRef.current, raceState.unsafetyCarPosition);
    return { x: point.x, y: point.y };
  }, [pathsReady, raceState.unsafetyCarActive, raceState.unsafetyCarPosition]);

  // Calculate pit lane positions for pitting drivers
  const pitPositions = useMemo(() => {
    if (!pathsReady || !pitPathRef.current) return [];

    return pittingDrivers.map((driver) => {
      const pitProgress = driver.pitProgress || 0;
      const point = getPointAlongPath(pitPathRef.current, pitProgress);
      return { driver, x: point.x, y: point.y, progress: pitProgress };
    });
  }, [pittingDrivers, pathsReady]);

  // Track which drivers are currently pitting for pit exit detection
  // This runs after position calculations to update the ref for next frame
  useEffect(() => {
    const currentlyPitting = new Set(pittingDrivers.map(d => d.id));
    previouslyPittingRef.current = currentlyPitting;
  }, [pittingDrivers]);

  return (
    <div className="watch-mode" style={{ background: theme.bg }}>
      <div className="watch-header">
        {trackInfo ? (
          <div className="track-title">
            <span className="track-title-emoji">{trackInfo.emoji}</span>
            <div className="track-title-info">
              <h1>{trackInfo.name}</h1>
              <div className="track-subtitle">
                {trackInfo.event && (
                  <>
                    <span className="header-event">{trackInfo.event.emoji} {trackInfo.event.name}</span>
                    <span className="header-event-desc">{trackInfo.event.description}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <h1>The Eldritch Grand Prix</h1>
        )}
        <div className="watch-timer">{ticksToShortTime(raceState.totalTicks)}</div>
        {raceState.raceFinished && <span className="watch-finished">RACE COMPLETE</span>}
      </div>

      {/* Race Feed - ticker style under header */}
      <div className="race-feed-container">
        <div className="race-feed">
          <span className="race-feed-label">LIVE</span>
          <div className="race-feed-items">
            {notifications.slice(0, 6).map((notification) => (
              <div
                key={notification.id}
                className={`feed-item feed-${notification.type}`}
                style={notification.color ? { '--feed-color': notification.color } as React.CSSProperties : undefined}
              >
                <span className="feed-emoji">{notification.emoji}</span>
                <span className="feed-text">
                  <span className="feed-title">{notification.title}</span>
                  {notification.message && <span className="feed-message">{notification.message}</span>}
                </span>
              </div>
            ))}
            {notifications.length === 0 && (
              <span className="feed-empty">Awaiting race action...</span>
            )}
          </div>
        </div>
      </div>

      {/* Main content: Leaderboard left, Track right */}
      <div className="watch-content">
        {/* Leaderboard */}
        <div className="watch-leaderboard">
          {/* Lap indicator - prominent header */}
          <div className="leaderboard-lap-header">
            <span className="lap-label">LAP</span>
            <span className="lap-current">{Math.max(...sortedDrivers.map(d => Math.min(d.currentLap + 1, totalLaps)))}</span>
            <span className="lap-separator">/</span>
            <span className="lap-total">{totalLaps}</span>
          </div>
          {/* Column header row */}
          <div className="leaderboard-header">
            <span className="lh-pos">P</span>
            <span className="lh-driver">Driver</span>
            <span className="lh-leader">Leader</span>
            <span className="lh-gap">Gap</span>
            <span className="lh-last">Last</span>
            <span className="lh-best">Best</span>
            <span className="lh-tire">Tires</span>
            <span className="lh-status"></span>
          </div>
          {sortedDrivers.map((driver, index) => {
            const isFinished = driver.status === 'finished';
            const isDNF = driver.status === 'dnf';
            const isPitting = driver.status === 'pitting';
            const finishPos = raceState.finishOrder.indexOf(driver.id);
            const tireCompound = driver.tireState?.compound || 'medium';

            // Calculate gap to leader and gap to car ahead (interval)
            // F1-style: gaps only update when driver crosses a sector boundary
            let leaderGapDisplay = '';
            let intervalGapDisplay = '';

            // Get or initialize this driver's sector tracking
            if (!driverSectorsRef.current.has(driver.id)) {
              driverSectorsRef.current.set(driver.id, { lastSector: -1, leaderGap: '-', intervalGap: '-' });
            }
            const sectorData = driverSectorsRef.current.get(driver.id)!;
            const currentSector = getSector(driver.position) + (driver.currentLap * NUM_SECTORS);

            // Check if driver crossed into a new sector
            const crossedSector = currentSector !== sectorData.lastSector;

            if (isFinished) {
              // Finished drivers always show final gaps (not sector-delayed)
              if (finishPos === 0) {
                leaderGapDisplay = ticksToShortTime(driver.finishTick || raceState.totalTicks);
                intervalGapDisplay = '-';
              } else if (driver.lapsBehind > 0) {
                leaderGapDisplay = `+${driver.lapsBehind}L`;
                const carAhead = sortedDrivers[index - 1];
                if (carAhead && carAhead.finishTick && driver.finishTick) {
                  intervalGapDisplay = formatGap(driver.finishTick - carAhead.finishTick);
                } else {
                  intervalGapDisplay = '-';
                }
              } else {
                const winner = sortedDrivers.find(d => raceState.finishOrder.indexOf(d.id) === 0);
                if (winner && driver.finishTick && winner.finishTick) {
                  leaderGapDisplay = formatGap(driver.finishTick - winner.finishTick);
                }
                const carAhead = sortedDrivers[index - 1];
                if (carAhead && carAhead.finishTick && driver.finishTick) {
                  intervalGapDisplay = formatGap(driver.finishTick - carAhead.finishTick);
                } else {
                  intervalGapDisplay = '-';
                }
              }
              // Update stored values for finished drivers
              sectorData.leaderGap = leaderGapDisplay;
              sectorData.intervalGap = intervalGapDisplay;
              sectorData.lastSector = currentSector;
            } else if (!isDNF) {
              const leader = sortedDrivers[0];
              const leaderDist = leader ? leader.currentLap * trackLength + leader.position : 0;
              const driverDist = driver.currentLap * trackLength + driver.position;

              // Check if this driver has crossed their first sector yet
              const hasFirstSectorTime = sectorData.lastSector >= 0;

              if (index === 0) {
                // Leader - only show "Leader" after first sector crossing
                if (crossedSector && currentSector > 0) {
                  leaderGapDisplay = 'Leader';
                  intervalGapDisplay = '-';
                  sectorData.leaderGap = leaderGapDisplay;
                  sectorData.intervalGap = intervalGapDisplay;
                  sectorData.lastSector = currentSector;
                } else if (hasFirstSectorTime) {
                  // Use stored values
                  leaderGapDisplay = sectorData.leaderGap;
                  intervalGapDisplay = sectorData.intervalGap;
                } else {
                  // Before first sector - show dashes
                  leaderGapDisplay = '-';
                  intervalGapDisplay = '-';
                }
              } else if ((crossedSector && currentSector > 0) || (hasFirstSectorTime && crossedSector)) {
                // Driver crossed a sector boundary - update their gaps
                if (leader && leader.status !== 'finished') {
                  // Check if driver is truly lapped:
                  // A driver is lapped when the leader is on a higher lap AND
                  // the leader's track position is >= the driver's track position
                  // (meaning the leader has physically passed them on track)
                  const lapsBehindLeader = leader.currentLap - driver.currentLap;
                  const leaderTrackPos = leader.position; // Position within current lap
                  const driverTrackPos = driver.position;
                  const isActuallyLapped = lapsBehindLeader > 0 && leaderTrackPos >= driverTrackPos;

                  // Also count full laps behind (if leader is 2+ laps ahead, at least 1 full lap is confirmed)
                  const confirmedLapsBehind = lapsBehindLeader > 1 ? lapsBehindLeader - 1 : 0;
                  const displayLapsBehind = isActuallyLapped ? lapsBehindLeader : confirmedLapsBehind;

                  if (displayLapsBehind > 0) {
                    // Driver is lapped - show lap difference
                    leaderGapDisplay = `+${displayLapsBehind}L`;
                  } else {
                    const distGapToLeader = leaderDist - driverDist;
                    const estimatedTickGapToLeader = distGapToLeader * 0.8;
                    if (estimatedTickGapToLeader > 0) {
                      leaderGapDisplay = formatGap(estimatedTickGapToLeader);
                    } else {
                      leaderGapDisplay = '-';
                    }
                  }

                  const carAhead = sortedDrivers[index - 1];
                  if (carAhead && carAhead.status !== 'dnf') {
                    // Check if driver is truly lapped by car ahead
                    const lapsBehindCarAhead = carAhead.currentLap - driver.currentLap;
                    const carAheadTrackPos = carAhead.position;
                    const isActuallyLappedByCarAhead = lapsBehindCarAhead > 0 && carAheadTrackPos >= driverTrackPos;
                    const confirmedLapsBehindCarAhead = lapsBehindCarAhead > 1 ? lapsBehindCarAhead - 1 : 0;
                    const displayLapsBehindCarAhead = isActuallyLappedByCarAhead ? lapsBehindCarAhead : confirmedLapsBehindCarAhead;

                    if (displayLapsBehindCarAhead > 0) {
                      // Driver is lapped by car ahead - show lap difference
                      intervalGapDisplay = `+${displayLapsBehindCarAhead}L`;
                    } else {
                      const carAheadDist = carAhead.currentLap * trackLength + carAhead.position;
                      const distGapToAhead = carAheadDist - driverDist;
                      const estimatedTickGapToAhead = distGapToAhead * 0.8;
                      if (estimatedTickGapToAhead > 0) {
                        intervalGapDisplay = formatGap(estimatedTickGapToAhead);
                      } else {
                        intervalGapDisplay = '-';
                      }
                    }
                  } else {
                    intervalGapDisplay = '-';
                  }
                } else if (leader && leader.status === 'finished') {
                  const lapsLeft = config.totalLaps - (driver.currentLap + 1);
                  leaderGapDisplay = lapsLeft > 0 ? `+${lapsLeft}L` : '';
                  intervalGapDisplay = '-';
                }

                // Store the new gap values
                sectorData.leaderGap = leaderGapDisplay;
                sectorData.intervalGap = intervalGapDisplay;
                sectorData.lastSector = currentSector;
              } else if (hasFirstSectorTime) {
                // No sector crossing but has previous data - use frozen/stored gaps
                leaderGapDisplay = sectorData.leaderGap;
                intervalGapDisplay = sectorData.intervalGap;
              } else {
                // Before first sector - show dashes
                leaderGapDisplay = '-';
                intervalGapDisplay = '-';
              }
            }

            // Lap times
            const lapTimes = driver.lapTimes || [];
            const lastLapTime = lapTimes.length > 0 ? lapTimes[lapTimes.length - 1] : null;
            const prevLapTime = lapTimes.length > 1 ? lapTimes[lapTimes.length - 2] : null;
            const bestLapTime = lapTimes.length > 0 ? Math.min(...lapTimes) : null;

            // Find fastest lap across all drivers
            const allLapTimes = drivers.flatMap(d => d.lapTimes || []);
            const fastestLapOverall = allLapTimes.length > 0 ? Math.min(...allLapTimes) : null;

            // Determine last lap color: purple = fastest overall, green = improved, yellow = not improved
            let lastLapClass = '';
            if (lastLapTime !== null) {
              if (fastestLapOverall !== null && lastLapTime === fastestLapOverall) {
                lastLapClass = 'lap-fastest';
              } else if (prevLapTime !== null && lastLapTime < prevLapTime) {
                lastLapClass = 'lap-improved';
              } else {
                lastLapClass = 'lap-slower';
              }
            }

            // Determine best lap color: purple if it's the overall fastest
            let bestLapClass = '';
            if (bestLapTime !== null && fastestLapOverall !== null && bestLapTime === fastestLapOverall) {
              bestLapClass = 'lap-fastest';
            }

            // Calculate tire stint data for hover card
            const pitStops = driver.pitStops || [];
            const stintData = (() => {
              const stints: Array<{
                compound: TireCompound;
                startLap: number;
                endLap: number | null;
                avgPace: number | null;
                laps: number[];
              }> = [];

              // First stint starts at lap 0 with starting compound
              let currentStintStart = 0;
              let currentCompound = driver.usedCompounds?.[0] || 'medium';

              for (let i = 0; i < pitStops.length; i++) {
                const stop = pitStops[i];
                const stintLaps = driver.lapTimes.slice(currentStintStart, stop.lap);
                stints.push({
                  compound: stop.tiresBefore,
                  startLap: currentStintStart + 1,
                  endLap: stop.lap,
                  avgPace: stintLaps.length > 0 ? stintLaps.reduce((a, b) => a + b, 0) / stintLaps.length : null,
                  laps: stintLaps,
                });
                currentStintStart = stop.lap;
                currentCompound = stop.tiresAfter;
              }

              // Current/final stint
              const currentStintLaps = driver.lapTimes.slice(currentStintStart);
              stints.push({
                compound: currentCompound,
                startLap: currentStintStart + 1,
                endLap: isFinished ? driver.currentLap : null,
                avgPace: currentStintLaps.length > 0 ? currentStintLaps.reduce((a, b) => a + b, 0) / currentStintLaps.length : null,
                laps: currentStintLaps,
              });

              return stints;
            })();

            return (
              <div
                key={driver.id}
                className={`leaderboard-row ${isFinished ? 'finished' : ''} ${isDNF ? 'dnf' : ''} ${isPitting ? 'pitting' : ''}`}
              >
                <span className="leaderboard-pos">
                  {isFinished ? `#${finishPos + 1}` : isDNF ? 'DNF' : `${index + 1}`}
                </span>
                <span
                  className="leaderboard-badge"
                  data-slot={driver.driverSlot || 1}
                  style={{
                    '--team-color': driver.color,
                    '--team-color-light': getColorVariants(driver.color).light,
                    '--team-color-dark': getColorVariants(driver.color).dark,
                  } as React.CSSProperties}
                >
                  {driver.emoji}
                </span>
                <span
                  className={`leaderboard-name clickable ${expandedDriverId === driver.id ? 'expanded' : ''}`}
                  style={{ color: isDNF ? '#666' : driver.color }}
                  onClick={(e) => {
                    if (expandedDriverId === driver.id) {
                      setExpandedDriverId(null);
                      setDropdownPosition(null);
                    } else {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setExpandedDriverId(driver.id);
                      setDropdownPosition({ top: rect.bottom + 4, left: rect.left });
                    }
                  }}
                >
                  {driver.name}
                </span>
                {/* Driver Stats Dropdown - click to open, mouseout to close */}
                {expandedDriverId === driver.id && dropdownPosition && (
                  <div
                    className="driver-dropdown"
                    style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
                    onMouseLeave={() => { setExpandedDriverId(null); setDropdownPosition(null); }}
                  >
                    <div className="driver-dropdown-ratings">
                      <div className="dropdown-rating-item">
                        <span className="dropdown-rating-label">Driver</span>
                        <span
                          className="dropdown-rating-value"
                          style={{ color: getOverallRatingColor(calculateDriverRating(driver)) }}
                        >
                          {calculateDriverRating(driver)}
                        </span>
                      </div>
                      {driver.carStats && (
                        <div className="dropdown-rating-item">
                          <span className="dropdown-rating-label">Car</span>
                          <span
                            className="dropdown-rating-value"
                            style={{ color: getOverallRatingColor(calculateCarRating(driver)) }}
                          >
                            {calculateCarRating(driver)}
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Tags section with hover tooltips */}
                    <div className="driver-dropdown-tags">
                      {driver.driverTag && (
                        <div
                          className="dropdown-tag"
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoveredTagId(`${driver.id}-driver`);
                            setTagTooltipPosition({ top: rect.top, left: rect.right + 8 });
                          }}
                          onMouseLeave={() => { setHoveredTagId(null); setTagTooltipPosition(null); }}
                        >
                          <span className="tag-emoji">{driver.driverTag.emoji}</span>
                          <span className="tag-name">{driver.driverTag.name}</span>
                          <span className="tag-type">Driver</span>
                        </div>
                      )}
                      {driver.carTag && (
                        <div
                          className="dropdown-tag"
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoveredTagId(`${driver.id}-car`);
                            setTagTooltipPosition({ top: rect.top, left: rect.right + 8 });
                          }}
                          onMouseLeave={() => { setHoveredTagId(null); setTagTooltipPosition(null); }}
                        >
                          <span className="tag-emoji">{driver.carTag.emoji}</span>
                          <span className="tag-name">{driver.carTag.name}</span>
                          <span className="tag-type">Car</span>
                        </div>
                      )}
                      {driver.teamTag && (
                        <div
                          className="dropdown-tag"
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoveredTagId(`${driver.id}-team`);
                            setTagTooltipPosition({ top: rect.top, left: rect.right + 8 });
                          }}
                          onMouseLeave={() => { setHoveredTagId(null); setTagTooltipPosition(null); }}
                        >
                          <span className="tag-emoji">{driver.teamTag.emoji}</span>
                          <span className="tag-name">{driver.teamTag.name}</span>
                          <span className="tag-type">Team</span>
                        </div>
                      )}
                      {!driver.driverTag && !driver.carTag && !driver.teamTag && (
                        <span className="no-tags">No active tags</span>
                      )}
                    </div>
                    {/* Tag tooltip - rendered with fixed position */}
                    {hoveredTagId && tagTooltipPosition && (
                      <div
                        className="tag-tooltip"
                        style={{ top: tagTooltipPosition.top, left: tagTooltipPosition.left }}
                      >
                        {hoveredTagId === `${driver.id}-driver` && driver.driverTag && (
                          <>
                            <div className="tag-tooltip-header">{driver.driverTag.emoji} {driver.driverTag.name}</div>
                            <div className="tag-tooltip-desc">{driver.driverTag.description}</div>
                            <div className="tag-tooltip-trigger">Trigger: {driver.driverTag.trigger}</div>
                          </>
                        )}
                        {hoveredTagId === `${driver.id}-car` && driver.carTag && (
                          <>
                            <div className="tag-tooltip-header">{driver.carTag.emoji} {driver.carTag.name}</div>
                            <div className="tag-tooltip-desc">{driver.carTag.description}</div>
                            <div className="tag-tooltip-trigger">Trigger: {driver.carTag.trigger}</div>
                          </>
                        )}
                        {hoveredTagId === `${driver.id}-team` && driver.teamTag && (
                          <>
                            <div className="tag-tooltip-header">{driver.teamTag.emoji} {driver.teamTag.name}</div>
                            <div className="tag-tooltip-desc">{driver.teamTag.description}</div>
                            <div className="tag-tooltip-trigger">Trigger: {driver.teamTag.trigger}</div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <span className="leaderboard-leader">
                  {leaderGapDisplay}
                </span>
                <span className="leaderboard-gap">
                  {intervalGapDisplay}
                </span>
                <span className={`leaderboard-lap-time ${lastLapClass}`}>
                  {lastLapTime !== null ? ticksToShortTime(lastLapTime) : '-'}
                </span>
                <span className={`leaderboard-best-time ${bestLapClass}`}>
                  {bestLapTime !== null ? ticksToShortTime(bestLapTime) : '-'}
                </span>
                <span
                  className="leaderboard-tires hoverable"
                  onMouseEnter={() => setHoveredTireDriverId(driver.id)}
                  onMouseLeave={() => setHoveredTireDriverId(null)}
                >
                  {/* Show tire dots in chronological order: used compounds first, then empty slots */}
                  {(() => {
                    const usedCompounds = driver.usedCompounds || [];
                    const allCompounds: TireCompound[] = ['soft', 'medium', 'hard'];
                    const unusedCompounds = allCompounds.filter(c => !usedCompounds.includes(c));
                    // Total 3 slots: filled ones first (in order used), then empty slots for remaining
                    const slots: Array<{ compound: TireCompound; used: boolean }> = [
                      ...usedCompounds.map(c => ({ compound: c, used: true })),
                      ...unusedCompounds.slice(0, 3 - usedCompounds.length).map(c => ({ compound: c, used: false })),
                    ];
                    return slots.map((slot, idx) => {
                      const isCurrent = tireCompound === slot.compound && slot.used;
                      return (
                        <span
                          key={idx}
                          className={`tire-dot ${slot.used ? 'used' : ''} ${isCurrent ? 'current' : ''}`}
                          style={{
                            background: slot.used ? TIRE_COLORS[slot.compound] : 'transparent',
                            borderColor: slot.used ? TIRE_COLORS[slot.compound] : '#444',
                          }}
                        />
                      );
                    });
                  })()}
                  {/* Tire Stint Hover Card */}
                  {hoveredTireDriverId === driver.id && (
                    <div className="hover-card tire-hover-card">
                      <div className="hover-card-header">
                        <span>Tire Strategy</span>
                        <span className="tire-wear-badge">
                          {driver.tireState.wear.toFixed(0)}% worn
                        </span>
                      </div>
                      <div className="stint-list">
                        {stintData.map((stint, idx) => (
                          <div key={idx} className="stint-row">
                            <div
                              className="stint-compound-dot"
                              style={{ background: TIRE_COLORS[stint.compound] }}
                            />
                            <span className="stint-compound-name">
                              {stint.compound.charAt(0).toUpperCase() + stint.compound.slice(1)}
                            </span>
                            <span className="stint-laps">
                              L{stint.startLap}{stint.endLap ? `-${stint.endLap}` : '+'}
                            </span>
                            <span className="stint-pace">
                              {stint.avgPace !== null ? ticksToShortTime(stint.avgPace) : '-'}
                            </span>
                          </div>
                        ))}
                      </div>
                      {pitStops.length > 0 && (
                        <div className="pit-stop-summary">
                          {pitStops.length} pit stop{pitStops.length > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  )}
                </span>
                {/* Status column - shows active effects or DNF reason */}
                <span className="leaderboard-status">
                  {(() => {
                    // Check for active status effect on this driver (persists longer)
                    const activeStatus = statusEffects.find(e => e.driverId === driver.id);

                    // For DNF drivers, show what caused it
                    if (isDNF && driver.dnfInfo) {
                      const dnfEmoji = driver.dnfInfo.reason === 'tire_failure' ? '💨' : '💥';
                      return <span className="status-icon status-icon-dnf">{dnfEmoji}</span>;
                    }

                    // Show active status effect emoji (the actual track event emoji)
                    if (activeStatus) {
                      return <span className="status-icon">{activeStatus.emoji}</span>;
                    }

                    return null;
                  })()}
                </span>
                {/* Marble Mode bet indicator */}
                {activeBets && activeBets.length > 0 && (() => {
                  const betStatus = calculateLiveBetStatus(driver.id, index + 1, activeBets, isDNF);
                  if (betStatus.status === 'none') return null;

                  // Get short labels for bet types
                  const getBetLabel = (type: string) => {
                    switch (type) {
                      case 'win': return 'WIN';
                      case 'podium': return 'PODIUM';
                      case 'points': return 'POINTS';
                      case 'finishes': return 'FINISH';
                      case 'dnf': return 'DNF';
                      default: return '';
                    }
                  };

                  // Show each bet's type and status
                  return (
                    <span className={`leaderboard-bet-indicator ${betStatus.status}`}>
                      <span className="bet-types-label">
                        {betStatus.bets.map((b, i) => (
                          <span key={i} className={`bet-type-tag ${b.isWinning ? 'winning' : 'losing'}`}>
                            {getBetLabel(b.type)}
                          </span>
                        ))}
                      </span>
                      <span className="bet-amount">
                        {betStatus.status === 'winning' ? '+' : ''}{betStatus.totalPotential}ṁ
                      </span>
                    </span>
                  );
                })()}
              </div>
            );
          })}
        </div>

        {/* Dynamic Track */}
        <div className="oval-track-container">
          <svg viewBox="0 0 600 360" className="oval-track-svg">
          {/* Track path - outer stroke (wider for more lanes) */}
          <path
            d={trackPath}
            fill="none"
            stroke={theme.trackColor}
            strokeWidth="90"
            className="track-outer"
          />
          {/* Track path - inner surface */}
          <path
            ref={trackPathRef}
            d={trackPath}
            fill="none"
            stroke={theme.bg.includes('#') ? theme.trackColor : '#1a1520'}
            strokeWidth="82"
            opacity="0.7"
            className="track-surface"
          />
          {/* Track center line (racing line) */}
          <path
            d={trackPath}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="2"
            strokeDasharray="8 8"
            className="track-centerline"
          />

          {/* Start/Finish line - checkered pattern */}
          {pathsReady && trackPathRef.current && (() => {
            const startPoint = getPointAlongPath(trackPathRef.current, 0);
            const checkSize = 4;
            const rows = 3;
            const cols = 5;
            const totalWidth = cols * checkSize;
            const totalHeight = rows * checkSize;
            return (
              <g className="start-finish-line">
                {/* Background for checkered pattern */}
                <rect
                  x={startPoint.x - totalWidth / 2}
                  y={startPoint.y - totalHeight / 2}
                  width={totalWidth}
                  height={totalHeight}
                  fill="#1a1520"
                  stroke={theme.accent}
                  strokeWidth="1"
                  rx="2"
                />
                {/* Checkered pattern */}
                {Array.from({ length: rows }).map((_, row) =>
                  Array.from({ length: cols }).map((_, col) => {
                    const isBlack = (row + col) % 2 === 0;
                    return (
                      <rect
                        key={`check-${row}-${col}`}
                        x={startPoint.x - totalWidth / 2 + col * checkSize}
                        y={startPoint.y - totalHeight / 2 + row * checkSize}
                        width={checkSize}
                        height={checkSize}
                        fill={isBlack ? '#1a1520' : '#ffffff'}
                      />
                    );
                  })
                )}
                {/* Border around checkered pattern */}
                <rect
                  x={startPoint.x - totalWidth / 2}
                  y={startPoint.y - totalHeight / 2}
                  width={totalWidth}
                  height={totalHeight}
                  fill="none"
                  stroke={theme.accent}
                  strokeWidth="1.5"
                  rx="2"
                />
                <text
                  x={startPoint.x}
                  y={startPoint.y - 14}
                  textAnchor="middle"
                  className="track-label start-finish-label"
                  fill="#ffffff"
                >
                  START/FINISH
                </text>
              </g>
            );
          })()}


          {/* Pit Lane - path from entry to exit with different colored border */}
          {pathsReady && pitMarkers.path && (
            <g className="pit-lane">
              {/* Pit lane outer border */}
              <path
                d={pitMarkers.path}
                fill="none"
                stroke="#f1c40f"
                strokeWidth="22"
                opacity="0.4"
                strokeLinecap="round"
              />
              {/* Pit lane inner surface */}
              <path
                ref={pitPathRef}
                d={pitMarkers.path}
                fill="none"
                stroke={theme.trackColor}
                strokeWidth="18"
                opacity="0.8"
                strokeLinecap="round"
              />
              {/* PIT label in center of pit lane */}
              {(() => {
                const midX = (pitMarkers.entry.x + pitMarkers.exit.x) / 2;
                const midY = (pitMarkers.entry.y + pitMarkers.exit.y) / 2;
                const cx = midX * 0.4 + 300 * 0.6;
                const cy = midY * 0.4 + 150 * 0.6;
                return (
                  <text
                    x={cx}
                    y={cy + 4}
                    textAnchor="middle"
                    className="pit-label"
                    fill="#f1c40f"
                    opacity="0.7"
                  >
                    PIT
                  </text>
                );
              })()}
            </g>
          )}

          {/* Pit Entry/Exit markers on track - simple yellow dots */}
          {pathsReady && (
            <g className="pit-markers">
              <circle
                cx={pitMarkers.entry.x}
                cy={pitMarkers.entry.y}
                r="6"
                fill="#f1c40f"
                opacity="0.8"
              />
              <circle
                cx={pitMarkers.exit.x}
                cy={pitMarkers.exit.y}
                r="6"
                fill="#f1c40f"
                opacity="0.8"
              />
            </g>
          )}


          {/* Driver positions - Racing drivers on track */}
          {driverPositions.map(({ driver, x, y }) => {
            const rank = getPositionRank(driver.id);
            const isTop3 = rank !== null;
            const hasPowerEffect = activePowerEffect && (
              activePowerEffect.targetKingdomId === driver.kingdomId ||
              (activePowerEffect.category === 'god' && activePowerEffect.targetKingdomId === null)
            );
            const powerCategory = hasPowerEffect ? activePowerEffect?.category : null;
            const trackEffect = trackEventEffects.find(e => e.driverId === driver.id);

            return (
              <g
                key={driver.id}
                className={`driver-marker ${isTop3 ? 'top3' : ''} ${hasPowerEffect ? `power-effect power-${powerCategory}` : ''}`}
                transform={`translate(${x}, ${y})`}
              >
                {/* Power effect glow ring */}
                {hasPowerEffect && (
                  <>
                    <circle
                      cx={0}
                      cy={0}
                      r="22"
                      className={`power-glow power-glow-${powerCategory}`}
                      fill="none"
                      strokeWidth="4"
                    />
                    <circle
                      cx={0}
                      cy={0}
                      r="18"
                      className={`power-glow-inner power-glow-inner-${powerCategory}`}
                      fill="none"
                      strokeWidth="2"
                    />
                  </>
                )}
                {/* Position ring for top 3 (gold/silver/bronze) */}
                {isTop3 && (
                  <circle
                    cx={0}
                    cy={0}
                    r="14"
                    className={`position-ring position-ring-${rank}`}
                    fill="none"
                    strokeWidth="3"
                  />
                )}
                {/* Driver badge circle - slot-based styling */}
                <circle
                  cx={0}
                  cy={0}
                  r={10}
                  className={`driver-badge-circle ${hasPowerEffect ? 'power-pulse' : ''}`}
                  fill={driver.color}
                  stroke={driver.driverSlot === 2 ? getColorVariants(driver.color).dark : getColorVariants(driver.color).light}
                  strokeWidth={2}
                />
                <text
                  x={0}
                  y={0}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className={`driver-emoji-track ${hasPowerEffect ? 'power-pulse' : ''}`}
                  style={{ fontSize: '10px' }}
                >
                  {driver.emoji}
                </text>
                {/* Track event effect pop-up - matches crash style */}
                {trackEffect && (
                  <g className={`track-event-popup track-event-${trackEffect.impact}`}>
                    {/* Expanding rings - same size as crash rings */}
                    <circle
                      cx={0}
                      cy={0}
                      r="15"
                      className={`track-event-ring track-event-ring-${trackEffect.impact} track-event-ring-1`}
                    />
                    <circle
                      cx={0}
                      cy={0}
                      r="15"
                      className={`track-event-ring track-event-ring-${trackEffect.impact} track-event-ring-2`}
                    />
                    <circle
                      cx={0}
                      cy={0}
                      r="15"
                      className={`track-event-ring track-event-ring-${trackEffect.impact} track-event-ring-3`}
                    />
                    {/* Center flash - same as crash */}
                    <circle
                      cx={0}
                      cy={0}
                      r="8"
                      className={`track-event-flash track-event-flash-${trackEffect.impact}`}
                    />
                    {/* Event emoji - pops up above driver and fades */}
                    <text
                      x={0}
                      y={-20}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="track-event-emoji"
                    >
                      {trackEffect.emoji}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Pitting drivers - on pit lane path */}
          {pitPositions.map(({ driver, x, y, progress }) => {
            const rank = getPositionRank(driver.id);
            const isTop3 = rank !== null;
            // Progress bar color: red for slow stop, green for quick stop, yellow for normal
            const progressColor = driver.currentPitIsSlowStop
              ? '#e74c3c'  // Red for slow stop
              : driver.currentPitIsQuickStop
                ? '#2ecc71'  // Green for quick stop
                : '#f1c40f'; // Yellow for normal
            return (
            <g key={driver.id} className={`driver-marker pitting ${isTop3 ? 'top3' : ''}`}>
              {/* Position ring for top 3 (gold/silver/bronze) */}
              {isTop3 && (
                <circle
                  cx={x}
                  cy={y}
                  r="14"
                  className={`position-ring position-ring-${rank}`}
                  fill="none"
                  strokeWidth="3"
                  opacity={0.7}
                />
              )}
              {/* Driver badge circle - slot-based styling */}
              <circle
                cx={x}
                cy={y}
                r={10}
                className="driver-badge-circle"
                fill={driver.color}
                stroke={driver.driverSlot === 2 ? getColorVariants(driver.color).dark : getColorVariants(driver.color).light}
                strokeWidth={2}
                opacity={0.7}
              />
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="driver-emoji-track"
                style={{ fontSize: '9px' }}
              >
                {driver.emoji}
              </text>
              {/* Pit stop progress indicator */}
              <rect
                x={x - 12}
                y={y + 12}
                width={24}
                height={5}
                fill="#2a2a3a"
                rx="2"
              />
              <rect
                x={x - 12}
                y={y + 12}
                width={24 * progress}
                height={5}
                fill={progressColor}
                rx="2"
              />
            </g>
            );
          })}

          {/* DNF drivers - crashed/blown out position, faded */}
          {dnfPositions.map(({ driver, x, y }) => {
            const isBlowout = driver.dnfInfo?.reason === 'tire_failure';
            return (
              <g key={driver.id} className="driver-marker dnf">
                {/* Driver badge circle - slot-based styling, faded */}
                <circle
                  cx={x}
                  cy={y}
                  r={10}
                  className="driver-badge-circle"
                  fill={driver.color}
                  stroke={driver.driverSlot === 2 ? getColorVariants(driver.color).dark : getColorVariants(driver.color).light}
                  strokeWidth={2}
                  opacity={0.3}
                />
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="driver-emoji-track dnf"
                  style={{ fontSize: '9px', opacity: 0.4 }}
                >
                  {driver.emoji}
                </text>
                {/* DNF indicator - different for blowout vs crash */}
                <text
                  x={x}
                  y={y - 12}
                  textAnchor="middle"
                  style={{ fontSize: '10px' }}
                >
                  {isBlowout ? '💨' : '💥'}
                </text>
              </g>
            );
          })}

          {/* The Unsafety Car - emerges from The Void during pileups */}
          {unsafetyCarPosition && (
            <g className="unsafety-car" transform={`translate(${unsafetyCarPosition.x}, ${unsafetyCarPosition.y})`}>
              {/* Ominous pulsing void ring */}
              <circle
                cx={0}
                cy={0}
                r="18"
                className="unsafety-car-pulse"
                fill="none"
                stroke="#1a1a2e"
                strokeWidth="3"
              />
              {/* White background circle */}
              <circle
                cx={0}
                cy={0}
                r={14}
                fill="#ffffff"
                stroke="#1a1a2e"
                strokeWidth={3}
              />
              {/* The Void emoji */}
              <text
                x={0}
                y={1}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ fontSize: '14px' }}
              >
                🕳️
              </text>
              {/* "USC" indicator above */}
              <text
                x={0}
                y={-22}
                textAnchor="middle"
                dominantBaseline="middle"
                className="unsafety-car-label"
                style={{ fontSize: '9px', fontWeight: 'bold', fill: '#8b0000' }}
              >
                USC
              </text>
            </g>
          )}

          {/* Crash/blowout highlight effects on track */}
          {crashPositions.map((pos) => (
            <g key={`crash-${pos.tick}`} className={`crash-highlight ${pos.type === 'blowout' ? 'blowout' : ''}`}>
              {pos.type === 'crash' ? (
                <>
                  {/* Crash: Expanding shockwave rings */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="15"
                    fill="none"
                    stroke="#e74c3c"
                    strokeWidth="3"
                    className="crash-ring crash-ring-1"
                  />
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="15"
                    fill="none"
                    stroke="#f39c12"
                    strokeWidth="2"
                    className="crash-ring crash-ring-2"
                  />
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="15"
                    fill="none"
                    stroke="#e74c3c"
                    strokeWidth="1"
                    className="crash-ring crash-ring-3"
                  />
                  {/* Central flash */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="8"
                    fill="#e74c3c"
                    className="crash-flash"
                  />
                  {/* Explosion emoji */}
                  <text
                    x={pos.x}
                    y={pos.y + 5}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="crash-emoji"
                  >
                    💥
                  </text>
                </>
              ) : (
                <>
                  {/* Blowout: Smoke/debris effect */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="12"
                    fill="none"
                    stroke="#666"
                    strokeWidth="3"
                    className="blowout-ring blowout-ring-1"
                  />
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="12"
                    fill="none"
                    stroke="#888"
                    strokeWidth="2"
                    className="blowout-ring blowout-ring-2"
                  />
                  {/* Tire debris indicator */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="6"
                    fill="#333"
                    className="blowout-center"
                  />
                  {/* Smoke puff emoji */}
                  <text
                    x={pos.x}
                    y={pos.y + 5}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="blowout-emoji"
                  >
                    💨
                  </text>
                </>
              )}
            </g>
          ))}
        </svg>

        </div>
      </div>

      {/* Race Finished Modal Overlay */}
      {raceState.raceFinished && sortedFinished.length >= 3 && (
        <div className="finish-modal-overlay">
          <div className="finish-modal">
            <div className="finish-modal-header">
              <span className="checkered-flag">🏁</span>
              <h2>Race Complete</h2>
              <span className="checkered-flag">🏁</span>
            </div>

            <div className="podium-modal">
              {/* 2nd place */}
              <div className="podium-spot podium-2">
                <div className="podium-driver">
                  <span className="podium-champagne">🍾</span>
                  <span
                    className="podium-badge"
                    data-slot={sortedFinished[1]?.driverSlot || 1}
                    style={{
                      '--team-color': sortedFinished[1]?.color,
                      '--team-color-light': sortedFinished[1]?.color ? getColorVariants(sortedFinished[1].color).light : '#fff',
                      '--team-color-dark': sortedFinished[1]?.color ? getColorVariants(sortedFinished[1].color).dark : '#222',
                    } as React.CSSProperties}
                  >
                    {sortedFinished[1]?.emoji}
                  </span>
                </div>
                <div className="podium-name" style={{ color: sortedFinished[1]?.color }}>
                  {sortedFinished[1]?.name}
                </div>
                <div className="podium-block block-2">
                  <span className="podium-num">2</span>
                </div>
              </div>

              {/* 1st place */}
              <div className="podium-spot podium-1">
                <div className="podium-driver winner">
                  <span className="podium-champagne">🍾</span>
                  <span
                    className="podium-badge"
                    data-slot={sortedFinished[0]?.driverSlot || 1}
                    style={{
                      '--team-color': sortedFinished[0]?.color,
                      '--team-color-light': sortedFinished[0]?.color ? getColorVariants(sortedFinished[0].color).light : '#fff',
                      '--team-color-dark': sortedFinished[0]?.color ? getColorVariants(sortedFinished[0].color).dark : '#222',
                    } as React.CSSProperties}
                  >
                    {sortedFinished[0]?.emoji}
                  </span>
                  <span className="winner-crown">🏆</span>
                </div>
                <div className="podium-name" style={{ color: sortedFinished[0]?.color }}>
                  {sortedFinished[0]?.name}
                </div>
                <div className="podium-block block-1">
                  <span className="podium-num">1</span>
                </div>
              </div>

              {/* 3rd place */}
              <div className="podium-spot podium-3">
                <div className="podium-driver">
                  <span className="podium-champagne">🍾</span>
                  <span
                    className="podium-badge"
                    data-slot={sortedFinished[2]?.driverSlot || 1}
                    style={{
                      '--team-color': sortedFinished[2]?.color,
                      '--team-color-light': sortedFinished[2]?.color ? getColorVariants(sortedFinished[2].color).light : '#fff',
                      '--team-color-dark': sortedFinished[2]?.color ? getColorVariants(sortedFinished[2].color).dark : '#222',
                    } as React.CSSProperties}
                  >
                    {sortedFinished[2]?.emoji}
                  </span>
                </div>
                <div className="podium-name" style={{ color: sortedFinished[2]?.color }}>
                  {sortedFinished[2]?.name}
                </div>
                <div className="podium-block block-3">
                  <span className="podium-num">3</span>
                </div>
              </div>
            </div>

            {/* Other finishers */}
            {sortedFinished.length > 3 && (
              <div className="other-finishers-modal">
                {sortedFinished.slice(3, 10).map((driver, idx) => (
                  <span key={driver.id} className="finisher-chip">
                    <span className="finisher-pos">{idx + 4}</span>
                    <span
                      className="finisher-badge"
                      data-slot={driver.driverSlot || 1}
                      style={{ '--team-color': driver.color } as React.CSSProperties}
                    >
                      {driver.emoji}
                    </span>
                  </span>
                ))}
                {sortedFinished.length > 10 && (
                  <span className="finisher-more">+{sortedFinished.length - 10} more</span>
                )}
              </div>
            )}

            {onNextRace && (
              <button className="next-race-btn" onClick={onNextRace}>
                Next Race
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default WatchMode;
