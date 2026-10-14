// Standings + finale (#321, #453 layout A, #509). Two championships, no bonus.
// Mid-season (the Paddock's League tab is the usual way in): the chart and
// both tables. When every round has run: your Constructors' finish as the
// headline, two crowns (Constructors' and Drivers' champions), the chart, the
// final tables, and Play again (League Setup with a fresh seed).
import { useMemo } from 'react';
import { GameIcon, TeamLogo, teamThemeVars } from '../../icons/GameIcon';
import { draftState } from '../draft';
import { constructorStandings, driverStandings, poolFor, type SeasonFacts } from '../season';
import { seasonTable } from '../scoring';
import { seasonName } from '../setup';
import EndSeason from './EndSeason';
import { LeagueTables } from './LeagueTables';
import { SeasonChart } from './SeasonChart';
import { RaceNumber } from '../../icons/RaceNumber';
import { Avatar } from '../../icons/Avatar';
import { portraitFor } from '../../generators/avatars';
import { humanLabel, teamsOf } from './teams';
import { currentRunState } from '../../run/current';

interface Props {
  facts: SeasonFacts;
  onMenu: () => void;
  onEndSeason: () => void;
  onPaddock: () => void;
  onPlayAgain: () => void;
  /** Up the ladder (#597): shown when this league is won and one waits above. */
  onPromote?: () => void;
}

export default function Standings({ facts, onMenu, onPaddock, onPlayAgain, onEndSeason, onPromote }: Props) {
  // The run this league belongs to (#597); the screens for it are Hub's (#628).
  const run = useMemo(() => (facts.results.length ? currentRunState() : null), [facts.results.length]);
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

      {table.final && (
        <section className="fn-result">
          {humans.map(id => {
            const line = table.lines.find(l => l.teamId === id)!;
            const who = 'You';
            const crown = dc?.teamId === id ? ` · ${driver(dc.driver.driverId).fullName} is Drivers’ champion` : '';
            return <p key={id} className="fn-result-line"><b>{who} finished P{line.rank}</b> in the Constructors’ on {line.points} pts{crown}.</p>;
          })}
          {run?.phase === 'league-won' && <p className="fn-result-line"><b>Congratulations, you are now {run.ladder[run.leagueIndex].title}.</b> {run.ladder[run.leagueIndex + 1]?.name} is next; your whole garage goes up with you.</p>}
          {run?.phase === 'run-won' && <p className="fn-result-line"><b>Congratulations, you are now {run.ladder[run.leagueIndex].title}.</b> Nationals comes in a later build.</p>}
          {run?.phase === 'run-lost' && <p className="fn-result-line"><b>The season is over.</b> Only the title moves you up. Start again; what you unlocked stays.</p>}
        </section>
      )}

      {champion && dc && (
        <section className="fn-crowns">
          <div className="fn-crown">
            <TeamLogo team={champion} size={72} />
            <div className="fn-crown-text">
              <span className="rs-k"><GameIcon name="season.champion" size={14} /> Constructors’ champion{champLabel ? ` · ${champLabel}` : ''}</span>
              <span className="fn-crown-name">{champion.name}</span>
              <span className="fn-crown-stats">{table.lines[0].points} pts · {table.lines[0].wins} {table.lines[0].wins === 1 ? 'win' : 'wins'} · {podiums(champion.id)} podiums</span>
            </div>
          </div>
          <div className="fn-crown">
            <RaceNumber n={driver(dc.driver.driverId).number} color={teams[dc.teamId].color} ink={teams[dc.teamId].ink} size={56} shape="square" />
            <div className="fn-crown-text">
              <span className="rs-k"><GameIcon name="season.champion" size={14} /> Drivers’ champion · {teams[dc.teamId].name}{humanLabel(facts, dc.teamId) ? ` · ${humanLabel(facts, dc.teamId)}` : ''}</span>
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
        <LeagueTables facts={facts} pool={pool} teams={teams} rosters={rosters} lines={table.lines} drivers={drivers} />
      </section>
      <p className="rs-hint">Two championships, like F1: the Constructors’ (both racers’ points) and the Drivers’ (each driver’s own).</p>

      <div className="ss-dock">
        {table.final
          ? (run?.phase === 'league-won' && onPromote
            ? <button type="button" className="rs-btn rs-btn-primary ss-dock-btn" onClick={onPromote}>Up to {run.ladder[run.leagueIndex + 1]?.name} →</button>
            : <button type="button" className="rs-btn rs-btn-primary ss-dock-btn" onClick={onPlayAgain}>{run?.phase === 'run-lost' ? 'A new season' : 'A new season'}</button>)
          : <button type="button" className="rs-btn rs-btn-primary ss-dock-btn" onClick={onPaddock}>Back to the Paddock</button>}
      </div>
    </div>
  );
}
