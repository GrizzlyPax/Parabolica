// Test helpers for the run (#660): a run through its rookie start.
import { newRun, pickRookies, rookieOfferFor, type RunFacts, type RunSetup } from './run';
import type { CarSetupId } from '../season/rookies';

export const TEST_TEAM = { teamId: 'you', name: 'Kitty Hut', color: '#006EBE', ink: '#FFFFFF', iconId: 'fox-head' };

/** A run with its rookies picked (the offer's first two, the Twisty setup): league 0 open in the Paddock. */
export function rookieRun(seed: number, teamCount: number, races: number, extra: Partial<RunSetup> = {}, setup: CarSetupId = 'twisty'): RunFacts {
  const run = newRun({ seed, teamCount, races, team: TEST_TEAM, ...extra });
  const [a, b] = rookieOfferFor(run);
  return pickRookies(run, { driverIds: [a.id, b.id], setup });
}
