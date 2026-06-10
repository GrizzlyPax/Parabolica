import { describe, it, expect } from 'vitest';
import RaceEngine, { TIRE_COMPOUNDS } from './RaceEngine';
import { CANON_VARIABLES } from './simlab/types';
import { generateRoster, GeneratedDriver } from './generators/drivers';
import { generateCarsForKingdoms, GeneratedCar } from './generators/cars';
import { ALL_TRACKS, Track } from './generators/tracks';
import { TEAMS } from './data/teams';

function createRosterWithCars(roster: GeneratedDriver[], cars: Map<string, GeneratedCar>) {
  return roster.map(driver => {
    const car = cars.get(driver.kingdomId);
    return {
      ...driver,
      carStats: car?.stats,
      carName: car?.name,
      teamStats: car?.teamStats,
      driverTag: driver.tag,
      carTag: car?.carTag,
      teamTag: car?.teamTag,
    };
  });
}

function runOneRace(track: Track) {
  const engine = RaceEngine.createForWorker(CANON_VARIABLES);
  const roster = generateRoster();
  const cars = generateCarsForKingdoms(TEAMS.map(t => t.id));
  engine.loadGeneratedRoster(createRosterWithCars(roster, cars));
  engine.updateConfig({ totalLaps: track.laps, lapLength: track.length });
  engine.setTrackInfo({
    id: track.id,
    name: track.name,
    emoji: track.emoji,
    funEmoji: track.funEmoji,
    description: track.description,
    laps: track.laps,
  });
  return engine.runHeadless();
}

describe('tire tuning consistency', () => {
  it('keeps the live-race tire table identical to CANON_VARIABLES (labs vs live drift)', () => {
    expect(TIRE_COMPOUNDS).toEqual(CANON_VARIABLES.tires);
  });
});

describe('headless race invariants', () => {
  const track = ALL_TRACKS[0];

  it('finishes within the tick safety limit', () => {
    const { raceState } = runOneRace(track);
    expect(raceState.raceFinished).toBe(true);
    expect(raceState.totalTicks).toBeLessThan(100000);
  });

  it('classifies every driver as finished or DNF, with a consistent finish order', () => {
    const { drivers, raceState } = runOneRace(track);

    expect(drivers.length).toBe(TEAMS.length * 2);
    for (const d of drivers) {
      expect(['finished', 'dnf']).toContain(d.status);
    }

    // finishOrder holds unique driver ids
    expect(new Set(raceState.finishOrder).size).toBe(raceState.finishOrder.length);

    // every classified finisher appears in finishOrder exactly once
    const finishers = drivers.filter(d => d.status === 'finished');
    for (const d of finishers) {
      expect(raceState.finishOrder).toContain(d.id);
    }
  });

  it('produces a sane DNF rate over a batch (catches blowout/crash tuning regressions)', () => {
    // Post-balance tuning targets ~20% DNF. Allow generous noise bounds,
    // but fail if we drift back toward the old ~70% rates.
    const races = 15;
    let dnfs = 0;
    let total = 0;
    for (let i = 0; i < races; i++) {
      const { drivers } = runOneRace(ALL_TRACKS[i % ALL_TRACKS.length]);
      dnfs += drivers.filter(d => d.status === 'dnf').length;
      total += drivers.length;
    }
    const dnfRate = dnfs / total;
    expect(dnfRate).toBeLessThan(0.45);
  });
});
