// Race Control — the lab. Everything here runs races the way the live game
// does (src/racecontrol/runner.ts), is seeded so it can be replicated outside
// the browser (`npm run lab`), and exports what it shows.
import RunSetup, { type RunSetupProps } from '../RunSetup';
import { Fragment, useEffect, useState } from 'react';
import './RaceControl.css';
import { PhysicsTab } from './PhysicsTab';
import type { Working } from './lab';
import { loadNotebook, saveNotebook, newId, presetSummary, exportNotebook, nextLedgerBatch, ledgerIssueUrl, markSent, fetchLedger, type Notebook, type LabPreset, type LabRun, type Ledger } from './notebook';
import { formatMetric, metricOutOfBand } from './physics';
import { ALL_KNOBS, formatValue, canonValue } from './knobs';
import { DeckTab } from './DeckTab';

type TabId = 'physics' | 'run' | 'deck' | 'notebook' | 'method';
const TABS: { id: TabId; label: string; hint: string }[] = [
  { id: 'physics', label: 'Physics calibration', hint: 'what the race rules produce, measured; change a knob and re-measure' },
  { id: 'run', label: 'Run setup', hint: 'one race with your seed, track, rule cards and a lab preset, watched live' },
  { id: 'deck', label: 'Deck', hint: 'the card deck, before the sim uses it' },
  { id: 'notebook', label: 'Notebook', hint: 'saved presets and every run you measured' },
  { id: 'method', label: 'Method', hint: 'why these numbers can be trusted' },
];

const TAB_IDS: TabId[] = ['physics', 'run', 'deck', 'notebook', 'method'];
const tabFromSlug = (slug?: string): TabId => TAB_IDS.find(t => t === slug) ?? 'physics';

/** `tab` / `onTabChange` keep the open tab in the URL (#186): /#/race-control/<tab>. */
export default function RaceControl({ onBack, onStartRace, tab: tabSlug, onTabChange }: { onBack: () => void; onStartRace?: RunSetupProps['onStartRace']; tab?: string; onTabChange?: (tab: string) => void }) {
  const [localTab, setLocalTab] = useState<TabId>(() => tabFromSlug(tabSlug));
  const tab = onTabChange ? tabFromSlug(tabSlug) : localTab;
  const setTab = (t: TabId) => (onTabChange ? onTabChange(t) : setLocalTab(t));
  const [working, setWorking] = useState<Working>({ knobEdits: {}, preset: null });
  const [notebook, setNotebook] = useState<Notebook>(() => loadNotebook());
  useEffect(() => { saveNotebook(notebook); }, [notebook]);
  const logRun = (run: LabRun) => setNotebook(n => ({ ...n, runs: [run, ...n.runs] }));
  const savePreset = (name: string) => {
    const p: LabPreset = { id: working.preset?.id ?? newId(), name, createdAt: Date.now(), knobEdits: working.knobEdits };
    setNotebook(n => ({ ...n, presets: [p, ...n.presets.filter(x => x.id !== p.id)] }));
    setWorking(w => ({ ...w, preset: p }));
  };
  const loadPreset = (p: LabPreset) => { setWorking({ knobEdits: p.knobEdits, preset: p }); };
  const deletePreset = (id: string) => { setNotebook(n => ({ ...n, presets: n.presets.filter(p => p.id !== id) })); setWorking(w => w.preset?.id === id ? { ...w, preset: null } : w); };
  const deleteRun = (id: string) => setNotebook(n => ({ ...n, runs: n.runs.filter(r => r.id !== id) }));
  const lab = { working, setWorking, savePreset, logRun };
  return (
    <div className="run-setup race-control">
      <header className="rs-top">
        <div className="rs-title-block">
          <button type="button" className="rs-back" onClick={onBack}>← Menu</button>
          <h1 className="rs-title">Race Control</h1>
          <span className="rs-sub">The lab. Same engine as the live race, seeded, exportable, replicable.</span>
        </div>
      </header>
      <nav className="gl-tabs rc-tabs" aria-label="Race Control sections">
        {TABS.map(t => (
          <button key={t.id} type="button" className={`gl-tab ${tab === t.id ? 'on' : ''}`} onClick={() => setTab(t.id)} title={t.hint}>{t.label}</button>
        ))}
      </nav>
      {tab === 'physics' && <PhysicsTab lab={lab} />}
      {tab === 'run' && onStartRace && <RunSetup onStartRace={onStartRace} />}
      {tab === 'deck' && <DeckTab />}
      {tab === 'notebook' && <NotebookTab notebook={notebook} setNotebook={setNotebook} working={working} onLoad={p => { loadPreset(p); }} onDeletePreset={deletePreset} onDeleteRun={deleteRun} />}
      {tab === 'method' && <MethodTab />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Notebook: presets you saved and every run you measured, in this browser.

function NotebookTab({ notebook, setNotebook, working, onLoad, onDeletePreset, onDeleteRun }: { notebook: Notebook; setNotebook: (f: (n: Notebook) => Notebook) => void; working: Working; onLoad: (p: LabPreset) => void; onDeletePreset: (id: string) => void; onDeleteRun: (id: string) => void }) {
  const [open, setOpen] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [ledgerErr, setLedgerErr] = useState(false);
  useEffect(() => { fetchLedger().then(setLedger).catch(() => setLedgerErr(true)); }, []);
  const pending = nextLedgerBatch(notebook);
  const unsent = notebook.runs.filter(r => !r.sentAt).length + notebook.presets.filter(p => !p.sentAt || p.sentAt < p.createdAt).length;
  const send = () => {
    if (!pending) return;
    window.open(ledgerIssueUrl(pending.batch), '_blank', 'noopener');
    setNotebook(n => markSent(n, pending.runIds, pending.presetIds, pending.batch.sentAt));
  };
  const download = () => {
    const blob = new Blob([exportNotebook(notebook)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `parabolica-lab-notebook.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const copyRun = async (r: LabRun) => {
    const text = `# Physics run · seed ${r.seed} · ${r.races} races${r.presetName ? ` · preset ${r.presetName}` : ''}\n\n| Metric | Value |\n|---|---:|\n${r.result.metrics.map(m => `| ${m.label} | ${formatMetric(m.value, m.format)} |`).join('\n')}\n`;
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* no clipboard */ }
  };
  return (
    <>
      <section className="rs-row rc-explain">
        <p><b>Your notebook.</b> Presets are setups you named — the knobs you changed. Load one to keep working on it, or pick it in <b>Quick Race → Run Setup</b> to race under it. Runs are every measurement you made, newest first, with the seed so anyone can repeat it. This page is this browser's copy; <b>Send to ledger</b> pushes what's new into the repo as one GitHub issue (you press Submit there, an action folds it in and closes it), and it shows up below under <b>Shared ledger</b> on every device once the site redeploys.</p>
        <div className="rc-reroll">
          <span className="rs-k">Here</span><span className="rc-dim">{notebook.presets.length} preset{notebook.presets.length === 1 ? '' : 's'} · {notebook.runs.length} run{notebook.runs.length === 1 ? '' : 's'}</span>
          <span className="rs-k">Shared</span><span className="rc-dim">{ledger ? `${ledger.presets.length} preset${ledger.presets.length === 1 ? '' : 's'} · ${ledger.runs.length} run${ledger.runs.length === 1 ? '' : 's'}` : ledgerErr ? 'unreachable' : '…'}</span>
          <button type="button" className="rs-btn rs-btn-primary" disabled={!pending} onClick={send} title="Opens one prefilled GitHub issue with everything new; you press Submit">Send {unsent ? `${unsent} new` : 'to ledger'}{pending && pending.left > 0 ? ` (${pending.runIds.length + pending.presetIds.length} now, ${pending.left} next press)` : ''}</button>
          <span className="rc-actions"><button type="button" className="rs-link" onClick={download}>Download notebook JSON</button></span>
        </div>
      </section>
      <section className="rs-row rc-table-row">
        <div className="rc-knob-head"><span className="rs-k">Presets</span><span className="rs-hint">{notebook.presets.length ? 'Load one to edit or measure it again.' : 'None yet — change a knob on Physics and name it in the strip.'}</span></div>
        {notebook.presets.length > 0 && (
          <div className="rc-table-wrap"><table className="rc-table rc-compact"><thead><tr><th>Preset</th><th>Changes</th><th>Saved</th><th></th></tr></thead><tbody>
            {notebook.presets.map(p => (
              <Fragment key={p.id}>
              <tr className={working.preset?.id === p.id ? 'rc-row-on' : ''} onClick={() => setOpen(o => o === p.id ? '' : p.id)}>
                <td className="rc-tag">{p.name}{working.preset?.id === p.id && <span className="rc-edited-text"> · loaded</span>}{p.sentAt && p.sentAt >= p.createdAt ? <span className="rc-dim" title="In the shared ledger"> · shared</span> : ''}</td>
                <td className="rc-dim">{presetSummary(p)}</td>
                <td className="rc-dim">{new Date(p.createdAt).toLocaleString()}</td>
                <td><span className="rc-draft-actions"><button type="button" className="rs-link" onClick={e => { e.stopPropagation(); onLoad(p); }}>Load</button><button type="button" className="rs-link rc-bad" onClick={e => { e.stopPropagation(); onDeletePreset(p.id); }}>Delete</button></span></td>
              </tr>
              {open === p.id && <tr className="rc-try-row"><td colSpan={4}><div className="rc-try rc-preset-detail">
                {Object.entries(p.knobEdits).map(([path, v]) => { const k = ALL_KNOBS.find(x => x.path === path); return <div key={path}><b>{k?.label ?? path}</b> <span className="rc-dim">{path}</span> <span className="rc-dim">{k ? formatValue(canonValue(path), k.format) : ''} →</span> <span className="rc-edited-text">{k ? formatValue(v, k.format) : v}</span></div>; })}
                <div className="rs-hint">To race under it: Quick Race → Run Setup → Lab preset.</div>
              </div></td></tr>}
              </Fragment>
            ))}
          </tbody></table></div>
        )}
      </section>
      <section className="rs-row rc-table-row">
        <div className="rc-knob-head"><span className="rs-k">Runs</span><span className="rs-hint">{notebook.runs.length ? 'Click one to see what came out.' : 'Nothing measured yet.'}</span>{copied && <span className="rc-good rc-actions">Copied</span>}</div>
        {notebook.runs.length > 0 && (
          <div className="rc-table-wrap"><table className="rc-table rc-compact"><thead><tr><th>When</th><th>What</th><th>Seed</th><th>Races</th><th>Preset</th><th>Headline</th><th></th></tr></thead><tbody>
            {notebook.runs.map(r => (
              <Fragment key={r.id}>
              <tr onClick={() => setOpen(o => o === r.id ? '' : r.id)}>
                <td className="rc-dim">{new Date(r.at).toLocaleString()}</td>
                <td className="rc-tag">Physics <span className="rc-dim">{r.note}</span>{r.sentAt ? <span className="rc-dim" title="In the shared ledger"> · shared</span> : ''}</td>
                <td><span className="rc-num">{r.seed}</span></td>
                <td><span className="rc-num">{r.races}</span></td>
                <td className="rc-dim">{r.presetName ?? '—'}</td>
                <td className="rc-dim">{runHeadline(r)}</td>
                <td><span className="rc-draft-actions"><button type="button" className="rs-link" onClick={e => { e.stopPropagation(); copyRun(r); }}>Copy</button><button type="button" className="rs-link rc-bad" onClick={e => { e.stopPropagation(); onDeleteRun(r.id); }}>Delete</button></span></td>
              </tr>
              {open === r.id && <tr className="rc-try-row"><td colSpan={7}><div className="rc-try rc-preset-detail">
                {r.result.metrics.map(m => <div key={m.id}><b>{m.label}</b> <span className={`rc-num ${metricOutOfBand(m) ? 'rc-bad' : ''}`}>{formatMetric(m.value, m.format)}</span></div>)}
                <div className="rs-hint">Repeat it: <code>npm run lab -- {r.seed} {r.races} all no-traits</code></div>
              </div></td></tr>}
              </Fragment>
            ))}
          </tbody></table></div>
        )}
      </section>
      <section className="rs-row rc-table-row">
        <div className="rc-knob-head"><span className="rs-k">Shared ledger</span><span className="rs-hint">{ledger ? (ledger.runs.length || ledger.presets.length ? 'Everything anyone sent, from any device. Newest first.' : 'Empty so far — send something.') : ledgerErr ? 'Could not load public/ledger from the site.' : 'Loading…'}</span></div>
        {ledger && ledger.presets.length > 0 && (
          <div className="rc-table-wrap"><table className="rc-table rc-compact"><thead><tr><th>Shared preset</th><th>Changes</th><th>Saved</th><th>By</th><th></th></tr></thead><tbody>
            {ledger.presets.map(p => (
              <tr key={`l-${p.id}`}>
                <td className="rc-tag">{p.name}</td>
                <td className="rc-dim">{presetSummary(p)}</td>
                <td className="rc-dim">{new Date(p.createdAt).toLocaleString()}</td>
                <td className="rc-dim">{p.user ?? '—'}{p.issue ? ` · #${p.issue}` : ''}</td>
                <td><button type="button" className="rs-link" onClick={() => onLoad(p)}>Load</button></td>
              </tr>
            ))}
          </tbody></table></div>
        )}
        {ledger && ledger.runs.length > 0 && (
          <div className="rc-table-wrap"><table className="rc-table rc-compact"><thead><tr><th>When</th><th>What</th><th>Seed</th><th>Races</th><th>Preset</th><th>Headline</th><th>By</th></tr></thead><tbody>
            {ledger.runs.map(r => (
              <Fragment key={`l-${r.id}`}>
              <tr onClick={() => setOpen(o => o === `l-${r.id}` ? '' : `l-${r.id}`)}>
                <td className="rc-dim">{new Date(r.at).toLocaleString()}</td>
                <td className="rc-tag">Physics <span className="rc-dim">{r.note}</span></td>
                <td><span className="rc-num">{r.seed}</span></td>
                <td><span className="rc-num">{r.races}</span></td>
                <td className="rc-dim">{r.presetName ?? '—'}</td>
                <td className="rc-dim">{runHeadline(r)}</td>
                <td className="rc-dim">{r.user ?? '—'}{r.issue ? ` · #${r.issue}` : ''}</td>
              </tr>
              {open === `l-${r.id}` && <tr className="rc-try-row"><td colSpan={7}><div className="rc-try rc-preset-detail">
                {r.result.metrics.map(m => <div key={m.id}><b>{m.label}</b> <span className={`rc-num ${metricOutOfBand(m) ? 'rc-bad' : ''}`}>{formatMetric(m.value, m.format)}</span></div>)}
              </div></td></tr>}
              </Fragment>
            ))}
          </tbody></table></div>
        )}
      </section>
    </>
  );
}

function runHeadline(r: LabRun): string {
  const pick = (id: string) => r.result.metrics.find(m => m.id === id);
  const p = pick('paceRho'), d = pick('dnf'), s = pick('stops');
  return [p && `pace→finish ${formatMetric(p.value, p.format)}`, d && `DNF ${formatMetric(d.value, d.format)}`, s && `stops ${formatMetric(s.value, s.format)}`].filter(Boolean).join(' · ');
}

// ---------------------------------------------------------------------------
// Method

function MethodTab() {
  return (
    <section className="rs-row rc-method">
      <div className="rs-row-head"><span className="rs-k">How a lab number earns trust</span></div>
      <ol>
        <li><b>A lab race is a league race.</b> Every batch goes through <code>src/racecontrol/runner.ts</code>, which builds a one-race Season on the Season pool (10 teams × 2, CPU-drafted) with <code>oneRaceSeason</code> and prepares the engine with <code>prepareScheduledRace</code> — the same path Season Mode and Quick Race race on. Current tracks only, one pool per universe seed, seeded weather, the chosen rule-card hand.</li>
        <li><b>Everything is seeded.</b> A batch is (seed, size, rule cards). Race <i>i</i> derives from <code>deriveSeed(seed, 'lab', i)</code>; nothing in the lab touches <code>Math.random</code>. The same spec gives the same race in this browser, in a vitest, and in the terminal.</li>
        <li><b>Every result carries a fingerprint.</b> Physics shows <code>#xxxxxxxx</code> next to its seed; <code>npm run lab -- &lt;seed&gt; &lt;races&gt; all no-traits</code> prints the same one when it ran the same races.</li>
        <li><b>Physics is measured on card-free races.</b> The <code>no-traits</code> rule card (No Traits), so the rules are read without genesis cards on top. Change a knob and the same seeded batch runs with your value — only the knob differs.</li>
        <li><b>Cards are arithmetic, not behaviour.</b> A trait or gear card adds grade points to a stat at roster build (<code>src/cards/apply.ts</code>); the Deck tab shows every card and its numbers. There is nothing to calibrate per card: the stat's own weight (Physics) is the card's weight.</li>
        <li><b>Re-roll to see the dice.</b> Physics can re-run on a fresh seed. A number that moves a lot between seeds is mostly luck; the ± and the Δ flag tell you when a difference is bigger than the noise.</li>
        <li><b>Export what you see.</b> Physics gives you the code for an edit you liked (Copy as code). Paste it into an issue and anyone can rerun it.</li>
      </ol>
      <div className="rc-cmds">
        <span className="rs-k">Commands</span>
        <code>npm run lab -- 2026 100 all</code><span className="rs-hint">replay a physics batch, print its fingerprint</span>
        <code>npm run lab -- 2026 100 all no-traits rain</code><span className="rs-hint">…under a rule-card hand</span>
        <code>npx tsx scripts/mechanics-probe.mjs 200</code><span className="rs-hint">the card-free mechanics gates (#246)</span>
      </div>
      <p className="rs-hint">Known gaps, parked: the safety-car count reads a double-logged event (halved here). BetLab (odds) is gone; src/betting/utils keeps the odds math.</p>
    </section>
  );
}
