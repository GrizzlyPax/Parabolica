// Physics worker: a thin shell around physicsSteps.
import { physicsSteps, type PhysicsOptions, type PhysicsProgress, type PhysicsReport } from './physics';

export type PhysicsInMessage = ({ type: 'START' } & PhysicsOptions) | { type: 'ABORT' };
export type PhysicsOutMessage =
  | { type: 'PROGRESS'; progress: PhysicsProgress }
  | { type: 'COMPLETE'; report: PhysicsReport }
  | { type: 'ERROR'; message: string };

const post = (m: PhysicsOutMessage) => self.postMessage(m);

self.onmessage = (e: MessageEvent<PhysicsInMessage>) => {
  if (e.data.type !== 'START') return;
  try {
    const g = physicsSteps(e.data);
    let next = g.next(), last = 0;
    while (!next.done) {
      const now = Date.now();
      if (now - last > 80 || next.value.done === next.value.total) { last = now; post({ type: 'PROGRESS', progress: next.value }); }
      next = g.next();
    }
    post({ type: 'COMPLETE', report: next.value });
  } catch (err) {
    post({ type: 'ERROR', message: err instanceof Error ? err.message : String(err) });
  }
};
