// The Grid: every team this universe birthed — cars, stars, and the drivers'
// absurdist backstories. This is where the Commissionary meets the league.

import { useState } from 'react';
import { RosterDriver } from '../../RaceEngine';
import { getTeamById } from '../../data/teams';
import { Tag } from '../../data/tags';

function stars(n: number): string {
  const filled = Math.max(0, Math.min(5, Math.round(n)));
  return '★'.repeat(filled) + '☆'.repeat(5 - filled);
}

// Driver stats live on two scales (see DriverStats in RaceEngine.ts).
function pct(value: number, min: number, max: number): number {
  return Math.round(Math.max(0, Math.min(1, (value - min) / (max - min))) * 100);
}

const STAT_BARS: Array<{ label: string; key: keyof RosterDriver['stats']; min: number; max: number }> = [
  { label: 'Speed', key: 'baseSpeed', min: 0.85, max: 1.15 },
  { label: 'Accel', key: 'acceleration', min: 0.85, max: 1.15 },
  { label: 'Endure', key: 'endurance', min: 0.85, max: 1.15 },
  { label: 'Consist', key: 'consistency', min: 0.3, max: 0.8 },
  { label: 'Luck', key: 'luck', min: 0.3, max: 0.8 },
  { label: 'Aggro', key: 'aggression', min: 0.3, max: 0.8 },
];

function TagChip({ tag }: { tag: Tag }) {
  return <span className="grid-tag-chip" title={tag.description}>{tag.emoji} {tag.name}</span>;
}

function DriverEntry({ driver }: { driver: RosterDriver }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`grid-driver ${open ? 'open' : ''}`}>
      <button className="grid-driver-row" onClick={() => setOpen(!open)}>
        <span className="grid-driver-marble" style={{ background: driver.color }}>{driver.emoji}</span>
        <span className="grid-driver-name">{driver.fullName}</span>
        {driver.driverTag && <TagChip tag={driver.driverTag} />}
        <span className="grid-driver-toggle">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="grid-driver-detail">
          {driver.backstory && <p className="grid-driver-backstory">{driver.backstory}</p>}
          {driver.quirk && <p className="grid-driver-quirk">⚡ {driver.quirk}</p>}
          <div className="grid-stat-bars">
            {STAT_BARS.map(s => (
              <div key={s.key} className="grid-stat-bar">
                <span className="grid-stat-label">{s.label}</span>
                <span className="grid-stat-track">
                  <span className="grid-stat-fill" style={{
                    width: `${pct(driver.stats[s.key], s.min, s.max)}%`,
                    background: driver.color,
                  }} />
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GridSection({ roster }: { roster: RosterDriver[] }) {
  // Group by team, preserving roster order
  const teams: Array<{ kingdomId: string; drivers: RosterDriver[] }> = [];
  for (const driver of roster) {
    const kingdomId = driver.kingdomId ?? 'unknown';
    const existing = teams.find(t => t.kingdomId === kingdomId);
    if (existing) existing.drivers.push(driver);
    else teams.push({ kingdomId, drivers: [driver] });
  }

  return (
    <div className="grid-teams">
      {teams.map(({ kingdomId, drivers }) => {
        const team = getTeamById(kingdomId);
        const lead = drivers[0];
        return (
          <div key={kingdomId} className="grid-team-card" style={{ '--team-color': lead?.color } as React.CSSProperties}>
            <div className="grid-team-header">
              <span className="grid-team-name">{team?.emoji} {team?.name ?? lead?.teamName ?? kingdomId}</span>
              {lead?.teamTag && <TagChip tag={lead.teamTag} />}
            </div>
            {lead?.carName && (
              <div className="grid-team-car">
                <span className="grid-car-name">🏎️ {lead.carName}</span>
                {lead.carStats && (
                  <span className="grid-car-stars" title="Power / Grip / Reliability">
                    P {stars(lead.carStats.power)} · G {stars(lead.carStats.grip)} · R {stars(lead.carStats.reliability)}
                  </span>
                )}
                {lead.carTag && <TagChip tag={lead.carTag} />}
              </div>
            )}
            <div className="grid-team-drivers">
              {drivers.map(d => <DriverEntry key={d.id} driver={d} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default GridSection;
