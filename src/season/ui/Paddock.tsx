// The Paddock (#319, docs/SEASON_MODE.md §4): before every race, each human
// in turn (reverse standings) opens their pack, manages gear and picks who
// races. Locking the lineup ends the turn, so it comes last. CPU turns are
// no-ops. Hotseat: a hand-off screen between humans.
//
// The pack step here is plain (the card face up, tap where it goes); the
// reveal theatre is #320.
import { useMemo, useState } from 'react';
import { TeamLogo, teamThemeVars } from '../../icons/GameIcon';
import { CardFace } from '../../cards/CardFace';
import { CardSheet, type CardSheetData } from '../../cards/CardSheet';
import type { Card } from '../../cards/types';
import { getTrackById } from '../../generators/tracks';
import { draftState } from '../draft';
import { applyPack, moveGear, pendingPack, teamCardState, type CardHolder, type TeamCardState } from '../pack';
import { constructorStandings, lineupFor, poolFor, saveSeason, seasonState, setLineup, type SeasonFacts } from '../season';
import { seasonName } from '../setup';
import Handoff from './Handoff';
import { humanLabel, teamsOf } from './teams';

interface Props {
  facts: SeasonFacts;
  onChange: (facts: SeasonFacts) => void;
  onMenu: () => void;
  onGo: () => void;
  onStandings: () => void;
}

const TIER_LABEL = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', legendary: 'Legendary' } as const;
const GEAR_FOR: Record<CardHolder['kind'], Card['kind']> = { driver: 'equipment', car: 'upgrade', team: 'facility' };

const sameHolder = (a: CardHolder | 'locker', b: CardHolder | 'locker') =>
  a === 'locker' || b === 'locker' ? a === b : a.kind === b.kind && (a.kind !== 'driver' || (b.kind === 'driver' && a.id === b.id));

/** Where every gear card on the team sits now. */
function gearPlaces(state: TeamCardState): { card: Card; at: CardHolder | 'locker' }[] {
  return [
    ...Object.entries(state.drivers).flatMap(([id, d]) => d.equipment.map(card => ({ card, at: { kind: 'driver' as const, id: Number(id) } }))),
    ...state.car.upgrade.map(card => ({ card, at: { kind: 'car' as const } })),
    ...state.team.facility.map(card => ({ card, at: { kind: 'team' as const } })),
    ...state.locker.map(card => ({ card, at: 'locker' as const })),
  ];
}

function slotOf(state: TeamCardState, h: CardHolder): Card[] {
  return h.kind === 'driver' ? state.drivers[h.id].equipment : h.kind === 'car' ? state.car.upgrade : state.team.facility;
}

export default function Paddock({ facts, onChange, onMenu, onGo, onStandings }: Props) {
  const pool = useMemo(() => poolFor(facts), [facts.setup]); // eslint-disable-line react-hooks/exhaustive-deps
  const teams = useMemo(() => teamsOf(facts), [facts.setup]); // eslint-disable-line react-hooks/exhaustive-deps
  const rosters = useMemo(() => draftState(pool, facts.draftPicks).rosters, [pool, facts.draftPicks]);
  const state = seasonState(facts);
  const hotseat = facts.setup.humans.length > 1;
  const turn = state.whoseTurn;
  const [readyFor, setReadyFor] = useState<string | null>(hotseat ? null : facts.setup.humans[0]?.teamId ?? null);
  const [chosen, setChosen] = useState<number[] | null>(null);
  const [sheetFor, setSheetFor] = useState<number | null>(null);

  const commit = (next: SeasonFacts) => { saveSeason(next); onChange(next); };
  const total = facts.setup.calendar.length;
  const track = getTrackById(facts.setup.calendar[Math.min(state.round, total - 1)]);
  const standings = constructorStandings(facts);
  const viewer = turn ?? facts.setup.humans[0].teamId;
  const you = teams[viewer];

  if (turn && hotseat && readyFor !== turn) {
    return <Handoff team={teams[turn]} label={humanLabel(facts, turn)!} what={`Paddock · round ${state.round + 1}`} onReady={() => { setReadyFor(turn); setChosen(null); setSheetFor(null); }} />;
  }

  const roster = rosters[viewer];
  const cards = teamCardState(facts, viewer);
  const pack = turn ? pendingPack(facts) : null;
  const lineup = chosen ?? lineupFor(facts, state.round, viewer);
  const driverName = (id: number) => { const d = pool.drivers.find(x => x.id === id)!; return `${d.number} ${d.shortName}`; };
  const num = (id: number) => pool.drivers.find(x => x.id === id)!.number;
  const holderName = (h: CardHolder | 'locker') => (h === 'locker' ? 'Locker' : h.kind === 'driver' ? driverName(h.id) : h.kind === 'car' ? 'Car' : 'Team');
  const holders: CardHolder[] = [...roster.driverIds.map(id => ({ kind: 'driver' as const, id })), { kind: 'car' }, { kind: 'team' }];

  const openOnto = (target: CardHolder) => {
    if (!pack) return;
    const slot = pack.card.kind === 'trait' ? [] : slotOf(cards, target);
    const cap = target.kind === 'driver' ? cards.slots.equipment : target.kind === 'car' ? cards.slots.upgrade : cards.slots.facility;
    const replaces = pack.card.kind !== 'trait' && slot.length >= cap ? slot[0].id : undefined;
    commit(applyPack(facts, { type: 'pack', round: pack.round, teamId: pack.teamId, tier: pack.tier, cardId: pack.card.id, target, replaces }));
  };
  const packTargets = pack ? holders.filter(h => (pack.card.kind === 'trait' ? h.kind === pack.card.target : GEAR_FOR[h.kind] === pack.card.kind)) : [];

  const move = (cardId: string, to: CardHolder | 'locker') => commit(moveGear(facts, { type: 'move', round: state.round, teamId: viewer, cardId, to }));
  const toggle = (id: number) => setChosen(() => {
    const cur = [...lineup];
    if (cur.includes(id)) return cur.filter(x => x !== id);
    return cur.length >= 2 ? [cur[1], id] : [...cur, id];
  });
  const lock = () => {
    if (lineup.length !== 2) return;
    commit(setLineup(facts, { round: state.round, teamId: viewer, driverIds: [lineup[0], lineup[1]] }));
    setChosen(null);
  };

  const sheetDriver = sheetFor ?? lineup[0] ?? roster.driverIds[0];
  const sheet = (id: number): CardSheetData => {
    const d = pool.drivers.find(x => x.id === id)!;
    const car = pool.cars.find(c => c.id === roster.carId)!;
    const team = teams[viewer];
    return {
      driver: { name: d.fullName, number: d.number, traits: [...d.traits, ...cards.drivers[id].traits], equipment: cards.drivers[id].equipment[0] ?? null, benched: !lineup.includes(id) },
      car: { name: car.name, traits: [...car.traits, ...cards.car.traits], upgrade: cards.car.upgrade[0] ?? null },
      team: { ...team, traits: [...team.traits, ...cards.team.traits], facility: cards.team.facility[0] ?? null, locker: cards.locker },
    };
  };

  const strip = (
    <ol className="ss-strip" aria-label="Paddock turn order">
      {state.paddockOrder.map(id => {
        const label = humanLabel(facts, id);
        const done = !label || (state.phase !== 'paddock') || state.paddockOrder.indexOf(id) < state.paddockOrder.indexOf(turn ?? '');
        return (
          <li key={id} className={`ss-strip-team ${id === turn ? 'now' : ''} ${done && id !== turn ? 'done' : ''}`} title={teams[id].name}>
            <TeamLogo team={teams[id]} size={24} />
            {label && <span className="ss-strip-label">{label}</span>}
          </li>
        );
      })}
    </ol>
  );

  const table = (
    <ol className="ss-table">
      {standings.map(s => (
        <li key={s.teamId} className={`ss-table-row ${humanLabel(facts, s.teamId) ? 'human' : ''}`}>
          <span className="ss-table-rank">{s.rank}</span>
          <TeamLogo team={teams[s.teamId]} size={20} />
          <span className="ss-team-name">{teams[s.teamId].name}</span>
          {humanLabel(facts, s.teamId) && <span className="ss-badge ss-badge-human" style={teamThemeVars(teams[s.teamId])}>{humanLabel(facts, s.teamId)}</span>}
          <span className="ss-table-pts">{s.points}</span>
        </li>
      ))}
    </ol>
  );

  return (
    <div className="run-setup season-setup ss-paddock" style={teamThemeVars(you)}>
      <header className="rs-top">
        <div className="rs-title-block">
          <button type="button" className="rs-back" onClick={onMenu}>← Menu</button>
          <h1 className="rs-title">Paddock</h1>
          <span className="rs-sub">{seasonName(facts.setup)} · round {state.round + 1} of {total}{track ? ` · ${track.name}` : ''}</span>
        </div>
      </header>

      <section className="rs-row">
        <div className="rs-row-head"><span className="rs-k">Turn order · last place first</span></div>
        {strip}
      </section>

      {state.phase === 'ready-for-go' ? (
        <section className="rs-row ss-holding">
          <p className="rs-hint">Every team is set for round {state.round + 1}{track ? ` at ${track.name}` : ''}.</p>
        </section>
      ) : turn && (
        <>
          {pack && (
            <section className="rs-row">
              <div className="rs-row-head"><span className="rs-k">Your pack · {TIER_LABEL[pack.tier]}</span></div>
              <div className="ss-pack">
                <CardFace card={pack.card} />
                <div className="ss-pack-place">
                  <p className="rs-hint">Put it on {pack.card.kind === 'trait' ? `your ${pack.card.target} (traits are for good)` : pack.card.target === 'driver' ? 'a driver' : `your ${pack.card.target}`}:</p>
                  {packTargets.map(h => {
                    const full = pack.card.kind !== 'trait' && slotOf(cards, h).length > 0;
                    return (
                      <button key={holderName(h)} type="button" className="rs-btn rs-btn-ghost ss-place" onClick={() => openOnto(h)}>
                        {holderName(h)}{full && <span className="ss-place-note"> · swaps {slotOf(cards, h)[0].name} to the locker</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          <section className="rs-row">
            <div className="rs-row-head"><span className="rs-k">Who races · pick 2</span></div>
            <ol className="ss-board ss-lineup">
              {roster.driverIds.map(id => {
                const d = pool.drivers.find(x => x.id === id)!;
                const on = lineup.includes(id);
                return (
                  <li key={id}>
                    <button type="button" className={`ss-pick ${on ? 'selected' : ''}`} onClick={() => toggle(id)} aria-pressed={on}>
                      <span className="ss-num">{d.number}</span>
                      <span className="ss-pick-main"><span className="ss-pick-name">{d.fullName}</span></span>
                      <span className={`ss-badge ${on ? 'ss-badge-human' : ''}`}>{on ? 'Races' : 'Bench'}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>

          <section className="rs-row">
            <div className="rs-row-head">
              <span className="rs-k">Cards</span>
              <div className="ss-tabs">
                {roster.driverIds.map(id => (
                  <button key={id} type="button" className={`ss-tab ${sheetDriver === id ? 'on' : ''}`} onClick={() => setSheetFor(id)}>{pool.drivers.find(x => x.id === id)!.number}</button>
                ))}
              </div>
            </div>
            <CardSheet data={sheet(sheetDriver)} view="mine" />
          </section>

          <section className="rs-row">
            <div className="rs-row-head"><span className="rs-k">Gear · move freely</span></div>
            {gearPlaces(cards).length === 0 ? (
              <p className="rs-hint">No gear yet. Packs deal it; swapped-out gear waits in the locker.</p>
            ) : (
              <ol className="ss-gear">
                {gearPlaces(cards).map(({ card, at }) => {
                  const options: (CardHolder | 'locker')[] = [
                    ...holders.filter(h => GEAR_FOR[h.kind] === card.kind && (sameHolder(h, at) || slotOf(cards, h).length === 0)),
                    'locker',
                  ];
                  return (
                    <li key={card.id} className="ss-gear-row">
                      <span className="ss-pick-name">{card.name}</span>
                      <select
                        className="ss-select"
                        value={holderName(at)}
                        aria-label={`Move ${card.name}`}
                        onChange={e => { const to = options.find(o => holderName(o) === e.target.value); if (to && !sameHolder(to, at)) move(card.id, to); }}
                      >
                        {options.map(o => <option key={holderName(o)} value={holderName(o)}>{holderName(o)}</option>)}
                      </select>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </>
      )}

      <section className="rs-row">
        <div className="rs-row-head"><span className="rs-k">Constructors</span><button type="button" className="rs-link" onClick={onStandings}>Full standings</button></div>
        {table}
      </section>

      <div className="ss-dock">
        {state.phase === 'ready-for-go' ? (
          <button type="button" className="rs-btn rs-btn-primary ss-dock-btn" onClick={onGo}>Go: round {state.round + 1}</button>
        ) : (
          <button type="button" className="rs-btn rs-btn-primary ss-dock-btn" disabled={!!pack || lineup.length !== 2} onClick={lock}>
            {pack ? 'Open your pack first' : lineup.length !== 2 ? 'Pick 2 to race' : `Lock in #${num(lineup[0])} + #${num(lineup[1])}`}
          </button>
        )}
      </div>
    </div>
  );
}
