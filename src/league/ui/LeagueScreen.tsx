// The league home: the ant farm window. Settles due races on mount and live
// (a countdown ticks down and the race simply *happens*), shows the
// while-you-were-away reel, standings, calendar, and the chronicle of digests.

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { LeagueState, RaceDigest } from '../types';
import { settleLeague, nextRaceAt, isSeasonOver } from '../settle';
import { saveLeagueState } from '../../storage/persistence';
import { getSeasonStandings } from '../../types/season';
import { getTrackById } from '../../generators/tracks';
import { getGodById } from '../gods';
import './League.css';

interface LeagueScreenProps {
  league: LeagueState;
  onLeagueUpdate: (league: LeagueState) => void;
  onExit: () => void;
  onDissolve: () => void;
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

function DigestCard({ league, digest, defaultOpen = false }: {
  league: LeagueState;
  digest: RaceDigest;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const driver = (id: number) => league.roster.find(d => d.id === id);
  const podium = digest.finishOrder.slice(0, 3);

  return (
    <div className={`digest-card ${open ? 'open' : ''}`}>
      <button className="digest-summary" onClick={() => setOpen(!open)}>
        <span className="digest-race-no">R{digest.index + 1}</span>
        <span className="digest-track">{digest.trackEmoji} {digest.trackName}</span>
        <span className="digest-winner" style={{ color: driver(podium[0])?.color }}>
          🏆 {driver(podium[0])?.fullName ?? '—'}
        </span>
        <span className="digest-toggle">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="digest-detail">
          <div className="digest-podium">
            {podium.map((id, i) => (
              <span key={id} className="digest-podium-spot">
                {['🥇', '🥈', '🥉'][i]}{' '}
                <span style={{ color: driver(id)?.color }}>{driver(id)?.fullName}</span>
              </span>
            ))}
          </div>
          {digest.dnfDriverIds.length > 0 && (
            <div className="digest-dnfs">
              💀 {digest.dnfDriverIds.map(id => driver(id)?.fullName ?? `#${id}`).join(', ')}
            </div>
          )}
          <ul className="digest-highlights">
            {digest.highlights.map((ev, i) => (
              <li key={i}>
                <span className="digest-ev-emoji">{ev.emoji}</span>{' '}
                <strong style={{ color: driver(ev.driverId)?.color }}>{ev.driverName}</strong>{' '}
                {ev.description}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function LeagueScreen({ league, onLeagueUpdate, onExit, onDissolve }: LeagueScreenProps) {
  // The while-you-were-away reel: digests settled since this screen opened.
  const [reel, setReel] = useState<RaceDigest[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [confirmDissolve, setConfirmDissolve] = useState(false);
  // Settle must not run twice for the same moment (StrictMode double-effects).
  const settlingRef = useRef(false);

  const god = getGodById(league.setup.godId);
  const over = isSeasonOver(league);
  const nextAt = nextRaceAt(league);

  const settleNow = useCallback(() => {
    if (settlingRef.current) return;
    settlingRef.current = true;
    try {
      const { league: after, newlySettled } = settleLeague(league, { now: Date.now() });
      if (newlySettled.length > 0) {
        saveLeagueState(after);
        // Dedupe by race index: StrictMode double-mounts this effect with the
        // same league prop, and the second settle re-derives the same digests.
        setReel(prev => [
          ...prev,
          ...newlySettled.filter(d => !prev.some(p => p.index === d.index)),
        ]);
        onLeagueUpdate(after);
      }
    } finally {
      settlingRef.current = false;
    }
  }, [league, onLeagueUpdate]);

  // Settle whatever is due on mount (the check-in), then keep a 1s clock:
  // when the countdown crosses zero the next race settles live.
  useEffect(() => {
    settleNow();
    const timer = setInterval(() => {
      setNow(Date.now());
      const next = nextRaceAt(league);
      if (next !== null && next <= Date.now()) settleNow();
    }, 1000);
    return () => clearInterval(timer);
  }, [league, settleNow]);

  const standings = useMemo(() => getSeasonStandings(league.season), [league.season]);
  const driver = (id: number) => league.roster.find(d => d.id === id);
  const champion = over && standings.length > 0 ? driver(standings[0].driverId) : null;
  const chronicle = useMemo(() => [...league.digests].reverse(), [league.digests]);

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

        {/* Next race countdown — or the end of days */}
        {over ? (
          <section className="league-finale">
            <h2>🏁 The season is complete</h2>
            {champion && (
              <p className="league-champion">
                Champion: <strong style={{ color: champion.color }}>
                  {champion.emoji} {champion.fullName}
                </strong> — {standings[0].points} pts, {standings[0].wins} wins
              </p>
            )}
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
              {nextAt <= now ? 'racing…' : formatCountdown(nextAt - now)}
            </span>
          </section>
        )}

        {/* While you were away */}
        {reel.length > 0 && (
          <section className="league-section reel-section">
            <h2 className="league-section-title">
              ⏱ While you were away — {reel.length} race{reel.length > 1 ? 's' : ''} ran
            </h2>
            {[...reel].reverse().map(d => (
              <DigestCard key={d.index} league={league} digest={d} defaultOpen={reel.length === 1} />
            ))}
          </section>
        )}

        {/* Standings */}
        {standings.length > 0 && league.settledThrough >= 0 && (
          <section className="league-section">
            <h2 className="league-section-title">Standings</h2>
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
                      <td className="standings-marble"><span style={{ background: d?.color }}>{d?.emoji}</span></td>
                      <td className="standings-name" style={{ color: d?.color }}>{d?.fullName}</td>
                      <td className="standings-pts">{s.points}</td>
                      <td>{s.wins}</td>
                      <td>{s.podiums}</td>
                      <td>{s.dnfs}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )}

        {/* Calendar */}
        <section className="league-section">
          <h2 className="league-section-title">Calendar</h2>
          <ul className="league-calendar">
            {league.schedule.map(race => {
              const track = getTrackById(race.trackId);
              const settled = race.index <= league.settledThrough;
              return (
                <li key={race.index} className={settled ? 'settled' : 'scheduled'}>
                  <span className="cal-race-no">R{race.index + 1}</span>
                  <span className="cal-track">{track?.funEmoji} {track?.name ?? race.trackId}</span>
                  <span className="cal-when">
                    {settled ? '✅' : new Date(race.scheduledAt).toLocaleString([], {
                      weekday: 'short', hour: 'numeric', minute: '2-digit',
                    })}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Chronicle: every settled race, newest first */}
        {chronicle.length > 0 && (
          <section className="league-section">
            <h2 className="league-section-title">Chronicle</h2>
            {chronicle.map(d => (
              <DigestCard key={d.index} league={league} digest={d} />
            ))}
          </section>
        )}

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
