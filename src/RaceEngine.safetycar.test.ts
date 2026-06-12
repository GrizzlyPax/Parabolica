import { describe, it, expect } from 'vitest';
import RaceEngine from './RaceEngine';
import { CANON_VARIABLES } from './simlab/types';
import { generateGenesisRoster } from './league/league';
import { TEAMS } from './data/teams';
import { CURRENT_TRACKS } from './generators/tracks';

// The Unsafety Car must bunch the field into a procession — cars spaced near
// targetGap — not collapse it onto a single point (the 0.16-laps-per-car bug).

const TRACK = CURRENT_TRACKS[0];
const TARGET_GAP = CANON_VARIABLES.safetyCar.targetGap;

function makeEngine(seed: number): RaceEngine {
  const engine = RaceEngine.createForWorker(undefined, seed);
  engine.loadGeneratedRoster(generateGenesisRoster(seed, TEAMS.map(t => t.id)));
  engine.updateConfig({ totalLaps: TRACK.laps, lapLength: TRACK.length, maxStoredEvents: 50 });
  engine.reset();
  return engine;
}

/** Pairwise gaps (in laps) between consecutive queued lead-lap cars. */
function queueGaps(engine: RaceEngine): number[] {
  const sc = engine.getUnsafetyCarState();
  const drivers = engine.getDrivers().filter(d => d.status === 'racing');
  const lapLength = engine.getConfig()!.lapLength;
  const leadLap = Math.max(...drivers.map(d => d.currentLap));
  // Lead-lap cars only: anything a lap down is allowed to unlap at full
  // speed and passes through the queue by design (no collision model).
  const queued = drivers
    .filter(d => d.currentLap >= leadLap)
    .map(d => d.currentLap + (d.position % lapLength) / lapLength)
    .filter(dist => sc.lap + sc.position - dist > 0) // behind the SC
    .sort((a, b) => b - a);
  const gaps: number[] = [];
  for (let i = 1; i < queued.length; i++) gaps.push(queued[i - 1] - queued[i]);
  return gaps;
}

describe('unsafety car procession', () => {
  it('queued cars keep real spacing — a train, not a point', () => {
    // Scan seeds for races where the SC deploys and the queue forms, then
    // measure how much of each queue is stacked (gap < 20% of target).
    // Transient overlaps are legal (pit exits drop cars into the train, and
    // there is no collision model) — the bug was CHRONIC stacking: most of
    // the field fused into one dot for the whole SC period.
    let snapshots = 0;
    let stackedFractionSum = 0;

    for (let seed = 1; seed <= 60 && snapshots < 40; seed++) {
      const engine = makeEngine(seed);
      for (let step = 0; step < 200; step++) {
        engine.fastForward((step + 1) * 25);
        const state = engine.getRaceState();
        if (state.raceFinished) break;

        const sc = engine.getUnsafetyCarState();
        if (!sc.active || sc.waitingForLeader) continue;

        const gaps = queueGaps(engine);
        // Queue counts once it has actually formed (cars compacted near the
        // target spacing — i.e., the bunching phase has done its work).
        const compacted = gaps.filter(g => g < TARGET_GAP * 3);
        if (gaps.length < 3 || compacted.length < 3) continue;

        snapshots++;
        stackedFractionSum += compacted.filter(g => g < TARGET_GAP * 0.2).length / compacted.length;
      }
    }

    // The scan must find real SC queues, or this test is vacuous.
    expect(snapshots).toBeGreaterThanOrEqual(5);
    // On average the queue is a procession, not a dot. This guards the broken
    // 0.16-lap target gap (which fused the field into one point: fraction ~0.8).
    // A healthy procession sits ~0.25-0.35 and drifts with field uniformity —
    // tag balance changes the pace spread, so the bound is set well clear of
    // both (0.5) to catch the real regression without being brittle to tuning.
    expect(stackedFractionSum / snapshots).toBeLessThan(0.5);
  });
});
