import { useState } from 'react';
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
  league?: LeagueCardSummary | null;
}

function describeLeague(league: LeagueCardSummary): string {
  if (league.nextAt === null && league.dueCount === 0) {
    return `Season complete — ${league.total} races run. A champion awaits your judgment.`;
  }
  if (league.dueCount > 0) {
    return `${league.dueCount} race${league.dueCount > 1 ? 's' : ''} ran while you were away. ${league.settled + league.dueCount}/${league.total} complete.`;
  }
  const mins = Math.max(1, Math.round((league.nextAt! - Date.now()) / 60000));
  const when = mins >= 90 ? `${Math.round(mins / 60)}h` : `${mins}m`;
  return `${league.settled}/${league.total} races run. Next race in ~${when}.`;
}

function MainMenu({ onSingleRace, onCommissioner, onCompendium, league }: MainMenuProps) {
  const [raceControlFlipped, setRaceControlFlipped] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const handleRaceControlClick = () => {
    setRaceControlFlipped(true);
    setPassword('');
    setPasswordError(false);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.toLowerCase().trim() === 'goodjob') {
      onCompendium();
    } else {
      setPasswordError(true);
      setPassword('');
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    setPasswordError(false);
  };

  return (
    <div className="main-menu">
      <div className="main-menu-content">
        <div className="main-menu-header">
          <h1 className="main-menu-title">
            Parabolica<span className="tm">TM</span>
          </h1>
          <p className="main-menu-subtitle">Racing, where everything is fine.</p>
        </div>

        {/* Marble counter strip */}
        <div className="marble-counter-strip">
          <div className="marble"></div>
          <div className="marble"></div>
          <div className="marble"></div>
          <div className="marble"></div>
        </div>

        <div className="mode-selection">
          {/* Commissioner Mode - the main event */}
          <button className="mode-card tier-purple" onClick={onCommissioner}>
            <div className="mode-card-header">
              <div className="mode-icon">⚜️</div>
              <div className="mode-title-row">
                <div className="mode-info">
                  <h2>{league ? league.name : 'Commissioner Mode'}</h2>
                </div>
                <span className={`status-pill ${league && league.dueCount > 0 ? 'live' : 'secret'}`}>
                  {league ? (league.dueCount > 0 ? 'Races ran!' : 'Running') : 'New'}
                </span>
              </div>
            </div>
            <div className="mode-info">
              <p>
                {league
                  ? describeLeague(league)
                  : 'Found a league that runs on the real clock — races happen whether you watch or not. Kneel to a god. Try to survive it.'}
              </p>
            </div>
          </button>

          {/* Quick Race - Green/Live */}
          <button className="mode-card tier-green" onClick={onSingleRace}>
            <div className="mode-card-header">
              <div className="mode-icon">🏎️</div>
              <div className="mode-title-row">
                <div className="mode-info">
                  <h2>Quick Race</h2>
                </div>
                <span className="status-pill live">Live</span>
              </div>
            </div>
            <div className="mode-info">
              <p>Jump straight into a one-off race with a fresh grid and zero setup friction.</p>
            </div>
          </button>

          {/* Race Control - Purple/Secret - Flip Card */}
          <div className={`flip-card ${raceControlFlipped ? 'flipped' : ''}`}>
            <div className="flip-card-inner">
              {/* Front */}
              <button className="mode-card tier-purple flip-card-front" onClick={handleRaceControlClick}>
                <div className="mode-card-header">
                  <div className="mode-icon">🎛️</div>
                  <div className="mode-title-row">
                    <div className="mode-info">
                      <h2>Race Control</h2>
                    </div>
                    <span className="status-pill secret">Secret</span>
                  </div>
                </div>
                <div className="mode-info">
                  <p>For those who want to look a little closer.</p>
                </div>
              </button>

              {/* Back - Password Form */}
              <div
                className="mode-card tier-purple flip-card-back"
                onClick={() => setRaceControlFlipped(false)}
              >
                <div className="password-form-content" onClick={(e) => e.stopPropagation()}>
                  <div className="password-icon">🎛️</div>
                  <form onSubmit={handlePasswordSubmit} className="password-form">
                    <input
                      type="password"
                      value={password}
                      onChange={handlePasswordChange}
                      placeholder="Enter code"
                      className={`password-input ${passwordError ? 'error' : ''}`}
                      autoFocus
                    />
                    <button type="submit" className="password-submit">Enter</button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="main-menu-footer">
          <span className="version">
            v{version}
            <span className="version-built">
              {' · '}
              {new Date(__BUILD_TIME__).toLocaleString([], {
                month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
              })}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

export default MainMenu;
