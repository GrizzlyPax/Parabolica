// Standings + finale (#321, #453 layout A). Mid-season (the Paddock's League tab
// is the usual way in): the chart and both tables, with the drivers'-champion
// bonus shown as "would go to". When every round has run: two crowns
// (constructors' and drivers' champions), the chart, the final tables, and
// Play again (League Setup with a fresh seed; no carry-over in v0.5).
import { useMemo } from 'react';
import { GameIcon, TeamLogo, teamThemeVars } from '../../icons/GameIcon';
import { draftState } from '../draft';
import { constructorStandings, driverStandings, poolFor, type SeasonFacts } from '../season';
import { DRIVERS_CHAMPION_BONUS, seasonTable } from '../scoring';
import { seasonName } from '../setup';
import EndSeason from './EndSeason';
import { LeagueTables } from './LeagueTables';
import { SeasonChart } from './SeasonChart';
import { RaceNumber } from '../../icons/RaceNumber';
import { Avatar } from '../../icons/Avatar';
import { portraitFor } from '../../generators/avatars';
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
  const standings = useMemo(() => constructorStandings(facts), [facts]);
  const humans = facts.setup.humans.map(h => h.teamId);
  const podiums = (teamId: string) => facts.results.reduce((n, r) => n + r.finishOrder.slice(0, 3).filter(id => rosters[teamId].driverIds.includes(id)).length, 0);
  const driver = (id: number) => pool.drivers.find(d => d.id === id)!;

  const champion = table.final ? teams[table.lines[0].teamId] : null;
  const champLabel = champion ? humanLabel(facts, champion.id) : null;
  const total = facts.setup.calendar.length;
  const you = teams[facts.setup.humans[0].teamId];
  const dc = table.driversChampion;

  return (
    <div className="run-setup season-setup ss-standings fn" style={teamThemeVars(champion ?? you)}>
      <header className="rs-top">
        <div className="rs-title-block">
          <button type="button" className="rs-back" onClick={onMenu}>← Menu</button>
          <h1 className="rs-title">{table.final ? 'Champions' : 'Standings'}</h1>
          <span className="rs-sub">{seasonName(facts.setup)} · {table.final ? `all ${total} races run` : `after ${facts.results.length} of ${total} races`}</span>
        </div>
        <EndSeason onEnded={onEndSeason} />
      </header>

      {champion && dc && (
        <section className="fn-crowns">
          <div className="fn-crown">
            <TeamLogo team={champion} size={72} />
            <div className="fn-crown-text">
              <span className="rs-k"><GameIcon name="season.champion" size={14} /> Constructors’ champion{champLabel ? ` · ${champLabel}` : ''}</span>
              <span className="fn-crown-name">{champion.name}</span>
              <span className="fn-crown-stats">{table.lines[0].total} pts · {table.lines[0].wins} {table.lines[0].wins === 1 ? 'win' : 'wins'} · {podiums(champion.id)} podiums</span>
            </div>
          </div>
          <div className="fn-crown">
            <RaceNumber n={driver(dc.driver.driverId).number} color={teams[dc.teamId].color} ink={teams[dc.teamId].ink} size={56} shape="square" />
            <div className="fn-crown-text">
              <span className="rs-k">Drivers’ champion · +{DRIVERS_CHAMPION_BONUS} to {teams[dc.teamId].name}</span>
              <span className="fn-crown-name"><Avatar icon={portraitFor(pool.seed, dc.driver.driverId)} color={teams[dc.teamId].color} size={26} /> {driver(dc.driver.driverId).fullName}</span>
              <span className="fn-crown-stats">{dc.driver.points} pts · {dc.driver.wins} {dc.driver.wins === 1 ? 'win' : 'wins'} · {dc.driver.podiums} podiums</span>
            </div>
          </div>
        </section>
      )}

      {facts.results.length > 0 && (
        <section className="pk-chart">
          <div className="rs-k">Constructors’ points, race by race</div>
          <SeasonChart standings={standings} teams={teams} mine={humans} />
        </section>
      )}

      <section className="fn-tables">
        <LeagueTables facts={facts} pool={pool} teams={teams} rosters={rosters} lines={table.lines.map(l => ({ ...l, points: l.total }))} drivers={drivers} showBonus />
      </section>
      <p className="rs-hint">
        Race points from both racers, plus <b>{DRIVERS_CHAMPION_BONUS}</b> for the team of the drivers’ champion
        {dc ? (table.final ? `: ${driver(dc.driver.driverId).fullName}, ${teams[dc.teamId].name}.` : `. Right now it would go to ${teams[dc.teamId].name}.`) : '.'}
      </p>

      <div className="ss-dock">
        {table.final
          ? <button type="button" className="rs-btn rs-btn-primary ss-dock-btn" onClick={onPlayAgain}>Play again</button>
          : <button type="button" className="rs-btn rs-btn-primary ss-dock-btn" onClick={onPaddock}>Back to the Paddock</button>}
      </div>
    </div>
  );
}
