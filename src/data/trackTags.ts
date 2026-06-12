// Track tags (C3 of the conditions stack — see docs/CONDITIONS_LAYER.md).
// A track's intrinsic character: a field-wide lean while racing there and/or
// conditions it stamps on the field (which condition-gated tags can react to).
// Sits alongside weather — weather is rolled per race, track tags are tied to
// the place. The model also leaves room for *added* track tags later (a season
// event attaching one to a future race); for now every track has one intrinsic.
//
// NOTE: flavor is deliberately minimal here — this is the functional backend.
// The real track identities + balance are a future partnered pass. The point
// is that the trigger mechanisms work (passive lean + condition stamping).

import { mulberry32, deriveSeed } from '../engine/rng';

/** Field-wide effects a track tag applies to every driver (like weather). */
export interface TrackTagEffects {
  speedModifier?: number;       // field-wide; changes pace/duration, not order
  consistencyModifier?: number; // <1 = more variance (rewards consistent drivers)
  crashResistance?: number;     // negative = more crashes for everyone
}

export interface TrackTag {
  id: string;
  name: string;
  emoji: string;
  /** Always-on lean while racing here. */
  passive?: TrackTagEffects;
  /** Condition ids stamped on the field all race — condition-gated driver/car
   * tags will react to these (the cross-layer trigger). Inert until a tag
   * reacts; the plumbing is what matters for now. */
  conditions?: string[];
}

// Minimal functional pool — three tags that exercise the distinct mechanisms:
// a pace lean, a variance lean, and a hazard lean that also stamps a condition.
export const TRACK_TAGS: TrackTag[] = [
  {
    id: 'high-speed',
    name: 'High-Speed',
    emoji: '🏎️',
    passive: { speedModifier: 1.02 },
  },
  {
    id: 'technical',
    name: 'Technical',
    emoji: '🌀',
    // More variance — the consistent drivers separate themselves here.
    passive: { consistencyModifier: 0.98 },
  },
  {
    id: 'hazardous',
    name: 'Hazardous',
    emoji: '⚠️',
    passive: { crashResistance: -0.05 },
    conditions: ['debris-hazard'], // stamped for tag reactions (none yet)
  },
];

export function getTrackTagById(id: string): TrackTag | undefined {
  return TRACK_TAGS.find(t => t.id === id);
}

/**
 * A track's intrinsic tag(s) — tied to the place, stable across every universe
 * (a property of the track, not a per-league roll). Currently one per track,
 * assigned deterministically from the track id; a future flavor pass can
 * replace this with authored identities, and dynamic additions can append.
 */
export function intrinsicTrackTags(trackId: string): TrackTag[] {
  const pick = mulberry32(deriveSeed(0, 'tracktag', trackId))();
  return [TRACK_TAGS[Math.floor(pick * TRACK_TAGS.length) % TRACK_TAGS.length]];
}
