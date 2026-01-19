import { generateDriverName } from './names';
import { DriverStats } from '../RaceEngine';
import { KINGDOMS, Kingdom, DriverSlot, getKingdomsByIds } from '../data/kingdoms';

export interface GeneratedDriver {
  id: number;
  firstName: string;
  middleName: string;
  lastName: string;
  fullName: string;
  shortName: string;      // For display in tight spaces
  emoji: string;
  teamName: string;
  kingdomId: string;      // Reference to kingdom
  color: string;
  driverSlot: DriverSlot; // 1 = primary driver, 2 = secondary driver
  stats: DriverStats;
  backstory: string;
  quirk: string;
}

// Backstory templates
const BACKSTORY_TEMPLATES = [
  "Former {job} who discovered racing after {incident}.",
  "Born into a family of {profession}s, but always dreamed of speed.",
  "Won their first race at age {age} in a modified {vehicle}.",
  "Banned from {place} for going too fast. Now they race professionally.",
  "Nobody knows where they came from. They just showed up one day with a {vehicle}.",
  "Trained by the legendary {trainer} in the art of going fast.",
  "Once held the world record for {activity}. Now seeks glory on the track.",
  "Their {relative} was a famous racer. They have big shoes to fill.",
  "Started racing to pay off their {debt} debt. Now they can't stop.",
  "Emerged from {location} with an unexplained talent for speed.",
  "Claims to have been a {creature} in a past life. Drives like one too.",
  "Built their first {vehicle} out of {material} at age {age}.",
  "Former child prodigy who {incident}. Racing is their redemption.",
  "The only survivor of the infamous {event}. Now they race for those who can't.",
  "Discovered racing in a {dream}. Now lives it every day."
];

const BACKSTORY_FILLS = {
  job: ["accountant", "librarian", "dentist", "crossing guard", "food critic", "lighthouse keeper", "mime", "taxidermist", "sommelier", "mortician"],
  incident: ["a near-death experience", "finding a mysterious key", "eating a suspicious mushroom", "a prophetic dream", "winning a radio contest", "a mild concussion", "reading the wrong book", "a midlife crisis at 12"],
  profession: ["baker", "butcher", "candlestick maker", "competitive yodeler", "professional mourner", "cloud watcher", "furniture tester", "pet psychic"],
  age: ["4", "7", "12", "47", "103", "-2 (time travel)", "unknown"],
  vehicle: ["shopping cart", "riding lawnmower", "ice cream truck", "hearse", "golf cart", "zamboni", "forklift", "parade float"],
  place: ["Luxembourg", "the moon", "a Costco", "the DMV", "all Waffle Houses", "time itself", "the concept of Tuesday"],
  trainer: ["Speed McSpeedface", "The Fast Whisperer", "a mysterious old turtle", "an AI from the future", "their own reflection", "a retired pizza delivery driver"],
  activity: ["competitive sleeping", "extreme knitting", "speed reading", "aggressive meditation", "tactical breathing", "professional waiting"],
  relative: ["grandmother", "second cousin twice removed", "evil twin", "time-displaced ancestor", "imaginary friend"],
  debt: ["student loan", "cosmic", "sleep", "flavor", "emotional", "parking ticket"],
  location: ["the ocean", "a volcano", "the concept of speed itself", "a dimension of pure velocity", "New Jersey", "a really long CVS receipt"],
  creature: ["cheetah", "rocket ship", "bolt of lightning", "caffeinated squirrel", "anxious hummingbird", "sentient wind"],
  material: ["cardboard", "dreams", "pure spite", "recycled hope", "compressed anxiety", "concentrated determination"],
  event: ["Great Ketchup Incident of '98", "Tuesday That Never Ended", "Legendary Traffic Jam", "Forbidden Race", "Incident We Don't Speak Of"],
  dream: ["recurring nightmare", "fever dream", "daydream during a meeting", "prophetic vision", "especially vivid nap"]
};

// Quirks that affect personality/racing style
const QUIRKS = [
  "Only races on days that end in 'y'",
  "Believes the car is sentient and consults it before races",
  "Has never actually learned how to drive",
  "Races with their eyes closed for 'focus'",
  "Communicates only through car horn beeps",
  "Constantly apologizes to other racers mid-race",
  "Thinks they're in a different sport entirely",
  "Has an ongoing rivalry with a specific traffic cone",
  "Refuses to turn left",
  "Only accelerates when no one is looking",
  "Brings a emotional support vehicle to every race",
  "Convinced they're in a simulation",
  "Has never finished a sentence or a race",
  "Races to pay off a debt to a mysterious organization",
  "Believes speed is just a social construct",
  "Has a pre-race ritual involving interpretive dance",
  "Narrates their own racing in third person",
  "Claims to be from the future but won't give spoilers",
  "Allergic to second place",
  "Has diplomatic immunity from racing rules (unverified)",
  "Their car runs on spite and determination",
  "Technically racing for a small country that may not exist",
  "Won their spot in the league in a poker game",
  "Is actually three smaller racers in a trenchcoat",
  "Racing to prove a point to their high school guidance counselor"
];

function fillBackstoryTemplate(template: string): string {
  let result = template;
  const matches = template.match(/\{(\w+)\}/g) || [];

  for (const match of matches) {
    const key = match.slice(1, -1) as keyof typeof BACKSTORY_FILLS;
    const options = BACKSTORY_FILLS[key];
    if (options) {
      const replacement = options[Math.floor(Math.random() * options.length)];
      result = result.replace(match, replacement);
    }
  }

  return result;
}

function generateStats(): DriverStats {
  // Generate stats with compressed ranges for closer competition
  // Speed-type stats: 0.85 to 1.15 (±15% from baseline)
  const statRoll = () => 0.85 + Math.random() * 0.30;
  // Consistency/luck/aggression: 0.3 to 0.8 (avoid extremes)
  const traitRoll = () => 0.3 + Math.random() * 0.5;

  return {
    baseSpeed: statRoll(),
    consistency: traitRoll(),
    luck: traitRoll(),
    acceleration: statRoll(),
    endurance: statRoll(),
    aggression: traitRoll()  // Higher = pushes tires harder, more risk/reward
  };
}

// Generate a single driver for a specific kingdom and slot
export function generateDriverForKingdom(
  id: number,
  kingdom: Kingdom,
  slot: DriverSlot
): GeneratedDriver {
  const name = generateDriverName();

  // Generate backstory
  const backstoryTemplate = BACKSTORY_TEMPLATES[Math.floor(Math.random() * BACKSTORY_TEMPLATES.length)];
  const backstory = fillBackstoryTemplate(backstoryTemplate);

  // Pick a quirk
  const quirk = QUIRKS[Math.floor(Math.random() * QUIRKS.length)];

  // Create short name (first name + first letter of last, or just first name if too long)
  const shortName = name.firstName.length > 8
    ? name.firstName.slice(0, 8)
    : `${name.firstName} ${name.lastName[0]}.`;

  return {
    id,
    firstName: name.firstName,
    middleName: name.middleName,
    lastName: name.lastName,
    fullName: name.fullName,
    shortName,
    emoji: kingdom.emoji,
    teamName: kingdom.name,
    kingdomId: kingdom.id,
    color: kingdom.color,
    driverSlot: slot,
    stats: generateStats(),
    backstory,
    quirk
  };
}

// Generate a full roster of drivers (20 drivers: 2 per kingdom)
export function generateRoster(): GeneratedDriver[] {
  const drivers: GeneratedDriver[] = [];
  let id = 0;

  for (const kingdom of KINGDOMS) {
    // Generate two drivers for each kingdom
    drivers.push(generateDriverForKingdom(id++, kingdom, 1)); // Primary driver
    drivers.push(generateDriverForKingdom(id++, kingdom, 2)); // Secondary driver
  }

  return drivers;
}

// Generate a roster from specific kingdom IDs (for season mode)
export function generateRosterFromKingdoms(kingdomIds: string[]): GeneratedDriver[] {
  const drivers: GeneratedDriver[] = [];
  let id = 0;

  const kingdoms = getKingdomsByIds(kingdomIds);
  for (const kingdom of kingdoms) {
    // Generate two drivers for each kingdom
    drivers.push(generateDriverForKingdom(id++, kingdom, 1)); // Primary driver
    drivers.push(generateDriverForKingdom(id++, kingdom, 2)); // Secondary driver
  }

  return drivers;
}

// Serialize roster for storage
export function serializeRoster(roster: GeneratedDriver[]): string {
  return JSON.stringify(roster, null, 2);
}

// Deserialize roster from storage
export function deserializeRoster(json: string): GeneratedDriver[] {
  return JSON.parse(json);
}
