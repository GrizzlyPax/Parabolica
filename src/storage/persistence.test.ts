import { describe, it, expect } from 'vitest';
import {
  SeasonSnapshot,
  KeyValueStore,
  SCHEMA_VERSION,
  saveSeasonSnapshot,
  loadSeasonSnapshot,
  clearSeasonSnapshot,
  loadSeasonSummary,
} from './persistence';
import { createInitialSeasonState, updateSeasonWithRaceResult } from '../types/season';
import { mulberry32 } from '../engine/rng';
import { generateRosterFromTeams } from '../generators/drivers';
import { generateCarsForKingdoms } from '../generators/cars';
import { TEAMS } from '../data/teams';

function memoryStore(): KeyValueStore & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

function makeSnapshot(): SeasonSnapshot {
  const teamIds = TEAMS.slice(0, 4).map(t => t.id);
  const rng = mulberry32(123);
  const roster = generateRosterFromTeams(teamIds, rng);
  const cars = generateCarsForKingdoms(teamIds, rng);
  const rosterWithCars = roster.map(driver => {
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

  // A season with one race already recorded, so driverStats has real data.
  let seasonState = createInitialSeasonState(5, roster.map(d => d.id));
  const ids = roster.map(d => d.id);
  seasonState = updateSeasonWithRaceResult(
    seasonState,
    ids.slice(0, ids.length - 2),
    ids.slice(ids.length - 2),
    'Subpoena Day',
    '📋',
    ids[0]
  );

  return {
    seasonState,
    seasonKingdomIds: teamIds,
    seasonTrackIds: ['t1', 't2', 't3', 't4', 't5'],
    currentSeasonTrackIndex: 1,
    roster: rosterWithCars,
    marble: {
      bankroll: 230,
      seasonHistory: [
        {
          raceIndex: 0,
          trackName: 'Subpoena Day',
          bets: [],
          totalWagered: 500,
          totalWon: 730,
          netChange: 230,
        },
      ],
    },
    currentRaceNumber: 2,
  };
}

describe('season persistence', () => {
  it('round-trips a snapshot exactly, including the driverStats Map', () => {
    const store = memoryStore();
    const snapshot = makeSnapshot();

    expect(saveSeasonSnapshot(snapshot, store)).toBe(true);
    const loaded = loadSeasonSnapshot(store);

    expect(loaded).not.toBeNull();
    expect(loaded!.seasonState.driverStats).toBeInstanceOf(Map);
    expect(Object.fromEntries(loaded!.seasonState.driverStats))
      .toEqual(Object.fromEntries(snapshot.seasonState.driverStats));
    expect({ ...loaded!, seasonState: null }).toEqual({ ...snapshot, seasonState: null });
    expect(loaded!.seasonState.raceResults).toEqual(snapshot.seasonState.raceResults);
    expect(loaded!.seasonState.currentRace).toBe(snapshot.seasonState.currentRace);
  });

  it('returns null when nothing is saved', () => {
    expect(loadSeasonSnapshot(memoryStore())).toBeNull();
  });

  it('discards snapshots from a different schema version (archive-don\'t-migrate)', () => {
    const store = memoryStore();
    saveSeasonSnapshot(makeSnapshot(), store);
    const key = [...store.map.keys()][0];
    const tampered = JSON.parse(store.map.get(key)!);
    tampered.schemaVersion = SCHEMA_VERSION + 1;
    store.map.set(key, JSON.stringify(tampered));

    expect(loadSeasonSnapshot(store)).toBeNull();
  });

  it('survives corrupted JSON without throwing', () => {
    const store = memoryStore();
    saveSeasonSnapshot(makeSnapshot(), store);
    const key = [...store.map.keys()][0];
    store.map.set(key, '{"definitely": "not a season{{{');

    expect(loadSeasonSnapshot(store)).toBeNull();
  });

  it('clears a saved season', () => {
    const store = memoryStore();
    saveSeasonSnapshot(makeSnapshot(), store);
    clearSeasonSnapshot(store);
    expect(loadSeasonSnapshot(store)).toBeNull();
  });

  it('summarizes a saved season for the Resume card', () => {
    const store = memoryStore();
    saveSeasonSnapshot(makeSnapshot(), store);
    expect(loadSeasonSummary(store)).toEqual({
      currentRaceNumber: 2,
      totalRaces: 5,
      bankroll: 230,
    });
  });

  it('offers no summary for a completed season', () => {
    const store = memoryStore();
    const snapshot = makeSnapshot();
    snapshot.seasonState = { ...snapshot.seasonState, isComplete: true };
    saveSeasonSnapshot(snapshot, store);
    expect(loadSeasonSummary(store)).toBeNull();
  });

  it('works without any store (SSR / blocked storage)', () => {
    expect(saveSeasonSnapshot(makeSnapshot(), null)).toBe(false);
    expect(loadSeasonSnapshot(null)).toBeNull();
    expect(loadSeasonSummary(null)).toBeNull();
    expect(() => clearSeasonSnapshot(null)).not.toThrow();
  });
});
