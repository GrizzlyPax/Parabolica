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
            Parabolica<span className="tm">TM</span>
          </h1>
          <p className="main-menu-subtitle">Racing, where everything is fine.</p>
        </div>

        <div className="mode-selection">
          <button className="mode-card marble" onClick={onSingleRace}>
            <div className="mode-icon">🏎️</div>
            <div className="mode-info">
              <h2>Single Race</h2>
              <p>One race. Pick your winners. Results may vary.</p>
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

          <button className="mode-card forbidden" onClick={onCompendium}>
            <div className="mode-icon">🔒</div>
            <div className="mode-info">
              <h2><span className="forbidden-text">Compendium</span></h2>
              <p className="forbidden-desc">
                <span className="redacted">████████ ███████████</span>
              </p>
              <p className="forbidden-whisper">ᶠᵒʳᵇⁱᵈᵈᵉⁿ ᵏⁿᵒʷˡᵉᵈᵍᵉ</p>
            </div>
            <div className="mode-arrow">⛔</div>
          </button>
        </div>

        <div className="mister-marbles-float">
          <span className="mister-marbles-message">
            <span className="mm-icon">🔮</span>
            <span className="mm-text">Mister Marbles is watching.</span>
          </span>
        </div>

        <div className="main-menu-footer">
          <span className="version">v1.0</span>
        </div>
      </div>
    </div>
  );
}

export default MainMenu;
