// Parabolica - Absurdist Racing Teams
// Blaseball-inspired chaos on wheels

export interface Team {
  id: string;
  name: string;
  emoji: string;
  color: string;
  description: string;
}

// The 40 Teams of Parabolica
export const ALL_TEAMS: Team[] = [
  // Creatures
  { id: 'ink-bloom', name: 'Ink Bloom', emoji: '🐙', color: '#8B5DBB', description: 'They write their own finish line' },
  { id: 'midnight-bandits', name: 'Midnight Bandits', emoji: '🦝', color: '#7A7A7A', description: 'Gone before you see them' },
  { id: 'the-climbers', name: 'The Climbers', emoji: '🐐', color: '#8C7A5E', description: 'Always finding a way up' },
  { id: 'loose-serpents', name: 'Loose Serpents', emoji: '🐍', color: '#4EAB77', description: 'Slipping through every gap' },
  { id: 'late-watch', name: 'Late Watch', emoji: '🦉', color: '#7C7F9B', description: 'Patience is a strategy' },
  { id: 'slow-panic', name: 'Slow Panic', emoji: '🐌', color: '#AFA4D3', description: 'Inevitable, eventually' },
  { id: 'sudden-hares', name: 'Sudden Hares', emoji: '🐇', color: '#D4918E', description: 'Blink and they\'re gone' },
  { id: 'ceiling-club', name: 'Ceiling Club', emoji: '🦇', color: '#6A6A8E', description: 'Upside down and loving it' },
  { id: 'drain-dwellers', name: 'Drain Dwellers', emoji: '🐊', color: '#5A9E6B', description: 'From the depths, they emerge' },
  { id: 'deep-listeners', name: 'Deep Listeners', emoji: '🐋', color: '#4C7EB9', description: 'The track speaks to them' },

  // Faces & States
  { id: 'false-smiles', name: 'False Smiles', emoji: '🤡', color: '#FF5FA2', description: 'The joke is on everyone' },
  { id: 'no-comment', name: 'No Comment', emoji: '😶', color: '#7A8B99', description: 'Their results speak for themselves' },
  { id: 'almost-there', name: 'Almost There', emoji: '🫥', color: '#6B7A8A', description: 'Perpetually approaching' },
  { id: 'minor-problems', name: 'Minor Problems', emoji: '😈', color: '#CC3333', description: 'Small issues, big consequences' },
  { id: 'soft-errors', name: 'Soft Errors', emoji: '🤖', color: '#7AA2F7', description: 'Failing gracefully since forever' },
  { id: 'walk-throughs', name: 'Walk-Throughs', emoji: '👻', color: '#9EB3C2', description: 'Here, but not quite' },
  { id: 'heat-collapse', name: 'Heat Collapse', emoji: '🫠', color: '#FFB347', description: 'Melting under pressure' },
  { id: 'cold-thoughts', name: 'Cold Thoughts', emoji: '🥶', color: '#8ED6FF', description: 'Calculating every move' },
  { id: 'the-inspectors', name: 'The Inspectors', emoji: '🧐', color: '#CFAE70', description: 'Scrutinizing every detail' },
  { id: 'side-effects', name: 'Side Effects', emoji: '🥴', color: '#B47EB3', description: 'Unintended but effective' },

  // Weather & Nature
  { id: 'loose-weather', name: 'Loose Weather', emoji: '🌪️', color: '#7F8FA6', description: 'Unpredictable conditions' },
  { id: 'low-visibility', name: 'Low Visibility', emoji: '🌫️', color: '#8899A6', description: 'You won\'t see them coming' },
  { id: 'power-outage', name: 'Power Outage', emoji: '🌑', color: '#5C5C6C', description: 'Racing in the dark' },
  { id: 'after-the-incident', name: 'After the Incident', emoji: '🌈', color: '#6EE7B7', description: 'We don\'t talk about it' },
  { id: 'short-circuit', name: 'Short Circuit', emoji: '⚡', color: '#FACC15', description: 'Shocking performance' },
  { id: 'overcapacity', name: 'Overcapacity', emoji: '🔥', color: '#E25822', description: 'Running too hot' },
  { id: 'unmeltables', name: 'Unmeltables', emoji: '🧊', color: '#5BC0BE', description: 'Cool under any pressure' },
  { id: 'wrong-orbit', name: 'Wrong Orbit', emoji: '🪐', color: '#6B5CA5', description: 'Taking the scenic route' },
  { id: 'the-undertow', name: 'The Undertow', emoji: '🌊', color: '#4D99C6', description: 'Pulling you back in' },
  { id: 'dry-forecast', name: 'Dry Forecast', emoji: '🏜️', color: '#D2A679', description: 'Nothing but clear skies' },

  // Objects & Concepts
  { id: 'reserved-seating', name: 'Reserved Seating', emoji: '🪑', color: '#8C7A6B', description: 'They\'ve saved your spot' },
  { id: 'overflow-unit', name: 'Overflow Unit', emoji: '🛁', color: '#9FD3C7', description: 'Spilling over with talent' },
  { id: 'load-bearing', name: 'Load Bearing', emoji: '🧱', color: '#C17A6B', description: 'Holding everything together' },
  { id: 'unattended-carts', name: 'Unattended Carts', emoji: '🛒', color: '#7D8F9B', description: 'Rolling on their own' },
  { id: 'held-together', name: 'Held Together', emoji: '📎', color: '#8F9CDF', description: 'Barely, but effectively' },
  { id: 'access-denied', name: 'Access Denied', emoji: '🔒', color: '#5F8898', description: 'No entry, no problem' },
  { id: 'controlled-burn', name: 'Controlled Burn', emoji: '🧯', color: '#E63946', description: 'Calculated destruction' },
  { id: 'misaligned', name: 'Misaligned', emoji: '🧭', color: '#6A9BBD', description: 'Going their own direction' },
  { id: 'weak-signal', name: 'Weak Signal', emoji: '📡', color: '#00B894', description: 'Barely there, but present' },
  { id: 'second-reflection', name: 'Second Reflection', emoji: '🪞', color: '#8FA3B0', description: 'Not what you expected' },
];

// Default selection of 10 teams
export const TEAMS = ALL_TEAMS.slice(0, 10);

// Driver slot within a team (1 = primary, 2 = secondary)
export type DriverSlot = 1 | 2;

export function getTeamById(id: string): Team | undefined {
  return ALL_TEAMS.find(t => t.id === id);
}

// Get a random selection of N teams
export function getRandomTeams(count: number = 10): Team[] {
  const shuffled = [...ALL_TEAMS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
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
