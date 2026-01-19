// Car and team generation for Crown Prix teams
// Each kingdom has one car shared by both drivers, plus team-level stats

export interface CarStats {
  power: number;        // 1-5 stars - Multiplies with driver speed on straights
  grip: number;         // 1-5 stars - Multiplies with driver consistency in corners
  reliability: number;  // 1-5 stars - Affects mechanical failure chance, interacts with driver luck
}

// Team stats affect both drivers equally - these are team operation quality
export interface TeamStats {
  tireManagement: number;  // 1-5 stars - How aggressively team pushes tire strategy (higher = riskier, faster)
  pitCrew: number;         // 1-5 stars - Reduces chance of slow pit stops
}

export interface GeneratedCar {
  kingdomId: string;
  name: string;         // e.g., "CV-24" for Crimson Vale 2024
  stats: CarStats;
  teamStats: TeamStats; // Team-level operational stats
  quirk: string;        // Flavor text about the car
}

// Car name prefixes based on kingdom style
const CAR_PREFIXES: Record<string, string[]> = {
  'crimson-vale': ['CV', 'Bloodracer', 'Nighthowl'],
  'emberreach': ['ER', 'Dragonfyre', 'Inferno'],
  'lunareth': ['LN', 'Moonshadow', 'Eclipse'],
  'thornwild': ['TW', 'Briarswift', 'Rootrunner'],
  'brasshaven': ['BH', 'Clockwerk', 'Steamstrike'],
  'candlecourt': ['CC', 'Flamewright', 'Gilded'],
  'tideward': ['TD', 'Wavecutter', 'Tidechaser'],
  'virel-dominion': ['VD', 'Farsight', 'Oracle'],
  'saffron-expanse': ['SE', 'Dunestrider', 'Sandstorm'],
  'starfall-concord': ['SC', 'Cometdash', 'Starburst'],
  'ironhold': ['IH', 'Ironsides', 'Fortress'],
  'frostmere': ['FM', 'Frostbite', 'Icebreaker'],
  'shadowfen': ['SF', 'Nightstalker', 'Murkmover'],
  'phoenixcrest': ['PC', 'Ashborne', 'Rebirth'],
  'crystalspire': ['CS', 'Gemcutter', 'Prismatic'],
  'stormwright': ['SW', 'Thunderbolt', 'Voltaic'],
  'verdant-throne': ['VT', 'Oakenspeed', 'Rootracer'],
  'obsidian-order': ['OO', 'Darkglass', 'Volcanic'],
  'pearlharbor': ['PH', 'Shellswift', 'Deephunter'],
  'sunspear': ['SS', 'Solarflare', 'Dawnchaser'],
};

// Car quirks that add personality
const CAR_QUIRKS = [
  'The engine sounds like it\'s singing an ancient war hymn.',
  'Somehow goes faster when the driver is angry.',
  'The mechanics swear they hear it whispering at night.',
  'Leaves a faint trail of sparkles. Nobody knows why.',
  'Has never needed an oil change. Suspicious.',
  'The steering wheel is warm to the touch. Always.',
  'Sometimes turns left when you steer right. Keeps you sharp.',
  'Purrs like a giant cat when idle.',
  'The horn plays a different tune each time.',
  'Accelerates better when you compliment it.',
  'The previous three drivers all reported strange dreams.',
  'Found in a crater. Came with no instructions.',
  'Has a small shrine to velocity in the glove compartment.',
  'Runs on a fuel that doesn\'t technically exist.',
  'The paint job changes slightly between races.',
  'Won a race while no one was driving it. Once.',
  'Refuses to go in reverse. Philosophically.',
  'The exhaust smells like fresh bread. Unexplained.',
  'Has more horsepower than should be possible for its size.',
  'The chassis is made from a material that can\'t be identified.',
];

/**
 * Generate a random star rating (1-5) with weighted distribution
 * Most cars cluster around 2-4 stars, with 1 and 5 being rare
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
 * Used by the race engine to apply car stats
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

/**
 * Generate a car for a specific kingdom
 */
export function generateCarForKingdom(kingdomId: string): GeneratedCar {
  // Get name prefix for this kingdom
  const prefixes = CAR_PREFIXES[kingdomId] || ['XX'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  const name = `${prefix}-${suffix}`;

  // Generate random car stats
  const stats: CarStats = {
    power: generateStarRating(),
    grip: generateStarRating(),
    reliability: generateStarRating(),
  };

  // Generate random team stats
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
 * Generate cars for all kingdoms in a roster
 */
export function generateCarsForKingdoms(kingdomIds: string[]): Map<string, GeneratedCar> {
  const cars = new Map<string, GeneratedCar>();

  for (const kingdomId of kingdomIds) {
    cars.set(kingdomId, generateCarForKingdom(kingdomId));
  }

  return cars;
}

/**
 * Serialize cars for storage
 */
export function serializeCars(cars: Map<string, GeneratedCar>): string {
  return JSON.stringify(Object.fromEntries(cars), null, 2);
}

/**
 * Deserialize cars from storage
 */
export function deserializeCars(json: string): Map<string, GeneratedCar> {
  const obj = JSON.parse(json);
  return new Map(Object.entries(obj));
}

/**
 * Get description of what a car/team stat does (for tooltips)
 */
export function getStatDescription(statType: 'power' | 'grip' | 'reliability' | 'tireManagement' | 'pitCrew'): string {
  switch (statType) {
    case 'power':
      return 'Multiplies driver speed on straights. High power = faster top speed.';
    case 'grip':
      return 'Multiplies driver consistency in corners. High grip = more forgiving car that helps inconsistent drivers.';
    case 'reliability':
      return 'Reduces mechanical failure chance. Interacts with driver luck - unlucky drivers need reliable cars.';
    case 'tireManagement':
      return 'How aggressively the team pushes tire strategy. High = faster but more tire wear and risk. Low = conservative, preserves tires.';
    case 'pitCrew':
      return 'Pit crew skill reduces chance of slow pit stops. Poor crews can double pit stop time!';
  }
}

/**
 * Get emoji icon for a car/team stat
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
