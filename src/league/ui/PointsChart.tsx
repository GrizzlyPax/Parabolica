// Cumulative points over the season, as an SVG line chart (no deps).
// Drivers: solid line in team primary for the first seat, dotted for the
// second — same convention as the marble rings. Constructors: one solid
// line per team.
//
// Legibility rules (22 series is a lot of spaghetti):
// - The top contenders get full-strength lines and a 3-letter code pinned
//   to the end of their line, F1-broadcast style (codes nudge apart when
//   lines finish close together).
// - Everyone else is dimmed context.

export interface ChartSeries {
  id: string | number;
  color: string;
  dashed?: boolean;
  /** Cumulative points after each settled race. */
  values: number[];
  label?: string;
  /** 3-letter code shown at the line's end for top series. */
  code?: string;
  /** Render the code as a team marble (emoji on team color, accent ring)
   * instead of text — bare emoji is illegible on the dark background. */
  marble?: boolean;
  accentColor?: string;
}

interface PointsChartProps {
  series: ChartSeries[];
  raceCount: number;
}

const W = 720;
const H = 280;
const PAD = { top: 14, right: 56, bottom: 24, left: 36 };
const LABELED_COUNT = 6;

function PointsChart({ series, raceCount }: PointsChartProps) {
  if (raceCount < 2) {
    return <p className="chart-waiting">The points race begins after race 2.</p>;
  }

  const maxY = Math.max(1, ...series.flatMap(s => s.values));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (raceIdx: number) => PAD.left + (raceIdx / (raceCount - 1)) * innerW;
  const y = (pts: number) => PAD.top + innerH - (pts / maxY) * innerH;

  const finalValue = (s: ChartSeries) => s.values[Math.min(raceCount, s.values.length) - 1] ?? 0;
  const ranked = [...series].sort((a, b) => finalValue(b) - finalValue(a));
  const topIds = new Set(ranked.slice(0, LABELED_COUNT).map(s => s.id));

  // End-of-line labels for the contenders, nudged apart vertically
  const labels = ranked
    .slice(0, LABELED_COUNT)
    .filter(s => s.code)
    .map(s => ({
      code: s.code!, color: s.color, dashed: s.dashed,
      marble: s.marble, accentColor: s.accentColor,
      y: y(finalValue(s)),
    }))
    .sort((a, b) => a.y - b.y);
  const minSeparation = labels.some(l => l.marble) ? 20 : 13;
  for (let i = 1; i < labels.length; i++) {
    if (labels[i].y - labels[i - 1].y < minSeparation) {
      labels[i].y = labels[i - 1].y + minSeparation;
    }
  }
  // If the stack ran off the bottom, push it back up
  const overflow = labels.length > 0
    ? Math.max(0, labels[labels.length - 1].y - (H - PAD.bottom))
    : 0;
  if (overflow > 0) {
    for (let i = labels.length - 1; i >= 1; i--) {
      labels[i].y -= overflow;
      if (labels[i].y - labels[i - 1].y >= minSeparation) break;
    }
  }

  // Light grid: a midline and the top
  const gridYs = [maxY, Math.round(maxY / 2)];

  // Draw dimmed background series first, contenders on top
  const drawOrder = [...series].sort((a, b) =>
    Number(topIds.has(a.id)) - Number(topIds.has(b.id)));

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
        <text key={i} x={x(i)} y={H - 6} textAnchor="middle" className="chart-tick">
          {i + 1}
        </text>
      ))}
      {/* Series: dim field behind, contenders in front */}
      {drawOrder.map(s => {
        const isTop = topIds.has(s.id);
        return (
          <polyline
            key={s.id}
            fill="none"
            stroke={s.color}
            strokeWidth={isTop ? 2.4 : 1.4}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray={s.dashed ? '5 4' : undefined}
            opacity={isTop ? 0.95 : 0.3}
            points={s.values.slice(0, raceCount).map((v, i) => `${x(i)},${y(v)}`).join(' ')}
          >
            {s.label && <title>{s.label}</title>}
          </polyline>
        );
      })}
      {/* End-of-line labels for the contenders */}
      {labels.map(l => l.marble ? (
        <g key={String(l.code) + l.y}>
          <circle
            cx={W - PAD.right + 16}
            cy={l.y}
            r={9}
            fill={l.color}
            stroke={l.accentColor || '#fff'}
            strokeWidth={1.8}
          />
          <text
            x={W - PAD.right + 16}
            y={l.y}
            textAnchor="middle"
            dominantBaseline="central"
            style={{ fontSize: '10px' }}
          >
            {l.code}
          </text>
        </g>
      ) : (
        <text
          key={l.code + l.y}
          x={W - PAD.right + 6}
          y={l.y + 3}
          className={`chart-code ${l.dashed ? 'dashed' : ''}`}
          fill={l.color}
        >
          {l.dashed ? `${l.code}*` : l.code}
        </text>
      ))}
    </svg>
  );
}

export default PointsChart;
