import './MainMenu.css';

interface MainMenuProps {
  onSingleRace: () => void;
  onSeason: () => void;
  onCompendium: () => void;
}

function MainMenu({ onSingleRace, onSeason, onCompendium }: MainMenuProps) {
  return (
    <div className="main-menu">
      <div className="main-menu-content">
        <div className="main-menu-header">
          <h1 className="main-menu-title">
            Parabolica
          </h1>
          <p className="main-menu-subtitle">Racing, where everything is fine.</p>
        </div>

        <div className="mode-selection">
          <button className="mode-card marble" onClick={onSingleRace}>
            <div className="mode-icon">🔮</div>
            <div className="mode-info">
              <h2>Marble Mode</h2>
              <p>One race. Place your bets. Results may vary.</p>
            </div>
            <div className="mode-arrow">→</div>
          </button>

          <button className="mode-card marble" onClick={onSeason}>
            <div className="mode-icon">🏆</div>
            <div className="mode-info">
              <h2>Season Mode</h2>
              <p>More races, more marbles. Someone probably wins.</p>
            </div>
            <div className="mode-arrow">→</div>
          </button>

          <button className="mode-card" onClick={onCompendium}>
            <div className="mode-icon">📜</div>
            <div className="mode-info">
              <h2>Compendium</h2>
              <p>All the systems, tags, and mechanics. The fine print.</p>
            </div>
            <div className="mode-arrow">→</div>
          </button>
        </div>

        <div className="main-menu-hint">
          <span className="hint-icon">🔮</span>
          <span className="hint-text">Mister Marbles is watching.</span>
        </div>

        <div className="main-menu-footer">
          <span className="version">v1.0</span>
        </div>
      </div>
    </div>
  );
}

export default MainMenu;
