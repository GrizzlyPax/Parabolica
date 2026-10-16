// #694: a season's format (Pax's answers Oct 15), on a small synthetic season
// with scripted digests: the Hundred takes the cars that don't finish it (cut
// or retired; a team with none left is out), the Final alone scores (a tie on
// points and wins goes to the better finish in the last race), a team that is
// out ranks below every team still in, the Final's first grid is the
// Hundred's finish, and a human that is out has no turn and no Parcel.
import { describe, it, expect } from 'vitest';
import { newSeason, poolFor, seasonState, constructorStandings, driverStandings, lineupsFor, lineupFor, validateLineup, turnDone, leagueForRound, type SeasonFacts } from './season';
import { quickDraft, draftState } from './draft';
import { CURRENT_TRACKS } from '../generators/tracks';
import { aliveAt, isOut, scoredRounds, stageOf, bestFinish, gridFor, lapCutsFor, type SeasonFormat } from './format';
import { teamGetsParcel } from './stamps';
import type { RaceDigest } from '../league/types';

const CUTS = [{ afterLap: 1, keep: 4 }, { afterLap: 2, keep: 3 }];
const FORMAT: SeasonFormat = { hundred: { race: 0, lapCuts: CUTS }, finalFrom: 1, stages: ['The Ten', 'The Final', 'The Final'] };

function season(): { facts: SeasonFacts; teams: string[]; rosters: Record<string, { driverIds: number[] }> } {
  const calendar = CURRENT_TRACKS.slice(0, 3).map(t => t.id);
  const league = { index: 0, name: 'N', fieldShift: 0, nemesisShift: 0, bossRound: 2, format: FORMAT };
  const probe = newSeason({ seed: 694, teamCount: 5, humans: [], calendar, league });
  const you = poolFor(probe).teams[1].id;
  let facts = newSeason({ seed: 694, teamCount: 5, humans: [{ teamId: you, name: 'You', color: '#123456' }], calendar, league });
  facts = { ...facts, draftPicks: quickDraft(poolFor(facts)) };
  const pool = poolFor(facts);
  return { facts, teams: pool.teams.map(t => t.id), rosters: draftState(pool, facts.draftPicks).rosters };
}
const digest = (facts: SeasonFacts, i: number, finishOrder: number[], dnf: number[], eliminated: number[] = []): RaceDigest => ({
  index: i, trackId: facts.setup.calendar[i], trackName: 't', trackEmoji: '', finishOrder, dnfDriverIds: dnf, fastestLapDriverId: null, totalTicks: 1000, highlights: [],
  ...(eliminated.length ? { eliminatedDriverIds: eliminated, eliminatedAt: Object.fromEntries(eliminated.map(id => [id, 1])) } : {}),
} as RaceDigest);

describe('a season\'s format (#694)', () => {
  it('the Hundred takes the cut and the retired, the Final scores from zero, its first grid is the Hundred\'s finish', () => {
    const { facts, teams, rosters } = season();
    const [A, B, C, D, E] = teams;
    const d = (t: string) => rosters[t].driverIds;
    expect(aliveAt(facts, 0)).toEqual({ teams, drivers: teams.flatMap(d), outAt: {} });
    expect(stageOf(facts, 0)).toEqual({ name: 'The Ten', alive: 5, drivers: 10, decides: '4 / 3 states go on after laps 1 / 2; a car that doesn\'t finish is out' });
    expect(lapCutsFor(facts, 0)).toEqual(CUTS);
    expect(lapCutsFor(facts, 1)).toBeUndefined();
    expect(gridFor(facts, 1)).toBeUndefined(); // not raced yet
    expect(leagueForRound(facts, 0).schedule[0]).toMatchObject({ lapCuts: CUTS });
    expect(leagueForRound(facts, 0).schedule[1].gridOrder).toBeUndefined();
    // The Hundred: A's cars are cut, B's first car retires, E's second car is cut.
    const cut = [...d(A), d(E)[1]];
    const dnf = [d(B)[0]];
    const order0 = [d(E)[0], d(D)[0], d(C)[1], d(B)[1], d(C)[0], d(D)[1]];
    let f: SeasonFacts = { ...facts, results: [digest(facts, 0, order0, dnf, cut)] };
    const alive = aliveAt(f, 1);
    expect(alive.teams).toEqual([B, C, D, E]);
    expect(alive.drivers).toEqual([d(B)[1], ...d(C), ...d(D), d(E)[0]]);
    expect(alive.outAt).toEqual({ [A]: 0 });
    expect(isOut(f, A)).toBe(true);
    expect(lineupsFor(f, 1)).toEqual([{ teamId: B, driverIds: [d(B)[1]] }, { teamId: C, driverIds: d(C) }, { teamId: D, driverIds: d(D) }, { teamId: E, driverIds: [d(E)[0]] }]);
    expect(stageOf(f, 1)).toMatchObject({ name: 'The Final', alive: 4, drivers: 6, decides: 'points from zero; most points is the title' });
    // The Final's first race starts as the Hundred finished; the second qualifies.
    expect(gridFor(f, 1)).toEqual(order0);
    const league = leagueForRound(f, 1);
    expect(league.schedule[1]).toMatchObject({ gridOrder: order0 });
    expect(league.schedule[1].lapCuts).toBeUndefined();
    expect(league.schedule[2].gridOrder).toBeUndefined();
    expect(league.roster.map(r => r.id).sort((a, b) => a - b)).toEqual([...alive.drivers].sort((a, b) => a - b));
    // Nothing scored yet; A sits at the bottom.
    let table = constructorStandings(f);
    expect(table.every(s => s.points === 0)).toBe(true);
    expect(table[4].teamId).toBe(A);
    expect(scoredRounds(f)).toEqual([]);
    // The Final: C wins both races; only those points count.
    const order1 = [d(C)[0], d(D)[0], d(E)[0], d(C)[1], d(D)[1], d(B)[1]];
    f = { ...f, results: [...f.results, digest(f, 1, order1, []), digest(f, 2, order1, [])] };
    expect(scoredRounds(f)).toEqual([1, 2]);
    table = constructorStandings(f);
    expect(table[0]).toMatchObject({ teamId: C, wins: 2, rank: 1 });
    expect(table[0].perRound[0]).toBe(0);
    expect(table[0].points).toBe(table[0].perRound[1] + table[0].perRound[2]);
    expect(driverStandings(f)[0].driverId).toBe(d(C)[0]);
    expect(table[4].teamId).toBe(A);
    expect(seasonState(f).phase).toBe('finished');
  });

  it('a tie on points and wins goes to the better finish in the last race', () => {
    const { facts, teams, rosters } = season();
    const d = (t: string) => rosters[t].driverIds;
    const [A, B] = teams;
    const all = teams.flatMap(d);
    // Everyone finishes the Hundred. Final race 1: A's best 1st, B's best 2nd; race 2 the reverse. Points level, wins level.
    const rest = all.filter(id => !d(A).includes(id) && !d(B).includes(id));
    const r1 = [d(A)[0], d(B)[0], d(A)[1], d(B)[1], ...rest];
    const r2 = [d(B)[0], d(A)[0], d(B)[1], d(A)[1], ...rest];
    const f: SeasonFacts = { ...facts, results: [digest(facts, 0, all, []), digest(facts, 1, r1, []), digest(facts, 2, r2, [])] };
    const table = constructorStandings(f);
    expect(table[0].points).toBe(table[1].points);
    expect(table[0].wins).toBe(table[1].wins);
    expect(table[0].teamId).toBe(B); // B finished better in the last race
    expect(bestFinish(f.results[2], d(B))).toEqual([1, expect.any(Number)]);
  });

  it('the human races the cars still in, has no turn once out, and gets no Parcel', () => {
    const { facts, teams, rosters } = season();
    const you = facts.setup.humans[0].teamId;
    const mine = rosters[you].driverIds;
    expect(validateLineup(facts, { round: 0, teamId: you, driverIds: [mine[0]] })).toMatch(/cars still in/);
    expect(validateLineup(facts, { round: 0, teamId: you, driverIds: [mine[1], mine[0]] })).toBeNull();
    const all = teams.flatMap(t => rosters[t].driverIds);
    // One of your cars cut in the Hundred: your lineup is the other, alone.
    let f: SeasonFacts = { ...facts, results: [digest(facts, 0, all.filter(id => id !== mine[0]), [], [mine[0]])] };
    expect(lineupFor(f, 1, you)).toEqual([mine[1]]);
    expect(validateLineup(f, { round: 1, teamId: you, driverIds: mine })).toMatch(/cars still in/);
    expect(validateLineup(f, { round: 1, teamId: you, driverIds: [mine[1]] })).toBeNull();
    expect(teamGetsParcel(f, you)).toBe(true);
    // Both out (one cut, one retired): no turn, no Parcel, the clock skips you.
    f = { ...facts, results: [digest(facts, 0, all.filter(id => !mine.includes(id)), [mine[1]], [mine[0]])] };
    expect(isOut(f, you)).toBe(true);
    expect(turnDone(f, 1, you)).toBe(true);
    expect(teamGetsParcel(f, you)).toBe(false);
    expect(seasonState(f).phase).toBe('ready-for-go');
    expect(lineupsFor(f, 1).map(l => l.teamId)).not.toContain(you);
  });
});
