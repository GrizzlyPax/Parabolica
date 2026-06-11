// Season persistence (COMMISSIONER_MODE_TECH.md, Problem 2 — and issue #43).
// A thin, versioned layer over localStorage. JSON.stringify silently destroys
// Maps (SeasonState.driverStats), so this module owns encode/decode and every
// persisted type round-trips through the codecs below.

import { SeasonState, DriverSeasonStats } from '../types/season';
import { RosterDriver } from '../RaceEngine';
import { SeasonRaceResult } from '../MarbleMode';

export const SCHEMA_VERSION = 1;
const SEASON_KEY = 'parabolica.season.v1';

/** Everything needed to put a mid-season player back where they left off. */
export interface SeasonSnapshot {
  seasonState: SeasonState;
  seasonKingdomIds: string[];
  /** Track ids in calendar order; rebuilt via getTracksByIds on resume. */
  seasonTrackIds: string[];
  currentSeasonTrackIndex: number;
  /** The exact grid loaded into the engine at season start. */
  roster: RosterDriver[];
  marble: {
    bankroll: number;
    seasonHistory: SeasonRaceResult[];
  };
  currentRaceNumber: number;
}

// Minimal Storage interface so tests can inject an in-memory store and the
// module degrades gracefully where localStorage doesn't exist.
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function defaultStore(): KeyValueStore | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    // Accessing localStorage can throw in some privacy modes
    return null;
  }
}

// === Codecs ===
// SeasonState.driverStats is a Map; JSON round-trips it as an entries array.

interface EncodedSeasonState extends Omit<SeasonState, 'driverStats'> {
  driverStats: [number, DriverSeasonStats][];
}

interface Envelope {
  schemaVersion: number;
  savedAt: number;
  data: Omit<SeasonSnapshot, 'seasonState'> & { seasonState: EncodedSeasonState };
}

function encodeSnapshot(snapshot: SeasonSnapshot, now: number): Envelope {
  return {
    schemaVersion: SCHEMA_VERSION,
    savedAt: now,
    data: {
      ...snapshot,
      seasonState: {
        ...snapshot.seasonState,
        driverStats: Array.from(snapshot.seasonState.driverStats.entries()),
      },
    },
  };
}

function decodeSnapshot(envelope: Envelope): SeasonSnapshot {
  return {
    ...envelope.data,
    seasonState: {
      ...envelope.data.seasonState,
      driverStats: new Map(envelope.data.seasonState.driverStats),
    },
  };
}

// === Public API ===

export function saveSeasonSnapshot(
  snapshot: SeasonSnapshot,
  store: KeyValueStore | null = defaultStore(),
  now: number = Date.now()
): boolean {
  if (!store) return false;
  try {
    store.setItem(SEASON_KEY, JSON.stringify(encodeSnapshot(snapshot, now)));
    return true;
  } catch {
    // Quota exceeded or storage unavailable — the season just isn't saved.
    return false;
  }
}

/**
 * Returns the saved season, or null if there is none, it doesn't parse, or it
 * was written by an incompatible schema (pre-1.0 policy: discard, don't
 * migrate — see COMMISSIONER_MODE_TECH.md).
 */
export function loadSeasonSnapshot(
  store: KeyValueStore | null = defaultStore()
): SeasonSnapshot | null {
  if (!store) return null;
  try {
    const raw = store.getItem(SEASON_KEY);
    if (!raw) return null;
    const envelope = JSON.parse(raw) as Envelope;
    if (envelope?.schemaVersion !== SCHEMA_VERSION) return null;
    const snapshot = decodeSnapshot(envelope);
    // Structural sanity: a snapshot that can't restore a grid is useless.
    if (!Array.isArray(snapshot.roster) || snapshot.roster.length === 0) return null;
    if (!(snapshot.seasonState.driverStats instanceof Map)) return null;
    return snapshot;
  } catch {
    return null;
  }
}

export function clearSeasonSnapshot(store: KeyValueStore | null = defaultStore()): void {
  try {
    store?.removeItem(SEASON_KEY);
  } catch {
    // Nothing useful to do if storage is unavailable.
  }
}

/** Lightweight summary for the main menu's Resume card. */
export interface SeasonSummary {
  currentRaceNumber: number;
  totalRaces: number;
  bankroll: number;
}

export function loadSeasonSummary(
  store: KeyValueStore | null = defaultStore()
): SeasonSummary | null {
  const snapshot = loadSeasonSnapshot(store);
  if (!snapshot || snapshot.seasonState.isComplete) return null;
  return {
    currentRaceNumber: snapshot.currentRaceNumber,
    totalRaces: snapshot.seasonState.totalRaces,
    bankroll: snapshot.marble.bankroll,
  };
}
