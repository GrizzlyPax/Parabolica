import { useState, useMemo } from 'react';
import { Driver } from './RaceEngine';
import { SeasonState, getSeasonStandings, F1_POINTS } from './types/season';
import './SeasonComplete.css';

type ChampionshipView = 'drivers' | 'teams';

interface TeamStats {
  kingdomId: string;
  name: string;
  emoji: string;
  color: string;
  points: number;
  wins: number;
  podiums: number;
  bestFinish: number;
}

interface SeasonCompleteProps {
  season: SeasonState;
  drivers: Driver[];
  onNewSeason: () => void;
  onMainMenu: () => void;
}

function SeasonComplete({ season, drivers, onNewSeason, onMainMenu }: SeasonCompleteProps) {
  const [view, setView] = useState<ChampionshipView>('drivers');
  const standings = getSeasonStandings(season);
  const getDriver = (driverId: number) => drivers.find(d => d.id === driverId);

  // Calculate team standings
  const teamStandings = useMemo(() => {
    const teamMap = new Map<string, TeamStats>();

    // Initialize teams from drivers
    drivers.forEach(driver => {
      if (!driver.kingdomId || teamMap.has(driver.kingdomId)) return;
      teamMap.set(driver.kingdomId, {
        kingdomId: driver.kingdomId,
        name: driver.teamName || driver.kingdomId,
        emoji: driver.emoji,
        color: driver.color,
        points: 0,
        wins: 0,
        podiums: 0,
        bestFinish: 999,
      });
    });

    // Aggregate stats from race results
    season.raceResults.forEach(result => {
      result.finishOrder.forEach((driverId, position) => {
        const driver = getDriver(driverId);
        if (!driver?.kingdomId) return;

        const team = teamMap.get(driver.kingdomId);
        if (!team) return;

        // Add points
        const pts = position < 10 ? F1_POINTS[position] : 0;
        team.points += pts;

        // Track wins (position 0 = 1st place)
        if (position === 0) team.wins++;

        // Track podiums (top 3)
        if (position < 3) team.podiums++;

        // Track best finish
        if (position + 1 < team.bestFinish) {
          team.bestFinish = position + 1;
        }
      });
    });

    // Sort by points descending
    return Array.from(teamMap.values()).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return a.bestFinish - b.bestFinish;
    });
  }, [season, drivers]);

  // Driver championship data
  const champion = getDriver(standings[0]?.driverId);
  const runnerUp = getDriver(standings[1]?.driverId);
  const thirdPlace = getDriver(standings[2]?.driverId);

  const championStats = standings[0];
  const runnerUpStats = standings[1];
  const thirdStats = standings[2];

  // Team championship data
  const teamChampion = teamStandings[0];
  const teamRunnerUp = teamStandings[1];
  const teamThird = teamStandings[2];

  return (
    <div className="season-complete">
      <div className="season-complete-content">
        <div className="confetti-container">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                backgroundColor: ['#ffd700', '#c0c0c0', '#cd7f32', '#9b59b6', '#3498db'][Math.floor(Math.random() * 5)],
              }}
            />
          ))}
        </div>

        <div className="champion-header">
          <h1>Championship Complete!</h1>
          <p>{season.totalRaces} Race Season</p>
        </div>

        {/* Championship tabs */}
        <div className="championship-tabs">
          <button
            className={`championship-tab ${view === 'drivers' ? 'active' : ''}`}
            onClick={() => setView('drivers')}
          >
            Driver Championship
          </button>
          <button
            className={`championship-tab ${view === 'teams' ? 'active' : ''}`}
            onClick={() => setView('teams')}
          >
            Team Championship
          </button>
        </div>

        {/* Driver Championship View */}
        {view === 'drivers' && (
          <>
            <div className="champion-podium">
              {/* Second Place */}
              <div className="podium-position second">
                <div className="podium-driver">
                  {runnerUp && (
                    <>
                      <span className="podium-emoji">{runnerUp.emoji}</span>
                      <span className="podium-name" style={{ color: runnerUp.color }}>{runnerUp.name}</span>
                    </>
                  )}
                </div>
                <div className="podium-stats">
                  <span className="podium-points">{runnerUpStats?.points} pts</span>
                  <span className="podium-wins">{runnerUpStats?.wins} wins</span>
                </div>
                <div className="podium-block block-2">
                  <span className="podium-num">2</span>
                </div>
              </div>

              {/* Champion */}
              <div className="podium-position champion">
                <div className="champion-crown">👑</div>
                <div className="podium-driver">
                  {champion && (
                    <>
                      <span className="podium-emoji champion-emoji">{champion.emoji}</span>
                      <span className="podium-name champion-name" style={{ color: champion.color }}>{champion.name}</span>
                      <span className="champion-title">WORLD CHAMPION</span>
                    </>
                  )}
                </div>
                <div className="podium-stats champion-stats">
                  <span className="podium-points">{championStats?.points} pts</span>
                  <span className="podium-wins">{championStats?.wins} wins</span>
                  <span className="podium-podiums">{championStats?.podiums} podiums</span>
                </div>
                <div className="podium-block block-1">
                  <span className="podium-num">1</span>
                  <span className="trophy">🏆</span>
                </div>
              </div>

              {/* Third Place */}
              <div className="podium-position third">
                <div className="podium-driver">
                  {thirdPlace && (
                    <>
                      <span className="podium-emoji">{thirdPlace.emoji}</span>
                      <span className="podium-name" style={{ color: thirdPlace.color }}>{thirdPlace.name}</span>
                    </>
                  )}
                </div>
                <div className="podium-stats">
                  <span className="podium-points">{thirdStats?.points} pts</span>
                  <span className="podium-wins">{thirdStats?.wins} wins</span>
                </div>
                <div className="podium-block block-3">
                  <span className="podium-num">3</span>
                </div>
              </div>
            </div>

            {/* Full driver standings */}
            <div className="final-standings">
              <h2>Final Driver Standings</h2>
              <div className="standings-list">
                {standings.slice(3).map((stats, index) => {
                  const driver = getDriver(stats.driverId);
                  if (!driver) return null;

                  return (
                    <div key={stats.driverId} className="standing-row">
                      <span className="standing-pos">{index + 4}</span>
                      <span className="standing-emoji">{driver.emoji}</span>
                      <span className="standing-name" style={{ color: driver.color }}>{driver.name}</span>
                      <span className="standing-points">{stats.points} pts</span>
                      <span className="standing-wins">{stats.wins}W</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Team Championship View */}
        {view === 'teams' && (
          <>
            <div className="champion-podium team-podium">
              {/* Second Place Team */}
              <div className="podium-position second">
                <div className="podium-driver">
                  {teamRunnerUp && (
                    <>
                      <span className="podium-emoji">{teamRunnerUp.emoji}</span>
                      <span className="podium-name" style={{ color: teamRunnerUp.color }}>{teamRunnerUp.name}</span>
                    </>
                  )}
                </div>
                <div className="podium-stats">
                  <span className="podium-points">{teamRunnerUp?.points} pts</span>
                  <span className="podium-wins">{teamRunnerUp?.wins} wins</span>
                </div>
                <div className="podium-block block-2">
                  <span className="podium-num">2</span>
                </div>
              </div>

              {/* Champion Team */}
              <div className="podium-position champion">
                <div className="champion-crown">👑</div>
                <div className="podium-driver">
                  {teamChampion && (
                    <>
                      <span className="podium-emoji champion-emoji">{teamChampion.emoji}</span>
                      <span className="podium-name champion-name" style={{ color: teamChampion.color }}>{teamChampion.name}</span>
                      <span className="champion-title">CONSTRUCTORS' CHAMPION</span>
                    </>
                  )}
                </div>
                <div className="podium-stats champion-stats">
                  <span className="podium-points">{teamChampion?.points} pts</span>
                  <span className="podium-wins">{teamChampion?.wins} wins</span>
                  <span className="podium-podiums">{teamChampion?.podiums} podiums</span>
                </div>
                <div className="podium-block block-1">
                  <span className="podium-num">1</span>
                  <span className="trophy">🏆</span>
                </div>
              </div>

              {/* Third Place Team */}
              <div className="podium-position third">
                <div className="podium-driver">
                  {teamThird && (
                    <>
                      <span className="podium-emoji">{teamThird.emoji}</span>
                      <span className="podium-name" style={{ color: teamThird.color }}>{teamThird.name}</span>
                    </>
                  )}
                </div>
                <div className="podium-stats">
                  <span className="podium-points">{teamThird?.points} pts</span>
                  <span className="podium-wins">{teamThird?.wins} wins</span>
                </div>
                <div className="podium-block block-3">
                  <span className="podium-num">3</span>
                </div>
              </div>
            </div>

            {/* Full team standings */}
            <div className="final-standings">
              <h2>Final Team Standings</h2>
              <div className="standings-list team-standings-list">
                {teamStandings.slice(3).map((team, index) => (
                  <div key={team.kingdomId} className="standing-row">
                    <span className="standing-pos">{index + 4}</span>
                    <span className="standing-emoji">{team.emoji}</span>
                    <span className="standing-name" style={{ color: team.color }}>{team.name}</span>
                    <span className="standing-points">{team.points} pts</span>
                    <span className="standing-wins">{team.wins}W</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Season stats */}
        <div className="season-stats-summary">
          <div className="stat-card">
            <span className="stat-value">{season.raceResults.length}</span>
            <span className="stat-label">Races Completed</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">
              {new Set(season.raceResults.map(r => r.finishOrder[0])).size}
            </span>
            <span className="stat-label">Different Winners</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">
              {season.raceResults.reduce((sum, r) => sum + r.dnfDrivers.length, 0)}
            </span>
            <span className="stat-label">Total DNFs</span>
          </div>
        </div>

        <div className="season-complete-actions">
          <button className="action-btn primary" onClick={onNewSeason}>
            New Season
          </button>
          <button className="action-btn secondary" onClick={onMainMenu}>
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}

export default SeasonComplete;
