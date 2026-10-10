// The sash (#705; the locked look, Pax Oct 10): "the sash is the title". One
// CENTRE CURVE is the whole drawing: the satin band is the curve offset up and
// down, the two pinstripes are offsets inside it, the words sit on the curve
// (SVG textPath) and a gold wheel is centred on a point of the curve at each
// end. Change the curve and everything follows; scale the box and nothing
// drifts. Pure geometry; Look.tsx draws it.

export type Pt = [number, number];
/** A cubic Bézier: start, two controls, end. */
export interface Cubic { p0: Pt; p1: Pt; p2: Pt; p3: Pt }

/** The box the sash is drawn in (viewBox units); every size scales it. */
export const SASH_BOX = { w: 260, h: 116 } as const;
/** The centre curve: a gentle S from left to right, as mocked. */
export const SASH_CURVE: Cubic = { p0: [20, 58], p1: [82, 28], p2: [178, 88], p3: [240, 58] };

export interface SashOptions {
  /** The band's height, top edge to bottom edge. */
  band?: number;
  /** How far inside each edge the pinstripe runs. */
  pin?: number;
  /** Where along the curve (0–1) the wheels sit, measured from each end. */
  wheelAt?: number;
  wheelR?: number;
  curve?: Cubic;
}

export interface SashGeometry {
  box: { w: number; h: number };
  /** The centre curve as a path (the words ride this). */
  centre: string;
  /** The closed band: top offset, down the end, back along the bottom offset. */
  band: string;
  /** Two pinstripes, offsets inside the band. */
  pins: [string, string];
  /** Wheel centres, on the curve. */
  wheels: [Pt, Pt];
  wheelR: number;
  /** The tangent angle (degrees) at each wheel, for anything that wants to sit square to the band. */
  wheelAngles: [number, number];
}

export function bezierPoint(c: Cubic, t: number): Pt {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, d = 3 * u * t * t, e = t * t * t;
  return [a * c.p0[0] + b * c.p1[0] + d * c.p2[0] + e * c.p3[0], a * c.p0[1] + b * c.p1[1] + d * c.p2[1] + e * c.p3[1]];
}

export function bezierTangent(c: Cubic, t: number): Pt {
  const u = 1 - t;
  const dx = 3 * u * u * (c.p1[0] - c.p0[0]) + 6 * u * t * (c.p2[0] - c.p1[0]) + 3 * t * t * (c.p3[0] - c.p2[0]);
  const dy = 3 * u * u * (c.p1[1] - c.p0[1]) + 6 * u * t * (c.p2[1] - c.p1[1]) + 3 * t * t * (c.p3[1] - c.p2[1]);
  return [dx, dy];
}

/** The same curve, every point moved down by `dy` (up when negative). */
export function shifted(c: Cubic, dy: number): Cubic {
  const s = (p: Pt): Pt => [p[0], p[1] + dy];
  return { p0: s(c.p0), p1: s(c.p1), p2: s(c.p2), p3: s(c.p3) };
}

const f = (n: number) => (Math.round(n * 100) / 100).toString();
const pt = (p: Pt) => `${f(p[0])} ${f(p[1])}`;

/** "M … C … " for a curve, left to right. */
export function curvePath(c: Cubic): string {
  return `M${pt(c.p0)} C${pt(c.p1)} ${pt(c.p2)} ${pt(c.p3)}`;
}

/** The band as one closed path: along the top curve, then back along the bottom one. */
export function bandPath(top: Cubic, bottom: Cubic): string {
  return `${curvePath(top)} L${pt(bottom.p3)} C${pt(bottom.p2)} ${pt(bottom.p1)} ${pt(bottom.p0)} Z`;
}

export function sashGeometry(opts: SashOptions = {}): SashGeometry {
  const curve = opts.curve ?? SASH_CURVE;
  const band = opts.band ?? 36, pin = opts.pin ?? 5, wheelAt = opts.wheelAt ?? 0.07, wheelR = opts.wheelR ?? 10;
  const half = band / 2;
  const top = shifted(curve, -half), bottom = shifted(curve, half);
  const pinTop = shifted(curve, -half + pin), pinBottom = shifted(curve, half - pin);
  const angle = (t: number) => { const [dx, dy] = bezierTangent(curve, t); return (Math.atan2(dy, dx) * 180) / Math.PI; };
  return {
    box: { ...SASH_BOX },
    centre: curvePath(curve),
    band: bandPath(top, bottom),
    pins: [curvePath(pinTop), curvePath(pinBottom)],
    wheels: [bezierPoint(curve, wheelAt), bezierPoint(curve, 1 - wheelAt)],
    wheelR,
    wheelAngles: [angle(wheelAt), angle(1 - wheelAt)],
  };
}

/** The eight spokes of a wheel of radius r, as [x2, y2] pairs from the hub. */
export function spokes(r: number, count = 8): Pt[] {
  return Array.from({ length: count }, (_, i) => {
    const a = (i * 2 * Math.PI) / count;
    return [Math.round(Math.cos(a) * r * 100) / 100, Math.round(Math.sin(a) * r * 100) / 100];
  });
}
