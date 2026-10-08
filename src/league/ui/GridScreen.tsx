// The Grid as its own screen (#176 follow-up): every team this universe
// birthed — cars, stars, drivers' absurdist backstories — with full space to
// dive into a driver. Lifted out of the league view so it can breathe and
// become the driver-detail hub. Reached as a tab from the league.

import { useState } from 'react';
import { RosterDriver } from '../../RaceEngine';
import { LeagueState } from '../types';
import { getTeamById } from '../../data/teams';
import { tagsFor } from '../../data/tags';
import { getSeasonStandings, DriverSeasonStats } from '../../types/season';
import { getGodById } from '../gods';
import { TeamMarble } from './TeamMarble';
import './League.css';
import { rosterStateAt } from '../league';
import TagChips from '../../components/race/TagChips';
import '../../components/race/components.css';
import { GameIcon } from '../../icons/GameIcon';

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


function bestFinish(stats: DriverSeasonStats | undefined): string {
  if (!stats) return '—';
  const finishes = stats.raceResults.filter(p => p > 0); // -1 = DNF
  if (finishes.length === 0) return '—';
  return `P${Math.min(...finishes)}`;
}

function DriverEntry({ driver, stats }: { driver: RosterDriver; stats?: DriverSeasonStats }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`grid-driver ${open ? 'open' : ''}`}>
      <button className="grid-driver-row" onClick={() => setOpen(!open)}>
        <TeamMarble color={driver.color} accentColor={driver.accentColor}
          emoji={driver.emoji} size={24} slot={driver.driverSlot} />
        <span className="grid-driver-name">{driver.fullName}</span>
        <TagChips tags={tagsFor(driver.tags, 'driver')} showName icons />
        {stats && <span className="grid-driver-pts">{stats.points} pts</span>}
        <span className="grid-driver-toggle">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="grid-driver-detail">
          {driver.backstory && <p className="grid-driver-backstory">{driver.backstory}</p>}
          {driver.quirk && <p className="grid-driver-quirk">{driver.quirk}</p>}
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
          {stats && (
            <div className="grid-driver-season">
              <span className="grid-season-stat"><b>{stats.points}</b> pts</span>
              <span className="grid-season-stat"><b>{stats.wins}</b> W</span>
              <span className="grid-season-stat"><b>{stats.podiums}</b> pod</span>
              <span className="grid-season-stat"><b>{stats.dnfs}</b> DNF</span>
              <span className="grid-season-stat">best <b>{bestFinish(stats)}</b></span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GridScreen({ league, onExit }: { league: LeagueState; onExit: () => void }) {
  const god = getGodById(league.setup.godId);
  const standings = getSeasonStandings(league.season);
  const statByDriver = new Map(standings.map(s => [s.driverId, s]));

  // Group by team, preserving roster order.
  const teams: Array<{ kingdomId: string; drivers: RosterDriver[] }> = [];
  // The grid as it stands NOW — genesis plus every intervention and acquisition
  // up to the next race (#232), not the genesis roster.
  const current = rosterStateAt(league, league.settledThrough + 1);
  for (const driver of current) {
    const kingdomId = driver.kingdomId ?? 'unknown';
    const existing = teams.find(t => t.kingdomId === kingdomId);
    if (existing) existing.drivers.push(driver);
    else teams.push({ kingdomId, drivers: [driver] });
  }

  return (
    <div className="league-screen grid-screen">
      <div className="league-content">
        <div className="league-topbar">
          <button className="league-back-btn" onClick={onExit}>← League</button>
          <span className="league-progress">{teams.length} teams · {league.roster.length} drivers</span>
        </div>

        <header className="league-header">
          <h1 className="league-title">The Grid</h1>
          <p className="league-god-line">
            {god.emoji} {league.setup.name} — every team this universe birthed
          </p>
        </header>

        <div className="grid-teams grid-teams-full">
          {teams.map(({ kingdomId, drivers }) => {
            const team = getTeamById(kingdomId);
            const lead = drivers[0];
            return (
              <div key={kingdomId} className="grid-team-card" style={{ '--team-color': lead?.color } as React.CSSProperties}>
                <div className="grid-team-header">
                  <span className="grid-team-name">{team?.emoji ?? lead?.emoji} {team?.name ?? lead?.teamName ?? kingdomId}</span>
                  <TagChips tags={tagsFor(lead?.tags, 'team')} showName icons />
                </div>
                {lead?.carName && (
                  <div className="grid-team-car">
                    <span className="grid-car-name"><GameIcon name="card.upgrade" size={14} /> {lead.carName}</span>
                    {lead.carStats && (
                      <span className="grid-car-stars" title="Power / Grip / Reliability">
                        P {stars(lead.carStats.power)} · G {stars(lead.carStats.grip)} · R {stars(lead.carStats.reliability)}
                      </span>
                    )}
                    <TagChips tags={tagsFor(lead.tags, 'car')} showName icons />
                  </div>
                )}
                <div className="grid-team-drivers">
                  {drivers.map(d => <DriverEntry key={d.id} driver={d} stats={statByDriver.get(d.id)} />)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default GridScreen;
