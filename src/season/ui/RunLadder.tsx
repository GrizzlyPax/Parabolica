// The run's home screen, in the race program's look (#705, #696). Three rungs
// stack top first as cream panels: Nationals (waits on #694), State, Locals.
// The one in play is open: its races (the last chequered), you against the
// garage nearest you, your drivers, how you go up. A won rung wears its title
// as a ribbon; a lost one says where it ended. The screen wears the step's
// theme in your state's colours.
import { useMemo, useState } from 'react';
import { TeamLogo } from '../../icons/GameIcon';
import { currentLeague, loadRun, titleStampsFor, type TitlePicks } from '../../run/run';
import { TITLE_STAMP_LEVELS, TITLE_STAMP_STATS } from '../stamps';
import { DRIVER_STATS, STAT_LABELS } from '../../cards/deck';
import type { DriverStatKey } from '../../cards/types';
import { loadMeta } from '../../run/meta';
import { promoteCurrentRun } from '../../run/current';
import { ladderView, ordinal, type RungView } from '../../run/ladderView';
import { poolFor, seasonState } from '../season';
import { draftState } from '../draft';
import { portraitFor } from '../../generators/avatars';
import { Avatar } from '../../icons/Avatar';
import DriverCard from './DriverCard';
import { driverCardOf } from '../driverCard';
import { AceButton, Bunting, Chequer, Pennant, ProgramLine, Roundel, Sash, StateBar, StepTheme, TitleRibbon, Wheel } from '../../look/Look';
import { programNumber, stateLook, stepName } from '../../look/step';
import './Season.css';

interface Props {
  onMenu: () => void;
  onNewRun: () => void;
  /** Into the run: the Paddock or the standings. */
  onPlay: (screen: 'paddock' | 'standings') => void;
}

function Squares({ done, total }: { done: number; total: number }) {
  return (
    <span className="ace-sq" aria-label={`${done} of ${total} races run`}>
      {Array.from({ length: total }, (_, i) => <i key={i} className={`${i < done ? 'd' : ''} ${i === total - 1 ? 'last' : ''}`.trim()} />)}
    </span>
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
    return <li className={`ace-panel ${r.status === 'ahead' ? 'dim' : ''}`.trim()}>{head}{r.memory && <p className="ace-note">{r.memory}</p>}</li>;
  }
  const fresh = !r.races?.done;
  const line = (st: NonNullable<RungView['you']>) => (fresh ? 'no races yet' : `${ordinal(st.place)} · ${st.points} pts`);
  return (
    <li className="ace-panel now">
      {head}
      {r.races && <Squares {...r.races} />}
      {r.stage && <p className="ace-note"><b>{r.stage.name}</b> · {r.stage.alive} of {r.stage.total} states in{r.stage.decides ? ` · ${r.stage.decides}` : ''}</p>}
      {r.you && r.rival && (
        <div className="ace-row2">
          <span><TeamLogo team={r.you.team} size={18} /> You · <b>{line(r.you)}</b></span>
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
  const [run, setRun] = useState(() => loadRun());
  const view = useMemo(() => (run ? ladderView(run, loadMeta()) : null), [run]);
  const [cardOf, setCardOf] = useState<number | null>(null);
  // The title stamps (#704): each driver picks the stats their title stamp goes on before going up.
  const [picks, setPicks] = useState<TitlePicks>({});
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
  const next = view.rungs[view.leagueIndex + 1];
  const leaguePhase = seasonState(currentLeague(run)).phase;
  const stampCount = TITLE_STAMP_STATS[rung.step] ?? 0;
  const picksDone = (() => { try { titleStampsFor(run, rung.step, picks); return true; } catch { return false; } })();
  const togglePick = (driverId: number, stat: DriverStatKey) => setPicks(p => {
    const mine = p[driverId] ?? [];
    const next = mine.includes(stat) ? mine.filter(s => s !== stat) : mine.length < stampCount ? [...mine, stat] : mine;
    return { ...p, [driverId]: next };
  });
  const up = () => { if (!picksDone) return; if (promoteCurrentRun(picks)) { setPicks({}); setRun(loadRun()); } };
  // Your two drivers on the open rung; a tap opens their driver card (#476).
  const inPlay = currentLeague(run);
  const pool = poolFor(inPlay);
  const youId = inPlay.setup.humans[0]?.teamId;
  const yourDrivers: YourDriver[] = (youId ? draftState(pool, inPlay.draftPicks).rosters[youId]?.driverIds ?? [] : [])
    .map(id => pool.drivers.find(d => d.id === id)!).filter(Boolean)
    .map(d => ({ id: d.id, name: d.fullName, portrait: portraitFor(d.avatarSeed ?? pool.seed, d.id), color: view.you.color }));
  const state = stateLook(view.stateId);
  const bar = leaguePhase === 'finished' ? 'done' : rung.races ? `race ${rung.races.done + 1} of ${rung.races.total}` : '';
  return (
    <StepTheme step={rung.step} state={state} className="ace-page rl">
      <Bunting />
      <ProgramLine right={`No. ${programNumber(run.setup.seed)} · 10¢`} />
      <StateBar pennant={<Pennant name={view.town} width={72} />}><b>{stepName(rung.step)}</b> · going for {rung.title}{bar && <> · {bar}</>}</StateBar>
      <div className="rl-head-row">
        <button type="button" className="ace-link" onClick={onMenu}>Menu</button>
        <span className="ace-where"><TeamLogo team={view.you} size={18} /> {view.you.name} · {view.town}, {state.name}</span>
      </div>
      <h1 className="ace-h1">The road to Ace America</h1>
      <Chequer />

      {view.phase === 'run-won' && <div className="ace-sash-wrap"><Sash text={view.titles[view.titles.length - 1]?.name ?? rung.title} /></div>}
      {view.phase === 'league-won' && (
        <div className="ace-panel">
          <b>Congratulations, you are now {rung.title}.</b> {next ? `${next.name} is next.` : ''}
          {stampCount > 0 && next && !next.later && (
            <div className="rl-stamps" role="group" aria-label="Title stamps">
              <span className="ace-k">The title stamp: +{TITLE_STAMP_LEVELS} levels on {stampCount === 1 ? 'one stat' : `${stampCount} stats`} per driver, on the ribbon for good</span>
              {yourDrivers.map(d => (
                <div key={d.id} className="rl-stamp-row">
                  <span className="rl-stamp-who"><Avatar icon={d.portrait} color={d.color} size={18} /> {d.name}</span>
                  <span className="rl-stamp-stats">
                    {DRIVER_STATS.map(s => (
                      <button key={s} type="button" className={`ace-tab ${(picks[d.id] ?? []).includes(s) ? 'on' : ''}`} aria-pressed={(picks[d.id] ?? []).includes(s)} onClick={() => togglePick(d.id, s)}>{STAT_LABELS[s]}</button>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {view.phase === 'run-lost' && <div className="ace-panel"><b>The season is over.</b> {rung.title} went elsewhere this year.</div>}

      <ol className="rl-ladder" aria-label="The road up, top first">
        {[...view.rungs].reverse().map(r => <Rung key={r.index} r={r} stateCode={view.stateId} drivers={r.status === 'current' ? yourDrivers : undefined} onDriver={setCardOf} />)}
      </ol>

      {view.titles.length > 0 && (
        <section className="rl-unlocks">
          <span className="ace-k">Your titles</span>
          <div className="ace-ribbons" style={{ justifyContent: 'flex-start' }}>{view.titles.map(t => <TitleRibbon key={t.step} step={t.step} state={state}>{t.name}</TitleRibbon>)}</div>
        </section>
      )}

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
        {view.phase === 'league'
          ? <AceButton onClick={() => onPlay(leaguePhase === 'finished' ? 'standings' : 'paddock')}>To the Paddock</AceButton>
          : view.phase === 'league-won' && next && !next.later
            ? <AceButton disabled={!picksDone} onClick={up}>{picksDone ? `Up to ${next.name}` : 'Pick the title stamps'}</AceButton>
            : <AceButton onClick={onNewRun}>A new season</AceButton>}
      </div>
    </StepTheme>
  );
}
