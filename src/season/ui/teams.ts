// The pool's teams as the screens show them: each human wears the identity
// they chose (name / colour / icon), CPUs their deck team.
import { identitiesFor, poolFor, type SeasonFacts } from '../season';
import type { CompetitorTeam } from '../genesis';

export function teamsOf(facts: SeasonFacts): Record<string, CompetitorTeam> {
  const ids = identitiesFor(facts);
  return Object.fromEntries(poolFor(facts).teams.map(t => {
    const own = Object.fromEntries(Object.entries(ids[t.id] ?? {}).filter(([, v]) => v != null));
    return [t.id, { ...t, ...own }];
  }));
}

/** "You" solo; "P1", "P2" … in hotseat; null for a CPU team. */
export function humanLabel(facts: SeasonFacts, teamId: string): string | null {
  const i = facts.setup.humans.findIndex(h => h.teamId === teamId);
  if (i < 0) return null;
  return facts.setup.humans.length > 1 ? `P${i + 1}` : 'You';
}
