// Rookies (#696; Pax's #693 answers, Oct 14): every driver in a run is dealt
// near-identical. No pick, no archetype nudges, no car setups: "rookies are
// dealt, near-identical, with one flavour page and no strategic choices. All
// growth comes from stamps (#704)." The State step's rivals are the same
// rolls, lifted at race build by the step's field shift (run/run.ts).
//
// A rookie: every driver stat at ROOKIE_GRADE (25 points = level 5) plus a
// wobble per stat of up to ROOKIE_WOBBLE; a 2★ car and 2★ team stats with the
// same wobble; no genesis traits. Names are American (generateAmericanDriverName).
//
// Pure. Every roll takes the rng it is given; the streams are the callers'
// (the pool's 'rookies' streams, the run's 'run', 'rookies' stream for yours).

import { deriveSeed, mulberry32, type Rng } from '../engine/rng';
import { generateAmericanDriverName } from '../generators/names';
import { BACKSTORY_TEMPLATES, BACKSTORY_FILLS, QUIRKS } from '../generators/drivers';
import { generateRackCar, type CarStats, type TeamStats } from '../generators/cars';
import { rollRacingNumbers } from '../generators/racingNumbers';
import { DRIVER_STATS, statRange, type StatKey } from '../cards';
import { pick } from '../engine/rng';
import type { DriverStats } from '../RaceEngine';
import type { PoolDriver, RackCar } from './genesis';

/** Every rookie stat starts here (level 5). */
export const ROOKIE_GRADE = 25;
/** The wobble per stat, in grade points, for everyone (near-identical). */
export const ROOKIE_WOBBLE = 5;
/** Your pair's ids sit above every step's stride (3 steps × 100), so a driver keeps one id for the whole run. */
export const ROOKIE_ID_BASE = 900;

/** Grade points → the raw value the sim runs on (the generators' own ranges). */
export function gradeToRaw(stat: StatKey, grade: number): number {
  const { min, span } = statRange(stat);
  return min + (grade / 100) * span;
}

const wobbled = (rng: Rng, wobble: number) => ROOKIE_GRADE + (rng() * 2 - 1) * wobble;

/** Six stats: 25 ± wobble each. Six rng() draws. */
export function rookieDriverStats(rng: Rng, wobble: number = ROOKIE_WOBBLE): DriverStats {
  const out = {} as DriverStats;
  for (const k of DRIVER_STATS) out[k] = gradeToRaw(k, wobbled(rng, wobble));
  return out;
}

function fillBackstory(template: string, rng: Rng): string {
  return template.replace(/\{(\w+)\}/g, (m, key: string) => {
    const options = BACKSTORY_FILLS[key as keyof typeof BACKSTORY_FILLS];
    return options ? pick(options, rng) : m;
  });
}

/**
 * A rookie: an American name, a story and a quirk on their own flavour stream
 * (one draw seeds it, so the pools can grow without moving a stat), then the
 * rookie stats. No traits.
 */
export function rookieDriver(id: number, number: number, rng: Rng, wobble: number = ROOKIE_WOBBLE): PoolDriver {
  const flavour = mulberry32(deriveSeed(Math.floor(rng() * 0x100000000), 'rookie-flavour'));
  const name = generateAmericanDriverName(flavour);
  const backstory = fillBackstory(pick(BACKSTORY_TEMPLATES, flavour), flavour);
  const quirk = pick(QUIRKS, flavour);
  return {
    id, firstName: name.firstName, middleName: name.middleName, lastName: name.lastName, fullName: name.fullName, shortName: name.shortName,
    stats: rookieDriverStats(rng, wobble), backstory, quirk, number, traits: [],
  };
}

/** A star stat at 25 ± wobble points (2★ ± 0.2★). */
export const rookieStars = (rng: Rng, wobble: number = ROOKIE_WOBBLE): number => gradeToRaw('power', wobbled(rng, wobble));

/** A rookie car: a generated name and quirk, 2★ stats (± wobble), no traits. */
export function rookieCar(id: string, rng: Rng, taken?: Set<string>, wobble: number = ROOKIE_WOBBLE): RackCar {
  const car = generateRackCar(id, rng, taken);
  const stats: CarStats = { power: rookieStars(rng, wobble), grip: rookieStars(rng, wobble), reliability: rookieStars(rng, wobble) };
  return { ...car, stats, traits: [] };
}

export function rookieTeamStats(rng: Rng, wobble: number = ROOKIE_WOBBLE): TeamStats {
  return { tireManagement: rookieStars(rng, wobble), pitCrew: rookieStars(rng, wobble) };
}

/** What a run deals you at the start: two rookies, a car, your team's stats. */
export interface DealtRookies {
  drivers: [PoolDriver, PoolDriver];
  car: RackCar;
  teamStats: TeamStats;
}

/**
 * Your pair, car and team stats, dealt on the run seed's own stream
 * ('run', 'rookies'). Ids ROOKIE_ID_BASE and ROOKIE_ID_BASE + 1; racing
 * numbers rolled here (the pool skips them); faces on the run seed.
 */
export function dealRookies(seed: number): DealtRookies {
  const rng = mulberry32(deriveSeed(seed, 'run', 'rookies'));
  const numbers = rollRacingNumbers(2, rng);
  const drivers: [PoolDriver, PoolDriver] = [
    { ...rookieDriver(ROOKIE_ID_BASE, numbers[0], rng), avatarSeed: seed },
    { ...rookieDriver(ROOKIE_ID_BASE + 1, numbers[1], rng), avatarSeed: seed },
  ];
  const car = { ...rookieCar('car-you', rng), avatarSeed: seed };
  return { drivers, car, teamStats: rookieTeamStats(rng) };
}
