import { useState, useMemo, useRef, useCallback } from 'react';
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
  onStartRace: (prohibitionMode: boolean) => void;
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
  // Prohibition mode (no gambling) - defaults to false (gambling enabled)
  const [prohibitionMode, setProhibitionMode] = useState(false);
  // Debounce reroll to prevent rapid re-generation on mobile
  const [isRerolling, setIsRerolling] = useState(false);
  const rerollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const handleSummonAgain = useCallback(() => {
    // Debounce: prevent rapid rerolls on mobile (300ms cooldown)
    if (isRerolling) return;
    setIsRerolling(true);

    // Clear any existing timeout
    if (rerollTimeoutRef.current) {
      clearTimeout(rerollTimeoutRef.current);
    }

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

    // Re-enable after cooldown
    rerollTimeoutRef.current = setTimeout(() => {
      setIsRerolling(false);
    }, 300);
  }, [isRerolling, activeTeams, isSeasonMode]);

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

    onStartRace(prohibitionMode);
  };

  return (
    <div className="league-setup betting-style">
      {/* Narrator Box - mirrors betting screen */}
      <div className="narrator-box">
        <span className="narrator-name">🏁 Race Director</span>
        <span className="narrator-message">
          "{activeTeams.length} teams assembled. {roster.length} drivers ready. {track.emoji} {track.name} awaits."
        </span>
        <span className="setup-tip">Tap a team to see their drivers and car details.</span>
      </div>

      {/* Tabs */}
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
          Track
        </button>
        <button
          className={`reroll-btn ${isRerolling ? 'disabled' : ''}`}
          onClick={handleSummonAgain}
          disabled={isRerolling}
        >
          🎲 Reroll
        </button>
      </div>

      {/* Main Content Area */}
      <div className="setup-main">
        {activeTab === 'roster' && (
          <div className="wordle-grid teams-grid">
            {activeTeams.map(team => {
              const carRating = carRatings.get(team.id) || null;
              const isSelected = selectedDriver?.kingdomId === team.id;
              const drivers = getTeamDrivers(team.id);
              const displayName = team.name.startsWith('The ')
                ? team.name.slice(4)
                : team.name;

              return (
                <button
                  key={team.id}
                  className={`wordle-cell team-cell ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedDriver(isSelected ? null : drivers[0])}
                  style={{ '--team-color': team.color } as React.CSSProperties}
                >
                  <span className="cell-emoji">{team.emoji}</span>
                  <span className="cell-name" style={{ color: team.color }}>{displayName}</span>
                  {carRating && (
                    <span className={`cell-car-vibe tier-${carRating.tier}`}>
                      {carRating.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {activeTab === 'track' && (
          <div className="wordle-grid tracks-grid">
            {ALL_TRACKS.map(t => {
              const isSelected = track.id === t.id;
              const shortName = t.name.startsWith('The ')
                ? t.name.slice(4).split(' ')[0]
                : t.name.split(' ')[0];
              return (
                <button
                  key={t.id}
                  className={`wordle-cell track-cell ${isSelected ? 'selected' : ''}`}
                  onClick={() => !isSeasonMode && setTrack(t)}
                  disabled={isSeasonMode}
                >
                  <span className="cell-emoji">{t.emoji}</span>
                  <span className="cell-name">{shortName}</span>
                  <span className="cell-laps">{t.laps}L</span>
                  {isSelected && <span className="cell-check">✓</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* Expanded Team Detail Panel - shows below grid when a team is selected */}
        {selectedDriver && activeTab === 'roster' && (() => {
          const team = activeTeams.find(t => t.id === selectedDriver.kingdomId);
          const carRating = team ? carRatings.get(team.id) : null;
          const drivers = team ? getTeamDrivers(team.id) : [];
          if (!team) return null;
          return (
            <div className="inline-detail-panel">
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
          );
        })()}

        {/* Track Detail - shows below grid when on track tab */}
        {activeTab === 'track' && (
          <div className="inline-detail-panel track-detail">
            <div className="detail-team-header">
              <span className="detail-emoji">{track.emoji}</span>
              <div className="detail-team-info">
                <h3>{track.name}</h3>
                <p className="detail-desc">{track.description}</p>
              </div>
            </div>
            <div className="track-stats-row">
              <span className="track-stat-pill">{track.layout.name}</span>
              <span className="track-stat-pill">{track.laps} laps</span>
              <span className="track-stat-pill">{track.length} units</span>
            </div>
            <div className="track-event-box">
              <span className="event-title">{track.event.emoji} {track.event.name}</span>
              <span className="event-desc">{getDynamicEventDescription(track.event, track.laps)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Actions - mirrors betting screen */}
      <div className="setup-actions">
        <label className="prohibition-checkbox">
          <input
            type="checkbox"
            checked={prohibitionMode}
            onChange={(e) => setProhibitionMode(e.target.checked)}
          />
          <span>🚫 No Betting</span>
        </label>
        <button className="place-bets-btn" onClick={handleStartRace}>
          Place Your Bets →
        </button>
      </div>
    </div>
  );
}

export default LeagueSetup;
