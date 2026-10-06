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

import { mulberry32, deriveSeed } from '../engine/rng';
import { Tag, TagTarget, pickTagByRarity } from '../data/tags';
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
