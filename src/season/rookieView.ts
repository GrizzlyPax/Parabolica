// The rookie pick's view (#661; Steward's 10/10 Rookie Pick Report, design
// #594, build #660). Pure: rookies and car setups in, what the screen shows
// out, in stat levels (#623). The sim side (the offer, the re-roll, the
// picks as facts) is Apex's #660; this only reads grade points.
import type { StatKey } from '../cards/types';
import { level } from './grades';

export type Archetype = 'qualifier' | 'brawler' | 'tyre-saver' | 'glass-cannon';

/** The archetypes and their nudges in grade points (decided, #660). */
export const ARCHETYPES: Record<Archetype, { name: string; nudge: Partial<Record<StatKey, number>> }> = {
  qualifier: { name: 'Qualifier', nudge: { acceleration: 10, consistency: 15 } },
  brawler: { name: 'Brawler', nudge: { aggression: 10, luck: 15 } },
  'tyre-saver': { name: 'Tyre Saver', nudge: { endurance: 20, consistency: 15 } },
  'glass-cannon': { name: 'Glass Cannon', nudge: { baseSpeed: 15, aggression: 10, consistency: -10 } },
};

/** The rookie's base: every stat at grade 25 (level 5). */
export const ROOKIE_GRADE = 25;

/** The three car setups (decided, #660): grade points on a level-5 car. */
export const CAR_SETUPS = [
  { id: 'straight-line', name: 'Straight-line', stat: 'power', points: 10 },
  { id: 'twisty', name: 'Twisty', stat: 'grip', points: 20 },
  { id: 'bulletproof', name: 'Bulletproof', stat: 'reliability', points: 20 },
] as const satisfies readonly { id: string; name: string; stat: StatKey; points: number }[];
export type CarSetupId = (typeof CAR_SETUPS)[number]['id'];

/** One rookie as the offer hands it to the screen: grade points per driver stat. */
export interface RookieOffer {
  id: number;
  name: string;
  archetype: Archetype;
  /** Grade points (0–100 scale) per driver stat, wobble and nudge included. */
  points: Partial<Record<StatKey, number>>;
  /** Flavour line: sample text until Radio names them. */
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

export function rookieCard(r: RookieOffer): RookieCardView {
  const nudged = Object.keys(ARCHETYPES[r.archetype].nudge) as StatKey[];
  const lv = (s: StatKey) => level(r.points[s] ?? ROOKIE_GRADE);
  const rest = DRIVER.filter(s => !nudged.includes(s)).map(lv);
  return {
    id: r.id,
    name: r.name,
    archetype: ARCHETYPES[r.archetype].name,
    lean: nudged.map(stat => ({ stat, level: lv(stat) })),
    others: rest.length ? { min: Math.min(...rest), max: Math.max(...rest) } : null,
    flavour: r.flavour,
  };
}

/** A setup as levels: its stat, and the rest of a level-5 car. */
export function setupView(s: (typeof CAR_SETUPS)[number]): { stat: StatKey; level: number; others: number } {
  return { stat: s.stat, level: level(ROOKIE_GRADE + s.points), others: level(ROOKIE_GRADE) };
}
