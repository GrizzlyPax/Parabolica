// Tire History Chart - F1-style stint visualization
// Shows tire compounds used across laps as a horizontal bar

import { Driver, TireCompound } from '../../RaceEngine';

const TIRE_COLORS: Record<TireCompound, string> = {
  soft: '#e74c3c',
  medium: '#f1c40f',
  hard: '#ecf0f1',
};

interface TireHistoryProps {
  driver: Driver;
  totalLaps: number;
  currentLap: number;
}

interface Stint {
  compound: TireCompound;
  startLap: number;
  endLap: number;
}

function TireHistory({ driver, totalLaps, currentLap }: TireHistoryProps) {
  // Build stint history from pit stops
  const stints: Stint[] = [];
  const pitStops = driver.pitStops || [];

  // Starting compound (lap 0 to first pit)
  const startingCompound = pitStops.length > 0
    ? pitStops[0].tiresBefore
    : driver.tireState?.compound || 'medium';

  let currentStintStart = 0;
  let currentCompound = startingCompound;

  for (const pit of pitStops) {
    // End previous stint at pit lap
    stints.push({
      compound: currentCompound,
      startLap: currentStintStart,
      endLap: pit.lap,
    });
    // Start new stint after pit
    currentStintStart = pit.lap;
    currentCompound = pit.tiresAfter;
  }

  // Current stint (from last pit to current lap)
  stints.push({
    compound: driver.tireState?.compound || currentCompound,
    startLap: currentStintStart,
    endLap: currentLap,
  });

  // Calculate widths as percentages
  const totalWidth = totalLaps > 0 ? totalLaps : 1;

  return (
    <div className="tire-history" title={`${pitStops.length} pit stop${pitStops.length !== 1 ? 's' : ''}`}>
      <div className="tire-history-bar">
        {stints.map((stint, idx) => {
          const width = ((stint.endLap - stint.startLap) / totalWidth) * 100;
          if (width <= 0) return null;

          return (
            <div
              key={idx}
              className="tire-stint"
              style={{
                width: `${width}%`,
                backgroundColor: TIRE_COLORS[stint.compound],
              }}
              title={`${stint.compound.charAt(0).toUpperCase() + stint.compound.slice(1)}: Lap ${stint.startLap + 1}-${stint.endLap}`}
            />
          );
        })}

        {/* Pit stop markers */}
        {pitStops.map((pit, idx) => {
          const position = (pit.lap / totalWidth) * 100;
          return (
            <div
              key={`pit-${idx}`}
              className="pit-marker"
              style={{ left: `${position}%` }}
              title={`Pit lap ${pit.lap}${pit.wasSlowStop ? ' (slow)' : ''}`}
            />
          );
        })}
      </div>
    </div>
  );
}

export default TireHistory;
