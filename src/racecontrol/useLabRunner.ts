// React wrapper around LabRunner: one job at a time, with progress / result /
// error as state. `read` maps a worker message to one of those.
import { useEffect, useRef, useState } from 'react';
import { LabRunner, type LabSink } from './labRunner';

export interface UseLabRunner<In, Progress, Result> {
  start: (msg: In, initialProgress: Progress) => void;
  stop: () => void;
  progress: Progress | null;
  result: Result | null;
  error: string | null;
  mode: string;
  clear: () => void;
}

export function useLabRunner<In extends { type: string }, Out extends { type: string }, Progress, Result>(spec: {
  makeWorker: () => Worker;
  inline: (msg: In, sink: LabSink<Out>) => Promise<void> | void;
  read: (m: Out) => { progress?: Progress; result?: Result; error?: string };
  abort?: In;
}): UseLabRunner<In, Progress, Result> {
  const runner = useRef<LabRunner<In, Out> | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState('');
  const specRef = useRef(spec); specRef.current = spec;

  useEffect(() => {
    runner.current = new LabRunner<In, Out>(
      () => specRef.current.makeWorker(),
      (msg, sink) => specRef.current.inline(msg, sink),
      m => {
        const r = specRef.current.read(m);
        if (r.progress !== undefined) setProgress(r.progress);
        if (r.result !== undefined) { setResult(r.result); setProgress(null); }
        if (r.error !== undefined) { setError(r.error); setProgress(null); }
        setMode(runner.current?.mode ?? '');
      },
      specRef.current.abort,
    );
    return () => runner.current?.terminate();
  }, []);

  return {
    start: (msg, initial) => { setResult(null); setError(null); setProgress(initial); runner.current?.start(msg); },
    stop: () => { runner.current?.terminate(); setProgress(null); },
    clear: () => { setResult(null); setError(null); },
    progress, result, error, mode,
  };
}
