// Season Mode's screens, one per #/season/<screen> address (src/router.ts).
// Each screen reads the one saved season; the screens after Setup land with
// their own issues (#318 draft, #319 Paddock, #322 race, #321 standings) and
// until then show where the season stands.
import { useEffect, useMemo, useState } from 'react';
import { TeamLogo, teamThemeVars } from '../../icons/GameIcon';
import type { Route, SeasonScreen as Screen } from '../../router';
import { seasonState, type SeasonFacts } from '../season';
import { loadCurrentLeague as loadSeason, promoteCurrentRun } from '../../run/current';
import { seasonName } from '../setup';
import LeagueSetup from './LeagueSetup';
import DraftBoard from './DraftBoard';
import Paddock from './Paddock';
import Standings from './Standings';
import RunLadder from './RunLadder';
import '../../RunSetup.css';
import './Season.css';

interface Props {
  screen: Screen;
  navigate: (route: Route, opts?: { replace?: boolean }) => void;
  onMenu: () => void;
}

/** Where a saved season picks up. */
export function seasonScreenFor(facts: SeasonFacts): Screen {
  const phase = seasonState(facts).phase;
  return phase === 'draft' ? 'draft' : phase === 'finished' ? 'standings' : 'paddock';
}

export default function SeasonScreen({ screen, navigate, onMenu }: Props) {
  if (screen === 'setup') {
    // The run's first step (#346, #628): your team, then the ladder.
    return <LeagueSetup onBack={onMenu} onStarted={() => navigate({ name: 'season', screen: 'run' }, { replace: true })} />;
  }
  if (screen === 'run') {
    return <RunLadder onMenu={onMenu} onNewRun={() => navigate({ name: 'season', screen: 'setup' })} onPlay={s => navigate({ name: 'season', screen: s })} />;
  }
  // Keyed by screen: each screen reads the saved season fresh on arrival.
  return <SavedSeason key={screen} screen={screen} navigate={navigate} onMenu={onMenu} />;
}

/** Can this screen show the season in this phase? */
function screenFits(screen: Screen, phase: ReturnType<typeof seasonState>['phase']): boolean {
  switch (screen) {
    case 'draft': return phase === 'draft';
    case 'paddock': return phase === 'paddock' || phase === 'ready-for-go';
    case 'race': return phase === 'ready-for-go';
    default: return phase !== 'draft';
  }
}

/** Screens that play the saved season. A screen the season isn't on yet
 * (the Paddock before the draft is done) sends you to the right one. */
function SavedSeason({ screen, navigate, onMenu }: Props) {
  const [facts, setFacts] = useState(() => loadSeason());
  // Checked on arrival only, so finishing the draft doesn't jump the page.
  const [arrival] = useState(() => (facts ? { at: seasonScreenFor(facts), fits: screenFits(screen, seasonState(facts).phase) } : null));
  const at = arrival?.at;
  const wrongPlace = arrival != null && !arrival.fits;
  useEffect(() => {
    if (wrongPlace) navigate({ name: 'season', screen: at! }, { replace: true });
  }, [wrongPlace, at, navigate]);
  if (wrongPlace) return null;
  const onEndSeason = () => navigate({ name: 'season', screen: 'setup' }, { replace: true });
  const toRun = () => navigate({ name: 'season', screen: 'run' });
  if (facts && screen === 'draft') {
    return <DraftBoard facts={facts} onChange={setFacts} onMenu={toRun} backLabel="← The run" onEndSeason={onEndSeason} onDone={() => navigate({ name: 'season', screen: 'paddock' })} />;
  }
  if (facts && screen === 'paddock') {
    return <Paddock facts={facts} onChange={setFacts} onMenu={toRun} backLabel="← The run" onEndSeason={onEndSeason} onGo={() => navigate({ name: 'season', screen: 'race' })} onStandings={() => navigate({ name: 'season', screen: 'standings' })} />;
  }
  if (facts && screen === 'standings') {
    return <Standings facts={facts} onMenu={onMenu} onEndSeason={onEndSeason} onPaddock={() => navigate({ name: 'season', screen: 'paddock' })} onPlayAgain={() => navigate({ name: 'season', screen: 'setup' }, { replace: true })}
      onPromote={() => { if (promoteCurrentRun()) navigate({ name: 'season', screen: 'run' }, { replace: true }); }} />;
  }
  return <SeasonHolding screen={screen} navigate={navigate} onMenu={onMenu} />;
}

const NEXT: Record<Exclude<Screen, 'setup'>, string> = {
  run: 'The league ladder',
  draft: 'The draft board',
  paddock: 'The Paddock',
  race: 'The race view',
  standings: 'The standings',
};

/** A screen not built yet: the saved season, and the way back. */
function SeasonHolding({ screen, navigate, onMenu }: Props) {
  const facts = useMemo(() => loadSeason(), []);
  if (!facts) {
    return (
      <div className="run-setup season-setup">
        <header className="rs-top">
          <div className="rs-title-block">
            <button type="button" className="rs-back" onClick={onMenu}>← Menu</button>
            <h1 className="rs-title">No season</h1>
            <span className="rs-sub">There’s no saved season on this device.</span>
          </div>
        </header>
        <div className="ss-holding-actions">
          <button type="button" className="rs-btn rs-btn-primary" onClick={() => navigate({ name: 'season', screen: 'setup' })}>New season</button>
        </div>
      </div>
    );
  }
  const state = seasonState(facts);
  const you = facts.setup.humans[0];
  const total = facts.setup.calendar.length;
  return (
    <div className="run-setup season-setup" style={teamThemeVars(you)}>
      <header className="rs-top">
        <div className="rs-title-block">
          <button type="button" className="rs-back" onClick={onMenu}>← Menu</button>
          <h1 className="rs-title">{seasonName(facts.setup)}</h1>
          <span className="rs-sub">
            {state.phase === 'finished' ? `Season over: ${total} races.` : state.phase === 'draft' ? `Draft day. ${total} races ahead.` : `Round ${state.round + 1} of ${total}.`}
          </span>
        </div>
      </header>
      <section className="rs-row ss-holding">
        {you && (
          <div className="ss-team">
            <TeamLogo team={you} size={28} />
            <span className="ss-team-name">{you.name}</span>
            <span className="ss-badge ss-badge-human">You</span>
          </div>
        )}
        <p className="rs-hint">{NEXT[screen as Exclude<Screen, 'setup'>]} is being built next. Your season is saved; it picks up here when it lands.</p>
        <div className="ss-holding-actions">
          <button type="button" className="rs-btn" onClick={onMenu}>Menu</button>
          <button type="button" className="rs-btn rs-btn-ghost" onClick={() => navigate({ name: 'season', screen: 'setup' })}>New season</button>
        </div>
      </section>
    </div>
  );
}
