import { useState, useMemo } from 'react';
import { ALL_TEAMS, getRandomTeams } from './data/teams';
import { ALL_TRACKS, getRandomTracks } from './generators/tracks';
import './SeasonSetup.css';

interface SeasonSetupProps {
  onStartSeason: (numRaces: number, selectedTeamIds: string[], selectedTrackIds: string[]) => void;
  onBack: () => void;
}

const RACE_OPTIONS = [5, 10, 15, 20];

type SetupTab = 'overview' | 'teams' | 'tracks';

function SeasonSetup({ onStartSeason, onBack }: SeasonSetupProps) {
  const [selectedRaces, setSelectedRaces] = useState(10);
  const [activeTab, setActiveTab] = useState<SetupTab>('overview');

  // Team selection - default to random 10
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(() => {
    const random10 = getRandomTeams(10);
    return new Set(random10.map(t => t.id));
  });

  // Track selection - default to random based on race count
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(() => {
    const randomTracks = getRandomTracks(10);
    return new Set(randomTracks.map(t => t.id));
  });

  const toggleTeam = (teamId: string) => {
    setSelectedTeamIds(prev => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        // Don't allow fewer than 5 teams
        if (next.size > 5) {
          next.delete(teamId);
        }
      } else {
        // Don't allow more than 20 teams
        if (next.size < 20) {
          next.add(teamId);
        }
      }
      return next;
    });
  };

  const toggleTrack = (trackId: string) => {
    setSelectedTrackIds(prev => {
      const next = new Set(prev);
      if (next.has(trackId)) {
        // Don't allow fewer than 3 tracks
        if (next.size > 3) {
          next.delete(trackId);
        }
      } else {
        next.add(trackId);
      }
      return next;
    });
  };

  const randomizeTeams = () => {
    const random = getRandomTeams(10);
    setSelectedTeamIds(new Set(random.map(t => t.id)));
  };

  const randomizeTracks = () => {
    const random = getRandomTracks(Math.min(selectedRaces, ALL_TRACKS.length));
    setSelectedTrackIds(new Set(random.map(t => t.id)));
  };

  const selectAllTeams = () => {
    setSelectedTeamIds(new Set(ALL_TEAMS.slice(0, 20).map(t => t.id)));
  };

  const selectAllTracks = () => {
    setSelectedTrackIds(new Set(ALL_TRACKS.map(t => t.id)));
  };

  // Computed values
  const selectedTeams = useMemo(() =>
    ALL_TEAMS.filter(t => selectedTeamIds.has(t.id)),
    [selectedTeamIds]
  );

  const selectedTracks = useMemo(() =>
    ALL_TRACKS.filter(t => selectedTrackIds.has(t.id)),
    [selectedTrackIds]
  );

  const driverCount = selectedTeams.length * 2;

  const handleStartSeason = () => {
    onStartSeason(
      selectedRaces,
      Array.from(selectedTeamIds),
      Array.from(selectedTrackIds)
    );
  };

  return (
    <div className="season-setup">
      <div className="season-setup-content">
        <button className="back-btn" onClick={onBack}>← Back</button>

        <div className="season-setup-header">
          <h1>
            <span className="header-emoji">🏆</span>
            Season Setup
          </h1>
          <p>Configure your championship</p>
        </div>

        {/* Tab Navigation */}
        <div className="setup-tabs">
          <button
            className={`setup-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`setup-tab ${activeTab === 'teams' ? 'active' : ''}`}
            onClick={() => setActiveTab('teams')}
          >
            Teams ({selectedTeams.length}/{ALL_TEAMS.length})
          </button>
          <button
            className={`setup-tab ${activeTab === 'tracks' ? 'active' : ''}`}
            onClick={() => setActiveTab('tracks')}
          >
            Tracks ({selectedTracks.length}/{ALL_TRACKS.length})
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            <div className="setup-section">
              <h2>Number of Races</h2>
              <p className="setup-hint">More races mean a longer championship with more opportunities for comebacks</p>

              <div className="race-count-options">
                {RACE_OPTIONS.map(count => (
                  <button
                    key={count}
                    className={`race-count-btn ${selectedRaces === count ? 'selected' : ''}`}
                    onClick={() => setSelectedRaces(count)}
                  >
                    <span className="count-number">{count}</span>
                    <span className="count-label">races</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="setup-section points-preview">
              <h2>Points System</h2>
              <p className="setup-hint">Championship points awarded to top 10 finishers</p>

              <div className="points-grid">
                <div className="points-item gold">
                  <span className="position">1st</span>
                  <span className="points">25 pts</span>
                </div>
                <div className="points-item silver">
                  <span className="position">2nd</span>
                  <span className="points">18 pts</span>
                </div>
                <div className="points-item bronze">
                  <span className="position">3rd</span>
                  <span className="points">15 pts</span>
                </div>
                <div className="points-item">
                  <span className="position">4th</span>
                  <span className="points">12 pts</span>
                </div>
                <div className="points-item">
                  <span className="position">5th</span>
                  <span className="points">10 pts</span>
                </div>
                <div className="points-item">
                  <span className="position">6th</span>
                  <span className="points">8 pts</span>
                </div>
                <div className="points-item">
                  <span className="position">7th</span>
                  <span className="points">6 pts</span>
                </div>
                <div className="points-item">
                  <span className="position">8th</span>
                  <span className="points">4 pts</span>
                </div>
                <div className="points-item">
                  <span className="position">9th</span>
                  <span className="points">2 pts</span>
                </div>
                <div className="points-item">
                  <span className="position">10th</span>
                  <span className="points">1 pt</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Teams Tab - Wordle Grid Style */}
        {activeTab === 'teams' && (
          <div className="setup-section selection-section wordle-selection">
            <div className="selection-header">
              <div>
                <h2>Select Teams</h2>
                <p className="setup-hint">Choose 5-20 teams. Each team has 2 drivers.</p>
              </div>
              <div className="selection-actions">
                <button className="action-btn" onClick={randomizeTeams}>
                  🎲 Random 10
                </button>
                <button className="action-btn" onClick={selectAllTeams}>
                  ✓ All 20
                </button>
              </div>
            </div>

            <div className="wordle-selection-grid teams-grid">
              {ALL_TEAMS.map(team => {
                const isSelected = selectedTeamIds.has(team.id);
                // Get short name - first word or "The X" becomes just "X"
                const shortName = team.name.startsWith('The ')
                  ? team.name.slice(4).split(' ')[0]
                  : team.name.split(' ')[0];
                return (
                  <button
                    key={team.id}
                    className={`wordle-selection-cell ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleTeam(team.id)}
                    style={{ '--team-color': team.color } as React.CSSProperties}
                  >
                    <span className="cell-emoji">{team.emoji}</span>
                    <span className="cell-name" style={{ color: isSelected ? team.color : undefined }}>
                      {shortName}
                    </span>
                    {isSelected && <span className="cell-check">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tracks Tab - Wordle Grid Style */}
        {activeTab === 'tracks' && (
          <div className="setup-section selection-section wordle-selection">
            <div className="selection-header">
              <div>
                <h2>Select Race Calendar</h2>
                <p className="setup-hint">
                  Choose tracks for your season. {selectedRaces} races will be selected from your choices.
                </p>
              </div>
              <div className="selection-actions">
                <button className="action-btn" onClick={randomizeTracks}>
                  🎲 Random {Math.min(selectedRaces, ALL_TRACKS.length)}
                </button>
                <button className="action-btn" onClick={selectAllTracks}>
                  ✓ All
                </button>
              </div>
            </div>

            <div className="wordle-selection-grid tracks-grid">
              {ALL_TRACKS.map(track => {
                const isSelected = selectedTrackIds.has(track.id);
                // Get short name - first word or "The X" becomes just "X"
                const shortName = track.name.startsWith('The ')
                  ? track.name.slice(4).split(' ')[0]
                  : track.name.split(' ')[0];
                return (
                  <button
                    key={track.id}
                    className={`wordle-selection-cell track-cell ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleTrack(track.id)}
                  >
                    <span className="cell-emoji">{track.emoji}</span>
                    <span className="cell-name">{shortName}</span>
                    <span className="cell-laps">{track.laps}L</span>
                    {isSelected && <span className="cell-check">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="setup-summary">
          <div className="summary-stats">
            <div className="summary-stat">
              <span className="stat-value">{selectedRaces}</span>
              <span className="stat-label">Races</span>
            </div>
            <div className="summary-stat">
              <span className="stat-value">{selectedTeams.length}</span>
              <span className="stat-label">Teams</span>
            </div>
            <div className="summary-stat">
              <span className="stat-value">{driverCount}</span>
              <span className="stat-label">Drivers</span>
            </div>
            <div className="summary-stat">
              <span className="stat-value">{selectedTracks.length}</span>
              <span className="stat-label">Circuits</span>
            </div>
          </div>

          <button
            className="start-season-btn"
            onClick={handleStartSeason}
            disabled={selectedTeams.length < 5 || selectedTracks.length < 3}
          >
            Start Championship
            <span className="btn-arrow">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default SeasonSetup;
