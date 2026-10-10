// The one saved run, for the screens (#597). Season Mode's screens keep
// working on a SeasonFacts: the league in play. These give them that league,
// write their changes back into the run, start a run from League Setup's
// choices, promote, and keep the meta record. Hub's run screens (#628) read
// `currentRunState`.
import type { SeasonFacts, SeasonSetup, SeasonStore } from '../season/season';
import { currentLeague, loadRun, newRun, promote, runState, saveRun, withCurrentLeague, clearRun as clearRunSave, type RunFacts, type RunState } from './run';
import { loadMeta, recordRun, saveMeta } from './meta';

export { clearRunSave as clearRun };

/** The league in play, as a Season; null when no run is saved. */
export function loadCurrentLeague(store?: SeasonStore | null): SeasonFacts | null {
  const run = store === undefined ? loadRun() : loadRun(store);
  return run ? currentLeague(run) : null;
}

/** Save a change to the league in play. When it ends the run, the meta records it. */
export function saveCurrentLeague(facts: SeasonFacts, store?: SeasonStore | null): boolean {
  const run = store === undefined ? loadRun() : loadRun(store);
  if (!run) return false;
  return commit(withCurrentLeague(run, facts), store);
}

function commit(run: RunFacts, store?: SeasonStore | null): boolean {
  const ok = store === undefined ? saveRun(run) : saveRun(run, store);
  const phase = runState(run).phase;
  if (ok && (phase === 'run-won' || phase === 'run-lost')) {
    const meta = store === undefined ? loadMeta() : loadMeta(store);
    const next = recordRun(meta, run);
    if (next !== meta) { if (store === undefined) saveMeta(next); else saveMeta(next, store); }
  }
  return ok;
}

/** Start a run from League Setup's choices: the player is `humans[0]`, the
 * race count is the calendar's length. Returns the first league. */
export function startRun(setup: Pick<SeasonSetup, 'seed' | 'teamCount' | 'humans' | 'calendar' | 'ruleset'>, store?: SeasonStore | null): SeasonFacts {
  const team = setup.humans[0];
  if (!team) throw new Error('run: a run needs a player team');
  const run = newRun({ seed: setup.seed, teamCount: setup.teamCount, team, races: setup.calendar.length, ruleset: setup.ruleset });
  commit(run, store);
  return currentLeague(run);
}

/** Up a league (the league in play must be won). Returns the new league, or null with no run. */
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
