// Single row in the timing tower
// Renders columns dynamically based on configuration
// Expands when focused to show driver details
import type { DriverRowProps } from './types';
import { ordinal, type FieldRank } from '../../betting/utils';
import { effectPills } from './TagChips';

/** "3rd of 22" as a chip coloured by where that sits in the field. */
function RankChip({ r, what, unit }: { r?: FieldRank; what: string; unit: string }) {
  if (!r) return null;
  return (
    <span className={`rank-chip tone-${r.tone}`} title={`${what}: ${ordinal(r.rank)} of ${r.of} ${unit} on this grid`}>
      {ordinal(r.rank)}<span className="rank-of"> of {r.of}</span>
    </span>
  );
}

function DriverRow({ driver, columns, context, gridTemplate, isFocused, expandable = true, onClick }: DriverRowProps) {
  const { isFinished, isDNF, isPitting } = context;

  // Build style with grid template and team color for focus glow
  const rowStyle: React.CSSProperties = {
    gridTemplateColumns: gridTemplate,
    '--team-color': driver.color,
  } as React.CSSProperties;

  return (
    <div className={`timing-row-container ${isFocused ? 'expanded' : ''}`}>
      <div
        className={`timing-row ${isFinished ? 'finished' : ''} ${isDNF ? 'dnf' : ''} ${isPitting ? 'pitting' : ''} ${isFocused ? 'focused' : ''}`}
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

      {/* Expanded details section - shown when focused AND expandable */}
      {/* Full name + skill ratings + current tire */}
      {isFocused && expandable && (
        <div className="timing-row-expanded" style={{ '--team-color': driver.color } as React.CSSProperties}>
          <div className="expanded-content">
            <span className="expanded-full-name" style={{ color: driver.color }}>{driver.name}</span>
            <span className="expanded-fact"><span className="expanded-k">Driver</span> <RankChip r={context.driverRank} what="Driver skill" unit="drivers" /></span>
            <span className="expanded-fact"><span className="expanded-k">Car</span> <RankChip r={context.carRank} what="Car package (shared with the teammate)" unit="cars" /></span>
            {driver.tireState && (
              <span className="expanded-fact"><span className="expanded-k">Tyre</span>
                <span className="expanded-tire" data-compound={driver.tireState.compound}>{driver.tireState.compound.charAt(0).toUpperCase()}</span>
                {' '}{Math.round(driver.tireState.wear)}% worn · {driver.tireState.lapsOnTires} laps
              </span>
            )}
          </div>
          {/* The effect stack: everything acting on this driver, with the reason (#243) */}
          <div className="effect-stack">
            {(context.effectStack ?? []).length === 0 && (
              <div className="effect-row inactive"><span className="effect-name">Nothing acting on this car right now</span></div>
            )}
            {(context.effectStack ?? []).map(e => {
              const pills = e.active ? effectPills(e) : [];
              return (
                <div key={`${e.source}-${e.id}`} className={`effect-row ${e.active ? 'active' : 'inactive'} src-${e.source}`}>
                  <span className="effect-emoji">{e.emoji}</span>
                  <span className="effect-name">{e.name}</span>
                  <span className="effect-reason">{e.reason}</span>
                  <span className="effect-pills">
                    {pills.map(p => <span key={p.label} className={`effect-pill ${p.good ? 'good' : 'bad'}`}><b>{p.value}</b> {p.label}</span>)}
                    {e.active && pills.length === 0 && <span className="effect-pill neutral">no effect on the numbers</span>}
                  </span>
                </div>
              );
            })}
          </div>
          {/* History: what has happened to this car, with laps (#243) */}
          {(context.history ?? []).length > 0 && (
            <div className="driver-history">
              <span className="expanded-k">History</span>
              {(context.history ?? []).map(h => (
                <span key={h.key} className={`history-chip kind-${h.kind}`} title={`${h.name} on lap${h.laps.length === 1 ? '' : 's'} ${h.laps.join(', ')}`}>
                  <span className="history-emoji">{h.emoji}</span>
                  <span className="history-name">{h.name}</span>
                  <span className="history-laps">{h.laps.map(l => `L${l}`).join(' ')}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DriverRow;
