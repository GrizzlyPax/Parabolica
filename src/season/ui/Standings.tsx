// The finale (#321, #453 layout A, #509; the title screen since #778). When
// every race has run: the title you won as the sash ("Congratulations, you
// are now Ace Toledo"), the Postmark picks, and the way up, straight into
// the next step's Paddock; or the run over, and a new season. Under that:
// two crowns (the top garage and the top driver), the points race by race
// and the final tables. Mid-season the table lives in the Paddock.
import { raceBadges } from '../badges';
import { useMemo, useState } from 'react';
import { GameIcon, teamThemeVars } from '../../icons/GameIcon';
import { draftState } from '../draft';
import { constructorStandings, driverStandings, poolFor, type SeasonFacts } from '../season';
import { seasonTable } from '../scoring';
import { LeagueTables } from './LeagueTables';
import { SeasonChart } from './SeasonChart';
import { RaceNumber } from '../../icons/RaceNumber';
import { Avatar } from '../../icons/Avatar';
import { portraitFor } from '../../generators/avatars';
import { humanLabel, teamsOf } from './teams';
import { currentRunState } from '../../run/current';
import type { TitlePicks } from '../../run/run';
import { runWhere } from '../../run/where';
import { TITLE_STAMP_LEVELS, TITLE_STAMP_STATS } from '../stamps';
import { DRIVER_STATS, STAT_LABELS } from '../../cards/deck';
import type { DriverStatKey } from '../../cards/types';
import DriverCard from './DriverCard';
import { driverCardOf } from '../driverCard';
import RunHeader from './RunHeader';
import { AceButton, Sash, StepTheme } from '../../look/Look';

interface Props {
  facts: SeasonFacts;
  onMenu: () => void;
  onRoad: () => void;
  onEndRun: () => void;
  onPaddock: () => void;
  onPlayAgain: () => void;
  /** Up the ladder (#597, #704): the title's Postmark picks, then the next step's Paddock. */
  onPromote: (picks: TitlePicks) => void;
}

export default function Standings({ facts, onMenu, onRoad, onEndRun, onPaddock, onPlayAgain, onPromote }: Props) {
  // The run this league belongs to (#597).
  const run = useMemo(() => (facts.results.length ? currentRunState() : null), [facts.results.length]);
  const teams = useMemo(() => teamsOf(facts), [facts]);
  const pool = useMemo(() => poolFor(facts), [facts]);
  const table = useMemo(() => seasonTable(facts), [facts]);
  const drivers = useMemo(() => driverStandings(facts), [facts]);
  const rosters = useMemo(() => draftState(pool, facts.draftPicks).rosters, [pool, facts.draftPicks]);
  const standings = useMemo(() => constructorStandings(facts), [facts]);
  const where = useMemo(() => runWhere(facts), [facts]);
  const [cardOf, setCardOf] = useState<number | null>(null);
  const humans = facts.setup.humans.map(h => h.teamId);
  const podiums = (teamId: string) => facts.results.reduce((n, r) => n + r.finishOrder.slice(0, 3).filter(id => rosters[teamId].driverIds.includes(id)).length, 0);
  const driver = (id: number) => pool.drivers.find(d => d.id === id)!;

  const champion = table.final ? teams[table.lines[0].teamId] : null;
  const champLabel = champion ? humanLabel(facts, champion.id) : null;
  const youId = facts.setup.humans[0].teamId;
  const you = teams[youId];
  const dc = table.driversChampion;
  const mine = table.lines.find(l => l.teamId === youId);
  const phase = run?.phase;
  const title = where.goingFor;

  // The title stamps (#704): each driver picks the stats their Postmark goes on before going up.
  const [picks, setPicks] = useState<TitlePicks>({});
  const stampCount = TITLE_STAMP_STATS[where.step] ?? 0;
  const yourDrivers = (rosters[youId]?.driverIds ?? []).map(id => driver(id));
  // Every driver has picked: no defaults, the choice is the moment (#704).
  const picksDone = stampCount === 0 || yourDrivers.every(d => (picks[d.id] ?? []).length === stampCount);
  const togglePick = (driverId: number, stat: DriverStatKey) => setPicks(p => {
    const held = p[driverId] ?? [];
    const next = held.includes(stat) ? held.filter(s => s !== stat) : held.length < stampCount ? [...held, stat] : held;
    return { ...p, [driverId]: next };
  });

  return (
    <StepTheme step={where.step} state={where.state} className="ace-page fn" style={teamThemeVars(champion ?? you)}>
      <RunHeader facts={facts} title={phase === 'league-won' || phase === 'run-won' ? undefined : table.final ? 'The season is over' : 'The table'} won={phase === 'league-won' || phase === 'run-won'} onMenu={onMenu} onRoad={onRoad} onEndRun={phase === 'league' ? onEndRun : undefined} />

      {(phase === 'league-won' || phase === 'run-won') && (
        <section className="fn-hero" aria-label="Your title">
          <span className="ace-k">Congratulations, you are now</span>
          <div className="ace-sash-wrap"><Sash text={title} className="fn-sash" fontSize={title.length > 14 ? 19 : 23} /></div>
          <p className="fn-line">
            {phase === 'run-won'
              ? 'The top of the road. Every title on it is yours.'
              : <>Next: {where.nextStep}, for {where.next}. Your whole garage goes up with you{mine ? ` on ${mine.points} pts` : ''}.</>}
          </p>
          {phase === 'league-won' && stampCount > 0 && (
            <div className="ace-panel fn-stamps" role="group" aria-label="Postmarks">
              <span className="ace-k">The {title.replace(/^Ace /, '')} Postmark · pick {stampCount === 1 ? 'a stat' : `${stampCount} stats`} for each driver: +{TITLE_STAMP_LEVELS} levels, struck on their ribbon for good</span>
              {yourDrivers.map(d => (
                <div key={d.id} className="fn-stamp-row">
                  <span className="fn-stamp-who"><Avatar icon={portraitFor(pool.seed, d.id)} color={you.color} size={22} /> {d.fullName}</span>
                  <span className="fn-stamp-stats">
                    {DRIVER_STATS.map(s => (
                      <button key={s} type="button" className={`ace-tab ${(picks[d.id] ?? []).includes(s) ? 'on' : ''}`} aria-pressed={(picks[d.id] ?? []).includes(s)} onClick={() => togglePick(d.id, s)}>{STAT_LABELS[s]}</button>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
      {phase === 'run-lost' && (
        <p className="fn-line">
          {champion ? <>{title} went to <b>{champion.name}</b>. </> : null}
          {mine ? `You finished ${mine.rank === 1 ? 'P1' : `P${mine.rank}`} on ${mine.points} pts. ` : ''}
          Only the title moves you up. Start again; the road is the same.
        </p>
      )}

      {champion && dc && (
        <section className="fn-crowns">
          <div className="fn-crown ace-panel ace-paper-table">
            <i className="fn-swatch" style={{ background: champion.color }} aria-hidden="true" />
            <div className="fn-crown-text">
              <span className="ace-k"><GameIcon name="season.champion" size={14} /> Top garage{champLabel ? ` · ${champLabel}` : ''}</span>
              <span className="fn-crown-name">{champion.name}</span>
              <span className="fn-crown-stats">{table.lines[0].points} pts · {table.lines[0].wins} {table.lines[0].wins === 1 ? 'win' : 'wins'} · {podiums(champion.id)} podiums</span>
            </div>
          </div>
          <div className="fn-crown ace-panel ace-paper-table">
            <RaceNumber n={raceBadges(facts)[dc.driver.driverId] ?? driver(dc.driver.driverId).number} color={teams[dc.teamId].color} ink={teams[dc.teamId].ink} size={56} shape="square" />
            <div className="fn-crown-text">
              <span className="ace-k"><GameIcon name="season.champion" size={14} /> Top driver · {teams[dc.teamId].name}{humanLabel(facts, dc.teamId) ? ` · ${humanLabel(facts, dc.teamId)}` : ''}</span>
              <span className="fn-crown-name"><Avatar icon={portraitFor(pool.seed, dc.driver.driverId)} color={teams[dc.teamId].color} size={26} /> {driver(dc.driver.driverId).fullName}</span>
              <span className="fn-crown-stats">{dc.driver.points} pts · {dc.driver.wins} {dc.driver.wins === 1 ? 'win' : 'wins'} · {dc.driver.podiums} podiums</span>
            </div>
          </div>
        </section>
      )}

      <div className="fn-grid">
        {facts.results.length > 0 && (
          <section className="pk-chart">
            <div className="ace-k">Garage points, race by race</div>
            <SeasonChart standings={standings} teams={teams} mine={humans} />
          </section>
        )}
        <section className="fn-tables">
          <LeagueTables facts={facts} pool={pool} teams={teams} rosters={rosters} lines={table.lines} drivers={drivers} onDriver={setCardOf} />
        </section>
      </div>

      {cardOf !== null && (() => { const data = driverCardOf(facts, cardOf); return data && <DriverCard data={data} onClose={() => setCardOf(null)} />; })()}
      <div className="ace-dock">
        {!table.final
          ? <AceButton onClick={onPaddock}>Back to the Paddock</AceButton>
          : phase === 'league-won'
            ? <AceButton disabled={!picksDone} onClick={() => picksDone && onPromote(picks)}>{picksDone ? `Up to ${where.nextStep}` : 'Pick the Postmarks'}</AceButton>
            : <AceButton onClick={onPlayAgain}>A new season</AceButton>}
      </div>
    </StepTheme>
  );
}
