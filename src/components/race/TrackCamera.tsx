// The grandstand camera (#778, direction B of the driving pitch): the race
// side-on, as the stand sees it. The track is a ribbon; every running car is
// drawn in profile (the program's racer in its garage's colour and number)
// and sits by its real distance from the car the camera follows, which
// holds station at 42% of the frame; the rest of the field slides past it.
// Cars that would sit on each other take a lane further back (smaller,
// higher), the pits are a slip road in front of the stand, and anything out
// of frame folds into "+N ahead / behind". The backdrop is the venue's
// kind, the bunting the step's, the crowd in front; Nationals get the
// newsreel's grain and vignette. Presentation only: distance, status and
// pace are read, nothing is written.
import { useMemo } from 'react';
import type { Driver } from '../../RaceEngine';
import { driverSurname } from './driverCode';
import { sceneForKind } from '../../look/venues/scenes';
import type { Step } from '../../look/step';
import type { RaceScope } from './types';
import './TrackCamera.css';

export const CAMERA = { w: 900, h: 270, followAt: 0.42, window: 0.2, band: 36 } as const;

/** Where a car is in the race, in track units: whole laps plus the way round this one. */
export const raceDistance = (d: Driver, lapLength: number): number => d.currentLap * lapLength + (((d.position % lapLength) + lapLength) % lapLength);

export interface CameraCar {
  driver: Driver;
  /** Across the frame, in box units; the followed car sits at followAt × w. */
  x: number;
  /** 0 nearest the stand's eye … 3 furthest back; 4 is the pit road. */
  lane: number;
  /** Seconds to the followed car at the followed car's pace (0 for itself). */
  gap: number;
  ahead: boolean;
  dist: number;
}

export interface CameraFrame {
  cars: CameraCar[];
  aheadOut: number;
  behindOut: number;
  follow: Driver | null;
  leaderId: number | null;
}

/** Ten ticks make a second (ticksToTime); the gap in seconds at the followed car's pace. */
const TICKS_PER_SECOND = 10;

/** The frame: every running car placed by its distance from the followed one, laned so none sits on another, the rest counted. */
export function cameraFrame(drivers: readonly Driver[], lapLength: number, followId: number | undefined, fallback: readonly number[] = []): CameraFrame {
  const running = drivers.filter(d => d.status === 'racing' || d.status === 'pitting');
  const byDist = [...running].sort((a, b) => raceDistance(b, lapLength) - raceDistance(a, lapLength));
  const leaderId = byDist[0]?.id ?? null;
  const follow = running.find(d => d.id === followId) ?? fallback.map(id => running.find(d => d.id === id)).find((d): d is Driver => !!d) ?? byDist[0] ?? null;
  if (!follow) return { cars: [], aheadOut: 0, behindOut: 0, follow: null, leaderId };
  const d0 = raceDistance(follow, lapLength);
  const span = CAMERA.window * lapLength;
  const left = CAMERA.followAt * CAMERA.w;
  const pace = Math.max(follow.speedSmooth || 0, 0.01);
  let aheadOut = 0, behindOut = 0;
  const inFrame: { driver: Driver; x: number; dist: number }[] = [];
  for (const d of running) {
    const dist = raceDistance(d, lapLength);
    const x = left + ((dist - d0) / span) * CAMERA.w;
    if (x < -50) { behindOut++; continue; }
    if (x > CAMERA.w + 50) { aheadOut++; continue; }
    inFrame.push({ driver: d, x, dist });
  }
  // Lanes: the front of the field takes the near lane; a car within a car's length of one already placed in a lane takes the next lane back.
  inFrame.sort((a, b) => b.dist - a.dist);
  const lastX: number[] = [];
  const cars: CameraCar[] = inFrame.map(c => {
    let lane = 0;
    if (c.driver.status === 'pitting') lane = 4;
    else {
      while (lane < 3 && lastX[lane] !== undefined && Math.abs(lastX[lane] - c.x) < 70) lane++;
      lastX[lane] = c.x;
    }
    return { driver: c.driver, x: c.x, lane, gap: Math.abs(c.dist - d0) / pace / TICKS_PER_SECOND, ahead: c.dist > d0, dist: c.dist };
  });
  // Drawn back to front: the pit road, the far lanes, then the near lane; within a lane left to right.
  cars.sort((a, b) => (b.lane === 4 ? 9 : b.lane) - (a.lane === 4 ? 9 : a.lane) || a.x - b.x);
  return { cars, aheadOut, behindOut, follow, leaderId };
}

const LANE_Y = [190, 172, 156, 142] as const;
const LANE_SCALE = [1, 0.9, 0.82, 0.75] as const;
const PIT_Y = 112, PIT_SCALE = 0.7;
const INK = 'var(--ace-ink)', PAPER = 'var(--ace-paper)', PAPER2 = 'var(--ace-paper-2)';

/** The program's racer, in profile, in a garage's colour: 180 × 90 in its own box, drawn here at `s`. */
function ProfileCar({ color, ink, number, s, spin }: { color: string; ink?: string; number?: string | number; s: number; spin: boolean }) {
  return (
    <g transform={`translate(${-90 * s} ${-68 * s}) scale(${s})`}>
      <ellipse cx={92} cy={70} rx={88} ry={7} fill={INK} opacity={0.18} />
      <g stroke={INK} strokeWidth={2.5} strokeLinejoin="round">
        <path d="M14 58 Q16 40 40 38 L70 36 Q78 24 96 24 L112 24 Q122 26 124 38 L150 41 Q168 44 170 56 L170 62 L14 62 Z" fill={color} />
        <path d="M88 25 Q91 15 101 15 Q111 15 113 25 Z" fill={PAPER} />
        <rect x={96} y={17} width={12} height={4} rx={2} fill={INK} />
        <circle cx={46} cy={64} r={18} fill={INK} /><circle cx={46} cy={64} r={10} fill={PAPER} /><circle cx={46} cy={64} r={3} fill={INK} />
        <circle cx={140} cy={64} r={18} fill={INK} /><circle cx={140} cy={64} r={10} fill={PAPER} /><circle cx={140} cy={64} r={3} fill={INK} />
        <circle cx={76} cy={47} r={10} fill={PAPER} />
      </g>
      {spin && <><circle className="cam-wheel" cx={46} cy={64} r={14} fill="none" stroke={PAPER} strokeWidth={2} strokeDasharray="4 7" /><circle className="cam-wheel" cx={140} cy={64} r={14} fill="none" stroke={PAPER} strokeWidth={2} strokeDasharray="4 7" /></>}
      {number !== undefined && <text x={76} y={51} textAnchor="middle" fontFamily="var(--ace-disp)" fontSize={11} fill={ink ?? INK}>{number}</text>}
      <g stroke={INK} strokeWidth={2} opacity={0.55}><line x1={0} y1={48} x2={9} y2={48} /><line x1={0} y1={56} x2={7} y2={56} /></g>
    </g>
  );
}

/** The backdrop by kind: the stand with the crowd, and the landmark behind it. */
function Backdrop({ kind }: { kind?: string }) {
  const stand = (
    <g>
      <rect x={0} y={44} width={CAMERA.w} height={46} fill={PAPER2} stroke={INK} strokeWidth={1} />
      <rect x={0} y={44} width={CAMERA.w} height={5} fill={INK} opacity={0.7} />
      <g fill={INK} opacity={0.45}>{Array.from({ length: 70 }, (_, i) => <circle key={i} cx={8 + i * 12.8 + ((i * 7) % 5) - 2} cy={62 + ((i * 5) % 4) + (i % 2 ? 10 : 0)} r={2.6} />)}</g>
      <g>{Array.from({ length: 64 }, (_, i) => <path key={i} d={`M${i * 14} 90 L${i * 14 + 7} 98 L${i * 14 + 14} 90 Z`} fill={['var(--ace-bunt-1)', 'var(--ace-bunt-2)', 'var(--ace-bunt-3)'][i % 3]} stroke={INK} strokeWidth={0.4} />)}</g>
      <line x1={0} y1={90} x2={CAMERA.w} y2={90} stroke={INK} strokeWidth={0.8} />
    </g>
  );
  let landmark: JSX.Element | null = null;
  switch (kind) {
    case 'Brickyard':
      landmark = <g transform="translate(450 0)"><rect x={-18} y={16} width={36} height={28} fill={PAPER} stroke={INK} strokeWidth={1} /><path d="M-24 16 L0 2 L24 16 Z" fill="var(--ace-accent)" stroke={INK} strokeWidth={1} /><path d="M-14 2 L0 -8 L14 2 Z" fill="var(--ace-accent)" stroke={INK} strokeWidth={0.8} /><rect x={-5} y={30} width={10} height={14} fill={INK} /></g>;
      break;
    case 'Fairgrounds':
      landmark = <g><g transform="translate(120 8)"><circle r={30} cy={14} fill="none" stroke={INK} strokeWidth={1.2} />{Array.from({ length: 8 }, (_, i) => <line key={i} x1={0} y1={14} x2={Math.cos((i * Math.PI) / 4) * 30} y2={14 + Math.sin((i * Math.PI) / 4) * 30} stroke={INK} strokeWidth={0.8} />)}</g><g transform="translate(760 14)"><rect x={0} y={0} width={44} height={30} fill="var(--ace-accent)" stroke={INK} strokeWidth={0.8} /><path d="M-3 0 L22 -14 L47 0 Z" fill={INK} /><rect x={54} y={-12} width={12} height={42} fill={PAPER2} stroke={INK} strokeWidth={0.8} /></g></g>;
      break;
    case 'Board Track':
      landmark = <g>{Array.from({ length: 14 }, (_, i) => <line key={i} x1={i * 66 + 20} y1={44} x2={i * 66 + 20} y2={14} stroke={INK} strokeWidth={1.5} />)}<rect x={0} y={10} width={CAMERA.w} height={6} fill={PAPER2} stroke={INK} strokeWidth={0.8} /></g>;
      break;
    case 'Street Circuit':
      landmark = <g>{[[0, 60, 44], [70, 90, 32], [170, 120, 44], [300, 80, 40], [390, 140, 44], [540, 100, 38], [650, 70, 44], [730, 130, 30], [770, 90, 44], [870, 60, 30]].map(([x, w, h], i) => <g key={i}><rect x={x} y={44 - h} width={w} height={h} fill={PAPER2} stroke={INK} strokeWidth={1} />{Array.from({ length: Math.floor(w / 16) * Math.floor(h / 14) }, (_, k) => { const cols = Math.floor(w / 16); return <rect key={k} x={x + 5 + (k % cols) * 16} y={44 - h + 5 + Math.floor(k / cols) * 14} width={7} height={8} fill={PAPER} stroke={INK} strokeWidth={0.5} />; })}</g>)}</g>;
      break;
    case 'Hill-climb':
      landmark = <g><path d="M0 44 L120 14 L220 36 L330 -4 L440 30 L560 6 L680 34 L800 10 L900 40 L900 44 Z" fill={PAPER2} stroke={INK} strokeWidth={1} /><path d="M318 4 L330 -4 L344 6 Z M548 14 L560 6 L574 14 Z" fill={PAPER} stroke={INK} strokeWidth={0.6} />{[60, 150, 250, 400, 500, 620, 700, 840].map((x, i) => <g key={i} transform={`translate(${x} 36) scale(0.8)`}><path d="M0 -16 L7 -4 L3 -4 L9 6 L-9 6 L-3 -4 L-7 -4 Z" fill="var(--ace-green)" stroke={INK} strokeWidth={0.8} /></g>)}</g>;
      break;
    case 'Salt Flats':
      landmark = <g><path d="M0 44 L90 26 L180 38 L260 12 L350 32 L450 8 L540 30 L640 16 L740 36 L830 20 L900 40 L900 44 Z" fill={PAPER2} stroke={INK} strokeWidth={1} /><path d="M250 18 L260 12 L272 20 Z M440 14 L450 8 L462 16 Z" fill={PAPER} stroke={INK} strokeWidth={0.6} /></g>;
      break;
  }
  return <g className="cam-backdrop">{landmark}{stand}</g>;
}

interface Props {
  drivers: readonly Driver[];
  lapLength: number;
  followId?: number;
  /** Your cars: a halo in their colour; the first is the camera's fallback. */
  mine?: readonly number[];
  scope: RaceScope;
  kind?: string;
  step?: Step;
  venueName?: string;
  raceLine?: string;
  /** The garage as the screen names it (#778). */
  teamLabel?: (name: string) => string;
  /** The race's speed: the wheels only spin at 1× or 2×. */
  raceSpeed?: number;
  running?: boolean;
}

export default function TrackCamera({ drivers, lapLength, followId, mine, scope, kind, step, venueName, raceLine, teamLabel, raceSpeed = 1, running = true }: Props) {
  const frame = useMemo(() => cameraFrame(drivers, lapLength, followId, mine ?? []), [drivers, lapLength, followId, mine]);
  const surface = sceneForKind(kind)?.surface.fill ?? 'color-mix(in srgb, var(--ace-ink) 60%, var(--ace-paper))';
  const dust = sceneForKind(kind)?.dust ?? 'var(--ace-ink-2)';
  const vmax = frame.cars.reduce((m, c) => Math.max(m, c.driver.speedSmooth || 0), 0) || 1;
  const spin = running && raceSpeed <= 2;
  const newsreel = step === 'nationals';
  // The world slides past the followed car: the kerb and the centre line move with its distance.
  const slide = frame.follow ? (raceDistance(frame.follow, lapLength) / (CAMERA.window * lapLength)) * CAMERA.w : 0;
  // A crowded frame names fewer cars: the followed, yours and the leader always; then the near lanes.
  const n = frame.cars.length;
  const named = (c: CameraCar) => n <= 12 || (n <= 24 ? c.lane <= 1 : c.lane === 0);
  const label = (d: Driver) => `${driverSurname(d.name)}${d.teamName && scope === 'follow' && d.id === frame.follow?.id ? ` · ${teamLabel?.(d.teamName) ?? d.teamName}` : ''}`;
  return (
    <div className={`track-camera ${newsreel ? 'newsreel' : ''}`.trim()} role="img" aria-label={frame.follow ? `The stand's view, following ${frame.follow.name}` : 'The stand'}>
      <svg viewBox={`0 0 ${CAMERA.w} ${CAMERA.h + CAMERA.band}`} preserveAspectRatio="xMidYMid meet" className="track-camera-svg">
        <defs>
          <pattern id="cam-grain" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".55" fill={INK} opacity=".22" /><circle cx="3.5" cy="3.5" r=".45" fill={INK} opacity=".16" /></pattern>
          <clipPath id="cam-clip"><rect x={0} y={0} width={CAMERA.w} height={CAMERA.h} /></clipPath>
          <radialGradient id="cam-vignette" cx="50%" cy="50%" r="72%"><stop offset="62%" stopColor={INK} stopOpacity="0" /><stop offset="100%" stopColor={INK} stopOpacity=".5" /></radialGradient>
        </defs>
        {/* The page's band */}
        <rect x={0} y={0} width={CAMERA.w} height={CAMERA.band} fill={PAPER} />
        <text x={16} y={15} className="vn-k">Official program · the stand</text>
        <text x={CAMERA.w - 16} y={15} textAnchor="end" className="vn-k">{raceLine ?? ''}</text>
        <text x={CAMERA.w / 2} y={29} textAnchor="middle" className="vn-venue">{venueName ?? ''}{kind ? <tspan className="vn-kind"> · {kind}</tspan> : null}</text>
        <line x1={14} y1={CAMERA.band - 1} x2={CAMERA.w - 14} y2={CAMERA.band - 1} stroke={INK} strokeWidth={1} />
        <g transform={`translate(0 ${CAMERA.band})`} clipPath="url(#cam-clip)">
          <rect x={0} y={0} width={CAMERA.w} height={CAMERA.h} fill={PAPER} />
          <Backdrop kind={kind} />
          {/* The pit road in front of the stand, then the track */}
          <rect x={0} y={100} width={CAMERA.w} height={22} fill={PAPER2} stroke={INK} strokeWidth={0.6} />
          <text x={8} y={115} className="vn-k">Pits</text>
          <rect x={0} y={124} width={CAMERA.w} height={84} fill={surface} />
          <line x1={0} y1={124} x2={CAMERA.w} y2={124} stroke={INK} strokeWidth={1.2} />
          <line x1={0} y1={208} x2={CAMERA.w} y2={208} stroke={INK} strokeWidth={1.2} />
          <line x1={0} y1={166} x2={CAMERA.w} y2={166} stroke={PAPER} strokeWidth={1} strokeDasharray="12 14" strokeDashoffset={slide % 26} opacity={0.6} />
          <line x1={0} y1={206} x2={CAMERA.w} y2={206} stroke="var(--ace-accent)" strokeWidth={4} strokeDasharray="16 16" strokeDashoffset={slide % 32} />
          <line x1={0} y1={206} x2={CAMERA.w} y2={206} stroke={PAPER} strokeWidth={4} strokeDasharray="16 16" strokeDashoffset={(slide + 16) % 32} />
          {/* The cars, back to front */}
          {frame.cars.map(c => {
            const d = c.driver;
            const isFollow = d.id === frame.follow?.id;
            const isMine = !!mine?.includes(d.id);
            const y = c.lane === 4 ? PIT_Y : LANE_Y[c.lane];
            const s = (c.lane === 4 ? PIT_SCALE : LANE_SCALE[c.lane]) * 0.46;
            const v = Math.max(0, Math.min(1, (d.speedSmooth || 0) / vmax));
            const dim = scope === 'mine' && !isMine && !isFollow;
            return (
              <g key={d.id} className={`cam-car ${isFollow ? 'follow' : ''} ${isMine ? 'mine' : ''} ${dim ? 'dim' : ''}`.replace(/\s+/g, ' ').trim()} transform={`translate(${c.x.toFixed(1)} ${y})`} opacity={dim ? 0.55 : 1}>
                {isFollow && <ellipse cx={0} cy={3} rx={50 * s / 0.46} ry={10} fill={PAPER} opacity={0.3} />}
                {isMine && <ellipse cx={0} cy={2} rx={44 * s / 0.46} ry={9} fill={d.color} opacity={0.3} />}
                {c.lane !== 4 && v > 0.3 && <g fill={dust} opacity={0.5}><circle cx={-44 * s / 0.46} cy={-4} r={4 * v} /><circle cx={-52 * s / 0.46} cy={2} r={3 * v} /><circle cx={-58 * s / 0.46} cy={-1} r={2.2 * v} /></g>}
                <ProfileCar color={d.color} ink={d.ink} number={d.number} s={s} spin={spin && c.lane !== 4 && v > 0.1} />
                {isFollow && <path d="M-7 -62 L0 -55 L7 -62" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" className="cam-follow-mark" />}
                {(isFollow || isMine || frame.leaderId === d.id || (!dim && named(c))) && (
                  <text x={0} y={-36 * s / 0.46 - 8} textAnchor="middle" className={`cam-label ${isFollow ? 'follow' : ''}`}>{label(d)}</text>
                )}
                {(isFollow || isMine || frame.leaderId === d.id || (!dim && named(c))) && (
                  <text x={0} y={-36 * s / 0.46 + 4} textAnchor="middle" className={`cam-gap ${c.ahead ? 'ahead' : 'behind'}`}>
                    {isFollow ? (frame.leaderId === d.id ? 'Leader' : `P${[...drivers].filter(x => (x.status === 'racing' || x.status === 'pitting') && raceDistance(x, lapLength) > c.dist).length + 1}`) : frame.leaderId === d.id ? 'Leader' : c.lane === 4 ? 'In the pits' : `${c.ahead ? '+' : '−'}${c.gap.toFixed(1)}`}
                  </text>
                )}
              </g>
            );
          })}
          {/* The infield, the folds */}
          <rect x={0} y={208} width={CAMERA.w} height={32} fill={PAPER2} />
          <line x1={0} y1={240} x2={CAMERA.w} y2={240} stroke={INK} strokeWidth={0.8} />
          {frame.behindOut > 0 && <g transform="translate(8 230)"><rect x={0} y={-12} width={86} height={18} fill={INK} /><text x={43} y={1} textAnchor="middle" className="cam-fold">← +{frame.behindOut} behind</text></g>}
          {frame.aheadOut > 0 && <g transform={`translate(${CAMERA.w - 94} 230)`}><rect x={0} y={-12} width={86} height={18} fill={INK} /><text x={43} y={1} textAnchor="middle" className="cam-fold">+{frame.aheadOut} ahead →</text></g>}
          {/* The crowd in front */}
          <g fill={INK}>{Array.from({ length: 24 }, (_, i) => <circle key={i} cx={-6 + i * 40 + ((i * 7) % 11)} cy={248 + ((i * 5) % 7)} r={13 + (i % 3)} />)}<rect x={0} y={256} width={CAMERA.w} height={14} /></g>
          {newsreel && <><rect x={0} y={0} width={CAMERA.w} height={CAMERA.h} fill="url(#cam-grain)" /><rect x={0} y={0} width={CAMERA.w} height={CAMERA.h} fill="url(#cam-vignette)" /></>}
          <rect x={0} y={0} width={CAMERA.w} height={CAMERA.h} fill="none" stroke={INK} strokeWidth={1} />
        </g>
      </svg>
    </div>
  );
}
