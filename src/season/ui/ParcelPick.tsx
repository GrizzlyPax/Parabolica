// The Parcel, opened (#704; Pax Oct 10: "tap, then Keep", in place, not a
// takeover). Three stamps flip where the Parcel sits at the top of the
// Paddock; tap one to lift it (the rows it fits glow below), then say which
// card it goes on. A full card asks which stamp to scrape off first. The box
// can be left shut. Tap the lifted stamp again for its full face.
import { useEffect, useState } from 'react';
import { CardFace } from '../../cards/CardFace';
import { CardChip } from '../../cards/CardChip';
import type { Card } from '../../cards/types';
import type { Parcel, ParcelTier } from '../stamps';

const TIER_LABEL: Record<ParcelTier, string> = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', legendary: 'Legendary' };

/** A card a stamp can go on: a driver card or the car card. */
export interface StampTarget {
  key: string;
  label: string;
  stamps: Card[];
  slots: number;
  fits: (c: Card) => boolean;
}

interface Props {
  parcel: Parcel;
  targets: StampTarget[];
  /** Keep this stamp on that card; `replaces` when the card is full. */
  onKeep: (card: Card, target: string, replaces?: string) => void;
  /** Leave the Parcel shut: nothing kept. */
  onLeave: () => void;
  /** The stamp lifted (or put down), so the table can glow. */
  onLift: (card: Card | null) => void;
  onDetail: (card: Card) => void;
  onClose: () => void;
}

export default function ParcelPick({ parcel, targets, onKeep, onLeave, onLift, onDetail, onClose }: Props) {
  const [faceUp, setFaceUp] = useState(false);
  const [pick, setPick] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  useEffect(() => {
    const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = setTimeout(() => setFaceUp(true), reduce ? 0 : 350);
    return () => clearTimeout(t);
  }, []);
  const chosen = parcel.cards.find(c => c.id === pick) ?? null;
  const fitting = chosen ? targets.filter(t => t.fits(chosen)) : [];
  const onto = fitting.find(t => t.key === target) ?? null;
  const lift = (c: Card | null) => { setPick(c?.id ?? null); setTarget(null); onLift(c); };
  const label = parcel.kind === 'gift' ? 'A Parcel from upstairs' : `League issue · ${TIER_LABEL[parcel.tier]}`;

  return (
    <section className={`pp tier-${parcel.tier} ${parcel.kind === 'gift' ? 'pp-gift' : ''}`.trim()} aria-label={`${label}: keep one of three stamps`}>
      <div className="pp-head">
        <span className="rs-k">{label} · keep one stamp</span>
        <button type="button" className="rs-link" onClick={() => { lift(null); onClose(); }}>Later</button>
      </div>
      <div className="pp-three" role="group" aria-label="Pick one of three">
        {parcel.cards.map(c => (
          <button
            key={c.id}
            type="button"
            className={`pp-card ${pick === c.id ? 'on' : pick ? 'off' : ''}`}
            disabled={!faceUp}
            aria-pressed={pick === c.id}
            onClick={() => { if (pick === c.id) onDetail(c); else lift(c); }}
          >
            <CardFace card={c} size="small" faceDown={!faceUp} flippable={false} />
          </button>
        ))}
      </div>
      {chosen && onto && onto.stamps.length >= onto.slots ? (
        <div className="pp-ask" role="group" aria-label="Which stamp to scrape off">
          <b>{onto.label}'s card is full. Scrape one off for {chosen.name}:</b>
          <span className="pp-ask-btns">
            {onto.stamps.map(s => (
              <button key={s.id} type="button" className="pp-scrape" onClick={() => onKeep(chosen, onto.key, s.id)} aria-label={`Scrape off ${s.name}`}>
                <CardChip card={s} size={34} /><span>{s.name}</span>
              </button>
            ))}
          </span>
          <button type="button" className="rs-link" onClick={() => setTarget(null)}>Back</button>
        </div>
      ) : chosen ? (
        <div className="pp-ask" role="group" aria-label="Which card gets the stamp">
          <b>Stamp {chosen.name} on…</b>
          <span className="pp-ask-btns">
            {fitting.map(t => (
              <button key={t.key} type="button" className="rs-btn" onClick={() => (t.stamps.length >= t.slots ? setTarget(t.key) : onKeep(chosen, t.key))}>
                {t.label} <small>{t.stamps.length}/{t.slots}</small>
              </button>
            ))}
          </span>
          <span className="rs-hint">A stamp is for good. Tap it again for the full card; tap a glowing row to stamp it there.</span>
        </div>
      ) : (
        <div className="pp-keep">
          <span className="rs-hint">Tap a stamp to lift it. The other two go back.</span>
          <button type="button" className="rs-link" onClick={onLeave}>Leave the box shut</button>
        </div>
      )}
    </section>
  );
}
