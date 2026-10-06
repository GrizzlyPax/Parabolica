// Acquisition rules (#232): how the sim hands out tags for what happens.
// Data, not code — a rule is a trigger from a small vocabulary plus the tag
// it awards and the headline the digest prints. Adding one is a toss-in.
//
// Three families (TAG_SYSTEM §5):
//   earned    — thresholds the driver crossed (wins, climbs, survival)
//   inflicted — trauma the race did to them (retirements, crashes)
//   cosmic    — the universe simply decides (seeded lottery)
//
// Everything a trigger reads comes from the digest + season stat lines, so
// the evaluator is a pure function and the whole log recomputes from inputs.

export type AcquisitionTrigger =
  /** N results in a row of this kind, ending with this race. */
  | { on: 'streak'; stat: 'win' | 'podium' | 'dnf'; count: number }
  /** Finished at least `places` higher than they started (optionally inside the top N). */
  | { on: 'climb'; places: number; finishedTop?: number }
  /** Retired from THIS race by crashing. */
  | { on: 'crashed-out' }
  /** Was damaged in a crash this race and still classified (optionally inside the top N). */
  | { on: 'survived-crash'; finishedTop?: number }
  /** Set the fastest lap this race. */
  | { on: 'fastest-lap' }
  /** Per-driver, per-race lottery from the derived seed. */
  | { on: 'lottery'; chance: number };

export interface AcquisitionRule {
  id: string;
  family: 'earned' | 'inflicted' | 'cosmic';
  tagId: string;
  when: AcquisitionTrigger;
  /** Headline template. {driver} and {tag} are filled in. */
  headline: string;
}

export const ACQUISITION_RULES: AcquisitionRule[] = [
  // ---- earned --------------------------------------------------------------
  { id: 'two-wins', family: 'earned', tagId: 'hot-streak',
    when: { on: 'streak', stat: 'win', count: 2 },
    headline: '{driver} is on a {tag} — two wins on the bounce' },
  { id: 'big-climb', family: 'earned', tagId: 'the-charger',
    when: { on: 'climb', places: 10, finishedTop: 5 },
    headline: '{driver} is {tag} — from the back of the grid to the top five' },
  { id: 'walked-away', family: 'earned', tagId: 'unkillable',
    when: { on: 'survived-crash', finishedTop: 8 },
    headline: '{driver} is {tag} — crashed, kept going, still scored' },

  // ---- inflicted -----------------------------------------------------------
  { id: 'three-dnfs', family: 'inflicted', tagId: 'haunted',
    when: { on: 'streak', stat: 'dnf', count: 3 },
    headline: '{driver} is now {tag} — three straight retirements' },
  { id: 'crashed-out', family: 'inflicted', tagId: 'shaken',
    when: { on: 'crashed-out' },
    headline: '{driver} is {tag} after crashing out' },

  // ---- cosmic --------------------------------------------------------------
  { id: 'the-whisper', family: 'cosmic', tagId: 'hears-the-track',
    when: { on: 'lottery', chance: 0.005 },
    headline: '{driver} now {tag}. Nobody asked them to' },
  { id: 'the-marking', family: 'cosmic', tagId: 'marked-by-the-void',
    when: { on: 'lottery', chance: 0.003 },
    headline: '{driver} has been {tag}' },
];

export const ACQUISITION_RULES_BY_ID = new Map(ACQUISITION_RULES.map(r => [r.id, r]));
