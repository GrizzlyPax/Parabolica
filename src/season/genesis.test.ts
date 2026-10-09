// #313: shared-pool genesis. Shape, determinism and the race-time roster.
import { describe, it, expect } from 'vitest';
import { generateSeasonPool, seasonRoster, cardsForDriver, SQUAD_SIZE, type TeamRoster, type Lineup, type SeasonPool } from './genesis';
import { CARDS_BY_ID } from '../cards';
import { rollRacingNumbers, racingNumberWeight } from '../generators/racingNumbers';
import { mulberry32 } from '../engine/rng';
import { BASE_DECK_TEAMS } from '../data/deckTeams';
import RaceEngine from '../RaceEngine';

/** Every team takes its slot's drivers and car, in pool order. */
function naiveDraft(pool: SeasonPool): { rosters: TeamRoster[]; lineups: Lineup[] } {
  const rosters = pool.teams.map((t, i) => ({
    teamId: t.id,
    driverIds: pool.drivers.slice(i * SQUAD_SIZE, (i + 1) * SQUAD_SIZE).map(d => d.id),
    carId: pool.cars[i].id,
  }));
  const lineups = rosters.map(r => ({ teamId: r.teamId, driverIds: [r.driverIds[0], r.driverIds[1]] as [number, number] }));
  return { rosters, lineups };
}

describe('generateSeasonPool', () => {
  it.each([5, 10])('a %i-team pool has teams×3 drivers, a car and a team per slot', (n) => {
    const pool = generateSeasonPool(7, n);
    expect(pool.drivers).toHaveLength(n * 3);
    expect(pool.cars).toHaveLength(n);
    expect(pool.teams).toHaveLength(n);
    expect(new Set(pool.drivers.map(d => d.id)).size).toBe(n * 3);
    expect(new Set(pool.cars.map(c => c.id)).size).toBe(n);
    expect(new Set(pool.teams.map(t => t.id)).size).toBe(n);
    // A rack car is car stats only; the team holds the operational stats.
    for (const c of pool.cars) expect(Object.keys(c.stats).sort()).toEqual(['grip', 'power', 'reliability']);
    for (const t of pool.teams) expect(Object.keys(t.teamStats).sort()).toEqual(['pitCrew', 'tireManagement']);
  });

  it('same seed → deep-equal pool; different seeds differ', () => {
    expect(generateSeasonPool(1234, 10)).toEqual(generateSeasonPool(1234, 10));
    const a = generateSeasonPool(1, 10), b = generateSeasonPool(2, 10);
    expect(a.drivers.map(d => d.fullName)).not.toEqual(b.drivers.map(d => d.fullName));
    expect(a.cars.map(c => c.stats)).not.toEqual(b.cars.map(c => c.stats));
  });

  it('rejects grids outside 5–10 teams', () => {
    expect(() => generateSeasonPool(1, 4)).toThrow();
    expect(() => generateSeasonPool(1, 11)).toThrow();
  });

  it('CPU team identities come from the World Deck teams, no repeats', () => {
    const pool = generateSeasonPool(99, 10);
    const ids = pool.teams.map(t => t.deckTeamId);
    expect(new Set(ids).size).toBe(10);
    for (const t of pool.teams) {
      const deck = BASE_DECK_TEAMS.find(d => d.id === t.deckTeamId)!;
      expect(deck).toBeTruthy();
      expect(t.name).toBe(deck.name);
      expect(t.color).toBe(deck.color);
    }
  });

  it('genesis deals trait cards only, from the right pool, and no gear', () => {
    let hits = 0, slots = 0;
    for (let seed = 0; seed < 40; seed++) {
      const pool = generateSeasonPool(seed, 10);
      for (const d of pool.drivers) { slots++; hits += d.traits.length; for (const c of d.traits) { expect(c.kind).toBe('trait'); expect(c.target).toBe('driver'); } }
      for (const c of pool.cars) { slots++; hits += c.traits.length; for (const t of c.traits) { expect(t.kind).toBe('trait'); expect(t.target).toBe('car'); } }
      for (const t of pool.teams) { slots++; hits += t.traits.length; for (const c of t.traits) { expect(c.kind).toBe('trait'); expect(c.target).toBe('team'); } }
    }
    // 1-in-6 per slot, like the tag roll.
    expect(hits / slots).toBeGreaterThan(1 / 6 - 0.04);
    expect(hits / slots).toBeLessThan(1 / 6 + 0.04);
  });

  it('racing numbers: 2–99, unique, same seed → same numbers', () => {
    const a = generateSeasonPool(5, 10), b = generateSeasonPool(5, 10);
    const nums = a.drivers.map(d => d.number);
    expect(nums).toEqual(b.drivers.map(d => d.number));
    expect(new Set(nums).size).toBe(30);
    for (const n of nums) { expect(n).toBeGreaterThanOrEqual(2); expect(n).toBeLessThanOrEqual(99); }
  });
});

describe('rollRacingNumbers', () => {
  it('weights follow the bands', () => {
    expect(racingNumberWeight(2)).toBe(20);
    expect(racingNumberWeight(9)).toBe(20);
    expect(racingNumberWeight(11)).toBe(6);
    expect(racingNumberWeight(99)).toBe(6);
    expect(racingNumberWeight(10)).toBe(4);
    expect(racingNumberWeight(29)).toBe(4);
    expect(racingNumberWeight(30)).toBe(2);
    expect(racingNumberWeight(50)).toBe(1);
  });

  it('over 1,000 seeded 30-driver grids, single digits are nearly always taken and the median is low', () => {
    const GRIDS = 1000;
    const takenCount = new Map<number, number>();
    const medians: number[] = [];
    for (let seed = 0; seed < GRIDS; seed++) {
      const nums = rollRacingNumbers(30, mulberry32(seed));
      expect(new Set(nums).size).toBe(30);
      for (const n of nums) takenCount.set(n, (takenCount.get(n) ?? 0) + 1);
      const sorted = [...nums].sort((x, y) => x - y);
      medians.push((sorted[14] + sorted[15]) / 2);
    }
    for (let n = 2; n <= 9; n++) expect((takenCount.get(n) ?? 0) / GRIDS, `#${n}`).toBeGreaterThanOrEqual(0.9);
    expect(takenCount.get(1)).toBeUndefined();
    const medianOfMedians = medians.sort((x, y) => x - y)[GRIDS / 2];
    expect(medianOfMedians).toBeLessThan(30);
  });
});

describe('seasonRoster', () => {
  it('builds a valid 2-per-team grid from a hand-written pick set', () => {
    const pool = generateSeasonPool(42, 5);
    const { rosters, lineups } = naiveDraft(pool);
    const grid = seasonRoster(pool, rosters, lineups);
    expect(grid).toHaveLength(10);
    expect(new Set(grid.map(d => d.id)).size).toBe(10);
    for (const team of pool.teams) {
      const rows = grid.filter(d => d.kingdomId === team.id);
      expect(rows).toHaveLength(2);
      expect(rows.map(d => d.driverSlot)).toEqual([1, 2]);
      for (const r of rows) {
        expect(r.teamName).toBe(team.name);
        expect(r.color).toBe(team.color);
        expect(r.carName).toBe(pool.cars.find(c => c.id === rosters.find(x => x.teamId === team.id)!.carId)!.name);
        expect(typeof r.number).toBe('number');
      }
    }
    // The engine accepts it and races deterministically.
    const run = (seed: number) => {
      const e = RaceEngine.createForWorker();
      e.loadGeneratedRoster(seasonRoster(pool, rosters, lineups));
      e.updateConfig({ totalLaps: 5 });
      const r = e.runHeadless(seed);
      return { finish: r.raceState.finishOrder, drivers: r.drivers.length };
    };
    expect(run(7)).toEqual(run(7));
    expect(run(7).drivers).toBe(10);
  });

  it('bakes traits and dealt cards into the stats (traits stack, gear by entity)', () => {
    const pool = generateSeasonPool(3, 5);
    // Strip genesis traits so the maths is exact.
    for (const d of pool.drivers) d.traits = [];
    for (const c of pool.cars) c.traits = [];
    for (const t of pool.teams) t.traits = [];
    const { rosters, lineups } = naiveDraft(pool);
    const [teamId, driverId, carId] = [rosters[0].teamId, rosters[0].driverIds[0], rosters[0].carId];
    pool.drivers.find(d => d.id === driverId)!.traits = [CARDS_BY_ID.get('tr-driver-silver-speed')!]; // +10 grade speed
    const cards = {
      driver: { [driverId]: [CARDS_BY_ID.get('eq-gold-speed+consistency')!] },  // +10 speed, +10 consistency
      car: { [carId]: [CARDS_BY_ID.get('up-bronze-power')!] },                   // +5 grade power (+0.2★)
      team: { [teamId]: [CARDS_BY_ID.get('fa-silver-pit-crew')!] },              // +10 grade pit crew (+0.4★), both racers
    };
    // #335: a card adds grade points: pct × the stat's span / 100 (speed span 0.30, consistency 0.5, stars 4).
    const spd = (g: number) => (g * 0.30) / 100, con = (g: number) => (g * 0.5) / 100, star = (g: number) => (g * 4) / 100;
    const base = seasonRoster(pool, rosters, lineups);
    const boosted = seasonRoster(pool, rosters, lineups, { cards });
    const raw = pool.drivers.find(d => d.id === driverId)!.stats;
    const b0 = base.find(d => d.id === driverId)!, x0 = boosted.find(d => d.id === driverId)!;
    expect(b0.stats.baseSpeed).toBeCloseTo(raw.baseSpeed + spd(10), 10);       // the trait alone
    expect(x0.stats.baseSpeed).toBeCloseTo(raw.baseSpeed + spd(20), 10);       // trait + equipment, additive
    expect(x0.stats.consistency).toBeCloseTo(raw.consistency + con(10), 10);
    expect(x0.stats.luck).toBe(raw.luck);
    expect(x0.carStats!.power).toBeCloseTo(b0.carStats!.power + star(5), 10);
    expect(x0.carStats!.grip).toBe(b0.carStats!.grip);
    expect(x0.teamStats!.pitCrew).toBeCloseTo(b0.teamStats!.pitCrew + star(10), 10);
    // The teammate shares the car and the facility, not the equipment or the trait.
    const mate = rosters[0].driverIds[1];
    const b1 = base.find(d => d.id === mate)!, x1 = boosted.find(d => d.id === mate)!;
    expect(x1.stats).toEqual(b1.stats);
    expect(x1.carStats!.power).toBeCloseTo(b1.carStats!.power + star(5), 10);
    expect(x1.teamStats!.pitCrew).toBeCloseTo(b1.teamStats!.pitCrew + star(10), 10);
    // Rivals untouched.
    const rival = rosters[1].driverIds[0];
    expect(boosted.find(d => d.id === rival)).toEqual(base.find(d => d.id === rival));
    expect(cardsForDriver(pool, teamId, driverId, carId, cards).map(c => c.id)).toEqual([
      'tr-driver-silver-speed', 'eq-gold-speed+consistency', 'up-bronze-power', 'fa-silver-pit-crew',
    ]);
  });

  it('human identity overrides replace name and colour, never the stats', () => {
    const pool = generateSeasonPool(8, 5);
    const { rosters, lineups } = naiveDraft(pool);
    const teamId = pool.teams[2].id;
    const grid = seasonRoster(pool, rosters, lineups, { identities: { [teamId]: { name: 'Pax Racing', color: '#123456' } } });
    const rows = grid.filter(d => d.kingdomId === teamId);
    expect(rows.map(d => d.teamName)).toEqual(['Pax Racing', 'Pax Racing']);
    expect(rows.map(d => d.color)).toEqual(['#123456', '#123456']);
    expect(rows[0].teamStats).toEqual(seasonRoster(pool, rosters, lineups).filter(d => d.kingdomId === teamId)[0].teamStats);
  });

  it('rejects a lineup that is not two different drafted drivers', () => {
    const pool = generateSeasonPool(8, 5);
    const { rosters, lineups } = naiveDraft(pool);
    const bad = [...lineups];
    bad[0] = { teamId: lineups[0].teamId, driverIds: [rosters[0].driverIds[0], rosters[0].driverIds[0]] };
    expect(() => seasonRoster(pool, rosters, bad)).toThrow();
    bad[0] = { teamId: lineups[0].teamId, driverIds: [rosters[0].driverIds[0], rosters[1].driverIds[0]] };
    expect(() => seasonRoster(pool, rosters, bad)).toThrow();
  });
});
