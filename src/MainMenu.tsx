import './MainMenu.css';
import { version } from '../package.json';

/** What the menu needs to know about a saved league, if one exists. */
export interface LeagueCardSummary {
  name: string;
  settled: number;
  total: number;
  /** Races that have fired but not yet been watched/settled. */
  dueCount: number;
  /** Epoch ms of the next scheduled race, null when the season is over. */
  nextAt: number | null;
}

interface MainMenuProps {
  onSingleRace: () => void;
  onCommissioner: () => void;
  onCompendium: () => void;
  onGlossary: () => void;
  league?: LeagueCardSummary | null;
}

function nextIn(league: LeagueCardSummary): string {
  if (league.nextAt === null) return 'Season complete';
  const mins = Math.max(1, Math.round((league.nextAt - Date.now()) / 60000));
  if (mins >= 90) return `Next in ~${Math.round(mins / 60)}h`;
  return `Next in ~${mins}m`;
}

function MainMenu({ onSingleRace, onCommissioner, onCompendium, onGlossary, league }: MainMenuProps) {
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
            <path d="M0 108 C 150 108 270 100 318 52 C 338 32 344 16 346 0" stroke="#26262E" strokeWidth="10" strokeLinecap="round" />
            <path d="M0 108 C 150 108 270 100 318 52 C 338 32 344 16 346 0" stroke="#34343E" strokeWidth="1" strokeDasharray="2 6" />
            <circle cx="318" cy="52" r="5" fill="var(--pw-purple)" />
          </svg>
          <h1 className="mm-title">Parabolica<span className="mm-tm">TM</span></h1>
          <p className="mm-sub">Racing, where everything is fine.</p>
        </header>

        <section className="mm-section">
          <div className="mm-k">Your league</div>
          <button type="button" className="mm-hero" onClick={onCommissioner}>
            <div className="mm-hero-top">
              <span className="mm-eyebrow">Commissioner Mode</span>
              <span className={`mm-pill tone-${status.tone}`}>
                <span className="mm-dot" />{status.label}
              </span>
            </div>
            <div className="mm-hero-name">{league ? league.name : 'Found a league'}</div>
            <div className="mm-hero-line">
              {league
                ? `${done} of ${league.total} races run`
                : 'A league that runs on the real clock. Races happen whether you watch or not.'}
            </div>
            {league && (
              <>
                <div className="mm-ribbon" aria-label={`Season progress: ${done} of ${league.total}`}>
                  {Array.from({ length: league.total }, (_, i) => (
                    <span key={i} className={`mm-ribbon-cell ${i < league.settled ? 'run' : i < done ? 'due' : ''}`} />
                  ))}
                </div>
                <div className="mm-hero-foot">
                  <span>{league.dueCount > 0 ? `${league.dueCount} race${league.dueCount > 1 ? 's' : ''} ran while you were away` : nextIn(league)}</span>
                  <span className="mm-cta">{league.dueCount > 0 ? 'Check in →' : 'Open league →'}</span>
                </div>
              </>
            )}
            {!league && <div className="mm-hero-foot"><span /><span className="mm-cta">Found one →</span></div>}
          </button>
        </section>

        <section className="mm-section">
          <div className="mm-k">Play</div>
          <button type="button" className="mm-row" onClick={onSingleRace}>
            <span className="mm-row-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M4 17V3M4 4h10l-2 3 2 3H4" /></svg>
            </span>
            <span className="mm-row-text">
              <span className="mm-row-title">Quick Race</span>
              <span className="mm-row-sub">One race. Pick your cards, edit the grid, go.</span>
            </span>
            <span className="mm-row-chev">›</span>
          </button>

          <button type="button" className="mm-row" onClick={onGlossary}>
            <span className="mm-row-icon mm-row-icon-dim">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M4 4h5a2 2 0 0 1 2 2v11a1.5 1.5 0 0 0-1.5-1.5H4zM16 4h-5a2 2 0 0 0-2 2v11a1.5 1.5 0 0 1 1.5-1.5H16z" /></svg>
            </span>
            <span className="mm-row-text">
              <span className="mm-row-title">World Deck</span>
              <span className="mm-row-sub">Every team, track, tag, card and god in the world, read from the data.</span>
            </span>
            <span className="mm-row-chev">›</span>
          </button>

          <button type="button" className="mm-row" onClick={onCompendium}>
            <span className="mm-row-icon mm-row-icon-dim">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="6" cy="6" r="2.5" /><circle cx="14" cy="14" r="2.5" /><path d="M8.5 6H17M3 14h8.5M6 3v-1M14 18v-1" /></svg>
            </span>
            <span className="mm-row-text">
              <span className="mm-row-title">Race Control</span>
              <span className="mm-row-sub">The lab: seeded batches, tag calibration, odds. Every number replicable.</span>
            </span>
            <span className="mm-row-chev">›</span>
          </button>
        </section>

        <footer className="mm-footer">
          <span>v{version} · {new Date(__BUILD_TIME__).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
          <span>playparabolica.com</span>
        </footer>
      </div>
    </div>
  );
}

export default MainMenu;
