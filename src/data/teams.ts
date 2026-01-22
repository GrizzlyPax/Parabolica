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
// Colors chosen for: vibrancy on dark backgrounds, instant recognition, sporty energy
export const ALL_TEAMS: Team[] = [
  // Creatures
  { id: 'ink-bloom', name: 'Ink Bloom', emoji: '🐙', color: '#A855F7', description: 'They write their own finish line' },           // Vivid purple
  { id: 'midnight-bandits', name: 'Midnight Bandits', emoji: '🦝', color: '#94A3B8', description: 'Gone before you see them' },     // Slate silver
  { id: 'the-climbers', name: 'The Climbers', emoji: '🐐', color: '#D97706', description: 'Always finding a way up' },              // Amber orange
  { id: 'loose-serpents', name: 'Loose Serpents', emoji: '🐍', color: '#10B981', description: 'Slipping through every gap' },       // Emerald green
  { id: 'late-watch', name: 'Late Watch', emoji: '🦉', color: '#8B5CF6', description: 'Patience is a strategy' },                   // Violet
  { id: 'slow-panic', name: 'Slow Panic', emoji: '🐌', color: '#C084FC', description: 'Inevitable, eventually' },                   // Orchid purple
  { id: 'sudden-hares', name: 'Sudden Hares', emoji: '🐇', color: '#FB7185', description: 'Blink and they\'re gone' },              // Coral pink
  { id: 'ceiling-club', name: 'Ceiling Club', emoji: '🦇', color: '#6366F1', description: 'Upside down and loving it' },            // Indigo
  { id: 'drain-dwellers', name: 'Drain Dwellers', emoji: '🐊', color: '#22C55E', description: 'From the depths, they emerge' },     // Bright green
  { id: 'deep-listeners', name: 'Deep Listeners', emoji: '🐋', color: '#3B82F6', description: 'The track speaks to them' },         // Royal blue

  // Faces & States
  { id: 'false-smiles', name: 'False Smiles', emoji: '🤡', color: '#EC4899', description: 'The joke is on everyone' },              // Hot pink
  { id: 'no-comment', name: 'No Comment', emoji: '😶', color: '#64748B', description: 'Their results speak for themselves' },       // Cool gray
  { id: 'almost-there', name: 'Almost There', emoji: '🫥', color: '#06B6D4', description: 'Perpetually approaching' },              // Cyan
  { id: 'minor-problems', name: 'Minor Problems', emoji: '😈', color: '#EF4444', description: 'Small issues, big consequences' },   // Bright red
  { id: 'soft-errors', name: 'Soft Errors', emoji: '🤖', color: '#60A5FA', description: 'Failing gracefully since forever' },       // Sky blue
  { id: 'walk-throughs', name: 'Walk-Throughs', emoji: '👻', color: '#E2E8F0', description: 'Here, but not quite' },                // Ghost white
  { id: 'heat-collapse', name: 'Heat Collapse', emoji: '🫠', color: '#F59E0B', description: 'Melting under pressure' },             // Amber
  { id: 'cold-thoughts', name: 'Cold Thoughts', emoji: '🥶', color: '#38BDF8', description: 'Calculating every move' },             // Ice blue
  { id: 'the-inspectors', name: 'The Inspectors', emoji: '🧐', color: '#FBBF24', description: 'Scrutinizing every detail' },        // Gold
  { id: 'side-effects', name: 'Side Effects', emoji: '🥴', color: '#D946EF', description: 'Unintended but effective' },             // Fuchsia

  // Weather & Nature
  { id: 'loose-weather', name: 'Loose Weather', emoji: '🌪️', color: '#78716C', description: 'Unpredictable conditions' },          // Stone
  { id: 'low-visibility', name: 'Low Visibility', emoji: '🌫️', color: '#A8A29E', description: 'You won\'t see them coming' },      // Warm gray
  { id: 'power-outage', name: 'Power Outage', emoji: '🌑', color: '#475569', description: 'Racing in the dark' },                   // Dark slate
  { id: 'after-the-incident', name: 'After the Incident', emoji: '🌈', color: '#34D399', description: 'We don\'t talk about it' },  // Mint green
  { id: 'short-circuit', name: 'Short Circuit', emoji: '⚡', color: '#FDE047', description: 'Shocking performance' },               // Electric yellow
  { id: 'overcapacity', name: 'Overcapacity', emoji: '🔥', color: '#F97316', description: 'Running too hot' },                      // Flame orange
  { id: 'unmeltables', name: 'Unmeltables', emoji: '🧊', color: '#22D3EE', description: 'Cool under any pressure' },                // Bright cyan
  { id: 'wrong-orbit', name: 'Wrong Orbit', emoji: '🪐', color: '#7C3AED', description: 'Taking the scenic route' },                // Deep violet
  { id: 'the-undertow', name: 'The Undertow', emoji: '🌊', color: '#0EA5E9', description: 'Pulling you back in' },                  // Ocean blue
  { id: 'dry-forecast', name: 'Dry Forecast', emoji: '🏜️', color: '#EA580C', description: 'Nothing but clear skies' },             // Desert orange

  // Objects & Concepts
  { id: 'reserved-seating', name: 'Reserved Seating', emoji: '🪑', color: '#B45309', description: 'They\'ve saved your spot' },     // Walnut brown
  { id: 'overflow-unit', name: 'Overflow Unit', emoji: '🛁', color: '#2DD4BF', description: 'Spilling over with talent' },          // Teal
  { id: 'load-bearing', name: 'Load Bearing', emoji: '🧱', color: '#DC2626', description: 'Holding everything together' },          // Brick red
  { id: 'unattended-carts', name: 'Unattended Carts', emoji: '🛒', color: '#0284C7', description: 'Rolling on their own' },         // Steel blue
  { id: 'held-together', name: 'Held Together', emoji: '📎', color: '#818CF8', description: 'Barely, but effectively' },            // Periwinkle
  { id: 'access-denied', name: 'Access Denied', emoji: '🔒', color: '#059669', description: 'No entry, no problem' },               // Forest green
  { id: 'controlled-burn', name: 'Controlled Burn', emoji: '🧯', color: '#E11D48', description: 'Calculated destruction' },         // Crimson
  { id: 'misaligned', name: 'Misaligned', emoji: '🧭', color: '#14B8A6', description: 'Going their own direction' },                // Teal green
  { id: 'weak-signal', name: 'Weak Signal', emoji: '📡', color: '#84CC16', description: 'Barely there, but present' },              // Lime green
  { id: 'second-reflection', name: 'Second Reflection', emoji: '🪞', color: '#CBD5E1', description: 'Not what you expected' },      // Silver
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
