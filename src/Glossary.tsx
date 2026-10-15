// The World Deck screen: everything in the universe, rendered from the same
// model as docs/GLOSSARY.md so what you read is what the engine runs.
//
// Tabs at the top, collapsible sections, one line per entry that opens on
// click, and an Add tab: a drafting space whose drafts live in this browser
// and export as code or as a prompt for an agent.
import { useEffect, useMemo, useState, ReactNode } from 'react';
import { levelDelta } from './season/grades';
import { favourText } from './cards/favourText';
import { PLAYER_CARD_SCALE } from './season/stamps';
import { buildGlossary, describeInRaceEffect, effectsOf } from './data/glossary';
import { RARITIES } from './cards/rarity';
import { defaultRuleset, describeChance } from './rules/ruleset';
import { Idea, loadIdeas, saveIdeas, issueUrl, ideasAsPrompt } from './IdeaBox';
import { GameIcon, TeamLogo } from './icons/GameIcon';
import { TEAM_KINDS } from './data/deckTeams';
import { BASE_DECK_TRACKS } from './data/deckTracks';
import { BASE_DECK_WEATHER } from './data/deckWeather';
import type { CardStat } from './cards';
import { STAT_ICONS } from './icons/registry';
import { MOTORSPORT_DECK, METAL_LADDER, cardsBy, STAT_LABELS, type Card } from './cards';
import { CardFace } from './cards/CardFace';
import { Bunting, Chequer, ProgramLine, StepTheme } from './look/Look';
import { programNo } from './MainMenu';
import { version } from '../package.json';
import './RunSetup.css';
import './Glossary.css';
import './season/ui/Season.css';

interface GlossaryProps {
  onBack: () => void;
  /** The tab in the URL (#186): /#/world-deck/<slug>. */
  tab?: string;
  onTabChange?: (slug: string) => void;
}

type TabId = 'deck' | 'teams' | 'tracks' | 'cards' | 'rules' | 'conditions' | 'states' | 'flavour' | 'add' | 'inbox';
/** URL slugs for the tabs (#186). */
const TAB_SLUG: Record<TabId, string> = {
  deck: 'cards', teams: 'teams', tracks: 'tracks', cards: 'rule-cards', rules: 'rules', conditions: 'weather', states: 'states', flavour: 'flavour', add: 'add', inbox: 'inbox',
};
const tabFromSlug = (slug?: string): TabId => (Object.keys(TAB_SLUG) as TabId[]).find(k => TAB_SLUG[k] === slug) ?? 'deck';

const TABS: { id: TabId; label: string }[] = [
  { id: 'deck', label: 'Cards' }, { id: 'teams', label: 'Teams' }, { id: 'tracks', label: 'Tracks' }, { id: 'cards', label: 'Rule cards' },
  { id: 'rules', label: 'Effects' }, { id: 'conditions', label: 'Weather' }, { id: 'states', label: 'States' }, { id: 'flavour', label: 'Flavour' }, { id: 'inbox', label: 'Inbox' }, { id: 'add', label: '+ Add' },
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

const IN_SIM = 'Adds grade points to the stat at race build.';
const NOT_YET_TRACK = 'Every race and season calendar draws from these.';

function FavourIcons({ favours }: { favours: CardStat[] }) {
  return <span className="card-marks">{favours.map(f => <GameIcon key={f.stat} name={STAT_ICONS[f.stat]} size={16} title={STAT_LABELS[f.stat]} />)}</span>;
}
/** A deck card as the run deals it to you (#623: card text in levels at 3×). */
const asDealt = (c: Card): Card => (c.kind === 'effect' ? c : { ...c, stats: c.stats.map(x => ({ ...x, pct: x.pct * PLAYER_CARD_SCALE })) });
const DECK_GROUPS: { id: string; title: string; hint: string; rows: Card[] }[] = [
  { id: 'equipment', title: 'Equipment', hint: `Driver gear: one slot, swappable (Season Mode packs). ${IN_SIM}`, rows: cardsBy({ kind: 'equipment' }) },
  { id: 'upgrade', title: 'Upgrades', hint: `Car gear: one slot (Season Mode packs). ${IN_SIM}`, rows: cardsBy({ kind: 'upgrade' }) },
  { id: 'facility', title: 'Facilities', hint: `Team gear: one slot, helps both drivers (Season Mode packs). ${IN_SIM}`, rows: cardsBy({ kind: 'facility' }) },
  { id: 'trait-driver', title: 'Driver traits', hint: `Permanent. What a driver is born with. ${IN_SIM}`, rows: cardsBy({ kind: 'trait', target: 'driver' }) },
  { id: 'trait-car', title: 'Car traits', hint: `Permanent. What a chassis is born with. ${IN_SIM}`, rows: cardsBy({ kind: 'trait', target: 'car' }) },
  { id: 'trait-team', title: 'Team traits', hint: `Permanent, shared by teammates. ${IN_SIM}`, rows: cardsBy({ kind: 'trait', target: 'team' }) },
  { id: 'effect', title: 'Effects (v0.6)', hint: 'Timed, dealt by the race (a lightning pit, crash damage). Size comes from the moment. Arrive in v0.6.', rows: cardsBy({ kind: 'effect' }) },
];

// ---------- Add tab: drafts ----------

interface TeamDraft { kind: 'team'; id: string; name: string; emoji: string; color: string; description: string; note: string }
type Draft = TeamDraft;
const DRAFTS_KEY = 'parabolica.worldDeck.drafts';

const slug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const q1 = (s: string) => s.replace(/'/g, "\\'");

function draftToCode(d: Draft): string {
  return `  { id: '${d.id}', name: '${q1(d.name)}', kind: 'privateer', emoji: '${d.emoji}', iconId: 'race-car', color: '${d.color}', ink: '#FFFFFF',\n    description: '${q1(d.description)}' },`;
}

function draftFile(_d: Draft): string {
  return 'src/data/deckTeams.ts → BASE_DECK_TEAMS';
}

function draftPrompt(d: Draft): string {
  return `You are adding content to Parabolica's World Deck. Read docs/WORLD_DECK.md for the rules and docs/GLOSSARY.md to see what exists. Add this ${d.kind} to ${draftFile(d)}, keeping the id unique:\n\n${draftToCode(d)}\n\n${d.note ? `Author's note: ${d.note}\n\n` : ''}Then run \`npm test\` and \`npm run glossary\`, and commit the source file together with docs/GLOSSARY.md. PR title: "World Deck: add ${d.kind} ${d.name}".`;
}

const blankTeam = (): TeamDraft => ({ kind: 'team', id: '', name: '', emoji: '', color: '#3671C6', description: '', note: '' });

function AddTab() {
  const [drafts, setDrafts] = useState<Draft[]>(() => { try { return JSON.parse(localStorage.getItem(DRAFTS_KEY) ?? '[]'); } catch { return []; } });
  const [d, setD] = useState<Draft>(blankTeam);
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => { try { localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts)); } catch { /* private window */ } }, [drafts]);

  const kind = d.kind;
  const set = (patch: Partial<TeamDraft>) => setD(prev => ({ ...prev, ...patch }));
  const problems: string[] = [];
  if (!d.name.trim()) problems.push('needs a name');
  if (!d.emoji.trim()) problems.push('needs an emoji');
  if (!d.description.trim()) problems.push('needs a one-line description');
  if (d.description.length > 110) problems.push('description over 110 characters');
  const copy = async (text: string, what: string) => { try { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(null), 1500); } catch { /* no clipboard */ } };
  const save = () => { if (problems.length) return; setDrafts(prev => [{ ...d }, ...prev.filter(x => !(x.kind === d.kind && x.id === d.id))]); setD(blankTeam()); };

  return (
    <div className="gl-add">
      <section className="rs-row">
        <div className="rs-row-head"><span className="rs-k">Draft a {kind}</span><span className="rs-hint">Drafts stay in this browser. Copy the code into the file, or hand the prompt to an agent — docs/WORLD_DECK.md has the full rules.</span></div>
        <div className="gl-form">
          <label><span className="rs-k">Name</span><input value={d.name} onChange={e => set({ name: e.target.value, id: slug(e.target.value) })} placeholder="Breadbowl" /></label>
          <label><span className="rs-k">Emoji</span><input value={d.emoji} onChange={e => set({ emoji: e.target.value })} placeholder="one emoji, for now" maxLength={4} /></label>
          <label className="gl-wide"><span className="rs-k">One line</span><input value={d.description} onChange={e => set({ description: e.target.value })} placeholder='Sourdough starters with names, carb worship, "she has been fermenting for six years."' /></label>
          {d.kind === 'team' && (
            <>
              <label><span className="rs-k">Colour</span><input type="color" value={d.color} onChange={e => set({ color: e.target.value })} /></label>
            </>
          )}
          <label className="gl-wide"><span className="rs-k">Note to the builder</span><input value={d.note} onChange={e => set({ note: e.target.value })} placeholder="optional — the story behind it, a number you want the lab to check" /></label>
        </div>
        <div className="gl-preview">
          <span className="rs-k">Preview</span>
          <span className="gl-plain"><span className="gl-swatch" style={{ background: d.color }} />{d.emoji} {d.name || 'Untitled'}</span>
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
                  <span className="gl-lead"><span className="gl-plain">{x.emoji} {x.name}</span></span>
                  <span className="gl-note">{x.kind}</span>
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
      <div className="rs-row-head"><span className="rs-k">Idea inbox <span className="gl-count">{pending.length} waiting</span></span><span className="rs-hint">Captured with the idea button (⌘⇧I) on any screen. Send each to GitHub, or copy the batch for an agent to triage.</span>
        {ideas.length > 0 && <span className="gl-section-extra"><button type="button" className="rs-link" onClick={copyAll}>{copied ? 'Copied' : 'Copy as a prompt'}</button></span>}</div>
      {ideas.length === 0 && <p className="gl-desc">Nothing yet. Reading the deck and something sparks? Hit the idea button and write two sentences — the screen, seed and track come along.</p>}
      <div className="gl-list">
        {ideas.map(i => (
          <div key={i.id} className={`gl-row ${i.sent ? 'gl-sent' : ''}`}>
            <div className="gl-line gl-line-static gl-idea">
              <span className="gl-note">{i.kind}</span>
              <span className="gl-idea-text">{i.text}</span>
              <span className="gl-note">{i.context.screen}{i.context.track ? ` · ${i.context.track}` : ''} · {new Date(i.at).toLocaleDateString()}</span>
              <span className="gl-draft-actions">
                <a className="rs-link" href={issueUrl(i)} target="_blank" rel="noopener" onClick={() => setIdeas(prev => prev.map(x => x.id === i.id ? { ...x, sent: true } : x))}>{i.sent ? 'resend' : 'send to GitHub'}</a>
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

export default function Glossary({ onBack, tab: tabSlug, onTabChange }: GlossaryProps) {
  const g = useMemo(() => buildGlossary(), []);
  const rs = useMemo(() => defaultRuleset(), []);
  const [localTab, setLocalTab] = useState<TabId>(() => tabFromSlug(tabSlug));
  const tab = onTabChange ? tabFromSlug(tabSlug) : localTab;
  const setTab = (t: TabId) => (onTabChange ? onTabChange(TAB_SLUG[t]) : setLocalTab(t));
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  // Sections start collapsed. `mode` is the baseline; `flipped` are the
  // exceptions the user toggled, so Collapse all / Expand all are one click.
  const [mode, setMode] = useState<'collapsed' | 'expanded'>('collapsed');
  const [flipped, setFlipped] = useState<Set<string>>(() => new Set());
  const toggle = (id: string) => setOpen(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleSection = (id: string) => setFlipped(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  // The retiring grid stays folded even on "Expand all"; open it by hand (#402).
  const STAY_FOLDED = new Set<string>();
  const staysFolded = (id: string) => STAY_FOLDED.has(id) || id === 'roll';
  const isCollapsed = (id: string) => (staysFolded(id) || mode === 'collapsed') !== flipped.has(id);
  const setAll = (m: 'collapsed' | 'expanded') => { setMode(m); setFlipped(new Set()); };
  const needle = q.trim().toLowerCase();
  const match = (...parts: (string | undefined)[]) => !needle || parts.some(p => p?.toLowerCase().includes(needle));
  const isOpen = (id: string) => open.has(id);
  const sec = (id: string) => ({ id, collapsed: isCollapsed(id), onToggle: toggleSection });

  const deckTeamGroups = TEAM_KINDS.map(k => ({ id: k.kind, title: k.title, rows: g.deckTeams.filter(t => t.kind === k.kind), hint: `${k.hint} Quick Race draws its 11 and Season Mode its CPU teams from these.` }));

  return (
    <StepTheme step="nationals" className="ace-page glossary">
      <Bunting />
      <ProgramLine left="The World Deck" right={`No. ${programNo(version)} · 10¢`} />
      <header className="gl-head">
        <div className="gl-head-text">
          <button type="button" className="ace-link" onClick={onBack}>Menu</button>
          <h1 className="ace-h1">The World Deck</h1>
          <p className="ace-sub">Everything in the world, read straight from the data. {MOTORSPORT_DECK.length} cards · {g.counts.deckTeams} teams · {g.counts.deckTracks} tracks · {g.counts.deckWeather} weathers · {g.places.length} states · {g.counts.inRaceEffects} in-race effects · {g.counts.cards} rule cards. Click a line to open it.</p>
        </div>
        <label className="gl-search">
          <span className="rs-k">Find</span>
          <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="speed, pit, damaged…" />
        </label>
      </header>
      <Chequer />

      <nav className="gl-tabs" aria-label="World Deck sections">
        {TABS.map(t => <button key={t.id} type="button" className={`gl-tab ${tab === t.id ? 'on' : ''} ${t.id === 'add' ? 'gl-tab-add' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>)}
        {tab !== 'add' && tab !== 'inbox' && (
          <span className="gl-fold">
            <button type="button" className="rs-link" onClick={() => setAll('expanded')}>Expand all</button>
            <button type="button" className="rs-link" onClick={() => setAll('collapsed')}>Collapse all</button>
          </span>
        )}
      </nav>

      {tab === 'deck' && DECK_GROUPS.map(grp => {
        const rows = grp.rows.filter(c => match(c.name, c.id, c.kind, c.rarity, ...c.stats.map(x => STAT_LABELS[x.stat])));
        if (!rows.length) return null;
        return (
          <Section key={grp.id} {...sec(`deck:${grp.id}`)} title={grp.title} count={grp.rows.length} hint={grp.hint}>
            <div className="gl-binder">{rows.map(c => <CardFace key={c.id} card={asDealt(c)} />)}</div>
          </Section>
        );
      })}

      {tab === 'deck' && (
        <Section {...sec('roll')} title="How a driver is born with cards" hint="Three slots: driver, car (their own chassis), team (shared with their teammate). Every race deals trait cards from the deck above and bakes them into the stats.">
          <ol className="gl-roll">
            <li><b>Does the slot hit?</b> {describeChance(rs.traits.genesisChance)}.</li>
            <li><b>Which metal?</b> {RARITIES.map((r, i) => <span key={r}>{i > 0 && ' · '}{rs.traits.rarityOdds[r]}% <span className={`rarity-word rarity-${r}`}>{r}</span></span>)}. Fixed odds — more cards in a metal just means more variety, not more of that metal.</li>
            <li><b>Which card?</b> An even pick among that metal's trait cards for the slot.</li>
            <li><b>What it adds:</b> {RARITIES.map((r, i) => <span key={r}>{i > 0 && ' · '}<span className={`rarity-word rarity-${r}`}>{r}</span> {METAL_LADDER[r].stats} stat{METAL_LADDER[r].stats > 1 ? 's' : ''} × {levelDelta(METAL_LADDER[r].pct * PLAYER_CARD_SCALE)}</span>)} levels on your cards in a run (the deck's grade points × {PLAYER_CARD_SCALE}; 5 points a level), at race build.</li>
          </ol>
        </Section>
      )}

      {tab === 'teams' && deckTeamGroups.map(grp => {
        const rows = grp.rows.filter(t => match(t.name, t.id, t.description, t.kind));
        if (!rows.length) return null;
        return (
          <Section key={grp.id} {...sec(`teams:${grp.id}`)} title={grp.title} count={grp.rows.length} hint={grp.hint}>
            <div className="rt-scroll">
              <table className="rt rt-compact gl-teams">
                <thead><tr><th className="rt-name">Team</th><th className="gl-tcol">Colour</th><th className="gl-tline">The line</th><th className="gl-tid">Icon · id</th></tr></thead>
                <tbody>
                  {rows.map(t => (
                    <tr key={t.id}>
                      <th className="rt-name" scope="row"><TeamLogo team={t} size={22} /><span className="rt-nm">{t.name}</span></th>
                      <td className="gl-tcol"><span className="gl-swatch" style={{ background: t.color }} />{t.color}</td>
                      <td className="gl-tline">{t.description}</td>
                      <td className="gl-tid">{t.iconId}<br />{t.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        );
      })}
      {tab === 'tracks' && (
        <Section {...sec('tracks:deck')} title="Tracks (v0.5)" count={BASE_DECK_TRACKS.length} hint={`Six tracks, one stat combo each: the favoured stats gain +10 grade for the race, and each has its own tyre-wear dial. ${NOT_YET_TRACK}`}>
          <div className="gl-list">
            {BASE_DECK_TRACKS.filter(t => match(t.name, t.id, t.layoutId)).map(t => (
              <Row key={t.id} id={`dtrack:${t.id}`} open={isOpen(`dtrack:${t.id}`)} onToggle={toggle}
                lead={<span className="gl-plain gl-card"><FavourIcons favours={t.favours} /> {t.name}</span>}
                note={`${t.layoutId} · wear ×${t.tyreWear}`}
                pills={<span className="gl-readout">{favourText(t.favours)}</span>}>
                <div className="gl-facts"><Fact k="Favours">{favourText(t.favours)}</Fact><Fact k="Tyre wear">×{t.tyreWear}</Fact><Fact k="Layout">{t.layoutId}</Fact><Fact k="Id">{t.id}</Fact></div>
                <div className="gl-src">src/data/deckTracks.ts</div>
              </Row>
            ))}
          </div>
        </Section>
      )}
      {tab === 'cards' && (
        <Section {...sec('cards')} title="Rule cards" count={g.cards.length} hint="Rules you pick before a run. Race rule cards for one race, season rule cards for a whole league.">
          <div className="gl-list">
            {g.cards.filter(c => match(c.name, c.id, c.readout, c.blurb)).map(c => (
              <Row key={c.id} id={`card:${c.id}`} open={isOpen(`card:${c.id}`)} onToggle={toggle}
                lead={<span className="gl-plain"><GameIcon name={c.iconId ?? 'card.rule'} size={16} /> {c.name}</span>}
                note={`${c.scope} · ${c.weight}`}
                pills={<span className="gl-readout">{c.readout}</span>}>
                <p className="gl-desc">{c.blurb}</p>
              </Row>
            ))}
          </div>
        </Section>
      )}

      {tab === 'rules' && (
        <Section {...sec('rules')} title="In-race effects" count={g.inRaceEffects.length} hint="Timed states a race puts on a car. They show in the timing tower and the feed, and expire on their own.">
          <div className="gl-list">
            {g.inRaceEffects.filter(r => match(r.id, r.name, r.text, r.on)).map(r => (
              <Row key={r.id} id={`fx:${r.id}`} open={isOpen(`fx:${r.id}`)} onToggle={toggle}
                lead={<span className="gl-plain">{r.emoji} {r.name}</span>}
                note="in-race"
                pills={<Pills effects={effectsOf(r.effects)} />}>
                <p className="gl-desc">{r.text}</p>
                <div className="gl-facts"><Fact k="After">{describeInRaceEffect(r)}</Fact><Fact k="Id">{r.id}</Fact></div>
                <div className="gl-src">src/RaceEngine.ts IN_RACE_EFFECTS</div>
              </Row>
            ))}
          </div>
        </Section>
      )}

      {tab === 'conditions' && (
        <>
          <Section {...sec('weather:deck')} title="Weather (v0.5)" count={BASE_DECK_WEATHER.length} hint={`Neutral most races; otherwise a dry weather favouring two stats (+10 grade × intensity), stacking with the track. No rain until v0.6. ${NOT_YET_TRACK}`}>
            <div className="gl-list">
              {BASE_DECK_WEATHER.filter(w => match(w.name, w.id)).map(w => (
                <Row key={w.id} id={`dwx:${w.id}`} open={isOpen(`dwx:${w.id}`)} onToggle={toggle}
                  lead={<span className="gl-plain gl-card">{w.favours.length ? <FavourIcons favours={w.favours} /> : null} {w.name}</span>}
                  note={`${w.odds}%`}
                  pills={<span className="gl-readout">{w.favours.length ? favourText(w.favours) : 'no favours'}</span>}>
                  <div className="gl-facts"><Fact k="Odds">{w.odds}% of races</Fact><Fact k="Favours">{w.favours.length ? favourText(w.favours) : '—'}</Fact><Fact k="Id">{w.id}</Fact></div>
                  <div className="gl-src">src/data/deckWeather.ts</div>
                </Row>
              ))}
            </div>
          </Section>
        </>
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

      {tab === 'states' && (
        <Section {...sec('states')} title="States" count={g.places.length} hint="Ace America's 52 places: 50 states, DC and Puerto Rico. A look is the accents the UI takes while you race for that state, on its own dark ground (docs/story/states.md, picked by Pax).">
          <div className="gl-list">
            {g.places.filter(p => match(p.name, p.abbr, p.kind)).map(p => (
              <Row key={p.id} id={`state:${p.id}`} open={isOpen(`state:${p.id}`)} onToggle={toggle}
                lead={<span className="gl-plain gl-state">{p.look
                  ? <span className="gl-state-sw" aria-hidden="true">{[p.look.primary, p.look.secondary, p.look.accent].map(c => <i key={c} style={{ background: c }} />)}</span>
                  : <span className="gl-state-sw empty" aria-hidden="true"><i /><i /><i /></span>}{p.name}</span>}
                note={p.kind === 'state' ? p.abbr : `${p.abbr} · ${p.kind}`}
                pills={<span className="gl-readout">{p.look ? p.look.flag.note : '—'}</span>}>
                <div className="gl-facts">
                  <Fact k="Code">{p.abbr}</Fact><Fact k="Kind">{p.kind}</Fact>
                  {p.look && <><Fact k="Primary">{p.look.primary}</Fact><Fact k="Secondary">{p.look.secondary}</Fact><Fact k="Accent">{p.look.accent}</Fact><Fact k="Ink">{p.look.ink}</Fact><Fact k="Wheel-flag">{p.look.flag.note}</Fact></>}
                </div>
                <div className="gl-src">src/data/states.ts</div>
              </Row>
            ))}
          </div>
        </Section>
      )}

      {tab === 'add' && <AddTab />}
      {tab === 'inbox' && <InboxTab />}
    </StepTheme>
  );
}
