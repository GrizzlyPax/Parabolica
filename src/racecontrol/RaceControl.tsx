// Race Control — the lab. Everything here runs races the way the live game
// does (src/racecontrol/runner.ts), is seeded so it can be replicated outside
// the browser (`npm run lab`, `npm run calibrate`), and exports what it shows.
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import './RaceControl.css';
import { PhysicsTab } from './PhysicsTab';
import { useLabRunner } from './useLabRunner';
import { randomSeed } from '../engine/rng';
import { getTagById, describeCondition, type Tag } from '../data/tags';
import { TAG_CALIBRATION } from '../data/tagCalibration';
import { bandViolation, calibrateTagsAsync, CALIBRATION_BANDS, CALIBRATION_RACES, type CalibrationFile, type TagCalibration, type CalibrateProgress } from './calibrate';
import type { CalibrateInMessage, CalibrateOutMessage } from './calibrateWorker';
import { LabRunner } from './labRunner';

type TabId = 'calibration' | 'physics' | 'method';
const TABS: { id: TabId; label: string; hint: string }[] = [
  { id: 'calibration', label: 'Tag calibration', hint: 'what each tag does, measured' },
  { id: 'physics', label: 'Physics calibration', hint: 'what the race rules produce, measured; change a knob and re-measure' },
  { id: 'method', label: 'Method', hint: 'why these numbers can be trusted' },
];

export default function RaceControl({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<TabId>('calibration');
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
      {tab === 'calibration' && <CalibrationTab />}
      {tab === 'physics' && <PhysicsTab />}
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

function CalibrationTab() {
  const file = TAG_CALIBRATION;
  const [sort, setSort] = useState<SortKey>('places');
  const [desc, setDesc] = useState(true);
  const [picked, setPicked] = useState<string>('');
  const [copied, setCopied] = useState(false);
  // Re-roll: the whole table again on a fresh seed, fewer races, to see how
  // much of any number is the dice.
  const [rerollSeed, setRerollSeed] = useState<number>(() => randomSeed());
  const [rerollRaces, setRerollRaces] = useState(50);
  const reroll = useLabRunner<CalibrateInMessage, CalibrateOutMessage, CalibrateProgress, CalibrationFile>({
    makeWorker: () => new Worker(new URL('./calibrateWorker.ts', import.meta.url), { type: 'module' }),
    inline: async (msg, sink) => {
      if (msg.type !== 'START') return;
      const out = await calibrateTagsAsync(msg.tagIds, { races: msg.races, batchSeed: msg.batchSeed, cards: msg.cards, onProgress: p => { sink.post({ type: 'PROGRESS', progress: p }); return !sink.aborted(); } });
      if (!sink.aborted()) sink.post({ type: 'COMPLETE', file: out.file });
    },
    read: m => m.type === 'PROGRESS' ? { progress: m.progress } : m.type === 'COMPLETE' ? { result: m.file } : { error: m.message },
    abort: { type: 'ABORT' },
  });
  const rolled = reroll.result;
  const rolledBy = useMemo(() => new Map((rolled?.tags ?? []).map(c => [c.tagId, c])), [rolled]);
  const startReroll = () => reroll.start({ type: 'START', tagIds: file.tags.map(c => c.tagId), races: rerollRaces, batchSeed: rerollSeed, cards: file.cards }, { done: 0, total: rerollRaces * (file.tags.length + 1), label: 'baseline', race: 0, races: rerollRaces });
  const rows = useMemo(() => {
    const r = file.tags.map(c => ({ c, tag: getTagById(c.tagId) })).filter((x): x is Row => !!x.tag).sort(SORTERS[sort]);
    return desc ? r : r.reverse();
  }, [file, sort, desc]);
  const violations = rows.filter(r => bandViolation(r.c));
  const maxPlaces = Math.max(1, ...rows.map(r => Math.abs(r.c.places)));
  const setSortKey = (k: SortKey) => { if (k === sort) setDesc(d => !d); else { setSort(k); setDesc(true); } };

  const copyMd = async () => {
    try { await navigator.clipboard.writeText(calibrationMarkdown(file)); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* no clipboard */ }
  };
  const download = () => {
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `tagCalibration-${file.batchSeed}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <>
      <section className="rs-row rc-explain">
        <p><b>Every tag, measured.</b> Each one was put on a single driver, alone, in {file.races} races, then the same {file.races} races with nobody tagged. <b>Places</b> = how many finishing positions the tag was worth (<span className="rc-good">+2.6</span> good, <span className="rc-bad">−1.0</span> hurts; ± is the uncertainty). Wins, podiums and DNF show the carrier's rate with the untagged rate in grey. Click a header to sort; click a row to see what it does and try a change.</p>
        <div className="rc-bands">
          <span className="rs-hint">Batch <code>{file.batchSeed}</code> · cards <code>{file.cards.join(' ') || 'none'}</code> · {new Date(file.generatedAt).toLocaleDateString()} · bands |places| ≤ {CALIBRATION_BANDS.maxPlaces}, DNF ≤ {Math.round(CALIBRATION_BANDS.maxDnfRate * 100)}%, wins ≤ {Math.round(CALIBRATION_BANDS.maxWinRate * 100)}% · <span className={violations.length ? 'rc-bad' : 'rc-good'}>{violations.length ? `${violations.length} out of band` : 'all in band'}</span></span>
          <span className="rc-actions">
            <button type="button" className="rs-link" onClick={copyMd}>{copied ? 'Copied' : 'Copy as markdown'}</button>
            <button type="button" className="rs-link" onClick={download}>Download JSON</button>
          </span>
        </div>
        <div className="rc-reroll">
          <span className="rs-k">Re-roll</span>
          <span className="rs-hint">Same test, fresh dice: every tag again on a new seed, so you can see how much of a number is luck. A second column appears with the difference.</span>
          <input type="number" value={rerollSeed} disabled={!!reroll.progress} onChange={e => setRerollSeed(Number(e.target.value) >>> 0)} aria-label="Re-roll seed" />
          <button type="button" className="rs-link" disabled={!!reroll.progress} onClick={() => setRerollSeed(randomSeed())}>new seed</button>
          <select value={rerollRaces} disabled={!!reroll.progress} onChange={e => setRerollRaces(Number(e.target.value))}>
            <option value={25}>25 races per tag · ~2 min</option>
            <option value={50}>50 races per tag · ~4 min</option>
            <option value={100}>100 races per tag · ~8 min</option>
          </select>
          {reroll.progress
            ? <button type="button" className="rs-btn rs-btn-ghost" onClick={reroll.stop}>Stop</button>
            : <button type="button" className="rs-btn rs-btn-primary" onClick={startReroll}>Re-roll</button>}
          {reroll.progress && <span className="rc-progress"><span className="rc-progress-bar"><span style={{ width: `${(reroll.progress.done / reroll.progress.total) * 100}%` }} /></span><span>{reroll.progress.label === 'baseline' ? 'Untagged baseline' : reroll.progress.label} · {reroll.progress.done}/{reroll.progress.total}{reroll.mode === 'main thread' ? ' · on the main thread' : ''}</span></span>}
          {reroll.error && <span className="rc-bad">{reroll.error}</span>}
          {rolled && !reroll.progress && <span className="rc-good">✓ seed {rolled.batchSeed} · {rolled.races} races per tag · baseline #{rolled.baselineFingerprint}</span>}
        </div>
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
                {rolled && <th title={`Re-rolled on seed ${rolled.batchSeed}, ${rolled.races} races per tag`}>Re-roll · Δ</th>}
                <th><SortBtn k="wins" cur={sort} desc={desc} set={setSortKey}>Wins</SortBtn></th>
                <th><SortBtn k="podiums" cur={sort} desc={desc} set={setSortKey}>Podiums</SortBtn></th>
                <th><SortBtn k="dnf" cur={sort} desc={desc} set={setSortKey}>DNF</SortBtn></th>
                <th><SortBtn k="fires" cur={sort} desc={desc} set={setSortKey}>Fires</SortBtn></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ c, tag }) => {
                const v = bandViolation(c);
                const open = picked === c.tagId;
                return (
                  <Fragment key={c.tagId}>
                  <tr className={`${v ? 'rc-row-bad' : ''} ${picked === c.tagId ? 'rc-row-on' : ''}`} onClick={() => setPicked(p => p === c.tagId ? '' : c.tagId)} title={`${tag.description}${v ? ` — ⚠ ${v}` : ''}`}>
                    <td className="rc-tag"><span className="rc-emoji">{tag.emoji}</span> {tag.name}{v && <span className="rc-bad"> ⚠</span>}</td>
                    <td className="rc-dim">{c.target}</td>
                    <td><span className="rc-rarity" style={{ color: `var(--rarity-${c.rarity})` }}>{c.rarity}</span></td>
                    <td className="rc-places"><PlacesBar value={c.places} max={maxPlaces} /><span className={`rc-num ${c.places > 0.05 ? 'rc-good' : c.places < -0.05 ? 'rc-bad' : ''}`}>{fmtSigned(c.places)}</span><span className="rc-se">±{c.placesSe.toFixed(1)}</span></td>
                    {rolled && <td>{(() => { const r = rolledBy.get(c.tagId); if (!r) return <span className="rc-dim">—</span>; const d = r.places - c.places; const noise = 2 * Math.sqrt(r.placesSe ** 2 + c.placesSe ** 2); return <><span className="rc-num">{fmtSigned(r.places)}</span><span className={`rc-se ${Math.abs(d) > noise ? 'rc-bad' : ''}`}>{d > 0 ? '+' : ''}{d.toFixed(1)}{Math.abs(d) > noise ? ' ⚠' : ''}</span></>; })()}</td>}
                    <td><span className="rc-num">{pct(c.winRate)}</span><span className="rc-se">{pct(c.baseWinRate)}</span></td>
                    <td><span className="rc-num">{pct(c.podiumRate)}</span><span className="rc-se">{pct(c.basePodiumRate)}</span></td>
                    <td><span className={`rc-num ${c.dnfRate > c.baseDnfRate + 0.05 ? 'rc-bad' : ''}`}>{pct(c.dnfRate)}</span><span className="rc-se">{pct(c.baseDnfRate)}</span></td>
                    <td><span className="rc-num rc-dim">{tag.trigger === 'passive' ? '—' : c.activationsPerRace.toFixed(2)}</span><span className="rc-chev">{open ? '▾' : '▸'}</span></td>
                  </tr>
                  {open && <tr className="rc-try-row"><td colSpan={rolled ? 9 : 8}><TryPanel file={file} tagId={c.tagId} /></td></tr>}
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
// Try a change: edit a tag's numbers, measure it the same way, compare.

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

function TryPanel({ file, tagId }: { file: CalibrationFile; tagId: string }) {
  const base = getTagById(tagId);
  const [knobs, setKnobs] = useState<Record<Knob, number>>(() => readKnobs(base));
  const [chance, setChance] = useState<number>(Math.round((base?.triggerChance ?? 1) * 100));
  const [races, setRaces] = useState(50);
  const [progress, setProgress] = useState<CalibrateProgress | null>(null);
  const [result, setResult] = useState<{ tag: Tag; file: CalibrationFile } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState('');
  const [copied, setCopied] = useState(false);
  const runner = useRef<LabRunner<CalibrateInMessage, CalibrateOutMessage> | null>(null);
  const pendingTag = useRef<Tag | null>(null);

  useEffect(() => { setKnobs(readKnobs(base)); setChance(Math.round((base?.triggerChance ?? 1) * 100)); setResult(null); setError(null); }, [tagId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    runner.current = new LabRunner<CalibrateInMessage, CalibrateOutMessage>(
      () => new Worker(new URL('./calibrateWorker.ts', import.meta.url), { type: 'module' }),
      async (msg, sink) => {
        if (msg.type !== 'START') return;
        const out = await calibrateTagsAsync(msg.tagIds, { races: msg.races, batchSeed: msg.batchSeed, cards: msg.cards, onProgress: p => { sink.post({ type: 'PROGRESS', progress: p }); return !sink.aborted(); } });
        if (!sink.aborted()) sink.post({ type: 'COMPLETE', file: out.file });
      },
      m => {
        if (m.type === 'PROGRESS') setProgress(m.progress);
        else if (m.type === 'COMPLETE') { setResult(pendingTag.current ? { tag: pendingTag.current, file: m.file } : null); setProgress(null); }
        else { setError(m.message); setProgress(null); }
        setMode(runner.current?.mode ?? '');
      },
      { type: 'ABORT' },
    );
    return () => runner.current?.terminate();
  }, []);

  if (!base) return null;
  const edited: Tag = {
    ...base,
    effects: Object.fromEntries(KNOBS.map(({ k }) => [k, knobs[k] === 0 ? undefined : fromPct(k, knobs[k])]).filter(([, v]) => v !== undefined)),
    ...(base.triggerChance !== undefined || chance !== 100 ? { triggerChance: chance / 100 } : {}),
  };
  const changed = KNOBS.some(({ k }) => knobs[k] !== toPct(k, base.effects[k])) || chance !== Math.round((base.triggerChance ?? 1) * 100);
  const theirs = file.tags.find(c => c.tagId === tagId);
  // The last measurement belongs to the version it measured; editing after a
  // run clears it so a stale number never sits beside new knobs.
  const mineFor = result && JSON.stringify(result.tag) === JSON.stringify(edited) ? result.file.tags[0] : undefined;

  const run = () => {
    pendingTag.current = edited;
    setResult(null); setError(null); setProgress({ done: 0, total: races * 2, label: 'baseline', race: 0, races });
    runner.current?.start({ type: 'START', tagIds: [edited], races, batchSeed: file.batchSeed, cards: file.cards });
  };
  const stop = () => { runner.current?.terminate(); setProgress(null); };
  const reset = () => { setKnobs(readKnobs(base)); setChance(Math.round((base.triggerChance ?? 1) * 100)); };
  const copyCode = async () => {
    const fx = KNOBS.filter(({ k }) => knobs[k] !== 0).map(({ k }) => `${k}: ${k === 'crashResistance' ? (knobs[k] / 100).toFixed(2) : (1 + knobs[k] / 100).toFixed(3)}`);
    const code = `// ${base.name} (${base.id}) — src/data/tags.ts\n    effects: { ${fx.join(', ')} },${base.triggerChance !== undefined || chance !== 100 ? `\n    triggerChance: ${(chance / 100).toFixed(2)},` : ''}`;
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* no clipboard */ }
  };
  const phase = progress ? (progress.label === 'baseline' ? 'Untagged baseline' : `With your ${progress.label}`) : '';

  return (
    <div className="rc-try">
      <div className="rc-try-what">
        <span className="rc-emoji">{base.emoji}</span> <b>{base.name}</b> <span className="rc-dim">{base.description}</span>
        <div className="rc-try-readout">
          <span className="rs-k">Fires</span> {base.trigger === 'passive' ? 'always on' : base.trigger.replace('_', ' ')}{base.condition ? ` · only when ${describeCond(base)}` : ''} · <span className="rs-k">Does</span> {describeFx(base)}{changed && <> · <span className="rs-k">Your version</span> <span className="rc-edited-text">{describeFx(edited)}</span></>}
        </div>
      </div>
      <div className="rs-k rc-try-k">Try a change <span className="rs-hint">— edit the numbers, press Measure; it is measured exactly like the table</span></div>
      <div className="rc-try-grid">
        {KNOBS.map(({ k, label, hint }) => (
          <label key={k} title={hint}><span className="rs-k">{label} <span className="rc-dim">{k === 'crashResistance' ? 'pts' : '%'}</span></span>
            <input type="number" step={1} value={knobs[k]} disabled={!!progress} onChange={e => setKnobs(prev => ({ ...prev, [k]: Number(e.target.value) || 0 }))} className={knobs[k] !== toPct(k, base.effects[k]) ? 'rc-edited' : ''} />
          </label>
        ))}
        {base.trigger !== 'passive' && (
          <label title="How often the trigger actually fires"><span className="rs-k">Fires <span className="rc-dim">%</span></span>
            <input type="number" step={5} min={1} max={100} value={chance} disabled={!!progress} onChange={e => setChance(Math.max(1, Math.min(100, Number(e.target.value) || 100)))} className={chance !== Math.round((base.triggerChance ?? 1) * 100) ? 'rc-edited' : ''} />
          </label>
        )}
        <label><span className="rs-k">Races</span>
          <select value={races} onChange={e => setRaces(Number(e.target.value))} disabled={!!progress}>
            <option value={50}>50 — quick, ~15 s</option>
            <option value={file.races}>{file.races} — same as the table, ~1 min</option>
          </select>
        </label>
        <span className="rc-try-actions">
          {progress
            ? <button type="button" className="rs-btn rs-btn-ghost" onClick={stop}>Stop</button>
            : <button type="button" className="rs-btn rs-btn-primary" onClick={run}>Measure</button>}
          {changed && !progress && <button type="button" className="rs-link" onClick={reset}>Reset</button>}
        </span>
      </div>
      {progress && (
        <div className="rc-progress">
          <span className="rc-progress-bar"><span style={{ width: `${(progress.done / progress.total) * 100}%` }} /></span>
          <span>{phase} · race {progress.race} of {progress.races}{mode === 'main thread' ? ' · on the main thread' : ''}</span>
        </div>
      )}
      {error && <div className="rc-bad">{error}</div>}
      {mineFor && theirs && (
        <div className="rc-compare rc-compare-3">
          <div><span className="rs-k">Table · as shipped · {theirs.races} races</span><Big c={theirs} /></div>
          <div><span className="rs-k">{changed ? 'Your version' : 'Re-measured'} · {mineFor.races} races</span><Big c={mineFor} /></div>
          <div className="rc-verdict">
            {changed
              ? <Verdict mine={mineFor} theirs={theirs} />
              : (mineFor.races === theirs.races
                ? (mineFor.places === theirs.places && mineFor.winRate === theirs.winRate && mineFor.dnfRate === theirs.dnfRate
                  ? <span className="rc-good">✓ Same races, same answer. The table is live, not stale.</span>
                  : <span className="rc-bad">⚠ Different from the table — the engine or this tag changed since it was measured. Run npm run calibrate.</span>)
                : <span className="rs-hint">Quick read of the same tag: within ±{(2 * mineFor.placesSe).toFixed(1)} places of the table is the same thing. Pick {theirs.races} races for an exact match.</span>)}
            {changed && <button type="button" className="rs-link" onClick={copyCode}>{copied ? 'Copied' : 'Copy as code'}</button>}
          </div>
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
function describeCond(t: Tag): string {
  const c = t.condition; if (!c) return '';
  return describeCondition(c);
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
      {v ? `⚠ Out of band: ${v}.` : sig ? `${d > 0 ? 'Stronger' : 'Weaker'} by ${Math.abs(d).toFixed(1)} places — a real change.` : `Within noise of the shipped version (${d > 0 ? '+' : ''}${d.toFixed(1)} places). Push harder or run ${CALIBRATION_RACES} races.`}
    </span>
  );
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
