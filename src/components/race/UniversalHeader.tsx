// The race header (Pax, Oct 9: "the top of the race view is crushed together").
// A scoreboard, like the Paddock's tables: one row of cells (menu · Lap · Time ·
// State · controls), then the track and its priority stats underneath.
import { useEffect, useRef } from 'react';
import { ticksToTime } from '../../utils/raceTime';
import { GameIcon } from '../../icons/GameIcon';
import type { UniversalHeaderProps, SessionState, RaceSpeed } from './types';
import './UniversalHeader.css';

const SESSION_STATES: Record<SessionState, { tone: string; label: string }> = {
  'qualifying': { tone: 'white', label: 'Qualifying' },
  'racing': { tone: 'green', label: 'Racing' },
  'safety-car': { tone: 'yellow', label: 'Safety car' },
  'final-lap': { tone: 'white', label: 'Final lap' },
  'finished': { tone: 'dim', label: 'Finished' },
};

const SPEED_OPTIONS: RaceSpeed[] = [0.5, 1, 2, 10];

function UniversalHeader({
  currentLap,
  totalLaps,
  sessionState,
  trackName,
  conditions,
  priority,
  elapsedTime,
  onMenuOpen,
  liveBadge = false,
  isRunning = false,
  raceFinished = false,
  raceSpeed = 1,
  onStart,
  onStop,
  onReset,
  onSpeedChange,
}: UniversalHeaderProps) {
  const state = SESSION_STATES[sessionState];
  // Publish the header's height so the phone layout can pin the track right under it.
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const set = () => document.documentElement.style.setProperty('--uh-height', `${Math.round(el.getBoundingClientRect().height)}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const hasControls = !!(onStart || onStop);
  const weather = (conditions ?? []).map(c => c.label).join(' · ');

  return (
    <header className="uh" ref={ref}>
      <div className="uh-cells">
        <button type="button" className="uh-menu" onClick={onMenuOpen} aria-label="Open navigation menu"><span className="uh-burger" /></button>
        <div className="uh-cell">
          <span className="uh-k">Lap</span>
          <span className="uh-v uh-lap"><b>{currentLap}</b>/{totalLaps}</span>
        </div>
        <div className="uh-cell">
          <span className="uh-k">Time</span>
          <span className="uh-v">{ticksToTime(elapsedTime)}</span>
        </div>
        <div className="uh-cell">
          <span className="uh-k">{liveBadge ? 'Live' : 'State'}</span>
          <span className={`uh-state tone-${liveBadge && !raceFinished ? 'red' : state.tone}`}>{state.label}</span>
        </div>
        {hasControls && (
          <div className="uh-ctl">
            {isRunning
              ? <button type="button" className="uh-btn" onClick={onStop} aria-label="Pause"><GameIcon name="ui.pause" size={16} /></button>
              : <button type="button" className="uh-btn" onClick={onStart} disabled={raceFinished} aria-label="Play"><GameIcon name="ui.play" size={16} /></button>}
            <button
              type="button"
              className="uh-btn uh-speed"
              onClick={() => { const i = SPEED_OPTIONS.indexOf(raceSpeed); onSpeedChange?.(SPEED_OPTIONS[(i + 1) % SPEED_OPTIONS.length]); }}
              aria-label={`Speed ${raceSpeed}x, tap to change`}
            >{raceSpeed}×</button>
            {onReset && <button type="button" className="uh-btn uh-reset" onClick={onReset} aria-label="Restart the race"><GameIcon name="ui.restart" size={16} /></button>}
          </div>
        )}
      </div>
      <div className="uh-sub">
        <span className="uh-track">{trackName}{weather ? <span className="uh-weather"> · {weather}</span> : null}</span>
        {priority && priority.length > 0 && <span className="uh-prio" title="Next to these stats, everyone gets +10% here">Priority: {priority.join(' · ')}</span>}
      </div>
    </header>
  );
}

export default UniversalHeader;
