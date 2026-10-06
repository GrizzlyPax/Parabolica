// Sim Lab Web Worker: a thin shell around simLabCore.
import { runSimulation } from './simLabCore';
import type { WorkerInMessage, WorkerOutMessage } from './types';

let aborted = false;

self.onmessage = (e: MessageEvent<WorkerInMessage>) => {
  if (e.data.type === 'ABORT') { aborted = true; return; }
  if (e.data.type === 'START') {
    aborted = false;
    runSimulation(e.data.config, e.data.variables, e.data.label, {
      post: (m: WorkerOutMessage) => self.postMessage(m),
      aborted: () => aborted,
    });
  }
};
