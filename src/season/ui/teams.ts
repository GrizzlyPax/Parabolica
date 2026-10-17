// The pool's teams as the screens show them: each human wears the identity
// they chose (name / colour / icon), CPUs their deck team. And how a garage
// is NAMED on a screen (#778, Pax Oct 17: "no garage names after Locals"):
// at Locals its name; at State the title of its town (Ace Akron); at
// Nationals the title of its state (Ace Vermont). Identity is the title.
import { identitiesFor, poolFor, type SeasonFacts } from '../season';
import type { CompetitorTeam } from '../genesis';
import { placeById } from '../../data/states';
import { draftState } from '../draft';
import type { RibbonStep } from '../../look/step';

export function teamsOf(facts: SeasonFacts): Record<string, CompetitorTeam> {
  const ids = identitiesFor(facts);
  return Object.fromEntries(poolFor(facts).teams.map(t => {
    const own = Object.fromEntries(Object.entries(ids[t.id] ?? {}).filter(([, v]) => v != null));
    return [t.id, { ...t, ...own }];
  }));
}

export interface GarageLabel {
  /** What a screen calls the garage. */
  name: string;
  /** When the name is a title (after Locals): the ribbon to wear, and the state for a State title. */
  ribbon?: { step: RibbonStep; stateId?: string };
}

/** Every garage's label (#778). Rivals' towns come from the pool (State) and the league's seats (Nationals), the same way the badges read them. */
export function garageLabels(facts: SeasonFacts): Record<string, GarageLabel> {
  const teams = teamsOf(facts);
  const out: Record<string, GarageLabel> = Object.fromEntries(Object.values(teams).map(t => [t.id, { name: t.name }]));
  const league = facts.setup.league;
  const you = facts.setup.humans[0]?.teamId;
  if (league?.step === 'state' && league.locale) {
    for (const t of Object.values(teams)) {
      const town = t.id === you ? league.locale.town : t.town;
      if (town) out[t.id] = { name: `Ace ${town}`, ribbon: { step: 'locals' } };
    }
  } else if (league?.step === 'nationals' && league.locale?.rivals) {
    const pool = poolFor(facts);
    const rosters = draftState(pool, facts.draftPicks).rosters;
    const seats = league.locale.rivals;
    let k = 0;
    for (const t of pool.teams.filter(x => rosters[x.id]?.driverIds.length)) {
      const stateId = t.id === you ? league.locale.stateId : seats[k++]?.stateId;
      const place = stateId ? placeById(stateId) : undefined;
      if (place) out[t.id] = { name: `Ace ${place.name}`, ribbon: { step: 'state', stateId } };
    }
  }
  return out;
}

/** The engine's drivers carry the garage's data name; this maps it to the label for the race view (#778). */
export function teamNameLabels(facts: SeasonFacts): Record<string, string> {
  const labels = garageLabels(facts);
  return Object.fromEntries(Object.values(teamsOf(facts)).map(t => [t.name, labels[t.id]?.name ?? t.name]));
}

/** "You" for your team (Season Mode is single-player since #588); null for a CPU team. */
export function humanLabel(facts: SeasonFacts, teamId: string): string | null {
  return facts.setup.humans.some(h => h.teamId === teamId) ? 'You' : null;
}
