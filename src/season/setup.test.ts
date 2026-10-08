// #317 League Setup: the defaults are one tap, the calendar comes from the
// seed, and humans sit in the first slots.
import { describe, it, expect } from 'vitest';
import { getTrackById } from '../generators/tracks';
import { DEFAULT_TEAMS, generateSeasonPool } from './genesis';
import { DEFAULT_CALENDAR_LENGTH, newSeason, seasonState } from './season';
import { calendarTrackIds, defaultSetup, firstFreePick, humansFor, keepPicks, nextTrack, resolvePicks, seasonCalendar, seasonName, tapTeam } from './setup';

describe('League Setup defaults', () => {
  it('one seed gives a whole season: 10 teams, 1 human, 10 races the sim can run', () => {
    const setup = defaultSetup(4242);
    expect(setup.teamCount).toBe(DEFAULT_TEAMS);
    expect(setup.humans).toHaveLength(1);
    expect(setup.calendar).toHaveLength(DEFAULT_CALENDAR_LENGTH);
    expect(setup.calendar.every(id => getTrackById(id))).toBe(true);
    expect(defaultSetup(4242)).toEqual(setup);
    expect(seasonName(setup)).toMatch(/^The /);
    expect(seasonState(newSeason(setup)).phase).toBe('draft');
  });

  it('the calendar never runs the same track twice in a row and uses every track before repeating', () => {
    const ids = calendarTrackIds();
    for (const seed of [1, 2, 3, 99]) {
      const cal = seasonCalendar(seed, 20, ids);
      expect(cal).toHaveLength(20);
      cal.forEach((id, i) => { if (i > 0) expect(id).not.toBe(cal[i - 1]); });
      expect(new Set(cal.slice(0, Math.min(ids.length, 20))).size).toBe(Math.min(ids.length, 20));
    }
    expect(nextTrack(ids[ids.length - 1], ids)).toBe(ids[0]);
  });

  it('#440: each human taps a team; held teams can’t be taken; tap again to let go; unpicked humans get the first free teams', () => {
    const pool = generateSeasonPool(7, 6);
    const deck = pool.teams.map(t => t.deckTeamId!);
    let picks: (string | null)[] = [deck[0], deck[1]];
    // P1 takes team 4; P2 can't take it; P2 lets team 1 go.
    picks = tapTeam(pool, picks, 0, 'team-4');
    expect(picks).toEqual([deck[4], deck[1]]);
    expect(tapTeam(pool, picks, 1, 'team-4')).toBe(picks);
    picks = tapTeam(pool, picks, 1, 'team-1');
    expect(picks).toEqual([deck[4], null]);
    // The unpicked human sits in the first free team.
    expect(resolvePicks(pool, picks)).toEqual(['team-4', 'team-0']);
    expect(humansFor(pool, picks).map(h => [h.teamId, h.name])).toEqual([['team-4', pool.teams[4].name], ['team-0', pool.teams[0].name]]);
    expect(firstFreePick(pool, picks)).toBe(deck[1]);
  });

  it('#440: a pick is the World Deck team, so a reroll keeps it when that team is drawn again', () => {
    const a = generateSeasonPool(7, 10);
    const pick = a.teams[3].deckTeamId!;
    let other = 8;
    while (!generateSeasonPool(other, 10).teams.some(t => t.deckTeamId === pick)) other++;
    const b = generateSeasonPool(other, 10);
    expect(keepPicks(b, [pick])).toEqual([pick]);
    expect(humansFor(b, [pick])[0].name).toBe(a.teams[3].name);
    let gone = 8;
    while (generateSeasonPool(gone, 5).teams.some(t => t.deckTeamId === pick)) gone++;
    expect(keepPicks(generateSeasonPool(gone, 5), [pick])).toEqual([null]);
  });
});
