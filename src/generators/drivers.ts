import { generateDriverName } from './names';
import { DriverStats } from '../RaceEngine';
import { TEAMS, Team, DriverSlot, getTeamsByIds } from '../data/teams';
import { Rng, pick } from '../engine/rng';

export interface GeneratedDriver {
  id: number;
  firstName: string;
  middleName: string;
  lastName: string;
  fullName: string;
  shortName: string;      // For display in tight spaces
  emoji: string;
  teamName: string;
  kingdomId: string;      // Reference to team (legacy name kept for compatibility)
  color: string;
  accentColor: string;    // Secondary/accent team color
  driverSlot: DriverSlot; // 1 = primary driver, 2 = secondary driver
  stats: DriverStats;
  backstory: string;
  quirk: string;
}

// Absurdist backstory templates - Blaseball-inspired
const BACKSTORY_TEMPLATES = [
  "Appeared one day in the {place}. Nobody asked questions.",
  "Claims to have been born {age} ago in {location}. Records say otherwise.",
  "Found driving a {vehicle} through {place} with no explanation.",
  "Woke up one morning knowing how to race. Previously was a {profession}.",
  "Emerged from {place} after {incident}. Has never spoken about it.",
  "The {organization} has no record of them existing before {event}.",
  "Technically still {situation} according to {authority}.",
  "Won their seat in a {game} against {entity}. The rules are unclear.",
  "Former {profession}. The transition to racing was {descriptor}.",
  "There are {number} of them. This is the one that races.",
  "Arrived via {method}. Return trip is {status}.",
  "Once held the {title} of {place}. It was {adjective}.",
  "Has a {relationship} with {entity} that defies explanation.",
  "The last person to {action} in {place}. Probably.",
  "Remembered by {number} people. The number {verb} daily."
];

const BACKSTORY_FILLS = {
  place: ["the parking lot", "aisle 7", "the storage unit", "the breakroom", "a roundabout", "the waiting room", "the elevator", "sector 7G", "the supply closet", "an unnamed hallway"],
  age: ["several Tuesdays", "an undisclosed amount of time", "47 minutes", "before the incident", "after the reckoning", "during the interval", "between commercials"],
  location: ["a place that no longer exists", "somewhere overhead", "the back of a receipt", "an unmarked location", "coordinates that don't resolve"],
  vehicle: ["a shopping cart", "a office chair", "a moving walkway", "a conveyor belt", "a rotating door", "an escalator (going up)"],
  profession: ["a filing clerk", "a parking meter", "a software update", "a loading screen", "a hold message", "a terms of service agreement"],
  incident: ["the reorganization", "the downtime", "scheduled maintenance", "an unplanned restart", "the merge conflict", "the timezone shift"],
  organization: ["HR", "the committee", "the board", "management", "the algorithm", "customer service"],
  event: ["the last update", "the migration", "the rebranding", "the pivot", "the restructuring"],
  situation: ["on hold", "pending review", "in transit", "buffering", "syncing", "processing"],
  authority: ["the system", "the records", "the database", "the manifest", "the spreadsheet"],
  game: ["coin flip", "staring contest", "round of rock-paper-scissors", "game of telephone", "spelling bee"],
  entity: ["a concept", "a committee", "a spreadsheet", "a policy", "a voicemail", "a FAQ section"],
  descriptor: ["inevitable", "concerning", "technically legal", "poorly documented", "still loading"],
  number: ["several", "approximately twelve", "a non-zero amount", "fewer than expected", "more than is comfortable"],
  method: ["unclear means", "a loophole", "scheduled maintenance", "a clerical error", "the wrong door"],
  status: ["pending", "complicated", "not applicable", "redacted", "under review"],
  title: ["interim manager", "acting representative", "temporary placeholder", "backup option"],
  adjective: ["brief", "confusing", "technically correct", "procedurally sound", "poorly timed"],
  relationship: ["arrangement", "understanding", "ongoing situation", "recurring appointment"],
  action: ["check the settings", "read the manual", "use the old system", "remember the password"],
  verb: ["fluctuates", "changes", "updates", "syncs", "refreshes"]
};

// Absurdist quirks - Blaseball-inspired
const QUIRKS = [
  "Only races during approved hours",
  "Their car makes a sound no one can describe",
  "Technically two drivers in an agreement",
  "Receives instructions from somewhere",
  "Has never been photographed from the left",
  "The tires know something",
  "Communicates exclusively through indicators",
  "Their pit crew is also them, somehow",
  "Racing to resolve a clerical error",
  "The car predates them by several owners",
  "Keeps finding notes they don't remember writing",
  "Their fuel gauge shows something else entirely",
  "Legally required to race by an obscure regulation",
  "The mirrors show a different race",
  "Has a subscription they can't cancel",
  "Their contract has footnotes about footnotes",
  "The steering wheel has opinions",
  "Racing until further notice",
  "Their lap times are suggestions",
  "Technically racing and not racing simultaneously",
  "The engine runs on something adjacent to fuel",
  "Always in the wrong timezone",
  "Their helmet contains questions",
  "Racing to maintain an average",
  "The brakes work differently each time"
];

function fillBackstoryTemplate(template: string, rng: Rng): string {
  let result = template;
  const matches = template.match(/\{(\w+)\}/g) || [];

  for (const match of matches) {
    const key = match.slice(1, -1) as keyof typeof BACKSTORY_FILLS;
    const options = BACKSTORY_FILLS[key];
    if (options) {
      const replacement = pick(options, rng);
      result = result.replace(match, replacement);
    }
  }

  return result;
}

function generateStats(rng: Rng): DriverStats {
  // Generate stats with compressed ranges for closer competition
  // Speed-type stats: 0.85 to 1.15 (±15% from baseline)
  const statRoll = () => 0.85 + rng() * 0.30;
  // Consistency/luck/aggression: 0.3 to 0.8 (avoid extremes)
  const traitRoll = () => 0.3 + rng() * 0.5;

  return {
    baseSpeed: statRoll(),
    consistency: traitRoll(),
    luck: traitRoll(),
    acceleration: statRoll(),
    endurance: statRoll(),
    aggression: traitRoll()  // Higher = pushes tires harder, more risk/reward
  };
}

// Generate a single driver for a specific team and slot
export function generateDriverForTeam(
  id: number,
  team: Team,
  slot: DriverSlot,
  rng: Rng = Math.random
): GeneratedDriver {
  const name = generateDriverName(rng);

  // Generate backstory
  const backstoryTemplate = pick(BACKSTORY_TEMPLATES, rng);
  const backstory = fillBackstoryTemplate(backstoryTemplate, rng);

  // Pick a quirk
  const quirk = pick(QUIRKS, rng);

  // Short name handles mononyms / corrupted names (computed in names.ts).
  const shortName = name.shortName;

  // Tags are no longer rolled here: genesis tags come from the ruleset on their
  // own seed stream (rules/genesis.ts), so a card can re-roll tags without
  // moving names or stats.
  return {
    id,
    firstName: name.firstName,
    middleName: name.middleName,
    lastName: name.lastName,
    fullName: name.fullName,
    shortName,
    emoji: team.emoji,
    teamName: team.name,
    kingdomId: team.id,  // Legacy field name
    color: team.color,
    accentColor: team.accentColor,
    driverSlot: slot,
    stats: generateStats(rng),
    backstory,
    quirk,
  };
}

// Legacy alias
export const generateDriverForKingdom = generateDriverForTeam;

// Generate a full roster of drivers (2 per team)
export function generateRoster(rng: Rng = Math.random): GeneratedDriver[] {
  const drivers: GeneratedDriver[] = [];
  let id = 0;

  for (const team of TEAMS) {
    // Generate two drivers for each team
    drivers.push(generateDriverForTeam(id++, team, 1, rng)); // Primary driver
    drivers.push(generateDriverForTeam(id++, team, 2, rng)); // Secondary driver
  }

  return drivers;
}

// Generate a roster from specific team IDs (for season mode)
export function generateRosterFromTeams(teamIds: string[], rng: Rng = Math.random): GeneratedDriver[] {
  return generateRosterFromTeamList(getTeamsByIds(teamIds), rng);
}

// Generate a roster from resolved Team objects — the path that supports custom
// teams (not in the static registry). Two drivers per team, in list order.
export function generateRosterFromTeamList(teams: Team[], rng: Rng = Math.random): GeneratedDriver[] {
  const drivers: GeneratedDriver[] = [];
  let id = 0;
  for (const team of teams) {
    drivers.push(generateDriverForTeam(id++, team, 1, rng)); // Primary driver
    drivers.push(generateDriverForTeam(id++, team, 2, rng)); // Secondary driver
  }
  return drivers;
}

// Legacy alias
export const generateRosterFromKingdoms = generateRosterFromTeams;

// Serialize roster for storage
export function serializeRoster(roster: GeneratedDriver[]): string {
  return JSON.stringify(roster, null, 2);
}

// Deserialize roster from storage
export function deserializeRoster(json: string): GeneratedDriver[] {
  return JSON.parse(json);
}
