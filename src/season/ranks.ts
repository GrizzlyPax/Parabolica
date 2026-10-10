// Driver ranks (#623; Steward's Levels and XP Report, Pax Oct 10). One
// vocabulary: stats have levels, drivers have RANKS, leagues are tiers.
// Rivals wear their tier's rank (#591's numbers): Juniors = Rookies with a Pro
// nemesis · Regional = Pros, Ace nemesis · National = Aces, Legend nemesis ·
// Top flight = all Legends, the nemesis wearing the crest. Your own drivers'
// ranks come from XP (#592), not built yet. Display only.
import type { SeasonFacts } from './season';
import { nemesisTeam } from './nemesis';

export const RANKS = ['Rookie', 'Pro', 'Ace', 'Legend'] as const;
export type Rank = (typeof RANKS)[number];

export interface RankLabel { rank: Rank; crest: boolean }

/** A rival team's rank in this league; null for your team or outside a run. */
export function rivalRank(facts: SeasonFacts, teamId: string): RankLabel | null {
  const tier = facts.setup.league?.index;
  if (tier === undefined || facts.setup.humans.some(h => h.teamId === teamId)) return null;
  const nemesis = nemesisTeam(facts)?.id === teamId;
  const i = Math.min(RANKS.length - 1, tier + (nemesis ? 1 : 0));
  return { rank: RANKS[i], crest: nemesis && tier >= RANKS.length - 1 };
}
