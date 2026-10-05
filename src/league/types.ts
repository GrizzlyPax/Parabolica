// Commissioner Mode league runtime — core types.
// Pure data; no React, no DOM. See docs/COMMISSIONER_MODE_TECH.md (Problem 4).
//
// The design's load-bearing property: a league is fully determined by
// (leagueSeed, setup, interventionLog). Everything else here is derived
// cache that can be deleted and recomputed from those inputs.

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
  /** The rules this run plays under (#241). Absent = defaults (pre-ruleset saves). */
  ruleset?: Ruleset;
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
}

/**
 * Commissioner actions, append-only. Interventions change the roster state a
 * race runs with — never its seed. atRaceIndex is the first race affected.
 */
export type Intervention = {
  type: 'attach-tag';
  atRaceIndex: number;
  targetDriverId: number;
  tagId: string;
  committedAt: number;
};

/** What a settled race leaves behind for feeds, gods, and the chronicle. */
export interface RaceDigest {
  index: number;
  trackId: string;
  trackName: string;
  trackEmoji: string;
  finishOrder: number[];
  dnfDriverIds: number[];
  fastestLapDriverId: number | null;
  totalTicks: number;
  /** This race's weather (C2). Optional on digests written before the weather
   * layer; 'clear' races may also omit it. */
  weather?: { id: string; name: string; emoji: string };
  /** When the broadcast actually aired (queue-aware; epoch ms). Optional on
   * digests written before live broadcasts existed. */
  startedAt?: number;
  endedAt?: number;
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
