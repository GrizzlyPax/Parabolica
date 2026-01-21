import { useState } from 'react';
import { generateRosterFromTeams, GeneratedDriver } from './generators/drivers';
import { Track, ALL_TRACKS, getDynamicEventDescription, generateTrack } from './generators/tracks';
import { generateCarsForKingdoms, GeneratedCar, getStatDescription, getStatEmoji } from './generators/cars';
import { getTeamsByIds, getRandomTeams, Team } from './data/teams';
import RaceEngine from './RaceEngine';
import StarRating from './components/StarRating';
import Tooltip from './components/Tooltip';
import './LeagueSetup.css';

// Calculate driver overall rating (50-99)
function calculateDriverRating(driver: GeneratedDriver): number {
  const speedNorm = (driver.stats.baseSpeed - 0.85) / 0.30;
  const consistencyNorm = (driver.stats.consistency - 0.3) / 0.50;
  const luckNorm = (driver.stats.luck - 0.3) / 0.50;
  const accelNorm = (driver.stats.acceleration - 0.85) / 0.30;
  const enduranceNorm = (driver.stats.endurance - 0.85) / 0.30;
  const aggressionNorm = (driver.stats.aggression - 0.3) / 0.50;

  const driverScore = (
    speedNorm * 0.25 +
    consistencyNorm * 0.20 +
    accelNorm * 0.15 +
    enduranceNorm * 0.15 +
    luckNorm * 0.15 +
    (1 - Math.abs(aggressionNorm - 0.5) * 2) * 0.10
  );

  return Math.round(50 + driverScore * 49);
}

// Calculate car overall rating (50-99)
function calculateCarRating(car: GeneratedCar): number {
  const carPower = (car.stats.power - 1) / 4;
  const carGrip = (car.stats.grip - 1) / 4;
  const carReliability = (car.stats.reliability - 1) / 4;

  const carScore = (
    carPower * 0.45 +
    carGrip * 0.35 +
    carReliability * 0.20
  );

  return Math.round(50 + carScore * 49);
}

// Get color for rating (F1 style: red < yellow < green < purple)
function getRatingColor(rating: number): string {
  if (rating >= 90) return '#a855f7';  // Purple - elite
  if (rating >= 80) return '#22c55e';  // Green - great
  if (rating >= 70) return '#eab308';  // Yellow - good
  return '#ef4444';                     // Red - below average
}

interface LeagueSetupProps {
  onStartRace: (favoriteTeamId: string | null, rivalTeamId: string | null) => void;
  // Season mode - use specific teams and track
  seasonKingdomIds?: string[];
  seasonTrack?: Track;
}

function LeagueSetup({ onStartRace, seasonKingdomIds, seasonTrack }: LeagueSetupProps) {
  // Determine if we're in season mode
  const isSeasonMode = !!seasonKingdomIds && seasonKingdomIds.length > 0;

  // Get the active teams (either season-selected or random 10 for single race)
  const [activeTeams, setActiveTeams] = useState<Team[]>(() =>
    isSeasonMode ? getTeamsByIds(seasonKingdomIds!) : getRandomTeams(10)
  );

  // Generate roster based on active teams
  const [roster, setRoster] = useState<GeneratedDriver[]>(() =>
    generateRosterFromTeams(activeTeams.map(t => t.id))
  );

  // Generate cars for each team
  const [cars, setCars] = useState<Map<string, GeneratedCar>>(() =>
    generateCarsForKingdoms(activeTeams.map(t => t.id))
  );

  // Use season track if provided, otherwise pick a random track for single race
  const [track, setTrack] = useState<Track>(() =>
    seasonTrack || generateTrack()
  );

  const [selectedDriver, setSelectedDriver] = useState<GeneratedDriver | null>(null);
  const [activeTab, setActiveTab] = useState<'roster' | 'track'>('roster');
  // Team selection for favorites/rivals
  const [chosenTeamId, setChosenTeamId] = useState<string | null>(null);
  const [cursedTeamId, setCursedTeamId] = useState<string | null>(null);

  const engine = RaceEngine.getInstance();

  // Get drivers for a team
  const getTeamDrivers = (teamId: string) =>
    roster.filter(d => d.kingdomId === teamId);

  const handleSummonAgain = () => {
    // In single race mode, reroll everything: teams, drivers, cars, track
    // In season mode, only reroll drivers and cars (teams and track are fixed)
    let newTeams = activeTeams;
    if (!isSeasonMode) {
      newTeams = getRandomTeams(10);
      setActiveTeams(newTeams);
      setTrack(generateTrack());
    }

    const teamIds = newTeams.map(t => t.id);
    setRoster(generateRosterFromTeams(teamIds));
    setCars(generateCarsForKingdoms(teamIds));
    setSelectedDriver(null);
    setChosenTeamId(null);
    setCursedTeamId(null);
  };

  const handleChosenTeamClick = (teamId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (chosenTeamId === teamId) {
      setChosenTeamId(null);
    } else {
      setChosenTeamId(teamId);
      // If this team was the cursed one, clear that
      if (cursedTeamId === teamId) {
        setCursedTeamId(null);
      }
    }
  };

  const handleCursedTeamClick = (teamId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (cursedTeamId === teamId) {
      setCursedTeamId(null);
    } else {
      setCursedTeamId(teamId);
      // If this team was the chosen one, clear that
      if (chosenTeamId === teamId) {
        setChosenTeamId(null);
      }
    }
  };

  const handleStartRace = () => {
    // Attach car stats and team stats to each driver before loading into engine
    const rosterWithCars = roster.map(driver => {
      const car = cars.get(driver.kingdomId);
      return {
        ...driver,
        carStats: car?.stats,
        carName: car?.name,
        teamStats: car?.teamStats,
      };
    });

    // Load the roster into the engine
    engine.loadGeneratedRoster(rosterWithCars);

    // Store track info for display in race views
    engine.setTrackInfo({
      id: track.id,
      name: track.name,
      emoji: track.emoji,
      description: track.description,
      laps: track.laps,
      layout: {
        trackPath: track.layout.trackPath,
        pitLanePath: track.layout.pitLanePath,
        straightStart: track.layout.straightStart,
        straightEnd: track.layout.straightEnd,
        totalLength: track.layout.totalLength,
      },
      event: {
        id: track.event.id,
        name: track.event.name,
        emoji: track.event.emoji,
        description: getDynamicEventDescription(track.event, track.laps),
        flavorText: track.event.flavorText,
      },
      // Full event data for engine processing
      eventTrigger: track.event.trigger,
      eventEffect: track.event.effect,
    });

    // Apply track settings
    engine.updateConfig({
      lapLength: track.length,
      totalLaps: track.laps,
    });

    // Pass team IDs directly (powers now affect whole team)
    onStartRace(chosenTeamId, cursedTeamId);
  };

  // Get chosen/cursed team objects for preview
  const chosenTeam = chosenTeamId ? activeTeams.find(t => t.id === chosenTeamId) : null;
  const cursedTeam = cursedTeamId ? activeTeams.find(t => t.id === cursedTeamId) : null;

  return (
    <div className="league-setup">
      <header className="setup-header">
        <h1>Parabolica</h1>
        <p className="subtitle">{activeTeams.length} teams. {roster.length} drivers. Unclear outcomes.</p>
      </header>

      <div className="setup-tabs">
        <button
          className={`setup-tab ${activeTab === 'roster' ? 'active' : ''}`}
          onClick={() => setActiveTab('roster')}
        >
          Teams ({activeTeams.length})
        </button>
        <button
          className={`setup-tab ${activeTab === 'track' ? 'active' : ''}`}
          onClick={() => setActiveTab('track')}
        >
          Location
        </button>
      </div>

      <div className="setup-content">
        {activeTab === 'roster' && (
          <div className="roster-panel">
            <div className="panel-header">
              <h2>Competing Teams</h2>
              <button className="reroll-btn" onClick={handleSummonAgain}>
                👁️ Summon Again
              </button>
            </div>

            <div className="kingdoms-list">
              {activeTeams.map(team => {
                const drivers = getTeamDrivers(team.id);
                const isChosen = chosenTeamId === team.id;
                const isCursed = cursedTeamId === team.id;

                return (
                  <div
                    key={team.id}
                    className={`kingdom-card ${isChosen ? 'chosen-kingdom' : ''} ${isCursed ? 'cursed-kingdom' : ''}`}
                    style={{ borderColor: team.color }}
                  >
                    <div className="kingdom-header">
                      <span className="kingdom-emoji">{team.emoji}</span>
                      <div className="kingdom-info">
                        <h3 className="kingdom-name" style={{ color: team.color }}>{team.name}</h3>
                        <p className="kingdom-desc">{team.description}</p>
                      </div>
                      <div className="kingdom-selection-buttons">
                        <button
                          className={`selection-btn chosen-btn ${isChosen ? 'active' : ''}`}
                          onClick={(e) => handleChosenTeamClick(team.id, e)}
                          title="Follow this team"
                        >
                          {isChosen ? '⭐' : '☆'}
                        </button>
                        <button
                          className={`selection-btn cursed-btn ${isCursed ? 'active' : ''}`}
                          onClick={(e) => handleCursedTeamClick(team.id, e)}
                          title="Mark as rival"
                        >
                          {isCursed ? '💀' : '☠'}
                        </button>
                      </div>
                    </div>

                    {/* Car and Team stats display */}
                    {cars.get(team.id) && (() => {
                      const car = cars.get(team.id)!;
                      return (
                        <div className="kingdom-car">
                          <div className="car-header">
                            <span className="car-name">🏎️ {car.name}</span>
                            <span
                              className="car-rating"
                              style={{ color: getRatingColor(calculateCarRating(car)) }}
                            >
                              {calculateCarRating(car)}
                            </span>
                            <span className="car-quirk">{car.quirk}</span>
                          </div>
                          <div className="car-stats">
                            <Tooltip content={getStatDescription('power')}>
                              <div className="car-stat">
                                <span className="car-stat-label">{getStatEmoji('power')} PWR</span>
                                <StarRating value={car.stats.power} min={1} max={5} color="#ff6b6b" size="sm" />
                              </div>
                            </Tooltip>
                            <Tooltip content={getStatDescription('grip')}>
                              <div className="car-stat">
                                <span className="car-stat-label">{getStatEmoji('grip')} GRP</span>
                                <StarRating value={car.stats.grip} min={1} max={5} color="#4ecdc4" size="sm" />
                              </div>
                            </Tooltip>
                            <Tooltip content={getStatDescription('reliability')}>
                              <div className="car-stat">
                                <span className="car-stat-label">{getStatEmoji('reliability')} REL</span>
                                <StarRating value={car.stats.reliability} min={1} max={5} color="#f1c40f" size="sm" />
                              </div>
                            </Tooltip>
                            <span className="stat-divider">|</span>
                            <Tooltip content={getStatDescription('tireManagement')}>
                              <div className="car-stat">
                                <span className="car-stat-label">{getStatEmoji('tireManagement')} TIRE</span>
                                <StarRating value={car.teamStats.tireManagement} min={1} max={5} color="#9b59b6" size="sm" />
                              </div>
                            </Tooltip>
                            <Tooltip content={getStatDescription('pitCrew')}>
                              <div className="car-stat">
                                <span className="car-stat-label">{getStatEmoji('pitCrew')} PIT</span>
                                <StarRating value={car.teamStats.pitCrew} min={1} max={5} color="#3498db" size="sm" />
                              </div>
                            </Tooltip>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="kingdom-drivers">
                      {drivers.map(driver => (
                        <div
                          key={driver.id}
                          className={`driver-row ${selectedDriver?.id === driver.id ? 'selected' : ''}`}
                          onClick={() => setSelectedDriver(selectedDriver?.id === driver.id ? null : driver)}
                        >
                          <div className="driver-badge" data-slot={driver.driverSlot} style={{ '--team-color': team.color } as React.CSSProperties}>
                            <span className="badge-emoji">{team.emoji}</span>
                          </div>
                          <span className="driver-name">{driver.fullName}</span>
                          <span
                            className="driver-rating"
                            style={{ color: getRatingColor(calculateDriverRating(driver)) }}
                          >
                            {calculateDriverRating(driver)}
                          </span>
                          <span className="driver-slot">{driver.driverSlot === 1 ? '#1' : '#2'}</span>
                          <div className="driver-stats-inline">
                            <Tooltip content="Base Speed: Determines raw pace. Multiplied by car Power on straights.">
                              <div className="stat-group">
                                <span className="stat-abbr">SPD</span>
                                <StarRating value={driver.stats.baseSpeed} min={0.85} max={1.15} color="#ff6b6b" size="sm" />
                              </div>
                            </Tooltip>
                            <Tooltip content="Consistency: Reduces random speed variance. Boosted by car Grip in corners.">
                              <div className="stat-group">
                                <span className="stat-abbr">CON</span>
                                <StarRating value={driver.stats.consistency} min={0.3} max={0.8} color="#4ecdc4" size="sm" />
                              </div>
                            </Tooltip>
                            <Tooltip content="Luck: Triggers random speed boosts and helps avoid mechanical failures.">
                              <div className="stat-group">
                                <span className="stat-abbr">LCK</span>
                                <StarRating value={driver.stats.luck} min={0.3} max={0.8} color="#f1c40f" size="sm" />
                              </div>
                            </Tooltip>
                          </div>
                          {selectedDriver?.id === driver.id && (
                            <div className="driver-details-expanded">
                              <p className="driver-backstory">{driver.backstory}</p>
                              <p className="driver-quirk"><strong>Quirk:</strong> {driver.quirk}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'track' && (
          <div className="track-panel">
            <div className="panel-header">
              <h2>The Venue</h2>
              {isSeasonMode && (
                <span className="season-track-note">Season Calendar</span>
              )}
            </div>

            {/* Track Picker for Single Race Mode */}
            {!isSeasonMode && (
              <div className="track-picker">
                {ALL_TRACKS.map(t => (
                  <div
                    key={t.id}
                    className={`track-picker-item ${track.id === t.id ? 'selected' : ''}`}
                    onClick={() => setTrack(t)}
                  >
                    <span className="picker-emoji">{t.emoji}</span>
                    <span className="picker-name">{t.name}</span>
                    <span className="picker-event">{t.event.emoji}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Selected Track Details */}
            <div className="track-card">
              <div className="track-header">
                <span className="track-emoji">{track.emoji}</span>
                <h3 className="track-name">{track.name}</h3>
              </div>

              <p className="track-description">{track.description}</p>

              <div className="track-stats">
                <div className="track-stat">
                  <span className="track-stat-label">Layout</span>
                  <span className="track-stat-value">{track.layout.name}</span>
                </div>
                <div className="track-stat">
                  <span className="track-stat-label">Laps</span>
                  <span className="track-stat-value">{track.laps}</span>
                </div>
                <div className="track-stat">
                  <span className="track-stat-label">Length</span>
                  <span className="track-stat-value">{track.length} units</span>
                </div>
              </div>

              {/* Track Event */}
              <div className="track-event">
                <h4>{track.event.emoji} {track.event.name}</h4>
                <p className="event-description">{getDynamicEventDescription(track.event, track.laps)}</p>
                <p className="event-flavor"><em>{track.event.flavorText}</em></p>
              </div>
            </div>
          </div>
        )}

      </div>

      <div className="setup-footer">
        <div className="race-preview">
          <span>{activeTeams.length} teams • {roster.length} drivers</span>
          <span>•</span>
          <span>{track.emoji} {track.name}</span>
          <span>•</span>
          <span>{track.laps} laps</span>
          {(chosenTeam || cursedTeam) && <span>•</span>}
          {chosenTeam && (
            <span className="preview-chosen">
              ⭐ {chosenTeam.emoji} {chosenTeam.name}
            </span>
          )}
          {cursedTeam && (
            <span className="preview-cursed">
              💀 {cursedTeam.emoji} {cursedTeam.name}
            </span>
          )}
        </div>
        <button className="start-race-btn" onClick={handleStartRace}>
          Start Race
        </button>
      </div>
    </div>
  );
}

export default LeagueSetup;
