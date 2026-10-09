// Helpers for the season tests (not a test file; vitest only runs *.test.ts).
import { pendingPack, applyPack, teamCardState, type CardHolder } from './pack';
import { draftState } from './draft';
import { poolFor, type SeasonFacts } from './season';

/** Open the pending pack onto the first legal holder: the first driver, the
 * car or the team, swapping out whatever is in a full slot. */
export function openPack(facts: SeasonFacts): SeasonFacts {
  const pack = pendingPack(facts);
  if (!pack) return facts;
  const roster = draftState(poolFor(facts), facts.draftPicks).rosters[pack.teamId];
  const state = teamCardState(facts, pack.teamId);
  const target: CardHolder = pack.cards[0].target === 'driver' ? { kind: 'driver', id: roster.driverIds[0] } : { kind: pack.cards[0].target };
  let replaces: string | undefined;
  if (pack.cards[0].kind !== 'trait') {
    const slot = target.kind === 'driver' ? state.drivers[target.id].equipment : target.kind === 'car' ? state.car.upgrade : state.team.facility;
    const cap = target.kind === 'driver' ? state.slots.equipment : target.kind === 'car' ? state.slots.upgrade : state.slots.facility;
    if (slot.length >= cap) replaces = slot[0].id;
  }
  return applyPack(facts, { type: 'pack', round: pack.round, teamId: pack.teamId, tier: pack.tier, cardId: pack.cards[0].id, dealt: pack.cards.map(c => c.id), target, replaces });
}
