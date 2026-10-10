// Gear + traits → adjusted stats (#329). Static for a race, so they bake into
// the roster at build time; no engine change (docs/CARDS.md → Build notes).
//
// A card adds GRADE POINTS (#335, Pax Oct 9): stat += pct × span / 100, where
// span is the stat's generator range (DRIVER_STAT_ROLLS / STAR_RATING, the same
// 0–100 scale the Paddock grades read). "+10 Speed" moves the grade by exactly
// 10 whatever the stat's natural range; before, a +10% card was 12× stronger
// on Speed than on Consistency. Car and team cards add stars (+10 → +0.4★);
// fractional stars are fine. Track and weather favours ride the same math.
import type { CarStats, DriverStats, TeamStats } from '../RaceEngine';
import { DRIVER_STAT_ROLLS } from '../generators/drivers';
import { STAR_RATING } from '../generators/cars';
import type { Card, CardStat, StatKey } from './types';

/** The raw roll range of a stat: 100 grade points span it. */
export function statRange(stat: StatKey): { min: number; span: number } {
  if (stat in DRIVER_STAT_ROLLS) return DRIVER_STAT_ROLLS[stat as keyof typeof DRIVER_STAT_ROLLS];
  return { min: STAR_RATING.min, span: STAR_RATING.max - STAR_RATING.min };
}

export interface StatBlock {
  driver?: DriverStats;
  car?: CarStats;
  team?: TeamStats;
}

/** Σ pct per stat over the cards that count at race build: gear and traits
 * (effects are v0.6; a half-race window card, #647, runs on the lap timer instead). */
export function cardPercents(cards: readonly Card[]): Partial<Record<StatKey, number>> {
  const out: Partial<Record<StatKey, number>> = {};
  for (const c of cards) {
    if (c.kind === 'effect' || c.window) continue;
    for (const { stat, pct } of c.stats) out[stat] = (out[stat] ?? 0) + pct;
  }
  return out;
}

function shift<T extends object>(block: T | undefined, pcts: Partial<Record<StatKey, number>>): T | undefined {
  if (!block) return undefined;
  const next = { ...block } as Record<string, number>;
  for (const key of Object.keys(next)) {
    const p = pcts[key as StatKey];
    if (p) next[key] = next[key] + (p * statRange(key as StatKey).span) / 100;
  }
  return next as T;
}

/** Add grade points to a stat block, per stat. Pure; never mutates `base`. */
export function applyPercents(base: StatBlock, pcts: Partial<Record<StatKey, number>>): StatBlock {
  return { driver: shift(base.driver, pcts), car: shift(base.car, pcts), team: shift(base.team, pcts) };
}

/** Pure: same input → same output; never mutates `base`. */
export function applyCards(base: StatBlock, cards: readonly Card[]): StatBlock {
  return applyPercents(base, cardPercents(cards));
}

/** Σ pct per stat of a favour list (a track's, a weather's, or both). */
export function favourPercents(favours: readonly CardStat[]): Partial<Record<StatKey, number>> {
  const out: Partial<Record<StatKey, number>> = {};
  for (const { stat, pct } of favours) out[stat] = (out[stat] ?? 0) + pct;
  return out;
}

/**
 * Track + weather favours (Tracks & Weather v2, #359): the favoured stats gain
 * pct grade points for every driver in the race. Applied once at race build, after cards,
 * on the roster the engine loads. Pure; returns the same array when there is
 * nothing to favour.
 */
export function applyFavours<T extends { stats: DriverStats; carStats?: CarStats; teamStats?: TeamStats }>(roster: T[], favours: readonly CardStat[]): T[] {
  if (favours.length === 0) return roster;
  const pcts = favourPercents(favours);
  return roster.map(d => {
    const a = applyPercents({ driver: d.stats, car: d.carStats, team: d.teamStats }, pcts);
    return { ...d, stats: a.driver!, carStats: a.car, teamStats: a.team };
  });
}

/** Grade points → raw units for the engine's lap effects (#332; window cards, #647). */
export function rawDeltas(stats: readonly CardStat[]): { driver: Partial<DriverStats>; car: Partial<CarStats>; team: Partial<TeamStats> } {
  const out: { driver: Partial<DriverStats>; car: Partial<CarStats>; team: Partial<TeamStats> } = { driver: {}, car: {}, team: {} };
  for (const [k, pct] of Object.entries(favourPercents(stats))) {
    const key = k as StatKey;
    const delta = ((pct ?? 0) * statRange(key).span) / 100;
    if (key in DRIVER_STAT_ROLLS) out.driver[key as keyof DriverStats] = delta;
    else if (key === 'power' || key === 'grip' || key === 'reliability') out.car[key] = delta;
    else out.team[key as keyof TeamStats] = delta;
  }
  return out;
}
