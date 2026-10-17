// Season Mode's screens, one per #/season/<screen> address (src/router.ts).
// Each screen reads the one saved run's step in play. The loop (#778):
// Continue lands in the Paddock; the race; the Paddock again; the finale
// when the step is over, which goes straight up into the next Paddock. The
// road (#/season/run) sits beside the loop, from the Paddock's header.
import { useEffect, useState } from 'react';
import type { Route, SeasonScreen as Screen } from '../../router';
import { seasonState, type SeasonFacts } from '../season';
import { loadCurrentLeague as loadSeason, promoteCurrentRun } from '../../run/current';
import StartRun from './StartRun';
import Paddock from './Paddock';
import Standings from './Standings';
import RunLadder from './RunLadder';
import { AceButton, Bunting, StepTheme } from '../../look/Look';
import './Season.css';

interface Props {
  screen: Screen;
  navigate: (route: Route, opts?: { replace?: boolean }) => void;
  onMenu: () => void;
}

/** Where a saved season picks up: the Paddock, or the finale once every race has run. */
export function seasonScreenFor(facts: SeasonFacts): Screen {
  const phase = seasonState(facts).phase;
  return phase === 'draft' ? 'run' : phase === 'finished' ? 'standings' : 'paddock';
}

export default function SeasonScreen({ screen, navigate, onMenu }: Props) {
  if (screen === 'setup') {
    // The run's start (#696): your state and garage, then the first Paddock.
    return <StartRun onBack={onMenu} onStarted={() => navigate({ name: 'season', screen: 'paddock' }, { replace: true })} />;
  }
  if (screen === 'run' || screen === 'draft') {
    // The road. No draft and no rookie pick since #696 (rookies are dealt): the old address goes there too.
    return <RunLadder onMenu={onMenu} onNewRun={() => navigate({ name: 'season', screen: 'setup' })} onPlay={s => navigate({ name: 'season', screen: s })} />;
  }
  // Keyed by screen: each screen reads the saved season fresh on arrival.
  return <SavedSeason key={screen} screen={screen} navigate={navigate} onMenu={onMenu} />;
}

/** Can this screen show the season in this phase? */
function screenFits(screen: Screen, phase: ReturnType<typeof seasonState>['phase']): boolean {
  switch (screen) {
    case 'paddock': return phase === 'paddock' || phase === 'ready-for-go';
    case 'race': return phase === 'ready-for-go';
    case 'standings': return phase === 'finished';
    default: return phase !== 'draft';
  }
}

/** Screens that play the saved season. A screen the season isn't on
 * (the finale mid-season, the Paddock after the last race) sends you to the right one. */
function SavedSeason({ screen, navigate, onMenu }: Props) {
  const [facts, setFacts] = useState(() => loadSeason());
  // Checked on arrival only, so a change on the page doesn't jump it.
  const [arrival] = useState(() => (facts ? { at: seasonScreenFor(facts), fits: screenFits(screen, seasonState(facts).phase) } : null));
  const at = arrival?.at;
  const wrongPlace = arrival != null && !arrival.fits;
  useEffect(() => {
    if (wrongPlace) navigate({ name: 'season', screen: at! }, { replace: true });
  }, [wrongPlace, at, navigate]);
  if (wrongPlace) return null;
  const onEndRun = () => navigate({ name: 'season', screen: 'setup' }, { replace: true });
  const toRoad = () => navigate({ name: 'season', screen: 'run' });
  if (facts && screen === 'paddock') {
    return <Paddock facts={facts} onChange={setFacts} onMenu={onMenu} onRoad={toRoad} onEndRun={onEndRun} onGo={() => navigate({ name: 'season', screen: 'race' })} />;
  }
  if (facts && screen === 'standings') {
    return <Standings facts={facts} onMenu={onMenu} onRoad={toRoad} onEndRun={onEndRun} onPaddock={() => navigate({ name: 'season', screen: 'paddock' })} onPlayAgain={() => navigate({ name: 'season', screen: 'setup' }, { replace: true })}
      onPromote={picks => { if (promoteCurrentRun(picks)) navigate({ name: 'season', screen: 'paddock' }, { replace: true }); }} />;
  }
  return <NoSeason onMenu={onMenu} onNew={() => navigate({ name: 'season', screen: 'setup' })} />;
}

/** No run saved on this device. */
function NoSeason({ onMenu, onNew }: { onMenu: () => void; onNew: () => void }) {
  return (
    <StepTheme step="nationals" className="ace-page">
      <Bunting />
      <h1 className="ace-h1">No season</h1>
      <p className="ace-sub">There’s no season saved on this device.</p>
      <div className="ace-dock"><AceButton tone="ghost" onClick={onMenu}>Menu</AceButton><AceButton onClick={onNew}>A new season</AceButton></div>
    </StepTheme>
  );
}
