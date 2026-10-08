// The Paddock (#319, redesigned in #452 with Pax): your turn before a race.
// One roster table, Madden-style: your drivers as rows (name first), stats as
// columns, every cell the same size, each stat a grade (src/season/grades.ts).
// Car and team sit in the same table, so columns never drift.
//
// The turn, in order (the step strip): open the pack → aim it at a row (the
// row previews its new grades) and give it → pick Car 1 / Car 2 → lock in.
// Locking ends the turn, so gear moves (tap-then-tap; drag on desktop) come
// before it. CPU turns are no-ops. Hotseat: a hand-off screen between humans.
// The pack reveal theatre is #320; this step shows the card plainly.
import { useMemo, useState, type DragEvent } from 'react';
import { GameIcon, TeamLogo, teamThemeVars } from '../../icons/GameIcon';
import { CardFace } from '../../cards/CardFace';
import { STAT_LABELS } from '../../cards/deck';
import { STAT_ICONS } from '../../icons/registry';
import type { Card, StatKey } from '../../cards/types';
import { getTrackById } from '../../generators/tracks';
import { getDeckTrackById } from '../../data/deckTracks';
import { draftState } from '../draft';
import { applyPack, moveGear, pendingPack, teamCardState, type CardHolder, type TeamCardState } from '../pack';
import { constructorStandings, lineupFor, poolFor, saveSeason, seasonState, setLineup, type SeasonFacts } from '../season';
import { overall, readStat, type StatReading } from '../grades';
import { seasonName } from '../setup';
import Handoff from './Handoff';
import PackReveal from './PackReveal';
import { GradeCell, ReadingSheet } from './RosterTable';
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
const DRIVER_STATS: StatKey[] = ['baseSpeed', 'consistency', 'luck', 'acceleration', 'endurance', 'aggression'];
const CAR_STATS: StatKey[] = ['power', 'grip', 'reliability'];
const TEAM_STATS: StatKey[] = ['tireManagement', 'pitCrew'];
const ABBR: Record<StatKey, string> = {
  baseSpeed: 'SPD', consistency: 'CON', luck: 'LCK', acceleration: 'ACC', endurance: 'END', aggression: 'AGG',
  power: 'PWR', grip: 'GRP', reliability: 'REL', tireManagement: 'TYR', pitCrew: 'PIT',
};

type HolderKey = string; // a driver id, 'car' or 'team'
const keyOf = (h: CardHolder): HolderKey => (h.kind === 'driver' ? String(h.id) : h.kind);
const holderOf = (k: HolderKey): CardHolder => (k === 'car' ? { kind: 'car' } : k === 'team' ? { kind: 'team' } : { kind: 'driver', id: Number(k) });

function slotOf(state: TeamCardState, h: CardHolder): Card[] {
  return h.kind === 'driver' ? state.drivers[h.id].equipment : h.kind === 'car' ? state.car.upgrade : state.team.facility;
}

/** Where a gear card sits now, or null. */
function placeOf(state: TeamCardState, cardId: string): CardHolder | 'locker' | null {
  if (state.locker.some(c => c.id === cardId)) return 'locker';
  for (const [id, d] of Object.entries(state.drivers)) if (d.equipment.some(c => c.id === cardId)) return { kind: 'driver', id: Number(id) };
  if (state.car.upgrade.some(c => c.id === cardId)) return { kind: 'car' };
  if (state.team.facility.some(c => c.id === cardId)) return { kind: 'team' };
  return null;
}

/** A card with this one added: a trait stacks, gear takes its slot. */
function withCard(own: Card[], gear: Card[], extra: Card | null): Card[] {
  if (!extra) return [...own, ...gear];
  return extra.kind === 'trait' ? [...own, ...gear, extra] : [...own, extra];
}

export default function Paddock({ facts, onChange, onMenu, onGo, onStandings }: Props) {
  const pool = useMemo(() => poolFor(facts), [facts.setup]); // eslint-disable-line react-hooks/exhaustive-deps
  const teams = useMemo(() => teamsOf(facts), [facts.setup]); // eslint-disable-line react-hooks/exhaustive-deps
  const rosters = useMemo(() => draftState(pool, facts.draftPicks).rosters, [pool, facts.draftPicks]);
  const state = seasonState(facts);
  const hotseat = facts.setup.humans.length > 1;
  const turn = state.whoseTurn;
  const [readyFor, setReadyFor] = useState<string | null>(hotseat ? null : facts.setup.humans[0]?.teamId ?? null);
  const [revealed, setRevealed] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [aim, setAim] = useState<HolderKey | null>(null);
  const [chosen, setChosen] = useState<number[] | null>(null);
  const [held, setHeld] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ title: string; reading: StatReading } | { card: Card } | null>(null);

  const commit = (next: SeasonFacts) => { saveSeason(next); onChange(next); };
  const total = facts.setup.calendar.length;
  const trackId = facts.setup.calendar[Math.min(state.round, total - 1)];
  const track = getTrackById(trackId);
  const priority = new Set((getDeckTrackById(trackId)?.favours ?? []).map(f => f.stat));
  const viewer = turn ?? facts.setup.humans[0].teamId;
  const you = teams[viewer];

  if (turn && hotseat && readyFor !== turn) {
    return <Handoff team={teams[turn]} label={humanLabel(facts, turn)!} what={`Paddock · round ${state.round + 1}`} onReady={() => { setReadyFor(turn); setChosen(null); setRevealed(false); setAim(null); setHeld(null); }} />;
  }

  const roster = rosters[viewer];
  const cards = teamCardState(facts, viewer);
  const pack = turn ? pendingPack(facts) : null;
  const myTurn = !!turn && state.phase === 'paddock';
  const lineup = chosen ?? lineupFor(facts, state.round, viewer);
  const car = pool.cars.find(c => c.id === roster.carId)!;
  const team = pool.teams.find(t => t.id === viewer)!;
  const aiming = !!pack && revealed;
  const packFits = (h: CardHolder) => !!pack && (pack.card.kind === 'trait' ? h.kind === pack.card.target : GEAR_FOR[h.kind] === pack.card.kind);

  // Readings: every stat of every row, with its cards, and the aimed preview.
  const readRow = (k: HolderKey, extra: Card | null) => {
    if (k === 'car') return CAR_STATS.map(s => readStat(s, car.stats[s as keyof typeof car.stats], withCard([...car.traits, ...cards.car.traits], cards.car.upgrade, extra)));
    if (k === 'team') return TEAM_STATS.map(s => readStat(s, team.teamStats[s as keyof typeof team.teamStats], withCard([...team.traits, ...cards.team.traits], cards.team.facility, extra)));
    const id = Number(k);
    const d = pool.drivers.find(x => x.id === id)!;
    return DRIVER_STATS.map(s => readStat(s, d.stats[s as keyof typeof d.stats], withCard([...d.traits, ...cards.drivers[id].traits], cards.drivers[id].equipment, extra)));
  };
  /** While the card is in hand: rows it can go on pulse; tap one to try it on, tap again (or Give) to place it. */
  const isTarget = (k: HolderKey) => aiming && packFits(holderOf(k));
  const tryOn = (k: HolderKey) => { if (!isTarget(k)) return; if (aim === k) give(); else setAim(k); };
  const targetName = (k: HolderKey) => (k === 'car' ? car.name : k === 'team' ? you.name : pool.drivers.find(x => x.id === Number(k))!.fullName);
  const previewFor = (k: HolderKey) => (aiming && aim === k && packFits(holderOf(k)) ? pack!.card : null);

  // Actions
  const give = () => {
    if (!pack || !aim) return;
    const target = holderOf(aim);
    if (!packFits(target)) return;
    const slot = pack.card.kind === 'trait' ? [] : slotOf(cards, target);
    commit(applyPack(facts, { type: 'pack', round: pack.round, teamId: pack.teamId, tier: pack.tier, cardId: pack.card.id, target, replaces: slot[0]?.id }));
    setAim(null);
  };
  /** Gear into a slot; a full slot sends its card to the locker first (two moves, both facts). */
  const moveTo = (cardId: string, to: CardHolder | 'locker') => {
    setHeld(null);
    if (!myTurn) return;
    const from = placeOf(cards, cardId);
    const card = [...cards.locker, ...Object.values(cards.drivers).flatMap(d => d.equipment), ...cards.car.upgrade, ...cards.team.facility].find(c => c.id === cardId);
    if (!from || !card) return;
    if (to !== 'locker' && GEAR_FOR[to.kind] !== card.kind) return;
    if (to !== 'locker' && from !== 'locker' && keyOf(from) === keyOf(to)) return;
    if (to === 'locker' && from === 'locker') return;
    let next = facts;
    if (to !== 'locker') {
      const occupant = slotOf(cards, to)[0];
      if (occupant) next = moveGear(next, { type: 'move', round: state.round, teamId: viewer, cardId: occupant.id, to: 'locker' });
    }
    commit(moveGear(next, { type: 'move', round: state.round, teamId: viewer, cardId, to }));
  };
  const tapCard = (c: Card) => {
    const isGear = c.kind !== 'trait' && !!placeOf(cards, c.id);
    if (held && held !== c.id) {
      const at = placeOf(cards, c.id);
      if (at) return moveTo(held, at);
    }
    if (isGear && myTurn) setHeld(h => (h === c.id ? null : c.id));
    setDetail({ card: c });
  };
  const toggleCar = (id: number) => setChosen(() => {
    const cur = [...lineup];
    if (cur.includes(id)) return cur.filter(x => x !== id);
    return cur.length >= 2 ? [cur[1], id] : [...cur, id];
  });
  const lock = () => {
    if (pack || lineup.length !== 2) return;
    commit(setLineup(facts, { round: state.round, teamId: viewer, driverIds: [lineup[0], lineup[1]] }));
    setChosen(null);
  };

  // Drag (desktop) for gear: drop on a slot cell or the locker.
  const onDragStart = (e: DragEvent, c: Card) => { e.dataTransfer.setData('text/plain', c.id); setHeld(c.id); };
  const dropZone = (to: CardHolder | 'locker') => ({
    onDragOver: (e: DragEvent) => { if (held) e.preventDefault(); },
    onDrop: (e: DragEvent) => { e.preventDefault(); const id = e.dataTransfer.getData('text/plain'); if (id) moveTo(id, to); },
    onClick: () => { if (held) moveTo(held, to); },
  });

  const mini = (c: Card, gear: boolean) => (
    <button
      key={c.id}
      type="button"
      className={`pk-card ${held === c.id ? 'held' : ''}`}
      onClick={e => { e.stopPropagation(); tapCard(c); }}
      draggable={gear && myTurn}
      onDragStart={e => onDragStart(e, c)}
      aria-label={c.name}
    >
      <CardFace card={c} size="mini" flippable={false} />
    </button>
  );
  const heldCard = held ? [...cards.locker, ...Object.values(cards.drivers).flatMap(d => d.equipment), ...cards.car.upgrade, ...cards.team.facility].find(c => c.id === held) : undefined;
  const slotCell = (h: CardHolder) => {
    const c = slotOf(cards, h)[0];
    const fits = !!heldCard && GEAR_FOR[h.kind] === heldCard.kind && c?.id !== heldCard.id;
    return (
      <td className={`rt-slot ${fits ? 'droppable pulse' : ''}`} {...dropZone(h)}>
        {c ? mini(c, true) : <span className="pk-empty" aria-label="Empty slot">—</span>}
      </td>
    );
  };

  // Step strip
  const step = !myTurn ? 0 : pack ? (revealed ? 2 : 1) : 3;
  const steps: { label: string; action?: JSX.Element }[] = [
    { label: 'Open pack', action: step === 1 ? <button type="button" className="rs-btn rs-btn-primary pk-step-btn" onClick={() => setRevealing(true)}>Open</button> : undefined },
    { label: 'Place card', action: step === 2 ? <button type="button" className="rs-btn rs-btn-primary pk-step-btn" disabled={!aim} onClick={give}>{aim ? 'Give' : 'Tap a row'}</button> : undefined },
    { label: 'Pick 2', action: undefined },
    { label: 'Lock in', action: step === 3 ? <button type="button" className="rs-btn rs-btn-primary pk-step-btn" disabled={lineup.length !== 2} onClick={lock}>Lock in</button> : undefined },
  ];
  const stepDone = (i: number) => (i === 0 ? step >= 2 || (myTurn && !pack) : i === 1 ? myTurn && !pack : i === 2 ? myTurn && !pack && lineup.length === 2 : false);
  const stepNow = (i: number) => (i === 0 ? step === 1 : i === 1 ? step === 2 : i === 2 ? step === 3 && lineup.length !== 2 : step === 3 && lineup.length === 2);

  const head = (stats: StatKey[], pad: number) => (
    <>
      <th className="rt-oc">OVR</th>
      {stats.map(s => <th key={s} className={`rt-stat ${priority.has(s) ? 'prio' : ''}`} title={`${STAT_LABELS[s]}${priority.has(s) ? ' · next race priority (+10%)' : ''}`}>{ABBR[s]}</th>)}
      {Array.from({ length: pad }, (_, i) => <th key={`pad${i}`} className="rt-stat rt-pad" />)}
    </>
  );
  const statCells = (k: HolderKey, title: string, stats: StatKey[], pad: number, dim: boolean) => {
    const now = readRow(k, null);
    const pv = previewFor(k);
    const after = pv ? readRow(k, pv) : null;
    const ovr = overall(now), ovrAfter = after ? overall(after) : null;
    return (
      <>
        <GradeCell value={ovrAfter?.total ?? ovr.total} dim={dim} move={ovrAfter ? Math.sign(Math.round(ovrAfter.total) - Math.round(ovr.total)) : 0} strong />
        {stats.map((s, i) => (
          <GradeCell
            key={s}
            value={(after ?? now)[i].total}
            notch={now[i].parts.length > 0}
            move={after ? Math.sign(Math.round(after[i].total) - Math.round(now[i].total)) : 0}
            dim={dim}
            onOpen={() => (isTarget(k) ? tryOn(k) : setDetail({ title: `${title} · ${STAT_LABELS[s]}`, reading: now[i] }))}
          />
        ))}
        {Array.from({ length: pad }, (_, i) => <td key={`pad${i}`} className="rt-cell rt-pad" />)}
      </>
    );
  };
  const nameBody = (k: HolderKey, body: JSX.Element) => (isTarget(k)
    ? <button type="button" className="rt-pick" onClick={() => tryOn(k)} aria-label={aim === k ? `Give to ${targetName(k)}` : `Try the card on ${targetName(k)}`}>{body}</button>
    : body);
  const aimCell = (k: HolderKey) => aiming && (
    <td className="rt-act">
      {isTarget(k) && (aim === k
        ? <button type="button" className="rs-btn rs-btn-primary pk-give" onClick={give}>Give</button>
        : <button type="button" className="pk-toggle" onClick={() => setAim(k)}>Try on</button>)}
    </td>
  );

  const standings = constructorStandings(facts);

  return (
    <div className="run-setup season-setup ss-paddock pk" style={teamThemeVars(you)}>
      <header className="rs-top">
        <div className="rs-title-block">
          <button type="button" className="rs-back" onClick={onMenu}>← Menu</button>
          <h1 className="rs-title">Paddock</h1>
          <span className="rs-sub">{seasonName(facts.setup)} · round {state.round + 1} of {total}</span>
        </div>
      </header>

      {priority.size > 0 && (
        <p className="pk-priority">
          <span className="rs-k">Next race · priority stats</span>{' '}
          {[...priority].map(s => STAT_LABELS[s]).join(' and ')}: worth +10% for everyone at the {track?.name ?? 'next'} track.
        </p>
      )}

      {state.phase === 'ready-for-go' ? (
        <div className="pk-go">
          <span>Every team is set for round {state.round + 1}.</span>
          <button type="button" className="rs-btn rs-btn-primary" onClick={onGo}>Go: round {state.round + 1}</button>
        </div>
      ) : myTurn && (
        <ol className="pk-steps" aria-label="Your turn">
          {steps.map((s, i) => (
            <li key={s.label} className={`pk-step ${stepDone(i) ? 'done' : ''} ${stepNow(i) ? 'now' : ''}`}>
              <span className="rs-k">Step {i + 1}</span>
              <b>{s.label}</b>
              {s.action}
            </li>
          ))}
        </ol>
      )}

      {pack && myTurn && (
        <div className="pk-pack">
          {revealed ? <button type="button" className="pk-card inhand" onClick={() => setDetail({ card: pack.card })} aria-label={pack.card.name}><CardFace card={pack.card} size="mini" flippable={false} /></button> : <CardFace card={pack.card} size="mini" faceDown flippable={false} />}
          <div className="pk-pack-text">
            <span className="rs-k pk-pack-k"><GameIcon name="season.pack" size={14} /> Base deck · {TIER_LABEL[pack.tier]} pack</span>
            <b>{revealed ? pack.card.name : 'Sealed'}</b>
            <span className="rs-hint">{!revealed ? 'Open it to see the card.' : aim ? `On ${targetName(aim)}, the row shows its new grades (▲ ▼). Give it, or tap another row.` : `Tap ${pack.card.target === 'driver' ? 'a driver' : `your ${pack.card.target}`} in the table (the glowing ${pack.card.target === 'driver' ? 'rows' : 'row'}) to try it on.${pack.card.kind !== 'trait' ? ' A full slot sends its card to the locker.' : ' Traits are for good.'}`}</span>
          </div>
          {revealed && aim && <button type="button" className="rs-btn rs-btn-primary pk-give-big" onClick={give}>Give to {targetName(aim)}</button>}
        </div>
      )}

      <div className="rt-legend">
        {priority.size > 0 && <span><span className="rt-prio-key">{ABBR[[...priority][0]]}</span> next race priority</span>}
        <span><i className="rt-notch-key" /> cards change this stat · tap a grade for the sum</span>
        <span><b className="rt-s-key">S</b> past the best possible roll</span>
      </div>

      <div className="rt-scroll">
        <table className="rt">
          <thead>
            <tr>
              <th className="rt-name">Driver</th>
              {head(DRIVER_STATS, 0)}
              <th className="rt-slot">Equip</th>
              <th className="rt-traits">Traits</th>
              <th className="rt-act">Car</th>
              {aiming && <th className="rt-act">Card</th>}
            </tr>
          </thead>
          <tbody>
            {roster.driverIds.map(id => {
              const d = pool.drivers.find(x => x.id === id)!;
              const k = String(id);
              const carNo = lineup.indexOf(id);
              const traits = [...d.traits, ...cards.drivers[id].traits];
              return (
                <tr key={id} className={`${aim === k && aiming ? 'aimed' : ''} ${isTarget(k) && aim !== k ? 'target' : ''} ${carNo < 0 ? 'benched' : ''}`}>
                  <th className="rt-name" scope="row">{nameBody(k, <><span className="rt-num" style={teamThemeVars(you)}>{d.number}</span><span className="rt-nm">{d.fullName}</span></>)}</th>
                  {statCells(k, d.fullName, DRIVER_STATS, 0, carNo < 0)}
                  {slotCell({ kind: 'driver', id })}
                  <td className="rt-traits"><span className="rt-minis">{traits.map(c => mini(c, false))}</span></td>
                  <td className="rt-act">
                    {myTurn
                      ? <button type="button" className={`pk-toggle ${carNo >= 0 ? 'on' : ''}`} onClick={() => toggleCar(id)} aria-pressed={carNo >= 0}>{carNo >= 0 ? `Car ${carNo + 1}` : '—'}</button>
                      : <span className="pk-carno">{carNo >= 0 ? `Car ${carNo + 1}` : '—'}</span>}
                  </td>
                  {aimCell(k)}
                </tr>
              );
            })}
            <tr className="rt-sub">
              <th className="rt-name">Car &amp; team</th>
              {head([...CAR_STATS, ...TEAM_STATS], DRIVER_STATS.length - CAR_STATS.length - TEAM_STATS.length)}
              <th className="rt-slot">Slot</th>
              <th className="rt-traits">Traits</th>
              <th className="rt-act" />
              {aiming && <th className="rt-act" />}
            </tr>
            <tr className={`${aim === 'car' && aiming ? 'aimed' : ''} ${isTarget('car') && aim !== 'car' ? 'target' : ''}`}>
              <th className="rt-name" scope="row">{nameBody('car', <span className="rt-nm">{car.name}</span>)}</th>
              {(() => {
                const now = readRow('car', null), pv = previewFor('car'), after = pv ? readRow('car', pv) : null;
                const ovr = overall(now);
                return (
                  <>
                    <GradeCell value={(after ? overall(after) : ovr).total} strong move={after ? Math.sign(Math.round(overall(after).total) - Math.round(ovr.total)) : 0} />
                    {CAR_STATS.map((s, i) => <GradeCell key={s} value={(after ?? now)[i].total} notch={now[i].parts.length > 0} move={after ? Math.sign(Math.round(after[i].total) - Math.round(now[i].total)) : 0} onOpen={() => (isTarget('car') ? tryOn('car') : setDetail({ title: `${car.name} · ${STAT_LABELS[s]}`, reading: now[i] }))} />)}
                    {TEAM_STATS.map(s => <td key={s} className="rt-cell rt-na">·</td>)}
                    {Array.from({ length: DRIVER_STATS.length - CAR_STATS.length - TEAM_STATS.length }, (_, i) => <td key={i} className="rt-cell rt-pad" />)}
                  </>
                );
              })()}
              {slotCell({ kind: 'car' })}
              <td className="rt-traits"><span className="rt-minis">{[...car.traits, ...cards.car.traits].map(c => mini(c, false))}</span></td>
              <td className="rt-act" />
              {aimCell('car')}
            </tr>
            <tr className={`${aim === 'team' && aiming ? 'aimed' : ''} ${isTarget('team') && aim !== 'team' ? 'target' : ''}`}>
              <th className="rt-name" scope="row">{nameBody('team', <><TeamLogo team={you} size={22} /><span className="rt-nm">{you.name}</span></>)}</th>
              {(() => {
                const now = readRow('team', null), pv = previewFor('team'), after = pv ? readRow('team', pv) : null;
                const ovr = overall(now);
                return (
                  <>
                    <GradeCell value={(after ? overall(after) : ovr).total} strong move={after ? Math.sign(Math.round(overall(after).total) - Math.round(ovr.total)) : 0} />
                    {CAR_STATS.map(s => <td key={s} className="rt-cell rt-na">·</td>)}
                    {TEAM_STATS.map((s, i) => <GradeCell key={s} value={(after ?? now)[i].total} notch={now[i].parts.length > 0} move={after ? Math.sign(Math.round(after[i].total) - Math.round(now[i].total)) : 0} onOpen={() => (isTarget('team') ? tryOn('team') : setDetail({ title: `${you.name} · ${STAT_LABELS[s]}`, reading: now[i] }))} />)}
                    {Array.from({ length: DRIVER_STATS.length - CAR_STATS.length - TEAM_STATS.length }, (_, i) => <td key={i} className="rt-cell rt-pad" />)}
                  </>
                );
              })()}
              {slotCell({ kind: 'team' })}
              <td className="rt-traits"><span className="rt-minis">{[...team.traits, ...cards.team.traits].map(c => mini(c, false))}</span></td>
              <td className="rt-act" />
              {aimCell('team')}
            </tr>
          </tbody>
        </table>
      </div>
      <div className={`pk-locker ${held ? 'droppable' : ''}`} {...dropZone('locker')}>
        <span className="rs-k">Locker · {cards.locker.length}</span>
        <span className="rt-minis">{cards.locker.length ? cards.locker.map(c => mini(c, true)) : <span className="pk-empty" aria-label="Empty locker">—</span>}</span>
        <span className="rs-hint">{held ? 'Tap a slot, or the locker, to move the card.' : myTurn ? 'Tap a gear card, then tap where it goes. Drag works on desktop.' : ''}</span>
      </div>

      <section className="rs-row pk-side">
        <div>
          <div className="rs-row-head"><span className="rs-k">Turn order · last place first</span></div>
          <ol className="ss-strip" aria-label="Paddock turn order">
            {state.paddockOrder.map(id => {
              const label = humanLabel(facts, id);
              const done = !label || state.phase !== 'paddock' || state.paddockOrder.indexOf(id) < state.paddockOrder.indexOf(turn ?? '');
              return (
                <li key={id} className={`ss-strip-team ${id === turn ? 'now' : ''} ${done && id !== turn ? 'done' : ''}`} title={teams[id].name}>
                  <TeamLogo team={teams[id]} size={22} />
                  {label && <span className="ss-strip-label">{label}</span>}
                </li>
              );
            })}
          </ol>
        </div>
        <div>
          <div className="rs-row-head"><span className="rs-k">Constructors</span><button type="button" className="rs-link" onClick={onStandings}>Full standings</button></div>
          <table className="rt rt-compact">
            <thead><tr><th className="rt-pos">Pos</th><th className="rt-name">Team</th><th className="rt-numcol">Pts</th></tr></thead>
            <tbody>
              {standings.map(s => (
                <tr key={s.teamId} className={humanLabel(facts, s.teamId) ? 'mine' : ''}>
                  <td className="rt-pos">{s.rank}</td>
                  <th className="rt-name" scope="row"><TeamLogo team={teams[s.teamId]} size={18} /><span className="rt-nm">{teams[s.teamId].name}</span></th>
                  <td className="rt-numcol">{s.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {revealing && pack && (
        <PackReveal card={pack.card} tier={pack.tier} onDone={() => { setRevealing(false); setRevealed(true); requestAnimationFrame(() => document.querySelector('.rt tr.target')?.scrollIntoView({ block: 'center', behavior: 'smooth' })); }} />
      )}

      {detail && (
        <div className="pk-sheet" role="dialog" aria-label="Detail">
          {'card' in detail
            ? <><CardFace card={detail.card} size="small" flippable={false} /><div className="pk-sheet-text"><span className="rs-k">{detail.card.kind} · {detail.card.target}{detail.card.rarity ? ` · ${detail.card.rarity}` : ''}</span><b>{detail.card.name}</b>{detail.card.stats.map(s => <span key={s.stat}>+{s.pct}% {STAT_LABELS[s.stat]}</span>)}<span className="rs-hint">{detail.card.kind === 'trait' ? 'Traits are for good.' : held === detail.card.id ? 'Holding it: tap a slot or the locker.' : 'Gear: move it freely in any Paddock.'}</span></div></>
            : <ReadingSheet title={detail.title} reading={detail.reading} icon={STAT_ICONS[detail.reading.stat]} />}
          <button type="button" className="rs-link pk-sheet-x" onClick={() => setDetail(null)}>Close</button>
        </div>
      )}
    </div>
  );
}
