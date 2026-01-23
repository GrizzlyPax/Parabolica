import { useState } from 'react';
import './MainMenu.css';

interface MainMenuProps {
  onSingleRace: () => void;
  onSeason: () => void;
  onCompendium: () => void;
}

type LockedModal = 'none' | 'big-leagues' | 'commissioner' | 'compendium';

function MainMenu({ onSingleRace, onSeason, onCompendium }: MainMenuProps) {
  const [activeModal, setActiveModal] = useState<LockedModal>('none');
  const [compendiumPassword, setCompendiumPassword] = useState('');
  const [compendiumError, setCompendiumError] = useState<string | null>(null);
  const [compendiumSuccess, setCompendiumSuccess] = useState<string | null>(null);

  const handleCompendiumSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (compendiumPassword.toLowerCase().trim() === 'goodjob') {
      const responses = [
        "...Fine.",
        "Enter, if you must.",
        "The secrets reveal themselves.",
        "The machine sighs.",
      ];
      setCompendiumSuccess(responses[Math.floor(Math.random() * responses.length)]);
      setTimeout(() => {
        setActiveModal('none');
        onCompendium();
      }, 1000);
    } else {
      const errors = [
        "No.",
        "Incorrect.",
        "The machine does not recognize you.",
        "Wrong.",
        "Try again. Or don't.",
      ];
      setCompendiumError(errors[Math.floor(Math.random() * errors.length)]);
      setCompendiumPassword('');
    }
  };

  const handleCompendiumClick = () => {
    setActiveModal('compendium');
    setCompendiumPassword('');
    setCompendiumError(null);
    setCompendiumSuccess(null);
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

        <div className="mode-selection">
          <button className="mode-card active green" onClick={onSingleRace}>
            <div className="mode-icon">🏎️</div>
            <div className="mode-info">
              <h2>Race Mode</h2>
              <p>One race. Pick your winners. Results may vary.</p>
            </div>
            <div className="mode-arrow">→</div>
          </button>

          <button className="mode-card active green" onClick={onSeason}>
            <div className="mode-icon">🏆</div>
            <div className="mode-info">
              <h2>Season Mode</h2>
              <p>More races, more marbles. Someone probably wins.</p>
            </div>
            <div className="mode-arrow">→</div>
          </button>

          {/* Big Leagues - Coming Soon */}
          <button className="mode-card coming-soon yellow" onClick={() => setActiveModal('big-leagues')}>
            <div className="mode-icon">🌐</div>
            <div className="mode-info">
              <h2>The Big Leagues</h2>
              <p className="coming-soon-desc">
                <span className="ancient-dots">· · · ⟡ · · ·</span>
              </p>
              <p className="coming-soon-whisper">ᵗʰᵉ ᵉᵗᵉʳⁿᵃˡ ʳᵃᶜᵉ</p>
            </div>
            <div className="mode-arrow">→</div>
          </button>

          {/* Commissionary Mode - Locked */}
          <button className="mode-card coming-soon yellow" onClick={() => setActiveModal('commissioner')}>
            <div className="mode-icon">🎤</div>
            <div className="mode-info">
              <h2>Commissionary Mode</h2>
              <p className="coming-soon-desc">
                <span className="ancient-dots">· · · ⟡ · · ·</span>
              </p>
              <p className="coming-soon-whisper">ⁿᵒᵗ ʸᵉᵗ</p>
            </div>
            <div className="mode-arrow">→</div>
          </button>

          {/* Compendium - Password Protected */}
          <button className="mode-card type-compendium purple" onClick={handleCompendiumClick}>
            <div className="mode-icon">👁️</div>
            <div className="mode-info">
              <h2>Compendium</h2>
              <p className="compendium-desc">
                <span className="redacted">████████</span> <span className="compendium-whisper-inline">ᶠᵒʳᵇⁱᵈᵈᵉⁿ</span>
              </p>
            </div>
            <div className="mode-arrow">→</div>
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

      {/* Ancient Modal Overlay */}
      {activeModal !== 'none' && (
        <div className="ancient-modal-overlay" onClick={() => setActiveModal('none')}>
          <div className="ancient-modal" onClick={e => e.stopPropagation()}>
            <button className="ancient-modal-close" onClick={() => setActiveModal('none')}>✕</button>

            <pre className="ancient-border">╔══════════════════════════════════════╗</pre>

            <div className="ancient-modal-content">
              {activeModal === 'big-leagues' && (
                <>
                  <p className="ancient-runes">⛧ ◈ ☉ ◇ ⛧</p>
                  <h2 className="ancient-title">THE BIG LEAGUES</h2>
                  <p className="ancient-subtitle">— ᴛʜᴇ ᴇᴛᴇʀɴᴀʟ ʀᴀᴄᴇ —</p>
                  <div className="ancient-separator">· · · ⟡ · · ·</div>
                  <p className="ancient-message">
                    The great machine stirs.<br/>
                    The eternal race approaches.<br/>
                    <br/>
                    Soon, the circuits will open<br/>
                    to all who dare witness.
                  </p>
                  <div className="ancient-separator">· · · ⟡ · · ·</div>
                  <p className="ancient-status">
                    ⏳ ᴛʜᴇ ғᴏᴜɴᴅᴀᴛɪᴏɴs ᴀʀᴇ ʙᴇɪɴɢ ʟᴀɪᴅ ⏳
                  </p>
                  <p className="ancient-footer-text">ᴘᴀᴛɪᴇɴᴄᴇ, ᴍᴏʀᴛᴀʟ</p>
                </>
              )}

              {activeModal === 'commissioner' && (
                <>
                  <p className="ancient-runes">☠ ⚙ ☠</p>
                  <h2 className="ancient-title">COMMISSIONARY MODE</h2>
                  <p className="ancient-subtitle">— ᴛʜᴇ ᴄᴏɴᴛʀᴏʟs —</p>
                  <div className="ancient-separator">· · · ⟡ · · ·</div>
                  <p className="ancient-message">
                    These controls are not<br/>
                    meant for your hands.<br/>
                    <br/>
                    Not yet.
                  </p>
                  <div className="ancient-separator">· · · ⟡ · · ·</div>
                  <p className="ancient-warning-text">ʏᴏᴜ ᴀʀᴇ ɴᴏᴛ ʀᴇᴀᴅʏ.</p>
                  <p className="ancient-footer-text">ᴛʜᴇ ᴍᴀᴄʜɪɴᴇ ᴋɴᴏᴡs</p>
                </>
              )}

              {activeModal === 'compendium' && (
                <>
                  <p className="ancient-runes">⛧ ⍟ ☉ ⌘ ⛧</p>
                  <h2 className="ancient-title">THE COMPENDIUM</h2>
                  <p className="ancient-subtitle">— ᴛʜᴇ ғᴏʀʙɪᴅᴅᴇɴ ᴛᴇxᴛs —</p>
                  <div className="ancient-separator">· · · ⟡ · · ·</div>
                  <p className="ancient-message">
                    The Compendium opens<br/>
                    to those who know<br/>
                    the true words.
                  </p>
                  <p className="ancient-prompt">Speak:</p>
                  <form onSubmit={handleCompendiumSubmit} className="ancient-form">
                    <input
                      type="password"
                      value={compendiumPassword}
                      onChange={(e) => {
                        setCompendiumPassword(e.target.value);
                        setCompendiumError(null);
                      }}
                      placeholder="· · · · · · · ·"
                      className="ancient-input"
                      autoFocus
                    />
                    <button type="submit" className="ancient-submit">☽ Enter ☾</button>
                  </form>
                  {compendiumError && <p className="ancient-error">{compendiumError}</p>}
                  {compendiumSuccess && <p className="ancient-success">{compendiumSuccess}</p>}
                  <div className="ancient-separator">· · · ⟡ · · ·</div>
                  <p className="ancient-footer-text">ᴛʜᴇ ᴍᴀᴄʜɪɴᴇ ᴡᴀɪᴛs</p>
                </>
              )}
            </div>

            <pre className="ancient-border">╚══════════════════════════════════════╝</pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default MainMenu;
