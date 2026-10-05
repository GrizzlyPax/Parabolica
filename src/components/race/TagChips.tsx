// Tag chips + the tag card (#243 legibility).
// A chip per tag in the driver's stack: lit when it's contributing this tick,
// dim when it isn't. Click a chip for the card: what the tag is, what it does
// to the numbers, and WHY it is (or isn't) active right now. The card reads
// the engine's effect stack, so it is the same truth the sim is using.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { EffectStackEntry } from '../../RaceEngine';
import { Tag, TIER_LABELS, TRIGGER_LABELS, describeCondition } from '../../data/tags';

interface TagChipsProps {
  tags: Tag[];
  /** From the engine's getEffectStack — entries with source 'tag'. */
  stack?: EffectStackEntry[];
  max?: number;
}

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

/** The full definition's effects (not the live ones), for the card. */
function definitionPills(tag: Tag) {
  const fx = tag.effects;
  return effectPills({ speed: fx.speedModifier ?? 1, consistency: fx.consistencyModifier ?? 1, luck: fx.luckModifier ?? 1, crash: fx.crashResistance ?? 0, pit: fx.pitSpeedModifier ?? 1 });
}

function TagCard({ tag, entry, anchor, onClose }: { tag: Tag; entry?: EffectStackEntry; anchor: DOMRect; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (ev: MouseEvent) => { if (ref.current && !ref.current.contains(ev.target as Node)) onClose(); };
    const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [onClose]);

  // Place below the chip, clamped to the viewport.
  const width = 300;
  const left = Math.max(8, Math.min(anchor.left + anchor.width / 2 - width / 2, window.innerWidth - width - 8));
  const below = anchor.bottom + 8;
  const style: React.CSSProperties = { position: 'fixed', left, top: below, width, zIndex: 1000 };

  const pills = definitionPills(tag);
  const active = entry?.active ?? (tag.trigger === 'passive' && !tag.condition);
  const when = tag.condition ? `while ${describeCondition(tag.condition)}` : TRIGGER_LABELS[tag.trigger];
  const chance = tag.triggerChance !== undefined && tag.triggerChance < 1 ? ` · ${Math.round(tag.triggerChance * 100)}% chance` : '';

  return createPortal(
    <div ref={ref} className="tag-card" style={style} role="dialog" aria-label={`${tag.name} tag`}>
      <div className="tag-card-head">
        <span className="tag-card-emoji">{tag.emoji}</span>
        <div className="tag-card-title">
          <div className="tag-card-name">{tag.name}</div>
          <div className="tag-card-tier">{TIER_LABELS[tag.tier]} · {tag.target} tag</div>
        </div>
        <button type="button" className="tag-card-close" onClick={onClose} aria-label="Close">×</button>
      </div>
      <p className="tag-card-desc">{tag.description}</p>
      <div className={`tag-card-status ${active ? 'on' : 'off'}`}>
        <span className="tag-card-dot" />
        <span>{active ? 'ACTIVE' : 'DORMANT'}</span>
        <span className="tag-card-reason">{entry ? entry.reason : when}</span>
      </div>
      <div className="tag-card-row"><span className="tag-card-k">Fires</span><span>{when}{chance}</span></div>
      <div className="tag-card-row tag-card-effects">
        <span className="tag-card-k">Effect</span>
        {pills.length === 0 ? (
          <span className="tag-card-none">none on the numbers — story only</span>
        ) : (
          <span className="effect-pills">
            {pills.map(p => <span key={p.label} className={`effect-pill ${p.good ? 'good' : 'bad'}`}><b>{p.value}</b> {p.label}</span>)}
          </span>
        )}
      </div>
      {tag.activationText && <div className="tag-card-row"><span className="tag-card-k">Feed</span><span className="tag-card-quote">“…{tag.activationText}”</span></div>}
    </div>,
    document.body
  );
}

const SOURCE_LABELS: Record<EffectStackEntry['source'], string> = {
  tag: 'tag', weather: 'weather', track: 'track character', track_event: 'track event',
  infliction: 'infliction', damage: 'damage', safety_car: 'safety car',
};

/** Card for any non-tag effect (track event, infliction, damage, weather). */
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

export default function TagChips({ tags, stack, max = 4 }: TagChipsProps) {
  const [open, setOpen] = useState<{ id: string; rect: DOMRect } | null>(null);
  if (tags.length === 0) return <span className="muted-cell">—</span>;
  const byId = new Map((stack ?? []).filter(e => e.source === 'tag').map(e => [e.id, e]));
  return (
    <span className="tag-chips">
      {tags.slice(0, max).map(tag => {
        const entry = byId.get(tag.id);
        const active = entry ? entry.active : (tag.trigger === 'passive' && !tag.condition);
        return (
          <button
            key={tag.id}
            type="button"
            className={`tag-chip ${active ? 'active' : 'dormant'} ${open?.id === tag.id ? 'open' : ''}`}
            title={`${tag.name} — ${entry?.reason ?? tag.description}`}
            aria-label={`${tag.name}, ${active ? 'active' : 'dormant'}`}
            onClick={(e) => {
              e.stopPropagation();
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              setOpen(open?.id === tag.id ? null : { id: tag.id, rect });
            }}
          >
            {tag.emoji}
          </button>
        );
      })}
      {open && (() => {
        const tag = tags.find(t => t.id === open.id);
        return tag ? <TagCard tag={tag} entry={byId.get(tag.id)} anchor={open.rect} onClose={() => setOpen(null)} /> : null;
      })()}
    </span>
  );
}
