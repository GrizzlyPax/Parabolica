import { useState, useMemo } from 'react';
import { generateRoster, generateRosterFromKingdoms, GeneratedDriver } from './generators/drivers';
import { Track, ALL_TRACKS, getDynamicEventDescription } from './generators/tracks';
import { generateCarsForKingdoms, GeneratedCar, getStatDescription, getStatEmoji } from './generators/cars';
import { KINGDOMS, getKingdomsByIds, Kingdom } from './data/kingdoms';
import RaceEngine from './RaceEngine';
import StarRating from './components/StarRating';
import Tooltip from './components/Tooltip';
import './LeagueSetup.css';

interface LeagueSetupProps {
  onStartRace: (favoriteKingdomId: string | null, rivalKingdomId: string | null) => void;
  // Season mode - use specific kingdoms and track
  seasonKingdomIds?: string[];
  seasonTrack?: Track;
}

function LeagueSetup({ onStartRace, seasonKingdomIds, seasonTrack }: LeagueSetupProps) {
  // Determine if we're in season mode
  const isSeasonMode = !!seasonKingdomIds && seasonKingdomIds.length > 0;

  // Get the active kingdoms (either season-selected or default 10)
  const activeKingdoms: Kingdom[] = useMemo(() =>
    isSeasonMode ? getKingdomsByIds(seasonKingdomIds!) : KINGDOMS,
    [isSeasonMode, seasonKingdomIds]
  );

  // Generate roster based on mode
  const [roster, setRoster] = useState<GeneratedDriver[]>(() =>
    isSeasonMode ? generateRosterFromKingdoms(seasonKingdomIds!) : generateRoster()
  );

  // Generate cars for each kingdom
  const [cars, setCars] = useState<Map<string, GeneratedCar>>(() =>
    generateCarsForKingdoms(activeKingdoms.map(k => k.id))
  );

  // Use season track if provided, otherwise default to first track
  const [track, setTrack] = useState<Track>(() =>
    seasonTrack || ALL_TRACKS[0]
  );

  const [selectedDriver, setSelectedDriver] = useState<GeneratedDriver | null>(null);
  const [activeTab, setActiveTab] = useState<'roster' | 'track'>('roster');
  // Now we select teams (kingdoms) instead of individual drivers
  const [chosenKingdomId, setChosenKingdomId] = useState<string | null>(null);
  const [cursedKingdomId, setCursedKingdomId] = useState<string | null>(null);

  const engine = RaceEngine.getInstance();

  // Get drivers for a kingdom
  const getKingdomDrivers = (kingdomId: string) =>
    roster.filter(d => d.kingdomId === kingdomId);

  const handleRerollRoster = () => {
    // Use season kingdoms if in season mode, otherwise full roster
    const newRoster = isSeasonMode
      ? generateRosterFromKingdoms(seasonKingdomIds!)
      : generateRoster();
    setRoster(newRoster);
    setSelectedDriver(null);
    // Reset selections when roster changes
    setChosenKingdomId(null);
    setCursedKingdomId(null);
    // Also regenerate cars
    setCars(generateCarsForKingdoms(activeKingdoms.map(k => k.id)));
  };

  const handleChosenKingdomClick = (kingdomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (chosenKingdomId === kingdomId) {
      setChosenKingdomId(null);
    } else {
      setChosenKingdomId(kingdomId);
      // If this kingdom was the cursed one, clear that
      if (cursedKingdomId === kingdomId) {
        setCursedKingdomId(null);
      }
    }
  };

  const handleCursedKingdomClick = (kingdomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (cursedKingdomId === kingdomId) {
      setCursedKingdomId(null);
    } else {
      setCursedKingdomId(kingdomId);
      // If this kingdom was the chosen one, clear that
      if (chosenKingdomId === kingdomId) {
        setChosenKingdomId(null);
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

    // Pass kingdom IDs directly (powers now affect whole team)
    onStartRace(chosenKingdomId, cursedKingdomId);
  };

  // Get chosen/cursed kingdom objects for preview
  const chosenKingdom = chosenKingdomId ? activeKingdoms.find(k => k.id === chosenKingdomId) : null;
  const cursedKingdom = cursedKingdomId ? activeKingdoms.find(k => k.id === cursedKingdomId) : null;

  return (
    <div className="league-setup">
      <header className="setup-header">
        <h1>👑 Crown Prix</h1>
        <p className="subtitle">{activeKingdoms.length} kingdoms compete for glory on the sacred tracks</p>
      </header>

      <div className="setup-tabs">
        <button
          className={`setup-tab ${activeTab === 'roster' ? 'active' : ''}`}
          onClick={() => setActiveTab('roster')}
        >
          The Kingdoms ({activeKingdoms.length} teams)
        </button>
        <button
          className={`setup-tab ${activeTab === 'track' ? 'active' : ''}`}
          onClick={() => setActiveTab('track')}
        >
          The Circuit
        </button>
      </div>

      <div className="setup-content">
        {activeTab === 'roster' && (
          <div className="roster-panel">
            <div className="panel-header">
              <h2>Competing Kingdoms</h2>
              <button className="reroll-btn" onClick={handleRerollRoster}>
                🎲 Summon New Drivers
              </button>
            </div>

            <div className="kingdoms-list">
              {activeKingdoms.map(kingdom => {
                const drivers = getKingdomDrivers(kingdom.id);
                const isChosen = chosenKingdomId === kingdom.id;
                const isCursed = cursedKingdomId === kingdom.id;

                return (
                  <div
                    key={kingdom.id}
                    className={`kingdom-card ${isChosen ? 'chosen-kingdom' : ''} ${isCursed ? 'cursed-kingdom' : ''}`}
                    style={{ borderColor: kingdom.color }}
                  >
                    <div className="kingdom-header">
                      <span className="kingdom-emoji">{kingdom.emoji}</span>
                      <div className="kingdom-info">
                        <h3 className="kingdom-name" style={{ color: kingdom.color }}>{kingdom.name}</h3>
                        <p className="kingdom-desc">{kingdom.description}</p>
                      </div>
                      <div className="kingdom-selection-buttons">
                        <button
                          className={`selection-btn chosen-btn ${isChosen ? 'active' : ''}`}
                          onClick={(e) => handleChosenKingdomClick(kingdom.id, e)}
                          title="Follow this team (optional - highlights during race)"
                        >
                          {isChosen ? '⭐' : '☆'}
                        </button>
                        <button
                          className={`selection-btn cursed-btn ${isCursed ? 'active' : ''}`}
                          onClick={(e) => handleCursedKingdomClick(kingdom.id, e)}
                          title="Mark as rival (optional - highlights during race)"
                        >
                          {isCursed ? '💀' : '☠'}
                        </button>
                      </div>
                    </div>

                    {/* Car and Team stats display */}
                    {cars.get(kingdom.id) && (() => {
                      const car = cars.get(kingdom.id)!;
                      return (
                        <div className="kingdom-car">
                          <div className="car-header">
                            <span className="car-name">🏎️ {car.name}</span>
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
                          <div className="driver-badge" data-slot={driver.driverSlot} style={{ '--team-color': kingdom.color } as React.CSSProperties}>
                            <span className="badge-emoji">{kingdom.emoji}</span>
                          </div>
                          <span className="driver-name">{driver.fullName}</span>
                          <span className="driver-slot">{driver.driverSlot === 1 ? 'Primary' : 'Secondary'}</span>
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
              <h2>The Ritual Grounds</h2>
              {isSeasonMode && (
                <span className="season-track-note">Season Calendar Track</span>
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
          <span>{activeKingdoms.length} kingdoms • {roster.length} drivers</span>
          <span>•</span>
          <span>{track.emoji} {track.name}</span>
          <span>•</span>
          <span>{track.laps} laps</span>
          {(chosenKingdom || cursedKingdom) && <span>•</span>}
          {chosenKingdom && (
            <span className="preview-chosen">
              ⭐ {chosenKingdom.emoji} {chosenKingdom.name}
            </span>
          )}
          {cursedKingdom && (
            <span className="preview-cursed">
              💀 {cursedKingdom.emoji} {cursedKingdom.name}
            </span>
          )}
        </div>
        <button className="start-race-btn" onClick={handleStartRace}>
          👑 Begin the Crown Prix
        </button>
      </div>
    </div>
  );
}

export default LeagueSetup;
