// The masthead (#778; Pax, Oct 9: "the top of the race view is crushed
// together"). One row of cells: the run's words (the title you hold, the one
// you're going for, the race), Lap · Time · State, the controls (play, speed,
// skip, restart) and the way out. Under it the views as tabs (Track · Detail ·
// Lap chart) and the track: its name, kind, the weather, tyre wear, priority.
import { useEffect, useRef } from 'react';
import { ticksToTime } from '../../utils/raceTime';
import { GameIcon } from '../../icons/GameIcon';
import { WearPill } from '../../cards/WearPill';
import type { UniversalHeaderProps, SessionState, RaceSpeed, RaceView } from './types';
import './UniversalHeader.css';

const SESSION_STATES: Record<SessionState, { tone: string; label: string }> = {
  'qualifying': { tone: 'white', label: 'Qualifying' },
  'racing': { tone: 'green', label: 'Racing' },
  'safety-car': { tone: 'yellow', label: 'Safety car' },
  'final-lap': { tone: 'white', label: 'Final lap' },
  'finished': { tone: 'dim', label: 'Finished' },
};

const SPEED_OPTIONS: RaceSpeed[] = [0.5, 1, 2, 10];
const VIEWS: { id: RaceView; label: string }[] = [{ id: 'track', label: 'Track' }, { id: 'detail', label: 'Detail' }, { id: 'lap', label: 'Lap chart' }];

function UniversalHeader({
  currentLap,
  totalLaps,
  sessionState,
  trackName,
  trackKind,
  conditions,
  priority,
  tyreWear,
  elapsedTime,
  activeView,
  onViewChange,
  onExit,
  exitLabel = 'Menu',
  onSkip,
  liveBadge = false,
  isRunning = false,
  raceFinished = false,
  raceSpeed = 1,
  onStart,
  onStop,
  onReset,
  onSpeedChange,
  program,
  scope = 'all',
  onScopeChange,
  followName,
  hasMine = false,
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
        <div className="uh-program-cell">
          <span className="uh-k">Official program</span>
          <span className="uh-program">{program ?? 'Race day'}</span>
        </div>
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
            {onSkip && !raceFinished && <button type="button" className="uh-btn uh-skip" onClick={onSkip}>Skip to result</button>}
            {onReset && <button type="button" className="uh-btn uh-reset" onClick={onReset} aria-label="Restart the race"><GameIcon name="ui.restart" size={16} /></button>}
          </div>
        )}
        {onExit && <div className="uh-exit"><button type="button" className="ace-link" onClick={onExit}>{exitLabel}</button></div>}
      </div>
      <div className="uh-sub">
        <div className="uh-tabs" role="tablist" aria-label="Views">
          {VIEWS.map(v => (
            <button key={v.id} type="button" role="tab" className={`uh-tab ${activeView === v.id ? 'on' : ''}`} aria-selected={activeView === v.id} onClick={() => onViewChange(v.id)}>{v.label}</button>
          ))}
        </div>
        {onScopeChange && (
          <div className="uh-scope" role="group" aria-label="Who to watch">
            <button type="button" className={`uh-scope-btn ${scope === 'all' ? 'on' : ''}`} aria-pressed={scope === 'all'} onClick={() => onScopeChange('all')}>All</button>
            {hasMine && <button type="button" className={`uh-scope-btn ${scope === 'mine' ? 'on' : ''}`} aria-pressed={scope === 'mine'} onClick={() => onScopeChange('mine')}>Mine</button>}
            <button type="button" className={`uh-scope-btn ${scope === 'follow' ? 'on' : ''}`} aria-pressed={scope === 'follow'} onClick={() => onScopeChange('follow')}>Follow{followName ? ` · ${followName}` : ''}</button>
          </div>
        )}
        <span className="uh-track"><b>{trackName}</b>{trackKind ? <span className="uh-kind"> · {trackKind}</span> : null}{weather ? <span className="uh-weather"> · {weather}</span> : null}</span>
        <WearPill tyreWear={tyreWear} />
        {priority && priority.length > 0 && <span className="uh-prio" title="Everyone gets these levels on these stats here">Priority: {priority.join(' · ')}</span>}
      </div>
    </header>
  );
}

export default UniversalHeader;
