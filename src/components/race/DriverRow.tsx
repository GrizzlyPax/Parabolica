// Single row in the timing tower
// Renders columns dynamically based on configuration
// Expands when focused to show driver details
import { useMemo } from 'react';
import type { DriverRowProps } from './types';
import { getDriverRating, getCarRating } from '../../betting/utils';

function DriverRow({ driver, columns, context, gridTemplate, isFocused, expandable = true, onClick }: DriverRowProps) {
  const { isFinished, isDNF, isPitting } = context;

  // Calculate ratings for expanded view (memoized to avoid recalc on every render)
  const driverRating = useMemo(() => getDriverRating(driver), [driver.stats]);
  const carRating = useMemo(() => getCarRating(driver), [driver.carStats]);

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
            <div className="expanded-ratings">
              <div className={`expanded-rating-ball tier-${driverRating.tier}`} title={driverRating.label}>
                👤
              </div>
              <div className={`expanded-rating-ball tier-${carRating.tier}`} title={carRating.label}>
                🏎️
              </div>
            </div>
            {driver.tireState && (
              <span className="expanded-tire" data-compound={driver.tireState.compound}>
                {driver.tireState.compound.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default DriverRow;
