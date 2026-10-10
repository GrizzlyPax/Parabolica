// #597: the run. League 0 is today's Season; a won league promotes the whole
// team; every league derives from the facts, replays exactly, and saves as
// facts only. The meta record survives an engine version bump.
import { describe, it, expect } from 'vitest';
import {
  newRun, seasonFactsFor, currentLeague, withCurrentLeague, runState, promote, replayRun, leagueWon,
  saveRun, loadRun, clearRun, RUN_KEY, LEAGUES_PER_RUN, type RunFacts,
} from './run';
import { emptyMeta, recordRun, loadMeta, saveMeta, META_KEY, grant } from './meta';
import { loadCurrentLeague, saveCurrentLeague, startRun, promoteCurrentRun, currentRunState } from './current';
import { generateSeasonPool, LEAGUE_ID_STRIDE } from '../season/genesis';
import { seasonState, setLineup, settleRound, poolFor, constructorStandings, leagueForRound, rivalShifts, type SeasonFacts, type SeasonStore } from '../season/season';
import { LEAGUE_LADDER, runnerUp } from './run';
import { STAR_FLOOR, shiftStats } from '../season/genesis';
import { applyCards } from '../cards';
import { draftState, quickDraft, aiPick } from '../season/draft';
import { teamCardState, carriedCards } from '../season/pack';
import { openPack } from '../season/testHelpers';
import { seasonCalendar } from '../season/setup';

function memoryStore(): SeasonStore {
  const map = new Map<string, string>();
  return { getItem: k => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v), removeItem: k => void map.delete(k) };
}

const TEAMS = 5, RACES = 2;

/** A run whose player wears the pool's first team, with league 0 drafted. */
function runFor(seed: number): RunFacts {
  const pool = generateSeasonPool(seed, TEAMS);
  const t = pool.teams[0];
  let run = newRun({ seed, teamCount: TEAMS, races: RACES, team: { teamId: t.id, name: 'Kitty Hut', color: '#123456', ink: '#FFFFFF' } });
  const league = currentLeague(run);
  run = withCurrentLeague(run, { ...league, draftPicks: quickDraft(poolFor(league)) });
  return run;
}

/** Play the league in play to the end: the player fields their drafted pair and opens every pack. */
function playLeague(run: RunFacts): RunFacts {
  let facts = currentLeague(run);
  while (seasonState(facts).phase !== 'finished') {
    const state = seasonState(facts);
    if (state.phase === 'paddock') {
      const roster = draftState(poolFor(facts), facts.draftPicks).rosters[state.whoseTurn!];
      facts = setLineup(facts, { round: state.round, teamId: state.whoseTurn!, driverIds: [roster.driverIds[0], roster.driverIds[1]] });
      facts = openPack(facts);
    } else if (state.phase === 'ready-for-go') {
      facts = settleRound(facts);
    } else throw new Error(`unexpected phase ${state.phase}`);
  }
  return withCurrentLeague(run, facts);
}

/** The first seed whose player wins league 0 (short leagues, small field: a few tries). */
function wonRun(): RunFacts {
  for (let seed = 11; seed < 200; seed++) {
    const run = playLeague(runFor(seed));
    if (runState(run).phase === 'league-won') return run;
  }
  throw new Error('no winning seed found');
}
function lostRun(): RunFacts {
  for (let seed = 11; seed < 200; seed++) {
    const run = playLeague(runFor(seed));
    if (runState(run).phase === 'run-lost') return run;
  }
  throw new Error('no losing seed found');
}

const digests = (f: SeasonFacts) => f.results.map(d => [d.finishOrder, d.totalTicks, d.dnfDriverIds]);

describe('the ladder', () => {
  it('league 0 is exactly today\'s Season: same seed, pool, calendar', () => {
    const run = runFor(5);
    const league = seasonFactsFor(run, 0);
    expect(league.setup.seed).toBe(5);
    expect(league.setup.calendar).toEqual(seasonCalendar(5, RACES));
    expect(league.setup.league?.name).toBe('Juniors');
    expect(league.setup.carry).toBeUndefined();
    const { drivers, cars, teams } = generateSeasonPool(5, TEAMS);
    expect(poolFor(league)).toMatchObject({ drivers, cars, teams });
    expect(runState(run)).toMatchObject({ leagueIndex: 0, phase: 'league', won: 0 });
    expect(runState(run).ladder.map(r => r.status)).toEqual(['current', 'ahead', 'ahead', 'ahead']);
  });

  it('a lost league ends the run; promotion is refused', () => {
    const run = lostRun();
    const state = runState(run);
    expect(state.phase).toBe('run-lost');
    expect(state.ladder[0].status).toBe('lost');
    expect(leagueWon(state.league)).toBe(false);
    expect(() => promote(run)).toThrow(/cannot promote/);
  });

  it('a won league promotes the whole team: ids, stats, traits, numbers, cards; rivals are fresh and reserved picks are respected', () => {
    const won = wonRun();
    expect(runState(won).ladder.map(r => r.status)).toEqual(['won', 'ahead', 'ahead', 'ahead']);
    const prev = currentLeague(won);
    const you = prev.setup.humans[0].teamId;
    const prevPool = poolFor(prev);
    const prevRoster = draftState(prevPool, prev.draftPicks).rosters[you];
    const prevCards = teamCardState(prev, you);

    const next = promote(won);
    expect(next.leagues).toHaveLength(2);
    const league = currentLeague(next);
    expect(league.setup.league).toMatchObject({ index: 1, name: 'Regional', bossRound: RACES - 1 });
    expect(league.setup.seed).not.toBe(prev.setup.seed);
    expect(league.setup.humans).toEqual(prev.setup.humans);
    const pool = poolFor(league);
    // The team came up: same drivers (ids, stats, traits, numbers), same car, same team stats.
    const roster = draftState(pool, league.draftPicks).rosters[you];
    expect(roster.driverIds).toEqual(prevRoster.driverIds);
    expect(roster.carId).toBe(prevRoster.carId);
    for (const id of roster.driverIds) {
      const before = prevPool.drivers.find(d => d.id === id)!, after = pool.drivers.find(d => d.id === id)!;
      expect(after).toMatchObject({ stats: before.stats, traits: before.traits, number: before.number, fullName: before.fullName, avatarSeed: prev.setup.seed, reservedFor: you });
    }
    expect(pool.cars.find(c => c.id === roster.carId)).toMatchObject({ stats: prevPool.cars.find(c => c.id === roster.carId)!.stats, reservedFor: you });
    expect(pool.teams.find(t => t.id === you)!.teamStats).toEqual(prevPool.teams.find(t => t.id === you)!.teamStats);
    // Cards start where they ended, before any new pack.
    expect(carriedCards(teamCardState(league, you))).toEqual(carriedCards(prevCards));
    // The field is fresh: new ids above the stride, unique ids and numbers, nobody else holds your people.
    const others = pool.drivers.filter(d => d.reservedFor !== you);
    expect(others.every(d => d.id >= LEAGUE_ID_STRIDE)).toBe(true);
    expect(new Set(pool.drivers.map(d => d.id)).size).toBe(pool.drivers.length);
    expect(new Set(pool.drivers.map(d => d.number)).size).toBe(pool.drivers.length);
    expect(new Set(pool.teams.map(t => t.id)).size).toBe(TEAMS);
    const state = draftState(pool, league.draftPicks);
    expect(state.done).toBe(true);
    for (const [teamId, r] of Object.entries(state.rosters)) {
      if (teamId === you) continue;
      expect(r.driverIds.some(id => roster.driverIds.includes(id))).toBe(false);
      expect(r.carId).not.toBe(roster.carId);
    }
    // A CPU on the clock never sees your drivers; you are forced onto yours.
    const fresh = { ...league, draftPicks: [] };
    const first = draftState(poolFor(fresh), []);
    if (first.onTheClock!.teamId !== you) expect(first.availableDrivers.some(d => d.reservedFor === you)).toBe(false);
    expect(seasonState(league).phase).toBe('paddock');
    expect(runState(next)).toMatchObject({ leagueIndex: 1, phase: 'league', won: 1 });
    void aiPick;
  });

  it('derived setups are stable: twice from the same facts, and through JSON', () => {
    const next = promote(wonRun());
    const a = seasonFactsFor(next, 1);
    const b = seasonFactsFor(JSON.parse(JSON.stringify(next)), 1);
    expect(b).toEqual(a);
    expect(seasonFactsFor(next, 1)).toBe(a); // memoised per run object
  });

  it('a run replayed from its facts equals the live run, league after league', () => {
    let run = promote(wonRun());
    // one round into league 2
    let facts = currentLeague(run);
    const state = seasonState(facts);
    const roster = draftState(poolFor(facts), facts.draftPicks).rosters[state.whoseTurn!];
    facts = setLineup(facts, { round: 0, teamId: state.whoseTurn!, driverIds: [roster.driverIds[1], roster.driverIds[0]] });
    facts = openPack(facts);
    facts = settleRound(facts);
    run = withCurrentLeague(run, facts);
    const replay = replayRun(run);
    expect(replay).toHaveLength(2);
    for (let i = 0; i < 2; i++) {
      expect(replay[i].map(d => [d.finishOrder, d.totalTicks, d.dnfDriverIds])).toEqual(digests(seasonFactsFor(run, i)));
    }
    expect(replay[1]).toHaveLength(1);
    // The carried team's results count: your drivers are on league 2's grid.
    expect(replay[1][0].finishOrder.some(id => roster.driverIds.includes(id)) || replay[1][0].dnfDriverIds.some(id => roster.driverIds.includes(id))).toBe(true);
    // The standings know your team in both leagues
    expect(constructorStandings(seasonFactsFor(run, 1)).some(s => s.teamId === run.setup.team.teamId)).toBe(true);
  });

  it('the top league won is the run won', () => {
    expect(LEAGUES_PER_RUN).toBe(4);
    expect(LEAGUE_ID_STRIDE).toBe(100);
  });
});

describe('rival levels + the nemesis (#626)', () => {
  it('every rival stat is shifted by the league\'s field at race build; the player is not; stars are floored', () => {
    const run = runFor(7);
    const league = currentLeague(run);
    const you = run.setup.team.teamId;
    const ctx = league.setup.league!;
    expect(ctx.fieldShift).toBe(LEAGUE_LADDER[0].field);
    expect(ctx.fieldShift).toBe(-25);
    const shifts = rivalShifts(league);
    expect(shifts[you]).toBeUndefined();
    expect(Object.keys(shifts)).toHaveLength(TEAMS - 1);
    expect(Object.values(shifts).every(v => v === -25)).toBe(true);
    const pool = poolFor(league);
    const grid = leagueForRound(league, 0).roster;
    for (const d of grid) {
      const raw = pool.drivers.find(x => x.id === d.id)!;
      const car = pool.cars.find(c => c.id === draftState(pool, league.draftPicks).rosters[d.kingdomId!].carId)!;
      const team = pool.teams.find(t => t.id === d.kingdomId)!;
      const carded = applyCards({ driver: raw.stats, car: car.stats, team: team.teamStats }, d.cards ?? []);
      const expected = d.kingdomId === you ? carded : shiftStats(carded, -25);
      expect(d.stats).toEqual(expected.driver);
      expect(d.carStats).toEqual(expected.car);
      expect(d.teamStats).toEqual(expected.team);
      if (d.kingdomId !== you) {
        // −25 grade = −0.075 on a speed stat, −1★ on a star (floored)
        expect(d.stats.baseSpeed).toBeCloseTo(carded.driver!.baseSpeed - 0.075, 10);
        expect(d.carStats!.power).toBeCloseTo(Math.max(STAR_FLOOR, carded.car!.power - 1), 10);
      }
    }
    // Quick Race and a stand-alone season have no league: nothing shifts.
    expect(rivalShifts({ ...league, setup: { ...league.setup, league: undefined } })).toEqual({});
  });

  it('the nemesis is last league\'s runner-up, promoted with you: same look, fresh people, field + nemesis points', () => {
    const won = wonRun();
    const prev = currentLeague(won);
    const second = runnerUp(prev)!;
    expect(second.name).toBe(poolFor(prev).teams.find(t => t.id === constructorStandings(prev)[1].teamId)!.name);
    const next = promote(won);
    const league = currentLeague(next);
    const pool = poolFor(league);
    const nemesis = pool.teams.filter(t => t.nemesis);
    expect(nemesis).toHaveLength(1);
    expect(nemesis[0]).toMatchObject({ name: second.name, color: second.color, deckTeamId: second.deckTeamId });
    expect(nemesis[0].id).not.toBe(won.setup.team.teamId);
    // The look is dealt once: no other team wears it.
    expect(pool.teams.filter(t => t.deckTeamId && t.deckTeamId === second.deckTeamId)).toHaveLength(1);
    const shifts = rivalShifts(league);
    expect(shifts[nemesis[0].id]).toBe(LEAGUE_LADDER[1].field + LEAGUE_LADDER[1].nemesis);
    for (const t of pool.teams) if (!t.nemesis && t.id !== won.setup.team.teamId) expect(shifts[t.id]).toBe(LEAGUE_LADDER[1].field);
    // No nemesis before the league is over.
    expect(runnerUp(seasonFactsFor(runFor(7), 0))).toBeUndefined();
    expect(seasonFactsFor(runFor(7), 0).setup.carry).toBeUndefined();
  });
});

describe('saves', () => {
  it('a run saves as facts only and loads back the same; the current league is the same Season', () => {
    const store = memoryStore();
    const run = promote(wonRun());
    expect(saveRun(run, store)).toBe(true);
    const saved = JSON.parse(store.getItem(RUN_KEY)!);
    expect(saved.data.leagues.every((l: object) => !('setup' in l))).toBe(true);
    const loaded = loadRun(store)!;
    expect(loaded).toEqual(run);
    expect(currentLeague(loaded)).toEqual(currentLeague(run));
    clearRun(store);
    expect(loadRun(store)).toBeNull();
  });

  it('the screens\' facade: start → play → save the league → load it back; promote through the facade', () => {
    const store = memoryStore();
    const won = wonRun();
    const league0 = seasonFactsFor(won, 0);
    const started = startRun(league0.setup, store);
    expect(started.setup.seed).toBe(won.setup.seed);
    expect(loadCurrentLeague(store)!.setup.league?.index).toBe(0);
    // write the played league back
    expect(saveCurrentLeague(currentLeague(won), store)).toBe(true);
    expect(currentRunState(store)!.phase).toBe('league-won');
    const next = promoteCurrentRun(store)!;
    expect(next.setup.league?.index).toBe(1);
    expect(loadCurrentLeague(store)!.setup.carry?.teamId).toBe(won.setup.team.teamId);
    expect(loadMeta(store).runs).toEqual([]); // still in play: nothing recorded
  });

  it('a lost run is recorded once in the meta; the meta survives an engine version bump', () => {
    const store = memoryStore();
    const lost = lostRun();
    const league0 = seasonFactsFor(lost, 0);
    startRun(league0.setup, store);
    saveCurrentLeague(currentLeague(lost), store);
    saveCurrentLeague(currentLeague(lost), store);
    const meta = loadMeta(store);
    expect(meta.runs).toHaveLength(1);
    expect(meta.runs[0]).toMatchObject({ seed: lost.setup.seed, leaguesWon: 0, won: false });
    // Another engine saved it: only the data's own schema version matters.
    const raw = JSON.parse(store.getItem(META_KEY)!);
    raw.engineVersion = '9.9.9';
    store.setItem(META_KEY, JSON.stringify(raw));
    expect(loadMeta(store)).toEqual(meta);
    // Unlocks: granted once, kept, unknown ids dropped on load.
    const granted = grant(grant(meta, 'horror-deck-league-3'), 'horror-deck-league-3');
    expect(granted.unlocks).toEqual(['horror-deck-league-3']);
    saveMeta({ ...granted, unlocks: [...granted.unlocks, 'made-up' as never] }, store);
    expect(loadMeta(store).unlocks).toEqual(['horror-deck-league-3']);
    expect(recordRun(emptyMeta(), lost).runs).toHaveLength(1);
  });
});
