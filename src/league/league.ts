// League creation: one seed births the whole universe.
// deriveSeed fans the league seed into independent streams so adding a new
// generation step later never shifts existing ones.

import { mulberry32, deriveSeed } from '../engine/rng';
import { getTagById } from '../data/tags';
import { getTeamsByIds, Team } from '../data/teams';
import { generateRosterFromTeamList } from '../generators/drivers';
import { generateCarsForKingdoms } from '../generators/cars';
import { RosterDriver } from '../RaceEngine';
import { createInitialSeasonState } from '../types/season';
import { LeagueSetupConfig, LeagueState, ScheduledRace } from './types';
import { version as engineVersion } from '../../package.json';

/** Build the genesis grid for a league seed: drivers + cars, tags attached.
 * The grid is the registry teams (by id) plus any player-created customTeams,
 * in that order. */
export function generateGenesisRoster(
  leagueSeed: number,
  teamIds: string[],
  customTeams: Team[] = []
): RosterDriver[] {
  const teams = [...getTeamsByIds(teamIds), ...customTeams];
  const driverRng = mulberry32(deriveSeed(leagueSeed, 'genesis', 'drivers'));
  const carRng = mulberry32(deriveSeed(leagueSeed, 'genesis', 'cars'));
  const roster = generateRosterFromTeamList(teams, driverRng);
  const cars = generateCarsForKingdoms(teams.map(t => t.id), carRng);

  return roster.map(driver => {
    const car = cars.get(driver.kingdomId);
    return {
      ...driver,
      carStats: car?.stats,
      carName: car?.name,
      teamStats: car?.teamStats,
      driverTag: driver.tag,
      carTag: car?.carTag,
      teamTag: car?.teamTag,
    };
  });
}

/** Fix the calendar: every race gets its wall-clock slot and seed at founding.
 * The inaugural race fires at founding itself — a league is born mid-roar —
 * and the cadence applies from there. */
export function buildSchedule(leagueSeed: number, setup: LeagueSetupConfig): ScheduledRace[] {
  return setup.trackIds.map((trackId, index) => ({
    index,
    trackId,
    scheduledAt: setup.createdAt + index * setup.raceIntervalMs,
    seed: deriveSeed(leagueSeed, 'race', index),
  }));
}

export function createLeague(leagueSeed: number, setup: LeagueSetupConfig): LeagueState {
  const roster = generateGenesisRoster(leagueSeed, setup.teamIds, setup.customTeams);
  return {
    engineVersion,
    leagueSeed,
    setup,
    schedule: buildSchedule(leagueSeed, setup),
    interventionLog: [],
    settledThrough: -1,
    roster,
    season: createInitialSeasonState(setup.trackIds.length, roster.map(d => d.id)),
    digests: [],
  };
}

/**
 * The roster state a given race runs with: genesis grid + every intervention
 * whose atRaceIndex is at or before that race. Pure — never mutates inputs.
 */
export function rosterStateAt(league: LeagueState, raceIndex: number): RosterDriver[] {
  const applicable = league.interventionLog.filter(i => i.atRaceIndex <= raceIndex);
  if (applicable.length === 0) return league.roster;

  return league.roster.map(driver => {
    let result = driver;
    for (const intervention of applicable) {
      if (intervention.type === 'attach-tag' && intervention.targetDriverId === driver.id) {
        result = { ...result, driverTag: getTagById(intervention.tagId) ?? result.driverTag };
      }
    }
    return result;
  });
}
