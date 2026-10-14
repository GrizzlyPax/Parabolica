// #694: a season's format, on a small synthetic season with scripted digests:
// the knockout takes cars (a team with none left is out), a cut keeps the
// top N by best finisher (the second car breaks ties, then draft order), the
// Final alone scores, a team that is out ranks below every team still in,
// and a human that is out has no turn and no Parcel.
import { describe, it, expect } from 'vitest';
import { newSeason, poolFor, seasonState, constructorStandings, driverStandings, lineupsFor, lineupFor, validateLineup, turnDone, type SeasonFacts } from './season';
import { quickDraft, draftState } from './draft';
import { CURRENT_TRACKS } from '../generators/tracks';
import { aliveAt, isOut, scoredRounds, stageOf, bestFinish, type SeasonFormat } from './format';
import { teamGetsParcel } from './stamps';
import type { RaceDigest } from '../league/types';

const FORMAT: SeasonFormat = { knockoutRace: 0, cuts: [{ after: 1, keep: 3 }], finalFrom: 2, stages: ['The Ten', 'The cut', 'The Final', 'The Final'] };

function season(): { facts: SeasonFacts; teams: string[]; rosters: Record<string, { driverIds: number[] }> } {
  const calendar = CURRENT_TRACKS.slice(0, 4).map(t => t.id);
  const league = { index: 0, name: 'N', fieldShift: 0, nemesisShift: 0, bossRound: 3, format: FORMAT };
  const probe = newSeason({ seed: 694, teamCount: 5, humans: [], calendar, league });
  const you = poolFor(probe).teams[1].id;
  let facts = newSeason({ seed: 694, teamCount: 5, humans: [{ teamId: you, name: 'You', color: '#123456' }], calendar, league });
  facts = { ...facts, draftPicks: quickDraft(poolFor(facts)) };
  const pool = poolFor(facts);
  return { facts, teams: pool.teams.map(t => t.id), rosters: draftState(pool, facts.draftPicks).rosters };
}
const digest = (facts: SeasonFacts, i: number, finishOrder: number[], dnf: number[]): RaceDigest => ({ index: i, trackId: facts.setup.calendar[i], trackName: 't', trackEmoji: '', finishOrder, dnfDriverIds: dnf, fastestLapDriverId: null, totalTicks: 1000, highlights: [] } as RaceDigest);

describe('a season\'s format (#694)', () => {
  it('the knockout takes cars, the cut keeps the top three by best finisher, the Final scores from zero', () => {
    const { facts, teams, rosters } = season();
    const [A, B, C, D, E] = teams;
    const d = (t: string) => rosters[t].driverIds;
    expect(aliveAt(facts, 0)).toEqual({ teams, drivers: teams.flatMap(d), outAt: {} });
    expect(stageOf(facts, 0)).toEqual({ name: 'The Ten', alive: 5, drivers: 10, decides: 'a car that doesn\'t finish is out' });
    // Race 1: both of A's cars and one of B's don't finish.
    const dnf0 = [...d(A), d(B)[0]];
    const order0 = teams.flatMap(d).filter(id => !dnf0.includes(id));
    let f: SeasonFacts = { ...facts, results: [digest(facts, 0, order0, dnf0)] };
    let alive = aliveAt(f, 1);
    expect(alive.teams).toEqual([B, C, D, E]);
    expect(alive.drivers).toEqual([d(B)[1], ...d(C), ...d(D), ...d(E)]);
    expect(alive.outAt).toEqual({ [A]: 0 });
    expect(isOut(f, A)).toBe(true);
    expect(lineupsFor(f, 1)).toEqual([{ teamId: B, driverIds: [d(B)[1]] }, { teamId: C, driverIds: d(C) }, { teamId: D, driverIds: d(D) }, { teamId: E, driverIds: d(E) }]);
    expect(stageOf(f, 1)).toMatchObject({ name: 'The cut', alive: 4, drivers: 7, decides: 'the top 3 stay' });
    // Race 2: E's best car wins, D's second, C's third; B's one car fourth, and A's cars (out) are not on the grid.
    const order1 = [d(E)[0], d(D)[0], d(C)[1], d(B)[1], d(C)[0], d(D)[1], d(E)[1]];
    f = { ...f, results: [...f.results, digest(f, 1, order1, [])] };
    alive = aliveAt(f, 2);
    expect(alive.teams).toEqual([C, D, E]);
    expect(alive.outAt).toEqual({ [A]: 0, [B]: 1 });
    expect(bestFinish(f.results[1], d(C))).toEqual([3, 5]);
    // Nothing scored yet; the out teams sit at the bottom, the later cut higher.
    let table = constructorStandings(f);
    expect(table.every(s => s.points === 0)).toBe(true);
    expect(table.slice(3).map(s => s.teamId)).toEqual([B, A]);
    expect(scoredRounds(f)).toEqual([]);
    // The Final: C wins both races; only those points count.
    const order2 = [d(C)[0], d(D)[0], d(E)[0], d(C)[1], d(D)[1], d(E)[1]];
    f = { ...f, results: [...f.results, digest(f, 2, order2, []), digest(f, 3, order2, [])] };
    expect(scoredRounds(f)).toEqual([2, 3]);
    table = constructorStandings(f);
    expect(table[0]).toMatchObject({ teamId: C, wins: 2, rank: 1 });
    expect(table[0].perRound.slice(0, 2)).toEqual([0, 0]);
    expect(table[0].points).toBe(table[0].perRound[2] + table[0].perRound[3]);
    expect(driverStandings(f)[0].driverId).toBe(d(C)[0]);
    expect(table.map(s => s.teamId).slice(3)).toEqual([B, A]);
    expect(seasonState(f).phase).toBe('finished');
  });

  it('a tie on the best car goes to the second car, then draft order', () => {
    const { facts, teams, rosters } = season();
    const d = (t: string) => rosters[t].driverIds;
    const [A, B, C, D, E] = teams;
    // Race 1, no retirements. Race 2: A and B share... can't share a position; A's best 1st, B's best 2nd, C 3rd, D 4th, E 5th with their second cars reversed.
    const all = teams.flatMap(d);
    let f: SeasonFacts = { ...facts, results: [digest(facts, 0, all, [])] };
    const order1 = [d(A)[0], d(B)[0], d(C)[0], d(D)[0], d(E)[0], d(E)[1], d(D)[1], d(C)[1], d(B)[1], d(A)[1]];
    f = { ...f, results: [...f.results, digest(f, 1, order1, [])] };
    expect(aliveAt(f, 2).teams).toEqual([A, B, C]);
    // Second cars decide when the best cars are level: D's best car didn't finish, E's did.
    const order1b = [d(A)[0], d(B)[0], d(C)[0], d(E)[0], d(C)[1], d(B)[1], d(A)[1], d(E)[1], d(D)[1]];
    f = { ...f, results: [f.results[0], digest(f, 1, order1b, [d(D)[0]])] };
    expect(bestFinish(f.results[1], d(D))).toEqual([9, 10]);
    expect(aliveAt(f, 2).teams).toEqual([A, B, C]);
  });

  it('the human races the cars still in, has no turn once out, and gets no Parcel', () => {
    const { facts, teams, rosters } = season();
    const you = facts.setup.humans[0].teamId;
    const mine = rosters[you].driverIds;
    expect(validateLineup(facts, { round: 0, teamId: you, driverIds: [mine[0]] })).toMatch(/cars still in/);
    expect(validateLineup(facts, { round: 0, teamId: you, driverIds: [mine[1], mine[0]] })).toBeNull();
    const all = teams.flatMap(t => rosters[t].driverIds);
    // One of your cars out in the knockout: your lineup is the other, alone.
    let f: SeasonFacts = { ...facts, results: [digest(facts, 0, all.filter(id => id !== mine[0]), [mine[0]])] };
    expect(lineupFor(f, 1, you)).toEqual([mine[1]]);
    expect(validateLineup(f, { round: 1, teamId: you, driverIds: mine })).toMatch(/cars still in/);
    expect(validateLineup(f, { round: 1, teamId: you, driverIds: [mine[1]] })).toBeNull();
    expect(teamGetsParcel(f, you)).toBe(true);
    // Both out: no turn, no Parcel, the clock skips you.
    f = { ...facts, results: [digest(facts, 0, all.filter(id => !mine.includes(id)), mine)] };
    expect(isOut(f, you)).toBe(true);
    expect(turnDone(f, 1, you)).toBe(true);
    expect(teamGetsParcel(f, you)).toBe(false);
    expect(seasonState(f).phase).toBe('ready-for-go');
    expect(lineupsFor(f, 1).map(l => l.teamId)).not.toContain(you);
  });
});
