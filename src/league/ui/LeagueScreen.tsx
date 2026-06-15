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
import PointsChart, { ChartSeries } from './PointsChart';
import { LapChart } from '../../components/race';
import { traceRace, raceReportForLeague } from '../raceTrace';
import { TeamMarble } from './TeamMarble';
import './League.css';

interface LeagueScreenProps {
  league: LeagueState;
  onLeagueUpdate: (league: LeagueState) => void;
  /** Join the broadcast of a race that's on the air right now. */
  onWatchLive: (live: LiveRace) => void;
  onExit: () => void;
  /** Open the Grid screen — the roster / driver-detail hub. */
  onOpenGrid: () => void;
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

function DigestCard({ league, digest, open, onToggle }: {
  league: LeagueState;
  digest: RaceDigest;
  open: boolean;
  onToggle: () => void;
}) {
  const [showTrace, setShowTrace] = useState(false);
  const [reportCopied, setReportCopied] = useState(false);
  // The replay costs one headless sim — run it only when asked, then cache.
  const trace = useMemo(
    () => (showTrace ? traceRace(league, digest.index) : null),
    [showTrace, league, digest.index]
  );
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
      <button className="digest-summary" onClick={onToggle}>
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
          {/* Race replay (#173): the lap chart + strategy table, reconstructed
              deterministically from the race seed. One headless sim, on demand. */}
          <div className="digest-trace-actions">
            {!showTrace && (
              <button className="digest-trace-btn" onClick={() => setShowTrace(true)}>
                📈 Show lap chart & strategy
              </button>
            )}
            <button
              className="digest-trace-btn"
              onClick={async () => {
                const md = raceReportForLeague(league, digest.index);
                if (!md) return;
                try {
                  await navigator.clipboard.writeText(md);
                } catch {
                  const ta = document.createElement('textarea');
                  ta.value = md;
                  document.body.appendChild(ta);
                  ta.select();
                  document.execCommand('copy');
                  document.body.removeChild(ta);
                }
                setReportCopied(true);
                setTimeout(() => setReportCopied(false), 2000);
              }}
            >
              {reportCopied ? '✅ Copied' : '📋 Copy race report'}
            </button>
          </div>
          {showTrace && trace && (
            <div className="digest-trace">
              <LapChart
                series={trace.series}
                laps={trace.laps}
                totalLaps={trace.totalLaps}
                fieldSize={trace.fieldSize}
                scSampleIdx={trace.scSampleIdx}
              />
              <table className="digest-strategy">
                <thead>
                  <tr><th>P</th><th></th><th>Driver</th><th>Stints</th><th>Pit laps</th></tr>
                </thead>
                <tbody>
                  {trace.strategies.map(s => (
                    <tr key={s.driverId} className={s.finalPosition === null ? 'dnf' : ''}>
                      <td className="strategy-pos">{s.finalPosition ?? 'DNF'}</td>
                      <td><TeamMarble color={s.color} accentColor={s.accentColor} emoji={s.emoji} size={16} /></td>
                      <td className="strategy-name" style={{ color: s.color }}>{s.name}</td>
                      <td className="strategy-stints">
                        {s.stints.map((c, i) => (
                          <span key={i} className={`tire-pip tire-pip-${c}`}>{c[0].toUpperCase()}</span>
                        ))}
                      </td>
                      <td className="strategy-pits">
                        {s.pitLaps.length ? s.pitLaps.map(l => `L${l}`).join(' ') : '—'}
                        {s.dnfLap !== null && <span className="strategy-dnf"> ✗ L{s.dnfLap}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LeagueScreen({ league, onLeagueUpdate, onWatchLive, onExit, onOpenGrid, onDissolve }: LeagueScreenProps) {
  const [live, setLive] = useState<LiveRace | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [confirmDissolve, setConfirmDissolve] = useState(false);
  const [reportCopied, setReportCopied] = useState(false);
  const [standingsView, setStandingsView] = useState<'drivers' | 'teams'>('drivers');
  // Which settled races are expanded in the Results timeline. The season ribbon
  // taps into this — clicking a race cell opens that digest and scrolls to it.
  const [openRaces, setOpenRaces] = useState<Set<number>>(new Set());
  const toggleRace = (i: number) => setOpenRaces(prev => {
    const next = new Set(prev);
    next.has(i) ? next.delete(i) : next.add(i);
    return next;
  });
  const openRace = (i: number) => {
    setOpenRaces(prev => new Set(prev).add(i));
    requestAnimationFrame(() =>
      document.getElementById(`digest-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    );
  };
  // Settle must not run twice for the same moment (StrictMode double-effects),
  // and the 1s clock must not re-run the live race's sim every tick.
  const settlingRef = useRef(false);
  const liveRef = useRef<LiveRace | null>(null);

  const god = getGodById(league.setup.godId);
  const over = isSeasonOver(league);
  const nextAt = nextRaceAt(league);

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
  // The season as one timeline (#176): remaining races soonest-first (the next
  // one is the "now" anchor), settled races newest-first as the rich digests.
  const results = [...league.digests].sort((a, b) => b.index - a.index);
  // Winner per settled race, for the season ribbon's marbles.
  const winnerByRace = new Map(league.digests.map(d => [d.index, d.finishOrder[0]]));
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

  // Position mode (#172): the same season as championship POSITION after each
  // race — the lap chart applied to the season (x = races, rows = standings).
  const [chartMode, setChartMode] = useState<'points' | 'position'>('points');

  // The chart should always stand exactly as tall as the standings tower
  // beside it (desktop two-column layout). Rendered SVG height is width-
  // dependent, so measure the tower + the chart box and convert the target
  // height into viewBox units (height/width ratio). Mobile (single column)
  // falls back to the charts' natural heights.
  const standingsSecRef = useRef<HTMLElement | null>(null);
  const chartSubheadRef = useRef<HTMLDivElement | null>(null);
  const chartBoxRef = useRef<HTMLDivElement | null>(null);
  const [chartRatio, setChartRatio] = useState<number | null>(null);
  useEffect(() => {
    const measure = () => {
      const rail = standingsSecRef.current;
      const subhead = chartSubheadRef.current;
      const box = chartBoxRef.current;
      const twoCol = window.matchMedia('(min-width: 921px)').matches;
      if (!twoCol || !rail || !subhead || !box) { setChartRatio(null); return; }
      const bs = getComputedStyle(box);
      const padV = parseFloat(bs.paddingTop) + parseFloat(bs.paddingBottom)
        + parseFloat(bs.borderTopWidth) + parseFloat(bs.borderBottomWidth);
      const padH = parseFloat(bs.paddingLeft) + parseFloat(bs.paddingRight);
      const chrome = subhead.offsetHeight + parseFloat(getComputedStyle(subhead).marginBottom || '0');
      const svgW = box.clientWidth - padH;
      const target = rail.offsetHeight - chrome - padV;
      if (svgW > 50 && target > 160) {
        setChartRatio(Math.min(1.6, Math.max(0.25, target / svgW)));
      } else {
        setChartRatio(null);
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (standingsSecRef.current) ro.observe(standingsSecRef.current);
    if (chartBoxRef.current) ro.observe(chartBoxRef.current);
    const mq = window.matchMedia('(min-width: 921px)');
    mq.addEventListener('change', measure);
    return () => { ro.disconnect(); mq.removeEventListener('change', measure); };
  }, [hasStandings, standingsView, chartMode]);
  const positionChart = useMemo(() => {
    const src = standingsView === 'drivers' ? driverSeries : teamSeries;
    const rosterById = new Map(league.roster.map(d => [d.id, d]));
    // Rank everyone by cumulative points after each race (stable on ties).
    const positions: (number | null)[][] = src.map(() => Array(raceCount).fill(null));
    for (let r = 0; r < raceCount; r++) {
      src
        .map((s, idx) => ({ idx, pts: s.values[r] ?? 0 }))
        .sort((a, b) => b.pts - a.pts)
        .forEach((o, rank) => { positions[o.idx][r] = rank + 1; });
    }
    const series = src.map((s, idx) => {
      const rd = typeof s.id === 'number' ? rosterById.get(s.id) : undefined;
      return {
        id: idx,
        name: s.label ?? String(s.id),
        color: s.color,
        accentColor: s.accentColor ?? rd?.accentColor,
        dashed: s.dashed,
        code: s.code ?? '',
        emoji: rd?.emoji ?? (s.marble ? s.code : undefined),
        positions: positions[idx],
        // Points-chart conventions: teams are known by their marble, drivers
        // by their 3-letter code.
        marble: s.marble ?? false,
      };
    });
    return { series, laps: Array.from({ length: raceCount }, (_, i) => i + 1) };
  }, [driverSeries, teamSeries, standingsView, league.roster, raceCount]);

  return (
    <div className="league-screen">
      <div className="league-content">
        <div className="league-topbar">
          <button className="league-back-btn" onClick={onExit}>← Menu</button>
          <button className="league-grid-tab" onClick={onOpenGrid}>👥 The Grid →</button>
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
        ) : null}

        {/* The season ribbon (#176 follow-up): the whole calendar as one
            horizontal strip. Settled races show the winner's marble; the
            current race is the lit "now" cell; upcoming show track + forecast.
            Tap a settled cell to open its result below. */}
        {league.schedule.length > 0 && (
          <div className="season-ribbon" role="list">
            {league.schedule.map(race => {
              const track = getTrackById(race.trackId);
              const settled = race.index <= league.settledThrough;
              const isLiveRace = !!live && race.index === live.index && now < live.endsAt;
              const isNext = !settled && !isLiveRace && race.index === league.settledThrough + 1;
              const winner = settled ? driver(winnerByRace.get(race.index) ?? -1) : null;
              const forecast = weatherForRace(league.leagueSeed, race.index);
              const tags = intrinsicTrackTags(race.trackId);
              const cls = `ribbon-cell ${settled ? 'settled' : ''} ${isLiveRace ? 'live' : ''} ${isNext ? 'next' : ''}`;
              return (
                <button
                  key={race.index}
                  className={cls}
                  style={winner ? { '--win-color': winner.color } as React.CSSProperties : undefined}
                  onClick={() => settled ? openRace(race.index) : undefined}
                  disabled={!settled}
                  title={track?.name ?? race.trackId}
                  role="listitem"
                >
                  <span className="ribbon-rno">R{race.index + 1}</span>
                  <span className="ribbon-track">{track?.funEmoji ?? '🏁'}</span>
                  <span className="ribbon-foot">
                    {settled ? (
                      <TeamMarble color={winner?.color} accentColor={winner?.accentColor}
                        emoji={winner?.emoji} size={18} slot={winner?.driverSlot} />
                    ) : isLiveRace ? (
                      <span className="ribbon-live">🔴</span>
                    ) : isNext ? (
                      <span className="ribbon-next-when">{nextAt !== null && nextAt > now ? formatCountdown(nextAt - now) : 'next'}</span>
                    ) : (
                      <span className="ribbon-conditions">
                        {tags.slice(0, 1).map(t => <span key={t.id} title={t.name}>{t.emoji}</span>)}
                        {forecast.id !== 'clear' && <span title={forecast.name}>{forecast.emoji}</span>}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Desktop: feed on the left, data rail on the right.
            Mobile: wrappers dissolve (display: contents) and sections re-order. */}
        <div className="league-columns">
          <div className="league-main">
            {/* The Points Race: cumulative points, the season's shape at a glance */}
            {hasStandings && (
              <section className="league-section league-chart-section">
                <div className="league-subhead" ref={chartSubheadRef}>
                  <h2 className="league-section-title">
                    {chartMode === 'points' ? 'The Points Race' : 'The Standings Race'}
                  </h2>
                  {/* Drivers/Teams is ONE league-wide switch — it lives on the
                      Standings rail; the chart follows it. */}
                  <div className="league-view-toggle">
                    <button
                      className={chartMode === 'points' ? 'active' : ''}
                      onClick={() => setChartMode('points')}
                    >Points</button>
                    <button
                      className={chartMode === 'position' ? 'active' : ''}
                      onClick={() => setChartMode('position')}
                    >Position</button>
                  </div>
                </div>
                <div className="league-chartbox" ref={chartBoxRef}>
                  {chartMode === 'points' ? (
                    <PointsChart
                      series={standingsView === 'drivers' ? driverSeries : teamSeries}
                      raceCount={raceCount}
                      viewH={chartRatio ? Math.round(720 * chartRatio) : undefined}
                    />
                  ) : (
                    <LapChart
                      series={positionChart.series}
                      laps={positionChart.laps}
                      totalLaps={raceCount}
                      fieldSize={positionChart.series.length}
                      legendMode="compact"
                      viewH={chartRatio ? Math.round(880 * chartRatio) : undefined}
                    />
                  )}
                </div>
              </section>
            )}

            {/* Results: every settled race, newest first — the rich digests.
                The season ribbon up top owns the schedule + the "now" anchor;
                this is the deep-dive (tap a ribbon cell to open one here). */}
            {results.length > 0 && (
              <section className="league-section timeline-section">
                <h2 className="league-section-title">Results</h2>
                <div className="timeline-results">
                  {results.map(d => (
                    <div id={`digest-${d.index}`} key={d.index}>
                      <DigestCard
                        league={league}
                        digest={d}
                        open={openRaces.has(d.index)}
                        onToggle={() => toggleRace(d.index)}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="league-rail">
            {/* Standings: drivers ↔ constructors, with the points race below */}
            {hasStandings && (
              <section className="league-section league-standings-section" ref={standingsSecRef}>
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
