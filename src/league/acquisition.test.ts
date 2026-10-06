// The acquisition engine (#232): tags earned, inflicted and expired by results.
import { describe, it, expect } from 'vitest';
import { createLeague, rosterStateAt } from './league';
import { settleLeague } from './settle';
import { evaluateAcquisitions } from './acquisition';
import { LeagueSetupConfig, LeagueState, RaceDigest } from './types';
import { TEAMS } from '../data/teams';
import { CURRENT_TRACKS } from '../generators/tracks';
import { ACQUIRED_TAGS, getTagById, isGenesisTag } from '../data/tags';
import { ACQUISITION_RULES } from '../data/acquisitions';
import { defaultRuleset, resolveRuleset } from '../rules/ruleset';
import { CARDS_BY_ID } from '../data/cards';
import { createInitialSeasonState, updateSeasonWithRaceResult } from '../types/season';

const HOUR = 3_600_000;
const T0 = 1_750_000_000_000;

function makeSetup(overrides: Partial<LeagueSetupConfig> = {}): LeagueSetupConfig {
  return {
    name: 'Acquisition League',
    godId: 'the-scrap-heap',
    teamIds: TEAMS.slice(0, 6).map(t => t.id),
    trackIds: CURRENT_TRACKS.slice(0, 8).map(t => t.id),
    raceIntervalMs: 1 * HOUR,
    createdAt: T0,
    ...overrides,
  };
}

/** A digest with just the fields the rules read. */
function fakeDigest(index: number, league: LeagueState, over: Partial<RaceDigest> = {}): RaceDigest {
  const ids = league.roster.map(d => d.id);
  return {
    index, trackId: 't', trackName: 'T', trackEmoji: '🏁',
    finishOrder: ids, dnfDriverIds: [], fastestLapDriverId: null, totalTicks: 1000,
    gridOrder: ids, damagedDriverIds: [], crashPairs: [], highlights: [],
    ...over,
  };
}

describe('acquired tags are a separate vocabulary', () => {
  it('every acquired tag resolves, has a rule, and never appears in the genesis pool', () => {
    const pool = new Set(defaultRuleset().tags.pool);
    for (const t of ACQUIRED_TAGS) {
      expect(getTagById(t.id)?.id).toBe(t.id);
      expect(isGenesisTag(t), t.id).toBe(false);
      expect(pool.has(t.id), t.id).toBe(false);
      expect(ACQUISITION_RULES.some(r => r.tagId === t.id), `rule for ${t.id}`).toBe(true);
    }
    for (const r of ACQUISITION_RULES) expect(getTagById(r.tagId), r.id).toBeDefined();
  });
});

describe('evaluateAcquisitions (pure)', () => {
  it('three straight DNFs → Haunted, from the next race, for 4 races', () => {
    const league = createLeague(3, makeSetup());
    const victim = league.roster[0].id;
    let season = createInitialSeasonState(8, league.roster.map(d => d.id));
    const others = league.roster.map(d => d.id).filter(id => id !== victim);
    for (let i = 0; i < 3; i++) season = updateSeasonWithRaceResult(season, others, [victim], 'T', '🏁', null);
    const digest = fakeDigest(2, league, { finishOrder: others, dnfDriverIds: [victim] });
    const { entries, changes } = evaluateAcquisitions(league, digest, season, league.roster, ACQUISITION_RULES.filter(r => r.family !== 'cosmic'));
    const acq = entries.find(e => e.type === 'acquire-tag' && e.targetDriverId === victim && e.tagId === 'haunted');
    expect(acq).toBeDefined();
    expect(acq!.atRaceIndex).toBe(3);
    const exp = entries.find(e => e.type === 'expire-tag' && e.targetDriverId === victim && e.tagId === 'haunted');
    expect(exp?.atRaceIndex).toBe(3 + 4);
    expect(changes.find(c => c.driverId === victim)?.headline).toContain('Haunted');
    // and the log round-trips through rosterStateAt: on for races 3–6, gone at 7
    const withLog = { ...league, interventionLog: entries };
    const has = (i: number) => rosterStateAt(withLog, i).find(d => d.id === victim)!.tags.some(t => t.id === 'haunted');
    expect([2, 3, 6, 7].map(has)).toEqual([false, true, true, false]);
  });

  it('a climb of 10+ places into the top 5 → The Charger; a crash survived → Unkillable; crashing out → Shaken', () => {
    const league = createLeague(4, makeSetup({ teamIds: TEAMS.slice(0, 8).map(t => t.id) })); // 16 drivers
    const ids = league.roster.map(d => d.id);
    const climber = ids[15], survivor = ids[0], crasher = ids[1], other = ids[2];
    const season = createInitialSeasonState(8, ids);
    // climber: last on the grid → wins (a 12+ place climb); survivor finishes P2
    const finish = [climber, survivor, ...ids.filter(id => id !== climber && id !== crasher && id !== survivor)];
    const digest = fakeDigest(0, league, {
      finishOrder: finish, gridOrder: ids, dnfDriverIds: [crasher],
      damagedDriverIds: [survivor], crashPairs: [[Math.min(crasher, other), Math.max(crasher, other)]],
    });
    const { entries } = evaluateAcquisitions(league, digest, season, league.roster, ACQUISITION_RULES.filter(r => r.family !== 'cosmic'));
    const got = (id: number) => entries.filter(e => e.type === 'acquire-tag' && e.targetDriverId === id).map(e => e.tagId);
    expect(got(climber)).toContain('the-charger');
    expect(got(survivor)).toContain('unkillable');
    expect(got(crasher)).toContain('shaken');
    expect(got(other)).toEqual([]); // in the crash pair but did not retire
  });

  it('respects the cap and never double-awards', () => {
    const league = createLeague(5, makeSetup());
    const ids = league.roster.map(d => d.id);
    const victim = ids[0];
    const full = { ...league, roster: league.roster.map(d => d.id === victim ? { ...d, tags: ['clutch-performer', 'glass-cannon', 'front-runners', 'sunday-driver'].map(id => getTagById(id)!) } : d) };
    const season = createInitialSeasonState(8, ids);
    const digest = fakeDigest(0, full, { finishOrder: ids.filter(id => id !== victim), dnfDriverIds: [victim], damagedDriverIds: [], crashPairs: [[Math.min(victim, ids[1]), Math.max(victim, ids[1])]] });
    const { entries } = evaluateAcquisitions(full, digest, season, full.roster, ACQUISITION_RULES.filter(r => r.family !== 'cosmic'));
    expect(entries.filter(e => e.targetDriverId === victim)).toEqual([]); // stack is full (cap 4)
    // Tag Soup raises the cap → it lands
    const soup = { ...full, setup: { ...full.setup, ruleset: resolveRuleset(['tag-soup'], CARDS_BY_ID) } };
    const r2 = evaluateAcquisitions(soup, digest, season, soup.roster, ACQUISITION_RULES.filter(r => r.family !== 'cosmic'));
    expect(r2.entries.some(e => e.type === 'acquire-tag' && e.targetDriverId === victim && e.tagId === 'shaken')).toBe(true);
  });

  it('is deterministic: same inputs → same entries, including the lottery', () => {
    const league = createLeague(6, makeSetup());
    const season = createInitialSeasonState(8, league.roster.map(d => d.id));
    const digest = fakeDigest(0, league);
    const a = evaluateAcquisitions(league, digest, season, league.roster);
    const b = evaluateAcquisitions(league, digest, season, league.roster);
    expect(b).toEqual(a);
  });
});

describe('settle runs the acquisition engine', () => {
  it('a full season recomputed from inputs reproduces the same log and digests', () => {
    const setup = makeSetup();
    const once = settleLeague(createLeague(42, setup), { now: T0 + 20 * HOUR }).league;
    const again = settleLeague(createLeague(42, setup), { now: T0 + 20 * HOUR }).league;
    expect(again.interventionLog).toEqual(once.interventionLog);
    expect(again.digests.map(d => d.tagChanges)).toEqual(once.digests.map(d => d.tagChanges));
    // and settling in two sittings equals settling in one
    const half = settleLeague(createLeague(42, setup), { now: T0 + 4 * HOUR }).league;
    const rest = settleLeague(half, { now: T0 + 20 * HOUR }).league;
    expect(rest.interventionLog).toEqual(once.interventionLog);
    expect(rest.digests.map(d => d.finishOrder)).toEqual(once.digests.map(d => d.finishOrder));
  });

  it('every digest carries grid order and the memory the rules read', () => {
    const league = settleLeague(createLeague(42, makeSetup()), { now: T0 + 20 * HOUR }).league;
    for (const d of league.digests) {
      expect(d.gridOrder?.length).toBe(league.roster.length);
      expect(Array.isArray(d.damagedDriverIds)).toBe(true);
      expect(Array.isArray(d.crashPairs)).toBe(true);
      expect(Array.isArray(d.tagChanges)).toBe(true);
    }
  });

  it('acquired tags actually run in later races (the roster the engine sees carries them)', () => {
    // Find a seed where something is acquired early, then check it is on the
    // driver's stack for the race it applies to and changes that race.
    for (const seed of [42, 7, 99, 123, 2024]) {
      const league = settleLeague(createLeague(seed, makeSetup()), { now: T0 + 20 * HOUR }).league;
      const first = league.interventionLog.find(e => e.type === 'acquire-tag');
      if (!first) continue;
      const stack = rosterStateAt(league, first.atRaceIndex).find(d => d.id === first.targetDriverId)!.tags;
      expect(stack.some(t => t.id === first.tagId)).toBe(true);
      expect(league.digests[first.earnedAtRaceIndex].tagChanges!.some(c => c.driverId === first.targetDriverId && c.tagId === first.tagId)).toBe(true);
      return;
    }
    throw new Error('no acquisition in five seeds — rules may be too strict');
  });
});
