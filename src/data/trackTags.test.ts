import { describe, it, expect } from 'vitest';
import { TRACK_TAGS, intrinsicTrackTags, getTrackTagById } from './trackTags';
import { CURRENT_TRACKS } from '../generators/tracks';

describe('track tags', () => {
  it('every track has at least one intrinsic tag, stable across calls', () => {
    for (const track of CURRENT_TRACKS) {
      const a = intrinsicTrackTags(track.id);
      const b = intrinsicTrackTags(track.id);
      expect(a.length).toBeGreaterThanOrEqual(1);
      expect(b).toEqual(a); // intrinsic = tied to the place, not random per call
      for (const t of a) expect(getTrackTagById(t.id)).toBeDefined();
    }
  });

  it('the assignment spreads across the pool (not all the same tag)', () => {
    const ids = new Set(CURRENT_TRACKS.map(t => intrinsicTrackTags(t.id)[0].id));
    expect(ids.size).toBeGreaterThan(1);
  });

  it('the pool exercises the distinct trigger mechanisms', () => {
    // At least one passive-pace, one variance, and one condition-stamping tag.
    expect(TRACK_TAGS.some(t => (t.passive?.speedModifier ?? 1) !== 1)).toBe(true);
    expect(TRACK_TAGS.some(t => (t.passive?.consistencyModifier ?? 1) !== 1)).toBe(true);
    expect(TRACK_TAGS.some(t => (t.conditions?.length ?? 0) > 0)).toBe(true);
  });
});
