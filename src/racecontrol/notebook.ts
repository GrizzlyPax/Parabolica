// The lab notebook: what you changed and what you measured, kept in this
// browser so you can come back to it, compare runs, and race with a setup.
//
// A preset is a named bundle of edits — tag definitions and physics knobs —
// that the lab measures and that Quick Race can play under. A run is one
// measurement: what was run (seed, races, preset) and what came out.
import { upgradeTag, type Tag } from '../data/tags';
import type { CalibrationFile } from './calibrate';
import { compactReport, expandReport, type PhysicsReport } from './physics';

export interface LabPreset {
  id: string;
  name: string;
  createdAt: number;
  tagEdits: Record<string, Tag>;
  knobEdits: Record<string, number>;
  sentAt?: number;
  user?: string;
  issue?: number;
}

interface RunBase { id: string; at: number; seed: number; races: number; presetId?: string; presetName?: string; note: string; /** When it was sent to the shared ledger. */ sentAt?: number; /** Set on ledger entries: who sent it, from which issue. */ user?: string; issue?: number }
export type LabRun =
  | (RunBase & { kind: 'tags'; result: CalibrationFile })
  | (RunBase & { kind: 'physics'; result: PhysicsReport });

export interface Notebook { presets: LabPreset[]; runs: LabRun[] }

export const NOTEBOOK_KEY = 'parabolica.lab.notebook';
const MAX_RUNS = 60;

/** A preset from any era, its tag edits on today's rarity names (#385). */
export function upgradePreset(p: LabPreset): LabPreset {
  return { ...p, tagEdits: Object.fromEntries(Object.entries(p.tagEdits ?? {}).map(([id, t]) => [id, upgradeTag(t)])) };
}

export function loadNotebook(): Notebook {
  try { const n = JSON.parse(localStorage.getItem(NOTEBOOK_KEY) ?? 'null'); if (n && Array.isArray(n.presets) && Array.isArray(n.runs)) return { ...n, presets: n.presets.map(upgradePreset) }; } catch { /* private window */ }
  return { presets: [], runs: [] };
}
export function saveNotebook(n: Notebook) { try { localStorage.setItem(NOTEBOOK_KEY, JSON.stringify({ ...n, runs: n.runs.slice(0, MAX_RUNS) })); } catch { /* private window */ } }

export const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export function presetSummary(p: LabPreset): string {
  const t = Object.keys(p.tagEdits).length, k = Object.keys(p.knobEdits).length;
  return [t ? `${t} tag${t > 1 ? 's' : ''}` : '', k ? `${k} knob${k > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ') || 'no changes';
}

export function isEmptyPreset(p: Pick<LabPreset, 'tagEdits' | 'knobEdits'>): boolean {
  return Object.keys(p.tagEdits).length === 0 && Object.keys(p.knobEdits).length === 0;
}

/** Everything in the notebook as one JSON file, for sharing or an issue. */
export function exportNotebook(n: Notebook): string { return JSON.stringify(n, null, 2); }

// ---------------------------------------------------------------------------
// The shared ledger: public/ledger/* in the repo, served by the site, fed by
// `ledger` issues that a GitHub Action folds in (.github/workflows/ledger.yml).

const REPO = 'GrizzlyPax/Parabolica';
/** GitHub prefills an issue from the URL; past ~8 KB the request is refused. */
const URL_BUDGET = 7000;

export interface LedgerBatch { kind: 'ledger-batch'; sentAt: number; runs: LabRun[]; presets: LabPreset[] }

function compactRun(r: LabRun): LabRun {
  const { sentAt: _s, ...rest } = r;
  if (rest.kind === 'physics') return { ...rest, result: compactReport(rest.result) };
  return rest;
}

/**
 * Build the next batch to send: unsent runs and presets, newest first, as
 * many as fit one issue. Returns the batch, the ids it carries, and how many
 * were left for the next press.
 */
export function nextLedgerBatch(n: Notebook): { batch: LedgerBatch; runIds: string[]; presetIds: string[]; left: number } | null {
  const runs = n.runs.filter(r => !r.sentAt);
  const presets = n.presets.filter(p => !p.sentAt || (p.sentAt < p.createdAt));
  const batch: LedgerBatch = { kind: 'ledger-batch', sentAt: Date.now(), runs: [], presets: [] };
  const size = () => JSON.stringify(batch).length;
  for (const p of presets) { const { sentAt: _s, ...rest } = p; batch.presets.push(rest as LabPreset); if (size() > URL_BUDGET) { batch.presets.pop(); break; } }
  for (const r of runs) { batch.runs.push(compactRun(r)); if (size() > URL_BUDGET) { batch.runs.pop(); break; } }
  if (!batch.runs.length && !batch.presets.length) return null;
  const left = runs.length - batch.runs.length + (presets.length - batch.presets.length);
  return { batch, runIds: batch.runs.map(r => r.id), presetIds: batch.presets.map(p => p.id), left };
}

export function ledgerIssueUrl(batch: LedgerBatch): string {
  const what = [batch.runs.length ? `${batch.runs.length} run${batch.runs.length > 1 ? 's' : ''}` : '', batch.presets.length ? `${batch.presets.length} preset${batch.presets.length > 1 ? 's' : ''}` : ''].filter(Boolean).join(', ');
  const title = `Ledger: ${what} · ${new Date(batch.sentAt).toLocaleDateString()}`;
  const lines = [
    ...batch.runs.map(r => `- ${r.kind} · seed ${r.seed} · ${r.races} races · ${r.note}${r.presetName ? ` · preset ${r.presetName}` : ''}`),
    ...batch.presets.map(p => `- preset **${p.name}**: ${presetSummary(p)}`),
  ];
  const body = `From Race Control → Notebook. The ledger action folds this into \`public/ledger/\` and closes the issue.

${lines.join('\n')}

\`\`\`json
${JSON.stringify(batch)}
\`\`\`
`;
  const p = new URLSearchParams({ title, body, labels: 'ledger' });
  return `https://github.com/${REPO}/issues/new?${p.toString()}`;
}

/** Mark what a batch carried as sent. */
export function markSent(n: Notebook, runIds: string[], presetIds: string[], at: number): Notebook {
  const r = new Set(runIds), p = new Set(presetIds);
  return { presets: n.presets.map(x => p.has(x.id) ? { ...x, sentAt: at } : x), runs: n.runs.map(x => r.has(x.id) ? { ...x, sentAt: at } : x) };
}

export interface Ledger { runs: LabRun[]; presets: LabPreset[] }

/** Read the shared ledger the site serves (relative, so the artifact preview works too). */
export async function fetchLedger(base = ''): Promise<Ledger> {
  const [runsText, presetsJson] = await Promise.all([
    fetch(`${base}ledger/runs.jsonl`, { cache: 'no-store' }).then(r => r.ok ? r.text() : '').catch(() => ''),
    fetch(`${base}ledger/presets.json`, { cache: 'no-store' }).then(r => r.ok ? r.json() : []).catch(() => []),
  ]);
  const runs: LabRun[] = runsText.split('\n').filter(Boolean).map(l => { try { return JSON.parse(l) as LabRun; } catch { return null; } }).filter((r): r is LabRun => !!r)
    .map(r => r.kind === 'physics' ? { ...r, result: expandReport(r.result) } : r).sort((a, b) => b.at - a.at);
  return { runs, presets: Array.isArray(presetsJson) ? (presetsJson as LabPreset[]).map(upgradePreset) : [] };
}
