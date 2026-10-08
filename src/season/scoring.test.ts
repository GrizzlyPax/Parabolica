// #321: the final table = race points + the drivers'-champion bonus.
import { describe, it, expect } from 'vitest';
import { quickDraft, draftState } from './draft';
import { constructorStandings, driverStandings, newSeason, poolFor, seasonState, settleRound } from './season';
import { DRIVERS_CHAMPION_BONUS, seasonTable } from './scoring';
import { CURRENT_TRACKS } from '../generators/tracks';

function cpuSeason(seed: number, races: number) {
  let facts = newSeason({ seed, teamCount: 6, humans: [], calendar: CURRENT_TRACKS.slice(0, races).map(t => t.id) });
  facts = { ...facts, draftPicks: quickDraft(poolFor(facts)) };
  while (seasonState(facts).phase !== 'finished') facts = settleRound(facts);
  return facts;
}

describe('seasonTable', () => {
  it('adds the bonus once, to the team of the drivers’ champion, and ranks on the total', () => {
    const facts = cpuSeason(5, 3);
    const table = seasonTable(facts);
    expect(table.final).toBe(true);
    const champ = driverStandings(facts)[0];
    const rosters = draftState(poolFor(facts), facts.draftPicks).rosters;
    expect(rosters[table.driversChampion!.teamId].driverIds).toContain(champ.driverId);
    expect(table.lines.filter(l => l.bonus > 0)).toEqual([expect.objectContaining({ teamId: table.driversChampion!.teamId, bonus: DRIVERS_CHAMPION_BONUS })]);
    // Totals add up: every race point, plus one bonus.
    const racePoints = constructorStandings(facts).reduce((s, l) => s + l.points, 0);
    expect(table.lines.reduce((s, l) => s + l.total, 0)).toBe(racePoints + DRIVERS_CHAMPION_BONUS);
    expect(table.lines.every((l, i) => i === 0 || l.total <= table.lines[i - 1].total)).toBe(true);
    expect(table.lines.map(l => l.rank)).toEqual(table.lines.map((_, i) => i + 1));
  });

  it('the dial moves the result: a big enough bonus crowns the champion’s team', () => {
    const facts = cpuSeason(9, 3);
    const t = seasonTable(facts, 10_000);
    expect(t.lines[0].teamId).toBe(t.driversChampion!.teamId);
    expect(seasonTable(facts, 0).lines.map(l => l.teamId)).toEqual(constructorStandings(facts).map(l => l.teamId));
  });

  it('before any race: no champion, no bonus', () => {
    let facts = newSeason({ seed: 1, teamCount: 5, humans: [], calendar: ['speed-power'] });
    facts = { ...facts, draftPicks: quickDraft(poolFor(facts)) };
    const t = seasonTable(facts);
    expect(t.driversChampion).toBeNull();
    expect(t.final).toBe(false);
    expect(t.lines.every(l => l.total === 0)).toBe(true);
  });
});
