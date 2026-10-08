// The 🏁 Motorsport base deck (#329, docs/CARDS.md), generated from the stat
// grid rather than written by hand. 94 cards (Pax + Apex, Oct 8: slot traits
// cut from v0.5): equipment 20 · upgrades 10 · facilities 6 · traits 36
// (driver 20 · car 10 · team 6) · effects 22.
//
// Pure data. Nothing in the sim reads it yet: genesis (#313) and Quick Race
// (#337) wire it in.
import { RARITIES, rollRarity, type Rarity, type RarityOdds } from '../data/tags';
import type { Rng } from '../engine/rng';
import type { Card, CardKind, CardTarget, CarStatKey, DriverStatKey, Slots, StatKey, TeamStatKey } from './types';

/** The placeholder ladder: how many stats a card moves and by how much.
 * Calibration replaces it later; keep it in this one constant. */
export const METAL_LADDER: Record<Rarity, { stats: number; pct: number }> = {
  bronze: { stats: 1, pct: 2 },
  silver: { stats: 1, pct: 5 },
  gold: { stats: 2, pct: 10 },
  iridium: { stats: 3, pct: 15 },
};

export const DRIVER_STATS: DriverStatKey[] = ['baseSpeed', 'consistency', 'luck', 'acceleration', 'endurance', 'aggression'];
export const CAR_STATS: CarStatKey[] = ['power', 'grip', 'reliability'];
export const TEAM_STATS: TeamStatKey[] = ['tireManagement', 'pitCrew'];

/** Display names, and the slugs used in card ids. */
export const STAT_LABELS: Record<StatKey, string> = {
  baseSpeed: 'Speed', consistency: 'Consistency', luck: 'Luck', acceleration: 'Acceleration', endurance: 'Endurance', aggression: 'Aggression',
  power: 'Power', grip: 'Grip', reliability: 'Reliability', tireManagement: 'Tyre Management', pitCrew: 'Pit Crew',
};
const SLUG = (s: StatKey) => STAT_LABELS[s].toLowerCase().replace(/ /g, '-');

/** Each target's stat grid: singles at bronze/silver, combos at gold/iridium,
 * with every stat represented evenly (docs/CARDS.md → The base deck). */
const GRID: Record<CardTarget, { singles: StatKey[]; gold: StatKey[][]; iridium: StatKey[][] }> = {
  driver: {
    singles: DRIVER_STATS,
    gold: [['baseSpeed', 'consistency'], ['consistency', 'luck'], ['luck', 'acceleration'], ['acceleration', 'endurance'], ['endurance', 'aggression'], ['aggression', 'baseSpeed']],
    iridium: [['baseSpeed', 'acceleration', 'aggression'], ['consistency', 'endurance', 'luck']],
  },
  car: {
    singles: CAR_STATS,
    gold: [['power', 'grip'], ['grip', 'reliability'], ['reliability', 'power']],
    iridium: [['power', 'grip', 'reliability']],
  },
  team: {
    singles: TEAM_STATS,
    // Team has two stats, so its gold and iridium are the same pair at +10% / +15%.
    gold: [['tireManagement', 'pitCrew']],
    iridium: [['tireManagement', 'pitCrew']],
  },
};

/** The gear kind each target holds. */
export const GEAR_KIND: Record<CardTarget, CardKind> = { driver: 'equipment', car: 'upgrade', team: 'facility' };
const KIND_PREFIX: Record<CardKind, string> = { equipment: 'eq', upgrade: 'up', facility: 'fa', trait: 'tr', effect: 'ef' };
const TARGETS: CardTarget[] = ['driver', 'car', 'team'];

function cap(s: string) { return s[0].toUpperCase() + s.slice(1); }

function gridCards(kind: CardKind, target: CardTarget): Card[] {
  const g = GRID[target];
  const sets: [Rarity, StatKey[]][] = [
    ...g.singles.map(s => ['bronze', [s]] as [Rarity, StatKey[]]),
    ...g.singles.map(s => ['silver', [s]] as [Rarity, StatKey[]]),
    ...g.gold.map(c => ['gold', c] as [Rarity, StatKey[]]),
    ...g.iridium.map(c => ['iridium', c] as [Rarity, StatKey[]]),
  ];
  // Gear kind already names its target (eq = driver…); traits name it in the id.
  const tgt = kind === 'trait' ? `${target}-` : '';
  return sets.map(([rarity, stats]) => ({
    id: `${KIND_PREFIX[kind]}-${tgt}${rarity}-${stats.map(SLUG).join('+')}`,
    name: `${cap(rarity)} ${stats.map(s => STAT_LABELS[s]).join(' + ')}`,
    kind, target, rarity,
    stats: stats.map(stat => ({ stat, pct: METAL_LADDER[rarity].pct })),
    deck: 'motorsport' as const,
  }));
}

function effectCards(): Card[] {
  const statsOf: Record<CardTarget, StatKey[]> = { driver: DRIVER_STATS, car: CAR_STATS, team: TEAM_STATS };
  return TARGETS.flatMap(target => statsOf[target].flatMap(stat => (['up', 'down'] as const).map(direction => ({
    id: `ef-${SLUG(stat)}-${direction}`,
    name: `${STAT_LABELS[stat]} ${cap(direction)}`,
    kind: 'effect' as const, target, direction,
    stats: [{ stat, pct: 0 }],
    deck: 'motorsport' as const,
  }))));
}

function buildDeck(): Card[] {
  return [
    ...TARGETS.flatMap(t => gridCards(GEAR_KIND[t], t)),
    ...TARGETS.flatMap(t => gridCards('trait', t)),
    ...effectCards(),
  ];
}

/** The whole Motorsport base deck, in a fixed order (gear, traits, effects). */
export const MOTORSPORT_DECK: readonly Card[] = Object.freeze(buildDeck());

export function motorsportDeck(): Card[] {
  return [...MOTORSPORT_DECK];
}

export const CARDS_BY_ID: ReadonlyMap<string, Card> = new Map(MOTORSPORT_DECK.map(c => [c.id, c]));

/** Filter the deck (or a given pool). */
export function cardsBy(f: { kind?: CardKind; target?: CardTarget; rarity?: Rarity }, pool: readonly Card[] = MOTORSPORT_DECK): Card[] {
  return pool.filter(c => (!f.kind || c.kind === f.kind) && (!f.target || c.target === f.target) && (!f.rarity || c.rarity === f.rarity));
}

/** Roll a metal from the odds, then a uniform pick inside it. An empty metal
 * falls to the nearest non-empty one (commoner first), like genesis. Always
 * exactly two rng() draws, so a deal never shifts the stream. */
export function pickCard(pool: readonly Card[], odds: RarityOdds, rng: Rng): Card | null {
  const metal = rollRarity(odds, rng);
  const pick = rng();
  if (pool.length === 0) return null;
  const want = RARITIES.indexOf(metal);
  const order = [...RARITIES.slice(0, want + 1).reverse(), ...RARITIES.slice(want + 1)];
  for (const r of order) {
    const bucket = pool.filter(c => c.rarity === r);
    if (bucket.length) return bucket[Math.floor(pick * bucket.length)];
  }
  return null;
}

/** Gear slots: one of each in v0.5. Slot traits return in v0.6; the
 * signature stays so they can add to this without rework. */
export function slotsFor(_traits: readonly Card[]): Slots {
  return { equipment: 1, upgrade: 1, facility: 1 };
}
