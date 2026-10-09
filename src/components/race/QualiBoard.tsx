// The qualifying show (#495, Pax: "merge A and C"): before the lights, the race
// view runs a qualifying session in place of the timing tower. Drivers go out
// one after another; the on-track strip shows who is on their hot lap and its
// sectors; each time drops onto the board and the grid forms. Watch (1× is
// real time, like the race view), 2×, 10×, or skip. The next car goes out once
// the car ahead clears sector 1, so hot laps overlap (#601). Display only: the laps are the engine's own qualifying scores
// (engine.qualifyingLaps(), the side stream runQualifying reads), so the board
// ends on exactly the grid the race starts from.
import { useEffect, useMemo, useState } from 'react';
import type { Driver } from '../../RaceEngine';
import { RaceNumber } from '../../icons/RaceNumber';
import { GameIcon } from '../../icons/GameIcon';
import { inkFor } from '../../icons/ink';
import './QualiBoard.css';

export interface QualiLap { id: number; score: number; ruined: boolean }

interface Props {
  /** In the order drivers go out (roster order). */
  laps: QualiLap[];
  drivers: Driver[];
  /** A lap at score 1.0, in ticks (engine.nominalLapTicks()). */
  nominalTicks: number;
  mine?: ReadonlySet<number>;
  onDone: () => void;
  /** Who is on a hot lap and how far round (0..1), for the track map (#555); empty when nobody is. */
  onLap?: (live: QualiLive[]) => void;
}

export interface QualiLive { id: number; progress: number }

const GRID_HOLD_MS = 2200;
/** The race view's steps (#599): the button shows the speed you are watching at. */
const SPEEDS = [1, 2, 10] as const;
type Speed = typeof SPEEDS[number];

/** When each car goes out and comes back, in ms of session time at 1×: a lap
 * takes its own lap time (ticks are 100 ms, the race view's 1×), and the next
 * car is released as the one ahead clears sector 1 (#600, #601). */
export function qualiSchedule(laps: QualiLap[], nominalTicks: number): { out: number; lapMs: number }[] {
  let release = 0;
  return laps.map(l => {
    const lapMs = qualiSeconds(l.score, nominalTicks) * 1000;
    const slot = { out: release, lapMs };
    release += lapMs / 3;
    return slot;
  });
}

/** Score → lap time in seconds (ticks are 100 ms). */
export const qualiSeconds = (score: number, nominalTicks: number) => nominalTicks / score / 10;
export function fmtLap(sec: number): string {
  if (sec < 60) return `${sec.toFixed(3)}s`;
  const m = Math.floor(sec / 60);
  return `${m}:${(sec - m * 60).toFixed(3).padStart(6, '0')}`;
}

export default function QualiBoard({ laps, drivers, nominalTicks, mine, onDone, onLap }: Props) {
  // Session time in ms at 1×; the speed scales how fast it runs.
  const [t, setT] = useState(0);
  const [speed, setSpeed] = useState<Speed>(1);
  const byId = useMemo(() => new Map(drivers.map(d => [d.id, d])), [drivers]);
  const schedule = useMemo(() => qualiSchedule(laps, nominalTicks), [laps, nominalTicks]);
  const end = schedule.reduce((m, s) => Math.max(m, s.out + s.lapMs), 0);
  const total = laps.length;
  const done = t >= end;

  useEffect(() => {
    const step = 50;
    const id = setInterval(() => setT(x => (x >= end ? x : Math.min(end, x + step * speed))), step);
    return () => clearInterval(id);
  }, [speed, end]);
  useEffect(() => {
    if (!done) return;
    const id = setTimeout(onDone, GRID_HOLD_MS / speed);
    return () => clearTimeout(id);
  }, [done, speed, onDone]);

  // Cars on a hot lap now, oldest first, and the laps already in.
  const onTrack = laps
    .map((l, i) => ({ l, progress: (t - schedule[i].out) / schedule[i].lapMs }))
    .filter(x => x.progress >= 0 && x.progress < 1);
  const finished = laps.map((l, i) => ({ l, at: schedule[i].out + schedule[i].lapMs })).filter(x => x.at <= t);
  const set = finished.length;

  // Tell the track map where the cars on a hot lap are (#555, display only).
  const liveKey = onTrack.map(x => `${x.l.id}:${x.progress.toFixed(3)}`).join(',');
  useEffect(() => {
    onLap?.(onTrack.map(x => ({ id: x.l.id, progress: x.progress })));
  }, [liveKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const board = useMemo(() => finished.map(x => x.l).sort((a, b) => b.score - a.score), [set]); // eslint-disable-line react-hooks/exhaustive-deps
  const pole = board[0];
  const latest = set > 0 ? [...finished].sort((a, b) => b.at - a.at)[0].l : null;
  const sectorTone = (lap: QualiLap, progress: number, i: number) => {
    const reached = progress >= (i + 1) / 3;
    if (!reached) return progress > i / 3 ? 'live' : '';
    if (lap.ruined && i >= 1) return 'ruined';
    return pole && lap.score > pole.score ? 'best' : 'ok';
  };

  const num = (d: Driver | undefined, size = 22) => d
    ? <RaceNumber n={d.number ?? '–'} color={d.color} ink={d.ink ?? inkFor(d.color)} size={size} shape="square" />
    : null;

  return (
    <section className="qb" aria-label="Qualifying">
      <div className="qb-head">
        <span className="qb-k"><GameIcon name="race.fastest_lap" size={14} /> Qualifying</span>
        <span className="qb-count">{done ? 'Grid set' : `${set} of ${total} laps set · one hot lap each`}</span>
      </div>

      {onTrack.length > 0 ? (
        <div className="qb-on">
          {onTrack.map(({ l, progress }) => {
            const cur = byId.get(l.id);
            return (
              <div key={l.id} className={`qb-track ${mine?.has(l.id) ? 'mine' : ''}`}>
                <div className="qb-track-row">
                  <span className="qb-k">On track</span>
                  {num(cur)}
                  <b className="qb-track-nm">{cur?.name}</b>
                  <span className="qb-track-time">{fmtLap(qualiSeconds(l.score, nominalTicks) * progress)}</span>
                </div>
                <div className="qb-sectors" aria-hidden="true">{[0, 1, 2].map(i => <span key={i} className={sectorTone(l, progress, i)} />)}</div>
              </div>
            );
          })}
        </div>
      ) : done ? (
        <div className="qb-track qb-grid-set">
          <span className="qb-k">Pole</span>
          {num(pole && byId.get(pole.id))}
          <b className="qb-track-nm">{pole && byId.get(pole.id)?.name}</b>
          <span className="qb-track-time">{pole && fmtLap(qualiSeconds(pole.score, nominalTicks))}</span>
        </div>
      ) : null}

      <div className="qb-scroll">
        <table className="qb-table">
          <thead><tr><th className="qb-p">P</th><th>Driver</th><th className="qb-r">Time</th><th className="qb-r">Gap</th></tr></thead>
          <tbody>
            {board.map((l, i) => {
              const d = byId.get(l.id);
              const sec = qualiSeconds(l.score, nominalTicks);
              const gap = i === 0 ? '—' : `+${(sec - qualiSeconds(pole!.score, nominalTicks)).toFixed(3)}`;
              const cls = [mine?.has(l.id) ? 'mine' : '', latest?.id === l.id && !done ? 'new' : '', i === 0 ? 'pole' : '', l.ruined ? 'ruined' : ''].filter(Boolean).join(' ');
              return (
                <tr key={l.id} className={cls}>
                  <td className="qb-p">{i + 1}</td>
                  <td className="qb-nm">{num(d, 20)}<span>{d?.name}{l.ruined && <span className="qb-note">Lap ruined</span>}</span></td>
                  <td className="qb-r qb-t">{fmtLap(sec)}</td>
                  <td className="qb-r">{gap}</td>
                </tr>
              );
            })}
            {!done && <tr className="qb-wait"><td className="qb-p">–</td><td colSpan={3}>{total - set} still to go</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="qb-dock">
        {!done && <button type="button" className="qb-btn" onClick={() => setSpeed(s => SPEEDS[(SPEEDS.indexOf(s) + 1) % SPEEDS.length])} aria-label={`Speed ${speed}×, tap to change`}>{speed}×</button>}
        <button type="button" className="qb-btn qb-btn-primary" onClick={onDone}>{done ? 'Lights' : 'Skip to grid'}</button>
      </div>
    </section>
  );
}
