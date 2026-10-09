// The finish sheet (#521, Pax picked A: https://claude.ai/artifact/CFXysCjJoUCrncy2qoKmK8).
// When the flag drops a sheet slides up from the bottom: a 2-1-3 podium in team
// colours, your drivers with their points (Season), the race facts, and the way
// on. Hide it to watch the cool-down; a slim bar at the bottom brings it back.
// Replaces the Race Complete strip (#200 / #245), which sat at the very top.
import { useState } from 'react';
import type { Driver } from '../../RaceEngine';
import { GameIcon } from '../../icons/GameIcon';
import { RaceNumber } from '../../icons/RaceNumber';
import { inkFor } from '../../icons/ink';
import { F1_POINTS } from '../../types/season';

interface FinishSheetProps {
  /** Finish order, classified first. */
  podium: Driver[];
  drivers: Driver[];
  dnfCount: number;
  fastestLap?: { driver: Driver; ticks: number } | null;
  seed: number | null;
  trackName?: string;
  /** Season: your racing drivers (shown with their points). */
  mine?: readonly number[];
  buildReport: () => string;
  onNextRace?: () => void;
  onExit?: () => void;
  exitLabel?: string;
  /** Fantasy points this race, per team (Quick Race). */
  fantasy?: { name: string; color: string; points: number }[];
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

const num = (d: Driver, size: number) => (
  <RaceNumber n={d.number ?? '–'} color={d.color} ink={d.ink ?? inkFor(d.color)} size={size} shape="square" />
);

export default function FinishSheet({ podium, drivers, dnfCount, fastestLap, seed, trackName, mine, buildReport, onNextRace, onExit, exitLabel = 'Menu', fantasy }: FinishSheetProps) {
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [report, setReport] = useState<string | null>(null);

  const doCopy = async () => {
    const md = buildReport();
    const ok = await copyText(md);
    setCopied(ok ? 'ok' : 'fail');
    if (!ok) setReport(md);
    setTimeout(() => setCopied('idle'), 2000);
  };

  const top = podium.slice(0, 3);
  const winner = top[0];
  const placeOf = (id: number) => podium.findIndex(d => d.id === id) + 1;
  const yours = (mine ?? []).map(id => drivers.find(d => d.id === id)).filter((d): d is Driver => !!d)
    .sort((a, b) => (a.status === 'dnf' ? 99 : placeOf(a.id)) - (b.status === 'dnf' ? 99 : placeOf(b.id)));
  // The primary button: Season goes back to the Paddock; Quick Race runs the next race.
  const primary = onNextRace ? { label: 'Next race', go: onNextRace } : onExit ? { label: exitLabel === 'Paddock' ? 'To the Paddock' : exitLabel, go: onExit } : null;
  const secondaryExit = onNextRace && onExit ? { label: exitLabel, go: onExit } : null;

  if (!open) {
    return (
      <button type="button" className="fs-bar" onClick={() => setOpen(true)} aria-label="Show race results">
        <GameIcon name="race.finish" size={16} />
        <span className="fs-bar-text">Race complete{winner ? <> · <b>{winner.name}</b> wins</> : null}</span>
        <span className="fs-bar-cta">Results</span>
      </button>
    );
  }

  return (
    <section className="fs" role="dialog" aria-label="Race complete">
      <button type="button" className="fs-grab" onClick={() => setOpen(false)} aria-label="Hide results to watch the cool-down" />
      <div className="fs-head">
        <GameIcon name="race.finish" size={18} />
        <span className="fs-k">Race complete{trackName ? ` · ${trackName}` : ''}</span>
        <button type="button" className="fs-hide" onClick={() => setOpen(false)}>Hide</button>
      </div>

      <ol className="fs-podium" aria-label="Podium">
        {[top[1], top[0], top[2]].map((d, i) => d && (
          <li key={d.id} className={`fs-step fs-p${[2, 1, 3][i]}`}>
            <span className="fs-who">
              {num(d, [2, 1, 3][i] === 1 ? 30 : 24)}
              <span className="fs-nm">{d.name}</span>
              {d.teamName && <span className="fs-tm">{d.teamName}</span>}
            </span>
            <span className="fs-block">{[2, 1, 3][i]}</span>
          </li>
        ))}
      </ol>

      {yours.length > 0 && (
        <div className="fs-yours">
          <span className="fs-k">Your drivers</span>
          {yours.map(d => {
            const dnf = d.status === 'dnf';
            const p = placeOf(d.id);
            const pts = dnf ? 0 : F1_POINTS[p - 1] ?? 0;
            return (
              <div key={d.id} className={`fs-yrow ${dnf ? 'dnf' : pts === 0 ? 'zero' : ''}`}>
                <span className="fs-pos">{dnf ? 'DNF' : `P${p}`}</span>
                {num(d, 22)}
                <span className="fs-ynm">{d.name}</span>
                <span className="fs-pts">{pts > 0 ? `+${pts}` : '0'}</span>
              </div>
            );
          })}
        </div>
      )}

      {fantasy && fantasy.length > 0 && (
        <div className="fs-fantasy" aria-label="Fantasy points this race">
          {fantasy.map(t => (
            <span key={t.name} className="fs-fantasy-team" style={{ '--fantasy-color': t.color } as React.CSSProperties}>
              <span className="fantasy-badge">{t.name}</span> <b>{t.points}</b>
            </span>
          ))}
        </div>
      )}

      <div className="fs-facts">
        {fastestLap && <span><span className="fs-k">Fastest</span> <b>{fastestLap.driver.shortName}</b> {(fastestLap.ticks / 10).toFixed(1)}s</span>}
        <span><span className="fs-k">DNF</span> <b>{dnfCount}</b></span>
        {seed !== null && <span><span className="fs-k">Seed</span> {seed}</span>}
      </div>

      <div className="fs-btns">
        {primary && <button type="button" className="fs-btn fs-btn-primary" onClick={primary.go}>{primary.label}</button>}
        {secondaryExit && <button type="button" className="fs-btn" onClick={secondaryExit.go}>{secondaryExit.label}</button>}
      </div>
      <div className="fs-links">
        <button type="button" className="fs-link" onClick={doCopy}>{copied === 'ok' ? <><GameIcon name="ui.done" size={12} /> Copied</> : copied === 'fail' ? 'Select the report below' : <><GameIcon name="ui.copy" size={12} /> Copy report</>}</button>
        <button type="button" className="fs-link" onClick={() => setReport(r => (r === null ? buildReport() : null))}>{report === null ? 'View report' : 'Hide report'}</button>
      </div>
      {report !== null && (
        <textarea className="fs-report" readOnly value={report} onFocus={e => e.currentTarget.select()} aria-label="Race report (markdown)" />
      )}
    </section>
  );
}
