// The league home: the ant farm window. Settles due races on mount and live
// (a countdown ticks down and the race simply *happens*), shows the
// while-you-were-away reel, standings, calendar, and the chronicle of digests.
//
// Layout: full-width masthead (title, on-air strip), then a two-column
// dashboard on desktop — the feed (reel, grid, chronicle) on the left, the
// data rail (standings, calendar) on the right. Single column on mobile,
// re-ordered so standings sit right under the reel.

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { RaceEvent } from '../../RaceEngine';
import { LeagueState, RaceDigest, LiveRace } from '../types';
import { settleLeague, nextRaceAt, isSeasonOver, liveRaceSnapshot, LiveSnapshot } from '../settle';
import { buildSeasonReport } from '../seasonReport';
import { weatherForRace } from '../../data/weather';
import { intrinsicTrackTags } from '../../data/trackTags';
import { saveLeagueState } from '../../storage/persistence';
import { getSeasonStandings, calculatePointsForPosition } from '../../types/season';
import { getTrackById } from '../../generators/tracks';
import { getTeamById } from '../../data/teams';
import { getGodById } from '../gods';
import GridSection from './GridSection';
import PointsChart, { ChartSeries } from './PointsChart';
import { TeamMarble } from './TeamMarble';
import './League.css';

interface LeagueScreenProps {
  league: LeagueState;
  onLeagueUpdate: (league: LeagueState) => void;
  /** Join the broadcast of a race that's on the air right now. */
  onWatchLive: (live: LiveRace) => void;
  onExit: () => void;
  onDissolve: () => void;
}

// 3-letter chart code from a driver name, F1-style (suffix-aware: VER, HAM)
const NAME_SUFFIXES = new Set(['JR', 'JR.', 'SR', 'SR.', 'II', 'III', 'IV', 'V']);
function driverCode(fullName: string): string {
  const parts = fullName.split(' ').filter(p => p.length > 0);
  const filtered = parts.filter(p => !NAME_SUFFIXES.has(p.toUpperCase()));
  const surname = filtered[filtered.length - 1] || parts[parts.length - 1] || '';
  return surname.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, '') || '???';
}

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}:${String(s).padStart(2, '0')}`;
  return `0:${String(s).padStart(2, '0')}`;
}

// One consistent icon per event type, so the left rail of a digest reads as
// "what happened", not a soup of team emojis. Track events and tag
// activations keep their own emoji — there, the emoji IS the event.
const EVENT_ICONS: Partial<Record<RaceEvent['type'], string>> = {
  crash: '💥',
  tire_failure: '💨',
  mechanical_failure: '⚙️',
  race_finish: '🏁',
  lead_change: '👑',
  overtake: '📈',
  slow_pit_stop: '🐌',
  quick_pit_stop: '⚡',
  close_call: '😬',
  dnf: '💀',
};

function eventIcon(ev: RaceEvent): string {
  if (ev.type === 'track_event' || ev.type === 'tag_activation') return ev.emoji;
  return EVENT_ICONS[ev.type] ?? '•';
}

function DigestCard({ league, digest, defaultOpen = false }: {
  league: LeagueState;
  digest: RaceDigest;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const driver = (id: number) => league.roster.find(d => d.id === id);
  const podium = digest.finishOrder.slice(0, 3);
  const winner = driver(podium[0]);

  // Biggest climber: the grid starts in roster order, so gain is start
  // position minus finish position.
  const startPos = new Map(league.roster.map((d, i) => [d.id, i]));
  let climber: { id: number; gained: number } | null = null;
  for (const [finishIdx, id] of digest.finishOrder.entries()) {
    const gained = (startPos.get(id) ?? 0) - finishIdx;
    if (gained > 0 && (climber === null || gained > climber.gained)) climber = { id, gained };
  }
  const fastest = digest.fastestLapDriverId !== null ? driver(digest.fastestLapDriverId) : null;
  const climberDriver = climber !== null ? driver(climber.id) : null;

  return (
    <div className={`digest-card ${open ? 'open' : ''}`}>
      <button className="digest-summary" onClick={() => setOpen(!open)}>
        <span className="digest-race-no">R{digest.index + 1}</span>
        <span className="digest-track">
          {digest.trackEmoji} {digest.trackName}
          {digest.weather && (
            <span className="digest-weather" title={digest.weather.name}> {digest.weather.emoji}</span>
          )}
        </span>
        <span className="digest-winner">
          <TeamMarble color={winner?.color} accentColor={winner?.accentColor}
            emoji={winner?.emoji} size={20} slot={winner?.driverSlot} />
          <span style={{ color: winner?.color }}>{winner?.fullName ?? '—'}</span>
        </span>
        <span className="digest-toggle">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="digest-detail">
          <div className="digest-podium">
            {podium.map((id, i) => {
              const d = driver(id);
              return (
                <span key={id} className="digest-podium-spot">
                  {['🥇', '🥈', '🥉'][i]}
                  <TeamMarble color={d?.color} accentColor={d?.accentColor}
                    emoji={d?.emoji} size={20} slot={d?.driverSlot} />
                  <span style={{ color: d?.color }}>{d?.fullName}</span>
                </span>
              );
            })}
          </div>
          {digest.dnfDriverIds.length > 0 && (
            <div className="digest-dnfs">
              💀 {digest.dnfDriverIds.map(id => (
                <span key={id} style={{ color: driver(id)?.color }}>{driver(id)?.fullName ?? `#${id}`}</span>
              )).reduce<React.ReactNode[]>((acc, el, i) => (i === 0 ? [el] : [...acc, ', ', el]), [])}
            </div>
          )}
          <ul className="digest-highlights">
            {digest.highlights.map((ev, i) => (
              <li key={i}>
                <span className="digest-ev-emoji">{eventIcon(ev)}</span>
                <span className="digest-ev-lap">{ev.lap !== undefined ? `L${ev.lap}` : ''}</span>
                <span className="digest-ev-text">
                  <strong style={{ color: driver(ev.driverId)?.color }}>{ev.driverName}</strong>{' '}
                  {ev.description}
                </span>
              </li>
            ))}
          </ul>
          {(fastest || climberDriver) && (
            <div className="digest-stats">
              {fastest && (
                <span className="digest-stat">
                  ⏱ Fastest lap <strong style={{ color: fastest.color }}>{fastest.fullName}</strong>
                </span>
              )}
              {climberDriver && climber !== null && (
                <span className="digest-stat">
                  📈 Biggest climber <strong style={{ color: climberDriver.color }}>
                    {climberDriver.fullName}</strong> +{climber.gained}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LeagueScreen({ league, onLeagueUpdate, onWatchLive, onExit, onDissolve }: LeagueScreenProps) {
  const [live, setLive] = useState<LiveRace | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [confirmDissolve, setConfirmDissolve] = useState(false);
  const [reportCopied, setReportCopied] = useState(false);
  const [standingsView, setStandingsView] = useState<'drivers' | 'teams'>('drivers');
  // The Grid is browsing material — front and center on a fresh league,
  // tucked away once the season is producing results.
  const [gridOpen, setGridOpen] = useState(league.settledThrough < 0);
  // Settle must not run twice for the same moment (StrictMode double-effects),
  // and the 1s clock must not re-run the live race's sim every tick.
  const settlingRef = useRef(false);
  const liveRef = useRef<LiveRace | null>(null);

  const god = getGodById(league.setup.godId);
  const over = isSeasonOver(league);
  const nextAt = nextRaceAt(league);
  // Cadences shorter than a typical broadcast (~5 min) queue continuously:
  // every scheduled time after the next race is fiction, so don't print them.
  const backToBack = league.setup.raceIntervalMs <= 10 * 60_000;

  const settleNow = useCallback(() => {
    if (settlingRef.current) return;
    settlingRef.current = true;
    try {
      const { league: after, newlySettled, live: onAir } = settleLeague(league, { now: Date.now() });
      liveRef.current = onAir ?? null;
      setLive(onAir ?? null);
      if (newlySettled.length > 0) {
        saveLeagueState(after);
        onLeagueUpdate(after);
      }
    } finally {
      settlingRef.current = false;
    }
  }, [league, onLeagueUpdate]);

  // Settle whatever is due on mount (the check-in), then keep a 1s clock.
  // While a broadcast is on the air we already know its future (endsAt) —
  // wait for it rather than re-simulating every second. Otherwise settle the
  // moment the countdown crosses zero, which puts the next race on the air.
  useEffect(() => {
    settleNow();
    const timer = setInterval(() => {
      setNow(Date.now());
      const onAir = liveRef.current;
      if (onAir && Date.now() < onAir.endsAt) return;
      if (onAir || (nextRaceAt(league) ?? Infinity) <= Date.now()) settleNow();
    }, 1000);
    return () => clearInterval(timer);
  }, [league, settleNow]);

  // The glance at the broadcast: who's leading the live race, refreshed
  // every few seconds (each refresh is one partial headless sim).
  const [snapshot, setSnapshot] = useState<LiveSnapshot | null>(null);
  useEffect(() => {
    if (!live) {
      setSnapshot(null);
      return;
    }
    const update = () => setSnapshot(liveRaceSnapshot(league, live, Date.now()));
    update();
    const timer = setInterval(update, 5000);
    return () => clearInterval(timer);
  }, [league, live]);

  const standings = useMemo(() => getSeasonStandings(league.season), [league.season]);
  const driver = (id: number) => league.roster.find(d => d.id === id);
  const champion = over && standings.length > 0 ? driver(standings[0].driverId) : null;
  // Chronological: the season reads top-to-bottom like a story, R1 first
  const chronicle = league.digests;
  const hasStandings = standings.length > 0 && league.settledThrough >= 0;
  const raceCount = league.settledThrough + 1;

  // Constructor standings: both seats tallied per team.
  const constructorStandings = useMemo(() => {
    const byTeam = new Map<string, {
      kingdomId: string; name: string; emoji: string; color?: string; accentColor?: string;
      points: number; wins: number; podiums: number; dnfs: number;
    }>();
    for (const d of league.roster) {
      const kingdomId = d.kingdomId ?? 'unknown';
      const stats = league.season.driverStats.get(d.id);
      if (!stats) continue;
      const team = getTeamById(kingdomId);
      const entry = byTeam.get(kingdomId) ?? {
        kingdomId,
        name: team?.name ?? d.teamName ?? kingdomId,
        emoji: team?.emoji ?? d.emoji,
        color: d.color,
        accentColor: d.accentColor,
        points: 0, wins: 0, podiums: 0, dnfs: 0,
      };
      entry.points += stats.points;
      entry.wins += stats.wins;
      entry.podiums += stats.podiums;
      entry.dnfs += stats.dnfs;
      byTeam.set(kingdomId, entry);
    }
    return [...byTeam.values()].sort((a, b) =>
      b.points - a.points || b.wins - a.wins || b.podiums - a.podiums);
  }, [league.roster, league.season]);

  // Cumulative points per race: derivable exactly, since scoring is pure
  // position points (raceResults stores each driver's finish per race).
  const { driverSeries, teamSeries } = useMemo(() => {
    const drivers: ChartSeries[] = [];
    const teamTotals = new Map<string, number[]>();
    for (const d of league.roster) {
      const stats = league.season.driverStats.get(d.id);
      if (!stats) continue;
      let running = 0;
      const values = stats.raceResults.slice(0, raceCount).map(pos => {
        running += calculatePointsForPosition(pos);
        return running;
      });
      drivers.push({
        id: d.id,
        color: d.color,
        dashed: d.driverSlot === 2,
        values,
        label: d.fullName,
        code: driverCode(d.fullName),
      });
      const kingdomId = d.kingdomId ?? 'unknown';
      const totals = teamTotals.get(kingdomId) ?? Array(values.length).fill(0);
      values.forEach((v, i) => { totals[i] = (totals[i] ?? 0) + v; });
      teamTotals.set(kingdomId, totals);
    }
    const teams: ChartSeries[] = [...teamTotals.entries()].map(([kingdomId, values]) => {
      const lead = league.roster.find(d => d.kingdomId === kingdomId);
      const team = getTeamById(kingdomId);
      return {
        id: kingdomId,
        color: lead?.color ?? '#888',
        accentColor: lead?.accentColor,
        values,
        label: team?.name ?? kingdomId,
        // Teams are known by their emoji — rendered as a marble so it
        // doesn't vanish against the dark background
        code: team?.emoji ?? lead?.emoji ?? '🏁',
        marble: true,
      };
    });
    return { driverSeries: drivers, teamSeries: teams };
  }, [league.roster, league.season, raceCount]);

  return (
    <div className="league-screen">
      <div className="league-content">
        <div className="league-topbar">
          <button className="league-back-btn" onClick={onExit}>← Menu</button>
          <span className="league-progress">
            {league.settledThrough + 1}/{league.schedule.length} races run
          </span>
        </div>

        <header className="league-header">
          <h1 className="league-title">{league.setup.name}</h1>
          <p className="league-god-line">
            {god.emoji} Under the gaze of <strong>{god.name}</strong>, {god.epithet}
          </p>
        </header>

        {/* On the air / next race countdown / the end of days */}
        {over ? (
          <section className="league-finale">
            <h2>🏁 The season is complete</h2>
            {champion && (
              <p className="league-champion">
                Champion: <TeamMarble color={champion.color} accentColor={champion.accentColor}
                  emoji={champion.emoji} size={24} slot={champion.driverSlot} />{' '}
                <strong style={{ color: champion.color }}>{champion.fullName}</strong>
                {' '}— {standings[0].points} pts, {standings[0].wins} wins
              </p>
            )}
            <button
              className="league-report-btn"
              onClick={async () => {
                const report = buildSeasonReport(league);
                try {
                  await navigator.clipboard.writeText(report);
                } catch {
                  // Older mobile browsers: textarea fallback (same as SimLab)
                  const textarea = document.createElement('textarea');
                  textarea.value = report;
                  document.body.appendChild(textarea);
                  textarea.select();
                  document.execCommand('copy');
                  document.body.removeChild(textarea);
                }
                setReportCopied(true);
                setTimeout(() => setReportCopied(false), 2000);
              }}
            >
              {reportCopied ? '✅ Copied' : '📋 Copy season report'}
            </button>
          </section>
        ) : live && now < live.endsAt ? (
          <section className="league-live-card">
            <div className="league-live-info">
              <span className="live-badge"><span className="live-dot" /> LIVE</span>
              <span className="league-live-title">
                {(() => {
                  const track = getTrackById(live.trackId);
                  const weather = weatherForRace(league.leagueSeed, live.index);
                  const wx = weather.id !== 'clear' ? ` ${weather.emoji}` : '';
                  return `R${live.index + 1} — ${track?.funEmoji ?? ''} ${track?.name ?? ''}${wx}`;
                })()}
              </span>
              {snapshot && (() => {
                const leader = driver(snapshot.runningOrder[0]);
                return (
                  <span className="league-live-order">
                    <span className="live-order-lap">L{snapshot.lap}/{snapshot.totalLaps}</span>
                    <span className="live-order-marbles">
                      {snapshot.runningOrder.slice(0, 5).map(id => {
                        const d = driver(id);
                        return (
                          <TeamMarble key={id} color={d?.color} accentColor={d?.accentColor}
                            emoji={d?.emoji} size={18} slot={d?.driverSlot} />
                        );
                      })}
                    </span>
                    <span className="live-order-leader" style={{ color: leader?.color }}>
                      {leader?.fullName} leads
                    </span>
                  </span>
                );
              })()}
            </div>
            <button className="watch-live-btn" onClick={() => onWatchLive(live)}>
              📺 Watch
            </button>
          </section>
        ) : nextAt !== null && (
          <section className="league-next-race">
            <span className="next-race-label">
              Next: {(() => {
                const next = league.schedule[league.settledThrough + 1];
                const track = next ? getTrackById(next.trackId) : null;
                return track ? `${track.funEmoji} ${track.name}` : '…';
              })()}
            </span>
            <span className="next-race-countdown">
              {nextAt <= now ? 'on the air…' : formatCountdown(nextAt - now)}
            </span>
          </section>
        )}

        {/* Desktop: feed on the left, data rail on the right.
            Mobile: wrappers dissolve (display: contents) and sections re-order. */}
        <div className="league-columns">
          <div className="league-main">
            {/* The Points Race: cumulative points, the season's shape at a glance */}
            {hasStandings && (
              <section className="league-section league-chart-section">
                <div className="league-subhead">
                  <h2 className="league-section-title">The Points Race</h2>
                  <div className="league-view-toggle">
                    <button
                      className={standingsView === 'drivers' ? 'active' : ''}
                      onClick={() => setStandingsView('drivers')}
                    >Drivers</button>
                    <button
                      className={standingsView === 'teams' ? 'active' : ''}
                      onClick={() => setStandingsView('teams')}
                    >Teams</button>
                  </div>
                </div>
                <PointsChart
                  series={standingsView === 'drivers' ? driverSeries : teamSeries}
                  raceCount={raceCount}
                />
              </section>
            )}

            {/* The Grid: teams, cars, and drivers — tap a driver for the lore */}
            <section className="league-section grid-section">
              <button className="league-section-title section-toggle" onClick={() => setGridOpen(!gridOpen)}>
                The Grid
                <span className="section-toggle-hint">
                  {gridOpen ? '▾' : `${league.roster.length} drivers ▸`}
                </span>
              </button>
              {gridOpen && <GridSection roster={league.roster} />}
            </section>

            {/* Chronicle: every settled race, newest first */}
            {chronicle.length > 0 && (
              <section className="league-section chronicle-section">
                <h2 className="league-section-title">Chronicle</h2>
                {chronicle.map(d => (
                  <DigestCard key={d.index} league={league} digest={d} />
                ))}
              </section>
            )}
          </div>

          <aside className="league-rail">
            {/* Standings: drivers ↔ constructors, with the points race below */}
            {hasStandings && (
              <section className="league-section league-standings-section">
                <div className="league-subhead">
                  <h2 className="league-section-title">Standings</h2>
                  <div className="league-view-toggle">
                    <button
                      className={standingsView === 'drivers' ? 'active' : ''}
                      onClick={() => setStandingsView('drivers')}
                    >Drivers</button>
                    <button
                      className={standingsView === 'teams' ? 'active' : ''}
                      onClick={() => setStandingsView('teams')}
                    >Teams</button>
                  </div>
                </div>

                {standingsView === 'drivers' ? (
                  <table className="league-standings">
                    <thead>
                      <tr><th>P</th><th></th><th>Driver</th><th>Pts</th><th>W</th><th>Pod</th><th>DNF</th></tr>
                    </thead>
                    <tbody>
                      {standings.map((s, i) => {
                        const d = driver(s.driverId);
                        return (
                          <tr key={s.driverId}>
                            <td className="standings-pos">{i + 1}</td>
                            <td className="standings-marble">
                              <TeamMarble color={d?.color} accentColor={d?.accentColor}
                                emoji={d?.emoji} slot={d?.driverSlot} />
                            </td>
                            <td className="standings-name" style={{ color: d?.color }}>{d?.fullName}</td>
                            <td className="standings-pts">{s.points}</td>
                            <td className="standings-num">{s.wins}</td>
                            <td className="standings-num">{s.podiums}</td>
                            <td className="standings-num">{s.dnfs}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <table className="league-standings">
                    <thead>
                      <tr><th>P</th><th></th><th>Team</th><th>Pts</th><th>W</th><th>Pod</th><th>DNF</th></tr>
                    </thead>
                    <tbody>
                      {constructorStandings.map((t, i) => (
                        <tr key={t.kingdomId}>
                          <td className="standings-pos">{i + 1}</td>
                          <td className="standings-marble">
                            <TeamMarble color={t.color} accentColor={t.accentColor} emoji={t.emoji} />
                          </td>
                          <td className="standings-name" style={{ color: t.color }}>{t.name}</td>
                          <td className="standings-pts">{t.points}</td>
                          <td className="standings-num">{t.wins}</td>
                          <td className="standings-num">{t.podiums}</td>
                          <td className="standings-num">{t.dnfs}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            )}

            {/* Calendar. Scheduled times are founding-time nominals; when races
                queue back-to-back the real airtime depends on how long each
                broadcast runs (safety cars, chaos), so printing exact clock
                times would drift into lies. Only the next race's time is
                queue-aware and trustworthy — everything later just says what
                it follows. */}
            <section className="league-section calendar-section">
              <h2 className="league-section-title">Calendar</h2>
              <ul className="league-calendar">
                {league.schedule.map(race => {
                  const track = getTrackById(race.trackId);
                  const settled = race.index <= league.settledThrough;
                  let when: React.ReactNode;
                  if (settled) {
                    when = '✅';
                  } else if (live && race.index === live.index && now < live.endsAt) {
                    when = <span className="cal-on-air">🔴 on the air</span>;
                  } else if (race.index === league.settledThrough + 1) {
                    // Queue-aware and exact: anchored to the last broadcast's end
                    const at = nextRaceAt(league)!;
                    when = at <= now
                      ? 'up next'
                      : new Date(at).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' });
                  } else if (backToBack) {
                    when = `follows R${race.index}`;
                  } else {
                    when = new Date(race.scheduledAt).toLocaleString([], {
                      weekday: 'short', hour: 'numeric', minute: '2-digit',
                    });
                  }
                  // Conditions are part of the fixed universe: the forecast is
                  // real (deterministic), and the track's character is intrinsic.
                  const forecast = weatherForRace(league.leagueSeed, race.index);
                  const tags = intrinsicTrackTags(race.trackId);
                  return (
                    <li key={race.index} className={settled ? 'settled' : 'scheduled'}>
                      <span className="cal-race-no">R{race.index + 1}</span>
                      <span className="cal-track">
                        {track?.funEmoji} {track?.name ?? race.trackId}
                        <span className="cal-conditions">
                          {tags.map(t => (
                            <span key={t.id} className="cal-condition" title={t.name}>{t.emoji}</span>
                          ))}
                          {forecast.id !== 'clear' && (
                            <span className="cal-condition" title={`Forecast: ${forecast.name}`}>{forecast.emoji}</span>
                          )}
                        </span>
                      </span>
                      <span className="cal-when">{when}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          </aside>
        </div>

        <div className="league-danger-zone">
          {confirmDissolve ? (
            <div className="dissolve-confirm">
              <span>Feed the league to a shifting universe? This cannot be undone.</span>
              <button className="dissolve-btn confirm" onClick={onDissolve}>Dissolve it</button>
              <button className="dissolve-btn cancel" onClick={() => setConfirmDissolve(false)}>Spare it</button>
            </div>
          ) : (
            <button className="dissolve-btn" onClick={() => setConfirmDissolve(true)}>
              {over ? '⚜️ Dissolve the league and found anew' : 'Dissolve the league'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default LeagueScreen;
