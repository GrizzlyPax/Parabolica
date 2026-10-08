// Season Mode genesis (#313, docs/SEASON_MODE.md §2): the seed summons a
// SHARED POOL instead of two drivers per named team. `teams × 3` team-less
// drivers, a rack of `teams` cars (car stats only) and `teams` competitor
// teams (identity + the operational stats). The draft (#314) distributes the
// pool; the season loop (#315) turns picks + lineups into a race grid here.
//
// Streams are all new ('season', …) so Quick Race, leagues and the lab keep
// their 'genesis' / 'tags' streams untouched: the golden fingerprint must not
// move. Everything is derived from (seed, teamCount, ruleset); same inputs →
// deep-equal pool.
//
// Genesis rolls TRAIT CARDS, not tags (docs/CARDS.md): one slot per pool
// driver, per rack car and per competitor team, the same shape as the tag
// roll (1-in-6 hit, metal odds 60/30/9/1, always three rng draws). No gear
// at genesis; every driver, car and team starts with one empty slot.

import { mulberry32, deriveSeed, shuffle, type Rng } from '../engine/rng';
import { generatePoolDriver, type PoolDriver as GeneratedPoolDriver } from '../generators/drivers';
import { generateRackCar, generateTeamStats, type CarStats, type TeamStats } from '../generators/cars';
import { rollRacingNumbers } from '../generators/racingNumbers';
import { teamIdentitiesForSeed } from '../generators/teamIdentity';
import { BASE_DECK_TEAMS } from '../data/deckTeams';
import { MOTORSPORT_DECK, cardsBy, pickCard, applyCards, type Card, type CardTarget } from '../cards';
import { Ruleset, defaultRuleset } from '../rules/ruleset';
import type { RosterDriver } from '../RaceEngine';

export const MIN_TEAMS = 5;
export const MAX_TEAMS = 10;
export const DEFAULT_TEAMS = 10;
/** Drivers each team drafts; two race, one sits out. */
export const SQUAD_SIZE = 3;
export const RACE_LINEUP = 2;

export interface PoolDriver extends GeneratedPoolDriver {
  /** Racing number 2–99, unique on the grid, for life. */
  number: number;
  /** Born with (genesis roll). Permanent. */
  traits: Card[];
}

export interface RackCar {
  id: string;
  name: string;
  stats: CarStats;
  quirk: string;
  traits: Card[];
}

export interface CompetitorTeam {
  /** Stable slot id (`team-0` …); the draft and the roster key on it. */
  id: string;
  name: string;
  color: string;
  ink: string;
  emoji: string;
  iconId?: string;
  /** The World Deck team this identity came from (CPU teams). */
  deckTeamId?: string;
  /** Tyre management + pit crew belong to the team (Pax, Oct 8). */
  teamStats: TeamStats;
  traits: Card[];
}

export interface SeasonPool {
  seed: number;
  teamCount: number;
  drivers: PoolDriver[];
  cars: RackCar[];
  teams: CompetitorTeam[];
}

/** One slot: does it hit? → which metal? → which card? Always three rng()
 * draws (one here, two in pickCard) so odds changes never shift the stream. */
function maybeTrait(target: CardTarget, rs: Ruleset, rng: Rng): Card | null {
  const roll = rng();
  const pick = pickCard(cardsBy({ kind: 'trait', target }, MOTORSPORT_DECK), rs.tags.rarityOdds, rng);
  return roll < rs.tags.genesisChance ? pick : null;
}

function traitsFor(target: CardTarget, seed: number, id: string | number, rs: Ruleset): Card[] {
  const rng = mulberry32(deriveSeed(seed, 'season', 'traits', target, id));
  const t = maybeTrait(target, rs, rng);
  return t ? [t] : [];
}

/** CPU identities: a seeded, no-repeat draw from the World Deck teams. The
 * procedural generator only fills in if the deck runs short. Humans overwrite
 * name and colour later, as facts. */
function teamIdentities(seed: number, count: number): Omit<CompetitorTeam, 'id' | 'teamStats' | 'traits'>[] {
  const rng = mulberry32(deriveSeed(seed, 'season', 'teams'));
  type Identity = Omit<CompetitorTeam, 'id' | 'teamStats' | 'traits'>;
  const picked: Identity[] = shuffle(BASE_DECK_TEAMS, rng).slice(0, count).map(t => ({
    name: t.name, color: t.color, ink: t.ink, emoji: t.emoji, iconId: t.iconId, deckTeamId: t.id,
  }));
  if (picked.length < count) {
    const extra = teamIdentitiesForSeed(deriveSeed(seed, 'season', 'teams', 'extra'), count - picked.length);
    extra.forEach((e, i) => picked.push({ name: `Team ${picked.length + i + 1}`, color: e.color, ink: '#FFFFFF', emoji: e.emoji }));
  }
  return picked;
}

/** The whole universe for a season. Pure. */
export function generateSeasonPool(seed: number, teamCount: number = DEFAULT_TEAMS, rs: Ruleset = defaultRuleset()): SeasonPool {
  if (!Number.isInteger(teamCount) || teamCount < MIN_TEAMS || teamCount > MAX_TEAMS) {
    throw new Error(`generateSeasonPool: teamCount must be ${MIN_TEAMS}–${MAX_TEAMS}, got ${teamCount}`);
  }
  const driverRng = mulberry32(deriveSeed(seed, 'season', 'drivers'));
  const numbers = rollRacingNumbers(teamCount * SQUAD_SIZE, mulberry32(deriveSeed(seed, 'season', 'numbers')));
  const drivers: PoolDriver[] = [];
  for (let i = 0; i < teamCount * SQUAD_SIZE; i++) {
    drivers.push({ ...generatePoolDriver(i, driverRng), number: numbers[i], traits: traitsFor('driver', seed, i, rs) });
  }

  const carRng = mulberry32(deriveSeed(seed, 'season', 'cars'));
  const cars: RackCar[] = [];
  for (let i = 0; i < teamCount; i++) {
    const id = `car-${i}`;
    cars.push({ ...generateRackCar(id, carRng), traits: traitsFor('car', seed, id, rs) });
  }

  const statsRng = mulberry32(deriveSeed(seed, 'season', 'team-stats'));
  const teams: CompetitorTeam[] = teamIdentities(seed, teamCount).map((identity, i) => {
    const id = `team-${i}`;
    return { id, ...identity, teamStats: generateTeamStats(statsRng), traits: traitsFor('team', seed, id, rs) };
  });

  return { seed, teamCount, drivers, cars, teams };
}

// ---------------------------------------------------------------------------
// Race-time roster

/** What a team drafted (#314 writes these). */
export interface TeamRoster {
  teamId: string;
  driverIds: number[];
  carId: string;
}

/** Who races this round: exactly two of the team's drivers. */
export interface Lineup {
  teamId: string;
  driverIds: [number, number];
}

/** Cards beyond genesis traits: gear from packs (#316) and, later, anything
 * else a season deals. Keyed by entity id. */
export interface SeasonCards {
  driver?: Record<number, Card[]>;
  car?: Record<string, Card[]>;
  team?: Record<string, Card[]>;
}

/** Human teams rename and recolour themselves; the pool keeps the generated identity. */
export interface TeamIdentityOverride {
  name?: string;
  color?: string;
  ink?: string;
  emoji?: string;
  iconId?: string;
}

export interface SeasonRosterOptions {
  cards?: SeasonCards;
  identities?: Record<string, TeamIdentityOverride>;
}

/** Everything that applies to one racing driver this round, in a fixed order:
 * driver traits, car traits, team traits, then dealt cards. */
export function cardsForDriver(pool: SeasonPool, teamId: string, driverId: number, carId: string, cards: SeasonCards = {}): Card[] {
  const driver = pool.drivers.find(d => d.id === driverId);
  const car = pool.cars.find(c => c.id === carId);
  const team = pool.teams.find(t => t.id === teamId);
  return [
    ...(driver?.traits ?? []), ...(car?.traits ?? []), ...(team?.traits ?? []),
    ...(cards.driver?.[driverId] ?? []), ...(cards.car?.[carId] ?? []), ...(cards.team?.[teamId] ?? []),
  ];
}

/**
 * The engine-ready grid for one round: each racing driver carries their
 * competitor team's identity, the team's claimed car, the team's stats, and
 * every card baked into those stats with applyCards. Engine `tags` stay empty
 * for season races in v0.5. Pure; grid order = lineup order, then lineup slot.
 */
export function seasonRoster(pool: SeasonPool, rosters: TeamRoster[], lineups: Lineup[], opts: SeasonRosterOptions = {}): RosterDriver[] {
  const out: RosterDriver[] = [];
  for (const lineup of lineups) {
    const roster = rosters.find(r => r.teamId === lineup.teamId);
    const team = pool.teams.find(t => t.id === lineup.teamId);
    if (!roster || !team) throw new Error(`seasonRoster: unknown team ${lineup.teamId}`);
    const car = pool.cars.find(c => c.id === roster.carId);
    if (!car) throw new Error(`seasonRoster: team ${lineup.teamId} has no car (${roster.carId})`);
    if (lineup.driverIds.length !== RACE_LINEUP || lineup.driverIds[0] === lineup.driverIds[1]) {
      throw new Error(`seasonRoster: team ${lineup.teamId} must field ${RACE_LINEUP} different drivers`);
    }
    const identity = { ...team, ...(opts.identities?.[team.id] ?? {}) };
    lineup.driverIds.forEach((driverId, slot) => {
      if (!roster.driverIds.includes(driverId)) throw new Error(`seasonRoster: driver ${driverId} is not on team ${lineup.teamId}`);
      const driver = pool.drivers.find(d => d.id === driverId);
      if (!driver) throw new Error(`seasonRoster: unknown driver ${driverId}`);
      const cards = cardsForDriver(pool, team.id, driverId, car.id, opts.cards);
      const adjusted = applyCards({ driver: driver.stats, car: car.stats, team: team.teamStats }, cards);
      out.push({
        id: driver.id,
        firstName: driver.firstName,
        lastName: driver.lastName,
        fullName: driver.fullName,
        shortName: driver.shortName,
        emoji: identity.emoji,
        color: identity.color,
        ink: identity.ink,
        teamName: identity.name,
        kingdomId: team.id,
        driverSlot: (slot + 1) as 1 | 2,
        backstory: driver.backstory,
        quirk: driver.quirk,
        stats: adjusted.driver!,
        carStats: adjusted.car,
        carName: car.name,
        teamStats: adjusted.team,
        number: driver.number,
        tags: [],
      });
    });
  }
  return out;
}
