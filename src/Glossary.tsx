// Glossary screen: every tag, card, rule, weather, track character and
// infliction in the sim — rendered from the same model as docs/GLOSSARY.md,
// so what you read here is what the engine runs.
import { useMemo, useState } from 'react';
import { buildGlossary, describeTrigger, describeInRaceRule, effectsOf, GlossaryTag, TagGroup } from './data/glossary';
import { ALL_TAGS, TIER_LABELS } from './data/tags';
import { intrinsicTrackTags } from './data/trackTags';
import TagChips from './components/race/TagChips';
import './RunSetup.css';
import './Glossary.css';

interface GlossaryProps { onBack: () => void }

const GROUPS: { id: TagGroup; title: string; blurb: string }[] = [
  { id: 'genesis', title: 'Genesis tags', blurb: 'Rolled when a driver, car or team is born. The Commissionary can also hand these out.' },
  { id: 'acquired', title: 'Acquired tags', blurb: 'Awarded after a race for what happened in it. Take effect next race.' },
  { id: 'in-race', title: 'In-race tags', blurb: 'Picked up mid-race. Expire by lap, at the next stop, or at the flag.' },
  { id: 'condition', title: 'Condition tags', blurb: 'Stamped by track events for one race only.' },
];

function Pills({ effects }: { effects: ReturnType<typeof effectsOf> }) {
  if (effects.length === 0) return <span className="tag-card-none">story only</span>;
  return <span className="effect-pills">{effects.map(p => <span key={p.label} className={`effect-pill ${p.good ? 'good' : 'bad'}`}><b>{p.value}</b> {p.label}</span>)}</span>;
}

function TagRow({ g }: { g: GlossaryTag }) {
  return (
    <div className="gl-row">
      <span className="gl-chip"><TagChips tags={[g.tag]} showName /></span>
      <span className="gl-desc">{g.tag.description}</span>
      <span className="gl-meta"><span className="rs-k">Tier</span> {TIER_LABELS[g.tag.tier].split(' · ')[0]} · <span className="rs-k">On</span> {g.tag.target}</span>
      <span className="gl-meta"><span className="rs-k">Fires</span> {g.fires}</span>
      <span className="gl-meta"><span className="rs-k">Lasts</span> {g.lasts}</span>
      <span className="gl-fx"><Pills effects={g.effects} /></span>
      <span className="gl-src">{g.source}</span>
    </div>
  );
}

export default function Glossary({ onBack }: GlossaryProps) {
  const g = useMemo(() => buildGlossary(), []);
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const match = (...parts: (string | undefined)[]) => !needle || parts.some(p => p?.toLowerCase().includes(needle));
  const tagById = (id: string) => ALL_TAGS.find(t => t.id === id);

  return (
    <div className="run-setup glossary">
      <header className="rs-top">
        <div className="rs-title-block">
          <button type="button" className="rs-back" onClick={onBack}>← Menu</button>
          <h1 className="rs-title">Glossary</h1>
          <span className="rs-sub">Everything in the sim, read straight from the data. {g.counts.tags} tags · {g.counts.cards} cards · {g.counts.rules} rules.</span>
        </div>
        <label className="gl-search">
          <span className="rs-k">Find</span>
          <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="rain, pit, haunted…" />
        </label>
      </header>

      {GROUPS.map(grp => {
        const rows = g.tags.filter(t => t.group === grp.id && match(t.tag.name, t.tag.id, t.tag.description, t.fires, t.source));
        if (!rows.length) return null;
        return (
          <section key={grp.id} className="rs-row">
            <div className="rs-row-head"><span className="rs-k">{grp.title}</span><span className="rs-hint">{grp.blurb}</span></div>
            <div className="gl-list">{rows.map(r => <TagRow key={r.tag.id} g={r} />)}</div>
          </section>
        );
      })}

      {g.cards.some(c => match(c.name, c.id, c.readout, c.blurb)) && (
        <section className="rs-row">
          <div className="rs-row-head"><span className="rs-k">Cards</span><span className="rs-hint">Rules you pick before a run. Race cards for one race, season cards for a whole league.</span></div>
          <div className="rs-hand">
            {g.cards.filter(c => match(c.name, c.id, c.readout, c.blurb)).map(c => (
              <div key={c.id} className={`rs-card w-${c.weight} gl-card-static`}>
                <span className="rs-card-emoji">{c.emoji}</span>
                <span className="rs-card-name">{c.name}</span>
                <span className="rs-card-readout">{c.readout}</span>
                <span className="rs-card-weight">{c.scope} · {c.weight}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {(g.acquisitionRules.some(r => match(r.id, r.tagId, r.family)) || g.inRaceRules.some(r => match(r.id, r.tagId))) && (
        <section className="rs-row">
          <div className="rs-row-head"><span className="rs-k">Rules</span><span className="rs-hint">How the sim hands out tags.</span></div>
          <div className="gl-list">
            {g.acquisitionRules.filter(r => match(r.id, r.tagId, r.family)).map(r => {
              const t = tagById(r.tagId);
              return (
                <div key={r.id} className="gl-row gl-rule">
                  <span className="gl-chip">{t && <TagChips tags={[t]} showName />}</span>
                  <span className="gl-desc"><span className="rs-k">After a race</span> {describeTrigger(r.when)}</span>
                  <span className="gl-meta"><span className="rs-k">{r.family}</span></span>
                </div>
              );
            })}
            {g.inRaceRules.filter(r => match(r.id, r.tagId)).map(r => {
              const t = tagById(r.tagId);
              return (
                <div key={r.id} className="gl-row gl-rule">
                  <span className="gl-chip">{t && <TagChips tags={[t]} showName />}</span>
                  <span className="gl-desc"><span className="rs-k">Mid-race</span> {describeInRaceRule(r)}</span>
                  <span className="gl-meta"><span className="rs-k">in-race</span></span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {g.weather.some(w => match(w.name, w.id)) && (
        <section className="rs-row">
          <div className="rs-row-head"><span className="rs-k">Weather</span><span className="rs-hint">Rolled per race. Odds are the defaults; cards change them.</span></div>
          <div className="gl-list">
            {g.weather.filter(w => match(w.name, w.id)).map(w => {
              const total = g.weather.reduce((s, x) => s + x.weight, 0);
              return (
                <div key={w.id} className="gl-row">
                  <span className="gl-chip gl-plain">{w.emoji} {w.name}</span>
                  <span className="gl-meta"><span className="rs-k">Odds</span> {Math.round(w.weight / total * 100)}%</span>
                  <span className="gl-meta"><span className="rs-k">Stamps</span> {w.conditions.join(', ') || '—'}</span>
                  <span className="gl-fx"><Pills effects={effectsOf(w.baseEffects)} /></span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {g.trackTags.some(t => match(t.name, t.id)) && (
        <section className="rs-row">
          <div className="rs-row-head"><span className="rs-k">Track characters</span><span className="rs-hint">A circuit's intrinsic lean, field-wide.</span></div>
          <div className="gl-list">
            {g.trackTags.filter(t => match(t.name, t.id)).map(t => (
              <div key={t.id} className="gl-row">
                <span className="gl-chip gl-plain">{t.emoji} {t.name}</span>
                <span className="gl-meta"><span className="rs-k">Stamps</span> {(t.conditions ?? []).join(', ') || '—'}</span>
                <span className="gl-fx"><Pills effects={effectsOf(t.passive ?? {})} /></span>
                <span className="gl-src">{g.tracks.filter(tr => intrinsicTrackTags(tr.id).some(i => i.id === t.id)).map(tr => `${tr.funEmoji} ${tr.name}`).join(' · ')}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {g.inflictions.some(i => match(i.name, i.id)) && (
        <section className="rs-row">
          <div className="rs-row-head"><span className="rs-k">Inflictions</span><span className="rs-hint">Mid-race strikes the conditions can land on one driver.</span></div>
          <div className="gl-list">
            {g.inflictions.filter(i => match(i.name, i.id)).map(i => (
              <div key={i.id} className="gl-row">
                <span className="gl-chip gl-plain">{i.emoji} {i.name}</span>
                <span className="gl-meta"><span className="rs-k">Needs</span> {i.requiresCondition.join(', ')}</span>
                <span className="gl-meta"><span className="rs-k">Lasts</span> {i.durationTicks} ticks</span>
                <span className="gl-fx"><Pills effects={effectsOf(i.effects)} /></span>
                <span className="gl-src">{i.activationText}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
