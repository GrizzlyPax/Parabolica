// #314: the draft engine. Snake order, facts, dumb AI, Quick Draft, CPU auto-advance.
import { describe, it, expect } from 'vitest';
import { generateSeasonPool, seasonRoster, SQUAD_SIZE } from './genesis';
import {
  draftOrder, draftSlots, draftState, validatePick, applyPick, aiPick, quickDraft, advanceCpu, draftedRosters,
  DRAFT_ROUNDS, AI_STATIC_CHANCE, AI_STATIC_TOP, type DraftPick,
} from './draft';
import { snakeOrder } from '../fantasy/types';

describe('draft order and slots', () => {
  it('is a seeded shuffle of the teams, snaked over 3 rounds (2 drivers, #585), cars last', () => {
    const pool = generateSeasonPool(11, 10);
    const order = draftOrder(pool);
    expect([...order].sort()).toEqual(pool.teams.map(t => t.id).sort());
    expect(order).toEqual(draftOrder(generateSeasonPool(11, 10)));
    expect(order).not.toEqual(draftOrder(generateSeasonPool(12, 10)));
    const slots = draftSlots(pool);
    expect(slots).toHaveLength(10 * DRAFT_ROUNDS);
    expect(slots.map(s => s.teamId)).toEqual(snakeOrder(10, DRAFT_ROUNDS).map(i => order[i]));
    expect(slots.slice(0, 20).every(s => s.kind === 'driver')).toBe(true);
    expect(slots.slice(20).every(s => s.kind === 'car')).toBe(true);
    // Two driver rounds (#585), then cars; the snake carries on: last in round 2 picks a car first.
    expect(slots[20].teamId).toBe(slots[19].teamId);
    expect(slots[29].teamId).toBe(order[9]);
  });
});

describe('quickDraft', () => {
  it.each([5, 10])('%i teams: every team ends with 3 drivers + 1 car, no duplicates, and replays identically', (n) => {
    const pool = generateSeasonPool(21, n);
    const picks = quickDraft(pool);
    expect(picks).toHaveLength(n * DRAFT_ROUNDS);
    expect(picks.map(p => p.pickNo)).toEqual(picks.map((_, i) => i));
    const state = draftState(pool, picks);
    expect(state.done).toBe(true);
    expect(state.onTheClock).toBeNull();
    expect(state.availableDrivers).toEqual([]);
    expect(state.availableCars).toEqual([]);
    const allDrivers = Object.values(state.rosters).flatMap(r => r.driverIds);
    expect(allDrivers).toHaveLength(n * SQUAD_SIZE);
    expect(new Set(allDrivers).size).toBe(n * SQUAD_SIZE);
    const allCars = Object.values(state.rosters).map(r => r.carId);
    expect(new Set(allCars).size).toBe(n);
    for (const r of Object.values(state.rosters)) { expect(r.driverIds).toHaveLength(SQUAD_SIZE); expect(r.carId).not.toBeNull(); }
    expect(quickDraft(generateSeasonPool(21, n))).toEqual(picks);
    // And the result races.
    const rosters = draftedRosters(pool, picks);
    const grid = seasonRoster(pool, rosters, rosters.map(r => ({ teamId: r.teamId, driverIds: [r.driverIds[0], r.driverIds[1]] as [number, number] })));
    expect(grid).toHaveLength(n * 2);
  });

  it('the first pick is the best driver on the board (unless static), and the AI adds static about 1 pick in 5', () => {
    let deviations = 0, picksMade = 0, firstBest = 0;
    const SEEDS = 60;
    for (let seed = 0; seed < SEEDS; seed++) {
      const pool = generateSeasonPool(1000 + seed, 10);
      let picks: DraftPick[] = [];
      while (!draftState(pool, picks).done) {
        const state = draftState(pool, picks);
        const slot = state.onTheClock!;
        const best = slot.kind === 'driver'
          ? [...state.availableDrivers].sort((a, b) => state.ranks.driver.get(a.id)!.rank - state.ranks.driver.get(b.id)!.rank)[0].id
          : [...state.availableCars].sort((a, b) => state.ranks.car.get(a.id)!.rank - state.ranks.car.get(b.id)!.rank)[0].id;
        const pick = aiPick(pool, picks);
        if (pick.id !== best) deviations++;
        if (slot.pickNo === 0 && pick.id === best) firstBest++;
        picksMade++;
        picks = applyPick(pool, picks, pick);
      }
    }
    // A static pick lands on the best one time in AI_STATIC_TOP, so the visible rate is 0.2 × 2/3.
    const expected = AI_STATIC_CHANCE * (1 - 1 / AI_STATIC_TOP);
    expect(deviations / picksMade).toBeGreaterThan(expected - 0.05);
    expect(deviations / picksMade).toBeLessThan(expected + 0.05);
    expect(firstBest / SEEDS).toBeGreaterThan(0.7);
  });
});

describe('validation', () => {
  it('rejects illegal picks and accepts the legal one', () => {
    const pool = generateSeasonPool(5, 5);
    const slot = draftSlots(pool)[0];
    const other = pool.teams.find(t => t.id !== slot.teamId)!.id;
    const d0 = pool.drivers[0].id;
    expect(validatePick(pool, [], { pickNo: 1, teamId: slot.teamId, kind: 'driver', id: d0 })).toMatch(/not next/);
    expect(validatePick(pool, [], { pickNo: 0, teamId: other, kind: 'driver', id: d0 })).toMatch(/not on the clock/);
    expect(validatePick(pool, [], { pickNo: 0, teamId: slot.teamId, kind: 'car', id: 'car-0' })).toMatch(/driver pick/);
    expect(validatePick(pool, [], { pickNo: 0, teamId: slot.teamId, kind: 'driver', id: 999 })).toMatch(/no driver/);
    expect(validatePick(pool, [], { pickNo: 0, teamId: slot.teamId, kind: 'driver', id: d0 })).toBeNull();
    const picks = applyPick(pool, [], { pickNo: 0, teamId: slot.teamId, kind: 'driver', id: d0 });
    const slot1 = draftSlots(pool)[1];
    expect(validatePick(pool, picks, { pickNo: 1, teamId: slot1.teamId, kind: 'driver', id: d0 })).toMatch(/already taken/);
    expect(() => applyPick(pool, picks, { pickNo: 1, teamId: slot1.teamId, kind: 'driver', id: d0 })).toThrow();
    // A complete draft takes nothing more.
    const full = quickDraft(pool);
    expect(validatePick(pool, full, { pickNo: 20, teamId: slot.teamId, kind: 'car', id: 'car-0' })).toMatch(/complete/);
    expect(() => aiPick(pool, full)).toThrow();
  });

  it('the car round only takes cars, one per team', () => {
    const pool = generateSeasonPool(6, 5);
    let picks: DraftPick[] = [];
    for (let i = 0; i < 10; i++) picks = applyPick(pool, picks, aiPick(pool, picks));
    const slot = draftSlots(pool)[10];
    expect(slot.kind).toBe('car');
    expect(validatePick(pool, picks, { pickNo: 10, teamId: slot.teamId, kind: 'driver', id: pool.drivers[0].id })).toMatch(/car pick/);
    picks = applyPick(pool, picks, { pickNo: 10, teamId: slot.teamId, kind: 'car', id: 'car-2' });
    const next = draftSlots(pool)[11];
    expect(validatePick(pool, picks, { pickNo: 11, teamId: next.teamId, kind: 'car', id: 'car-2' })).toMatch(/already taken/);
  });
});

describe('advanceCpu', () => {
  it('with one human, stops exactly on the human’s picks and finishes when they are done', () => {
    const pool = generateSeasonPool(33, 10);
    const human = draftOrder(pool)[4];
    const humanSlots = draftSlots(pool).filter(s => s.teamId === human).map(s => s.pickNo);
    expect(humanSlots).toHaveLength(DRAFT_ROUNDS);
    let picks: DraftPick[] = [];
    const stops: number[] = [];
    for (;;) {
      picks = advanceCpu(pool, picks, [human]);
      const state = draftState(pool, picks);
      if (state.done) break;
      expect(state.onTheClock!.teamId).toBe(human);
      stops.push(state.onTheClock!.pickNo);
      // The human takes the top of the board, like the AI would.
      picks = applyPick(pool, picks, aiPick(pool, picks));
    }
    expect(stops).toEqual(humanSlots);
    expect(draftState(pool, picks).done).toBe(true);
  });

  it('with two humans (hotseat), hands over to whichever human is on the clock', () => {
    const pool = generateSeasonPool(34, 6);
    const [a, b] = [draftOrder(pool)[0], draftOrder(pool)[5]];
    let picks: DraftPick[] = advanceCpu(pool, [], [a, b]);
    expect(draftState(pool, picks).onTheClock!.teamId).toBe(a);
    picks = applyPick(pool, picks, aiPick(pool, picks));
    picks = advanceCpu(pool, picks, [a, b]);
    expect(draftState(pool, picks).onTheClock!.teamId).toBe(b);
    picks = applyPick(pool, picks, aiPick(pool, picks));
    picks = advanceCpu(pool, picks, [a, b]);
    // Round 2 snakes back: b picks again straight away.
    expect(draftState(pool, picks).onTheClock!.teamId).toBe(b);
  });
});
