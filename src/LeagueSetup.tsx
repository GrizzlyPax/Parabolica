import { useState, useMemo } from 'react';
import { generateRosterFromTeams, GeneratedDriver } from './generators/drivers';
import { Track, ALL_TRACKS, getDynamicEventDescription, generateTrack } from './generators/tracks';
import { generateCarsForKingdoms, GeneratedCar } from './generators/cars';
import { getTeamsByIds, getRandomTeams, Team } from './data/teams';
import RaceEngine from './RaceEngine';
import Tooltip from './components/Tooltip';
import './LeagueSetup.css';

// ============================================
// RATING DESCRIPTORS - Vibes over numbers
// Tiers: legendary (purple/best) → elite (green) → solid (yellow) → scrappy (orange) → hopeless (red/worst)
// ============================================

type RatingTier = 'legendary' | 'elite' | 'solid' | 'hopeless';

interface RatingDescriptor {
  tier: RatingTier;
  label: string;
}

// Driver skill descriptors
// 4 tiers: legendary (purple) → elite (green) → solid (yellow) → hopeless (red)
const DRIVER_DESCRIPTORS: Record<RatingTier, string[]> = {
  legendary: [
    'Legendary', 'Mythical', 'Godlike', 'Transcendent', 'Chosen One',
    'The GOAT', 'Untouchable', 'Built Different', 'Main Character',
    'Sicko Mode', 'Final Boss', 'Prophecy Fulfilled', 'Literally Him',
  ],
  elite: [
    'Elite', 'Masterful', 'Brilliant', 'Exceptional', 'Cracked',
    'Dialed In', 'On One', 'Locked In', 'Different Gravy',
    'Certified', 'Top Shelf', 'Premium', 'Chef\'s Kiss',
  ],
  solid: [
    'Solid', 'Reliable', 'Dependable', 'Steady', 'Gets The Job Done',
    'Honest Work', 'No Drama', 'Lunch Pail Guy', 'Professional',
    'Shows Up', 'Pays Rent', 'Fine I Guess', 'Could Be Worse',
    'Scrappy', 'Gritty', 'Questionable', 'Winging It', 'Mid',
  ],
  hopeless: [
    'Hopeless', 'Tragic', 'Doomed', 'Walking DNF', 'Lost Cause',
    'Thoughts & Prayers', 'Bless Their Heart', 'Oh No Baby',
    'Disaster Artist', 'Absolute Cinema', 'Content Creator',
    'Participation Trophy', 'At Least They Tried', 'Yikes',
    'Sus', 'Concerning', 'Prayers Required', 'Red Flags',
  ],
};

// Car quality descriptors
const CAR_DESCRIPTORS: Record<RatingTier, string[]> = {
  legendary: [
    'Rocketship', 'Absolute Unit', 'Cheat Code', 'Engineering Porn',
    'Beast Mode', 'Straight Nasty', 'War Machine', 'Death Star',
    'Weapon of Choice', 'Pure Violence', 'Unfair Advantage',
  ],
  elite: [
    'Refined', 'Tuned', 'Sharp', 'Pristine', 'Dialed',
    'Clean Build', 'Chef\'s Kiss', 'Money Well Spent', 'Actually Good',
    'The Real Deal', 'Legit', 'Premium Gas Only',
  ],
  solid: [
    'Decent', 'Gets Around', 'Runs Fine', 'Adequate', 'It\'ll Do',
    'Nothing Special', 'Basic', 'Economy Class', 'Sensible',
    'Mid', 'Could Be Worse', 'Passes Inspection',
    'Sketchy', 'Held Together', 'Vibes Only',
  ],
  hopeless: [
    'Tractor', 'Shopping Cart', 'Dumpster Fire', 'Insurance Claim',
    'Rolling Coffin', 'Lawsuit Waiting', 'Tetanus Mobile',
    'Yard Sale', 'Scrap Metal', 'Museum Piece', 'Tax Write-Off',
    'Crime Scene', 'Cry For Help', 'Health Hazard',
    'Duct Tape Dreams', 'Concerning Noises', 'Check Engine Light',
  ],
};

function getRandomDescriptor(descriptors: string[]): string {
  return descriptors[Math.floor(Math.random() * descriptors.length)];
}

function getDriverTier(driver: GeneratedDriver): RatingTier {
  const speedScore = (driver.stats.baseSpeed - 0.85) / 0.30;
  const consistencyScore = (driver.stats.consistency - 0.3) / 0.50;
  const luckScore = (driver.stats.luck - 0.3) / 0.50;

  const overall = speedScore * 0.5 + consistencyScore * 0.35 + luckScore * 0.15;

  if (overall >= 0.75) return 'legendary';
  if (overall >= 0.5) return 'elite';
  if (overall >= 0.25) return 'solid';
  return 'hopeless';
}

function getCarTier(car: GeneratedCar): RatingTier {
  const powerScore = (car.stats.power - 1) / 4;
  const gripScore = (car.stats.grip - 1) / 4;
  const reliabilityScore = (car.stats.reliability - 1) / 4;

  const overall = powerScore * 0.4 + gripScore * 0.35 + reliabilityScore * 0.25;

  if (overall >= 0.75) return 'legendary';
  if (overall >= 0.5) return 'elite';
  if (overall >= 0.25) return 'solid';
  return 'hopeless';
}

interface LeagueSetupProps {
  onStartRace: (favoriteTeamId: string | null, rivalTeamId: string | null, prohibitionMode: boolean) => void;
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
  // Prohibition mode (no gambling) - defaults to false (gambling enabled)
  const [prohibitionMode, setProhibitionMode] = useState(false);

  const engine = RaceEngine.getInstance();

  // Memoize driver ratings so they don't re-randomize on every render
  const driverRatings = useMemo(() => {
    const ratings = new Map<number, RatingDescriptor>();
    roster.forEach(driver => {
      const tier = getDriverTier(driver);
      ratings.set(driver.id, { tier, label: getRandomDescriptor(DRIVER_DESCRIPTORS[tier]) });
    });
    return ratings;
  }, [roster]);

  // Memoize car ratings so they don't re-randomize on every render
  const carRatings = useMemo(() => {
    const ratings = new Map<string, RatingDescriptor>();
    cars.forEach((car, teamId) => {
      const tier = getCarTier(car);
      ratings.set(teamId, { tier, label: getRandomDescriptor(CAR_DESCRIPTORS[tier]) });
    });
    return ratings;
  }, [cars]);

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
    // Attach car stats, team stats, and tags to each driver before loading into engine
    const rosterWithCars = roster.map(driver => {
      const car = cars.get(driver.kingdomId);
      return {
        ...driver,
        carStats: car?.stats,
        carName: car?.name,
        teamStats: car?.teamStats,
        driverTag: driver.tag,
        carTag: car?.carTag,
        teamTag: car?.teamTag,
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
    onStartRace(chosenTeamId, cursedTeamId, prohibitionMode);
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
          <div className="roster-panel wordle-lineup">
            <div className="panel-header">
              <h2>The Grid</h2>
              <button className="reroll-btn" onClick={handleSummonAgain}>
                🎲 Summon Again
              </button>
            </div>

            <p className="lineup-hint">Tap a team to see their drivers. Star your favorites, skull your rivals.</p>

            {/* Wordle-style team grid */}
            <div className="lineup-grid">
              {activeTeams.map(team => {
                const carRating = carRatings.get(team.id) || null;
                const isChosen = chosenTeamId === team.id;
                const isCursed = cursedTeamId === team.id;
                const isExpanded = selectedDriver?.kingdomId === team.id;
                const drivers = getTeamDrivers(team.id);
                // Show full name, but strip "The " prefix if present
                const displayName = team.name.startsWith('The ')
                  ? team.name.slice(4)
                  : team.name;

                return (
                  <div key={team.id} className="lineup-cell-wrapper">
                    <button
                      className={`lineup-cell ${isChosen ? 'chosen' : ''} ${isCursed ? 'cursed' : ''} ${isExpanded ? 'expanded' : ''}`}
                      onClick={() => setSelectedDriver(isExpanded ? null : drivers[0])}
                      style={{ '--team-color': team.color } as React.CSSProperties}
                    >
                      <span className="cell-emoji">{team.emoji}</span>
                      <span className="cell-name" style={{ color: team.color }}>{displayName}</span>
                      {carRating && (
                        <span className={`cell-car-vibe tier-${carRating.tier}`}>
                          {carRating.label}
                        </span>
                      )}
                      <div className="cell-actions">
                        <button
                          className={`cell-action star ${isChosen ? 'active' : ''}`}
                          onClick={(e) => handleChosenTeamClick(team.id, e)}
                          title="Follow this team"
                        >
                          {isChosen ? '⭐' : '☆'}
                        </button>
                        <button
                          className={`cell-action skull ${isCursed ? 'active' : ''}`}
                          onClick={(e) => handleCursedTeamClick(team.id, e)}
                          title="Mark as rival"
                        >
                          {isCursed ? '💀' : '☠'}
                        </button>
                      </div>
                    </button>

                    {/* Expanded driver details panel */}
                    {isExpanded && (
                      <div className="lineup-detail-panel">
                        <div className="detail-team-header">
                          <span className="detail-emoji">{team.emoji}</span>
                          <div className="detail-team-info">
                            <h3 style={{ color: team.color }}>{team.name}</h3>
                            <p className="detail-desc">{team.description}</p>
                          </div>
                          <button className="detail-close" onClick={() => setSelectedDriver(null)}>×</button>
                        </div>

                        {/* Car vibes */}
                        {(() => {
                          const car = cars.get(team.id);
                          return car && (
                            <div className="detail-car">
                              <span className="detail-car-name">🏎️ {car.name}</span>
                              <span className={`detail-car-rating tier-${carRating?.tier}`}>
                                {carRating?.label}
                              </span>
                              {car.carTag && (
                                <Tooltip content={car.carTag.description}>
                                  <span className="tag-chip">{car.carTag.emoji} {car.carTag.name}</span>
                                </Tooltip>
                              )}
                            </div>
                          );
                        })()}

                        {/* Drivers */}
                        <div className="detail-drivers">
                          {drivers.map(driver => {
                            const driverRating = driverRatings.get(driver.id);
                            return (
                              <div key={driver.id} className="detail-driver">
                                <div className="driver-main-info">
                                  <span className="driver-slot-badge" data-slot={driver.driverSlot}>
                                    #{driver.driverSlot}
                                  </span>
                                  <span className="driver-fullname">{driver.fullName}</span>
                                  <span className={`driver-vibe tier-${driverRating?.tier}`}>
                                    {driverRating?.label}
                                  </span>
                                </div>
                                {driver.tag && (
                                  <Tooltip content={driver.tag.description}>
                                    <span className="tag-chip">{driver.tag.emoji} {driver.tag.name}</span>
                                  </Tooltip>
                                )}
                                {driver.quirk && (
                                  <p className="driver-quirk-text">⚡ {driver.quirk}</p>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Team tag */}
                        {cars.get(team.id)?.teamTag && (
                          <div className="detail-team-tag">
                            <Tooltip content={cars.get(team.id)!.teamTag!.description}>
                              <span className="tag-chip">
                                {cars.get(team.id)!.teamTag!.emoji} {cars.get(team.id)!.teamTag!.name}
                              </span>
                            </Tooltip>
                          </div>
                        )}
                      </div>
                    )}
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
        <div className="footer-controls">
          <label className="prohibition-toggle">
            <input
              type="checkbox"
              checked={prohibitionMode}
              onChange={(e) => setProhibitionMode(e.target.checked)}
            />
            <span className="prohibition-label">🚫 Prohibition Mode</span>
            <span className="prohibition-hint">No gambling</span>
          </label>
          <button className="start-race-btn" onClick={handleStartRace}>
            Start Race
          </button>
        </div>
      </div>
    </div>
  );
}

export default LeagueSetup;
