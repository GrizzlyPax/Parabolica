// Commissioner Mode league runtime — core types.
// Pure data; no React, no DOM. See docs/COMMISSIONER_MODE_TECH.md (Problem 4).
//
// The design's load-bearing property: a league is fully determined by
// (leagueSeed, setup, interventionLog). Everything else here is derived
// cache that can be deleted and recomputed from those inputs.

import type { FantasyConfig } from '../fantasy/types';
import type { LapCut } from '../RaceEngine';
import { RosterDriver, RaceEvent } from '../RaceEngine';
import { SeasonState } from '../types/season';
import { Team } from '../data/teams';
import type { Ruleset } from '../rules/ruleset';

/** Choices made at league founding. Immutable for the life of the run. */
export interface LeagueSetupConfig {
  name: string;
  /** Patron god id. Placeholder string until gods land (build plan PR 5). */
  godId: string;
  /** Registry teams (preset + historic) on the grid, by id. */
  teamIds: string[];
  /** Player-created teams on the grid — full definitions, since they aren't in
   * the static registry. Appended after teamIds in grid order. Their identity
   * is baked into the generated roster, so they survive persistence/replay. */
  customTeams?: Team[];
  /** Calendar in running order (one entry per race). */
  trackIds: string[];
  /** Wall-clock ms between race starts (e.g. 3h = 10_800_000). */
  raceIntervalMs: number;
  /** Fantasy teams drafted at founding (src/fantasy). Facts: they travel with a published league. */
  fantasy?: FantasyConfig;
  /** The rules this run plays under (#241). Absent = defaults (pre-ruleset saves). */
  ruleset?: Ruleset;
  /** Pre-#334 flag: genesis dealt trait cards instead of tags. Every league is
   * on cards now; kept so old setups still parse. */
  cards?: boolean;
  /** Epoch ms of league founding; race i is scheduled at createdAt + i*interval
   * (the inaugural race airs at founding). A race that outlasts the interval
   * pushes its successor back — broadcasts queue, never overlap. */
  createdAt: number;
}

/** One race on the wall-clock calendar. Seeds are fixed at founding. */
export interface ScheduledRace {
  index: number;
  trackId: string;
  scheduledAt: number; // epoch ms
  seed: number;
  /** Lap cuts inside this race (#694, the Hundred); absent = a plain race. */
  lapCuts?: LapCut[];
  /** A fixed grid (driver ids, P1 first): no qualifying. */
  gridOrder?: number[];
}

/**
 * Commissioner decrees, append-only: the one input besides the seed and the
 * setup that the server holds and every device replays. The only decree so
 * far was `attach-tag`; tags retired in #334, so a decree changes nothing
 * today and old published leagues' logs still parse. atRaceIndex is the
 * first race affected when decrees return.
 */
export interface Intervention {
  type: string;
  atRaceIndex: number;
  targetDriverId?: number;
  committedAt?: number;
  /** Legacy attach-tag payload (pre-#334). */
  tagId?: string;
}

/** What a settled race leaves behind for feeds, gods, and the chronicle. */
export interface RaceDigest {
  index: number;
  trackId: string;
  trackName: string;
  trackEmoji: string;
  finishOrder: number[];
  dnfDriverIds: number[];
  /** Cars a lap cut took (#694), kept apart from the DNFs; absent on a race without cuts. */
  eliminatedDriverIds?: number[];
  /** The lap after which each cut car went (#694). */
  eliminatedAt?: Record<number, number>;
  fastestLapDriverId: number | null;
  totalTicks: number;
  /** This race's weather (C2). Optional on digests written before the weather
   * layer; 'clear' races may also omit it. */
  weather?: { id: string; name: string; emoji: string };
  /** When the broadcast actually aired (queue-aware; epoch ms). Optional on
   * digests written before live broadcasts existed. */
  startedAt?: number;
  endedAt?: number;
  /** Starting grid (driver ids, P1 first). Rules like The Charger read it. */
  gridOrder?: number[];
  /** Survived a crash and kept going. */
  damagedDriverIds?: number[];
  /** Who crashed with whom (for rivalry memory, #233). */
  crashPairs?: [number, number][];
  /** Top-magnitude events, always retained (gods and chronicles eat these). */
  highlights: RaceEvent[];
  /** Full event log; only retained for the most recent races (see settle). */
  events?: RaceEvent[];
}

/** A race currently on the air: its window contains `now`. */
export interface LiveRace {
  index: number;
  trackId: string;
  /** When the broadcast began (queue-aware). */
  startedAt: number;
  /** When it will end — deterministic, so the future is already known. */
  endsAt: number;
}

/** The whole league: canonical inputs + derived cache. */
export interface LeagueState {
  /** npm version that created this league (replay-compat stamp). */
  engineVersion: string;
  leagueSeed: number;
  setup: LeagueSetupConfig;
  schedule: ScheduledRace[];
  interventionLog: Intervention[];
  /** Index of the last settled race; -1 before any race has run. */
  settledThrough: number;
  /** Its copy on the league server, if published (src/league/remote.ts). */
  remote?: { code: string; commissionerKey?: string; version: number };
  // --- Derived cache (recomputable from the inputs above) ---
  /** Genesis grid, derived from leagueSeed. Cached so resume is instant. */
  roster: RosterDriver[];
  /** Standings/stat accumulation, reusing the season machinery. */
  season: SeasonState;
  digests: RaceDigest[];
}

export interface SettleResult {
  league: LeagueState;
  /** Digests for races settled by this call, oldest first. */
  newlySettled: RaceDigest[];
  /** The race on the air right now, if `now` fell inside its window. */
  live?: LiveRace;
}
