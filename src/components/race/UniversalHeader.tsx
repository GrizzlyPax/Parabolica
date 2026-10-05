// Universal Header - appears on all race views
// Shows race context: lap counter, session state, track info, race controls
import { ticksToTime } from '../../utils/raceTime';
import type { UniversalHeaderProps, SessionState, RaceSpeed } from './types';
import './UniversalHeader.css';

// Session state colors and icons
const SESSION_STATES: Record<SessionState, { color: string; label: string }> = {
  'racing': { color: '#22c55e', label: 'Racing' },
  'safety-car': { color: '#eab308', label: 'Safety Carl' },
  'final-lap': { color: '#f8f8f8', label: 'Final Lap' },
  'finished': { color: '#888', label: 'Finished' },
};

const SPEED_OPTIONS: RaceSpeed[] = [0.5, 1, 2, 10];

function UniversalHeader({
  currentLap,
  totalLaps,
  sessionState,
  trackName,
  trackEmoji,
  trackFlagEmoji,
  conditions,
  elapsedTime,
  onMenuOpen,
  liveBadge = false,
  // Race controls
  isRunning = false,
  raceFinished = false,
  raceSpeed = 1,
  onStart,
  onStop,
  onReset,
  onSpeedChange,
}: UniversalHeaderProps) {
  const stateConfig = SESSION_STATES[sessionState];
  const hasControls = onStart || onStop || onReset;

  return (
    <header className="universal-header">
      {/* Left: Menu button */}
      <button
        className="header-menu-btn"
        onClick={onMenuOpen}
        aria-label="Open navigation menu"
      >
        <span className="menu-icon">☰</span>
      </button>

      {/* Center: Race info */}
      <div className="header-race-info">
        {/* Top row: Lap counter and session state */}
        <div className="header-top-row">
          <span className="lap-counter">
            Lap <strong>{currentLap}</strong> / {totalLaps}
          </span>

          <span
            className={`session-state state-${sessionState}`}
            style={{ '--state-color': stateConfig.color } as React.CSSProperties}
          >
            <span className="state-dot" />
            {stateConfig.label}
          </span>
        </div>

        {/* Bottom row: Track name, ambient conditions, elapsed time */}
        <div className="header-bottom-row">
          <span className="track-name">
            {trackEmoji} {trackName} {trackFlagEmoji}
          </span>
          {conditions && conditions.length > 0 && (
            <span className="header-conditions">
              {conditions.map(c => (
                <span key={c.label} className="condition-chip" title={c.label}>
                  {c.emoji} <span className="condition-chip-label">{c.label}</span>
                </span>
              ))}
            </span>
          )}
          <span className="elapsed-time">
            {ticksToTime(elapsedTime)}
          </span>
        </div>
      </div>

      {/* Right: LIVE badge (broadcast) or race controls */}
      {liveBadge && (
        <div className="header-controls">
          <span className="live-badge"><span className="live-dot" /> LIVE</span>
        </div>
      )}
      {hasControls && (
        <div className="header-controls">
          {/* Play/Pause button */}
          {isRunning ? (
            <button
              className="control-btn control-stop"
              onClick={onStop}
              title="Pause"
            >
              ⏸
            </button>
          ) : (
            <button
              className="control-btn control-start"
              onClick={onStart}
              disabled={raceFinished}
              title="Play"
            >
              ▶
            </button>
          )}

          {/* Reset button */}
          <button
            className="control-btn control-reset"
            onClick={onReset}
            title="Reset"
          >
            ↺
          </button>

          {/* Phones: one button that cycles the speed (the full strip is hidden) */}
          <button
            type="button"
            className="speed-cycle-btn"
            onClick={() => {
              const i = SPEED_OPTIONS.indexOf(raceSpeed);
              onSpeedChange?.(SPEED_OPTIONS[(i + 1) % SPEED_OPTIONS.length]);
            }}
            title="Change speed"
            aria-label={`Speed ${raceSpeed}x, tap to change`}
          >
            {raceSpeed}x
          </button>

          {/* Speed control */}
          <div className="speed-control">
            {SPEED_OPTIONS.map(speed => (
              <button
                key={speed}
                className={`speed-btn ${raceSpeed === speed ? 'active' : ''}`}
                onClick={() => onSpeedChange?.(speed)}
                title={`${speed}x speed`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

export default UniversalHeader;
