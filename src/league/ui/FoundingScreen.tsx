// The Founding: where the Commissionary names a league, kneels to a god, and
// fixes the calendar. Everything chosen here is sealed into the league seed.

import { useState } from 'react';
import { GODS } from '../gods';
import { CURRENT_TEAMS, HISTORIC_TEAMS, makeCustomTeam, Team } from '../../data/teams';
import { generateTeamIdentities } from '../../generators/teamIdentity';
import { cardsForScope, CARDS_BY_ID } from '../../data/cards';
import { resolveRuleset, describeRuleset, describeChance, describeOdds, Ruleset } from '../../rules/ruleset';
import './League.css';
import '../../RunSetup.css';

export interface FoundingChoices {
  name: string;
  godId: string;
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
  { label: 'Frantic', emoji: '⚡', detail: 'back-to-back broadcasts, non-stop', ms: 2 * MINUTE },
  { label: 'Brisk', emoji: '☕', detail: 'a race every 30 minutes', ms: 30 * MINUTE },
  { label: 'Classic', emoji: '🕰️', detail: 'a race every 3 hours', ms: 3 * HOUR },
];

const SEASON_LENGTHS = [8, 12, 16];
const MIN_RACES = 1;
const MAX_RACES = 24;

function FoundingScreen({ onFound, onBack }: FoundingScreenProps) {
  const [name, setName] = useState('');
  const [godId, setGodId] = useState<string | null>(null);
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

  const god = GODS.find(g => g.id === godId);
  const teamCount = selectedIds.size + customTeams.length;
  const teamsOk = teamCount >= MIN_TEAMS && teamCount <= MAX_TEAMS;
  const canFound = godId !== null && teamsOk;

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
  const ruleset = resolveRuleset(hand, CARDS_BY_ID);
  const rulesLines = describeRuleset(ruleset);
  const toggleCard = (id: string) => setHand(h => (h.includes(id) ? h.filter(x => x !== id) : [...h, id]));

  const handleFound = () => {
    if (!canFound) return;
    onFound({
      ruleset,
      // Blank → App fills a procedural name seeded from the league (#185).
      name: name.trim(),
      godId: godId!,
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
              <div className="custom-team-preview">{draft.emoji || '🏁'}</div>
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
                placeholder="🏁"
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
              <button type="button" className="custom-team-roll" onClick={rollDraftLook} title="Random look">🎲</button>
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
          <h2 className="founding-label">Kneel to a god</h2>
          <div className="god-cards">
            {GODS.map(g => (
              <button
                key={g.id}
                className={`god-card ${godId === g.id ? 'selected' : ''}`}
                onClick={() => setGodId(g.id)}
              >
                <span className="god-emoji">{g.emoji}</span>
                <span className="god-name">{g.name}</span>
                <span className="god-epithet">{g.epithet}</span>
                <span className="god-appetite">{g.appetite}</span>
              </button>
            ))}
          </div>
          {god && <p className="god-hunger">“{god.hunger}”</p>}
        </section>

        <section className="founding-section">
          <h2 className="founding-label">
            Season cards
            <span className="founding-team-count">{hand.length === 0 ? 'none — default rules' : `${hand.length} in play`}</span>
          </h2>
          <p className="founding-hint">The rules this whole season plays under. Pick none for the classic universe.</p>
          <div className="rs-hand">
            {cardsForScope('season').map(c => {
              const on = hand.includes(c.id);
              return (
                <button type="button" key={c.id} className={`rs-card ${on ? 'on' : ''} w-${c.weight}`} onClick={() => toggleCard(c.id)} aria-pressed={on}>
                  <span className="rs-card-emoji">{c.emoji}</span>
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
                <span>{c.emoji} {c.label}</span>
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
            ? '⚜️ Found it — the inaugural race runs now'
            : !teamsOk
              ? `Pick ${MIN_TEAMS}–${MAX_TEAMS} teams to continue`
              : 'Choose a god to continue'}
        </button>
      </div>
    </div>
  );
}

export default FoundingScreen;
