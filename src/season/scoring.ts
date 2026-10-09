// Season scoring (#321, #509, docs/SEASON_MODE.md §5): two championships, like
// real F1 (Pax, Oct 9). Constructors' = race points from both racers, nothing
// else; Drivers' = each driver's own points. No champion bonus: it flipped the
// title in 28% of seasons after v0.5.1, and with none there's nothing to tune.
// The Paddock turn order stays on constructors' race points (season.ts).
import { draftState } from './draft';
import { constructorStandings, driverStandings, poolFor, seasonState, type ConstructorStanding, type SeasonFacts } from './season';
import type { DriverSeasonStats } from '../types/season';

export interface SeasonTable {
  /** The Constructors' championship: race points, ties on wins then draft order. */
  lines: ConstructorStanding[];
  /** The Drivers' championship leader (null before any race). */
  driversChampion: { driver: DriverSeasonStats; teamId: string } | null;
  /** True once every round has run: the titles are won, not projected. */
  final: boolean;
}

export function seasonTable(facts: SeasonFacts): SeasonTable {
  const rosters = draftState(poolFor(facts), facts.draftPicks).rosters;
  const top = facts.results.length ? driverStandings(facts)[0] : undefined;
  const teamId = top ? Object.keys(rosters).find(id => rosters[id].driverIds.includes(top.driverId)) : undefined;
  return {
    lines: constructorStandings(facts),
    driversChampion: top && teamId ? { driver: top, teamId } : null,
    final: seasonState(facts).phase === 'finished',
  };
}
