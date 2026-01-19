import { useEffect, useState, useCallback } from 'react';
import RaceEngine, { Driver, RaceConfig, RaceState, TrackInfo, RaceEvent } from './RaceEngine';
import LeagueSetup from './LeagueSetup';
import MainMenu from './MainMenu';
import SeasonSetup from './SeasonSetup';
import SeasonStandings from './SeasonStandings';
import SeasonComplete from './SeasonComplete';
import RaceStartCountdown from './RaceStartCountdown';
import WatchMode from './WatchMode';
import { generateTrack, getTracksByIds, getDynamicEventDescription, Track } from './generators/tracks';
import { SeasonState, createInitialSeasonState, updateSeasonWithRaceResult } from './types/season';
import './App.css';

type AppScreen = 'main-menu' | 'setup' | 'season-setup' | 'race' | 'season-complete';
type ViewMode = 'watch' | 'season';
type GameMode = 'single' | 'season';
type RaceSpeed = 0.5 | 1 | 2 | 10;

function App() {
  const [screen, setScreen] = useState<AppScreen>('main-menu');
  const [gameMode, setGameMode] = useState<GameMode>('single');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [config, setConfig] = useState<RaceConfig | null>(null);
  const [raceState, setRaceState] = useState<RaceState | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('watch');
  const [trackInfo, setTrackInfo] = useState<TrackInfo | null>(null);

  // Race speed control
  const [raceSpeed, setRaceSpeed] = useState<RaceSpeed>(1);

  // Race start countdown
  const [showCountdown, setShowCountdown] = useState(false);

  // Season state
  const [seasonState, setSeasonState] = useState<SeasonState | null>(null);
  // Selected kingdoms and tracks for season mode
  const [seasonKingdomIds, setSeasonKingdomIds] = useState<string[]>([]);
  const [seasonTracks, setSeasonTracks] = useState<Track[]>([]);
  const [currentSeasonTrackIndex, setCurrentSeasonTrackIndex] = useState(0);

  // Selected favorite/rival kingdoms for highlighting
  const [favoriteKingdomId, setFavoriteKingdomId] = useState<string | null>(null);
  const [rivalKingdomId, setRivalKingdomId] = useState<string | null>(null);

  // Race events for track event notifications
  const [raceEvents, setRaceEvents] = useState<RaceEvent[]>([]);

  const engine = RaceEngine.getInstance();

  useEffect(() => {
    const unsub1 = engine.subscribe((updatedDrivers) => {
      setDrivers(updatedDrivers);
      setIsRunning(engine.isRaceRunning());
    });
    const unsub2 = engine.subscribeToConfig(setConfig);
    const unsub3 = engine.subscribeToState(setRaceState);
    const unsub4 = engine.subscribeToEvents(setRaceEvents);

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
    };
  }, [engine]);

  // Update tick interval when race speed changes
  useEffect(() => {
    // Only update if we have a config (race is set up)
    if (engine.getConfig()) {
      const baseInterval = 100; // Normal speed is 100ms per tick
      const newInterval = baseInterval / raceSpeed;
      engine.updateConfig({ tickInterval: newInterval });
    }
  }, [raceSpeed, engine]); // Don't include config - it causes infinite loop

  const handleSingleRace = () => {
    setGameMode('single');
    setSeasonState(null);
    setScreen('setup');
  };

  const handleSeasonMode = () => {
    setGameMode('season');
    setScreen('season-setup');
  };

  const handleStartSeason = (numRaces: number, selectedKingdomIds: string[], selectedTrackIds: string[]) => {
    // Go to setup to generate drivers first
    setGameMode('season');
    // Store selected kingdoms for driver generation
    setSeasonKingdomIds(selectedKingdomIds);
    // Get and shuffle selected tracks, then take numRaces
    const allSelectedTracks = getTracksByIds(selectedTrackIds);
    const shuffledTracks = [...allSelectedTracks].sort(() => Math.random() - 0.5);
    setSeasonTracks(shuffledTracks.slice(0, numRaces));
    setCurrentSeasonTrackIndex(0);
    // We'll initialize season state after drivers are generated
    setSeasonState({ totalRaces: numRaces } as SeasonState); // Temporary placeholder
    setScreen('setup');
  };

  const handleStartRace = (favoriteKingdom: string | null, rivalKingdom: string | null) => {
    setTrackInfo(engine.getTrackInfo());

    // Initialize season state with driver IDs if this is a season and not yet initialized
    if (gameMode === 'season' && seasonState && !seasonState.driverStats) {
      const driverIds = engine.getDrivers().map(d => d.id);
      setSeasonState(createInitialSeasonState(seasonState.totalRaces, driverIds));
    }

    // Set selections (can be null - they're optional)
    setFavoriteKingdomId(favoriteKingdom);
    setRivalKingdomId(rivalKingdom);
    setScreen('race');
    // Show countdown instead of auto-starting
    setShowCountdown(true);
  };

  const handleCountdownComplete = useCallback(() => {
    setShowCountdown(false);
    engine.start();
  }, [engine]);

  const handleBackToMainMenu = () => {
    engine.stop();
    engine.reset();
    setFavoriteKingdomId(null);
    setRivalKingdomId(null);
    setSeasonState(null);
    setShowCountdown(false);
    setScreen('main-menu');
  };

  const handleStart = () => {
    if (!isRunning && raceState && raceState.totalTicks === 0) {
      // Fresh race - show countdown
      setShowCountdown(true);
    } else {
      // Resuming a paused race
      engine.start();
    }
  };

  const handleStop = () => {
    engine.stop();
    setIsRunning(false);
  };

  const handleReset = () => {
    engine.reset();
    setShowCountdown(false);
  };

  const handleNextRace = () => {
    // Record race results for season mode
    if (gameMode === 'season' && seasonState && raceState) {
      const finishOrder = raceState.finishOrder;
      const dnfDrivers = drivers.filter(d => d.status === 'dnf').map(d => d.id);

      // Find fastest lap driver
      let fastestLapDriverId: number | null = null;
      let fastestTime = Infinity;
      drivers.forEach(d => {
        const best = d.lapTimes.length > 0 ? Math.min(...d.lapTimes) : Infinity;
        if (best < fastestTime) {
          fastestTime = best;
          fastestLapDriverId = d.id;
        }
      });

      const updatedSeason = updateSeasonWithRaceResult(
        seasonState,
        finishOrder,
        dnfDrivers,
        trackInfo?.name || 'Unknown Track',
        trackInfo?.emoji || '🏁',
        fastestLapDriverId
      );

      setSeasonState(updatedSeason);

      // Check if season is complete
      if (updatedSeason.isComplete) {
        setScreen('season-complete');
        return;
      }
    }

    // Get the next track - use pre-selected season track or generate random
    let newTrack: Track;
    if (gameMode === 'season' && seasonTracks.length > 0) {
      // Use the next track from the season calendar
      const nextIndex = currentSeasonTrackIndex + 1;
      setCurrentSeasonTrackIndex(nextIndex);
      newTrack = seasonTracks[nextIndex % seasonTracks.length];
    } else {
      // Generate a random track for single race mode
      newTrack = generateTrack();
    }

    // Reset the race
    engine.reset();

    // Store new track info
    engine.setTrackInfo({
      id: newTrack.id,
      name: newTrack.name,
      emoji: newTrack.emoji,
      description: newTrack.description,
      laps: newTrack.laps,
      layout: {
        trackPath: newTrack.layout.trackPath,
        pitLanePath: newTrack.layout.pitLanePath,
        straightStart: newTrack.layout.straightStart,
        straightEnd: newTrack.layout.straightEnd,
        totalLength: newTrack.layout.totalLength,
      },
      event: {
        id: newTrack.event.id,
        name: newTrack.event.name,
        emoji: newTrack.event.emoji,
        description: getDynamicEventDescription(newTrack.event, newTrack.laps),
        flavorText: newTrack.event.flavorText,
      },
      // Full event data for engine processing
      eventTrigger: newTrack.event.trigger,
      eventEffect: newTrack.event.effect,
    });

    // Apply new track settings
    engine.updateConfig({
      lapLength: newTrack.length,
      totalLaps: newTrack.laps,
    });

    // Update local track info state
    setTrackInfo(engine.getTrackInfo());

    // Go straight to countdown for next race
    setShowCountdown(true);
  };

  const handleNewSeason = () => {
    setSeasonState(null);
    setScreen('season-setup');
  };

  // Show main menu
  if (screen === 'main-menu') {
    return <MainMenu onSingleRace={handleSingleRace} onSeason={handleSeasonMode} />;
  }

  // Show season setup
  if (screen === 'season-setup') {
    return <SeasonSetup onStartSeason={handleStartSeason} onBack={handleBackToMainMenu} />;
  }

  // Show setup screen
  if (screen === 'setup') {
    return (
      <LeagueSetup
        onStartRace={handleStartRace}
        seasonKingdomIds={gameMode === 'season' ? seasonKingdomIds : undefined}
        seasonTrack={gameMode === 'season' && seasonTracks.length > 0 ? seasonTracks[0] : undefined}
      />
    );
  }

  // Show season complete screen
  if (screen === 'season-complete' && seasonState) {
    return (
      <SeasonComplete
        season={seasonState}
        drivers={drivers}
        onNewSeason={handleNewSeason}
        onMainMenu={handleBackToMainMenu}
      />
    );
  }

  if (!config || !raceState) return null;

  const isWatchMode = viewMode === 'watch';
  const isSeasonView = viewMode === 'season';

  // Speed control component
  const speedControl = (
    <div className="speed-control">
      <button
        className={`speed-btn ${raceSpeed === 0.5 ? 'active' : ''}`}
        onClick={() => setRaceSpeed(0.5)}
        title="Half speed"
      >
        0.5x
      </button>
      <button
        className={`speed-btn ${raceSpeed === 1 ? 'active' : ''}`}
        onClick={() => setRaceSpeed(1)}
        title="Normal speed"
      >
        1x
      </button>
      <button
        className={`speed-btn ${raceSpeed === 2 ? 'active' : ''}`}
        onClick={() => setRaceSpeed(2)}
        title="Double speed"
      >
        2x
      </button>
      <button
        className={`speed-btn ${raceSpeed === 10 ? 'active' : ''}`}
        onClick={() => setRaceSpeed(10)}
        title="Fast forward"
      >
        10x
      </button>
    </div>
  );

  // Shared view toggle component (only show in season mode)
  const viewToggle = gameMode === 'season' && seasonState ? (
    <div className="view-toggle">
      <button
        className={`view-btn ${isWatchMode ? 'active' : ''}`}
        onClick={() => setViewMode('watch')}
      >
        Race
      </button>
      <button
        className={`view-btn ${isSeasonView ? 'active' : ''}`}
        onClick={() => setViewMode('season')}
      >
        Standings
      </button>
    </div>
  ) : null;

  // Season view
  if (isSeasonView && seasonState) {
    return (
      <div className="season-view-container">
        <div className="watch-controls">
          <button className="back-btn" onClick={handleBackToMainMenu}>← Menu</button>
          {viewToggle}
          <div className="race-controls">
            <button onClick={handleStart} disabled={isRunning || raceState.raceFinished} className="control-btn start">
              Start
            </button>
            <button onClick={handleStop} disabled={!isRunning} className="control-btn stop">
              Stop
            </button>
            <button onClick={handleReset} className="control-btn reset">
              Reset
            </button>
            {speedControl}
          </div>
        </div>
        <div className="season-view-content">
          <SeasonStandings season={seasonState} drivers={drivers} />
        </div>
      </div>
    );
  }

  // Watch mode - simple animated view
  if (isWatchMode) {
    return (
      <div className="watch-container">
        {/* Race Start Countdown */}
        {showCountdown && (
          <RaceStartCountdown
            onCountdownComplete={handleCountdownComplete}
            trackName={trackInfo?.name}
            trackEmoji={trackInfo?.emoji}
          />
        )}

        <div className="watch-controls">
          <button className="back-btn" onClick={handleBackToMainMenu}>← Menu</button>
          {viewToggle}
          <div className="race-controls">
            <button onClick={handleStart} disabled={isRunning || raceState.raceFinished} className="control-btn start">
              Start
            </button>
            <button onClick={handleStop} disabled={!isRunning} className="control-btn stop">
              Stop
            </button>
            <button onClick={handleReset} className="control-btn reset">
              Reset
            </button>
            {speedControl}
          </div>
        </div>
        <WatchMode
          drivers={drivers}
          config={config}
          raceState={raceState}
          trackInfo={trackInfo}
          onNextRace={handleNextRace}
          favoriteKingdomId={favoriteKingdomId}
          rivalKingdomId={rivalKingdomId}
          raceEvents={raceEvents}
        />
      </div>
    );
  }

  // Fallback - shouldn't reach here normally
  return null;
}

export default App;
