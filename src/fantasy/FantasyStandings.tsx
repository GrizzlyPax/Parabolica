// Fantasy standings: who is winning the side game. Reads settled digests.
import { useMemo } from 'react';
import type { RosterDriver } from '../RaceEngine';
import type { RaceDigest } from '../league/types';
import { fantasyHex, fantasyStandings, type FantasyConfig } from './types';
import './Fantasy.css';

export function FantasyStandings({ cfg, digests, roster, compact = false }: { cfg: FantasyConfig; digests: Pick<RaceDigest, 'finishOrder' | 'dnfDriverIds'>[]; roster: Pick<RosterDriver, 'id' | 'fullName' | 'shortName'>[]; compact?: boolean }) {
  const lines = useMemo(() => fantasyStandings(cfg, digests), [cfg, digests]);
  const name = (id: number) => roster.find(d => d.id === id)?.[compact ? 'shortName' : 'fullName'] ?? `#${id}`;
  const last = digests.length - 1;
  return (
    <div className="fs">
      {lines.map(l => (
        <div key={l.team.id} className={`fs-row ${l.rank === 1 && l.points > 0 ? 'fs-leader' : ''}`} style={{ '--fc': fantasyHex(l.team.color) } as React.CSSProperties}>
          <span className="fs-rank">{l.rank}</span>
          <span className="fd-swatch" style={{ background: fantasyHex(l.team.color) }} />
          <span className="fs-name">{l.team.name}</span>
          <span className="fs-points">{l.points}{last >= 0 && l.perRace[last] > 0 && <small>+{l.perRace[last]}</small>}</span>
          {!compact && (
            <span className="fs-drivers">
              {l.drivers.map(d => <span key={d.driverId}><b>{name(d.driverId)}</b> {d.points}{last >= 0 && d.perRace[last] > 0 ? ` (+${d.perRace[last]})` : ''}</span>)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
