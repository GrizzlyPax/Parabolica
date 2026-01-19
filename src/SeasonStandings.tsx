import { useState, useMemo } from 'react';
import { Driver } from './RaceEngine';
import { SeasonState, getSeasonStandings, F1_POINTS } from './types/season';
import './SeasonStandings.css';

interface SeasonStandingsProps {
  season: SeasonState;
  drivers: Driver[];
  onClose?: () => void;
}

type StandingsView = 'drivers' | 'teams' | 'chart';

interface TeamStats {
  kingdomId: string;
  name: string;
  emoji: string;
  color: string;
  points: number;
  wins: number;
  podiums: number;
  bestFinish: number;
  driver1Id: number;
  driver2Id: number;
}

function SeasonStandings({ season, drivers, onClose }: SeasonStandingsProps) {
  const [view, setView] = useState<StandingsView>('drivers');
  const standings = getSeasonStandings(season);

  const getDriver = (driverId: number) => drivers.find(d => d.id === driverId);

  // Calculate team standings
  const teamStandings = useMemo(() => {
    const teamMap = new Map<string, TeamStats>();

    // Group drivers by kingdom
    drivers.forEach(driver => {
      if (!driver.kingdomId) return;

      const driverStats = season.driverStats.get(driver.id);
      if (!driverStats) return;

      const existing = teamMap.get(driver.kingdomId);
      if (existing) {
        // Add to existing team
        existing.points += driverStats.points;
        existing.wins += driverStats.wins;
        existing.podiums += driverStats.podiums;
        existing.bestFinish = Math.min(existing.bestFinish, driverStats.bestFinish);
        existing.driver2Id = driver.id;
      } else {
        // Create new team entry
        teamMap.set(driver.kingdomId, {
          kingdomId: driver.kingdomId,
          name: driver.teamName || driver.kingdomId,
          emoji: driver.emoji,
          color: driver.color,
          points: driverStats.points,
          wins: driverStats.wins,
          podiums: driverStats.podiums,
          bestFinish: driverStats.bestFinish,
          driver1Id: driver.id,
          driver2Id: driver.id,
        });
      }
    });

    // Sort by points
    return Array.from(teamMap.values()).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return a.bestFinish - b.bestFinish;
    });
  }, [drivers, season.driverStats]);

  // Calculate points progression for chart
  const pointsProgression = useMemo(() => {
    const progression: Map<number, number[]> = new Map();

    // Initialize with 0 for each driver
    drivers.forEach(d => {
      progression.set(d.id, [0]);
    });

    // Calculate cumulative points after each race
    let cumulativePoints = new Map<number, number>();
    drivers.forEach(d => cumulativePoints.set(d.id, 0));

    season.raceResults.forEach(result => {
      result.finishOrder.forEach((driverId, idx) => {
        const pts = idx < 10 ? F1_POINTS[idx] : 0;
        cumulativePoints.set(driverId, (cumulativePoints.get(driverId) || 0) + pts);
      });

      // Record cumulative points after this race
      drivers.forEach(d => {
        const current = progression.get(d.id) || [0];
        current.push(cumulativePoints.get(d.id) || 0);
        progression.set(d.id, current);
      });
    });

    return progression;
  }, [drivers, season.raceResults]);

  // Get max points for chart scaling
  const maxPoints = useMemo(() => {
    let max = 0;
    pointsProgression.forEach(points => {
      const driverMax = Math.max(...points);
      if (driverMax > max) max = driverMax;
    });
    return max || 25;
  }, [pointsProgression]);

  // Get position change indicator (comparing current to previous race)
  const getPositionChange = (driverStats: typeof standings[0], currentIndex: number): { change: number; icon: string } | null => {
    if (season.raceResults.length < 2) return null;

    // Calculate standings after previous race
    const prevRaceResults = season.raceResults.slice(0, -1);
    const prevPoints = new Map<number, number>();

    prevRaceResults.forEach(result => {
      result.finishOrder.forEach((driverId, idx) => {
        const pts = idx < 10 ? F1_POINTS[idx] : 0;
        prevPoints.set(driverId, (prevPoints.get(driverId) || 0) + pts);
      });
    });

    const prevStandings = Array.from(prevPoints.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id);

    const prevPos = prevStandings.indexOf(driverStats.driverId);
    if (prevPos === -1) return null;

    const change = prevPos - currentIndex;
    if (change > 0) return { change, icon: '▲' };
    if (change < 0) return { change: Math.abs(change), icon: '▼' };
    return { change: 0, icon: '−' };
  };

  // Get team position change
  const getTeamPositionChange = (team: TeamStats, currentIndex: number): { change: number; icon: string } | null => {
    if (season.raceResults.length < 2) return null;

    // Calculate team standings after previous race
    const prevRaceResults = season.raceResults.slice(0, -1);
    const prevTeamPoints = new Map<string, number>();

    drivers.forEach(driver => {
      if (!driver.kingdomId) return;
      prevTeamPoints.set(driver.kingdomId, 0);
    });

    prevRaceResults.forEach(result => {
      result.finishOrder.forEach((driverId, idx) => {
        const driver = getDriver(driverId);
        if (!driver?.kingdomId) return;
        const pts = idx < 10 ? F1_POINTS[idx] : 0;
        prevTeamPoints.set(driver.kingdomId, (prevTeamPoints.get(driver.kingdomId) || 0) + pts);
      });
    });

    const prevStandings = Array.from(prevTeamPoints.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id);

    const prevPos = prevStandings.indexOf(team.kingdomId);
    if (prevPos === -1) return null;

    const change = prevPos - currentIndex;
    if (change > 0) return { change, icon: '▲' };
    if (change < 0) return { change: Math.abs(change), icon: '▼' };
    return { change: 0, icon: '−' };
  };

  // Render points chart
  const renderPointsChart = () => {
    const chartHeight = 200;
    const numRaces = season.raceResults.length;

    if (numRaces === 0) {
      return (
        <div className="points-chart-empty">
          <p>No race data yet. Complete a race to see the points chart.</p>
        </div>
      );
    }

    // Get top 10 drivers for chart
    const topDrivers = standings.slice(0, 10);

    return (
      <div className="points-chart">
        <div className="chart-container" style={{ height: chartHeight }}>
          <svg viewBox={`0 0 ${numRaces * 60 + 40} ${chartHeight}`} preserveAspectRatio="none" className="chart-svg">
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map(pct => (
              <line
                key={pct}
                x1="30"
                y1={chartHeight - 20 - pct * (chartHeight - 40)}
                x2={numRaces * 60 + 30}
                y2={chartHeight - 20 - pct * (chartHeight - 40)}
                stroke="#2a2a4a"
                strokeDasharray="4"
              />
            ))}

            {/* Y-axis labels */}
            {[0, 0.25, 0.5, 0.75, 1].map(pct => (
              <text
                key={pct}
                x="25"
                y={chartHeight - 18 - pct * (chartHeight - 40)}
                fill="#666"
                fontSize="10"
                textAnchor="end"
              >
                {Math.round(maxPoints * pct)}
              </text>
            ))}

            {/* X-axis labels */}
            {Array.from({ length: numRaces + 1 }).map((_, i) => (
              <text
                key={i}
                x={30 + i * 60}
                y={chartHeight - 5}
                fill="#666"
                fontSize="10"
                textAnchor="middle"
              >
                {i === 0 ? 'Start' : `R${i}`}
              </text>
            ))}

            {/* Lines for each driver */}
            {topDrivers.map((stats) => {
              const driver = getDriver(stats.driverId);
              if (!driver) return null;

              const points = pointsProgression.get(stats.driverId) || [0];
              const isDriver1 = driver.driverSlot === 1;

              const pathData = points.map((pts, i) => {
                const x = 30 + i * 60;
                const y = chartHeight - 20 - (pts / maxPoints) * (chartHeight - 40);
                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
              }).join(' ');

              return (
                <path
                  key={stats.driverId}
                  d={pathData}
                  stroke={driver.color}
                  strokeWidth="2"
                  strokeDasharray={isDriver1 ? "none" : "6 3"}
                  fill="none"
                  opacity="0.9"
                />
              );
            })}

            {/* Dots at current points */}
            {topDrivers.map((stats) => {
              const driver = getDriver(stats.driverId);
              if (!driver) return null;

              const points = pointsProgression.get(stats.driverId) || [0];
              const lastPoints = points[points.length - 1];
              const x = 30 + (points.length - 1) * 60;
              const y = chartHeight - 20 - (lastPoints / maxPoints) * (chartHeight - 40);

              return (
                <circle
                  key={`dot-${stats.driverId}`}
                  cx={x}
                  cy={y}
                  r="4"
                  fill={driver.color}
                />
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="chart-legend">
          {topDrivers.slice(0, 6).map((stats) => {
            const driver = getDriver(stats.driverId);
            if (!driver) return null;

            const isDriver1 = driver.driverSlot === 1;

            return (
              <div key={stats.driverId} className="legend-item">
                <span
                  className="legend-line"
                  style={{
                    background: driver.color,
                    opacity: isDriver1 ? 1 : 0.7,
                  }}
                >
                  {!isDriver1 && <span className="legend-dashed" />}
                </span>
                <span className="legend-emoji">{driver.emoji}</span>
                <span className="legend-name" style={{ color: driver.color }}>
                  {driver.shortName}
                </span>
                <span className="legend-points">{stats.points}</span>
              </div>
            );
          })}
        </div>
        <div className="chart-note">
          <span>Solid line = Primary driver</span>
          <span>Dashed line = Secondary driver</span>
        </div>
      </div>
    );
  };

  return (
    <div className="season-standings">
      <div className="standings-header-bar">
        <div className="standings-title">
          <span className="title-emoji">🏆</span>
          <h2>Championship Standings</h2>
        </div>
        <div className="standings-progress">
          <span className="progress-text">
            Race {Math.min(season.currentRace, season.totalRaces)} of {season.totalRaces}
          </span>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${((season.currentRace - 1) / season.totalRaces) * 100}%` }}
            />
          </div>
        </div>
        {onClose && (
          <button className="close-btn" onClick={onClose}>×</button>
        )}
      </div>

      {/* View tabs */}
      <div className="standings-tabs">
        <button
          className={`standings-tab ${view === 'drivers' ? 'active' : ''}`}
          onClick={() => setView('drivers')}
        >
          Drivers
        </button>
        <button
          className={`standings-tab ${view === 'teams' ? 'active' : ''}`}
          onClick={() => setView('teams')}
        >
          Teams
        </button>
        <button
          className={`standings-tab ${view === 'chart' ? 'active' : ''}`}
          onClick={() => setView('chart')}
        >
          Points Chart
        </button>
      </div>

      {/* Driver standings */}
      {view === 'drivers' && (
        <>
          <div className="standings-table">
            <div className="table-header">
              <span className="col-pos">Pos</span>
              <span className="col-driver">Driver</span>
              <span className="col-points">Points</span>
              <span className="col-wins">Wins</span>
              <span className="col-podiums">Podiums</span>
              <span className="col-best">Best</span>
              <span className="col-dnfs">DNFs</span>
              <span className="col-form">Form</span>
            </div>

            <div className="table-body">
              {standings.map((stats, index) => {
                const driver = getDriver(stats.driverId);
                if (!driver) return null;

                const posChange = getPositionChange(stats, index);
                const isLeader = index === 0;
                const isPodium = index < 3;

                // Get last 5 race results for form
                const recentForm = stats.raceResults.slice(-5);

                return (
                  <div
                    key={stats.driverId}
                    className={`table-row ${isLeader ? 'leader' : ''} ${isPodium ? 'podium' : ''}`}
                  >
                    <span className="col-pos">
                      <span className="pos-number">{index + 1}</span>
                      {posChange && (
                        <span className={`pos-change ${posChange.icon === '▲' ? 'up' : posChange.icon === '▼' ? 'down' : 'same'}`}>
                          {posChange.icon}
                        </span>
                      )}
                    </span>
                    <span className="col-driver">
                      <span className="driver-emoji">{driver.emoji}</span>
                      <span className="driver-name" style={{ color: driver.color }}>{driver.name}</span>
                    </span>
                    <span className="col-points">
                      <span className="points-value">{stats.points}</span>
                    </span>
                    <span className="col-wins">{stats.wins}</span>
                    <span className="col-podiums">{stats.podiums}</span>
                    <span className="col-best">{stats.bestFinish < 99 ? stats.bestFinish : '-'}</span>
                    <span className="col-dnfs">{stats.dnfs || '-'}</span>
                    <span className="col-form">
                      {recentForm.map((result, i) => (
                        <span
                          key={i}
                          className={`form-dot ${result === -1 ? 'dnf' : result <= 3 ? 'podium' : result <= 10 ? 'points' : 'no-points'}`}
                          title={result === -1 ? 'DNF' : `P${result}`}
                        >
                          {result === -1 ? '×' : result <= 3 ? '●' : result <= 10 ? '○' : '·'}
                        </span>
                      ))}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent races */}
          {season.raceResults.length > 0 && (
            <div className="recent-races">
              <h3>Race Results</h3>
              <div className="races-list">
                {[...season.raceResults].reverse().slice(0, 5).map(race => {
                  const winner = getDriver(race.finishOrder[0]);
                  const second = getDriver(race.finishOrder[1]);
                  const third = getDriver(race.finishOrder[2]);

                  return (
                    <div key={race.raceNumber} className="race-result-card">
                      <div className="race-number">R{race.raceNumber}</div>
                      <div className="race-track">
                        <span className="track-emoji">{race.trackEmoji}</span>
                        <span className="track-name">{race.trackName}</span>
                      </div>
                      <div className="race-podium">
                        {winner && <span className="podium-driver gold" title={winner.name}>{winner.emoji}</span>}
                        {second && <span className="podium-driver silver" title={second.name}>{second.emoji}</span>}
                        {third && <span className="podium-driver bronze" title={third.name}>{third.emoji}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Team standings */}
      {view === 'teams' && (
        <div className="standings-table team-standings">
          <div className="table-header">
            <span className="col-pos">Pos</span>
            <span className="col-team">Team</span>
            <span className="col-points">Points</span>
            <span className="col-wins">Wins</span>
            <span className="col-podiums">Podiums</span>
            <span className="col-best">Best</span>
            <span className="col-drivers-cell">Drivers</span>
          </div>

          <div className="table-body">
            {teamStandings.map((team, index) => {
              const posChange = getTeamPositionChange(team, index);
              const isLeader = index === 0;
              const isPodium = index < 3;

              const driver1 = getDriver(team.driver1Id);
              const driver2 = getDriver(team.driver2Id);
              const driver1Stats = season.driverStats.get(team.driver1Id);
              const driver2Stats = season.driverStats.get(team.driver2Id);

              return (
                <div
                  key={team.kingdomId}
                  className={`table-row team-row ${isLeader ? 'leader' : ''} ${isPodium ? 'podium' : ''}`}
                  style={{ '--team-color': team.color } as React.CSSProperties}
                >
                  <span className="col-pos">
                    <span className="pos-number">{index + 1}</span>
                    {posChange && (
                      <span className={`pos-change ${posChange.icon === '▲' ? 'up' : posChange.icon === '▼' ? 'down' : 'same'}`}>
                        {posChange.icon}
                      </span>
                    )}
                  </span>
                  <span className="col-team">
                    <span className="team-emoji">{team.emoji}</span>
                    <span className="team-name" style={{ color: team.color }}>{team.name}</span>
                  </span>
                  <span className="col-points">
                    <span className="points-value">{team.points}</span>
                  </span>
                  <span className="col-wins">{team.wins}</span>
                  <span className="col-podiums">{team.podiums}</span>
                  <span className="col-best">{team.bestFinish < 99 ? team.bestFinish : '-'}</span>
                  <span className="col-drivers-cell">
                    {driver1 && (
                      <span className="driver-mini" title={`${driver1.name}: ${driver1Stats?.points || 0} pts`}>
                        {driver1.shortName} ({driver1Stats?.points || 0})
                      </span>
                    )}
                    {driver2 && driver2.id !== driver1?.id && (
                      <span className="driver-mini" title={`${driver2.name}: ${driver2Stats?.points || 0} pts`}>
                        {driver2.shortName} ({driver2Stats?.points || 0})
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Points chart */}
      {view === 'chart' && renderPointsChart()}
    </div>
  );
}

export default SeasonStandings;
