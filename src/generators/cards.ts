// Card/Deck system for chaos modifiers and track effects
// Think of these as "modifiers" you can activate during a season

export type CardType = 'chaos' | 'track' | 'driver' | 'weather' | 'cosmic' | 'cursed';
export type CardRarity = 'common' | 'uncommon' | 'rare' | 'legendary' | 'cursed';

export interface Card {
  id: string;
  name: string;
  description: string;
  flavorText: string;
  type: CardType;
  rarity: CardRarity;
  emoji: string;

  // Effects - these modify race parameters when active
  effects: CardEffect[];

  // Duration: how long the card stays active
  duration: 'instant' | 'single_race' | 'full_season' | 'permanent';

  // Cost to play (if using a resource system later)
  cost: number;
}

export interface CardEffect {
  target: 'all_drivers' | 'random_driver' | 'leader' | 'last_place' | 'track' | 'race';
  stat?: string;           // Which stat to modify
  modifier: number;        // Multiplier or additive value
  modifierType: 'multiply' | 'add' | 'set';
  chance?: number;         // Probability of effect triggering (0-1)
  description: string;     // Human-readable effect description
}

// ============================================
// CHAOS CARDS - Random events and mayhem
// ============================================

const CHAOS_CARDS: Omit<Card, 'id'>[] = [
  {
    name: "Banana Peel",
    description: "Someone dropped a banana peel on the track. Classic.",
    flavorText: "It's not racing without a little slapstick.",
    type: "chaos",
    rarity: "common",
    emoji: "🍌",
    duration: "single_race",
    cost: 1,
    effects: [{
      target: "random_driver",
      stat: "consistency",
      modifier: 0.5,
      modifierType: "multiply",
      chance: 0.3,
      description: "30% chance each tick for a random driver to slip"
    }]
  },
  {
    name: "Turbo Coffee",
    description: "Everyone had way too much coffee this morning.",
    flavorText: "Sleep is for the weak. Speed is forever.",
    type: "chaos",
    rarity: "common",
    emoji: "☕",
    duration: "single_race",
    cost: 1,
    effects: [{
      target: "all_drivers",
      stat: "baseSpeed",
      modifier: 1.2,
      modifierType: "multiply",
      description: "All drivers 20% faster but 30% less consistent"
    }, {
      target: "all_drivers",
      stat: "consistency",
      modifier: 0.7,
      modifierType: "multiply",
      description: ""
    }]
  },
  {
    name: "Reverse Reverse",
    description: "Wait, which way are we going again?",
    flavorText: "If you're not confused, you're not paying attention.",
    type: "chaos",
    rarity: "uncommon",
    emoji: "🔄",
    duration: "instant",
    cost: 2,
    effects: [{
      target: "all_drivers",
      stat: "position",
      modifier: -1,
      modifierType: "multiply",
      description: "Reverses all driver positions on the track"
    }]
  },
  {
    name: "Chaos Incarnate",
    description: "Pure, unfiltered mayhem. Good luck.",
    flavorText: "Chaos isn't a pit. Chaos is a ladder. A very fast ladder.",
    type: "chaos",
    rarity: "legendary",
    emoji: "🌀",
    duration: "single_race",
    cost: 5,
    effects: [{
      target: "race",
      stat: "chaosLevel",
      modifier: 1.0,
      modifierType: "set",
      description: "Maximum chaos level for the entire race"
    }, {
      target: "race",
      stat: "randomEventChance",
      modifier: 0.5,
      modifierType: "set",
      description: "50% chance of random events each tick"
    }]
  },
  {
    name: "Murphy's Law",
    description: "Everything that can go wrong will go wrong.",
    flavorText: "Murphy was an optimist.",
    type: "chaos",
    rarity: "rare",
    emoji: "😬",
    duration: "single_race",
    cost: 3,
    effects: [{
      target: "leader",
      stat: "luck",
      modifier: 0,
      modifierType: "set",
      description: "The leader always has 0 luck"
    }, {
      target: "last_place",
      stat: "luck",
      modifier: 1,
      modifierType: "set",
      description: "Last place always has maximum luck"
    }]
  },
  {
    name: "Rubber Band Reality",
    description: "The universe really wants a close race.",
    flavorText: "Physics? More like suggestions.",
    type: "chaos",
    rarity: "uncommon",
    emoji: "🪢",
    duration: "single_race",
    cost: 2,
    effects: [{
      target: "leader",
      stat: "baseSpeed",
      modifier: 0.9,
      modifierType: "multiply",
      description: "Leader is 10% slower"
    }, {
      target: "last_place",
      stat: "baseSpeed",
      modifier: 1.15,
      modifierType: "multiply",
      description: "Last place is 15% faster"
    }]
  }
];

// ============================================
// TRACK CARDS - Modify the track itself
// ============================================

const TRACK_CARDS: Omit<Card, 'id'>[] = [
  {
    name: "The Long Road",
    description: "This track just keeps going and going...",
    flavorText: "Are we there yet? No. Never.",
    type: "track",
    rarity: "common",
    emoji: "🛣️",
    duration: "single_race",
    cost: 1,
    effects: [{
      target: "track",
      stat: "lapLength",
      modifier: 1.5,
      modifierType: "multiply",
      description: "Lap length increased by 50%"
    }]
  },
  {
    name: "Sprint Circuit",
    description: "Short track, big speed, no thoughts.",
    flavorText: "Blink and you'll miss it. Don't blink.",
    type: "track",
    rarity: "common",
    emoji: "⚡",
    duration: "single_race",
    cost: 1,
    effects: [{
      target: "track",
      stat: "lapLength",
      modifier: 0.5,
      modifierType: "multiply",
      description: "Lap length reduced by 50%"
    }, {
      target: "track",
      stat: "totalLaps",
      modifier: 2,
      modifierType: "multiply",
      description: "Double the number of laps"
    }]
  },
  {
    name: "The Infinite Loop",
    description: "How many laps? Yes.",
    flavorText: "Some say racers are still out there, looping eternally.",
    type: "track",
    rarity: "rare",
    emoji: "♾️",
    duration: "single_race",
    cost: 3,
    effects: [{
      target: "track",
      stat: "totalLaps",
      modifier: 10,
      modifierType: "set",
      description: "10 laps! Hope you have endurance."
    }]
  },
  {
    name: "Gravity Well",
    description: "The track passes through a localized gravity anomaly.",
    flavorText: "What goes down must come... wait, that's not right.",
    type: "track",
    rarity: "uncommon",
    emoji: "🕳️",
    duration: "single_race",
    cost: 2,
    effects: [{
      target: "all_drivers",
      stat: "endurance",
      modifier: 0.7,
      modifierType: "multiply",
      description: "All drivers tire 30% faster"
    }, {
      target: "track",
      stat: "enduranceDecay",
      modifier: 1.5,
      modifierType: "multiply",
      description: "Endurance decay increased"
    }]
  }
];

// ============================================
// WEATHER CARDS - Environmental effects
// ============================================

const WEATHER_CARDS: Omit<Card, 'id'>[] = [
  {
    name: "Fog of War",
    description: "Visibility? What visibility?",
    flavorText: "If you can't see the track, the track can't see you.",
    type: "weather",
    rarity: "common",
    emoji: "🌫️",
    duration: "single_race",
    cost: 1,
    effects: [{
      target: "all_drivers",
      stat: "consistency",
      modifier: 0.6,
      modifierType: "multiply",
      description: "All drivers 40% less consistent"
    }]
  },
  {
    name: "Tailwind",
    description: "Nature wants you to go fast today.",
    flavorText: "The wind whispers: 'faster, faster, FASTER.'",
    type: "weather",
    rarity: "common",
    emoji: "💨",
    duration: "single_race",
    cost: 1,
    effects: [{
      target: "all_drivers",
      stat: "baseSpeed",
      modifier: 1.15,
      modifierType: "multiply",
      description: "All drivers 15% faster"
    }]
  },
  {
    name: "Sudden Downpour",
    description: "Hope you brought an umbrella. And better tires.",
    flavorText: "The rain falls on the just and unjust alike. But especially on racers.",
    type: "weather",
    rarity: "uncommon",
    emoji: "🌧️",
    duration: "single_race",
    cost: 2,
    effects: [{
      target: "all_drivers",
      stat: "baseSpeed",
      modifier: 0.8,
      modifierType: "multiply",
      description: "All drivers 20% slower"
    }, {
      target: "race",
      stat: "randomEventChance",
      modifier: 2,
      modifierType: "multiply",
      description: "Double random event chance"
    }]
  },
  {
    name: "Perfect Day",
    description: "Sunny, 72 degrees, no wind. Suspiciously perfect.",
    flavorText: "Too perfect. The simulation is showing.",
    type: "weather",
    rarity: "rare",
    emoji: "☀️",
    duration: "single_race",
    cost: 3,
    effects: [{
      target: "all_drivers",
      stat: "consistency",
      modifier: 1.3,
      modifierType: "multiply",
      description: "All drivers 30% more consistent"
    }, {
      target: "race",
      stat: "chaosLevel",
      modifier: 0.1,
      modifierType: "set",
      description: "Minimal chaos"
    }]
  },
  {
    name: "Cosmic Storm",
    description: "Reality itself is having a bad day.",
    flavorText: "Stars align. Unfortunately, they align into a middle finger.",
    type: "weather",
    rarity: "legendary",
    emoji: "🌌",
    duration: "single_race",
    cost: 5,
    effects: [{
      target: "all_drivers",
      stat: "luck",
      modifier: 0,
      modifierType: "add",
      description: "Luck becomes completely random each tick"
    }, {
      target: "race",
      stat: "chaosLevel",
      modifier: 0.8,
      modifierType: "set",
      description: "Very high chaos"
    }]
  }
];

// ============================================
// DRIVER CARDS - Affect specific drivers
// ============================================

const DRIVER_CARDS: Omit<Card, 'id'>[] = [
  {
    name: "Second Wind",
    description: "The last place driver finds new strength.",
    flavorText: "When you've got nothing left to lose, you've got everything to gain.",
    type: "driver",
    rarity: "common",
    emoji: "🌬️",
    duration: "single_race",
    cost: 1,
    effects: [{
      target: "last_place",
      stat: "baseSpeed",
      modifier: 1.3,
      modifierType: "multiply",
      description: "Last place driver is 30% faster"
    }]
  },
  {
    name: "Performance Anxiety",
    description: "The leader suddenly remembers everyone is watching.",
    flavorText: "Don't think about it. DON'T THINK ABOUT IT.",
    type: "driver",
    rarity: "common",
    emoji: "😰",
    duration: "single_race",
    cost: 1,
    effects: [{
      target: "leader",
      stat: "consistency",
      modifier: 0.6,
      modifierType: "multiply",
      description: "Leader is 40% less consistent"
    }]
  },
  {
    name: "Main Character Energy",
    description: "One driver becomes the protagonist.",
    flavorText: "Plot armor: activated.",
    type: "driver",
    rarity: "rare",
    emoji: "⭐",
    duration: "single_race",
    cost: 3,
    effects: [{
      target: "random_driver",
      stat: "luck",
      modifier: 1,
      modifierType: "set",
      description: "One random driver gets maximum luck"
    }, {
      target: "random_driver",
      stat: "consistency",
      modifier: 1,
      modifierType: "set",
      description: "And maximum consistency"
    }]
  },
  {
    name: "Underdog Story",
    description: "The universe loves a comeback.",
    flavorText: "Against all odds, against all logic, against all advice...",
    type: "driver",
    rarity: "uncommon",
    emoji: "🐕",
    duration: "single_race",
    cost: 2,
    effects: [{
      target: "last_place",
      stat: "baseSpeed",
      modifier: 1.5,
      modifierType: "multiply",
      description: "Last place gets a massive 50% speed boost"
    }, {
      target: "last_place",
      stat: "luck",
      modifier: 1,
      modifierType: "set",
      description: "Last place gets maximum luck"
    }]
  }
];

// ============================================
// CURSED CARDS - High risk, weird reward
// ============================================

const CURSED_CARDS: Omit<Card, 'id'>[] = [
  {
    name: "The Monkey's Paw",
    description: "Your wish is granted. But at what cost?",
    flavorText: "Be careful what you wish for. The paw is listening.",
    type: "cursed",
    rarity: "legendary",
    emoji: "🐒",
    duration: "single_race",
    cost: 0,
    effects: [{
      target: "all_drivers",
      stat: "baseSpeed",
      modifier: 1.5,
      modifierType: "multiply",
      description: "Everyone is 50% faster"
    }, {
      target: "all_drivers",
      stat: "endurance",
      modifier: 0.5,
      modifierType: "multiply",
      description: "But everyone has 50% less endurance"
    }]
  },
  {
    name: "Eldritch Bargain",
    description: "You made a deal. You don't remember the terms.",
    flavorText: "Ph'nglui mglw'nafh Cthulhu R'lyeh wgah'nagl fhtagn.",
    type: "cursed",
    rarity: "legendary",
    emoji: "👁️",
    duration: "full_season",
    cost: 0,
    effects: [{
      target: "random_driver",
      stat: "baseSpeed",
      modifier: 2,
      modifierType: "multiply",
      description: "One driver becomes incredibly fast"
    }, {
      target: "random_driver",
      stat: "consistency",
      modifier: 0,
      modifierType: "set",
      description: "But completely unpredictable"
    }]
  },
  {
    name: "Perfectly Balanced",
    description: "As all things should be.",
    flavorText: "Half of you will win. The other half... won't.",
    type: "cursed",
    rarity: "rare",
    emoji: "⚖️",
    duration: "single_race",
    cost: 2,
    effects: [{
      target: "all_drivers",
      stat: "baseSpeed",
      modifier: 1,
      modifierType: "set",
      description: "All drivers have identical stats"
    }, {
      target: "all_drivers",
      stat: "consistency",
      modifier: 1,
      modifierType: "set",
      description: ""
    }]
  },
  {
    name: "Speed or Consequences",
    description: "Go fast or go home. Permanently.",
    flavorText: "Fortune favors the bold. Fortune also loves chaos.",
    type: "cursed",
    rarity: "uncommon",
    emoji: "💀",
    duration: "single_race",
    cost: 1,
    effects: [{
      target: "all_drivers",
      stat: "baseSpeed",
      modifier: 1.3,
      modifierType: "multiply",
      description: "30% speed boost"
    }, {
      target: "race",
      stat: "randomEventChance",
      modifier: 0.25,
      modifierType: "set",
      description: "But 25% chance of random events every tick"
    }]
  }
];

// ============================================
// DECK MANAGEMENT
// ============================================

const ALL_BASE_CARDS: Omit<Card, 'id'>[] = [
  ...CHAOS_CARDS,
  ...TRACK_CARDS,
  ...WEATHER_CARDS,
  ...DRIVER_CARDS,
  ...CURSED_CARDS
];

// Generate unique IDs for cards
let cardIdCounter = 0;
function generateCardId(): string {
  return `card_${++cardIdCounter}_${Date.now()}`;
}

// Get all available cards with IDs
export function getAllCards(): Card[] {
  return ALL_BASE_CARDS.map(card => ({
    ...card,
    id: generateCardId()
  }));
}

// Get cards by type
export function getCardsByType(type: CardType): Card[] {
  return ALL_BASE_CARDS
    .filter(card => card.type === type)
    .map(card => ({ ...card, id: generateCardId() }));
}

// Get cards by rarity
export function getCardsByRarity(rarity: CardRarity): Card[] {
  return ALL_BASE_CARDS
    .filter(card => card.rarity === rarity)
    .map(card => ({ ...card, id: generateCardId() }));
}

// Generate a random deck of cards
export function generateDeck(size: number = 10): Card[] {
  const deck: Card[] = [];
  const available = [...ALL_BASE_CARDS];

  // Weight by rarity
  const rarityWeights: Record<CardRarity, number> = {
    common: 40,
    uncommon: 30,
    rare: 20,
    legendary: 8,
    cursed: 2
  };

  for (let i = 0; i < size && available.length > 0; i++) {
    // Weighted random selection
    const totalWeight = available.reduce((sum, card) => sum + rarityWeights[card.rarity], 0);
    let roll = Math.random() * totalWeight;

    for (let j = 0; j < available.length; j++) {
      roll -= rarityWeights[available[j].rarity];
      if (roll <= 0) {
        deck.push({ ...available[j], id: generateCardId() });
        available.splice(j, 1); // Remove to avoid duplicates
        break;
      }
    }
  }

  return deck;
}

// Starter deck for new seasons
export function generateStarterDeck(): Card[] {
  // Always include some basics
  const starterCards = ALL_BASE_CARDS.filter(card =>
    card.rarity === 'common' || card.rarity === 'uncommon'
  );

  return starterCards.slice(0, 8).map(card => ({
    ...card,
    id: generateCardId()
  }));
}

export { CHAOS_CARDS, TRACK_CARDS, WEATHER_CARDS, DRIVER_CARDS, CURSED_CARDS };
