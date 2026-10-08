// #315: the season loop. A scripted season replays identically, turns run in
// reverse standings, the grid is 2 per team, and save→load changes nothing.
import { describe, it, expect } from 'vitest';
import {
  newSeason, seasonState, setLineup, settleRound, constructorStandings, driverStandings, paddockOrder, lineupFor,
  leagueForRound, whoseTurn, saveSeason, loadSeason, clearSeason, raceSeed, cpuTurn, SEASON_KEY, type SeasonFacts, type SeasonStore,
} from './season';
import { quickDraft, draftOrder, draftState } from './draft';
import { poolFor } from './season';
import { openPack } from './testHelpers';
import { prepareScheduledRace } from '../league/settle';
import { CURRENT_TRACKS, getTrackById } from '../generators/tracks';
import { CANON_VARIABLES } from '../simlab/types';
import RaceEngine from '../RaceEngine';

const CALENDAR = CURRENT_TRACKS.slice(0, 3).map(t => t.id);

function memoryStore(): SeasonStore {
  const map = new Map<string, string>();
  return { getItem: k => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v), removeItem: k => void map.delete(k) };
}

/** Setup + Quick Draft, with `humanCount` humans at the given draft-order slots. */
function scripted(seed: number, teams: number, humanSlots: number[] = [3]): SeasonFacts {
  const probe = newSeason({ seed, teamCount: teams, humans: [], calendar: CALENDAR });
  const order = draftOrder(poolFor(probe));
  const humans = humanSlots.map((slot, i) => ({ teamId: order[slot], name: `Human ${i + 1}`, color: '#123456' }));
  let facts = newSeason({ seed, teamCount: teams, humans, calendar: CALENDAR });
  facts = { ...facts, draftPicks: quickDraft(poolFor(facts)) };
  return facts;
}

/** Humans always field their last two drafted drivers (so the default would differ). */
function playRound(facts: SeasonFacts): SeasonFacts {
  for (;;) {
    const state = seasonState(facts);
    if (state.phase !== 'paddock') break;
    const roster = draftState(poolFor(facts), facts.draftPicks).rosters[state.whoseTurn!];
    facts = setLineup(facts, { round: state.round, teamId: state.whoseTurn!, driverIds: [roster.driverIds[1], roster.driverIds[2]] });
    facts = openPack(facts);
  }
  expect(seasonState(facts).phase).toBe('ready-for-go');
  return settleRound(facts);
}

function playSeason(facts: SeasonFacts): SeasonFacts {
  while (seasonState(facts).phase !== 'finished') facts = playRound(facts);
  return facts;
}

const comparable = (f: SeasonFacts) => ({
  results: f.results.map(({ events: _e, ...d }) => d),
  standings: constructorStandings(f),
  drivers: driverStandings(f),
});

describe('phases', () => {
  it('walks draft → paddock → ready-for-go → … → finished', () => {
    let facts = newSeason({ seed: 1, teamCount: 5, humans: [], calendar: CALENDAR });
    expect(seasonState(facts).phase).toBe('draft');
    facts = { ...facts, draftPicks: quickDraft(poolFor(facts)) };
    // No humans: every turn is a CPU no-op, so the round is ready at once.
    expect(seasonState(facts).phase).toBe('ready-for-go');
    expect(whoseTurn(facts)).toBeNull();
    expect(cpuTurn(facts, 0, poolFor(facts).teams[0].id)).toEqual({});
    for (let r = 0; r < CALENDAR.length; r++) {
      expect(seasonState(facts).round).toBe(r);
      facts = settleRound(facts);
    }
    expect(seasonState(facts).phase).toBe('finished');
    expect(() => settleRound(facts)).toThrow(/finished/);
  });

  it('one human: the clock stops on them every round; a lineup out of turn or off the squad is refused', () => {
    let facts = scripted(2, 6, [2]);
    const human = facts.setup.humans[0].teamId;
    const state = seasonState(facts);
    expect(state.phase).toBe('paddock');
    expect(state.whoseTurn).toBe(human);
    const roster = draftState(poolFor(facts), facts.draftPicks).rosters;
    const other = poolFor(facts).teams.find(t => t.id !== human)!.id;
    expect(() => setLineup(facts, { round: 0, teamId: other, driverIds: [roster[other].driverIds[0], roster[other].driverIds[1]] })).toThrow(/clock/);
    expect(() => setLineup(facts, { round: 1, teamId: human, driverIds: [roster[human].driverIds[0], roster[human].driverIds[1]] })).toThrow(/round/);
    expect(() => setLineup(facts, { round: 0, teamId: human, driverIds: [roster[human].driverIds[0], roster[other].driverIds[1]] })).toThrow(/on/);
    expect(() => setLineup(facts, { round: 0, teamId: human, driverIds: [roster[human].driverIds[0], roster[human].driverIds[0]] })).toThrow(/different/);
    facts = setLineup(facts, { round: 0, teamId: human, driverIds: [roster[human].driverIds[2], roster[human].driverIds[0]] });
    // The lineup is set, but the pack is still to open (#316): the turn goes on.
    expect(seasonState(facts).whoseTurn).toBe(human);
    expect(() => setLineup(facts, { round: 0, teamId: human, driverIds: [roster[human].driverIds[0], roster[human].driverIds[1]] })).toThrow(/already/);
    facts = openPack(facts);
    expect(seasonState(facts).phase).toBe('ready-for-go');
    expect(() => setLineup(facts, { round: 0, teamId: human, driverIds: [roster[human].driverIds[0], roster[human].driverIds[1]] })).toThrow(/Paddock/);
    facts = settleRound(facts);
    expect(seasonState(facts)).toMatchObject({ round: 1, phase: 'paddock', whoseTurn: human });
    // Their last lineup carries over as the default until they set a new one.
    expect(lineupFor(facts, 1, human)).toEqual([roster[human].driverIds[2], roster[human].driverIds[0]]);
    // CPUs race their first two drafted drivers.
    expect(lineupFor(facts, 1, other)).toEqual([roster[other].driverIds[0], roster[other].driverIds[1]]);
  });

  it('hotseat: two humans take turns in Paddock order, then the round is ready', () => {
    const facts = scripted(3, 6, [0, 5]);
    const [a, b] = facts.setup.humans.map(h => h.teamId);
    const order = paddockOrder(facts);
    // Round 1: draft order reversed, so the last drafter goes first.
    expect(order).toEqual([...draftOrder(poolFor(facts))].reverse());
    expect(order[0]).toBe(b);
    expect(whoseTurn(facts)).toBe(b);
    const roster = draftState(poolFor(facts), facts.draftPicks).rosters;
    let f = openPack(setLineup(facts, { round: 0, teamId: b, driverIds: [roster[b].driverIds[0], roster[b].driverIds[2]] }));
    expect(whoseTurn(f)).toBe(a);
    f = openPack(setLineup(f, { round: 0, teamId: a, driverIds: [roster[a].driverIds[0], roster[a].driverIds[1]] }));
    expect(seasonState(f).phase).toBe('ready-for-go');
    expect(whoseTurn(f)).toBeNull();
  });
});

describe('a scripted 3-round season', () => {
  it('replays identically from the same facts, and the grid is two drivers per team', () => {
    const a = playSeason(scripted(42, 10));
    const b = playSeason(scripted(42, 10));
    expect(a.results).toHaveLength(3);
    expect(comparable(a)).toEqual(comparable(b));
    expect(a.results.map(d => d.finishOrder.length + d.dnfDriverIds.length)).toEqual([20, 20, 20]);
    for (let r = 0; r < 3; r++) {
      const league = leagueForRound(a, r);
      expect(league.roster).toHaveLength(20);
      for (const t of poolFor(a).teams) expect(league.roster.filter(d => d.kingdomId === t.id)).toHaveLength(2);
      expect(league.schedule[r].seed).toBe(raceSeed(42, r));
    }
    // Different seasons differ.
    expect(comparable(playSeason(scripted(43, 10))).results).not.toEqual(comparable(a).results);
    // Standings add up: every point scored in a digest lands on some team.
    const standings = constructorStandings(a);
    const total = standings.reduce((s, l) => s + l.points, 0);
    expect(total).toBe(3 * [25, 18, 15, 12, 10, 8, 6, 4, 2, 1].reduce((x, y) => x + y, 0) - dnfPointsLost(a));
    expect(standings.map(s => s.rank)).toEqual(standings.map((_, i) => i + 1));
    expect(standings.every((s, i) => i === 0 || s.points <= standings[i - 1].points)).toBe(true);
    expect(driverStandings(a)).toHaveLength(30);
  });

  it('Paddock order is reverse standings, ties to the team further back in the draft order', () => {
    const facts = playRound(scripted(7, 10));
    const standings = constructorStandings(facts);
    expect(paddockOrder(facts)).toEqual([...standings].reverse().map(s => s.teamId));
    expect(paddockOrder(facts)[0]).toBe(standings[standings.length - 1].teamId);
    // Zero-point teams tie: the one further back in the draft order goes first.
    const order = draftOrder(poolFor(facts));
    const zeros = standings.filter(s => s.points === 0).map(s => s.teamId);
    const zerosInPaddock = paddockOrder(facts).filter(id => zeros.includes(id));
    expect(zerosInPaddock).toEqual([...zeros].sort((x, y) => order.indexOf(y) - order.indexOf(x)));
  });

  it('the live view and the headless settle are the same race', () => {
    const facts = scripted(5, 5, []);
    const league = leagueForRound(facts, 0);
    const track = getTrackById(CALENDAR[0])!;
    const engine = RaceEngine.createForWorker();
    prepareScheduledRace(engine, league, 0, track, CANON_VARIABLES);
    const live = engine.runHeadless();
    const settled = settleRound(facts).results[0];
    expect(live.raceState.finishOrder).toEqual(settled.finishOrder);
    expect(live.raceState.totalTicks).toBe(settled.totalTicks);
    expect(settled.events).toBeUndefined();
  });

  it('save → load → the same season continues identically', () => {
    const store = memoryStore();
    const played = playRound(playRound(scripted(11, 8, [1, 6])));
    expect(saveSeason(played, store, 123)).toBe(true);
    const loaded = loadSeason(store)!;
    expect(loaded).toEqual(played);
    expect(JSON.parse(store.getItem(SEASON_KEY)!).savedAt).toBe(123);
    const finishedA = playRound(played), finishedB = playRound(loaded);
    expect(comparable(finishedA)).toEqual(comparable(finishedB));
    expect(seasonState(finishedA).phase).toBe('finished');
    // One slot: a new save overwrites; clear empties it; bad schema loads nothing.
    saveSeason(scripted(99, 5), store);
    expect(loadSeason(store)!.setup.seed).toBe(99);
    clearSeason(store);
    expect(loadSeason(store)).toBeNull();
    store.setItem(SEASON_KEY, JSON.stringify({ schemaVersion: 0, data: played }));
    expect(loadSeason(store)).toBeNull();
    store.setItem(SEASON_KEY, '{nope');
    expect(loadSeason(store)).toBeNull();
  });
});

/** Points the F1 table would have paid to positions that nobody classified in (DNFs beyond P10 lose nothing). */
function dnfPointsLost(f: SeasonFacts): number {
  const table = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
  return f.results.reduce((s, d) => s + table.slice(d.finishOrder.length).reduce((x, y) => x + y, 0), 0);
}
