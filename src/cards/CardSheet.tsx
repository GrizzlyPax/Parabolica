// The card sheet (#331, re-skinned as cards in #418): one racer's cards as a
// hand, a pile and a deck. Gear is the hand (one equipment, upgrade and
// facility slot; an empty slot is a dashed card outline) · Traits are a pile
// (tap to spread) · Effects are empty until v0.6 · the team Locker is a
// face-down deck with a count (tap to spread).
//
// A rival's sheet shows card backs for gear, metal dots for traits and the
// locker as a face-down deck (docs/ICONS.md → Cards). Standalone: the Paddock
// (#319) wires it in; the screen sets teamThemeVars(team) on its root.
import { useState, type ReactNode } from 'react';
import { TeamLogo, type TeamLike } from '../icons/GameIcon';
import { CardDot, CardFace, EmptySlot, CARD_WIDTHS } from './CardFace';
import { KIND_LABELS } from './CardMarks';
import { slotsFor } from './deck';
import type { Card, CardKind } from './types';
import './CardSheet.css';

export interface CardSheetData {
  driver: { name: string; number?: number; traits: Card[]; equipment: Card | null; benched?: boolean };
  car: { name: string; traits: Card[]; upgrade: Card | null };
  team: TeamLike & { name: string; traits: Card[]; facility: Card | null; locker: Card[] };
  /** Timed effects (v0.6). Empty for now. */
  effects?: Card[];
}

export type SheetView = 'mine' | 'rival';

function Group({ label, count, hint, children }: { label: string; count?: number; hint?: string; children: ReactNode }) {
  return (
    <section className="cs-group">
      <div className="cs-k"><span>{label}{count !== undefined && <span className="cs-count">{count}</span>}</span>{hint && <span className="cs-hint">{hint}</span>}</div>
      {children}
    </section>
  );
}

/** Traits as an offset pile; tap it to spread the cards into a row. */
function Pile({ cards }: { cards: Card[] }) {
  const [spread, setSpread] = useState(false);
  if (spread || cards.length < 2) return <div className="cs-row">{cards.map(c => <CardFace key={c.id} card={c} />)}</div>;
  const step = 34;
  return (
    <button type="button" className="cs-pile" style={{ width: CARD_WIDTHS.small + step * (cards.length - 1) }} onClick={() => setSpread(true)} aria-label={`${cards.length} traits; spread them`}>
      {cards.map((c, i) => <CardFace key={c.id} card={c} flippable={false} style={{ position: 'absolute', left: i * step, top: 0, zIndex: i + 1 }} />)}
    </button>
  );
}

/** The locker as a face-down deck with a count; yours spreads face up on tap. */
function LockerDeck({ cards, view }: { cards: Card[]; view: SheetView }) {
  const [spread, setSpread] = useState(false);
  if (spread && view === 'mine') {
    return (
      <div className="cs-row">
        {cards.map(c => <CardFace key={c.id} card={c} />)}
        <button type="button" className="rs-link cs-stack" onClick={() => setSpread(false)}>Stack</button>
      </div>
    );
  }
  const shown = cards.slice(0, 3);
  const deck = (
    <>
      {shown.map((c, i) => <CardFace key={c.id} card={c} faceDown style={{ position: 'absolute', left: i * 4, top: i * 4, zIndex: i + 1 }} />)}
      <span className="cs-deckcount">{cards.length}</span>
    </>
  );
  const size = { width: CARD_WIDTHS.small + 4 * (shown.length - 1), height: 151 + 4 * (shown.length - 1) };
  return view === 'mine'
    ? <button type="button" className="cs-deck" style={size} onClick={() => setSpread(true)} aria-label={`Locker: ${cards.length} cards; spread them`}>{deck}</button>
    : <div className="cs-deck" style={size} role="img" aria-label={`Locker: ${cards.length} cards`}>{deck}</div>;
}

function Slot({ kind, holder, card, view }: { kind: CardKind; holder: string; card: Card | null; view: SheetView }) {
  const size = view === 'rival' ? 'mini' : 'small';
  return (
    <div className="cs-slot">
      <span className="cs-slot-k">{KIND_LABELS[kind]}<span className="cs-slot-holder"> · {holder}</span></span>
      {card ? <CardFace card={card} size={size} faceDown={view === 'rival'} /> : <EmptySlot size={size} label={`Empty ${kind} slot`} />}
    </div>
  );
}

export function CardSheet({ data, view = 'mine' }: { data: CardSheetData; view?: SheetView }) {
  const { driver, car, team } = data;
  const effects = data.effects ?? [];
  const traits = [...driver.traits, ...car.traits, ...team.traits];
  const slots = slotsFor(traits);
  const free = [driver.equipment, car.upgrade, team.facility].filter(g => !g).length;
  return (
    <article className={`card-sheet view-${view}`} aria-label={`${driver.name} card sheet`}>
      <header className="cs-head">
        <TeamLogo team={team} size={30} />
        <span className="cs-who">
          <span className="cs-name">{driver.number !== undefined && <span className="cs-num">#{driver.number}</span>}{driver.name}</span>
          <span className="cs-team">{team.name} · {car.name}</span>
        </span>
        {driver.benched && <span className="cs-bench">Bench</span>}
      </header>
      {driver.benched && <p className="cs-note">Sits out this race (no points) and keeps their gear.</p>}

      <Group label="Gear" hint={`${free} of ${slots.equipment + slots.upgrade + slots.facility} slots free`}>
        <div className="cs-hand">
          <Slot kind="equipment" holder="driver" card={driver.equipment} view={view} />
          <Slot kind="upgrade" holder="car" card={car.upgrade} view={view} />
          <Slot kind="facility" holder="team" card={team.facility} view={view} />
        </div>
      </Group>

      <Group label="Traits" count={traits.length} hint={view === 'mine' && traits.length > 1 ? 'tap to spread' : undefined}>
        {!traits.length
          ? <p className="cs-empty">No traits.</p>
          : view === 'rival'
            ? <div className="cs-dots">{traits.map(c => <CardDot key={c.id} card={c} />)}</div>
            : <Pile cards={traits} />}
      </Group>

      <Group label="Effects" count={effects.length}>
        {effects.length
          ? <div className="cs-row">{effects.map(c => <CardFace key={c.id} card={c} faceDown={view === 'rival'} />)}</div>
          : <p className="cs-empty">None. Effects arrive in v0.6 (dealt by the race).</p>}
      </Group>

      <Group label="Locker" count={team.locker.length} hint={view === 'mine' && team.locker.length ? 'tap to spread' : undefined}>
        {team.locker.length
          ? <LockerDeck cards={team.locker} view={view} />
          : <p className="cs-empty">Empty. Swapped-out gear lands here; move it in any Paddock.</p>}
      </Group>
    </article>
  );
}
