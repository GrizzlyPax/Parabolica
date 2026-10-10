// The team creator (#346; docs/story/team-identity.md → Team creator): build
// your own team from one of the 28 deck colours (ink automatic), one of
// Radio's 20 logos and a name. It only dresses your pool slot: the human's
// SeasonHuman identity (name, color, ink, iconId) overrides that team's look.
import type { IconId } from '../icons/registry';
import type { SeasonHuman } from './season';

export interface TeamColour { name: string; hex: string; ink: string }

/** The 28 deck colours in picker order (7 × 4: reds → purples → blues → greens → yellows → oranges → neutrals). */
export const TEAM_COLOURS: readonly TeamColour[] = [
  { name: 'Rosso', hex: '#E8242F', ink: '#FFFFFF' }, { name: 'Crimson', hex: '#C31851', ink: '#FFFFFF' },
  { name: 'Raspberry', hex: '#E63281', ink: '#FFFFFF' }, { name: 'Hot Pink', hex: '#FF4DB8', ink: '#FFFFFF' },
  { name: 'Orchid', hex: '#D95FFC', ink: '#FFFFFF' }, { name: 'Purple', hex: '#8F3DC0', ink: '#FFFFFF' },
  { name: 'Violet', hex: '#9B8AFE', ink: '#0A0A0C' }, { name: 'Indigo', hex: '#5454EA', ink: '#FFFFFF' },
  { name: 'Cobalt', hex: '#006EBE', ink: '#FFFFFF' }, { name: 'Cornflower', hex: '#5E9EFD', ink: '#FFFFFF' },
  { name: 'Cyan', hex: '#0BAEE0', ink: '#FFFFFF' }, { name: 'Aqua', hex: '#1BB4B8', ink: '#FFFFFF' },
  { name: 'Petrol', hex: '#087C77', ink: '#FFFFFF' }, { name: 'Jade', hex: '#0DB98E', ink: '#FFFFFF' },
  { name: 'Leaf', hex: '#8DCC6E', ink: '#0A0A0C' }, { name: 'Lime', hex: '#4EBB05', ink: '#FFFFFF' },
  { name: 'Moss', hex: '#507B07', ink: '#FFFFFF' }, { name: 'Signal', hex: '#DED903', ink: '#0A0A0C' },
  { name: 'Gold', hex: '#C2A02A', ink: '#0A0A0C' }, { name: 'Amber', hex: '#FFB000', ink: '#0A0A0C' },
  { name: 'Papaya', hex: '#F87103', ink: '#FFFFFF' }, { name: 'Coral', hex: '#F8767A', ink: '#0A0A0C' },
  { name: 'Rust', hex: '#C0502A', ink: '#FFFFFF' }, { name: 'Saddle', hex: '#945F0E', ink: '#FFFFFF' },
  { name: 'Bronze', hex: '#B47B46', ink: '#FFFFFF' }, { name: 'Slate', hex: '#718295', ink: '#FFFFFF' },
  { name: 'Silver', hex: '#B6BBC1', ink: '#0A0A0C' }, { name: 'Cream', hex: '#F4EEDE', ink: '#0A0A0C' },
];

/** Radio's 20 logos, by theme. */
export const TEAM_LOGOS: readonly { theme: string; ids: readonly IconId[] }[] = [
  { theme: 'Beasts', ids: ['fox-head', 'wolf-head', 'lion', 'owl', 'octopus'] },
  { theme: 'Machines', ids: ['speed-boat', 'spark-plug', 'rocket', 'cog-badge'] },
  { theme: 'Marks', ids: ['seven-pointed-star', 'key', 'fleur-de-lys', 'lightning-helix'] },
  { theme: 'Flags & signals', ids: ['pirate-flag', 'traffic-cone', 'megaphone'] },
  { theme: 'Weird', ids: ['ghost', 'alien-stare', 'tentacle-heart', 'plastic-duck'] },
];

export const TEAM_NAME_MAX = 22;
export const DEFAULT_TEAM_NAME = 'Your team';

export interface BuiltTeam { name: string; colour: string; logo: IconId }

/** Your human wearing the team you built (the pool slot stays the same). */
export function wearBuiltTeam(human: SeasonHuman, built: BuiltTeam): SeasonHuman {
  const colour = TEAM_COLOURS.find(c => c.hex === built.colour) ?? TEAM_COLOURS[0];
  const name = built.name.trim().replace(/\s+/g, ' ').slice(0, TEAM_NAME_MAX) || DEFAULT_TEAM_NAME;
  return { ...human, name, color: colour.hex, ink: colour.ink, iconId: built.logo };
}
