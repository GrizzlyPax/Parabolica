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
            <span className="title-emoji">👑</span>
            Crown Prix
            <span className="title-emoji">🏁</span>
          </h1>
          <p className="main-menu-subtitle">Ten kingdoms compete for glory</p>
        </div>

        <div className="mode-selection">
          <button className="mode-card" onClick={onSingleRace}>
            <div className="mode-icon">🎲</div>
            <div className="mode-info">
              <h2>Single Race</h2>
              <p>Quick race with random track and weather. Perfect for a fast session.</p>
            </div>
            <div className="mode-arrow">→</div>
          </button>

          <button className="mode-card season-card" onClick={onSeason}>
            <div className="mode-icon">🏆</div>
            <div className="mode-info">
              <h2>Season Mode</h2>
              <p>Compete across multiple races. Track points, wins, and crown a champion.</p>
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
