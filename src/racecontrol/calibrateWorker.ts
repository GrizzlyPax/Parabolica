// Calibration worker: runs calibrateTags off the main thread and streams
// progress. Abort by terminating the worker (the run is synchronous inside).
import { calibrateTags, type CalibrationFile } from './calibrate';

export type CalibrateInMessage = { type: 'START'; tagIds: string[]; races: number; batchSeed: number; cards?: string[] };
export type CalibrateOutMessage =
  | { type: 'PROGRESS'; done: number; total: number; label: string }
  | { type: 'COMPLETE'; file: CalibrationFile }
  | { type: 'ERROR'; message: string };

const post = (m: CalibrateOutMessage) => self.postMessage(m);

self.onmessage = (e: MessageEvent<CalibrateInMessage>) => {
  if (e.data.type !== 'START') return;
  const { tagIds, races, batchSeed, cards } = e.data;
  try {
    let last = 0;
    const { file } = calibrateTags(tagIds, {
      races, batchSeed, cards,
      onProgress: (done, total, label) => {
        const now = Date.now();
        if (now - last > 100 || done === total) { last = now; post({ type: 'PROGRESS', done, total, label }); }
      },
    });
    post({ type: 'COMPLETE', file });
  } catch (err) {
    post({ type: 'ERROR', message: err instanceof Error ? err.message : String(err) });
  }
};
