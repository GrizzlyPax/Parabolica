// Tag calibration: what does a tag actually DO to the driver who carries it?
//
// Method (paired, solo): for race i of a seeded batch, run it once with the
// `no-tags` card (nobody carries anything) and once more with exactly one tag
// forced onto one carrier (roster slot i % 22; a team tag lands on the
// teammate too). Same seed, same grid, same weather — the only difference is
// the tag, so the carrier's change in finishing position is the tag's effect.
// Averaged over the batch that is "places gained"; win and DNF rates are read
// the same way. The result is committed to src/data/tagCalibration.json and
// a deck test fails when a tag's numbers drift out of band or its effects
// change without a re-run (`npm run calibrate`).
import { ALL_TAGS, isGenesisTag, type Rarity, type Tag, type TagTarget } from '../data/tags';
import { labSpec, runLabRace, carriersOf, finishPosition, raceFingerprint, batchFingerprint, type LabRaceResult } from './runner';
import RaceEngine from '../RaceEngine';
import type { SimVariables } from '../simlab/types';

export const CALIBRATION_CARDS = ['no-tags'];
export const CALIBRATION_BATCH_SEED = 2026;
export const CALIBRATION_RACES = 200;
export const CALIBRATION_VERSION = 1;

export interface TagCalibration {
  tagId: string;
  target: TagTarget;
  rarity: Rarity;
  /** Hash of the tag's mechanical definition when this was measured. */
  effectsHash: string;
  races: number;
  /** Mean places gained by the carrier vs the same race untagged (+ = better). */
  places: number;
  /** Standard error of `places`. */
  placesSe: number;
  winRate: number;
  baseWinRate: number;
  podiumRate: number;
  basePodiumRate: number;
  dnfRate: number;
  baseDnfRate: number;
  /** tag_activation events logged for the carrier, per race. */
  activationsPerRace: number;
}

export interface CalibrationFile {
  version: number;
  batchSeed: number;
  races: number;
  cards: string[];
  /** Fingerprint of the untagged baseline batch — replicate it to trust the rest. */
  baselineFingerprint: string;
  generatedAt: string;
  tags: TagCalibration[];
}

/** The bands a genesis tag must sit inside. Out of band = the deck test fails. */
export const CALIBRATION_BANDS = {
  /** |places| above this is a tag that decides races on its own. */
  maxPlaces: 6,
  /** A carrier that retires more often than this is a punishment, not a trait. */
  maxDnfRate: 0.6,
  /** The base rate is 1/22; this is a hard ceiling on "always wins". */
  maxWinRate: 0.5,
};

export function effectsHash(tag: Tag): string {
  const def = { target: tag.target, trigger: tag.trigger, effects: tag.effects, condition: tag.condition ?? null, triggerChance: tag.triggerChance ?? 1, duration: tag.duration ?? 'permanent' };
  let h = 0x811c9dc5; const s = JSON.stringify(def);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

export function genesisTagIds(): string[] {
  return ALL_TAGS.filter(isGenesisTag).map(t => t.id);
}

interface Baseline {
  pos: Map<number, number>;
  dnf: Set<number>;
  winner: number;
  fingerprint: string;
}

export interface CalibrateOptions {
  batchSeed?: number;
  races?: number;
  cards?: string[];
  /** Physics to run under (a preset's knob edits). Default: the ruleset's own. */
  variables?: SimVariables;
  /** Called after every race; return false to abort. */
  onProgress?: (done: number, total: number, label: string) => boolean | void;
}

export interface CalibrateOutput {
  file: CalibrationFile;
  aborted: boolean;
}

export interface CalibrateProgress {
  done: number;
  total: number;
  /** 'baseline' while the untagged races run, then the tag's name. */
  label: string;
  /** Which race of this phase just finished (1-based) and how many there are. */
  race: number;
  races: number;
}

/**
 * The calibration as a generator: one yield per race, so the same loop runs
 * synchronously in a script, in a worker, or on the main thread with a
 * breath between races. Deterministic for a given batchSeed/races/cards.
 */
export function* calibrateSteps(tagIds: (string | Tag)[] = genesisTagIds(), options: Omit<CalibrateOptions, 'onProgress'> = {}): Generator<CalibrateProgress, CalibrateOutput, boolean | void> {
  const batchSeed = options.batchSeed ?? CALIBRATION_BATCH_SEED;
  const races = options.races ?? CALIBRATION_RACES;
  const cards = options.cards ?? CALIBRATION_CARDS;
  const total = races * (1 + tagIds.length);
  let done = 0;
  const engine = RaceEngine.createForWorker();

  // Baseline: every race once, untagged.
  const baseline: Baseline[] = [];
  for (let i = 0; i < races; i++) {
    const r = runLabRace(labSpec(batchSeed, i, cards), { engine, variables: options.variables });
    baseline.push(summarize(r));
    const go = yield { done: ++done, total, label: 'baseline', race: i + 1, races };
    if (go === false) return { file: emptyFile(batchSeed, races, cards, baseline), aborted: true };
  }
  const file = emptyFile(batchSeed, races, cards, baseline);

  for (const which of tagIds) {
    const tag = typeof which === 'string' ? ALL_TAGS.find(t => t.id === which) : which;
    if (!tag) throw new Error(`Unknown tag ${which}`);
    const tagId = tag.id;
    const deltas: number[] = [];
    let wins = 0, baseWins = 0, podiums = 0, basePodiums = 0, dnfs = 0, baseDnfs = 0, carrierRaces = 0, activations = 0;
    for (let i = 0; i < races; i++) {
      const override = { driverIndex: i % (GRID * 2), tagId, tag };
      const r = runLabRace(labSpec(batchSeed, i, cards), { engine, override, variables: options.variables });
      const base = baseline[i];
      for (const id of carriersOf(r, override)) {
        const pos = finishPosition(r, id);
        const basePos = base.pos.get(id) ?? GRID * 2;
        deltas.push(basePos - pos);
        carrierRaces++;
        if (pos === 1) wins++;
        if (base.winner === id) baseWins++;
        if (pos <= 3) podiums++;
        if (basePos <= 3) basePodiums++;
        if (r.drivers.find(d => d.id === id)?.status === 'dnf') dnfs++;
        if (base.dnf.has(id)) baseDnfs++;
        activations += r.events.filter(e => e.type === 'tag_activation' && e.driverId === id).length;
      }
      const go = yield { done: ++done, total, label: tag.name, race: i + 1, races };
      if (go === false) return { file, aborted: true };
    }
    const n = deltas.length || 1;
    const mean = deltas.reduce((a, b) => a + b, 0) / n;
    const sd = Math.sqrt(deltas.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, n - 1));
    file.tags.push({
      tagId, target: tag.target, rarity: tag.rarity, effectsHash: effectsHash(tag), races,
      places: round(mean), placesSe: round(sd / Math.sqrt(n)),
      winRate: round(wins / n), baseWinRate: round(baseWins / n),
      podiumRate: round(podiums / n), basePodiumRate: round(basePodiums / n),
      dnfRate: round(dnfs / n), baseDnfRate: round(baseDnfs / n),
      activationsPerRace: round(activations / Math.max(1, carrierRaces)),
    });
  }
  return { file, aborted: false };
}

/** Synchronous drain (scripts, tests). */
export function calibrateTags(tagIds: (string | Tag)[] = genesisTagIds(), options: CalibrateOptions = {}): CalibrateOutput {
  const g = calibrateSteps(tagIds, options);
  let next = g.next();
  while (!next.done) {
    const p = next.value;
    next = g.next(options.onProgress?.(p.done, p.total, p.label));
  }
  return next.value;
}

/** Async drain that yields to the event loop between races (main-thread fallback). */
export async function calibrateTagsAsync(tagIds: (string | Tag)[], options: Omit<CalibrateOptions, 'onProgress'> & { onProgress?: (p: CalibrateProgress) => boolean | void }): Promise<CalibrateOutput> {
  const g = calibrateSteps(tagIds, options);
  let next = g.next();
  while (!next.done) {
    const go = options.onProgress?.(next.value);
    await new Promise(r => setTimeout(r, 0));
    next = g.next(go);
  }
  return next.value;
}

const GRID = 11;

function summarize(r: LabRaceResult): Baseline {
  const pos = new Map<number, number>();
  for (const d of r.drivers) pos.set(d.id, finishPosition(r, d.id));
  return { pos, dnf: new Set(r.drivers.filter(d => d.status === 'dnf').map(d => d.id)), winner: r.raceState.finishOrder[0], fingerprint: raceFingerprint(r) };
}

function emptyFile(batchSeed: number, races: number, cards: string[], baseline: Baseline[]): CalibrationFile {
  return {
    version: CALIBRATION_VERSION, batchSeed, races, cards,
    baselineFingerprint: batchFingerprint(baseline.map(b => b.fingerprint)),
    generatedAt: new Date().toISOString(), tags: [],
  };
}

function round(x: number): number { return Math.round(x * 1000) / 1000; }

/** Why a calibration row is out of band, or null when it is fine. */
export function bandViolation(c: TagCalibration): string | null {
  if (Math.abs(c.places) > CALIBRATION_BANDS.maxPlaces) return `places ${c.places} beyond ±${CALIBRATION_BANDS.maxPlaces}`;
  if (c.dnfRate > CALIBRATION_BANDS.maxDnfRate) return `DNF rate ${c.dnfRate} above ${CALIBRATION_BANDS.maxDnfRate}`;
  if (c.winRate > CALIBRATION_BANDS.maxWinRate) return `win rate ${c.winRate} above ${CALIBRATION_BANDS.maxWinRate}`;
  return null;
}

/** One-line reading of a row, for the deck and the lab. */
export function describeCalibration(c: TagCalibration): string {
  const places = c.places === 0 ? 'no measurable effect' : `${c.places > 0 ? '+' : ''}${c.places.toFixed(1)} places`;
  const win = c.baseWinRate > 0 ? `${(c.winRate / c.baseWinRate).toFixed(1)}× wins` : `${(c.winRate * 100).toFixed(0)}% wins`;
  const dnf = `${(c.dnfRate * 100).toFixed(0)}% DNF (field ${(c.baseDnfRate * 100).toFixed(0)}%)`;
  return `${places} · ${win} · ${dnf}`;
}
