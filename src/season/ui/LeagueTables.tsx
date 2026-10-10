// The league's two tables (#453): constructors and every driver, Wins · Pod ·
// Pts. Shared by the Paddock's League tab and the finale.
import { GameIcon, TeamLogo } from '../../icons/GameIcon';
import { nemesisTeam } from '../nemesis';
import { rivalRank } from '../ranks';
import { RaceNumber } from '../../icons/RaceNumber';
import { Avatar } from '../../icons/Avatar';
import { portraitFor } from '../../generators/avatars';
import type { CompetitorTeam, SeasonPool } from '../genesis';
import type { SeasonFacts } from '../season';
import type { DriverSeasonStats } from '../../types/season';

export interface ConstructorLine { teamId: string; rank: number; wins: number; points: number }

interface Props {
  facts: SeasonFacts;
  pool: SeasonPool;
  teams: Record<string, CompetitorTeam>;
  rosters: Record<string, { driverIds: number[] }>;
  lines: ConstructorLine[];
  drivers: DriverSeasonStats[];
}

export function LeagueTables({ facts, pool, teams, rosters, lines, drivers }: Props) {
  const humans = facts.setup.humans.map(h => h.teamId);
  const nemesisId = nemesisTeam(facts)?.id;
  const teamOfDriver = (id: number) => Object.keys(rosters).find(t => rosters[t].driverIds.includes(id))!;
  /** Top-three finishes by a team's drivers, all season (a double podium counts twice). */
  const teamPodiums = (teamId: string) => facts.results.reduce((n, r) => n + r.finishOrder.slice(0, 3).filter(id => rosters[teamId].driverIds.includes(id)).length, 0);
  return (
    <>
      <div className="rt-scroll">
        <table className="rt rt-compact">
          <thead><tr><th className="rt-pos">Pos</th><th className="rt-name">Constructors</th><th className="rt-numcol">Wins</th><th className="rt-numcol">Pod</th><th className="rt-numcol">Pts</th></tr></thead>
          <tbody>
            {lines.map(s => (
              <tr key={s.teamId} className={humans.includes(s.teamId) ? 'mine' : ''}>
                <td className="rt-pos">{s.rank}</td>
                <th className="rt-name" scope="row"><TeamLogo team={teams[s.teamId]} size={18} /><span className="rt-nm">{teams[s.teamId].name}</span>{s.teamId === nemesisId && <span className="nem-tag">NEMESIS</span>}</th>
                <td className="rt-numcol">{s.wins}</td>
                <td className="rt-numcol">{teamPodiums(s.teamId)}</td>
                <td className="rt-numcol">{s.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rt-scroll">
        <table className="rt rt-compact">
          <thead><tr><th className="rt-pos">Pos</th><th className="rt-name">Drivers</th><th className="rt-numcol">Wins</th><th className="rt-numcol">Pod</th><th className="rt-numcol">Pts</th></tr></thead>
          <tbody>
            {drivers.map((d, i) => {
              const p = pool.drivers.find(x => x.id === d.driverId)!;
              const t = teams[teamOfDriver(d.driverId)];
              return (
                <tr key={d.driverId} className={humans.includes(t.id) ? 'mine' : ''}>
                  <td className="rt-pos">{i + 1}</td>
                  <th className="rt-name" scope="row"><RaceNumber n={p.number} color={t.color} ink={t.ink} size={20} shape="square" className="rt-numsq" /><Avatar icon={portraitFor(pool.seed, p.id)} color={t.color} size={20} /><span className="rt-nm">{p.fullName}</span>{(() => { const r = rivalRank(facts, t.id); return r && <span className={`rk-tag ${r.crest ? 'crest' : ''}`} title={r.crest ? 'Legend, with the crest' : r.rank}>{r.crest && <GameIcon name="race.lead_change" size={10} />}{r.rank}</span>; })()}</th>
                  <td className="rt-numcol">{d.wins}</td>
                  <td className="rt-numcol">{d.podiums}</td>
                  <td className="rt-numcol">{d.points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
