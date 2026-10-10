import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import RaceEngine, { Driver, RaceConfig, RaceState, TrackInfo, RaceEvent, RosterDriver } from './RaceEngine';
import Glossary from './Glossary';
import IdeaBox from './IdeaBox';
import { Ruleset, describeRuleset } from './rules/ruleset';
import { RULE_CARDS_BY_ID } from './data/ruleCards';
import { weatherForRace } from './data/weather';
import MainMenu, { type SeasonCardSummary } from './MainMenu';
import Credits from './Credits';
import RaceStartCountdown from './RaceStartCountdown';
import WatchMode from './WatchMode';
import RaceControl from './racecontrol/RaceControl';
import SeasonScreen, { seasonScreenFor } from './season/ui/SeasonScreen';
import { leagueForRound, seasonAvatars, seasonState, settleRound } from './season/season';
import { loadCurrentLeague as loadSeason, saveCurrentLeague as saveSeason } from './run/current';
import { teamsOf } from './season/ui/teams';
import { teamThemeVars, type TeamLike } from './icons/GameIcon';
import { seasonName } from './season/setup';
import { applyFavours } from './cards/apply';
import type { FantasyConfig } from './fantasy/types';
import { prepareScheduledRace } from './league/settle';
import { CANON_VARIABLES } from './simlab/types';
import { mulberry32, deriveSeed, randomSeed } from './engine/rng';
import { quickRace, type QuickRace } from './season/quickRace';
import { generateTrack, getTrackById, Track } from './generators/tracks';
import { useRoute, type Route } from './router';
import './App.css';

type AppScreen = 'main-menu' | 'season' | 'quick' | 'race' | 'compendium' | 'glossary' | 'credits';
type RaceSpeed = 0.5 | 1 | 2 | 10;

// Each screen has an address (#186, src/router.ts); the URL is the source of
// truth for which screen shows, so refresh and the back button work.
const SCREEN_OF: Record<Route['name'], AppScreen> = {
  'menu': 'main-menu', 'quick-race': 'quick', 'race': 'race', 'world-deck': 'glossary', 'race-control': 'compendium',
  'credits': 'credits', 'season': 'season',
};
const ROUTE_OF: Record<AppScreen, Route> = {
  'main-menu': { name: 'menu' }, 'season': { name: 'season', screen: 'setup' }, 'quick': { name: 'quick-race' }, 'race': { name: 'race' }, 'glossary': { name: 'world-deck' },
  'compendium': { name: 'race-control' }, 'credits': { name: 'credits' },
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

  // Commissioner leagues were removed in #339 (Season Mode replaces them). An
  // old saved league stays in localStorage untouched; nothing reads it.

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
    setScreen('quick');
  };

  const handleCompendium = () => {
    setScreen('compendium');
  };

  // === Quick Race (#605, #606, #607) ===
  // One tap: a one-race Season league (random field, track and weather from a
  // fresh seed) on the Season pipeline. Qualifying plays, then the lights. You
  // can pick a team to follow while qualifying runs. Nothing is saved.
  const [quick, setQuick] = useState<{ q: QuickRace; follow: string | null; quali: boolean; avatars: ReturnType<typeof seasonAvatars> } | null>(null);
  const startQuickRace = useCallback(() => {
    const q = quickRace(randomSeed());
    engine.stop();
    prepareScheduledRace(engine, q.league, 0, q.track, CANON_VARIABLES);
    setTrackInfo(engine.getTrackInfo());
    setRaceSpeed(1);
    engine.updateConfig({ tickInterval: 100 });
    engine.reset();
    setShowCountdown(false);
    setQuickRun(null);
    setQuick({ q, follow: null, quali: true, avatars: seasonAvatars(q.facts) });
  }, [engine]);
  const quickTeams = useMemo(() => (quick ? teamsOf(quick.q.facts) : {}), [quick?.q]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (screen !== 'quick') return;
    startQuickRace();
    setScreen('race', { replace: true });
  }, [screen, startQuickRace, setScreen]);
  const endQuickRaceQuali = useCallback(() => { setQuick(x => (x ? { ...x, quali: false } : x)); setShowCountdown(true); }, []);

  // === Lab race (Race Control → Run setup) ===

  // The lab run in progress: one seed + the hand of cards; race N derives
  // its own seed, track and weather from it (so Next Race stays replayable).
  const [quickRun, setQuickRun] = useState<{ seed: number; ruleset: Ruleset; raceIndex: number; roster: RosterDriver[] } | null>(null);
  // Fantasy teams for the quick race on screen.
  const [activeFantasy, setActiveFantasy] = useState<FantasyConfig | null>(null);

  // Qualifying plays out before the countdown (#495).
  const [quickQuali, setQuickQuali] = useState(false);
  const handleStartRace = (roster: RosterDriver[], ruleset: Ruleset, seed: number, fantasy?: FantasyConfig) => {
    setQuick(null);
    setQuickRun({ seed, ruleset, raceIndex: 0, roster });
    setActiveFantasy(fantasy ?? null);
    setTrackInfo(engine.getTrackInfo());
    setScreen('race');
    setShowCountdown(false);
    setQuickQuali(true);
  };
  const endQuickQuali = useCallback(() => { setQuickQuali(false); setShowCountdown(true); }, []);

  const handleCountdownComplete = useCallback(() => {
    setShowCountdown(false);
    engine.start();
  }, [engine]);

  // In-app back buttons use history (#186): back where you came from, or the
  // parent screen when the page was opened from a link.
  const handleBackToMainMenu = () => back({ name: 'menu' });
  const handleExitRace = () => (quick ? back({ name: 'menu' }) : back({ name: 'race-control', tab: 'run' }));

  // Leaving a race by any route (exit button, browser back, a typed URL) stops
  // the shared engine.
  const prevScreen = useRef(screen);
  useEffect(() => {
    const was = prevScreen.current;
    prevScreen.current = screen;
    if (was === screen) return;
    if (was === 'race') {
      engine.stop(); engine.reset(); setShowCountdown(false);
      if (quick) { engine.clearSeed(); engine.setSimVars(null); engine.setWeather(null); setQuick(null); }
    }
  }, [screen, engine]);

  // === Season Mode race (#322) ===
  // Go opens the live broadcast of the round; Skip to result fast-forwards
  // the same race to its finish. The round is recorded by settleRound (the
  // headless run of the same seeded race), so watching changes nothing.
  const onSeasonRace = route.name === 'season' && route.screen === 'race';
  const [seasonRace, setSeasonRace] = useState<{ round: number; sealed: Set<number>; mine: number[]; you: TeamLike; avatars: ReturnType<typeof seasonAvatars>; quali: boolean } | null>(null);
  const settlingSeason = useRef(false);
  useEffect(() => {
    if (!onSeasonRace) {
      if (seasonRace) {
        engine.stop(); engine.reset(); engine.clearSeed(); engine.setSimVars(null); engine.setWeather(null);
        setSeasonRace(null);
      }
      return;
    }
    if (seasonRace) return;
    const facts = loadSeason();
    const state = facts ? seasonState(facts) : null;
    if (!facts || !state || state.phase !== 'ready-for-go') {
      navigate({ name: 'season', screen: facts ? seasonScreenFor(facts) : 'setup' }, { replace: true });
      return;
    }
    const track = getTrackById(facts.setup.calendar[state.round]);
    if (!track) return;
    const leagueNow = leagueForRound(facts, state.round);
    engine.stop();
    prepareScheduledRace(engine, leagueNow, state.round, track, facts.setup.ruleset?.simVars ?? CANON_VARIABLES);
    setTrackInfo(engine.getTrackInfo());
    setRaceSpeed(1);
    engine.updateConfig({ tickInterval: 100 });
    engine.reset();
    // Qualifying plays out first (#495); the race starts when it ends.
    settlingSeason.current = false;
    const humans = new Set(facts.setup.humans.map(h => h.teamId));
    setSeasonRace({
      round: state.round,
      sealed: new Set(leagueNow.roster.filter(d => !humans.has(d.kingdomId ?? '')).map(d => d.id)),
      mine: leagueNow.roster.filter(d => humans.has(d.kingdomId ?? '')).map(d => d.id),
      you: teamsOf(facts)[facts.setup.humans[0].teamId],
      avatars: seasonAvatars(facts),
      quali: true,
    });
  }, [onSeasonRace]); // eslint-disable-line react-hooks/exhaustive-deps

  const endSeasonQuali = useCallback(() => {
    setSeasonRace(r => (r ? { ...r, quali: false } : r));
    engine.start();
  }, [engine]);

  /** Finished: record the round, then the Paddock (or the final standings). Left mid-race: back to the Paddock, round not run. */
  const leaveSeasonRace = (finished: boolean) => {
    if (settlingSeason.current) return;
    settlingSeason.current = true;
    engine.stop();
    const facts = loadSeason();
    const state = facts ? seasonState(facts) : null;
    if (finished && facts && state?.phase === 'ready-for-go' && state.round === seasonRace?.round) {
      const next = settleRound(facts);
      saveSeason(next);
      navigate({ name: 'season', screen: seasonState(next).phase === 'finished' ? 'standings' : 'paddock' }, { replace: true });
    } else {
      navigate({ name: 'season', screen: 'paddock' }, { replace: true });
    }
  };

  // Refresh lands on a screen whose state can't be rebuilt (a race in
  // progress): fall back to its start page.
  useEffect(() => {
    if (screen === 'race' && !quickRun && !quick) setScreen('main-menu', { replace: true });
  }, [screen, quickRun, quick, setScreen]);

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
      favours: track.favours,
    });
    engine.updateConfig({
      lapLength: track.length,
      totalLaps: track.laps,
      tyreWear: track.tyreWear,
    });
    setTrackInfo(engine.getTrackInfo());
  }, [engine]);

  // Quick Race "Next Race": same grid, fresh random track, straight to lights.
  const handleNextRace = () => {
    engine.reset();
    if (quickRun) {
      const idx = quickRun.raceIndex + 1;
      const rs = quickRun.ruleset;
      const track = generateTrack(mulberry32(deriveSeed(quickRun.seed, 'track', idx)));
      applyTrackToEngine(track);
      engine.setSimVars(rs.simVars);
      engine.setSeed(deriveSeed(quickRun.seed, 'race', idx));
      const weather = rs.weather.quickRace ? weatherForRace(quickRun.seed, idx, rs.weather.weights) : null;
      engine.setWeather(weather);
      // Track + weather favours are baked into the grid at race build, so the
      // next race reloads the base roster with its own favours.
      engine.loadGeneratedRoster(applyFavours(quickRun.roster, [...track.favours, ...(weather?.favours ?? [])]));
      setTrackInfo(engine.getTrackInfo());
      setQuickRun({ ...quickRun, raceIndex: idx });
    } else {
      applyTrackToEngine(generateTrack());
    }
    setShowCountdown(false);
    setQuickQuali(true);
  };

  // Season Mode: the menu's main Play button picks up the saved season.
  const savedSeason = useMemo(() => (screen === 'main-menu' ? loadSeason() : null), [screen]);
  const seasonSummary = useMemo<SeasonCardSummary | null>(() => {
    if (!savedSeason) return null;
    const state = seasonState(savedSeason);
    return { name: seasonName(savedSeason.setup), round: state.round, total: savedSeason.setup.calendar.length, finished: state.phase === 'finished' };
  }, [savedSeason]);
  // A saved run opens on its ladder (#628); none starts a new one.
  const handleSeason = () => navigate({ name: 'season', screen: savedSeason ? 'run' : 'setup' });

  const ideaContext = { screen, seed: quickRun?.seed ?? engine.getSeed(), track: trackInfo?.name };
  const screenEl = (() => {
  // Show main menu
  if (screen === 'main-menu') {
    return (
      <MainMenu
        onSingleRace={handleSingleRace}
        onSeason={handleSeason}
        season={seasonSummary}
        onCompendium={handleCompendium}
        onGlossary={() => setScreen('glossary')}
        onCredits={() => setScreen('credits')}
      />
    );
  }

  if (onSeasonRace) {
    if (!seasonRace || !config || !raceState) return null;
    return (
      <div className="watch-container season-race" style={teamThemeVars(seasonRace.you)}>
        <WatchMode
          drivers={drivers}
          config={config}
          raceState={raceState}
          trackInfo={trackInfo}
          raceEvents={raceEvents}
          sealedDriverIds={seasonRace.sealed}
          myDriverIds={seasonRace.mine}
          avatars={seasonRace.avatars}
          onQualifyingDone={seasonRace.quali ? endSeasonQuali : undefined}
          onExit={() => leaveSeasonRace(raceState.raceFinished)}
          exitLabel="Paddock"
          isRunning={isRunning}
          raceSpeed={raceSpeed}
          onStart={() => engine.start()}
          onStop={handleStop}
          onSpeedChange={setRaceSpeed}
        />
        {!raceState.raceFinished && !seasonRace.quali && (
          <button type="button" className="season-skip" onClick={() => engine.fastForward(Infinity)}>Skip to result</button>
        )}
      </div>
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
    return <RaceControl onBack={handleBackToMainMenu} onStartRace={handleStartRace} tab={route.name === 'race-control' ? route.tab : undefined} onTabChange={tab => navigate({ name: 'race-control', tab }, { replace: true })} />;
  }

  if (!config || !raceState) return null;

  if (quick) {
    const follow = quick.follow ? quickTeams[quick.follow] : undefined;
    const mine = quick.follow ? quick.q.league.roster.filter(d => d.kingdomId === quick.follow).map(d => d.id) : undefined;
    return (
      <div className="watch-container quick-race" style={follow ? teamThemeVars(follow) : undefined}>
        {showCountdown && <RaceStartCountdown onCountdownComplete={handleCountdownComplete} trackName={trackInfo?.name} trackEmoji={trackInfo?.funEmoji} />}
        <WatchMode
          drivers={drivers}
          config={config}
          raceState={raceState}
          trackInfo={trackInfo}
          raceEvents={raceEvents}
          myDriverIds={mine}
          avatars={quick.avatars}
          onQualifyingDone={quick.quali ? endQuickRaceQuali : undefined}
          follow={quick.quali ? { teams: Object.values(quickTeams), selected: quick.follow, onPick: id => setQuick(x => (x ? { ...x, follow: x.follow === id ? null : id } : x)) } : undefined}
          onNextRace={startQuickRace}
          onExit={handleExitRace}
          exitLabel="Menu"
          isRunning={isRunning}
          raceSpeed={raceSpeed}
          onStart={handleStart}
          onStop={handleStop}
          onSpeedChange={setRaceSpeed}
        />
      </div>
    );
  }

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
        onQualifyingDone={quickQuali ? endQuickQuali : undefined}
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
