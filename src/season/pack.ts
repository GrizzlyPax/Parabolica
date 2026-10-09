// Card packs + the team locker (#316, docs/SEASON_MODE.md §4, docs/CARDS.md).
//
// Before every race each HUMAN team opens a pack. Its TIER is set by
// constructor standing before the round (leader Common → last Legendary; round
// 1 is Uncommon for everyone). The tier sets the odds of each card's METAL
// (bronze · silver · gold · iridium). A pack deals THREE cards (#533, Pax's
// first owner choice); the human keeps one. Each card is a gear card
// (equipment / upgrade / facility) or, 1 in 4, a trait card, never an effect.
// The kept card goes on their own team: a driver (bench included), the car or
// the team; the other two go back.
//
// Gear fills slots (one of each in v0.5, slotsFor). A card into a full slot
// must name what it REPLACES; the old card goes to the team's uncapped locker.
// In any Paddock turn gear moves freely: equip from the locker, move
// equipment between your drivers, or unequip to the locker. Traits are
// permanent and uncapped. CPU teams get no pack in v0.5 (hook only).
//
// Facts: the deal is derived (seed + standings → the same three cards). The
// first card comes from the pre-#533 stream (always four rng draws), so older
// saves still replay; cards two and three come from their own sub-streams. The
// APPLICATION records which three were dealt and which one was kept, and the
// MOVES are recorded too, in one ordered log, so a swap-then-equip replays in
// the order it happened.

import { mulberry32, deriveSeed } from '../engine/rng';
import { MOTORSPORT_DECK, cardsBy, pickCard, slotsFor, GEAR_KIND, CARDS_BY_ID, type Card, type CardTarget, type Slots } from '../cards';
import type { RarityOdds } from '../data/tags';
import type { SeasonCards } from './genesis';
import { draftState } from './draft';
import { constructorStandings, isHuman, poolFor, seasonState, type SeasonFacts } from './season';

export type PackTier = 'common' | 'uncommon' | 'rare' | 'legendary';
export const PACK_TIERS: PackTier[] = ['common', 'uncommon', 'rare', 'legendary'];
export const FIRST_PACK_TIER: PackTier = 'uncommon';
/** Odds of the card's metal, per pack tier (B/S/G/I). Data; tune here. */
export const PACK_ODDS: Record<PackTier, RarityOdds> = {
  common: { bronze: 60, silver: 30, gold: 9, iridium: 1 },
  uncommon: { bronze: 52, silver: 32, gold: 13, iridium: 3 },
  rare: { bronze: 43, silver: 34, gold: 18, iridium: 5 },
  legendary: { bronze: 35, silver: 35, gold: 22, iridium: 8 },
};
export const TRAIT_CHANCE = 0.25;
/** Cards a pack deals; the player keeps one (#533). */
export const PACK_SIZE = 3;
const TARGETS: CardTarget[] = ['driver', 'car', 'team'];

/** Where a card goes: one of your drivers, your car or your team. */
export type CardHolder = { kind: 'driver'; id: number } | { kind: 'car' } | { kind: 'team' };

export interface PackApplication {
  type: 'pack';
  round: number;
  teamId: string;
  tier: PackTier;
  /** The card kept. */
  cardId: string;
  /** The three cards the pack dealt (#533), in deal order. Absent on facts from before #533. */
  dealt?: string[];
  target: CardHolder;
  /** Gear into a full slot: the card it pushes to the locker. */
  replaces?: string;
}

export interface GearMove {
  type: 'move';
  round: number;
  teamId: string;
  cardId: string;
  to: CardHolder | 'locker';
}

export type CardFact = PackApplication | GearMove;

export interface DealtPack {
  round: number;
  teamId: string;
  tier: PackTier;
  /** PACK_SIZE distinct cards, in deal order. */
  cards: Card[];
}

/** Hook: who gets a pack. CPU teams don't in v0.5. */
export function teamGetsPack(facts: SeasonFacts, teamId: string): boolean {
  return isHuman(facts, teamId);
}

/** Standing rank → tier, in quarters of the grid: leader Common, last Legendary. */
export function packTierForRank(rank: number, teamCount: number): PackTier {
  const q = Math.min(3, Math.floor(((rank - 1) * 4) / teamCount));
  return PACK_TIERS[q];
}

/** The facts as they stood before `round` was raced (for replaying a deal). */
function factsThrough(facts: SeasonFacts, round: number): SeasonFacts {
  return facts.results.length <= round ? facts : { ...facts, results: facts.results.slice(0, round) };
}

export function packTierFor(facts: SeasonFacts, round: number, teamId: string): PackTier {
  if (round === 0) return FIRST_PACK_TIER;
  const standings = constructorStandings(factsThrough(facts, round));
  const rank = standings.find(s => s.teamId === teamId)?.rank;
  if (!rank) throw new Error(`pack: unknown team ${teamId}`);
  return packTierForRank(rank, facts.setup.teamCount);
}

/** One card off a stream: four rng draws (kind, target, metal, pick). */
function dealOne(rng: () => number, tier: PackTier): Card {
  const kindRoll = rng();
  const target = TARGETS[Math.floor(rng() * TARGETS.length)];
  const pool = kindRoll < TRAIT_CHANCE ? cardsBy({ kind: 'trait', target }, MOTORSPORT_DECK) : cardsBy({ kind: GEAR_KIND[target] }, MOTORSPORT_DECK);
  const card = pickCard(pool, PACK_ODDS[tier], rng);
  if (!card) throw new Error(`pack: empty pool for ${target}`);
  return card;
}

/**
 * The pack a team opens this round: PACK_SIZE distinct cards of its tier.
 * Pure: the same seed and standings deal the same cards. Card one is the
 * pre-#533 single card (same stream, same four draws); each later card has its
 * own sub-stream and redraws on a duplicate. Null for a team that gets no pack.
 */
export function dealPack(facts: SeasonFacts, round: number, teamId: string): DealtPack | null {
  if (!teamGetsPack(facts, teamId)) return null;
  const tier = packTierFor(facts, round, teamId);
  const cards = [dealOne(mulberry32(deriveSeed(facts.setup.seed, 'season', 'pack', round, teamId)), tier)];
  for (let i = 1; i < PACK_SIZE; i++) {
    const rng = mulberry32(deriveSeed(facts.setup.seed, 'season', 'pack', round, teamId, 'card', i));
    let c = dealOne(rng, tier);
    for (let tries = 0; cards.some(x => x.id === c.id) && tries < 20; tries++) c = dealOne(rng, tier);
    cards.push(c);
  }
  return { round, teamId, tier, cards };
}

// ---------------------------------------------------------------------------
// A team's cards, derived from the log

export interface TeamCardState {
  /** Per drafted driver, bench included. */
  drivers: Record<number, { traits: Card[]; equipment: Card[] }>;
  car: { traits: Card[]; upgrade: Card[] };
  team: { traits: Card[]; facility: Card[] };
  locker: Card[];
  slots: Slots;
}

function card(id: string): Card {
  const c = CARDS_BY_ID.get(id);
  if (!c) throw new Error(`pack: no card ${id}`);
  return c;
}

function gearSlot(state: TeamCardState, holder: CardHolder): Card[] {
  if (holder.kind === 'driver') {
    const d = state.drivers[holder.id];
    if (!d) throw new Error(`pack: driver ${holder.id} is not on this team`);
    return d.equipment;
  }
  return holder.kind === 'car' ? state.car.upgrade : state.team.facility;
}

function capacity(state: TeamCardState, holder: CardHolder): number {
  return holder.kind === 'driver' ? state.slots.equipment : holder.kind === 'car' ? state.slots.upgrade : state.slots.facility;
}

/** The slot kind a holder takes, and whether a card fits it. */
function fits(c: Card, holder: CardHolder): boolean {
  return c.kind === GEAR_KIND[holder.kind];
}

function take(from: Card[], id: string): Card {
  const i = from.findIndex(c => c.id === id);
  if (i < 0) throw new Error(`pack: card ${id} is not there`);
  return from.splice(i, 1)[0];
}

/** Fold the team's card log through `round` (inclusive) onto its drafted
 * entities. Throws on a fact that can't apply, so a bad log never half-applies. */
export function teamCardState(facts: SeasonFacts, teamId: string, round: number = Infinity): TeamCardState {
  const pool = poolFor(facts);
  const roster = draftState(pool, facts.draftPicks).rosters[teamId];
  if (!roster) throw new Error(`pack: unknown team ${teamId}`);
  const state: TeamCardState = {
    drivers: Object.fromEntries(roster.driverIds.map(id => [id, { traits: [], equipment: [] }])),
    car: { traits: [], upgrade: [] },
    team: { traits: [], facility: [] },
    locker: [],
    slots: slotsFor([]),
  };
  for (const f of facts.cardFacts) {
    if (f.teamId !== teamId || f.round > round) continue;
    const c = card(f.cardId);
    if (f.type === 'pack') {
      if (c.kind === 'trait') {
        if (c.target === 'driver') {
          if (f.target.kind !== 'driver') throw new Error('pack: a driver trait goes on a driver');
          gearSlot(state, f.target); // asserts the driver is ours
          state.drivers[f.target.id].traits.push(c);
        } else if (c.target === 'car') {
          if (f.target.kind !== 'car') throw new Error('pack: a car trait goes on the car');
          state.car.traits.push(c);
        } else {
          if (f.target.kind !== 'team') throw new Error('pack: a team trait goes on the team');
          state.team.traits.push(c);
        }
        state.slots = slotsFor([...state.team.traits, ...state.car.traits, ...Object.values(state.drivers).flatMap(d => d.traits)]);
      } else {
        if (!fits(c, f.target)) throw new Error(`pack: ${c.kind} does not fit a ${f.target.kind}`);
        const slot = gearSlot(state, f.target);
        if (slot.length >= capacity(state, f.target)) {
          if (!f.replaces) throw new Error('pack: the slot is full; name what the card replaces');
          state.locker.push(take(slot, f.replaces));
        } else if (f.replaces) {
          throw new Error('pack: nothing to replace; the slot has room');
        }
        slot.push(c);
      }
    } else {
      // A move: find the card wherever it sits on this team, then place it.
      const sources: Card[][] = [state.locker, ...Object.values(state.drivers).map(d => d.equipment), state.car.upgrade, state.team.facility];
      const from = sources.find(s => s.some(x => x.id === f.cardId));
      if (!from) throw new Error(`pack: card ${f.cardId} is not on team ${teamId}`);
      if (f.to === 'locker') {
        if (from === state.locker) throw new Error('pack: already in the locker');
        state.locker.push(take(from, f.cardId));
      } else {
        if (!fits(c, f.to)) throw new Error(`pack: ${c.kind} does not fit a ${f.to.kind}`);
        const slot = gearSlot(state, f.to);
        if (slot === from) throw new Error('pack: already there');
        if (slot.length >= capacity(state, f.to)) throw new Error('pack: that slot is full; unequip first');
        slot.push(take(from, f.cardId));
      }
    }
  }
  return state;
}

/** Every team's dealt cards for a round, in the shape seasonRoster takes. */
export function seasonCardsFor(facts: SeasonFacts, round: number): SeasonCards {
  const pool = poolFor(facts);
  const rosters = draftState(pool, facts.draftPicks).rosters;
  const out: Required<SeasonCards> = { driver: {}, car: {}, team: {} };
  for (const t of pool.teams) {
    const s = teamCardState(facts, t.id, round);
    for (const [id, d] of Object.entries(s.drivers)) out.driver[Number(id)] = [...d.traits, ...d.equipment];
    if (rosters[t.id].carId) out.car[rosters[t.id].carId!] = [...s.car.traits, ...s.car.upgrade];
    out.team[t.id] = [...s.team.traits, ...s.team.facility];
  }
  return out;
}

// ---------------------------------------------------------------------------
// Applying, with validation

/** Has this team opened its pack this round (or has none to open)? */
export function packOpened(facts: SeasonFacts, round: number, teamId: string): boolean {
  if (!teamGetsPack(facts, teamId)) return true;
  return facts.cardFacts.some(f => f.type === 'pack' && f.round === round && f.teamId === teamId);
}

/** The pack waiting for the team on the clock, or null. */
export function pendingPack(facts: SeasonFacts): DealtPack | null {
  const state = seasonState(facts);
  if (state.phase !== 'paddock' || !state.whoseTurn) return null;
  if (packOpened(facts, state.round, state.whoseTurn)) return null;
  return dealPack(facts, state.round, state.whoseTurn);
}

/** Only the team on the clock, in the current round, touches its cards. */
function onTheClock(facts: SeasonFacts, f: CardFact): string | null {
  const state = seasonState(facts);
  if (state.phase !== 'paddock') return `not in the Paddock (${state.phase})`;
  if (f.round !== state.round) return `round ${f.round} is not the current round (${state.round})`;
  if (f.teamId !== state.whoseTurn) return `${f.teamId} is not on the clock (${state.whoseTurn} is)`;
  return null;
}

function tryApply(facts: SeasonFacts, f: CardFact): string | null {
  try {
    teamCardState({ ...facts, cardFacts: [...facts.cardFacts, f] }, f.teamId);
    return null;
  } catch (e) {
    return (e as Error).message.replace(/^pack: /, '');
  }
}

export function validatePackApplication(facts: SeasonFacts, app: PackApplication): string | null {
  const clock = onTheClock(facts, app);
  if (clock) return clock;
  const dealt = dealPack(facts, app.round, app.teamId);
  if (!dealt) return `${app.teamId} gets no pack`;
  if (packOpened(facts, app.round, app.teamId)) return 'the pack is already open';
  if (app.tier !== dealt.tier) return `the pack is ${dealt.tier}, not ${app.tier}`;
  const ids = dealt.cards.map(c => c.id);
  if (!app.dealt || app.dealt.join(',') !== ids.join(',')) return `the pack dealt ${ids.join(', ')}; record all three`;
  if (!ids.includes(app.cardId)) return `${app.cardId} was not in the pack (${ids.join(', ')})`;
  return tryApply(facts, app);
}

export function validateGearMove(facts: SeasonFacts, move: GearMove): string | null {
  const clock = onTheClock(facts, move);
  if (clock) return clock;
  if (card(move.cardId).kind === 'trait') return 'traits never move';
  return tryApply(facts, move);
}

/** Open the pack onto your team. Pure; throws on an illegal application. */
export function applyPack(facts: SeasonFacts, app: PackApplication): SeasonFacts {
  const why = validatePackApplication(facts, app);
  if (why) throw new Error(`pack: ${why}`);
  return { ...facts, cardFacts: [...facts.cardFacts, app] };
}

/** Move gear between the locker and your slots. Pure; throws on an illegal move. */
export function moveGear(facts: SeasonFacts, move: GearMove): SeasonFacts {
  const why = validateGearMove(facts, move);
  if (why) throw new Error(`pack: ${why}`);
  return { ...facts, cardFacts: [...facts.cardFacts, move] };
}
