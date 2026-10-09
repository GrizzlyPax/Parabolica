// League creation: one seed births the whole universe.
// deriveSeed fans the league seed into independent streams so adding a new
// generation step later never shifts existing ones.

import { mulberry32, deriveSeed } from '../engine/rng';
import { buildRoster } from '../rules/genesis';
import { Ruleset, defaultRuleset, upgradeRuleset } from '../rules/ruleset';
import { getTeamsByIds, Team } from '../data/teams';
import { generateRosterFromTeamList } from '../generators/drivers';
import { generateCarsForKingdoms } from '../generators/cars';
import { RosterDriver } from '../RaceEngine';
import { createInitialSeasonState } from '../types/season';
import { LeagueSetupConfig, LeagueState, ScheduledRace } from './types';
import { version as engineVersion } from '../../package.json';

/** Build the genesis grid for a league seed: drivers + cars, genesis trait
 * cards baked in (rules/genesis.ts). The grid is the registry teams (by id)
 * plus any player-created customTeams, in that order. */
export function generateGenesisRoster(
  leagueSeed: number,
  teamIds: string[],
  customTeams: Team[] = [],
  ruleset: Ruleset = defaultRuleset(),
): RosterDriver[] {
  const teams = [...getTeamsByIds(teamIds), ...customTeams];
  const driverRng = mulberry32(deriveSeed(leagueSeed, 'genesis', 'drivers'));
  const carRng = mulberry32(deriveSeed(leagueSeed, 'genesis', 'cars'));
  const roster = generateRosterFromTeamList(teams, driverRng);
  const generated = generateCarsForKingdoms(teams.map(t => t.id), carRng);
  return buildRoster(roster, generated, leagueSeed, ruleset);
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
  // Old saves name rarities common…legendary (#385); the facts stay as saved.
  const roster = generateGenesisRoster(leagueSeed, setup.teamIds, setup.customTeams, setup.ruleset ? upgradeRuleset(setup.ruleset) : defaultRuleset());
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
 * The roster state a given race runs with: the genesis grid plus every decree
 * whose atRaceIndex is at or before that race. The only decree so far
 * (attach-tag) retired with tags (#334), so today this is the genesis grid;
 * the hook stays for when decrees return. Pure — never mutates inputs.
 */
export function rosterStateAt(league: LeagueState, _raceIndex: number): RosterDriver[] {
  return league.roster;
}
