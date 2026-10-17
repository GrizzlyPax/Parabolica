// The road (#705, #696; out of the loop since #778): the run at a glance,
// as a run map (Pax, Oct 17: the deck-builder shape). Three rungs as cream
// panels, Locals on the left, each with its ROUTE: every race a node with its
// kind (the venue on hover), your place once run, a flag on the title race,
// the next one pulsing with the Parcel that waits before it; a step ahead
// shows its route too. A won rung wears its sash, the open one you against
// the garage nearest you and your drivers (tap one for their card), a lost
// one says where it ended. Reached from the Paddock's header; the dock goes
// back.
import { useMemo, useState } from 'react';
import { currentLeague, loadRun } from '../../run/run';
import { loadMeta } from '../../run/meta';
import { ladderView, ordinal, type RouteNode, type RungView } from '../../run/ladderView';
import { poolFor, seasonState } from '../season';
import { draftState } from '../draft';
import { portraitFor } from '../../generators/avatars';
import { Avatar } from '../../icons/Avatar';
import DriverCard from './DriverCard';
import { driverCardOf } from '../driverCard';
import RunHeader from './RunHeader';
import { AceButton, Bunting, Rosette, Roundel, Sash, StepTheme, TitleRibbon, Wheel } from '../../look/Look';
import { stateLook } from '../../look/step';
import './Season.css';

interface Props {
  onMenu: () => void;
  onNewRun: () => void;
  /** Into the run: the Paddock or the finale. */
  onPlay: (screen: 'paddock' | 'standings') => void;
}

/** The step's route: a node per race, joined; done ones carry your place, the next pulses, the title race flies a flag. */
function Route({ nodes, done, open }: { nodes: RouteNode[]; done: number; open: boolean }) {
  return (
    <ol className="rl-route" aria-label={`${done} of ${nodes.length} races run`}>
      {nodes.map((n, i) => {
        const state = i < done ? 'done' : open && i === done ? 'next' : 'ahead';
        const label = `Race ${n.round + 1} · ${n.venue} · ${n.kind}${n.stage ? ` · ${n.stage}` : ''}${state === 'done' ? ` · ${n.place ? ordinal(n.place) : 'out'}` : ''}`;
        return (
          <li key={n.round} className={`rl-node ${state} ${n.last ? 'last' : ''}`.trim()} title={label} aria-label={label}>
            {state === 'next' && <i className="rl-parcel" aria-hidden="true" />}
            <span className="rl-dot" aria-hidden="true">{state === 'done' ? (n.place ? ordinal(n.place) : 'out') : n.round + 1}</span>
            <span className="rl-node-k" aria-hidden="true">{n.stage ?? n.kind}</span>
          </li>
        );
      })}
    </ol>
  );
}

type YourDriver = { id: number; name: string; portrait: ReturnType<typeof portraitFor>; color: string };

function Rung({ r, drivers, onDriver, stateCode }: { r: RungView; drivers?: YourDriver[]; onDriver?: (id: number) => void; stateCode: string }) {
  const tag = r.status === 'won' ? 'Won' : r.status === 'lost' ? 'Lost' : r.status === 'ahead' ? (r.later ? 'Coming soon' : 'Locked')
    : r.races ? (r.races.done < r.races.total ? `Race ${r.races.done + 1} of ${r.races.total}` : 'Done') : '';
  const head = (
    <div className="ace-rung-head">
      {r.status === 'ahead' ? <Wheel r={8} /> : <Roundel n={r.index + 1} />}
      <b>{r.name}</b>
      {r.status === 'won' ? <TitleRibbon step={r.step} state={stateLook(stateCode)}>{r.title}</TitleRibbon> : <span className="ace-note">for {r.title}</span>}
      <span className={`ace-tag ${r.status === 'won' ? 'won' : ''}`.trim()}>{tag}</span>
    </div>
  );
  if (r.status !== 'current') {
    return (
      <li className={`ace-panel ${r.status === 'ahead' ? 'dim' : ''}`.trim()}>
        {head}
        {r.status === 'won' && <div className="ace-sash-wrap rl-sash"><Sash text={r.title} className="small" /></div>}
        {r.route && <Route nodes={r.route} done={r.status === 'ahead' ? 0 : r.races?.done ?? 0} open={false} />}
        {r.memory && <p className="ace-note">{r.memory}</p>}
      </li>
    );
  }
  const fresh = !r.races?.done;
  const line = (st: NonNullable<RungView['you']>) => (fresh ? 'no races yet' : `${ordinal(st.place)} · ${st.points} pts`);
  const next = r.route?.[r.races?.done ?? 0];
  return (
    <li className="ace-panel now">
      {head}
      {r.route && <Route nodes={r.route} done={r.races?.done ?? 0} open />}
      {next && <p className="ace-note rl-next">Next: race {next.round + 1} · <b>{next.venue}</b> · {next.kind}{next.stage ? ` · ${next.stage}` : ''}</p>}
      {r.stage && <p className="ace-note"><b>{r.stage.name}</b> · {r.stage.alive} of {r.stage.total} states in{r.stage.decides ? ` · ${r.stage.decides}` : ''}</p>}
      {r.you && r.rival && (
        <div className="ace-row2">
          <span>You · <b>{line(r.you)}</b></span>
          <span className="dim">{r.rival.team.name} · {line(r.rival)}</span>
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
      <p className="ace-note">Win the table, win the title.</p>
    </li>
  );
}

export default function RunLadder({ onMenu, onNewRun, onPlay }: Props) {
  const [run] = useState(() => loadRun());
  const view = useMemo(() => (run ? ladderView(run, loadMeta()) : null), [run]);
  const [cardOf, setCardOf] = useState<number | null>(null);
  if (!run || !view) {
    return (
      <StepTheme step="nationals" className="ace-page">
        <Bunting />
        <h1 className="ace-h1">No season</h1>
        <p className="ace-sub">There’s no season saved on this device.</p>
        <div className="ace-dock"><AceButton tone="ghost" onClick={onMenu}>Menu</AceButton><AceButton onClick={onNewRun}>A new season</AceButton></div>
      </StepTheme>
    );
  }
  const rung = view.rungs[view.leagueIndex];
  const inPlay = currentLeague(run);
  const leaguePhase = seasonState(inPlay).phase;
  // Your two drivers on the open rung; a tap opens their driver card (#476).
  const pool = poolFor(inPlay);
  const youId = inPlay.setup.humans[0]?.teamId;
  const yourDrivers: YourDriver[] = (youId ? draftState(pool, inPlay.draftPicks).rosters[youId]?.driverIds ?? [] : [])
    .map(id => pool.drivers.find(d => d.id === id)!).filter(Boolean)
    .map(d => ({ id: d.id, name: d.fullName, portrait: portraitFor(d.avatarSeed ?? pool.seed, d.id), color: view.you.color }));
  const state = stateLook(view.stateId);
  return (
    <StepTheme step={rung.step} state={state} className="ace-page rl">
      <RunHeader facts={inPlay} title="The road to Ace America" onMenu={onMenu} />

      <ol className="rl-ladder" aria-label="The road up, top first">
        {[...view.rungs].reverse().map(r => <Rung key={r.index} r={r} stateCode={view.stateId} drivers={r.status === 'current' ? yourDrivers : undefined} onDriver={setCardOf} />)}
      </ol>

      {view.titles.length > 0 && (
        <section className="rl-titles">
          <span className="ace-k">Your titles</span>
          <div className="ace-honours" style={{ justifyContent: 'flex-start' }}>{view.titles.map(t => <span key={t.step} className="ace-honour"><Rosette step={t.step} state={state} size={40} /><TitleRibbon step={t.step} state={state}>{t.name}</TitleRibbon></span>)}</div>
        </section>
      )}

      {cardOf !== null && (() => { const data = driverCardOf(inPlay, cardOf); return data && <DriverCard data={data} onClose={() => setCardOf(null)} />; })()}
      <div className="ace-dock">
        {view.phase === 'league'
          ? <AceButton onClick={() => onPlay(leaguePhase === 'finished' ? 'standings' : 'paddock')}>To the Paddock</AceButton>
          : view.phase === 'league-won'
            ? <AceButton onClick={() => onPlay('standings')}>Claim {rung.title}</AceButton>
            : <><AceButton tone="ghost" onClick={() => onPlay('standings')}>The final table</AceButton><AceButton onClick={onNewRun}>A new season</AceButton></>}
      </div>
    </StepTheme>
  );
}
