// Run Setup — the one page before a Quick Race (#241 first slice; #242 is the
// full design pass). The whole universe for this race on one screen:
//
//   seed · reroll · track · cards (race scope) · the rules underneath · the grid
//
// Everything is derived from one seed + the hand of cards, so a report's seed
// reproduces the race and flipping a card re-rolls only what it touches
// (trait cards), never names, stats, teams or track.
import { useEffect, useMemo, useState } from 'react';
import RaceEngine, { RosterDriver } from './RaceEngine';
import { generateRosterFromTeams } from './generators/drivers';
import { generateCarsForKingdoms } from './generators/cars';
import { generateTrack, CURRENT_TRACKS, Track } from './generators/tracks';
import { getRandomTeams, Team } from './data/teams';
import { mulberry32, deriveSeed, randomSeed } from './engine/rng';
import { RULE_CARDS_BY_ID, ruleCardsForScope } from './data/ruleCards';
import { resolveRuleset, applyLabPreset, describeRuleset, describeChance, describeOdds, serializeRuleset, Ruleset } from './rules/ruleset';
import { loadNotebook, fetchLedger, presetSummary, type LabPreset } from './racecontrol/notebook';
import { DraftPanel, emptyFantasy } from './fantasy/DraftPanel';
import { draftComplete, type FantasyConfig } from './fantasy/types';
import { buildRoster } from './rules/genesis';
import { weatherForRace, isNeutralWeather } from './data/weather';
import { applyFavours } from './cards/apply';
import { PriorityLine } from './cards/PriorityLine';
import { CardFace } from './cards/CardFace';
import { GameIcon } from './icons/GameIcon';
import { gradeTone, readStat } from './season/grades';
import type { StatKey } from './cards/types';
import './RunSetup.css';

interface RunSetupProps {
  onStartRace: (roster: RosterDriver[], ruleset: Ruleset, seed: number, fantasy?: FantasyConfig) => void;
  onBack?: () => void;
}

const streams = (seed: number) => ({
  teams: mulberry32(deriveSeed(seed, 'teams')),
  track: mulberry32(deriveSeed(seed, 'track')),
  drivers: mulberry32(deriveSeed(seed, 'genesis', 'drivers')),
  cars: mulberry32(deriveSeed(seed, 'genesis', 'cars')),
});

/** A car stat as a grade in the four F1 colours, like the Paddock (#546). */
function CarGrade({ stat, n }: { stat: StatKey; n: number | undefined }) {
  if (n === undefined) return <span className="rs-grade">—</span>;
  const g = readStat(stat, n, []).grade;
  return <span className={`rs-grade tone-${gradeTone(g)}`}>{g}</span>;
}

export default function RunSetup({ onStartRace, onBack }: RunSetupProps) {
  const [seed, setSeed] = useState<number>(() => randomSeed());
  const [hand, setHand] = useState<string[]>([]);
  const [trackOverride, setTrackOverride] = useState<Track | null>(null);
  const [showRules, setShowRules] = useState(false);

  // Race Control presets (knob edits) saved in this browser.
  const [presets, setPresets] = useState<LabPreset[]>(() => loadNotebook().presets);
  useEffect(() => {
    // Shared presets from the repo ledger join the local ones (local wins on the same id).
    fetchLedger().then(l => setPresets(prev => [...prev, ...l.presets.filter(p => !prev.some(x => x.id === p.id)).map(p => ({ ...p, name: `${p.name} (shared)` }))])).catch(() => { /* offline */ });
  }, []);
  const [presetId, setPresetId] = useState<string>('');
  const preset = presets.find(p => p.id === presetId) ?? null;
  const ruleset = useMemo(() => applyLabPreset(resolveRuleset(hand, RULE_CARDS_BY_ID), preset), [hand, preset]);

  // The universe for this seed (teams, track, people, cars) — independent of cards.
  const universe = useMemo(() => {
    const st = streams(seed);
    const teams: Team[] = getRandomTeams(11, st.teams);
    const track = generateTrack(st.track);
    const ids = teams.map(t => t.id);
    const drivers = generateRosterFromTeams(ids, st.drivers);
    const cars = generateCarsForKingdoms(ids, st.cars);
    return { teams, track, drivers, cars };
  }, [seed]);
  const track = trackOverride ?? universe.track;

  // Trait cards depend on the rule cards (genesis chance + metal odds); everything above does not (#337).
  const roster = useMemo(() => buildRoster(universe.drivers, universe.cars, seed, ruleset), [universe, seed, ruleset]);
  const weather = useMemo(() => ruleset.weather.quickRace ? weatherForRace(seed, 0, ruleset.weather.weights) : null, [seed, ruleset]);
  // Fantasy draft for this race; picks are cleared if the grid changes under them.
  const [fantasy, setFantasy] = useState<FantasyConfig | null>(null);
  const rosterKey = roster.map(d => d.id).join(',');
  const [draftedFor, setDraftedFor] = useState(rosterKey);
  if (draftedFor !== rosterKey) {
    setDraftedFor(rosterKey);
    if (fantasy?.teams.some(t => t.driverIds.length)) setFantasy({ ...fantasy, teams: fantasy.teams.map(t => ({ ...t, driverIds: [] })) });
  }
  const rulesLines = useMemo(() => describeRuleset(ruleset), [ruleset]);

  const toggleCard = (id: string) => setHand(h => (h.includes(id) ? h.filter(x => x !== id) : [...h, id]));

  const start = () => {
    const engine = RaceEngine.getInstance();
    engine.setSimVars(ruleset.simVars);
    engine.setSeed(deriveSeed(seed, 'race'));
    engine.setWeather(weather);
    // Track + weather favours gain +10 grade for the race, field-wide (Tracks & Weather v2).
    engine.loadGeneratedRoster(applyFavours(roster, [...track.favours, ...(weather?.favours ?? [])]));
    engine.setTrackInfo({
      id: track.id, name: track.name, emoji: track.emoji, funEmoji: track.funEmoji,
      description: track.description, laps: track.laps,
      layout: {
        trackPath: track.layout.trackPath, pitLanePath: track.layout.pitLanePath,
        straightStart: track.layout.straightStart, straightEnd: track.layout.straightEnd, totalLength: track.layout.totalLength,
      },
      favours: track.favours,
    });
    engine.updateConfig({ lapLength: track.length, totalLaps: track.laps, tyreWear: track.tyreWear });
    onStartRace(roster, ruleset, seed, fantasy && draftComplete(fantasy) ? fantasy : undefined);
  };

  const byTeam = useMemo(() => {
    const m = new Map<string, RosterDriver[]>();
    for (const d of roster) { const l = m.get(d.kingdomId ?? '') ?? []; l.push(d); m.set(d.kingdomId ?? '', l); }
    return universe.teams.map(t => ({ team: t, drivers: m.get(t.id) ?? [], car: universe.cars.get(t.id) }));
  }, [roster, universe]);

  return (
    <div className="run-setup">
      <header className="rs-top">
        <div className="rs-title-block">
          {onBack && <button type="button" className="rs-back" onClick={onBack}>← Menu</button>}
          <h1 className="rs-title">Quick Race</h1>
          <span className="rs-sub">One race, one universe. Edit anything, then go.</span>
        </div>
        <div className="rs-seed">
          <span className="rs-k">Seed</span>
          <code className="rs-seed-value" title="Paste this into a report to replay the race">{seed}</code>
          <button type="button" className="rs-btn rs-btn-ghost" onClick={() => { setSeed(randomSeed()); setTrackOverride(null); }}>Reroll</button>
        </div>
        <button type="button" className="rs-btn rs-btn-primary rs-start" onClick={start}>Start race →</button>
      </header>

      <section className="rs-row rs-track">
        <div className="rs-track-main">
          <span className="rs-track-emoji">{track.funEmoji}</span>
          <div>
            <div className="rs-track-name">{track.name} <span className="rs-flag">{track.emoji}</span></div>
            <div className="rs-track-meta">{track.laps} laps · {track.length}m
              {weather && !isNeutralWeather(weather) && <span className="rs-chip rs-chip-weather">{weather.emoji} {weather.name}{weather.intensity < 1 ? ` ${Math.round(weather.intensity * 100)}%` : ''}</span>}
              {(!weather || isNeutralWeather(weather)) && <span className="rs-chip rs-chip-dim">Neutral weather</span>}
            </div>
            <PriorityLine label="Priority stats" track={track} weather={weather} />
          </div>
        </div>
        <label className="rs-track-pick">
          <span className="rs-k">Track</span>
          <select value={track.id} onChange={e => setTrackOverride(CURRENT_TRACKS.find(t => t.id === e.target.value) ?? null)}>
            {CURRENT_TRACKS.map(t => <option key={t.id} value={t.id}>{t.funEmoji} {t.name}</option>)}
          </select>
        </label>
      </section>

      <section className="rs-row rs-cards">
        <div className="rs-row-head">
          <span className="rs-k">Rule cards</span>
          <span className="rs-hint">{hand.length === 0 ? 'None picked: default rules.' : `${hand.length} in play`}</span>
          <button type="button" className="rs-link" onClick={() => setShowRules(v => !v)}>{showRules ? 'Hide the rules underneath' : 'Show the rules underneath'}</button>
        </div>
        <div className="rs-hand">
          {ruleCardsForScope('race').map(c => {
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
        {presets.length > 0 && (
          <div className="rs-preset">
            <span className="rs-k">Lab preset</span>
            <select value={presetId} onChange={e => setPresetId(e.target.value)} aria-label="Lab preset">
              <option value="">none — the rules as shipped</option>
              {presets.map(p => <option key={p.id} value={p.id}>{p.name} · {presetSummary(p)}</option>)}
            </select>
            <span className="rs-hint">{preset ? `Racing under "${preset.name}": its knobs are the physics. From Race Control → Notebook.` : 'A setup you saved in Race Control. Pick one to race under it.'}</span>
          </div>
        )}
        {showRules && (
          <div className="rs-rules">
            {rulesLines.length === 0 ? <div className="rs-rule">Default rules: {describeChance(ruleset.traits.genesisChance)} per slot (driver, car, team) to be born with a trait card ({describeOdds(ruleset.traits.rarityOdds)}); pit rule: {ruleset.simVars.pits.minStops} stop{ruleset.simVars.pits.minStops === 1 ? '' : 's'}{ruleset.simVars.pits.requireCompoundChange ? ', change compound' : ''}{ruleset.simVars.pits.requireAllCompounds ? ', all 3 compounds' : ''}; canon physics.</div>
              : rulesLines.map(l => <div key={l} className="rs-rule">{l}</div>)}
            <div className="rs-rules-actions">
              <button type="button" className="rs-link" onClick={() => navigator.clipboard?.writeText(serializeRuleset(ruleset))}>Copy ruleset JSON</button>
            </div>
          </div>
        )}
      </section>

      <section className="rs-row">
        <div className="rs-row-head">
          <span className="rs-k">Fantasy</span>
          <span className="rs-hint">{fantasy ? (draftComplete(fantasy) ? `${fantasy.teams.length} teams drafted — their drivers light up in the timing tower.` : 'Finish the draft, or skip it; the race runs either way.') : 'Optional: a few of you draft 3 drivers each and score their race points.'}</span>
          {fantasy && <button type="button" className="rs-link" onClick={() => setFantasy(null)}>skip fantasy</button>}
        </div>
        {!fantasy
          ? <button type="button" className="rs-btn rs-btn-ghost" onClick={() => setFantasy(emptyFantasy())}>+ Set up fantasy teams</button>
          : <DraftPanel roster={roster} value={fantasy} onChange={setFantasy} context="race" />}
      </section>

      <section className="rs-row rs-grid">
        <div className="rs-row-head"><span className="rs-k">Grid</span><span className="rs-hint">{roster.length} drivers · {universe.teams.length} teams · trait cards are born with them and baked into the stats; tap a card to flip it</span></div>
        <div className="rs-teams">
          {byTeam.map(({ team, drivers, car }) => (
            <div key={team.id} className="rs-team" style={{ '--team-color': team.color } as React.CSSProperties}>
              <div className="rs-team-head">
                <span className="rs-team-marble">{team.emoji}</span>
                <span className="rs-team-name">{team.name}</span>
                <span className="rs-team-car" title={`Power ${car?.stats.power} · Grip ${car?.stats.grip} · Reliability ${car?.stats.reliability}`}>
                  PWR <CarGrade stat="power" n={car?.stats.power} /> · GRP <CarGrade stat="grip" n={car?.stats.grip} /> · REL <CarGrade stat="reliability" n={car?.stats.reliability} />
                </span>
              </div>
              {drivers.map(d => (
                <div key={d.id} className="rs-driver">
                  <span className="rs-driver-name"><span className="rs-driver-number" style={{ background: d.color, color: d.ink }}>{d.number}</span> {d.fullName}</span>
                  <span className="rs-driver-stats" title="Speed · Consistency · Luck">{d.stats.baseSpeed.toFixed(2)} · {d.stats.consistency.toFixed(2)} · {d.stats.luck.toFixed(2)}</span>
                  <span className="rs-driver-tags">{d.cards?.length ? d.cards.map(c => <CardFace key={c.id} card={c} size="mini" />) : <span className="rs-chip rs-chip-dim">no traits</span>}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
