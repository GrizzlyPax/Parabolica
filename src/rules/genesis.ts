// Genesis traits, rolled from the ruleset on their own seed streams (#241,
// #337, docs/CARDS.md). Separating this from driver/car generation means a
// rule card that changes the trait chance re-rolls ONLY the traits — names,
// stats, teams and track stay exactly where they were, so Run Setup can show
// the grid first and let you flip cards freely.
//
// Streams: driver + car traits ← deriveSeed(seed, 'traits', 'driver', driverId)
//          (each driver has their own chassis, so the car rolls per driver)
//          team trait ← deriveSeed(seed, 'traits', 'team', kingdomId)
//          (one roll, shared by both of a team's drivers)
//          racing numbers ← deriveSeed(seed, 'genesis', 'numbers')
//
// Tags (the old mechanic) retired in #334; this is the one genesis path for
// Quick Race, leagues, the lab and tests. Season Mode has its own pool
// (src/season/genesis.ts) on 'season' streams.

import { mulberry32, deriveSeed, type Rng } from '../engine/rng';
import { MOTORSPORT_DECK, cardsBy, pickCard, applyCards, type Card, type CardTarget } from '../cards';
import { rollRacingNumbers } from '../generators/racingNumbers';
import type { GeneratedDriver } from '../generators/drivers';
import type { GeneratedCar } from '../generators/cars';
import type { RosterDriver } from '../RaceEngine';
import type { Ruleset } from './ruleset';

/** One slot: does it hit? → which metal? → which card? Always three rng()
 * draws (one here, two in pickCard) so odds changes never shift the stream. */
function maybeTrait(target: CardTarget, rs: Ruleset, rng: Rng): Card | null {
  const roll = rng();
  const pick = pickCard(cardsBy({ kind: 'trait', target }, MOTORSPORT_DECK), rs.traits.rarityOdds, rng);
  return roll < rs.traits.genesisChance ? pick : null;
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

/** Assemble the engine-ready roster: driver + car/team stats with the genesis
 * trait cards baked in (applyCards) and racing numbers on. The one place this
 * happens (league founding, Quick Race, the lab, tests). */
export function buildRoster(roster: GeneratedDriver[], cars: Map<string, GeneratedCar>, seed: number, rs: Ruleset): RosterDriver[] {
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
      // Display only: already baked into the stats above. The race view shows them (#451).
      cards,
    };
  });
}
