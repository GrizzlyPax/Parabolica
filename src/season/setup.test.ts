// #317 League Setup: the defaults are one tap, the calendar comes from the
// seed, and humans sit in the first slots.
import { describe, it, expect } from 'vitest';
import { getTrackById } from '../generators/tracks';
import { DEFAULT_TEAMS, generateSeasonPool } from './genesis';
import { DEFAULT_CALENDAR_LENGTH, newSeason, seasonState } from './season';
import { calendarTrackIds, defaultSetup, humansFor, nextTrack, seasonCalendar, seasonName } from './setup';

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

  it('humans take the first slots and wear that slot’s team', () => {
    const pool = generateSeasonPool(7, 6);
    const humans = humansFor(pool, 3);
    expect(humans.map(h => h.teamId)).toEqual(['team-0', 'team-1', 'team-2']);
    expect(humans[0]).toMatchObject({ name: pool.teams[0].name, color: pool.teams[0].color });
  });
});
