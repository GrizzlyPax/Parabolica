// The team creator (#346; docs/story/team-identity.md → Team creator): build
// your own team from one of the 28 deck colours (ink automatic), one of
// Radio's 20 logos and a name. It only dresses your pool slot: the human's
// SeasonHuman identity (name, color, ink, iconId) overrides that team's look.
import type { IconId } from '../icons/registry';
import type { SeasonHuman } from './season';

export { DECK_COLOURS as TEAM_COLOURS, type TeamColour } from '../data/teamColours';
import { DECK_COLOURS as TEAM_COLOURS } from '../data/teamColours';
import { inkFor } from '../icons/ink';

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
  // Your own look: the deck team you started from goes back to the pool (#660).
  return { ...human, name, color: colour.hex, ink: inkFor(colour.hex), iconId: built.logo, deckTeamId: undefined };
}
