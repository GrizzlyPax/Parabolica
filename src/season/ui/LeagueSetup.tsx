// League Setup (#317, docs/SEASON_MODE.md §1): one page before a season.
// Every field has a default, so Start is the one tap; the rest is optional.
// One save slot: starting over a season in progress asks first, on the page.
import { useMemo, useState } from 'react';
import { GameIcon, TeamLogo, teamThemeVars } from '../../icons/GameIcon';
import { getTrackById } from '../../generators/tracks';
import { MAX_TEAMS, MIN_TEAMS, generateSeasonPool } from '../genesis';
import { loadSeason, newSeason, saveSeason, seasonState, type SeasonFacts } from '../season';
import { MAX_RACES, MIN_RACES, clampRaces, clampTeams, defaultSetup, humansFor, keepPicks, nextTrack, resolvePicks, tapTeam, type TeamPick, randomSeasonSeed, seasonCalendar, seasonName } from '../setup';
import '../../RunSetup.css';
import './Season.css';

interface Props {
  onBack: () => void;
  /** The season is saved; go to its first screen. */
  onStarted: (facts: SeasonFacts) => void;
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="ss-stepper" role="group" aria-label={label}>
      <button type="button" className="ss-step" onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={`Fewer ${label.toLowerCase()}`}>−</button>
      <span className="ss-step-value" aria-live="polite">{value}</span>
      <button type="button" className="ss-step" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={`More ${label.toLowerCase()}`}>+</button>
    </div>
  );
}

const trackName = (id: string) => getTrackById(id)?.name ?? id;

export default function LeagueSetup({ onBack, onStarted }: Props) {
  const [initial] = useState(() => defaultSetup(randomSeasonSeed()));
  const [seed, setSeed] = useState(initial.seed);
  const [teamCount, setTeamCount] = useState(initial.teamCount);
  // Single-player (#588): one human, one pick. The array shape stays (setup.ts helpers).
  const [picks, setPicks] = useState<TeamPick[]>(() => {
    const pool0 = generateSeasonPool(initial.seed, initial.teamCount);
    return initial.humans.map(h => pool0.teams.find(t => t.id === h.teamId)?.deckTeamId ?? h.teamId);
  });
  const [calendar, setCalendar] = useState(initial.calendar);
  const [confirming, setConfirming] = useState(false);

  const pool = useMemo(() => generateSeasonPool(seed, teamCount), [seed, teamCount]);
  const humans = useMemo(() => humansFor(pool, picks), [pool, picks]);
  const owners = useMemo(() => resolvePicks(pool, picks), [pool, picks]);
  const saved = useMemo(() => {
    const facts = loadSeason();
    return facts && seasonState(facts).phase !== 'finished' ? facts : null;
  }, []);

  const reroll = () => {
    const s = randomSeasonSeed();
    setSeed(s);
    setPicks(p => keepPicks(generateSeasonPool(s, teamCount), p));
    setCalendar(seasonCalendar(s, calendar.length));
  };
  const changeTeams = (n: number) => {
    const t = clampTeams(n);
    setTeamCount(t);
    setPicks(p => keepPicks(generateSeasonPool(seed, t), p));
  };
  const tap = (teamId: string) => setPicks(p => tapTeam(pool, p, 0, teamId));
  const changeRaces = (n: number) => {
    const len = clampRaces(n);
    setCalendar(c => (len <= c.length ? c.slice(0, len) : [...c, ...seasonCalendar(seed, len).slice(c.length)]));
  };
  const cycleRace = (i: number) => setCalendar(c => c.map((id, j) => (j === i ? nextTrack(id) : id)));

  const start = () => {
    if (saved && !confirming) { setConfirming(true); return; }
    const facts = newSeason({ seed, teamCount, humans, calendar });
    saveSeason(facts);
    onStarted(facts);
  };

  const savedState = saved && seasonState(saved);

  return (
    <div className="run-setup season-setup" style={teamThemeVars(pool.teams.find(t => t.id === owners[0]))}>
      <header className="rs-top">
        <div className="rs-title-block">
          <button type="button" className="rs-back" onClick={onBack}>← Menu</button>
          <h1 className="rs-title">New season</h1>
          <span className="rs-sub">Draft two drivers and a car, race the calendar, win the constructors’.</span>
        </div>
        <div className="ss-start-block">
          <button type="button" className="rs-btn rs-btn-primary rs-start" onClick={start}>
            {confirming ? 'Replace and start' : 'Start season'}
          </button>
          {confirming && saved && savedState && (
            <div className="ss-confirm" role="alert">
              <span>
                This replaces <b>{seasonName(saved.setup)}</b>, round {savedState.round + 1} of {saved.setup.calendar.length}. One season is saved at a time.
              </span>
              <button type="button" className="rs-btn rs-btn-ghost" onClick={() => setConfirming(false)}>Keep it</button>
            </div>
          )}
        </div>
      </header>

      <section className="rs-row">
        <div className="rs-row-head"><span className="rs-k">League</span></div>
        <div className="ss-name">{seasonName({ seed })}</div>
        <div className="ss-seed">
          <span className="rs-k">Seed</span>
          <span className="rs-seed-value">{seed}</span>
          <button type="button" className="rs-btn rs-btn-ghost ss-reroll" onClick={reroll}>
            <GameIcon name="ui.restart" size={16} /> Reroll
          </button>
        </div>
        <p className="rs-hint">The seed makes the name, drivers, cars and teams. Same seed, same season.</p>
      </section>

      <section className="rs-row">
        <div className="rs-row-head"><span className="rs-k">Teams</span></div>
        <div className="ss-counts">
          <div className="ss-count"><span className="ss-count-label">Teams</span><Stepper label="Teams" value={teamCount} min={MIN_TEAMS} max={MAX_TEAMS} onChange={changeTeams} /></div>
        </div>
        <p className="rs-hint">You against {teamCount - 1} CPU teams. Tap a team to make it yours.</p>
        <div className="rt-scroll">
          <table className="rt rt-compact ss-teams-table">
            <thead><tr><th className="rt-name">Team</th><th className="ss-seat">Seat</th></tr></thead>
            <tbody>
              {pool.teams.map(t => {
                const owner = owners.indexOf(t.id);
                const mine = owner === 0;
                return (
                  <tr key={t.id} className={mine ? 'mine' : ''}>
                    <th className="rt-name" scope="row">
                      <button
                        type="button"
                        className="rt-pick"
                        onClick={() => tap(t.id)}
                        aria-pressed={mine}
                        aria-label={`${t.name}${mine ? ', you' : ', CPU'}`}
                      >
                        <TeamLogo team={t} size={22} />
                        <span className="rt-nm">{t.name}</span>
                      </button>
                    </th>
                    <td className="ss-seat">
                      {mine
                        ? <span className="ss-badge ss-badge-human" style={teamThemeVars(t)}>You</span>
                        : <span className="ss-badge"><GameIcon name="season.cpu" size={12} /> CPU</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="rs-hint">Naming your own team comes with the team creator.</p>
      </section>

      <section className="rs-row">
        <div className="rs-row-head">
          <span className="rs-k">Calendar</span>
          <button type="button" className="rs-link" onClick={() => setCalendar(seasonCalendar(randomSeasonSeed(), calendar.length))}>Shuffle</button>
        </div>
        <div className="ss-count"><span className="ss-count-label">Races</span><Stepper label="Races" value={calendar.length} min={MIN_RACES} max={MAX_RACES} onChange={changeRaces} /></div>
        <ol className="ss-calendar">
          {calendar.map((id, i) => (
            <li key={i}>
              <button type="button" className="ss-race" onClick={() => cycleRace(i)} aria-label={`Round ${i + 1}: ${trackName(id)}. Tap to change.`}>
                <span className="ss-race-no">R{i + 1}</span>
                <span className="ss-race-name">{trackName(id)}</span>
                <span className="ss-race-chev">›</span>
              </button>
            </li>
          ))}
        </ol>
        <p className="rs-hint">Tap a race to change its track.</p>
      </section>
    </div>
  );
}
