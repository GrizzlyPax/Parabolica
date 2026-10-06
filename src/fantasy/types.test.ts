import { describe, it, expect } from 'vitest';
import { snakeOrder, onTheClock, draftComplete, fantasyStandings, driverPointsInRace, fantasyOwners, type FantasyConfig } from './types';

const cfg = (picks: number[][]): FantasyConfig => ({ squadSize: 3, teams: picks.map((driverIds, i) => ({ id: `t${i}`, name: `Team ${i}`, color: 'cyan', driverIds })) });

describe('snake draft', () => {
  it('reverses each round', () => {
    expect(snakeOrder(3, 3)).toEqual([0, 1, 2, 2, 1, 0, 0, 1, 2]);
    expect(snakeOrder(2, 2)).toEqual([0, 1, 1, 0]);
  });
  it('knows who is on the clock and when it is over', () => {
    expect(onTheClock(cfg([[], [], []]))).toEqual({ teamIndex: 0, pick: 1, of: 9 });
    expect(onTheClock(cfg([[1], [2], [3]]))).toEqual({ teamIndex: 2, pick: 4, of: 9 });
    expect(onTheClock(cfg([[1, 6], [2, 5], [3, 4]]))).toEqual({ teamIndex: 0, pick: 7, of: 9 });
    const done = cfg([[1, 6, 7], [2, 5, 8], [3, 4, 9]]);
    expect(onTheClock(done)).toBeNull();
    expect(draftComplete(done)).toBe(true);
    expect(draftComplete(cfg([[1, 2, 3]]))).toBe(false); // one team is not a league
  });
});

describe('scoring', () => {
  const race = (order: number[], dnf: number[] = []) => ({ finishOrder: order, dnfDriverIds: dnf });
  it('is the F1 table per driver; DNF scores nothing', () => {
    const d = race([7, 3, 9, 1, 2, 4, 5, 6, 8, 10, 11], [12]);
    expect(driverPointsInRace(d, 7)).toBe(25);
    expect(driverPointsInRace(d, 3)).toBe(18);
    expect(driverPointsInRace(d, 11)).toBe(0);
    expect(driverPointsInRace(d, 12)).toBe(0);
  });
  it('sums a squad across races and ranks teams', () => {
    const c = cfg([[7, 11, 12], [3, 9, 1]]);
    const s = fantasyStandings(c, [race([7, 3, 9, 1, 2, 4, 5, 6, 8, 10, 11], [12]), race([3, 7, 1, 9, 2, 4, 5, 6, 8, 10, 11, 12])]);
    expect(s[0].team.id).toBe('t1');
    expect(s[0].points).toBe(18 + 15 + 12 + 25 + 15 + 12);
    expect(s[1].points).toBe(25 + 0 + 0 + 18 + 0 + 0);
    expect(s[0].rank).toBe(1); expect(s[1].rank).toBe(2);
    expect(s[0].perRace).toEqual([45, 52]);
    expect(fantasyOwners(c).get(9)?.id).toBe('t1');
  });
});
