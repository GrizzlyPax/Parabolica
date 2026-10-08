// Season scoring (#321, docs/SEASON_MODE.md §5): constructor points from your
// racers, plus a drivers'-champion bonus to the team holding the drivers'
// champion. One dial (Pax, Oct 8: 50 = two race wins; Telemetry may tune it).
//
// The bonus is part of the final table only. During the season the Paddock
// order stays on race points (season.ts constructorStandings), and the
// standings screen shows the bonus as "would go to" for whoever leads.
import { draftState } from './draft';
import { constructorStandings, driverStandings, poolFor, seasonState, type ConstructorStanding, type SeasonFacts } from './season';
import type { DriverSeasonStats } from '../types/season';

export const DRIVERS_CHAMPION_BONUS = 50;

export interface SeasonTableLine extends ConstructorStanding {
  /** Race points (ConstructorStanding.points) + bonus. */
  total: number;
  bonus: number;
}

export interface SeasonTable {
  lines: SeasonTableLine[];
  /** Top of the drivers' table (null before any race). */
  driversChampion: { driver: DriverSeasonStats; teamId: string } | null;
  /** True once every round has run: the bonus is awarded, not projected. */
  final: boolean;
}

/** The constructors' table with the drivers'-champion bonus folded in. Ties
 * on total keep the race-points order (more wins, then draft order). */
export function seasonTable(facts: SeasonFacts, bonus: number = DRIVERS_CHAMPION_BONUS): SeasonTable {
  const race = constructorStandings(facts);
  const rosters = draftState(poolFor(facts), facts.draftPicks).rosters;
  const top = facts.results.length ? driverStandings(facts)[0] : undefined;
  const teamId = top ? Object.keys(rosters).find(id => rosters[id].driverIds.includes(top.driverId)) : undefined;
  const lines = race.map(l => {
    const b = l.teamId === teamId ? bonus : 0;
    return { ...l, bonus: b, total: l.points + b };
  });
  lines.sort((a, b) => b.total - a.total || race.indexOf(race.find(x => x.teamId === a.teamId)!) - race.indexOf(race.find(x => x.teamId === b.teamId)!));
  lines.forEach((l, i) => { l.rank = i + 1; });
  return {
    lines,
    driversChampion: top && teamId ? { driver: top, teamId } : null,
    final: seasonState(facts).phase === 'finished',
  };
}
