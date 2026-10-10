// Helpers for the season tests (not a test file; vitest only runs *.test.ts).
import { pendingOffer, dealPack, applyPack, applyCurse, teamCardState, type CardHolder } from './pack';
import { draftState } from './draft';
import { poolFor, seasonState, type SeasonFacts } from './season';
import { pendingRankUps, dealRankUp, applyRankUp } from './xp';

/** Take every rank-up the team on the clock is owed: the first card each time. */
export function takeRankUps(facts: SeasonFacts): SeasonFacts {
  for (;;) {
    const state = seasonState(facts);
    if (state.phase !== 'paddock' || !state.whoseTurn) return facts;
    const owed = pendingRankUps(facts, state.round, state.whoseTurn)[0];
    if (!owed) return facts;
    const deal = dealRankUp(facts, owed.driverId, owed.rank, state.round);
    facts = applyRankUp(facts, { type: 'rank-up', round: state.round, teamId: state.whoseTurn, driverId: owed.driverId, rank: owed.rank, dealt: deal.cards.map(c => c.id), cardId: deal.cards[0].id });
  }
}

/** Take the pending offer: the first pack's first card onto the first legal
 * holder (the first driver, the car or the team, swapping out whatever is in
 * a full slot), or the curse when that is what's on the table. */
export function openPack(facts: SeasonFacts): SeasonFacts {
  facts = takeRankUps(facts);
  const offer = pendingOffer(facts);
  if (!offer) return facts;
  if (offer.kind === 'curse') return applyCurse(facts, { type: 'curse', round: offer.round, teamId: offer.teamId, effectId: offer.curse!.id });
  const pack = dealPack(facts, offer.round, offer.teamId, offer.packs[0])!;
  const roster = draftState(poolFor(facts), facts.draftPicks).rosters[pack.teamId];
  const state = teamCardState(facts, pack.teamId);
  const target: CardHolder = pack.cards[0].target === 'driver' ? { kind: 'driver', id: roster.driverIds[0] } : { kind: pack.cards[0].target };
  let replaces: string | undefined;
  if (pack.cards[0].kind !== 'trait') {
    const slot = target.kind === 'driver' ? state.drivers[target.id].equipment : target.kind === 'car' ? state.car.upgrade : state.team.facility;
    const cap = target.kind === 'driver' ? state.slots.equipment : target.kind === 'car' ? state.slots.upgrade : state.slots.facility;
    if (slot.length >= cap) replaces = slot[0].id;
  }
  return applyPack(facts, { type: 'pack', round: pack.round, teamId: pack.teamId, tier: pack.tier, pack: pack.kind, cardId: pack.cards[0].id, dealt: pack.cards.map(c => c.id), target, replaces });
}
