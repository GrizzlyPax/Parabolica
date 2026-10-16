// CardFace (#418, docs/ICONS.md → Cards): the one way a deck card is drawn.
// "Almanac Plate" on a Slay the Spire layout: name banner over one centred
// icon on a metal-tinted window, a fixed-width type tag, the changes centred
// below, the deck number at the foot. The back is bold metal stripes and
// "ACE AMERICA · Base deck"; it hides nothing.
//
// Every size is the same 210 × 294 card scaled down, so stripes, edges and
// type keep their proportions. The mini is its own simple face (one centred
// icon) drawn at full size and scaled the same way. Tap flips your card to
// its back and again to flip it back: a fidget, not a reveal.
import { useState, type CSSProperties, type KeyboardEvent } from 'react';
import { levelDelta } from '../season/grades';
import { GameIcon } from '../icons/GameIcon';
import { STAT_ICONS } from '../icons/registry';
import { KIND_LABELS } from './CardMarks';
import { MOTORSPORT_DECK, STAT_LABELS } from './deck';
import type { Card } from './types';
import './CardFace.css';

export type CardSize = 'full' | 'small' | 'mini';

/** The card's full-size box; smaller sizes are this scaled. */
export const CARD_BOX = { w: 210, h: 294 } as const;
export const CARD_WIDTHS: Record<CardSize, number> = { full: 210, small: 108, mini: 40 };
export const cardHeight = (size: CardSize) => Math.round((CARD_WIDTHS[size] * CARD_BOX.h) / CARD_BOX.w);

const NUMBER = new Map(MOTORSPORT_DECK.map((c, i) => [c.id, i + 1]));
/** The card's place in its deck, "013". */
export function cardNumber(card: Card): string {
  return String(NUMBER.get(card.id) ?? 0).padStart(3, '0');
}

/** Long names get smaller instead of moving the layout (Pax, Oct 8). */
export function nameSize(name: string): number {
  const n = name.length;
  return n <= 16 ? 18 : n <= 24 ? 16 : n <= 32 ? 14 : 13;
}

const metalClass = (card: Card) => `metal-${card.rarity ?? 'none'}`;
/** Gear or trait at a glance (#526, Pax): the type tag is one icon per kind
 * instead of a word (every gear card shares the cog, traits the DNA), and a
 * trait's frame is dashed like its chip. */
export const kindIcon = (card: Card) => (card.kind === 'trait' ? 'card.trait' : card.kind === 'effect' ? 'card.effect' : 'card.gear');
const kindClass = (card: Card) => (card.kind === 'trait' ? 'cf-trait' : card.kind === 'effect' ? 'cf-effect' : 'cf-gear');
/** The art: the card's own icon (#699, the run deck's stamps); otherwise the first stat's icon; a card with no stat (a wild card, #646) wears the trait mark. */
export const artIcon = (card: Card) => card.iconId ?? (card.stats[0] ? STAT_ICONS[card.stats[0].stat] : card.rule ? 'card.rule' : 'card.trait');

/** Races an Ink stamp lasts when it is new (stamps.ts GEAR_LIFE; a test keeps them equal). */
export const INK_RACES = 3;
/** Where a card applies (card-names.md: the circle that replaced the type box): driver, car or garage. */
export const WHERE_ICON: Record<Card['target'], string> = { driver: 'full-motorcycle-helmet', car: 'race-car', team: 'mechanic-garage' };
const WHERE_LABEL: Record<Card['target'], string> = { driver: 'On a driver', car: 'On the car', team: 'On the garage' };

/** The corner badge (card-names.md, Pax Oct 10): races left on Ink (3 · 2 · 1, like a mana cost), the DNA mark on a Seal. */
function Corner({ card, left }: { card: Card; left?: number }) {
  if (card.kind === 'effect') return null;
  if (card.kind === 'trait') return <span className="cf-corner cf-corner-seal" title="Seal: keeps"><GameIcon name="card.trait" size={22} title="Seal" /></span>;
  const n = left ?? INK_RACES;
  return <span className="cf-corner cf-corner-ink" title={`Ink: ${n} race${n === 1 ? '' : 's'} left`}>{n}</span>;
}

function Face({ card, mini, left }: { card: Card; mini: boolean; left?: number }) {
  if (mini) return <div className="cf-miniface"><GameIcon name={artIcon(card)} size={120} /></div>;
  return (
    <div className="cf-rule">
      <Corner card={card} left={left} />
      <span className="cf-where" title={WHERE_LABEL[card.target]}><GameIcon name={WHERE_ICON[card.target]} size={20} title={`${KIND_LABELS[card.kind]} · ${WHERE_LABEL[card.target]}`} /></span>
      <div className="cf-banner"><span className="cf-name" style={{ '--cf-name': `${nameSize(card.name)}px` } as CSSProperties}>{card.name}</span></div>
      <div className="cf-art"><GameIcon name={artIcon(card)} size={70} /></div>
      <div className="cf-desc">
        {card.rule
          ? <div className="cf-rule-text"><span className="cf-rule-k">Rule</span>{card.rule}</div>
          : card.kind === 'effect'
          ? <div>{STAT_LABELS[card.stats[0].stat]} <b>{card.direction === 'up' ? '▲ up' : '▼ down'}</b></div>
          : card.stats.map(s => <div key={s.stat}><b>{levelDelta(s.pct)}</b> {STAT_LABELS[s.stat]}</div>)}
      </div>
      <div className="cf-no">{cardNumber(card)}</div>
    </div>
  );
}

function Back({ mini, card }: { mini: boolean; card: Card }) {
  return (
    <div className="cf-backrule">
      {!mini && (
        <span className="cf-plate">
          <b>ACE AMERICA</b>
          <span><GameIcon name="race.finish" size={10} />{card.deck === 'run' ? 'Run deck' : 'Base deck'}</span>
        </span>
      )}
    </div>
  );
}

export interface CardFaceProps {
  card: Card;
  size?: CardSize;
  /** Show the back (a rival's card, the locker deck, a card about to be revealed). */
  faceDown?: boolean;
  /** Tap to flip to the back and back again. On by default for face-up cards. */
  flippable?: boolean;
  className?: string;
  style?: CSSProperties;
  /** An Ink stamp's races left (the corner badge); absent = new (INK_RACES). */
  left?: number;
}

export function CardFace({ card, size = 'small', faceDown = false, flippable = !faceDown, className = '', style, left }: CardFaceProps) {
  const [flipped, setFlipped] = useState(false);
  const w = CARD_WIDTHS[size];
  const h = cardHeight(size);
  const mini = size === 'mini';
  const showBack = faceDown || flipped;
  const flip = () => { if (flippable) setFlipped(f => !f); };
  const onKey = (e: KeyboardEvent) => { if (flippable && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); flip(); } };
  const label = faceDown ? `Face-down ${card.rarity ?? 'effect'} card` : card.name;
  return (
    <div
      className={`card-face cf-${size} ${metalClass(card)} ${faceDown ? '' : kindClass(card)} ${showBack ? 'cf-flipped' : ''} ${flippable ? 'cf-tap' : ''} ${className}`.trim()}
      style={{ width: w, height: h, ...style }}
      {...(flippable ? { role: 'button', tabIndex: 0, onClick: flip, onKeyDown: onKey, 'aria-pressed': flipped } : { role: 'img' })}
      aria-label={label}
      title={faceDown ? undefined : card.id}
    >
      <div className="cf-scale" style={{ width: CARD_BOX.w, height: CARD_BOX.h, transform: `scale(${w / CARD_BOX.w})` }}>
        <div className="cf-in">
          <div className="cf-side cf-front" aria-hidden={showBack}>{!faceDown && <Face card={card} mini={mini} left={left} />}</div>
          <div className="cf-side cf-back"><Back card={card} mini={mini} /></div>
        </div>
      </div>
    </div>
  );
}

/** A rival's trait: its metal only. */
export function CardDot({ card }: { card: Card }) {
  return <span className={`card-dot ${metalClass(card)}`} role="img" aria-label={card.rarity ?? 'effect'} />;
}

/** An empty gear slot: a dashed card outline the size of a card. */
export function EmptySlot({ size = 'small', label }: { size?: CardSize; label?: string }) {
  return (
    <div className={`cf-empty cf-${size}`} style={{ width: CARD_WIDTHS[size], height: cardHeight(size) }} role="img" aria-label={label ?? 'Empty slot'}>
      {size !== 'mini' && <span>{label ?? 'Empty slot'}</span>}
    </div>
  );
}
