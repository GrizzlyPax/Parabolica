// Phase 0 toss-in spike (docs/PARABOLICA_2_0 plan, "The toss-in test").
// Five oddities of five shapes, written as data as far as today's Tag type
// allows. Where the type can't say it, the intended declaration is written
// against a PROPOSED shape so the gap is a type error, not a guess.
// Nothing here is registered in ALL_TAGS; the spike test attaches these
// directly. Delete this file when Phase 0 lands the real plumbing.

import { Tag, TagCondition } from './tags';

// ---------------------------------------------------------------------------
// 1. Pit Lane Gremlin — pit stops 50% longer, only in rain.
//    Shape: car tag, passive, condition-gated. EXPRESSIBLE TODAY.
//    Gap: can't coexist with an existing car tag (one slot per entity).
// ---------------------------------------------------------------------------
export const PIT_LANE_GREMLIN: Tag = {
  id: 'pit-lane-gremlin',
  name: 'Pit Lane Gremlin',
  emoji: '🧌',
  description: 'Something lives in the wheel gun. It hates getting wet.',
  target: 'car',
  trigger: 'passive',
  tier: 'trait',
  condition: { when: 'condition', has: 'rain' },
  effects: { pitSpeedModifier: 1.5 },
};

// ---------------------------------------------------------------------------
// Proposed extensions. Each is the smallest addition that lets one of the
// remaining four be pure data. They are sketches for the Phase 0 PRs, not
// final API.
// ---------------------------------------------------------------------------

/** Conditions the live gate would need beyond today's six. */
export type ProposedCondition =
  | TagCondition
  | { when: 'nearDriver'; driverId: number; withinSeconds: number }; // Nemesis

/** Effects that act on the RACE but field-wide or on event odds (Magnet). */
export interface ProposedRaceEffects {
  /** Multiplier on the chance a crash deploys the safety car. */
  safetyCarOddsModifier?: number;
}

/** Effects that act on the SEASON, applied by settle, never by the engine. */
export interface ProposedSeasonEffects {
  /** Flat points added per classified finish (Sponsor's Favorite). */
  bonusPointsPerFinish?: number;
}

/** Things a tag can DO at settle time, beyond scaling a number. */
export type ProposedAction =
  | { do: 'attach-tag'; to: 'teammate' | 'rival' | 'self'; tagId: string; chance?: number }
  | { do: 'expire-self' };

/** When a tag is awarded by the settle loop (TAG_SYSTEM §5). */
export type ProposedAcquisitionRule =
  | { on: 'streak'; stat: 'dnf' | 'win' | 'podium'; count: number }
  | { on: 'crashed-with-same-driver'; count: number };

export interface ProposedTag extends Tag {
  condition?: ProposedCondition;
  raceEffects?: ProposedRaceEffects;
  seasonEffects?: ProposedSeasonEffects;
  /** Fired after a race in which this tag was present. */
  afterRace?: ProposedAction[];
  /** How a driver earns this tag; absent = genesis/intervention/decree only. */
  acquiredBy?: ProposedAcquisitionRule;
  /** Lifetime: today everything is permanent. */
  duration?: 'permanent' | 'season' | { races: number };
  /** Which doors may hand this tag out. */
  sources?: Array<'genesis' | 'acquired' | 'intervention' | 'decree' | 'divine'>;
}

// ---------------------------------------------------------------------------
// 2. Sponsor's Favorite — +1 championship point per finish, decree-granted.
//    Shape: season-scoped effect. NOT EXPRESSIBLE: effects only touch the race.
//    Needs: seasonEffects read by settle's points accumulation; a 'decree' source.
// ---------------------------------------------------------------------------
export const SPONSORS_FAVORITE: ProposedTag = {
  id: 'sponsors-favorite',
  name: "Sponsor's Favorite",
  emoji: '💼',
  description: 'The backers have made their preference known.',
  target: 'driver',
  trigger: 'passive',
  tier: 'power',
  effects: {},
  seasonEffects: { bonusPointsPerFinish: 1 },
  duration: 'season',
  sources: ['decree'],
};

// ---------------------------------------------------------------------------
// 3. The Magnet — safety cars twice as likely while this driver runs top 3.
//    Shape: per-driver condition, field-wide consequence on event odds.
//    NOT EXPRESSIBLE: no effect touches event probabilities, and all effects
//    are per-driver. Needs: raceEffects + an engine read at deployUnsafetyCar.
// ---------------------------------------------------------------------------
export const THE_MAGNET: ProposedTag = {
  id: 'the-magnet',
  name: 'The Magnet',
  emoji: '🧲',
  description: 'Trouble finds the front of the field when they are in it.',
  target: 'driver',
  trigger: 'passive',
  tier: 'power',
  condition: { when: 'position', max: 3 },
  effects: {},
  raceEffects: { safetyCarOddsModifier: 2 },
};

// ---------------------------------------------------------------------------
// 4. Haunted — acquired after 3 straight DNFs, −luck, spreads to a teammate
//    after a race together.
//    Shape: acquisition rule + cross-driver action + duration.
//    NOT EXPRESSIBLE: nothing is awarded by results; nothing acts on others;
//    nothing expires across races. Needs: T2 acquisition engine, afterRace
//    actions, duration entries in the intervention log.
// ---------------------------------------------------------------------------
export const HAUNTED: ProposedTag = {
  id: 'haunted',
  name: 'Haunted',
  emoji: '👻',
  description: 'Three retirements in a row. Something followed them home.',
  target: 'driver',
  trigger: 'passive',
  tier: 'power',
  effects: { luckModifier: 0.8 },
  acquiredBy: { on: 'streak', stat: 'dnf', count: 3 },
  afterRace: [{ do: 'attach-tag', to: 'teammate', tagId: 'haunted', chance: 0.5 }],
  duration: { races: 4 },
  sources: ['acquired'],
};

// ---------------------------------------------------------------------------
// 5. Nemesis — paired after two crashes with the same driver, +speed only
//    when within 1 s of them.
//    Shape: cross-race memory, paired attach, identity-aware condition.
//    NOT EXPRESSIBLE: RaceContext knows the gap ahead/behind but not WHO;
//    crash events carry involvedDriverIds only on the DNF record. Needs:
//    'nearDriver' condition (engine), crash-pair memory in digests (settle),
//    paired acquisition. Tag instances would need per-instance data (the
//    rival's id) — today a Tag is a shared constant.
// ---------------------------------------------------------------------------
export function nemesis(rivalId: number, rivalName: string): ProposedTag {
  return {
    id: `nemesis-${rivalId}`,
    name: `Nemesis: ${rivalName}`,
    emoji: '⚔️',
    description: 'Twice now. It is personal.',
    target: 'driver',
    trigger: 'passive',
    tier: 'power',
    condition: { when: 'nearDriver', driverId: rivalId, withinSeconds: 1 },
    effects: { speedModifier: 1.05 },
    acquiredBy: { on: 'crashed-with-same-driver', count: 2 },
    sources: ['acquired'],
  };
}
