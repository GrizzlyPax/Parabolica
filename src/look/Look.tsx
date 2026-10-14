// Ace America, the race program (#705): the COMPONENTS, drawn from the locked
// look. Every piece reads --ace-* tokens (tokens.css) so one <StepTheme>
// re-colours it for Locals, a State or Nationals. Race Control → Style shows
// each in every theme; Hub copies from there, never guesses.
import { useId, type CSSProperties, type ReactNode } from 'react';
import { sashGeometry, spokes, type SashOptions } from './sash';
import { ribbonStep, stepThemeVars, type RibbonStep, type StateLook, type Step } from './step';
import './tokens.css';
import './look.css';

// ---------------------------------------------------------------------------
// The theme wrapper

interface StepThemeProps {
  step: Step;
  /** The state whose colours accent the State step (ignored for other steps). */
  state?: StateLook;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/** Wears a step's theme: sets `data-step` and a state's colours as vars. */
export function StepTheme({ step, state, className, style, children }: StepThemeProps) {
  return <div data-step={step} className={className} style={{ ...stepThemeVars(step, state), ...style }}>{children}</div>;
}

// ---------------------------------------------------------------------------
// The wheel: the Accord's mark, gold, eight spokes

export function Wheel({ r = 10, stroke = 2.4, className }: { r?: number; stroke?: number; className?: string }) {
  const s = r * 2 + stroke * 2;
  return (
    <svg className={className} width={s} height={s} viewBox={`${-s / 2} ${-s / 2} ${s} ${s}`} aria-hidden="true">
      <WheelMarks r={r} stroke={stroke} />
    </svg>
  );
}

/** The wheel's lines, for an SVG that already has a centre (the sash). */
function WheelMarks({ r, stroke, fill = 'var(--ace-sash)', colour = 'var(--ace-wheel)' }: { r: number; stroke: number; fill?: string; colour?: string }) {
  return (
    <g>
      <circle r={r} fill={fill} stroke={colour} strokeWidth={stroke} />
      {spokes(r).map(([x, y], i) => <line key={i} x1={0} y1={0} x2={x} y2={y} stroke={colour} strokeWidth={stroke * 0.66} />)}
      <circle r={stroke} fill={colour} />
    </g>
  );
}

// ---------------------------------------------------------------------------
// The sash: it IS the title

interface SashProps extends SashOptions {
  /** The title, in Playball: "Ace Ohio". */
  text: string;
  /** Font size in box units (the box is 260 wide). */
  fontSize?: number;
  className?: string;
  /** Said to screen readers; the text when absent. */
  title?: string;
}

export function Sash({ text, fontSize = 25, className, title, ...geometry }: SashProps) {
  const id = useId().replace(/:/g, '');
  const g = sashGeometry(geometry);
  const [a, b] = g.wheels;
  return (
    <svg className={`ace-sash ${className ?? ''}`.trim()} viewBox={`0 0 ${g.box.w} ${g.box.h}`} role="img" aria-label={title ?? text}>
      <defs>
        <linearGradient id={`${id}-satin`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--ace-sash)" />
          <stop offset=".5" stopColor="var(--ace-sash-2)" />
          <stop offset="1" stopColor="var(--ace-sash)" />
        </linearGradient>
        <path id={`${id}-centre`} d={g.centre} fill="none" />
      </defs>
      <path d={g.band} fill={`url(#${id}-satin)`} stroke="var(--ace-sash-edge)" strokeWidth={3} strokeLinejoin="round" />
      <path d={g.pins[0]} fill="none" stroke="var(--ace-sash-edge)" strokeWidth={1} opacity={0.5} />
      <path d={g.pins[1]} fill="none" stroke="var(--ace-sash-edge)" strokeWidth={1} opacity={0.5} />
      <text fontFamily="var(--ace-script)" fontSize={fontSize} fill="var(--ace-sash-ink)" textAnchor="middle" dominantBaseline="central">
        <textPath href={`#${id}-centre`} startOffset="50%">{text}</textPath>
      </text>
      <g transform={`translate(${a[0]} ${a[1]})`}><WheelMarks r={g.wheelR} stroke={2.4} /></g>
      <g transform={`translate(${b[0]} ${b[1]})`}><WheelMarks r={g.wheelR} stroke={2.4} /></g>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Bunting, the program line, rules

/** A row of pennants along the top edge, in the step's three colours. */
export function Bunting() {
  // One repeat of three pennants as an SVG pattern: the pennants keep their size at any width (desktop first, #722).
  const id = useId().replace(/:/g, '');
  const w = 40, h = 26, total = w * 3;
  const fills = ['var(--ace-bunt-1)', 'var(--ace-bunt-2)', 'var(--ace-bunt-3)'];
  return (
    <svg className="ace-bunting" height={h + 2} aria-hidden="true">
      <defs>
        <pattern id={`${id}-bunt`} width={total} height={h + 2} patternUnits="userSpaceOnUse">
          {fills.map((fill, i) => {
            const x = i * w;
            return (
              <g key={i}>
                <path d={`M${x} 0 Q${x + w / 2} ${h} ${x + w} 0 Z`} fill={fill} />
                <path d={`M${x} 0 Q${x + w / 2} ${h} ${x + w} 0`} fill="none" stroke="var(--ace-ink)" strokeWidth={1} opacity={0.35} />
                {i === 2 && <Star cx={x + w / 2} cy={h * 0.38} r={3.2} fill="var(--ace-paper)" />}
              </g>
            );
          })}
        </pattern>
      </defs>
      <rect width="100%" height={h + 2} fill={`url(#${id}-bunt)`} />
      <line x1={0} y1={1} x2="100%" y2={1} stroke="var(--ace-ink)" strokeWidth={1.5} />
    </svg>
  );
}

/** A five-point star (drawn, never the glyph: the emoji sweep). */
export function Star({ cx, cy, r, fill }: { cx: number; cy: number; r: number; fill: string }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const rr = i % 2 === 0 ? r : r * 0.42;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    return `${(cx + Math.cos(a) * rr).toFixed(2)},${(cy + Math.sin(a) * rr).toFixed(2)}`;
  });
  return <polygon points={pts.join(' ')} fill={fill} />;
}

/** "OFFICIAL PROGRAM" · "No. 51 · 10¢" */
export function ProgramLine({ left = 'Official program', right }: { left?: string; right: string }) {
  return <div className="ace-prog"><span>{left}</span><span>{right}</span></div>;
}

export function Chequer({ tall }: { tall?: boolean }) {
  return <div className={`ace-chq ${tall ? 'tall' : ''}`.trim()} aria-hidden="true" />;
}

// ---------------------------------------------------------------------------
// Titles under a driver, the state bar, the pennant

/** A title ribbon: "Ace Toledo" (Locals, white) · "Ace Ohio" (the state's colours) · "Ace America" (navy and gold). */
export function TitleRibbon({ step, children, state }: { step: Step | RibbonStep; children: ReactNode; state?: StateLook }) {
  const look = ribbonStep(step as Step);
  return <span className={`ace-ribbon ${look}`} style={look === 'state' && state ? stepThemeVars('state', state) : undefined}>{children}</span>;
}

/** A city pennant with its name, in the accent. */
export function Pennant({ name, width = 72 }: { name: string; width?: number }) {
  return (
    <svg className="ace-pennant" width={width} height={Math.round(width * 0.36)} viewBox="0 0 150 54" aria-hidden="true">
      <path d="M0 0 L150 27 L0 54 Z" fill="var(--ace-accent)" stroke="var(--ace-ink)" strokeWidth={1.5} />
      <rect x={0} y={0} width={14} height={54} fill="var(--ace-paper)" stroke="var(--ace-ink)" strokeWidth={1.5} />
      <text x={22} y={32} fontSize={15} fill="var(--ace-accent-ink)" fontFamily="var(--ace-disp)" letterSpacing={1}>{name.toUpperCase()}</text>
    </svg>
  );
}

/** The bar under the bunting: the step, and the title you're going for. */
export function StateBar({ pennant, children }: { pennant?: ReactNode; children: ReactNode }) {
  return <div className="ace-statebar">{pennant}<span>{children}</span></div>;
}

// ---------------------------------------------------------------------------
// The placeholder car (commissioned art replaces it)

export function Racer({ number, width = 180, className }: { number?: number | string; width?: number; className?: string }) {
  return (
    <svg className={`ace-racer ${className ?? ''}`.trim()} width={width} height={width / 2} viewBox="0 0 180 90" aria-hidden="true">
      <g stroke="var(--ace-ink)" strokeWidth={2.5} strokeLinejoin="round">
        <path d="M14 58 Q16 40 40 38 L70 36 Q78 24 96 24 L112 24 Q122 26 124 38 L150 41 Q168 44 170 56 L170 62 L14 62 Z" fill="var(--ace-accent)" />
        <path d="M88 25 Q91 15 101 15 Q111 15 113 25 Z" fill="var(--ace-paper)" />
        <rect x={96} y={17} width={12} height={4} rx={2} fill="var(--ace-navy-2)" />
        <circle cx={46} cy={64} r={18} fill="var(--ace-ink)" /><circle cx={46} cy={64} r={10} fill="var(--ace-paper)" /><circle cx={46} cy={64} r={3} fill="var(--ace-ink)" />
        <circle cx={140} cy={64} r={18} fill="var(--ace-ink)" /><circle cx={140} cy={64} r={10} fill="var(--ace-paper)" /><circle cx={140} cy={64} r={3} fill="var(--ace-ink)" />
        <circle cx={76} cy={47} r={10} fill="var(--ace-paper)" />
      </g>
      {number !== undefined && <text x={76} y={51} textAnchor="middle" fontFamily="var(--ace-disp)" fontSize={11} fill="var(--ace-ink)">{number}</text>}
      <g stroke="var(--ace-ink)" strokeWidth={2} opacity={0.55}><line x1={0} y1={48} x2={9} y2={48} /><line x1={0} y1={56} x2={7} y2={56} /></g>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Buttons, roundels, levels, stamps

export function AceButton({ children, onClick, disabled, block, tone, className, type = 'button' }: { children: ReactNode; onClick?: () => void; disabled?: boolean; block?: boolean; tone?: 'ghost' | 'paper' | 'gold'; className?: string; type?: 'button' | 'submit' }) {
  return <button type={type} className={`ace-btn ${tone ?? ''} ${block ? 'block' : ''} ${className ?? ''}`.replace(/\s+/g, ' ').trim()} onClick={onClick} disabled={disabled}>{children}</button>;
}

export function Roundel({ n, big }: { n: number | string; big?: boolean }) {
  return <span className={`ace-roundel ${big ? 'big' : ''}`.trim()}>{n}</span>;
}

/** A stat level in the program's colours (red 1–6 · yellow 7–11 · green 12+). */
export function Level({ n }: { n: number }) {
  return <b className={`ace-lv ${n >= 12 ? 'g' : n >= 7 ? 'y' : 'r'}`}>{n}</b>;
}

/** A stamp on a card (#704's shape): inked, askew. `slot` 0–3 picks its tilt and ink. */
export function Stamp({ children, slot = 0, empty, gold }: { children?: ReactNode; slot?: number; empty?: boolean; gold?: boolean }) {
  return <div className={`ace-stamp s${slot % 4} ${empty ? 'empty' : ''} ${gold ? 'gold' : ''}`.replace(/\s+/g, ' ').trim()}><span>{children}</span></div>;
}

// ---------------------------------------------------------------------------
// The card frame: the art slot, the ribbons, stats, stamps

export interface AceCardProps {
  /** The band's text (the garage) and the racing number. */
  garage: string;
  number?: number;
  /** The face: commissioned art, or nothing for the slot. */
  art?: ReactNode;
  name: string;
  titles?: ReactNode;
  sub?: ReactNode;
  stats?: { label: string; level: number }[];
  stamps?: ReactNode;
}

export function AceCard({ garage, number, art, name, titles, sub, stats, stamps }: AceCardProps) {
  return (
    <div className="ace-card">
      <div className="ace-card-band"><span>{garage}</span>{number !== undefined && <Roundel n={number} />}</div>
      {art ? <div className="ace-card-art ace-lined">{art}</div> : <div className="ace-card-art slot"><span>Portrait</span><small>commissioned art goes here</small></div>}
      <div className="ace-card-name">{name}</div>
      {titles && <div className="ace-ribbons">{titles}</div>}
      {sub && <div className="ace-card-sub">{sub}</div>}
      {stats && <div className="ace-card-stats">{stats.map(s => <span key={s.label}>{s.label}<Level n={s.level} /></span>)}</div>}
      {stamps && <div className="ace-stamps">{stamps}</div>}
    </div>
  );
}

/** The car's card: one line, its stamps on the right. */
export function CarCard({ name, stamps }: { name: string; stamps?: ReactNode }) {
  return <div className="ace-card car"><b>The car · {name}</b>{stamps && <div className="ace-stamps small">{stamps}</div>}</div>;
}

// ---------------------------------------------------------------------------
// A Parcel

export function Parcel({ issue = 'League issue', to, gift }: { issue?: string; to: ReactNode; gift?: boolean }) {
  return (
    <div className={`ace-parcel ${gift ? 'gift' : ''}`.trim()} role="img" aria-label={gift ? 'A Parcel from a friend upstairs' : 'A Parcel, league issue'}>
      <div className="string v" /><div className="string h" />
      <div className="label"><b>{issue.toUpperCase()}</b><br />{to}</div>
      <div className="post"><svg width={34} height={34} viewBox="-17 -17 34 34" aria-hidden="true"><circle r={16} fill="var(--ace-paper)" stroke="var(--ace-ink)" strokeWidth={2} /><Star cx={0} cy={0} r={9} fill="var(--ace-ink)" /></svg></div>
    </div>
  );
}

export function ParcelStrip({ children }: { children: ReactNode }) {
  return <div className="ace-strip"><div className="ace-parcel-mini" aria-hidden="true" /><div>{children}</div></div>;
}
