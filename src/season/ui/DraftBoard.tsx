// The draft board (#318, docs/SEASON_MODE.md §3). The whole pool shows; taken
// drivers and cars fade with the picking team's colour dot. CPU picks resolve
// at once. Rivals stay dark: every row reads only a green / yellow / red third
// and sealed rarity dots; trait names show on your own picks alone.
import { useEffect, useMemo, useState } from 'react';
import { Avatar } from '../../icons/Avatar';
import { RaceNumber } from '../../icons/RaceNumber';
import { STAT_LABELS } from '../../cards/deck';
import { overall, readStat } from '../grades';
import { CAR_STATS, DRIVER_STATS, GradeCell, PAD, STAT_ABBR } from './RosterTable';
import { portraitFor, vehicleFor } from '../../generators/avatars';
import { TeamLogo, teamThemeVars } from '../../icons/GameIcon';
import { CardDot } from '../../cards/CardFace';
import type { FieldRank } from '../../betting/utils';
import type { Card } from '../../cards/types';
import { advanceCpu, applyPick, draftState, quickDraft, type DraftPick, type PickKind } from '../draft';
import { poolFor, type SeasonFacts } from '../season';
import { saveCurrentLeague as saveSeason } from '../../run/current';
import { teamsOf } from './teams';
import { SQUAD_SIZE, type PoolDriver, type RackCar } from '../genesis';
import { seasonName } from '../setup';
import EndSeason from './EndSeason';

interface Props {
  facts: SeasonFacts;
  onChange: (facts: SeasonFacts) => void;
  onMenu: () => void;
  onEndSeason: () => void;
  onDone: () => void;
}

const THIRD: Record<FieldRank['tone'], { cls: string; label: string }> = {
  best: { cls: 'front', label: 'Front' },
  high: { cls: 'front', label: 'Front' },
  mid: { cls: 'middle', label: 'Middle' },
  low: { cls: 'back', label: 'Back' },
};

function Third({ rank }: { rank?: FieldRank }) {
  const t = rank ? THIRD[rank.tone] : null;
  return t ? <span className={`ss-third ${t.cls}`}><span className="ss-third-dot" />{t.label}</span> : null;
}

function Sealed({ traits }: { traits: Card[] }) {
  return traits.length ? <span className="ss-dots">{traits.map(c => <CardDot key={c.id} card={c} />)}</span> : null;
}

/** Your own pick: trait names in the open. */
function Open({ traits }: { traits: Card[] }) {
  return traits.length ? <span className="ss-open">{traits.map(c => <span key={c.id} className="ss-open-card"><CardDot card={c} />{c.name}</span>)}</span> : null;
}

export default function DraftBoard({ facts, onChange, onMenu, onDone, onEndSeason }: Props) {
  const pool = useMemo(() => poolFor(facts), [facts.setup]); // eslint-disable-line react-hooks/exhaustive-deps
  const teams = useMemo(() => teamsOf(facts), [facts.setup]); // eslint-disable-line react-hooks/exhaustive-deps
  const humanIds = useMemo(() => facts.setup.humans.map(h => h.teamId), [facts.setup]);
  const state = useMemo(() => draftState(pool, facts.draftPicks), [pool, facts.draftPicks]);
  const slot = state.onTheClock;
  const [tab, setTab] = useState<PickKind>(slot?.kind ?? 'driver');
  const [selected, setSelected] = useState<number | string | null>(null);
  const [confirmQuick, setConfirmQuick] = useState(false);

  // CPU picks resolve at once whenever it isn't a human's pick.
  useEffect(() => {
    const next = advanceCpu(pool, facts.draftPicks, humanIds);
    if (next !== facts.draftPicks) commit(next);
  }, [facts.draftPicks]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (slot) setTab(slot.kind); setSelected(null); }, [slot?.pickNo]); // eslint-disable-line react-hooks/exhaustive-deps

  function commit(picks: DraftPick[]) {
    const next = { ...facts, draftPicks: picks };
    saveSeason(next);
    onChange(next);
  }

  const picker = slot && humanIds.includes(slot.teamId) ? slot.teamId : null;
  // Single-player (#588): you are the only human; your roster always shows.
  const viewer = humanIds[0];
  const you = teams[viewer];

  const takenBy = new Map<string, string>(facts.draftPicks.map(p => [`${p.kind}:${p.id}`, p.teamId]));
  const mine = state.rosters[viewer];
  const pick = () => {
    if (!slot || !picker || selected == null) return;
    commit(applyPick(pool, facts.draftPicks, { pickNo: slot.pickNo, teamId: picker, kind: slot.kind, id: selected }));
  };
  const quick = () => {
    if (!confirmQuick) { setConfirmQuick(true); return; }
    commit(quickDraft(pool, facts.draftPicks));
    setConfirmQuick(false);
  };

  const total = pool.teams.length * (SQUAD_SIZE + 1);
  // One pool row: tap the name to select. Rivals and the open pool read only
  // Front / Middle / Back and sealed dots (Pax, Oct 9); your picks name their cards.
  const poolRow = (kind: PickKind, id: number | string, name: JSX.Element, traits: Card[], rank?: FieldRank) => {
    const owner = takenBy.get(`${kind}:${id}`);
    const own = owner === viewer;
    const canPick = !owner && !!picker && slot?.kind === kind;
    return (
      <tr key={id} className={`${owner ? 'taken' : ''} ${selected === id ? 'selected' : ''}`.trim()}>
        <th className="rt-name" scope="row">
          <button type="button" className="rt-pick" disabled={!canPick} onClick={() => setSelected(id)} aria-pressed={selected === id}>{name}</button>
        </th>
        <td className="dr-read">{owner ? null : <Third rank={rank} />}</td>
        <td className="dr-cards">{own ? <Open traits={traits} /> : <Sealed traits={traits} />}</td>
        <td className="dr-by">{owner && <><TeamLogo team={teams[owner]} size={16} /><span>{own ? `${teams[owner].name} · You` : teams[owner].name}</span></>}</td>
      </tr>
    );
  };
  const driverRow = (d: PoolDriver) => {
    const owner = takenBy.get(`driver:${d.id}`);
    const t = owner ? teams[owner] : null;
    return poolRow('driver', d.id, (
      <>
        {t ? <RaceNumber n={d.number} color={t.color} ink={t.ink} size={22} shape="square" className="rt-numsq" /> : <RaceNumber n={d.number} color="var(--pw-ground)" ink="var(--pw-text-1)" ring size={22} shape="square" className="rt-numsq" />}
        <Avatar icon={portraitFor(pool.seed, d.id)} color={t?.color} size={20} />
        <span className="rt-nm">{d.fullName}</span>
      </>
    ), d.traits, state.ranks.driver.get(d.id));
  };
  const carRow = (c: RackCar) => {
    const owner = takenBy.get(`car:${c.id}`);
    return poolRow('car', c.id, (
      <><Avatar icon={vehicleFor(pool.seed, c.id)} color={owner ? teams[owner].color : undefined} size={26} /><span className="rt-nm">{c.name}</span></>
    ), c.traits, state.ranks.car.get(c.id));
  };
  const chosen = selected == null ? null : slot?.kind === 'driver' ? pool.drivers.find(d => d.id === selected) : pool.cars.find(c => c.id === selected);

  return (
    <div className="run-setup season-setup ss-draft" style={teamThemeVars(you)}>
      <header className="rs-top">
        <div className="rs-title-block">
          <button type="button" className="rs-back" onClick={onMenu}>← Menu</button>
          <h1 className="rs-title">Draft</h1>
          <span className="rs-sub">{seasonName(facts.setup)} · {state.done ? 'every team is full' : `pick ${facts.draftPicks.length + 1} of ${total} · ${slot!.kind === 'driver' ? `round ${slot!.round}, drivers` : 'last round, cars'}`}</span>
        </div>
        <EndSeason onEnded={onEndSeason} />
      </header>

      <section className="rs-row">
        <div className="rs-row-head">
          <span className="rs-k">Your team</span>
          <span className="ss-roster-logo"><TeamLogo team={you} size={20} /></span>
        </div>
        <p className="rs-hint">Your picks show grades. Rivals and the pool stay sealed until the season starts.</p>
        <div className="rt-scroll">
          <table className="rt dr-mine">
            <thead>
              <tr>
                <th className="rt-name">Driver</th>
                <th className="rt-oc">OVR</th>
                {DRIVER_STATS.map(st => <th key={st} className="rt-stat" title={STAT_LABELS[st]}>{STAT_ABBR[st]}</th>)}
                <th className="rt-traits">Traits</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: SQUAD_SIZE }, (_, i) => i).map(i => {
                const d = pool.drivers.find(x => x.id === mine.driverIds[i]);
                if (!d) return (
                  <tr key={i} className="dr-empty">
                    <th className="rt-name" scope="row"><span className="rt-nm">Driver {i + 1}</span></th>
                    <td className="rt-cell" />{DRIVER_STATS.map(st => <td key={st} className="rt-cell" />)}<td className="rt-traits" />
                  </tr>
                );
                const reads = DRIVER_STATS.map(st => readStat(st, d.stats[st as keyof typeof d.stats], d.traits));
                return (
                  <tr key={i}>
                    <th className="rt-name" scope="row"><RaceNumber n={d.number} color={you.color} ink={you.ink} size={24} shape="square" className="rt-numsq" /><Avatar icon={portraitFor(pool.seed, d.id)} color={you.color} size={22} /><span className="rt-nm">{d.fullName}</span></th>
                    <GradeCell value={overall(reads).total} strong />
                    {reads.map(r => <GradeCell key={r.stat} value={r.total} notch={r.parts.length > 0} />)}
                    <td className="rt-traits"><Open traits={d.traits} /></td>
                  </tr>
                );
              })}
              <tr className="rt-sub">
                <th className="rt-name">Car</th>
                <th className="rt-oc">OVR</th>
                {CAR_STATS.map(st => <th key={st} className="rt-stat" title={STAT_LABELS[st]}>{STAT_ABBR[st]}</th>)}
                {Array.from({ length: PAD + 2 }, (_, i) => <th key={i} className="rt-stat rt-pad" />)}
                <th className="rt-traits" />
              </tr>
              {(() => {
                const c = pool.cars.find(x => x.id === mine.carId);
                if (!c) return (
                  <tr className="dr-empty">
                    <th className="rt-name" scope="row"><span className="rt-nm">Car · last round</span></th>
                    <td className="rt-cell" />{DRIVER_STATS.map(st => <td key={st} className="rt-cell" />)}<td className="rt-traits" />
                  </tr>
                );
                const reads = CAR_STATS.map(st => readStat(st, c.stats[st as keyof typeof c.stats], c.traits));
                return (
                  <tr>
                    <th className="rt-name" scope="row"><Avatar icon={vehicleFor(pool.seed, c.id)} color={you.color} size={26} /><span className="rt-nm">{c.name}</span></th>
                    <GradeCell value={overall(reads).total} strong />
                    {reads.map(r => <GradeCell key={r.stat} value={r.total} notch={r.parts.length > 0} />)}
                    {Array.from({ length: PAD + 2 }, (_, i) => <td key={i} className="rt-cell rt-pad" />)}
                    <td className="rt-traits"><Open traits={c.traits} /></td>
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
      </section>

      {state.done ? (
        <section className="rs-row ss-holding">
          <p className="rs-hint">The draft is done. Every team has two drivers and a car.</p>
          <button type="button" className="rs-btn rs-btn-primary rs-start" onClick={onDone}>To the Paddock</button>
        </section>
      ) : (
        <section className="rs-row">
          <div className="rs-row-head">
            <div className="ss-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={tab === 'driver'} className={`ss-tab ${tab === 'driver' ? 'on' : ''}`} onClick={() => setTab('driver')}>Drivers <span className="ss-tab-n">{state.availableDrivers.length} left</span></button>
              <button type="button" role="tab" aria-selected={tab === 'car'} className={`ss-tab ${tab === 'car' ? 'on' : ''}`} onClick={() => setTab('car')}>Cars <span className="ss-tab-n">{state.availableCars.length} left</span></button>
            </div>
            <button type="button" className="rs-link" onClick={quick}>{confirmQuick ? 'Sim the rest, your picks too?' : 'Quick Draft'}</button>
          </div>
          <p className="rs-hint">Read: where they sit in this pool (Front / Middle / Back). Dots are sealed cards, by metal; you see yours once they’re drafted.</p>
          <div className="rt-scroll">
            <table className="rt rt-compact dr-pool">
              <thead><tr><th className="rt-name">{tab === 'driver' ? 'Driver' : 'Car'}</th><th className="dr-read">Read</th><th className="dr-cards">Cards</th><th className="dr-by">Drafted by</th></tr></thead>
              <tbody>{tab === 'driver' ? pool.drivers.map(driverRow) : pool.cars.map(carRow)}</tbody>
            </table>
          </div>
        </section>
      )}

      {!state.done && (
        <div className="ss-dock">
          {picker ? (
            <button type="button" className="rs-btn rs-btn-primary ss-dock-btn" disabled={!chosen} onClick={pick}>
              {chosen ? `Draft ${'number' in chosen ? `${chosen.number} ${chosen.shortName}` : chosen.name}` : `Tap a ${slot!.kind}`}
            </button>
          ) : (
            <span className="rs-hint">CPU picking…</span>
          )}
        </div>
      )}
    </div>
  );
}
