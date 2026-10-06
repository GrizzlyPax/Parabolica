// Physics calibration: the race rules, measured. Top: what the current rules
// produce on a seeded batch. Below: every knob, one line each; click one to
// edit it, Measure, and see every metric move.
import { Fragment, useEffect, useMemo, useState } from 'react';
import { ALL_KNOBS, KNOB_CATEGORIES, canonValue, cloneVariables, formatValue, setValueByPath, type VarDef } from './knobs';
import { CANON_VARIABLES, type SimVariables } from '../simlab/types';
import { measurePhysicsAsync, formatMetric, metricOutOfBand, PHYSICS_CARDS, PHYSICS_RACES, type PhysicsProgress, type PhysicsReport } from './physics';
import type { PhysicsInMessage, PhysicsOutMessage } from './physicsWorker';
import { useLabRunner } from './useLabRunner';
import { randomSeed } from '../engine/rng';

export const PHYSICS_SEED = 2026;

const RUNNER_SPEC = {
  makeWorker: () => new Worker(new URL('./physicsWorker.ts', import.meta.url), { type: 'module' }),
  inline: async (msg: PhysicsInMessage, sink: { post: (m: PhysicsOutMessage) => void; aborted: () => boolean }) => {
    if (msg.type !== 'START') return;
    const report = await measurePhysicsAsync(msg, p => { sink.post({ type: 'PROGRESS', progress: p }); return !sink.aborted(); });
    if (!sink.aborted()) sink.post({ type: 'COMPLETE', report });
  },
  read: (m: PhysicsOutMessage) => m.type === 'PROGRESS' ? { progress: m.progress } : m.type === 'COMPLETE' ? { result: m.report } : { error: m.message },
  abort: { type: 'ABORT' } as PhysicsInMessage,
};

export function PhysicsTab() {
  const [seed, setSeed] = useState(PHYSICS_SEED);
  const [races, setRaces] = useState(PHYSICS_RACES);
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [open, setOpen] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [canonBy, setCanonBy] = useState<Record<string, PhysicsReport>>({});
  const canonKey = `${seed}:${races}`;
  const canon = canonBy[canonKey] ?? null;

  const canonRun = useLabRunner<PhysicsInMessage, PhysicsOutMessage, PhysicsProgress, PhysicsReport>(RUNNER_SPEC);
  const yoursRun = useLabRunner<PhysicsInMessage, PhysicsOutMessage, PhysicsProgress, PhysicsReport>(RUNNER_SPEC);
  const canonResult = canonRun.result;
  useEffect(() => {
    if (canonResult) setCanonBy(prev => ({ ...prev, [`${canonResult.batchSeed}:${canonResult.races}`]: canonResult }));
  }, [canonResult]);

  const variables: SimVariables = useMemo(() => {
    let v = cloneVariables(CANON_VARIABLES);
    for (const [path, value] of Object.entries(edits)) v = setValueByPath(v, path, value);
    return v;
  }, [edits]);
  const edited = Object.keys(edits).length > 0;
  const busy = !!canonRun.progress || !!yoursRun.progress;

  const measureCanon = () => canonRun.start({ type: 'START', batchSeed: seed, races, cards: PHYSICS_CARDS }, { done: 0, total: races, track: '' });
  const measureYours = () => {
    if (!canon) measureCanon();
    yoursRun.start({ type: 'START', batchSeed: seed, races, cards: PHYSICS_CARDS, variables }, { done: 0, total: races, track: '' });
  };
  const yours = edited ? yoursRun.result : null;
  const setEdit = (path: string, value: number) => setEdits(prev => {
    const next = { ...prev };
    if (Math.abs(value - canonValue(path)) < 1e-12) delete next[path]; else next[path] = value;
    return next;
  });
  const copyCode = async () => {
    const lines = Object.entries(edits).map(([path, v]) => `${path}: ${v}`).join('\n');
    try { await navigator.clipboard.writeText(`// CANON_VARIABLES — src/simlab/types.ts\n${lines}`); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* no clipboard */ }
  };

  return (
    <>
      <section className="rs-row rc-explain">
        <p><b>The rules, measured.</b> {races} untagged races on one seed, read for the things that make racing look like racing: how much pace decides the result, how often pole wins, stops, passes, DNFs, safety cars. Change any knob below, press Measure, and the same {races} races run again with your number — every metric shows the before and after.</p>
        <div className="rc-reroll">
          <span className="rs-k">Seed</span>
          <input type="number" value={seed} disabled={busy} onChange={e => setSeed(Number(e.target.value) >>> 0)} aria-label="Batch seed" />
          <button type="button" className="rs-link" disabled={busy} onClick={() => setSeed(randomSeed())}>re-roll</button>
          <select value={races} disabled={busy} onChange={e => setRaces(Number(e.target.value))}>
            <option value={50}>50 races · ~15 s</option>
            <option value={100}>100 races · ~30 s</option>
            <option value={200}>200 races · ~1 min</option>
          </select>
          {canonRun.progress
            ? <button type="button" className="rs-btn rs-btn-ghost" onClick={canonRun.stop}>Stop</button>
            : <button type="button" className={`rs-btn ${canon ? 'rs-btn-ghost' : 'rs-btn-primary'}`} onClick={measureCanon} disabled={busy}>{canon ? 'Measure again' : 'Measure the current rules'}</button>}
          {canonRun.progress && <Progress p={canonRun.progress} what="current rules" mode={canonRun.mode} />}
          {canonRun.error && <span className="rc-bad">{canonRun.error}</span>}
          {canon && !canonRun.progress && <span className="rc-good">✓ seed {canon.batchSeed} · {canon.races} races · #{canon.fingerprint} · <code>npm run lab -- {canon.batchSeed} {canon.races} all no-tags</code></span>}
        </div>
      </section>

      {canon && (
        <section className="rs-row rc-table-row">
          <div className="rc-table-wrap">
            <table className="rc-table rc-compact rc-metrics">
              <thead><tr><th>What the rules produce</th><th>Current</th>{yours && <th>Yours</th>}{yours && <th>Δ</th>}<th>Band</th><th className="rc-th-hint">Meaning</th></tr></thead>
              <tbody>
                {canon.metrics.map((m, i) => {
                  const y = yours?.metrics[i];
                  const d = y ? y.value - m.value : 0;
                  const rel = y ? Math.abs(d) / Math.max(1e-9, Math.abs(m.value)) : 0;
                  const moved = y && rel > 0.1;
                  return (
                    <tr key={m.id} className={metricOutOfBand(m) ? 'rc-row-bad' : ''}>
                      <td className="rc-tag">{m.label}</td>
                      <td><span className="rc-num">{formatMetric(m.value, m.format)}</span></td>
                      {y && <td><span className={`rc-num ${moved ? 'rc-edited-text' : ''}`}>{formatMetric(y.value, y.format)}</span></td>}
                      {y && <td><span className={`rc-se ${moved ? (metricOutOfBand(y) ? 'rc-bad' : 'rc-edited-text') : ''}`}>{d > 0 ? '+' : ''}{formatMetric(d, m.format === 'pct' ? 'pct' : m.format)}</span></td>}
                      <td className="rc-dim">{m.band ? `${formatMetric(m.band[0], m.format)} – ${formatMetric(m.band[1], m.format)}${metricOutOfBand(y ?? m) ? ' ⚠' : ''}` : '—'}</td>
                      <td className="rc-hint-cell">{m.hint}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="rs-row rc-table-row">
        <div className="rc-knob-head">
          <span className="rs-k">The knobs</span>
          <span className="rs-hint">Click one to change it. Edited knobs stay purple; Measure runs them all together.</span>
          <span className="rc-actions">
            {edited && <span className="rc-edited-text">{Object.keys(edits).length} edited</span>}
            {edited && !busy && <button type="button" className="rs-link" onClick={() => { setEdits({}); yoursRun.clear(); }}>Reset all</button>}
            {edited && <button type="button" className="rs-link" onClick={copyCode}>{copied ? 'Copied' : 'Copy as code'}</button>}
            {yoursRun.progress
              ? <button type="button" className="rs-btn rs-btn-ghost" onClick={yoursRun.stop}>Stop</button>
              : <button type="button" className="rs-btn rs-btn-primary" onClick={measureYours} disabled={!edited || busy}>Measure</button>}
          </span>
        </div>
        {yoursRun.progress && <Progress p={yoursRun.progress} what="your rules" mode={yoursRun.mode} />}
        {yoursRun.error && <div className="rc-bad">{yoursRun.error}</div>}
        {yours && !yoursRun.progress && <div className="rc-good rc-knob-note">✓ your rules measured on the same {yours.races} races · #{yours.fingerprint} — read the Yours and Δ columns above.</div>}
        <div className="rc-table-wrap">
          <table className="rc-table rc-compact rc-knobs">
            <thead><tr><th>Knob</th><th>Current</th><th>Yours</th><th className="rc-th-hint">Meaning</th></tr></thead>
            <tbody>
              {KNOB_CATEGORIES.map(cat => (
                <Fragment key={cat}>
                  <tr className="rc-cat"><td colSpan={4}><span className="rc-emoji">{ALL_KNOBS.find(k => k.category === cat)?.categoryEmoji}</span> {cat}</td></tr>
                  {ALL_KNOBS.filter(k => k.category === cat).map(k => <KnobRow key={k.path} k={k} edit={edits[k.path]} open={open === k.path} busy={busy} onOpen={() => setOpen(o => o === k.path ? '' : k.path)} onEdit={v => setEdit(k.path, v)} />)}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function KnobRow({ k, edit, open, busy, onOpen, onEdit }: { k: VarDef; edit: number | undefined; open: boolean; busy: boolean; onOpen: () => void; onEdit: (v: number) => void }) {
  const cur = canonValue(k.path);
  const value = edit ?? cur;
  return (
    <>
      <tr className={edit !== undefined ? 'rc-row-on' : ''} onClick={onOpen}>
        <td className="rc-tag">{k.label}<span className="rc-dim rc-path"> {k.path}</span></td>
        <td><span className="rc-num">{formatValue(cur, k.format)}</span></td>
        <td>{edit !== undefined ? <span className="rc-num rc-edited-text">{formatValue(edit, k.format)}</span> : <span className="rc-dim">—</span>}</td>
        <td className="rc-hint-cell">{k.description}<span className="rc-chev">{open ? '▾' : '▸'}</span></td>
      </tr>
      {open && (
        <tr className="rc-try-row"><td colSpan={4}>
          <div className="rc-try rc-knob-edit">
            <label><span className="rs-k">{k.label}</span>
              <input type="number" step={k.step} min={k.min} max={k.max} value={value} disabled={busy} className={edit !== undefined ? 'rc-edited' : ''} onChange={e => onEdit(Number(e.target.value))} />
            </label>
            <input type="range" min={k.min} max={k.max} step={k.step} value={value} disabled={busy} onChange={e => onEdit(Number(e.target.value))} aria-label={`${k.label} slider`} />
            <span className="rs-hint">current {formatValue(cur, k.format)} · range {formatValue(k.min, k.format)} – {formatValue(k.max, k.format)}</span>
            {edit !== undefined && !busy && <button type="button" className="rs-link" onClick={() => onEdit(cur)}>reset</button>}
          </div>
        </td></tr>
      )}
    </>
  );
}

function Progress({ p, what, mode }: { p: PhysicsProgress; what: string; mode: string }) {
  return <span className="rc-progress"><span className="rc-progress-bar"><span style={{ width: `${(p.done / p.total) * 100}%` }} /></span><span>{what} · race {p.done} of {p.total}{p.track ? ` · ${p.track}` : ''}{mode === 'main thread' ? ' · on the main thread' : ''}</span></span>;
}
