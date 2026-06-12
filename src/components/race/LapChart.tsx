// Lap chart — the F1 position trace. Each driver is a line stepping between
// integer position rows (1st at top) across laps; lines cross as cars swap
// places. The shared position-over-time primitive (#208): the live tracker,
// the per-race audit (#173), and season standings (#172) all render through
// this. Dependency-free SVG.
//
// Our adaptations over the F1 chart: safety-car bands, pit-stop dots, a DNF
// drop, team-marble end labels (legible where 22 absurdist names wouldn't be),
// and click-to-focus.

export interface LapChartSeries {
  id: number;
  name: string;
  color: string;
  accentColor?: string;
  dashed?: boolean;
  code: string;
  emoji?: string;
  /** Position (1-based) at each sampled lap; null = not classified (DNF/after). */
  positions: (number | null)[];
  /** Lap numbers at which this driver pitted. */
  pitLaps?: number[];
}

interface LapChartProps {
  series: LapChartSeries[];
  /** Lap number at each sample index (the X domain). */
  laps: number[];
  totalLaps: number;
  /** Number of position rows (field size). */
  fieldSize: number;
  /** Sample indices run under safety car → shaded bands. */
  scSampleIdx?: Set<number>;
  focusedDriverIds?: Set<number>;
  onDriverClick?: (id: number) => void;
}

const W = 720;
const H = 360;
// Wide right gutter for the standings: position · marble · driver name.
const PAD = { top: 14, right: 210, bottom: 22, left: 30 };

function LapChart({ series, laps, totalLaps, fieldSize, scSampleIdx, focusedDriverIds, onDriverClick }: LapChartProps) {
  if (laps.length < 2) {
    return <p className="chart-waiting">The lap chart draws as the race unfolds…</p>;
  }
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const rows = Math.max(2, fieldSize);
  const x = (lap: number) => PAD.left + (lap / Math.max(1, totalLaps)) * innerW;
  const y = (pos: number) => PAD.top + ((pos - 1) / (rows - 1)) * innerH;

  const hasFocus = (focusedDriverIds?.size ?? 0) > 0;
  const lastPos = (s: LapChartSeries) => {
    for (let i = s.positions.length - 1; i >= 0; i--) if (s.positions[i] != null) return s.positions[i]!;
    return null;
  };

  // Safety-car bands: contiguous runs of SC sample indices → lap ranges.
  const scBands: { from: number; to: number }[] = [];
  if (scSampleIdx && scSampleIdx.size > 0) {
    let start: number | null = null;
    for (let i = 0; i < laps.length; i++) {
      if (scSampleIdx.has(i)) { if (start === null) start = i; }
      else if (start !== null) { scBands.push({ from: laps[start], to: laps[i - 1] }); start = null; }
    }
    if (start !== null) scBands.push({ from: laps[start], to: laps[laps.length - 1] });
  }

  // Right-edge standings: current position · marble · name, nudged apart.
  const labels = series
    .map(s => ({ s, pos: lastPos(s) }))
    .filter((l): l is { s: LapChartSeries; pos: number } => l.pos != null)
    .sort((a, b) => a.pos - b.pos)
    .map(l => ({ s: l.s, pos: l.pos, y: y(l.pos) }));
  const rowGap = Math.max(12, innerH / Math.max(1, labels.length));
  for (let i = 1; i < labels.length; i++) {
    if (labels[i].y - labels[i - 1].y < rowGap) labels[i].y = labels[i - 1].y + rowGap;
  }

  // Focused (or all if none) drawn on top.
  const drawOrder = [...series].sort((a, b) =>
    Number(focusedDriverIds?.has(a.id) ?? false) - Number(focusedDriverIds?.has(b.id) ?? false));

  return (
    <svg className="lap-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Race lap chart — position over laps">
      {/* Safety-car bands */}
      {scBands.map((b, i) => (
        <rect key={i} x={x(b.from - 0.5)} y={PAD.top} width={x(b.to + 0.5) - x(b.from - 0.5)} height={innerH}
          fill="#eab308" opacity="0.08" />
      ))}
      {/* Position gridlines (1, mid, last) */}
      {[1, Math.ceil(rows / 2), rows].map(p => (
        <g key={p}>
          <line x1={PAD.left} y1={y(p)} x2={W - PAD.right} y2={y(p)} stroke="#16161c" strokeWidth="1" />
          <text x={PAD.left - 4} y={y(p) + 3} textAnchor="end" className="chart-tick">{p}</text>
        </g>
      ))}
      {/* Lap ticks (every 5) */}
      {Array.from({ length: totalLaps + 1 }, (_, l) => l).filter(l => l > 0 && l % 5 === 0).map(l => (
        <text key={l} x={x(l)} y={H - 6} textAnchor="middle" className="chart-tick">{l}</text>
      ))}

      {/* Driver lines */}
      {drawOrder.map(s => {
        const focused = focusedDriverIds?.has(s.id) ?? false;
        const pts: string[] = [];
        s.positions.forEach((p, i) => { if (p != null) pts.push(`${x(laps[i])},${y(p)}`); });
        if (pts.length < 1) return null;
        const dim = hasFocus && !focused;
        return (
          <g key={s.id} className="lap-line" onClick={() => onDriverClick?.(s.id)} style={{ cursor: onDriverClick ? 'pointer' : undefined }}>
            <polyline
              fill="none" stroke={s.color}
              strokeWidth={focused ? 3 : 1.8}
              strokeLinejoin="round" strokeLinecap="round"
              strokeDasharray={s.dashed ? '5 4' : undefined}
              opacity={dim ? 0.18 : 0.92}
              points={pts.join(' ')}
            />
            {/* Pit-stop dots */}
            {!dim && (s.pitLaps ?? []).map(pl => {
              const i = laps.indexOf(pl);
              const p = i >= 0 ? s.positions[i] : null;
              return p != null ? <circle key={pl} cx={x(pl)} cy={y(p)} r={2.6} fill="#fff" stroke={s.color} strokeWidth="1.2" /> : null;
            })}
          </g>
        );
      })}

      {/* Right-edge standings: position · marble · driver name */}
      {labels.map(l => {
        const focused = focusedDriverIds?.has(l.s.id) ?? false;
        const dim = hasFocus && !focused;
        const gx = W - PAD.right + 8;
        return (
          <g
            key={l.s.id}
            opacity={dim ? 0.32 : 1}
            onClick={() => onDriverClick?.(l.s.id)}
            style={{ cursor: onDriverClick ? 'pointer' : undefined }}
          >
            <text x={gx} y={l.y} textAnchor="end" dominantBaseline="central"
              className={`lap-rank ${focused ? 'focused' : ''}`}>{l.pos}</text>
            <circle cx={gx + 14} cy={l.y} r={8} fill={l.s.color} stroke={l.s.accentColor || '#fff'} strokeWidth={1.6} />
            <text x={gx + 14} y={l.y} textAnchor="middle" dominantBaseline="central" style={{ fontSize: '8px' }}>
              {l.s.emoji || l.s.code.slice(0, 1)}
            </text>
            <text x={gx + 27} y={l.y} dominantBaseline="central"
              className={`lap-name ${focused ? 'focused' : ''}`} fill={l.s.color}>
              {l.s.name.length > 20 ? l.s.name.slice(0, 19) + '…' : l.s.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default LapChart;
