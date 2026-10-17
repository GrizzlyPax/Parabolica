import { getDeckTrackById } from './data/deckTracks';
import { isNeutralWeather } from './data/weather';
import { favourText, favourParts } from './cards/favourText';
import RaceEngine, { Driver, RaceConfig, RaceState, TrackInfo, RaceEvent, EffectStackEntry, isOutOfRace } from './RaceEngine';
import { useMemo, useRef, useEffect, useState } from 'react';
import {
  UniversalHeader,
  TimingTower,
  TrackMap,
  TrackStrip,
  ConditionsPanel,
  LapChart,
  TRACK_COLUMNS,
  DETAIL_COLUMNS,
  type RaceView,
  type RaceScope,
  type RaceSpeed,
  type SessionState,
} from './components/race';
import RaceFeed from './components/race/RaceFeed';
import { buildLapChartData } from './components/race/lapChartData';
import { buildRaceReportMd } from './components/race/raceReportMd';
import FinishSheet from './components/race/FinishSheet';
import DriverCard from './season/ui/DriverCard';
import { DRIVER_CARD_STATS, type DriverCardData } from './season/driverCard';
import { readStat } from './season/grades';
import { driverDebrief, winnerEdge } from './components/race/debrief';
import QualiBoard, { type QualiLive, type QualiFollow } from './components/race/QualiBoard';
import type { DriverHistoryEntry } from './components/race/types';
import type { IconId } from './icons/registry';
import { version as appVersion } from '../package.json';
import { voiceNotification, voiceTitle, lightsOutLine, callerFor, callerMeta, type FeedItem, type FeedVoice } from './feed/commentary';
import './WatchMode.css';
import './look/race.css';
import { StepTheme } from './look/Look';
import { driverSurname } from './components/race/driverCode';
import { intervalNext, intervalStart, type IntervalMoment, type IntervalState } from './feed/interval';
import { sceneForTrackId, type SceneCtx } from './look/venues/scenes';
import type { TitleTag } from './components/race/types';
import type { StateLook, Step } from './look/step';
import { GameIcon } from './icons/GameIcon';

// Helper to extract surname for alphabetical sorting
const getSurname = (driver: Driver): string => driverSurname(driver.name);

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
  /** Qualifying show (#495): set while the session plays before the lights; called when it ends. */
  onQualifyingDone?: () => void;
  /** Quick Race (#607): pick a team to follow while qualifying runs. */
  follow?: QualiFollow;
  /** Cards + resolved rules, for the report's Rules line (#241). */
  rulesLines?: string[];
  powerActivation?: PowerActivation | null;
  raceEvents?: RaceEvent[];  // For track event notifications
  onExit?: () => void;  // Leave the race (back to main menu / league)
  /** Live broadcast mode: no pause/speed/reset — you're a spectator of
   * something really happening. Exit reads "Back to League". */
  spectator?: boolean;
  /** Your latest title (#769): your tower rows wear its ribbon. */
  myTitle?: TitleTag;
  /** Season races: jump to the result (the masthead's Skip to result). */
  onSkip?: () => void;
  /** Season Mode (#322): rivals' drivers, whose stats and cards stay sealed. */
  sealedDriverIds?: ReadonlySet<number>;
  /** Season Mode (#451): your drivers, lit (focused) from the first lap. */
  myDriverIds?: readonly number[];
  /** A run (#635): the nemesis team's drivers, tagged NEMESIS in the tower. */
  nemesisDriverIds?: readonly number[];
  /** Season Mode (#489): each driver's portrait + car vehicle. */
  avatars?: ReadonlyMap<number, { portrait: IconId; vehicle: IconId }>;
  /** The way out, when it isn't the menu or the league ("Paddock"). */
  exitLabel?: string;
  // Race controls
  isRunning?: boolean;
  raceSpeed?: RaceSpeed;
  onStart?: () => void;
  onStop?: () => void;
  onReset?: () => void;
  onSpeedChange?: (speed: RaceSpeed) => void;
  /** The race program (#716): the step whose theme the race wears (Nationals' Americana when absent), the state's colours, and the program line under the scoreboard. */
  step?: Step;
  state?: StateLook;
  program?: string;
  /** Who's who for the callers (#749): your town and garage, each car's identifier, home town and home state. */
  feedVoice?: FeedVoice;
  /** Season races show no countdown (#762): the caller's lights-out line goes to the feed as the race starts. */
  lightsOut?: boolean;
  /** The step's title ("Ace Zanesville"): the finish sheet's sash says it when `titleWon` says yes (#778). */
  titleName?: string;
  /** The track's kind (#750), under its name in the masthead. */
  trackKind?: string;
  /** Garage data name → the name to show (#778: the title after Locals). */
  teamLabels?: Record<string, string>;
  /** The step's last race (#751): the Interval's odds rise, and the flag is a moment it can follow. */
  lastRaceOfStep?: boolean;
  /** Does this result win the step's title (#762)? Asked once at the flag; a yes gets the caller's title line. */
  titleWon?: (digest: { finishOrder: number[]; dnfDriverIds: number[]; fastestLapDriverId: number | null }) => boolean;
}

// Modular notification system for race events
export type NotificationType = 'crash' | 'lead_change' | 'pit_stop' | 'slow_pit_stop' | 'quick_pit_stop' | 'weather' | 'finish' | 'info' | 'overtake' | 'fastest_lap' | 'milestone' | 'power_blessing' | 'power_curse' | 'power_god' | 'track_event' | 'effect_applied';

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


// Default fallback track path (oval) if no layout provided
const DEFAULT_TRACK_PATH = 'M 150 60 L 450 60 Q 550 60, 550 150 Q 550 240, 450 240 L 150 240 Q 50 240, 50 150 Q 50 60, 150 60 Z';


function WatchMode({
  drivers,
  config,
  raceState,
  trackInfo,
  onNextRace,
  onQualifyingDone,
  follow,
  rulesLines,
  powerActivation,
  raceEvents,
  onExit,
  spectator = false,
  sealedDriverIds,
  myDriverIds,
  nemesisDriverIds,
  avatars,
  exitLabel,
  // Race controls
  isRunning = false,
  raceSpeed = 1,
  onStart,
  onStop,
  onReset,
  onSpeedChange,
  step = 'nationals',
  state,
  program,
  feedVoice,
  lightsOut,
  titleName,
  trackKind,
  teamLabels,
  lastRaceOfStep = false,
  titleWon,
  myTitle,
  onSkip,
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
  const seenEffectsRef = useRef<Set<string>>(new Set()); // Which in-race effects we've shown

  // Status effects for timing tower (longer duration - persists for ~1 lap)
  const [statusEffects, setStatusEffects] = useState<StatusEffect[]>([]);

  // Multi-view system - different "lenses" over the same race state
  // New view system: track (map + tower), detail (full tower)
  const [activeView, setActiveView] = useState<RaceView>('track');
  // The scope (#778): who the picture is about. Follow takes the focused car, else your lead car, else the leader.
  const [scope, setScope] = useState<RaceScope>('all');
  // Multi-driver focus - allow up to 10 focused drivers (click to toggle)
  const [focusedDriverIds, setFocusedDriverIds] = useState<Set<number>>(() => new Set());
  // Your team's rows are tinted instead of opened (Pax, Oct 9).
  const mineSet = useMemo(() => (myDriverIds ? new Set(myDriverIds) : undefined), [myDriverIds]);
  const nemesisSet = useMemo(() => (nemesisDriverIds ? new Set(nemesisDriverIds) : undefined), [nemesisDriverIds]);
  // The driver card from the driver panel (#476). In a race the levels are
  // race-day: cards and today's favours are already in the stats.
  const [raceCardOf, setRaceCardOf] = useState<number | null>(null);
  const raceCard = useMemo((): DriverCardData | null => {
    const d = raceCardOf === null ? undefined : drivers.find(x => x.id === raceCardOf);
    if (!d) return null;
    const sealed = !!sealedDriverIds?.has(d.id);
    return {
      id: d.id, name: d.name, number: d.number, teamName: d.teamName ?? '', color: d.color, ink: d.ink,
      portrait: avatars?.get(d.id)?.portrait, backstory: d.backstory, quirk: d.quirk,
      cards: d.cards ?? [], sealed,
      readings: sealed ? undefined : DRIVER_CARD_STATS.map(s => readStat(s, d.stats[s as keyof typeof d.stats] as number, [])),
    };
  }, [raceCardOf, drivers, sealedDriverIds, avatars]);

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
    // On a phone the panel is a bottom sheet: one driver at a time.
    const phone = typeof matchMedia !== 'undefined' && matchMedia('(max-width: 599px)').matches;
    setFocusedDriverIds(prev => {
      if (phone) return prev.has(driverId) ? new Set() : new Set([driverId]);
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

  // (Swipe-to-switch-view was removed: it conflicted with horizontal scrolling
  // in the timing tables. View changes happen via the nav panel only.)

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
      // The caller by step (#749): The PA, {State} Radio, The Network.
      step,
      stateName: state?.name,
      voice: feedVoice,
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
      if (!isOutOfRace(d) && d.currentLap > lap) lap = d.currentLap;
    }
    return Math.min(Math.max(lap, 1), totalLaps);
  };

  // The feed context for lines the notifications don't carry (#762: lights out, the title).
  const feedCtx = () => ({ lap: leaderLapForFeed(), totalLaps, trackName: trackInfo?.name ?? '', trackEmoji: trackInfo?.funEmoji ?? '', step, stateName: state?.name, voice: feedVoice });

  // Lights out (#762): a Season race has no countdown, so the caller says it as the first tick lands.
  // Only when the race is seen from tick 0 (a mid-race join is history, not news).
  const lightsOutRef = useRef<'armed' | 'done' | 'late'>(raceState.totalTicks === 0 ? 'armed' : 'late');
  useEffect(() => {
    if (lightsOutRef.current !== 'armed' || raceState.totalTicks === 0) return;
    lightsOutRef.current = 'done';
    if (!lightsOut) return;
    const caller = callerFor(step);
    const meta = callerMeta(caller, state?.name);
    pushFeedItem({ lap: 1, persona: caller, personaName: meta.name, personaEmoji: meta.emoji, text: lightsOutLine(feedCtx(), raceState.totalTicks + drivers.length), emphasis: 'big' });
    if (config.lapCuts?.length) interval('lightsOutNationals');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raceState.totalTicks]);

  // Get track path and pit lane path from layout
  const trackPath = trackInfo?.layout?.trackPath || DEFAULT_TRACK_PATH;
  const pitLanePath = trackInfo?.layout?.pitLanePath;
  // The venue, drawn (#778): by the track's kind; the lab's default loop has none.
  const scene = useMemo(() => sceneForTrackId(trackInfo?.id), [trackInfo?.id]);
  const sceneCtx: SceneCtx = { stateName: state?.name, title: titleName, venueName: trackInfo?.name, kind: trackKind, raceLine: program };

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

    // Past track events, unsafety car deployments, effects, in-race effects
    for (const e of raceEvents ?? []) {
      if (e.type === 'track_event' && e.tick > lastTrackEventTickRef.current) {
        lastTrackEventTickRef.current = e.tick;
      }
      if ((e.type === 'unsafety_car_deployed' || e.type === 'unsafety_car_recalled') &&
          e.tick > lastUnsafetyCarTickRef.current) {
        lastUnsafetyCarTickRef.current = e.tick;
      }
      if ((e.type === 'track_event_effect' || e.type === 'driver_error') && e.driverId >= 0) {
        seenTrackEffectsRef.current.add(`${e.tick}-${e.driverId}`);
      }
      if (e.type === 'effect_applied') {
        seenEffectsRef.current.add(`${e.tick}-${e.driverId}-${e.description}`);
      }
      if ((e.type === 'cut' || e.type === 'eliminated' || e.type === 'weather' || e.type === 'crash') && e.tick > lastCutTickRef.current) lastCutTickRef.current = e.tick;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drivers, raceState.totalTicks]);

  // The Hundred's cuts (#694) and the sky (#762): the engine logs them; the banner and the feed pick them up.
  const lastCutTickRef = useRef<number>(-1);
  // The title, clinched at the flag (#778): the finish sheet's sash wears it.
  const [wonTitle, setWonTitle] = useState<string | null>(null);
  // The Interval (#751): rolled once at lights out on the race's own stream; fires at most once, after a big moment in the second half.
  const intervalRef = useRef<IntervalState | null>(null);
  const interval = (moment: IntervalMoment, vars: { driver?: string } = {}) => {
    const seed = engine.getSeed() ?? 0;
    if (!intervalRef.current) intervalRef.current = intervalStart(seed, { step, last: lastRaceOfStep, hundred: !!config.lapCuts?.length });
    const next = intervalNext(intervalRef.current, seed, moment, { lap: leaderLapForFeed(), totalLaps, state: state?.name, track: trackInfo?.name, ...vars });
    intervalRef.current = next.state;
    if (next.item) pushFeedItem(next.item);
  };
  // The cut banner across the map (#778): the last cut, for a few seconds; red when it took one of yours.
  const [cutBanner, setCutBanner] = useState<{ head: string; body: string; out: boolean } | null>(null);
  const cutTimerRef = useRef<number | null>(null);
  const showCut = (b: { head: string; body: string; out: boolean }) => {
    setCutBanner(prev => (prev?.out && !b.out ? prev : b));
    if (cutTimerRef.current) window.clearTimeout(cutTimerRef.current);
    cutTimerRef.current = window.setTimeout(() => setCutBanner(null), 9000);
  };
  useEffect(() => () => { if (cutTimerRef.current) window.clearTimeout(cutTimerRef.current); }, []);
  useEffect(() => {
    if (!raceEvents || raceEvents.length === 0) return;
    const fresh = raceEvents.filter(e => (e.type === 'cut' || e.type === 'eliminated' || e.type === 'weather' || e.type === 'crash') && e.tick > lastCutTickRef.current);
    if (!fresh.length) return;
    lastCutTickRef.current = Math.max(...fresh.map(e => e.tick));
    // A pileup everyone walks from (#751): two or more cars in one crash, none retired.
    const byTick = new Map<number, Set<number>>();
    for (const e of fresh) { const id = e.driverId; if (e.type === 'crash' && typeof id === 'number') { if (!byTick.has(e.tick)) byTick.set(e.tick, new Set()); byTick.get(e.tick)!.add(id); } }
    for (const ids of byTick.values()) if (ids.size >= 2 && [...ids].every(id => { const d = drivers.find(x => x.id === id); return !!d && !isOutOfRace(d); })) interval('pileup');
    for (const e of fresh) {
      if (e.type === 'cut') {
        const [head, body] = e.description.split(':').map(s => s.trim());
        addNotification('milestone', head.toUpperCase(), body ?? '', 'race.final_lap', undefined, 12000);
        showCut({ head, body: body ?? '', out: false });
      } else if (e.type === 'eliminated' && mineSet?.has(e.driverId)) {
        const d = drivers.find(x => x.id === e.driverId);
        addNotification('info', 'OUT', `${d?.name ?? e.driverName} is out: ${e.description.toLowerCase()}`, 'race.final_lap', d ? [{ id: d.id, name: d.name, emoji: d.emoji }] : undefined, 12000, d?.color);
        showCut({ head: `${d?.name ?? e.driverName} is out`, body: e.description, out: true });
      } else if (e.type === 'weather') {
        addNotification('weather', 'RAIN', e.description, e.emoji, undefined, 12000);
        interval('rain');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raceEvents]);

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
        const driverNames = newlyCrashed.map(d => d.name).join(', ');

        addNotification(
          'crash',
          isPileup ? 'PILEUP!' : 'CRASH!',
          driverNames,
          'race.crash',
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
          `${driver.name} - tire failure!`,
          'race.tire_failure',
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
          `${driver.name} - engine failure!`,
          'race.mechanical',
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
          'race.pit_stop',
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
          'race.pit_stop',
          [{ id: driver.id, name: driver.name, emoji: driver.emoji }],
          12000,
          driver.color
        );
        interval('quickStop', { driver: driver.name });
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
        'race.safety_car',
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

    // Find track_event_effect / driver_error events for individual drivers
    // (driver mistakes — #82 — ride the same status-icon path)
    const newEffects = raceEvents.filter(e => {
      if (e.type !== 'track_event_effect' && e.type !== 'driver_error') return false;
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
        emoji: e.type === 'driver_error' ? 'race.spin' : e.emoji || 'race.card_trigger',
        expiresAtTick: raceState.totalTicks + 500,
      }));
      setStatusEffects(prev => [...prev, ...statusToAdd]);

      // Driver mistakes get a feed card too — every spin is a story
      for (const e of newEffects) {
        if (e.type !== 'driver_error') continue;
        const colonIndex = e.description.indexOf(':');
        const title = colonIndex > 0 ? e.description.substring(0, colonIndex).trim().toUpperCase() : 'MISTAKE';
        const body = colonIndex > 0 ? e.description.substring(colonIndex + 1).trim() : e.description;
        addNotification('track_event', title, body, e.emoji, undefined, 9000);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raceEvents, trackInfo, raceState.totalTicks]);

  // Detect in-race effects landing (damage, a spin, cooked tyres, a stop's mood) and show notifications
  useEffect(() => {
    if (!raceEvents || raceEvents.length === 0) return;

    // Find effect_applied events we haven't shown yet
    const applied = raceEvents.filter(e => {
      if (e.type !== 'effect_applied') return false;
      const key = `${e.tick}-${e.driverId}-${e.description}`;
      if (seenEffectsRef.current.has(key)) return false;
      return true;
    });

    for (const event of applied) {
      const key = `${event.tick}-${event.driverId}-${event.description}`;
      seenEffectsRef.current.add(key);

      // Find the driver to get their name
      const driver = drivers.find(d => d.id === event.driverId);
      const driverName = driver ? driver.name : 'Unknown Driver';

      addNotification(
        'effect_applied',
        driverName,
        event.description,
        event.emoji || 'race.card_trigger',
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
      seenEffectsRef.current.clear();
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
      const aDNF = isOutOfRace(a);
      const bDNF = isOutOfRace(b);

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
          `${leader.name} takes the lead!`,
          'race.lead_change',
          [{ id: leader.id, name: leader.name, emoji: leader.emoji }],
          12000,
          leader.color
        );
        if (leaderLap >= totalLaps - 1) interval('lastLapLead', { driver: leader.name });
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
        `${leader.name} leads at the halfway point`,
        'race.halfway'
      );
    }

    // Last lap notification
    if (!lastLapTriggeredRef.current && leaderLap >= totalLaps - 1 && totalLaps > 1) {
      lastLapTriggeredRef.current = true;
      addNotification(
        'milestone',
        'FINAL LAP',
        'White flag! Last lap of the race',
        'race.final_lap'
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
            `${fastest.driver.name} sets the pace!`,
            'race.fastest_lap',
            [{ id: fastest.driver.id, name: fastest.driver.name, emoji: fastest.driver.emoji }],
            12000,
            fastest.driver.color
          );
          interval('fastestLap', { driver: fastest.driver.name });
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
          `${winner.name} wins the race!`,
          'race.finish',
          [{ id: winner.id, name: winner.name, emoji: winner.emoji }],
          20000, // Keep winner notification longer
          winner.color
        );
        // The step's title, clinched (#762): the caller's big line after the flag.
        if (titleWon) {
          let best: { id: number; t: number } | null = null;
          for (const d of drivers) for (const t of d.lapTimes) if (!best || t < best.t) best = { id: d.id, t };
          const digest = { finishOrder: raceState.finishOrder, dnfDriverIds: drivers.filter(d => d.status === 'dnf').map(d => d.id), fastestLapDriverId: best?.id ?? null };
          if (titleWon(digest)) { pushFeedItem(voiceTitle(feedCtx(), raceState.totalTicks)); setWonTitle(titleName ?? null); interval('title'); }
        }
        if (lastRaceOfStep) interval('lastRace');
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

  // Real-time sorted drivers (for track position badges - need current positions)
  const realtimeSortedDrivers = [...drivers].sort((a, b) => {
    const aFinished = a.status === 'finished';
    const bFinished = b.status === 'finished';
    const aDNF = isOutOfRace(a);
    const bDNF = isOutOfRace(b);

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
  const followId = scope === 'follow' ? ([...focusedDriverIds][0] ?? myDriverIds?.[0] ?? sortedDrivers[0]?.id) : undefined;
  const followName = followId !== undefined ? driverSurname(drivers.find(d => d.id === followId)?.name ?? '') : undefined;

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
  // per-driver effect stacks for the tower's chips. WatchMode always
  // renders the app singleton's race, so reading it directly is sound; both
  // refresh on every drivers-notify render.
  const engine = RaceEngine.getInstance();
  const headerConditions = useMemo(() => {
    const chips: { emoji: string; label: string }[] = [];
    const weather = engine.getWeather();
    if (weather && !isNeutralWeather(weather)) chips.push({ emoji: weather.emoji, label: weather.name });
    return chips;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, trackInfo]);
  // This race's priority stats (#361): the track's favours plus the weather's.
  const headerPriority = useMemo(() => {
    const deck = trackInfo?.id ? getDeckTrackById(trackInfo.id) : undefined;
    // In levels (#666): "+2 Speed · +3 Power" (track and weather summed per stat).
    return favourParts([...(deck?.favours ?? []), ...(engine.getWeather()?.favours ?? [])]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, trackInfo]);
  // The race debrief (#581): read once the flag drops, from the race record.
  const finishDebrief = useMemo(() => {
    if (!raceState.raceFinished) return undefined;
    const input = { drivers, samples: engine.getLapHistory(), events: engine.getFullEvents(), grid: engine.getGridOrder(), finishOrder: raceState.finishOrder };
    return { mine: driverDebrief(input, myDriverIds ?? []), winner: winnerEdge(input) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raceState.raceFinished, engine, myDriverIds, drivers]);
  // One report builder for the lap-chart copy button and the Race Complete
  // bar: the balance-pass handoff (#245).
  const buildReport = () => {
    const weather = engine.getWeather();
    const conditions = [
      ...(weather && !isNeutralWeather(weather) ? [`${weather.emoji} ${weather.name}${weather.intensity < 1 ? ` (${Math.round(weather.intensity * 100)}%)` : ''}`] : []),
      ...(trackInfo?.favours?.length ? [`${trackInfo.name}: ${favourText(trackInfo.favours)}`] : []),
    ];
    const teamIds = Array.from(new Set(drivers.map(d => d.kingdomId).filter((k): k is string => !!k)));
    return buildRaceReportMd(
      {
        title: raceState.raceFinished
          ? `${trackInfo?.funEmoji ?? ''} ${trackInfo?.name ?? 'Race'}`
          : `${trackInfo?.funEmoji ?? ''} ${trackInfo?.name ?? 'Race'} (live, lap ${currentLapForHeader}/${totalLaps})`,
        totalLaps,
        conditions,
        totalTicks: raceState.raceFinished ? raceState.totalTicks : undefined,
        finishOrder: raceState.raceFinished ? raceState.finishOrder : undefined,
      },
      drivers,
      engine.getLapHistory(),
      {
        seed: engine.getSeed(),
        trackId: trackInfo?.id,
        teamIds,
        engineVersion: appVersion,
        ruleset: rulesLines ?? ['default'],
        events: engine.getFullEvents(),
      }
    );
  };

  // Per-driver history for the focus row: every notable thing that happened
  // to a car, grouped by kind with the laps it happened on (#243).
  const historiesMap = useMemo(() => {
    const map = new Map<number, Map<string, DriverHistoryEntry>>();
    const kindOf = (t: RaceEvent['type']): DriverHistoryEntry['kind'] | null => {
      switch (t) {
        case 'effect_applied': return 'effect';
        case 'track_event_effect': return 'event';
        case 'driver_error': return 'error';
        case 'slow_pit_stop': case 'quick_pit_stop': return 'pit';
        case 'crash': case 'dnf': case 'mechanical_failure': case 'tire_failure': return 'crash';
        case 'overtake': return 'pass';
        case 'penalty': return 'penalty';
        default: return null;
      }
    };
    for (const e of engine.getFullEvents()) {
      const kind = kindOf(e.type);
      if (!kind || e.driverId < 0) continue;
      // Name = the part before ':' for effects/errors ("Damaged: limps on…" → "Damaged")
      let name = e.description;
      if (kind === 'effect' || kind === 'error') name = e.description.split(':')[0].trim();
      else if (kind === 'pit') name = e.type === 'slow_pit_stop' ? 'Slow stop' : 'Quick stop';
      else if (kind === 'crash') name = e.type === 'dnf' ? 'Retired' : e.type === 'crash' ? 'Crash' : e.type === 'mechanical_failure' ? 'Mechanical failure' : 'Tyre failure';
      else if (kind === 'pass') name = /passes/.test(e.description) ? 'Passes' : 'Gains places';
      else if (kind === 'penalty') name = 'Penalty';
      else name = e.description.replace(/[!.]+$/, '').slice(0, 40);
      const key = `${kind}:${name}`;
      let per = map.get(e.driverId);
      if (!per) { per = new Map(); map.set(e.driverId, per); }
      let entry = per.get(key);
      if (!entry) { entry = { key, emoji: e.emoji, name, laps: [], kind }; per.set(key, entry); }
      if (e.lap !== undefined && !entry.laps.includes(e.lap)) entry.laps.push(e.lap);
    }
    // Safety car periods are field-wide: every driver's history gets them,
    // from the lap history's sc flags (the deploy event carries no lap).
    const scLaps: number[] = [];
    for (const smp of engine.getLapHistory()) if (smp.sc && !scLaps.includes(smp.lap)) scLaps.push(smp.lap);
    const out = new Map<number, DriverHistoryEntry[]>();
    for (const d of drivers) {
      const per = map.get(d.id);
      const list = per ? Array.from(per.values()) : [];
      if (scLaps.length) list.push({ key: 'sc', emoji: 'race.safety_car', name: 'Safety car', laps: scLaps, kind: 'event' });
      if (list.length) out.set(d.id, list);
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drivers, engine]);
  // Starting grid (set by qualifying on tick 1); cheap, read each render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const gridOrder = useMemo(() => engine.getGridOrder(), [drivers, engine]);
  // The Hundred (#694): while a cut is still to fall, the tower windows on the leaders, your cars and the next line.
  const nextCut = useMemo(() => {
    if (!config.lapCuts?.length) return undefined;
    const lap = Math.max(0, ...drivers.filter(d => !isOutOfRace(d)).map(d => d.currentLap));
    const cut = [...config.lapCuts].sort((a, b) => a.afterLap - b.afterLap).find(c => c.afterLap > lap);
    return cut ? { keep: cut.keep } : undefined;
  }, [config.lapCuts, drivers]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const battles = useMemo(() => engine.getBattles().filter(b => b.ticks >= 20), [drivers, engine]);
  const effectStacksMap = useMemo(() => {
    const map = new Map<number, EffectStackEntry[]>();
    for (const d of drivers) map.set(d.id, engine.getEffectStack(d.id));
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drivers, engine]);

  // === Lap-chart history (the position trace, #208) ===
  // The engine records a snapshot per leader-lap inside tick(), so the history
  // is complete from lap 1 — including the laps that ran before you joined a
  // live broadcast (fast-forward ticks through them) and headless settles.
  // We just mirror its length to a state so the chart recomputes once per lap.
  const [historyLen, setHistoryLen] = useState(0);
  const [reportCopied, setReportCopied] = useState(false);
  useEffect(() => {
    const len = engine.getLapHistory().length;
    if (len !== historyLen) setHistoryLen(len);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raceState.totalTicks]);

  const lapChart = useMemo(
    () => buildLapChartData(engine.getLapHistory(), drivers),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [historyLen, drivers]
  );

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
  const qualifying = !!onQualifyingDone && raceState.totalTicks === 0;
  // The engine's own qualifying laps, read once per session (display only).
  // The car on its hot lap, for the track map (#555): only that marble runs, at its lap's pace.
  const [qualiLive, setQualiLive] = useState<QualiLive[]>([]);
  const qualiLaps = useMemo(() => (qualifying ? engine.qualifyingLaps() : []), [qualifying, drivers.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const getSessionState = (): SessionState => {
    if (qualifying) return 'qualifying';
    if (raceState.raceFinished) return 'finished';
    if (raceState.unsafetyCarActive) return 'safety-car';
    // Check if leader is on final lap
    const leaderLap = frozenSortedDrivers[0]?.currentLap || 0;
    if (leaderLap >= totalLaps - 1) return 'final-lap';
    return 'racing';
  };

  // Calculate current lap (leader's lap)
  const currentLapForHeader = Math.min(totalLaps, Math.max(1, (frozenSortedDrivers[0]?.currentLap || 0) + 1));

  return (
    <StepTheme step={step} state={state} className="watch-mode ace-race">
      {/* Universal Header - new navigation system */}
      <UniversalHeader
        currentLap={currentLapForHeader}
        totalLaps={totalLaps}
        sessionState={getSessionState()}
        trackName={trackInfo?.name || 'Grand Prix'}
        trackKind={trackKind}
        conditions={headerConditions}
        priority={headerPriority}
        tyreWear={trackInfo?.id ? getDeckTrackById(trackInfo.id)?.tyreWear : undefined}
        elapsedTime={raceState.totalTicks}
        program={program}
        activeView={activeView}
        onViewChange={setActiveView}
        scope={scope}
        onScopeChange={setScope}
        followName={followName}
        hasMine={!!myDriverIds?.length}
        onExit={onExit}
        exitLabel={exitLabel ?? (spectator ? 'League' : 'Menu')}
        onSkip={spectator || qualifying ? undefined : onSkip}
        liveBadge={spectator && !raceState.raceFinished}
        // Race controls (a live broadcast offers none)
        isRunning={isRunning}
        raceFinished={raceState.raceFinished}
        raceSpeed={raceSpeed}
        onStart={spectator || qualifying ? undefined : onStart}
        onStop={spectator || qualifying ? undefined : onStop}
        onReset={spectator || qualifying ? undefined : onReset}
        onSpeedChange={spectator || qualifying ? undefined : onSpeedChange}
      />

      {/* Main content: a 16:9 broadcast frame that scales to fit the viewport
          (desktop/landscape). On portrait phones it falls back to the stacked
          vertical layout. */}
      <div className={`watch-content view-${activeView}`}>
        {raceCard && <DriverCard data={raceCard} onClose={() => setRaceCardOf(null)} />}
        {raceState.raceFinished && sortedFinished.length >= 1 && (
          <FinishSheet
            teamLabel={n => teamLabels?.[n] ?? n}
            podium={sortedFinished}
            drivers={drivers}
            mine={myDriverIds}
            trackName={trackInfo?.name}
            dnfCount={drivers.filter(d => d.status === 'dnf').length}
            fastestLap={(() => {
              let best: { driver: Driver; ticks: number } | null = null;
              for (const d of drivers) for (const t of d.lapTimes) if (!best || t < best.ticks) best = { driver: d, ticks: t };
              return best;
            })()}
            seed={engine.getSeed()}
            buildReport={buildReport}
            debrief={finishDebrief}
            wonTitle={wonTitle ?? undefined}
            onNextRace={onNextRace}
            onExit={onExit}
            exitLabel={exitLabel ?? (spectator ? 'Back to League' : 'Menu')}
          />
        )}
        <div className={`broadcast-frame frame-${activeView}`}>
          {/* TRACK VIEW: track map fills the frame, timing tower floats left */}
          {activeView === 'track' && (
            <>
              <section className="bf-tower bf-tower-floating">
                {focusedDriverIds.size > 0 && (
                  <button className="clear-focus-btn" onClick={clearFocus}>
                    Clear Focus ({focusedDriverIds.size})
                  </button>
                )}
                {qualifying ? <QualiBoard laps={qualiLaps} drivers={drivers} nominalTicks={engine.nominalLapTicks()} mine={mineSet} onDone={onQualifyingDone!} onLap={setQualiLive} follow={follow} /> : (
                <TimingTower
                  window={nextCut}
                  sealed={sealedDriverIds}
                  mine={mineSet}
                  nemesis={nemesisSet}
                  avatars={avatars}
                  drivers={sortedDrivers}
                  columns={TRACK_COLUMNS}
                  raceState={raceState}
                  totalLaps={totalLaps}
                  lapLength={trackLength}
                  focusedDriverIds={focusedDriverIds}
                  onDriverClick={toggleDriverFocus}
                  onDriverCard={setRaceCardOf}
                  condensed={false}
                  statusEffects={statusEffectsMap}
                  effectStacks={effectStacksMap}
                  histories={historiesMap}
                  positionDeltas={positionDeltasForTower}
                  gridOrder={gridOrder}
                  battles={battles}
                  fastestLapOverall={fastestLapOverall ?? undefined}
                  title={myTitle}
                  teamLabels={teamLabels}
                  className="timing-tower-track"
                />
                )}
              </section>

              <section className="bf-map">
                {cutBanner && !qualifying && (
                  <div className={`cut-banner ${cutBanner.out ? 'out' : ''}`} role="status"><b>{cutBanner.head}</b>{cutBanner.body && <span>{cutBanner.body}</span>}</div>
                )}
                <TrackMap
                  trackPath={trackPath}
                  pitLanePath={pitLanePath}
                  trackLength={trackLength}
                  drivers={qualifying
                    ? qualiLive.flatMap(q => drivers.filter(d => d.id === q.id).map(d => ({ ...d, status: 'racing' as const, position: q.progress * trackLength })))
                    : drivers}
                  focusedDriverIds={qualifying ? qualiLive.map(q => q.id) : Array.from(focusedDriverIds)}
                  highlightedDriverIds={podiumIds}
                  mineDriverIds={myDriverIds as number[] | undefined}
                  unsafetyCarActive={raceState.unsafetyCarActive}
                  unsafetyCarPosition={raceState.unsafetyCarPosition}
                  battles={battles}
                  scene={scene}
                  sceneCtx={sceneCtx}
                  scope={scope}
                  followId={followId}
                />
                {!qualifying && (
                  <div className="bf-map-strips">
                    <TrackStrip drivers={drivers} totalLaps={totalLaps} lapLength={trackLength} mode="race" label="Race" focusedDriverIds={focusedDriverIds} />
                    <TrackStrip drivers={drivers} totalLaps={totalLaps} lapLength={trackLength} mode="lap" label="Lap" focusedDriverIds={focusedDriverIds} />
                  </div>
                )}
              </section>

              {/* The feed beside the map on a big screen (#716); stacked under it on a phone. */}
              <section className="bf-feed">
                <RaceFeed items={feedItems} className="story-feed-detail" />
              </section>
            </>
          )}

          {/* DETAIL VIEW: F1 data screen — table left, feed right, conditions +
              track strip across the bottom. Panels scroll internally; the
              frame itself does not. */}
          {activeView === 'detail' && (
            <>
              <section className="bf-table">
                {focusedDriverIds.size > 0 && (
                  <button className="clear-focus-btn" onClick={clearFocus}>
                    Clear Focus ({focusedDriverIds.size})
                  </button>
                )}
                {qualifying ? <QualiBoard laps={qualiLaps} drivers={drivers} nominalTicks={engine.nominalLapTicks()} mine={mineSet} onDone={onQualifyingDone!} onLap={setQualiLive} follow={follow} /> : (
                <TimingTower
                  window={nextCut}
                  sealed={sealedDriverIds}
                  mine={mineSet}
                  nemesis={nemesisSet}
                  avatars={avatars}
                  drivers={sortedDrivers}
                  columns={DETAIL_COLUMNS}
                  raceState={raceState}
                  totalLaps={totalLaps}
                  lapLength={trackLength}
                  focusedDriverIds={focusedDriverIds}
                  onDriverClick={toggleDriverFocus}
                  onDriverCard={setRaceCardOf}
                  condensed={false}
                  expandable={true}
                  statusEffects={statusEffectsMap}
                  effectStacks={effectStacksMap}
                  histories={historiesMap}
                  positionDeltas={positionDeltasForTower}
                  gridOrder={gridOrder}
                  battles={battles}
                  fastestLapOverall={fastestLapOverall ?? undefined}
                  title={myTitle}
                  teamLabels={teamLabels}
                  className="timing-tower-detail"
                />
                )}
              </section>

              <section className="bf-feed">
                <RaceFeed items={feedItems} className="story-feed-detail" />
              </section>

              <section className="bf-footer">
                <ConditionsPanel weather={engine.getWeather()} trackFavours={trackInfo?.favours ?? []} />
                <div className="bf-strips">
                  <TrackStrip
                    drivers={drivers}
                    totalLaps={totalLaps}
                    lapLength={trackLength}
                    mode="race"
                    label="Race"
                    focusedDriverIds={focusedDriverIds}
                  />
                  <TrackStrip
                    drivers={drivers}
                    totalLaps={totalLaps}
                    lapLength={trackLength}
                    mode="lap"
                    label="Lap"
                    focusedDriverIds={focusedDriverIds}
                  />
                </div>
              </section>
            </>
          )}

          {/* LAP VIEW: the lap chart, featured full-frame (the F1 lap chart). */}
          {activeView === 'lap' && (
            <section className="bf-lapchart">
              <div className="bf-lapchart-head">
                <span className="bf-lapchart-title"><GameIcon name="view.lapchart" size={14} /> Race Lap Chart</span>
                <span className="bf-lapchart-actions">
                  <button
                    className="bf-copy-report-btn"
                    onClick={async () => {
                      const md = buildReport();
                      try {
                        await navigator.clipboard.writeText(md);
                      } catch {
                        const ta = document.createElement('textarea');
                        ta.value = md;
                        document.body.appendChild(ta);
                        ta.select();
                        document.execCommand('copy');
                        document.body.removeChild(ta);
                      }
                      setReportCopied(true);
                      setTimeout(() => setReportCopied(false), 2000);
                    }}
                  >
                    {reportCopied ? <><GameIcon name="ui.done" size={12} /> Copied</> : <><GameIcon name="ui.copy" size={12} /> Copy report</>}
                  </button>
                  <span className="bf-lapchart-lap">Lap {currentLapForHeader} / {totalLaps}</span>
                </span>
              </div>
              <div className="bf-lapchart-body">
                <LapChart
                  series={lapChart.series}
                  laps={lapChart.laps}
                  totalLaps={totalLaps}
                  fieldSize={drivers.length}
                  scSampleIdx={lapChart.scSampleIdx}
                  focusedDriverIds={focusedDriverIds}
                  onDriverClick={toggleDriverFocus}
                />
              </div>
            </section>
          )}
        </div>
      </div>

    </StepTheme>
  );
}

export default WatchMode;
