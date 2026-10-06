// Tag System - Emergent storytelling through persistent modifiers
// Tags can be assigned to drivers, cars, or teams and affect races

import { Rng } from '../engine/rng';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';
export const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'legendary'];
/** Odds of each bucket once a slot hits. Default 60 / 30 / 9 / 1. */
export type RarityOdds = Record<Rarity, number>;

export type TagTarget = 'driver' | 'car' | 'team' | 'condition';
export type TagTrigger = 'passive' | 'race_start' | 'pit_stop' | 'overtake' | 'crash_proximity' | 'final_lap' | 'track_event';

/**
 * A declarative gate on a passive tag's effects: the effects apply only while
 * the predicate holds against the live RaceContext (evaluated every tick, no
 * RNG). This is the fix for #156 — "conditional" tags like Rain Dancer were
 * passive-but-ungated, so they ran 100% of the time. See docs/CONDITIONS_LAYER.md.
 */
export type TagCondition =
  | { when: 'position'; min?: number; max?: number }              // 1-based running position
  | { when: 'positionFraction'; top?: number; bottom?: number }   // share of the field (0-1)
  | { when: 'lapProgress'; after?: number; before?: number }      // 0-1 over the race
  | { when: 'condition'; has: string }                            // active weather/track condition id
  | { when: 'damaged' }                                            // car is damaged
  | { when: 'tireWear'; below?: number; above?: number };          // 0-100

/** The live race state a TagCondition reads. Built once per tick by the engine.
 * Pure data so conditions stay declarative and testable. */
export interface RaceContext {
  position: number;       // 1-based running position
  fieldSize: number;      // cars still running (non-DNF)
  lapProgress: number;    // 0-1 over the race
  gapAhead: number;       // distance units to the car ahead (Infinity if leader)
  gapBehind: number;      // distance units to the car behind (Infinity if last)
  inTraffic: boolean;     // in a proximity battle this tick
  tireWear: number;       // 0-100
  isDamaged: boolean;
  safetyCar: boolean;
  conditions: string[];   // active weather/track condition ids (empty until weather lands)
}

/** Evaluate a TagCondition against the current race state. Deterministic, no RNG. */
export function evaluateTagCondition(cond: TagCondition, ctx: RaceContext): boolean {
  switch (cond.when) {
    case 'position':
      if (cond.min !== undefined && ctx.position < cond.min) return false;
      if (cond.max !== undefined && ctx.position > cond.max) return false;
      return true;
    case 'positionFraction': {
      const frac = ctx.fieldSize > 0 ? ctx.position / ctx.fieldSize : 0;
      if (cond.top !== undefined && frac > cond.top) return false;
      if (cond.bottom !== undefined && frac <= 1 - cond.bottom) return false;
      return true;
    }
    case 'lapProgress':
      if (cond.after !== undefined && ctx.lapProgress < cond.after) return false;
      if (cond.before !== undefined && ctx.lapProgress >= cond.before) return false;
      return true;
    case 'condition':
      return ctx.conditions.includes(cond.has);
    case 'damaged':
      return ctx.isDamaged;
    case 'tireWear':
      if (cond.below !== undefined && ctx.tireWear >= cond.below) return false;
      if (cond.above !== undefined && ctx.tireWear <= cond.above) return false;
      return true;
    default:
      return false;
  }
}

/** Plain-words version of a condition, for the UI ("running top 3", "rain"). */
export function describeCondition(cond: TagCondition): string {
  switch (cond.when) {
    case 'position': {
      if (cond.max !== undefined && cond.min === undefined) return `running top ${cond.max}`;
      if (cond.min !== undefined && cond.max === undefined) return `running P${cond.min} or lower`;
      if (cond.min !== undefined && cond.max !== undefined) return `running P${cond.min}–P${cond.max}`;
      return 'any position';
    }
    case 'positionFraction': {
      if (cond.top !== undefined) return `top ${Math.round(cond.top * 100)}% of the field`;
      if (cond.bottom !== undefined) return `bottom ${Math.round(cond.bottom * 100)}% of the field`;
      return 'any position';
    }
    case 'lapProgress': {
      if (cond.after !== undefined && cond.before === undefined) return cond.after === 0 ? 'all race' : `last ${Math.round((1 - cond.after) * 100)}% of the race`;
      if (cond.before !== undefined && cond.after === undefined) return `first ${Math.round(cond.before * 100)}% of the race`;
      return `between ${Math.round((cond.after ?? 0) * 100)}% and ${Math.round((cond.before ?? 1) * 100)}% of the race`;
    }
    case 'condition': return `in ${cond.has}`;
    case 'damaged': return 'car damaged';
    case 'tireWear': {
      if (cond.above !== undefined) return `tyre wear over ${cond.above}%`;
      if (cond.below !== undefined) return `tyre wear under ${cond.below}%`;
      return 'any tyre wear';
    }
    default: return 'unknown condition';
  }
}

/** Plain-words trigger, for the UI. */
export const TRIGGER_LABELS: Record<TagTrigger, string> = {
  passive: 'always on',
  race_start: 'at the start',
  pit_stop: 'on a pit stop',
  overtake: 'on an overtake',
  crash_proximity: 'near a crash',
  final_lap: 'on the final lap',
  track_event: 'on a track event',
};

/** How long an acquired tag sticks (#232). Absent = permanent. */
export type TagDuration = 'permanent' | 'season' | { races: number };

/** Which doors may hand a tag out. Absent = genesis + intervention (the
 * classic tags). Acquired-only tags never appear in the genesis pool. */
export type TagSource = 'genesis' | 'acquired' | 'in-race' | 'intervention' | 'decree' | 'divine';

/** Who an after-race action lands on (#233). `rival` = the driver they
 * tangled with in this race (from the digest's crash pairs). */
export type ActionTarget = 'self' | 'teammate' | 'rival' | 'random';

/** Something a tag DOES after a race, beyond turning a dial (#233).
 * Evaluated by settle for every tag carried into that race; every action
 * rolls its own `chance` from a derived seed, so it replays identically. */
export type TagAction =
  | { do: 'attach-tag'; tagId: string; to: ActionTarget; chance: number; headline: string }
  | { do: 'expire-self'; chance: number; headline: string }
  | { do: 'remove-tag'; tagId: string; chance: number; headline: string };

export interface Tag {
  id: string;
  name: string;
  emoji: string;
  description: string;
  target: TagTarget;
  trigger: TagTrigger;
  duration?: TagDuration;
  sources?: TagSource[];
  /** Which bucket the genesis draw finds it in. Says nothing about size:
   * bucket odds are fixed in the ruleset, so adding tags to a bucket never
   * changes how often that bucket comes up — only which tag you get. */
  rarity: Rarity;
  /** Gate for passive effects — apply only while this holds. Ungated passives are always-on. */
  condition?: TagCondition;
  // Effect modifiers (applied when tag is active)
  effects: {
    speedModifier?: number;      // Multiplier (1.0 = no change, 1.05 = +5%)
    consistencyModifier?: number;
    luckModifier?: number;
    crashResistance?: number;    // Reduces crash chance
    pitSpeedModifier?: number;   // Affects pit stop duration
  };
  // Chance this tag triggers when conditions are met (0-1)
  triggerChance?: number;
  // Flavor text shown when tag activates
  activationText?: string;
  /** Things this tag does after each race it was carried into (#233). */
  afterRace?: TagAction[];
}

// ============ DRIVER TAGS ============
export const DRIVER_TAGS: Tag[] = [
  {
    id: 'clutch-performer',
    name: 'Clutch Performer',
    emoji: '🎯',
    description: 'Raises their game when it matters most',
    target: 'driver',
    trigger: 'final_lap',
    rarity: 'uncommon',
    effects: {
      speedModifier: 1.08,
      consistencyModifier: 1.15,
    },
    triggerChance: 0.7,
    activationText: 'finds another gear for the final lap!',
  },
  {
    id: 'rain-dancer',
    name: 'Rain Dancer',
    emoji: '🌧️',
    description: 'Mysteriously faster when the skies open',
    target: 'driver',
    trigger: 'passive',
    rarity: 'rare',
    // #156 fix: gated to rain. Dormant until the weather layer lands (C2) —
    // until then `conditions` never contains 'rain', so this is inert instead
    // of the old always-on 9× destiny. Magnitudes to be lab-calibrated with weather.
    condition: { when: 'condition', has: 'rain' },
    // Calibrated for the wet (C2): at 1.12/0.30 it won 46.7% of rain races
    // (10.3× — an auto-win). Trimmed so it's the clear rain favorite, not a lock.
    effects: {
      consistencyModifier: 1.08,
      crashResistance: 0.15,
    },
    activationText: 'thrives in the chaos!',
  },
  {
    id: 'sunday-driver',
    name: 'Sunday Driver',
    emoji: '🐢',
    description: 'Slow starter who builds to a strong finish',
    target: 'driver',
    trigger: 'passive',
    // Measured 10.4% win (2.3×) post-fix — a fun comeback tag, kept rare.
    rarity: 'uncommon',
    // #156 fix: the "builds pace" was never implemented — only a permanent
    // 0.95 penalty (a death sentence). Now a late-race surge that actually pays off.
    condition: { when: 'lapProgress', after: 0.6 },
    effects: {
      speedModifier: 1.05,
    },
    activationText: 'is finally getting up to speed...',
  },
];

// ============ CAR TAGS ============
export const CAR_TAGS: Tag[] = [
  {
    id: 'glass-cannon',
    name: 'Glass Cannon',
    emoji: '💎',
    description: 'Blazingly fast but fragile',
    target: 'car',
    trigger: 'passive',
    rarity: 'uncommon',
    // Calibration (#156): was speed 1.06 → 20.4% win (4.5×, the new top destiny).
    // The flat +6% all-race outran its fragility because DNFs are only ~22%.
    // Halved the speed upside; the -0.25 fragility stays its identity.
    effects: {
      speedModifier: 1.03,
      crashResistance: -0.25, // More likely to break
    },
    activationText: 'is pushing the limits of physics!',
  },
  {
    id: 'cursed-chassis',
    name: 'Cursed Chassis',
    emoji: '👻',
    description: 'Something is wrong with this car. Nobody knows what.',
    target: 'car',
    trigger: 'passive',
    rarity: 'uncommon',
    // Calibration (#156): was luck 0.7 / consistency 0.9 → 0.0% win, P20.9 (a
    // flat death sentence; consistency is the #2 stat so -10% was brutal — and
    // any persistent penalty pins a car to the back over a full race). Softened
    // hard to a clearly-cursed but not-hopeless car (still net-negative).
    effects: {
      luckModifier: 0.88,
      consistencyModifier: 0.98,
    },
    activationText: 'is acting up again...',
  },
  {
    id: 'pit-lane-special',
    name: 'Pit Lane Special',
    emoji: '🔧',
    description: 'Optimized for quick pit stops',
    target: 'car',
    trigger: 'pit_stop',
    rarity: 'common',
    effects: {
      pitSpeedModifier: 0.75, // 25% faster pits
    },
    triggerChance: 1.0,
    activationText: 'flies through the pit lane!',
  },
];

// ============ TEAM TAGS ============
export const TEAM_TAGS: Tag[] = [
  {
    id: 'underdog-spirit',
    name: 'Underdog Spirit',
    emoji: '🐕',
    description: 'Performs better when behind',
    target: 'team',
    trigger: 'passive',
    rarity: 'common',
    // #156 fix: "when behind" is now real — gated to the bottom half of the field.
    condition: { when: 'positionFraction', bottom: 0.5 },
    effects: {
      speedModifier: 1.03,
      luckModifier: 1.10,
    },
    activationText: 'refuses to give up!',
  },
  {
    id: 'front-runners',
    name: 'Front Runners',
    emoji: '👑',
    description: 'Thrives when leading the pack',
    target: 'team',
    trigger: 'passive',
    rarity: 'common',
    // #156 fix: "when leading" is now real — gated to a top-5 running position.
    // Calibration: gating cut it 23.1%→14.3%; trimmed further (was 1.06/0.12) to
    // soften the rich-get-richer once a car is already at the front.
    condition: { when: 'position', max: 5 },
    effects: {
      consistencyModifier: 1.04,
      crashResistance: 0.08,
    },
    activationText: 'is comfortable at the front!',
  },
  {
    id: 'chaotic-energy',
    name: 'Chaotic Energy',
    emoji: '🌀',
    description: 'Unpredictable - could be brilliant or disastrous',
    target: 'team',
    trigger: 'race_start',
    rarity: 'uncommon',
    effects: {
      // Randomly assigns big bonus or penalty each race
      speedModifier: 1.0, // Modified at race start
      consistencyModifier: 0.8,
    },
    triggerChance: 0.5,
    activationText: 'is channeling something strange today...',
  },
];

// ============ CONDITION TAGS ============
// These are applied by track events to individual drivers
// They represent environmental/track conditions affecting performance

export const CONDITION_TAGS: Tag[] = [
  // === HAZARD CONDITIONS (crash risk) ===
  {
    id: 'low-visibility',
    rarity: 'common',
    name: 'Low Visibility',
    emoji: '🌫️',
    description: 'Fog, mist, or smoke reducing driver visibility',
    target: 'condition',
    trigger: 'track_event',
    effects: {
      crashResistance: -0.15,
      consistencyModifier: 0.92,
    },
    activationText: 'is struggling to see the track ahead!',
  },
  {
    id: 'slippery-surface',
    rarity: 'rare',
    name: 'Slippery Surface',
    emoji: '💧',
    description: 'Oil, water, or debris on the track',
    target: 'condition',
    trigger: 'track_event',
    effects: {
      crashResistance: -0.20,
      consistencyModifier: 0.88,
    },
    activationText: 'hits a slippery patch!',
  },
  {
    id: 'debris-hazard',
    rarity: 'rare',
    name: 'Debris Hazard',
    emoji: '⚠️',
    description: 'Track debris creating danger',
    target: 'condition',
    trigger: 'track_event',
    effects: {
      crashResistance: -0.25,
    },
    activationText: 'is navigating through debris!',
  },
  {
    id: 'dust-cloud',
    rarity: 'uncommon',
    name: 'Dust Cloud',
    emoji: '💨',
    description: 'Kicked-up dust reducing visibility',
    target: 'condition',
    trigger: 'track_event',
    effects: {
      crashResistance: -0.12,
      consistencyModifier: 0.94,
    },
    activationText: 'is blinded by dust!',
  },

  // === SPEED CONDITIONS ===
  {
    id: 'adrenaline-surge',
    rarity: 'uncommon',
    name: 'Adrenaline Surge',
    emoji: '⚡',
    description: 'A burst of speed from the excitement',
    target: 'condition',
    trigger: 'track_event',
    effects: {
      speedModifier: 1.08,
    },
    activationText: 'gets a burst of adrenaline!',
  },
  {
    id: 'slipstream-boost',
    name: 'Slipstream Boost',
    emoji: '🌀',
    description: 'Caught a powerful slipstream',
    target: 'condition',
    trigger: 'track_event',
    rarity: 'common',
    effects: {
      speedModifier: 1.05,
    },
    activationText: 'catches an incredible slipstream!',
  },
  {
    id: 'track-evolution',
    name: 'Track Evolution',
    emoji: '📈',
    description: 'Track grip improving with rubber buildup',
    target: 'condition',
    trigger: 'track_event',
    rarity: 'common',
    effects: {
      speedModifier: 1.04,
      consistencyModifier: 1.05,
    },
    activationText: 'benefits from improved track conditions!',
  },
  {
    id: 'headwind',
    rarity: 'uncommon',
    name: 'Headwind',
    emoji: '🍃',
    description: 'Strong headwind reducing straight-line speed',
    target: 'condition',
    trigger: 'track_event',
    effects: {
      speedModifier: 0.94,
    },
    activationText: 'is fighting against the wind!',
  },
  {
    id: 'cooling-issues',
    rarity: 'uncommon',
    name: 'Cooling Issues',
    emoji: '🌡️',
    description: 'High temperatures forcing reduced pace',
    target: 'condition',
    trigger: 'track_event',
    effects: {
      speedModifier: 0.92,
      consistencyModifier: 0.95,
    },
    activationText: 'is managing overheating!',
  },
  {
    id: 'tire-graining',
    rarity: 'uncommon',
    name: 'Tire Graining',
    emoji: '🛞',
    description: 'Temporary loss of tire grip',
    target: 'condition',
    trigger: 'track_event',
    effects: {
      speedModifier: 0.95,
      crashResistance: -0.08,
    },
    activationText: 'is suffering from tire graining!',
  },

  // === FOCUS CONDITIONS ===
  {
    id: 'distracted',
    rarity: 'uncommon',
    name: 'Distracted',
    emoji: '😵',
    description: 'Lost focus, making small mistakes',
    target: 'condition',
    trigger: 'track_event',
    effects: {
      speedModifier: 0.96,
      consistencyModifier: 0.90,
    },
    activationText: 'loses concentration!',
  },
  {
    id: 'in-the-zone',
    rarity: 'uncommon',
    name: 'In The Zone',
    emoji: '🎯',
    description: 'Perfect focus, hitting every apex',
    target: 'condition',
    trigger: 'track_event',
    effects: {
      speedModifier: 1.06,
      consistencyModifier: 1.10,
    },
    activationText: 'is in the zone!',
  },
  {
    id: 'rattled',
    rarity: 'uncommon',
    name: 'Rattled',
    emoji: '😰',
    description: 'Shaken up, driving cautiously',
    target: 'condition',
    trigger: 'track_event',
    effects: {
      speedModifier: 0.93,
      crashResistance: 0.15,
    },
    activationText: 'is rattled and backing off!',
  },
  {
    id: 'desperate-push',
    rarity: 'rare',
    name: 'Desperate Push',
    emoji: '🔥',
    description: 'Nothing to lose, pushing hard',
    target: 'condition',
    trigger: 'track_event',
    effects: {
      speedModifier: 1.10,
      crashResistance: -0.20,
    },
    activationText: 'throws caution to the wind!',
  },

  // === PIT CONDITIONS ===
  {
    id: 'pit-congestion',
    rarity: 'uncommon',
    name: 'Pit Congestion',
    emoji: '🚧',
    description: 'Heavy pit lane traffic',
    target: 'condition',
    trigger: 'track_event',
    effects: {
      pitSpeedModifier: 1.25,
    },
    activationText: 'is stuck in pit lane traffic!',
  },
  {
    id: 'equipment-malfunction',
    rarity: 'rare',
    name: 'Equipment Malfunction',
    emoji: '🔧',
    description: 'Pit equipment issues causing delays',
    target: 'condition',
    trigger: 'track_event',
    effects: {
      pitSpeedModifier: 1.40,
    },
    activationText: 'has pit equipment problems!',
  },
  {
    id: 'fast-hands',
    rarity: 'uncommon',
    name: 'Fast Hands',
    emoji: '👐',
    description: 'Pit crew on fire today',
    target: 'condition',
    trigger: 'track_event',
    effects: {
      pitSpeedModifier: 0.80,
    },
    activationText: 'gets a lightning-fast pit stop!',
  },
];

// ============ ACQUIRED TAGS (#232) ============
// Handed out by the settle loop when something happens — never rolled at
// genesis. The rules that award them live in data/acquisitions.ts.
export const ACQUIRED_TAGS: Tag[] = [
  {
    id: 'hot-streak',
    name: 'Hot Streak',
    emoji: '🔥',
    description: 'Two wins on the bounce. Everything is coming easy.',
    target: 'driver',
    trigger: 'passive',
    rarity: 'uncommon',
    duration: { races: 3 },
    sources: ['acquired'],
    effects: { speedModifier: 1.02, consistencyModifier: 1.05 },
    afterRace: [
      { do: 'attach-tag', tagId: 'the-charger', to: 'self', chance: 0.15, headline: '{driver}\'s 🔥 Hot Streak hardens into {tag}' },
    ],
  },
  {
    id: 'the-charger',
    name: 'The Charger',
    emoji: '🐎',
    description: 'Came through the field like it owed them money. Faster in traffic.',
    target: 'driver',
    trigger: 'passive',
    rarity: 'uncommon',
    duration: 'season',
    sources: ['acquired'],
    condition: { when: 'positionFraction', bottom: 0.5 },
    effects: { speedModifier: 1.03 },
  },
  {
    id: 'unkillable',
    name: 'Unkillable',
    emoji: '🛡️',
    description: 'Walked away from a wreck and kept racing. Harder to put out now.',
    target: 'driver',
    trigger: 'passive',
    rarity: 'uncommon',
    duration: 'permanent',
    sources: ['acquired'],
    effects: { crashResistance: 0.12 },
  },
  {
    id: 'haunted',
    name: 'Haunted',
    emoji: '👻',
    description: 'Three retirements in a row. Something followed them home.',
    target: 'driver',
    trigger: 'passive',
    rarity: 'rare',
    duration: { races: 4 },
    sources: ['acquired'],
    effects: { luckModifier: 0.8, crashResistance: -0.05 },
    afterRace: [
      { do: 'attach-tag', tagId: 'haunted', to: 'teammate', chance: 0.1, headline: 'Whatever is 👻 haunting {driver} crosses the garage to {target}' },
    ],
  },
  {
    id: 'shaken',
    name: 'Shaken',
    emoji: '😵',
    description: 'Crashed out last time. The hands are not quite steady yet.',
    target: 'driver',
    trigger: 'passive',
    rarity: 'uncommon',
    duration: { races: 2 },
    sources: ['acquired'],
    effects: { consistencyModifier: 0.94 },
    afterRace: [
      { do: 'attach-tag', tagId: 'bad-blood', to: 'rival', chance: 0.5, headline: '{target} has 👊 Bad Blood with {driver} after that crash' },
    ],
  },
  {
    id: 'hears-the-track',
    name: 'Hears the Track',
    emoji: '👂',
    description: 'They say the asphalt talks to them. It has not said anything useful yet.',
    target: 'driver',
    trigger: 'passive',
    rarity: 'common',
    duration: 'season',
    sources: ['acquired'],
    effects: {},
    afterRace: [
      { do: 'remove-tag', tagId: 'shaken', chance: 1, headline: 'The track tells {driver} to stop being 😵 Shaken. They listen.' },
    ],
  },
  {
    id: 'marked-by-the-void',
    name: 'Marked by the Void',
    emoji: '🕳️',
    description: 'The universe simply decided. Fortune looks the other way for a while.',
    target: 'driver',
    trigger: 'passive',
    rarity: 'uncommon',
    duration: { races: 2 },
    sources: ['acquired'],
    effects: { luckModifier: 0.9 },
    afterRace: [
      { do: 'attach-tag', tagId: 'marked-by-the-void', to: 'random', chance: 0.1, headline: 'The 🕳️ Void loses interest in {driver} and notices {target}' },
      { do: 'expire-self', chance: 0.1, headline: 'The 🕳️ Void forgets {driver}' },
    ],
  },
  {
    id: 'bad-blood',
    name: 'Bad Blood',
    emoji: '👊',
    description: 'Someone is driving angry. Quicker, and less careful about it.',
    target: 'driver',
    trigger: 'passive',
    rarity: 'uncommon',
    duration: { races: 3 },
    sources: ['acquired'],
    effects: { speedModifier: 1.02, crashResistance: -0.06 },
  },
];

// ============ IN-RACE TAGS (#232b) ============
// Picked up mid-race by data/inRace.ts rules. Transient states, so they
// bypass the slot cap; `duration` here is informational (the rule decides).
export const IN_RACE_TAGS: Tag[] = [
  { id: 'damaged', name: 'Damaged', emoji: '🔧', description: 'Survived a crash. The car is 15% slower for the rest of the race.',
    target: 'driver', trigger: 'passive', rarity: 'rare', sources: ['in-race'], effects: { speedModifier: 0.85 } },
  { id: 'spun', name: 'Spun', emoji: '🌀', description: 'Just swapped ends. The next couple of laps are ragged.',
    target: 'driver', trigger: 'passive', rarity: 'uncommon', sources: ['in-race'], effects: { consistencyModifier: 0.9 } },
  { id: 'cooked-tyres', name: 'Cooked Tyres', emoji: '🔥', description: 'Past the cliff. Slower until the next stop.',
    target: 'driver', trigger: 'passive', rarity: 'uncommon', sources: ['in-race'], effects: { speedModifier: 0.97 } },
  { id: 'sulking', name: 'Sulking', emoji: '🐢', description: 'That stop was slow and everyone knows it.',
    target: 'driver', trigger: 'passive', rarity: 'common', sources: ['in-race'], effects: { consistencyModifier: 0.96 } },
  { id: 'fired-up', name: 'Fired Up', emoji: '⚡', description: 'A lightning stop. The whole crew is buzzing.',
    target: 'driver', trigger: 'passive', rarity: 'common', sources: ['in-race'], effects: { speedModifier: 1.01 } },
];

// All tags combined for easy lookup
export const ALL_TAGS: Tag[] = [...DRIVER_TAGS, ...CAR_TAGS, ...TEAM_TAGS, ...CONDITION_TAGS, ...ACQUIRED_TAGS, ...IN_RACE_TAGS];

/** May this tag be rolled at genesis? Classic tags (no `sources`) yes. */
export function isGenesisTag(t: Tag): boolean {
  return t.target !== 'condition' && (t.sources?.includes('genesis') ?? true);
}

/** Plain-words duration, for the UI. */
export function describeDuration(d: TagDuration | undefined): string {
  if (!d || d === 'permanent') return 'for good';
  if (d === 'season') return 'rest of the season';
  return `${d.races} race${d.races === 1 ? '' : 's'}`;
}

// Get tag by ID
export function getTagById(id: string): Tag | undefined {
  return ALL_TAGS.find(t => t.id === id);
}

/** Slots per driver for the full stack (driver + car + team tags, from any
 * source). Enforced by the league when tags are attached, not by the engine. */
export const MAX_TAGS_PER_DRIVER = 4;

export const DEFAULT_RARITY_ODDS: RarityOdds = { common: 60, uncommon: 30, rare: 9, legendary: 1 };

/** Roll a bucket from fixed odds. Exactly one rng() draw. */
export function rollRarity(odds: RarityOdds, rng: Rng): Rarity {
  const total = RARITIES.reduce((s, r) => s + Math.max(0, odds[r]), 0);
  let x = rng() * total;
  for (const r of RARITIES) { x -= Math.max(0, odds[r]); if (x < 0) return r; }
  return 'common';
}

/** The genesis pick: roll a bucket, then a uniform pick inside it. An empty
 * bucket falls to the nearest non-empty one (more common first). Exactly
 * two rng() draws. */
export function pickTagByRarity(pool: Tag[], odds: RarityOdds, rng: Rng): Tag | null {
  const bucket = rollRarity(odds, rng);
  const pick = rng();
  if (pool.length === 0) return null;
  const want = RARITIES.indexOf(bucket);
  const order = [...RARITIES.slice(0, want + 1).reverse(), ...RARITIES.slice(want + 1)];
  for (const r of order) {
    const inBucket = pool.filter(t => t.rarity === r);
    if (inBucket.length) return inBucket[Math.floor(pick * inBucket.length)];
  }
  return null;
}

/** Assemble a driver's starting stack from the genesis rolls (driver, car,
 * team) — the one place the three old slots become the list. */
export function genesisTags(...rolled: (Tag | null | undefined)[]): Tag[] {
  return rolled.filter((t): t is Tag => !!t);
}

/** Tags on a stack that belong to a given target (for UI grouping). */
export function tagsFor(tags: Tag[] | undefined, target: TagTarget): Tag[] {
  return (tags ?? []).filter(t => t.target === target);
}

// Get tags for a specific target type
export function getTagsForTarget(target: TagTarget): Tag[] {
  return ALL_TAGS.filter(t => t.target === target);
}
