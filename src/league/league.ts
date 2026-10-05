// League creation: one seed births the whole universe.
// deriveSeed fans the league seed into independent streams so adding a new
// generation step later never shifts existing ones.

import { mulberry32, deriveSeed } from '../engine/rng';
import { Tag, getTagById } from '../data/tags';
import { buildRoster } from '../rules/genesis';
import { Ruleset, defaultRuleset } from '../rules/ruleset';
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
  customTeams: Team[] = [],
  ruleset: Ruleset = defaultRuleset()
): RosterDriver[] {
  const teams = [...getTeamsByIds(teamIds), ...customTeams];
  const driverRng = mulberry32(deriveSeed(leagueSeed, 'genesis', 'drivers'));
  const carRng = mulberry32(deriveSeed(leagueSeed, 'genesis', 'cars'));
  const roster = generateRosterFromTeamList(teams, driverRng);
  const cars = generateCarsForKingdoms(teams.map(t => t.id), carRng);
  return buildRoster(roster, cars, leagueSeed, ruleset);
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
  const roster = generateGenesisRoster(leagueSeed, setup.teamIds, setup.customTeams, setup.ruleset ?? defaultRuleset());
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
  const cap = (league.setup.ruleset ?? defaultRuleset()).tags.slotCap;

  return league.roster.map(driver => {
    let tags = driver.tags;
    for (const intervention of applicable) {
      if (intervention.type !== 'attach-tag' || intervention.targetDriverId !== driver.id) continue;
      const tag = getTagById(intervention.tagId);
      if (!tag) continue;
      tags = attachTag(tags, tag, cap);
    }
    return tags === driver.tags ? driver : { ...driver, tags };
  });
}

/**
 * Add a tag to a stack. Pure. A duplicate id is a no-op; a full stack
 * (MAX_TAGS_PER_DRIVER) refuses — the log entry is kept (history is
 * append-only) but has no effect. Validate with canAttachTag before committing
 * so the UI never offers an attachment that would be ignored.
 */
export function attachTag(tags: Tag[], tag: Tag, cap: number = defaultRuleset().tags.slotCap): Tag[] {
  if (!canAttachTag(tags, tag, cap)) return tags;
  return [...tags, tag];
}

export function canAttachTag(tags: Tag[], tag: Tag, cap: number = defaultRuleset().tags.slotCap): boolean {
  if (tags.some(t => t.id === tag.id)) return false;
  return tags.length < cap;
}
