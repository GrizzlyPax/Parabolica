// The Paddock (#319; roster table #452; v2 with Pax, Oct 9; stamps #704). Two tabs:
//   Team   — one roster table (drivers, then car and team), grades in fixed
//            cells, stamps as compact chips. Your turn runs along one slim line.
//   League — constructors' points race by race (your team highlighted), the
//            constructors' table and every driver.
//
// The turn (#704): a PARCEL waits before every race. Open it, lift one of
// its three stamps (the rows it fits glow and flash the grade it would give),
// stamp it on a driver card or the car card (a full card asks what to scrape
// off), or leave the box shut. A smudged Parcel is a bad stamp for one race,
// nothing to choose. Then Lock in ends the turn: two drivers, both race (#585).
import { raceBadges } from '../badges';
import { useMemo, useState } from 'react';
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
import { openParcel, pendingParcel, teamStamps, holderFits, isInk, STAMP_SLOTS, SMUDGE_LIFE, GEAR_LIFE, TITLE_STAMP_PREFIX, type StampHolder } from '../stamps';
import { effectCards, describeLeft, activeEffects } from '../effects';
import { constructorStandings, driverStandings, lineupFor, poolFor, seasonState, setLineup, type SeasonFacts } from '../season';
import { saveCurrentLeague as saveSeason } from '../../run/current';
import { overall, readStat, type StatReading } from '../grades';
import EndSeason from './EndSeason';
import ParcelPick, { type StampTarget } from './ParcelPick';
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

const SMUDGE_LIFE_TEXT = SMUDGE_LIFE === 1 ? 'one race' : `${SMUDGE_LIFE} races`;
const ABBR = STAT_ABBR;
const ord = (n: number) => `${n}${['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th'}`;

/** A table row: a driver id, 'car' or 'team'. The car and team rows share the car card (#704). */
type RowKey = string;
const holderOf = (k: RowKey): StampHolder => (k === 'car' || k === 'team' ? { kind: 'car' } : { kind: 'driver', id: Number(k) });
/** Whether a lifted stamp would land on this row: driver stamps on their driver, car stamps on the car row, garage stamps on the team row. */
const rowFits = (c: Card, k: RowKey) => (k === 'car' ? c.target === 'car' : k === 'team' ? c.target === 'team' : c.target === 'driver');

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
  const track = getTrackById(trackId);
  const trackFav = getDeckTrackById(trackId)?.favours ?? [];
  const weather = weatherForRace(facts.setup.seed, round, facts.setup.ruleset?.weather.weights);
  const priority = new Set([...trackFav, ...weather.favours].map(f => f.stat));
  const viewer = turn ?? facts.setup.humans[0].teamId;
  const you = teams[viewer];
  const standings = constructorStandings(facts);
  const myRank = standings.find(s => s.teamId === viewer);

  const roster = rosters[viewer];
  const stamps = teamStamps(facts, viewer);
  // The Parcel on the doorstep (#704): three stamps, a Watcher gift, or a smudge.
  const parcel = turn ? pendingParcel(facts) : null;
  const smudge = parcel?.kind === 'smudged' ? parcel.smudge! : null;
  const myTurn = !!turn && state.phase === 'paddock';
  const lineup = lineupFor(facts, state.round, viewer);
  const car = pool.cars.find(c => c.id === roster.carId)!;
  const team = pool.teams.find(t => t.id === viewer)!;

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
  const rowName = (k: RowKey) => (k === 'car' ? car.name : k === 'team' ? you.name : pool.drivers.find(x => x.id === Number(k))!.fullName);

  // Where a stamp can go: each driver card and the car card (car and garage together).
  const targets: StampTarget[] = [
    ...roster.driverIds.map(id => ({ key: String(id), label: rowName(String(id)), stamps: stamps.drivers[id], slots: STAMP_SLOTS.driver, fits: (c: Card) => holderFits(c, { kind: 'driver', id }) })),
    { key: 'car', label: `${car.name} (car and garage)`, stamps: stamps.car, slots: STAMP_SLOTS.car, fits: (c: Card) => holderFits(c, { kind: 'car' }) },
  ];

  // Actions
  const keep = (kept: Card, targetKey: string, replaces?: string) => {
    if (!parcel || parcel.kind === 'smudged') return;
    commit(openParcel(facts, { type: 'parcel', round: parcel.round, teamId: parcel.teamId, tier: parcel.tier, gift: parcel.kind === 'gift' || undefined, dealt: parcel.cards.map(c => c.id), cardId: kept.id, holder: holderOf(targetKey), replaces }));
    setLifted(null);
    setRevealing(false);
  };
  const leave = () => {
    if (!parcel || parcel.kind === 'smudged') return;
    commit(openParcel(facts, { type: 'parcel', round: parcel.round, teamId: parcel.teamId, tier: parcel.tier, gift: parcel.kind === 'gift' || undefined, dealt: parcel.cards.map(c => c.id), cardId: null }));
    setLifted(null);
    setRevealing(false);
  };
  /** Tap a glowing row: the lifted stamp goes there; a full card asks in the Parcel strip what to scrape off. */
  const stampOn = (k: RowKey) => {
    if (!fitsRow(k) || !lifted) return;
    const t = targets.find(x => x.key === (k === 'team' ? 'car' : k))!;
    if (t.stamps.length < t.slots) keep(lifted, t.key);
  };
  const lock = () => {
    if (parcel || lineup.length !== 2) return;
    commit(setLineup(facts, { round: state.round, teamId: viewer, driverIds: [lineup[0], lineup[1]] }));
  };

  const chip = (c: Card, where: string) => (
    <span key={`${where}:${c.id}`} className="pk-stamp">
      <CardChip card={c} onClick={() => setDetail({ card: c })} style={c.id.startsWith(TITLE_STAMP_PREFIX) ? { outline: '2px solid var(--ace-gold)', outlineOffset: 1 } : undefined} />
      {stamps.mileage[c.id] !== undefined && <small className="pk-ink" title={`Ink: ${stamps.mileage[c.id]} race${stamps.mileage[c.id] === 1 ? '' : 's'} left`}>{stamps.mileage[c.id]}</small>}
    </span>
  );

  // One row of grades: OVR + stats (+ dots where a stat doesn't apply), flashing while a fitting stamp is lifted.
  const gradeCells = (k: RowKey, title: string, stats: StatKey[], present: Set<StatKey>, dim: boolean) => {
    const now = readRow(k, null);
    const after = fitsRow(k) ? readRow(k, lifted) : null;
    const nowBy = new Map(now.map(r => [r.stat, r]));
    const afterBy = after ? new Map(after.map(r => [r.stat, r])) : null;
    return (
      <>
        <GradeCell value={overall(now).total} flashTo={after ? overall(after).total : undefined} dim={dim} strong onOpen={fitsRow(k) ? () => stampOn(k) : undefined} />
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

  // The turn, in one line
  const step = !myTurn ? -1 : parcel ? 0 : 1;
  const STEPS = ['Open the Parcel', 'Lock in'];
  // The one action of the turn sits in the dock (#715); the turn line keeps the steps.
  const action = state.phase === 'ready-for-go'
    ? <AceButton onClick={onGo}>Go: round {state.round + 1}</AceButton>
    : !myTurn ? null
    : step === 0 && !revealing ? <AceButton onClick={() => setRevealing(true)}>{smudge ? 'Open the Watcher Box' : 'Open the Parcel'}</AceButton>
    : step >= 1 ? <AceButton disabled={lineup.length !== 2} onClick={lock}>Lock in</AceButton>
    : null;
  const turnLine = state.phase === 'ready-for-go' ? (
    <div className="pk-go"><span>Every team is set for round {state.round + 1}.</span></div>
  ) : myTurn && (
    <div className="pk-turn">
      <ol aria-label="Your turn">
        {STEPS.map((s, i) => <li key={s} className={i < step ? 'done' : i === step ? 'now' : ''}>{i + 1} · {s}</li>)}
      </ol>
    </div>
  );

  const priorityLine = (
    <div className="pk-priority-row">
      <PriorityLine label="Next race · priority stats" track={{ name: track?.name ?? 'the', favours: trackFav }} weather={weather} />
      <WearPill tyreWear={getDeckTrackById(trackId)?.tyreWear} />
    </div>
  );

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
        {cap !== null && <span className="pk-carno">{k === 'car' ? stamps.car.length : stamps.drivers[Number(k)].length}/{cap}{k === 'car' ? ' car and garage' : ''}</span>}
        {k === 'team' && <span className="pk-carno">on the car card</span>}
      </td>
    );
  };

  const teamTab = (
    <>
      {turnLine}
      {priorityLine}
      {parcel && myTurn && (revealing ? (
        <ParcelPick
          key={`${parcel.round}:${parcel.teamId}`}
          parcel={parcel}
          targets={targets}
          smudgeLine={smudge ? `Smudged: ${smudge.name} (${smudge.stats.map(s => `${levelDelta(s.pct)} ${STAT_LABELS[s.stat]}`).join(', ')}) on ${smudge.target.kind === 'car' ? car.name : you.name} for ${SMUDGE_LIFE_TEXT}, whatever you keep. It takes no slot and wears off on its own.` : undefined}
          onKeep={keep}
          onLeave={leave}
          onLift={setLifted}
          onDetail={c => setDetail({ card: c })}
          onClose={() => setRevealing(false)}
        />
      ) : (
        <div className="pk-pack">
          <button type="button" className={`pk-sealed ${smudge ? 'pk-sealed-curse' : ''}`.trim()} onClick={() => setRevealing(true)} aria-label={smudge ? 'Open the Watcher Box' : 'Open the Parcel'}><GameIcon name="season.pack" size={30} />{!smudge && <><i className="pk-twinkle a" /><i className="pk-twinkle b" /><i className="pk-twinkle c" /></>}</button>
          <div className="pk-pack-text">
            <span className="rs-k pk-pack-k">{parcel.kind === 'gift' ? 'No Return Address' : smudge ? 'Watcher Box' : 'League Issue'}</span>
            <b>{smudge ? 'Smudged' : 'Sealed'}</b>
            <span className="rs-hint">{smudge ? 'Unlucky: three stamps inside, and a smudge on the car card for one race whatever you keep.' : parcel.kind === 'gift' ? 'A friend upstairs sends their regards. Three stamps inside at the best odds; keep one.' : 'Three stamps inside; keep one, or leave the box shut. The metal shows when it opens.'}</span>
          </div>
        </div>
      ))}
      {liveEffects.length > 0 && <p className="rs-hint pk-hint">{liveEffects.map(e => `${e.name}: ${describeLeft(e)}`).join(' · ')}</p>}
      {lifted && myTurn && <p className="rs-hint pk-hint">Stamping {lifted.name}: tap a glowing row, or pick the card in the Parcel.</p>}
      <div className="rt-legend">
        {priority.size > 0 && <span><span className="rt-prio-key">{ABBR[[...priority][0]]}</span> next race priority</span>}
        <span><i className="rt-notch-key" /> stamps change this stat · tap a level for the sum</span>
        <span>Tap a stamp for the full card. Traits stay; ink fades after {GEAR_LIFE} races (the small number). {STAMP_SLOTS.driver} per driver, {STAMP_SLOTS.car} on the car.</span>
      </div>
      <div className="ace-panel flat pk-sheet-panel"><div className="rt-scroll">
        <table className="rt">
          <thead>
            <tr>
              <th className="rt-name">Driver</th>
              <th className="rt-oc">OVR</th>
              {DRIVER_STATS.map(s => <th key={s} className={`rt-stat ${priority.has(s) ? 'prio' : ''}`} title={STAT_LABELS[s]}>{ABBR[s]}</th>)}
              <th className="rt-traits">Stamps</th>
              <th className="rt-act">Car</th>
            </tr>
          </thead>
          <tbody>
            {roster.driverIds.map(id => {
              const d = pool.drivers.find(x => x.id === id)!;
              const k = String(id);
              const carNo = lineup.indexOf(id);
              return (
                <tr key={id} className={rowClass(k)}>
                  {nameCell(k, <><RaceNumber n={badges[d.id] ?? d.number} color={you.color} ink={you.ink} size={24} shape="square" className="rt-numsq" /><Avatar icon={portraitFor(pool.seed, d.id)} color={you.color} size={22} />{fitsRow(k) ? <span className="rt-nm">{d.fullName}</span> : <DriverName name={d.fullName} onOpen={() => setCardOf(d.id)} />}</>)}
                  {gradeCells(k, d.fullName, DRIVER_STATS, new Set(DRIVER_STATS), false)}
                  {stampsCell(k, d.traits)}
                  <td className="rt-act"><span className="pk-carno">Car {carNo + 1}</span></td>
                </tr>
              );
            })}
            <tr className="rt-sub">
              <th className="rt-name">Car &amp; garage</th>
              <th className="rt-oc">OVR</th>
              {CT_STATS.map(s => <th key={s} className={`rt-stat ${priority.has(s) ? 'prio' : ''}`} title={STAT_LABELS[s]}>{ABBR[s]}</th>)}
              {Array.from({ length: PAD }, (_, i) => <th key={i} className="rt-stat rt-pad" />)}
              <th className="rt-traits">Stamps</th>
              <th className="rt-act" />
            </tr>
            {(['car', 'team'] as const).map(k => (
              <tr key={k} className={rowClass(k)}>
                {nameCell(k, k === 'car' ? <><Avatar icon={vehicleFor(pool.seed, car.id)} color={you.color} size={26} /><span className="rt-nm">{car.name}</span></> : <><TeamLogo team={you} size={22} /><span className="rt-nm">{you.name}</span></>)}
                {gradeCells(k, rowName(k), CT_STATS, new Set(k === 'car' ? CAR_STATS : TEAM_STATS), false)}
                {Array.from({ length: PAD }, (_, i) => <td key={i} className="rt-cell rt-pad" />)}
                {stampsCell(k, k === 'car' ? car.traits : team.traits)}
                <td className="rt-act" />
              </tr>
            ))}
          </tbody>
        </table>
      </div></div>
    </>
  );

  const drivers = driverStandings(facts);
  const humans = facts.setup.humans.map(h => h.teamId);
  const leagueTab = (
    <>
      <p className="pk-priority">
        <span className="rs-k">After round {facts.results.length} of {total}</span>{' '}
        {you.name} {myRank ? ord(myRank.rank) : ''} on <b>{myRank?.points ?? 0}</b> · leader {teams[standings[0].teamId].name} on {standings[0].points}. Two tables: the garages' (both cars' points) and the drivers'.
      </p>
      <div className="pk-league">
        <div className="pk-chart">
          <div className="rs-k">Garage points, race by race</div>
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
        <button type="button" role="tab" className={`ace-tab ${tab === 'league' ? 'on' : ''}`} aria-selected={tab === 'league'} onClick={() => setTab('league')}>The table</button>
        {myRank && <span className="pk-rank">{ord(myRank.rank)} · {myRank.points} pts</span>}
      </div>

      {tab === 'team' ? teamTab : leagueTab}

      {cardOf !== null && (() => { const data = driverCardOf(facts, cardOf, round); return data && <DriverCard data={data} onClose={() => setCardOf(null)} />; })()}
      {detail && (
        <div className="pk-sheet" role="dialog" aria-label="Detail">
          {'card' in detail
            ? <><CardFace card={detail.card} size="small" flippable={false} /><div className="pk-sheet-text"><span className="rs-k">{detail.card.id.startsWith(TITLE_STAMP_PREFIX) ? 'Postmark' : `${isInk(detail.card) ? 'Ink' : 'Seal'} · ${detail.card.target === 'driver' ? 'driver card' : 'car card'}`}{detail.card.rarity ? ` · ${detail.card.rarity}` : ''}</span><b>{detail.card.name}</b>{detail.card.rule ? <span>{detail.card.rule}</span> : detail.card.stats.map(s => <span key={s.stat}>{levelDelta(s.pct)} {STAT_LABELS[s.stat]}</span>)}<span className="rs-hint">{detail.card.id.startsWith(TITLE_STAMP_PREFIX) ? 'On the ribbon, outside the slots. For good.' : isInk(detail.card) ? `Ink: twice the strength, fades after ${GEAR_LIFE} races${stamps.mileage[detail.card.id] !== undefined ? ` (${stamps.mileage[detail.card.id]} left)` : ''}.` : 'A permanent stamp; a full card scrapes one off for the next.'}</span></div></>
            : <ReadingSheet title={detail.title} reading={detail.reading} icon={STAT_ICONS[detail.reading.stat]} />}
          <button type="button" className="rs-link pk-sheet-x" onClick={() => setDetail(null)}>Close</button>
        </div>
      )}
      {action && <div className="ace-dock">{action}</div>}
    </StepTheme>
  );
}
