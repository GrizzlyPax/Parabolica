// Race Powers System
// Blessings target your favorite driver, Curses target your rival, God Powers are wild effects

export type PowerCategory = 'blessing' | 'curse' | 'god';

export interface RacePower {
  id: string;
  name: string;
  category: PowerCategory;
  emoji: string;
  description: string;
  // Effect function will be called with driver id(s) and race engine
  effectType: 'position_change' | 'speed_boost' | 'speed_penalty' | 'swap' | 'dnf' | 'tire_restore' | 'protection';
  effectValue?: number; // For position changes, speed modifiers, etc.
  duration?: number; // In ticks, for temporary effects
}

// Blessings - help your favorite driver
export const BLESSINGS: RacePower[] = [
  {
    id: 'overtake',
    name: 'Divine Overtake',
    category: 'blessing',
    emoji: '⚡',
    description: 'Instantly pass the car ahead',
    effectType: 'position_change',
    effectValue: 1, // Gain 1 position
  },
  {
    id: 'speed_surge',
    name: 'Speed Surge',
    category: 'blessing',
    emoji: '🚀',
    description: 'Temporary speed boost',
    effectType: 'speed_boost',
    effectValue: 1.15,
    duration: 200, // ~10 seconds of boost
  },
  {
    id: 'fresh_rubber',
    name: 'Fresh Rubber',
    category: 'blessing',
    emoji: '🛞',
    description: 'Restore tire condition',
    effectType: 'tire_restore',
  },
  {
    id: 'guardian_angel',
    name: 'Guardian Angel',
    category: 'blessing',
    emoji: '👼',
    description: 'Protection from crashes for 30 seconds',
    effectType: 'protection',
    duration: 600,
  },
  {
    id: 'slipstream',
    name: 'Cosmic Slipstream',
    category: 'blessing',
    emoji: '💨',
    description: 'Gain two positions',
    effectType: 'position_change',
    effectValue: 2,
  },
];

// Curses - hinder your rival
export const CURSES: RacePower[] = [
  {
    id: 'fumble',
    name: 'Fumbled Gears',
    category: 'curse',
    emoji: '⚙️',
    description: 'Rival drops a position',
    effectType: 'position_change',
    effectValue: -1,
  },
  {
    id: 'slow_curse',
    name: 'Leaden Wheels',
    category: 'curse',
    emoji: '🐌',
    description: 'Temporary speed penalty',
    effectType: 'speed_penalty',
    effectValue: 0.85,
    duration: 200,
  },
  {
    id: 'tire_curse',
    name: 'Worn Treads',
    category: 'curse',
    emoji: '💀',
    description: 'Accelerate tire degradation',
    effectType: 'tire_restore', // Will be negative
    effectValue: -30, // Add 30% wear
  },
  {
    id: 'spin_out',
    name: 'Spin Out',
    category: 'curse',
    emoji: '🌀',
    description: 'Rival loses two positions',
    effectType: 'position_change',
    effectValue: -2,
  },
  {
    id: 'mechanical_gremlin',
    name: 'Mechanical Gremlin',
    category: 'curse',
    emoji: '👺',
    description: 'Rival drops three positions',
    effectType: 'position_change',
    effectValue: -3,
  },
];

// God Powers - chaotic wild effects
export const GOD_POWERS: RacePower[] = [
  {
    id: 'mind_meld',
    name: 'Mind Meld',
    category: 'god',
    emoji: '🔮',
    description: 'Swap positions of two random drivers',
    effectType: 'swap',
  },
  {
    id: 'lightning_strike',
    name: 'Lightning Strike',
    category: 'god',
    emoji: '⚡',
    description: 'Smite a random mid-pack driver out of the race',
    effectType: 'dnf',
  },
  {
    id: 'chaos_shuffle',
    name: 'Chaos Shuffle',
    category: 'god',
    emoji: '🎲',
    description: 'Shuffle positions 4-10 randomly',
    effectType: 'swap',
  },
  {
    id: 'time_warp',
    name: 'Time Warp',
    category: 'god',
    emoji: '⏳',
    description: 'Your driver and rival swap positions',
    effectType: 'swap',
  },
  {
    id: 'divine_intervention',
    name: 'Divine Intervention',
    category: 'god',
    emoji: '✨',
    description: 'All drivers except top 3 slow down briefly',
    effectType: 'speed_penalty',
    effectValue: 0.9,
    duration: 150,
  },
];

// Helper to get a random power from each category
export function getRandomBlessing(): RacePower {
  return BLESSINGS[Math.floor(Math.random() * BLESSINGS.length)];
}

export function getRandomCurse(): RacePower {
  return CURSES[Math.floor(Math.random() * CURSES.length)];
}

export function getRandomGodPower(): RacePower {
  return GOD_POWERS[Math.floor(Math.random() * GOD_POWERS.length)];
}

// Get a full set of powers for a race
export interface RacePowerSet {
  blessing: RacePower;
  curse: RacePower;
  godPower: RacePower;
}

export function generateRacePowers(): RacePowerSet {
  return {
    blessing: getRandomBlessing(),
    curse: getRandomCurse(),
    godPower: getRandomGodPower(),
  };
}
