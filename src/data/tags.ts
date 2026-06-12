// Tag System - Emergent storytelling through persistent modifiers
// Tags can be assigned to drivers, cars, or teams and affect races

import { Rng } from '../engine/rng';

export type TagTarget = 'driver' | 'car' | 'team' | 'condition';
export type TagTrigger = 'passive' | 'race_start' | 'pit_stop' | 'overtake' | 'crash_proximity' | 'final_lap' | 'track_event';

// Magnitude ladder (see docs/TAG_SYSTEM.md §3 and #156). Tiers are lab-calibrated
// targets, not raw numbers — they say how big a tag is allowed to be:
//   quirk ~1× (flavor) · trait ~1.2× · power ~1.5-2× · destiny ~3×+ (rare, season-warping)
export type TagTier = 'quirk' | 'trait' | 'power' | 'destiny';

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

export interface Tag {
  id: string;
  name: string;
  emoji: string;
  description: string;
  target: TagTarget;
  trigger: TagTrigger;
  /** Magnitude tier (the #156 ladder). Optional while the roster is being calibrated. */
  tier?: TagTier;
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
    tier: 'power',
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
    tier: 'destiny',
    // #156 fix: gated to rain. Dormant until the weather layer lands (C2) —
    // until then `conditions` never contains 'rain', so this is inert instead
    // of the old always-on 9× destiny. Magnitudes to be lab-calibrated with weather.
    condition: { when: 'condition', has: 'rain' },
    effects: {
      consistencyModifier: 1.12,
      crashResistance: 0.3,
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
    // Measured 10.4% win (2.3×) post-fix — a fun comeback tag living at Power,
    // not Trait. Re-tiered to match reality rather than nerf the mechanic.
    tier: 'power',
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
    tier: 'power',
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
    tier: 'power',
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
    tier: 'trait',
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
    tier: 'trait',
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
    tier: 'trait',
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
    tier: 'power',
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
    effects: {
      speedModifier: 1.04,
      consistencyModifier: 1.05,
    },
    activationText: 'benefits from improved track conditions!',
  },
  {
    id: 'headwind',
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

// All tags combined for easy lookup
export const ALL_TAGS: Tag[] = [...DRIVER_TAGS, ...CAR_TAGS, ...TEAM_TAGS, ...CONDITION_TAGS];

// Get tag by ID
export function getTagById(id: string): Tag | undefined {
  return ALL_TAGS.find(t => t.id === id);
}

// Get random tag for a target type (with low probability)
export function maybeAssignTag(target: TagTarget, rng: Rng = Math.random): Tag | null {
  const chance = 0.15; // 15% chance to get a tag
  if (rng() > chance) return null;

  const availableTags = ALL_TAGS.filter(t => t.target === target);
  return availableTags[Math.floor(rng() * availableTags.length)];
}

// Get tags for a specific target type
export function getTagsForTarget(target: TagTarget): Tag[] {
  return ALL_TAGS.filter(t => t.target === target);
}
