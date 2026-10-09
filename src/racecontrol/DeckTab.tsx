// Race Control → Deck (#403): the Motorsport base deck as a table. Every
// path (Quick Race, leagues, Season Mode, the lab) deals these at genesis.
import { useMemo, useState } from 'react';
import { MOTORSPORT_DECK, METAL_LADDER, type Card, type CardKind } from '../cards';
import { CardMarks, cardReadout, KIND_LABELS } from '../cards/CardMarks';
import { RARITIES } from '../cards/rarity';

const KINDS: (CardKind | 'all')[] = ['all', 'equipment', 'upgrade', 'facility', 'trait', 'effect'];

export function DeckTab() {
  const [kind, setKind] = useState<CardKind | 'all'>('all');
  const rows = useMemo(() => MOTORSPORT_DECK.filter(c => kind === 'all' || c.kind === kind), [kind]);
  return (
    <>
      <section className="rs-row rc-explain">
        <p><b>The card deck.</b> The Motorsport base deck: {MOTORSPORT_DECK.length} cards generated from the stat grid (src/cards/deck.ts). Every race deals trait cards at genesis and bakes them into the stats (src/cards/apply.ts); a card is arithmetic on a stat, so the stat's weight (Physics) is the card's weight.</p>
        <p className="rc-bands">Ladder: {RARITIES.map(r => <span key={r}><span className={`rarity-word rarity-${r}`}>{r}</span> {METAL_LADDER[r].stats} stat{METAL_LADDER[r].stats > 1 ? 's' : ''} × +{METAL_LADDER[r].pct} grade</span>)}</p>
      </section>
      <section className="rs-row">
        <div className="rs-row-head">
          <span className="rs-k">Cards <span className="gl-count">{rows.length}</span></span>
          <label className="rc-deck-filter"><span className="rs-k">Kind</span>
            <select className="gl-sort" value={kind} onChange={e => setKind(e.target.value as CardKind | 'all')}>
              {KINDS.map(k => <option key={k} value={k}>{k === 'all' ? 'all' : KIND_LABELS[k].toLowerCase()}</option>)}
            </select>
          </label>
        </div>
        <div className="rc-table-wrap">
          <table className="rc-table rc-compact rc-deck">
            <thead><tr><th>Card</th><th>Kind</th><th>On</th><th>Metal</th><th>Does</th><th>Sim</th></tr></thead>
            <tbody>{rows.map((c: Card) => (
              <tr key={c.id} title={c.id}>
                <td className="rc-tag"><CardMarks card={c} size={15} /> {c.name}</td>
                <td className="rc-dim">{KIND_LABELS[c.kind].toLowerCase()}</td>
                <td className="rc-dim">{c.target}</td>
                <td>{c.rarity ? <span className={`rc-rarity rarity-word rarity-${c.rarity}`}>{c.rarity}</span> : <span className="rc-dim">v0.6</span>}</td>
                <td className="rc-num">{cardReadout(c)}</td>
                <td className="rc-dim">in the stats</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>
    </>
  );
}
