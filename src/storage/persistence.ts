// League persistence (COMMISSIONER_MODE_TECH.md, Problem 2).
// A thin, versioned layer over localStorage. JSON.stringify silently destroys
// Maps (SeasonState.driverStats), so this module owns encode/decode and every
// persisted type round-trips through the codecs below.

import { SeasonState, DriverSeasonStats } from '../types/season';
import { LeagueState } from '../league/types';

// v2 (#231): RosterDriver.tags[] replaced driverTag/carTag/teamTag; genesis draws
// weight by tier; tag rolls moved to a side stream. v1 saves are not migrated
// (archive-don't-migrate, pre-1.0).
export const SCHEMA_VERSION = 2;
const LEAGUE_KEY = 'parabolica.league.v1';

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

interface EncodedLeagueState extends Omit<LeagueState, 'season'> {
  season: EncodedSeasonState;
}

interface LeagueEnvelope {
  schemaVersion: number;
  savedAt: number;
  data: EncodedLeagueState;
}

// === Public API ===

export function saveLeagueState(
  league: LeagueState,
  store: KeyValueStore | null = defaultStore(),
  now: number = Date.now()
): boolean {
  if (!store) return false;
  try {
    const envelope: LeagueEnvelope = {
      schemaVersion: SCHEMA_VERSION,
      savedAt: now,
      data: {
        ...league,
        season: {
          ...league.season,
          driverStats: Array.from(league.season.driverStats.entries()),
        },
      },
    };
    store.setItem(LEAGUE_KEY, JSON.stringify(envelope));
    return true;
  } catch {
    // Quota exceeded or storage unavailable — the league just isn't saved.
    return false;
  }
}

/**
 * Returns the saved league, or null if there is none, it doesn't parse, or it
 * was written by an incompatible schema (pre-1.0 policy: discard, don't
 * migrate — see COMMISSIONER_MODE_TECH.md).
 */
export function loadLeagueState(
  store: KeyValueStore | null = defaultStore()
): LeagueState | null {
  if (!store) return null;
  try {
    const raw = store.getItem(LEAGUE_KEY);
    if (!raw) return null;
    const envelope = JSON.parse(raw) as LeagueEnvelope;
    if (envelope?.schemaVersion !== SCHEMA_VERSION) return null;
    const league: LeagueState = {
      ...envelope.data,
      season: {
        ...envelope.data.season,
        driverStats: new Map(envelope.data.season.driverStats),
      },
    };
    if (!Array.isArray(league.roster) || league.roster.length === 0) return null;
    if (!Array.isArray(league.schedule) || league.schedule.length === 0) return null;
    return league;
  } catch {
    return null;
  }
}

export function clearLeagueState(store: KeyValueStore | null = defaultStore()): void {
  try {
    store?.removeItem(LEAGUE_KEY);
  } catch {
    // Nothing useful to do if storage is unavailable.
  }
}
