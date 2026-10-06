// A lab job runs in a Web Worker when the page allows one, and on the main
// thread when it doesn't (the artifact preview blocks workers; some hosts
// serve assets cross-origin). Either way the UI talks to the same thing and
// gets the same messages — and a worker that never starts is no longer a
// progress bar stuck at zero.
export interface LabSink<Out> {
  post: (m: Out) => void;
  aborted: () => boolean;
}

export class LabRunner<In extends { type: string }, Out extends { type: string }> {
  private worker: Worker | null = null;
  private inlineOnly = false;
  private heard = false;
  private pending: In | null = null;
  private abortFlag = false;

  constructor(
    private readonly makeWorker: () => Worker,
    private readonly inline: (msg: In, sink: LabSink<Out>) => Promise<void> | void,
    private readonly onMessage: (m: Out) => void,
    private readonly abortMessage?: In,
  ) {}

  /** Where the last job ran — shown in the UI so a slow run is explainable. */
  get mode(): 'worker' | 'main thread' { return this.inlineOnly ? 'main thread' : 'worker'; }

  start(msg: In) {
    this.abortFlag = false;
    this.pending = msg;
    if (this.inlineOnly) { this.runInline(msg); return; }
    try {
      if (!this.worker) {
        const w = this.makeWorker();
        w.onmessage = (e: MessageEvent<Out>) => { this.heard = true; this.onMessage(e.data); };
        w.onerror = (ev: ErrorEvent) => {
          ev.preventDefault?.();
          if (!this.heard) {
            // Never got a word out of it: it didn't load. Fall back for good.
            console.warn('[lab] worker unavailable, running on the main thread:', ev.message || ev);
            w.terminate(); this.worker = null; this.inlineOnly = true;
            if (this.pending) this.runInline(this.pending);
          } else {
            this.onMessage({ type: 'ERROR', message: ev.message || 'worker crashed' } as unknown as Out);
          }
        };
        this.worker = w;
      }
      this.worker.postMessage(msg);
    } catch (err) {
      console.warn('[lab] cannot create a worker, running on the main thread:', err);
      this.worker = null; this.inlineOnly = true;
      this.runInline(msg);
    }
  }

  abort() {
    this.abortFlag = true;
    if (this.worker && this.abortMessage) this.worker.postMessage(this.abortMessage);
  }

  /** Hard stop: kills the worker (a fresh one is made on the next start). */
  terminate() {
    this.abortFlag = true;
    this.worker?.terminate(); this.worker = null; this.heard = false;
  }

  private async runInline(msg: In) {
    const sink: LabSink<Out> = { post: m => this.onMessage(m), aborted: () => this.abortFlag };
    try { await this.inline(msg, sink); }
    catch (err) { this.onMessage({ type: 'ERROR', message: err instanceof Error ? err.message : String(err) } as unknown as Out); }
  }
}
