// Test helpers for the run (#696): a run from its start.
import { newRun, type RunFacts, type RunSetup } from './run';

export const TEST_GARAGE = { name: 'Kettle Street Garage', color: '#006EBE', ink: '#FFFFFF', iconId: 'fox-head' };

/** A run in Ohio (a 20-town state) unless told otherwise: step 0 drafted, open in the Paddock. */
export function testRun(seed: number, stateId = 'oh', extra: Partial<Omit<RunSetup, 'garage'>> = {}): RunFacts {
  return newRun({ seed, stateId, garage: TEST_GARAGE, ...extra });
}
