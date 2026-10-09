// The draft board (#318, docs/SEASON_MODE.md §3). The whole pool shows; taken
// drivers and cars fade with the picking team's colour dot. CPU picks resolve
// at once. Rivals stay dark: every row reads only a green / yellow / red third
// and sealed rarity dots; trait names show on your own picks alone.
import { useEffect, useMemo, useState } from 'react';
import { GameIcon, TeamLogo, teamThemeVars } from '../../icons/GameIcon';
import { CardDot } from '../../cards/CardFace';
import type { FieldRank } from '../../betting/utils';
import type { Card } from '../../cards/types';
import { advanceCpu, applyPick, draftState, quickDraft, type DraftPick, type PickKind } from '../draft';
import { poolFor, saveSeason, type SeasonFacts } from '../season';
import { teamsOf } from './teams';
import type { PoolDriver, RackCar } from '../genesis';
import { seasonName } from '../setup';
import Handoff from './Handoff';
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
  const hotseat = humanIds.length > 1;
  const state = useMemo(() => draftState(pool, facts.draftPicks), [pool, facts.draftPicks]);
  const slot = state.onTheClock;
  const [tab, setTab] = useState<PickKind>(slot?.kind ?? 'driver');
  const [selected, setSelected] = useState<number | string | null>(null);
  const [readyFor, setReadyFor] = useState<string | null>(hotseat ? null : humanIds[0]);
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
  // Whose roster shows: the human on the clock, else the last human to pick, else P1.
  const lastHuman = [...facts.draftPicks].reverse().find(p => humanIds.includes(p.teamId))?.teamId;
  const viewer = picker ?? (hotseat ? lastHuman : null) ?? humanIds[0];
  const you = teams[viewer];
  const label = (teamId: string) => (hotseat ? `P${humanIds.indexOf(teamId) + 1}` : 'You');

  if (picker && readyFor !== picker) {
    return <Handoff team={teams[picker]} label={label(picker)} what="Draft" onReady={() => setReadyFor(picker)} />;
  }

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

  const total = pool.teams.length * 4;
  const driverRow = (d: PoolDriver) => {
    const owner = takenBy.get(`driver:${d.id}`);
    const own = owner === viewer;
    const canPick = !owner && picker && slot?.kind === 'driver';
    return (
      <li key={d.id}>
        <button type="button" className={`ss-pick ${owner ? 'taken' : ''} ${selected === d.id ? 'selected' : ''}`} disabled={!canPick} onClick={() => setSelected(d.id)} aria-pressed={selected === d.id}>
          <span className="ss-num">{d.number}</span>
          <span className="ss-pick-main">
            <span className="ss-pick-name">{d.fullName}</span>
            {own ? <Open traits={d.traits} /> : <Sealed traits={d.traits} />}
          </span>
          {owner ? <TeamLogo team={teams[owner]} size={16} /> : <Third rank={state.ranks.driver.get(d.id)} />}
        </button>
      </li>
    );
  };
  const carRow = (c: RackCar) => {
    const owner = takenBy.get(`car:${c.id}`);
    const own = owner === viewer;
    const canPick = !owner && picker && slot?.kind === 'car';
    return (
      <li key={c.id}>
        <button type="button" className={`ss-pick ${owner ? 'taken' : ''} ${selected === c.id ? 'selected' : ''}`} disabled={!canPick} onClick={() => setSelected(c.id)} aria-pressed={selected === c.id}>
          <span className="ss-num"><GameIcon name="card.upgrade" size={14} /></span>
          <span className="ss-pick-main">
            <span className="ss-pick-name">{c.name}</span>
            {own ? <Open traits={c.traits} /> : <Sealed traits={c.traits} />}
          </span>
          {owner ? <TeamLogo team={teams[owner]} size={16} /> : <Third rank={state.ranks.car.get(c.id)} />}
        </button>
      </li>
    );
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
          <span className="rs-k">{hotseat ? `${label(viewer)} · ${you.name}` : 'Your team'}</span>
          <span className="ss-roster-logo"><TeamLogo team={you} size={20} /></span>
        </div>
        <ol className="ss-roster">
          {[0, 1, 2].map(i => {
            const d = pool.drivers.find(x => x.id === mine.driverIds[i]);
            return (
              <li key={i} className={`ss-roster-slot ${d ? '' : 'empty'}`}>
                <span className="ss-num">{d ? d.number : ''}</span>
                <span className="ss-pick-main">
                  <span className="ss-pick-name">{d ? d.fullName : `Driver ${i + 1}`}</span>
                  {d && <Open traits={d.traits} />}
                </span>
                {d && <Third rank={state.ranks.driver.get(d.id)} />}
              </li>
            );
          })}
          {(() => {
            const c = pool.cars.find(x => x.id === mine.carId);
            return (
              <li className={`ss-roster-slot ${c ? '' : 'empty'}`}>
                <span className="ss-num"><GameIcon name="card.upgrade" size={14} /></span>
                <span className="ss-pick-main">
                  <span className="ss-pick-name">{c ? c.name : 'Car (last round)'}</span>
                  {c && <Open traits={c.traits} />}
                </span>
                {c && <Third rank={state.ranks.car.get(c.id)} />}
              </li>
            );
          })()}
        </ol>
      </section>

      {state.done ? (
        <section className="rs-row ss-holding">
          <p className="rs-hint">The draft is done. Every team has three drivers and a car.</p>
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
          <p className="rs-hint">Front / Middle / Back: where they sit in this pool. Dots are sealed cards; you see yours once they’re drafted.</p>
          <ol className="ss-board">{tab === 'driver' ? pool.drivers.map(driverRow) : pool.cars.map(carRow)}</ol>
        </section>
      )}

      {!state.done && (
        <div className="ss-dock">
          {picker ? (
            <button type="button" className="rs-btn rs-btn-primary ss-dock-btn" disabled={!chosen} onClick={pick}>
              {chosen ? `Draft ${'number' in chosen ? `${chosen.number} ${chosen.shortName}` : chosen.name}` : `${label(picker)}: tap a ${slot!.kind}`}
            </button>
          ) : (
            <span className="rs-hint">CPU picking…</span>
          )}
        </div>
      )}
    </div>
  );
}
