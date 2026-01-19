import { Driver, PositionSnapshot } from '../RaceEngine';
import { useMemo, useState } from 'react';
import { ticksToShortTime } from '../utils/raceTime';

interface PositionChartProps {
  drivers: Driver[];
  positionHistory: PositionSnapshot[];
  totalDrivers: number;
}

function PositionChart({ drivers, positionHistory, totalDrivers }: PositionChartProps) {
  const [hoveredDriver, setHoveredDriver] = useState<number | null>(null);

  const chartData = useMemo(() => {
    if (positionHistory.length === 0) return null;

    const width = 400;
    const height = 200;
    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const maxTick = positionHistory[positionHistory.length - 1]?.tick || 1;
    const xScale = (tick: number) => padding.left + (tick / maxTick) * chartWidth;
    const yScale = (rank: number) => padding.top + ((rank - 1) / (totalDrivers - 1 || 1)) * chartHeight;

    // Build paths for each driver
    const driverPaths: Array<{
      driverId: number;
      color: string;
      emoji: string;
      name: string;
      path: string;
      lastPoint: { x: number; y: number; rank: number };
    }> = [];

    for (const driver of drivers) {
      const points: Array<{ x: number; y: number; rank: number }> = [];

      for (const snapshot of positionHistory) {
        const driverPos = snapshot.positions.find(p => p.driverId === driver.id);
        if (driverPos) {
          points.push({
            x: xScale(snapshot.tick),
            y: yScale(driverPos.rank),
            rank: driverPos.rank,
          });
        }
      }

      if (points.length > 0) {
        const pathD = points
          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
          .join(' ');

        driverPaths.push({
          driverId: driver.id,
          color: driver.color,
          emoji: driver.emoji,
          name: driver.shortName,
          path: pathD,
          lastPoint: points[points.length - 1],
        });
      }
    }

    return { width, height, padding, chartWidth, chartHeight, maxTick, xScale, yScale, driverPaths };
  }, [drivers, positionHistory, totalDrivers]);

  if (!chartData || positionHistory.length < 2) {
    return (
      <div className="position-chart empty">
        <h4>Position Over Time</h4>
        <div className="chart-placeholder">
          Race in progress... chart will appear after a few ticks
        </div>
      </div>
    );
  }

  const { width, height, padding, maxTick, yScale, driverPaths } = chartData;

  // Generate Y-axis labels (positions 1st, 2nd, ... Nth)
  const yLabels = Array.from({ length: totalDrivers }, (_, i) => i + 1);

  // Generate X-axis labels (tick markers)
  const xLabelCount = 5;
  const xLabels = Array.from({ length: xLabelCount }, (_, i) =>
    Math.round((i / (xLabelCount - 1)) * maxTick)
  );

  return (
    <div className="position-chart">
      <h4>Position Over Time</h4>
      <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg">
        {/* Grid lines */}
        <g className="grid-lines">
          {yLabels.map(rank => (
            <line
              key={`grid-${rank}`}
              x1={padding.left}
              y1={yScale(rank)}
              x2={width - padding.right}
              y2={yScale(rank)}
              stroke="rgba(90, 74, 106, 0.2)"
              strokeDasharray="2,4"
            />
          ))}
        </g>

        {/* Y-axis labels */}
        <g className="y-axis">
          {yLabels.filter((_, i) => i % 2 === 0 || totalDrivers <= 6).map(rank => (
            <text
              key={`y-${rank}`}
              x={padding.left - 8}
              y={yScale(rank)}
              textAnchor="end"
              alignmentBaseline="middle"
              className="axis-label"
            >
              {rank}
            </text>
          ))}
        </g>

        {/* X-axis labels */}
        <g className="x-axis">
          {xLabels.map((tick, i) => (
            <text
              key={`x-${i}`}
              x={padding.left + (i / (xLabelCount - 1)) * (width - padding.left - padding.right)}
              y={height - 8}
              textAnchor="middle"
              className="axis-label"
            >
              {ticksToShortTime(tick)}
            </text>
          ))}
          {/* Start/Finish labels */}
          <text
            x={padding.left}
            y={height - 20}
            textAnchor="start"
            className="axis-label-hint"
          >
            Start →
          </text>
          <text
            x={width - padding.right}
            y={height - 20}
            textAnchor="end"
            className="axis-label-hint"
          >
            ← Finish
          </text>
        </g>

        {/* Driver paths */}
        <g className="driver-paths">
          {driverPaths.map(({ driverId, color, path }) => (
            <path
              key={driverId}
              d={path}
              fill="none"
              stroke={color}
              strokeWidth={hoveredDriver === driverId ? 3 : 1.5}
              strokeOpacity={hoveredDriver === null || hoveredDriver === driverId ? 1 : 0.3}
              onMouseEnter={() => setHoveredDriver(driverId)}
              onMouseLeave={() => setHoveredDriver(null)}
              style={{ cursor: 'pointer' }}
            />
          ))}
        </g>

        {/* End markers with emoji */}
        <g className="end-markers">
          {driverPaths.map(({ driverId, emoji, lastPoint }) => (
            <text
              key={`end-${driverId}`}
              x={lastPoint.x + 4}
              y={lastPoint.y}
              className="end-marker"
              alignmentBaseline="middle"
              opacity={hoveredDriver === null || hoveredDriver === driverId ? 1 : 0.3}
              onMouseEnter={() => setHoveredDriver(driverId)}
              onMouseLeave={() => setHoveredDriver(null)}
            >
              {emoji}
            </text>
          ))}
        </g>
      </svg>

      {/* Legend showing hovered driver */}
      {hoveredDriver !== null && (
        <div className="chart-tooltip">
          {(() => {
            const d = driverPaths.find(p => p.driverId === hoveredDriver);
            return d ? `${d.emoji} ${d.name} - P${d.lastPoint.rank}` : '';
          })()}
        </div>
      )}
    </div>
  );
}

export default PositionChart;
