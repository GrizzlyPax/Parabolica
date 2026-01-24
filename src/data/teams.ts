// Parabolica - F1-Inspired Racing Teams
// Punny names with distinct aesthetics

export interface Team {
  id: string;
  name: string;
  emoji: string;
  color: string;        // Primary color
  accentColor: string;  // Secondary/accent color
  description: string;  // Aesthetic vibe
  isHistoric?: boolean; // Historic teams (unlockable)
  tags?: string[];      // Team-specific tag IDs (to be assigned)
}

// Current Teams (11) - The main grid
export const CURRENT_TEAMS: Team[] = [
  {
    id: 'for-rory',
    name: 'For Rory',
    emoji: '🐴',
    color: '#E63946',
    accentColor: '#FFB800',
    description: 'Horse girls in velvet ribbons, barn coat glamour, equestrian prep with hay in their hair.',
  },
  {
    id: 'breadbowl',
    name: 'Breadbowl',
    emoji: '🍞',
    color: '#3671C6',
    accentColor: '#E63946',
    description: 'Sourdough starters with names, carb worship, "she\'s been fermenting for six years."',
  },
  {
    id: 'mcelodeon',
    name: 'Mcelodeon',
    emoji: '📼',
    color: '#FF8000',
    accentColor: '#3671C6',  // 90s Nickelodeon blue - Saturday morning vibes
    description: '90s Nickelodeon slime energy, orange VHS tapes, Saturday morning chaos.',
  },
  {
    id: 'haazmat',
    name: 'Haazmat',
    emoji: '🥽',
    color: '#FFFFFF',
    accentColor: '#E63946',
    description: 'Mad scientists, safety goggles, "what\'s that smell," controlled chaos, garage lab explosions.',
  },
  {
    id: 'daddyslacks',
    name: 'Daddyslacks',
    emoji: '👖',
    color: '#CFA540',        // Brighter gold - dad's championship ring vibes
    accentColor: '#C0C0C0',  // Silver - dad's watch band
    description: 'Cargo shorts, thermostat police, grill sergeants, New Balance pilgrimage.',
  },
  {
    id: 'asteroid-martian',
    name: 'Asteroid Martian',
    emoji: '☄️',
    color: '#005C38',
    accentColor: '#D9FF00',
    description: 'Space camp dropouts, tinfoil couture, "the government knows" energy.',
  },
  {
    id: 'furbabies',
    name: 'Furbabies',
    emoji: '🐾',
    color: '#27F4D2',
    accentColor: '#C0C0C0',  // Silver - fancy pet collar bling
    description: 'Pet stroller pushers, matching outfits, "my child has four legs" bumper stickers.',
  },
  {
    id: 'haudy',
    name: 'Haüdy',
    emoji: '👢',
    color: '#FF4500',        // Lava red - hot molten cowboy energy
    accentColor: '#E8E8E8',  // Off-white silver - bolo tie hardware
    description: 'Cowboy techno, ranch raves, bolo ties with LED lights, yeehaw engineering.',
  },
  {
    id: 'allpine',
    name: 'Allpine',
    emoji: '🌲',
    color: '#FF87BC',
    accentColor: '#3671C6',
    description: 'Flannel layering, coffee snobs, "it\'s just misting," REI membership as personality, Sasquatch agnostic.',
  },
  {
    id: 'lacing-wools',
    name: 'Lacing Wools',
    emoji: '🧶',
    color: '#FFFFFF',        // Pure white - the yarn before dyeing
    accentColor: '#3671C6',  // Breadbowl blue - knitting needles
    description: 'Knitting circles, yarn hoarders, "I made this," Ravelry drama, grandma energy with an edge.',
  },
  {
    id: 'gilliams',
    name: 'Gilliams',
    emoji: '🐟',
    color: '#00A3E0',
    accentColor: '#FFFFFF',
    description: 'Aquarium nerds, "actually that\'s a cichlid," fish tank pilgrimages, gill breathers in a land world.',
  },
];

// Historic Teams (11) - Unlockable legends
export const HISTORIC_TEAMS: Team[] = [
  {
    id: 'prawn',
    name: 'Prawn',
    emoji: '🍤',
    color: '#D9FF00',
    accentColor: '#FFFFFF',
    description: 'Cocktail sauce sommeliers, shrimp ring elegance, "actually, it\'s prawn."',
    isHistoric: true,
  },
  {
    id: 'flotus',
    name: 'Flotus',
    emoji: '💅🏼',
    color: '#FFB800',
    accentColor: '#E63946',  // Power red - political energy
    description: 'Pantsuit power, motorcade waves, diplomatic smiles hiding chaos.',
    isHistoric: true,
  },
  {
    id: 'sqyrrell',
    name: 'Sqyrrell',
    emoji: '🐿️',
    color: '#002E5B',
    accentColor: '#FFFFFF',
    description: 'Autumn hoarders, "I buried it somewhere," acorn-based economy.',
    isHistoric: true,
  },
  {
    id: 'calamardi',
    name: 'Calamardi',
    emoji: '🦑',
    color: '#1E1E1E',
    accentColor: '#FFB800',
    description: 'Deep sea ink, tentacle melodrama, perpetual underdogs who embrace the void.',
    isHistoric: true,
  },
  {
    id: 'baguetton',
    name: 'Baguetton',
    emoji: '🥖',
    color: '#00B89F',
    accentColor: '#FFF500',
    description: 'French bread purists, Breadbowl\'s chic Parisian aunt, crust discourse.',
    isHistoric: true,
  },
  {
    id: 'wrenchault',
    name: 'Wrenchault',
    emoji: '🔧',
    color: '#FFF500',
    accentColor: '#3671C6',  // Garage blue - tool brand vibes
    description: 'Grease-stained hands, "I can fix her," garage goblins, torque specs as love language.',
    isHistoric: true,
  },
  {
    id: 'bracing-pointe',
    name: 'Bracing Pointe',
    emoji: '🩰',
    color: '#FF87BC',
    accentColor: '#FFFFFF',
    description: 'Ballet moms, recital warfare, "she\'s been dancing since she was three," tutu tyrants.',
    isHistoric: true,
  },
  {
    id: 'sow-blur',
    name: 'Sow Blur',
    emoji: '🐷',
    color: '#0054A0',
    accentColor: '#FFFFFF',
    description: 'Pig farmers, county fair chaos, mud season enthusiasts, "that\'ll do" energy.',
    isHistoric: true,
  },
  {
    id: 'alphalpha-camo',
    name: 'Alphalpha Camo',
    emoji: '🌱',
    color: '#900000',
    accentColor: '#FFFFFF',
    description: 'Sprout snackers, farm kids, 4-H devotees, "it\'s actually very nutritious."',
    isHistoric: true,
  },
  {
    id: 'toy-quota',
    name: 'Toy Quota',
    emoji: '🎁',
    color: '#C0C0C0',
    accentColor: '#E63946',
    description: 'Gift wrappers, holiday stress, "I have a system," Black Friday strategists.',
    isHistoric: true,
  },
  {
    id: 'jazz-guitar',
    name: 'Jazz Guitar',
    emoji: '🎸',
    color: '#006633',
    accentColor: '#FFB800',
    description: 'Smooth jazz dads, open mic courage, "anyway here\'s Wonderwall" but sophisticated.',
    isHistoric: true,
  },
];

// All teams combined
export const ALL_TEAMS: Team[] = [...CURRENT_TEAMS, ...HISTORIC_TEAMS];

// Default selection - just current teams (11 for standard grid)
export const TEAMS = CURRENT_TEAMS;

// Driver slot within a team (1 = primary, 2 = secondary)
export type DriverSlot = 1 | 2;

export function getTeamById(id: string): Team | undefined {
  return ALL_TEAMS.find(t => t.id === id);
}

// Get current teams only (for standard races)
export function getCurrentTeams(): Team[] {
  return CURRENT_TEAMS;
}

// Get historic teams only (for special modes)
export function getHistoricTeams(): Team[] {
  return HISTORIC_TEAMS;
}

// Get a random selection of N teams from current teams
export function getRandomTeams(count: number = 11): Team[] {
  const shuffled = [...CURRENT_TEAMS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, CURRENT_TEAMS.length));
}

// Get a random selection including historic teams
export function getRandomTeamsIncludingHistoric(count: number = 11): Team[] {
  const shuffled = [...ALL_TEAMS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, ALL_TEAMS.length));
}

// Get teams by their IDs
export function getTeamsByIds(ids: string[]): Team[] {
  return ids.map(id => getTeamById(id)).filter((t): t is Team => t !== undefined);
}

// Legacy compatibility - map old function names
export const ALL_KINGDOMS = ALL_TEAMS;
export const KINGDOMS = TEAMS;
export type Kingdom = Team;
export const getKingdomById = getTeamById;
export const getRandomKingdoms = getRandomTeams;
export const getKingdomsByIds = getTeamsByIds;
