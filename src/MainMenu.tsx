import { useState } from 'react';
import { GameIcon } from './icons/GameIcon';
import './MainMenu.css';
import { version } from '../package.json';

/** What the menu needs to know about a saved league, if one exists. */
export interface LeagueCardSummary {
  /** Published code, if this league lives on the server. */
  remoteCode?: string;
  name: string;
  settled: number;
  total: number;
  /** Races that have fired but not yet been watched/settled. */
  dueCount: number;
  /** Epoch ms of the next scheduled race, null when the season is over. */
  nextAt: number | null;
}

/** The saved Season, if there is one (one save slot). */
export interface SeasonCardSummary {
  name: string;
  /** 0-based round in progress. */
  round: number;
  total: number;
  finished: boolean;
}

interface MainMenuProps {
  /** Open a published league by its code. Resolves to an error message, or null on success. */
  onOpenCode: (code: string) => Promise<string | null>;
  onSingleRace: () => void;
  onCommissioner: () => void;
  /** Play a Season: continue the saved one, or League Setup. */
  onSeason: () => void;
  season?: SeasonCardSummary | null;
  onCompendium: () => void;
  onGlossary: () => void;
  onCredits: () => void;
  league?: LeagueCardSummary | null;
}

function nextIn(league: LeagueCardSummary): string {
  if (league.nextAt === null) return 'Season complete';
  const mins = Math.max(1, Math.round((league.nextAt - Date.now()) / 60000));
  if (mins >= 90) return `Next in ~${Math.round(mins / 60)}h`;
  return `Next in ~${mins}m`;
}

function MainMenu({ onSingleRace, onCommissioner, onSeason, season, onCompendium, onGlossary, onCredits, onOpenCode, league }: MainMenuProps) {
  const [code, setCode] = useState('');
  const [opening, setOpening] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (c.length < 4) return;
    setOpening(true); setCodeError(null);
    const err = await onOpenCode(c);
    setOpening(false);
    if (err) setCodeError(err);
  };
  const status = league
    ? league.nextAt === null && league.dueCount === 0 ? { label: 'COMPLETE', tone: 'done' }
      : league.dueCount > 0 ? { label: `${league.dueCount} RAN`, tone: 'due' }
      : { label: 'RUNNING', tone: 'live' }
    : { label: 'NEW', tone: 'new' };
  const done = league ? league.settled + league.dueCount : 0;

  return (
    <div className="main-menu">
      <div className="main-menu-content">
        <header className="mm-header">
          <svg className="mm-curve" width="360" height="120" viewBox="0 0 360 120" fill="none" aria-hidden="true">
            <path d="M0 108 C 150 108 270 100 318 52 C 338 32 344 16 346 0" className="mm-curve-track" strokeWidth="10" strokeLinecap="round" />
            <path d="M0 108 C 150 108 270 100 318 52 C 338 32 344 16 346 0" className="mm-curve-line" strokeWidth="1" strokeDasharray="2 6" />
            <circle className="mm-curve-apex" cx="318" cy="52" r="5" />
          </svg>
          <h1 className="mm-title">Parabolica<span className="mm-tm">TM</span></h1>
          <p className="mm-sub">Racing, where everything is fine.</p>
        </header>

        <section className="mm-section">
          <div className="mm-k">Season</div>
          <button type="button" className="mm-hero" onClick={onSeason}>
            <div className="mm-hero-top">
              <span className="mm-eyebrow">Season Mode</span>
              {season && !season.finished && <span className="mm-pill tone-live"><span className="mm-dot" />ROUND {season.round + 1} OF {season.total}</span>}
            </div>
            <div className="mm-hero-name">{season && !season.finished ? season.name : 'Play a Season'}</div>
            <div className="mm-hero-line">
              {season && !season.finished
                ? 'Your season is saved. Pick up where you left off.'
                : 'Draft three drivers and a car, race the calendar, win the constructors’.'}
            </div>
            {season && !season.finished && (
              <div className="mm-ribbon" aria-label={`Season progress: ${season.round} of ${season.total}`}>
                {Array.from({ length: season.total }, (_, i) => <span key={i} className={`mm-ribbon-cell ${i < season.round ? 'run' : ''}`} />)}
              </div>
            )}
            <div className="mm-hero-foot"><span className="mm-cta">{season && !season.finished ? 'Continue' : 'Play a Season'}</span></div>
          </button>
        </section>

        <section className="mm-section">
          <div className="mm-k">Commissioner leagues (retiring)</div>
          {league && (
            <button type="button" className="mm-row" onClick={onCommissioner}>
              <span className="mm-row-icon"><GameIcon name="ui.home" size={20} /></span>
              <span className="mm-row-text">
                <span className="mm-row-title">{league.name} <span className={`mm-pill tone-${status.tone}`}><span className="mm-dot" />{status.label}</span></span>
                <span className="mm-row-sub">{done} of {league.total} races run · {league.dueCount > 0 ? `${league.dueCount} ran while you were away` : nextIn(league)}</span>
              </span>
              <span className="mm-row-chev">›</span>
            </button>
          )}
          <form className="mm-row mm-row-form mm-code" onSubmit={submitCode}>
            <span className="mm-row-text">
              <span className="mm-row-title">Open a league by code</span>
              <span className="mm-row-sub">{codeError ?? (league?.remoteCode ? `This device is on ${league.remoteCode}. Another code replaces it here.` : 'A league someone published. Same races, same clock, on every device.')}</span>
            </span>
            <input value={code} onChange={e => { setCode(e.target.value.toUpperCase()); setCodeError(null); }} placeholder="CODE" maxLength={12} className={`mm-input mm-code-input ${codeError ? 'error' : ''}`} aria-label="League code" spellCheck={false} autoCapitalize="characters" />
            <button type="submit" className="mm-btn" disabled={opening || code.trim().length < 4}>{opening ? '…' : 'Open'}</button>
          </form>
        </section>

        <section className="mm-section">
          <div className="mm-k">Play</div>
          <button type="button" className="mm-row" onClick={onSingleRace}>
            <span className="mm-row-icon"><GameIcon name="ui.play" size={20} /></span>
            <span className="mm-row-text">
              <span className="mm-row-title">Quick Race</span>
              <span className="mm-row-sub">One race. Pick your cards, edit the grid, go.</span>
            </span>
            <span className="mm-row-chev">›</span>
          </button>

          <button type="button" className="mm-row" onClick={onGlossary}>
            <span className="mm-row-icon"><GameIcon name="card.rule" size={20} /></span>
            <span className="mm-row-text">
              <span className="mm-row-title">World Deck</span>
              <span className="mm-row-sub">Every card, team, track and weather in the world, read from the data.</span>
            </span>
            <span className="mm-row-chev">›</span>
          </button>

          <button type="button" className="mm-row" onClick={onCompendium}>
            <span className="mm-row-icon"><GameIcon name="view.detail" size={20} /></span>
            <span className="mm-row-text">
              <span className="mm-row-title">Race Control</span>
              <span className="mm-row-sub">The lab: seeded batches, tag calibration, odds. Every number replicable.</span>
            </span>
            <span className="mm-row-chev">›</span>
          </button>
        </section>

        <footer className="mm-footer">
          <span>v{version} · {new Date(__BUILD_TIME__).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
          <span className="mm-footer-links"><button type="button" className="mm-footer-link" onClick={onCredits}>Credits</button> · playparabolica.com</span>
        </footer>
      </div>
    </div>
  );
}

export default MainMenu;
