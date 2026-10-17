// The Paddock (#319; roster table #452; v2 with Pax, Oct 9; stamps #704; the
// flow #778). One screen, two columns on a desktop: your garage on the left
// (the Parcel face up when one waits, then the roster table: drivers, car
// and garage, grades in fixed cells, stamps as chips), the league's two
// tables on the right. One action in the dock: Go racing.
//
// The turn (#704, #778): a PARCEL waits before every race, open on arrival.
// Lift one of its three stamps (the rows it fits glow and flash the grade
// it would give), stamp it on a driver card or the car card (a full card
// asks what to scrape off), or leave the box shut. A smudged Parcel is a bad
// stamp for one race, nothing to choose. That is the turn: both drivers race
// (#585), so the lineup is written the moment the Parcel is dealt with.
import { raceBadges } from '../badges';
import { useEffect, useMemo, useState } from 'react';
import { levelDelta } from '../grades';
import { teamThemeVars } from '../../icons/GameIcon';
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
import { getDeckTrackById } from '../../data/deckTracks';
import { venueFor } from '../venues';
import { weatherForRace } from '../../data/weather';
import { draftState } from '../draft';
import { openParcel, pendingParcel, teamStamps, holderFits, isInk, STAMP_SLOTS, SMUDGE_LIFE, GEAR_LIFE, TITLE_STAMP_PREFIX, type StampHolder } from '../stamps';
import { effectCards, describeLeft, activeEffects } from '../effects';
import { constructorStandings, driverStandings, lineupFor, poolFor, seasonState, setLineup, validateLineup, type SeasonFacts } from '../season';
import { stageOf, isOut } from '../format';
import { saveCurrentLeague as saveSeason } from '../../run/current';
import { ordinal } from '../../run/ladderView';
import { overall, readStat, type StatReading } from '../grades';
import ParcelPick, { type StampTarget } from './ParcelPick';
import { CAR_STATS, CT_STATS, DRIVER_STATS, GradeCell, PAD, ReadingSheet, STAT_ABBR, TEAM_STATS } from './RosterTable';
import { LeagueTables } from './LeagueTables';
import { garageLabels, teamsOf } from './teams';
import { GarageName } from './GarageName';
import { nemesisLine } from '../nemesis';
import DriverCard, { DriverName } from './DriverCard';
import { driverCardOf } from '../driverCard';
import RunHeader from './RunHeader';
import { AceButton, StepTheme } from '../../look/Look';
import { stateLook } from '../../look/step';

interface Props {
  facts: SeasonFacts;
  onChange: (facts: SeasonFacts) => void;
  onMenu: () => void;
  onRoad: () => void;
  onEndRun: () => void;
  onGo: () => void;
}

const SMUDGE_LIFE_TEXT = SMUDGE_LIFE === 1 ? 'one race' : `${SMUDGE_LIFE} races`;
const ABBR = STAT_ABBR;

/** A table row: a driver id, 'car' or 'team'. The car and team rows share the car card (#704). */
type RowKey = string;
const holderOf = (k: RowKey): StampHolder => (k === 'car' || k === 'team' ? { kind: 'car' } : { kind: 'driver', id: Number(k) });
/** Whether a lifted stamp would land on this row: driver stamps on their driver, car stamps on the car row, garage stamps on the team row. */
const rowFits = (c: Card, k: RowKey) => (k === 'car' ? c.target === 'car' : k === 'team' ? c.target === 'team' : c.target === 'driver');

/** The lineup written for the team on the clock, when it can be: both cars race, nothing to decide (#585, #778). */
function lockedIn(facts: SeasonFacts): SeasonFacts {
  const state = seasonState(facts);
  if (state.phase !== 'paddock' || !state.whoseTurn) return facts;
  const lineup = { round: state.round, teamId: state.whoseTurn, driverIds: lineupFor(facts, state.round, state.whoseTurn) };
  return validateLineup(facts, lineup) === null ? setLineup(facts, lineup) : facts;
}

export default function Paddock({ facts, onChange, onMenu, onRoad, onEndRun, onGo }: Props) {
  const pool = useMemo(() => poolFor(facts), [facts.setup]); // eslint-disable-line react-hooks/exhaustive-deps
  const badges = useMemo(() => raceBadges(facts), [facts.setup, facts.draftPicks]); // eslint-disable-line react-hooks/exhaustive-deps
  const teams = useMemo(() => teamsOf(facts), [facts.setup]); // eslint-disable-line react-hooks/exhaustive-deps
  // How every garage is named here (#778): its title after Locals.
  const labels = useMemo(() => garageLabels(facts), [facts.setup, facts.draftPicks]); // eslint-disable-line react-hooks/exhaustive-deps
  // The nemesis talks (#635): one line per Paddock visit (the round's moment); parked with the nemesis (NEMESIS_IN_RUN).
  const spoken = useMemo(() => nemesisLine(facts), [facts.setup, facts.results.length, facts.draftPicks.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const rosters = useMemo(() => draftState(pool, facts.draftPicks).rosters, [pool, facts.draftPicks]);
  const state = seasonState(facts);
  const turn = state.whoseTurn;
  // The stamp lifted from the open Parcel: the rows it fits glow and flash.
  const [lifted, setLifted] = useState<Card | null>(null);
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
  // The venue (#750): the kind named for the step.
  const venue = venueFor(facts, round);
  const trackFav = getDeckTrackById(trackId)?.favours ?? [];
  const weather = weatherForRace(facts.setup.seed, round, facts.setup.ruleset?.weather.weights);
  const priority = new Set([...trackFav, ...weather.favours].map(f => f.stat));
  const viewer = turn ?? facts.setup.humans[0].teamId;
  const you = teams[viewer];
  const standings = constructorStandings(facts);
  const myRank = standings.find(s => s.teamId === viewer);

  const roster = rosters[viewer];
  const stamps = teamStamps(facts, viewer);
  // The Parcel on the doorstep (#704): three stamps, a Watcher gift, or a smudge. Face up on arrival (#778).
  const parcel = turn ? pendingParcel(facts) : null;
  const smudge = parcel?.kind === 'smudged' ? parcel.smudge! : null;
  const myTurn = !!turn && state.phase === 'paddock';
  const lineup = lineupFor(facts, state.round, viewer);
  const car = pool.cars.find(c => c.id === roster.carId)!;
  const team = pool.teams.find(t => t.id === viewer)!;

  // A turn with the Parcel dealt with but no lineup written (a save from before #778): write it now.
  useEffect(() => {
    if (myTurn && !parcel) { const next = lockedIn(facts); if (next !== facts) commit(next); }
  }, [facts]); // eslint-disable-line react-hooks/exhaustive-deps
  // Escape closes the stamp or level sheet.
  useEffect(() => {
    if (!detail) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDetail(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [detail]);

  const fitsRow = (k: RowKey) => !!lifted && myTurn && rowFits(lifted, k);
  // Live timed effects (a smudge, #332 / #704) read like cards in the sum.
  const fx = (k: RowKey) => effectCards(facts, viewer, round, k === 'car' ? { kind: 'car' } : k === 'team' ? { kind: 'team' } : { kind: 'driver', id: Number(k) });
  const rowStamps = (k: RowKey): Card[] => (k === 'car' ? stamps.car.filter(c => c.target === 'car') : k === 'team' ? stamps.car.filter(c => c.target === 'team') : [...stamps.drivers[Number(k)], ...(stamps.titles[Number(k)] ?? [])]);
  const readRow = (k: RowKey, extra: Card | null) => {
    const held = [...rowStamps(k), ...fx(k), ...(extra ? [extra] : [])];
    if (k === 'car') return CAR_STATS.map(s => readStat(s, car.stats[s as keyof typeof car.stats], [...car.traits, ...held]));
    if (k === 'team') return TEAM_STATS.map(s => readStat(s, team.teamStats[s as keyof typeof team.teamStats], [...team.traits, ...held]));
    const d = pool.drivers.find(x => x.id === Number(k))!;
    return DRIVER_STATS.map(s => readStat(s, d.stats[s as keyof typeof d.stats], [...d.traits, ...held]));
  };
  const liveEffects = activeEffects(facts, viewer, round);
  const rowName = (k: RowKey) => (k === 'car' ? car.name : k === 'team' ? labels[viewer]?.name ?? you.name : pool.drivers.find(x => x.id === Number(k))!.fullName);

  // Where a stamp can go: each driver card and the car card (car and garage together).
  const targets: StampTarget[] = [
    ...roster.driverIds.map(id => ({ key: String(id), label: rowName(String(id)), stamps: stamps.drivers[id], slots: STAMP_SLOTS.driver, fits: (c: Card) => holderFits(c, { kind: 'driver', id }) })),
    { key: 'car', label: `${car.name} (car and garage)`, stamps: stamps.car, slots: STAMP_SLOTS.car, fits: (c: Card) => holderFits(c, { kind: 'car' }) },
  ];

  // Actions: the Parcel dealt with is the turn; the lineup follows at once.
  const keep = (kept: Card, targetKey: string, replaces?: string) => {
    // A Watcher Box (smudged, #704 Oct 15) deals three like any Parcel: its curse rides along whatever is kept.
    if (!parcel) return;
    commit(lockedIn(openParcel(facts, { type: 'parcel', round: parcel.round, teamId: parcel.teamId, tier: parcel.tier, gift: parcel.kind === 'gift' || undefined, dealt: parcel.cards.map(c => c.id), cardId: kept.id, holder: holderOf(targetKey), replaces })));
    setLifted(null);
  };
  const leave = () => {
    if (!parcel) return;
    commit(lockedIn(openParcel(facts, { type: 'parcel', round: parcel.round, teamId: parcel.teamId, tier: parcel.tier, gift: parcel.kind === 'gift' || undefined, dealt: parcel.cards.map(c => c.id), cardId: null })));
    setLifted(null);
  };
  /** Tap a glowing row: the lifted stamp goes there; a full card asks in the Parcel strip what to scrape off. */
  const stampOn = (k: RowKey) => {
    if (!fitsRow(k) || !lifted) return;
    const t = targets.find(x => x.key === (k === 'team' ? 'car' : k))!;
    if (t.stamps.length < t.slots) keep(lifted, t.key);
  };
  // Nationals (#694): the stage, who is still in, and what the race decides.
  const stage = stageOf(facts, round);
  const out = isOut(facts, viewer);

  const chip = (c: Card, where: string) => (
    <span key={`${where}:${c.id}`} className="pk-stamp">
      <CardChip card={c} onClick={() => setDetail({ card: c })} style={c.id.startsWith(TITLE_STAMP_PREFIX) ? { outline: '2px solid var(--ace-gold)', outlineOffset: 1 } : undefined} />
      {stamps.mileage[c.id] !== undefined && <small className="pk-ink" title={`Ink: ${stamps.mileage[c.id]} race${stamps.mileage[c.id] === 1 ? '' : 's'} left`}>{stamps.mileage[c.id]}</small>}
    </span>
  );

  // One row of grades: OVR + stats (blank where a stat doesn't apply), flashing while a fitting stamp is lifted.
  const gradeCells = (k: RowKey, title: string, stats: StatKey[], present: Set<StatKey>, dim: boolean) => {
    const now = readRow(k, null);
    const after = fitsRow(k) ? readRow(k, lifted) : null;
    const nowBy = new Map(now.map(r => [r.stat, r]));
    const afterBy = after ? new Map(after.map(r => [r.stat, r])) : null;
    return (
      <>
        <GradeCell value={overall(now).total} flashTo={after ? overall(after).total : undefined} dim={dim} strong onOpen={fitsRow(k) ? () => stampOn(k) : undefined} />
        {stats.map(s => {
          if (!present.has(s)) return <td key={s} className="rt-cell rt-na" />;
          const r = nowBy.get(s)!;
          return (
            <GradeCell
              key={s}
              value={r.total}
              flashTo={afterBy?.get(s)?.total}
              notch={r.parts.length > 0}
              dim={dim}
              onOpen={() => (fitsRow(k) ? stampOn(k) : setDetail({ title: `${title} · ${STAT_LABELS[s]}`, reading: r }))}
            />
          );
        })}
      </>
    );
  };
  const nameCell = (k: RowKey, body: JSX.Element) => (
    <th className="rt-name" scope="row">
      {fitsRow(k)
        ? <button type="button" className="rt-pick" onClick={() => stampOn(k)} aria-label={`Stamp ${lifted!.name} on ${rowName(k)}`}>{body}</button>
        : body}
    </th>
  );
  const rowClass = (k: RowKey, extra = '') => `${fitsRow(k) ? 'target' : ''} ${extra}`.trim();

  // The one action of the turn sits in the dock (#715, #778): Go racing, once the Parcel is dealt with.
  const raceNo = state.round + 1;
  const dock = state.phase === 'ready-for-go'
    ? <AceButton onClick={onGo}>{out ? `Watch race ${raceNo}` : 'Go racing'}</AceButton>
    : parcel && myTurn
      ? <><AceButton tone="ghost" onClick={leave}>Leave it shut</AceButton><AceButton disabled>Go racing</AceButton></>
      : null;

  const stampsCell = (k: RowKey, own: Card[]) => {
    const held = rowStamps(k);
    const cap = k === 'team' ? null : k === 'car' ? STAMP_SLOTS.car : STAMP_SLOTS.driver;
    return (
      <td className="rt-traits">
        <span className="rt-minis">
          {own.map(c => chip(c, `${k}:trait`))}
          {held.map(c => chip(c, k))}
          {!own.length && !held.length && <span className="pk-empty" aria-label="No stamps yet">—</span>}
        </span>
        {cap !== null && <span className="pk-carno">{k === 'car' ? stamps.car.length : stamps.drivers[Number(k)].length}/{cap}</span>}
      </td>
    );
  };

  const drivers = driverStandings(facts);
  const leader = standings[0] ? teams[standings[0].teamId] : null;
  // Your deck (#778, the deck-builder shape): every stamp in play, as cards, by the card it sits on.
  const deckCards = [
    ...roster.driverIds.flatMap(id => [...stamps.drivers[id], ...(stamps.titles[id] ?? [])].map(c => ({ card: c, who: rowName(String(id)) }))),
    ...stamps.car.map(c => ({ card: c, who: c.target === 'team' ? rowName('team') : car.name })),
  ];
  const fading = deckCards.filter(({ card }) => stamps.mileage[card.id] !== undefined).length;

  return (
    <StepTheme step={lookStep} state={lookState} className="ace-page pk" style={teamThemeVars(you)}>
      <RunHeader facts={facts} title="The Paddock" onMenu={onMenu} onRoad={onRoad} onEndRun={onEndRun} />
      {stage && (
        <p className="ace-note pk-hint pk-stage">
          <b>{stage.name}</b> · {stage.alive} states in, {stage.drivers} cars{stage.decides ? ` · ${stage.decides}` : ''}
          {out ? ' · Your state is out: the rest of Nationals runs without you.' : lineup.length === 1 ? ' · You are down to one car.' : ''}
        </p>
      )}
      {spoken && (
        <section className="nem-line" aria-label="Your nemesis">
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

      <div className="pk-grid">
        <section className="pk-main" aria-label="Your garage">
          {parcel && myTurn && (
            <ParcelPick
              key={`${parcel.round}:${parcel.teamId}`}
              parcel={parcel}
              targets={targets}
              to={{ garage: rowName('team'), place: [facts.setup.league?.locale?.town, lookState.name].filter(Boolean).join(', ') }}
              smudgeLine={smudge ? `Smudged: ${smudge.name} (${smudge.stats.map(s => `${levelDelta(s.pct)} ${STAT_LABELS[s.stat]}`).join(', ')}) on ${smudge.target.kind === 'car' ? car.name : rowName('team')} for ${SMUDGE_LIFE_TEXT}, whatever you keep. It takes no slot and wears off on its own.` : undefined}
              onKeep={keep}
              onLift={setLifted}
              onDetail={c => setDetail({ card: c })}
            />
          )}
          <div className="pk-priority-row">
            <PriorityLine label={`Race ${raceNo} · ${venue.name} · ${venue.kind}`} track={{ name: venue.name, favours: trackFav }} weather={weather} />
            <WearPill tyreWear={getDeckTrackById(trackId)?.tyreWear} />
          </div>
          {liveEffects.length > 0 && <p className="ace-note pk-hint">{liveEffects.map(e => `${e.name}: ${describeLeft(e)}`).join(' · ')}</p>}
          {lifted && myTurn && <p className="ace-note pk-hint">Stamping {lifted.name}: tap a glowing row, or pick the card under the Parcel.</p>}
          <div className="ace-panel flat pk-sheet-panel"><div className="rt-scroll">
            <table className="rt">
              <thead>
                <tr>
                  <th className="rt-name">Driver</th>
                  <th className="rt-oc">OVR</th>
                  {DRIVER_STATS.map(s => <th key={s} className={`rt-stat ${priority.has(s) ? 'prio' : ''}`} title={STAT_LABELS[s]}>{ABBR[s]}</th>)}
                  <th className="rt-traits">Stamps</th>
                </tr>
              </thead>
              <tbody>
                {roster.driverIds.map(id => {
                  const d = pool.drivers.find(x => x.id === id)!;
                  const k = String(id);
                  return (
                    <tr key={id} className={rowClass(k, lineup.includes(id) ? '' : 'rt-out')}>
                      {nameCell(k, <><RaceNumber n={badges[d.id] ?? d.number} color={you.color} ink={you.ink} size={24} shape="square" className="rt-numsq" /><Avatar icon={portraitFor(pool.seed, d.id)} color={you.color} size={22} />{fitsRow(k) ? <span className="rt-nm">{d.fullName}</span> : <DriverName name={d.fullName} onOpen={() => setCardOf(d.id)} />}</>)}
                      {gradeCells(k, d.fullName, DRIVER_STATS, new Set(DRIVER_STATS), false)}
                      {stampsCell(k, d.traits)}
                    </tr>
                  );
                })}
                <tr className="rt-sub">
                  <th className="rt-name">Car &amp; garage</th>
                  <th className="rt-oc">OVR</th>
                  {CT_STATS.map(s => <th key={s} className={`rt-stat ${priority.has(s) ? 'prio' : ''}`} title={STAT_LABELS[s]}>{ABBR[s]}</th>)}
                  {Array.from({ length: PAD }, (_, i) => <th key={i} className="rt-stat rt-pad" />)}
                  <th className="rt-traits">Stamps</th>
                </tr>
                {(['car', 'team'] as const).map(k => (
                  <tr key={k} className={rowClass(k)}>
                    {nameCell(k, k === 'car' ? <><Avatar icon={vehicleFor(pool.seed, car.id)} color={you.color} size={26} /><span className="rt-nm">{car.name}</span></> : <><i className="rt-swatch" style={{ background: you.color }} aria-hidden="true" /><GarageName label={labels[viewer]} /></>)}
                    {gradeCells(k, rowName(k), CT_STATS, new Set(k === 'car' ? CAR_STATS : TEAM_STATS), false)}
                    {Array.from({ length: PAD }, (_, i) => <td key={i} className="rt-cell rt-pad" />)}
                    {stampsCell(k, k === 'car' ? car.traits : team.traits)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div></div>
          {deckCards.length > 0 && (
            <section className="pk-deck" aria-label="Your deck">
              <div className="pk-deck-head">
                <span className="ace-k">Your deck · {deckCards.length} {deckCards.length === 1 ? 'stamp' : 'stamps'} in play{fading ? ` · ${fading} ink fading` : ''}</span>
                <span className="ace-note">Tap a card for its face. Ink fades after {GEAR_LIFE} races; a Seal keeps.</span>
              </div>
              <div className="pk-deck-row">
                {deckCards.map(({ card: c, who }) => (
                  <figure key={c.id} className="pk-deck-card">
                    <button type="button" className="pk-deck-btn" onClick={() => setDetail({ card: c })} aria-label={`${c.name} on ${who}`}><CardFace card={c} size="small" flippable={false} left={stamps.mileage[c.id]} /></button>
                    <figcaption className="ace-note">{who}</figcaption>
                  </figure>
                ))}
              </div>
            </section>
          )}
          <div className="rt-legend">
            {priority.size > 0 && <span><span className="rt-prio-key">{ABBR[[...priority][0]]}</span> this race's priority stat</span>}
            <span><i className="rt-notch-key" /> a stamp changes this stat · tap a level for the sum, a stamp for its card · ink fades after {GEAR_LIFE} races (the small number)</span>
          </div>
        </section>

        <aside className="pk-tables" aria-label="The table">
          <div className="pk-tables-head">
            <span className="ace-k">The table · {facts.results.length ? `after race ${facts.results.length} of ${total}` : `before race 1 of ${total}`}</span>
            {myRank && facts.results.length > 0 && leader && (
              <span className="ace-note">You {ordinal(myRank.rank)} on {myRank.points} pts{leader.id !== viewer ? ` · leader ${labels[leader.id]?.name ?? leader.name} on ${standings[0].points}` : ''}. The garages' table decides the title.</span>
            )}
          </div>
          <LeagueTables facts={facts} pool={pool} teams={teams} rosters={rosters} lines={standings} drivers={drivers} onDriver={setCardOf} />
        </aside>
      </div>

      {cardOf !== null && (() => { const data = driverCardOf(facts, cardOf, round); return data && <DriverCard data={data} onClose={() => setCardOf(null)} />; })()}
      {detail && (
        <div className="pk-sheet ace-panel" role="dialog" aria-label="Detail">
          {'card' in detail
            ? <><CardFace card={detail.card} size="small" flippable={false} /><div className="pk-sheet-text"><span className="ace-k">{detail.card.id.startsWith(TITLE_STAMP_PREFIX) ? 'Postmark' : `${isInk(detail.card) ? 'Ink' : 'Seal'} · ${detail.card.target === 'driver' ? 'driver card' : 'car card'}`}{detail.card.rarity ? ` · ${detail.card.rarity}` : ''}</span><b>{detail.card.name}</b>{detail.card.rule ? <span>{detail.card.rule}</span> : detail.card.stats.map(s => <span key={s.stat}>{levelDelta(s.pct)} {STAT_LABELS[s.stat]}</span>)}<span className="ace-note">{detail.card.id.startsWith(TITLE_STAMP_PREFIX) ? 'On the ribbon, outside the slots. For good.' : isInk(detail.card) ? `Ink: twice the strength, fades after ${GEAR_LIFE} races${stamps.mileage[detail.card.id] !== undefined ? ` (${stamps.mileage[detail.card.id]} left)` : ''}.` : 'A permanent stamp; a full card scrapes one off for the next.'}</span></div></>
            : <ReadingSheet title={detail.title} reading={detail.reading} icon={STAT_ICONS[detail.reading.stat]} />}
          <button type="button" className="ace-link pk-sheet-x" onClick={() => setDetail(null)}>Close</button>
        </div>
      )}
      {dock && <div className="ace-dock">{dock}</div>}
    </StepTheme>
  );
}
