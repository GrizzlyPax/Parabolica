// Season Mode draft (#314, docs/SEASON_MODE.md §3): one snake draft hands the
// shared pool out. Rounds 1–2 drivers, round 3 cars (the snake carries on, so
// whoever picked last in the last driver round picks a car first; Pax, Oct 8).
// Every team ends with 2 drivers + 1 car (#585: no bench). The draft itself goes
// when the run's rookie pick lands (#594).
//
// Facts, not state: the draft IS the ordered pick list. `draftState` derives
// whose turn it is, what's left and every roster from (pool, picks), so a
// saved season replays the draft exactly. AI picks are seeded per pick.
//
// Ranking is base stats only (Pax + Apex, Oct 8): traits stay sealed, and the
// AI reads the same 🟢/🟡/🔴 board a human sees.

import { mulberry32, deriveSeed, shuffle } from '../engine/rng';
import { snakeOrder } from '../fantasy/types';
import { fieldRanks, driverSkillScore, carPackageScore, type FieldRank } from '../betting/utils';
import { SQUAD_SIZE, type SeasonPool, type PoolDriver, type RackCar, type TeamRoster } from './genesis';

export const DRIVER_ROUNDS = SQUAD_SIZE;
export const CAR_ROUNDS = 1;
export const DRAFT_ROUNDS = DRIVER_ROUNDS + CAR_ROUNDS;

/** How often a CPU skips the best pick for a random one of the top few (Pax, Oct 8). */
export const AI_STATIC_CHANCE = 0.2;
export const AI_STATIC_TOP = 3;

export type PickKind = 'driver' | 'car';

/** One pick, as a fact. `id` is a driver id (number) or a car id (string). */
export interface DraftPick {
  pickNo: number;
  teamId: string;
  kind: PickKind;
  id: number | string;
}

/** A slot on the draft clock, before anyone has picked for it. */
export interface DraftSlot {
  pickNo: number;
  round: number;
  teamId: string;
  kind: PickKind;
}

export interface DraftState {
  picks: DraftPick[];
  /** Null once the draft is complete. */
  onTheClock: DraftSlot | null;
  done: boolean;
  availableDrivers: PoolDriver[];
  availableCars: RackCar[];
  rosters: Record<string, { driverIds: number[]; carId: string | null }>;
  /** Base-stat field ranks, for the board (and the AI). Cars keyed by car id. */
  ranks: { driver: Map<number, FieldRank>; car: Map<string, FieldRank> };
}

/** Opening order: a seeded shuffle of the teams. Round 1 of the Paddock is this reversed (#315). */
export function draftOrder(pool: SeasonPool): string[] {
  const rng = mulberry32(deriveSeed(pool.seed, 'season', 'draft-order'));
  return shuffle(pool.teams.map((_, i) => i), rng).map(i => pool.teams[i].id);
}

/** Every slot of the draft, in order. */
export function draftSlots(pool: SeasonPool): DraftSlot[] {
  const order = draftOrder(pool);
  return snakeOrder(order.length, DRAFT_ROUNDS).map((teamIndex, pickNo) => {
    const round = Math.floor(pickNo / order.length) + 1;
    return { pickNo, round, teamId: order[teamIndex], kind: round <= DRIVER_ROUNDS ? 'driver' : 'car' };
  });
}

/** Base-stat ranks for the whole pool; never tied. */
export function poolRanks(pool: SeasonPool): DraftState['ranks'] {
  const driver = fieldRanks(pool.drivers, d => [driverSkillScore(d), d.stats.baseSpeed]);
  const carRows = pool.cars.map((c, i) => ({ id: i, car: c }));
  const byIndex = fieldRanks(carRows, ({ car }) => [carPackageScore({ carStats: car.stats }), car.stats.power, car.stats.grip, car.stats.reliability]);
  const car = new Map(carRows.map(r => [r.car.id, byIndex.get(r.id)!]));
  return { driver, car };
}

/** Why a pick is illegal, or null when it's fine. */
export function validatePick(pool: SeasonPool, picks: DraftPick[], pick: DraftPick): string | null {
  const slots = draftSlots(pool);
  const slot = slots[picks.length];
  if (!slot) return 'the draft is complete';
  if (pick.pickNo !== slot.pickNo) return `pick ${pick.pickNo} is not next (${slot.pickNo} is)`;
  if (pick.teamId !== slot.teamId) return `${pick.teamId} is not on the clock (${slot.teamId} is)`;
  if (pick.kind !== slot.kind) return `pick ${slot.pickNo} is a ${slot.kind} pick`;
  if (picks.some(p => p.kind === pick.kind && p.id === pick.id)) return `${pick.kind} ${pick.id} is already taken`;
  if (pick.kind === 'driver') {
    if (!pool.drivers.some(d => d.id === pick.id)) return `no driver ${pick.id} in the pool`;
    if (picks.filter(p => p.teamId === pick.teamId && p.kind === 'driver').length >= SQUAD_SIZE) return `${pick.teamId} already has ${SQUAD_SIZE} drivers`;
  } else {
    if (!pool.cars.some(c => c.id === pick.id)) return `no car ${pick.id} in the rack`;
    if (picks.some(p => p.teamId === pick.teamId && p.kind === 'car')) return `${pick.teamId} already has a car`;
  }
  return null;
}

/** The picks with one more appended. Throws on an illegal pick. Pure. */
export function applyPick(pool: SeasonPool, picks: DraftPick[], pick: DraftPick): DraftPick[] {
  const why = validatePick(pool, picks, pick);
  if (why) throw new Error(`draft: ${why}`);
  return [...picks, pick];
}

/** Everything the board shows, derived from the pick list. Pure. */
export function draftState(pool: SeasonPool, picks: DraftPick[]): DraftState {
  const slots = draftSlots(pool);
  if (picks.length > slots.length) throw new Error(`draft: ${picks.length} picks for ${slots.length} slots`);
  const takenDrivers = new Set(picks.filter(p => p.kind === 'driver').map(p => p.id as number));
  const takenCars = new Set(picks.filter(p => p.kind === 'car').map(p => p.id as string));
  const rosters: DraftState['rosters'] = Object.fromEntries(pool.teams.map(t => [t.id, { driverIds: [] as number[], carId: null as string | null }]));
  for (const p of picks) {
    if (p.kind === 'driver') rosters[p.teamId].driverIds.push(p.id as number);
    else rosters[p.teamId].carId = p.id as string;
  }
  return {
    picks,
    onTheClock: slots[picks.length] ?? null,
    done: picks.length === slots.length,
    availableDrivers: pool.drivers.filter(d => !takenDrivers.has(d.id)),
    availableCars: pool.cars.filter(c => !takenCars.has(c.id)),
    rosters,
    ranks: poolRanks(pool),
  };
}

/**
 * The dumb AI: the best-ranked available driver (rounds 1–3) or car (round 4),
 * except 1 pick in 5 takes a random one of the best three. Seeded per pick on
 * deriveSeed(seed,'season','ai-pick',pickNo); always two rng draws.
 */
export function aiPick(pool: SeasonPool, picks: DraftPick[]): DraftPick {
  const state = draftState(pool, picks);
  const slot = state.onTheClock;
  if (!slot) throw new Error('draft: aiPick on a complete draft');
  const rng = mulberry32(deriveSeed(pool.seed, 'season', 'ai-pick', slot.pickNo));
  const staticRoll = rng();
  const which = rng();
  const ranked: (number | string)[] = slot.kind === 'driver'
    ? [...state.availableDrivers].sort((a, b) => state.ranks.driver.get(a.id)!.rank - state.ranks.driver.get(b.id)!.rank).map(d => d.id)
    : [...state.availableCars].sort((a, b) => state.ranks.car.get(a.id)!.rank - state.ranks.car.get(b.id)!.rank).map(c => c.id);
  const top = Math.min(AI_STATIC_TOP, ranked.length);
  const id = staticRoll < AI_STATIC_CHANCE ? ranked[Math.floor(which * top)] : ranked[0];
  return { pickNo: slot.pickNo, teamId: slot.teamId, kind: slot.kind, id };
}

/** Sim the whole rest of the draft, humans included. */
export function quickDraft(pool: SeasonPool, picks: DraftPick[] = []): DraftPick[] {
  let out = picks;
  while (!draftState(pool, out).done) out = applyPick(pool, out, aiPick(pool, out));
  return out;
}

/** Play CPU picks until a human is on the clock or the draft is done. */
export function advanceCpu(pool: SeasonPool, picks: DraftPick[], humanTeamIds: readonly string[]): DraftPick[] {
  let out = picks;
  for (;;) {
    const slot = draftState(pool, out).onTheClock;
    if (!slot || humanTeamIds.includes(slot.teamId)) return out;
    out = applyPick(pool, out, aiPick(pool, out));
  }
}

/** The finished draft as rosters for seasonRoster(). Throws if incomplete. */
export function draftedRosters(pool: SeasonPool, picks: DraftPick[]): TeamRoster[] {
  const state = draftState(pool, picks);
  if (!state.done) throw new Error('draft: not complete');
  return pool.teams.map(t => ({ teamId: t.id, driverIds: state.rosters[t.id].driverIds, carId: state.rosters[t.id].carId! }));
}
