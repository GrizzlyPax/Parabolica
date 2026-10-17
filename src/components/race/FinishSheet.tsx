// The finish sheet (#521, Pax picked A: https://claude.ai/artifact/CFXysCjJoUCrncy2qoKmK8;
// in plain words since #778). When the flag drops a sheet slides up from the
// bottom: the sash (the title, when this race won it), a 2-1-3 podium, your
// drivers with their points and what happened to them in sentences, how the
// winner did it, and the way on. The lab's furniture (fastest lap, DNF count,
// the seed, the report) shows only for a race without your drivers (Quick
// Race, the lab). Hide it to watch the cool-down; a slim bar brings it back.
import { useState } from 'react';
import { isOutOfRace, type Driver } from '../../RaceEngine';
import { GameIcon } from '../../icons/GameIcon';
import { Sash } from '../../look/Look';
import { RaceNumber } from '../../icons/RaceNumber';
import { inkFor } from '../../icons/ink';
import { F1_POINTS } from '../../types/season';
import type { DriverDebrief, WinnerEdge } from './debrief';
import { ordinal } from '../../run/ladderView';

interface FinishSheetProps {
  /** Finish order, classified first. */
  podium: Driver[];
  drivers: Driver[];
  dnfCount: number;
  fastestLap?: { driver: Driver; ticks: number } | null;
  seed: number | null;
  trackName?: string;
  /** Season: your racing drivers (shown with their points). */
  mine?: readonly number[];
  buildReport: () => string;
  onNextRace?: () => void;
  onExit?: () => void;
  exitLabel?: string;
  /** The race debrief (#581): your drivers' grid → finish, strategy and moments, and how the winner did it. */
  debrief?: { mine: DriverDebrief[]; winner: WinnerEdge | null };
  /** The step's title, when this race won it (#778): the sash says it. */
  wonTitle?: string;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

const num = (d: Driver, size: number) => (
  <RaceNumber n={d.number ?? '–'} color={d.color} ink={d.ink ?? inkFor(d.color)} size={size} shape="square" />
);

const PLACES = ['', 'one place', 'two places', 'three places', 'four places', 'five places'];
const places = (n: number) => PLACES[n] ?? `${n} places`;

/** Under each of your drivers, in sentences: where they started and finished, the stops, then the moments by lap. */
function DebriefLines({ db }: { db: DriverDebrief }) {
  const gained = db.finish ? db.grid - db.finish : null;
  const end = db.finish ? `finished ${ordinal(db.finish)}` : db.out === 'cut' ? 'was cut' : 'retired';
  const move = gained === null || gained === 0 ? '' : gained > 0 ? `, up ${places(gained)}` : `, down ${places(-gained)}`;
  return (
    <div className="fs-debrief">
      <span className="fs-dline">
        Started {ordinal(db.grid)}, {end}{gained !== null && gained !== 0 ? <b className={gained > 0 ? 'up' : 'down'}>{move}</b> : null}. {db.strategy.charAt(0).toUpperCase() + db.strategy.slice(1)}.
      </span>
      {db.moments.map((m, i) => (
        <span key={i} className={`fs-moment ${m.tone}`}>
          <span className="fs-mlap">Lap {m.lap}:</span> {m.what.toLowerCase()}{m.detail && <span className="fs-mdet">, {m.detail}</span>}.
        </span>
      ))}
    </div>
  );
}

export default function FinishSheet({ podium, drivers, dnfCount, fastestLap, seed, trackName, mine, buildReport, onNextRace, onExit, exitLabel = 'Menu', debrief, wonTitle }: FinishSheetProps) {
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [report, setReport] = useState<string | null>(null);

  const doCopy = async () => {
    const md = buildReport();
    const ok = await copyText(md);
    setCopied(ok ? 'ok' : 'fail');
    if (!ok) setReport(md);
    setTimeout(() => setCopied('idle'), 2000);
  };

  const top = podium.slice(0, 3);
  const winner = top[0];
  const placeOf = (id: number) => podium.findIndex(d => d.id === id) + 1;
  const yours = (mine ?? []).map(id => drivers.find(d => d.id === id)).filter((d): d is Driver => !!d)
    .sort((a, b) => (isOutOfRace(a) ? 99 : placeOf(a.id)) - (isOutOfRace(b) ? 99 : placeOf(b.id)));
  // The primary button: Season goes back to the Paddock; Quick Race runs the next race.
  const primary = onNextRace ? { label: 'Next race', go: onNextRace } : onExit ? { label: exitLabel === 'Paddock' ? 'To the Paddock' : exitLabel, go: onExit } : null;
  const secondaryExit = onNextRace && onExit ? { label: exitLabel, go: onExit } : null;

  if (!open) {
    return (
      <button type="button" className="fs-bar" onClick={() => setOpen(true)} aria-label="Show race results">
        <GameIcon name="race.finish" size={16} />
        <span className="fs-bar-text">Race complete{winner ? <> · <b>{winner.name}</b> wins</> : null}</span>
        <span className="fs-bar-cta">Results</span>
      </button>
    );
  }

  return (
    <section className="fs" role="dialog" aria-label="Race complete">
      <button type="button" className="fs-grab" onClick={() => setOpen(false)} aria-label="Hide results to watch the cool-down" />
      <div className="fs-sash"><Sash text={wonTitle ?? 'Chequered flag'} className={wonTitle ? '' : 'small'} fontSize={wonTitle && wonTitle.length > 14 ? 19 : 23} /></div>
      <div className="fs-head">
        <GameIcon name="race.finish" size={18} />
        <span className="fs-k">{wonTitle ? `The title is yours` : 'Race complete'}{trackName ? ` · ${trackName}` : ''}</span>
        <button type="button" className="fs-hide" onClick={() => setOpen(false)}>Hide</button>
      </div>

      <ol className="fs-podium" aria-label="Podium">
        {[top[1], top[0], top[2]].map((d, i) => d && (
          <li key={d.id} className={`fs-step fs-p${[2, 1, 3][i]}`}>
            <span className="fs-who">
              {num(d, [2, 1, 3][i] === 1 ? 30 : 24)}
              <span className="fs-nm">{d.name}</span>
              {d.teamName && <span className="fs-tm">{d.teamName}</span>}
            </span>
            <span className="fs-block">{[2, 1, 3][i]}</span>
          </li>
        ))}
      </ol>

      {yours.length > 0 && (
        <div className="fs-yours">
          <span className="fs-k">Your drivers</span>
          {yours.map(d => {
            const dnf = isOutOfRace(d);
            const p = placeOf(d.id);
            const pts = dnf ? 0 : F1_POINTS[p - 1] ?? 0;
            const db = debrief?.mine.find(x => x.driverId === d.id);
            return (
              <div key={d.id} className="fs-ydriver">
                <div className={`fs-yrow ${dnf ? 'dnf' : pts === 0 ? 'zero' : ''}`}>
                  <span className="fs-pos">{d.status === 'eliminated' ? 'OUT' : dnf ? 'DNF' : `P${p}`}</span>
                  {num(d, 22)}
                  <span className="fs-ynm">{d.name}</span>
                  <span className="fs-pts">{pts > 0 ? `+${pts}` : '0'}</span>
                </div>
                {db && <DebriefLines db={db} />}
              </div>
            );
          })}
        </div>
      )}

      {debrief?.winner && winner && (
        <p className="fs-edge">
          <b>{winner.name}</b> won it from {ordinal(debrief.winner.grid)} on the grid with {debrief.winner.strategy}, and led {debrief.winner.led} of the {debrief.winner.laps} laps.
        </p>
      )}

      {yours.length > 0
        ? fastestLap && <p className="fs-edge">Fastest lap: <b>{fastestLap.driver.name}</b>, {(fastestLap.ticks / 10).toFixed(1)}s{dnfCount > 0 ? `. ${dnfCount === 1 ? 'One car' : `${dnfCount} cars`} did not finish.` : '.'}</p>
        : (
          <div className="fs-facts">
            {fastestLap && <span><span className="fs-k">Fastest</span> <b>{fastestLap.driver.shortName}</b> {(fastestLap.ticks / 10).toFixed(1)}s</span>}
            <span><span className="fs-k">DNF</span> <b>{dnfCount}</b></span>
            {seed !== null && <span><span className="fs-k">Seed</span> {seed}</span>}
          </div>
        )}

      <div className="fs-btns">
        {primary && <button type="button" className="fs-btn fs-btn-primary" onClick={primary.go}>{primary.label}</button>}
        {secondaryExit && <button type="button" className="fs-btn" onClick={secondaryExit.go}>{secondaryExit.label}</button>}
      </div>
      {yours.length === 0 && (
        <div className="fs-links">
          <button type="button" className="fs-link" onClick={doCopy}>{copied === 'ok' ? <><GameIcon name="ui.done" size={12} /> Copied</> : copied === 'fail' ? 'Select the report below' : <><GameIcon name="ui.copy" size={12} /> Copy report</>}</button>
          <button type="button" className="fs-link" onClick={() => setReport(r => (r === null ? buildReport() : null))}>{report === null ? 'View report' : 'Hide report'}</button>
        </div>
      )}
      {report !== null && (
        <textarea className="fs-report" readOnly value={report} onFocus={e => e.currentTarget.select()} aria-label="Race report (markdown)" />
      )}
    </section>
  );
}
