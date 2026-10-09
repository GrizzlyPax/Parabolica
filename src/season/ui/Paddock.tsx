// The Paddock (#319; roster table #452; v2 with Pax, Oct 9). Two tabs:
//   Team   — one roster table (drivers, then car and team), grades in fixed
//            cells, cards as compact chips. Your turn runs along one slim line.
//   League — constructors' points race by race (your team highlighted), the
//            constructors' table and every driver.
//
// One idea for moving cards: a card "in hand". After the pack reveal the pack
// card is in hand; tap any gear chip to pick that up instead. While a card is in
// hand, every row it can go on glows and every stat it would change flashes its
// new grade; tap a glowing row to put it there (a trait asks first: it's
// permanent), or the glowing locker to keep gear for later. Drag works too.
// Locking the lineup ends the turn. Hotseat: a hand-off between humans.
import { useMemo, useState, type DragEvent } from 'react';
import { GameIcon, TeamLogo, teamThemeVars } from '../../icons/GameIcon';
import { RaceNumber } from '../../icons/RaceNumber';
import { CardFace } from '../../cards/CardFace';
import { CardChip } from '../../cards/CardChip';
import { STAT_LABELS } from '../../cards/deck';
import { STAT_ICONS } from '../../icons/registry';
import type { Card, StatKey } from '../../cards/types';
import { getTrackById } from '../../generators/tracks';
import { getDeckTrackById } from '../../data/deckTracks';
import { weatherForRace } from '../../data/weather';
import { draftState } from '../draft';
import { applyPack, moveGear, pendingPack, teamCardState, type CardHolder, type TeamCardState } from '../pack';
import { constructorStandings, driverStandings, lineupFor, poolFor, saveSeason, seasonState, setLineup, type SeasonFacts } from '../season';
import { overall, readStat, type StatReading } from '../grades';
import Handoff from './Handoff';
import EndSeason from './EndSeason';
import PackReveal from './PackReveal';
import { GradeCell, ReadingSheet } from './RosterTable';
import { SeasonChart } from './SeasonChart';
import { humanLabel, teamsOf } from './teams';

interface Props {
  facts: SeasonFacts;
  onChange: (facts: SeasonFacts) => void;
  onMenu: () => void;
  onEndSeason: () => void;
  onGo: () => void;
  onStandings: () => void;
}

const TIER_LABEL = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', legendary: 'Legendary' } as const;
const GEAR_FOR: Record<CardHolder['kind'], Card['kind']> = { driver: 'equipment', car: 'upgrade', team: 'facility' };
const DRIVER_STATS: StatKey[] = ['baseSpeed', 'consistency', 'luck', 'acceleration', 'endurance', 'aggression'];
const CAR_STATS: StatKey[] = ['power', 'grip', 'reliability'];
const TEAM_STATS: StatKey[] = ['tireManagement', 'pitCrew'];
const CT_STATS: StatKey[] = [...CAR_STATS, ...TEAM_STATS];
const PAD = DRIVER_STATS.length - CT_STATS.length;
const ABBR: Record<StatKey, string> = {
  baseSpeed: 'SPD', consistency: 'CON', luck: 'LCK', acceleration: 'ACC', endurance: 'END', aggression: 'AGG',
  power: 'PWR', grip: 'GRP', reliability: 'REL', tireManagement: 'TYR', pitCrew: 'PIT',
};
const ord = (n: number) => `${n}${['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th'}`;

type HolderKey = string; // a driver id, 'car' or 'team'
const keyOf = (h: CardHolder): HolderKey => (h.kind === 'driver' ? String(h.id) : h.kind);
const holderOf = (k: HolderKey): CardHolder => (k === 'car' ? { kind: 'car' } : k === 'team' ? { kind: 'team' } : { kind: 'driver', id: Number(k) });

function slotOf(state: TeamCardState, h: CardHolder): Card[] {
  return h.kind === 'driver' ? state.drivers[h.id].equipment : h.kind === 'car' ? state.car.upgrade : state.team.facility;
}
function placeOf(state: TeamCardState, cardId: string): CardHolder | 'locker' | null {
  if (state.locker.some(c => c.id === cardId)) return 'locker';
  for (const [id, d] of Object.entries(state.drivers)) if (d.equipment.some(c => c.id === cardId)) return { kind: 'driver', id: Number(id) };
  if (state.car.upgrade.some(c => c.id === cardId)) return { kind: 'car' };
  if (state.team.facility.some(c => c.id === cardId)) return { kind: 'team' };
  return null;
}
/** Cards with one more: a trait stacks, gear takes the slot. */
function withCard(own: Card[], gear: Card[], extra: Card | null): Card[] {
  if (!extra) return [...own, ...gear];
  return extra.kind === 'trait' ? [...own, ...gear, extra] : [...own, extra];
}

export default function Paddock({ facts, onChange, onMenu, onEndSeason, onGo }: Props) {
  const pool = useMemo(() => poolFor(facts), [facts.setup]); // eslint-disable-line react-hooks/exhaustive-deps
  const teams = useMemo(() => teamsOf(facts), [facts.setup]); // eslint-disable-line react-hooks/exhaustive-deps
  const rosters = useMemo(() => draftState(pool, facts.draftPicks).rosters, [pool, facts.draftPicks]);
  const state = seasonState(facts);
  const hotseat = facts.setup.humans.length > 1;
  const turn = state.whoseTurn;
  const [tab, setTab] = useState<'team' | 'league'>('team');
  const [readyFor, setReadyFor] = useState<string | null>(hotseat ? null : facts.setup.humans[0]?.teamId ?? null);
  const [revealed, setRevealed] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [held, setHeld] = useState<string | null>(null); // a gear card picked up (when the pack card isn't in hand)
  const [confirmTrait, setConfirmTrait] = useState<HolderKey | null>(null);
  const [chosen, setChosen] = useState<number[] | null>(null);
  const [detail, setDetail] = useState<{ title: string; reading: StatReading } | { card: Card } | null>(null);

  const commit = (next: SeasonFacts) => { saveSeason(next); onChange(next); };
  const total = facts.setup.calendar.length;
  const round = Math.min(state.round, total - 1);
  const trackId = facts.setup.calendar[round];
  const track = getTrackById(trackId);
  const trackFav = getDeckTrackById(trackId)?.favours ?? [];
  const weather = weatherForRace(facts.setup.seed, round, facts.setup.ruleset?.weather.weights);
  const priority = new Set([...trackFav, ...weather.favours].map(f => f.stat));
  const viewer = turn ?? facts.setup.humans[0].teamId;
  const you = teams[viewer];
  const standings = constructorStandings(facts);
  const myRank = standings.find(s => s.teamId === viewer);

  if (turn && hotseat && readyFor !== turn) {
    return <Handoff team={teams[turn]} label={humanLabel(facts, turn)!} what={`Paddock · round ${state.round + 1}`} onReady={() => { setReadyFor(turn); setChosen(null); setRevealed(false); setHeld(null); setTab('team'); }} />;
  }

  const roster = rosters[viewer];
  const cards = teamCardState(facts, viewer);
  const pack = turn ? pendingPack(facts) : null;
  const myTurn = !!turn && state.phase === 'paddock';
  const lineup = chosen ?? lineupFor(facts, state.round, viewer);
  const car = pool.cars.find(c => c.id === roster.carId)!;
  const team = pool.teams.find(t => t.id === viewer)!;
  const allGear = [...cards.locker, ...Object.values(cards.drivers).flatMap(d => d.equipment), ...cards.car.upgrade, ...cards.team.facility];

  // The card in hand: the revealed pack card, else a picked-up gear card.
  const packInHand = !!pack && revealed;
  const hand: Card | null = packInHand ? pack!.card : held ? allGear.find(c => c.id === held) ?? null : null;
  const fitsRow = (k: HolderKey) => {
    if (!hand || !myTurn) return false;
    const h = holderOf(k);
    if (packInHand) return hand.kind === 'trait' ? h.kind === hand.target : GEAR_FOR[h.kind] === hand.kind;
    const at = placeOf(cards, hand.id);
    return GEAR_FOR[h.kind] === hand.kind && !(at && at !== 'locker' && keyOf(at) === k);
  };
  const lockerFits = !!hand && myTurn && hand.kind !== 'trait' && (packInHand || placeOf(cards, hand.id) !== 'locker');

  const readRow = (k: HolderKey, extra: Card | null) => {
    if (k === 'car') return CAR_STATS.map(s => readStat(s, car.stats[s as keyof typeof car.stats], withCard([...car.traits, ...cards.car.traits], cards.car.upgrade, extra)));
    if (k === 'team') return TEAM_STATS.map(s => readStat(s, team.teamStats[s as keyof typeof team.teamStats], withCard([...team.traits, ...cards.team.traits], cards.team.facility, extra)));
    const id = Number(k);
    const d = pool.drivers.find(x => x.id === id)!;
    return DRIVER_STATS.map(s => readStat(s, d.stats[s as keyof typeof d.stats], withCard([...d.traits, ...cards.drivers[id].traits], cards.drivers[id].equipment, extra)));
  };
  const targetName = (k: HolderKey) => (k === 'car' ? car.name : k === 'team' ? you.name : pool.drivers.find(x => x.id === Number(k))!.fullName);

  // Actions
  const givePack = (k: HolderKey) => {
    if (!pack) return;
    const target = holderOf(k);
    const slot = pack.card.kind === 'trait' ? [] : slotOf(cards, target);
    commit(applyPack(facts, { type: 'pack', round: pack.round, teamId: pack.teamId, tier: pack.tier, cardId: pack.card.id, target, replaces: slot[0]?.id }));
    setConfirmTrait(null);
  };
  /** Keep a pack gear card for later: it lands on its slot (a pack card always lands on a holder), moves to
   * the locker, and whatever was in the slot goes back. All plain facts, so the season replays exactly. */
  const packToLocker = () => {
    if (!pack || pack.card.kind === 'trait') return;
    const target: CardHolder = pack.card.kind === 'equipment' ? { kind: 'driver', id: roster.driverIds[0] } : pack.card.kind === 'upgrade' ? { kind: 'car' } : { kind: 'team' };
    const occupant = slotOf(cards, target)[0];
    let next = applyPack(facts, { type: 'pack', round: pack.round, teamId: pack.teamId, tier: pack.tier, cardId: pack.card.id, target, replaces: occupant?.id });
    next = moveGear(next, { type: 'move', round: state.round, teamId: viewer, cardId: pack.card.id, to: 'locker' });
    if (occupant) next = moveGear(next, { type: 'move', round: state.round, teamId: viewer, cardId: occupant.id, to: target });
    commit(next);
  };
  /** Gear into a slot; a full slot sends its card to the locker first (two moves, both facts). */
  const moveTo = (cardId: string, to: CardHolder | 'locker') => {
    setHeld(null);
    if (!myTurn) return;
    let next = facts;
    if (to !== 'locker') {
      const occupant = slotOf(cards, to)[0];
      if (occupant && occupant.id !== cardId) next = moveGear(next, { type: 'move', round: state.round, teamId: viewer, cardId: occupant.id, to: 'locker' });
    }
    commit(moveGear(next, { type: 'move', round: state.round, teamId: viewer, cardId, to }));
  };
  const placeOn = (k: HolderKey) => {
    if (!fitsRow(k)) return;
    if (packInHand) { if (pack!.card.kind === 'trait') setConfirmTrait(k); else givePack(k); return; }
    if (hand) moveTo(hand.id, holderOf(k));
  };
  const placeInLocker = () => { if (!lockerFits) return; if (packInHand) packToLocker(); else if (hand) moveTo(hand.id, 'locker'); };
  const tapChip = (c: Card) => {
    const isGear = c.kind !== 'trait' && !!placeOf(cards, c.id);
    if (isGear && myTurn && !packInHand) { setHeld(h => (h === c.id ? null : c.id)); return; }
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
  const dropOn = (k: HolderKey | 'locker') => ({
    onDragOver: (e: DragEvent) => { if (k === 'locker' ? lockerFits : fitsRow(k)) e.preventDefault(); },
    onDrop: (e: DragEvent) => { e.preventDefault(); if (k === 'locker') placeInLocker(); else placeOn(k); },
  });

  const chip = (c: Card, gear: boolean) => (
    <CardChip
      key={c.id}
      card={c}
      held={!packInHand && held === c.id}
      onClick={() => tapChip(c)}
      draggable={gear && myTurn && !packInHand}
      onDragStart={e => { e.dataTransfer.setData('text/plain', c.id); setHeld(c.id); }}
    />
  );

  // One row of grades: OVR + stats (+ dots where a stat doesn't apply), flashing while a fitting card is in hand.
  const gradeCells = (k: HolderKey, title: string, stats: StatKey[], present: Set<StatKey>, dim: boolean) => {
    const now = readRow(k, null);
    const after = fitsRow(k) ? readRow(k, hand) : null;
    const nowBy = new Map(now.map(r => [r.stat, r]));
    const afterBy = after ? new Map(after.map(r => [r.stat, r])) : null;
    return (
      <>
        <GradeCell value={overall(now).total} flashTo={after ? overall(after).total : undefined} dim={dim} strong onOpen={fitsRow(k) ? () => placeOn(k) : undefined} />
        {stats.map(s => {
          if (!present.has(s)) return <td key={s} className="rt-cell rt-na">·</td>;
          const r = nowBy.get(s)!;
          return (
            <GradeCell
              key={s}
              value={r.total}
              flashTo={afterBy?.get(s)?.total}
              notch={r.parts.length > 0}
              dim={dim}
              onOpen={() => (fitsRow(k) ? placeOn(k) : setDetail({ title: `${title} · ${STAT_LABELS[s]}`, reading: r }))}
            />
          );
        })}
      </>
    );
  };
  const nameCell = (k: HolderKey, body: JSX.Element) => (
    <th className="rt-name" scope="row" {...dropOn(k)}>
      {fitsRow(k)
        ? <button type="button" className="rt-pick" onClick={() => placeOn(k)} aria-label={`Put ${hand!.name} on ${targetName(k)}`}>{body}</button>
        : body}
    </th>
  );
  const rowClass = (k: HolderKey, extra = '') => `${fitsRow(k) ? 'target' : ''} ${extra}`.trim();

  // The turn, in one line
  const step = !myTurn ? -1 : pack ? (revealed ? 1 : 0) : lineup.length === 2 ? 3 : 2;
  const STEPS = ['Open pack', 'Place card', 'Pick 2', 'Lock in'];
  const turnLine = state.phase === 'ready-for-go' ? (
    <div className="pk-go"><span>Every team is set for round {state.round + 1}.</span><button type="button" className="rs-btn rs-btn-primary" onClick={onGo}>Go: round {state.round + 1}</button></div>
  ) : myTurn && (
    <div className="pk-turn">
      <ol aria-label="Your turn">
        {STEPS.map((s, i) => <li key={s} className={i < step ? 'done' : i === step ? 'now' : ''}>{i + 1} · {s}</li>)}
      </ol>
      {step === 0 && <button type="button" className="rs-btn rs-btn-primary" onClick={() => setRevealing(true)}>Open pack</button>}
      {step >= 2 && <button type="button" className="rs-btn rs-btn-primary" disabled={lineup.length !== 2} onClick={lock}>Lock in</button>}
    </div>
  );

  const priorityLine = (
    <p className="pk-priority">
      <span className="rs-k">Next race · priority stats</span>{' '}
      {trackFav.length > 0 && <><b>{trackFav.map(f => STAT_LABELS[f.stat]).join(' + ')}</b> ({track?.name ?? 'the'} track, +10%)</>}
      {weather.favours.length > 0 && <>{trackFav.length > 0 && ' and '}<b>{weather.favours.map(f => STAT_LABELS[f.stat]).join(' + ')}</b> ({weather.name} weather, +{Math.round(weather.favours[0].pct)}%)</>}
      , for everyone.
    </p>
  );

  const hint = !hand ? null : packInHand
    ? (hand.kind === 'trait' ? `Tap a glowing ${hand.target === 'driver' ? 'driver' : hand.target} to give it. The flashing grades show what it does. Traits are permanent.` : `Tap a glowing ${hand.target === 'driver' ? 'driver' : hand.target} to put it on, or the glowing locker to keep it. The flashing grades show what it does.`)
    : `Moving ${hand.name}: tap a glowing row or the locker. Tap the card again to put it down.`;

  const teamTab = (
    <>
      {turnLine}
      {priorityLine}
      {pack && myTurn && (
        <div className="pk-pack">
          {revealed ? <CardChip card={pack.card} size={44} held onClick={() => setDetail({ card: pack.card })} /> : <span className="pk-sealed"><GameIcon name="season.pack" size={26} /></span>}
          <div className="pk-pack-text">
            <span className="rs-k pk-pack-k">Base deck · {TIER_LABEL[pack.tier]} pack</span>
            <b>{revealed ? pack.card.name : 'Sealed'}</b>
            <span className="rs-hint">{revealed ? hint : 'Open it to see the card.'}</span>
          </div>
        </div>
      )}
      {!packInHand && hand && <p className="rs-hint pk-hint">{hint}</p>}
      <div className="rt-legend">
        {priority.size > 0 && <span><span className="rt-prio-key">{ABBR[[...priority][0]]}</span> next race priority</span>}
        <span><i className="rt-notch-key" /> cards change this stat · tap a grade for the sum</span>
        <span>Tap a card for the full card{myTurn ? '; tap gear to move it' : ''}</span>
      </div>
      <div className="rt-scroll">
        <table className="rt">
          <thead>
            <tr>
              <th className="rt-name">Driver</th>
              <th className="rt-oc">OVR</th>
              {DRIVER_STATS.map(s => <th key={s} className={`rt-stat ${priority.has(s) ? 'prio' : ''}`} title={STAT_LABELS[s]}>{ABBR[s]}</th>)}
              <th className="rt-slot">Gear</th>
              <th className="rt-traits">Traits</th>
              <th className="rt-act">Car</th>
            </tr>
          </thead>
          <tbody>
            {roster.driverIds.map(id => {
              const d = pool.drivers.find(x => x.id === id)!;
              const k = String(id);
              const carNo = lineup.indexOf(id);
              const gear = cards.drivers[id].equipment[0];
              return (
                <tr key={id} className={rowClass(k, carNo < 0 ? 'benched' : '')}>
                  {nameCell(k, <><RaceNumber n={d.number} color={you.color} ink={you.ink} size={24} shape="square" className="rt-numsq" /><span className="rt-nm">{d.fullName}</span></>)}
                  {gradeCells(k, d.fullName, DRIVER_STATS, new Set(DRIVER_STATS), carNo < 0)}
                  <td className="rt-slot" {...dropOn(k)}>{gear ? chip(gear, true) : <span className="pk-empty" aria-label="Empty gear slot">—</span>}</td>
                  <td className="rt-traits"><span className="rt-minis">{[...d.traits, ...cards.drivers[id].traits].map(c => chip(c, false))}</span></td>
                  <td className="rt-act">
                    {myTurn
                      ? <button type="button" className={`pk-toggle ${carNo >= 0 ? 'on' : ''}`} onClick={() => toggleCar(id)} aria-pressed={carNo >= 0}>{carNo >= 0 ? `Car ${carNo + 1}` : '—'}</button>
                      : <span className="pk-carno">{carNo >= 0 ? `Car ${carNo + 1}` : '—'}</span>}
                  </td>
                </tr>
              );
            })}
            <tr className="rt-sub">
              <th className="rt-name">Car &amp; team</th>
              <th className="rt-oc">OVR</th>
              {CT_STATS.map(s => <th key={s} className={`rt-stat ${priority.has(s) ? 'prio' : ''}`} title={STAT_LABELS[s]}>{ABBR[s]}</th>)}
              {Array.from({ length: PAD }, (_, i) => <th key={i} className="rt-stat rt-pad" />)}
              <th className="rt-slot">Gear</th>
              <th className="rt-traits">Traits</th>
              <th className="rt-act" />
            </tr>
            {(['car', 'team'] as const).map(k => {
              const gear = k === 'car' ? cards.car.upgrade[0] : cards.team.facility[0];
              const traits = k === 'car' ? [...car.traits, ...cards.car.traits] : [...team.traits, ...cards.team.traits];
              return (
                <tr key={k} className={rowClass(k)}>
                  {nameCell(k, k === 'car' ? <span className="rt-nm">{car.name}</span> : <><TeamLogo team={you} size={22} /><span className="rt-nm">{you.name}</span></>)}
                  {gradeCells(k, targetName(k), CT_STATS, new Set(k === 'car' ? CAR_STATS : TEAM_STATS), false)}
                  {Array.from({ length: PAD }, (_, i) => <td key={i} className="rt-cell rt-pad" />)}
                  <td className="rt-slot" {...dropOn(k)}>{gear ? chip(gear, true) : <span className="pk-empty" aria-label="Empty gear slot">—</span>}</td>
                  <td className="rt-traits"><span className="rt-minis">{traits.map(c => chip(c, false))}</span></td>
                  <td className="rt-act" />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div
        className={`pk-locker ${lockerFits ? 'droppable pulse' : ''}`}
        {...dropOn('locker')}
        {...(lockerFits ? { onClick: placeInLocker, role: 'button', tabIndex: 0, onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); placeInLocker(); } }, 'aria-label': `Keep ${hand!.name} in the locker` } : {})}
      >
        <span className="rs-k">Locker · {cards.locker.length}</span>
        <span className="rt-minis">{cards.locker.length ? cards.locker.map(c => chip(c, true)) : <span className="pk-empty" aria-label="Empty locker">—</span>}</span>
        <span className="rs-hint">{lockerFits ? `Tap here to keep ${hand!.name} for later.` : myTurn ? 'Tap a gear card to pick it up, then tap where it goes. Drag works on desktop.' : ''}</span>
      </div>
    </>
  );

  const drivers = driverStandings(facts);
  const teamOfDriver = (id: number) => Object.keys(rosters).find(t => rosters[t].driverIds.includes(id))!;
  const humans = facts.setup.humans.map(h => h.teamId);
  const leagueTab = (
    <>
      <p className="pk-priority">
        <span className="rs-k">After round {facts.results.length} of {total}</span>{' '}
        {you.name} {myRank ? ord(myRank.rank) : ''} on <b>{myRank?.points ?? 0}</b> · leader {teams[standings[0].teamId].name} on {standings[0].points}. The drivers' champion's team gets +50 at the end.
      </p>
      <div className="pk-league">
        <div className="pk-chart">
          <div className="rs-k">Constructors' points, race by race</div>
          {facts.results.length ? <SeasonChart standings={standings} teams={teams} mine={humans} /> : <p className="rs-hint">The chart starts after round 1.</p>}
        </div>
        <div className="pk-tables">
          <div className="rt-scroll">
            <table className="rt rt-compact">
              <thead><tr><th className="rt-pos">Pos</th><th className="rt-name">Constructors</th><th className="rt-numcol">Wins</th><th className="rt-numcol">Pts</th></tr></thead>
              <tbody>
                {standings.map(s => (
                  <tr key={s.teamId} className={humans.includes(s.teamId) ? 'mine' : ''}>
                    <td className="rt-pos">{s.rank}</td>
                    <th className="rt-name" scope="row"><TeamLogo team={teams[s.teamId]} size={18} /><span className="rt-nm">{teams[s.teamId].name}</span></th>
                    <td className="rt-numcol">{s.wins}</td>
                    <td className="rt-numcol">{s.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rt-scroll">
            <table className="rt rt-compact">
              <thead><tr><th className="rt-pos">Pos</th><th className="rt-name">Drivers</th><th className="rt-numcol">Wins</th><th className="rt-numcol">Pts</th></tr></thead>
              <tbody>
                {drivers.map((d, i) => {
                  const p = pool.drivers.find(x => x.id === d.driverId)!;
                  const t = teams[teamOfDriver(d.driverId)];
                  return (
                    <tr key={d.driverId} className={humans.includes(t.id) ? 'mine' : ''}>
                      <td className="rt-pos">{i + 1}</td>
                      <th className="rt-name" scope="row"><RaceNumber n={p.number} color={t.color} ink={t.ink} size={20} shape="square" className="rt-numsq" /><span className="rt-nm">{p.fullName}</span></th>
                      <td className="rt-numcol">{d.wins}</td>
                      <td className="rt-numcol">{d.points}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="run-setup season-setup ss-paddock pk" style={teamThemeVars(you)}>
      <header className="pk-head">
        <TeamLogo team={you} size={32} />
        <div className="pk-title">
          <button type="button" className="rs-back" onClick={onMenu}>← Menu</button>
          <h1 className="rs-title">Paddock</h1>
          <span className="rs-sub">Round {state.round + 1} of {total} · {you.name}</span>
        </div>
        <EndSeason onEnded={onEndSeason} />
      </header>
      <div className="pk-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'team'} onClick={() => setTab('team')}>Team</button>
        <button type="button" role="tab" aria-selected={tab === 'league'} onClick={() => setTab('league')}>League</button>
        {myRank && <span className="pk-rank">{ord(myRank.rank)} · {myRank.points} pts</span>}
      </div>

      {tab === 'team' ? teamTab : leagueTab}

      {revealing && pack && (
        <PackReveal card={pack.card} tier={pack.tier} onDone={() => { setRevealing(false); setRevealed(true); requestAnimationFrame(() => document.querySelector('.rt tr.target')?.scrollIntoView({ block: 'center', behavior: 'smooth' })); }} />
      )}

      {confirmTrait && pack && (
        <div className="pk-sheet" role="dialog" aria-label="Give a trait">
          <div className="pk-sheet-text">
            <span className="rs-k">Traits are permanent</span>
            <b>Give {pack.card.name} to {targetName(confirmTrait)}?</b>
            <span>It can never be removed or moved.</span>
            <span className="rt-sum">{readRow(confirmTrait, null).map((r, i) => {
              const a = readRow(confirmTrait, pack.card)[i];
              return Math.round(a.total) !== Math.round(r.total) ? <span key={r.stat}>{STAT_LABELS[r.stat]}: {r.grade} → {a.grade}</span> : null;
            })}</span>
            <span className="pk-confirm-btns">
              <button type="button" className="rs-btn rs-btn-primary" onClick={() => givePack(confirmTrait)}>Give</button>
              <button type="button" className="rs-btn rs-btn-ghost" onClick={() => setConfirmTrait(null)}>Cancel</button>
            </span>
          </div>
        </div>
      )}

      {detail && (
        <div className="pk-sheet" role="dialog" aria-label="Detail">
          {'card' in detail
            ? <><CardFace card={detail.card} size="small" flippable={false} /><div className="pk-sheet-text"><span className="rs-k">{detail.card.kind} · {detail.card.target}{detail.card.rarity ? ` · ${detail.card.rarity}` : ''}</span><b>{detail.card.name}</b>{detail.card.stats.map(s => <span key={s.stat}>+{s.pct}% {STAT_LABELS[s.stat]}</span>)}<span className="rs-hint">{detail.card.kind === 'trait' ? 'Traits are for good.' : 'Gear: move it freely in any Paddock.'}</span></div></>
            : <ReadingSheet title={detail.title} reading={detail.reading} icon={STAT_ICONS[detail.reading.stat]} />}
          <button type="button" className="rs-link pk-sheet-x" onClick={() => setDetail(null)}>Close</button>
        </div>
      )}
    </div>
  );
}
