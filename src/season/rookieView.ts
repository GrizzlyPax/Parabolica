// The rookie pick's view (#661; Steward's 10/10 Rookie Pick Report, design
// #594, Apex's rookie start #660). Pure: rookies and car setups in, what the
// screen shows out, in stat levels (#623). The spec's numbers live in
// rookies.ts (Apex); this only reads them.
import type { StatKey } from '../cards/types';
import { level, rating } from './grades';
import { ARCHETYPE_INFO, CAR_SETUPS, CAR_SETUP_IDS, ROOKIE_GRADE, type Archetype, type CarSetupId } from './rookies';
import type { PoolDriver } from '../generators/drivers';

export type { Archetype, CarSetupId };

/** One rookie as the screen reads it: grade points per driver stat. */
export interface RookieOffer {
  id: number;
  name: string;
  archetype: Archetype;
  /** Grade points (0–100 scale) per driver stat, wobble and nudge included. */
  points: Partial<Record<StatKey, number>>;
  /** Flavour line: the archetype's line until Radio names rookies. */
  flavour?: string;
}

export interface RookieCardView {
  id: number;
  name: string;
  archetype: string;
  /** The nudged stats first (as levels), the rest summarised. */
  lean: { stat: StatKey; level: number }[];
  others: { min: number; max: number } | null;
  flavour?: string;
}

const DRIVER: StatKey[] = ['baseSpeed', 'consistency', 'luck', 'acceleration', 'endurance', 'aggression'];

/** A rookie from the run's offer (#660), as grade points. */
export function offerOf(d: PoolDriver & { archetype?: Archetype }): RookieOffer {
  const archetype = d.archetype ?? 'qualifier';
  return {
    id: d.id, name: d.fullName, archetype,
    points: Object.fromEntries(DRIVER.map(s => [s, rating(s, d.stats[s as keyof typeof d.stats])])),
    flavour: ARCHETYPE_INFO[archetype].blurb,
  };
}

export function rookieCard(r: RookieOffer): RookieCardView {
  const nudged = Object.keys(ARCHETYPE_INFO[r.archetype].nudge) as StatKey[];
  const lv = (s: StatKey) => level(r.points[s] ?? ROOKIE_GRADE);
  const rest = DRIVER.filter(s => !nudged.includes(s)).map(lv);
  return {
    id: r.id,
    name: r.name,
    archetype: ARCHETYPE_INFO[r.archetype].name,
    lean: nudged.map(stat => ({ stat, level: lv(stat) })),
    others: rest.length ? { min: Math.min(...rest), max: Math.max(...rest) } : null,
    flavour: r.flavour,
  };
}

/** The setups in order, as levels on a level-5 car. */
export const SETUPS = CAR_SETUP_IDS.map(id => ({ id, ...CAR_SETUPS[id] }));
export function setupView(id: CarSetupId): { stat: StatKey; level: number; others: number } {
  const s = CAR_SETUPS[id];
  return { stat: s.stat, level: level(ROOKIE_GRADE + s.points), others: level(ROOKIE_GRADE) };
}
