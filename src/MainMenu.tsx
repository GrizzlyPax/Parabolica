import './MainMenu.css';

interface MainMenuProps {
  onSingleRace: () => void;
  onSeason: () => void;
}

function MainMenu({ onSingleRace, onSeason }: MainMenuProps) {
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
          <button className="mode-card" onClick={onSingleRace}>
            <div className="mode-icon">🎲</div>
            <div className="mode-info">
              <h2>Single Race</h2>
              <p>One race. Random circumstances. Results may vary.</p>
            </div>
            <div className="mode-arrow">→</div>
          </button>

          <button className="mode-card season-card" onClick={onSeason}>
            <div className="mode-icon">🏆</div>
            <div className="mode-info">
              <h2>Season Mode</h2>
              <p>Multiple races. Points accumulate. Someone probably wins.</p>
            </div>
            <div className="mode-arrow">→</div>
          </button>
        </div>

        <div className="main-menu-footer">
          <span className="version">v1.0</span>
        </div>
      </div>
    </div>
  );
}

export default MainMenu;
