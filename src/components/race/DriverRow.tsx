// Single row in the timing tower
// Renders columns dynamically based on configuration
// Expands when focused to show driver details
import type { DriverRowProps } from './types';

function DriverRow({ driver, columns, context, gridTemplate, isFocused, onClick }: DriverRowProps) {
  const { isFinished, isDNF, isPitting, lastLapTime, bestLapTime } = context;

  // Build style with grid template and team color for focus glow
  const rowStyle: React.CSSProperties = {
    gridTemplateColumns: gridTemplate,
    '--team-color': driver.color,
  } as React.CSSProperties;

  // Format lap time for display
  const formatTime = (ticks: number | null): string => {
    if (ticks === null) return '-';
    const totalSeconds = ticks / 10;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toFixed(1).padStart(4, '0')}`;
  };

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

      {/* Expanded details section - only shown when focused */}
      {isFocused && (
        <div className="timing-row-expanded" style={{ '--team-color': driver.color } as React.CSSProperties}>
          <div className="expanded-content">
            <div className="expanded-name">
              <span className="expanded-emoji">{driver.emoji}</span>
              <span className="expanded-full-name" style={{ color: driver.color }}>{driver.name}</span>
            </div>
            <div className="expanded-stats">
              <div className="expanded-stat">
                <span className="stat-label">Lap</span>
                <span className="stat-value">{context.currentLap}/{context.totalLaps}</span>
              </div>
              <div className="expanded-stat">
                <span className="stat-label">Last</span>
                <span className="stat-value">{formatTime(lastLapTime)}</span>
              </div>
              <div className="expanded-stat">
                <span className="stat-label">Best</span>
                <span className="stat-value">{formatTime(bestLapTime)}</span>
              </div>
              {driver.tireState && (
                <div className="expanded-stat">
                  <span className="stat-label">Tire</span>
                  <span className="stat-value tire-compound" data-compound={driver.tireState.compound}>
                    {driver.tireState.compound.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DriverRow;
