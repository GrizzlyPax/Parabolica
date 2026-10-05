// Race Complete strip (#200 / #245). Replaces the old finish modal: a slim
// bar under the header that matches the broadcast chrome, leaves the tower
// and map usable, and copies a balance-grade markdown report in one click.
import { useState } from 'react';
import type { Driver } from '../../RaceEngine';

interface RaceCompleteBarProps {
  podium: Driver[];           // finish order, at least the top 3
  dnfCount: number;
  fastestLap?: { driver: Driver; ticks: number } | null;
  seed: number | null;
  buildReport: () => string;
  onNextRace?: () => void;
  onExit?: () => void;
  exitLabel?: string;
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

export default function RaceCompleteBar({ podium, dnfCount, fastestLap, seed, buildReport, onNextRace, onExit, exitLabel = 'Menu' }: RaceCompleteBarProps) {
  const [copied, setCopied] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [showReport, setShowReport] = useState(false);
  const [report, setReport] = useState('');

  const doCopy = async () => {
    const md = buildReport();
    setReport(md);
    const ok = await copyText(md);
    setCopied(ok ? 'ok' : 'fail');
    if (!ok) setShowReport(true);
    setTimeout(() => setCopied('idle'), 2000);
  };

  return (
    <div className="race-complete">
      <div className="race-complete-bar">
        <span className="race-complete-flag" aria-hidden="true">🏁</span>
        <span className="race-complete-title">Race complete</span>
        <ol className="race-complete-podium" aria-label="Podium">
          {podium.slice(0, 3).map((d, i) => (
            <li key={d.id} className={`rc-p rc-p${i + 1}`}>
              <span className="rc-pos">{i + 1}</span>
              <span className="rc-marble" style={{ '--team-color': d.color } as React.CSSProperties}>{d.emoji}</span>
              <span className="rc-name" style={{ color: d.color }}>{d.name}</span>
            </li>
          ))}
        </ol>
        <span className="race-complete-facts">
          {fastestLap && <span className="rc-fact"><span className="rc-k">Fastest</span> <span style={{ color: fastestLap.driver.color }}>{fastestLap.driver.shortName}</span> {(fastestLap.ticks / 10).toFixed(1)}s</span>}
          <span className="rc-fact"><span className="rc-k">DNF</span> {dnfCount}</span>
          <span className="rc-fact"><span className="rc-k">Seed</span> {seed === null ? '—' : <code>{seed}</code>}</span>
        </span>
        <span className="race-complete-actions">
          <button type="button" className="rc-btn rc-btn-copy" onClick={doCopy}>
            {copied === 'ok' ? '✓ Copied' : copied === 'fail' ? 'Select below' : 'Copy report'}
          </button>
          <button type="button" className="rc-btn rc-btn-ghost" onClick={() => { if (!report) setReport(buildReport()); setShowReport(v => !v); }}>
            {showReport ? 'Hide' : 'View'}
          </button>
          {onNextRace && <button type="button" className="rc-btn rc-btn-primary" onClick={onNextRace}>Next race →</button>}
          {onExit && <button type="button" className="rc-btn rc-btn-ghost" onClick={onExit}>{exitLabel}</button>}
        </span>
      </div>
      {showReport && (
        <textarea className="race-complete-report" readOnly value={report} onFocus={e => e.currentTarget.select()} aria-label="Race report (markdown)" />
      )}
    </div>
  );
}
