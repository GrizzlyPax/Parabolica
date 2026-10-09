// Shared pieces of the lab: the working changes (one set for both tabs),
// the props a tab gets, and the Save-as-preset strip control.
import { useEffect, useState } from 'react';
import { isEmptyPreset, type LabPreset, type LabRun } from './notebook';

/** The working changes: knob edits, saveable as a preset. */
export interface Working {
  knobEdits: Record<string, number>;
  preset: LabPreset | null;
}

export interface LabProps {
  working: Working;
  setWorking: (f: (w: Working) => Working) => void;
  savePreset: (name: string) => void;
  logRun: (run: LabRun) => void;
}

/** The strip's "Save as preset" control, the same on both tabs. */
export function SaveBar({ lab, busy }: { lab: LabProps; busy: boolean }) {
  const { working } = lab;
  const [name, setName] = useState(working.preset?.name ?? '');
  useEffect(() => { setName(working.preset?.name ?? ''); }, [working.preset?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const empty = isEmptyPreset(working);
  const n = Object.keys(working.knobEdits).length;
  return (
    <span className="rc-savebar">
      {working.preset && <span className="rc-dim">preset <b className="rc-edited-text">{working.preset.name}</b> loaded ·</span>}
      {n > 0 && <span className="rc-edited-text">{n} change{n > 1 ? 's' : ''} in hand</span>}
      <input value={name} placeholder="name this setup" disabled={busy || empty} onChange={e => setName(e.target.value)} aria-label="Preset name" />
      <button type="button" className="rs-link" disabled={busy || empty || !name.trim()} onClick={() => lab.savePreset(name.trim())}>{working.preset && working.preset.name === name.trim() ? 'Update preset' : 'Save as preset'}</button>
      {n > 0 && !busy && <button type="button" className="rs-link" onClick={() => lab.setWorking(() => ({ knobEdits: {}, preset: null }))}>Clear all</button>}
    </span>
  );
}

