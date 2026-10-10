// Meta progression (#597, #589): what lasts between runs. Content and
// starting options, never raw power (Pax, Oct 9). A small versioned record:
// the unlocks held and every run played. It outlives engine versions: the
// envelope notes which version saved it, loading never reads that.
//
// Which run earns which unlock is Steward's (#596, stakes + unlocks);
// `unlocksEarned` is the hook and grants nothing yet.

import type { SeasonStore } from '../season/season';
import { runState, type RunFacts } from './run';
import { version as engineVersion } from '../../package.json';

export type UnlockId =
  | 'archetype-iridium'
  | 'silver-starting-trait'
  | 'horror-deck-league-3'
  | 'boss-win-start-perk'
  | 'next-difficulty';

export type UnlockKind = 'content' | 'start' | 'difficulty';

/** The first five (Roguelite Run Report, #589). Ids are stable; names and blurbs are not canon. */
export const UNLOCKS: Record<UnlockId, { name: string; kind: UnlockKind; blurb: string }> = {
  'archetype-iridium': { name: 'Archetype Iridium cards', kind: 'content', blurb: 'Iridium cards that lean into an archetype join the deck.' },
  'silver-starting-trait': { name: 'A Silver starting trait', kind: 'start', blurb: 'Start a run with one Silver trait on a driver.' },
  'horror-deck-league-3': { name: 'The Horror deck', kind: 'content', blurb: 'The Horror deck appears from the third league.' },
  'boss-win-start-perk': { name: 'Boss-win starting perk', kind: 'start', blurb: 'A starting option for beating a boss race.' },
  'next-difficulty': { name: 'The next difficulty setting', kind: 'difficulty', blurb: 'The next stake opens: Pressure, Tight purse, Works teams, Knockout.' },
};

export interface RunRecord {
  seed: number;
  /** Leagues won on the ladder, 0–LEAGUES_PER_RUN. */
  leaguesWon: number;
  won: boolean;
  endedAt: number;
  /** The engine that ran it. */
  engineVersion: string;
}

export interface MetaFacts {
  schemaVersion: number;
  unlocks: UnlockId[];
  runs: RunRecord[];
}

export const META_SCHEMA_VERSION = 1;
export const META_KEY = 'parabolica.meta.v1';

export function emptyMeta(): MetaFacts {
  return { schemaVersion: META_SCHEMA_VERSION, unlocks: [], runs: [] };
}

export function hasUnlock(meta: MetaFacts, id: UnlockId): boolean {
  return meta.unlocks.includes(id);
}

export function grant(meta: MetaFacts, id: UnlockId): MetaFacts {
  return hasUnlock(meta, id) ? meta : { ...meta, unlocks: [...meta.unlocks, id] };
}

/** Hook (#596): which unlocks a finished run earns. None until Steward's rules land. */
export function unlocksEarned(_run: RunFacts): UnlockId[] {
  return [];
}

/** Has this run already been written down? (One record per run seed.) */
export function recorded(meta: MetaFacts, run: RunFacts): boolean {
  return meta.runs.some(r => r.seed === run.setup.seed);
}

/** Write a finished run into the record and grant what it earned. A run still
 * in play, or one already recorded, leaves the meta unchanged. */
export function recordRun(meta: MetaFacts, run: RunFacts, now: number = Date.now()): MetaFacts {
  const state = runState(run);
  if (state.phase === 'league' || state.phase === 'league-won' || recorded(meta, run)) return meta;
  const record: RunRecord = { seed: run.setup.seed, leaguesWon: state.won, won: state.phase === 'run-won', endedAt: now, engineVersion };
  return unlocksEarned(run).reduce(grant, { ...meta, runs: [...meta.runs, record] });
}

interface MetaEnvelope { schemaVersion: number; savedAt: number; engineVersion: string; data: MetaFacts }

function defaultStore(): SeasonStore | null {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
}

export function saveMeta(meta: MetaFacts, store: SeasonStore | null = defaultStore(), now: number = Date.now()): boolean {
  if (!store) return false;
  try {
    const envelope: MetaEnvelope = { schemaVersion: META_SCHEMA_VERSION, savedAt: now, engineVersion, data: meta };
    store.setItem(META_KEY, JSON.stringify(envelope));
    return true;
  } catch { return false; }
}

/** The meta on this device, or a fresh one. Reads only the data's own schema
 * version, never the engine's, so a version bump keeps every unlock. */
export function loadMeta(store: SeasonStore | null = defaultStore()): MetaFacts {
  if (!store) return emptyMeta();
  try {
    const raw = store.getItem(META_KEY);
    if (!raw) return emptyMeta();
    const envelope = JSON.parse(raw) as MetaEnvelope;
    const m = envelope?.data;
    if (!m || m.schemaVersion !== META_SCHEMA_VERSION || !Array.isArray(m.unlocks) || !Array.isArray(m.runs)) return emptyMeta();
    return { schemaVersion: META_SCHEMA_VERSION, unlocks: m.unlocks.filter(id => id in UNLOCKS), runs: m.runs };
  } catch { return emptyMeta(); }
}
