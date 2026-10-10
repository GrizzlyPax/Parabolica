// The run's home screen, in the race program's look (#705; the ladder design
// #628). The rungs stack top first as cream panels; the one in play is open:
// its races (the last chequered), you against the rival, your drivers, how
// you go up. The screen wears the step's theme and LABELS the rungs by step
// (Locals · State · Nationals, plain, never "the Nationals"): `stepForLeague`
// maps v0.7's four leagues onto them, display only, until #696 rebuilds the
// run into three steps. Won and lost rungs keep one line; the ones ahead
// wait, dimmed.
import { useMemo, useState } from 'react';
import { TeamLogo } from '../../icons/GameIcon';
import { currentLeague, loadRun, LEAGUE_LADDER } from '../../run/run';
import { loadMeta } from '../../run/meta';
import { promoteCurrentRun } from '../../run/current';
import { ladderView, ordinal, type RungView } from '../../run/ladderView';
import { poolFor, seasonState } from '../season';
import { draftState } from '../draft';
import { portraitFor } from '../../generators/avatars';
import { Avatar } from '../../icons/Avatar';
import DriverCard from './DriverCard';
import { driverCardOf } from '../driverCard';
import { AceButton, Bunting, Chequer, Pennant, ProgramLine, Roundel, Sash, StateBar, StepTheme, Wheel } from '../../look/Look';
import { STEPS, programNumber, stateLook, stepForLeague } from '../../look/step';
import './Season.css';

interface Props {
  onMenu: () => void;
  onNewRun: () => void;
  /** Into the run: the rookie pick (at the old draft address), the Paddock or the standings. */
  onPlay: (screen: 'draft' | 'paddock' | 'standings') => void;
}

function Squares({ done, total }: { done: number; total: number }) {
  return (
    <span className="ace-sq" aria-label={`${done} of ${total} races run; the last is the boss race`}>
      {Array.from({ length: total }, (_, i) => <i key={i} className={`${i < done ? 'd' : ''} ${i === total - 1 ? 'last' : ''}`.trim()} />)}
    </span>
  );
}

type YourDriver = { id: number; name: string; portrait: ReturnType<typeof portraitFor>; color: string };

/** The rung's label: its step's name (display only until #696). */
const stepLabel = (index: number) => STEPS.find(s => s.id === stepForLeague(index, LEAGUE_LADDER.length))!.name;

function Rung({ r, drivers, onDriver }: { r: RungView; drivers?: YourDriver[]; onDriver?: (id: number) => void }) {
  const tag = r.status === 'won' ? 'Won' : r.status === 'lost' ? 'Lost' : r.status === 'ahead' ? 'Locked'
    : !r.races ? 'Pick your rookies' : r.races.done < r.races.total ? `Race ${r.races.done + 1} of ${r.races.total}` : 'Done';
  const head = (
    <div className="ace-rung-head">
      {r.status === 'ahead' ? <Wheel r={8} /> : <Roundel n={r.index + 1} />}
      <b>{stepLabel(r.index)}</b>
      <span className={`ace-tag ${r.status === 'won' ? 'won' : ''}`.trim()}>{tag}</span>
    </div>
  );
  if (r.status !== 'current') {
    return <li className={`ace-panel ${r.status === 'ahead' ? 'dim' : ''}`.trim()}>{head}{r.memory && <p className="ace-note">{r.memory}</p>}</li>;
  }
  const fresh = !r.races?.done;
  const line = (st: NonNullable<RungView['you']>) => (fresh ? 'no races yet' : `${ordinal(st.place)} · ${st.points} pts`);
  return (
    <li className="ace-panel now">
      {head}
      {r.races && <Squares {...r.races} />}
      {r.you && r.rival && (
        <div className="ace-row2">
          <span><TeamLogo team={r.you.team} size={18} /> You · <b>{line(r.you)}</b></span>
          <span className="dim">{r.rival.team.name} · {line(r.rival)}{r.rival.nemesis ? ' · nemesis' : ''}</span>
        </div>
      )}
      {drivers && drivers.length > 0 && (
        <div className="ace-chips">
          {drivers.map(d => (
            <button key={d.id} type="button" className="ace-chip" onClick={() => onDriver?.(d.id)} aria-label={`${d.name}: driver card`}>
              <Avatar icon={d.portrait} color={d.color} size={18} /><span>{d.name}</span>
            </button>
          ))}
        </div>
      )}
      <p className="ace-note">{r.index < LEAGUE_LADDER.length - 1 ? 'Win the table, go up.' : 'Win the table, win the run.'} The last race is the boss race{r.rival?.nemesis ? ' against your nemesis' : ''}.</p>
    </li>
  );
}

export default function RunLadder({ onMenu, onNewRun, onPlay }: Props) {
  const [run, setRun] = useState(() => loadRun());
  const view = useMemo(() => (run ? ladderView(run, loadMeta()) : null), [run]);
  const [cardOf, setCardOf] = useState<number | null>(null);
  if (!run || !view) {
    return (
      <StepTheme step="nationals" className="ace-page">
        <Bunting />
        <h1 className="ace-h1">No run</h1>
        <p className="ace-sub">There’s no run saved on this device.</p>
        <div className="ace-dock"><AceButton tone="ghost" onClick={onMenu}>Menu</AceButton><AceButton onClick={onNewRun}>New run</AceButton></div>
      </StepTheme>
    );
  }
  const league = view.rungs[view.leagueIndex];
  const next = view.leagueIndex + 1 < LEAGUE_LADDER.length ? stepLabel(view.leagueIndex + 1) : undefined;
  const leaguePhase = seasonState(currentLeague(run)).phase;
  const up = () => { if (promoteCurrentRun()) setRun(loadRun()); };
  // Your two drivers on the open rung; a tap opens their driver card (#476).
  const inPlay = currentLeague(run);
  const pool = poolFor(inPlay);
  const youId = inPlay.setup.humans[0]?.teamId;
  const yourDrivers: YourDriver[] = (youId ? draftState(pool, inPlay.draftPicks).rosters[youId]?.driverIds ?? [] : [])
    .map(id => pool.drivers.find(d => d.id === id)!).filter(Boolean)
    .map(d => ({ id: d.id, name: d.fullName, portrait: portraitFor(pool.seed, d.id), color: view.you.color }));
  // The step's theme (#705): v0.7's leagues onto Locals · State · Nationals; the State stub is Ohio until #695 / #696.
  const step = stepForLeague(view.leagueIndex, LEAGUE_LADDER.length);
  const stepName = stepLabel(view.leagueIndex);
  const bar = view.phase === 'start' ? 'pick your rookies' : league.races ? (league.races.done < league.races.total ? `race ${league.races.done + 1} of ${league.races.total}` : 'done') : '';
  return (
    <StepTheme step={step} state={stateLook('OH')} className="ace-page rl">
      <Bunting />
      <ProgramLine right={`No. ${programNumber(run.setup.seed)} · 10¢`} />
      <StateBar pennant={<Pennant name={(view.you.name ?? 'You').split(' ')[0]} width={60} />}><b>{stepName}</b>{bar && <> · {bar}</>}</StateBar>
      <div className="rl-head-row">
        <button type="button" className="ace-link" onClick={onMenu}>Menu</button>
        <span className="ace-where"><TeamLogo team={view.you} size={18} /> {view.you.name}</span>
      </div>
      <h1 className="ace-h1">The road to Ace America</h1>
      <Chequer />

      {view.phase === 'run-won' && <div className="ace-sash-wrap"><Sash text="Ace America" /></div>}
      {view.phase === 'league-won' && <div className="ace-panel"><b>You won {stepName}.</b> {next} is next.</div>}
      {view.phase === 'run-lost' && <div className="ace-panel"><b>The run is over.</b> Nothing else is coming this season.</div>}

      <ol className="rl-ladder" aria-label="The ladder, top first">
        {[...view.rungs].reverse().map(r => <Rung key={r.index} r={r} drivers={r.status === 'current' ? yourDrivers : undefined} onDriver={setCardOf} />)}
      </ol>

      <section className="rl-unlocks">
        <span className="ace-k">Unlocks</span>
        <div className="rl-unl-row">
          {view.unlocks.map(u => (
            <span key={u.id} className={`rl-unl ${u.got ? 'got' : ''}`} title={u.blurb}>{u.name}<small>{u.got ? 'Unlocked' : 'Locked'}</small></span>
          ))}
        </div>
      </section>

      {cardOf !== null && (() => { const data = driverCardOf(inPlay, cardOf); return data && <DriverCard data={data} onClose={() => setCardOf(null)} />; })()}
      <div className="ace-dock">
        {view.phase === 'start'
          ? <AceButton onClick={() => onPlay('draft')}>Pick your rookies</AceButton>
          : view.phase === 'league'
          ? <AceButton onClick={() => onPlay(leaguePhase === 'finished' ? 'standings' : 'paddock')}>To the Paddock</AceButton>
          : view.phase === 'league-won'
            ? <AceButton onClick={up}>Up to {next}</AceButton>
            : <AceButton onClick={onNewRun}>New run</AceButton>}
      </div>
    </StepTheme>
  );
}
