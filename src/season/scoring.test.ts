// #321, #509: two championships; the constructors' table is race points only.
import { describe, it, expect } from 'vitest';
import { quickDraft, draftState } from './draft';
import { constructorStandings, driverStandings, newSeason, poolFor, seasonState, settleRound } from './season';
import { seasonTable } from './scoring';
import { CURRENT_TRACKS } from '../generators/tracks';

function cpuSeason(seed: number, races: number) {
  let facts = newSeason({ seed, teamCount: 6, humans: [], calendar: CURRENT_TRACKS.slice(0, races).map(t => t.id) });
  facts = { ...facts, draftPicks: quickDraft(poolFor(facts)) };
  while (seasonState(facts).phase !== 'finished') facts = settleRound(facts);
  return facts;
}

describe('seasonTable: two championships, no bonus (#509)', () => {
  it('constructors\u2019 = race points only; the drivers\u2019 champion is the top of the drivers\u2019 table', () => {
    const facts = cpuSeason(5, 3);
    const table = seasonTable(facts);
    expect(table.final).toBe(true);
    expect(table.lines).toEqual(constructorStandings(facts));
    const champ = driverStandings(facts)[0];
    expect(table.driversChampion!.driver.driverId).toBe(champ.driverId);
    const rosters = draftState(poolFor(facts), facts.draftPicks).rosters;
    expect(rosters[table.driversChampion!.teamId].driverIds).toContain(champ.driverId);
    expect(table.lines.every((l, i) => i === 0 || l.points <= table.lines[i - 1].points)).toBe(true);
    expect(table.lines.map(l => l.rank)).toEqual(table.lines.map((_, i) => i + 1));
    expect(table.lines.some(l => 'bonus' in l)).toBe(false);
  });

  it('before any race: no champion, nobody on points', () => {
    let facts = newSeason({ seed: 1, teamCount: 5, humans: [], calendar: ['speed-power'] });
    facts = { ...facts, draftPicks: quickDraft(poolFor(facts)) };
    const t = seasonTable(facts);
    expect(t.driversChampion).toBeNull();
    expect(t.final).toBe(false);
    expect(t.lines.every(l => l.points === 0)).toBe(true);
  });
});
