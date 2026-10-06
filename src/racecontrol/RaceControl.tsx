// Race Control — the lab. Everything here runs races the way the live game
// does (src/racecontrol/runner.ts), is seeded so it can be replicated outside
// the browser (`npm run lab`, `npm run calibrate`), and exports what it shows.
import { Fragment, useEffect, useMemo, useState } from 'react';
import './RaceControl.css';
import { PhysicsTab } from './PhysicsTab';
import { useLabRunner } from './useLabRunner';
import { SaveBar, type LabProps, type Working } from './lab';
import { loadNotebook, saveNotebook, newId, presetSummary, exportNotebook, nextLedgerBatch, ledgerIssueUrl, markSent, fetchLedger, type Notebook, type LabPreset, type LabRun, type Ledger } from './notebook';
import { formatMetric, metricOutOfBand } from './physics';
import { CANON_VARIABLES } from '../simlab/types';
import { cloneVariables, setValueByPath, ALL_KNOBS, formatValue, canonValue } from './knobs';
import { randomSeed } from '../engine/rng';
import { getTagById, describeCondition, type Tag } from '../data/tags';
import { TAG_CALIBRATION } from '../data/tagCalibration';
import { bandViolation, calibrateTagsAsync, CALIBRATION_BANDS, type CalibrationFile, type TagCalibration, type CalibrateProgress } from './calibrate';
import type { CalibrateInMessage, CalibrateOutMessage } from './calibrateWorker';

type TabId = 'calibration' | 'physics' | 'notebook' | 'method';
const TABS: { id: TabId; label: string; hint: string }[] = [
  { id: 'calibration', label: 'Tag calibration', hint: 'what each tag does, measured' },
  { id: 'physics', label: 'Physics calibration', hint: 'what the race rules produce, measured; change a knob and re-measure' },
  { id: 'notebook', label: 'Notebook', hint: 'saved presets and every run you measured' },
  { id: 'method', label: 'Method', hint: 'why these numbers can be trusted' },
];

export default function RaceControl({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<TabId>('calibration');
  const [working, setWorking] = useState<Working>({ tagEdits: {}, knobEdits: {}, preset: null });
  const [notebook, setNotebook] = useState<Notebook>(() => loadNotebook());
  useEffect(() => { saveNotebook(notebook); }, [notebook]);
  const logRun = (run: LabRun) => setNotebook(n => ({ ...n, runs: [run, ...n.runs] }));
  const savePreset = (name: string) => {
    const p: LabPreset = { id: working.preset?.id ?? newId(), name, createdAt: Date.now(), tagEdits: working.tagEdits, knobEdits: working.knobEdits };
    setNotebook(n => ({ ...n, presets: [p, ...n.presets.filter(x => x.id !== p.id)] }));
    setWorking(w => ({ ...w, preset: p }));
  };
  const loadPreset = (p: LabPreset) => { setWorking({ tagEdits: p.tagEdits, knobEdits: p.knobEdits, preset: p }); };
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
      {tab === 'calibration' && <CalibrationTab lab={lab} />}
      {tab === 'physics' && <PhysicsTab lab={lab} />}
      {tab === 'notebook' && <NotebookTab notebook={notebook} setNotebook={setNotebook} working={working} onLoad={p => { loadPreset(p); }} onDeletePreset={deletePreset} onDeleteRun={deleteRun} />}
      {tab === 'method' && <MethodTab />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Calibration

type SortKey = 'name' | 'target' | 'rarity' | 'places' | 'wins' | 'podiums' | 'dnf' | 'fires';
const RARITY_RANK = { common: 0, uncommon: 1, rare: 2, legendary: 3 } as const;
type Row = { c: TagCalibration; tag: Tag };
const SORTERS: Record<SortKey, (a: Row, b: Row) => number> = {
  name: (a, b) => a.tag.name.localeCompare(b.tag.name),
  target: (a, b) => a.c.target.localeCompare(b.c.target) || b.c.places - a.c.places,
  rarity: (a, b) => RARITY_RANK[b.c.rarity] - RARITY_RANK[a.c.rarity] || b.c.places - a.c.places,
  places: (a, b) => b.c.places - a.c.places,
  wins: (a, b) => b.c.winRate - a.c.winRate,
  podiums: (a, b) => b.c.podiumRate - a.c.podiumRate,
  dnf: (a, b) => b.c.dnfRate - a.c.dnfRate,
  fires: (a, b) => b.c.activationsPerRace - a.c.activationsPerRace,
};

function CalibrationTab({ lab }: { lab: LabProps }) {
  const file = TAG_CALIBRATION;
  const edits = lab.working.tagEdits;
  const setEdits = (f: (prev: Record<string, Tag>) => Record<string, Tag>) => lab.setWorking(w => ({ ...w, tagEdits: f(w.tagEdits) }));
  const variables = useMemo(() => { let v = cloneVariables(CANON_VARIABLES); for (const [path, value] of Object.entries(lab.working.knobEdits)) v = setValueByPath(v, path, value); return Object.keys(lab.working.knobEdits).length ? v : undefined; }, [lab.working.knobEdits]);
  const [sort, setSort] = useState<SortKey>('places');
  const [desc, setDesc] = useState(true);
  const [open, setOpen] = useState<string>('');
  const [copied, setCopied] = useState<string | null>(null);
  const [seed, setSeed] = useState<number>(file.batchSeed);
  const [races, setRaces] = useState(50);

  const RUN = {
    makeWorker: () => new Worker(new URL('./calibrateWorker.ts', import.meta.url), { type: 'module' }),
    inline: async (msg: CalibrateInMessage, sink: { post: (m: CalibrateOutMessage) => void; aborted: () => boolean }) => {
      if (msg.type !== 'START') return;
      const out = await calibrateTagsAsync(msg.tagIds, { races: msg.races, batchSeed: msg.batchSeed, cards: msg.cards, variables: msg.variables, onProgress: p => { sink.post({ type: 'PROGRESS', progress: p }); return !sink.aborted(); } });
      if (!sink.aborted()) sink.post({ type: 'COMPLETE', file: out.file });
    },
    read: (m: CalibrateOutMessage) => m.type === 'PROGRESS' ? { progress: m.progress } : m.type === 'COMPLETE' ? { result: m.file } : { error: m.message },
    abort: { type: 'ABORT' } as CalibrateInMessage,
  };
  const reroll = useLabRunner<CalibrateInMessage, CalibrateOutMessage, CalibrateProgress, CalibrationFile>(RUN);
  const yoursRun = useLabRunner<CalibrateInMessage, CalibrateOutMessage, CalibrateProgress, CalibrationFile>(RUN);
  const busy = !!reroll.progress || !!yoursRun.progress;

  const rolled = reroll.result;
  const rolledBy = useMemo(() => new Map((rolled?.tags ?? []).map(c => [c.tagId, c])), [rolled]);
  const yours = yoursRun.result;
  const yoursBy = useMemo(() => new Map((yours?.tags ?? []).map(c => [c.tagId, c])), [yours]);
  const edited = Object.keys(edits).length;

  const startReroll = () => reroll.start({ type: 'START', tagIds: file.tags.map(c => c.tagId), races, batchSeed: seed, cards: file.cards }, { done: 0, total: races * (file.tags.length + 1), label: 'baseline', race: 0, races });
  const measureEdits = () => yoursRun.start({ type: 'START', tagIds: Object.values(edits), races, batchSeed: seed, cards: file.cards, variables }, { done: 0, total: races * (edited + 1), label: 'baseline', race: 0, races });
  // Every finished measurement goes in the notebook.
  const preset = lab.working.preset;
  useEffect(() => { if (yours) lab.logRun({ id: newId(), at: Date.now(), kind: 'tags', seed: yours.batchSeed, races: yours.races, presetId: preset?.id, presetName: preset?.name, note: `${yours.tags.length} edited tag${yours.tags.length > 1 ? 's' : ''}${variables ? ' · with knob edits' : ''}`, result: yours }); }, [yours]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (rolled) lab.logRun({ id: newId(), at: Date.now(), kind: 'tags', seed: rolled.batchSeed, races: rolled.races, note: 'all tags, as shipped', result: rolled }); }, [rolled]); // eslint-disable-line react-hooks/exhaustive-deps
  const setEdit = (tagId: string, tag: Tag | null) => setEdits(prev => { const n = { ...prev }; if (tag) n[tagId] = tag; else delete n[tagId]; return n; });

  const rows = useMemo(() => {
    const r = file.tags.map(c => ({ c, tag: getTagById(c.tagId) })).filter((x): x is Row => !!x.tag).sort(SORTERS[sort]);
    return desc ? r : r.reverse();
  }, [file, sort, desc]);
  const violations = rows.filter(r => bandViolation(r.c));
  const maxPlaces = Math.max(1, ...rows.map(r => Math.abs(r.c.places)));
  const setSortKey = (k: SortKey) => { if (k === sort) setDesc(d => !d); else { setSort(k); setDesc(true); } };
  const extra = (rolled ? 1 : 0) + (yours ? 1 : 0);

  const copy = async (what: string, text: string) => { try { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(null), 1500); } catch { /* no clipboard */ } };
  const download = () => {
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `tagCalibration-${file.batchSeed}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const codeFor = (t: Tag) => {
    const fx = KNOBS.filter(({ k }) => t.effects[k] !== undefined).map(({ k }) => `${k}: ${k === 'crashResistance' ? (t.effects[k] as number).toFixed(2) : (t.effects[k] as number).toFixed(3)}`);
    return `// ${t.name} (${t.id}) — src/data/tags.ts\n    effects: { ${fx.join(', ')} },${t.triggerChance !== undefined ? `\n    triggerChance: ${t.triggerChance.toFixed(2)},` : ''}`;
  };

  // Which column "yours" is compared against: the re-roll on the same seed if we have one, else the shipped file.
  const against = (tagId: string): TagCalibration | undefined => (rolled && rolled.batchSeed === seed && rolled.races === races ? rolledBy.get(tagId) : undefined) ?? file.tags.find(c => c.tagId === tagId);

  return (
    <>
      <section className="rs-row rc-explain">
        <p><b>Every tag, measured.</b> Each one was put on a single driver, alone, in {file.races} races, then the same {file.races} races with nobody tagged. <b>Places</b> = how many finishing positions the tag was worth (<span className="rc-good">+2.6</span> good, <span className="rc-bad">−1.0</span> hurts; ± is the uncertainty). Grey numbers are the untagged rate. Click a header to sort; click a row to see what a tag does and change its numbers. Edited tags stay purple; <b>Measure</b> runs them all together on the seed below, and a Yours · Δ column appears.</p>
        <div className="rc-reroll">
          <span className="rs-k">Seed</span>
          <input type="number" value={seed} disabled={busy} onChange={e => setSeed(Number(e.target.value) >>> 0)} aria-label="Batch seed" />
          <button type="button" className="rs-link" disabled={busy} onClick={() => setSeed(randomSeed())}>re-roll</button>
          <select value={races} disabled={busy} onChange={e => setRaces(Number(e.target.value))}>
            <option value={25}>25 races per tag</option>
            <option value={50}>50 races per tag</option>
            <option value={100}>100 races per tag</option>
            <option value={file.races}>{file.races} races per tag · exact</option>
          </select>
          {reroll.progress
            ? <button type="button" className="rs-btn rs-btn-ghost" onClick={reroll.stop}>Stop</button>
            : <button type="button" className="rs-btn rs-btn-ghost" onClick={startReroll} disabled={busy} title={`Every tag again on seed ${seed} — about ${Math.round(races * (file.tags.length + 1) * 0.15 / 60)} min`}>Measure all tags again</button>}
          {yoursRun.progress
            ? <button type="button" className="rs-btn rs-btn-ghost" onClick={yoursRun.stop}>Stop</button>
            : <button type="button" className="rs-btn rs-btn-primary" onClick={measureEdits} disabled={!edited || busy}>Measure {edited ? `${edited} edit${edited > 1 ? 's' : ''}` : 'edits'}</button>}
          {edited > 0 && <button type="button" className="rs-link" onClick={() => copy('all', Object.values(edits).map(codeFor).join('\n\n'))}>{copied === 'all' ? 'Copied' : 'Copy edits as code'}</button>}
          <SaveBar lab={lab} busy={busy} />
          {variables && <span className="rs-hint rc-inline-hint">Measuring under your {Object.keys(lab.working.knobEdits).length} knob edit{Object.keys(lab.working.knobEdits).length > 1 ? 's' : ''} from Physics.</span>}
          {reroll.progress && <ProgressLine p={reroll.progress} mode={reroll.mode} />}
          {yoursRun.progress && <ProgressLine p={yoursRun.progress} mode={yoursRun.mode} />}
          {reroll.error && <span className="rc-bad">{reroll.error}</span>}
          {yoursRun.error && <span className="rc-bad">{yoursRun.error}</span>}
          {rolled && !reroll.progress && <span className="rc-good">✓ all tags re-measured · seed {rolled.batchSeed} · {rolled.races} races · baseline #{rolled.baselineFingerprint}</span>}
          {yours && !yoursRun.progress && <span className="rc-good">✓ {yours.tags.length} edit{yours.tags.length > 1 ? 's' : ''} measured · seed {yours.batchSeed} · {yours.races} races{rolled && rolled.batchSeed === seed && rolled.races === races ? ' · compared with the re-roll' : ' · compared with the shipped table'}</span>}
          <span className="rc-actions">
            <button type="button" className="rs-link" onClick={() => copy('md', calibrationMarkdown(file))}>{copied === 'md' ? 'Copied' : 'Copy table as markdown'}</button>
            <button type="button" className="rs-link" onClick={download}>Download JSON</button>
          </span>
        </div>
        <div className="rc-bands rs-hint">Shipped table: batch <code>{file.batchSeed}</code> · cards <code>{file.cards.join(' ') || 'none'}</code> · {new Date(file.generatedAt).toLocaleDateString()} · bands |places| ≤ {CALIBRATION_BANDS.maxPlaces}, DNF ≤ {Math.round(CALIBRATION_BANDS.maxDnfRate * 100)}%, wins ≤ {Math.round(CALIBRATION_BANDS.maxWinRate * 100)}% · <span className={violations.length ? 'rc-bad' : 'rc-good'}>{violations.length ? `${violations.length} out of band` : 'all in band'}</span></div>
      </section>
      <section className="rs-row rc-table-row">
        <div className="rc-table-wrap">
          <table className="rc-table rc-compact">
            <thead>
              <tr>
                <th><SortBtn k="name" cur={sort} desc={desc} set={setSortKey}>Tag</SortBtn></th>
                <th><SortBtn k="target" cur={sort} desc={desc} set={setSortKey}>On</SortBtn></th>
                <th><SortBtn k="rarity" cur={sort} desc={desc} set={setSortKey}>Rarity</SortBtn></th>
                <th className="rc-th-places"><SortBtn k="places" cur={sort} desc={desc} set={setSortKey}>Places</SortBtn></th>
                {rolled && <th title={`Every tag again on seed ${rolled.batchSeed}, ${rolled.races} races per tag`}>Re-roll · Δ</th>}
                {yours && <th title={`Your edited tags on seed ${yours.batchSeed}, ${yours.races} races per tag`}>Yours · Δ</th>}
                <th><SortBtn k="wins" cur={sort} desc={desc} set={setSortKey}>Wins</SortBtn></th>
                <th><SortBtn k="podiums" cur={sort} desc={desc} set={setSortKey}>Podiums</SortBtn></th>
                <th><SortBtn k="dnf" cur={sort} desc={desc} set={setSortKey}>DNF</SortBtn></th>
                <th><SortBtn k="fires" cur={sort} desc={desc} set={setSortKey}>Fires</SortBtn></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ c, tag }) => {
                const v = bandViolation(c);
                const isOpen = open === c.tagId;
                const e = edits[c.tagId];
                const y = yoursBy.get(c.tagId);
                return (
                  <Fragment key={c.tagId}>
                  <tr className={`${v ? 'rc-row-bad' : ''} ${e ? 'rc-row-on' : ''}`} onClick={() => setOpen(o => o === c.tagId ? '' : c.tagId)} title={`${tag.description}${v ? ` — ⚠ ${v}` : ''}`}>
                    <td className="rc-tag"><span className="rc-emoji">{tag.emoji}</span> {tag.name}{v && <span className="rc-bad"> ⚠</span>}{e && <span className="rc-edited-text"> ✎</span>}</td>
                    <td className="rc-dim">{c.target}</td>
                    <td><span className="rc-rarity" style={{ color: `var(--rarity-${c.rarity})` }}>{c.rarity}</span></td>
                    <td className="rc-places"><PlacesBar value={c.places} max={maxPlaces} /><span className={`rc-num ${c.places > 0.05 ? 'rc-good' : c.places < -0.05 ? 'rc-bad' : ''}`}>{fmtSigned(c.places)}</span><span className="rc-se">±{c.placesSe.toFixed(1)}</span></td>
                    {rolled && <td><Delta mine={rolledBy.get(c.tagId)} theirs={c} /></td>}
                    {yours && <td>{y ? <Delta mine={y} theirs={against(c.tagId)} strong /> : <span className="rc-dim">—</span>}</td>}
                    <td><span className="rc-num">{pct(c.winRate)}</span><span className="rc-se">{pct(c.baseWinRate)}</span></td>
                    <td><span className="rc-num">{pct(c.podiumRate)}</span><span className="rc-se">{pct(c.basePodiumRate)}</span></td>
                    <td><span className={`rc-num ${c.dnfRate > c.baseDnfRate + 0.05 ? 'rc-bad' : ''}`}>{pct(c.dnfRate)}</span><span className="rc-se">{pct(c.baseDnfRate)}</span></td>
                    <td><span className="rc-num rc-dim">{tag.trigger === 'passive' ? '—' : c.activationsPerRace.toFixed(2)}</span><span className="rc-chev">{isOpen ? '▾' : '▸'}</span></td>
                  </tr>
                  {isOpen && <tr className="rc-try-row"><td colSpan={8 + extra}><TagEditor base={tag} edit={e} busy={busy} onEdit={t => setEdit(c.tagId, t)} yours={y} against={against(c.tagId)} onCopy={() => copy(c.tagId, codeFor(e ?? tag))} copied={copied === c.tagId} /></td></tr>}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function ProgressLine({ p, mode }: { p: CalibrateProgress; mode: string }) {
  return <span className="rc-progress"><span className="rc-progress-bar"><span style={{ width: `${(p.done / p.total) * 100}%` }} /></span><span>{p.label === 'baseline' ? 'Untagged baseline' : p.label} · race {p.race} of {p.races} · {p.done}/{p.total}{mode === 'main thread' ? ' · on the main thread' : ''}</span></span>;
}

/** places of `mine` and its difference from `theirs`, flagged beyond the noise. */
function Delta({ mine, theirs, strong }: { mine?: TagCalibration; theirs?: TagCalibration; strong?: boolean }) {
  if (!mine) return <span className="rc-dim">—</span>;
  if (!theirs) return <span className="rc-num">{fmtSigned(mine.places)}</span>;
  const d = mine.places - theirs.places;
  const noise = 2 * Math.sqrt(mine.placesSe ** 2 + theirs.placesSe ** 2);
  const real = Math.abs(d) > noise;
  const cls = real ? (strong ? (d > 0 ? 'rc-good' : 'rc-bad') : 'rc-bad') : '';
  return <><span className={`rc-num ${strong ? 'rc-edited-text' : ''}`}>{fmtSigned(mine.places)}</span><span className={`rc-se ${cls}`}>{d > 0 ? '+' : ''}{d.toFixed(1)}{real ? (strong ? ' ✓' : ' ⚠') : ''}</span></>;
}

function SortBtn({ k, cur, desc, set, children }: { k: SortKey; cur: SortKey; desc: boolean; set: (k: SortKey) => void; children: React.ReactNode }) {
  return <button type="button" className={`rc-sort ${cur === k ? 'on' : ''}`} onClick={() => set(k)}>{children}{cur === k ? (desc ? ' ▾' : ' ▴') : ''}</button>;
}

function PlacesBar({ value, max }: { value: number; max: number }) {
  const w = Math.min(100, Math.abs(value) / max * 100);
  return (
    <span className="rc-bar" aria-hidden="true">
      <span className="rc-bar-neg">{value < 0 && <span style={{ width: `${w}%` }} />}</span>
      <span className="rc-bar-pos">{value > 0 && <span style={{ width: `${w}%` }} />}</span>
    </span>
  );
}

const pct = (x: number) => `${(x * 100).toFixed(x < 0.1 ? 1 : 0)}%`;
const fmtSigned = (x: number) => `${x > 0 ? '+' : ''}${x.toFixed(1)}`;

export function calibrationMarkdown(file: CalibrationFile): string {
  const head = `| Tag | On | Rarity | Places | Wins (field) | Podiums (field) | DNF (field) | Fires/race | Band |\n|---|---|---|---:|---:|---:|---:|---:|---|`;
  const rows = file.tags.map(c => {
    const t = getTagById(c.tagId);
    return `| ${t?.emoji ?? ''} ${t?.name ?? c.tagId} | ${c.target} | ${c.rarity} | ${fmtSigned(c.places)} ± ${c.placesSe.toFixed(1)} | ${pct(c.winRate)} (${pct(c.baseWinRate)}) | ${pct(c.podiumRate)} (${pct(c.basePodiumRate)}) | ${pct(c.dnfRate)} (${pct(c.baseDnfRate)}) | ${c.activationsPerRace.toFixed(2)} | ${bandViolation(c) ?? 'ok'} |`;
  });
  return `# Tag calibration\n\nBatch seed ${file.batchSeed} · ${file.races} races per tag · cards: ${file.cards.join(' ') || 'none'} · baseline #${file.baselineFingerprint} · ${file.generatedAt}\n\nReplicate: \`npm run calibrate\`\n\n${head}\n${rows.join('\n')}\n`;
}

// ---------------------------------------------------------------------------
// Inline editor: what the tag does, its numbers to change. Measuring happens
// from the strip at the top, for every edited tag at once.

type Knob = 'speedModifier' | 'consistencyModifier' | 'luckModifier' | 'pitSpeedModifier' | 'crashResistance';
const KNOBS: { k: Knob; label: string; hint: string }[] = [
  { k: 'speedModifier', label: 'Speed', hint: '% faster every tick' },
  { k: 'consistencyModifier', label: 'Consistency', hint: '% less lap-to-lap noise' },
  { k: 'luckModifier', label: 'Luck', hint: '% more lucky breaks' },
  { k: 'pitSpeedModifier', label: 'Pit work', hint: '% quicker stationary time' },
  { k: 'crashResistance', label: 'Crash resistance', hint: 'points of crash avoidance (±50)' },
];
const toPct = (k: Knob, v: number | undefined) => v === undefined ? 0 : k === 'crashResistance' ? Math.round(v * 100) : Math.round((v - 1) * 100);
const fromPct = (k: Knob, p: number) => k === 'crashResistance' ? p / 100 : 1 + p / 100;

function TagEditor({ base, edit, busy, onEdit, yours, against, onCopy, copied }: { base: Tag; edit?: Tag; busy: boolean; onEdit: (t: Tag | null) => void; yours?: TagCalibration; against?: TagCalibration; onCopy: () => void; copied: boolean }) {
  const cur = edit ?? base;
  const knobs = readKnobs(cur);
  const chance = Math.round((cur.triggerChance ?? 1) * 100);
  const build = (nk: Record<Knob, number>, ch: number): Tag => ({
    ...base,
    effects: Object.fromEntries(KNOBS.map(({ k }) => [k, nk[k] === 0 ? undefined : fromPct(k, nk[k])]).filter(([, v]) => v !== undefined)),
    ...(base.triggerChance !== undefined || ch !== 100 ? { triggerChance: ch / 100 } : {}),
  });
  const commit = (nk: Record<Knob, number>, ch: number) => {
    const same = KNOBS.every(({ k }) => nk[k] === toPct(k, base.effects[k])) && ch === Math.round((base.triggerChance ?? 1) * 100);
    onEdit(same ? null : build(nk, ch));
  };
  return (
    <div className="rc-try">
      <div className="rc-try-what">
        <span className="rc-emoji">{base.emoji}</span> <b>{base.name}</b> <span className="rc-dim">{base.description}</span>
        <div className="rc-try-readout">
          <span className="rs-k">Fires</span> {base.trigger === 'passive' ? 'always on' : base.trigger.replace('_', ' ')}{base.condition ? ` · only when ${describeCondition(base.condition)}` : ''} · <span className="rs-k">Does</span> {describeFx(base)}{edit && <> · <span className="rs-k">Yours</span> <span className="rc-edited-text">{describeFx(edit)}</span></>}
        </div>
      </div>
      <div className="rc-try-grid">
        {KNOBS.map(({ k, label, hint }) => (
          <label key={k} title={hint}><span className="rs-k">{label} <span className="rc-dim">{k === 'crashResistance' ? 'pts' : '%'}</span></span>
            <input type="number" step={1} value={knobs[k]} disabled={busy} onChange={e => commit({ ...knobs, [k]: Number(e.target.value) || 0 }, chance)} className={knobs[k] !== toPct(k, base.effects[k]) ? 'rc-edited' : ''} />
          </label>
        ))}
        {base.trigger !== 'passive' && (
          <label title="How often the trigger actually fires"><span className="rs-k">Fires <span className="rc-dim">%</span></span>
            <input type="number" step={5} min={1} max={100} value={chance} disabled={busy} onChange={e => commit(knobs, Math.max(1, Math.min(100, Number(e.target.value) || 100)))} className={chance !== Math.round((base.triggerChance ?? 1) * 100) ? 'rc-edited' : ''} />
          </label>
        )}
        <span className="rc-try-actions">
          {edit && !busy && <button type="button" className="rs-link" onClick={() => onEdit(null)}>reset</button>}
          {edit && <button type="button" className="rs-link" onClick={onCopy}>{copied ? 'Copied' : 'Copy as code'}</button>}
          {!edit && <span className="rs-hint">Change a number, then press Measure at the top.</span>}
        </span>
      </div>
      {yours && against && (
        <div className="rc-compare rc-compare-3">
          <div><span className="rs-k">{against.races === TAG_CALIBRATION.races && against.tagId === yours.tagId && against === TAG_CALIBRATION.tags.find(c => c.tagId === yours.tagId) ? 'Shipped' : 'Re-roll'} · {against.races} races</span><Big c={against} /></div>
          <div><span className="rs-k">Yours · {yours.races} races</span><Big c={yours} /></div>
          <div className="rc-verdict"><Verdict mine={yours} theirs={against} /></div>
        </div>
      )}
    </div>
  );
}

function readKnobs(t: Tag | undefined): Record<Knob, number> {
  return Object.fromEntries(KNOBS.map(({ k }) => [k, toPct(k, t?.effects[k])])) as Record<Knob, number>;
}
function describeFx(t: Tag): string {
  const parts = KNOBS.filter(({ k }) => t.effects[k] !== undefined).map(({ k, label }) => `${label} ${toPct(k, t.effects[k]) > 0 ? '+' : ''}${toPct(k, t.effects[k])}${k === 'crashResistance' ? '' : '%'}`);
  return (parts.join(', ') || 'no effects') + (t.triggerChance !== undefined && t.triggerChance < 1 ? ` · fires ${Math.round(t.triggerChance * 100)}%` : '');
}
function Big({ c }: { c: TagCalibration }) {
  return (
    <div className="rc-big">
      <span><b className={c.places > 0.05 ? 'rc-good' : c.places < -0.05 ? 'rc-bad' : ''}>{fmtSigned(c.places)}</b><small>places ±{c.placesSe.toFixed(1)}</small></span>
      <span><b>{pct(c.winRate)}</b><small>wins · field {pct(c.baseWinRate)}</small></span>
      <span><b>{pct(c.podiumRate)}</b><small>podiums · field {pct(c.basePodiumRate)}</small></span>
      <span><b className={c.dnfRate > c.baseDnfRate + 0.05 ? 'rc-bad' : ''}>{pct(c.dnfRate)}</b><small>DNF · field {pct(c.baseDnfRate)}</small></span>
    </div>
  );
}
function Verdict({ mine, theirs }: { mine: TagCalibration; theirs: TagCalibration }) {
  const d = mine.places - theirs.places;
  const sig = Math.abs(d) > 2 * Math.sqrt(mine.placesSe ** 2 + theirs.placesSe ** 2);
  const v = bandViolation(mine);
  return (
    <span className={v ? 'rc-bad' : sig ? 'rc-good' : 'rs-hint'}>
      {v ? `⚠ Out of band: ${v}.` : sig ? `${d > 0 ? 'Stronger' : 'Weaker'} by ${Math.abs(d).toFixed(1)} places — a real change.` : `Within noise of the shipped version (${d > 0 ? '+' : ''}${d.toFixed(1)} places). Push harder or run more races.`}
    </span>
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
    const text = r.kind === 'physics'
      ? `# Physics run · seed ${r.seed} · ${r.races} races${r.presetName ? ` · preset ${r.presetName}` : ''}\n\n| Metric | Value |\n|---|---:|\n${r.result.metrics.map(m => `| ${m.label} | ${formatMetric(m.value, m.format)} |`).join('\n')}\n`
      : calibrationMarkdown(r.result);
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* no clipboard */ }
  };
  return (
    <>
      <section className="rs-row rc-explain">
        <p><b>Your notebook.</b> Presets are setups you named — edited tags and knobs together. Load one to keep working on it, or pick it in <b>Quick Race → Run Setup</b> to race under it. Runs are every measurement you made, newest first, with the seed so anyone can repeat it. This page is this browser's copy; <b>Send to ledger</b> pushes what's new into the repo as one GitHub issue (you press Submit there, an action folds it in and closes it), and it shows up below under <b>Shared ledger</b> on every device once the site redeploys.</p>
        <div className="rc-reroll">
          <span className="rs-k">Here</span><span className="rc-dim">{notebook.presets.length} preset{notebook.presets.length === 1 ? '' : 's'} · {notebook.runs.length} run{notebook.runs.length === 1 ? '' : 's'}</span>
          <span className="rs-k">Shared</span><span className="rc-dim">{ledger ? `${ledger.presets.length} preset${ledger.presets.length === 1 ? '' : 's'} · ${ledger.runs.length} run${ledger.runs.length === 1 ? '' : 's'}` : ledgerErr ? 'unreachable' : '…'}</span>
          <button type="button" className="rs-btn rs-btn-primary" disabled={!pending} onClick={send} title="Opens one prefilled GitHub issue with everything new; you press Submit">Send {unsent ? `${unsent} new` : 'to ledger'}{pending && pending.left > 0 ? ` (${pending.runIds.length + pending.presetIds.length} now, ${pending.left} next press)` : ''}</button>
          <span className="rc-actions"><button type="button" className="rs-link" onClick={download}>Download notebook JSON</button></span>
        </div>
      </section>
      <section className="rs-row rc-table-row">
        <div className="rc-knob-head"><span className="rs-k">Presets</span><span className="rs-hint">{notebook.presets.length ? 'Load one to edit or measure it again.' : 'None yet — change something on either tab and name it in the strip.'}</span></div>
        {notebook.presets.length > 0 && (
          <div className="rc-table-wrap"><table className="rc-table rc-compact"><thead><tr><th>Preset</th><th>Changes</th><th>Saved</th><th></th></tr></thead><tbody>
            {notebook.presets.map(p => (
              <Fragment key={p.id}>
              <tr className={working.preset?.id === p.id ? 'rc-row-on' : ''} onClick={() => setOpen(o => o === p.id ? '' : p.id)}>
                <td className="rc-tag">{p.name}{working.preset?.id === p.id && <span className="rc-edited-text"> · loaded</span>}{p.sentAt && p.sentAt >= p.createdAt ? <span className="rc-dim" title="In the shared ledger"> ☁</span> : ''}</td>
                <td className="rc-dim">{presetSummary(p)}</td>
                <td className="rc-dim">{new Date(p.createdAt).toLocaleString()}</td>
                <td><span className="rc-draft-actions"><button type="button" className="rs-link" onClick={e => { e.stopPropagation(); onLoad(p); }}>Load</button><button type="button" className="rs-link rc-bad" onClick={e => { e.stopPropagation(); onDeletePreset(p.id); }}>Delete</button></span></td>
              </tr>
              {open === p.id && <tr className="rc-try-row"><td colSpan={4}><div className="rc-try rc-preset-detail">
                {Object.values(p.tagEdits).map(t => <div key={t.id}><span className="rc-emoji">{t.emoji}</span> <b>{t.name}</b> <span className="rc-edited-text">{describeFx(t)}</span></div>)}
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
                <td className="rc-tag">{r.kind === 'tags' ? 'Tags' : 'Physics'} <span className="rc-dim">{r.note}</span>{r.sentAt ? <span className="rc-dim" title="In the shared ledger"> ☁</span> : ''}</td>
                <td><span className="rc-num">{r.seed}</span></td>
                <td><span className="rc-num">{r.races}</span></td>
                <td className="rc-dim">{r.presetName ?? '—'}</td>
                <td className="rc-dim">{runHeadline(r)}</td>
                <td><span className="rc-draft-actions"><button type="button" className="rs-link" onClick={e => { e.stopPropagation(); copyRun(r); }}>Copy</button><button type="button" className="rs-link rc-bad" onClick={e => { e.stopPropagation(); onDeleteRun(r.id); }}>Delete</button></span></td>
              </tr>
              {open === r.id && <tr className="rc-try-row"><td colSpan={7}><div className="rc-try rc-preset-detail">
                {r.kind === 'physics'
                  ? r.result.metrics.map(m => <div key={m.id}><b>{m.label}</b> <span className={`rc-num ${metricOutOfBand(m) ? 'rc-bad' : ''}`}>{formatMetric(m.value, m.format)}</span></div>)
                  : r.result.tags.map(c => { const t = getTagById(c.tagId); return <div key={c.tagId}><span className="rc-emoji">{t?.emoji}</span> <b>{t?.name ?? c.tagId}</b> <span className={`rc-num ${c.places > 0.05 ? 'rc-good' : c.places < -0.05 ? 'rc-bad' : ''}`}>{fmtSigned(c.places)}</span> <span className="rc-se">±{c.placesSe.toFixed(1)} · wins {pct(c.winRate)} · DNF {pct(c.dnfRate)}</span></div>; })}
                <div className="rs-hint">Repeat it: <code>npm run {r.kind === 'physics' ? `lab -- ${r.seed} ${r.races} all no-tags` : `calibrate -- ${r.races} ${r.result.tags.map(c => c.tagId).join(' ')}`}</code>{r.kind === 'tags' && r.seed !== TAG_CALIBRATION.batchSeed ? ` (the script uses batch ${TAG_CALIBRATION.batchSeed}; this run used ${r.seed})` : ''}</div>
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
                <td className="rc-tag">{r.kind === 'tags' ? 'Tags' : 'Physics'} <span className="rc-dim">{r.note}</span></td>
                <td><span className="rc-num">{r.seed}</span></td>
                <td><span className="rc-num">{r.races}</span></td>
                <td className="rc-dim">{r.presetName ?? '—'}</td>
                <td className="rc-dim">{runHeadline(r)}</td>
                <td className="rc-dim">{r.user ?? '—'}{r.issue ? ` · #${r.issue}` : ''}</td>
              </tr>
              {open === `l-${r.id}` && <tr className="rc-try-row"><td colSpan={7}><div className="rc-try rc-preset-detail">
                {r.kind === 'physics'
                  ? r.result.metrics.map(m => <div key={m.id}><b>{m.label}</b> <span className={`rc-num ${metricOutOfBand(m) ? 'rc-bad' : ''}`}>{formatMetric(m.value, m.format)}</span></div>)
                  : r.result.tags.map(c => { const t = getTagById(c.tagId); return <div key={c.tagId}><span className="rc-emoji">{t?.emoji}</span> <b>{t?.name ?? c.tagId}</b> <span className={`rc-num ${c.places > 0.05 ? 'rc-good' : c.places < -0.05 ? 'rc-bad' : ''}`}>{fmtSigned(c.places)}</span> <span className="rc-se">±{c.placesSe.toFixed(1)} · wins {pct(c.winRate)} · DNF {pct(c.dnfRate)}</span></div>; })}
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
  if (r.kind === 'physics') {
    const pick = (id: string) => r.result.metrics.find(m => m.id === id);
    const p = pick('paceRho'), d = pick('dnf'), s = pick('stops');
    return [p && `pace→finish ${formatMetric(p.value, p.format)}`, d && `DNF ${formatMetric(d.value, d.format)}`, s && `stops ${formatMetric(s.value, s.format)}`].filter(Boolean).join(' · ');
  }
  const top = [...r.result.tags].sort((a, b) => Math.abs(b.places) - Math.abs(a.places)).slice(0, 3);
  return top.map(c => `${getTagById(c.tagId)?.name ?? c.tagId} ${fmtSigned(c.places)}`).join(' · ');
}

// ---------------------------------------------------------------------------
// Method

function MethodTab() {
  return (
    <section className="rs-row rc-method">
      <div className="rs-row-head"><span className="rs-k">How a lab number earns trust</span></div>
      <ol>
        <li><b>A lab race is a league race.</b> Every batch goes through <code>src/racecontrol/runner.ts</code>, which builds a one-race league with <code>createLeague</code> and prepares the engine with <code>prepareScheduledRace</code> — the same two calls the live broadcast and the wall-clock settle use. Current tracks only, genesis roster per universe, seeded weather, the chosen card hand.</li>
        <li><b>Everything is seeded.</b> A batch is (seed, size, cards). Race <i>i</i> derives from <code>deriveSeed(seed, 'lab', i)</code>; nothing in the lab touches <code>Math.random</code>. The same spec gives the same race in this browser, in a vitest, and in the terminal.</li>
        <li><b>Every result carries a fingerprint.</b> Physics shows <code>#xxxxxxxx</code> next to its seed; <code>npm run lab -- &lt;seed&gt; &lt;races&gt; all no-tags</code> prints the same one when it ran the same races. Tag calibration carries the baseline batch's fingerprint.</li>
        <li><b>Physics is measured on untagged races.</b> The <code>no-tags</code> card, so the rules are read without personalities on top. Change a knob and the same seeded batch runs with your value — only the knob differs.</li>
        <li><b>Tags are measured paired and solo.</b> One tag, one carrier, the <code>no-tags</code> card for everyone else, against the identical untagged race. "Places gained" is the carrier's finishing position with the tag minus without, averaged; the ± is the standard error.</li>
        <li><b>The deck is gated.</b> <code>src/data/tagCalibration.json</code> is committed. <code>npm test</code> fails if a genesis tag is missing from it, if a tag's effects changed since it was measured, or if a tag is out of band. Fix: tune the tag, <code>npm run calibrate</code>, commit both.</li>
        <li><b>Re-roll to see the dice.</b> Both tabs can re-run on a fresh seed. A number that moves a lot between seeds is mostly luck; the ± and the Δ flag tell you when a difference is bigger than the noise.</li>
        <li><b>Export what you see.</b> Tag calibration copies as markdown or downloads as JSON; both tabs give you the code for an edit you liked (Copy as code). Paste it into an issue and anyone can rerun it.</li>
      </ol>
      <div className="rc-cmds">
        <span className="rs-k">Commands</span>
        <code>npm run lab -- 2026 100 all</code><span className="rs-hint">replay a physics batch, print its fingerprint</span>
        <code>npm run lab -- 2026 100 all no-tags rain</code><span className="rs-hint">…under a card hand</span>
        <code>npm run calibrate</code><span className="rs-hint">re-measure every genesis tag, rewrite the JSON</span>
        <code>npm run calibrate -- 50 glass-cannon</code><span className="rs-hint">one tag, quick read, nothing written</span>
        <code>npx tsx scripts/mechanics-probe.mjs 200</code><span className="rs-hint">the no-tag mechanics gates (#246)</span>
      </div>
      <p className="rs-hint">Known gaps, parked: the safety-car count reads a double-logged event (halved here); tags are measured solo in a tag-free field, their value in a real grid is a different question. BetLab (odds) is gone; src/betting/utils keeps the odds math.</p>
    </section>
  );
}
