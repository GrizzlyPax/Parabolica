// Standings + finale (#321, docs/SEASON_MODE.md §5). Mid-season: both tables,
// with the drivers'-champion bonus shown as "would go to". When every round
// has run: the champion in their colour, the final table, and Play again
// (League Setup with a fresh seed; no carry-over in v0.5).
import { useMemo } from 'react';
import { GameIcon, TeamLogo, teamThemeVars } from '../../icons/GameIcon';
import { draftState } from '../draft';
import { driverStandings, poolFor, type SeasonFacts } from '../season';
import { DRIVERS_CHAMPION_BONUS, seasonTable } from '../scoring';
import { seasonName } from '../setup';
import EndSeason from './EndSeason';
import { humanLabel, teamsOf } from './teams';

interface Props {
  facts: SeasonFacts;
  onMenu: () => void;
  onEndSeason: () => void;
  onPaddock: () => void;
  onPlayAgain: () => void;
}

export default function Standings({ facts, onMenu, onPaddock, onPlayAgain, onEndSeason }: Props) {
  const teams = useMemo(() => teamsOf(facts), [facts]);
  const pool = useMemo(() => poolFor(facts), [facts]);
  const table = useMemo(() => seasonTable(facts), [facts]);
  const drivers = useMemo(() => driverStandings(facts), [facts]);
  const rosters = useMemo(() => draftState(pool, facts.draftPicks).rosters, [pool, facts.draftPicks]);
  const teamOf = (driverId: number) => Object.keys(rosters).find(id => rosters[id].driverIds.includes(driverId))!;
  const driver = (id: number) => pool.drivers.find(d => d.id === id)!;

  const champion = table.final ? teams[table.lines[0].teamId] : null;
  const champLabel = champion ? humanLabel(facts, champion.id) : null;
  const total = facts.setup.calendar.length;
  const you = teams[facts.setup.humans[0].teamId];
  const dc = table.driversChampion;

  return (
    <div className="run-setup season-setup ss-standings" style={teamThemeVars(champion ?? you)}>
      <header className="rs-top">
        <div className="rs-title-block">
          <button type="button" className="rs-back" onClick={onMenu}>← Menu</button>
          <h1 className="rs-title">{table.final ? 'Champions' : 'Standings'}</h1>
          <span className="rs-sub">{seasonName(facts.setup)} · {table.final ? `all ${total} races run` : `after ${facts.results.length} of ${total} races`}</span>
        </div>
        <EndSeason onEnded={onEndSeason} />
      </header>

      {champion && (
        <section className="ss-crown">
          <span className="ss-crown-k"><GameIcon name="season.champion" size={16} /> Constructors’ champion{champLabel ? ` · ${champLabel}` : ''}</span>
          <TeamLogo team={champion} size={64} />
          <span className="ss-crown-name">{champion.name}</span>
          <span className="ss-crown-pts">{table.lines[0].total} points · {table.lines[0].wins} {table.lines[0].wins === 1 ? 'win' : 'wins'}</span>
        </section>
      )}

      <section className="rs-row">
        <div className="rs-row-head"><span className="rs-k">Constructors</span></div>
        <ol className="ss-table">
          {table.lines.map(l => {
            const label = humanLabel(facts, l.teamId);
            return (
              <li key={l.teamId} className={`ss-table-row ${label ? 'human' : ''}`}>
                <span className="ss-table-rank">{l.rank}</span>
                <TeamLogo team={teams[l.teamId]} size={20} />
                <span className="ss-team-name">{teams[l.teamId].name}</span>
                {label && <span className="ss-badge ss-badge-human" style={teamThemeVars(teams[l.teamId])}>{label}</span>}
                {l.bonus > 0 && <span className="ss-bonus" title="Drivers’ champion bonus">+{l.bonus}</span>}
                <span className="ss-table-pts">{l.total}</span>
              </li>
            );
          })}
        </ol>
        <p className="rs-hint">
          Race points from both racers, plus <b>{DRIVERS_CHAMPION_BONUS}</b> for the team of the drivers’ champion
          {dc ? (table.final ? `: ${driver(dc.driver.driverId).fullName}, ${teams[dc.teamId].name}.` : `. Right now it would go to ${teams[dc.teamId].name}.`) : '.'}
        </p>
      </section>

      <section className="rs-row">
        <div className="rs-row-head"><span className="rs-k">Drivers</span></div>
        <ol className="ss-table">
          {drivers.filter(d => d.points > 0 || facts.results.length === 0).slice(0, 10).map((d, i) => {
            const p = driver(d.driverId);
            const team = teams[teamOf(d.driverId)];
            return (
              <li key={d.driverId} className="ss-table-row">
                <span className="ss-table-rank">{i + 1}</span>
                <span className="ss-num">{p.number}</span>
                <span className="ss-team-name">{p.fullName}</span>
                <TeamLogo team={team} size={16} />
                <span className="ss-table-pts">{d.points}</span>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="ss-dock">
        {table.final
          ? <button type="button" className="rs-btn rs-btn-primary ss-dock-btn" onClick={onPlayAgain}>Play again</button>
          : <button type="button" className="rs-btn rs-btn-primary ss-dock-btn" onClick={onPaddock}>Back to the Paddock</button>}
      </div>
    </div>
  );
}
