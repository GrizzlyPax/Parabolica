// The rookie start (#660; design #594, Pax Oct 10, the Rookie Pick Report).
// The draft is gone: a run starts by picking TWO of SIX rookies and ONE of
// three car setups; every CPU team in every league is rookies from the same
// pool, generated behind the scenes.
//
// A rookie: every driver stat at ROOKIE_GRADE (25 points = level 5), plus a
// wobble per stat (±5 for the player's offer, ±10 for the CPU), plus the
// archetype's nudge in grade points. Car and team stats start at 25 points
// too (a 2★ car); CPU cars and teams wobble ±10. Rookies have no genesis
// traits: the cards you hold are the ones the run deals (Apex's call, #660).
//
// The archetype is also the driver's rank-up path (#646): the trait a
// rank-up deals comes from their own archetype. Until the deck carries
// archetype tags (#565 / #647) that is read off the stats the archetype
// nudges.
//
// Pure. Every roll takes the rng it is given; the streams are the callers'
// (the pool's 'rookies' streams, the run's 'run', 'rookies' streams).

import { deriveSeed, mulberry32, shuffle, type Rng } from '../engine/rng';
import { generatePoolDriver } from '../generators/drivers';
import { generateRackCar, type CarStats, type TeamStats } from '../generators/cars';
import { rollRacingNumbers } from '../generators/racingNumbers';
import { cardsBy, DRIVER_STATS, MOTORSPORT_DECK, STAT_LABELS, statRange, type Card, type CardStat, type CarStatKey, type DriverStatKey, type StatKey } from '../cards';
import type { Rarity } from '../cards/rarity';
import type { DriverStats } from '../RaceEngine';
import type { PoolDriver, RackCar } from './genesis';

export type Archetype = 'qualifier' | 'brawler' | 'tyre-saver' | 'glass-cannon';
export const ARCHETYPES: readonly Archetype[] = ['qualifier', 'brawler', 'tyre-saver', 'glass-cannon'];

/** Each archetype's nudge, in grade points (5 = one level), and a line for the screen. */
export const ARCHETYPE_INFO: Record<Archetype, { name: string; blurb: string; nudge: Partial<Record<DriverStatKey, number>> }> = {
  qualifier: { name: 'Qualifier', blurb: 'Quick off the line and tidy with it.', nudge: { acceleration: 10, consistency: 15 } },
  brawler: { name: 'Brawler', blurb: 'Elbows out, and somehow it works.', nudge: { aggression: 10, luck: 15 } },
  'tyre-saver': { name: 'Tyre Saver', blurb: 'Makes a set last. Never hurries.', nudge: { endurance: 20, consistency: 15 } },
  'glass-cannon': { name: 'Glass Cannon', blurb: 'Fastest thing out there, until it isn\'t.', nudge: { baseSpeed: 15, aggression: 10, consistency: -10 } },
};

/** Every rookie stat starts here (level 5). */
export const ROOKIE_GRADE = 25;
/** The wobble per stat, in grade points: the player's offer, and the CPU's rookies, cars and teams. */
export const OFFER_WOBBLE = 5;
export const CPU_WOBBLE = 10;
export const OFFER_SIZE = 6;
export const OFFER_PICKS = 2;
/** Offer ids sit above every league's stride (4 leagues × 100), so a rookie keeps one id for the whole run. */
export const ROOKIE_ID_BASE = 900;

export type CarSetupId = 'straight-line' | 'twisty' | 'bulletproof';
/** Grade points on the car, priced king ×1 / weak ×2 (Steward, #594). */
export const CAR_SETUPS: Record<CarSetupId, { name: string; blurb: string; stat: CarStatKey; points: number }> = {
  'straight-line': { name: 'Straight-line', blurb: 'Power for the straights.', stat: 'power', points: 10 },
  twisty: { name: 'Twisty', blurb: 'Grip for the corners.', stat: 'grip', points: 20 },
  bulletproof: { name: 'Bulletproof', blurb: 'Reliability: it finishes.', stat: 'reliability', points: 20 },
};
export const CAR_SETUP_IDS = Object.keys(CAR_SETUPS) as CarSetupId[];
export const isCarSetup = (x: unknown): x is CarSetupId => typeof x === 'string' && x in CAR_SETUPS;

/** The setup as a permanent car trait (so the Paddock's sums and the sim read the same points). */
export function setupCard(id: CarSetupId): Card {
  const s = CAR_SETUPS[id];
  const stats: CardStat[] = [{ stat: s.stat, pct: s.points }];
  return { id: `setup-${id}`, name: `${s.name} setup`, kind: 'trait', target: 'car', rarity: 'silver', stats, deck: 'motorsport' };
}

/** Grade points → the raw value the sim runs on (the generators' own ranges). */
export function gradeToRaw(stat: StatKey, grade: number): number {
  const { min, span } = statRange(stat);
  return min + (grade / 100) * span;
}

const wobbled = (rng: Rng, wobble: number) => ROOKIE_GRADE + (rng() * 2 - 1) * wobble;

/** Six stats: 25 ± wobble each, plus the archetype's nudge. Six rng() draws. */
export function rookieDriverStats(rng: Rng, archetype: Archetype, wobble: number): DriverStats {
  const nudge = ARCHETYPE_INFO[archetype].nudge;
  const out = {} as DriverStats;
  for (const k of DRIVER_STATS) out[k] = gradeToRaw(k, wobbled(rng, wobble) + (nudge[k] ?? 0));
  return out;
}

/** A rookie: a generated person (name, story, quirk) with rookie stats, no traits, an archetype. */
export function rookieDriver(id: number, number: number, archetype: Archetype, wobble: number, rng: Rng): PoolDriver {
  // The generator's own stat roll is discarded: a rookie is a rookie.
  const person = generatePoolDriver(id, rng);
  return { ...person, stats: rookieDriverStats(rng, archetype, wobble), number, traits: [], archetype };
}

/** A star stat at 25 ± wobble points (2★ ± 0.4★). */
export const rookieStars = (rng: Rng, wobble: number): number => gradeToRaw('power', wobbled(rng, wobble));

/** A rookie car: a generated name and quirk, 2★ stats (± wobble), no traits. */
export function rookieCar(id: string, wobble: number, rng: Rng, taken?: Set<string>): RackCar {
  const car = generateRackCar(id, rng, taken);
  const stats: CarStats = { power: rookieStars(rng, wobble), grip: rookieStars(rng, wobble), reliability: rookieStars(rng, wobble) };
  return { ...car, stats, traits: [] };
}

export function rookieTeamStats(wobble: number, rng: Rng): TeamStats {
  return { tireManagement: rookieStars(rng, wobble), pitCrew: rookieStars(rng, wobble) };
}

/**
 * The player's offer: six rookies on their own stream, at least one of each
 * archetype, ±5 wobble. `roll` 0 is the first deal, 1 the free re-roll; ids
 * never collide between the two (ROOKIE_ID_BASE + roll × OFFER_SIZE + i).
 */
export function rookieOffer(seed: number, roll: 0 | 1): PoolDriver[] {
  const rng = mulberry32(deriveSeed(seed, 'run', 'rookies', 'offer', roll));
  const extras = Array.from({ length: OFFER_SIZE - ARCHETYPES.length }, () => ARCHETYPES[Math.floor(rng() * ARCHETYPES.length)]);
  const archetypes = shuffle([...ARCHETYPES, ...extras], rng);
  const numbers = rollRacingNumbers(OFFER_SIZE, rng);
  return archetypes.map((a, i) => ({ ...rookieDriver(ROOKIE_ID_BASE + roll * OFFER_SIZE + i, numbers[i], a, OFFER_WOBBLE, rng), avatarSeed: seed }));
}

/** The player's car: 2★ exactly, named on its own stream, wearing the setup. */
export function rookiePlayerCar(seed: number, id: string, setup: CarSetupId): RackCar {
  const car = rookieCar(id, 0, mulberry32(deriveSeed(seed, 'run', 'rookies', 'car')));
  return { ...car, traits: [setupCard(setup)], avatarSeed: seed };
}

/** The player's team stats: 2★ exactly. */
export const rookiePlayerTeamStats = (): TeamStats => ({ tireManagement: gradeToRaw('tireManagement', ROOKIE_GRADE), pitCrew: gradeToRaw('pitCrew', ROOKIE_GRADE) });

/**
 * The driver traits a rank-up may deal (#646): of the metal, and from the
 * driver's own archetype: every stat the card moves is one the archetype
 * nudges up; failing that, any of them; failing that (no archetype: a
 * stand-alone season), any driver trait of the metal.
 */
export function archetypeTraits(archetype: Archetype | undefined, metal: Rarity): Card[] {
  const all = cardsBy({ kind: 'trait', target: 'driver', rarity: metal }, MOTORSPORT_DECK);
  if (!archetype) return all;
  const own = new Set(Object.entries(ARCHETYPE_INFO[archetype].nudge).filter(([, v]) => v > 0).map(([k]) => k));
  const exact = all.filter(c => c.stats.length > 0 && c.stats.every(s => own.has(s.stat)));
  if (exact.length) return exact;
  const some = all.filter(c => c.stats.some(s => own.has(s.stat)));
  return some.length ? some : all;
}

/** "Acceleration +2 · Consistency +3" for a screen. */
export function describeNudge(archetype: Archetype): string {
  return Object.entries(ARCHETYPE_INFO[archetype].nudge).map(([k, v]) => `${STAT_LABELS[k as StatKey]} ${v > 0 ? '+' : '−'}${Math.abs(v) / 5}`).join(' · ');
}
