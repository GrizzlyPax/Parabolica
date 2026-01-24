// Tag System - Emergent storytelling through persistent modifiers
// Tags can be assigned to drivers, cars, or teams and affect races

export type TagTarget = 'driver' | 'car' | 'team' | 'condition';
export type TagTrigger = 'passive' | 'race_start' | 'pit_stop' | 'overtake' | 'crash_proximity' | 'final_lap' | 'track_event';

export interface Tag {
  id: string;
  name: string;
  emoji: string;
  description: string;
  target: TagTarget;
  trigger: TagTrigger;
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
    description: 'Mysteriously faster when conditions are difficult',
    target: 'driver',
    trigger: 'passive',
    effects: {
      // This will be checked against track conditions
      consistencyModifier: 1.12,
      crashResistance: 0.3,
    },
    activationText: 'thrives in the chaos!',
  },
  {
    id: 'sunday-driver',
    name: 'Sunday Driver',
    emoji: '🐢',
    description: 'Slow starter but builds pace throughout',
    target: 'driver',
    trigger: 'passive',
    effects: {
      // Early race: slower. Late race: faster. Handled in engine.
      speedModifier: 0.95, // Base penalty, increases over race
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
    effects: {
      speedModifier: 1.06,
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
    effects: {
      luckModifier: 0.7,
      consistencyModifier: 0.9,
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
    effects: {
      // Bonus when in bottom half of standings
      speedModifier: 1.04,
      luckModifier: 1.15,
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
    effects: {
      // Bonus when in top 5
      consistencyModifier: 1.10,
      crashResistance: 0.2,
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
export function maybeAssignTag(target: TagTarget): Tag | null {
  const chance = 0.15; // 15% chance to get a tag
  if (Math.random() > chance) return null;

  const availableTags = ALL_TAGS.filter(t => t.target === target);
  return availableTags[Math.floor(Math.random() * availableTags.length)];
}

// Get tags for a specific target type
export function getTagsForTarget(target: TagTarget): Tag[] {
  return ALL_TAGS.filter(t => t.target === target);
}
