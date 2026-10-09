// Effect chips + the effect card (#243 legibility, #334 after tags).
// A chip per thing acting on a car mid-race — a track event, damage, a spin,
// cooked tyres, a pit-stop mood — lit while it's contributing. Click a chip
// for the card: what it is, what it does to the numbers, and why. The card
// reads the engine's effect stack, so it is the same truth the sim is using.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { EffectStackEntry } from '../../RaceEngine';

function pct(mult: number): string {
  const d = Math.round((mult - 1) * 100);
  return `${d > 0 ? '+' : ''}${d}%`;
}

/** Non-neutral contributions of one entry, as short labelled pills. */
export function effectPills(e: Pick<EffectStackEntry, 'speed' | 'consistency' | 'luck' | 'crash' | 'pit'>): { label: string; value: string; good: boolean }[] {
  const pills: { label: string; value: string; good: boolean }[] = [];
  if (e.speed !== 1) pills.push({ label: 'speed', value: pct(e.speed), good: e.speed > 1 });
  if (e.consistency !== 1) pills.push({ label: 'consistency', value: pct(e.consistency), good: e.consistency > 1 });
  if (e.luck !== 1) pills.push({ label: 'luck', value: pct(e.luck), good: e.luck > 1 });
  if (e.crash !== 0) pills.push({ label: 'crash risk', value: `${e.crash > 0 ? '−' : '+'}${Math.round(Math.abs(e.crash) * 100)}%`, good: e.crash > 0 });
  if (e.pit !== 1) pills.push({ label: 'pit stop', value: `${e.pit > 1 ? '+' : ''}${Math.round((e.pit - 1) * 100)}% time`, good: e.pit < 1 });
  return pills;
}

const SOURCE_LABELS: Record<EffectStackEntry['source'], string> = {
  effect: 'in-race effect', weather: 'weather', track: 'track character', track_event: 'track event',
  infliction: 'infliction', damage: 'damage', safety_car: 'safety car',
};

/** Card for one effect (track event, in-race effect, damage, weather). */
function EffectCard({ entry, anchor, onClose }: { entry: EffectStackEntry; anchor: DOMRect; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (ev: MouseEvent) => { if (ref.current && !ref.current.contains(ev.target as Node)) onClose(); };
    const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [onClose]);
  const width = 300;
  const left = Math.max(8, Math.min(anchor.left + anchor.width / 2 - width / 2, window.innerWidth - width - 8));
  const style: React.CSSProperties = { position: 'fixed', left, top: anchor.bottom + 8, width, zIndex: 1000 };
  const pills = effectPills(entry);
  return createPortal(
    <div ref={ref} className="tag-card" style={style} role="dialog" aria-label={`${entry.name}`}>
      <div className="tag-card-head">
        <span className="tag-card-emoji">{entry.emoji}</span>
        <div className="tag-card-title">
          <div className="tag-card-name">{entry.name}</div>
          <div className="tag-card-tier">{SOURCE_LABELS[entry.source]}</div>
        </div>
        <button type="button" className="tag-card-close" onClick={onClose} aria-label="Close">×</button>
      </div>
      <div className={`tag-card-status ${entry.active ? 'on' : 'off'}`}>
        <span className="tag-card-dot" />
        <span>{entry.active ? 'ACTIVE' : 'OVER'}</span>
        <span className="tag-card-reason">{entry.reason}</span>
      </div>
      <div className="tag-card-row tag-card-effects">
        <span className="tag-card-k">Effect</span>
        {pills.length === 0 ? <span className="tag-card-none">none on the numbers</span> : (
          <span className="effect-pills">
            {pills.map(p => <span key={p.label} className={`effect-pill ${p.good ? 'good' : 'bad'}`}><b>{p.value}</b> {p.label}</span>)}
          </span>
        )}
      </div>
    </div>,
    document.body
  );
}

/** Chips for the things that happened TO a car mid-race (Event column). */
export function EffectChips({ entries, max = 2 }: { entries: EffectStackEntry[]; max?: number }) {
  const [open, setOpen] = useState<{ id: string; rect: DOMRect } | null>(null);
  if (entries.length === 0) return <span className="muted-cell">—</span>;
  return (
    <span className="tag-chips">
      {entries.slice(0, max).map(e => {
        const key = `${e.source}-${e.id}`;
        return (
          <button
            key={key}
            type="button"
            className={`tag-chip active ${open?.id === key ? 'open' : ''}`}
            title={`${e.name} — ${e.reason}`}
            aria-label={e.name}
            onClick={(ev) => {
              ev.stopPropagation();
              const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
              setOpen(open?.id === key ? null : { id: key, rect });
            }}
          >
            {e.emoji}
          </button>
        );
      })}
      {open && (() => {
        const e = entries.find(x => `${x.source}-${x.id}` === open.id);
        return e ? <EffectCard entry={e} anchor={open.rect} onClose={() => setOpen(null)} /> : null;
      })()}
    </span>
  );
}
