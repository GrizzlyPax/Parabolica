// The World Deck screen: everything in the universe, rendered from the same
// model as docs/GLOSSARY.md so what you read is what the engine runs.
//
// Tabs at the top, collapsible sections, one line per entry that opens on
// click, a sort for tags, and an Add tab: a drafting space whose drafts
// live in this browser and export as code or as a prompt for an agent.
import { useEffect, useMemo, useState, ReactNode } from 'react';
import { buildGlossary, describeTrigger, describeInRaceRule, effectsOf, GlossaryTag } from './data/glossary';
import { ALL_TAGS, RARITIES, Rarity, Tag, TagTarget, isGenesisTag } from './data/tags';
import { defaultRuleset, describeChance } from './rules/ruleset';
import { intrinsicTrackTags } from './data/trackTags';
import TagChips from './components/race/TagChips';
import { Idea, loadIdeas, saveIdeas, issueUrl, ideasAsPrompt } from './IdeaBox';
import './RunSetup.css';
import './Glossary.css';

interface GlossaryProps { onBack: () => void }

type TabId = 'tags' | 'teams' | 'tracks' | 'cards' | 'rules' | 'conditions' | 'gods' | 'flavour' | 'add' | 'inbox';
const TABS: { id: TabId; label: string }[] = [
  { id: 'tags', label: 'Tags' }, { id: 'teams', label: 'Teams' }, { id: 'tracks', label: 'Tracks' }, { id: 'cards', label: 'Cards' },
  { id: 'rules', label: 'Rules' }, { id: 'conditions', label: 'Weather' }, { id: 'gods', label: 'Gods' }, { id: 'flavour', label: 'Flavour' }, { id: 'inbox', label: '💡 Inbox' }, { id: 'add', label: '+ Add' },
];

const RARITY_ORDER: Record<Rarity, number> = { common: 0, uncommon: 1, rare: 2, legendary: 3 };

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

/** A collapsible section with a count in the header. */
function Section({ id, title, count, hint, collapsed, onToggle, children, extra }: {
  id: string; title: string; count?: number | string; hint?: string; collapsed: boolean; onToggle: (id: string) => void; children: ReactNode; extra?: ReactNode;
}) {
  return (
    <section className={`rs-row gl-section ${collapsed ? 'collapsed' : ''}`}>
      <div className="rs-row-head gl-section-head">
        <button type="button" className="gl-section-toggle" onClick={() => onToggle(id)} aria-expanded={!collapsed}>
          <span className="gl-sec-chev" aria-hidden="true">›</span>
          <span className="rs-k">{title} {count !== undefined && <span className="gl-count">{count}</span>}</span>
          {hint && <span className="rs-hint">{hint}</span>}
        </button>
        {extra && <span className="gl-section-extra">{extra}</span>}
      </div>
      {!collapsed && children}
    </section>
  );
}

const RARITY_HINT = 'Rarity only sets how often the genesis draw finds it.';

// ---------- Add tab: drafts ----------

interface TagDraft { kind: 'tag'; id: string; name: string; emoji: string; description: string; target: TagTarget; rarity: Rarity; speed: number; consistency: number; luck: number; crash: number; pit: number; note: string }
interface TeamDraft { kind: 'team'; id: string; name: string; emoji: string; color: string; accentColor: string; description: string; note: string }
type Draft = TagDraft | TeamDraft;
const DRAFTS_KEY = 'parabolica.worldDeck.drafts';

const slug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const q1 = (s: string) => s.replace(/'/g, "\\'");

function draftToCode(d: Draft): string {
  if (d.kind === 'team') {
    return `  { id: '${d.id}', name: '${q1(d.name)}', emoji: '${d.emoji}', color: '${d.color}', accentColor: '${d.accentColor}',\n    description: '${q1(d.description)}' },`;
  }
  const fx: string[] = [];
  if (d.speed) fx.push(`speedModifier: ${(1 + d.speed / 100).toFixed(3)}`);
  if (d.consistency) fx.push(`consistencyModifier: ${(1 + d.consistency / 100).toFixed(3)}`);
  if (d.luck) fx.push(`luckModifier: ${(1 + d.luck / 100).toFixed(2)}`);
  if (d.crash) fx.push(`crashResistance: ${(d.crash / 100).toFixed(2)}`);
  if (d.pit) fx.push(`pitSpeedModifier: ${(1 + d.pit / 100).toFixed(2)}`);
  return `  {\n    id: '${d.id}',\n    name: '${q1(d.name)}',\n    emoji: '${d.emoji}',\n    description: '${q1(d.description)}',\n    target: '${d.target}',\n    trigger: 'passive',\n    rarity: '${d.rarity}',\n    effects: { ${fx.join(', ')} },\n  },`;
}

function draftFile(d: Draft): string {
  if (d.kind === 'team') return 'src/data/teams.ts → CURRENT_TEAMS';
  return `src/data/tags.ts → ${d.target.toUpperCase()}_TAGS`;
}

function draftPrompt(d: Draft): string {
  return `You are adding content to Parabolica's World Deck. Read docs/WORLD_DECK.md for the rules and docs/GLOSSARY.md to see what exists. Add this ${d.kind} to ${draftFile(d)}, keeping the id unique:\n\n${draftToCode(d)}\n\n${d.note ? `Author's note: ${d.note}\n\n` : ''}Then run \`npm test\` and \`npm run glossary\`, and commit the source file together with docs/GLOSSARY.md. PR title: "World Deck: ${d.kind} — ${d.name}".`;
}

function draftPreviewTag(d: TagDraft): Tag {
  return {
    id: d.id || 'draft', name: d.name || 'Untitled', emoji: d.emoji || '✨', description: d.description, target: d.target, trigger: 'passive', rarity: d.rarity,
    effects: {
      ...(d.speed ? { speedModifier: 1 + d.speed / 100 } : {}), ...(d.consistency ? { consistencyModifier: 1 + d.consistency / 100 } : {}),
      ...(d.luck ? { luckModifier: 1 + d.luck / 100 } : {}), ...(d.crash ? { crashResistance: d.crash / 100 } : {}), ...(d.pit ? { pitSpeedModifier: 1 + d.pit / 100 } : {}),
    },
  };
}

const blankTag = (): TagDraft => ({ kind: 'tag', id: '', name: '', emoji: '', description: '', target: 'driver', rarity: 'common', speed: 0, consistency: 0, luck: 0, crash: 0, pit: 0, note: '' });
const blankTeam = (): TeamDraft => ({ kind: 'team', id: '', name: '', emoji: '', color: '#3671C6', accentColor: '#E63946', description: '', note: '' });

function AddTab() {
  const [drafts, setDrafts] = useState<Draft[]>(() => { try { return JSON.parse(localStorage.getItem(DRAFTS_KEY) ?? '[]'); } catch { return []; } });
  const [d, setD] = useState<Draft>(blankTag);
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => { try { localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts)); } catch { /* private window */ } }, [drafts]);

  const kind = d.kind;
  const set = (patch: Partial<TagDraft> | Partial<TeamDraft>) => setD(prev => ({ ...prev, ...patch } as Draft));
  const problems: string[] = [];
  if (!d.name.trim()) problems.push('needs a name');
  if (!d.emoji.trim()) problems.push('needs an emoji');
  if (!d.description.trim()) problems.push('needs a one-line description');
  if (d.description.length > 110) problems.push('description over 110 characters');
  if (d.kind === 'tag' && ALL_TAGS.some(t => t.id === d.id)) problems.push(`id "${d.id}" already exists`);
  const copy = async (text: string, what: string) => { try { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(null), 1500); } catch { /* no clipboard */ } };
  const save = () => { if (problems.length) return; setDrafts(prev => [{ ...d }, ...prev.filter(x => !(x.kind === d.kind && x.id === d.id))]); setD(kind === 'tag' ? blankTag() : blankTeam()); };

  return (
    <div className="gl-add">
      <section className="rs-row">
        <div className="rs-row-head"><span className="rs-k">Draft a {kind}</span><span className="rs-hint">Drafts stay in this browser. Copy the code into the file, or hand the prompt to an agent — docs/WORLD_DECK.md has the full rules.</span></div>
        <div className="gl-kind">
          {(['tag', 'team'] as const).map(k => <button key={k} type="button" className={`rs-btn ${kind === k ? 'rs-btn-primary' : 'rs-btn-ghost'}`} onClick={() => setD(k === 'tag' ? blankTag() : blankTeam())}>{k}</button>)}
        </div>
        <div className="gl-form">
          <label><span className="rs-k">Name</span><input value={d.name} onChange={e => set({ name: e.target.value, id: slug(e.target.value) })} placeholder={kind === 'tag' ? 'Steady Hands' : 'Breadbowl'} /></label>
          <label><span className="rs-k">Emoji</span><input value={d.emoji} onChange={e => set({ emoji: e.target.value })} placeholder="🧤" maxLength={4} /></label>
          <label className="gl-wide"><span className="rs-k">One line</span><input value={d.description} onChange={e => set({ description: e.target.value })} placeholder={kind === 'tag' ? 'Rarely puts a wheel wrong' : 'Sourdough starters with names, carb worship, "she\'s been fermenting for six years."'} /></label>
          {d.kind === 'tag' && (
            <>
              <label><span className="rs-k">On</span><select value={d.target} onChange={e => set({ target: e.target.value as TagTarget })}><option value="driver">driver</option><option value="car">car</option><option value="team">team</option></select></label>
              <label><span className="rs-k">Rarity</span><select value={d.rarity} onChange={e => set({ rarity: e.target.value as Rarity })}>{RARITIES.map(r => <option key={r} value={r}>{r}</option>)}</select></label>
              {([['speed', 'Speed %', -5, 5], ['consistency', 'Consistency %', -8, 8], ['luck', 'Luck %', -20, 20], ['crash', 'Crash safety %', -15, 15], ['pit', 'Pit time %', -25, 25]] as const).map(([k, label, min, max]) => (
                <label key={k}><span className="rs-k">{label}</span><input type="number" step={1} min={min} max={max} value={d[k]} onChange={e => set({ [k]: Number(e.target.value) } as Partial<TagDraft>)} /></label>
              ))}
            </>
          )}
          {d.kind === 'team' && (
            <>
              <label><span className="rs-k">Colour</span><input type="color" value={d.color} onChange={e => set({ color: e.target.value })} /></label>
              <label><span className="rs-k">Accent</span><input type="color" value={d.accentColor} onChange={e => set({ accentColor: e.target.value })} /></label>
            </>
          )}
          <label className="gl-wide"><span className="rs-k">Note to the builder</span><input value={d.note} onChange={e => set({ note: e.target.value })} placeholder="optional — the story behind it, a number you want the lab to check" /></label>
        </div>
        <div className="gl-preview">
          <span className="rs-k">Preview</span>
          {d.kind === 'tag'
            ? <><TagChips tags={[draftPreviewTag(d)]} showName /> <Pills effects={effectsOf(draftPreviewTag(d).effects)} /></>
            : <span className="gl-plain"><span className="gl-swatch" style={{ background: d.color, boxShadow: `inset 0 0 0 2px ${d.accentColor}` }} />{d.emoji || '✨'} {d.name || 'Untitled'}</span>}
          <span className="gl-note">{problems.length ? problems.join(' · ') : `goes in ${draftFile(d)}`}</span>
        </div>
        <div className="gl-actions">
          <button type="button" className="rs-btn rs-btn-primary" disabled={problems.length > 0} onClick={save}>Save draft</button>
          <button type="button" className="rs-btn rs-btn-ghost" disabled={problems.length > 0} onClick={() => copy(draftToCode(d), 'code')}>{copied === 'code' ? 'Copied' : 'Copy as code'}</button>
          <button type="button" className="rs-btn rs-btn-ghost" disabled={problems.length > 0} onClick={() => copy(draftPrompt(d), 'prompt')}>{copied === 'prompt' ? 'Copied' : 'Copy prompt for an agent'}</button>
        </div>
      </section>

      {drafts.length > 0 && (
        <section className="rs-row">
          <div className="rs-row-head"><span className="rs-k">Your drafts <span className="gl-count">{drafts.length}</span></span><span className="rs-hint">Saved in this browser only.</span>
            <span className="gl-section-extra"><button type="button" className="rs-link" onClick={() => copy(drafts.map(draftPrompt).join('\n\n---\n\n'), 'all')}>{copied === 'all' ? 'Copied' : 'Copy all as one prompt'}</button></span></div>
          <div className="gl-list">
            {drafts.map(x => (
              <div key={`${x.kind}:${x.id}`} className="gl-row">
                <div className="gl-line gl-line-static">
                  <span className="gl-lead">{x.kind === 'tag' ? <TagChips tags={[draftPreviewTag(x)]} showName /> : <span className="gl-plain">{x.emoji} {x.name}</span>}</span>
                  <span className="gl-note">{x.kind}{x.kind === 'tag' ? ` · ${x.target} · ${x.rarity}` : ''}</span>
                  <span className="gl-pills"><span className="gl-readout">{x.description}</span></span>
                  <span className="gl-draft-actions">
                    <button type="button" className="rs-link" onClick={() => setD(x)}>edit</button>
                    <button type="button" className="rs-link" onClick={() => copy(draftToCode(x), x.id)}>{copied === x.id ? 'copied' : 'code'}</button>
                    <button type="button" className="rs-link" onClick={() => setDrafts(prev => prev.filter(y => y !== x))}>delete</button>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rs-row">
        <div className="rs-row-head"><span className="rs-k">How adding works</span></div>
        <ol className="gl-roll">
          <li><b>Draft here</b> or write it straight into the file named in <code>docs/WORLD_DECK.md</code> (one shape per content type, every field explained).</li>
          <li><b>Copy as code</b> pastes into that file; <b>Copy prompt</b> hands the whole job to an agent.</li>
          <li><b>Check</b>: <code>npm test</code> catches bad ids, missing fields, out-of-range numbers. <b>Regenerate</b>: <code>npm run glossary</code> updates this deck.</li>
          <li><b>Commit</b> the source file with <code>docs/GLOSSARY.md</code>. Done — it is in the world.</li>
        </ol>
      </section>
    </div>
  );
}

// ---------- Inbox tab: captured ideas ----------

function InboxTab() {
  const [ideas, setIdeas] = useState<Idea[]>(loadIdeas);
  const [copied, setCopied] = useState(false);
  useEffect(() => saveIdeas(ideas), [ideas]);
  const pending = ideas.filter(i => !i.sent);
  const copyAll = async () => { try { await navigator.clipboard.writeText(ideasAsPrompt(pending.length ? pending : ideas)); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* no clipboard */ } };
  return (
    <section className="rs-row">
      <div className="rs-row-head"><span className="rs-k">Idea inbox <span className="gl-count">{pending.length} waiting</span></span><span className="rs-hint">Captured with the 💡 button (⌘⇧I) on any screen. Send each to GitHub, or copy the batch for an agent to triage.</span>
        {ideas.length > 0 && <span className="gl-section-extra"><button type="button" className="rs-link" onClick={copyAll}>{copied ? 'Copied' : 'Copy as a prompt'}</button></span>}</div>
      {ideas.length === 0 && <p className="gl-desc">Nothing yet. Reading the deck and something sparks? Hit 💡 and write two sentences — the screen, seed and track come along.</p>}
      <div className="gl-list">
        {ideas.map(i => (
          <div key={i.id} className={`gl-row ${i.sent ? 'gl-sent' : ''}`}>
            <div className="gl-line gl-line-static gl-idea">
              <span className="gl-note">{i.kind}</span>
              <span className="gl-idea-text">{i.text}</span>
              <span className="gl-note">{i.context.screen}{i.context.track ? ` · ${i.context.track}` : ''} · {new Date(i.at).toLocaleDateString()}</span>
              <span className="gl-draft-actions">
                {i.sent ? <span className="gl-note">sent</span> : <a className="rs-link" href={issueUrl(i)} target="_blank" rel="noopener" onClick={() => setIdeas(prev => prev.map(x => x.id === i.id ? { ...x, sent: true } : x))}>send to GitHub</a>}
                <button type="button" className="rs-link" onClick={() => setIdeas(prev => prev.filter(x => x.id !== i.id))}>delete</button>
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------- The deck ----------

export default function Glossary({ onBack }: GlossaryProps) {
  const g = useMemo(() => buildGlossary(), []);
  const rs = useMemo(() => defaultRuleset(), []);
  const [tab, setTab] = useState<TabId>('tags');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  // Sections start collapsed. `mode` is the baseline; `flipped` are the
  // exceptions the user toggled, so Collapse all / Expand all are one click.
  const [mode, setMode] = useState<'collapsed' | 'expanded'>('collapsed');
  const [flipped, setFlipped] = useState<Set<string>>(() => new Set());
  const [tagSort, setTagSort] = useState<'rarity' | 'name' | 'effect'>('rarity');
  const toggle = (id: string) => setOpen(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleSection = (id: string) => setFlipped(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const isCollapsed = (id: string) => (mode === 'collapsed') !== flipped.has(id);
  const setAll = (m: 'collapsed' | 'expanded') => { setMode(m); setFlipped(new Set()); };
  const needle = q.trim().toLowerCase();
  const match = (...parts: (string | undefined)[]) => !needle || parts.some(p => p?.toLowerCase().includes(needle));
  const tagById = (id: string) => ALL_TAGS.find(t => t.id === id);
  const isOpen = (id: string) => open.has(id);
  const sec = (id: string) => ({ id, collapsed: isCollapsed(id), onToggle: toggleSection });

  const sortTags = (rows: GlossaryTag[]) => [...rows].sort((a, b) =>
    tagSort === 'name' ? a.tag.name.localeCompare(b.tag.name)
      : tagSort === 'effect' ? b.effects.length - a.effects.length || a.tag.name.localeCompare(b.tag.name)
      : RARITY_ORDER[a.tag.rarity] - RARITY_ORDER[b.tag.rarity] || a.tag.name.localeCompare(b.tag.name));

  const tagRow = (t: GlossaryTag) => (
    <Row key={t.tag.id} id={`tag:${t.tag.id}`} open={isOpen(`tag:${t.tag.id}`)} onToggle={toggle}
      lead={<TagChips tags={[t.tag]} showName />}
      note={<>{isGenesisTag(t.tag) ? <span className={`rarity-word rarity-${t.tag.rarity}`}>{t.tag.rarity}</span> : t.tag.target}{t.does.length > 0 && <span className="gl-does" title="Does something after a race">⚡</span>}</>}
      pills={<Pills effects={t.effects} />}>
      <p className="gl-desc">{t.tag.description}</p>
      <div className="gl-facts">
        <Fact k="On">{t.tag.target}</Fact>
        {isGenesisTag(t.tag) && <Fact k="Rarity"><span className={`rarity-word rarity-${t.tag.rarity}`}>{t.tag.rarity}</span></Fact>}
        <Fact k="Fires">{t.fires}</Fact>
        <Fact k="Lasts">{t.lasts}</Fact>
        {t.does.length > 0 && <Fact k="After a race">{t.does.join(' · ')}</Fact>}
      </div>
      <div className="gl-src">{t.source}</div>
    </Row>
  );

  const genesisGroups: { id: TagTarget; title: string; hint: string }[] = [
    { id: 'driver', title: 'Driver tags', hint: 'Who they are behind the wheel. One slot at birth.' },
    { id: 'car', title: 'Car tags', hint: 'What the chassis is like. One slot at birth, per car.' },
    { id: 'team', title: 'Team tags', hint: 'The garage and the crew. One slot at birth, shared by teammates.' },
  ];
  const tagGroups: { id: string; title: string; hint: string; rows: GlossaryTag[] }[] = [
    ...genesisGroups.map(grp => {
      const rows = g.tags.filter(t => t.group === 'genesis' && t.tag.target === grp.id);
      const dist = RARITIES.map(r => `${rows.filter(t => t.tag.rarity === r).length} ${r}`).join(' · ');
      return { id: grp.id, title: grp.title, hint: `${grp.hint} ${dist}. ${RARITY_HINT}`, rows };
    }),
    { id: 'acquired', title: 'Acquired tags', hint: 'Awarded after a race for what happened in it. Take effect next race.', rows: g.tags.filter(t => t.group === 'acquired') },
    { id: 'in-race', title: 'In-race tags', hint: 'Picked up mid-race. Expire by lap, at the next stop, or at the flag.', rows: g.tags.filter(t => t.group === 'in-race') },
    { id: 'condition', title: 'Condition tags', hint: 'Stamped by track events for one race only.', rows: g.tags.filter(t => t.group === 'condition') },
  ];
  const sortControl = (
    <select className="gl-sort" value={tagSort} onChange={e => setTagSort(e.target.value as typeof tagSort)} aria-label="Sort tags">
      <option value="rarity">sort: rarity</option><option value="name">sort: A–Z</option><option value="effect">sort: most effects</option>
    </select>
  );

  const teamGroups = [{ id: 'current', title: 'Teams', rows: g.teams, hint: 'The tribes. Two drivers each; the colours are the livery.' }, { id: 'historic', title: 'Historic teams', rows: g.historicTeams, hint: 'Unlockable.' }];
  const trackGroups = [{ id: 'current', title: 'Tracks', rows: g.tracks, hint: 'Every circuit is a pun. Laps × length sets the race; layout sets the shape.' }, { id: 'historic', title: 'Historic tracks', rows: g.historicTracks, hint: 'Unlockable.' }];

  return (
    <div className="run-setup glossary">
      <header className="rs-top">
        <div className="rs-title-block">
          <button type="button" className="rs-back" onClick={onBack}>← Menu</button>
          <h1 className="rs-title">World Deck</h1>
          <span className="rs-sub">Everything in the world, read straight from the data. {g.counts.teams} teams · {g.counts.tracks} tracks · {g.counts.tags} tags · {g.counts.cards} cards · {g.counts.gods} gods. Click a line to open it.</span>
        </div>
        <label className="gl-search">
          <span className="rs-k">Find</span>
          <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="rain, pit, haunted…" />
        </label>
      </header>

      <nav className="gl-tabs" aria-label="World Deck sections">
        {TABS.map(t => <button key={t.id} type="button" className={`gl-tab ${tab === t.id ? 'on' : ''} ${t.id === 'add' ? 'gl-tab-add' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>)}
        {tab !== 'add' && tab !== 'inbox' && (
          <span className="gl-fold">
            <button type="button" className="rs-link" onClick={() => setAll('expanded')}>Expand all</button>
            <button type="button" className="rs-link" onClick={() => setAll('collapsed')}>Collapse all</button>
          </span>
        )}
      </nav>

      {tab === 'tags' && (
        <>
          <Section {...sec('roll')} title="How a driver is born with tags" hint="Three slots: driver, car (their own chassis), team (shared with their teammate).">
            <ol className="gl-roll">
              <li><b>Does the slot hit?</b> {describeChance(rs.tags.genesisChance)}.</li>
              <li><b>Which bucket?</b> {RARITIES.map((r, i) => <span key={r}>{i > 0 && ' · '}{rs.tags.rarityOdds[r]}% <span className={`rarity-word rarity-${r}`}>{r}</span></span>)}. Fixed odds — more tags in a bucket just means more variety, not more of that bucket.</li>
              <li><b>Which tag?</b> An even pick inside the bucket.</li>
            </ol>
          </Section>
          {tagGroups.map(grp => {
            const rows = sortTags(grp.rows.filter(t => match(t.tag.name, t.tag.id, t.tag.description, t.fires, t.source)));
            if (!rows.length) return null;
            return (
              <Section key={grp.id} {...sec(`tags:${grp.id}`)} title={grp.title} count={grp.rows.length} hint={grp.hint} extra={sortControl}>
                <div className="gl-list">{rows.map(tagRow)}</div>
              </Section>
            );
          })}
        </>
      )}

      {tab === 'teams' && teamGroups.map(grp => {
        const rows = grp.rows.filter(t => match(t.name, t.id, t.description));
        if (!rows.length) return null;
        return (
          <Section key={grp.id} {...sec(`teams:${grp.id}`)} title={grp.title} count={grp.rows.length} hint={grp.hint}>
            <div className="gl-list">
              {rows.map(t => (
                <Row key={t.id} id={`team:${t.id}`} open={isOpen(`team:${t.id}`)} onToggle={toggle}
                  lead={<span className="gl-plain"><span className="gl-swatch" style={{ background: t.color, boxShadow: `inset 0 0 0 2px ${t.accentColor}` }} />{t.emoji} {t.name}</span>}
                  pills={<span className="gl-readout">{t.description}</span>}>
                  <p className="gl-desc">{t.description}</p>
                  <div className="gl-facts"><Fact k="Colours">{t.color} / {t.accentColor}</Fact><Fact k="Id">{t.id}</Fact></div>
                </Row>
              ))}
            </div>
          </Section>
        );
      })}

      {tab === 'tracks' && trackGroups.map(grp => {
        const rows = grp.rows.filter(t => match(t.name, t.id, t.description));
        if (!rows.length) return null;
        return (
          <Section key={grp.id} {...sec(`tracks:${grp.id}`)} title={grp.title} count={grp.rows.length} hint={grp.hint}>
            <div className="gl-list">
              {rows.map(t => (
                <Row key={t.id} id={`track:${t.id}`} open={isOpen(`track:${t.id}`)} onToggle={toggle}
                  lead={<span className="gl-plain">{t.emoji} {t.funEmoji} {t.name}</span>}
                  note={`${t.laps} laps · ${t.length}m`}
                  pills={<span className="gl-readout">{t.description}</span>}>
                  <p className="gl-desc">{t.description}</p>
                  <div className="gl-facts">
                    <Fact k="Layout">{t.layout.id}</Fact>
                    <Fact k="Character">{intrinsicTrackTags(t.id).map(x => `${x.emoji} ${x.name}`).join(', ') || '—'}</Fact>
                    <Fact k="Event">{t.event ? `${t.event.emoji} ${t.event.name}` : 'none yet'}</Fact>
                  </div>
                </Row>
              ))}
            </div>
          </Section>
        );
      })}

      {tab === 'cards' && (
        <Section {...sec('cards')} title="Cards" count={g.cards.length} hint="Rules you pick before a run. Race cards for one race, season cards for a whole league.">
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
        </Section>
      )}

      {tab === 'rules' && (
        <Section {...sec('rules')} title="Rules" count={g.acquisitionRules.length + g.inRaceRules.length} hint="How the sim hands out tags.">
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
        </Section>
      )}

      {tab === 'conditions' && (
        <>
          <Section {...sec('weather')} title="Weather" count={g.weather.length} hint="Rolled per race. Odds are the defaults; cards change them.">
            <div className="gl-list">
              {g.weather.filter(w => match(w.name, w.id)).map(w => {
                const total = g.weather.reduce((s, x) => s + x.weight, 0);
                return (
                  <Row key={w.id} id={`wx:${w.id}`} open={isOpen(`wx:${w.id}`)} onToggle={toggle}
                    lead={<span className="gl-plain">{w.emoji} {w.name}</span>}
                    note={`${Math.round(w.weight / total * 100)}%`}
                    pills={<Pills effects={effectsOf(w.baseEffects)} />}>
                    <div className="gl-facts"><Fact k="Odds">{Math.round(w.weight / total * 100)}% of races</Fact><Fact k="Stamps">{w.conditions.join(', ') || '—'}</Fact></div>
                  </Row>
                );
              })}
            </div>
          </Section>
          <Section {...sec('characters')} title="Track characters" count={g.trackTags.length} hint="A circuit's intrinsic lean, field-wide.">
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
          </Section>
          <Section {...sec('inflictions')} title="Inflictions" count={g.inflictions.length} hint="Mid-race strikes the conditions can land on one driver.">
            <div className="gl-list">
              {g.inflictions.filter(i => match(i.name, i.id)).map(i => (
                <Row key={i.id} id={`inf:${i.id}`} open={isOpen(`inf:${i.id}`)} onToggle={toggle}
                  lead={<span className="gl-plain">{i.emoji} {i.name}</span>}
                  note={`needs ${i.requiresCondition.join(', ')}`}
                  pills={<Pills effects={effectsOf(i.effects)} />}>
                  <p className="gl-desc">{i.activationText}</p>
                  <div className="gl-facts"><Fact k="Needs">{i.requiresCondition.join(', ')}</Fact><Fact k="Lasts">~{Math.round(i.durationTicks / 10)}s</Fact></div>
                </Row>
              ))}
            </div>
          </Section>
        </>
      )}

      {tab === 'gods' && (
        <Section {...sec('gods')} title="Gods" count={g.gods.length} hint="A league picks a patron at founding. Appetites and smiting come later.">
          <div className="gl-list">
            {g.gods.filter(d => match(d.name, d.id, d.hunger, d.appetite)).map(d => (
              <Row key={d.id} id={`god:${d.id}`} open={isOpen(`god:${d.id}`)} onToggle={toggle}
                lead={<span className="gl-plain">{d.emoji} {d.name}</span>}
                note={d.epithet}
                pills={<span className="gl-readout">{d.appetite}</span>}>
                <p className="gl-desc">“{d.hunger}”</p>
              </Row>
            ))}
          </div>
        </Section>
      )}

      {tab === 'flavour' && (
        <Section {...sec('pools')} title="Flavour pools" count={g.pools.length} hint="Names, backstories, quirks — plain lists. docs/WORLD_DECK.md says how to add.">
          <div className="gl-list">
            {g.pools.filter(p => match(p.title, ...p.samples)).map(p => (
              <Row key={p.id} id={`pool:${p.id}`} open={isOpen(`pool:${p.id}`)} onToggle={toggle}
                lead={<span className="gl-plain">{p.title}</span>}
                note={`${p.size}`}
                pills={<span className="gl-readout">{p.samples.slice(0, 5).join(' · ')}</span>}>
                <p className="gl-desc">{p.samples.join(' · ')}{p.size > p.samples.length ? ` · … ${p.size - p.samples.length} more` : ''}</p>
                <div className="gl-src">{p.where}</div>
              </Row>
            ))}
          </div>
        </Section>
      )}

      {tab === 'add' && <AddTab />}
      {tab === 'inbox' && <InboxTab />}
    </div>
  );
}
