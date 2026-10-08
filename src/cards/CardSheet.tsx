// The card sheet (#331): one racer's cards, grouped by kind. Traits (driver,
// car, team) · Gear (one equipment, upgrade and facility slot; empty slots
// show) · Effects (empty until v0.6) · the team Locker (unequipped gear).
//
// Your own sheet shows every card as a chip in its metal; a rival's sheet
// shows metal dots only (matches the draft board, Pax Oct 8). Phone first, in
// The look. Standalone: the Paddock (#319) and the race focus panel wire it
// in later; the screen sets teamThemeVars(team) on its root.
import type { ReactNode } from 'react';
import { GameIcon, TeamLogo, type TeamLike } from '../icons/GameIcon';
import { CARD_KIND_ICONS } from '../icons/registry';
import { CardMarks, cardReadout, KIND_LABELS } from './CardMarks';
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

/** A card as a chip in its metal: kind + stat icons, name, metal word, what it does. */
export function CardChip({ card }: { card: Card }) {
  return (
    <div className={`cs-chip ${card.rarity ? `metal-${card.rarity}` : 'metal-none'}`} title={card.id}>
      <CardMarks card={card} size={16} />
      <span className="cs-chip-text">
        <span className="cs-chip-name">{card.name}</span>
        <span className="cs-chip-sub">
          {card.rarity && <span className={`cs-metal rarity-word rarity-${card.rarity}`}>{card.rarity}</span>}
          <span className="cs-chip-does">{cardReadout(card)}</span>
        </span>
      </span>
    </div>
  );
}

/** A rival's card: just its metal. */
function MetalDot({ card }: { card: Card }) {
  return <span className={`cs-dot ${card.rarity ? `metal-${card.rarity}` : 'metal-none'}`} title={card.rarity ?? 'effect'} aria-label={card.rarity ?? 'effect'} />;
}

function Group({ label, count, children }: { label: string; count?: number; children: ReactNode }) {
  return (
    <section className="cs-group">
      <div className="cs-k">{label}{count !== undefined && <span className="cs-count">{count}</span>}</div>
      {children}
    </section>
  );
}

function Cards({ cards, view, empty }: { cards: Card[]; view: SheetView; empty: string }) {
  if (!cards.length) return <p className="cs-empty">{empty}</p>;
  if (view === 'rival') return <div className="cs-dots">{cards.map((c, i) => <MetalDot key={`${c.id}-${i}`} card={c} />)}</div>;
  return <div className="cs-chips">{cards.map((c, i) => <CardChip key={`${c.id}-${i}`} card={c} />)}</div>;
}

function Slot({ kind, holder, card, view }: { kind: CardKind; holder: string; card: Card | null; view: SheetView }) {
  return (
    <div className={`cs-slot ${card ? 'filled' : 'empty'}`}>
      <span className="cs-slot-k"><GameIcon name={CARD_KIND_ICONS[kind]} size={16} />{KIND_LABELS[kind]}<span className="cs-slot-holder">{holder}</span></span>
      {card
        ? (view === 'rival' ? <MetalDot card={card} /> : <CardChip card={card} />)
        : <span className="cs-slot-open">Empty slot</span>}
    </div>
  );
}

export function CardSheet({ data, view = 'mine' }: { data: CardSheetData; view?: SheetView }) {
  const { driver, car, team } = data;
  const effects = data.effects ?? [];
  const traits = [...driver.traits, ...car.traits, ...team.traits];
  const slots = slotsFor(traits);
  const gear = [driver.equipment, car.upgrade, team.facility];
  const free = gear.filter(g => !g).length;
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

      <Group label="Traits" count={traits.length}>
        <div className="cs-sub">Driver</div>
        <Cards cards={driver.traits} view={view} empty="No driver trait." />
        <div className="cs-sub">Car</div>
        <Cards cards={car.traits} view={view} empty="No car trait." />
        <div className="cs-sub">Team</div>
        <Cards cards={team.traits} view={view} empty="No team trait." />
      </Group>

      <Group label={`Gear · ${free} of ${slots.equipment + slots.upgrade + slots.facility} slots free`}>
        <Slot kind="equipment" holder="driver" card={driver.equipment} view={view} />
        <Slot kind="upgrade" holder="car" card={car.upgrade} view={view} />
        <Slot kind="facility" holder="team" card={team.facility} view={view} />
      </Group>

      <Group label="Effects" count={effects.length}>
        <Cards cards={effects} view={view} empty="None. Effects arrive in v0.6 (dealt by the race)." />
      </Group>

      <Group label="Locker" count={team.locker.length}>
        <Cards cards={team.locker} view={view} empty="Empty. Swapped-out gear lands here; move it in any Paddock." />
      </Group>
    </article>
  );
}
