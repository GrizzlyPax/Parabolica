// The driver card (#476, Hub's build of option A, a sheet:
// https://claude.ai/artifact/F2e7SxoRdU9mSxJGxSLPLn). Opens from a tap on a
// driver in the Paddock, the ladder and the race's driver panel: face and
// number, archetype, rank with XP to the next, stat levels, cards and traits,
// then the backstory and quirk. Rivals: who they are; levels stay sealed.
import { useEffect } from 'react';
import { Avatar } from '../../icons/Avatar';
import { RaceNumber } from '../../icons/RaceNumber';
import { inkFor } from '../../icons/ink';
import { CardChip } from '../../cards/CardChip';
import { CardDot } from '../../cards/CardFace';
import { STAT_LABELS } from '../../cards/deck';
import { levelTone } from '../grades';
import type { DriverCardData } from '../driverCard';
import './Season.css';

const SHORT: Record<string, string> = { baseSpeed: 'SPD', consistency: 'CON', luck: 'LCK', acceleration: 'ACC', endurance: 'END', aggression: 'AGG' };

export default function DriverCard({ data, onClose }: { data: DriverCardData; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const r = data.rank;
  const pct = r && r.next ? Math.min(100, (r.xp / r.next) * 100) : 100;
  return (
    <div className="dc-scrim" onClick={onClose}>
      <section className="dc" role="dialog" aria-label={`${data.name}, driver card`} onClick={e => e.stopPropagation()}>
        <button type="button" className="dc-grab" onClick={onClose} aria-label="Close the driver card" />
        <div className="dc-who">
          <span className="dc-face" style={{ borderColor: data.color }}>
            {data.portrait && <Avatar icon={data.portrait} color={data.color} size={56} />}
            {data.number !== undefined && <span className="dc-no"><RaceNumber n={data.number} color={data.color} ink={data.ink ?? inkFor(data.color)} size={24} shape="square" /></span>}
          </span>
          <div className="dc-id">
            <b className="dc-name">{data.name}</b>
            <span className="dc-team">{data.number !== undefined ? `#${data.number} · ` : ''}{data.teamName}</span>
            <span className="dc-tags">
              {data.archetype && <span className="dc-tag">{data.archetype}</span>}
              {r && <span className="dc-tag dc-rank">{r.name}</span>}
            </span>
          </div>
          <button type="button" className="rs-link dc-x" onClick={onClose}>Close</button>
        </div>

        {r && (
          <div className="dc-xp">
            <span>{r.next ? `${r.name} · ${Math.round(r.xp)} / ${r.next} XP to ${r.nextName}` : `${r.name} · ${Math.round(r.xp)} XP · top rank`}</span>
            <span className="dc-bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></span>
          </div>
        )}

        {data.readings ? (
          <div className="dc-levels">
            {data.readings.map(rd => (
              <div key={rd.stat} title={STAT_LABELS[rd.stat]}><span>{SHORT[rd.stat] ?? rd.stat}</span><b className={`tone-${levelTone(rd.level)}`}>{rd.level}</b></div>
            ))}
          </div>
        ) : <p className="dc-sealed">Rival: levels sealed.</p>}

        {data.cards.length > 0 && (
          <div className="dc-cards">
            <span className="rs-k">Cards · {data.cards.length}</span>
            <span className="dc-chips">
              {data.sealed ? data.cards.map(c => <CardDot key={c.id} card={c} />) : data.cards.map(c => <CardChip key={c.id} card={c} size={30} />)}
            </span>
          </div>
        )}

        {(data.backstory || data.quirk) && (
          <div className="dc-story">
            {data.backstory && <><span className="rs-k">Backstory</span><p>{data.backstory}</p></>}
            {data.quirk && <><span className="rs-k">Quirk</span><p className="dc-quirk">{data.quirk}</p></>}
          </div>
        )}
      </section>
    </div>
  );
}

/** A driver's name that opens their card (#476). An inline span, not a
 * button, so a narrow table cell can still cut it off with an ellipsis. */
export function DriverName({ name, onOpen }: { name: string; onOpen: () => void }) {
  return (
    <span role="button" tabIndex={0} className="rt-nm dc-pick" aria-label={`${name}: driver card`}
      onClick={e => { e.stopPropagation(); onOpen(); }}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}>{name}</span>
  );
}
