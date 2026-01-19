// Crown Prix Kingdoms - 20 teams total, 10 selected per season

export interface Kingdom {
  id: string;
  name: string;
  emoji: string;
  color: string;
  description: string;
}

// Full roster of all available kingdoms
export const ALL_KINGDOMS: Kingdom[] = [
  // Original 10
  {
    id: 'crimson-vale',
    name: 'Crimson Vale',
    emoji: '🧛',
    color: '#C62828',
    description: 'The blood-red banners of the vampiric lords',
  },
  {
    id: 'emberreach',
    name: 'Emberreach',
    emoji: '🐉',
    color: '#FF6F00',
    description: 'Dragon tamers from the volcanic highlands',
  },
  {
    id: 'lunareth',
    name: 'Lunareth',
    emoji: '🌙',
    color: '#7E57C2',
    description: 'Moon worshippers who race under starlight',
  },
  {
    id: 'thornwild',
    name: 'Thornwild',
    emoji: '🌿',
    color: '#2E7D32',
    description: 'Forest dwellers with nature-blessed steeds',
  },
  {
    id: 'brasshaven',
    name: 'Brasshaven',
    emoji: '⚙️',
    color: '#8D6E63',
    description: 'Inventors and engineers of clockwork mounts',
  },
  {
    id: 'candlecourt',
    name: 'Candlecourt',
    emoji: '🕯️',
    color: '#FFE082',
    description: 'The gilded nobles with their sacred flames',
  },
  {
    id: 'tideward',
    name: 'Tideward',
    emoji: '🌊',
    color: '#0288D1',
    description: 'Sea-born racers who command the waves',
  },
  {
    id: 'virel-dominion',
    name: 'Virel Dominion',
    emoji: '👁️',
    color: '#00BFA5',
    description: 'Seers with unnatural foresight',
  },
  {
    id: 'saffron-expanse',
    name: 'Saffron Expanse',
    emoji: '🏜️',
    color: '#FB8C00',
    description: 'Desert nomads with sun-hardened resolve',
  },
  {
    id: 'starfall-concord',
    name: 'Starfall Concord',
    emoji: '⭐',
    color: '#4FC3F7',
    description: 'Celestial travelers touched by comets',
  },
  // New 10
  {
    id: 'ironhold',
    name: 'Ironhold',
    emoji: '🛡️',
    color: '#607D8B',
    description: 'Armored warriors from the mountain fortresses',
  },
  {
    id: 'frostmere',
    name: 'Frostmere',
    emoji: '❄️',
    color: '#81D4FA',
    description: 'Ice-bound racers from the frozen north',
  },
  {
    id: 'shadowfen',
    name: 'Shadowfen',
    emoji: '🦇',
    color: '#37474F',
    description: 'Mysterious riders from the dark marshlands',
  },
  {
    id: 'phoenixcrest',
    name: 'Phoenixcrest',
    emoji: '🔥',
    color: '#FF5722',
    description: 'Reborn from ashes, they never stay down',
  },
  {
    id: 'crystalspire',
    name: 'Crystalspire',
    emoji: '💎',
    color: '#E1BEE7',
    description: 'Gem-encrusted chariots of the mining lords',
  },
  {
    id: 'stormwright',
    name: 'Stormwright',
    emoji: '⚡',
    color: '#FDD835',
    description: 'Thunder callers who race with lightning',
  },
  {
    id: 'verdant-throne',
    name: 'Verdant Throne',
    emoji: '🌳',
    color: '#388E3C',
    description: 'Ancient tree-speakers of the old growth',
  },
  {
    id: 'obsidian-order',
    name: 'Obsidian Order',
    emoji: '🖤',
    color: '#212121',
    description: 'Volcanic glass knights of dark precision',
  },
  {
    id: 'pearlharbor',
    name: 'Pearlharbor',
    emoji: '🐚',
    color: '#80CBC4',
    description: 'Ocean treasure hunters with shell-crafted speed',
  },
  {
    id: 'sunspear',
    name: 'Sunspear',
    emoji: '☀️',
    color: '#FFB300',
    description: 'Solar knights who draw power from daylight',
  },
];

// Default selection of 10 kingdoms (legacy compatibility)
export const KINGDOMS = ALL_KINGDOMS.slice(0, 10);

// Driver slot within a team (1 = primary, 2 = secondary)
export type DriverSlot = 1 | 2;

export function getKingdomById(id: string): Kingdom | undefined {
  return ALL_KINGDOMS.find(k => k.id === id);
}

// Get a random selection of N kingdoms
export function getRandomKingdoms(count: number = 10): Kingdom[] {
  const shuffled = [...ALL_KINGDOMS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// Get kingdoms by their IDs
export function getKingdomsByIds(ids: string[]): Kingdom[] {
  return ids.map(id => getKingdomById(id)).filter((k): k is Kingdom => k !== undefined);
}
