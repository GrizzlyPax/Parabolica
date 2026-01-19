// Olympus GP - Divine Stables
// Each team is backed by a Greek god, with drivers chosen from their mortal champions

export interface Kingdom {
  id: string;
  name: string;
  emoji: string;
  color: string;
  description: string;
}

// The 20 Divine Stables of Olympus GP
export const ALL_KINGDOMS: Kingdom[] = [
  // The Twelve Olympians
  {
    id: 'zeus',
    name: 'House Zeus',
    emoji: '⚡',
    color: '#F0E68C',
    description: 'The Thunderer\'s chosen race with lightning speed',
  },
  {
    id: 'hera',
    name: 'House Hera',
    emoji: '🦚',
    color: '#4B0082',
    description: 'The Queen\'s peacock-adorned chariots of sovereignty',
  },
  {
    id: 'poseidon',
    name: 'House Poseidon',
    emoji: '🔱',
    color: '#0077BE',
    description: 'The Earth-Shaker\'s tide-blessed speed demons',
  },
  {
    id: 'demeter',
    name: 'House Demeter',
    emoji: '🌾',
    color: '#3CB371',
    description: 'The Harvest Queen\'s ever-renewing champions',
  },
  {
    id: 'ares',
    name: 'House Ares',
    emoji: '⚔️',
    color: '#8B0000',
    description: 'The War God\'s aggressive and fearless warriors',
  },
  {
    id: 'athena',
    name: 'House Athena',
    emoji: '🦉',
    color: '#708090',
    description: 'The Wise One\'s tactical precision racers',
  },
  {
    id: 'apollo',
    name: 'House Apollo',
    emoji: '☀️',
    color: '#FFD700',
    description: 'The Radiant One\'s sun-blessed golden chariots',
  },
  {
    id: 'artemis',
    name: 'House Artemis',
    emoji: '🏹',
    color: '#228B22',
    description: 'The Huntress\'s swift and precise moonlit racers',
  },
  {
    id: 'hephaestus',
    name: 'House Hephaestus',
    emoji: '🛠️',
    color: '#E25822',
    description: 'The Smith God\'s masterfully forged machines',
  },
  {
    id: 'aphrodite',
    name: 'House Aphrodite',
    emoji: '🕊️',
    color: '#FFB6C1',
    description: 'The Love Goddess\'s irresistibly alluring team',
  },
  {
    id: 'hermes',
    name: 'House Hermes',
    emoji: '🪽',
    color: '#C0C0C0',
    description: 'The Messenger\'s winged-sandal speedsters',
  },
  {
    id: 'dionysus',
    name: 'House Dionysus',
    emoji: '🍷',
    color: '#800020',
    description: 'The Revelry God\'s unpredictable wild cards',
  },
  // The Underworld & Beyond
  {
    id: 'hades',
    name: 'House Hades',
    emoji: '💀',
    color: '#2C3E50',
    description: 'The Unseen One\'s shadow-wreathed champions',
  },
  {
    id: 'persephone',
    name: 'House Persephone',
    emoji: '🌷',
    color: '#DA70D6',
    description: 'The Spring Queen\'s dual-natured racers',
  },
  {
    id: 'hestia',
    name: 'House Hestia',
    emoji: '🕯️',
    color: '#FF4500',
    description: 'The Hearth Keeper\'s steady and enduring team',
  },
  // Titans & Primordials
  {
    id: 'helios',
    name: 'House Helios',
    emoji: '🌅',
    color: '#FF8C00',
    description: 'The Sun Titan\'s blazing dawn chariots',
  },
  {
    id: 'selene',
    name: 'House Selene',
    emoji: '🌙',
    color: '#F5F5F5',
    description: 'The Moon Titan\'s ethereal night riders',
  },
  {
    id: 'pan',
    name: 'House Pan',
    emoji: '🐐',
    color: '#8B4513',
    description: 'The Wild God\'s chaotic nature-bound racers',
  },
  {
    id: 'nemesis',
    name: 'House Nemesis',
    emoji: '⚖️',
    color: '#1C1C1C',
    description: 'The Retribution Goddess\'s balanced avengers',
  },
  {
    id: 'nike',
    name: 'House Nike',
    emoji: '👟',
    color: '#FFFFFF',
    description: 'The Victory Goddess\'s glory-destined champions',
  },
];

// Default selection of 10 teams (legacy compatibility)
export const KINGDOMS = ALL_KINGDOMS.slice(0, 10);

// Driver slot within a team (1 = primary, 2 = secondary)
export type DriverSlot = 1 | 2;

export function getKingdomById(id: string): Kingdom | undefined {
  return ALL_KINGDOMS.find(k => k.id === id);
}

// Get a random selection of N divine stables
export function getRandomKingdoms(count: number = 10): Kingdom[] {
  const shuffled = [...ALL_KINGDOMS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// Get kingdoms by their IDs
export function getKingdomsByIds(ids: string[]): Kingdom[] {
  return ids.map(id => getKingdomById(id)).filter((k): k is Kingdom => k !== undefined);
}
