// The lab notebook: what you changed and what you measured, kept in this
// browser so you can come back to it, compare runs, and race with a setup.
//
// A preset is a named bundle of edits — tag definitions and physics knobs —
// that the lab measures and that Quick Race can play under. A run is one
// measurement: what was run (seed, races, preset) and what came out.
import type { Tag } from '../data/tags';
import type { CalibrationFile } from './calibrate';
import type { PhysicsReport } from './physics';

export interface LabPreset {
  id: string;
  name: string;
  createdAt: number;
  tagEdits: Record<string, Tag>;
  knobEdits: Record<string, number>;
}

export type LabRun =
  | { id: string; at: number; kind: 'tags'; seed: number; races: number; presetId?: string; presetName?: string; note: string; result: CalibrationFile }
  | { id: string; at: number; kind: 'physics'; seed: number; races: number; presetId?: string; presetName?: string; note: string; result: PhysicsReport };

export interface Notebook { presets: LabPreset[]; runs: LabRun[] }

export const NOTEBOOK_KEY = 'parabolica.lab.notebook';
const MAX_RUNS = 60;

export function loadNotebook(): Notebook {
  try { const n = JSON.parse(localStorage.getItem(NOTEBOOK_KEY) ?? 'null'); if (n && Array.isArray(n.presets) && Array.isArray(n.runs)) return n; } catch { /* private window */ }
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
