// The Parcel, opened (#704; Pax Oct 10: "tap, then Keep", in place, not a
// takeover; #778: it is face up when you arrive, and since Pax's Oct 17 steer
// it opens like a pack: brown paper, cream string, the typed label (League
// Issue · To: your garage, your town; the gift in midnight paper with gold
// string, the Watcher Box in black), the three stamps flipping in turn on
// the paper. Tap one to lift it (it rises, the other two sink; the rows it
// fits glow below), then say which card it goes on. A full card asks which
// stamp to scrape off first. Leaving the box shut is the dock's ghost
// button. Tap the lifted stamp again for its full face.
import { useEffect, useState } from 'react';
import { CardFace } from '../../cards/CardFace';
import { Star } from '../../look/Look';
import { CardChip } from '../../cards/CardChip';
import type { Card } from '../../cards/types';
import { isInk, GEAR_LIFE, type Parcel, type ParcelTier } from '../stamps';

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
  /** A smudged Parcel: what the smudge does, shown over the three. */
  smudgeLine?: string;
  /** The label's address: your garage, and "Zanesville, Ohio". */
  to?: { garage: string; place: string };
  /** Keep this stamp on that card; `replaces` when the card is full. */
  onKeep: (card: Card, target: string, replaces?: string) => void;
  /** The stamp lifted (or put down), so the table can glow. */
  onLift: (card: Card | null) => void;
  onDetail: (card: Card) => void;
}

export default function ParcelPick({ parcel, targets, smudgeLine, to, onKeep, onLift, onDetail }: Props) {
  // The three flip in turn (the pack's reveal): how many are face up so far.
  const [revealed, setRevealed] = useState(0);
  const faceUp = revealed >= parcel.cards.length;
  const [pick, setPick] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  useEffect(() => {
    const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setRevealed(parcel.cards.length); return; }
    const timers = parcel.cards.map((_, i) => setTimeout(() => setRevealed(n => Math.max(n, i + 1)), 350 + i * 180));
    return () => timers.forEach(clearTimeout);
  }, [parcel.cards.length]);
  const chosen = parcel.cards.find(c => c.id === pick) ?? null;
  const fitting = chosen ? targets.filter(t => t.fits(chosen)) : [];
  const onto = fitting.find(t => t.key === target) ?? null;
  const lift = (c: Card | null) => { setPick(c?.id ?? null); setTarget(null); onLift(c); };
  // The label, as the story has it (docs/story/stamps.md): the issue, the address, the sender.
  const issue = parcel.kind === 'gift' ? 'No Return Address' : parcel.kind === 'smudged' ? 'Watcher Box' : 'League Issue';
  const label = `${issue} · ${TIER_LABEL[parcel.tier]}`;
  const from = parcel.kind === 'gift' ? 'From:' : parcel.kind === 'smudged' ? 'From: the Watchers' : 'From: the League';

  return (
    <section className={`pp pp-pack tier-${parcel.tier} ${parcel.kind === 'gift' ? 'pp-gift' : parcel.kind === 'smudged' ? 'pp-curse' : ''}`.trim()} aria-label={`${label}: keep one of three stamps`}>
      <i className="pp-string v" aria-hidden="true" /><i className="pp-string h" aria-hidden="true" />
      <div className="pp-label" aria-hidden="true">
        <b>{issue.toUpperCase()} · {TIER_LABEL[parcel.tier].toUpperCase()}</b>
        {to && <span>To: {to.garage}, {to.place}</span>}
        <span>{from}</span>
      </div>
      <svg className="pp-post" width={30} height={30} viewBox="-15 -15 30 30" aria-hidden="true"><circle r={14} fill="var(--ace-paper)" stroke="var(--ace-ink)" strokeWidth={2} /><Star cx={0} cy={0} r={8} fill="var(--ace-ink)" /></svg>
      <div className="pp-three" role="group" aria-label="Pick one of three">
        {parcel.cards.map((c, i) => (
          <button
            key={c.id}
            type="button"
            className={`pp-card ${pick === c.id ? 'on' : pick ? 'off' : ''}`}
            disabled={!faceUp}
            aria-pressed={pick === c.id}
            onClick={() => { if (pick === c.id) onDetail(c); else lift(c); }}
          >
            <CardFace card={c} size="small" faceDown={i >= revealed} flippable={false} />
          </button>
        ))}
      </div>
      <div className="pp-foot ace-panel flat">
      <span className="ace-k">{label} · keep one stamp · {parcel.kind === 'gift' ? 'a friend upstairs sends their regards: the best odds' : parcel.kind === 'smudged' ? 'unlucky' : 'before every race'}</span>
      {smudgeLine && <p className="ace-note pp-smudge">{smudgeLine}</p>}
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
          <button type="button" className="ace-link" onClick={() => setTarget(null)}>Back</button>
        </div>
      ) : chosen ? (
        <div className="pp-ask" role="group" aria-label="Which card gets the stamp">
          <b>Stamp {chosen.name} on…</b>
          <span className="pp-ask-btns">
            {fitting.map(t => (
              <button key={t.key} type="button" className="ace-btn paper" onClick={() => (t.stamps.length >= t.slots ? setTarget(t.key) : onKeep(chosen, t.key))}>
                {t.label} <small>{t.stamps.length}/{t.slots}</small>
              </button>
            ))}
          </span>
          <span className="ace-note">{isInk(chosen) ? `Ink: twice the strength, fades after ${GEAR_LIFE} races.` : 'A Seal: pressed in, it keeps for the run.'} Tap it again for the full card.</span>
        </div>
      ) : (
        <p className="ace-note pp-keep">Tap a stamp to lift it; the other two go back. Or leave the box shut and go racing.</p>
      )}
      </div>
    </section>
  );
}
