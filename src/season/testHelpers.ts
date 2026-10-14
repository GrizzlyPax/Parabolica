// Helpers for the season tests (not a test file; vitest only runs *.test.ts).
import { pendingParcel, openParcel, takeSmudge, teamStamps, holderFits, slotsOf, cardOf, type StampHolder } from './stamps';
import { draftState } from './draft';
import { poolFor, type SeasonFacts } from './season';

/** Take the pending Parcel: its first stamp onto the first card it fits (the
 * first driver, or the car card), scraping off that card's first stamp when
 * it is full; or the smudge when that is what came. */
export function openParcelQuick(facts: SeasonFacts): SeasonFacts {
  const parcel = pendingParcel(facts);
  if (!parcel) return facts;
  if (parcel.kind === 'smudged') return takeSmudge(facts, { type: 'smudge', round: parcel.round, teamId: parcel.teamId, effectId: parcel.smudge!.id });
  const roster = draftState(poolFor(facts), facts.draftPicks).rosters[parcel.teamId];
  const state = teamStamps(facts, parcel.teamId);
  const kept = parcel.cards[0];
  const holder: StampHolder = holderFits(kept, { kind: 'car' }) ? { kind: 'car' } : { kind: 'driver', id: roster.driverIds[0] };
  const slot = cardOf(state, holder);
  const replaces = slot.length >= slotsOf(holder) ? slot[0].id : undefined;
  return openParcel(facts, { type: 'parcel', round: parcel.round, teamId: parcel.teamId, tier: parcel.tier, gift: parcel.kind === 'gift' || undefined, dealt: parcel.cards.map(c => c.id), cardId: kept.id, holder, replaces });
}
