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

// Car quirks - absurdist racing flavor
const CAR_QUIRKS = [
  'The engine hums at a frequency only dogs can hear.',
  'Assembled entirely on a Tuesday. Nobody knows why that matters.',
  'The previous owner was a time traveler. Probably.',
  'Handles corners like it knows something you don\'t.',
  'The fuel gauge has never been accurate. Ever.',
  'Makes a weird noise at exactly 127 km/h.',
  'The engineers forgot to install fear.',
  'Technically illegal in three dimensions.',
  'The steering wheel is sentient. It doesn\'t talk about it.',
  'Built from parts that shouldn\'t fit together but do.',
  'The manual is written in a language that doesn\'t exist yet.',
  'Runs better when you\'re not looking at it.',
  'The suspension was tuned by a jazz musician.',
  'Has won races it wasn\'t entered in.',
  'The paint changes color based on driver anxiety levels.',
  'Smells faintly of burnt toast and ambition.',
  'The horn plays a chord that makes engineers weep.',
  'Factory defect: accidentally perfect.',
  'The windshield wipers have never been used. They\'re decorative.',
  'Comes with a warranty that expired before you were born.',
  'The chassis remembers every race. It holds grudges.',
  'Built during a solar eclipse. The engineers insist this matters.',
  'The tachometer goes to 11. No one knows why.',
  'Rumored to have a soul. Unconfirmed but likely.',
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

// Car name components for random generation
const CAR_PREFIXES_GENERIC = [
  'Apex', 'Vector', 'Pulse', 'Nova', 'Vortex', 'Phantom', 'Specter', 'Zenith',
  'Flux', 'Cipher', 'Echo', 'Drift', 'Surge', 'Bolt', 'Razor', 'Stratos',
  'Nebula', 'Prism', 'Vertex', 'Torque', 'Thrust', 'Blitz', 'Fury', 'Storm',
  'Onyx', 'Cobalt', 'Crimson', 'Obsidian', 'Titan', 'Raptor', 'Falcon', 'Viper'
];

const CAR_SUFFIXES = [
  'GT', 'RS', 'LM', 'EVO', 'Pro', 'Sport', 'Turbo', 'X', 'S', 'R',
  'Elite', 'Prime', 'Max', 'Ultra', 'Plus', 'Zero', 'One', 'Alpha', 'Omega'
];

const CAR_ACRONYMS = [
  'XR', 'GT', 'RS', 'LM', 'GP', 'SS', 'ZX', 'RX', 'VX', 'MR', 'SR', 'TR',
  'FX', 'NX', 'QX', 'DX', 'HX', 'KX', 'PX', 'WX'
];

/**
 * Generate a random car name with varied formats
 */
function generateCarName(): string {
  const format = Math.floor(Math.random() * 6);
  const prefix = CAR_PREFIXES_GENERIC[Math.floor(Math.random() * CAR_PREFIXES_GENERIC.length)];
  const suffix = CAR_SUFFIXES[Math.floor(Math.random() * CAR_SUFFIXES.length)];
  const acronym = CAR_ACRONYMS[Math.floor(Math.random() * CAR_ACRONYMS.length)];
  const number = Math.floor(Math.random() * 900) + 100; // 100-999
  const smallNum = Math.floor(Math.random() * 90) + 10; // 10-99

  switch (format) {
    case 0: // "Apex GT-7"
      return `${prefix} ${suffix}-${Math.floor(Math.random() * 9) + 1}`;
    case 1: // "XR-470"
      return `${acronym}-${number}`;
    case 2: // "Vortex 88"
      return `${prefix} ${smallNum}`;
    case 3: // "Phantom RS"
      return `${prefix} ${suffix}`;
    case 4: // "GT Stratos"
      return `${acronym} ${prefix}`;
    case 5: // "Zenith XR-22"
    default:
      return `${prefix} ${acronym}-${smallNum}`;
  }
}

/**
 * Generate a car for a specific team
 */
export function generateCarForKingdom(kingdomId: string): GeneratedCar {
  const name = generateCarName();

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
