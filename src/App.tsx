import { useEffect, useState, useCallback, useMemo } from 'react';
import RaceEngine, { Driver, RaceConfig, RaceState, TrackInfo, RaceEvent, RosterDriver } from './RaceEngine';
import LeagueSetup from './LeagueSetup';
import MainMenu from './MainMenu';
import RaceStartCountdown from './RaceStartCountdown';
import WatchMode from './WatchMode';
import Compendium from './Compendium';
import FoundingScreen, { FoundingChoices } from './league/ui/FoundingScreen';
import LeagueScreen from './league/ui/LeagueScreen';
import { createLeague } from './league/league';
import { LeagueState, LiveRace } from './league/types';
import { LIVE_TICK_MS, nextRaceAt, prepareScheduledRace } from './league/settle';
import { CANON_VARIABLES } from './simlab/types';
import { saveLeagueState, loadLeagueState, clearLeagueState } from './storage/persistence';
import { mulberry32, deriveSeed, randomSeed } from './engine/rng';
import { generateTrack, getRandomTracks, getTrackById, getDynamicEventDescription, Track } from './generators/tracks';
import { TEAMS } from './data/teams';
import './App.css';

type AppScreen = 'main-menu' | 'setup' | 'race' | 'compendium' | 'founding' | 'league' | 'broadcast';
type RaceSpeed = 0.5 | 1 | 2 | 10;

function App() {
  const [screen, setScreen] = useState<AppScreen>('main-menu');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [config, setConfig] = useState<RaceConfig | null>(null);
  const [raceState, setRaceState] = useState<RaceState | null>(null);
  const [trackInfo, setTrackInfo] = useState<TrackInfo | null>(null);

  // Race speed control
  const [raceSpeed, setRaceSpeed] = useState<RaceSpeed>(1);

  // Race start countdown
  const [showCountdown, setShowCountdown] = useState(false);

  // Race events for track event notifications
  const [raceEvents, setRaceEvents] = useState<RaceEvent[]>([]);

  // Commissioner Mode: the league lives in localStorage; this mirrors it.
  const [league, setLeague] = useState<LeagueState | null>(() => loadLeagueState());

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

  // Re-read the saved league whenever we land on the menu, so the card
  // reflects races that ran while another screen was open.
  useEffect(() => {
    if (screen === 'main-menu') setLeague(loadLeagueState());
  }, [screen]);

  const handleSingleRace = () => {
    setScreen('setup');
  };

  const handleCompendium = () => {
    setScreen('compendium');
  };

  // === Commissioner Mode ===

  const handleCommissioner = () => {
    setScreen(league ? 'league' : 'founding');
  };

  const handleFoundLeague = (choices: FoundingChoices) => {
    const leagueSeed = randomSeed();
    // The calendar is part of genesis: same seed, same tracks, always.
    const calendarRng = mulberry32(deriveSeed(leagueSeed, 'genesis', 'calendar'));
    const trackIds = getRandomTracks(choices.raceCount, calendarRng).map(t => t.id);
    const newLeague = createLeague(leagueSeed, {
      name: choices.name,
      godId: choices.godId,
      teamIds: TEAMS.map(t => t.id),
      trackIds,
      raceIntervalMs: choices.raceIntervalMs,
      createdAt: Date.now(),
    });
    saveLeagueState(newLeague);
    setLeague(newLeague);
    setScreen('league');
  };

  const handleDissolveLeague = () => {
    clearLeagueState();
    setLeague(null);
    setScreen('main-menu');
  };

  // Join a live broadcast mid-race. The race is deterministic from its seed,
  // so we rebuild it, fast-forward to the current wall-clock tick, and play
  // on from there — same race the settle loop would compute headlessly.
  // prepareScheduledRace is the same setup the settle loop uses: anything
  // configured differently here would make the watched race a different race
  // than the one that enters the standings.
  const handleWatchLive = useCallback((liveLeague: LeagueState, live: LiveRace) => {
    const race = liveLeague.schedule[live.index];
    const track = getTrackById(race.trackId);
    if (!track) return;

    engine.stop();
    prepareScheduledRace(engine, liveLeague, live.index, track, CANON_VARIABLES);
    // Sync the UI's track state (layout, pit lane) — WatchMode renders from
    // this React state, not from the engine, and falls back to a default
    // oval without it.
    setTrackInfo(engine.getTrackInfo());
    // Real-time pacing only — no effect on the simulated outcome
    engine.updateConfig({ tickInterval: LIVE_TICK_MS });
    setRaceSpeed(1);
    engine.reset();
    engine.fastForward(Math.floor((Date.now() - live.startedAt) / LIVE_TICK_MS));
    engine.start();

    setShowCountdown(false);
    setScreen('broadcast');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine]);

  const handleLeaveBroadcast = useCallback(() => {
    engine.stop();
    engine.reset();
    engine.clearSeed();
    engine.setSimVars(null); // back to Quick Race defaults
    engine.setWeather(null);  // drop this race's weather off the shared engine
    setScreen('league');
  }, [engine]);

  // === Quick Race ===

  const handleStartRace = (_rosterWithCars: RosterDriver[]) => {
    setTrackInfo(engine.getTrackInfo());
    setScreen('race');
    setShowCountdown(true);
  };

  const handleCountdownComplete = useCallback(() => {
    setShowCountdown(false);
    engine.start();
  }, [engine]);

  const handleBackToMainMenu = () => {
    engine.stop();
    engine.reset();
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

  // Point the engine at a track (info + config) and sync local track state.
  const applyTrackToEngine = useCallback((track: Track) => {
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
    engine.updateConfig({
      lapLength: track.length,
      totalLaps: track.laps,
    });
    engine.setWeather(null); // Quick Race has no weather (league-only for now)
    setTrackInfo(engine.getTrackInfo());
  }, [engine]);

  // Quick Race "Next Race": same grid, fresh random track, straight to lights.
  const handleNextRace = () => {
    engine.reset();
    applyTrackToEngine(generateTrack());
    setShowCountdown(true);
  };

  // Lightweight league summary for the main menu card
  const leagueSummary = useMemo(() => {
    if (!league) return null;
    const total = league.schedule.length;
    const settled = league.settledThrough + 1;
    return {
      name: league.setup.name,
      settled,
      total,
      dueCount: league.schedule.filter(
        r => r.index > league.settledThrough && r.scheduledAt <= Date.now()
      ).length,
      // Queue-aware: anchored to the last broadcast's end, not the founding
      // nominal (back-to-back races push successors later).
      nextAt: nextRaceAt(league),
    };
  }, [league]);

  // Show main menu
  if (screen === 'main-menu') {
    return (
      <MainMenu
        onSingleRace={handleSingleRace}
        onCommissioner={handleCommissioner}
        onCompendium={handleCompendium}
        league={leagueSummary}
      />
    );
  }

  // Show compendium
  if (screen === 'compendium') {
    return <Compendium onBack={handleBackToMainMenu} />;
  }

  // Commissioner Mode: founding
  if (screen === 'founding') {
    return (
      <FoundingScreen
        onFound={handleFoundLeague}
        onBack={handleBackToMainMenu}
      />
    );
  }

  // Commissioner Mode: league home
  if (screen === 'league' && league) {
    return (
      <LeagueScreen
        league={league}
        onLeagueUpdate={setLeague}
        onWatchLive={live => handleWatchLive(league, live)}
        onExit={handleBackToMainMenu}
        onDissolve={handleDissolveLeague}
      />
    );
  }

  // Commissioner Mode: live broadcast (spectator — no controls, no countdown)
  if (screen === 'broadcast') {
    if (!config || !raceState) return null;
    return (
      <div className="watch-container">
        <WatchMode
          drivers={drivers}
          config={config}
          raceState={raceState}
          trackInfo={trackInfo}
          raceEvents={raceEvents}
          onExit={handleLeaveBroadcast}
          spectator
          isRunning={isRunning}
        />
      </div>
    );
  }

  // Show setup screen
  if (screen === 'setup') {
    return <LeagueSetup onStartRace={handleStartRace} />;
  }

  if (!config || !raceState) return null;

  // Watch mode - simple animated view
  return (
    <div className="watch-container">
      {/* Race Start Countdown */}
      {showCountdown && (
        <RaceStartCountdown
          onCountdownComplete={handleCountdownComplete}
          trackName={trackInfo?.name}
          trackEmoji={trackInfo?.funEmoji}
        />
      )}

      <WatchMode
        drivers={drivers}
        config={config}
        raceState={raceState}
        trackInfo={trackInfo}
        onNextRace={handleNextRace}
        raceEvents={raceEvents}
        onExit={handleBackToMainMenu}
        // Race controls - now handled by UniversalHeader inside WatchMode
        isRunning={isRunning}
        raceSpeed={raceSpeed}
        onStart={handleStart}
        onStop={handleStop}
        onReset={handleReset}
        onSpeedChange={setRaceSpeed}
      />
    </div>
  );
}

export default App;
