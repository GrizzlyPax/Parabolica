import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import RaceEngine, { Driver, RaceConfig, RaceState, TrackInfo, RaceEvent, RosterDriver } from './RaceEngine';
import RunSetup from './RunSetup';
import Glossary from './Glossary';
import IdeaBox from './IdeaBox';
import { Ruleset, describeRuleset } from './rules/ruleset';
import { RULE_CARDS_BY_ID } from './data/ruleCards';
import { weatherForRace } from './data/weather';
import { intrinsicTrackTags } from './data/trackTags';
import MainMenu, { type SeasonCardSummary } from './MainMenu';
import Credits from './Credits';
import RaceStartCountdown from './RaceStartCountdown';
import WatchMode from './WatchMode';
import RaceControl from './racecontrol/RaceControl';
import SeasonScreen, { seasonScreenFor } from './season/ui/SeasonScreen';
import { loadSeason, seasonState } from './season/season';
import { seasonName } from './season/setup';
import FoundingScreen, { FoundingChoices } from './league/ui/FoundingScreen';
import LeagueScreen from './league/ui/LeagueScreen';
import GridScreen from './league/ui/GridScreen';
import { createLeague } from './league/league';
import { openLeague, codeFromLocation, RemoteError } from './league/remote';
import type { FantasyConfig } from './fantasy/types';
import { leagueNameForSeed } from './generators/leagueName';
import { LeagueState, LiveRace } from './league/types';
import { LIVE_TICK_MS, nextRaceAt, prepareScheduledRace } from './league/settle';
import { CANON_VARIABLES } from './simlab/types';
import { saveLeagueState, loadLeagueState, clearLeagueState } from './storage/persistence';
import { mulberry32, deriveSeed } from './engine/rng';
import { generateTrack, getRandomTracks, getTrackById, getDynamicEventDescription, Track } from './generators/tracks';
import { useRoute, type Route } from './router';
import './App.css';

type AppScreen = 'main-menu' | 'season' | 'setup' | 'race' | 'compendium' | 'founding' | 'league' | 'broadcast' | 'grid' | 'glossary' | 'credits';
type RaceSpeed = 0.5 | 1 | 2 | 10;

// Each screen has an address (#186, src/router.ts); the URL is the source of
// truth for which screen shows, so refresh and the back button work.
const SCREEN_OF: Record<Route['name'], AppScreen> = {
  'menu': 'main-menu', 'quick-race': 'setup', 'race': 'race', 'world-deck': 'glossary', 'race-control': 'compendium',
  'credits': 'credits', 'season': 'season', 'league': 'league', 'league-found': 'founding', 'league-grid': 'grid', 'league-watch': 'broadcast',
};
const ROUTE_OF: Record<AppScreen, Route> = {
  'main-menu': { name: 'menu' }, 'season': { name: 'season', screen: 'setup' }, 'setup': { name: 'quick-race' }, 'race': { name: 'race' }, 'glossary': { name: 'world-deck' },
  'compendium': { name: 'race-control' }, 'credits': { name: 'credits' }, 'league': { name: 'league' }, 'founding': { name: 'league-found' },
  'grid': { name: 'league-grid' }, 'broadcast': { name: 'league-watch' },
};

function App() {
  const { route, navigate, back } = useRoute();
  const screen = SCREEN_OF[route.name];
  const setScreen = useCallback((s: AppScreen, opts?: { replace?: boolean }) => navigate(ROUTE_OF[s], opts), [navigate]);
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
    const leagueSeed = choices.leagueSeed;
    // The calendar is part of genesis: same seed, same tracks, always.
    const calendarRng = mulberry32(deriveSeed(leagueSeed, 'genesis', 'calendar'));
    const trackIds = getRandomTracks(choices.raceCount, calendarRng).map(t => t.id);
    const newLeague = createLeague(leagueSeed, {
      // Unnamed leagues are christened by their seed — "The Molten Circuit" (#185).
      name: choices.name || leagueNameForSeed(leagueSeed),
      godId: choices.godId,
      teamIds: choices.teamIds,
      customTeams: choices.customTeams,
      trackIds,
      raceIntervalMs: choices.raceIntervalMs,
      createdAt: Date.now(),
      ruleset: choices.ruleset,
      fantasy: choices.fantasy,
    });
    saveLeagueState(newLeague);
    setLeague(newLeague);
    setScreen('league');
  };

  // Open a published league (by code from the menu, or from a #league=CODE link).
  // The local slot holds one league; a published one replaces whatever is there,
  // after a confirm if that was a league of this device's own that isn't published.
  const openByCode = useCallback(async (code: string): Promise<string | null> => {
    try {
      const current = loadLeagueState();
      if (current && current.remote?.code === code) { setLeague(current); setScreen('league'); return null; }
      if (current && !current.remote && !window.confirm(`Open ${code}? Your unpublished league "${current.setup.name}" on this device will be replaced.`)) return null;
      const opened = await openLeague(code);
      // If this device published it, keep the commissioner key.
      const key = current?.remote?.code === code ? current.remote.commissionerKey : undefined;
      const withKey = key ? { ...opened, remote: { ...opened.remote!, commissionerKey: key } } : opened;
      saveLeagueState(withKey);
      setLeague(withKey);
      setScreen('league');
      return null;
    } catch (e) {
      return e instanceof RemoteError ? (e.status === 404 ? `No league with code ${code}.` : e.message) : 'Could not open that league.';
    }
  }, []);

  // A league link: playparabolica.com/#league=CODE
  useEffect(() => {
    const code = codeFromLocation();
    if (!code) return;
    history.replaceState(null, '', location.pathname + location.search);
    openByCode(code).then(err => { if (err) window.alert(err); });
  }, [openByCode]);

  const handleDissolveLeague = () => {
    clearLeagueState();
    setLeague(null);
    setScreen('main-menu', { replace: true });
  };

  // Join a live broadcast mid-race. The race is deterministic from its seed,
  // so we rebuild it, fast-forward to the current wall-clock tick, and play
  // on from there — same race the settle loop would compute headlessly.
  // prepareScheduledRace is the same setup the settle loop uses: anything
  // configured differently here would make the watched race a different race
  // than the one that enters the standings.
  const handleWatchLive = useCallback((liveLeague: LeagueState, live: LiveRace) => {
    const race = liveLeague.schedule[live.index];
    setActiveFantasy(liveLeague.setup.fantasy ?? null);
    const track = getTrackById(race.trackId);
    if (!track) return;

    engine.stop();
    prepareScheduledRace(engine, liveLeague, live.index, track, liveLeague.setup.ruleset?.simVars ?? CANON_VARIABLES);
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
    watchingLive.current = true;
    setScreen('broadcast');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine]);

  const handleLeaveBroadcast = useCallback(() => back({ name: 'league' }), [back]);

  // === Quick Race ===

  // The quick run in progress: one seed + the hand of cards; race N derives
  // its own seed, track and weather from it (so Next Race stays replayable).
  const [quickRun, setQuickRun] = useState<{ seed: number; ruleset: Ruleset; raceIndex: number } | null>(null);
  // Fantasy teams for whatever race is on screen (a quick race's draft, or the league's).
  const [activeFantasy, setActiveFantasy] = useState<FantasyConfig | null>(null);

  const handleStartRace = (_roster: RosterDriver[], ruleset: Ruleset, seed: number, fantasy?: FantasyConfig) => {
    setQuickRun({ seed, ruleset, raceIndex: 0 });
    setActiveFantasy(fantasy ?? null);
    setTrackInfo(engine.getTrackInfo());
    setScreen('race');
    setShowCountdown(true);
  };

  const handleCountdownComplete = useCallback(() => {
    setShowCountdown(false);
    engine.start();
  }, [engine]);

  // In-app back buttons use history (#186): back where you came from, or the
  // parent screen when the page was opened from a link.
  const handleBackToMainMenu = () => back({ name: 'menu' });
  const handleExitRace = () => back({ name: 'quick-race' });

  // Leaving a race by any route (exit button, browser back, a typed URL) stops
  // the shared engine; leaving a broadcast also drops that race's setup.
  const prevScreen = useRef(screen);
  const watchingLive = useRef(false);
  useEffect(() => {
    const was = prevScreen.current;
    prevScreen.current = screen;
    if (was === screen) return;
    if (was === 'race') { engine.stop(); engine.reset(); setShowCountdown(false); }
    if (was === 'broadcast') {
      watchingLive.current = false;
      engine.stop();
      engine.reset();
      engine.clearSeed();
      engine.setSimVars(null); // back to Quick Race defaults
      engine.setWeather(null);  // drop this race's weather off the shared engine
      engine.setTrackTags([]);  // and its track tags
    }
  }, [screen, engine]);

  // Refresh lands on a screen whose state can't be rebuilt (a race in
  // progress, a league that isn't there): fall back to its start page.
  useEffect(() => {
    if (screen === 'race' && !quickRun) setScreen('setup', { replace: true });
    else if (screen === 'broadcast' && !watchingLive.current) setScreen(league ? 'league' : 'main-menu', { replace: true });
    else if ((screen === 'league' || screen === 'grid') && !league) setScreen('main-menu', { replace: true });
  }, [screen, quickRun, league, setScreen]);

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
    setTrackInfo(engine.getTrackInfo());
  }, [engine]);

  // Quick Race "Next Race": same grid, fresh random track, straight to lights.
  const handleNextRace = () => {
    engine.reset();
    if (quickRun) {
      const idx = quickRun.raceIndex + 1;
      const rs = quickRun.ruleset;
      applyTrackToEngine(generateTrack(mulberry32(deriveSeed(quickRun.seed, 'track', idx))));
      engine.setSimVars(rs.simVars);
      engine.setSeed(deriveSeed(quickRun.seed, 'race', idx));
      engine.setWeather(rs.weather.quickRace ? weatherForRace(quickRun.seed, idx, rs.weather.weights) : null);
      engine.setTrackTags(intrinsicTrackTags(engine.getTrackInfo()?.id ?? ''));
      setTrackInfo(engine.getTrackInfo());
      setQuickRun({ ...quickRun, raceIndex: idx });
    } else {
      applyTrackToEngine(generateTrack());
    }
    setShowCountdown(true);
  };

  // Lightweight league summary for the main menu card
  const leagueSummary = useMemo(() => {
    if (!league) return null;
    const total = league.schedule.length;
    const settled = league.settledThrough + 1;
    return {
      remoteCode: league.remote?.code,
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

  // Season Mode: the menu's main Play button picks up the saved season.
  const savedSeason = useMemo(() => (screen === 'main-menu' ? loadSeason() : null), [screen]);
  const seasonSummary = useMemo<SeasonCardSummary | null>(() => {
    if (!savedSeason) return null;
    const state = seasonState(savedSeason);
    return { name: seasonName(savedSeason.setup), round: state.round, total: savedSeason.setup.calendar.length, finished: state.phase === 'finished' };
  }, [savedSeason]);
  const handleSeason = () => navigate({ name: 'season', screen: savedSeason && seasonState(savedSeason).phase !== 'finished' ? seasonScreenFor(savedSeason) : 'setup' });

  const ideaContext = { screen, seed: quickRun?.seed ?? engine.getSeed(), track: trackInfo?.name };
  const screenEl = (() => {
  // Show main menu
  if (screen === 'main-menu') {
    return (
      <MainMenu
        onSingleRace={handleSingleRace}
        onCommissioner={handleCommissioner}
        onSeason={handleSeason}
        season={seasonSummary}
        onOpenCode={openByCode}
        onCompendium={handleCompendium}
        onGlossary={() => setScreen('glossary')}
        onCredits={() => setScreen('credits')}
        league={leagueSummary}
      />
    );
  }

  if (screen === 'season' && route.name === 'season') {
    return <SeasonScreen screen={route.screen} navigate={navigate} onMenu={handleBackToMainMenu} />;
  }

  // Show compendium
  if (screen === 'credits') {
    return <Credits onBack={handleBackToMainMenu} />;
  }

  if (screen === 'glossary') {
    return <Glossary onBack={handleBackToMainMenu} tab={route.name === 'world-deck' ? route.tab : undefined} onTabChange={tab => navigate({ name: 'world-deck', tab }, { replace: true })} />;
  }

  if (screen === 'compendium') {
    return <RaceControl onBack={handleBackToMainMenu} tab={route.name === 'race-control' ? route.tab : undefined} onTabChange={tab => navigate({ name: 'race-control', tab }, { replace: true })} />;
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
        onOpenGrid={() => setScreen('grid')}
        onDissolve={handleDissolveLeague}
      />
    );
  }

  // The Grid: the league's roster as its own screen — driver-detail hub.
  if (screen === 'grid' && league) {
    return <GridScreen league={league} onExit={() => back({ name: 'league' })} />;
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
          fantasy={activeFantasy ?? undefined}
          onExit={handleLeaveBroadcast}
          spectator
          isRunning={isRunning}
        />
      </div>
    );
  }

  // Show setup screen
  if (screen === 'setup') {
    return <RunSetup onStartRace={handleStartRace} onBack={handleBackToMainMenu} />;
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
        fantasy={activeFantasy ?? undefined}
        onExit={handleExitRace}
        rulesLines={quickRun ? (quickRun.ruleset.cards.length ? quickRun.ruleset.cards.map(id => `${RULE_CARDS_BY_ID.get(id)?.emoji ?? ''} ${RULE_CARDS_BY_ID.get(id)?.name ?? id}`.trim()).concat(describeRuleset(quickRun.ruleset)) : ['default']) : undefined}
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
  })();

  return <>{screenEl}<IdeaBox context={ideaContext} /></>;
}

export default App;
