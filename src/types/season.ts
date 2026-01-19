// F1-style points system
export const F1_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

export interface DriverSeasonStats {
  driverId: number;
  points: number;
  wins: number;
  podiums: number;
  bestFinish: number;
  dnfs: number;
  raceResults: number[]; // finish position per race (-1 for DNF)
}

export interface RaceResult {
  raceNumber: number;
  trackName: string;
  trackEmoji: string;
  finishOrder: number[]; // driver IDs in finish order
  dnfDrivers: number[]; // driver IDs who DNF'd
  fastestLapDriverId: number | null;
}

export interface SeasonState {
  totalRaces: number;
  currentRace: number;
  driverStats: Map<number, DriverSeasonStats>;
  raceResults: RaceResult[];
  isComplete: boolean;
}

export function createInitialSeasonState(totalRaces: number, driverIds: number[]): SeasonState {
  const driverStats = new Map<number, DriverSeasonStats>();

  driverIds.forEach(id => {
    driverStats.set(id, {
      driverId: id,
      points: 0,
      wins: 0,
      podiums: 0,
      bestFinish: 99,
      dnfs: 0,
      raceResults: [],
    });
  });

  return {
    totalRaces,
    currentRace: 1,
    driverStats,
    raceResults: [],
    isComplete: false,
  };
}

export function calculatePointsForPosition(position: number): number {
  if (position < 1 || position > 10) return 0;
  return F1_POINTS[position - 1];
}

export function updateSeasonWithRaceResult(
  season: SeasonState,
  finishOrder: number[],
  dnfDrivers: number[],
  trackName: string,
  trackEmoji: string,
  fastestLapDriverId: number | null
): SeasonState {
  const newDriverStats = new Map(season.driverStats);

  // Process finished drivers
  finishOrder.forEach((driverId, index) => {
    const position = index + 1;
    const stats = newDriverStats.get(driverId);
    if (stats) {
      const points = calculatePointsForPosition(position);
      newDriverStats.set(driverId, {
        ...stats,
        points: stats.points + points,
        wins: position === 1 ? stats.wins + 1 : stats.wins,
        podiums: position <= 3 ? stats.podiums + 1 : stats.podiums,
        bestFinish: Math.min(stats.bestFinish, position),
        raceResults: [...stats.raceResults, position],
      });
    }
  });

  // Process DNF drivers
  dnfDrivers.forEach(driverId => {
    const stats = newDriverStats.get(driverId);
    if (stats) {
      newDriverStats.set(driverId, {
        ...stats,
        dnfs: stats.dnfs + 1,
        raceResults: [...stats.raceResults, -1], // -1 indicates DNF
      });
    }
  });

  const newRaceResult: RaceResult = {
    raceNumber: season.currentRace,
    trackName,
    trackEmoji,
    finishOrder,
    dnfDrivers,
    fastestLapDriverId,
  };

  const newCurrentRace = season.currentRace + 1;
  const isComplete = newCurrentRace > season.totalRaces;

  return {
    ...season,
    currentRace: newCurrentRace,
    driverStats: newDriverStats,
    raceResults: [...season.raceResults, newRaceResult],
    isComplete,
  };
}

export function getSeasonStandings(season: SeasonState): DriverSeasonStats[] {
  return Array.from(season.driverStats.values()).sort((a, b) => {
    // Sort by points first
    if (b.points !== a.points) return b.points - a.points;
    // Tiebreaker: more wins
    if (b.wins !== a.wins) return b.wins - a.wins;
    // Tiebreaker: more podiums
    if (b.podiums !== a.podiums) return b.podiums - a.podiums;
    // Tiebreaker: better best finish
    return a.bestFinish - b.bestFinish;
  });
}
