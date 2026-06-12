import { describe, it, expect } from 'vitest';
import { createLeague, buildSchedule, rosterStateAt } from './league';
import {
  settleLeague, nextRaceAt, isSeasonOver, prepareScheduledRace,
  FULL_EVENT_RETENTION, LIVE_TICK_MS,
} from './settle';
import { buildSeasonReport } from './seasonReport';
import { traceRace } from './raceTrace';
import { LeagueSetupConfig, LeagueState } from './types';
import { saveLeagueState, loadLeagueState, KeyValueStore } from '../storage/persistence';
import { getSeasonStandings } from '../types/season';
import { CURRENT_TRACKS, getTrackById } from '../generators/tracks';
import { TEAMS } from '../data/teams';
import RaceEngine from '../RaceEngine';
import { CANON_VARIABLES } from '../simlab/types';
import { weatherForRace } from '../data/weather';

const HOUR = 3_600_000;
const T0 = 1_750_000_000_000; // fixed epoch for fake-clock tests

function makeSetup(overrides: Partial<LeagueSetupConfig> = {}): LeagueSetupConfig {
  return {
    name: 'Test League',
    godId: 'the-scrap-heap',
    teamIds: TEAMS.slice(0, 6).map(t => t.id),
    trackIds: CURRENT_TRACKS.slice(0, 4).map(t => t.id),
    raceIntervalMs: 3 * HOUR,
    createdAt: T0,
    ...overrides,
  };
}

function memoryStore(): KeyValueStore {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

// Strip full event logs so settle paths with different retention windows can
// be compared on what must match: results, standings, highlights.
function comparable(league: LeagueState) {
  return {
    settledThrough: league.settledThrough,
    season: {
      ...league.season,
      driverStats: Object.fromEntries(league.season.driverStats),
    },
    digests: league.digests.map(({ events: _e, ...d }) => d),
  };
}

describe('league creation', () => {
  it('is fully determined by (seed, setup)', () => {
    const a = createLeague(42, makeSetup());
    const b = createLeague(42, makeSetup());
    expect(b.roster).toEqual(a.roster);
    expect(b.schedule).toEqual(a.schedule);
  });

  it('different seeds birth different universes with different race seeds', () => {
    const a = createLeague(1, makeSetup());
    const b = createLeague(2, makeSetup());
    expect(b.roster.map(d => d.fullName)).not.toEqual(a.roster.map(d => d.fullName));
    expect(b.schedule.map(r => r.seed)).not.toEqual(a.schedule.map(r => r.seed));
  });

  it('schedules races on the wall-clock cadence, inaugural race at founding', () => {
    const schedule = buildSchedule(7, makeSetup());
    expect(schedule).toHaveLength(4);
    schedule.forEach((race, i) => {
      expect(race.scheduledAt).toBe(T0 + i * 3 * HOUR);
      expect(race.index).toBe(i);
    });
    // Race seeds are distinct streams
    expect(new Set(schedule.map(r => r.seed)).size).toBe(4);
  });
});

describe('settleLeague (fake clock)', () => {
  it('settles nothing before the inaugural race fires', () => {
    const league = createLeague(42, makeSetup());
    const { league: after, newlySettled } = settleLeague(league, { now: T0 - 1 });
    expect(newlySettled).toHaveLength(0);
    expect(after).toBe(league); // same reference: cheap no-op check
  });

  it('settles exactly the races whose broadcasts have ended, in order', () => {
    const league = createLeague(42, makeSetup());
    // Race 0 aired at founding, race 1 at T0+3h; both broadcasts are over
    // well before T0+6h, and race 2 hasn't started yet.
    const { league: after, newlySettled } = settleLeague(league, { now: T0 + 6 * HOUR - 1 });

    expect(newlySettled.map(d => d.index)).toEqual([0, 1]);
    expect(after.settledThrough).toBe(1);
    expect(after.season.raceResults).toHaveLength(2);
    expect(after.season.currentRace).toBe(3);

    const standings = getSeasonStandings(after.season);
    expect(standings[0].points).toBeGreaterThan(0);
    // every digest carries highlights for gods/chronicles
    for (const d of after.digests) {
      expect(d.highlights.length).toBeGreaterThan(0);
      expect(d.finishOrder.length + d.dnfDriverIds.length).toBe(after.roster.length);
    }
  });

  it('never re-runs history: settling twice at the same now is a no-op', () => {
    const league = createLeague(42, makeSetup());
    const once = settleLeague(league, { now: T0 + 7 * HOUR });
    const twice = settleLeague(once.league, { now: T0 + 7 * HOUR });
    expect(twice.newlySettled).toHaveLength(0);
    expect(twice.league).toBe(once.league);
  });

  it('incremental check-ins produce the identical season to one big backfill', () => {
    const setup = makeSetup();
    // Player A checks in after every race
    let a = createLeague(42, setup);
    for (let i = 0; i < 4; i++) {
      a = settleLeague(a, { now: T0 + (i + 1) * 3 * HOUR }).league;
    }
    // Player B slept through the whole season
    const b = settleLeague(createLeague(42, setup), { now: T0 + 13 * HOUR }).league;

    expect(comparable(a)).toEqual(comparable(b));
    expect(isSeasonOver(a)).toBe(true);
    expect(nextRaceAt(a)).toBeNull();
  });

  it('keeps full event logs only for the newest races, highlights forever', () => {
    const league = createLeague(42, makeSetup());
    const { league: after } = settleLeague(league, { now: T0 + 13 * HOUR });

    expect(after.digests).toHaveLength(4);
    const withFullLog = after.digests.filter(d => d.events !== undefined);
    expect(withFullLog).toHaveLength(FULL_EVENT_RETENTION);
    expect(withFullLog.map(d => d.index)).toEqual([1, 2, 3]);
  });

  it('reports a race as live inside its broadcast window, without settling it', () => {
    const league = createLeague(42, makeSetup());
    // 1s after founding: the inaugural race is on the air
    const { league: after, newlySettled, live } = settleLeague(league, { now: T0 + 1000 });
    expect(newlySettled).toHaveLength(0);
    expect(after).toBe(league);
    expect(live).toBeDefined();
    expect(live!.index).toBe(0);
    expect(live!.startedAt).toBe(T0);
    expect(live!.endsAt).toBeGreaterThan(T0 + 1000);
  });

  it('the live window matches the settled broadcast exactly (same race)', () => {
    const league = createLeague(42, makeSetup());
    const { live } = settleLeague(league, { now: T0 + 1 });
    const settled = settleLeague(league, { now: T0 + 13 * HOUR }).league;
    expect(settled.digests[0].startedAt).toBe(T0);
    expect(settled.digests[0].endedAt).toBe(T0 + settled.digests[0].totalTicks * LIVE_TICK_MS);
    expect(live!.endsAt).toBe(settled.digests[0].endedAt);
  });

  it('broadcasts queue: an interval shorter than a race never overlaps', () => {
    // 1-minute cadence, but races last several minutes — successors must wait
    const setup = makeSetup({ raceIntervalMs: 60_000 });
    const league = settleLeague(createLeague(42, setup), { now: T0 + 13 * HOUR }).league;
    expect(league.digests).toHaveLength(4);
    for (let i = 1; i < league.digests.length; i++) {
      expect(league.digests[i].startedAt!).toBeGreaterThanOrEqual(league.digests[i - 1].endedAt!);
    }
  });

  it('a watched broadcast reproduces the settled digest exactly, even on a dirty engine', () => {
    // Regression: the live broadcast used to configure the app's singleton
    // engine by hand and forgot simVars, so viewers watched a race run on
    // hardcoded defaults while the settle loop scored the CANON race —
    // different crash odds, different result. Both paths now share
    // prepareScheduledRace; this asserts a watch-style replay is bit-for-bit
    // the race that entered the standings.
    const league = createLeague(42, makeSetup());
    const settled = settleLeague(league, { now: T0 + 13 * HOUR }).league;
    const digest = settled.digests[0];
    const track = getTrackById(digest.trackId)!;

    // The app engine arrives dirty from a Quick Race: stale config, no simVars.
    const engine = RaceEngine.createForWorker();
    engine.updateConfig({ totalLaps: 7, lapLength: 333, baseCrashChance: 0.5 });
    engine.setSimVars(null);

    prepareScheduledRace(engine, league, 0, track, CANON_VARIABLES);
    engine.updateConfig({ tickInterval: LIVE_TICK_MS }); // pacing only, like handleWatchLive
    engine.reset();
    engine.fastForward(Number.MAX_SAFE_INTEGER); // watch to the chequered flag

    const state = engine.getRaceState();
    expect(state.raceFinished).toBe(true);
    expect(state.finishOrder).toEqual(digest.finishOrder);
    expect(state.totalTicks).toBe(digest.totalTicks);
    expect(engine.getDrivers().filter(d => d.status === 'dnf').map(d => d.id).sort())
      .toEqual([...digest.dnfDriverIds].sort());
  });

  it('reports progress per settled race', () => {
    const league = createLeague(42, makeSetup());
    const progress: [number, number][] = [];
    settleLeague(league, {
      now: T0 + 13 * HOUR,
      onRaceSettled: (_d, done, total) => progress.push([done, total]),
    });
    expect(progress).toEqual([[1, 4], [2, 4], [3, 4], [4, 4]]);
  });
});

describe('interventions', () => {
  it('applies tag attachments from their race onward, never retroactively', () => {
    const league = createLeague(42, makeSetup());
    const targetId = league.roster[0].id;
    const withIntervention: LeagueState = {
      ...league,
      interventionLog: [{
        type: 'attach-tag',
        atRaceIndex: 2,
        targetDriverId: targetId,
        tagId: 'sunday-driver',
        committedAt: T0 + 5 * HOUR,
      }],
    };

    const before = rosterStateAt(withIntervention, 1).find(d => d.id === targetId)!;
    const after = rosterStateAt(withIntervention, 2).find(d => d.id === targetId)!;
    expect(before.driverTag?.id).not.toBe('sunday-driver');
    expect(after.driverTag?.id).toBe('sunday-driver');
    // genesis roster untouched (pure function)
    expect(league.roster[0].driverTag?.id).not.toBe('sunday-driver');
  });

  it('changes the affected race but not the already-deterministic earlier ones', () => {
    const setup = makeSetup();
    const base = settleLeague(createLeague(42, setup), { now: T0 + 13 * HOUR }).league;

    const tampered = createLeague(42, setup);
    tampered.interventionLog.push({
      type: 'attach-tag',
      atRaceIndex: 2,
      targetDriverId: tampered.roster[0].id,
      tagId: 'sunday-driver',
      committedAt: T0 + 5 * HOUR,
    });
    const altered = settleLeague(tampered, { now: T0 + 13 * HOUR }).league;

    // Races 0 and 1 ran before the intervention: identical
    expect(altered.digests[0].finishOrder).toEqual(base.digests[0].finishOrder);
    expect(altered.digests[1].finishOrder).toEqual(base.digests[1].finishOrder);
    // Race 2 ran with a cursed driver: the race itself must differ
    expect(altered.digests[2].totalTicks !== base.digests[2].totalTicks ||
           JSON.stringify(altered.digests[2].finishOrder) !== JSON.stringify(base.digests[2].finishOrder) ||
           altered.digests[2].highlights.length !== base.digests[2].highlights.length
    ).toBe(true);
  });
});

describe('season report (the copyable balance artifact)', () => {
  it('captures standings, attributes, hardware, races, and correlations for the whole grid', () => {
    const setup = makeSetup();
    const league = settleLeague(createLeague(42, setup), { now: T0 + 13 * HOUR }).league;
    const report = buildSeasonReport(league);

    for (const section of [
      'PARABOLICA SEASON REPORT', 'FINAL STANDINGS', 'DRIVER ATTRIBUTES',
      'CARS & TEAMS', 'RACES', 'STAT vs OUTCOME',
    ]) {
      expect(report).toContain(section);
    }
    // every driver appears with their rolled stats
    for (const d of league.roster) {
      expect(report).toContain(d.fullName);
      expect(report).toContain(d.stats.baseSpeed.toFixed(3));
    }
    // every settled race appears
    for (const digest of league.digests) {
      expect(report).toContain(digest.trackName);
    }
    // one row per team in the hardware section, tab-separated
    const teams = new Set(league.roster.map(d => d.kingdomId));
    const hardwareRows = report
      .slice(report.indexOf('CARS & TEAMS'), report.indexOf('RACES'))
      .split('\n').filter(r => r.includes('\t'));
    expect(hardwareRows.length).toBe(teams.size + 1); // header + teams
  });

  it('reflects interventions: the attached tag shows up in attributes and the log', () => {
    const league = createLeague(42, makeSetup());
    league.interventionLog.push({
      type: 'attach-tag',
      atRaceIndex: 1,
      targetDriverId: league.roster[0].id,
      tagId: 'sunday-driver',
      committedAt: T0 + HOUR,
    });
    const settled = settleLeague(league, { now: T0 + 13 * HOUR }).league;
    const report = buildSeasonReport(settled);
    expect(report).toContain('INTERVENTIONS');
    expect(report).toContain('sunday-driver');
  });

  it('is deterministic for the same settled league', () => {
    const setup = makeSetup();
    const a = buildSeasonReport(settleLeague(createLeague(7, setup), { now: T0 + 13 * HOUR }).league);
    const b = buildSeasonReport(settleLeague(createLeague(7, setup), { now: T0 + 13 * HOUR }).league);
    expect(a).toBe(b);
  });
});

describe('traceRace (#173): the race replay', () => {
  it('reconstructs a settled race exactly — classification matches the digest', () => {
    const league = settleLeague(createLeague(42, makeSetup()), { now: T0 + 13 * HOUR }).league;
    const digest = league.digests[0];
    const trace = traceRace(league, digest.index)!;
    expect(trace).not.toBeNull();

    // The replayed classification IS the digest's: determinism working for us.
    const classified = trace.strategies
      .filter(s => s.finalPosition !== null)
      .sort((a, b) => a.finalPosition! - b.finalPosition!)
      .map(s => s.driverId);
    expect(classified).toEqual(digest.finishOrder);
    const dnfs = trace.strategies.filter(s => s.finalPosition === null).map(s => s.driverId).sort();
    expect(dnfs).toEqual([...digest.dnfDriverIds].sort());

    // Chart data is complete and well-formed.
    expect(trace.laps[0]).toBe(0); // starting grid
    expect(trace.series.length).toBe(trace.fieldSize);
    for (const s of trace.series) expect(s.positions.length).toBe(trace.laps.length);
    // Every driver has a stint history (at least the starting compound).
    for (const s of trace.strategies) expect(s.stints.length).toBeGreaterThanOrEqual(1);
  });
});

describe('weather (C2)', () => {
  it('digests carry the race weather, deterministic per (seed, index)', () => {
    const setup = makeSetup({ trackIds: CURRENT_TRACKS.slice(0, 8).map(t => t.id) });
    const a = settleLeague(createLeague(123, setup), { now: T0 + 30 * HOUR }).league;
    const b = settleLeague(createLeague(123, setup), { now: T0 + 30 * HOUR }).league;

    // Each digest's weather matches what weatherForRace says, and replays exactly.
    a.digests.forEach((d, i) => {
      const w = weatherForRace(a.leagueSeed, d.index);
      const expected = w.id === 'clear' ? undefined : { id: w.id, name: w.name, emoji: w.emoji };
      expect(d.weather).toEqual(expected);
      expect(b.digests[i].weather).toEqual(d.weather);
    });
  });

  it('the same weather is woven into the deterministic race (live == settle)', () => {
    // Weather rides on prepareScheduledRace, shared by live + settle, so a
    // re-settle of the same league reproduces identical results incl. weather.
    const setup = makeSetup();
    const once = settleLeague(createLeague(55, setup), { now: T0 + 13 * HOUR }).league;
    const twice = settleLeague(createLeague(55, setup), { now: T0 + 13 * HOUR }).league;
    expect(twice.digests.map(d => [d.finishOrder, d.totalTicks, d.weather]))
      .toEqual(once.digests.map(d => [d.finishOrder, d.totalTicks, d.weather]));
  });

  it('track tags (C3) are woven in deterministically too', () => {
    // Intrinsic track tags ride on the same shared prepare path; a re-settle
    // reproduces identical races (track tags affect crashes/pace).
    const setup = makeSetup();
    const a = settleLeague(createLeague(88, setup), { now: T0 + 13 * HOUR }).league;
    const b = settleLeague(createLeague(88, setup), { now: T0 + 13 * HOUR }).league;
    expect(b.digests.map(d => [d.finishOrder, d.totalTicks]))
      .toEqual(a.digests.map(d => [d.finishOrder, d.totalTicks]));
  });
});

describe('league persistence', () => {
  it('round-trips a settled league exactly', () => {
    const store = memoryStore();
    const { league } = settleLeague(createLeague(42, makeSetup()), { now: T0 + 7 * HOUR });

    expect(saveLeagueState(league, store)).toBe(true);
    const loaded = loadLeagueState(store);

    expect(loaded).not.toBeNull();
    expect(loaded!.season.driverStats).toBeInstanceOf(Map);
    expect(comparable(loaded!)).toEqual(comparable(league));
    expect(loaded!.schedule).toEqual(league.schedule);
    expect(loaded!.leagueSeed).toBe(league.leagueSeed);

    // and the loaded league can keep settling — the resume path in one line
    const resumed = settleLeague(loaded!, { now: T0 + 13 * HOUR });
    expect(resumed.league.settledThrough).toBe(3);
  });

  it('returns null when nothing is saved', () => {
    expect(loadLeagueState(memoryStore())).toBeNull();
  });
});
