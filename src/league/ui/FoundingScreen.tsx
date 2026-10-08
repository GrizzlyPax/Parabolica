// The Founding: where the Commissionary names a league, fixes the calendar,
// and drafts the fantasy teams. Everything chosen here is sealed into the
// league seed. (Gods are parked: the data stays in gods.ts for a later
// mechanic; a league is founded under the first one, silently.)

import { useMemo, useState } from 'react';
import { GODS } from '../gods';
import { generateGenesisRoster } from '../league';
import { randomSeed } from '../../engine/rng';
import { DraftPanel, emptyFantasy } from '../../fantasy/DraftPanel';
import { draftComplete, type FantasyConfig } from '../../fantasy/types';
import { CURRENT_TEAMS, HISTORIC_TEAMS, makeCustomTeam, Team } from '../../data/teams';
import { generateTeamIdentities } from '../../generators/teamIdentity';
import { ruleCardsForScope, RULE_CARDS_BY_ID } from '../../data/ruleCards';
import { resolveRuleset, describeRuleset, describeChance, describeOdds, Ruleset } from '../../rules/ruleset';
import './League.css';
import '../../RunSetup.css';
import { GameIcon } from '../../icons/GameIcon';

export interface FoundingChoices {
  name: string;
  godId: string;
  /** The universe seed — chosen here so the fantasy draft can see the grid it's drafting from. */
  leagueSeed: number;
  /** Fantasy teams, when a complete draft was made. */
  fantasy?: FantasyConfig;
  raceCount: number;
  raceIntervalMs: number;
  /** Registry teams (preset + historic) selected for the grid. */
  teamIds: string[];
  /** Player-created teams for the grid. */
  customTeams: Team[];
  /** Season cards → the rules this league plays under (#241). */
  ruleset: Ruleset;
}

const MIN_TEAMS = 2;
const MAX_TEAMS = 12;

interface FoundingScreenProps {
  onFound: (choices: FoundingChoices) => void;
  onBack: () => void;
}

const MINUTE = 60_000;
const HOUR = 3_600_000;

const CADENCES = [
  { label: 'Frantic', icon: 'stat.speed', detail: 'back-to-back broadcasts, non-stop', ms: 2 * MINUTE },
  { label: 'Brisk', icon: 'race.fastest_lap', detail: 'a race every 30 minutes', ms: 30 * MINUTE },
  { label: 'Classic', icon: 'race.halfway', detail: 'a race every 3 hours', ms: 3 * HOUR },
];

const SEASON_LENGTHS = [8, 12, 16];
const MIN_RACES = 1;
const MAX_RACES = 24;

function FoundingScreen({ onFound, onBack }: FoundingScreenProps) {
  const [name, setName] = useState('');
  const godId = GODS[0].id;
  const [raceCount, setRaceCount] = useState(12);
  // Free-form season length (e.g. a 2-race test run); '' = using a preset
  const [customCount, setCustomCount] = useState('');
  const [cadenceIdx, setCadenceIdx] = useState(1);

  // Grid composition: which registry teams are in, plus any custom teams.
  // Default = the preset 11.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(CURRENT_TEAMS.map(t => t.id))
  );
  const [customTeams, setCustomTeams] = useState<Team[]>([]);
  // The in-progress custom team (null = form closed).
  const [draft, setDraft] = useState<{ name: string; emoji: string; color: string; accent: string } | null>(null);

  const teamCount = selectedIds.size + customTeams.length;
  const teamsOk = teamCount >= MIN_TEAMS && teamCount <= MAX_TEAMS;

  const toggleTeam = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (teamCount < MAX_TEAMS) next.add(id);
      return next;
    });
  };

  const openDraft = () => {
    const [id] = generateTeamIdentities(Math.random, 1);
    setDraft({ name: '', emoji: id.emoji, color: id.color, accent: id.accentColor });
  };
  const rollDraftLook = () => {
    const [id] = generateTeamIdentities(Math.random, 1);
    setDraft(d => d && { ...d, emoji: id.emoji, color: id.color, accent: id.accentColor });
  };
  const addCustomTeam = () => {
    if (!draft || teamCount >= MAX_TEAMS) return;
    const suffix = Math.random().toString(36).slice(2, 6);
    setCustomTeams(prev => [...prev, makeCustomTeam(draft.name, draft.emoji, draft.color, draft.accent, suffix)]);
    setDraft(null);
  };

  const [hand, setHand] = useState<string[]>([]);
  const [showRules, setShowRules] = useState(false);
  const ruleset = resolveRuleset(hand, RULE_CARDS_BY_ID);
  const rulesLines = describeRuleset(ruleset);
  const toggleCard = (id: string) => setHand(h => (h.includes(id) ? h.filter(x => x !== id) : [...h, id]));

  // The universe is fixed here so the draft can see the actual grid. Re-roll
  // gives a new one (and clears any picks, since the people change).
  const [leagueSeed, setLeagueSeed] = useState<number>(() => randomSeed());
  const [fantasy, setFantasy] = useState<FantasyConfig | null>(null);
  const roster = useMemo(() => teamsOk ? generateGenesisRoster(leagueSeed, [...selectedIds], customTeams, ruleset) : [], [leagueSeed, selectedIds, customTeams, ruleset, teamsOk]);
  const rosterKey = roster.map(d => d.id).join(',');
  const [draftedFor, setDraftedFor] = useState(rosterKey);
  if (fantasy && draftedFor !== rosterKey && fantasy.teams.some(t => t.driverIds.length)) {
    // The grid changed under the draft: keep the teams, drop the picks.
    setFantasy({ ...fantasy, teams: fantasy.teams.map(t => ({ ...t, driverIds: [] })) });
    setDraftedFor(rosterKey);
  } else if (draftedFor !== rosterKey) {
    setDraftedFor(rosterKey);
  }
  const fantasyOk = !fantasy || fantasy.teams.every(t => t.driverIds.length === 0) || draftComplete(fantasy);
  const canFound = teamsOk && fantasyOk;

  const handleFound = () => {
    if (!canFound) return;
    onFound({
      ruleset,
      leagueSeed,
      fantasy: fantasy && draftComplete(fantasy) ? fantasy : undefined,
      // Blank → App fills a procedural name seeded from the league (#185).
      name: name.trim(),
      godId,
      raceCount,
      raceIntervalMs: CADENCES[cadenceIdx].ms,
      teamIds: [...selectedIds],
      customTeams,
    });
  };

  return (
    <div className="league-screen founding-screen">
      <div className="league-content">
        <button className="league-back-btn" onClick={onBack}>← Menu</button>

        <header className="founding-header">
          <h1>Found a League</h1>
          <p className="founding-subtitle">
            One seed births the drivers, the cars, and the calendar. The races
            run on the clock — whether you are watching or not.
          </p>
        </header>

        <section className="founding-section">
          <h2 className="founding-label">Name it</h2>
          <input
            className="founding-name-input"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Leave blank to be named by the seed…"
            maxLength={40}
          />
        </section>

        <section className="founding-section">
          <h2 className="founding-label">
            Build the grid
            <span className={`founding-team-count ${teamsOk ? '' : 'invalid'}`}>
              {teamCount} {teamCount === 1 ? 'team' : 'teams'} · {teamCount * 2} cars
            </span>
          </h2>
          <p className="founding-hint">
            Pick who lines up — the classic grid, historic outfits, or teams of your own.
            {teamCount > MAX_TEAMS && ` (max ${MAX_TEAMS})`}
            {teamCount < MIN_TEAMS && ` (need at least ${MIN_TEAMS})`}
          </p>

          <div className="team-pool">
            {CURRENT_TEAMS.map(t => (
              <button
                key={t.id}
                type="button"
                className={`team-chip ${selectedIds.has(t.id) ? 'selected' : ''}`}
                style={{ '--chip-color': t.color, '--chip-accent': t.accentColor } as React.CSSProperties}
                onClick={() => toggleTeam(t.id)}
              >
                <span className="team-chip-emoji">{t.emoji}</span>
                <span className="team-chip-name">{t.name}</span>
              </button>
            ))}
          </div>

          <h3 className="founding-sublabel">Historic outfits</h3>
          <div className="team-pool">
            {HISTORIC_TEAMS.map(t => (
              <button
                key={t.id}
                type="button"
                className={`team-chip ${selectedIds.has(t.id) ? 'selected' : ''}`}
                style={{ '--chip-color': t.color, '--chip-accent': t.accentColor } as React.CSSProperties}
                onClick={() => toggleTeam(t.id)}
              >
                <span className="team-chip-emoji">{t.emoji}</span>
                <span className="team-chip-name">{t.name}</span>
              </button>
            ))}
          </div>

          {customTeams.length > 0 && (
            <>
              <h3 className="founding-sublabel">Your teams</h3>
              <div className="team-pool">
                {customTeams.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    className="team-chip selected custom"
                    style={{ '--chip-color': t.color, '--chip-accent': t.accentColor } as React.CSSProperties}
                    onClick={() => setCustomTeams(prev => prev.filter(c => c.id !== t.id))}
                    title="Remove"
                  >
                    <span className="team-chip-emoji">{t.emoji}</span>
                    <span className="team-chip-name">{t.name}</span>
                    <span className="team-chip-remove">✕</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {draft ? (
            <div className="custom-team-form" style={{ '--chip-color': draft.color, '--chip-accent': draft.accent } as React.CSSProperties}>
              <div className="custom-team-preview">{draft.emoji || <GameIcon name="race.finish" size={22} />}</div>
              <input
                className="custom-team-name"
                type="text"
                value={draft.name}
                placeholder="Team name"
                maxLength={28}
                onChange={e => setDraft(d => d && { ...d, name: e.target.value })}
              />
              <input
                className="custom-team-emoji"
                type="text"
                value={draft.emoji}
                placeholder="emoji"
                maxLength={4}
                onChange={e => setDraft(d => d && { ...d, emoji: e.target.value })}
                aria-label="Team emoji"
              />
              <label className="custom-team-color" title="Primary color">
                <input type="color" value={draft.color} onChange={e => setDraft(d => d && { ...d, color: e.target.value })} />
              </label>
              <label className="custom-team-color" title="Accent color">
                <input type="color" value={draft.accent} onChange={e => setDraft(d => d && { ...d, accent: e.target.value })} />
              </label>
              <button type="button" className="custom-team-roll" onClick={rollDraftLook} title="Random look" aria-label="Random look"><GameIcon name="ui.restart" size={18} /></button>
              <button type="button" className="custom-team-add" onClick={addCustomTeam} disabled={teamCount >= MAX_TEAMS}>Add</button>
              <button type="button" className="custom-team-cancel" onClick={() => setDraft(null)}>Cancel</button>
            </div>
          ) : (
            <button
              type="button"
              className="create-team-btn"
              onClick={openDraft}
              disabled={teamCount >= MAX_TEAMS}
            >
              ＋ Create a team
            </button>
          )}
        </section>

        <section className="founding-section">
          <h2 className="founding-label">
            Fantasy teams
            <span className="founding-team-count">{fantasy ? (draftComplete(fantasy) ? `${fantasy.teams.length} teams drafted` : 'drafting…') : 'optional'}</span>
          </h2>
          <p className="founding-help">A few of you each draft {3} drivers from this grid. A team scores its drivers' race points all season; the standings live on the league page and the drafted rows light up in the timing tower. <button type="button" className="rs-link" onClick={() => setLeagueSeed(randomSeed())}>Re-roll the grid</button></p>
          {!fantasy ? (
            <button type="button" className="rs-btn rs-btn-ghost" disabled={!teamsOk} onClick={() => setFantasy(emptyFantasy())}>+ Set up fantasy teams</button>
          ) : (
            <>
              <DraftPanel roster={roster} value={fantasy} onChange={setFantasy} context="league" />
              <button type="button" className="rs-link" onClick={() => setFantasy(null)}>Skip fantasy for this league</button>
            </>
          )}
        </section>

        <section className="founding-section">
          <h2 className="founding-label">
            Season rule cards
            <span className="founding-team-count">{hand.length === 0 ? 'none — default rules' : `${hand.length} in play`}</span>
          </h2>
          <p className="founding-hint">The rules this whole season plays under. Pick none for the classic universe.</p>
          <div className="rs-hand">
            {ruleCardsForScope('season').map(c => {
              const on = hand.includes(c.id);
              return (
                <button type="button" key={c.id} className={`rs-card ${on ? 'on' : ''} w-${c.weight}`} onClick={() => toggleCard(c.id)} aria-pressed={on}>
                  <span className="rs-card-emoji"><GameIcon name={c.iconId ?? 'card.rule'} size={24} /></span>
                  <span className="rs-card-name">{c.name}</span>
                  <span className="rs-card-readout">{c.readout}</span>
                  <span className="rs-card-weight">{c.weight}</span>
                </button>
              );
            })}
          </div>
          <button type="button" className="rs-link founding-rules-toggle" onClick={() => setShowRules(v => !v)}>
            {showRules ? 'Hide the rules underneath' : 'Show the rules underneath'}
          </button>
          {showRules && (
            <div className="rs-rules">
              {rulesLines.length === 0
                ? <div className="rs-rule">Default rules: {ruleset.tags.pool.length} tags in the pool, {describeChance(ruleset.tags.genesisChance)} per slot to be born with one ({describeOdds(ruleset.tags.rarityOdds)}), up to {ruleset.tags.slotCap} each; pit rule: {ruleset.simVars.pits.minStops} stops{ruleset.simVars.pits.requireAllCompounds ? ', all 3 compounds' : ''}; canon physics.</div>
                : rulesLines.map(l => <div key={l} className="rs-rule">{l}</div>)}
            </div>
          )}
        </section>

        <section className="founding-section">
          <h2 className="founding-label">Season length</h2>
          <div className="founding-options">
            {SEASON_LENGTHS.map(n => (
              <button
                key={n}
                className={`founding-option ${customCount === '' && raceCount === n ? 'selected' : ''}`}
                onClick={() => { setRaceCount(n); setCustomCount(''); }}
              >
                {n} races
              </button>
            ))}
            <label className={`founding-option founding-custom-count ${customCount !== '' ? 'selected' : ''}`}>
              <input
                type="number"
                min={MIN_RACES}
                max={MAX_RACES}
                value={customCount}
                placeholder="#"
                onChange={e => {
                  const raw = e.target.value;
                  setCustomCount(raw);
                  const n = parseInt(raw, 10);
                  if (!Number.isNaN(n)) {
                    setRaceCount(Math.max(MIN_RACES, Math.min(MAX_RACES, n)));
                  }
                }}
              />
              <span className="founding-option-detail">custom</span>
            </label>
          </div>
        </section>

        <section className="founding-section">
          <h2 className="founding-label">Cadence</h2>
          <div className="founding-options">
            {CADENCES.map((c, i) => (
              <button
                key={c.label}
                className={`founding-option ${cadenceIdx === i ? 'selected' : ''}`}
                onClick={() => setCadenceIdx(i)}
              >
                <span><GameIcon name={c.icon} size={16} /> {c.label}</span>
                <span className="founding-option-detail">{c.detail}</span>
              </button>
            ))}
          </div>
        </section>

        <button
          className="found-league-btn"
          disabled={!canFound}
          onClick={handleFound}
        >
          {canFound
            ? 'Found it — the inaugural race runs now'
            : !teamsOk
              ? `Pick ${MIN_TEAMS}–${MAX_TEAMS} teams to continue`
              : 'Finish the fantasy draft (or skip it) to continue'}
        </button>
      </div>
    </div>
  );
}

export default FoundingScreen;
