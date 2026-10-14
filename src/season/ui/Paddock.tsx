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
// Two drivers, both race (#585): no lineup choice; Lock in ends the turn.
import { raceBadges } from '../badges';
import { useMemo, useState, type DragEvent } from 'react';
import { levelDelta } from '../grades';
import { GameIcon, TeamLogo, teamThemeVars } from '../../icons/GameIcon';
import { RaceNumber } from '../../icons/RaceNumber';
import { Avatar } from '../../icons/Avatar';
import { portraitFor, vehicleFor } from '../../generators/avatars';
import { CardFace } from '../../cards/CardFace';
import { CardChip } from '../../cards/CardChip';
import { PriorityLine } from '../../cards/PriorityLine';
import { WearPill } from '../../cards/WearPill';
import { STAT_LABELS } from '../../cards/deck';
import { STAT_ICONS } from '../../icons/registry';
import type { Card, StatKey } from '../../cards/types';
import { getTrackById } from '../../generators/tracks';
import { getDeckTrackById } from '../../data/deckTracks';
import { weatherForRace } from '../../data/weather';
import { draftState } from '../draft';
import { applyPack, applyCurse, dealPack, moveGear, pendingOffer, teamCardState, CURSE_LIFE, PACK_KIND_LABEL, type CardHolder, type PackKind, type TeamCardState } from '../pack';
import { effectCards, describeLeft, activeEffects } from '../effects';
import { constructorStandings, driverStandings, lineupFor, poolFor, seasonState, setLineup, type SeasonFacts } from '../season';
import { saveCurrentLeague as saveSeason } from '../../run/current';
import { overall, readStat, type StatReading } from '../grades';
import EndSeason from './EndSeason';
import PackPick from './PackPick';
import { CAR_STATS, CT_STATS, DRIVER_STATS, GradeCell, PAD, ReadingSheet, STAT_ABBR, TEAM_STATS } from './RosterTable';
import { SeasonChart } from './SeasonChart';
import { LeagueTables } from './LeagueTables';
import { teamsOf } from './teams';
import { nemesisLine } from '../nemesis';
import DriverCard, { DriverName } from './DriverCard';
import { driverCardOf } from '../driverCard';
import { AceButton, Bunting, Chequer, ProgramLine, StateBar, StepTheme } from '../../look/Look';
import { STEPS as LOOK_STEPS, programNumber, stateLook } from '../../look/step';

interface Props {
  facts: SeasonFacts;
  onChange: (facts: SeasonFacts) => void;
  onMenu: () => void;
  onEndSeason: () => void;
  onGo: () => void;
  onStandings: () => void;
  /** The back button's label ("← The run" inside a run). */
  backLabel?: string;
}

const CURSE_LIFE_TEXT = CURSE_LIFE === 1 ? 'one race' : `${CURSE_LIFE} races`;
const GEAR_FOR: Record<CardHolder['kind'], Card['kind']> = { driver: 'equipment', car: 'upgrade', team: 'facility' };
const ABBR = STAT_ABBR;
const ord = (n: number) => `${n}${['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th'}`;

type HolderKey = string; // a driver id, 'car' or 'team'
const keyOf = (h: CardHolder): HolderKey => (h.kind === 'driver' ? String(h.id) : h.kind);
const holderOf = (k: HolderKey): CardHolder => (k === 'car' ? { kind: 'car' } : k === 'team' ? { kind: 'team' } : { kind: 'driver', id: Number(k) });

function slotOf(state: TeamCardState, h: CardHolder): Card[] {
  return h.kind === 'driver' ? state.drivers[h.id].equipment : h.kind === 'car' ? state.car.upgrade : state.team.facility;
}
/** Cards with one more: a trait stacks, gear takes the slot. */
function withCard(own: Card[], gear: Card[], extra: Card | null): Card[] {
  if (!extra) return [...own, ...gear];
  return extra.kind === 'trait' ? [...own, ...gear, extra] : [...own, extra];
}

export default function Paddock({ facts, onChange, onMenu, onEndSeason, onGo, backLabel = '← Menu' }: Props) {
  const pool = useMemo(() => poolFor(facts), [facts.setup]); // eslint-disable-line react-hooks/exhaustive-deps
  const badges = useMemo(() => raceBadges(facts), [facts.setup, facts.draftPicks]); // eslint-disable-line react-hooks/exhaustive-deps
  const teams = useMemo(() => teamsOf(facts), [facts.setup]); // eslint-disable-line react-hooks/exhaustive-deps
  // The nemesis talks (#635): one line per Paddock visit (the round's moment).
  const spoken = useMemo(() => nemesisLine(facts), [facts.setup, facts.results.length, facts.draftPicks.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const rosters = useMemo(() => draftState(pool, facts.draftPicks).rosters, [pool, facts.draftPicks]);
  const state = seasonState(facts);
  const turn = state.whoseTurn;
  const [tab, setTab] = useState<'team' | 'league'>('team');
  const [revealing, setRevealing] = useState(false);
  // A gear card picked up: which copy (#556: two of the same card are two chips) and where it sits.
  const [held, setHeld] = useState<{ id: string; from: CardHolder | 'locker'; n: number } | null>(null);
  const [equipSheet, setEquipSheet] = useState<{ card: Card; from: CardHolder } | null>(null);
  // The driver card (#476): tap a driver's name.
  const [cardOf, setCardOf] = useState<number | null>(null);
  const [detail, setDetail] = useState<{ title: string; reading: StatReading } | { card: Card } | null>(null);

  const commit = (next: SeasonFacts) => { saveSeason(next); onChange(next); };
  const total = facts.setup.calendar.length;
  // The step and state this league wears (#705, #696): the run writes them on the league context.
  const lookStep = facts.setup.league?.step ?? 'locals';
  const lookState = stateLook(facts.setup.league?.locale?.stateId ?? 'oh');
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

  const roster = rosters[viewer];
  const cards = teamCardState(facts, viewer);
  // The pack offer (#627): pick 1 of 2 packs, one pack, or a forced curse. The pack shows its place, not its metal.
  const offer = turn ? pendingOffer(facts) : null;
  const [picked, setPicked] = useState<PackKind | null>(null);
  const pack = offer && offer.kind !== 'curse' ? dealPack(facts, offer.round, offer.teamId, picked && offer.packs.includes(picked) ? picked : offer.packs[0]) : null;
  const curse = offer?.kind === 'curse' ? offer.curse! : null;
  const myTurn = !!turn && state.phase === 'paddock';
  const lineup = lineupFor(facts, state.round, viewer);
  const car = pool.cars.find(c => c.id === roster.carId)!;
  const team = pool.teams.find(t => t.id === viewer)!;
  const allGear = [...cards.locker, ...Object.values(cards.drivers).flatMap(d => d.equipment), ...cards.car.upgrade, ...cards.team.facility];

  // Keep 1 of 3 on the reveal (#552, Pax Oct 10): the pick happens there, so
  // the table only ever holds a picked-up gear card.
  const dealt = pack ? pack.cards.map(c => c.id) : [];
  const hand: Card | null = held ? allGear.find(c => c.id === held.id) ?? null : null;
  const fitsRow = (k: HolderKey) => {
    if (!hand || !myTurn) return false;
    const h = holderOf(k);
    const at = held!.from;
    return GEAR_FOR[h.kind] === hand.kind && !(at !== 'locker' && keyOf(at) === k);
  };
  const lockerFits = !!hand && myTurn && hand.kind !== 'trait' && held!.from !== 'locker';

  // Live timed effects (a curse, #332 / #627) read like cards in the sum.
  const fx = (h: CardHolder) => effectCards(facts, viewer, round, h);
  const readRow = (k: HolderKey, extra: Card | null) => {
    if (k === 'car') return CAR_STATS.map(s => readStat(s, car.stats[s as keyof typeof car.stats], withCard([...car.traits, ...cards.car.traits, ...fx({ kind: 'car' })], cards.car.upgrade, extra)));
    if (k === 'team') return TEAM_STATS.map(s => readStat(s, team.teamStats[s as keyof typeof team.teamStats], withCard([...team.traits, ...cards.team.traits, ...fx({ kind: 'team' })], cards.team.facility, extra)));
    const id = Number(k);
    const d = pool.drivers.find(x => x.id === id)!;
    return DRIVER_STATS.map(s => readStat(s, d.stats[s as keyof typeof d.stats], withCard([...d.traits, ...cards.drivers[id].traits, ...fx({ kind: 'driver', id })], cards.drivers[id].equipment, extra)));
  };
  const liveEffects = activeEffects(facts, viewer, round);
  const targetName = (k: HolderKey) => (k === 'car' ? car.name : k === 'team' ? you.name : pool.drivers.find(x => x.id === Number(k))!.fullName);

  // Actions
  /** A picked trait goes on for good, onto the target the reveal asked for. */
  const givePack = (kept: Card, k: HolderKey) => {
    if (!pack) return;
    commit(applyPack(facts, { type: 'pack', round: pack.round, teamId: pack.teamId, tier: pack.tier, pack: pack.kind, cardId: kept.id, dealt, target: holderOf(k) }));
    setRevealing(false);
  };
  /** The forced curse (#627): nothing to choose; it lands on the car or the team for three races. */
  const takeCurse = () => {
    if (!curse) return;
    commit(applyCurse(facts, { type: 'curse', round: curse.round, teamId: curse.teamId, effectId: curse.id }));
    setRevealing(false);
  };
  /** A picked gear card goes to the locker (Pax: "ghost your locker"): it lands on its slot (a pack card
   * always lands on a holder), moves to the locker, and whatever was in the slot goes back. All plain
   * facts, so the season replays exactly. */
  const packToLocker = (kept: Card) => {
    if (!pack || kept.kind === 'trait') return;
    const target: CardHolder = kept.kind === 'equipment' ? { kind: 'driver', id: roster.driverIds[0] } : kept.kind === 'upgrade' ? { kind: 'car' } : { kind: 'team' };
    const occupant = slotOf(cards, target)[0];
    let next = applyPack(facts, { type: 'pack', round: pack.round, teamId: pack.teamId, tier: pack.tier, pack: pack.kind, cardId: kept.id, dealt, target, replaces: occupant?.id });
    next = moveGear(next, { type: 'move', round: state.round, teamId: viewer, cardId: kept.id, to: 'locker' });
    if (occupant) next = moveGear(next, { type: 'move', round: state.round, teamId: viewer, cardId: occupant.id, to: target });
    commit(next);
    setRevealing(false);
  };
  /** Where a picked trait can go: its own target type only. */
  const traitTargets = (c: Card): { key: HolderKey; label: string }[] => c.target === 'driver'
    ? roster.driverIds.map(id => ({ key: String(id) as HolderKey, label: pool.drivers.find(x => x.id === id)!.fullName }))
    : c.target === 'car' ? [{ key: 'car' as HolderKey, label: car.name }] : [{ key: 'team' as HolderKey, label: you.name }];
  /** Gear into a slot; a full slot sends its card to the locker first (two moves, both facts). */
  const moveTo = (cardId: string, to: CardHolder | 'locker', from?: CardHolder | 'locker') => {
    setHeld(null);
    setEquipSheet(null);
    if (!myTurn) return;
    // Swapping a card for an identical copy changes nothing.
    if (to !== 'locker' && from === 'locker' && slotOf(cards, to)[0]?.id === cardId) return;
    let next = facts;
    if (to !== 'locker') {
      const occupant = slotOf(cards, to)[0];
      if (occupant) next = moveGear(next, { type: 'move', round: state.round, teamId: viewer, cardId: occupant.id, from: to, to: 'locker' });
    }
    // Every move names the copy it moves (#556), so duplicates never get mixed up.
    commit(moveGear(next, { type: 'move', round: state.round, teamId: viewer, cardId, from: from ?? undefined, to }));
  };
  const placeOn = (k: HolderKey) => {
    if (!fitsRow(k)) return;
    if (hand) moveTo(hand.id, holderOf(k), held!.from);
  };
  const placeInLocker = () => { if (!lockerFits) return; if (hand) moveTo(hand.id, 'locker', held!.from); };
  /** Tap a chip: a locker card is picked up (rows glow); an equipped card opens Unequip / Swap (#556); a trait shows its card. */
  const tapChip = (c: Card, from: CardHolder | 'locker' | null, n: number) => {
    if (c.kind !== 'trait' && from && myTurn) {
      if (from === 'locker') { setHeld(h => (h && h.from === 'locker' && h.n === n ? null : { id: c.id, from, n })); return; }
      setHeld(null);
      setEquipSheet({ card: c, from });
      return;
    }
    setDetail({ card: c });
  };
  const lock = () => {
    if (pack || lineup.length !== 2) return;
    commit(setLineup(facts, { round: state.round, teamId: viewer, driverIds: [lineup[0], lineup[1]] }));
  };
  const dropOn = (k: HolderKey | 'locker') => ({
    onDragOver: (e: DragEvent) => { if (k === 'locker' ? lockerFits : fitsRow(k)) e.preventDefault(); },
    onDrop: (e: DragEvent) => { e.preventDefault(); if (k === 'locker') placeInLocker(); else placeOn(k); },
  });

  const chip = (c: Card, gear: boolean, from: CardHolder | 'locker' | null = null, n = 0) => (
    <CardChip
      key={`${from === null ? 'trait' : from === 'locker' ? 'locker' : keyOf(from)}:${c.id}:${n}`}
      card={c}
      held={!!held && !!from && held.id === c.id && held.n === n && (held.from === 'locker' ? from === 'locker' : from !== 'locker' && keyOf(held.from) === keyOf(from))}
      onClick={() => tapChip(c, from, n)}
      draggable={gear && myTurn && !!from}
      onDragStart={e => { if (!from) return; e.dataTransfer.setData('text/plain', c.id); setHeld({ id: c.id, from, n }); }}
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
  const step = !myTurn ? -1 : offer ? 0 : 1;
  const STEPS = ['Open pack', 'Lock in'];
  // The one action of the turn sits in the dock (#715); the turn line keeps the steps.
  const action = state.phase === 'ready-for-go'
    ? <AceButton onClick={onGo}>Go: round {state.round + 1}</AceButton>
    : !myTurn ? null
    : step === 0 && !revealing && offer?.kind === 'single' ? <AceButton onClick={() => setRevealing(true)}>Open pack</AceButton>
    : step === 0 && !revealing && offer?.kind === 'curse' ? <AceButton onClick={() => setRevealing(true)}>Open the Curse pack</AceButton>
    : step >= 1 ? <AceButton disabled={lineup.length !== 2} onClick={lock}>Lock in</AceButton>
    : null;
  const turnLine = state.phase === 'ready-for-go' ? (
    <div className="pk-go"><span>Every team is set for round {state.round + 1}.</span></div>
  ) : myTurn && (
    <div className="pk-turn">
      <ol aria-label="Your turn">
        {STEPS.map((s, i) => <li key={s} className={i < step ? 'done' : i === step ? 'now' : ''}>{i + 1} · {s}</li>)}
      </ol>
      {step === 0 && !revealing && offer?.kind === 'choice' && <span className="rs-hint">Pick one of the two packs below.</span>}
    </div>
  );

  const priorityLine = (
    <div className="pk-priority-row">
      <PriorityLine label="Next race · priority stats" track={{ name: track?.name ?? 'the', favours: trackFav }} weather={weather} />
      <WearPill tyreWear={getDeckTrackById(trackId)?.tyreWear} />
    </div>
  );

  const hint = !hand ? null : `Moving ${hand.name}: tap a glowing row or the locker. Tap the card again to put it down.`;

  const teamTab = (
    <>
      {turnLine}
      {priorityLine}
      {offer && myTurn && (revealing && pack ? (
        <PackPick
          key={`${pack.round}:${pack.teamId}:${pack.kind}`}
          cards={pack.cards}
          tier={pack.tier}
          traitTargets={traitTargets}
          onKeep={(kept, k) => (kept.kind === 'trait' ? k && givePack(kept, k) : packToLocker(kept))}
          onDetail={c => setDetail({ card: c })}
          onClose={() => setRevealing(false)}
        />
      ) : revealing && curse ? (
        <section className="pp pp-curse" aria-label="Curse pack">
          <div className="pp-head"><span className="rs-k">Curse pack · nothing to choose</span><button type="button" className="rs-link" onClick={() => setRevealing(false)}>Later</button></div>
          <div className="pp-keep">
            <b>{curse.emoji} {curse.name}: {curse.stats.map(s => `${levelDelta(s.pct)} ${STAT_LABELS[s.stat]}`).join(', ')} on {curse.target.kind === 'car' ? car.name : you.name}, both drivers, for {CURSE_LIFE_TEXT}.</b>
            <button type="button" className="rs-btn rs-btn-primary" onClick={takeCurse}>Take the curse</button>
            <span className="rs-hint">Bad luck. It lifts on its own; benching can't dodge it.</span>
          </div>
        </section>
      ) : (
        <div className={`pk-pack ${offer.kind === 'choice' ? 'pk-offer' : ''}`}>
          {offer.kind === 'curse' ? (
            <>
              <button type="button" className="pk-sealed pk-sealed-curse" onClick={() => setRevealing(true)} aria-label="Open the Curse pack"><GameIcon name="season.pack" size={30} /></button>
              <div className="pk-pack-text">
                <span className="rs-k pk-pack-k">Curse pack</span>
                <b>Forced</b>
                <span className="rs-hint">Unlucky: this round's only pack is a curse on the car or the team.</span>
              </div>
            </>
          ) : offer.packs.map(kind => (
            <div key={kind} className="pk-pack-one">
              <button type="button" className="pk-sealed" onClick={() => { setPicked(kind); setRevealing(true); }} aria-label={`Open the ${PACK_KIND_LABEL[kind]}`}><GameIcon name="season.pack" size={30} /><i className="pk-twinkle a" /><i className="pk-twinkle b" /><i className="pk-twinkle c" /></button>
              <div className="pk-pack-text">
                <span className="rs-k pk-pack-k">Run deck · {PACK_KIND_LABEL[kind]}</span>
                <b>{offer.kind === 'choice' ? 'Pick this one' : 'Sealed'}</b>
                <span className="rs-hint">{kind === 'driver' ? 'A trait or equipment for a driver.' : kind === 'car' ? 'A trait or upgrade for the car.' : 'A trait or facility for the team.'} Three inside; keep one. The metal shows when it opens.</span>
              </div>
            </div>
          ))}
        </div>
      ))}
      {liveEffects.length > 0 && <p className="rs-hint pk-hint">{liveEffects.map(e => `${e.emoji} ${e.name}: ${describeLeft(e)}`).join(' · ')}</p>}
      {hand && <p className="rs-hint pk-hint">{hint}</p>}
      <div className="rt-legend">
        {priority.size > 0 && <span><span className="rt-prio-key">{ABBR[[...priority][0]]}</span> next race priority</span>}
        <span><i className="rt-notch-key" /> cards change this stat · tap a level for the sum</span>
        <span>Tap a card for the full card{myTurn ? '; tap gear to move it' : ''}</span>
      </div>
      <div className="ace-panel flat pk-sheet-panel"><div className="rt-scroll">
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
                <tr key={id} className={rowClass(k)}>
                  {nameCell(k, <><RaceNumber n={badges[d.id] ?? d.number} color={you.color} ink={you.ink} size={24} shape="square" className="rt-numsq" /><Avatar icon={portraitFor(pool.seed, d.id)} color={you.color} size={22} />{fitsRow(k) ? <span className="rt-nm">{d.fullName}</span> : <DriverName name={d.fullName} onOpen={() => setCardOf(d.id)} />}</>)}
                  {gradeCells(k, d.fullName, DRIVER_STATS, new Set(DRIVER_STATS), false)}
                  <td className="rt-slot" {...dropOn(k)}>{gear ? chip(gear, true, holderOf(k)) : <span className="pk-empty" aria-label="Empty gear slot">—</span>}</td>
                  <td className="rt-traits"><span className="rt-minis">{[...d.traits, ...cards.drivers[id].traits].map(c => chip(c, false))}</span></td>
                  <td className="rt-act"><span className="pk-carno">Car {carNo + 1}</span></td>
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
                  {nameCell(k, k === 'car' ? <><Avatar icon={vehicleFor(pool.seed, car.id)} color={you.color} size={26} /><span className="rt-nm">{car.name}</span></> : <><TeamLogo team={you} size={22} /><span className="rt-nm">{you.name}</span></>)}
                  {gradeCells(k, targetName(k), CT_STATS, new Set(k === 'car' ? CAR_STATS : TEAM_STATS), false)}
                  {Array.from({ length: PAD }, (_, i) => <td key={i} className="rt-cell rt-pad" />)}
                  <td className="rt-slot" {...dropOn(k)}>{gear ? chip(gear, true, holderOf(k)) : <span className="pk-empty" aria-label="Empty gear slot">—</span>}</td>
                  <td className="rt-traits"><span className="rt-minis">{traits.map(c => chip(c, false))}</span></td>
                  <td className="rt-act" />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div></div>
      <div
        className={`pk-locker ${lockerFits ? 'droppable pulse' : ''}`}
        {...dropOn('locker')}
        {...(lockerFits ? { onClick: placeInLocker, role: 'button', tabIndex: 0, onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); placeInLocker(); } }, 'aria-label': `Keep ${hand!.name} in the locker` } : {})}
      >
        <span className="rs-k">Locker · {cards.locker.length}</span>
        <span className="rt-minis">{cards.locker.length ? cards.locker.map((c, i) => chip(c, true, 'locker', i)) : <span className="pk-empty" aria-label="Empty locker">—</span>}</span>
        <span className="rs-hint">{lockerFits ? `Tap here to keep ${hand!.name} for later.` : myTurn ? 'Tap a gear card to pick it up, then tap where it goes. Drag works on desktop.' : ''}</span>
      </div>
    </>
  );

  const drivers = driverStandings(facts);
  const humans = facts.setup.humans.map(h => h.teamId);
  const leagueTab = (
    <>
      <p className="pk-priority">
        <span className="rs-k">After round {facts.results.length} of {total}</span>{' '}
        {you.name} {myRank ? ord(myRank.rank) : ''} on <b>{myRank?.points ?? 0}</b> · leader {teams[standings[0].teamId].name} on {standings[0].points}. Two titles: Constructors' (team points) and Drivers'.
      </p>
      <div className="pk-league">
        <div className="pk-chart">
          <div className="rs-k">Constructors' points, race by race</div>
          {facts.results.length ? <SeasonChart standings={standings} teams={teams} mine={humans} /> : <p className="rs-hint">The chart starts after round 1.</p>}
        </div>
        <div className="pk-tables">
          <LeagueTables facts={facts} pool={pool} teams={teams} rosters={rosters} lines={standings} drivers={drivers} onDriver={setCardOf} />
        </div>
      </div>
    </>
  );

  return (
    <StepTheme step={lookStep} state={lookState} className="ace-page pk" style={teamThemeVars(you)}>
      <Bunting />
      <ProgramLine right={`No. ${programNumber(facts.setup.seed)} · 10¢`} />
      <StateBar><b>{LOOK_STEPS.find(s => s.id === lookStep)!.name}</b> · round {state.round + 1} of {total}</StateBar>
      <header className="pk-head">
        <button type="button" className="ace-link" onClick={onMenu}>{backLabel.replace(/^← /, '')}</button>
        <span className="ace-where pk-you"><TeamLogo team={you} size={20} /> {you.name}</span>
        <EndSeason onEnded={onEndSeason} />
      </header>
      <h1 className="ace-h1">The Paddock</h1>
      <Chequer />
      {spoken && (
        <section className="nem-line" aria-label="Your nemesis">
          <TeamLogo team={teams[spoken.teamId]} size={36} />
          <div className="nem-says">
            {spoken.lines.map((line, i) => (
              <div key={i} className="nem-say">
                <p className="nem-text">“{line.text}”</p>
                {line.en && <p className="nem-en">{line.en}</p>}
                <span className="nem-who">{line.who}<span className="nem-tag">NEMESIS</span></span>
              </div>
            ))}
          </div>
        </section>
      )}
      <div className="ace-tabs pk-tabs" role="tablist">
        <button type="button" role="tab" className={`ace-tab ${tab === 'team' ? 'on' : ''}`} aria-selected={tab === 'team'} onClick={() => setTab('team')}>Team</button>
        <button type="button" role="tab" className={`ace-tab ${tab === 'league' ? 'on' : ''}`} aria-selected={tab === 'league'} onClick={() => setTab('league')}>League</button>
        {myRank && <span className="pk-rank">{ord(myRank.rank)} · {myRank.points} pts</span>}
      </div>

      {tab === 'team' ? teamTab : leagueTab}


      {equipSheet && (() => {
        const { card: c, from } = equipSheet;
        const swaps = cards.locker.map((l, i) => ({ l, i })).filter(({ l }) => l.kind === c.kind);
        return (
          <div className="pk-sheet" role="dialog" aria-label={`${c.name}: unequip or swap`}>
            <div className="pk-sheet-text">
              <span className="rs-k">On {targetName(keyOf(from))}</span>
              <b>{c.name}</b>
              <span className="pk-confirm-btns">
                <button type="button" className="rs-btn rs-btn-primary" onClick={() => moveTo(c.id, 'locker', from)}>Unequip to locker</button>
                <button type="button" className="rs-btn" onClick={() => { setEquipSheet(null); setHeld({ id: c.id, from, n: 0 }); }}>Move to another row</button>
              </span>
              {swaps.length > 0 && (
                <>
                  <span className="rs-k">Swap with a locker card</span>
                  <span className="rt-minis pk-swaps">{swaps.map(({ l, i }) => (
                    <CardChip key={`swap:${l.id}:${i}`} card={l} size={36} onClick={() => moveTo(l.id, from, 'locker')} />
                  ))}</span>
                </>
              )}
              <span className="pk-confirm-btns">
                <button type="button" className="rs-btn rs-btn-ghost" onClick={() => setDetail({ card: c })}>Full card</button>
                <button type="button" className="rs-btn rs-btn-ghost" onClick={() => setEquipSheet(null)}>Close</button>
              </span>
            </div>
          </div>
        );
      })()}

      {cardOf !== null && (() => { const data = driverCardOf(facts, cardOf, round); return data && <DriverCard data={data} onClose={() => setCardOf(null)} />; })()}
      {detail && (
        <div className="pk-sheet" role="dialog" aria-label="Detail">
          {'card' in detail
            ? <><CardFace card={detail.card} size="small" flippable={false} /><div className="pk-sheet-text"><span className="rs-k">{detail.card.kind} · {detail.card.target}{detail.card.rarity ? ` · ${detail.card.rarity}` : ''}</span><b>{detail.card.name}</b>{detail.card.rule ? <span>{detail.card.rule}</span> : detail.card.stats.map(s => <span key={s.stat}>{levelDelta(s.pct)} {STAT_LABELS[s.stat]}</span>)}<span className="rs-hint">{detail.card.kind === 'trait' ? 'Traits are for good.' : 'Gear: move it freely in any Paddock.'}</span></div></>
            : <ReadingSheet title={detail.title} reading={detail.reading} icon={STAT_ICONS[detail.reading.stat]} />}
          <button type="button" className="rs-link pk-sheet-x" onClick={() => setDetail(null)}>Close</button>
        </div>
      )}
      {action && <div className="ace-dock">{action}</div>}
    </StepTheme>
  );
}
