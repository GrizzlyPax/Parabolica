import { describe, it, expect } from 'vitest';
import { labSpec, runLabRace, raceFingerprint, batchFingerprint, carriersOf } from './runner';
import { CURRENT_TRACKS } from '../generators/tracks';

describe('Race Control runner', () => {
  it('is deterministic: the same spec gives the same race, in a fresh or reused engine', () => {
    const spec = labSpec(2026, 3, []);
    const a = runLabRace(spec);
    const engine = runLabRace(labSpec(2026, 0, [])); // dirty an engine first
    const b = runLabRace(spec, { engine: undefined });
    expect(raceFingerprint(a)).toBe(raceFingerprint(b));
    expect(engine).toBeTruthy();
  });

  it('different indices give different races; "all" mode walks the current tracks', () => {
    const a = labSpec(2026, 0, []), b = labSpec(2026, 1, []);
    expect(a.seed).not.toBe(b.seed);
    const all = Array.from({ length: CURRENT_TRACKS.length }, (_, i) => labSpec(1, i, [], 'all').trackId);
    expect(new Set(all).size).toBe(CURRENT_TRACKS.length);
    for (const s of [a, b]) expect(CURRENT_TRACKS.some(t => t.id === s.trackId)).toBe(true);
  });

  it('no-tags + override puts exactly one tag in the race; team tags land on both drivers', () => {
    const spec = labSpec(7, 0, ['no-tags']);
    const solo = runLabRace(spec, { override: { driverIndex: 5, tagId: 'clutch-performer' } });
    expect(solo.roster.flatMap(d => d.tags).map(t => t.id)).toEqual(['clutch-performer']);
    const team = runLabRace(spec, { override: { driverIndex: 5, tagId: 'underdog-spirit' } });
    expect(carriersOf(team, { driverIndex: 5, tagId: 'underdog-spirit' })).toHaveLength(2);
    expect(raceFingerprint(runLabRace(spec))).not.toBe(raceFingerprint(solo));
    expect(batchFingerprint(['a', 'b'])).toMatch(/^[0-9a-f]{8}$/);
  });
});
