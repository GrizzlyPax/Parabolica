import { useState, useEffect } from 'react';
import './MainMenu.css';
import { version } from '../package.json';
import { SeasonSummary } from './storage/persistence';

interface MainMenuProps {
  onSingleRace: () => void;
  onSeason: () => void;
  onCompendium: () => void;
  // Saved mid-season state, if any
  resume?: SeasonSummary | null;
  onResume?: () => void;
}

function MainMenu({ onSingleRace, onSeason, onCompendium, resume, onResume }: MainMenuProps) {
  const [lockedFeedback, setLockedFeedback] = useState<'parabolica' | 'feeder' | null>(null);
  const [raceControlFlipped, setRaceControlFlipped] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  // Clear locked feedback after animation
  useEffect(() => {
    if (lockedFeedback) {
      const timer = setTimeout(() => setLockedFeedback(null), 1200);
      return () => clearTimeout(timer);
    }
  }, [lockedFeedback]);

  const handleLockedClick = (mode: 'parabolica' | 'feeder') => {
    setLockedFeedback(mode);
  };

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
          {/* Resume saved season - only when a mid-season save exists */}
          {resume && onResume && (
            <button className="mode-card tier-green" onClick={onResume}>
              <div className="mode-card-header">
                <div className="mode-icon">📼</div>
                <div className="mode-title-row">
                  <div className="mode-info">
                    <h2>Resume Season</h2>
                  </div>
                  <span className="status-pill live">Saved</span>
                </div>
              </div>
              <div className="mode-info">
                <p>
                  Pick up where you left off — Race {resume.currentRaceNumber} of {resume.totalRaces},{' '}
                  {resume.bankroll >= 0 ? `${resume.bankroll} marbles up` : `${Math.abs(resume.bankroll)} marbles down`}.
                </p>
              </div>
            </button>
          )}

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

          {/* Full Season - Green/Live */}
          <button className="mode-card tier-green" onClick={onSeason}>
            <div className="mode-card-header">
              <div className="mode-icon">🏆</div>
              <div className="mode-title-row">
                <div className="mode-info">
                  <h2>Full Season</h2>
                </div>
                <span className="status-pill live">Live</span>
              </div>
            </div>
            <div className="mode-info">
              <p>Run a full championship, follow the standings, and watch rivalries and momentum build.</p>
            </div>
          </button>

          {/* Parabolica 1 - Gold/Locked */}
          <button
            className={`mode-card tier-gold ${lockedFeedback === 'parabolica' ? 'locked-shake' : ''}`}
            onClick={() => handleLockedClick('parabolica')}
          >
            <div className="mode-card-header">
              <div className="mode-icon">🏁</div>
              <div className="mode-title-row">
                <div className="mode-info">
                  <h2>Parabolica 1</h2>
                </div>
                <span className={`status-pill ${lockedFeedback === 'parabolica' ? 'locked-flash' : 'locked'}`}>
                  {lockedFeedback === 'parabolica' ? 'Locked!' : 'Locked'}
                </span>
              </div>
            </div>
            <div className="mode-info">
              <p>The flagship series. Real stakes. Real marbles.</p>
            </div>
          </button>

          {/* Feeder Series - Gold/Locked */}
          <button
            className={`mode-card tier-gold ${lockedFeedback === 'feeder' ? 'locked-shake' : ''}`}
            onClick={() => handleLockedClick('feeder')}
          >
            <div className="mode-card-header">
              <div className="mode-icon">🛞</div>
              <div className="mode-title-row">
                <div className="mode-info">
                  <h2>Feeder Series</h2>
                </div>
                <span className={`status-pill ${lockedFeedback === 'feeder' ? 'locked-flash' : 'locked'}`}>
                  {lockedFeedback === 'feeder' ? 'Locked!' : 'Locked'}
                </span>
              </div>
            </div>
            <div className="mode-info">
              <p>Run your own leagues. Win marbles. Lose friends.</p>
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
          <span className="version">v{version}</span>
        </div>
      </div>
    </div>
  );
}

export default MainMenu;
