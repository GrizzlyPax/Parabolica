// Racing numbers, centred for real (Pax, Oct 9: "they're always a little too
// high"). Special Elite sets its digits high in its box, so CSS centring, line-box
// trimming and SVG's "central" baseline all leave them 1–2 px high. Measured fix:
// put the number on its alphabetic baseline and drop it by half the digit height
// (digits are ~0.64em tall), which ignores the font's box. Centred within ±1.5%
// at 10–14 px, one or two digits. Use RaceNumber in HTML; NUMBER_DY in SVG text.
import type { CSSProperties } from 'react';

/** dy for an SVG <text> placed at the centre point: no dominantBaseline. */
export const NUMBER_DY = '0.32em';

interface Props {
  n: number | string;
  color: string;
  ink?: string;
  /** Outer size in px. */
  size?: number;
  shape?: 'circle' | 'square';
  /** Draw the ink ring (marbles do; squares in tables don't). */
  ring?: boolean;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

export function RaceNumber({ n, color, ink = '#fff', size = 22, shape = 'circle', ring = shape === 'circle', className, style, title }: Props) {
  const digits = String(n).length;
  const fontSize = digits >= 3 ? 34 : digits === 2 ? 44 : 50;
  return (
    <span className={`race-number ${className ?? ''}`.trim()} style={{ display: 'inline-block', width: size, height: size, flex: 'none', verticalAlign: 'middle', ...style }} role="img" aria-label={title ?? `Number ${n}`}>
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block' }} aria-hidden="true">
        {shape === 'circle'
          ? <circle cx={50} cy={50} r={ring ? 45 : 50} fill={color} stroke={ring ? ink : 'none'} strokeWidth={ring ? 9 : 0} />
          : <rect x={0} y={0} width={100} height={100} fill={color} stroke={ring ? ink : 'none'} strokeWidth={ring ? 9 : 0} />}
        <text x={50} y={50} dy={NUMBER_DY} textAnchor="middle" fill={ink} fontSize={fontSize} fontFamily="var(--look-data, monospace)" fontWeight={600}>{n}</text>
      </svg>
    </span>
  );
}
