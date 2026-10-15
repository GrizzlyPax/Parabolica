// Single row in the timing tower
// Renders columns dynamically based on configuration
// Expands when focused to show driver details
import { Avatar } from '../../icons/Avatar';
import type { DriverRowProps } from './types';
import type { Driver } from '../../RaceEngine';
import { CardDot } from '../../cards/CardFace';
import { CardChip } from '../../cards/CardChip';
import { level, levelTone, rating } from '../../season/grades';
import type { StatKey } from '../../cards/types';

const DRIVER_STATS: StatKey[] = ['baseSpeed', 'consistency', 'luck', 'acceleration', 'endurance', 'aggression'];
const CAR_STATS: StatKey[] = ['power', 'grip', 'reliability'];
const TEAM_STATS: StatKey[] = ['tireManagement', 'pitCrew'];

/** OVR on the Paddock's 0–100 scale. The race's stats already carry their cards. */
function ovr(block: Record<string, number> | undefined, stats: StatKey[]): number | null {
  if (!block) return null;
  const vals = stats.filter(s => typeof block[s] === 'number').map(s => rating(s, block[s]));
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}
function ovrTiles(d: Driver): [string, number][] {
  const rows: [string, number | null][] = [
    ['Driver', ovr(d.stats as unknown as Record<string, number>, DRIVER_STATS)],
    ['Car', ovr(d.carStats as unknown as Record<string, number> | undefined, CAR_STATS)],
    ['Team', ovr(d.teamStats as unknown as Record<string, number> | undefined, TEAM_STATS)],
  ];
  return rows.filter((r): r is [string, number] => r[1] !== null);
}
const READ = { best: 'front', high: 'front', mid: 'middle', low: 'back' } as const;

function DriverRow({ driver, columns, context, gridTemplate, isFocused, expandable = true, onClick, onCard }: DriverRowProps) {
  const { isFinished, isDNF, isPitting, isEliminated } = context;

  // Build style with grid template and team color for focus glow
  const rowStyle: React.CSSProperties = {
    gridTemplateColumns: gridTemplate,
    '--team-color': driver.color,
    ...(context.fantasyTeam ? { '--fantasy-color': context.fantasyTeam.color } : {}),
  } as React.CSSProperties;

  return (
    <div className={`timing-row-container ${isFocused ? 'expanded' : ''}`}>
      <div
        className={`timing-row ${isFinished ? 'finished' : ''} ${isDNF ? 'dnf' : ''} ${isEliminated ? 'eliminated' : ''} ${isPitting ? 'pitting' : ''} ${isFocused ? 'focused' : ''} ${context.fantasyTeam ? 'fantasy' : ''} ${context.mine ? 'mine' : ''} ${context.nemesis ? 'nemesis' : ''}`}
        style={rowStyle}
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.();
          }
        }}
      >
        {columns.map((column) => (
          <div
            key={column.id}
            className={`timing-cell col-${column.id}`}
            style={{ textAlign: column.align }}
          >
            {column.render(driver, context)}
          </div>
        ))}
      </div>

      {/* The driver panel (Pax, Oct 9): who, OVR grades, cards, history. Nothing the tower already shows.
          It opens under the row, inside the tower, so it never covers the track (Pax, Oct 9). */}
      {isFocused && expandable && (
        <div className={`timing-row-expanded dp ${context.mine ? 'mine' : ''}`} style={{ '--team-color': driver.color } as React.CSSProperties}>
          <div className="dp-who">
            {context.avatar && <span className="dp-av"><Avatar icon={context.avatar.portrait} color={driver.color} size={24} /><Avatar icon={context.avatar.vehicle} color={driver.color} size={26} /></span>}
            <b>{driver.name}</b>
            <span>{driver.number !== undefined ? `#${driver.number} · ` : ''}{driver.teamName}{context.nemesis && <span className="nem-tag">NEMESIS</span>}</span>
            {context.fantasyTeam && <span className="fantasy-badge" style={{ '--fantasy-color': context.fantasyTeam.color } as React.CSSProperties}>{context.fantasyTeam.name}</span>}
            {onCard && <button type="button" className="dp-close" onClick={e => { e.stopPropagation(); onCard(); }}>Driver card</button>}
            <button type="button" className="dp-close" onClick={e => { e.stopPropagation(); onClick?.(); }}>Close</button>
          </div>
          {context.sealed ? (
            <div className="dp-sealed">
              {context.driverRank && <span className={`dp-read ${READ[context.driverRank.tone]}`}>{READ[context.driverRank.tone]} of the field</span>}
              <span className="dp-note">Rival: levels sealed</span>
            </div>
          ) : (
            <div className="dp-ovr">
              {ovrTiles(driver).map(([k, v]) => {
                const g = level(v);
                return <div key={k}><span className="expanded-k">{k}</span><span className={`dp-g g-${levelTone(g)}`}>{g}</span></div>;
              })}
            </div>
          )}
          {(driver.cards ?? []).length > 0 && (
            <div className="dp-block">
              <span className="expanded-k">Cards · {(driver.cards ?? []).length}</span>
              <span className="dp-cards">
                {context.sealed
                  ? (driver.cards ?? []).map(c => <CardDot key={c.id} card={c} />)
                  : (driver.cards ?? []).map(c => <CardChip key={c.id} card={c} size={24} />)}
              </span>
            </div>
          )}
          {((context.history ?? []).length > 0 || (!context.sealed && (context.effectStack ?? []).some(e => e.active))) && (
            <div className="dp-block">
              <span className="expanded-k">History</span>
              <div className="dp-hist">
                {(context.history ?? []).map(h => (
                  <div key={h.key} className={`kind-${h.kind}`}><span className="dp-laps">{h.laps.map(l => `L${l}`).join(' ')}</span><span>{h.name}</span></div>
                ))}
                {!context.sealed && (context.effectStack ?? []).filter(e => e.active).map(e => (
                  <div key={`${e.source}-${e.id}`}><span className="dp-laps">now</span><span><span className="dp-on">Active:</span> {e.name}{e.reason ? <span className="dp-reason"> · {e.reason}</span> : null}</span></div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DriverRow;
