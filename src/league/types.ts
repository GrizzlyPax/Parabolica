// Commissioner Mode league runtime — core types.
// Pure data; no React, no DOM. See docs/COMMISSIONER_MODE_TECH.md (Problem 4).
//
// The design's load-bearing property: a league is fully determined by
// (leagueSeed, setup, interventionLog). Everything else here is derived
// cache that can be deleted and recomputed from those inputs.

import { RosterDriver, RaceEvent } from '../RaceEngine';
import { SeasonState } from '../types/season';

/** Choices made at league founding. Immutable for the life of the run. */
export interface LeagueSetupConfig {
  name: string;
  /** Patron god id. Placeholder string until gods land (build plan PR 5). */
  godId: string;
  teamIds: string[];
  /** Calendar in running order (one entry per race). */
  trackIds: string[];
  /** Wall-clock ms between race starts (e.g. 3h = 10_800_000). */
  raceIntervalMs: number;
  /** Epoch ms of league founding; race i fires at createdAt + (i+1)*interval. */
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
  /** Top-magnitude events, always retained (gods and chronicles eat these). */
  highlights: RaceEvent[];
  /** Full event log; only retained for the most recent races (see settle). */
  events?: RaceEvent[];
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
}
