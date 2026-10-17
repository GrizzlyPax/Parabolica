// #696: the run. Three steps (Locals 5 races, State 6, Nationals 4);
// rookies dealt near-identical; the field and rival strength from the state's
// size; titles as facts; the whole garage carries up; every step derives from
// the facts, replays exactly, and saves as facts only. The meta record
// survives an engine version bump.
import { describe, it, expect } from 'vitest';
import {
  newRun, seasonFactsFor, currentLeague, withCurrentLeague, runState, promote, replayRun, leagueWon, titlesOf, titleFor, townOf, rivalTowns, fieldAt, fieldShiftAt,
  startingTeam, renamedDriver, saveRun, loadRun, clearRun, RUN_KEY, RUN_SCHEMA_VERSION, legacyTownOf, dealTown, STEP_PLAN, STATE_FIELD, LAST_BUILT_STEP, NEMESIS_IN_RUN, PLAYER_TEAM_ID, NATIONALS_SHIFT, NATIONALS_FORMAT, HUNDRED_CUTS, rivalStates, type RunFacts,
} from './run';
import { emptyMeta, recordRun, loadMeta, saveMeta, META_KEY, grant } from './meta';
import { loadCurrentLeague, saveCurrentLeague, startRun, promoteCurrentRun, currentRunState } from './current';
import { LEAGUE_ID_STRIDE, shiftStats } from '../season/genesis';
import { seasonState, setLineup, settleRound, poolFor, constructorStandings, leagueForRound, lineupFor, lineupsFor, rivalShifts, type SeasonFacts, type SeasonStore } from '../season/season';
import { applyCards } from '../cards';
import { draftState } from '../season/draft';
import { teamStamps, carriedStamps, titleStamp, TITLE_STAMP_LEVELS } from '../season/stamps';
import { POINTS_PER_LEVEL } from '../season/grades';
import { openParcelQuick } from '../season/testHelpers';
import { seasonCalendar } from '../season/setup';
import { dealRookies, ROOKIE_GRADE, ROOKIE_ID_BASE, ROOKIE_WOBBLE } from '../season/rookies';
import { aliveAt, isOut, stageOf } from '../season/format';
import { raceBadges } from '../season/badges';
import { feedVoiceFor } from '../season/feedVoice';
import { runScheduledRace } from '../league/settle';
import { getTrackById } from '../generators/tracks';
import { CANON_VARIABLES } from '../simlab/types';
import { ladderView } from './ladderView';
import { rating } from '../season/grades';
import { fieldSize, placeById, TOWN_POOL_OCT14 } from '../data/states';
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
      facts = openParcelQuick(facts);
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
  it('Locals 5 races, State 6, Nationals 4; the field by the state\'s size; your town from its pool', () => {
    expect(STEP_PLAN.map(s => [s.id, s.races])).toEqual([['locals', 5], ['state', 6], ['nationals', 4]]);
    expect(LAST_BUILT_STEP).toBe(2);
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
    expect(runState(run).ladder.map(r => [r.status, r.title, r.later ?? false])).toEqual([['current', `Ace ${townOf(run)}`, false], ['ahead', 'Ace Ohio', false], ['ahead', 'Ace America', false]]);
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
    expect(titlesOf(won)).toMatchObject([{ step: 'locals', name: `Ace ${townOf(won)}` }]);
    const prev = currentLeague(won);
    const you = prev.setup.humans[0].teamId;
    const prevPool = poolFor(prev);
    const prevRoster = draftState(prevPool, prev.draftPicks).rosters[you];
    const prevStamps = teamStamps(prev, you, 5);

    // The title stamps (#704): each driver picks one stat at Locals; a bad pick is refused.
    const [d1, d2] = prevRoster.driverIds;
    expect(() => promote(won, { [d1]: ['baseSpeed', 'luck'], [d2]: ['luck'] })).toThrow(/picks 1 different driver stat/);
    expect(() => promote(won, { [d1]: ['power' as never], [d2]: ['luck'] })).toThrow(/picks 1/);
    const next = promote(won, { [d1]: ['aggression'], [d2]: ['luck'] });
    expect(next.titles).toEqual([{ step: 'locals', name: `Ace ${townOf(won)}`, stamps: [{ driverId: d1, stats: ['aggression'] }, { driverId: d2, stats: ['luck'] }] }]);
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
    // Every stamp carries; the title stamps sit on the ribbons (outside the slots) and read in the race build.
    const carried = teamStamps(league, you);
    expect(carriedStamps(carried)).toEqual({ ...carriedStamps(prevStamps), titles: { [d1]: [titleStamp('locals', 'aggression').id], [d2]: [titleStamp('locals', 'luck').id] } });
    // Ink carried up keeps its races left: a stamp with 2 left at the end of Locals has 2 left in State's round 0.
    for (const [id, left] of Object.entries(prevStamps.mileage)) expect(carried.mileage[id]).toBe(left);
    expect(carried.titles[d1][0].stats).toEqual([{ stat: 'aggression', pct: TITLE_STAMP_LEVELS * POINTS_PER_LEVEL }]);
    const plain = leagueForRound({ ...league, setup: { ...league.setup, carry: { ...league.setup.carry!, cards: { ...league.setup.carry!.cards, titles: {} } } } }, 0).roster.find(r => r.id === d1)!;
    const stamped = leagueForRound(league, 0).roster.find(r => r.id === d1)!;
    expect(stamped.stats.aggression).toBeGreaterThan(plain.stats.aggression);
    expect(stamped.stats.luck).toBe(plain.stats.luck);
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

  /** A run with State won (a scripted table) and promoted to Nationals. */
  function atNationals(): RunFacts {
    let run = promote(wonRun('vt'));
    let facts = currentLeague(run);
    const you = facts.setup.humans[0].teamId;
    const mine = draftState(poolFor(facts), facts.draftPicks).rosters[you].driverIds;
    const others = poolFor(facts).drivers.map(d => d.id).filter(id => !mine.includes(id));
    const digest = (i: number) => ({ index: i, trackId: facts.setup.calendar[i], trackName: 't', trackEmoji: '', finishOrder: [...mine, ...others], dnfDriverIds: [], fastestLapDriverId: null, totalTicks: 1000, highlights: [] });
    facts = { ...facts, results: facts.setup.calendar.map((_, i) => digest(i)) };
    run = withCurrentLeague(run, facts);
    expect(runState(run).phase).toBe('league-won');
    expect(titlesOf(run).map(t => t.name)).toEqual([`Ace ${townOf(run)}`, 'Ace Vermont']);
    return promote(run, { [mine[0]]: ['baseSpeed', 'consistency'], [mine[1]]: ['luck', 'endurance'] });
  }

  it('Nationals (#694): every other state\'s Ace, 100 cars, rivals +40, the format on the context, OH1 / OH2 on the cars; the State title stamps ride up', () => {
    const run = atNationals();
    expect(run.titles.map(t => t.name)).toEqual([`Ace ${townOf(run)}`, 'Ace Vermont']);
    expect(run.titles[1].stamps!.map(s => s.stats)).toEqual([['baseSpeed', 'consistency'], ['luck', 'endurance']]);
    const league = currentLeague(run);
    expect(league.setup.league).toMatchObject({ index: 2, step: 'nationals', fieldShift: NATIONALS_SHIFT, format: NATIONALS_FORMAT });
    expect(league.setup.calendar).toHaveLength(4);
    expect(league.setup.teamCount).toBe(50); // 49 other states + you
    const pool = poolFor(league);
    expect(pool.drivers).toHaveLength(100);
    expect(pool.drivers.every(d => d.number >= 2 && d.number <= 99)).toBe(true);
    const rivals = pool.teams.filter(t => t.id !== 'you');
    expect(rivals).toHaveLength(49);
    const seats = rivalStates(run);
    expect(seats.map(s => s.stateId)).not.toContain('vt');
    expect(seats.map(s => s.stateId)).toHaveLength(49);
    rivals.forEach((t, i) => { expect(t.town).toBe(seats[i].town); if (seats[i].color) expect(t.color).toBe(seats[i].color); });
    expect(rivalShifts(league)).toMatchObject(Object.fromEntries(rivals.map(t => [t.id, NATIONALS_SHIFT])));
    const carried = league.setup.carry!;
    expect(Object.values(carried.cards.titles!).flat()).toHaveLength(6); // 1 + 1 from Locals (defaults), 2 + 2 from State
    expect(runState(run).ladder[2]).toMatchObject({ status: 'current', title: 'Ace America' });
    expect(stageOf(league, 0)).toMatchObject({ name: 'The Hundred', alive: 50, drivers: 100 });
    // Identifiers (#725 / #694): the state's postal code plus 1 / 2, yours VT1 / VT2, every state once; the race roster wears them.
    const badges = raceBadges(league);
    const rosters = draftState(pool, league.draftPicks).rosters;
    expect(rosters.you.driverIds.map(id => badges[id])).toEqual(['VT1', 'VT2']);
    const codes = Object.values(badges);
    expect(codes).toHaveLength(100);
    for (const c of codes) expect(c).toMatch(/^[A-Z]{2}[12]$/);
    expect(new Set(codes).size).toBe(100);
    rivals.forEach((t, i) => expect(rosters[t.id].driverIds.map(id => badges[id])).toEqual([`${placeById(seats[i].stateId)!.abbr}1`, `${placeById(seats[i].stateId)!.abbr}2`]));
    for (const d of leagueForRound(league, 0).roster) expect(d.number).toBe(badges[d.id]);
    // The callers know each car's home state from it.
    const voice = feedVoiceFor(league);
    expect(voice.cars![rosters.you.driverIds[0]]).toMatchObject({ no: 'VT1', state: 'Vermont' });
    expect(voice.cars![rosters[rivals[0].id].driverIds[1]].state).toBe(placeById(seats[0].stateId)!.name);
    // The Hundred carries the lap cuts; the Final's first race has no grid yet (the Hundred hasn't run).
    const schedule = leagueForRound(league, 0).schedule;
    expect(schedule[0].lapCuts).toEqual(HUNDRED_CUTS);
    expect(schedule.slice(1).every(r => !r.lapCuts && !r.gridOrder)).toBe(true);
  });

  it('Nationals plays out: the Hundred cuts to 30 / 20 / 10 states after laps 1 / 2 / 3 (eliminated, not DNF), a car that doesn\'t finish is out, the Final starts as the Hundred finished and scores from zero, and the run ends won or out', () => {
    let run = atNationals();
    let facts = currentLeague(run);
    const you = 'you';
    const teamOf = new Map(leagueForRound(facts, 0).roster.map(d => [d.id, d.kingdomId!]));
    for (let round = 0; round < 4; round++) {
      const before = aliveAt(facts, round);
      const lineups = lineupsFor(facts, round);
      expect(lineups.map(l => l.teamId)).toEqual(before.teams);
      expect(lineups.flatMap(l => l.driverIds).sort((a, b) => a - b)).toEqual([...before.drivers].sort((a, b) => a - b));
      if (!isOut(facts, you, round)) {
        const state = seasonState(facts);
        expect(state.whoseTurn).toBe(you);
        facts = openParcelQuick(setLineup(facts, { round, teamId: you, driverIds: lineupFor(facts, round, you) }));
      }
      expect(seasonState(facts).phase).toBe('ready-for-go');
      const league = leagueForRound(facts, round);
      if (round === 1) expect(league.schedule[1].gridOrder).toEqual(facts.results[0].finishOrder);
      else expect(league.schedule[round].gridOrder).toBeUndefined();
      facts = settleRound(facts);
      const digest = facts.results[round];
      const after = aliveAt(facts, round + 1);
      if (round === 0) {
        // The Hundred: 100 cars, every one finished, retired or cut; the cut and the retired are different cars.
        const cut = digest.eliminatedDriverIds ?? [];
        expect(digest.finishOrder.length + digest.dnfDriverIds.length + cut.length).toBe(100);
        expect(cut.some(id => digest.dnfDriverIds.includes(id))).toBe(false);
        expect(cut.length).toBeGreaterThan(50);
        for (const id of cut) expect([1, 2, 3]).toContain(digest.eliminatedAt![id]);
        // Each cut left exactly `keep` states running (fewer only when whole states had already retired).
        const { digest: full } = runScheduledRace(league, 0, getTrackById(facts.setup.calendar[0])!, CANON_VARIABLES);
        expect(full.finishOrder).toEqual(digest.finishOrder);
        const events = full.events!;
        const cuts = events.filter(e => e.type === 'cut');
        expect(cuts).toHaveLength(3);
        for (const c of HUNDRED_CUTS) {
          const at = cuts.find(e => e.description.includes(`after lap ${c.afterLap}`))!;
          expect(at).toBeDefined();
          const outByThen = new Set(events.filter(e => e.tick <= at.tick && (e.type === 'eliminated' || e.type === 'dnf' || e.type === 'tire_failure' || e.type === 'mechanical_failure')).map(e => e.driverId));
          const running = new Set([...teamOf.keys()].filter(id => !outByThen.has(id)).map(id => teamOf.get(id)));
          expect(running.size).toBeLessThanOrEqual(c.keep);
          const retiredStates = new Set([...teamOf.values()].filter(t => [...teamOf.entries()].filter(([, tt]) => tt === t).every(([id]) => outByThen.has(id) && !events.some(e => e.type === 'eliminated' && e.driverId === id))));
          expect(running.size).toBeGreaterThanOrEqual(c.keep - retiredStates.size);
        }
        // Whoever finished is in; nobody else.
        expect([...after.drivers].sort((a, b) => a - b)).toEqual([...digest.finishOrder].sort((a, b) => a - b));
        expect(after.teams.length).toBeLessThanOrEqual(10);
        expect(after.drivers.length).toBeLessThanOrEqual(20);
        for (const t of before.teams) if (!after.teams.includes(t)) expect(after.outAt[t]).toBe(0);
      } else {
        // The Final: no cuts, the field as the Hundred left it.
        expect(digest.eliminatedDriverIds).toBeUndefined();
        expect(digest.finishOrder.length + digest.dnfDriverIds.length).toBe(before.drivers.length);
        expect(after.teams).toEqual(before.teams);
      }
      // Only the Final scores; a team that is out sits below every team still in.
      const table = constructorStandings(facts);
      if (round < NATIONALS_FORMAT.finalFrom) expect(table.every(s => s.points === 0)).toBe(true);
      else expect(table.some(s => s.points > 0)).toBe(true);
      const outRank = table.filter(s => after.outAt[s.teamId] !== undefined).map(s => s.rank);
      const inRank = table.filter(s => after.outAt[s.teamId] === undefined).map(s => s.rank);
      if (outRank.length && inRank.length) expect(Math.min(...outRank)).toBeGreaterThan(Math.max(...inRank));
    }
    run = withCurrentLeague(run, facts);
    const state = runState(run);
    expect(['run-won', 'run-lost']).toContain(state.phase);
    expect(state.phase === 'run-won').toBe(leagueWon(facts));
    if (state.phase === 'run-won') expect(titlesOf(run).map(t => t.name)).toEqual([`Ace ${townOf(run)}`, 'Ace Vermont', 'Ace America']);
    expect(() => promote(run)).toThrow(/cannot promote/);
    // The record replays (State was scripted above, so Nationals alone): the Hundred and its cuts included.
    let again: SeasonFacts = { ...seasonFactsFor(run, 2), results: [] };
    for (let r = 0; r < 4; r++) again = settleRound(again);
    expect(digests(again)).toEqual(digests(facts));
    expect(again.results[0].eliminatedAt).toEqual(facts.results[0].eliminatedAt);
  }, 120000);

  it('out in the Hundred: the run is lost at once, the Ladder says so, and the rest of Nationals settles without you', () => {
    let run = atNationals();
    let facts = currentLeague(run);
    const mine = draftState(poolFor(facts), facts.draftPicks).rosters.you.driverIds;
    facts = openParcelQuick(setLineup(facts, { round: 0, teamId: 'you', driverIds: mine }));
    const others = poolFor(facts).drivers.map(d => d.id).filter(id => !mine.includes(id));
    // A scripted Hundred: your pair cut after lap 1, 60 more cut later, the rest finish.
    const cut = [...mine, ...others.slice(20, 80)];
    const eliminatedAt = Object.fromEntries(cut.map(id => [id, mine.includes(id) ? 1 : 3]));
    facts = { ...facts, results: [{ index: 0, trackId: facts.setup.calendar[0], trackName: 't', trackEmoji: '', finishOrder: others.filter(id => !cut.includes(id)), dnfDriverIds: [], eliminatedDriverIds: cut, eliminatedAt, fastestLapDriverId: null, totalTicks: 1000, highlights: [] }] };
    run = withCurrentLeague(run, facts);
    expect(runState(run).phase).toBe('run-lost');
    expect(isOut(facts, 'you')).toBe(true);
    const rosters = draftState(poolFor(facts), facts.draftPicks).rosters;
    const finished = new Set(facts.results[0].finishOrder);
    const still = Object.entries(rosters).filter(([, r]) => r.driverIds.some(id => finished.has(id))).map(([id]) => id);
    expect(aliveAt(facts).teams).toHaveLength(still.length);
    expect(still.length).toBeGreaterThan(10); // a scripted cut, not the engine's: the count is whatever the script left
    expect(seasonState(facts).phase).toBe('ready-for-go'); // the clock skips you
    expect(lineupsFor(facts, 1).map(l => l.teamId)).not.toContain('you');
    expect(ladderView(run, emptyMeta()).rungs[2].memory).toBe(`Out after The Hundred, with ${still.length} states still in. The run ended here.`);
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
    facts = openParcelQuick(facts);
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
    // Schema 5 (before #778) loads: its town comes from the Oct 14 pool, the same town it had.
    const five = { ...saved, schemaVersion: 5, data: { ...saved.data, setup: { ...saved.data.setup, town: undefined } } };
    store.setItem(RUN_KEY, JSON.stringify(five));
    const migrated = loadRun(store)!;
    expect(migrated.setup.town).toBe(legacyTownOf(saved.data.setup.seed, saved.data.setup.stateId));
    expect(placeById(saved.data.setup.stateId)!.cities.slice(0, TOWN_POOL_OCT14[saved.data.setup.stateId])).toContain(migrated.setup.town);
    // A new run writes its town down, from the whole pool.
    expect(saved.data.setup.town).toBe(dealTown(saved.data.setup.seed, saved.data.setup.stateId));
    store.setItem(RUN_KEY, JSON.stringify({ ...saved, schemaVersion: 2 }));
    expect(loadRun(store)).toBeNull();
    clearRun(store);
    expect(loadRun(store)).toBeNull();
  });

  it('a run with carried stamps plays the next league and survives save → load (#723, #704)', () => {
    const store = memoryStore();
    let run = promote(wonRun());
    const carried = currentLeague(run).setup.carry!.cards;
    expect([...Object.values(carried.drivers).flat(), ...carried.car].length).toBeGreaterThan(0);
    run = playLeague(run);
    const facts = currentLeague(run);
    // Every round folds, no stamp id is held twice, and no card is over its slots.
    for (let round = 0; round <= facts.results.length; round++) {
      const s = teamStamps(facts, 'you', round);
      const held = [...Object.values(s.drivers).flat(), ...s.car].map(c => c.id);
      expect(new Set(held).size).toBe(held.length);
      for (const t of Object.values(s.titles)) expect(new Set(t.map(c => c.id)).size).toBe(t.length);
      expect(Object.values(s.drivers).every(d => d.length <= 4) && s.car.length <= 5).toBe(true);
    }
    expect(saveRun(run, store)).toBe(true);
    const loaded = loadRun(store)!;
    expect(loaded).toEqual(run);
    expect(teamStamps(currentLeague(loaded), 'you')).toEqual(teamStamps(facts, 'you'));
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
    const next = promoteCurrentRun(undefined, store)!;
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
