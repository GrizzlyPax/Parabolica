// The one saved run, for the screens (#597, #696). Season Mode's screens keep
// working on a SeasonFacts: the step in play. These give them that step,
// write their changes back into the run, start a run from the start screen's
// choices (your state, your garage), promote, and keep the meta record. The
// run screens read `currentRunState` / `loadRun`.
import type { SeasonFacts, SeasonHuman, SeasonStore } from '../season/season';
import { claimTitles, currentLeague, loadRun, newRun, promote, runState, saveRun, withCurrentLeague, clearRun as clearRunSave, type RunFacts, type RunState } from './run';
import { loadMeta, recordRun, saveMeta } from './meta';

export { clearRunSave as clearRun };

/** The step in play, as a Season; null when no run is saved. */
export function loadCurrentLeague(store?: SeasonStore | null): SeasonFacts | null {
  const run = store === undefined ? loadRun() : loadRun(store);
  return run ? currentLeague(run) : null;
}

/** Save a change to the step in play. When it ends the run, the titles are claimed and the meta records it. */
export function saveCurrentLeague(facts: SeasonFacts, store?: SeasonStore | null): boolean {
  const run = store === undefined ? loadRun() : loadRun(store);
  if (!run) return false;
  return commit(withCurrentLeague(run, facts), store);
}

function commit(run: RunFacts, store?: SeasonStore | null): boolean {
  const phase = runState(run).phase;
  const final = phase === 'run-won' ? claimTitles(run) : run;
  const ok = store === undefined ? saveRun(final) : saveRun(final, store);
  if (ok && (phase === 'run-won' || phase === 'run-lost')) {
    const meta = store === undefined ? loadMeta() : loadMeta(store);
    const next = recordRun(meta, final);
    if (next !== meta) { if (store === undefined) saveMeta(next); else saveMeta(next, store); }
  }
  return ok;
}

/** Start a run: your state and your garage. Returns the first step, open in the Paddock. */
export function startRun(setup: { seed: number; stateId: string; garage: Omit<SeasonHuman, 'teamId'> }, store?: SeasonStore | null): SeasonFacts {
  const run = newRun(setup);
  commit(run, store);
  return currentLeague(run);
}

/** Up a step (the step in play must be won). Returns the new step, or null with no run. */
export function promoteCurrentRun(store?: SeasonStore | null): SeasonFacts | null {
  const run = store === undefined ? loadRun() : loadRun(store);
  if (!run) return null;
  const next = promote(run);
  commit(next, store);
  return currentLeague(next);
}

export function currentRunState(store?: SeasonStore | null): RunState | null {
  const run = store === undefined ? loadRun() : loadRun(store);
  return run ? runState(run) : null;
}
