// Chariot and stable generation for Olympus GP teams
// Each divine house has one chariot shared by both drivers, plus team-level stats

export interface CarStats {
  power: number;        // 1-5 stars - Multiplies with driver speed on straights
  grip: number;         // 1-5 stars - Multiplies with driver consistency in corners
  reliability: number;  // 1-5 stars - Affects mechanical failure chance, interacts with driver luck
}

// Team stats affect both drivers equally - these are stable operation quality
export interface TeamStats {
  tireManagement: number;  // 1-5 stars - How aggressively team pushes tire strategy (higher = riskier, faster)
  pitCrew: number;         // 1-5 stars - Reduces chance of slow pit stops
}

export interface GeneratedCar {
  kingdomId: string;
  name: string;         // e.g., "Thunderbolt-VII" for House Zeus
  stats: CarStats;
  teamStats: TeamStats; // Team-level operational stats
  quirk: string;        // Flavor text about the chariot
}

// Chariot name prefixes based on divine house
const CAR_PREFIXES: Record<string, string[]> = {
  'zeus': ['Thunderbolt', 'Aegis', 'Olympian'],
  'hera': ['Argos', 'Diadem', 'Regal'],
  'poseidon': ['Trident', 'Tsunami', 'Hippocampus'],
  'demeter': ['Harvest', 'Cornucopia', 'Elysian'],
  'ares': ['Warbreaker', 'Phobos', 'Deimos'],
  'athena': ['Strategem', 'Aegis', 'Pallas'],
  'apollo': ['Phaeton', 'Lyre', 'Oracle'],
  'artemis': ['Moonbow', 'Stag', 'Huntress'],
  'hephaestus': ['Forgefire', 'Automaton', 'Anvil'],
  'aphrodite': ['Adonis', 'Eros', 'Cytherea'],
  'hermes': ['Caduceus', 'Talaria', 'Psychopomp'],
  'dionysus': ['Thyrsus', 'Maeniad', 'Reveler'],
  'hades': ['Cerberus', 'Stygian', 'Pluton'],
  'persephone': ['Kore', 'Pomegranate', 'Blossom'],
  'hestia': ['Hearthfire', 'Sanctuary', 'Eternal'],
  'helios': ['Sunchariot', 'Hyperion', 'Radiant'],
  'selene': ['Moonrise', 'Endymion', 'Crescent'],
  'pan': ['Syrinx', 'Arcadian', 'Wildling'],
  'nemesis': ['Retribution', 'Scales', 'Adrasteia'],
  'nike': ['Victoria', 'Laureate', 'Triumphant'],
};

// Chariot quirks with Greek mythology flavor
const CAR_QUIRKS = [
  'Blessed by the Muses - the engine hums in perfect hexameter.',
  'Forged in Hephaestus\'s own workshop. Still warm.',
  'The steering wheel is carved from the Argo\'s original rudder.',
  'Leaves a faint trail of ambrosia vapor.',
  'The horn sounds like a distant lyre.',
  'Rumored to have outrun Hermes himself. Once.',
  'The previous driver ascended to minor godhood.',
  'Found at the bottom of the River Styx. Surprisingly intact.',
  'The seats are upholstered with golden fleece.',
  'Apollo wrote a poem about this chariot. It was mediocre.',
  'Runs on nectar. Don\'t ask how.',
  'The Fates themselves wove its timing belt.',
  'Has completed the Labyrinth in under three minutes.',
  'Athena nodded approvingly at its design. She never nods.',
  'The paint was mixed with ichor. Dries immortal.',
  'Won a race against a centaur. The centaur was sore about it.',
  'Refuses to race on days sacred to Hera. Nobody knows why.',
  'The exhaust sounds like distant thunder from Olympus.',
  'Dionysus once borrowed it. Came back with grape vines.',
  'The chassis is forged from Celestial Bronze.',
];

/**
 * Generate a random star rating (1-5) with weighted distribution
 * Most chariots cluster around 2-4 stars, with 1 and 5 being rare
 */
function generateStarRating(): number {
  const roll = Math.random();
  if (roll < 0.08) return 1;       // 8% chance of 1 star
  if (roll < 0.28) return 2;       // 20% chance of 2 stars
  if (roll < 0.68) return 3;       // 40% chance of 3 stars
  if (roll < 0.88) return 4;       // 20% chance of 4 stars
  return 5;                         // 12% chance of 5 stars
}

/**
 * Convert star rating to actual multiplier value
 * Used by the race engine to apply chariot stats
 */
export function starToMultiplier(stars: number, statType: 'power' | 'grip' | 'reliability' | 'tireManagement' | 'pitCrew'): number {
  // Power: affects top speed (1 star = 0.92x, 5 stars = 1.08x)
  if (statType === 'power') {
    return 0.88 + stars * 0.04; // 0.92, 0.96, 1.00, 1.04, 1.08
  }
  // Grip: affects consistency (1 star = 0.85x, 5 stars = 1.15x)
  if (statType === 'grip') {
    return 0.775 + stars * 0.075; // 0.85, 0.925, 1.00, 1.075, 1.15
  }
  // Reliability: affects mechanical failure chance reduction
  // Higher = less chance of failure (1 star = 0.6x, 5 stars = 1.4x protection)
  if (statType === 'reliability') {
    return 0.4 + stars * 0.2; // 0.6, 0.8, 1.0, 1.2, 1.4
  }
  // Tire Management: higher stars = push tires harder (more wear but faster)
  // 1 star = 0.85x wear rate (conservative), 5 stars = 1.15x wear rate (aggressive)
  // Also gives speed bonus when tires are fresh
  if (statType === 'tireManagement') {
    return 0.775 + stars * 0.075; // 0.85, 0.925, 1.00, 1.075, 1.15
  }
  // Pit Crew: reduces chance of slow pit stop
  // 1 star = 40% slow stop chance, 5 stars = 8% slow stop chance
  if (statType === 'pitCrew') {
    return 0.48 - stars * 0.08; // 0.40, 0.32, 0.24, 0.16, 0.08
  }
  return 1;
}

// Roman numerals for chariot naming
const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

/**
 * Generate a chariot for a specific divine house
 */
export function generateCarForKingdom(kingdomId: string): GeneratedCar {
  // Get name prefix for this divine house
  const prefixes = CAR_PREFIXES[kingdomId] || ['Chariot'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const numeral = ROMAN_NUMERALS[Math.floor(Math.random() * ROMAN_NUMERALS.length)];
  const name = `${prefix}-${numeral}`;

  // Generate random chariot stats
  const stats: CarStats = {
    power: generateStarRating(),
    grip: generateStarRating(),
    reliability: generateStarRating(),
  };

  // Generate random stable stats
  const teamStats: TeamStats = {
    tireManagement: generateStarRating(),
    pitCrew: generateStarRating(),
  };

  // Pick a random quirk
  const quirk = CAR_QUIRKS[Math.floor(Math.random() * CAR_QUIRKS.length)];

  return {
    kingdomId,
    name,
    stats,
    teamStats,
    quirk,
  };
}

/**
 * Generate chariots for all divine houses in a roster
 */
export function generateCarsForKingdoms(kingdomIds: string[]): Map<string, GeneratedCar> {
  const cars = new Map<string, GeneratedCar>();

  for (const kingdomId of kingdomIds) {
    cars.set(kingdomId, generateCarForKingdom(kingdomId));
  }

  return cars;
}

/**
 * Serialize chariots for storage
 */
export function serializeCars(cars: Map<string, GeneratedCar>): string {
  return JSON.stringify(Object.fromEntries(cars), null, 2);
}

/**
 * Deserialize chariots from storage
 */
export function deserializeCars(json: string): Map<string, GeneratedCar> {
  const obj = JSON.parse(json);
  return new Map(Object.entries(obj));
}

/**
 * Get description of what a chariot/stable stat does (for tooltips)
 */
export function getStatDescription(statType: 'power' | 'grip' | 'reliability' | 'tireManagement' | 'pitCrew'): string {
  switch (statType) {
    case 'power':
      return 'Multiplies driver speed on straights. High power = faster top speed.';
    case 'grip':
      return 'Multiplies driver consistency in corners. High grip = more forgiving chariot that helps inconsistent drivers.';
    case 'reliability':
      return 'Reduces mechanical failure chance. Interacts with driver luck - unlucky drivers need reliable chariots.';
    case 'tireManagement':
      return 'How aggressively the stable pushes tire strategy. High = faster but more tire wear and risk. Low = conservative, preserves tires.';
    case 'pitCrew':
      return 'Pit crew skill reduces chance of slow pit stops. Poor crews can double pit stop time!';
  }
}

/**
 * Get emoji icon for a chariot/stable stat
 */
export function getStatEmoji(statType: 'power' | 'grip' | 'reliability' | 'tireManagement' | 'pitCrew'): string {
  switch (statType) {
    case 'power':
      return '⚡';
    case 'grip':
      return '🛞';
    case 'reliability':
      return '🔧';
    case 'tireManagement':
      return '🏁';
    case 'pitCrew':
      return '👷';
  }
}
