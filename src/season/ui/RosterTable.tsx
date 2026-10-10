// Roster tables (#452, Pax Oct 8): the house style for data. A real table, every
// cell the same size, one value per cell. A stat is a grade (src/season/grades.ts)
// in the four F1 colours (S purple · A and B green · C yellow · D and F red); a
// corner notch marks a stat cards change; ▲ / ▼ marks a previewed change. Tap a
// cell for the sum. Styles: .rt in Season.css.
import { GameIcon } from '../../icons/GameIcon';
import { STAT_LABELS } from '../../cards/deck';
import { level, levelTone, levelDelta, type StatReading } from '../grades';
import type { StatKey } from '../../cards/types';

/** The table columns, in order: a driver row, then car + team under one sub-header. */
export const DRIVER_STATS: StatKey[] = ['baseSpeed', 'consistency', 'luck', 'acceleration', 'endurance', 'aggression'];
export const CAR_STATS: StatKey[] = ['power', 'grip', 'reliability'];
export const TEAM_STATS: StatKey[] = ['tireManagement', 'pitCrew'];
export const CT_STATS: StatKey[] = [...CAR_STATS, ...TEAM_STATS];
/** Blank cells that square the car/team rows up with the driver rows. */
export const PAD = DRIVER_STATS.length - CT_STATS.length;
export const STAT_ABBR: Record<StatKey, string> = {
  baseSpeed: 'SPD', consistency: 'CON', luck: 'LCK', acceleration: 'ACC', endurance: 'END', aggression: 'AGG',
  power: 'PWR', grip: 'GRP', reliability: 'REL', tireManagement: 'TYR', pitCrew: 'PIT',
};

interface GradeCellProps {
  /** On the 0–100 scale (may pass 100: S). */
  value: number;
  notch?: boolean;
  /** −1 / 0 / +1: a previewed change (the cell shows the new grade). */
  move?: number;
  dim?: boolean;
  /** The OVR column: a touch heavier. */
  strong?: boolean;
  onOpen?: () => void;
  /** Holding a card that would change this stat: the cell flashes between now and this value. */
  flashTo?: number;
}

export function GradeCell({ value, notch, move = 0, dim, strong, onOpen, flashTo }: GradeCellProps) {
  const g = level(value);
  if (flashTo !== undefined && Math.round(flashTo) !== Math.round(value)) {
    const to = level(flashTo), up = flashTo > value;
    return (
      <td className="rt-cell pv">
        <span className={`rt-g rt-flash ${strong ? 'strong' : ''}`} aria-label={`Level ${g} would become ${to}`} onClick={onOpen}>
          <span className={`rt-flash-now tone-${levelTone(g)}`}>{g}</span>
          <span className={`rt-flash-new tone-${levelTone(to)}`}>{to}</span>
          <i className={`rt-move ${up ? 'up' : 'down'}`} aria-hidden="true">{up ? '▲' : '▼'}</i>
        </span>
      </td>
    );
  }
  const body = (
    <>
      {g}
      {notch && <i className="rt-notch" aria-hidden="true" />}
      {move !== 0 && <i className={`rt-move ${move > 0 ? 'up' : 'down'}`} aria-label={move > 0 ? 'up' : 'down'}>{move > 0 ? '▲' : '▼'}</i>}
    </>
  );
  const cls = `rt-g tone-${levelTone(g)} ${dim ? 'dim' : ''} ${strong ? 'strong' : ''}`;
  return (
    <td className={`rt-cell ${move !== 0 ? 'pv' : ''}`}>
      {onOpen ? <button type="button" className={cls} onClick={onOpen}>{body}</button> : <span className={cls}>{body}</span>}
    </td>
  );
}

/** The sum behind a grade: base roll + each card = total. */
export function ReadingSheet({ title, reading, icon }: { title: string; reading: StatReading; icon?: string }) {
  const r = Math.round;
  return (
    <div className="pk-sheet-text">
      <span className="rs-k">{icon && <GameIcon name={icon} size={12} />} {title}</span>
      <b className={`rt-g tone-${levelTone(reading.level)}`}>Lv {reading.level}</b>
      <span className="rt-sum">
        <span>Lv {reading.baseLevel} base roll · {r(reading.base)} points <span className="rs-hint">(0 worst, 100 best possible; 5 points a level)</span></span>
        {reading.parts.map(p => <span key={p.card.id}>{levelDelta(p.points)} {STAT_LABELS[reading.stat]} · {p.card.name}</span>)}
        <span className="rt-sum-total">Lv {reading.level} · {r(reading.total)} points{reading.total > 100 ? ' · past the best possible roll' : ''}</span>
      </span>
    </div>
  );
}
