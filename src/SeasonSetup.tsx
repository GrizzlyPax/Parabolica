import { useState, useMemo } from 'react';
import { ALL_KINGDOMS, getRandomKingdoms } from './data/kingdoms';
import { ALL_TRACKS, getRandomTracks } from './generators/tracks';
import './SeasonSetup.css';

interface SeasonSetupProps {
  onStartSeason: (numRaces: number, selectedKingdomIds: string[], selectedTrackIds: string[]) => void;
  onBack: () => void;
}

const RACE_OPTIONS = [5, 10, 15, 20];

type SetupTab = 'overview' | 'teams' | 'tracks';

function SeasonSetup({ onStartSeason, onBack }: SeasonSetupProps) {
  const [selectedRaces, setSelectedRaces] = useState(10);
  const [activeTab, setActiveTab] = useState<SetupTab>('overview');

  // Team selection - default to random 10
  const [selectedKingdomIds, setSelectedKingdomIds] = useState<Set<string>>(() => {
    const random10 = getRandomKingdoms(10);
    return new Set(random10.map(k => k.id));
  });

  // Track selection - default to random based on race count
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(() => {
    const randomTracks = getRandomTracks(10);
    return new Set(randomTracks.map(t => t.id));
  });

  const toggleKingdom = (kingdomId: string) => {
    setSelectedKingdomIds(prev => {
      const next = new Set(prev);
      if (next.has(kingdomId)) {
        // Don't allow fewer than 5 teams
        if (next.size > 5) {
          next.delete(kingdomId);
        }
      } else {
        // Don't allow more than 15 teams
        if (next.size < 15) {
          next.add(kingdomId);
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

  const randomizeKingdoms = () => {
    const random = getRandomKingdoms(10);
    setSelectedKingdomIds(new Set(random.map(k => k.id)));
  };

  const randomizeTracks = () => {
    const random = getRandomTracks(Math.min(selectedRaces, ALL_TRACKS.length));
    setSelectedTrackIds(new Set(random.map(t => t.id)));
  };

  const selectAllKingdoms = () => {
    setSelectedKingdomIds(new Set(ALL_KINGDOMS.slice(0, 15).map(k => k.id)));
  };

  const selectAllTracks = () => {
    setSelectedTrackIds(new Set(ALL_TRACKS.map(t => t.id)));
  };

  // Computed values
  const selectedKingdoms = useMemo(() =>
    ALL_KINGDOMS.filter(k => selectedKingdomIds.has(k.id)),
    [selectedKingdomIds]
  );

  const selectedTracks = useMemo(() =>
    ALL_TRACKS.filter(t => selectedTrackIds.has(t.id)),
    [selectedTrackIds]
  );

  const driverCount = selectedKingdoms.length * 2;

  const handleStartSeason = () => {
    onStartSeason(
      selectedRaces,
      Array.from(selectedKingdomIds),
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
          <p>Configure your championship season</p>
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
            Teams ({selectedKingdoms.length}/{ALL_KINGDOMS.length})
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
              <p className="setup-hint">F1-style championship points awarded to top 10 finishers</p>

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

        {/* Teams Tab */}
        {activeTab === 'teams' && (
          <div className="setup-section selection-section">
            <div className="selection-header">
              <div>
                <h2>Select Competing Kingdoms</h2>
                <p className="setup-hint">Choose 5-15 teams. Each team has 2 drivers.</p>
              </div>
              <div className="selection-actions">
                <button className="action-btn" onClick={randomizeKingdoms}>
                  🎲 Random 10
                </button>
                <button className="action-btn" onClick={selectAllKingdoms}>
                  ✓ Select 15
                </button>
              </div>
            </div>

            <div className="selection-grid kingdoms-grid">
              {ALL_KINGDOMS.map(kingdom => {
                const isSelected = selectedKingdomIds.has(kingdom.id);
                return (
                  <div
                    key={kingdom.id}
                    className={`selection-card kingdom-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleKingdom(kingdom.id)}
                    style={{ '--kingdom-color': kingdom.color } as React.CSSProperties}
                  >
                    <div className="selection-checkbox">
                      {isSelected ? '✓' : ''}
                    </div>
                    <span className="selection-emoji">{kingdom.emoji}</span>
                    <div className="selection-info">
                      <span className="selection-name" style={{ color: kingdom.color }}>
                        {kingdom.name}
                      </span>
                      <span className="selection-desc">{kingdom.description}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tracks Tab */}
        {activeTab === 'tracks' && (
          <div className="setup-section selection-section">
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
                  ✓ Select All
                </button>
              </div>
            </div>

            <div className="selection-grid tracks-grid">
              {ALL_TRACKS.map(track => {
                const isSelected = selectedTrackIds.has(track.id);
                return (
                  <div
                    key={track.id}
                    className={`selection-card track-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleTrack(track.id)}
                  >
                    <div className="selection-checkbox">
                      {isSelected ? '✓' : ''}
                    </div>
                    <span className="selection-emoji">{track.emoji}</span>
                    <div className="selection-info">
                      <span className="selection-name">{track.name}</span>
                      <span className="selection-desc">{track.description}</span>
                      <div className="track-meta">
                        <span className="track-stat">{track.laps} laps</span>
                        <span className="track-stat">{track.event.emoji} {track.event.name}</span>
                      </div>
                    </div>
                  </div>
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
              <span className="stat-value">{selectedKingdoms.length}</span>
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
            disabled={selectedKingdoms.length < 5 || selectedTracks.length < 3}
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
