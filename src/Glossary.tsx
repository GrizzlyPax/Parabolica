// Glossary screen: every tag, card, rule, weather, track character and
// infliction in the sim — rendered from the same model as docs/GLOSSARY.md,
// so what you read here is what the engine runs.
//
// Compact by default: one line per entry (chip + effect pills). Click a row
// to open the full card underneath it.
import { useMemo, useState, ReactNode } from 'react';
import { buildGlossary, describeTrigger, describeInRaceRule, effectsOf, GlossaryTag, TagGroup } from './data/glossary';
import { ALL_TAGS } from './data/tags';
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

/** One collapsed line; click to open the detail block beneath it. */
function Row({ id, open, onToggle, lead, pills, note, children }: {
  id: string; open: boolean; onToggle: (id: string) => void;
  lead: ReactNode; pills?: ReactNode; note?: ReactNode; children: ReactNode;
}) {
  return (
    <div className={`gl-row ${open ? 'open' : ''}`}>
      <button type="button" className="gl-line" onClick={() => onToggle(id)} aria-expanded={open}>
        <span className="gl-lead">{lead}</span>
        {note && <span className="gl-note">{note}</span>}
        <span className="gl-pills">{pills}</span>
        <span className="gl-chev" aria-hidden="true">›</span>
      </button>
      {open && <div className="gl-detail">{children}</div>}
    </div>
  );
}

function Fact({ k, children }: { k: string; children: ReactNode }) {
  return <span className="gl-fact"><span className="rs-k">{k}</span> {children}</span>;
}

export default function Glossary({ onBack }: GlossaryProps) {
  const g = useMemo(() => buildGlossary(), []);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const toggle = (id: string) => setOpen(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const needle = q.trim().toLowerCase();
  const match = (...parts: (string | undefined)[]) => !needle || parts.some(p => p?.toLowerCase().includes(needle));
  const tagById = (id: string) => ALL_TAGS.find(t => t.id === id);
  const isOpen = (id: string) => open.has(id);

  const tagRow = (t: GlossaryTag) => (
    <Row key={t.tag.id} id={`tag:${t.tag.id}`} open={isOpen(`tag:${t.tag.id}`)} onToggle={toggle}
      lead={<TagChips tags={[t.tag]} showName />}
      note={<>{t.tag.target}{t.does.length > 0 && <span className="gl-does" title="Does something after a race">⚡</span>}</>}
      pills={<Pills effects={t.effects} />}>
      <p className="gl-desc">{t.tag.description}</p>
      <div className="gl-facts">
        <Fact k="On">{t.tag.target}</Fact>
        {t.group === 'genesis' && <Fact k="Rarity">{t.tag.rarity && t.tag.rarity > 1 ? `${t.tag.rarity}× rarer than common` : 'common'}</Fact>}
        <Fact k="Fires">{t.fires}</Fact>
        <Fact k="Lasts">{t.lasts}</Fact>
        {t.does.length > 0 && <Fact k="After a race">{t.does.join(' · ')}</Fact>}
      </div>
      <div className="gl-src">{t.source}</div>
    </Row>
  );

  return (
    <div className="run-setup glossary">
      <header className="rs-top">
        <div className="rs-title-block">
          <button type="button" className="rs-back" onClick={onBack}>← Menu</button>
          <h1 className="rs-title">Glossary</h1>
          <span className="rs-sub">Everything in the sim, read straight from the data. {g.counts.tags} tags · {g.counts.cards} cards · {g.counts.rules} rules. Click a line to open it.</span>
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
            <div className="rs-row-head"><span className="rs-k">{grp.title} <span className="gl-count">{rows.length}</span></span><span className="rs-hint">{grp.blurb}</span></div>
            <div className="gl-list">{rows.map(tagRow)}</div>
          </section>
        );
      })}

      {g.cards.some(c => match(c.name, c.id, c.readout, c.blurb)) && (
        <section className="rs-row">
          <div className="rs-row-head"><span className="rs-k">Cards</span><span className="rs-hint">Rules you pick before a run. Race cards for one race, season cards for a whole league.</span></div>
          <div className="gl-list">
            {g.cards.filter(c => match(c.name, c.id, c.readout, c.blurb)).map(c => (
              <Row key={c.id} id={`card:${c.id}`} open={isOpen(`card:${c.id}`)} onToggle={toggle}
                lead={<span className="gl-plain">{c.emoji} {c.name}</span>}
                note={`${c.scope} · ${c.weight}`}
                pills={<span className="gl-readout">{c.readout}</span>}>
                <p className="gl-desc">{c.blurb}</p>
              </Row>
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
                <Row key={r.id} id={`rule:${r.id}`} open={isOpen(`rule:${r.id}`)} onToggle={toggle}
                  lead={t ? <TagChips tags={[t]} showName /> : r.tagId}
                  note={r.family}
                  pills={<span className="gl-readout">after a race · {describeTrigger(r.when)}</span>}>
                  <p className="gl-desc"><span className="rs-k">After a race</span> {describeTrigger(r.when)}</p>
                  {t && <div className="gl-facts"><Fact k="Lasts">{g.tags.find(x => x.tag.id === t.id)?.lasts ?? '—'}</Fact></div>}
                </Row>
              );
            })}
            {g.inRaceRules.filter(r => match(r.id, r.tagId)).map(r => {
              const t = tagById(r.tagId);
              return (
                <Row key={r.id} id={`rule:${r.id}`} open={isOpen(`rule:${r.id}`)} onToggle={toggle}
                  lead={t ? <TagChips tags={[t]} showName /> : r.tagId}
                  note="in-race"
                  pills={<span className="gl-readout">mid-race · {describeInRaceRule(r)}</span>}>
                  <p className="gl-desc"><span className="rs-k">Mid-race</span> {describeInRaceRule(r)}</p>
                </Row>
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
                <Row key={w.id} id={`wx:${w.id}`} open={isOpen(`wx:${w.id}`)} onToggle={toggle}
                  lead={<span className="gl-plain">{w.emoji} {w.name}</span>}
                  note={`${Math.round(w.weight / total * 100)}%`}
                  pills={<Pills effects={effectsOf(w.baseEffects)} />}>
                  <div className="gl-facts">
                    <Fact k="Odds">{Math.round(w.weight / total * 100)}% of races</Fact>
                    <Fact k="Stamps">{w.conditions.join(', ') || '—'}</Fact>
                  </div>
                </Row>
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
              <Row key={t.id} id={`trk:${t.id}`} open={isOpen(`trk:${t.id}`)} onToggle={toggle}
                lead={<span className="gl-plain">{t.emoji} {t.name}</span>}
                pills={<Pills effects={effectsOf(t.passive ?? {})} />}>
                <div className="gl-facts">
                  <Fact k="Stamps">{(t.conditions ?? []).join(', ') || '—'}</Fact>
                  <Fact k="Tracks">{g.tracks.filter(tr => intrinsicTrackTags(tr.id).some(i => i.id === t.id)).map(tr => `${tr.funEmoji} ${tr.name}`).join(' · ') || '—'}</Fact>
                </div>
              </Row>
            ))}
          </div>
        </section>
      )}

      {g.inflictions.some(i => match(i.name, i.id)) && (
        <section className="rs-row">
          <div className="rs-row-head"><span className="rs-k">Inflictions</span><span className="rs-hint">Mid-race strikes the conditions can land on one driver.</span></div>
          <div className="gl-list">
            {g.inflictions.filter(i => match(i.name, i.id)).map(i => (
              <Row key={i.id} id={`inf:${i.id}`} open={isOpen(`inf:${i.id}`)} onToggle={toggle}
                lead={<span className="gl-plain">{i.emoji} {i.name}</span>}
                note={`needs ${i.requiresCondition.join(', ')}`}
                pills={<Pills effects={effectsOf(i.effects)} />}>
                <p className="gl-desc">{i.activationText}</p>
                <div className="gl-facts">
                  <Fact k="Needs">{i.requiresCondition.join(', ')}</Fact>
                  <Fact k="Lasts">{i.durationTicks} ticks</Fact>
                </div>
              </Row>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
