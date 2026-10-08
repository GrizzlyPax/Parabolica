// Gear + traits → adjusted stats (#329). Static for a race, so they bake into
// the roster at build time; no engine change (docs/CARDS.md → Build notes).
//
// Per stat: add the card percentages, then multiply once: stat × (1 + Σpct/100).
// Car and team cards scale the STARS, not the star multiplier (Pax + Apex,
// Oct 8): the engine reads stars and squashes driver Speed to ~12% strength,
// so +10% Power on a 3★ car → 3.3★ ≈ +1.2% pace, in line with a +10% Speed
// driver card. Fractional stars are fine.
import type { CarStats, DriverStats, TeamStats } from '../RaceEngine';
import type { Card, StatKey } from './types';

export interface StatBlock {
  driver?: DriverStats;
  car?: CarStats;
  team?: TeamStats;
}

/** Σ pct per stat over the cards that count (gear and traits; effects are v0.6). */
export function cardPercents(cards: readonly Card[]): Partial<Record<StatKey, number>> {
  const out: Partial<Record<StatKey, number>> = {};
  for (const c of cards) {
    if (c.kind === 'effect') continue;
    for (const { stat, pct } of c.stats) out[stat] = (out[stat] ?? 0) + pct;
  }
  return out;
}

function scale<T extends object>(block: T | undefined, pcts: Partial<Record<StatKey, number>>): T | undefined {
  if (!block) return undefined;
  const next = { ...block } as Record<string, number>;
  for (const key of Object.keys(next)) {
    const p = pcts[key as StatKey];
    if (p) next[key] = next[key] * (1 + p / 100);
  }
  return next as T;
}

/** Pure: same input → same output; never mutates `base`. */
export function applyCards(base: StatBlock, cards: readonly Card[]): StatBlock {
  const pcts = cardPercents(cards);
  return { driver: scale(base.driver, pcts), car: scale(base.car, pcts), team: scale(base.team, pcts) };
}
