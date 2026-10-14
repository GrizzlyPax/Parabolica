// #696: the run. Three steps (Locals 5 races, State 6, a slot for Nationals);
// rookies dealt near-identical; the field and rival strength from the state's
// size; titles as facts; the whole garage carries up; every step derives from
// the facts, replays exactly, and saves as facts only. The meta record
// survives an engine version bump.
import { describe, it, expect } from 'vitest';
import {
  newRun, seasonFactsFor, currentLeague, withCurrentLeague, runState, promote, replayRun, leagueWon, titlesOf, titleFor, townOf, rivalTowns, fieldAt, fieldShiftAt,
  startingTeam, renamedDriver, saveRun, loadRun, clearRun, RUN_KEY, RUN_SCHEMA_VERSION, STEP_PLAN, STATE_FIELD, LAST_BUILT_STEP, NEMESIS_IN_RUN, PLAYER_TEAM_ID, type RunFacts,
} from './run';
import { emptyMeta, recordRun, loadMeta, saveMeta, META_KEY, grant } from './meta';
import { loadCurrentLeague, saveCurrentLeague, startRun, promoteCurrentRun, currentRunState } from './current';
import { LEAGUE_ID_STRIDE, shiftStats } from '../season/genesis';
import { seasonState, setLineup, settleRound, poolFor, constructorStandings, leagueForRound, rivalShifts, type SeasonFacts, type SeasonStore } from '../season/season';
import { applyCards } from '../cards';
import { draftState } from '../season/draft';
import { teamCardState, carriedCards } from '../season/pack';
import { openPack } from '../season/testHelpers';
import { seasonCalendar } from '../season/setup';
import { dealRookies, ROOKIE_GRADE, ROOKIE_ID_BASE, ROOKIE_WOBBLE } from '../season/rookies';
import { rating } from '../season/grades';
import { fieldSize, placeById } from '../data/states';
import { testRun, TEST_GARAGE } from './testHelpers';
import { quickRace } from '../season/quickRace';

function memoryStore(): SeasonStore {
  const map = new Map<string, string>();
  return { getItem: k => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v), removeItem: k => void map.delete(k) };
}

/** Play the step in play to the end: the player fields the dealt pair and opens every pack. */
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

/** The first seed (in a small state: 5 towns, Vermont) whose player wins Locals. */
function wonRun(stateId = 'vt'): RunFacts {
  for (let seed = 11; seed < 400; seed++) {
    const run = playLeague(testRun(seed, stateId));
    if (runState(run).phase === 'league-won') return run;
  }
  throw new Error('no winning seed found');
}
function lostRun(): RunFacts {
  for (let seed = 11; seed < 400; seed++) {
    const run = playLeague(testRun(seed, 'vt'));
    if (runState(run).phase === 'run-lost') return run;
  }
  throw new Error('no losing seed found');
}

const digests = (f: SeasonFacts) => f.results.map(d => [d.finishOrder, d.totalTicks, d.dnfDriverIds]);
const grade = (stat: 'baseSpeed' | 'consistency' | 'luck' | 'acceleration' | 'endurance' | 'aggression', raw: number) => rating(stat, raw);

describe('the steps', () => {
  it('Locals 5 races, State 6, Nationals a slot; the field by the state\'s size; your town from its pool', () => {
    expect(STEP_PLAN.map(s => [s.id, s.races])).toEqual([['locals', 5], ['state', 6], ['nationals', 0]]);
    expect(LAST_BUILT_STEP).toBe(1);
    expect(STATE_FIELD).toEqual({ 5: 20, 10: 27, 20: 34 });
    const oh = testRun(5, 'oh'), vt = testRun(5, 'vt'), ia = testRun(5, 'ia');
    expect([fieldSize(placeById('oh')!), fieldSize(placeById('ia')!), fieldSize(placeById('vt')!)]).toEqual([20, 10, 5]);
    expect([fieldAt(oh, 0), fieldAt(oh, 1), fieldAt(vt, 1), fieldAt(ia, 1)]).toEqual([5, 20, 5, 10]);
    expect([fieldShiftAt(oh, 0), fieldShiftAt(oh, 1), fieldShiftAt(vt, 1), fieldShiftAt(ia, 1)]).toEqual([0, 34, 20, 27]);
    expect(placeById('oh')!.cities).toContain(townOf(oh));
    expect(rivalTowns(oh)).toHaveLength(placeById('oh')!.cities.length - 1);
    expect(rivalTowns(oh)).not.toContain(townOf(oh));
    expect([titleFor(oh, 'locals'), titleFor(oh, 'state'), titleFor(oh, 'nationals')]).toEqual([`Ace ${townOf(oh)}`, 'Ace Ohio', 'Ace America']);
    expect(() => newRun({ seed: 1, stateId: 'zz', garage: TEST_GARAGE })).toThrow(/no state/);
  });

  it('step 0 is Locals on the run seed: your dealt garage reserved, 5 rival garages of your town, open in the Paddock', () => {
    const run = testRun(5, 'oh');
    const league = seasonFactsFor(run, 0);
    expect(league.setup.seed).toBe(5);
    expect(league.setup.calendar).toEqual(seasonCalendar(5, 5));
    expect(league.setup.teamCount).toBe(6);
    expect(league.setup.league).toMatchObject({ index: 0, step: 'locals', name: 'Locals', fieldShift: 0, nemesisShift: 0, bossRound: 4, locale: { stateId: 'oh', town: townOf(run), rivalTowns: [] } });
    expect(league.setup.humans[0]).toMatchObject({ teamId: PLAYER_TEAM_ID, name: 'Kettle Street Garage' });
    expect(run.setup.garage.deckTeamId).toBeUndefined();
    const team = startingTeam(run);
    expect(league.setup.carry).toEqual(team);
    expect(team.drivers.map(d => d.id)).toEqual([ROOKIE_ID_BASE, ROOKIE_ID_BASE + 1]);
    expect(team.car.id).toBe('car-you');
    expect(seasonState(league).phase).toBe('paddock');
    const pool = poolFor(league);
    const roster = draftState(pool, league.draftPicks).rosters[PLAYER_TEAM_ID];
    expect(roster.driverIds).toEqual(team.drivers.map(d => d.id));
    expect(roster.carId).toBe('car-you');
    expect(pool.teams[0].id).toBe(PLAYER_TEAM_ID);
    // Rival garages: generic names, no deck team, no town at Locals, no nemesis.
    for (const t of pool.teams.slice(1)) {
      expect(t.deckTeamId).toBeUndefined();
      expect(t.town).toBeUndefined();
      expect(t.nemesis).toBeUndefined();
      expect(t.name).toMatch(/Sons|Brothers|Motors|Garage|Motor Works|Pump|Speed Shop/);
      expect(t.traits).toEqual([]);
    }
    expect(new Set(pool.teams.map(t => t.name)).size).toBe(pool.teams.length);
    expect(runState(run)).toMatchObject({ leagueIndex: 0, phase: 'league', won: 0 });
    expect(runState(run).ladder.map(r => [r.status, r.title, r.later ?? false])).toEqual([['current', `Ace ${townOf(run)}`, false], ['ahead', 'Ace Ohio', false], ['ahead', 'Ace America', true]]);
    expect(titlesOf(run)).toEqual([]);
  });

  it('rookies are dealt near-identical: everyone at level 5 ± the wobble, no traits, American names; yours on their own stream', () => {
    const dealt = dealRookies(5);
    expect(dealt).toEqual(dealRookies(5));
    expect(dealt.drivers.map(d => d.number)).toHaveLength(2);
    const run = testRun(5, 'oh');
    const pool = poolFor(currentLeague(run));
    for (const d of pool.drivers) {
      expect(d.traits).toEqual([]);
      expect(d.fullName.split(' ')).toHaveLength(2);
      for (const st of ['baseSpeed', 'consistency', 'luck', 'acceleration', 'endurance', 'aggression'] as const) {
        expect(Math.abs(grade(st, d.stats[st]) - ROOKIE_GRADE)).toBeLessThanOrEqual(ROOKIE_WOBBLE + 1e-9);
      }
    }
    for (const c of pool.cars) for (const v of Object.values(c.stats)) expect(Math.abs(v - 2)).toBeLessThanOrEqual(0.2 + 1e-9);
    for (const t of pool.teams) for (const v of Object.values(t.teamStats)) expect(Math.abs(v - 2)).toBeLessThanOrEqual(0.2 + 1e-9);
    expect(new Set(pool.drivers.map(d => d.number)).size).toBe(pool.drivers.length);
    expect(new Set(pool.drivers.map(d => d.id)).size).toBe(pool.drivers.length);
    // Quick Race still rolls genesis (the golden fingerprint's path).
    const q = quickRace(5);
    expect(q.facts.setup.league).toBeUndefined();
    expect(poolFor(q.facts).drivers.some(d => d.traits.length > 0)).toBe(true);
  });

  it('a lost step ends the run; promotion is refused', () => {
    const run = lostRun();
    const state = runState(run);
    expect(state.phase).toBe('run-lost');
    expect(state.ladder[0].status).toBe('lost');
    expect(leagueWon(state.league)).toBe(false);
    expect(() => promote(run)).toThrow(/cannot promote/);
    expect(titlesOf(run)).toEqual([]);
  });

  it('a won step is a title and promotes the whole garage: ids, stats, numbers, cards; State races every town\'s Ace, lifted by the state\'s size', () => {
    const won = wonRun('vt');
    expect(runState(won).ladder.map(r => r.status)).toEqual(['won', 'ahead', 'ahead']);
    expect(titlesOf(won)).toEqual([{ step: 'locals', name: `Ace ${townOf(won)}` }]);
    const prev = currentLeague(won);
    const you = prev.setup.humans[0].teamId;
    const prevPool = poolFor(prev);
    const prevRoster = draftState(prevPool, prev.draftPicks).rosters[you];
    const prevCards = teamCardState(prev, you, 5);

    const next = promote(won);
    expect(next.titles).toEqual([{ step: 'locals', name: `Ace ${townOf(won)}` }]);
    expect(next.leagues).toHaveLength(2);
    const league = currentLeague(next);
    expect(league.setup.league).toMatchObject({ index: 1, step: 'state', name: 'State', fieldShift: 20, bossRound: 5 });
    expect(league.setup.calendar).toHaveLength(6);
    expect(league.setup.teamCount).toBe(6); // Vermont: 5 towns
    expect(league.setup.seed).not.toBe(prev.setup.seed);
    const pool = poolFor(league);
    const roster = draftState(pool, league.draftPicks).rosters[you];
    expect(roster.driverIds).toEqual(prevRoster.driverIds);
    expect(roster.carId).toBe(prevRoster.carId);
    for (const id of roster.driverIds) {
      const before = prevPool.drivers.find(d => d.id === id)!, after = pool.drivers.find(d => d.id === id)!;
      expect(after).toMatchObject({ stats: before.stats, number: before.number, fullName: before.fullName, avatarSeed: won.setup.seed, reservedFor: you });
    }
    expect(carriedCards(teamCardState(league, you), 6)).toEqual(carriedCards(prevCards, 6));
    // Every rival garage has its own town; ids above the stride; nobody holds your people.
    const rivals = pool.teams.filter(t => t.id !== you);
    expect(rivals.every(t => t.town && t.town !== townOf(won))).toBe(true);
    expect(new Set(rivals.map(t => t.town)).size).toBe(rivals.length);
    expect(pool.drivers.filter(d => d.reservedFor !== you).every(d => d.id >= LEAGUE_ID_STRIDE)).toBe(true);
    expect(new Set(pool.drivers.map(d => d.number)).size).toBe(pool.drivers.length);
    expect(seasonState(league).phase).toBe('paddock');
    expect(runState(next)).toMatchObject({ leagueIndex: 1, phase: 'league', won: 1 });
    // The lift: every rival stat +20 at race build; yours untouched; no nemesis.
    const shifts = rivalShifts(league);
    expect(shifts[you]).toBeUndefined();
    expect(Object.values(shifts)).toEqual(Array(5).fill(20));
    expect(pool.teams.some(t => t.nemesis)).toBe(false);
    expect(NEMESIS_IN_RUN).toBe(false);
    expect(league.setup.carry?.nemesis).toBeUndefined();
    const grid = leagueForRound(league, 0).roster;
    for (const d of grid) {
      const raw = pool.drivers.find(x => x.id === d.id)!;
      const car = pool.cars.find(c => c.id === draftState(pool, league.draftPicks).rosters[d.kingdomId!].carId)!;
      const team = pool.teams.find(t => t.id === d.kingdomId)!;
      const carded = applyCards({ driver: raw.stats, car: car.stats, team: team.teamStats }, d.cards ?? []);
      const expected = d.kingdomId === you ? carded : shiftStats(carded, 20);
      expect(d.stats).toEqual(expected.driver);
      expect(d.carStats).toEqual(expected.car);
    }
  });

  it('a 20-town state fields 21 garages (42 cars) at State', () => {
    const run = promote(wonRun('oh'));
    const league = currentLeague(run);
    expect(league.setup.teamCount).toBe(21);
    expect(poolFor(league).drivers).toHaveLength(42);
    expect(league.setup.league?.fieldShift).toBe(34);
    expect(leagueForRound(league, 0).roster).toHaveLength(42);
  });

  it('winning State wins the run (Nationals waits on #694); the titles are claimed', () => {
    let run = promote(wonRun('vt'));
    const state = runState(run);
    expect(state.ladder[2]).toMatchObject({ status: 'ahead', later: true, title: 'Ace America' });
    expect(() => seasonFactsFor({ ...run, leagues: [...run.leagues, { draftPicks: [], lineups: [], cardFacts: [], effectFacts: [], results: [] }] }, 2)).toThrow(/not built/);
    // Hand the player every race (a scripted table): the run is won.
    let facts = currentLeague(run);
    const you = facts.setup.humans[0].teamId;
    const mine = draftState(poolFor(facts), facts.draftPicks).rosters[you].driverIds;
    const others = poolFor(facts).drivers.map(d => d.id).filter(id => !mine.includes(id));
    const digest = (i: number) => ({ index: i, trackId: facts.setup.calendar[i], trackName: 't', trackEmoji: '', finishOrder: [...mine, ...others], dnfDriverIds: [], fastestLapDriverId: null, totalTicks: 1000, highlights: [] });
    facts = { ...facts, results: facts.setup.calendar.map((_, i) => digest(i)) };
    run = withCurrentLeague(run, facts);
    expect(runState(run).phase).toBe('run-won');
    expect(titlesOf(run).map(t => t.name)).toEqual([`Ace ${townOf(run)}`, 'Ace Vermont']);
    expect(() => promote(run)).toThrow(/cannot promote/);
  });

  it('derived setups are stable: twice from the same facts, and through JSON', () => {
    const next = promote(wonRun('vt'));
    const a = seasonFactsFor(next, 1);
    const b = seasonFactsFor(JSON.parse(JSON.stringify(next)), 1);
    expect(b).toEqual(a);
    expect(seasonFactsFor(next, 1)).toBe(a); // memoised per run object
  });

  it('a run replayed from its facts equals the live run, step after step', () => {
    let run = promote(wonRun('vt'));
    let facts = currentLeague(run);
    const state = seasonState(facts);
    const roster = draftState(poolFor(facts), facts.draftPicks).rosters[state.whoseTurn!];
    facts = setLineup(facts, { round: 0, teamId: state.whoseTurn!, driverIds: [roster.driverIds[1], roster.driverIds[0]] });
    facts = openPack(facts);
    facts = settleRound(facts);
    run = withCurrentLeague(run, facts);
    const replay = replayRun(run);
    expect(replay).toHaveLength(2);
    for (let i = 0; i < 2; i++) expect(replay[i].map(d => [d.finishOrder, d.totalTicks, d.dnfDriverIds])).toEqual(digests(seasonFactsFor(run, i)));
    expect(replay[1]).toHaveLength(1);
    expect(constructorStandings(seasonFactsFor(run, 1)).some(s => s.teamId === run.setup.garage.teamId)).toBe(true);
  });
});

describe('saves', () => {
  it('a run saves as facts only and loads back the same; a v0.7 run is archived', () => {
    const store = memoryStore();
    const run = promote(wonRun('vt'));
    expect(saveRun(run, store)).toBe(true);
    const saved = JSON.parse(store.getItem(RUN_KEY)!);
    expect(saved.schemaVersion).toBe(RUN_SCHEMA_VERSION);
    expect(saved.data.leagues.every((l: object) => !('setup' in l))).toBe(true);
    const loaded = loadRun(store)!;
    expect(loaded).toEqual(run);
    expect(currentLeague(loaded)).toEqual(currentLeague(run));
    store.setItem(RUN_KEY, JSON.stringify({ ...saved, schemaVersion: 2 }));
    expect(loadRun(store)).toBeNull();
    clearRun(store);
    expect(loadRun(store)).toBeNull();
  });

  it('a run with carried gear plays the next league and survives save → load (#723)', () => {
    const store = memoryStore();
    let run = promote(wonRun());
    const carried = currentLeague(run).setup.carry!.cards;
    const carriedGear = [...Object.values(carried.drivers).flatMap(d => d.equipment), ...carried.car.upgrade, ...carried.team.facility, ...carried.locker];
    expect(carriedGear.length).toBeGreaterThan(0);
    run = playLeague(run);
    const facts = currentLeague(run);
    // Every round folds, and no gear id is held twice.
    for (let round = 0; round <= facts.results.length; round++) {
      const s = teamCardState(facts, 'you', round);
      const gear = [...s.locker, ...Object.values(s.drivers).flatMap(d => d.equipment), ...s.car.upgrade, ...s.team.facility].map(c => c.id);
      expect(new Set(gear).size).toBe(gear.length);
    }
    expect(saveRun(run, store)).toBe(true);
    const loaded = loadRun(store)!;
    expect(loaded).toEqual(run);
    expect(teamCardState(currentLeague(loaded), 'you')).toEqual(teamCardState(facts, 'you'));
  });

  it('the screens\' facade: start → play → save the step → load it back; promote through the facade', () => {
    const store = memoryStore();
    const won = wonRun('vt');
    const started = startRun({ seed: won.setup.seed, stateId: 'vt', garage: TEST_GARAGE }, store);
    expect(started.setup.seed).toBe(won.setup.seed);
    expect(currentRunState(store)!.phase).toBe('league');
    expect(loadCurrentLeague(store)!.draftPicks).toEqual(seasonFactsFor(won, 0).draftPicks);
    expect(saveCurrentLeague(currentLeague(won), store)).toBe(true);
    expect(currentRunState(store)!.phase).toBe('league-won');
    const next = promoteCurrentRun(store)!;
    expect(next.setup.league?.index).toBe(1);
    expect(loadCurrentLeague(store)!.setup.carry?.teamId).toBe(won.setup.garage.teamId);
    expect(loadRun(store)!.titles).toHaveLength(1);
    expect(loadMeta(store).runs).toEqual([]); // still in play: nothing recorded
  });

  it('a lost run is recorded once in the meta; the meta survives an engine version bump', () => {
    const store = memoryStore();
    const lost = lostRun();
    startRun({ seed: lost.setup.seed, stateId: 'vt', garage: TEST_GARAGE }, store);
    saveCurrentLeague(currentLeague(lost), store);
    saveCurrentLeague(currentLeague(lost), store);
    const meta = loadMeta(store);
    expect(meta.runs).toHaveLength(1);
    expect(meta.runs[0]).toMatchObject({ seed: lost.setup.seed, leaguesWon: 0, won: false });
    const raw = JSON.parse(store.getItem(META_KEY)!);
    raw.engineVersion = '9.9.9';
    store.setItem(META_KEY, JSON.stringify(raw));
    expect(loadMeta(store)).toEqual(meta);
    const granted = grant(grant(meta, 'horror-deck-league-3'), 'horror-deck-league-3');
    expect(granted.unlocks).toEqual(['horror-deck-league-3']);
    saveMeta({ ...granted, unlocks: [...granted.unlocks, 'made-up' as never] }, store);
    expect(loadMeta(store).unlocks).toEqual(['horror-deck-league-3']);
    expect(recordRun(emptyMeta(), lost).runs).toHaveLength(1);
  });
});

describe('the start page names (#697)', () => {
  it('renames the dealt drivers and chassis; blanks keep the dealt names; ids and stats stay', () => {
    const plain = newRun({ seed: 7, stateId: 'oh', garage: TEST_GARAGE });
    const named = newRun({ seed: 7, stateId: 'oh', garage: TEST_GARAGE, names: { drivers: ['Ricky  Doormat', ''], car: 'Sunday Best' } });
    const a = startingTeam(plain), b = startingTeam(named);
    expect(b.drivers[0]).toMatchObject({ id: a.drivers[0].id, fullName: 'Ricky Doormat', firstName: 'Ricky', lastName: 'Doormat', stats: a.drivers[0].stats });
    expect(b.drivers[1]).toEqual(a.drivers[1]);
    expect(b.car).toMatchObject({ id: a.car.id, name: 'Sunday Best', stats: a.car.stats });
    expect(renamedDriver(a.drivers[0], 'Cher').lastName).toBe('');
  });
});
