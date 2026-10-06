// Calibration worker: a thin shell around calibrateSteps.
import { calibrateSteps, type CalibrationFile, type CalibrateProgress } from './calibrate';
import type { Tag } from '../data/tags';
import type { SimVariables } from '../simlab/types';

export type CalibrateInMessage = { type: 'START'; tagIds: (string | Tag)[]; races: number; batchSeed: number; cards?: string[]; variables?: SimVariables } | { type: 'ABORT' };
export type CalibrateOutMessage =
  | { type: 'PROGRESS'; progress: CalibrateProgress }
  | { type: 'COMPLETE'; file: CalibrationFile }
  | { type: 'ERROR'; message: string };

const post = (m: CalibrateOutMessage) => self.postMessage(m);

self.onmessage = (e: MessageEvent<CalibrateInMessage>) => {
  if (e.data.type !== 'START') return;
  const { tagIds, races, batchSeed, cards, variables } = e.data;
  try {
    const g = calibrateSteps(tagIds, { races, batchSeed, cards, variables });
    let next = g.next(), last = 0;
    while (!next.done) {
      const now = Date.now();
      if (now - last > 80 || next.value.done === next.value.total) { last = now; post({ type: 'PROGRESS', progress: next.value }); }
      next = g.next();
    }
    post({ type: 'COMPLETE', file: next.value.file });
  } catch (err) {
    post({ type: 'ERROR', message: err instanceof Error ? err.message : String(err) });
  }
};
