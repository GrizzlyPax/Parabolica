// Single row in the timing tower
// Renders columns dynamically based on configuration
// Expands when focused to show driver details
import type { DriverRowProps } from './types';

function DriverRow({ driver, columns, context, gridTemplate, isFocused, onClick }: DriverRowProps) {
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

      {/* Expanded details section - only shown when focused */}
      {/* Simple: full name + current tire, no redundant info */}
      {isFocused && (
        <div className="timing-row-expanded" style={{ '--team-color': driver.color } as React.CSSProperties}>
          <div className="expanded-content">
            <span className="expanded-full-name" style={{ color: driver.color }}>{driver.name}</span>
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
