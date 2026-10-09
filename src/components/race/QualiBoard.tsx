// The qualifying show (#495, Pax: "merge A and C"): before the lights, the race
// view runs a qualifying session in place of the timing tower. Drivers go out
// one after another; the on-track strip shows who is on their hot lap and its
// sectors; each time drops onto the board and the grid forms. Watch, 2×, or
// skip. Display only: the laps are the engine's own qualifying scores
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
  /** Who is on their hot lap and how far round (0..1), for the track map (#555); null between sessions. */
  onLap?: (live: { id: number; progress: number } | null) => void;
}

/** One hot lap on screen, in ms at 1×. */
export const QUALI_LAP_MS = 1400;
const GRID_HOLD_MS = 2200;

/** Score → lap time in seconds (ticks are 100 ms). */
export const qualiSeconds = (score: number, nominalTicks: number) => nominalTicks / score / 10;
export function fmtLap(sec: number): string {
  if (sec < 60) return `${sec.toFixed(3)}s`;
  const m = Math.floor(sec / 60);
  return `${m}:${(sec - m * 60).toFixed(3).padStart(6, '0')}`;
}

export default function QualiBoard({ laps, drivers, nominalTicks, mine, onDone, onLap }: Props) {
  // Laps on the board, and how far (0..1) the current hot lap has got. One
  // state so a tick updates both at once (StrictMode-safe).
  const [clock, setClock] = useState({ set: 0, progress: 0 });
  const { set, progress } = clock;
  const [speed, setSpeed] = useState<1 | 2>(1);
  const byId = useMemo(() => new Map(drivers.map(d => [d.id, d])), [drivers]);
  const total = laps.length;
  const done = set >= total;

  // The clock: one lap at a time, then hold on the grid and go.
  useEffect(() => {
    const step = 50;
    const t = setInterval(() => {
      setClock(c => {
        if (c.set >= total) return c;
        const next = c.progress + (step * speed) / QUALI_LAP_MS;
        return next >= 1 ? { set: c.set + 1, progress: 0 } : { set: c.set, progress: next };
      });
    }, step);
    return () => clearInterval(t);
  }, [speed, total]);
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(onDone, GRID_HOLD_MS / speed);
    return () => clearTimeout(t);
  }, [done, speed, onDone]);

  // Tell the track map where the car on its hot lap is (#555, display only).
  useEffect(() => {
    onLap?.(set < total ? { id: laps[set].id, progress } : null);
  }, [set, progress, total]); // eslint-disable-line react-hooks/exhaustive-deps

  const board = useMemo(() => [...laps.slice(0, set)].sort((a, b) => b.score - a.score), [laps, set]);
  const pole = board[0];
  const latest = set > 0 ? laps[set - 1] : null;
  const current = done ? null : laps[set];
  const cur = current ? byId.get(current.id) : null;
  const curSec = current ? qualiSeconds(current.score, nominalTicks) : 0;
  const sectorTone = (i: number) => {
    if (!current) return '';
    const reached = progress >= (i + 1) / 3;
    if (!reached) return progress > i / 3 ? 'live' : '';
    if (current.ruined && i >= 1) return 'ruined';
    return pole && current.score > pole.score ? 'best' : 'ok';
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

      {cur ? (
        <div className={`qb-track ${mine?.has(cur.id) ? 'mine' : ''}`}>
          <div className="qb-track-row">
            <span className="qb-k">On track</span>
            {num(cur)}
            <b className="qb-track-nm">{cur.name}</b>
            <span className="qb-track-time">{fmtLap(curSec * progress)}</span>
          </div>
          <div className="qb-sectors" aria-hidden="true">{[0, 1, 2].map(i => <span key={i} className={sectorTone(i)} />)}</div>
        </div>
      ) : (
        <div className="qb-track qb-grid-set">
          <span className="qb-k">Pole</span>
          {num(pole && byId.get(pole.id))}
          <b className="qb-track-nm">{pole && byId.get(pole.id)?.name}</b>
          <span className="qb-track-time">{pole && fmtLap(qualiSeconds(pole.score, nominalTicks))}</span>
        </div>
      )}

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
        {!done && <button type="button" className="qb-btn" onClick={() => setSpeed(s => (s === 1 ? 2 : 1))} aria-pressed={speed === 2}>{speed === 2 ? '1×' : '2×'}</button>}
        <button type="button" className="qb-btn qb-btn-primary" onClick={onDone}>{done ? 'Lights' : 'Skip to grid'}</button>
      </div>
    </section>
  );
}
