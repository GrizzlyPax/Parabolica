// Pick 1 of 3, in place (#552 follow-up, Pax Oct 10: "tap, then Keep", but
// not a full-screen takeover; he picked the strip at the top of the Paddock,
// mock-ups artifact EAybTMJgXGXAbBNxXK96Kf). The pack opens where it sits: three
// small cards flip, you tap one to lift it, then Keep. Gear goes to the locker;
// a trait asks once who gets it (valid targets only). The roster table stays
// in view underneath, so you can see who a card suits while you choose.
import { useEffect, useState } from 'react';
import { CardFace } from '../../cards/CardFace';
import type { Card } from '../../cards/types';
import type { PackTier } from '../pack';

const TIER_LABEL: Record<PackTier, string> = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', legendary: 'Legendary' };

interface Props {
  cards: Card[];
  tier: PackTier;
  /** Where a picked trait can go (its own target type only). Keys are the Paddock's row keys. */
  traitTargets: (card: Card) => { key: string; label: string }[];
  /** Keep this card: gear to the locker; a trait onto `target`. */
  onKeep: (card: Card, target?: string) => void;
  /** Tap the lifted card again for its full face. */
  onDetail: (card: Card) => void;
  onClose: () => void;
}

export default function PackPick({ cards, tier, traitTargets, onKeep, onDetail, onClose }: Props) {
  const [faceUp, setFaceUp] = useState(false);
  const [pick, setPick] = useState<string | null>(null);
  const [askTrait, setAskTrait] = useState(false);
  useEffect(() => {
    const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = setTimeout(() => setFaceUp(true), reduce ? 0 : 350);
    return () => clearTimeout(t);
  }, []);
  const chosen = cards.find(c => c.id === pick) ?? null;

  return (
    <section className={`pp tier-${tier}`} aria-label={`${TIER_LABEL[tier]} pack: keep one of three`}>
      <div className="pp-head">
        <span className="rs-k">Run deck · {TIER_LABEL[tier]} pack · keep one</span>
        <button type="button" className="rs-link" onClick={onClose}>Later</button>
      </div>
      <div className="pp-three" role="group" aria-label="Pick one of three">
        {cards.map(c => (
          <button
            key={c.id}
            type="button"
            className={`pp-card ${pick === c.id ? 'on' : pick ? 'off' : ''}`}
            disabled={!faceUp}
            aria-pressed={pick === c.id}
            onClick={() => { if (pick === c.id) onDetail(c); else { setPick(c.id); setAskTrait(false); } }}
          >
            <CardFace card={c} size="small" faceDown={!faceUp} flippable={false} />
          </button>
        ))}
      </div>
      {askTrait && chosen ? (
        <div className="pp-ask" role="group" aria-label="Who gets the trait">
          <b>Who gets {chosen.name}? It stays for good.</b>
          <span className="pp-ask-btns">
            {traitTargets(chosen).map(t => <button key={t.key} type="button" className="rs-btn" onClick={() => onKeep(chosen, t.key)}>{t.label}</button>)}
          </span>
          <button type="button" className="rs-link" onClick={() => setAskTrait(false)}>Back to the three</button>
        </div>
      ) : (
        <div className="pp-keep">
          <button
            type="button"
            className="rs-btn rs-btn-primary"
            disabled={!chosen}
            onClick={() => { if (!chosen) return; if (chosen.kind === 'trait') setAskTrait(true); else onKeep(chosen); }}
          >{chosen ? `Keep ${chosen.name}` : 'Tap a card to pick it'}</button>
          <span className="rs-hint">{chosen ? (chosen.kind === 'trait' ? 'A trait goes on for good; next you choose who gets it. Tap it again for the full card.' : 'Gear goes to your locker; equip it from the table any time. Tap it again for the full card.') : 'The other two go back.'}</span>
        </div>
      )}
    </section>
  );
}
