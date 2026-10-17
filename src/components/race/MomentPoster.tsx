// Moment posters (#778, direction D of the driving pitch): a drawn card for the
// race's big beats, slapped over the picture for a couple of seconds before
// the feed's big card carries the line. Nine moments on eight compositions:
// lights out, a lead change, a crash (and one of yours out), the cut, the
// white flag, the flag, a fast stop, rain. The poster wears the step's
// theme (tokens), the driver's garage colour on the car, a rosette on the
// winner's. Presentation only: a notification becomes a poster, nothing is
// written back. Off at 10×.
import { Confetti, Rosette, Star } from '../../look/Look';
import type { Step } from '../../look/step';
import { ProfileCar } from './TrackCamera';
import './MomentPoster.css';

export type PosterMoment = 'lightsOut' | 'leadChange' | 'crash' | 'out' | 'cut' | 'lastLap' | 'flag' | 'quickStop' | 'rain';

export interface PosterDriver { name: string; color: string; ink?: string; number?: string | number; team?: string }

export interface Poster {
  moment: PosterMoment;
  /** The big word. */
  head: string;
  /** The line under the picture. */
  sub?: string;
  /** The car and the name in script. */
  driver?: PosterDriver;
  /** One of yours: the poster says so. */
  mine?: boolean;
}

/** How long each poster holds, in ms. */
export const POSTER_MS: Record<PosterMoment, number> = { lightsOut: 2400, leadChange: 2200, crash: 2600, out: 3000, cut: 2800, lastLap: 2400, flag: 4200, quickStop: 2000, rain: 2400 };

/** A later poster replaces an earlier one unless the earlier is bigger. */
export const POSTER_PRIORITY: Record<PosterMoment, number> = { lightsOut: 2, leadChange: 1, crash: 2, out: 3, cut: 3, lastLap: 2, flag: 4, quickStop: 1, rain: 2 };

const titleCase = (s: string) => s.toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase());

/** Which notification becomes a poster; null for the rest (halfway, fastest lap, passes…). */
export function posterFor(type: string, title: string, message: string, driver?: PosterDriver, mine = false): Poster | null {
  switch (type) {
    case 'lead_change': return { moment: 'leadChange', head: 'Takes the lead', driver, mine };
    case 'crash': {
      const head = titleCase(title.replace(/!+$/, ''));
      const after = /\s-\s(.+?)!?$/.exec(message)?.[1];
      const sub = after ? titleCase(after).replace(/^Tire/, 'Tyre') : driver ? undefined : message;
      return { moment: 'crash', head, sub, driver, mine };
    }
    case 'finish': return { moment: 'flag', head: 'The flag', sub: 'Wins the race', driver, mine };
    case 'quick_pit_stop': return { moment: 'quickStop', head: 'Fast stop', sub: 'Out ahead of the pack', driver, mine };
    case 'weather': return { moment: 'rain', head: 'Rain', sub: message };
    case 'milestone': {
      if (title === 'FINAL LAP') return { moment: 'lastLap', head: 'White flag', sub: 'The last lap' };
      const cut = /^THE CUT(?: AFTER LAP (\d+))?/i.exec(title);
      if (cut) return { moment: 'cut', head: 'The cut', sub: `${cut[1] ? `After lap ${cut[1]} · ` : ''}${message}` };
      return null;
    }
    case 'info': return title === 'OUT' ? { moment: 'out', head: 'Out', sub: message.replace(/^.*?is out:\s*/i, ''), driver, mine: true } : null;
    default: return null;
  }
}

const INK = 'var(--ace-ink)', PAPER = 'var(--ace-paper)', PAPER2 = 'var(--ace-paper-2)', ACCENT = 'var(--ace-accent)';
const W = 480, H = 300;

/** The picture in the middle of the poster, by moment, drawn in a 480 × 112 box. */
function Picture({ moment, driver }: { moment: PosterMoment; driver?: PosterDriver }) {
  const color = driver?.color ?? ACCENT;
  const car = (s: number, x: number, y: number, extra?: string, fill = color) => (
    <g className={extra} transform={`translate(${x} ${y})`}><ProfileCar color={fill} ink={driver?.ink} number={driver?.number} s={s} spin={false} /></g>
  );
  switch (moment) {
    case 'lightsOut':
      return (
        <g>
          <g className="pm-lines" stroke={INK} strokeWidth={2} strokeLinecap="round" opacity={0.5}><line x1={20} y1={70} x2={70} y2={70} /><line x1={30} y1={82} x2={64} y2={82} /><line x1={170} y1={70} x2={220} y2={70} /><line x1={180} y1={82} x2={214} y2={82} /><line x1={320} y1={70} x2={370} y2={70} /><line x1={330} y1={82} x2={364} y2={82} /></g>
          {car(0.5, 120, 92, undefined, 'var(--ace-bunt-1)')}{car(0.5, 270, 92, undefined, 'var(--ace-bunt-3)')}{car(0.5, 420, 92, undefined, 'var(--ace-bunt-2)')}
          <g transform="translate(26 6)"><line x1={0} y1={0} x2={0} y2={100} stroke={INK} strokeWidth={3} strokeLinecap="round" /><path className="pm-flag" d="M3 4 Q30 -6 54 6 Q78 18 102 6 L102 52 Q78 64 54 52 Q30 40 3 50 Z" fill="var(--ace-green)" stroke={INK} strokeWidth={2} /></g>
        </g>
      );
    case 'leadChange':
      return (
        <g>
          <g className="pm-lines" stroke={INK} strokeWidth={3} strokeLinecap="round" opacity={0.45}><line x1={40} y1={56} x2={150} y2={56} /><line x1={70} y1={72} x2={160} y2={72} /><line x1={56} y1={88} x2={150} y2={88} /></g>
          <g className="pm-slide">{car(0.95, 300, 92)}</g>
          <g fill="var(--ace-brown)" opacity={0.5}><circle cx={190} cy={96} r={7} /><circle cx={176} cy={102} r={5} /><circle cx={166} cy={94} r={3.5} /></g>
        </g>
      );
    case 'crash': case 'out':
      return (
        <g>
          <g transform="translate(300 52)" stroke={INK} strokeWidth={2.5} strokeLinecap="round">{Array.from({ length: 10 }, (_, i) => { const a = (i * Math.PI) / 5; return <line key={i} x1={Math.cos(a) * 30} y1={Math.sin(a) * 30} x2={Math.cos(a) * (46 + (i % 2) * 10)} y2={Math.sin(a) * (46 + (i % 2) * 10)} />; })}</g>
          <polygon transform="translate(300 52)" points="0,-24 7,-9 24,-8 11,3 15,20 0,11 -15,20 -11,3 -24,-8 -7,-9" fill="var(--ace-yellow)" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
          <g fill="var(--ace-brown)" opacity={0.55}><circle cx={150} cy={100} r={12} /><circle cx={128} cy={92} r={8} /><circle cx={170} cy={104} r={7} /><circle cx={118} cy={104} r={5} /></g>
          <g className="pm-jolt" transform="translate(240 92) rotate(-14)"><ProfileCar color={color} ink={driver?.ink} number={driver?.number} s={0.8} spin={false} /></g>
        </g>
      );
    case 'cut':
      return (
        <g>
          <line x1={30} y1={60} x2={450} y2={60} stroke={INK} strokeWidth={2.5} strokeDasharray="14 10" className="pm-dash" />
          <g transform="translate(120 60)" stroke={INK} strokeWidth={2.5} fill={PAPER2} strokeLinejoin="round">
            <path d="M0 0 L70 -22 L76 -12 L10 6 Z" fill={PAPER} /><path d="M0 0 L70 22 L76 12 L10 -6 Z" fill={PAPER} />
            <ellipse cx={-18} cy={-16} rx={14} ry={10} transform="rotate(-20 -18 -16)" /><ellipse cx={-18} cy={16} rx={14} ry={10} transform="rotate(20 -18 16)" />
            <circle cx={0} cy={0} r={4} fill={INK} />
          </g>
          {car(0.42, 330, 44, undefined, 'var(--ace-bunt-1)')}{car(0.42, 410, 44, undefined, 'var(--ace-bunt-2)')}
          <g opacity={0.45}>{car(0.42, 250, 96, undefined, PAPER2)}{car(0.42, 170, 96, undefined, PAPER2)}</g>
        </g>
      );
    case 'lastLap':
      return (
        <g transform="translate(150 0)">
          <line x1={0} y1={4} x2={0} y2={108} stroke={INK} strokeWidth={4} strokeLinecap="round" /><circle cx={0} cy={4} r={5} fill="var(--ace-gold)" stroke={INK} strokeWidth={1.5} />
          <path className="pm-flag" d="M4 10 Q50 -2 92 12 Q134 26 180 10 L180 78 Q134 94 92 80 Q50 66 4 78 Z" fill="var(--ace-white)" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
        </g>
      );
    case 'flag':
      return (
        <g>
          <g transform="translate(60 0)">
            <line x1={0} y1={4} x2={0} y2={108} stroke={INK} strokeWidth={4} strokeLinecap="round" /><circle cx={0} cy={4} r={5} fill="var(--ace-gold)" stroke={INK} strokeWidth={1.5} />
            <g className="pm-flag">{Array.from({ length: 40 }, (_, i) => { const c = i % 8, r = Math.floor(i / 8); return <rect key={i} x={4 + c * 18} y={10 + r * 14} width={18} height={14} fill={(c + r) % 2 ? INK : PAPER} />; })}<rect x={4} y={10} width={144} height={70} fill="none" stroke={INK} strokeWidth={2} /></g>
          </g>
          {car(0.78, 340, 92)}
          <g fill="var(--ace-brown)" opacity={0.5}><circle cx={250} cy={98} r={6} /><circle cx={238} cy={102} r={4} /></g>
        </g>
      );
    case 'quickStop':
      return (
        <g>
          <g transform="translate(130 58)"><circle r={40} fill={INK} /><circle r={24} fill={PAPER} /><circle r={7} fill={INK} />{Array.from({ length: 5 }, (_, i) => <line key={i} x1={0} y1={0} x2={Math.cos((i * 2 * Math.PI) / 5) * 22} y2={Math.sin((i * 2 * Math.PI) / 5) * 22} stroke={INK} strokeWidth={4} strokeLinecap="round" />)}</g>
          <g transform="translate(236 56) rotate(-35)" stroke={INK} strokeWidth={2.5} strokeLinejoin="round"><rect x={-9} y={-6} width={70} height={12} rx={3} fill={PAPER2} /><path d="M-30 -16 L-6 -16 L-6 16 L-30 16 L-18 0 Z" fill={PAPER2} /><path d="M61 -16 L85 -16 L73 0 L85 16 L61 16 Z" fill={PAPER2} /></g>
          <g transform="translate(360 54)"><circle r={34} fill={PAPER} stroke={INK} strokeWidth={3} /><rect x={-7} y={-46} width={14} height={9} rx={2} fill={INK} /><line x1={0} y1={0} x2={0} y2={-24} stroke={INK} strokeWidth={3} strokeLinecap="round" /><line className="pm-hand" x1={0} y1={0} x2={18} y2={12} stroke={ACCENT} strokeWidth={3} strokeLinecap="round" />{Array.from({ length: 12 }, (_, i) => <line key={i} x1={Math.cos((i * Math.PI) / 6) * 27} y1={Math.sin((i * Math.PI) / 6) * 27} x2={Math.cos((i * Math.PI) / 6) * 31} y2={Math.sin((i * Math.PI) / 6) * 31} stroke={INK} strokeWidth={2} />)}</g>
        </g>
      );
    case 'rain':
      return (
        <g>
          <g transform="translate(240 30)" stroke={INK} strokeWidth={2.5} fill={PAPER2} strokeLinejoin="round"><path d="M-70 20 Q-70 -4 -46 -4 Q-40 -26 -14 -24 Q10 -28 20 -8 Q46 -14 52 8 Q70 10 70 20 Z" /></g>
          <g className="pm-rain" stroke="var(--ace-navy-2)" strokeWidth={2.5} strokeLinecap="round" opacity={0.75}>{Array.from({ length: 14 }, (_, i) => <line key={i} x1={60 + i * 27} y1={62 + (i % 3) * 9} x2={54 + i * 27} y2={80 + (i % 3) * 9} />)}</g>
        </g>
      );
  }
}

interface Props { poster: Poster; step?: Step }

/** The poster, slapped over the picture: the band, the head, the name in script, the picture, the line. */
export default function MomentPoster({ poster, step = 'locals' }: Props) {
  const { moment, head, sub, driver, mine } = poster;
  const headUp = head.toUpperCase();
  const headSize = Math.max(22, Math.min(46, Math.floor(430 / (0.78 * headUp.length))));
  const name = driver?.name;
  const nameSize = name ? Math.max(18, Math.min(32, Math.floor(400 / (0.52 * name.length)))) : 0;
  const theme = moment === 'out' || moment === 'crash' ? 'alarm' : moment === 'flag' ? 'gold' : '';
  return (
    <div className={`moment-poster pm-${moment} ${theme}`.trim()} role="status" aria-live="polite" aria-label={`${head}${name ? `: ${name}` : ''}${sub ? `. ${sub}` : ''}`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="moment-poster-svg" aria-hidden="true">
        <defs>
          <pattern id="pm-dots" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="1.7" className="pm-dot" /></pattern>
        </defs>
        <rect x={0} y={0} width={W} height={H} fill={PAPER} stroke={INK} strokeWidth={4} />
        <rect x={9} y={9} width={W - 18} height={H - 18} fill="none" stroke={INK} strokeWidth={1} />
        <rect x={9} y={9} width={W - 18} height={26} fill="url(#pm-dots)" />
        <rect x={W / 2 - 92} y={9} width={184} height={26} fill={PAPER} />
        <text x={W / 2} y={27} textAnchor="middle" className="pm-k">Official program · the moment</text>
        <text x={W / 2} y={name ? 86 : 96} textAnchor="middle" className="pm-head" fontSize={headSize}>{headUp}</text>
        {name && <text x={W / 2} y={128} textAnchor="middle" className="pm-name" fontSize={nameSize}>{name}</text>}
        {name && driver?.team && <text x={W / 2} y={146} textAnchor="middle" className="pm-k">{driver.team}</text>}
        <g transform={`translate(0 ${name ? 150 : 128})`}><Picture moment={moment} driver={driver} /></g>
        <line x1={24} y1={H - 30} x2={W - 24} y2={H - 30} stroke={INK} strokeWidth={1} />
        {sub && <text x={W / 2} y={H - 13} textAnchor="middle" className="pm-sub">{sub}</text>}
        {mine && <g transform={`translate(${W - 24} 9)`}><path d="M-78 0 L0 0 L0 44 L-39 32 L-78 44 Z" fill="var(--ace-gold)" stroke={INK} strokeWidth={1.5} strokeLinejoin="round" /><text x={-39} y={22} textAnchor="middle" className="pm-mine">Your car</text></g>}
        {moment === 'flag' && <Star cx={W - 46} cy={64} r={12} fill="var(--ace-gold)" />}
      </svg>
      {moment === 'flag' && <Rosette step={step} size={56} />}
      {moment === 'flag' && <Confetti count={36} />}
    </div>
  );
}
