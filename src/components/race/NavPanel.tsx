// Navigation Panel - slide-in from left
// Allows switching between Track, Detail, and Standings views
import { useEffect, useRef } from 'react';
import type { NavPanelProps, RaceView } from './types';
import './NavPanel.css';
import { GameIcon } from '../../icons/GameIcon';

// View options configuration
const VIEW_OPTIONS: Array<{
  id: RaceView;
  icon: string;
  label: string;
  description: string;
}> = [
  {
    id: 'track',
    icon: 'view.track',
    label: 'Track View',
    description: 'Map + condensed timing tower',
  },
  {
    id: 'detail',
    icon: 'view.detail',
    label: 'Detail View',
    description: 'Full timing tower with all data',
  },
  {
    id: 'lap',
    icon: 'view.lapchart',
    label: 'Lap Chart',
    description: 'Position trace through the race',
  },
];

function NavPanel({ isOpen, activeView, onViewChange, onClose, onExit, exitLabel = 'Main Menu', exitDescription = 'Leave the race' }: NavPanelProps) {
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
            <GameIcon name="ui.close" size={16} />
          </button>
        </div>

        <div className="nav-panel-options">
          {VIEW_OPTIONS.map((option) => (
            <button
              key={option.id}
              className={`nav-option ${activeView === option.id ? 'active' : ''}`}
              onClick={() => handleViewSelect(option.id)}
            >
              <span className="nav-option-icon"><GameIcon name={option.icon} size={20} /></span>
              <div className="nav-option-text">
                <span className="nav-option-label">{option.label}</span>
                <span className="nav-option-desc">{option.description}</span>
              </div>
              {activeView === option.id && (
                <span className="nav-option-check"><GameIcon name="ui.done" size={16} /></span>
              )}
            </button>
          ))}

          {onExit && (
            <button className="nav-option nav-option-exit" onClick={onExit}>
              <span className="nav-option-icon"><GameIcon name="ui.home" size={20} /></span>
              <div className="nav-option-text">
                <span className="nav-option-label">{exitLabel}</span>
                <span className="nav-option-desc">{exitDescription}</span>
              </div>
            </button>
          )}
        </div>
      </nav>
    </>
  );
}

export default NavPanel;
