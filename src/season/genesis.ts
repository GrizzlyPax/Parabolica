// Season Mode genesis (#313, docs/SEASON_MODE.md §2): the seed summons a
// SHARED POOL instead of two drivers per named team. `teams × 3` team-less
// drivers, a rack of `teams` cars (car stats only) and `teams` competitor
// teams (identity + the operational stats). The draft (#314) distributes the
// pool; the season loop (#315) turns picks + lineups into a race grid here.
//
// Streams are all new ('season', …) so Quick Race, leagues and the lab keep
// their 'genesis' / 'traits' streams untouched: the golden fingerprint must
// not move. Everything is derived from (seed, teamCount, ruleset); same inputs →
// deep-equal pool.
//
// Genesis rolls TRAIT CARDS (docs/CARDS.md): one slot per pool driver, per
// rack car and per competitor team (1-in-6 hit, metal odds 60/30/9/1, always
// three rng draws). No gear
// at genesis; every driver, car and team starts with one empty slot.

import { mulberry32, deriveSeed, shuffle, type Rng } from '../engine/rng';
import { generatePoolDriver, type PoolDriver as GeneratedPoolDriver } from '../generators/drivers';
import { generateRackCar, generateTeamStats, type CarStats, type TeamStats } from '../generators/cars';
import { rollRacingNumbers } from '../generators/racingNumbers';
import { teamIdentitiesForSeed } from '../generators/teamIdentity';
import { BASE_DECK_TEAMS } from '../data/deckTeams';
import { MOTORSPORT_DECK, cardsBy, pickCard, applyCards, applyPercents, favourPercents, DRIVER_STATS, CAR_STATS, TEAM_STATS, type Card, type CardStat, type CardTarget, type StatKey } from '../cards';
import { rawDeltas } from '../cards/apply';
import { Ruleset, defaultRuleset } from '../rules/ruleset';
import type { RosterDriver, LapEffect, EffectInfo } from '../RaceEngine';
import { rookieCar, rookieDriver, rookieTeamStats } from './rookies';
import { rivalGarages } from '../data/garages';
import type { Step } from '../look/step';

export const MIN_TEAMS = 5;
/** 21 since Ace America (#696): a 20-town State is 21 garages, 42 cars. */
export const MAX_TEAMS = 21;
export const DEFAULT_TEAMS = 10;
/** Drivers each team drafts: two, and both race (#585, Pax Oct 10: no bench). */
export const SQUAD_SIZE = 2;
export const RACE_LINEUP = 2;

export interface PoolDriver extends GeneratedPoolDriver {
  /** Racing number 2–99, unique on the grid, for life. */
  number: number;
  /** Born with (genesis roll). Permanent. */
  traits: Card[];
  /** Carried up a run (#597): only this team may draft them. */
  reservedFor?: string;
  /** The seed their portrait was rolled on (the league they were born in); absent = this pool's. */
  avatarSeed?: number;
}

export interface RackCar {
  id: string;
  name: string;
  stats: CarStats;
  quirk: string;
  traits: Card[];
  /** Carried up a run (#597): only this team may draft it. */
  reservedFor?: string;
  avatarSeed?: number;
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
  /** The nemesis (#626): last league's runner-up, promoted with you. Parked in the run (#696). */
  nemesis?: boolean;
  /** A rival garage's town (#696): at State, every town's Ace; absent at Locals (your town's garages). */
  town?: string;
}

/** A team's look, carried up without its people: the nemesis (#626). */
export type TeamIdentity = Pick<CompetitorTeam, 'name' | 'color' | 'ink' | 'emoji' | 'iconId' | 'deckTeamId'>;

export interface SeasonPool {
  seed: number;
  teamCount: number;
  drivers: PoolDriver[];
  cars: RackCar[];
  teams: CompetitorTeam[];
}

/** Card ids a team holds, by holder: the shape a team's cards carry up a run. */
export interface CarriedCards {
  /** Stamps (#704) by card: per driver card, and the car card (car + garage). Ids. */
  drivers: Record<number, string[]>;
  car: string[];
  /** Title stamps on each driver's ribbon (outside the slots). */
  titles?: Record<number, string[]>;
}

/**
 * The player's whole team, promoted into the next league of a run (#597):
 * drivers, car and team keep their ids, stats, traits and numbers; the cards
 * log starts from these. The pool places them first and reserves them for
 * `teamId`; generated rivals fill the other slots.
 */
export interface CarriedTeam {
  teamId: string;
  drivers: PoolDriver[];
  car: RackCar;
  team: CompetitorTeam;
  cards: CarriedCards;
  /** The league's runner-up comes up too, as the nemesis (#626): the look
   * only; its drivers, car and stats are rolled fresh at the new level. */
  nemesis?: TeamIdentity;
  /** Timed effects still live (#332), re-dated so their races left hold. */
  effects?: import('./effects').EffectFact[];
}

/** Which league of a run this season is (#597). Rival levels (#626) and the
 * boss race (#593) read it; absent = a stand-alone season. */
export interface LeagueContext {
  /** 0-based step on the ladder. */
  index: number;
  /** The step (#696): Locals · State · Nationals; the theme and the words read it. */
  step?: Step;
  name: string;
  /** Grade points added to every stat a rival rolls (#626; 0 until it lands). */
  fieldShift: number;
  /** …and the nemesis's extra (#626). */
  nemesisShift: number;
  /** The round that is the boss race (#593): the last one. */
  bossRound: number;
  /** Where the step is raced (#696): your state and town, and the rival towns at State (empty at Locals). Rival garages are named from it. */
  locale?: { stateId: string; town: string; rivalTowns: string[] };
}

export interface SeasonPoolOptions {
  carry?: CarriedTeam;
  league?: LeagueContext;
  /** A run's field (#660): fresh drivers, cars and teams are rookie rolls (no genesis traits),
   * and the first fresh team is the nemesis. Absent = genesis rolls (Quick Race, the lab). */
  rookies?: boolean;
}

/** One slot: does it hit? → which metal? → which card? Always three rng()
 * draws (one here, two in pickCard) so odds changes never shift the stream. */
function maybeTrait(target: CardTarget, rs: Ruleset, rng: Rng): Card | null {
  const roll = rng();
  const pick = pickCard(cardsBy({ kind: 'trait', target }, MOTORSPORT_DECK), rs.traits.rarityOdds, rng);
  return roll < rs.traits.genesisChance ? pick : null;
}

function traitsFor(target: CardTarget, seed: number, id: string | number, rs: Ruleset): Card[] {
  const rng = mulberry32(deriveSeed(seed, 'season', 'traits', target, id));
  const t = maybeTrait(target, rs, rng);
  return t ? [t] : [];
}

/** CPU identities: a seeded, no-repeat draw from the World Deck teams. The
 * procedural generator only fills in if the deck runs short. Humans overwrite
 * name and colour later, as facts. */
function teamIdentities(seed: number, count: number, exclude: Set<string> = new Set()): TeamIdentity[] {
  const rng = mulberry32(deriveSeed(seed, 'season', 'teams'));
  type Identity = TeamIdentity;
  const picked: Identity[] = shuffle(BASE_DECK_TEAMS, rng).filter(t => !exclude.has(t.id)).slice(0, count).map(t => ({
    name: t.name, color: t.color, ink: t.ink, emoji: t.emoji, iconId: t.iconId, deckTeamId: t.id,
  }));
  if (picked.length < count) {
    const extra = teamIdentitiesForSeed(deriveSeed(seed, 'season', 'teams', 'extra'), count - picked.length);
    extra.forEach((e, i) => picked.push({ name: `Team ${picked.length + i + 1}`, color: e.color, ink: '#FFFFFF', emoji: e.emoji }));
  }
  return picked;
}

/** Generated ids in league L of a run start at L × this, so a team carried up
 * keeps its own ids and never collides with the new field (#597). */
export const LEAGUE_ID_STRIDE = 100;

/**
 * The whole universe for a season. Pure. With `carry` (a run's later league,
 * #597) the carried team comes first, reserved for its owner, and the
 * generator fills the remaining slots with fresh rivals whose ids start at
 * `league.index × LEAGUE_ID_STRIDE`. A stand-alone season (no options) is
 * exactly what it was.
 */
export function generateSeasonPool(seed: number, teamCount: number = DEFAULT_TEAMS, rs: Ruleset = defaultRuleset(), opts: SeasonPoolOptions = {}): SeasonPool {
  if (!Number.isInteger(teamCount) || teamCount < MIN_TEAMS || teamCount > MAX_TEAMS) {
    throw new Error(`generateSeasonPool: teamCount must be ${MIN_TEAMS}–${MAX_TEAMS}, got ${teamCount}`);
  }
  const carry = opts.carry;
  const rookies = !!opts.rookies;
  const base = (opts.league?.index ?? 0) * LEAGUE_ID_STRIDE;
  const fresh = teamCount - (carry ? 1 : 0);
  const taken = new Set(carry?.drivers.map(d => d.number) ?? []);

  // Rookie fields (#660) roll on their own streams; the genesis streams below are untouched.
  const driverRng = mulberry32(deriveSeed(seed, 'season', rookies ? 'rookies' : 'drivers'));
  // Roll a full grid of numbers and skip the carried team's: unique on the grid.
  const numbers = rollRacingNumbers(teamCount * SQUAD_SIZE, mulberry32(deriveSeed(seed, 'season', 'numbers'))).filter(n => !taken.has(n));
  const drivers: PoolDriver[] = carry ? carry.drivers.map(d => ({ ...d, reservedFor: carry.teamId })) : [];
  for (let i = 0; i < fresh * SQUAD_SIZE; i++) {
    const id = base + i;
    if (rookies) {
      drivers.push(rookieDriver(id, numbers[i], driverRng));
    } else {
      drivers.push({ ...generatePoolDriver(id, driverRng), number: numbers[i], traits: traitsFor('driver', seed, id, rs) });
    }
  }

  const carRng = mulberry32(deriveSeed(seed, 'season', rookies ? 'rookie-cars' : 'cars'));
  const cars: RackCar[] = carry ? [{ ...carry.car, reservedFor: carry.teamId }] : [];
  const carNames = new Set<string>(carry ? [carry.car.name] : []);
  for (let i = 0; i < fresh; i++) {
    const id = `car-${base + i}`;
    cars.push(rookies ? rookieCar(id, carRng, carNames) : { ...generateRackCar(id, carRng, carNames), traits: traitsFor('car', seed, id, rs) });
  }

  const statsRng = mulberry32(deriveSeed(seed, 'season', rookies ? 'rookie-teams' : 'team-stats'));
  const teams: CompetitorTeam[] = carry ? [carry.team] : [];
  // The nemesis (#626, parked in the run #696) wears last league's runner-up's
  // look on the first fresh slot when one is carried; the deck never deals
  // that look twice. Its stats are the level's (rivalShifts).
  const nemesis = carry?.nemesis;
  const exclude = new Set<string>([carry?.team.deckTeamId, nemesis?.deckTeamId].filter((x): x is string => !!x));
  // A run's rivals are local garages (#695): generic names on their own stream, each with its town at State.
  const locale = opts.league?.locale;
  const identities: (TeamIdentity & { town?: string })[] = locale
    ? rivalGarages(mulberry32(deriveSeed(seed, 'season', 'garages')), fresh, locale.rivalTowns, [carry?.team.name ?? '']).map(g => ({ name: g.name, color: g.color, ink: g.ink, emoji: '', iconId: g.iconId, town: g.town }))
    : teamIdentities(seed, fresh, exclude);
  identities.forEach((identity, i) => {
    const id = `team-${base + i}`;
    const look = i === 0 && nemesis ? nemesis : identity;
    const teamStats = rookies ? rookieTeamStats(statsRng) : generateTeamStats(statsRng);
    teams.push({ id, ...look, teamStats, traits: rookies ? [] : traitsFor('team', seed, id, rs), ...(i === 0 && nemesis ? { nemesis: true } : {}) });
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
  /** Rival levels (#626): grade points added to EVERY stat of a team's
   * drivers, car and team at race build, after cards. Keyed by team id;
   * teams not named (the player) race their rolled stats. */
  shifts?: Record<string, number>;
  /** Timed effects (#332), keyed by driver id: race-timed grade points
   * (applied after cards, before the rival shift), lap effects the engine
   * runs, and what to show. */
  effects?: { points: Record<number, CardStat[]>; laps: Record<number, LapEffect[]>; infos: Record<number, EffectInfo[]> };
  /** The race's lap count: a half-race window card (#647) becomes a lap effect over that half. Absent = window cards sit out. */
  laps?: number;
}

/** A window card's lap window: the first half rounds up, the second takes the rest. */
export function windowLaps(window: 'first' | 'second', laps: number): { fromLap: number; laps: number } {
  const half = Math.ceil(laps / 2);
  return window === 'first' ? { fromLap: 0, laps: half } : { fromLap: half, laps: laps - half };
}

/** Window cards (#647) as lap effects for the engine, plus what to show. */
export function windowEffects(cards: readonly Card[], laps: number | undefined): { laps: LapEffect[]; infos: EffectInfo[] } {
  const out = { laps: [] as LapEffect[], infos: [] as EffectInfo[] };
  if (!laps) return out;
  for (const c of cards) {
    if (!c.window) continue;
    const w = windowLaps(c.window, laps);
    out.laps.push({ id: c.id, name: c.name, emoji: '', ...w, ...rawDeltas(c.stats) });
    out.infos.push({ id: c.id, name: c.name, emoji: '', source: 'gear', left: `${c.window} half` });
  }
  return out;
}

const ALL_STATS: StatKey[] = [...DRIVER_STATS, ...CAR_STATS, ...TEAM_STATS];
/** A star stat never drops below this, however deep the Juniors sit. */
export const STAR_FLOOR = 0.5;

/** Every stat of a block up or down by `points` grade (the card math), stars floored. */
export function shiftStats<T extends { driver?: DriverStatsLike; car?: CarStats; team?: TeamStats }>(block: T, points: number): T {
  if (!points) return block;
  const pcts = Object.fromEntries(ALL_STATS.map(k => [k, points])) as Partial<Record<StatKey, number>>;
  const out = applyPercents(block, pcts) as T;
  const floor = <S extends object | undefined>(s: S): S => s ? (Object.fromEntries(Object.entries(s).map(([k, v]) => [k, Math.max(STAR_FLOOR, v as number)])) as S) : s;
  return { ...out, car: floor(out.car), team: floor(out.team) };
}
type DriverStatsLike = RosterDriver['stats'];

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
 * every card baked into those stats with applyCards. Pure; grid order =
 * lineup order, then lineup slot.
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
      const carded = applyCards({ driver: driver.stats, car: car.stats, team: team.teamStats }, cards);
      const points = opts.effects?.points[driverId];
      const timed = points?.length ? applyPercents(carded, favourPercents(points)) : carded;
      const adjusted = shiftStats(timed, opts.shifts?.[team.id] ?? 0);
      // Half-race window cards (#647) run on the lap timer, after the timed effects.
      const windows = windowEffects(cards, opts.laps);
      const lapEffects = [...(opts.effects?.laps[driverId] ?? []), ...windows.laps];
      const infos = [...(opts.effects?.infos[driverId] ?? []), ...windows.infos];
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
        // Display only: already baked into the stats above. The race view shows them (#451).
        cards,
        effects: infos.length ? infos : undefined,
        lapEffects: lapEffects.length ? lapEffects : undefined,
      });
    });
  }
  return out;
}
