// How a deck card reads on screen (#403): the kind mark, then one stat icon
// per stat, tinted by the card's metal (docs/ICONS.md → The look). Effects
// have no metal and show ▲/▼ instead of a percentage.
import { GameIcon } from '../icons/GameIcon';
import { CARD_KIND_ICONS, STAT_ICONS } from '../icons/registry';
import { STAT_LABELS } from './deck';
import type { Card, CardKind } from './types';

export const KIND_LABELS: Record<CardKind, string> = {
  equipment: 'Equipment', upgrade: 'Upgrade', facility: 'Facility', trait: 'Trait', effect: 'Effect',
};

export function cardColor(card: Card): string | undefined {
  return card.rarity ? `var(--rarity-${card.rarity})` : undefined;
}

/** "+10 Speed · +10 Consistency" (grade points), or "Speed ▲" for an effect. */
export function cardReadout(card: Card): string {
  if (card.kind === 'effect') return `${STAT_LABELS[card.stats[0].stat]} ${card.direction === 'up' ? '▲' : '▼'}`;
  return card.stats.map(s => `+${s.pct} ${STAT_LABELS[s.stat]}`).join(' · ');
}

export function CardMarks({ card, size = 16 }: { card: Card; size?: number }) {
  const color = cardColor(card);
  return (
    <span className="card-marks">
      <GameIcon name={CARD_KIND_ICONS[card.kind]} size={size} title={KIND_LABELS[card.kind]} />
      {card.stats.map(s => <GameIcon key={s.stat} name={STAT_ICONS[s.stat]} size={size} color={color} title={STAT_LABELS[s.stat]} />)}
    </span>
  );
}
