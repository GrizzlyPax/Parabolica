// The venues, drawn (#778, Pax Oct 17: "a bigger visual refresh of the
// driving itself"; direction A of the pitch): one scene per track KIND, on
// cream paper in the program's hand. Each scene owns the racing line the
// cars ride (a closed path, start/finish at its start, clockwise), a pit
// lane beside it, the surface in its material (brick, dirt, boards, asphalt,
// mountain road, salt), and the scenery around it: the landmark that names
// the kind, a grandstand in the step's bunting, the crowd as dots, the
// infield in the state's words. Presentation only: the engine's lap
// progress (0–1) is drawn onto the path; the sim never reads a scene.
import type { ReactNode } from 'react';
import { getDeckTrackById } from '../../data/deckTracks';
import { Star } from '../Look';

export interface SceneCtx {
  /** The state's name, faint in the infield ("OHIO"). */
  stateName?: string;
  /** The title this race is for, in script in the infield ("Ace Zanesville"). */
  title?: string;
  /** The page's band above the scene: the venue and its kind, the race. */
  venueName?: string;
  kind?: string;
  raceLine?: string;
}

/** The band above a scene: the page of the program this race is on. Drawn by the map at the top of the box. */
export const SCENE_BAND = 44;
export function SceneBand({ ctx }: { ctx: SceneCtx }) {
  return (
    <g className="vn-band">
      <rect x={0} y={0} width={BOX.w} height={SCENE_BAND} fill={PAPER} />
      <line x1={14} y1={SCENE_BAND - 1} x2={BOX.w - 14} y2={SCENE_BAND - 1} stroke={INK} strokeWidth={1} />
      <line x1={14} y1={SCENE_BAND - 4} x2={BOX.w - 14} y2={SCENE_BAND - 4} stroke={INK} strokeWidth={0.5} />
      <text x={16} y={18} className="vn-k">Official program</text>
      <text x={BOX.w - 16} y={18} textAnchor="end" className="vn-k">{ctx.raceLine ?? ''}</text>
      <text x={BOX.w / 2} y={36} textAnchor="middle" className="vn-venue">{ctx.venueName ?? ''}{ctx.kind ? <tspan className="vn-kind"> · {ctx.kind}</tspan> : null}</text>
    </g>
  );
}

export interface VenueSurface {
  /** The track's width in box units. */
  width: number;
  /** The surface fill (a token). */
  fill: string;
  /** A centre line in dashes (asphalt, brick). */
  centreDash?: boolean;
  /** Plank seams across the surface (the Board Track). */
  planks?: boolean;
  /** Tyre marks along the surface (the Salt Flats). */
  marks?: boolean;
}

export interface VenueScene {
  kind: string;
  box: { w: number; h: number };
  /** The racing line: closed, start/finish at its start, clockwise. */
  path: string;
  /** The pit lane, a straight 'M x1 y1 L x2 y2' from entry to exit, beside the start/finish. */
  pitLane: string;
  surface: VenueSurface;
  /** The dust a car trails here (a token). */
  dust: string;
  /** Below the track: the paper, the infield, the stand, the landmark. */
  under: (ctx: SceneCtx) => ReactNode;
  /** Above the track, below the cars (bunting strings, a bridge). */
  over?: (ctx: SceneCtx) => ReactNode;
}

export const VENUE_KINDS = ['Brickyard', 'Fairgrounds', 'Board Track', 'Street Circuit', 'Hill-climb', 'Salt Flats'] as const;
export type VenueKind = typeof VENUE_KINDS[number];

const BOX = { w: 600, h: 360 } as const;
const INK = 'var(--ace-ink)';
const PAPER = 'var(--ace-paper)';
const PAPER2 = 'var(--ace-paper-2)';
const INK2 = 'var(--ace-ink-2)';

// ---------------------------------------------------------------------------
// Pieces every scene shares

/** The paper: cream, faintly lined, an ink frame. */
function Paper({ children }: { children?: ReactNode }) {
  return (
    <g className="vn-paper">
      <rect x={0} y={0} width={BOX.w} height={BOX.h} fill={PAPER} />
      <rect x={0} y={0} width={BOX.w} height={BOX.h} fill="url(#vn-lines)" opacity={0.6} />
      <rect x={6} y={6} width={BOX.w - 12} height={BOX.h - 12} fill="none" stroke={INK} strokeWidth={1} />
      {children}
    </g>
  );
}

/** A row of pennants in the step's three colours along a line. */
function BuntingRow({ x, y, w, drop = 7, pitch = 14 }: { x: number; y: number; w: number; drop?: number; pitch?: number }) {
  const n = Math.max(1, Math.floor(w / pitch));
  const fills = ['var(--ace-bunt-1)', 'var(--ace-bunt-2)', 'var(--ace-bunt-3)'];
  return (
    <g className="vn-bunting">
      <line x1={x} y1={y} x2={x + n * pitch} y2={y} stroke={INK} strokeWidth={0.8} />
      {Array.from({ length: n }, (_, i) => (
        <path key={i} d={`M${x + i * pitch} ${y} L${x + i * pitch + pitch / 2} ${y + drop} L${x + (i + 1) * pitch} ${y} Z`} fill={fills[i % 3]} stroke={INK} strokeWidth={0.4} />
      ))}
    </g>
  );
}

/** The crowd: dots in two rows, a little uneven. */
function Crowd({ x, y, w, rows = 2, pitch = 11 }: { x: number; y: number; w: number; rows?: number; pitch?: number }) {
  const n = Math.max(1, Math.floor(w / pitch));
  const dots: ReactNode[] = [];
  for (let r = 0; r < rows; r++) for (let i = 0; i < n; i++) {
    const jx = ((i * 7 + r * 3) % 5) - 2, jy = ((i * 5 + r * 11) % 4) - 1.5;
    dots.push(<circle key={`${r}-${i}`} cx={x + i * pitch + pitch / 2 + jx} cy={y + r * 7 + jy} r={2} />);
  }
  return <g className="vn-crowd" fill={INK} opacity={0.5}>{dots}</g>;
}

/** A grandstand: a roofed box with the crowd in it and bunting along its edge. `side` says which long edge faces the track. */
function Stand({ x, y, w, h = 30, side = 'bottom', label }: { x: number; y: number; w: number; h?: number; side?: 'top' | 'bottom'; label?: string }) {
  const edge = side === 'bottom' ? y + h : y;
  return (
    <g className="vn-stand">
      <rect x={x} y={y} width={w} height={h} fill={PAPER2} stroke={INK} strokeWidth={1} />
      <rect x={x} y={side === 'bottom' ? y : y + h - 4} width={w} height={4} fill={INK} opacity={0.7} />
      <Crowd x={x + 4} y={side === 'bottom' ? y + 10 : y + 6} w={w - 8} />
      <BuntingRow x={x} y={edge} w={w} drop={side === 'bottom' ? 7 : -7} />
      {label && <text x={x + w / 2} y={side === 'bottom' ? y - 4 : y + h + 12} textAnchor="middle" className="vn-k">{label}</text>}
    </g>
  );
}

/** The infield's words: the state faint and big, the title in script under it. */
function Infield({ cx, cy, ctx, size = 34 }: { cx: number; cy: number; ctx: SceneCtx; size?: number }) {
  return (
    <g className="vn-infield" textAnchor="middle">
      {ctx.stateName && <text x={cx} y={cy} className="vn-state" fontSize={size}>{ctx.stateName.toUpperCase()}</text>}
      {ctx.title && <text x={cx} y={cy + size * 0.7} className="vn-title" fontSize={size * 0.55}>{ctx.title}</text>}
    </g>
  );
}

function Pine({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${s})`}><path d="M0 -16 L7 -4 L3 -4 L9 6 L-9 6 L-3 -4 L-7 -4 Z" fill="var(--ace-green)" stroke={INK} strokeWidth={0.8} strokeLinejoin="round" /><rect x={-1.5} y={6} width={3} height={4} fill={INK} /></g>;
}

function Tent({ x, y, w = 26, h = 14 }: { x: number; y: number; w?: number; h?: number }) {
  return <g><path d={`M${x} ${y} L${x + w / 2} ${y - h} L${x + w} ${y} Z`} fill="var(--ace-bunt-2)" stroke={INK} strokeWidth={0.8} /><path d={`M${x + w / 2} ${y - h} L${x + w / 2} ${y}`} stroke={INK} strokeWidth={0.5} /><path d={`M${x + w / 2} ${y - h - 6} L${x + w / 2} ${y - h}`} stroke={INK} strokeWidth={1} /><path d={`M${x + w / 2} ${y - h - 6} L${x + w / 2 + 7} ${y - h - 3} L${x + w / 2} ${y - h} Z`} fill="var(--ace-accent)" /></g>;
}

// ---------------------------------------------------------------------------
// The six

const brickyard: VenueScene = {
  kind: 'Brickyard',
  box: BOX,
  // The rectangle with four turns and two short chutes, the front straight along the top.
  path: 'M 300 74 L 470 74 Q 530 74 530 120 L 530 240 Q 530 286 470 286 L 130 286 Q 70 286 70 240 L 70 120 Q 70 74 130 74 Z',
  pitLane: 'M 190 104 L 410 104',
  surface: { width: 24, fill: 'var(--ace-brick)', centreDash: true },
  dust: 'var(--ace-brown)',
  under: ctx => (
    <Paper>
      <rect x={110} y={116} width={380} height={128} rx={30} fill={PAPER2} opacity={0.7} />
      <Stand x={150} y={28} w={300} h={30} side="bottom" />
      {/* The pagoda at the line */}
      <g transform="translate(300 20)"><rect x={-13} y={16} width={26} height={14} fill={PAPER} stroke={INK} strokeWidth={1} /><path d="M-17 16 L0 6 L17 16 Z" fill="var(--ace-accent)" stroke={INK} strokeWidth={1} /><rect x={-9} y={30} width={18} height={8} fill={INK} /><path d="M-11 6 L0 -2 L11 6 Z" fill="var(--ace-accent)" stroke={INK} strokeWidth={0.8} /></g>
      {/* The yard of bricks at the line */}
      <rect x={296} y={60} width={8} height={30} fill={PAPER} stroke={INK} strokeWidth={0.6} />
      <Infield cx={300} cy={186} ctx={ctx} />
      {/* A barn and hay in the back of the infield */}
      <g transform="translate(140 220)"><rect x={0} y={0} width={30} height={16} fill="var(--ace-accent)" stroke={INK} strokeWidth={0.8} /><path d="M-2 0 L15 -10 L32 0 Z" fill={INK} /><rect x={12} y={6} width={6} height={10} fill={INK} /></g>
      <g transform="translate(430 224)"><circle cx={0} cy={0} r={7} fill="var(--ace-yellow)" stroke={INK} strokeWidth={0.8} /><circle cx={16} cy={0} r={7} fill="var(--ace-yellow)" stroke={INK} strokeWidth={0.8} /></g>
      <text x={300} y={322} textAnchor="middle" className="vn-k">The Brickyard · 2.5 miles of brick · four turns</text>
    </Paper>
  ),
};

const fairgrounds: VenueScene = {
  kind: 'Fairgrounds',
  box: BOX,
  // A dirt mile: a true oval, the front straight along the top.
  path: 'M 300 90 L 430 90 A 90 90 0 0 1 430 270 L 170 270 A 90 90 0 0 1 170 90 Z',
  pitLane: 'M 210 122 L 390 122',
  surface: { width: 26, fill: 'var(--ace-brown)' },
  dust: 'var(--ace-brown)',
  under: ctx => (
    <Paper>
      {/* Dust across the whole fairground */}
      <ellipse cx={300} cy={180} rx={200} ry={130} fill="var(--ace-brown)" opacity={0.12} />
      <Stand x={190} y={36} w={220} h={34} side="bottom" label="Grandstand" />
      {/* The Ferris wheel beyond turn three */}
      <g transform="translate(520 270)">
        <circle r={34} fill="none" stroke={INK} strokeWidth={1.2} />
        {Array.from({ length: 8 }, (_, i) => <line key={i} x1={0} y1={0} x2={Math.cos((i * Math.PI) / 4) * 34} y2={Math.sin((i * Math.PI) / 4) * 34} stroke={INK} strokeWidth={0.8} />)}
        {Array.from({ length: 8 }, (_, i) => <rect key={`c${i}`} x={Math.cos((i * Math.PI) / 4) * 34 - 4} y={Math.sin((i * Math.PI) / 4) * 34 - 2} width={8} height={5} fill={i % 2 ? 'var(--ace-accent)' : 'var(--ace-bunt-3)'} stroke={INK} strokeWidth={0.5} />)}
        <path d="M-14 36 L0 0 L14 36 Z" fill="none" stroke={INK} strokeWidth={1.2} />
      </g>
      {/* The barn, the silo, the livestock tents */}
      <g transform="translate(246 160)"><rect x={0} y={0} width={44} height={22} fill="var(--ace-accent)" stroke={INK} strokeWidth={0.8} /><path d="M-3 0 L22 -14 L47 0 Z" fill={INK} /><rect x={18} y={8} width={8} height={14} fill={INK} /><rect x={54} y={-14} width={12} height={36} fill={PAPER2} stroke={INK} strokeWidth={0.8} /><path d="M54 -14 Q60 -22 66 -14 Z" fill={INK} /></g>
      <Tent x={60} y={300} /><Tent x={96} y={304} w={20} h={11} /><Tent x={128} y={300} />
      <Infield cx={300} cy={230} ctx={ctx} size={28} />
      <text x={300} y={322} textAnchor="middle" className="vn-k">The fairgrounds · a dirt mile · the dust is the show</text>
    </Paper>
  ),
};

const boardTrack: VenueScene = {
  kind: 'Board Track',
  box: BOX,
  // A banked bowl of boards, wide, the straights short.
  path: 'M 300 80 L 420 80 A 100 100 0 0 1 420 280 L 180 280 A 100 100 0 0 1 180 80 Z',
  pitLane: 'M 230 128 L 370 128',
  surface: { width: 46, fill: 'color-mix(in srgb, var(--ace-brown) 48%, var(--ace-paper))', planks: true },
  dust: 'var(--ace-paper-2)',
  under: ctx => (
    <Paper>
      {/* The lumber frame under the banking */}
      <path d="M 300 80 L 420 80 A 100 100 0 0 1 420 280 L 180 280 A 100 100 0 0 1 180 80 Z" fill="none" stroke={INK} strokeWidth={54} opacity={0.12} />
      {Array.from({ length: 24 }, (_, i) => { const a = (i * Math.PI * 2) / 24; return <line key={i} x1={300 + Math.cos(a) * 118} y1={180 + Math.sin(a) * 118} x2={300 + Math.cos(a) * 134} y2={180 + Math.sin(a) * 134} stroke={INK} strokeWidth={1} opacity={0.35} />; })}
      <Stand x={120} y={300} w={360} h={30} side="top" label="The motordrome stand" />
      <Infield cx={300} cy={176} ctx={ctx} size={30} />
      <text x={300} y={212} textAnchor="middle" className="vn-k">boards · 45° banking</text>
      {/* Lamps on poles at the turns */}
      {[[62, 120], [62, 240], [538, 120], [538, 240]].map(([x, y], i) => <g key={i}><line x1={x} y1={y} x2={x} y2={y - 30} stroke={INK} strokeWidth={1.2} /><circle cx={x} cy={y - 32} r={4} fill="var(--ace-yellow)" stroke={INK} strokeWidth={0.8} /></g>)}
      <text x={300} y={36} textAnchor="middle" className="vn-k">Board speedway · a mile and a quarter of pine</text>
    </Paper>
  ),
};

const streetCircuit: VenueScene = {
  kind: 'Street Circuit',
  box: BOX,
  // Through the blocks: right angles, the start on Main Street along the top.
  path: 'M 300 70 L 500 70 L 500 170 L 400 170 L 400 290 L 100 290 L 100 170 L 220 170 L 220 70 Z',
  pitLane: 'M 250 100 L 470 100',
  surface: { width: 22, fill: 'color-mix(in srgb, var(--ace-ink) 72%, var(--ace-paper))', centreDash: true },
  dust: 'var(--ace-ink-2)',
  under: ctx => (
    <Paper>
      {/* The blocks: buildings with hatched roofs, awnings along Main Street */}
      {[[40, 30, 150, 24], [240, 24, 70, 30], [520, 30, 50, 24], [20, 100, 60, 50], [250, 120, 120, 36], [430, 200, 60, 70], [520, 200, 50, 70], [20, 310, 360, 24], [430, 310, 150, 24], [130, 200, 60, 70], [220, 200, 150, 70]].map(([x, y, w, h], i) => (
        <g key={i}><rect x={x} y={y} width={w} height={h} fill={PAPER2} stroke={INK} strokeWidth={1} /><rect x={x} y={y} width={w} height={h} fill="url(#vn-hatch)" opacity={0.5} />
          {Array.from({ length: Math.max(1, Math.floor(w / 18)) }, (_, k) => <rect key={k} x={x + 5 + k * 18} y={y + 5} width={8} height={Math.min(10, h - 10)} fill={PAPER} stroke={INK} strokeWidth={0.5} />)}
        </g>
      ))}
      {/* Awnings and the crowd on the Main Street sidewalk */}
      {Array.from({ length: 9 }, (_, i) => <path key={i} d={`M${250 + i * 28} 54 L${250 + i * 28 + 22} 54 L${250 + i * 28 + 22} 60 L${250 + i * 28} 60 Z`} fill={i % 2 ? 'var(--ace-accent)' : 'var(--ace-bunt-3)'} stroke={INK} strokeWidth={0.5} />)}
      <Crowd x={230} y={90} w={260} rows={1} pitch={13} />
      <Crowd x={110} y={302} w={280} rows={1} pitch={13} />
      {/* Lamp posts and a newsstand */}
      {[[230, 200], [370, 200], [410, 110]].map(([x, y], i) => <g key={i}><line x1={x} y1={y} x2={x} y2={y - 22} stroke={INK} strokeWidth={1.2} /><rect x={x - 4} y={y - 28} width={8} height={6} fill="var(--ace-yellow)" stroke={INK} strokeWidth={0.6} /></g>)}
      <g transform="translate(120 120)"><rect x={0} y={0} width={30} height={20} fill="var(--ace-bunt-3)" stroke={INK} strokeWidth={0.8} /><path d="M-3 0 L15 -8 L33 0 Z" fill="var(--ace-accent)" stroke={INK} strokeWidth={0.6} /><text x={15} y={14} textAnchor="middle" className="vn-k" fontSize={7}>NEWS</text></g>
      <Infield cx={300} cy={236} ctx={ctx} size={20} />
      <text x={300} y={346} textAnchor="middle" className="vn-k">Downtown · nine corners through the blocks · Main Street for the start</text>
    </Paper>
  ),
  over: () => <BuntingRow x={222} y={58} w={276} drop={6} pitch={12} />,
};

const hillClimb: VenueScene = {
  kind: 'Hill-climb',
  box: BOX,
  // Up the switchbacks on the right, the summit at the top, down the left; the start along the bottom.
  path: 'M 300 310 L 420 310 C 520 310 520 250 440 240 C 360 230 360 200 420 190 C 500 180 500 130 420 120 C 340 110 300 100 300 60 C 300 100 260 110 180 120 C 100 130 100 180 180 190 C 240 200 240 230 160 240 C 80 250 80 310 180 310 Z',
  pitLane: 'M 230 336 L 370 336',
  surface: { width: 18, fill: 'color-mix(in srgb, var(--ace-ink) 55%, var(--ace-paper))' },
  dust: 'var(--ace-ink-2)',
  under: ctx => (
    <Paper>
      {/* The mountain: contour lines up to the summit */}
      {[200, 160, 120, 84, 50].map((r, i) => <path key={i} d={`M ${300 - r * 1.3} 330 Q ${300 - r * 0.6} ${330 - r * 1.1} 300 ${330 - r * 1.35} Q ${300 + r * 0.6} ${330 - r * 1.1} ${300 + r * 1.3} 330`} fill="none" stroke={INK} strokeWidth={0.7} opacity={0.35} />)}
      {/* Pines on the slopes */}
      {[[120, 270, 1], [96, 300, 0.8], [500, 262, 1], [520, 296, 0.8], [250, 150, 0.9], [350, 150, 0.9], [230, 250, 0.8], [372, 250, 0.8], [60, 200, 0.7], [540, 200, 0.7]].map(([x, y, s], i) => <Pine key={i} x={x} y={y} s={s} />)}
      {/* The summit: a cairn and the flag */}
      <g transform="translate(300 52)"><path d="M-10 6 L0 -6 L10 6 Z" fill={PAPER2} stroke={INK} strokeWidth={1} /><line x1={0} y1={-6} x2={0} y2={-22} stroke={INK} strokeWidth={1.2} /><path d="M0 -22 L12 -18 L0 -14 Z" fill="var(--ace-accent)" /></g>
      <text x={300} y={34} textAnchor="middle" className="vn-k">The summit · 2,400 ft of climb</text>
      {/* The lookout stand at the start */}
      <Stand x={60} y={326} w={120} h={22} side="top" />
      <Stand x={420} y={326} w={120} h={22} side="top" />
      <Infield cx={300} cy={262} ctx={ctx} size={22} />
    </Paper>
  ),
};

const saltFlats: VenueScene = {
  kind: 'Salt Flats',
  box: BOX,
  // Two long straights and two tight ends on the salt; the mountains on the horizon.
  path: 'M 300 130 L 510 130 A 45 45 0 0 1 510 220 L 90 220 A 45 45 0 0 1 90 130 Z',
  pitLane: 'M 220 160 L 380 160',
  surface: { width: 28, fill: 'var(--ace-white)', marks: true },
  dust: 'var(--ace-paper-2)',
  under: ctx => (
    <Paper>
      {/* The salt: a faint crack grid; the horizon and the mountains */}
      <rect x={6} y={100} width={BOX.w - 12} height={BOX.h - 106} fill="var(--ace-white)" opacity={0.55} />
      <rect x={6} y={100} width={BOX.w - 12} height={BOX.h - 106} fill="url(#vn-salt)" opacity={0.5} />
      <path d="M 6 100 L 60 78 L 120 92 L 180 60 L 240 84 L 300 56 L 360 80 L 420 64 L 480 90 L 540 70 L 594 96 L 594 100 Z" fill={PAPER2} stroke={INK} strokeWidth={1} />
      <path d="M 170 66 L 180 60 L 192 68 Z M 290 62 L 300 56 L 312 62 Z M 412 70 L 420 64 L 430 70 Z" fill={PAPER} stroke={INK} strokeWidth={0.6} />
      <text x={300} y={36} textAnchor="middle" className="vn-k">The speed trials · the mountains forty miles off</text>
      {/* The timing stand and the tents */}
      <g transform="translate(300 86)"><rect x={-10} y={-20} width={20} height={20} fill={PAPER2} stroke={INK} strokeWidth={1} /><line x1={-8} y1={0} x2={-8} y2={12} stroke={INK} strokeWidth={1} /><line x1={8} y1={0} x2={8} y2={12} stroke={INK} strokeWidth={1} /><text x={0} y={-6} textAnchor="middle" className="vn-k" fontSize={7}>TIMING</text></g>
      <Tent x={60} y={290} /><Tent x={100} y={296} w={20} h={11} /><Tent x={480} y={292} /><Tent x={520} y={288} w={22} h={12} />
      <Crowd x={140} y={276} w={320} rows={1} pitch={16} />
      <Infield cx={300} cy={300} ctx={ctx} size={26} />
    </Paper>
  ),
};

const SCENES: Record<VenueKind, VenueScene> = { 'Brickyard': brickyard, 'Fairgrounds': fairgrounds, 'Board Track': boardTrack, 'Street Circuit': streetCircuit, 'Hill-climb': hillClimb, 'Salt Flats': saltFlats };

export function sceneForKind(kind: string | undefined): VenueScene | undefined {
  return kind ? SCENES[kind as VenueKind] : undefined;
}

/** The scene a track races on: the deck track's kind (a Season or Quick Race track id). */
export function sceneForTrackId(id: string | undefined): VenueScene | undefined {
  return sceneForKind(id ? getDeckTrackById(id)?.kind : undefined);
}

/** The patterns every scene's paper uses: lines, hatching, the salt's cracks. Rendered once inside the map's defs. */
export function SceneDefs() {
  return (
    <>
      <pattern id="vn-lines" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="1" fill={PAPER2} /></pattern>
      <pattern id="vn-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="1" height="6" fill={INK2} /></pattern>
      <pattern id="vn-salt" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M0 12 L10 8 L14 16 L24 12 M12 0 L10 8 M14 16 L12 24" fill="none" stroke={INK2} strokeWidth="0.5" /></pattern>
    </>
  );
}

/** A little star for the pit box marker and the odd flourish. */
export const SceneStar = Star;
