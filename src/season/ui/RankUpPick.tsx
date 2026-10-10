// The rank-up pick (#646): a driver reached Pro / Ace / Legend; three cards
// (a stat jump, a trait, a wild card), keep one. Same strip as the pack pick.
import { useState } from 'react';
import { CardFace } from '../../cards/CardFace';
import type { Card } from '../../cards/types';
import { WILD_CARDS, wildOf, type RankName } from '../xp';

interface Props {
  driverName: string;
  rankName: RankName;
  cards: Card[];
  onPick: (cardId: string) => void;
  onDetail: (card: Card) => void;
}

export default function RankUpPick({ driverName, rankName, cards, onPick, onDetail }: Props) {
  const [pick, setPick] = useState<string | null>(null);
  const chosen = cards.find(c => c.id === pick) ?? null;
  const blurb = (c: Card) => { const w = wildOf(c.id); return w ? WILD_CARDS[w.wild].blurb : c.id.startsWith('jump-') ? 'A permanent stat jump.' : 'A trait, for good.'; };
  return (
    <section className="pp pp-rank" aria-label={`${driverName} is now ${rankName}: pick one of three`}>
      <div className="pp-head"><span className="rs-k">Rank-up · {driverName} is now {rankName} · keep one</span></div>
      <div className="pp-three" role="group" aria-label="Pick one of three">
        {cards.map(c => (
          <button key={c.id} type="button" className={`pp-card ${pick === c.id ? 'on' : pick ? 'off' : ''}`} aria-pressed={pick === c.id}
            onClick={() => { if (pick === c.id) onDetail(c); else setPick(c.id); }}>
            <CardFace card={c} size="small" flippable={false} />
          </button>
        ))}
      </div>
      <div className="pp-keep">
        <button type="button" className="rs-btn rs-btn-primary" disabled={!chosen} onClick={() => chosen && onPick(chosen.id)}>{chosen ? `Take ${chosen.name}` : 'Tap a card to pick it'}</button>
        <span className="rs-hint">{chosen ? blurb(chosen) : 'A stat jump, a trait, or a wild card. The other two go back.'}</span>
      </div>
    </section>
  );
}
