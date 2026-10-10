// The compact card (Pax, Oct 9: "cards everywhere are so large… more square,
// more compact"): one square in the card's metal with its stat icon. Gear has a
// solid edge, a trait a dashed one. Tap for the full card. Scales to a long
// season's worth of cards in a table cell.
import type { CSSProperties } from 'react';
import { GameIcon } from '../icons/GameIcon';
import { STAT_ICONS } from '../icons/registry';
import type { Card } from './types';
import './CardChip.css';

interface Props {
  card: Card;
  size?: number;
  held?: boolean;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  style?: CSSProperties;
}

export function CardChip({ card, size = 28, held, onClick, draggable, onDragStart, style }: Props) {
  const cls = `card-chip metal-${card.rarity ?? 'none'} ${card.kind === 'trait' ? 'trait' : ''} ${held ? 'held' : ''}`;
  const icon = <GameIcon name={card.stats[0] ? STAT_ICONS[card.stats[0].stat] : 'card.trait'} size={Math.round(size * 0.64)} />;
  return onClick
    ? <button type="button" className={cls} style={{ width: size, height: size, ...style }} onClick={e => { e.stopPropagation(); onClick(); }} draggable={draggable} onDragStart={onDragStart} aria-label={card.rule ? `${card.name}: ${card.rule}` : card.name} title={card.rule ? `${card.name}: ${card.rule}` : card.name}>{icon}</button>
    : <span className={cls} style={{ width: size, height: size, ...style }} role="img" aria-label={card.rule ? `${card.name}: ${card.rule}` : card.name} title={card.rule ? `${card.name}: ${card.rule}` : card.name}>{icon}</span>;
}
