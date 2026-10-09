// Constructors' points, race by race (Pax, Oct 9: "line charts showing how
// teams are doing, really highlighting our team"). Your team (every human in
// hotseat) is a thick line in its colour; the leader is light; the rest are dim.
import type { ConstructorStanding } from '../season';

interface Team { id: string; name: string; color: string }

export function SeasonChart({ standings, teams, mine }: { standings: ConstructorStanding[]; teams: Record<string, Team>; mine: string[] }) {
  const W = 560, H = 260, L = 34, R = 120, T = 12, B = 26;
  const lines = standings.map(s => ({ id: s.teamId, cum: s.perRound.reduce<number[]>((a, p) => [...a, a[a.length - 1] + p], [0]) }));
  const n = Math.max(1, lines[0]?.cum.length - 1);
  const max = Math.max(10, ...lines.map(l => l.cum[l.cum.length - 1]));
  const top = Math.ceil(max / 50) * 50;
  const x = (i: number) => L + (i * (W - L - R)) / n;
  const y = (v: number) => T + (H - T - B) * (1 - v / top);
  const pts = (cum: number[]) => cum.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const leader = standings[0]?.teamId;
  const label = (id: string, color: string, w: number) => {
    const l = lines.find(z => z.id === id)!;
    const v = l.cum[l.cum.length - 1];
    return (
      <g key={id}>
        <polyline points={pts(l.cum)} fill="none" stroke={color} strokeWidth={w} />
        <circle cx={x(l.cum.length - 1)} cy={y(v)} r={4} fill={color} />
        <text x={x(l.cum.length - 1) + 8} y={y(v) + 4} className="sc-end" style={{ fill: color }}>{teams[id].name} {v}</text>
      </g>
    );
  };
  return (
    <svg className="season-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Constructors' points after each round">
      {[0, top / 2, top].map(v => (
        <g key={v}><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="sc-grid" /><text x={L - 6} y={y(v) + 3} textAnchor="end" className="sc-axis">{v}</text></g>
      ))}
      {Array.from({ length: n }, (_, i) => <text key={i} x={x(i + 1)} y={H - 8} textAnchor="middle" className="sc-axis">R{i + 1}</text>)}
      {lines.filter(l => l.id !== leader && !mine.includes(l.id)).map(l => <polyline key={l.id} points={pts(l.cum)} fill="none" className="sc-other" />)}
      {leader && !mine.includes(leader) && label(leader, 'var(--pw-text-2)', 2)}
      {mine.map(id => label(id, teams[id].color, 3.5))}
    </svg>
  );
}
