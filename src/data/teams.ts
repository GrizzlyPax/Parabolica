// The teams on the grid: the 28 base-deck world factions (#356; Radio + Pax,
// docs/story/team-identity.md). One colour + an ink for anything drawn on it
// (docs/ICONS.md → colour system); no secondary colour. The old 22 pun teams
// and their historic variants were removed in v0.5 (git history has them).
// Source of truth for the data: src/data/deckTeams.ts (the World Deck shows it).

import { BASE_DECK_TEAMS, type DeckTeam, type TeamKind } from './deckTeams';
import { inkFor } from '../icons/ink';

export interface Team {
  id: string;
  name: string;
  /** Works · privateer · dynasty · regional. Custom teams have none. */
  kind?: TeamKind;
  /** Fallback while screens migrate to icons (docs/ICONS.md). */
  emoji: string;
  /** The team's one colour. */
  color: string;
  /** Text/icon colour drawn on `color`: white or near-black. */
  ink: string;
  /** game-icon id or meaning for the logo (src/icons/registry.ts); falls back to emoji. */
  iconId?: string;
  description: string;
  isHistoric?: boolean; // None in v0.5; kept for the type's consumers
  isCustom?: boolean;   // Player-created at league founding
  tags?: string[];      // Team-specific tag IDs (to be assigned)
}

function teamFromDeck(t: DeckTeam): Team {
  return { id: t.id, name: t.name, kind: t.kind, emoji: t.emoji, color: t.color, ink: t.ink, iconId: t.iconId, description: t.description };
}

/** The grid: Quick Race's random 11 and Season Mode's CPU teams draw from these. */
export const CURRENT_TEAMS: Team[] = BASE_DECK_TEAMS.map(teamFromDeck);

/** None in v0.5 (the old historic variants left with the old grid). */
export const HISTORIC_TEAMS: Team[] = [];

// All teams combined
export const ALL_TEAMS: Team[] = [...CURRENT_TEAMS, ...HISTORIC_TEAMS];

// Default selection (11 of these make a standard grid)
export const TEAMS = CURRENT_TEAMS;
/** Teams on a standard (Quick Race) grid. */
export const STANDARD_GRID_TEAMS = 11;

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
export function getRandomTeams(count: number = 11, rng: () => number = Math.random): Team[] {
  const shuffled = [...CURRENT_TEAMS];
  for (let i = shuffled.length - 1; i > 0; i--) { // Fisher–Yates, seedable
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
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

/** Mint a player-created team. The id is slugged from the name + a short
 * unique suffix so two "Team Banana"s never collide on the grid. Custom teams
 * live only in their league's setup — never the static registry — so their
 * identity is carried by the generated roster (driver color/ink/emoji/teamName).
 * The ink is picked for the colour. */
export function makeCustomTeam(
  name: string,
  emoji: string,
  color: string,
  uniqueSuffix: string
): Team {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'team';
  return {
    id: `custom-${slug}-${uniqueSuffix}`,
    name: name.trim() || 'Custom Team',
    emoji: emoji || '🏁',
    color,
    ink: inkFor(color),
    description: 'A team of the Commissioner\'s own making.',
    isCustom: true,
  };
}

// Legacy compatibility - map old function names
export const ALL_KINGDOMS = ALL_TEAMS;
export const KINGDOMS = TEAMS;
export type Kingdom = Team;
export const getKingdomById = getTeamById;
export const getRandomKingdoms = getRandomTeams;
export const getKingdomsByIds = getTeamsByIds;
