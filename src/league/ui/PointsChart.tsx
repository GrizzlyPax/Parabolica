// Cumulative points over the season, as a small SVG line chart.
// Drivers: solid line in team primary for the first seat, dotted for the
// second — same convention as the marble rings. Constructors: one solid
// line per team.

export interface ChartSeries {
  id: string | number;
  color: string;
  dashed?: boolean;
  /** Cumulative points after each settled race. */
  values: number[];
  label?: string;
}

interface PointsChartProps {
  series: ChartSeries[];
  raceCount: number;
}

const W = 360;
const H = 150;
const PAD = { top: 8, right: 8, bottom: 18, left: 28 };

function PointsChart({ series, raceCount }: PointsChartProps) {
  if (raceCount < 2) {
    return <p className="chart-waiting">The points race begins after race 2.</p>;
  }

  const maxY = Math.max(1, ...series.flatMap(s => s.values));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (raceIdx: number) => PAD.left + (raceIdx / (raceCount - 1)) * innerW;
  const y = (pts: number) => PAD.top + innerH - (pts / maxY) * innerH;

  // Light grid: a midline and the top
  const gridYs = [maxY, Math.round(maxY / 2)];

  return (
    <svg className="points-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Points over races">
      {/* Axis + gridlines */}
      <line x1={PAD.left} y1={PAD.top + innerH} x2={W - PAD.right} y2={PAD.top + innerH}
        stroke="#2a2a34" strokeWidth="1" />
      {gridYs.map(v => (
        <g key={v}>
          <line x1={PAD.left} y1={y(v)} x2={W - PAD.right} y2={y(v)}
            stroke="#1a1a22" strokeWidth="1" />
          <text x={PAD.left - 4} y={y(v) + 3} textAnchor="end" className="chart-tick">{v}</text>
        </g>
      ))}
      {/* Race ticks */}
      {Array.from({ length: raceCount }, (_, i) => (
        <text key={i} x={x(i)} y={H - 4} textAnchor="middle" className="chart-tick">
          {i + 1}
        </text>
      ))}
      {/* Series */}
      {series.map(s => (
        <polyline
          key={s.id}
          fill="none"
          stroke={s.color}
          strokeWidth="1.8"
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray={s.dashed ? '4 3' : undefined}
          opacity="0.9"
          points={s.values.slice(0, raceCount).map((v, i) => `${x(i)},${y(v)}`).join(' ')}
        >
          {s.label && <title>{s.label}</title>}
        </polyline>
      ))}
    </svg>
  );
}

export default PointsChart;
