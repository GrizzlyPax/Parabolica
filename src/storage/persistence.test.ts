import { describe, it, expect } from 'vitest';
import {
  KeyValueStore,
  SCHEMA_VERSION,
  saveLeagueState,
  loadLeagueState,
  clearLeagueState,
} from './persistence';
import { createLeague } from '../league/league';
import { settleLeague } from '../league/settle';
import { CURRENT_TRACKS } from '../generators/tracks';
import { TEAMS } from '../data/teams';

const HOUR = 3_600_000;
const T0 = 1_750_000_000_000;

function memoryStore(): KeyValueStore & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

// A league with two races settled, so season.driverStats has real data.
function makeLeague() {
  const league = createLeague(123, {
    name: 'Persistence League',
    godId: 'the-scrap-heap',
    teamIds: TEAMS.slice(0, 4).map(t => t.id),
    trackIds: CURRENT_TRACKS.slice(0, 4).map(t => t.id),
    raceIntervalMs: 3 * HOUR,
    createdAt: T0,
  });
  return settleLeague(league, { now: T0 + 6 * HOUR }).league;
}

describe('league persistence', () => {
  it('round-trips a league exactly, including the driverStats Map', () => {
    const store = memoryStore();
    const league = makeLeague();

    expect(saveLeagueState(league, store)).toBe(true);
    const loaded = loadLeagueState(store);

    expect(loaded).not.toBeNull();
    expect(loaded!.season.driverStats).toBeInstanceOf(Map);
    expect(Object.fromEntries(loaded!.season.driverStats))
      .toEqual(Object.fromEntries(league.season.driverStats));
    expect({ ...loaded!, season: null }).toEqual({ ...league, season: null });
    expect(loaded!.season.raceResults).toEqual(league.season.raceResults);
  });

  it('returns null when nothing is saved', () => {
    expect(loadLeagueState(memoryStore())).toBeNull();
  });

  it('discards saves from a different schema version (archive-don\'t-migrate)', () => {
    const store = memoryStore();
    saveLeagueState(makeLeague(), store);
    const key = [...store.map.keys()][0];
    const tampered = JSON.parse(store.map.get(key)!);
    tampered.schemaVersion = SCHEMA_VERSION + 1;
    store.map.set(key, JSON.stringify(tampered));

    expect(loadLeagueState(store)).toBeNull();
  });

  it('survives corrupted JSON without throwing', () => {
    const store = memoryStore();
    saveLeagueState(makeLeague(), store);
    const key = [...store.map.keys()][0];
    store.map.set(key, '{"definitely": "not a league{{{');

    expect(loadLeagueState(store)).toBeNull();
  });

  it('clears a saved league', () => {
    const store = memoryStore();
    saveLeagueState(makeLeague(), store);
    clearLeagueState(store);
    expect(loadLeagueState(store)).toBeNull();
  });

  it('works without any store (SSR / blocked storage)', () => {
    expect(saveLeagueState(makeLeague(), null)).toBe(false);
    expect(loadLeagueState(null)).toBeNull();
    expect(() => clearLeagueState(null)).not.toThrow();
  });
});
