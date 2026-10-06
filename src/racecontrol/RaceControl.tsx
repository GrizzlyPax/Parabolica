// Race Control — the lab. Everything here runs races the way the live game
// does (src/racecontrol/runner.ts), is seeded so it can be replicated outside
// the browser (`npm run lab`, `npm run calibrate`), and exports what it shows.
import { useEffect, useMemo, useRef, useState } from 'react';
import './RaceControl.css';
import SimLab from '../simlab/SimLab';
import BetLab from '../betlab/BetLab';
import { ALL_TAGS, getTagById, type Tag } from '../data/tags';
import { TAG_CALIBRATION } from '../data/tagCalibration';
import { bandViolation, describeCalibration, CALIBRATION_BANDS, type CalibrationFile, type TagCalibration } from './calibrate';
import type { CalibrateInMessage, CalibrateOutMessage } from './calibrateWorker';

type TabId = 'calibration' | 'lab' | 'odds' | 'method';
const TABS: { id: TabId; label: string; hint: string }[] = [
  { id: 'calibration', label: 'Tag calibration', hint: 'what each tag does, measured' },
  { id: 'lab', label: 'Sim Lab', hint: 'seeded batches, canon vs heretic' },
  { id: 'odds', label: 'Odds', hint: 'the crowd’s book (BetLab)' },
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
      {tab === 'lab' && <section className="rs-row rc-legacy"><SimLab /></section>}
      {tab === 'odds' && <section className="rs-row rc-legacy"><BetLab /></section>}
      {tab === 'method' && <MethodTab />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Calibration

type SortKey = 'places' | 'wins' | 'dnf' | 'name' | 'rarity';
const RARITY_RANK = { common: 0, uncommon: 1, rare: 2, legendary: 3 } as const;

function CalibrationTab() {
  const file = TAG_CALIBRATION;
  const [sort, setSort] = useState<SortKey>('places');
  const [copied, setCopied] = useState(false);
  const rows = useMemo(() => {
    const r = file.tags.map(c => ({ c, tag: getTagById(c.tagId) })).filter((x): x is { c: TagCalibration; tag: Tag } => !!x.tag);
    const by: Record<SortKey, (a: typeof r[number], b: typeof r[number]) => number> = {
      places: (a, b) => b.c.places - a.c.places,
      wins: (a, b) => b.c.winRate - a.c.winRate,
      dnf: (a, b) => b.c.dnfRate - a.c.dnfRate,
      name: (a, b) => a.tag.name.localeCompare(b.tag.name),
      rarity: (a, b) => RARITY_RANK[b.c.rarity] - RARITY_RANK[a.c.rarity] || b.c.places - a.c.places,
    };
    return r.sort(by[sort]);
  }, [file, sort]);
  const violations = rows.filter(r => bandViolation(r.c));
  const maxPlaces = Math.max(1, ...rows.map(r => Math.abs(r.c.places)));

  const copyMd = async () => {
    const md = calibrationMarkdown(file);
    try { await navigator.clipboard.writeText(md); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* no clipboard */ }
  };
  const download = () => {
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `tagCalibration-${file.batchSeed}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <>
      <section className="rs-row">
        <div className="rs-row-head">
          <span className="rs-k">The committed calibration</span>
          <span className="rs-hint">
            Each genesis tag was forced, alone, onto one driver in {file.races} seeded races and compared with the same races untagged.
            Batch seed <code>{file.batchSeed}</code> · cards <code>{file.cards.join(' ') || 'none'}</code> · baseline <code>#{file.baselineFingerprint}</code> · {new Date(file.generatedAt).toLocaleDateString()}
          </span>
          <span className="rc-actions">
            <button type="button" className="rs-link" onClick={copyMd}>{copied ? 'Copied' : 'Copy as markdown'}</button>
            <button type="button" className="rs-link" onClick={download}>Download JSON</button>
          </span>
        </div>
        <div className="rc-bands">
          <span className="rs-k">Bands</span>
          <span>|places| ≤ {CALIBRATION_BANDS.maxPlaces}</span>
          <span>DNF ≤ {Math.round(CALIBRATION_BANDS.maxDnfRate * 100)}%</span>
          <span>wins ≤ {Math.round(CALIBRATION_BANDS.maxWinRate * 100)}%</span>
          <span className={violations.length ? 'rc-bad' : 'rc-good'}>{violations.length ? `${violations.length} out of band` : 'all in band'}</span>
          <span className="rs-hint">— <code>npm test</code> fails on a tag outside these, or whose effects changed since this run. Re-run with <code>npm run calibrate</code>.</span>
        </div>
        <div className="rc-table-wrap">
          <table className="rc-table">
            <thead>
              <tr>
                <th><SortBtn k="name" cur={sort} set={setSort}>Tag</SortBtn></th>
                <th>On</th>
                <th><SortBtn k="rarity" cur={sort} set={setSort}>Rarity</SortBtn></th>
                <th><SortBtn k="places" cur={sort} set={setSort}>Places gained</SortBtn></th>
                <th><SortBtn k="wins" cur={sort} set={setSort}>Wins</SortBtn></th>
                <th>Podiums</th>
                <th><SortBtn k="dnf" cur={sort} set={setSort}>DNF</SortBtn></th>
                <th>Procs / race</th>
                <th>Band</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ c, tag }) => {
                const v = bandViolation(c);
                return (
                  <tr key={c.tagId} className={v ? 'rc-row-bad' : ''}>
                    <td className="rc-tag"><span className="rc-emoji">{tag.emoji}</span> {tag.name}<span className="rc-sub">{tag.description}</span></td>
                    <td>{c.target}</td>
                    <td><span className="rc-rarity" style={{ color: `var(--rarity-${c.rarity})` }}>{c.rarity}</span></td>
                    <td className="rc-places">
                      <PlacesBar value={c.places} max={maxPlaces} />
                      <span className={`rc-num ${c.places > 0 ? 'rc-good' : c.places < 0 ? 'rc-bad' : ''}`}>{fmtSigned(c.places)}</span>
                      <span className="rc-se">± {c.placesSe.toFixed(1)}</span>
                    </td>
                    <td><span className="rc-num">{pct(c.winRate)}</span><span className="rc-se">field {pct(c.baseWinRate)} · {mult(c.winRate, c.baseWinRate)}</span></td>
                    <td><span className="rc-num">{pct(c.podiumRate)}</span><span className="rc-se">field {pct(c.basePodiumRate)}</span></td>
                    <td><span className={`rc-num ${c.dnfRate > c.baseDnfRate + 0.05 ? 'rc-bad' : ''}`}>{pct(c.dnfRate)}</span><span className="rc-se">field {pct(c.baseDnfRate)}</span></td>
                    <td><span className="rc-num">{c.activationsPerRace ? c.activationsPerRace.toFixed(2) : tag.trigger === 'passive' ? 'passive' : '0'}</span></td>
                    <td>{v ? <span className="rc-bad" title={v}>⚠ {v}</span> : <span className="rc-good">✓</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <VerifyPanel file={file} />
    </>
  );
}

function SortBtn({ k, cur, set, children }: { k: SortKey; cur: SortKey; set: (k: SortKey) => void; children: React.ReactNode }) {
  return <button type="button" className={`rc-sort ${cur === k ? 'on' : ''}`} onClick={() => set(k)}>{children}{cur === k ? ' ▾' : ''}</button>;
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
const mult = (a: number, b: number) => b > 0 ? `${(a / b).toFixed(1)}×` : '—';
const fmtSigned = (x: number) => `${x > 0 ? '+' : ''}${x.toFixed(1)}`;

export function calibrationMarkdown(file: CalibrationFile): string {
  const head = `| Tag | On | Rarity | Places | Wins (field) | Podiums (field) | DNF (field) | Procs/race | Band |\n|---|---|---|---:|---:|---:|---:|---:|---|`;
  const rows = file.tags.map(c => {
    const t = getTagById(c.tagId);
    return `| ${t?.emoji ?? ''} ${t?.name ?? c.tagId} | ${c.target} | ${c.rarity} | ${fmtSigned(c.places)} ± ${c.placesSe.toFixed(1)} | ${pct(c.winRate)} (${pct(c.baseWinRate)}) | ${pct(c.podiumRate)} (${pct(c.basePodiumRate)}) | ${pct(c.dnfRate)} (${pct(c.baseDnfRate)}) | ${c.activationsPerRace.toFixed(2)} | ${bandViolation(c) ?? 'ok'} |`;
  });
  return `# Tag calibration\n\nBatch seed ${file.batchSeed} · ${file.races} races per tag · cards: ${file.cards.join(' ') || 'none'} · baseline #${file.baselineFingerprint} · ${file.generatedAt}\n\nReplicate: \`npm run calibrate\`\n\n${head}\n${rows.join('\n')}\n`;
}

// ---------------------------------------------------------------------------
// Verify: run the calibration for one tag in this browser and compare.

function VerifyPanel({ file }: { file: CalibrationFile }) {
  const genesis = useMemo(() => ALL_TAGS.filter(t => file.tags.some(c => c.tagId === t.id)), [file]);
  const [tagId, setTagId] = useState(genesis[0]?.id ?? '');
  const [races, setRaces] = useState(file.races);
  const [progress, setProgress] = useState<{ done: number; total: number; label: string } | null>(null);
  const [result, setResult] = useState<CalibrationFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const worker = useRef<Worker | null>(null);
  useEffect(() => () => worker.current?.terminate(), []);

  const run = () => {
    worker.current?.terminate();
    const w = new Worker(new URL('./calibrateWorker.ts', import.meta.url), { type: 'module' });
    worker.current = w;
    setResult(null); setError(null); setProgress({ done: 0, total: races * 2, label: 'starting' });
    w.onmessage = (e: MessageEvent<CalibrateOutMessage>) => {
      const m = e.data;
      if (m.type === 'PROGRESS') setProgress({ done: m.done, total: m.total, label: m.label });
      else if (m.type === 'COMPLETE') { setResult(m.file); setProgress(null); }
      else { setError(m.message); setProgress(null); }
    };
    const msg: CalibrateInMessage = { type: 'START', tagIds: [tagId], races, batchSeed: file.batchSeed, cards: file.cards };
    w.postMessage(msg);
  };
  const stop = () => { worker.current?.terminate(); worker.current = null; setProgress(null); };

  const mine = result?.tags[0];
  const theirs = file.tags.find(c => c.tagId === tagId);
  const exact = races === file.races;
  const same = mine && theirs && exact && mine.places === theirs.places && mine.winRate === theirs.winRate && mine.dnfRate === theirs.dnfRate && result?.baselineFingerprint === file.baselineFingerprint;

  return (
    <section className="rs-row">
      <div className="rs-row-head">
        <span className="rs-k">Replicate it here</span>
        <span className="rs-hint">Runs the same seeded races in this browser. With the full {file.races} races the numbers must match the file exactly; fewer races gives a noisier read of the same tag.</span>
      </div>
      <div className="rc-verify">
        <label><span className="rs-k">Tag</span>
          <select value={tagId} onChange={e => setTagId(e.target.value)}>{genesis.map(t => <option key={t.id} value={t.id}>{t.emoji} {t.name}</option>)}</select>
        </label>
        <label><span className="rs-k">Races</span>
          <select value={races} onChange={e => setRaces(Number(e.target.value))}>{[25, 50, 100, file.races].filter((v, i, a) => a.indexOf(v) === i).map(n => <option key={n} value={n}>{n}{n === file.races ? ' (full)' : ''}</option>)}</select>
        </label>
        {progress
          ? <button type="button" className="rs-btn rs-btn-ghost" onClick={stop}>Stop</button>
          : <button type="button" className="rs-btn rs-btn-primary" onClick={run} disabled={!tagId}>Run in browser</button>}
        {progress && (
          <span className="rc-progress"><span className="rc-progress-bar"><span style={{ width: `${(progress.done / progress.total) * 100}%` }} /></span>{progress.label} {progress.done}/{progress.total}</span>
        )}
        {error && <span className="rc-bad">{error}</span>}
      </div>
      {mine && theirs && (
        <div className="rc-compare">
          <div><span className="rs-k">This browser · {mine.races} races · baseline #{result?.baselineFingerprint}</span><div>{describeCalibration(mine)}</div></div>
          <div><span className="rs-k">The file · {theirs.races} races · baseline #{file.baselineFingerprint}</span><div>{describeCalibration(theirs)}</div></div>
          <div className={same ? 'rc-good' : exact ? 'rc-bad' : 'rs-hint'}>
            {same ? '✓ Identical — the browser and the script ran the same races.' : exact ? '⚠ Different. The engine or the tag changed since the file was written: run npm run calibrate and commit.' : `Partial run; within ±${(2 * mine.placesSe).toFixed(1)} places of the file is the same tag.`}
          </div>
        </div>
      )}
    </section>
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
        <li><b>Every result carries a fingerprint.</b> Sim Lab shows <code>#xxxxxxxx</code> next to its seed; <code>npm run lab -- &lt;seed&gt; &lt;races&gt; all</code> prints the same one when it ran the same races. Calibration carries the baseline batch's fingerprint.</li>
        <li><b>Tags are measured paired and solo.</b> One tag, one carrier, the <code>no-tags</code> card for everyone else, against the identical untagged race. "Places gained" is the carrier's finishing position with the tag minus without, averaged; the ± is the standard error.</li>
        <li><b>The deck is gated.</b> <code>src/data/tagCalibration.json</code> is committed. <code>npm test</code> fails if a genesis tag is missing from it, if a tag's effects changed since it was measured, or if a tag is out of band. Fix: tune the tag, <code>npm run calibrate</code>, commit both.</li>
        <li><b>Export what you see.</b> Calibration copies as markdown or downloads as JSON; Sim Lab exports JSON and TSV with seed, cards and fingerprint in the header. Paste either into an issue and anyone can rerun it.</li>
      </ol>
      <div className="rc-cmds">
        <span className="rs-k">Commands</span>
        <code>npm run lab -- 2026 100 all</code><span className="rs-hint">replay a Sim Lab batch, print its fingerprint</span>
        <code>npm run lab -- 2026 100 all no-tags rain</code><span className="rs-hint">…under a card hand</span>
        <code>npm run calibrate</code><span className="rs-hint">re-measure every genesis tag, rewrite the JSON</span>
        <code>npm run calibrate -- 50 glass-cannon</code><span className="rs-hint">one tag, quick read, nothing written</span>
        <code>npx tsx scripts/mechanics-probe.mjs 200</code><span className="rs-hint">the no-tag mechanics gates (#246)</span>
      </div>
      <p className="rs-hint">Known gaps, parked: the Heretic's variables override a card's own simVars patches; Sim Lab's safety-car count reads a double-logged event (halve it); the Odds tab still runs its own unseeded setup.</p>
    </section>
  );
}
