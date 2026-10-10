// The run's home screen (#628, Pax picked A: the ladder,
// https://claude.ai/artifact/WtpDV8xJG7PbYk4WAZrDKv). Four leagues stacked,
// Top flight at the top. The league in play is open: its races (the last is
// the boss race), you against your nemesis, how you go up. Won leagues keep
// one line; leagues ahead wait, dimmed. Unlocks sit underneath.
import { useMemo, useState } from 'react';
import { GameIcon, TeamLogo, teamThemeVars } from '../../icons/GameIcon';
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
import '../../RunSetup.css';
import './Season.css';

interface Props {
  onMenu: () => void;
  onNewRun: () => void;
  /** Into the league in play: the draft or the Paddock. */
  onPlay: (screen: 'draft' | 'paddock' | 'standings') => void;
}

function Squares({ done, total }: { done: number; total: number }) {
  return (
    <span className="rl-races" aria-label={`${done} of ${total} races run; the last is the boss race`}>
      {Array.from({ length: total }, (_, i) => <i key={i} className={`${i < done ? 'done' : ''} ${i === total - 1 ? 'boss' : ''}`} />)}
    </span>
  );
}

type YourDriver = { id: number; name: string; portrait: ReturnType<typeof portraitFor>; color: string };

function Rung({ r, drivers, onDriver }: { r: RungView; drivers?: YourDriver[]; onDriver?: (id: number) => void }) {
  const head = (
    <div className="rl-head">
      <span className="rl-no">{r.index + 1}</span>
      <b className="rl-name">{r.name}</b>
      <span className={`rl-tag ${r.status}`}>
        {r.status === 'won' ? <><GameIcon name="race.lead_change" size={13} /> Won</>
          : r.status === 'lost' ? 'Lost'
          : r.status === 'ahead' ? 'Locked'
          : r.races && r.races.done < r.races.total ? `Race ${r.races.done + 1} of ${r.races.total} next` : 'Done'}
      </span>
    </div>
  );
  if (r.status !== 'current') {
    return <li className={`rl-rung ${r.status}`}>{head}{r.memory && <span className="rl-memory">{r.memory}</span>}</li>;
  }
  return (
    <li className="rl-rung current">
      {head}
      {r.races && <Squares {...r.races} />}
      {r.you && r.rival && (() => {
        const fresh = !r.races?.done;
        const line = (st: NonNullable<RungView['you']>) => (fresh ? 'no races yet' : `${ordinal(st.place)} · ${st.points} pts`);
        return (
        <div className="rl-vs">
          <TeamLogo team={r.you.team} size={32} />
          <div className="rl-side"><b>You</b><small>{line(r.you)}</small></div>
          <span className="rl-v">vs</span>
          <div className="rl-side rl-right"><b>{r.rival.team.name}</b><small>{r.rival.nemesis ? (fresh ? 'your nemesis' : `${line(r.rival)} · your nemesis`) : line(r.rival)}</small></div>
          <TeamLogo team={r.rival.team} size={32} />
        </div>
        );
      })()}
      {drivers && drivers.length > 0 && (
        <div className="rl-drivers">
          {drivers.map(d => (
            <button key={d.id} type="button" className="rl-driver" onClick={() => onDriver?.(d.id)} aria-label={`${d.name}: driver card`}>
              <Avatar icon={d.portrait} color={d.color} size={20} /><span>{d.name}</span>
            </button>
          ))}
        </div>
      )}
      <p className="rl-note">
        {r.index < LEAGUE_LADDER.length - 1 ? 'Win the league to move up.' : 'Win the league to win the run.'} The last race is the boss race{r.rival?.nemesis ? ' against your nemesis' : ''}.
      </p>
    </li>
  );
}

export default function RunLadder({ onMenu, onNewRun, onPlay }: Props) {
  const [run, setRun] = useState(() => loadRun());
  const view = useMemo(() => (run ? ladderView(run, loadMeta()) : null), [run]);
  const [cardOf, setCardOf] = useState<number | null>(null);
  if (!run || !view) {
    return (
      <div className="run-setup season-setup">
        <header className="rs-top"><div className="rs-title-block">
          <button type="button" className="rs-back" onClick={onMenu}>← Menu</button>
          <h1 className="rs-title">No run</h1>
          <span className="rs-sub">There’s no run saved on this device.</span>
        </div></header>
        <div className="ss-holding-actions"><button type="button" className="rs-btn rs-btn-primary" onClick={onNewRun}>New run</button></div>
      </div>
    );
  }
  const league = view.rungs[view.leagueIndex];
  const next = LEAGUE_LADDER[view.leagueIndex + 1]?.name;
  const leaguePhase = seasonState(currentLeague(run)).phase;
  const up = () => { if (promoteCurrentRun()) setRun(loadRun()); };
  // Your two drivers on the open rung; a tap opens their driver card (#476).
  const inPlay = currentLeague(run);
  const pool = poolFor(inPlay);
  const youId = inPlay.setup.humans[0]?.teamId;
  const yourDrivers: YourDriver[] = (youId ? draftState(pool, inPlay.draftPicks).rosters[youId]?.driverIds ?? [] : [])
    .map(id => pool.drivers.find(d => d.id === id)!).filter(Boolean)
    .map(d => ({ id: d.id, name: d.fullName, portrait: portraitFor(pool.seed, d.id), color: view.you.color }));
  return (
    <div className="run-setup season-setup rl" style={teamThemeVars(view.you)}>
      <header className="rs-top">
        <div className="rs-title-block">
          <button type="button" className="rs-back" onClick={onMenu}>← Menu</button>
          <h1 className="rs-title">The run</h1>
          <span className="rs-sub rl-team"><TeamLogo team={view.you} size={20} /> {view.you.name}</span>
        </div>
      </header>

      {view.phase === 'league-won' && <p className="rl-banner">You won the {league.name}. {next} is next.</p>}
      {view.phase === 'run-won' && <p className="rl-banner">You won the run. Top of the ladder.</p>}
      {view.phase === 'run-lost' && <p className="rl-banner lost">The run is over.</p>}

      <ol className="rl-ladder" aria-label="The league ladder, top first">
        {[...view.rungs].reverse().map(r => <Rung key={r.index} r={r} drivers={r.status === 'current' ? yourDrivers : undefined} onDriver={setCardOf} />)}
      </ol>

      <section className="rl-unlocks">
        <span className="rs-k">Unlocks</span>
        <div className="rl-unl-row">
          {view.unlocks.map(u => (
            <span key={u.id} className={`rl-unl ${u.got ? 'got' : ''}`} title={u.blurb}>{u.name}<small>{u.got ? 'Unlocked' : 'Locked'}</small></span>
          ))}
        </div>
      </section>

      {cardOf !== null && (() => { const data = driverCardOf(inPlay, cardOf); return data && <DriverCard data={data} onClose={() => setCardOf(null)} />; })()}
      <div className="ss-dock">
        {view.phase === 'league'
          ? <button type="button" className="rs-btn rs-btn-primary ss-dock-btn" onClick={() => onPlay(leaguePhase === 'draft' ? 'draft' : leaguePhase === 'finished' ? 'standings' : 'paddock')}>{leaguePhase === 'draft' ? 'To the draft' : 'To the Paddock'}</button>
          : view.phase === 'league-won'
            ? <button type="button" className="rs-btn rs-btn-primary ss-dock-btn" onClick={up}>Up to {next} →</button>
            : <button type="button" className="rs-btn rs-btn-primary ss-dock-btn" onClick={onNewRun}>New run</button>}
      </div>
    </div>
  );
}
