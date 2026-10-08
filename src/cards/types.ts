// Deck cards (#329, docs/CARDS.md): the tag system becomes a deck. Gear
// (equipment / upgrade / facility) sits in capped slots; traits are permanent;
// effects are timed and dealt by the sim (v0.6). Rule cards are a different
// thing (src/data/ruleCards.ts).
import type { Rarity } from '../data/tags';

/** The 11 stats a card can move, keyed as the engine names them. */
export type DriverStatKey = 'baseSpeed' | 'consistency' | 'luck' | 'acceleration' | 'endurance' | 'aggression';
export type CarStatKey = 'power' | 'grip' | 'reliability';
export type TeamStatKey = 'tireManagement' | 'pitCrew';
export type StatKey = DriverStatKey | CarStatKey | TeamStatKey;

export type CardKind = 'equipment' | 'upgrade' | 'facility' | 'trait' | 'effect';
/** Who holds it. Slot traits are cut from v0.5 (Pax + Apex, Oct 8). */
export type CardTarget = 'driver' | 'car' | 'team';

export interface CardStat {
  stat: StatKey;
  /** Percent, e.g. 10 = +10%. Effects carry 0: their size comes from the moment (v0.6). */
  pct: number;
}

export interface Card {
  /** Stable, derived from the grid: `eq-gold-speed+consistency`. */
  id: string;
  /** Utilitarian for now ("Gold Speed + Consistency"); a flavour pass comes later. */
  name: string;
  kind: CardKind;
  target: CardTarget;
  /** Gear and traits only; effects have no metal. */
  rarity?: Rarity;
  stats: CardStat[];
  /** Effects only: which way the stat moves. */
  direction?: 'up' | 'down';
  deck: 'motorsport';
}

export interface Slots { equipment: number; upgrade: number; facility: number }
