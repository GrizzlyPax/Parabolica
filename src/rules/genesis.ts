// Genesis tags, rolled from the ruleset on their own seed streams (#241).
// Separating this from driver/car generation means a card that changes the
// tag pool or chance re-rolls ONLY the tags — names, stats, teams and track
// stay exactly where they were, so Run Setup can show the grid first and let
// you flip cards freely.
//
// Streams: driver + car tags ← deriveSeed(seed, 'tags', 'driver', driverId)
//          (each driver has their own chassis, so the car rolls per driver)
//          team tag ← deriveSeed(seed, 'tags', 'team', kingdomId)
//          (one roll, shared by both of a team's drivers)

import { mulberry32, deriveSeed, type Rng } from '../engine/rng';
import { Tag, TagTarget, pickTagByRarity } from '../data/tags';
import { MOTORSPORT_DECK, cardsBy, pickCard, applyCards, type Card, type CardTarget } from '../cards';
import { rollRacingNumbers } from '../generators/racingNumbers';
import type { GeneratedDriver } from '../generators/drivers';
import type { GeneratedCar } from '../generators/cars';
import type { RosterDriver } from '../RaceEngine';
import { Ruleset, poolTags } from './ruleset';

/** One slot: does it hit? → which bucket? → which tag in it? Always three
 * rng() draws so the stream shape is stable whatever the odds. */
function maybe(target: TagTarget, pool: Tag[], rs: Ruleset, rng: () => number): Tag | null {
  const roll = rng();
  const pick = pickTagByRarity(pool.filter(t => t.target === target), rs.tags.rarityOdds, rng);
  return roll < rs.tags.genesisChance ? pick : null;
}

/** Roll genesis tags for every driver. Pure; same inputs → same tags. */
export function rollGenesisTags(roster: GeneratedDriver[], seed: number, rs: Ruleset): Map<number, Tag[]> {
  const pool = poolTags(rs);
  const cap = rs.tags.slotCap;
  const teamRolls = new Map<string, Tag[]>();
  const out = new Map<number, Tag[]>();
  for (const d of roster) {
    let team = teamRolls.get(d.kingdomId);
    if (!team) {
      const rng = mulberry32(deriveSeed(seed, 'tags', 'team', d.kingdomId));
      team = [maybe('team', pool, rs, rng)].filter((t): t is Tag => !!t);
      teamRolls.set(d.kingdomId, team);
    }
    const rng = mulberry32(deriveSeed(seed, 'tags', 'driver', d.id));
    const own = [maybe('driver', pool, rs, rng), maybe('car', pool, rs, rng)].filter((t): t is Tag => !!t);
    const tags = [...own, ...team].slice(0, cap);
    out.set(d.id, tags);
  }
  return out;
}

/** Assemble the engine-ready roster: driver + car/team stats + genesis tags.
 * The one place this happens (league founding, quick race, labs, tests). */
export function buildRoster(roster: GeneratedDriver[], cars: Map<string, GeneratedCar>, seed: number, rs: Ruleset): RosterDriver[] {
  const tags = rollGenesisTags(roster, seed, rs);
  return roster.map(driver => {
    const car = cars.get(driver.kingdomId);
    return {
      ...driver,
      carStats: car?.stats,
      carName: car?.name,
      teamStats: car?.teamStats,
      tags: tags.get(driver.id) ?? [],
    };
  });
}

// ---------------------------------------------------------------------------
// Quick Race on cards (#337, docs/CARDS.md). The same roll shape as the tags
// above (1-in-6 hit, metal odds, always three draws) on NEW streams
// ('traits', …), dealing trait cards from the Motorsport deck and baking them
// into the stats with applyCards. Engine tags stay empty. Leagues, the lab and
// the World Deck stay on tags until v0.6 (#334): this is a separate path, not
// a global switch.

function maybeTrait(target: CardTarget, rs: Ruleset, rng: Rng): Card | null {
  const roll = rng();
  const pick = pickCard(cardsBy({ kind: 'trait', target }, MOTORSPORT_DECK), rs.tags.rarityOdds, rng);
  return roll < rs.tags.genesisChance ? pick : null;
}

/** Trait cards for every driver: their own driver + car traits, plus the team's
 * (one roll per team, shared by teammates). Pure. */
export function rollGenesisTraits(roster: GeneratedDriver[], seed: number, rs: Ruleset): Map<number, Card[]> {
  const teamRolls = new Map<string, Card[]>();
  const out = new Map<number, Card[]>();
  for (const d of roster) {
    let team = teamRolls.get(d.kingdomId);
    if (!team) {
      const rng = mulberry32(deriveSeed(seed, 'traits', 'team', d.kingdomId));
      team = [maybeTrait('team', rs, rng)].filter((c): c is Card => !!c);
      teamRolls.set(d.kingdomId, team);
    }
    const rng = mulberry32(deriveSeed(seed, 'traits', 'driver', d.id));
    const own = [maybeTrait('driver', rs, rng), maybeTrait('car', rs, rng)].filter((c): c is Card => !!c);
    out.set(d.id, [...own, ...team]);
  }
  return out;
}

/** Racing numbers for a grid, 2–99, unique, on deriveSeed(seed,'genesis','numbers'). */
export function rollGridNumbers(count: number, seed: number): number[] {
  return rollRacingNumbers(count, mulberry32(deriveSeed(seed, 'genesis', 'numbers')));
}

/** The engine-ready Quick Race roster: driver + car/team stats with the
 * genesis TRAIT CARDS baked in, racing numbers on, engine tags empty. */
export function buildCardRoster(roster: GeneratedDriver[], cars: Map<string, GeneratedCar>, seed: number, rs: Ruleset): RosterDriver[] {
  const traits = rollGenesisTraits(roster, seed, rs);
  const numbers = rollGridNumbers(roster.length, seed);
  return roster.map((driver, i) => {
    const car = cars.get(driver.kingdomId);
    const cards = traits.get(driver.id) ?? [];
    const adjusted = applyCards({ driver: driver.stats, car: car?.stats, team: car?.teamStats }, cards);
    return {
      ...driver,
      stats: adjusted.driver!,
      carStats: adjusted.car,
      carName: car?.name,
      teamStats: adjusted.team,
      number: numbers[i],
      cards,
      tags: [],
    };
  });
}
