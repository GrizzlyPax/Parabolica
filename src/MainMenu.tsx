import { GameIcon } from './icons/GameIcon';
import './MainMenu.css';
import { version } from '../package.json';

/** The saved Season, if there is one (one save slot). */
export interface SeasonCardSummary {
  name: string;
  /** 0-based round in progress. */
  round: number;
  total: number;
  finished: boolean;
}

interface MainMenuProps {
  onSingleRace: () => void;
  /** Play a Season: continue the saved one, or League Setup. */
  onSeason: () => void;
  season?: SeasonCardSummary | null;
  onCompendium: () => void;
  onGlossary: () => void;
  onCredits: () => void;
}

function MainMenu({ onSingleRace, onSeason, season, onCompendium, onGlossary, onCredits }: MainMenuProps) {
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
                : 'Draft two drivers and a car, race the calendar, win the constructors’.'}
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
          <div className="mm-k">Play</div>
          <button type="button" className="mm-row" onClick={onSingleRace}>
            <span className="mm-row-icon"><GameIcon name="ui.play" size={20} /></span>
            <span className="mm-row-text">
              <span className="mm-row-title">Quick Race</span>
              <span className="mm-row-sub">One random race, right now. Follow a team if you like.</span>
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
              <span className="mm-row-sub">The lab: seeded batches, physics calibration, the deck. Every number replicable.</span>
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
