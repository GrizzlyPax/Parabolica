// Season Mode's screens, one per #/season/<screen> address (src/router.ts).
// Each screen reads the one saved season; the screens after Setup land with
// their own issues (#318 draft, #319 Paddock, #322 race, #321 standings) and
// until then show where the season stands.
import { useMemo } from 'react';
import { TeamLogo, teamThemeVars } from '../../icons/GameIcon';
import type { Route, SeasonScreen as Screen } from '../../router';
import { loadSeason, seasonState, type SeasonFacts } from '../season';
import { seasonName } from '../setup';
import LeagueSetup from './LeagueSetup';
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
    return <LeagueSetup onBack={onMenu} onStarted={facts => navigate({ name: 'season', screen: seasonScreenFor(facts) }, { replace: true })} />;
  }
  return <SeasonHolding screen={screen} navigate={navigate} onMenu={onMenu} />;
}

const NEXT: Record<Exclude<Screen, 'setup'>, string> = {
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
            <span className="ss-badge ss-badge-human">{facts.setup.humans.length > 1 ? 'P1' : 'You'}</span>
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
