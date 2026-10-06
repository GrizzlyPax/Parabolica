// Run Setup — the one page before a Quick Race (#241 first slice; #242 is the
// full design pass). The whole universe for this race on one screen:
//
//   seed · reroll · track · cards (race scope) · the rules underneath · the grid
//
// Everything is derived from one seed + the hand of cards, so a report's seed
// reproduces the race and flipping a card re-rolls only what it touches
// (tags), never names, stats, teams or track.
import { useEffect, useMemo, useState } from 'react';
import RaceEngine, { RosterDriver } from './RaceEngine';
import { generateRosterFromTeams } from './generators/drivers';
import { generateCarsForKingdoms } from './generators/cars';
import { generateTrack, getDynamicEventDescription, CURRENT_TRACKS, Track } from './generators/tracks';
import { getRandomTeams, Team } from './data/teams';
import { mulberry32, deriveSeed, randomSeed } from './engine/rng';
import { CARDS_BY_ID, cardsForScope } from './data/cards';
import { resolveRuleset, applyLabPreset, describeRuleset, describeChance, describeOdds, serializeRuleset, Ruleset } from './rules/ruleset';
import { loadNotebook, fetchLedger, presetSummary, type LabPreset } from './racecontrol/notebook';
import { buildRoster } from './rules/genesis';
import { weatherForRace } from './data/weather';
import { intrinsicTrackTags } from './data/trackTags';
import { GenesisSlots } from './components/race/TagChips';
import './RunSetup.css';

interface RunSetupProps {
  onStartRace: (roster: RosterDriver[], ruleset: Ruleset, seed: number) => void;
  onBack?: () => void;
}

const streams = (seed: number) => ({
  teams: mulberry32(deriveSeed(seed, 'teams')),
  track: mulberry32(deriveSeed(seed, 'track')),
  drivers: mulberry32(deriveSeed(seed, 'genesis', 'drivers')),
  cars: mulberry32(deriveSeed(seed, 'genesis', 'cars')),
});

function stars(n: number | undefined): string {
  return n === undefined ? '—' : '★'.repeat(Math.round(n)) + '☆'.repeat(Math.max(0, 5 - Math.round(n)));
}

export default function RunSetup({ onStartRace, onBack }: RunSetupProps) {
  const [seed, setSeed] = useState<number>(() => randomSeed());
  const [hand, setHand] = useState<string[]>([]);
  const [trackOverride, setTrackOverride] = useState<Track | null>(null);
  const [showRules, setShowRules] = useState(false);

  // Race Control presets (edited tags + knobs) saved in this browser.
  const [presets, setPresets] = useState<LabPreset[]>(() => loadNotebook().presets);
  useEffect(() => {
    // Shared presets from the repo ledger join the local ones (local wins on the same id).
    fetchLedger().then(l => setPresets(prev => [...prev, ...l.presets.filter(p => !prev.some(x => x.id === p.id)).map(p => ({ ...p, name: `${p.name} (shared)` }))])).catch(() => { /* offline */ });
  }, []);
  const [presetId, setPresetId] = useState<string>('');
  const preset = presets.find(p => p.id === presetId) ?? null;
  const ruleset = useMemo(() => applyLabPreset(resolveRuleset(hand, CARDS_BY_ID), preset), [hand, preset]);

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

  // Tags depend on the cards; everything else above does not.
  const roster = useMemo(() => buildRoster(universe.drivers, universe.cars, seed, ruleset), [universe, seed, ruleset]);
  const weather = useMemo(() => ruleset.weather.quickRace ? weatherForRace(seed, 0, ruleset.weather.weights) : null, [seed, ruleset]);
  const rulesLines = useMemo(() => describeRuleset(ruleset), [ruleset]);
  const trackTags = intrinsicTrackTags(track.id);

  const toggleCard = (id: string) => setHand(h => (h.includes(id) ? h.filter(x => x !== id) : [...h, id]));

  const start = () => {
    const engine = RaceEngine.getInstance();
    engine.setSimVars(ruleset.simVars);
    engine.setSeed(deriveSeed(seed, 'race'));
    engine.setWeather(weather);
    engine.setTrackTags(trackTags);
    engine.loadGeneratedRoster(roster);
    engine.setTrackInfo({
      id: track.id, name: track.name, emoji: track.emoji, funEmoji: track.funEmoji,
      description: track.description, laps: track.laps,
      layout: {
        trackPath: track.layout.trackPath, pitLanePath: track.layout.pitLanePath,
        straightStart: track.layout.straightStart, straightEnd: track.layout.straightEnd, totalLength: track.layout.totalLength,
      },
      event: track.event ? {
        id: track.event.id, name: track.event.name, emoji: track.event.emoji,
        description: getDynamicEventDescription(track.event, track.laps), flavorText: track.event.flavorText,
      } : undefined,
      eventTrigger: track.event?.trigger,
      eventEffect: track.event?.effect,
    });
    engine.updateConfig({ lapLength: track.length, totalLaps: track.laps });
    onStartRace(roster, ruleset, seed);
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
              {trackTags.map(t => <span key={t.id} className="rs-chip" title={t.name}>{t.emoji} {t.name}</span>)}
              {weather && <span className="rs-chip rs-chip-weather">{weather.emoji} {weather.name}{weather.intensity < 1 ? ` ${Math.round(weather.intensity * 100)}%` : ''}</span>}
              {!weather && <span className="rs-chip rs-chip-dim">☀️ no weather</span>}
              {track.event && <span className="rs-chip" title={getDynamicEventDescription(track.event, track.laps)}>{track.event.emoji} {track.event.name}</span>}
            </div>
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
          <span className="rs-k">Cards</span>
          <span className="rs-hint">{hand.length === 0 ? 'None picked: default rules.' : `${hand.length} in play`}</span>
          <button type="button" className="rs-link" onClick={() => setShowRules(v => !v)}>{showRules ? 'Hide the rules underneath' : 'Show the rules underneath'}</button>
        </div>
        <div className="rs-hand">
          {cardsForScope('race').map(c => {
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
        {presets.length > 0 && (
          <div className="rs-preset">
            <span className="rs-k">Lab preset</span>
            <select value={presetId} onChange={e => setPresetId(e.target.value)} aria-label="Lab preset">
              <option value="">none — the rules as shipped</option>
              {presets.map(p => <option key={p.id} value={p.id}>{p.name} · {presetSummary(p)}</option>)}
            </select>
            <span className="rs-hint">{preset ? `Racing under "${preset.name}": its tag edits are what genesis draws, its knobs are the physics. From Race Control → Notebook.` : 'A setup you saved in Race Control. Pick one to race under it.'}</span>
          </div>
        )}
        {showRules && (
          <div className="rs-rules">
            {rulesLines.length === 0 ? <div className="rs-rule">Default rules: {ruleset.tags.pool.length} tags in the pool, {describeChance(ruleset.tags.genesisChance)} per slot to be born with one ({describeOdds(ruleset.tags.rarityOdds)}), up to {ruleset.tags.slotCap} each; pit rule: {ruleset.simVars.pits.minStops} stops{ruleset.simVars.pits.requireAllCompounds ? ', all 3 compounds' : ''}; canon physics.</div>
              : rulesLines.map(l => <div key={l} className="rs-rule">{l}</div>)}
            <div className="rs-rules-actions">
              <button type="button" className="rs-link" onClick={() => navigator.clipboard?.writeText(serializeRuleset(ruleset))}>Copy ruleset JSON</button>
            </div>
          </div>
        )}
      </section>

      <section className="rs-row rs-grid">
        <div className="rs-row-head"><span className="rs-k">Grid</span><span className="rs-hint">{roster.length} drivers · {universe.teams.length} teams · click a tag for details</span></div>
        <div className="rs-teams">
          {byTeam.map(({ team, drivers, car }) => (
            <div key={team.id} className="rs-team" style={{ '--team-color': team.color } as React.CSSProperties}>
              <div className="rs-team-head">
                <span className="rs-team-marble">{team.emoji}</span>
                <span className="rs-team-name">{team.name}</span>
                <span className="rs-team-car" title={`Power ${car?.stats.power} · Grip ${car?.stats.grip} · Reliability ${car?.stats.reliability}`}>
                  P {stars(car?.stats.power)} · G {stars(car?.stats.grip)} · R {stars(car?.stats.reliability)}
                </span>
              </div>
              {drivers.map(d => (
                <div key={d.id} className="rs-driver">
                  <span className="rs-driver-name">{d.fullName}</span>
                  <span className="rs-driver-stats" title="Speed · Consistency · Luck">{d.stats.baseSpeed.toFixed(2)} · {d.stats.consistency.toFixed(2)} · {d.stats.luck.toFixed(2)}</span>
                  <span className="rs-driver-tags"><GenesisSlots tags={d.tags} /></span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
