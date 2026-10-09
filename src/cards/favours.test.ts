// #359: track + weather favours apply field-wide at race build through the card math.
import { describe, it, expect } from 'vitest';
import { applyFavours, favourPercents } from './apply';
import { favouredRoster } from '../league/settle';
import { createLeague } from '../league/league';
import { CURRENT_TRACKS, getTrackById } from '../generators/tracks';
import { weatherForRace } from '../data/weather';
import { TEAMS } from '../data/teams';
import { FAVOUR_PCT } from '../data/deckTracks';

describe('favours', () => {
  it('sum per stat and add grade points (#335) to every driver, car and team stat they name', () => {
    const roster = [
      { id: 1, stats: { baseSpeed: 1, consistency: 0.5, luck: 0.5, acceleration: 1, endurance: 1, aggression: 0.5 }, carStats: { power: 3, grip: 3, reliability: 3 }, teamStats: { tireManagement: 3, pitCrew: 3 } },
    ];
    expect(applyFavours(roster, [])).toBe(roster);
    expect(favourPercents([{ stat: 'baseSpeed', pct: 10 }, { stat: 'baseSpeed', pct: 5 }, { stat: 'power', pct: 10 }])).toEqual({ baseSpeed: 15, power: 10 });
    const [d] = applyFavours(roster, [{ stat: 'baseSpeed', pct: 10 }, { stat: 'power', pct: 10 }, { stat: 'pitCrew', pct: 5 }, { stat: 'baseSpeed', pct: 5 }]);
    expect(d.stats.baseSpeed).toBeCloseTo(1 + 0.15 * 0.30, 10); // +15 grade on a 0.30 span
    expect(d.stats.consistency).toBe(0.5);
    expect(d.carStats!.power).toBeCloseTo(3.4, 10);               // +10 grade = +0.4★
    expect(d.carStats!.grip).toBe(3);
    expect(d.teamStats!.pitCrew).toBeCloseTo(3.2, 10);
    expect(roster[0].stats.baseSpeed).toBe(1); // never mutates
  });

  it('a league race favours its track and its weather, stacked, on every driver', () => {
    const setup = { name: 'f', godId: 'g', teamIds: TEAMS.slice(0, 6).map(t => t.id), trackIds: CURRENT_TRACKS.map(t => t.id), raceIntervalMs: 1000, createdAt: 0 };
    const league = createLeague(99, setup);
    for (let i = 0; i < league.schedule.length; i++) {
      const track = getTrackById(league.schedule[i].trackId)!;
      const weather = weatherForRace(99, i);
      const pct = favourPercents([...track.favours, ...weather.favours]);
      const grid = favouredRoster(league, i, track, league.roster);
      expect(track.favours.map(f => f.pct)).toEqual([FAVOUR_PCT, FAVOUR_PCT]);
      for (let k = 0; k < grid.length; k++) {
        const base = league.roster[k], got = grid[k];
        expect(got.stats.baseSpeed).toBeCloseTo(base.stats.baseSpeed + ((pct.baseSpeed ?? 0) * 0.30) / 100, 10);
        expect(got.stats.consistency).toBeCloseTo(base.stats.consistency + ((pct.consistency ?? 0) * 0.5) / 100, 10);
        expect(got.carStats!.power).toBeCloseTo(base.carStats!.power + ((pct.power ?? 0) * 4) / 100, 10);
        expect(got.teamStats!.pitCrew).toBeCloseTo(base.teamStats!.pitCrew + ((pct.pitCrew ?? 0) * 4) / 100, 10);
      }
    }
  });
});
