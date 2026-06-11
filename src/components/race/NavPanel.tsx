// Navigation Panel - slide-in from left
// Allows switching between Track, Detail, and Standings views
import { useEffect, useRef } from 'react';
import type { NavPanelProps, RaceView } from './types';
import './NavPanel.css';

// View options configuration
const VIEW_OPTIONS: Array<{
  id: RaceView;
  icon: string;
  label: string;
  description: string;
}> = [
  {
    id: 'track',
    icon: '🏁',
    label: 'Track View',
    description: 'Map + condensed timing tower',
  },
  {
    id: 'detail',
    icon: '📊',
    label: 'Detail View',
    description: 'Full timing tower with all data',
  },
  {
    id: 'standings',
    icon: '🏆',
    label: 'Standings',
    description: 'Points & teams',
  },
];

function NavPanel({ isOpen, activeView, onViewChange, onClose, onExit }: NavPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle swipe to close
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    // Swipe left to close (negative delta)
    if (deltaX < -50) {
      onClose();
    }
  };

  // Handle view selection
  const handleViewSelect = (view: RaceView) => {
    onViewChange(view);
    onClose();
  };

  // Prevent body scroll when panel is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`nav-backdrop ${isOpen ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <nav
        ref={panelRef}
        className={`nav-panel ${isOpen ? 'open' : ''}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        aria-label="Navigation menu"
      >
        <div className="nav-panel-header">
          <h2>Live Race</h2>
          <button
            className="nav-close-btn"
            onClick={onClose}
            aria-label="Close navigation"
          >
            ✕
          </button>
        </div>

        <div className="nav-panel-options">
          {VIEW_OPTIONS.map((option) => (
            <button
              key={option.id}
              className={`nav-option ${activeView === option.id ? 'active' : ''}`}
              onClick={() => handleViewSelect(option.id)}
            >
              <span className="nav-option-icon">{option.icon}</span>
              <div className="nav-option-text">
                <span className="nav-option-label">{option.label}</span>
                <span className="nav-option-desc">{option.description}</span>
              </div>
              {activeView === option.id && (
                <span className="nav-option-check">✓</span>
              )}
            </button>
          ))}

          {onExit && (
            <button className="nav-option nav-option-exit" onClick={onExit}>
              <span className="nav-option-icon">🏠</span>
              <div className="nav-option-text">
                <span className="nav-option-label">Main Menu</span>
                <span className="nav-option-desc">Leave the race</span>
              </div>
            </button>
          )}
        </div>
      </nav>
    </>
  );
}

export default NavPanel;
