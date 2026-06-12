import RaceEngine, { Driver, RaceConfig, RaceState, TrackInfo, RaceEvent } from './RaceEngine';
import { useMemo, useRef, useEffect, useState } from 'react';
import {
  UniversalHeader,
  NavPanel,
  TimingTower,
  TrackMap,
  TRACK_COLUMNS,
  DETAIL_COLUMNS,
  type RaceView,
  type RaceSpeed,
  type SessionState,
} from './components/race';
import RaceFeed from './components/race/RaceFeed';
import { voiceNotification, type FeedItem } from './feed/commentary';
import './WatchMode.css';

// Suffixes to ignore when extracting surname
const NAME_SUFFIXES = new Set(['JR', 'JR.', 'SR', 'SR.', 'II', 'III', 'IV', 'V']);

// Helper to extract surname for alphabetical sorting
function getSurname(driver: Driver): string {
  const parts = driver.name.split(' ').filter(p => p.length > 0);
  const filteredParts = parts.filter(p => !NAME_SUFFIXES.has(p.toUpperCase()));
  return (filteredParts[filteredParts.length - 1] || parts[parts.length - 1] || '').toUpperCase();
}

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
  onExit?: () => void;  // Leave the race (back to main menu / league)
  /** Live broadcast mode: no pause/speed/reset — you're a spectator of
   * something really happening. Exit reads "Back to League". */
  spectator?: boolean;
  // Race controls
  isRunning?: boolean;
  raceSpeed?: RaceSpeed;
  onStart?: () => void;
  onStop?: () => void;
  onReset?: () => void;
  onSpeedChange?: (speed: RaceSpeed) => void;
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

// Status effect for timing tower (persists longer than visual pop-up)
interface StatusEffect {
  driverId: number;
  emoji: string;
  expiresAtTick: number;
}

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

// Default fallback track path (oval) if no layout provided
const DEFAULT_TRACK_PATH = 'M 150 60 L 450 60 Q 550 60, 550 150 Q 550 240, 450 240 L 150 240 Q 50 240, 50 150 Q 50 60, 150 60 Z';

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

function WatchMode({
  drivers,
  config,
  raceState,
  trackInfo,
  onNextRace,
  powerActivation,
  raceEvents,
  onExit,
  spectator = false,
  // Race controls
  isRunning = false,
  raceSpeed = 1,
  onStart,
  onStop,
  onReset,
  onSpeedChange,
}: WatchModeProps) {
  const trackLength = config.lapLength;
  const totalLaps = config.totalLaps;

  // Track which drivers were pitting in the previous frame (to detect pit exit)
  const previouslyPittingRef = useRef<Set<number>>(new Set());

  // Notification id sequence (notifications are voiced straight into the feed)
  const notificationIdRef = useRef(0);
  // Persistent narrated feed (does not expire like the old ticker notifications)
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const feedIdRef = useRef(0);
  const recentNotifKeysRef = useRef<Map<string, { tick: number; time: number }>>(new Map());
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

  // Status effects for timing tower (longer duration - persists for ~1 lap)
  const [statusEffects, setStatusEffects] = useState<StatusEffect[]>([]);

  // Multi-view system - different "lenses" over the same race state
  // New view system: track (map + tower), detail (full tower)
  const [activeView, setActiveView] = useState<RaceView>('track');
  // Multi-driver focus - allow up to 10 focused drivers (click to toggle)
  const [focusedDriverIds, setFocusedDriverIds] = useState<Set<number>>(new Set());
  const [navPanelOpen, setNavPanelOpen] = useState(false);

  // Auto-unfocus DNF'd drivers (they can manually re-focus if wanted)
  const unfocusedDnfDriversRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    const dnfDriverIds = drivers
      .filter(d => d.status === 'dnf')
      .map(d => d.id);

    // Check if any newly DNF'd drivers are focused
    const newDnfFocused = dnfDriverIds.filter(
      id => focusedDriverIds.has(id) && !unfocusedDnfDriversRef.current.has(id)
    );

    if (newDnfFocused.length > 0) {
      setFocusedDriverIds(prev => {
        const next = new Set(prev);
        newDnfFocused.forEach(id => next.delete(id));
        return next;
      });
      // Track that we've unfocused these drivers
      newDnfFocused.forEach(id => unfocusedDnfDriversRef.current.add(id));
    }
  }, [drivers, focusedDriverIds]);

  // Helper to toggle a driver's focus state
  const toggleDriverFocus = (driverId: number) => {
    setFocusedDriverIds(prev => {
      const next = new Set(prev);
      if (next.has(driverId)) {
        next.delete(driverId);
      } else if (next.size < 10) {
        // Max 10 focused drivers
        next.add(driverId);
      }
      return next;
    });
  };

  // Clear all focused drivers
  const clearFocus = () => {
    setFocusedDriverIds(new Set());
  };

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

  // Position deltas - only update when a driver completes a lap
  // Tracks: { driverId -> { lastLap: number, positionAtLapEnd: number } }
  const driverLapPositionsRef = useRef<Map<number, { lastLap: number; positionAtLapEnd: number }>>(new Map());
  // Store delta AND the lap at which it should disappear (showUntilLap)
  const [positionDeltas, setPositionDeltas] = useState<Map<number, { delta: number; showUntilLap: number }>>(new Map());

  // Swipe navigation for mobile - track touch start position
  const touchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const SWIPE_THRESHOLD = 50; // Minimum distance in pixels to trigger view change

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;

    // Only trigger if horizontal swipe is dominant (not vertical scrolling)
    if (Math.abs(deltaX) > SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY)) {
      const views: RaceView[] = ['track', 'detail'];
      const currentIdx = views.indexOf(activeView);

      if (deltaX > 0 && currentIdx > 0) {
        // Swipe right → previous view
        setActiveView(views[currentIdx - 1]);
      } else if (deltaX < 0 && currentIdx < views.length - 1) {
        // Swipe left → next view
        setActiveView(views[currentIdx + 1]);
      }
    }
  };

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
    const currentTick = raceState.totalTicks;

    // Deduplicate: skip if same title/type fired within last 100 ticks or 2 seconds.
    // Ref-based (not state-scan) so it's safe under StrictMode double-invocation
    // and can gate the feed append below as well.
    const dedupeKey = `${type}:${title}`;
    const recent = recentNotifKeysRef.current.get(dedupeKey);
    if (recent && (Math.abs(recent.tick - currentTick) < 100 || now - recent.time < 2000)) {
      return; // Skip duplicate
    }
    recentNotifKeysRef.current.set(dedupeKey, { tick: currentTick, time: now });

    const newNotification: RaceNotification = {
      id: notificationIdRef.current++,
      type,
      title,
      message,
      emoji,
      tick: currentTick,
      expiresAt: now + durationMs,
      drivers: involvedDrivers,
      color,
    };

    // Narrate it into the persistent race feed
    const voiced = voiceNotification(newNotification, {
      lap: leaderLapForFeed(),
      totalLaps,
      trackName: trackInfo?.name ?? '',
      trackEmoji: trackInfo?.funEmoji ?? '',
    });
    if (voiced) pushFeedItem(voiced);
  };

  // Append to the feed, skipping verbatim stutters (e.g., a lead flap
  // producing the same voiced line twice in a row)
  const pushFeedItem = (voiced: Omit<FeedItem, 'id'>) => {
    setFeedItems(prev => {
      if (prev[0]?.text === voiced.text) return prev;
      return [{ ...voiced, id: feedIdRef.current++ }, ...prev].slice(0, 80);
    });
  };

  // Leader's lap, for stamping feed items
  const leaderLapForFeed = () => {
    let lap = 0;
    for (const d of drivers) {
      if (d.status !== 'dnf' && d.currentLap > lap) lap = d.currentLap;
    }
    return Math.min(Math.max(lap, 1), totalLaps);
  };

  // Get track path and pit lane path from layout
  const trackPath = trackInfo?.layout?.trackPath || DEFAULT_TRACK_PATH;
  const pitLanePath = trackInfo?.layout?.pitLanePath;

  // Joining a broadcast mid-race: everything that already happened is
  // history, not news. On first observation of an in-progress race, prime
  // every "seen" ref from current state — silently — so catch-up doesn't
  // fire stale notifications (HALFWAY at lap 11, explosion bursts for old
  // crashes, the standing fastest lap announced as new).
  const joinPrimedRef = useRef(false);
  useEffect(() => {
    if (joinPrimedRef.current) return;
    joinPrimedRef.current = true;
    if (raceState.totalTicks === 0) return; // fresh race — nothing to prime

    drivers.filter(d => d.status === 'dnf')
      .forEach(d => seenCrashesRef.current.add(d.id));
    drivers.filter(d => d.status === 'pitting' && d.currentPitIsSlowStop)
      .forEach(d => seenSlowPitStopsRef.current.add(d.id));
    drivers.filter(d => d.status === 'pitting' && d.currentPitIsQuickStop)
      .forEach(d => seenQuickPitStopsRef.current.add(d.id));

    const leaderLap = Math.max(0, ...drivers.map(d => d.currentLap));
    const halfwayLap = Math.floor(totalLaps / 2);
    if (halfwayLap > 0 && leaderLap >= halfwayLap) halfwayTriggeredRef.current = true;
    if (totalLaps > 1 && leaderLap >= totalLaps - 1) lastLapTriggeredRef.current = true;
    if (raceState.raceFinished) winnerAnnouncedRef.current = true;

    // The standing fastest lap is old news
    let fastest: { driverId: number; time: number } | null = null;
    for (const d of drivers) {
      for (const time of d.lapTimes || []) {
        if (!fastest || time < fastest.time) fastest = { driverId: d.id, time };
      }
    }
    fastestLapRef.current = fastest;

    // Past track events, unsafety car deployments, effects, tag activations
    for (const e of raceEvents ?? []) {
      if (e.type === 'track_event' && e.tick > lastTrackEventTickRef.current) {
        lastTrackEventTickRef.current = e.tick;
      }
      if ((e.type === 'unsafety_car_deployed' || e.type === 'unsafety_car_recalled') &&
          e.tick > lastUnsafetyCarTickRef.current) {
        lastUnsafetyCarTickRef.current = e.tick;
      }
      if (e.type === 'track_event_effect' && e.driverId >= 0) {
        seenTrackEffectsRef.current.add(`${e.tick}-${e.driverId}`);
      }
      if (e.type === 'tag_activation') {
        seenTagActivationsRef.current.add(`${e.tick}-${e.driverId}-${e.description}`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drivers, raceState.totalTicks]);

  // Detect new crashes and tire blowouts, add notifications
  useEffect(() => {
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
      }

      lastCrashTickRef.current = currentTick;
    }

    // Handle tire blowouts (different notification and visual)
    if (newlyBlownOut.length > 0) {
      newlyBlownOut.forEach(d => seenCrashesRef.current.add(d.id));

      newlyBlownOut.forEach(driver => {
        addNotification(
          'crash',  // Still uses crash notification type for styling
          'BLOWOUT!',
          `${driver.emoji} ${driver.name} - tire failure!`,
          '💨',  // Different emoji for blowout
          [{ id: driver.id, name: driver.name, emoji: driver.emoji }]
        );
      });
    }

    // Handle mechanical failures
    const mechanicalDrivers = dnfDrivers.filter(d => d.dnfInfo?.reason === 'mechanical');
    const newlyMechanical = mechanicalDrivers.filter(d => !seenCrashesRef.current.has(d.id));

    if (newlyMechanical.length > 0) {
      newlyMechanical.forEach(d => seenCrashesRef.current.add(d.id));

      newlyMechanical.forEach(driver => {
        addNotification(
          'crash',  // Uses crash notification type for styling
          'MECHANICAL!',
          `${driver.emoji} ${driver.name} - engine failure!`,
          '⚙️',
          [{ id: driver.id, name: driver.name, emoji: driver.emoji }]
        );
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
  }, [drivers, raceState.totalTicks]);

  // Track if we're in the first few ticks of a race (for position stabilization)
  const raceStartGraceRef = useRef(true);

  // Reset state when race resets
  useEffect(() => {
    if (raceState.totalTicks === 0) {
      seenCrashesRef.current.clear();
      seenSlowPitStopsRef.current.clear(); // Reset slow pit stop tracking
      seenQuickPitStopsRef.current.clear(); // Reset quick pit stop tracking
      setFeedItems([]);
      feedIdRef.current = 0;
      recentNotifKeysRef.current.clear();
      joinPrimedRef.current = false;
      lastCrashTickRef.current = -1;
      previousLeaderRef.current = null;
      notificationIdRef.current = 0;
      driverSectorsRef.current.clear(); // Reset sector tracking
      fastestLapRef.current = null;
      halfwayTriggeredRef.current = false;
      lastLapTriggeredRef.current = false;
      leaderSectorRef.current = -1;
      winnerAnnouncedRef.current = false;
      previouslyPittingRef.current.clear(); // Reset pit tracking
      raceStartGraceRef.current = true; // Reset grace period for new race
      lastSortUpdateSectorRef.current = -1; // Reset frozen sort tracking
      setFrozenSortedDrivers([]); // Clear frozen order
      driverLapPositionsRef.current.clear(); // Reset position tracking for deltas
      setPositionDeltas(new Map()); // Clear any displayed deltas
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

  // Track seen effects for deduplication
  const seenTrackEffectsRef = useRef<Set<string>>(new Set());

  // Detect track event effects on individual drivers and add to status effects
  useEffect(() => {
    if (!raceEvents || raceEvents.length === 0) return;

    // Find track_event_effect events for individual drivers
    const newEffects = raceEvents.filter(e => {
      if (e.type !== 'track_event_effect') return false;
      if (e.driverId < 0) return false;
      const key = `${e.tick}-${e.driverId}`;
      if (seenTrackEffectsRef.current.has(key)) return false;
      seenTrackEffectsRef.current.add(key);
      return true;
    });

    if (newEffects.length > 0) {
      // Add to status effects (persists for timing tower display)
      const statusToAdd: StatusEffect[] = newEffects.map(e => ({
        driverId: e.driverId,
        emoji: e.emoji || trackInfo?.event?.emoji || '⚡',
        expiresAtTick: raceState.totalTicks + 500,
      }));
      setStatusEffects(prev => [...prev, ...statusToAdd]);
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
      setStatusEffects([]);
      seenTrackEffectsRef.current.clear();
      seenTagActivationsRef.current.clear();
    }
  }, [raceState.totalTicks]);

  // Track total sector crossings - recomputed every tick to catch mutations
  // When any driver crosses a sector, this value changes, triggering the sort update
  const totalSectorCrossings = useMemo(
    () => drivers.reduce((sum, d) => sum + (d.sectorTimes?.length || 0), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [drivers, raceState.totalTicks] // totalTicks ensures we recompute even if drivers array is mutated in place
  );

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

      // Racing/pitting drivers by completed sectors ONLY
      // Use sectorTimes.length as source of truth (no position - that changes every tick)
      const aSectors = a.sectorTimes?.length || 0;
      const bSectors = b.sectorTimes?.length || 0;
      // Sort by sectors (more = higher), then by time at last sector for ties
      if (bSectors !== aSectors) return bSectors - aSectors;
      // Same sectors: compare time at last sector (lower = crossed first = ahead)
      if (aSectors > 0 && bSectors > 0) {
        const aTime = a.sectorTimes![aSectors - 1];
        const bTime = b.sectorTimes![bSectors - 1];
        if (aTime !== bTime) return aTime - bTime;
      }
      // Final fallback: surname for equal times (race start)
      return getSurname(a).localeCompare(getSurname(b));
    });

    // Update frozen order when:
    // 1. It's empty (race start)
    // 2. ANY driver crossed a sector boundary (total sectors changed)
    // 3. A driver finishes (finish order changed)
    // 4. A driver DNFs
    const hasNewFinisher = newSortedDrivers.some(d => d.status === 'finished') &&
      (frozenSortedDrivers.length === 0 ||
       newSortedDrivers.filter(d => d.status === 'finished').length !== frozenSortedDrivers.filter(d => d.status === 'finished').length);
    const hasNewDNF = newSortedDrivers.some(d => d.status === 'dnf') &&
      (frozenSortedDrivers.length === 0 ||
       newSortedDrivers.filter(d => d.status === 'dnf').length !== frozenSortedDrivers.filter(d => d.status === 'dnf').length);

    if (frozenSortedDrivers.length === 0 ||
        totalSectorCrossings !== lastSortUpdateSectorRef.current ||
        hasNewFinisher ||
        hasNewDNF) {
      setFrozenSortedDrivers(newSortedDrivers);
      lastSortUpdateSectorRef.current = totalSectorCrossings;
    }
  }, [drivers, totalSectorCrossings, raceState.finishOrder, frozenSortedDrivers.length]);

  // Position deltas - only update when a driver completes a lap
  // Compare position at end of current lap vs position at end of previous lap
  // Delta persists for the FULL next lap, then clears
  useEffect(() => {
    if (frozenSortedDrivers.length === 0) return;

    const newDeltas = new Map<number, { delta: number; showUntilLap: number }>();
    const deltasToRemove: number[] = [];

    frozenSortedDrivers.forEach((driver, currentPosition) => {
      const prevData = driverLapPositionsRef.current.get(driver.id);
      const currentDeltaInfo = positionDeltas.get(driver.id);

      // Clear delta if driver DNFed
      if (driver.status === 'dnf' && currentDeltaInfo) {
        deltasToRemove.push(driver.id);
        return; // Skip further processing for DNF drivers
      }

      // Check if an existing delta should be cleared (driver completed their showUntilLap)
      if (currentDeltaInfo && driver.currentLap >= currentDeltaInfo.showUntilLap) {
        deltasToRemove.push(driver.id);
      }

      // Check if this driver has completed a new lap
      if (prevData && driver.currentLap > prevData.lastLap) {
        // Driver completed a lap - calculate delta
        // Positive = gained positions (moved up in standings), Negative = lost positions
        const delta = prevData.positionAtLapEnd - currentPosition;
        if (delta !== 0) {
          // Show delta until they complete their NEXT lap
          newDeltas.set(driver.id, {
            delta,
            showUntilLap: driver.currentLap + 1,
          });
        }
      }

      // Update tracking for this driver's current lap
      driverLapPositionsRef.current.set(driver.id, {
        lastLap: driver.currentLap,
        positionAtLapEnd: currentPosition,
      });
    });

    // Only update state if there are changes
    if (newDeltas.size > 0 || deltasToRemove.length > 0) {
      setPositionDeltas(prev => {
        const updated = new Map(prev);
        // Remove expired deltas
        deltasToRemove.forEach(id => updated.delete(id));
        // Add new deltas
        newDeltas.forEach((info, id) => updated.set(id, info));
        return updated;
      });
    }
  }, [frozenSortedDrivers, positionDeltas]);

  // Detect lead changes - only trigger on sector crossings to avoid spam
  useEffect(() => {
    if (drivers.length === 0) return;

    // Find current leader (racing drivers only, by distance)
    const racingDrivers = drivers.filter(d => d.status === 'racing' || d.status === 'finished');
    if (racingDrivers.length === 0) return;

    const leader = racingDrivers.reduce((prev, curr) => {
      const prevSectors = prev.sectorTimes?.length || 0;
      const currSectors = curr.sectorTimes?.length || 0;
      const prevDist = prevSectors * (trackLength / 3) + prev.position;
      const currDist = currSectors * (trackLength / 3) + curr.position;
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
          '🔄',
          [{ id: leader.id, name: leader.name, emoji: leader.emoji }],
          12000,
          leader.color
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
      const prevSectors = prev.sectorTimes?.length || 0;
      const currSectors = curr.sectorTimes?.length || 0;
      const prevDist = prevSectors * (trackLength / 3) + prev.position;
      const currDist = currSectors * (trackLength / 3) + curr.position;
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
            '⚡',
            [{ id: fastest.driver.id, name: fastest.driver.name, emoji: fastest.driver.emoji }],
            12000,
            fastest.driver.color
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
          [{ id: winner.id, name: winner.name, emoji: winner.emoji }],
          20000, // Keep winner notification longer
          winner.color
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

    // Racing/pitting drivers by completed sectors + position
    const aSectors = a.sectorTimes?.length || 0;
    const bSectors = b.sectorTimes?.length || 0;
    const aDistance = aSectors * (trackLength / 3) + a.position;
    const bDistance = bSectors * (trackLength / 3) + b.position;
    // Tiebreaker by surname for alphabetical ordering at race start
    if (aDistance === bDistance) return getSurname(a).localeCompare(getSurname(b));
    return bDistance - aDistance;
  });

  // Use frozen sorted order for timing tower (synced with sector updates)
  // Fall back to realtime if frozen is empty (during initialization)
  const sortedDrivers = frozenSortedDrivers.length > 0 ? frozenSortedDrivers : realtimeSortedDrivers;

  // P1–P3 always stand out on the map (bigger marker + team emoji) so the
  // front of the race stays trackable through lapped traffic.
  const podiumIds = useMemo(
    () => sortedDrivers.filter(d => d.status !== 'dnf').slice(0, 3).map(d => d.id),
    [sortedDrivers]
  );

  // Derived values for TimingTower
  const fastestLapOverall = useMemo(() => {
    const allLapTimes = drivers.flatMap(d => d.lapTimes || []);
    return allLapTimes.length > 0 ? Math.min(...allLapTimes) : null;
  }, [drivers]);

  // Convert statusEffects array to Map for TimingTower
  const statusEffectsMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const effect of statusEffects) {
      map.set(effect.driverId, effect.emoji);
    }
    return map;
  }, [statusEffects]);

  // Ambient race conditions (weather + track character) for the header, and
  // per-driver active-tag state for the tower's tag chips. WatchMode always
  // renders the app singleton's race, so reading it directly is sound; both
  // refresh on every drivers-notify render.
  const engine = RaceEngine.getInstance();
  const headerConditions = useMemo(() => {
    const chips: { emoji: string; label: string }[] = [];
    const weather = engine.getWeather();
    if (weather && weather.id !== 'clear') chips.push({ emoji: weather.emoji, label: weather.name });
    for (const tt of engine.getTrackTags()) chips.push({ emoji: tt.emoji, label: tt.name });
    return chips;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, trackInfo]);
  const activeTagsMap = useMemo(() => {
    const map = new Map<number, Set<string>>();
    for (const d of drivers) {
      if (d.driverTag || d.carTag || d.teamTag) {
        map.set(d.id, new Set(engine.getActiveTagIds(d.id)));
      }
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drivers, raceState.totalTicks]);

  // Transform positionDeltas to just delta values for TimingTower
  const positionDeltasForTower = useMemo(() => {
    const map = new Map<number, number>();
    positionDeltas.forEach((info, id) => {
      map.set(id, info.delta);
    });
    return map;
  }, [positionDeltas]);

  // Separate drivers by status
  const pittingDrivers = drivers.filter(d => d.status === 'pitting');
  const finishedDrivers = drivers.filter(d => d.status === 'finished');

  // Sort finished drivers by finish order
  const sortedFinished = [...finishedDrivers].sort((a, b) => {
    return raceState.finishOrder.indexOf(a.id) - raceState.finishOrder.indexOf(b.id);
  });

  // Track which drivers are currently pitting for pit exit detection
  // This runs after position calculations to update the ref for next frame
  useEffect(() => {
    const currentlyPitting = new Set(pittingDrivers.map(d => d.id));
    previouslyPittingRef.current = currentlyPitting;
  }, [pittingDrivers]);

  // Calculate session state for UniversalHeader
  const getSessionState = (): SessionState => {
    if (raceState.raceFinished) return 'finished';
    if (raceState.unsafetyCarActive) return 'safety-car';
    // Check if leader is on final lap
    const leaderLap = frozenSortedDrivers[0]?.currentLap || 0;
    if (leaderLap >= totalLaps - 1) return 'final-lap';
    return 'racing';
  };

  // Calculate current lap (leader's lap)
  const currentLapForHeader = Math.max(1, (frozenSortedDrivers[0]?.currentLap || 0) + 1);

  return (
    <div className="watch-mode" style={{ background: theme.bg }}>
      {/* Universal Header - new navigation system */}
      <UniversalHeader
        currentLap={currentLapForHeader}
        totalLaps={totalLaps}
        sessionState={getSessionState()}
        trackName={trackInfo?.name || 'Grand Prix'}
        trackEmoji={trackInfo?.funEmoji || '🏁'}
        trackFlagEmoji={trackInfo?.emoji}
        conditions={headerConditions}
        elapsedTime={raceState.totalTicks}
        onMenuOpen={() => setNavPanelOpen(true)}
        liveBadge={spectator && !raceState.raceFinished}
        // Race controls (a live broadcast offers none)
        isRunning={isRunning}
        raceFinished={raceState.raceFinished}
        raceSpeed={raceSpeed}
        onStart={spectator ? undefined : onStart}
        onStop={spectator ? undefined : onStop}
        onReset={spectator ? undefined : onReset}
        onSpeedChange={spectator ? undefined : onSpeedChange}
      />

      {/* Navigation Panel - slide-in from left */}
      <NavPanel
        isOpen={navPanelOpen}
        activeView={activeView}
        onViewChange={setActiveView}
        onClose={() => setNavPanelOpen(false)}
        onExit={onExit}
        exitLabel={spectator ? 'League' : 'Main Menu'}
        exitDescription={spectator ? 'Back to the league view' : 'Leave the race'}
      />

      {/* Main content: Single scroll container for entire page */}
      <div
        className={`watch-content view-${activeView}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* TRACK VIEW: Tower on left (desktop), track on right. Mobile: tower below track */}
        {activeView === 'track' && (
          <>
            {/* Timing Tower - appears first in DOM for desktop side-by-side (left) */}
            <section className="dashboard-section timing-section">
              {focusedDriverIds.size > 0 && (
                <button className="clear-focus-btn" onClick={clearFocus}>
                  Clear Focus ({focusedDriverIds.size})
                </button>
              )}
              <TimingTower
                drivers={sortedDrivers}
                columns={TRACK_COLUMNS}
                raceState={raceState}
                totalLaps={totalLaps}
                lapLength={trackLength}
                focusedDriverIds={focusedDriverIds}
                onDriverClick={toggleDriverFocus}
                condensed={false}
                statusEffects={statusEffectsMap}
                activeTags={activeTagsMap}
                positionDeltas={positionDeltasForTower}
                fastestLapOverall={fastestLapOverall ?? undefined}
                className="timing-tower-track"
              />
            </section>

            {/* Track Map - appears second for desktop (right) */}
            <section className="dashboard-section track-section">
              <TrackMap
                trackPath={trackPath}
                pitLanePath={pitLanePath}
                trackLength={trackLength}
                drivers={drivers}
                focusedDriverIds={Array.from(focusedDriverIds)}
                highlightedDriverIds={podiumIds}
                unsafetyCarActive={raceState.unsafetyCarActive}
                unsafetyCarPosition={raceState.unsafetyCarPosition}
              />

              {/* The narrator: persistent persona-voiced race feed */}
              <RaceFeed items={feedItems} className="story-feed-track" />
            </section>
          </>
        )}

        {/* DETAIL VIEW: Full timing tower, track, then events - all scroll as one */}
        {activeView === 'detail' && (
          <>
            {/* Full Timing Tower */}
            <section className="dashboard-section timing-section">
              {focusedDriverIds.size > 0 && (
                <button className="clear-focus-btn" onClick={clearFocus}>
                  Clear Focus ({focusedDriverIds.size})
                </button>
              )}
              <TimingTower
                drivers={sortedDrivers}
                columns={DETAIL_COLUMNS}
                raceState={raceState}
                totalLaps={totalLaps}
                lapLength={trackLength}
                focusedDriverIds={focusedDriverIds}
                onDriverClick={toggleDriverFocus}
                condensed={false}
                expandable={false}
                statusEffects={statusEffectsMap}
                activeTags={activeTagsMap}
                positionDeltas={positionDeltasForTower}
                fastestLapOverall={fastestLapOverall ?? undefined}
                className="timing-tower-detail"
              />
            </section>

            {/* No track map here — detail view IS the full data table.
                The map lives in the track view. */}

            {/* Live Events Feed — persistent narrated history */}
            <section className="dashboard-section events-section">
              <RaceFeed items={feedItems} className="story-feed-detail" />
            </section>
          </>
        )}
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

            <div className="finish-modal-buttons">
              {onExit && (
                <button
                  className={spectator ? 'next-race-btn' : 'finish-menu-btn'}
                  onClick={onExit}
                >
                  {spectator ? '⚜️ Back to League' : 'Menu'}
                </button>
              )}
              {onNextRace && (
                <button className="next-race-btn" onClick={onNextRace}>
                  Next Race →
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WatchMode;
