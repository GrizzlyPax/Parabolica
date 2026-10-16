// Deck cards (#329, docs/CARDS.md): the tag system becomes a deck. Gear
// (equipment / upgrade / facility) sits in capped slots; traits are permanent;
// effects are timed and dealt by the sim (v0.6). Rule cards are a different
// thing (src/data/ruleCards.ts).
import type { Rarity } from './rarity';

/** The 11 stats a card can move, keyed as the engine names them. */
export type DriverStatKey = 'baseSpeed' | 'consistency' | 'luck' | 'acceleration' | 'endurance' | 'aggression';
export type CarStatKey = 'power' | 'grip' | 'reliability';
export type TeamStatKey = 'tireManagement' | 'pitCrew';
export type StatKey = DriverStatKey | CarStatKey | TeamStatKey;

/** The four plans a rookie is born with (#660) and a run-deck card belongs to (#647). */
export type Archetype = 'qualifier' | 'brawler' | 'tyre-saver' | 'glass-cannon';
/** A run-deck card's tag (#647): its archetype, or any team. Tags only, no set bonuses. */
export type CardTag = Archetype | 'any';

export type CardKind = 'equipment' | 'upgrade' | 'facility' | 'trait' | 'effect';
/** Who holds it. Slot traits are cut from v0.5 (Pax + Apex, Oct 8). */
export type CardTarget = 'driver' | 'car' | 'team';

export interface CardStat {
  stat: StatKey;
  /** Grade points on the 0–100 scale (#335), e.g. 10 = +10 grade. Effects carry 0: their size comes from the moment (v0.6). */
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
  /** A rule-changer with no stat line (wild cards, #675): its rule, shown on the face. */
  rule?: string;
  /** Run deck (#647): the plan this card belongs to. */
  tag?: CardTag;
  /** Run deck (#647): the stats apply for one half of the race only (the lap timer, #332), not at race build. */
  window?: 'first' | 'second';
  /** The grid deck (deck.ts; pct at 1×, scaled for the player) or the run deck (runDeck.ts; pct as held). */
  deck: 'motorsport' | 'run';
  /** Its own icon on the card face (#699; a game-icons id); absent = the first stat's icon. */
  iconId?: string;
}

export interface Slots { equipment: number; upgrade: number; facility: number }
