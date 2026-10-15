// The 60-card run deck (#647; Steward's Deck List Report, Pax Oct 10, the
// priced list on #565). What packs and rank-ups deal in a run; the
// Motorsport grid deck (deck.ts) stays the genesis deck of stand-alone
// seasons, Quick Race and the lab.
//
// Data, not arithmetic: every card is written out as the player reads it.
// `pct` is the card's grade points AS HELD (5 points = one level: a Bronze
// "+3 Speed" is 15 points), so nothing scales a run-deck trait; gear plays
// × GEAR_STRENGTH for GEAR_LIFE races (pack.ts), as before.
//
// Shape (rarity buys complexity): Bronze plain · Silver plain, a half-race
// WINDOW (+12 for the first or second half, on the #332 lap timer) or a
// trade · Gold two stats or a trade · Iridium a build-around. Four
// archetypes × 12 (5 / 4 / 2 / 1) + 12 Any-team (6 / 3 / 2 / 1) = 26 / 19 /
// 10 / 5. TAGS ONLY, no set bonuses: the tag names the plan a card belongs
// to and feeds the rank-up trait slot (xp.ts); the deal has no lean.
//
// Three PRICE BANDS (Pax): king ×1 (Power, Speed, Accel, Aggression, Tyre
// Mgmt) · mid ×1.5 (Consistency, Luck) · weak ×2 (Pit Crew, Endurance,
// Grip, Reliability), minuses included, against a budget per metal of
// 3 / 6 / 12 / 27 levels on a king stat; a half-race window halves the
// price. runDeck.test.ts pins every card to its budget.
//
// Eight named CURSES, car or team, all bad, one race each (Pax: "3 races is
// steep"). Names are placeholders until Radio's pass (#370).

import type { Card, CardKind, CardStat, CardTag, CardTarget, StatKey } from './types';
import type { Rarity } from './rarity';
import { CARDS_BY_ID } from './deck';

/** Grade points a level (grades.ts POINTS_PER_LEVEL; repeated here so the deck is plain data). */
const LV = 5;

/** The price bands: what a level of each stat costs against the metal budget. */
export const PRICE_BAND: Record<StatKey, 1 | 1.5 | 2> = {
  power: 1, baseSpeed: 1, acceleration: 1, aggression: 1, tireManagement: 1,
  consistency: 1.5, luck: 1.5,
  pitCrew: 2, endurance: 2, grip: 2, reliability: 2,
};
/** Levels of a king stat each metal buys. */
export const METAL_BUDGET: Record<Rarity, number> = { bronze: 3, silver: 6, gold: 12, iridium: 27 };

/** A half-race window: live for the first or second half of the race's laps (the lap timer, #332). */
export type CardWindow = 'first' | 'second';

type Place = 'driver gear' | 'car gear' | 'team gear' | 'driver trait' | 'car trait' | 'team trait';
const PLACE: Record<Place, { kind: CardKind; target: CardTarget }> = {
  'driver gear': { kind: 'equipment', target: 'driver' }, 'car gear': { kind: 'upgrade', target: 'car' }, 'team gear': { kind: 'facility', target: 'team' },
  'driver trait': { kind: 'trait', target: 'driver' }, 'car trait': { kind: 'trait', target: 'car' }, 'team trait': { kind: 'trait', target: 'team' },
};
const S = { spd: 'baseSpeed', con: 'consistency', lck: 'luck', acc: 'acceleration', end: 'endurance', agg: 'aggression', pwr: 'power', grp: 'grip', rel: 'reliability', tyr: 'tireManagement', pit: 'pitCrew' } as const;
type Short = keyof typeof S;

/** One row of the list: name, tag, metal, place, levels per stat, an optional window. */
type Row = [name: string, tag: CardTag, rarity: Rarity, place: Place, levels: Partial<Record<Short, number>>, window?: CardWindow];

const ROWS: Row[] = [
  // Qualifier
  ['Fresh Gloves', 'qualifier', 'bronze', 'driver gear', { acc: 3 }],
  ['Visor Tear-offs', 'qualifier', 'bronze', 'driver gear', { spd: 3 }],
  ['Stiffer Springs', 'qualifier', 'bronze', 'car gear', { grp: 6 }],
  ['Garage Drill', 'qualifier', 'bronze', 'team gear', { pit: 6 }],
  ['Hot Lapper', 'qualifier', 'bronze', 'driver trait', { acc: 3 }],
  ['Lights Out', 'qualifier', 'silver', 'driver gear', { acc: 12 }, 'first'],
  ['Quali Mode', 'qualifier', 'silver', 'car gear', { pwr: 6 }],
  ['Out-Lap Crew', 'qualifier', 'silver', 'team gear', { pit: 12 }],
  ['Pole Sitter', 'qualifier', 'silver', 'driver trait', { acc: 6 }],
  ['Slipstream Helmet', 'qualifier', 'gold', 'driver gear', { spd: 6, acc: 6 }],
  ['Glued to the Road', 'qualifier', 'gold', 'car trait', { grp: 18, pwr: 6, rel: -6 }],
  ['Front-Row Lockout', 'qualifier', 'iridium', 'driver trait', { acc: 12, spd: 12, con: 9, end: -6 }],
  // Brawler
  ['Elbow Pads', 'brawler', 'bronze', 'driver gear', { agg: 3 }],
  ['Launch Control', 'brawler', 'bronze', 'driver gear', { acc: 3 }],
  ['Iron Bodywork', 'brawler', 'bronze', 'car gear', { rel: 6 }],
  ['Spare Front Wings', 'brawler', 'bronze', 'team gear', { pit: 6 }],
  ['Late Braker', 'brawler', 'bronze', 'driver trait', { agg: 3 }],
  ['Dive-Bomb Helmet', 'brawler', 'silver', 'driver gear', { agg: 12 }, 'first'],
  ['Torque Map', 'brawler', 'silver', 'car gear', { pwr: 6 }],
  ['Bodyshop', 'brawler', 'silver', 'team gear', { pit: 12 }],
  ['Elbows Out', 'brawler', 'silver', 'driver trait', { agg: 6 }],
  ['Battering Ram', 'brawler', 'gold', 'car gear', { pwr: 6, rel: 12 }],
  ['Red Mist', 'brawler', 'gold', 'driver trait', { agg: 9, acc: 6, con: -4 }],
  ['No Prisoners', 'brawler', 'iridium', 'driver trait', { agg: 12, spd: 9, acc: 9, con: -4 }],
  // Tyre Saver
  ['Smooth Gloves', 'tyre-saver', 'bronze', 'driver gear', { con: 5 }],
  ['Endurance Seat', 'tyre-saver', 'bronze', 'driver gear', { end: 6 }],
  ['Soft Suspension', 'tyre-saver', 'bronze', 'car gear', { grp: 6 }],
  ['Tyre Blankets', 'tyre-saver', 'bronze', 'team gear', { tyr: 3 }],
  ['Gentle Feet', 'tyre-saver', 'bronze', 'driver trait', { end: 6 }],
  ['Second Wind', 'tyre-saver', 'silver', 'driver gear', { spd: 12 }, 'second'],
  ['Kind Suspension', 'tyre-saver', 'silver', 'car gear', { grp: 12 }],
  ['Heat Cycling', 'tyre-saver', 'silver', 'team gear', { tyr: 6 }],
  ['Metronome', 'tyre-saver', 'silver', 'driver trait', { con: 9 }],
  ['Strategy Room', 'tyre-saver', 'gold', 'team gear', { tyr: 6, pit: 12 }],
  ['Long Stint Specialists', 'tyre-saver', 'gold', 'team trait', { tyr: 15, pit: -6 }],
  ['Tyre Whisperers', 'tyre-saver', 'iridium', 'team trait', { tyr: 18, pit: 18 }],
  // Glass Cannon
  ['Lightweight Helmet', 'glass-cannon', 'bronze', 'driver gear', { spd: 3 }],
  ['Thin Gloves', 'glass-cannon', 'bronze', 'driver gear', { agg: 3 }],
  ['Stripped Interior', 'glass-cannon', 'bronze', 'car gear', { pwr: 3 }],
  ['Skeleton Crew', 'glass-cannon', 'bronze', 'team gear', { pit: 6 }],
  ['Hothead', 'glass-cannon', 'bronze', 'driver trait', { spd: 3 }],
  ['Adrenaline', 'glass-cannon', 'silver', 'driver gear', { spd: 9, con: -4 }],
  ['Glass Engine', 'glass-cannon', 'silver', 'car gear', { pwr: 9, rel: -6 }],
  ["Gamblers' Pit Wall", 'glass-cannon', 'silver', 'team gear', { pit: 18, tyr: -3 }],
  ['Fearless', 'glass-cannon', 'silver', 'driver trait', { agg: 9, lck: -4 }],
  ['Throttle Stomper', 'glass-cannon', 'gold', 'driver gear', { spd: 9, acc: 6, con: -4 }],
  ['All or Nothing', 'glass-cannon', 'gold', 'driver trait', { spd: 9, agg: 9, con: -9 }],
  ['Rocket Ship', 'glass-cannon', 'iridium', 'car trait', { pwr: 18, grp: 24, rel: -6 }],
  // Any-team
  ['Reliable Unit', 'any', 'bronze', 'car trait', { rel: 6 }],
  ['Pit Drills', 'any', 'bronze', 'team trait', { pit: 6 }],
  ['Lucky Seven', 'any', 'bronze', 'driver gear', { lck: 5 }],
  ['Fresh Gearbox', 'any', 'bronze', 'car gear', { rel: 6 }],
  ['Spare Parts', 'any', 'bronze', 'team gear', { pit: 6 }],
  ['Steady Hands', 'any', 'bronze', 'driver trait', { con: 5 }],
  ['Balanced Chassis', 'any', 'silver', 'car trait', { grp: 12 }],
  ['Pit Lane Ghost', 'any', 'silver', 'team trait', { pit: 12 }],
  ['Four-Leaf Clover', 'any', 'silver', 'driver gear', { lck: 9 }],
  ['Factory Upgrade', 'any', 'gold', 'car gear', { pwr: 6, grp: 12 }],
  ['Works Chassis', 'any', 'gold', 'car trait', { grp: 12, rel: 12 }],
  ['Complete Driver', 'any', 'iridium', 'driver trait', { spd: 9, con: 14, end: 18 }],
];

export const slug = (name: string) => name.toLowerCase().replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const stats = (levels: Partial<Record<Short, number>>): CardStat[] => (Object.entries(levels) as [Short, number][]).map(([k, lv]) => ({ stat: S[k], pct: lv * LV }));
export const WINDOW_RULE: Record<CardWindow, string> = { first: 'First half of the race only.', second: 'Second half of the race only.' };

/**
 * Radio's names (docs/story/stamps.md, Pax Oct 15), by the card's id. The ids
 * stay derived from the placeholder names in ROWS above (`rd-<slug>`): saves
 * hold them, so the names change and the ids never do (#699).
 */
export const STAMP_NAMES: Readonly<Record<string, string>> = {
  'rd-fresh-gloves': 'Thin-Sole Boots',
  'rd-visor-tear-offs': 'Visor Tear-offs',
  'rd-stiffer-springs': 'Stiffer Springs',
  'rd-garage-drill': 'Quick-Lift Jacks',
  'rd-hot-lapper': 'Quick Off the Line',
  'rd-lights-out': 'Launch Gloves',
  'rd-quali-mode': 'Quali Mode',
  'rd-out-lap-crew': 'Out-Lap Crew',
  'rd-pole-sitter': 'Saturday Specialist',
  'rd-slipstream-helmet': 'Low-Drag Helmet',
  'rd-glued-to-the-road': 'Glued to the Road',
  'rd-front-row-lockout': 'One-Lap Wonder',
  'rd-elbow-pads': 'Elbow Pads',
  'rd-launch-control': 'Steel-Toe Boots',
  'rd-iron-bodywork': 'Reinforced Nose',
  'rd-spare-front-wings': 'Spare Front Wings',
  'rd-late-braker': 'Late Braker',
  'rd-dive-bomb-helmet': 'Dive-Bomb Helmet',
  'rd-torque-map': 'Torque Map',
  'rd-bodyshop': 'Bodyshop',
  'rd-elbows-out': 'Never Lifts',
  'rd-battering-ram': 'Battering Ram',
  'rd-red-mist': 'Red Mist',
  'rd-no-prisoners': 'No Prisoners',
  'rd-smooth-gloves': 'Kid Gloves',
  'rd-endurance-seat': 'Molded Seat',
  'rd-soft-suspension': 'Soft Suspension',
  'rd-tyre-blankets': 'Tire Blankets',
  'rd-gentle-feet': 'Never Tires',
  'rd-second-wind': 'Drinks Bottle',
  'rd-kind-suspension': 'Long-Run Setup',
  'rd-heat-cycling': 'Heat-Cycled Sets',
  'rd-metronome': 'Metronome',
  'rd-strategy-room': 'Strategy Room',
  'rd-long-stint-specialists': 'One-Stop Crew',
  'rd-tyre-whisperers': 'Tire Whisperers',
  'rd-lightweight-helmet': 'Lightweight Helmet',
  'rd-thin-gloves': 'Thin Gloves',
  'rd-stripped-interior': 'Lightened Flywheel',
  'rd-skeleton-crew': 'Skeleton Crew',
  'rd-hothead': 'Heavy Right Foot',
  'rd-adrenaline': 'Double Espresso',
  'rd-glass-engine': 'Grenade Engine',
  'rd-gamblers-pit-wall': 'Gamblers\' Pit Wall',
  'rd-fearless': 'Fearless',
  'rd-throttle-stomper': 'Lead Boots',
  'rd-all-or-nothing': 'All or Nothing',
  'rd-rocket-ship': 'Rocket Ship',
  'rd-reliable-unit': 'Old Faithful',
  'rd-pit-drills': 'Pit Drills',
  'rd-lucky-seven': 'Lucky Socks',
  'rd-fresh-gearbox': 'Fresh Gearbox',
  'rd-spare-parts': 'Spare Parts',
  'rd-steady-hands': 'Steady Hands',
  'rd-balanced-chassis': 'Balanced Chassis',
  'rd-pit-lane-ghost': 'Two-Second Crew',
  'rd-four-leaf-clover': 'Four-Leaf Clover',
  'rd-factory-upgrade': 'Factory Upgrade',
  'rd-works-chassis': 'Works Chassis',
  'rd-complete-driver': 'The Full Package',
};

function build([name, tag, rarity, place, levels, window]: Row): Card {
  const { kind, target } = PLACE[place];
  const id = `rd-${slug(name)}`;
  return { id, name: STAMP_NAMES[id] ?? name, kind, target, rarity, tag, stats: stats(levels), deck: 'run', ...(window ? { window, rule: WINDOW_RULE[window] } : {}) };
}

/** The run deck, in the list's order (archetype by archetype, bronze first). */
export const RUN_DECK: readonly Card[] = Object.freeze(ROWS.map(build));
export const RUN_CARDS_BY_ID: ReadonlyMap<string, Card> = new Map(RUN_DECK.map(c => [c.id, c]));

/** A card of either deck by id (the run deck first), or undefined. */
export function cardById(id: string): Card | undefined {
  return RUN_CARDS_BY_ID.get(id) ?? CARDS_BY_ID.get(id);
}

/** A named curse (#647): on the car or the team (both drivers), all bad, in grade points as held. */
export interface Curse { id: string; name: string; target: 'car' | 'team'; stats: CardStat[] }
const CURSE_ROWS: [name: string, target: 'car' | 'team', levels: Partial<Record<Short, number>>][] = [
  ['Haunted Gearbox', 'car', { rel: -12 }],
  ['Wrong Fuel Map', 'car', { pwr: -6 }],
  ['Bent Floor', 'car', { grp: -12 }],
  ['Rusty Engine', 'car', { pwr: -3, rel: -6 }],
  ['Butterfingers', 'team', { pit: -12 }],
  ['Sticky Wheel Nut', 'team', { pit: -18 }],
  ['Cold Tyres', 'team', { tyr: -9 }],
  ['Bad Contract', 'team', { tyr: -3 }],
];
/** Radio's smudge names (docs/story/stamps.md), by id; the ids stay the placeholders' slugs (#699). */
export const SMUDGE_NAMES: Readonly<Record<string, string>> = {
  'curse-haunted-gearbox': 'Gremlins',
  'curse-wrong-fuel-map': 'Someone Changed the Map',
  'curse-bent-floor': 'Curb Damage',
  'curse-rusty-engine': 'Last Year\'s Engine',
  'curse-butterfingers': 'Butterfingers',
  'curse-sticky-wheel-nut': 'Work Experience Day',
  'curse-cold-tyres': 'Forgot the Blankets',
  'curse-bad-contract': 'Budget Cuts',
};
export const RUN_CURSES: readonly Curse[] = Object.freeze(CURSE_ROWS.map(([name, target, levels]) => { const id = `curse-${slug(name)}`; return { id, name: SMUDGE_NAMES[id] ?? name, target, stats: stats(levels) }; }));

/** A card's price in king-stat levels, by the bands (a window halves it). */
export function cardPrice(card: Card): number {
  const sum = card.stats.reduce((n, s) => n + (s.pct / LV) / PRICE_BAND[s.stat], 0);
  return card.window ? sum / 2 : sum;
}
