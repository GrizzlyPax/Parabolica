// Car and team generation for Parabolica teams
// Each team has one car shared by both drivers, plus team-level stats

import { Rng, pick, mulberry32, deriveSeed } from '../engine/rng';

export interface CarStats {
  power: number;        // 1-5 stars - Multiplies with driver speed on straights
  grip: number;         // 1-5 stars - Multiplies with driver consistency in corners
  reliability: number;  // 1-5 stars - Affects mechanical failure chance, interacts with driver luck
}

// Team stats affect both drivers equally - these are operational quality
export interface TeamStats {
  tireManagement: number;  // 1-5 stars - How aggressively team pushes tire strategy (higher = riskier, faster)
  pitCrew: number;         // 1-5 stars - Reduces chance of slow pit stops
}

export interface GeneratedCar {
  kingdomId: string;
  name: string;         // e.g., "Old Margaret", "Type 56"
  stats: CarStats;
  teamStats: TeamStats; // Team-level operational stats
  quirk: string;        // Flavor text about the car
}

// Car quirks - absurdist racing flavor
export const CAR_QUIRKS = [
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

/** The star-rating range (car and team stats); Season grades read it (src/season/grades.ts). */
export const STAR_RATING = { min: 1, max: 5 } as const;

/**
 * Generate a random star rating (1-5) with weighted distribution
 * Most chariots cluster around 2-4 stars, with 1 and 5 being rare
 */
export function generateStarRating(rng: Rng): number {
  const roll = rng();
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

// === Car names (#569, Radio + Pax, docs/story/car-names.md) ===
// Named the way real teams name cars, in five styles. One draw picks the
// style by the mix, then a format by its weights, then fills the tokens.
// Names (and quirks) ride their own flavour stream: one draw from the stats
// stream seeds it, so the pools can change without moving a single stat.

export const CAR_PEOPLE_NAMES = [
  'Bessie', 'Margaret', 'Doris', 'Mabel', 'Agnes', 'Edna', 'Peggy', 'Rosie', 'Dot', 'Gladys',
  'Ivy', 'Hilda', 'Betty', 'Lottie', 'Winnie', 'Nell', 'Elsie', 'Maud', 'Vera', 'Sylvia',
  'Pearl', 'Florrie', 'Connie', 'Marjorie', 'Beryl', 'Hattie', 'Ida', 'Mavis', 'Queenie', 'Nancy',
  'Gus', 'Stanley', 'Albert', 'Barnaby', 'Reggie', 'Clive', 'Norman', 'Wilf', 'Dennis', 'Percy',
];
export const CAR_PEOPLE_PREFIXES = ['Old', 'Big', 'Little', 'Lady', 'Auntie', 'Miss', 'Dear Old', 'Sweet'];
export const CAR_ROMAN = ['II', 'III', 'IV', 'V', 'VI', 'VII'];
export const CAR_HERITAGE_WORDS = ['Type', 'Model', 'Series', 'Mark', 'Special', 'Sprint', 'Tourer', 'Grand Prix', 'Competition', 'Club'];
/** Soft canon: the world's place names (docs/story/team-identity.md). Keep in step if places are renamed. */
export const CAR_HERITAGE_PLACES = ['Corriva', 'Saint Orrin', 'Lumen', 'Ambergate', 'Calder', 'Kestrel', 'Moorland', 'Harbour', 'Quarry', 'Old Hill', 'Tessaly', 'Caldera'];
export const CAR_DISPLACEMENTS = [1100, 1300, 1500, 1750, 2000, 2500, 3000];
export const CAR_CODE_LETTERS = ['A', 'B', 'C', 'D', 'F', 'H', 'K', 'M', 'P', 'R', 'S', 'T', 'V', 'W'];
export const CAR_CODE_PAIRS = ['SR', 'TR', 'GP', 'RS', 'LM', 'MR', 'DB', 'JW', 'HB', 'CK'];
export const CAR_NICKNAMES = [
  'The Brick', 'Old Faithful', 'The Bathtub', 'The Toaster', 'The Biscuit Tin', 'The Wardrobe', 'The Mule',
  'The Spare', 'Number Two', 'The Wedge', 'The Kettle', 'Sunday Best', 'Tin Lizzie', 'Green Bean',
  'The Bus', 'The Pram', 'Lead Sled', 'The Lump', 'The Shoebox', 'Big Red', 'The Plank', 'The Banger',
  'The Old Girl', 'The Beast', 'The Rocket', 'Sixpence', 'The Trolley', 'The Lunchbox',
];
export const CAR_HOUSEHOLD = [
  'Teapot', 'Wheelbarrow', 'Hayrick', 'Colander', 'Doorstop', 'Mangle', 'Butter Churn', 'Scarecrow',
  'Haybale', 'Milk Churn', 'Toast Rack', 'Coal Scuttle', 'Bread Bin', 'Washboard', 'Pitchfork',
  'Sheepdog', 'Egg Cup', 'Mustard Pot', 'Hot Water Bottle', 'Tea Cosy',
];

type Fmt = readonly [weight: number, make: (rng: Rng) => string];

/** Pick by weight. */
function weighted<T>(items: readonly (readonly [number, T])[], rng: Rng): T {
  const total = items.reduce((n, [w]) => n + w, 0);
  let r = rng() * total;
  for (const [w, x] of items) { if ((r -= w) < 0) return x; }
  return items[items.length - 1][1];
}

const int = (lo: number, hi: number, rng: Rng) => lo + Math.floor(rng() * (hi - lo + 1));

const PEOPLE: Fmt[] = [
  [60, r => pick(CAR_PEOPLE_NAMES, r)],
  [30, r => `${pick(CAR_PEOPLE_PREFIXES, r)} ${pick(CAR_PEOPLE_NAMES, r)}`],
  [10, r => `${pick(CAR_PEOPLE_NAMES, r)} ${pick(CAR_ROMAN, r)}`],
];
const HERITAGE: Fmt[] = [
  [35, r => `${pick(CAR_HERITAGE_WORDS, r)} ${int(2, 98, r)}`],
  [20, r => `${pick(CAR_HERITAGE_PLACES, r)} Special`],
  [15, r => `Mk ${pick(CAR_ROMAN, r)}`],
  [15, r => `${pick(CAR_HERITAGE_WORDS, r)} '${int(50, 98, r)}`],
  [15, r => `${pick(CAR_HERITAGE_PLACES, r)} ${pick(CAR_DISPLACEMENTS, r)}`],
];
const CODES: Fmt[] = [
  [50, r => `${pick(CAR_CODE_LETTERS, r)}${int(2, 98, r)}`],
  [30, r => `${pick(CAR_CODE_PAIRS, r)}-${int(1, 9, r)}`],
  [20, r => `${pick(CAR_CODE_LETTERS, r)}${int(1, 9, r)}${pick(CAR_CODE_LETTERS, r)}`],
];

/** The mix (out of 100): people 35 · heritage 20 · nicknames 20 · codes 15 · farm + household 10. */
export const CAR_NAME_STYLES: readonly (readonly [number, Fmt[]])[] = [
  [35, PEOPLE],
  [20, HERITAGE],
  [20, [[1, r => pick(CAR_NICKNAMES, r)]]],
  [15, CODES],
  [10, [[1, r => pick(CAR_HOUSEHOLD, r)]]],
];

/** One car name: style by the mix, format by its weights, then the tokens. */
export function generateCarName(rng: Rng): string {
  return weighted(weighted(CAR_NAME_STYLES, rng), rng)(rng);
}

/** One draw from the stats stream seeds the car's flavour stream (name,
 * quirk). A name already in `taken` (this rack) is redrawn on the flavour
 * stream, so the stats never move. */
function carFlavour(rng: Rng, taken?: Set<string>): { name: string; quirk: string } {
  const flavour = mulberry32(deriveSeed(Math.floor(rng() * 0x100000000), 'car-flavour'));
  let name = generateCarName(flavour);
  for (let i = 0; taken?.has(name) && i < 50; i++) name = generateCarName(flavour);
  taken?.add(name);
  return { name, quirk: pick(CAR_QUIRKS, flavour) };
}

/**
 * Generate a car for a specific team
 */
export function generateCarForKingdom(kingdomId: string, rng: Rng = Math.random, taken?: Set<string>): GeneratedCar {
  const { name, quirk } = carFlavour(rng, taken);

  // Generate random chariot stats
  const stats: CarStats = {
    power: generateStarRating(rng),
    grip: generateStarRating(rng),
    reliability: generateStarRating(rng),
  };

  // Generate random stable stats
  const teamStats: TeamStats = {
    tireManagement: generateStarRating(rng),
    pitCrew: generateStarRating(rng),
  };

  // Car/team tags are rolled from the ruleset (rules/genesis.ts), not here.
  return {
    kingdomId,
    name,
    stats,
    teamStats,
    quirk,
  };
}

/** A rack car for Season Mode's shared pool (#313): car stats only. Team
 * stats belong to the competitor team that drafts it (generateTeamStats). */
export interface RackCar {
  id: string;
  name: string;
  stats: CarStats;
  quirk: string;
}

export function generateRackCar(id: string, rng: Rng = Math.random, taken?: Set<string>): RackCar {
  const { name, quirk } = carFlavour(rng, taken);
  const stats: CarStats = {
    power: generateStarRating(rng),
    grip: generateStarRating(rng),
    reliability: generateStarRating(rng),
  };
  return { id, name, stats, quirk };
}

/** Operational stats for a competitor team (Season Mode, #313). */
export function generateTeamStats(rng: Rng = Math.random): TeamStats {
  return {
    tireManagement: generateStarRating(rng),
    pitCrew: generateStarRating(rng),
  };
}

/**
 * Generate chariots for all divine houses in a roster
 */
export function generateCarsForKingdoms(kingdomIds: string[], rng: Rng = Math.random): Map<string, GeneratedCar> {
  const cars = new Map<string, GeneratedCar>();
  const taken = new Set<string>();

  for (const kingdomId of kingdomIds) {
    cars.set(kingdomId, generateCarForKingdom(kingdomId, rng, taken));
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
