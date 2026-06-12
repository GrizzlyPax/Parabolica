// Lap chart — the F1 position trace. Each driver is a line stepping between
// integer position rows (1st at top) across laps; lines cross as cars swap
// places. The shared position-over-time primitive (#208): the live tracker,
// the per-race audit (#173), and season standings (#172) all render through
// this. Dependency-free SVG.
//
// Two legend modes:
// - 'full' (race surfaces): one fixed row per car — running drivers in current
//   order with position · marble · name; retirees pinned to the bottom as DNF
//   (their lines simply stop where they fell). Click anything to focus.
// - 'compact' (season surfaces): label-light like the Points chart — teams
//   get a marble, drivers get their 3-letter code (dotted second seats marked
//   with *). The whole field stays visible: it's a standings chart.

import './LapChart.css';

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
  /** Out of the race — pinned to the bottom of the legend as DNF. */
  dnf?: boolean;
  /** Compact legend renders a marble (emoji on colour) instead of the text
   * code — the team convention, matching the Points chart. */
  marble?: boolean;
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
  /** 'full' = per-car classification legend (race surfaces); 'compact' =
   * marble/code-only labels for the whole field (season standings).
   * Default 'full'. */
  legendMode?: 'full' | 'compact';
}

const W = 880;
const H = 460;

function LapChart({ series, laps, totalLaps, fieldSize, scSampleIdx, focusedDriverIds, onDriverClick, legendMode = 'full' }: LapChartProps) {
  if (series.length === 0 || laps.length === 0) {
    return <p className="chart-waiting">The lap chart draws as the race unfolds…</p>;
  }
  const compact = legendMode === 'compact';
  // Full mode hosts position · marble · name; compact only a marble or code.
  const PAD = { top: 16, right: compact ? 64 : 178, bottom: 30, left: 32 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const rows = Math.max(2, fieldSize);
  const x = (lap: number) => PAD.left + (lap / Math.max(1, totalLaps)) * innerW;
  const y = (row: number) => PAD.top + ((row - 1) / (rows - 1)) * innerH;

  const hasFocus = (focusedDriverIds?.size ?? 0) > 0;
  const last = laps.length - 1;
  const lastClassifiedIdx = (s: LapChartSeries) => {
    for (let i = s.positions.length - 1; i >= 0; i--) if (s.positions[i] != null) return i;
    return -1;
  };

  // === Classification (current order) ===
  const running = series
    .filter(s => !s.dnf && s.positions[last] != null)
    .sort((a, b) => (a.positions[last] ?? 99) - (b.positions[last] ?? 99));
  const retired = series
    .filter(s => s.dnf || s.positions[last] == null)
    .sort((a, b) => lastClassifiedIdx(b) - lastClassifiedIdx(a));

  // Full mode: one fixed row per car (position · marble · name + DNF pin).
  // Compact: every entry labelled marble/code-only at its current rank —
  // ranks are dense (1..N), so rows are evenly spaced with no collisions
  // (a small nudge guards sparse data just in case).
  type LegendEntry = { s: LapChartSeries; ly: number; label: string; dnf: boolean };
  let legend: LegendEntry[];
  if (!compact) {
    legend = [
      ...running.map((s, i) => ({ s, ly: y(i + 1), label: String(s.positions[last] ?? i + 1), dnf: false })),
      ...retired.map((s, i) => ({ s, ly: y(running.length + i + 1), label: 'DNF', dnf: true })),
    ];
  } else {
    legend = running.map(s => ({
      s, ly: y(s.positions[last]!), label: '', dnf: false,
    }));
    const minSep = Math.min(15, innerH / Math.max(1, running.length));
    for (let i = 1; i < legend.length; i++) {
      if (legend[i].ly - legend[i - 1].ly < minSep) legend[i].ly = legend[i - 1].ly + minSep;
    }
  }

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

  // Lap ticks: every 5, plus the final lap.
  const tickLaps = Array.from({ length: totalLaps + 1 }, (_, l) => l)
    .filter(l => (l > 0 && l % 5 === 0) || l === totalLaps);

  // Focused lines drawn on top.
  const drawOrder = [...series].sort((a, b) =>
    Number(focusedDriverIds?.has(a.id) ?? false) - Number(focusedDriverIds?.has(b.id) ?? false));

  return (
    <svg className="lap-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Position chart">
      {/* Safety-car bands */}
      {scBands.map((b, i) => (
        <rect key={i} x={x(Math.max(0, b.from - 0.5))} y={PAD.top}
          width={x(b.to + 0.5) - x(Math.max(0, b.from - 0.5))} height={innerH}
          fill="#eab308" opacity="0.08" />
      ))}
      {/* Position gridlines (1, mid, last) */}
      {[1, Math.ceil(rows / 2), rows].map(p => (
        <g key={p}>
          <line x1={PAD.left} y1={y(p)} x2={W - PAD.right} y2={y(p)} stroke="#16161c" strokeWidth="1" />
          <text x={PAD.left - 6} y={y(p) + 3} textAnchor="end" className="chart-tick">{p}</text>
        </g>
      ))}
      {/* Lap axis: baseline, faint verticals + numbers at the ticks */}
      <line x1={PAD.left} y1={H - PAD.bottom + 6} x2={W - PAD.right} y2={H - PAD.bottom + 6}
        stroke="#23232a" strokeWidth="1" />
      {tickLaps.map(l => (
        <g key={l}>
          <line x1={x(l)} y1={PAD.top} x2={x(l)} y2={H - PAD.bottom + 6} stroke="#131318" strokeWidth="1" />
          <text x={x(l)} y={H - 8} textAnchor="middle" className="chart-tick">{l}</text>
        </g>
      ))}

      {/* Driver lines */}
      {drawOrder.map(s => {
        const focused = focusedDriverIds?.has(s.id) ?? false;
        const pts: string[] = [];
        s.positions.forEach((p, i) => { if (p != null) pts.push(`${x(laps[i])},${y(p)}`); });
        if (pts.length === 0) return null;
        const dim = hasFocus && !focused;
        return (
          <g key={s.id} className="lap-line" onClick={() => onDriverClick?.(s.id)} style={{ cursor: onDriverClick ? 'pointer' : undefined }}>
            <polyline
              fill="none" stroke={s.color}
              strokeWidth={focused ? 3 : compact ? 2 : 1.8}
              strokeLinejoin="round" strokeLinecap="round"
              strokeDasharray={s.dashed ? '5 4' : undefined}
              opacity={dim ? 0.15 : s.dnf ? 0.5 : 0.92}
              points={pts.join(' ')}
            />
            {/* A DNF line ends with an ✗ where they fell. */}
            {s.dnf && !dim && (() => {
              const li = lastClassifiedIdx(s);
              if (li < 0) return null;
              return (
                <text x={x(laps[li])} y={y(s.positions[li]!) + 3} textAnchor="middle"
                  className="lap-dnf-mark">✗</text>
              );
            })()}
            {/* Pit-stop dots */}
            {!dim && (s.pitLaps ?? []).map(pl => {
              const i = laps.indexOf(pl);
              const p = i >= 0 ? s.positions[i] : null;
              return p != null ? <circle key={pl} cx={x(pl)} cy={y(p)} r={2.6} fill="#fff" stroke={s.color} strokeWidth="1.2" /> : null;
            })}
          </g>
        );
      })}

      {/* Legend */}
      {legend.map(l => {
        const focused = focusedDriverIds?.has(l.s.id) ?? false;
        const dim = hasFocus && !focused;
        const gx = W - PAD.right;
        return (
          <g
            key={l.s.id}
            opacity={dim ? 0.32 : l.dnf ? 0.6 : 1}
            onClick={() => onDriverClick?.(l.s.id)}
            style={{ cursor: onDriverClick ? 'pointer' : undefined }}
          >
            {!compact ? (
              <>
                <text x={gx + 26} y={l.ly} textAnchor="end" dominantBaseline="central"
                  className={`lap-rank ${focused ? 'focused' : ''} ${l.dnf ? 'dnf' : ''}`}>{l.label}</text>
                <circle cx={gx + 41} cy={l.ly} r={8} fill={l.s.color} stroke={l.s.accentColor || '#fff'} strokeWidth={1.6} />
                <text x={gx + 41} y={l.ly} textAnchor="middle" dominantBaseline="central" style={{ fontSize: '8px' }}>
                  {l.s.emoji || l.s.code.slice(0, 1)}
                </text>
                <text x={gx + 55} y={l.ly} dominantBaseline="central"
                  className={`lap-name ${focused ? 'focused' : ''}`} fill={l.s.color}>
                  {l.s.name.length > 18 ? l.s.name.slice(0, 17) + '…' : l.s.name}
                </text>
              </>
            ) : l.s.marble ? (
              <>
                <circle cx={gx + 18} cy={l.ly} r={9} fill={l.s.color} stroke={l.s.accentColor || '#fff'} strokeWidth={1.8} />
                <text x={gx + 18} y={l.ly} textAnchor="middle" dominantBaseline="central" style={{ fontSize: '10px' }}>
                  {l.s.emoji || l.s.code.slice(0, 1)}
                </text>
              </>
            ) : (
              <text x={gx + 8} y={l.ly} dominantBaseline="central"
                className={`lap-code ${l.s.dashed ? 'dashed' : ''}`} fill={l.s.color}>
                {l.s.dashed ? `${l.s.code}*` : l.s.code}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default LapChart;
