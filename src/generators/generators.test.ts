import { describe, it, expect } from 'vitest';
import { mulberry32, deriveSeed } from '../engine/rng';
import { generateRoster, generateRosterFromTeams } from './drivers';
import { generateCarsForKingdoms } from './cars';
import { getRandomTracks, generateSeason } from './tracks';
import { TEAMS } from '../data/teams';

describe('seeded generation reproducibility', () => {
  it('generates an identical roster from the same seed', () => {
    const a = generateRoster(mulberry32(42));
    const b = generateRoster(mulberry32(42));
    expect(b).toEqual(a);
  });

  it('generates different rosters from different seeds', () => {
    const a = generateRoster(mulberry32(1));
    const b = generateRoster(mulberry32(2));
    expect(b).not.toEqual(a);
  });

  it('still randomizes when unseeded (legacy Quick Race behavior)', () => {
    const a = generateRoster();
    const b = generateRoster();
    // Names alone make a collision across 22 drivers vanishingly unlikely.
    expect(b.map(d => d.fullName)).not.toEqual(a.map(d => d.fullName));
  });

  it('generates identical cars and team stats from the same seed', () => {
    const ids = TEAMS.map(t => t.id);
    const a = generateCarsForKingdoms(ids, mulberry32(7));
    const b = generateCarsForKingdoms(ids, mulberry32(7));
    expect(Object.fromEntries(b)).toEqual(Object.fromEntries(a));
  });

  it('selects identical season calendars from the same seed', () => {
    expect(getRandomTracks(8, mulberry32(9))).toEqual(getRandomTracks(8, mulberry32(9)));
    expect(generateSeason(5, mulberry32(3))).toEqual(generateSeason(5, mulberry32(3)));
  });

  it('births the same league universe from one genesis seed (the league contract)', () => {
    // This is how Commissioner Mode will create a league: one seed fans out
    // via deriveSeed into roster, cars, and calendar streams.
    const leagueSeed = 0xABAD1DEA;
    const teamIds = TEAMS.slice(0, 6).map(t => t.id);

    const universe = (seed: number) => ({
      roster: generateRosterFromTeams(teamIds, mulberry32(deriveSeed(seed, 'genesis', 'drivers'))),
      cars: Object.fromEntries(
        generateCarsForKingdoms(teamIds, mulberry32(deriveSeed(seed, 'genesis', 'cars')))
      ),
      calendar: getRandomTracks(8, mulberry32(deriveSeed(seed, 'genesis', 'calendar'))).map(t => t.id),
    });

    expect(universe(leagueSeed)).toEqual(universe(leagueSeed));
    expect(universe(leagueSeed)).not.toEqual(universe(leagueSeed + 1));
  });
});
