// Digest highlight curation: which of a race's hundreds of events deserve to
// be retold when the Commissionary checks in later.
//
// The live broadcast narrates everything — that's its job. The digest is the
// morning paper: wreckage, the winner, the decisive move, and the weird.
// Picking by raw magnitude (the old way) filled digests with lead changes
// (0.8) and multi-position surges (≤1.0), drowning the actual story.
//
// Tiers (see COMMISSIONER_MODE.md feedback, June 2026):
//   CANON   — always retold: crashes, blowouts, mechanical deaths, DNFs,
//             track events
//   STORY   — one each: the race-winning move (final lead change), the worst
//             pit fumble, the best stop, the closest call, plus the winner
//             crossing the line
//   TEXTURE — live-only, except the two biggest charges through the field

import { RaceEvent } from '../RaceEngine';

/** How many curated events every digest keeps forever. */
export const HIGHLIGHTS_PER_RACE = 12;

// Note: 'dnf' is deliberately NOT canon — crash events already name everyone
// involved and the digest header lists the dead, so per-driver "Retired due
// to crash damage" lines were triple-telling the same wreck.
const CANON_TYPES = new Set<RaceEvent['type']>([
  'crash',
  'tire_failure',
  'mechanical_failure',
  'track_event',
]);

/** Highest-magnitude event of a type, or none. */
function topOfType(events: RaceEvent[], type: RaceEvent['type']): RaceEvent | undefined {
  return events
    .filter(e => e.type === type)
    .sort((a, b) => b.magnitude - a.magnitude)[0];
}

export function pickHighlights(events: RaceEvent[]): RaceEvent[] {
  const picked: RaceEvent[] = [];

  // CANON: the wreckage and the weird — always in.
  picked.push(...events.filter(e => CANON_TYPES.has(e.type)));

  // STORY: the winner crossing the line…
  const winner = events.find(e => e.type === 'race_finish' && e.magnitude >= 1);
  if (winner) picked.push(winner);

  // …the race-winning move (only the LAST lead change matters in hindsight)…
  const leadChanges = events.filter(e => e.type === 'lead_change');
  if (leadChanges.length > 0) picked.push(leadChanges[leadChanges.length - 1]);

  // …and one each of the pit drama and the closest call.
  for (const type of ['slow_pit_stop', 'quick_pit_stop', 'close_call'] as const) {
    const top = topOfType(events, type);
    if (top) picked.push(top);
  }

  // TEXTURE, strictly rationed: the two biggest charges through the field.
  picked.push(
    ...events
      .filter(e => e.type === 'overtake')
      .sort((a, b) => b.magnitude - a.magnitude)
      .slice(0, 2)
  );

  // Dedupe, keep the most significant if over budget, then chronologize.
  const unique = [...new Set(picked)];
  return unique
    .sort((a, b) => b.magnitude - a.magnitude)
    .slice(0, HIGHLIGHTS_PER_RACE)
    .sort((a, b) => a.tick - b.tick);
}
