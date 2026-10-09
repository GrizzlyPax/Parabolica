// Roster tables (#452, Pax Oct 8): the house style for data. A real table, every
// cell the same size, one value per cell. A stat is a grade (src/season/grades.ts)
// in the four F1 colours (S purple · A and B green · C yellow · D and F red); a
// corner notch marks a stat cards change; ▲ / ▼ marks a previewed change. Tap a
// cell for the sum. Styles: .rt in Season.css.
import { GameIcon } from '../../icons/GameIcon';
import { STAT_LABELS } from '../../cards/deck';
import { grade, gradeTone, type StatReading } from '../grades';

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
  const g = grade(value);
  if (flashTo !== undefined && Math.round(flashTo) !== Math.round(value)) {
    const to = grade(flashTo), up = flashTo > value;
    return (
      <td className="rt-cell pv">
        <span className={`rt-g rt-flash ${strong ? 'strong' : ''}`} aria-label={`${g} would become ${to}`} onClick={onOpen}>
          <span className={`rt-flash-now tone-${gradeTone(g)}`}>{g}</span>
          <span className={`rt-flash-new tone-${gradeTone(to)}`}>{to}</span>
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
  const cls = `rt-g tone-${gradeTone(g)} ${dim ? 'dim' : ''} ${strong ? 'strong' : ''}`;
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
      <b className={`rt-g tone-${gradeTone(reading.grade)}`}>{reading.grade}</b>
      <span className="rt-sum">
        <span>{reading.baseGrade} · {r(reading.base)} base roll <span className="rs-hint">(0 worst, 100 best possible)</span></span>
        {reading.parts.map(p => <span key={p.card.id}>+{r(p.points)} · {p.card.name} (+{p.pct}% {STAT_LABELS[reading.stat]})</span>)}
        <span className="rt-sum-total">{reading.grade} · {r(reading.total)} total{reading.total > 100 ? ' · past the best possible roll' : ''}</span>
      </span>
    </div>
  );
}
