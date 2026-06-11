import { useState, useMemo, useRef, useCallback } from 'react';
import { generateRosterFromTeams, GeneratedDriver } from './generators/drivers';
import { Track, CURRENT_TRACKS, HISTORIC_TRACKS, getDynamicEventDescription, generateTrack } from './generators/tracks';
import { generateCarsForKingdoms, GeneratedCar } from './generators/cars';
import { getTeamsByIds, getRandomTeams, Team, CURRENT_TEAMS } from './data/teams';
import RaceEngine, { RosterDriver } from './RaceEngine';
import TeamCell from './components/TeamCell';
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
  // Receives the exact grid loaded into the engine, so App can persist it
  onStartRace: (rosterWithCars: RosterDriver[]) => void;
  // Season mode - use specific teams and track
  seasonKingdomIds?: string[];
  seasonTrack?: Track;
}

function LeagueSetup({ onStartRace, seasonKingdomIds, seasonTrack }: LeagueSetupProps) {
  // Determine if we're in season mode
  const isSeasonMode = !!seasonKingdomIds && seasonKingdomIds.length > 0;

  // Get the active teams (either season-selected or random 11 for single race)
  const [activeTeams, setActiveTeams] = useState<Team[]>(() =>
    isSeasonMode ? getTeamsByIds(seasonKingdomIds!) : getRandomTeams(11)
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

  const [activeTab, setActiveTab] = useState<'roster' | 'track'>('roster');
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
      newTeams = getRandomTeams(11);
      setActiveTeams(newTeams);
      setTrack(generateTrack());
    }

    const teamIds = newTeams.map(t => t.id);
    setRoster(generateRosterFromTeams(teamIds));
    setCars(generateCarsForKingdoms(teamIds));
    // Re-enable after cooldown
    rerollTimeoutRef.current = setTimeout(() => {
      setIsRerolling(false);
    }, 300);
  }, [isRerolling, activeTeams, isSeasonMode]);

  const handleStartRace = () => {
    // Attach car stats, team stats, and tags to each driver before loading into engine
    const rosterWithCars: RosterDriver[] = roster.map(driver => {
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
      funEmoji: track.funEmoji,
      description: track.description,
      laps: track.laps,
      layout: {
        trackPath: track.layout.trackPath,
        pitLanePath: track.layout.pitLanePath,
        straightStart: track.layout.straightStart,
        straightEnd: track.layout.straightEnd,
        totalLength: track.layout.totalLength,
      },
      event: track.event ? {
        id: track.event.id,
        name: track.event.name,
        emoji: track.event.emoji,
        description: getDynamicEventDescription(track.event, track.laps),
        flavorText: track.event.flavorText,
      } : undefined,
      // Full event data for engine processing
      eventTrigger: track.event?.trigger,
      eventEffect: track.event?.effect,
    });

    // Apply track settings
    engine.updateConfig({
      lapLength: track.length,
      totalLaps: track.laps,
    });

    onStartRace(rosterWithCars);
  };

  return (
    <div className="league-setup betting-style">
      {/* Header - Compact */}
      <div className="setup-header-bar">
        <div className="race-info">
          <span className="race-number">{isSeasonMode ? 'Season Mode' : 'Single Race'}</span>
          <h2 className="track-name">{track.funEmoji} {track.name}</h2>
        </div>
      </div>

      {/* Setup Instructions */}
      <div className="setup-instructions">
        <h1 className="setup-title">Review Your Grid</h1>
        <p className="setup-desc">
          Tap a team to see their drivers and car. {activeTeams.length} teams, {roster.length} drivers.
        </p>
      </div>

      {/* Tabs */}
      <div className="setup-tabs">
        <button
          className={`setup-tab ${activeTab === 'roster' ? 'active' : ''}`}
          onClick={() => setActiveTab('roster')}
        >
          Teams
        </button>
        <button
          className={`setup-tab ${activeTab === 'track' ? 'active' : ''}`}
          onClick={() => setActiveTab('track')}
        >
          Track
        </button>
{isSeasonMode && (
          <button
            className={`reroll-btn ${isRerolling ? 'disabled' : ''}`}
            onClick={handleSummonAgain}
            disabled={isRerolling}
          >
            🎲 Reroll
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="setup-main">
        {activeTab === 'roster' && (() => {
          // Split active teams into current and historic groups
          const currentTeamIds = new Set(CURRENT_TEAMS.map(t => t.id));
          const currentActiveTeams = activeTeams.filter(t => currentTeamIds.has(t.id));
          const historicActiveTeams = activeTeams.filter(t => !currentTeamIds.has(t.id));

          // Sort both groups alphabetically by name
          const sortedCurrentTeams = [...currentActiveTeams].sort((a, b) => a.name.localeCompare(b.name));
          const sortedHistoricTeams = [...historicActiveTeams].sort((a, b) => a.name.localeCompare(b.name));

          return (
            <div className="team-groups">
              {sortedCurrentTeams.length > 0 && (
                <div className="team-group">
                  <h3 className="team-group-label">🏎️ Current Grid</h3>
                  <div className="teams-grid">
                    {sortedCurrentTeams.map(team => {
                      const drivers = getTeamDrivers(team.id);
                      const car = cars.get(team.id);
                      const carRating = carRatings.get(team.id);
                      return (
                        <TeamCell
                          key={team.id}
                          team={team}
                          isSelected={false}
                          onClick={() => {}}
                          car={car ? {
                            name: car.name,
                            rating: carRating?.label,
                            ratingTier: carRating?.tier,
                          } : undefined}
                          drivers={drivers.map(d => {
                            const rating = driverRatings.get(d.id);
                            return {
                              name: d.fullName,
                              slot: d.driverSlot,
                              rating: rating?.label,
                              ratingTier: rating?.tier,
                            };
                          })}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
              {sortedHistoricTeams.length > 0 && (
                <div className="team-group historic">
                  <h3 className="team-group-label">📜 Legendary Teams</h3>
                  <div className="teams-grid">
                    {sortedHistoricTeams.map(team => {
                      const drivers = getTeamDrivers(team.id);
                      const car = cars.get(team.id);
                      const carRating = carRatings.get(team.id);
                      return (
                        <TeamCell
                          key={team.id}
                          team={team}
                          isSelected={false}
                          onClick={() => {}}
                          car={car ? {
                            name: car.name,
                            rating: carRating?.label,
                            ratingTier: carRating?.tier,
                          } : undefined}
                          drivers={drivers.map(d => {
                            const rating = driverRatings.get(d.id);
                            return {
                              name: d.fullName,
                              slot: d.driverSlot,
                              rating: rating?.label,
                              ratingTier: rating?.tier,
                            };
                          })}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {activeTab === 'track' && (
          <div className="track-list-groups">
            <div className="track-list-group">
              <h3 className="track-group-label">🏁 Current Season ({CURRENT_TRACKS.length})</h3>
              <div className="track-list">
                {CURRENT_TRACKS.map(t => {
                  const isSelected = track.id === t.id;
                  return (
                    <button
                      key={t.id}
                      className={`track-list-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => !isSeasonMode && setTrack(t)}
                      disabled={isSeasonMode}
                    >
                      <span className="track-emojis">{t.funEmoji} {t.emoji}</span>
                      <span className="track-info">
                        <span className="track-name">{t.name}</span>
                        <span className="track-desc">{t.description}</span>
                      </span>
                      <span className="track-laps">{t.laps}L</span>
                      {isSelected && <span className="track-check">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="track-list-group historic">
              <h3 className="track-group-label">📜 Historic Circuits ({HISTORIC_TRACKS.length})</h3>
              <div className="track-list">
                {HISTORIC_TRACKS.map(t => {
                  const isSelected = track.id === t.id;
                  return (
                    <button
                      key={t.id}
                      className={`track-list-item historic ${isSelected ? 'selected' : ''}`}
                      onClick={() => !isSeasonMode && setTrack(t)}
                      disabled={isSeasonMode}
                    >
                      <span className="track-emojis">{t.funEmoji} {t.emoji}</span>
                      <span className="track-info">
                        <span className="track-name">{t.name}</span>
                        <span className="track-desc">{t.description}</span>
                      </span>
                      <span className="track-laps">{t.laps}L</span>
                      {isSelected && <span className="track-check">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Track Detail - shows below grid when on track tab */}
        {activeTab === 'track' && (
          <div className="inline-detail-panel track-detail">
            <div className="detail-team-header">
              <span className="detail-emoji">{track.funEmoji}</span>
              <div className="detail-team-info">
                <h3>{track.name} {track.emoji}</h3>
                <p className="detail-desc">{track.description}</p>
              </div>
            </div>
            <div className="track-stats-row">
              <span className="track-stat-pill">{track.layout.name}</span>
              <span className="track-stat-pill">{track.laps} laps</span>
              <span className="track-stat-pill">{track.length} units</span>
            </div>
            {track.event && (
              <div className="track-event-box">
                <span className="event-title">{track.event.emoji} {track.event.name}</span>
                <span className="event-desc">{getDynamicEventDescription(track.event, track.laps)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky Footer */}
      <div className="setup-footer-sticky">
        <button className="confirm-bets-btn has-bets" onClick={handleStartRace}>
          Start Race →
        </button>
      </div>
    </div>
  );
}

export default LeagueSetup;
