// Card packs + the team locker (#316, #533, #627; docs/SEASON_MODE.md §4,
// docs/CARDS.md, docs/RUN.md).
//
// Before every race the player gets a PACK OFFER (#627, Pax Oct 9–10): often
// pick 1 of 2 packs (60%), sometimes a single pack (30%), sometimes a forced
// CURSE pack (10%). A pack shows WHERE its card goes (a driver, the car, the
// team), never its metal: the TIER is set by constructor standing before the
// round (leader Common → last Legendary; round 1 Uncommon) and shows only
// once opened. A pack deals THREE cards of its place; the player keeps one.
// Each card is a gear card (equipment / upgrade / facility) or, 1 in 4, a
// trait card, never an effect. The kept card goes on their own team.
//
// Packs deal the 60-card RUN DECK (#647, cards/runDeck.ts), written as the
// player reads it (a Bronze is +3 levels = 15 grade points), no lean, so the
// Paddock and the sim read the same number. Rivals never open packs (#478)
// and keep their genesis traits at 1×. GEAR HAS MILEAGE: double strength
// (× GEAR_STRENGTH) and gone after GEAR_LIFE races, wherever it sits; traits
// are for good. A CURSE is an effect (#332): one of the eight named curses,
// all bad, on the car or the team, both drivers, CURSE_LIFE races (one); the
// offer forces it. (The grid deck's cards are × PLAYER_CARD_SCALE for the
// player when they turn up: old saves.)
//
// Gear fills slots (one of each, slotsFor). A card into a full slot must
// name what it REPLACES; the old card goes to the team's uncapped locker. In
// any Paddock turn gear moves freely. Traits are permanent and uncapped.
//
// Facts: the offer and the deal are derived (seed + standings → the same
// packs and cards). The APPLICATION records the pack picked, which three were
// dealt and which was kept; a CURSE application records the curse taken;
// MOVES are recorded too, in one ordered log, so a swap-then-equip replays in
// the order it happened. No pack lean (Pax, Oct 10): later, a way to see or
// steer what a pack leans to.

import { mulberry32, deriveSeed, shuffle } from '../engine/rng';
import { RUN_DECK, RUN_CURSES, cardById, cardsBy, pickCard, slotsFor, GEAR_KIND, type Card, type CardTarget, type Slots } from '../cards';
import type { RarityOdds } from '../cards/rarity';
import type { CarriedCards, SeasonCards } from './genesis';
import { draftState } from './draft';
import { constructorStandings, isHuman, poolFor, seasonState, type SeasonFacts } from './season';
import type { EffectFact } from './effects';
import type { EffectInfo } from '../RaceEngine';

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
/** A grid-deck card (deck.ts) the player holds is this many times its grade points (#627, Pax: 3×). The run deck (#647) is written as held. */
export const PLAYER_CARD_SCALE = 3;
/** Gear mileage (#627): gear is this many times stronger again, and gone after GEAR_LIFE races. */
export const GEAR_STRENGTH = 2;
export const GEAR_LIFE = 3;
/** The offer (#627): pick 1 of 2 packs · one pack · a forced Curse pack. Draft odds (Steward re-probes). */
export const OFFER_ODDS = { choice: 60, single: 30, curse: 10 };
/** A curse (#647): one of RUN_CURSES, for this many races (Pax: "3 races is steep"). */
export const CURSE_LIFE = 1;
const TARGETS: CardTarget[] = ['driver', 'car', 'team'];

/** Where a pack's card goes: a pack is named by its place, never its metal. */
export type PackKind = CardTarget;
export const PACK_KIND_LABEL: Record<PackKind, string> = { driver: 'Driver pack', car: 'Car pack', team: 'Team pack' };

/** Where a card goes: one of your drivers, your car or your team. */
export type CardHolder = { kind: 'driver'; id: number } | { kind: 'car' } | { kind: 'team' };

export interface PackApplication {
  type: 'pack';
  round: number;
  teamId: string;
  tier: PackTier;
  /** The pack picked from the offer (#627). Absent on facts from before: the old one-pack deal. */
  pack?: PackKind;
  /** The card kept. */
  cardId: string;
  /** The three cards the pack dealt (#533), in deal order. Absent on facts from before #533. */
  dealt?: string[];
  target: CardHolder;
  /** Gear into a full slot: the card it pushes to the locker. */
  replaces?: string;
}

/** The forced Curse pack, taken (#627). The curse itself is an EffectFact on the same facts. */
export interface CurseApplication {
  type: 'curse';
  round: number;
  teamId: string;
  effectId: string;
}

export interface GearMove {
  type: 'move';
  round: number;
  teamId: string;
  cardId: string;
  /** Where this copy sits now (#556): with two of the same card, names which one moves. Absent = the first found. */
  from?: CardHolder | 'locker';
  to: CardHolder | 'locker';
}

export type CardFact = PackApplication | CurseApplication | GearMove;

export interface DealtPack {
  round: number;
  teamId: string;
  tier: PackTier;
  kind: PackKind;
  /** PACK_SIZE distinct cards, in deal order, at the player's scale. */
  cards: Card[];
}

/** What is on the table this round (#627). */
export interface PackOffer {
  round: number;
  teamId: string;
  tier: PackTier;
  /** 'choice': pick one of `packs` (two). 'single': the one pack. 'curse': `curse` is forced. */
  kind: 'choice' | 'single' | 'curse';
  packs: PackKind[];
  curse?: EffectFact;
}

/** Hook: who gets a pack. CPU teams don't (#478, Pax: packs are the player's edge). */
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

const isGear = (c: Card) => c.kind === 'equipment' || c.kind === 'upgrade' || c.kind === 'facility';

/** A card as the player holds it: a run-deck card as written, × 2 for gear (#627); a grid-deck card × 3, and × 2 again for gear. */
export function playerCard(c: Card): Card {
  const k = (c.deck === 'run' ? 1 : PLAYER_CARD_SCALE) * (isGear(c) ? GEAR_STRENGTH : 1);
  return k === 1 ? c : { ...c, stats: c.stats.map(s => ({ ...s, pct: s.pct * k })) };
}

/**
 * The offer for a team this round (#627): seeded on its own stream. A
 * choice is two different places; a curse comes with its effect drawn. Null
 * for a team that gets no pack.
 */
export function packOffer(facts: SeasonFacts, round: number, teamId: string): PackOffer | null {
  if (!teamGetsPack(facts, teamId)) return null;
  const tier = packTierFor(facts, round, teamId);
  const rng = mulberry32(deriveSeed(facts.setup.seed, 'season', 'offer', round, teamId));
  const roll = rng() * (OFFER_ODDS.choice + OFFER_ODDS.single + OFFER_ODDS.curse);
  const places = shuffle(TARGETS, rng);
  if (roll < OFFER_ODDS.choice) return { round, teamId, tier, kind: 'choice', packs: places.slice(0, 2) };
  if (roll < OFFER_ODDS.choice + OFFER_ODDS.single) return { round, teamId, tier, kind: 'single', packs: places.slice(0, 1) };
  return { round, teamId, tier, kind: 'curse', packs: [], curse: dealCurse(facts, round, teamId) };
}

/** The curse behind a Curse pack (#647): one of the eight named curses, uniform on its own stream, CURSE_LIFE races. */
export function dealCurse(facts: SeasonFacts, round: number, teamId: string): EffectFact {
  const rng = mulberry32(deriveSeed(facts.setup.seed, 'season', 'curse', round, teamId));
  const c = RUN_CURSES[Math.floor(rng() * RUN_CURSES.length)];
  return {
    type: 'effect', round, teamId, id: `curse-${round}`, name: c.name, emoji: '🪦', source: 'curse',
    target: { kind: c.target }, stats: c.stats.map(s => ({ ...s })), timer: { races: CURSE_LIFE },
  };
}

/** One card off a stream for a place, from the run deck: three rng draws (kind, metal, pick). */
function dealOne(rng: () => number, tier: PackTier, place: PackKind): Card {
  const kindRoll = rng();
  const pool = kindRoll < TRAIT_CHANCE ? cardsBy({ kind: 'trait', target: place }, RUN_DECK) : cardsBy({ kind: GEAR_KIND[place] }, RUN_DECK);
  const card = pickCard(pool, PACK_ODDS[tier], rng);
  if (!card) throw new Error(`pack: empty pool for ${place}`);
  return playerCard(card);
}

/**
 * The pack a team opens: PACK_SIZE distinct cards of its tier for `kind`'s
 * place, at the player's scale. Pure: the same seed and standings deal the
 * same cards; each card has its own sub-stream and redraws on a duplicate.
 * Null for a team that gets no pack or an offer without that pack.
 */
export function dealPack(facts: SeasonFacts, round: number, teamId: string, kind: PackKind): DealtPack | null {
  const offer = packOffer(facts, round, teamId);
  if (!offer || !offer.packs.includes(kind)) return null;
  const cards: Card[] = [];
  for (let i = 0; i < PACK_SIZE; i++) {
    const rng = mulberry32(deriveSeed(facts.setup.seed, 'season', 'pack', round, teamId, kind, i));
    let c = dealOne(rng, offer.tier, kind);
    for (let tries = 0; cards.some(x => x.id === c.id) && tries < 20; tries++) c = dealOne(rng, offer.tier, kind);
    cards.push(c);
  }
  return { round, teamId, tier: offer.tier, kind, cards };
}

// ---------------------------------------------------------------------------
// A team's cards, derived from the log

export interface TeamCardState {
  /** Per drafted driver. */
  drivers: Record<number, { traits: Card[]; equipment: Card[] }>;
  car: { traits: Card[]; upgrade: Card[] };
  team: { traits: Card[]; facility: Card[] };
  locker: Card[];
  slots: Slots;
  /** Gear mileage (#627): races left per gear card id held (the fewest, with two copies). */
  mileage: Record<string, number>;
}

/** A card by id (either deck), as the player holds it. */
function card(id: string): Card {
  const c = cardById(id);
  if (!c) throw new Error(`pack: no card ${id}`);
  return playerCard(c);
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

const ids = (xs: Card[]) => xs.map(c => c.id);
const cards = (xs: string[]) => xs.map(card);

/** The round the facts stand at: the one in play (results so far). */
export function currentRound(facts: SeasonFacts): number {
  return facts.results.length;
}

/** Races a gear card dealt in `dealt` still has in `round` (≤ 0 = worn out). */
export const gearLeft = (dealt: number, round: number) => dealt + GEAR_LIFE - round;

/** A team's cards as ids by holder, with each gear card's deal round re-dated
 * to the league after (#597): what carries up a run. */
export function carriedCards(state: TeamCardState, races: number): CarriedCards {
  const gearDealt: Record<string, number> = {};
  for (const [id, left] of Object.entries(state.mileage)) gearDealt[id] = left - GEAR_LIFE; // live from round left − GEAR_LIFE
  void races;
  return {
    drivers: Object.fromEntries(Object.entries(state.drivers).map(([id, d]) => [id, { traits: ids(d.traits), equipment: ids(d.equipment) }])),
    car: { traits: ids(state.car.traits), upgrade: ids(state.car.upgrade) },
    team: { traits: ids(state.team.traits), facility: ids(state.team.facility) },
    locker: ids(state.locker),
    gearDealt,
  };
}

function allTraits(state: TeamCardState): Card[] {
  return [...state.team.traits, ...state.car.traits, ...Object.values(state.drivers).flatMap(d => d.traits)];
}

/**
 * Fold the team's card log through `round` (inclusive) onto its drafted
 * entities, starting from the cards it carried into this league (#597), with
 * gear mileage (#627): gear dealt GEAR_LIFE or more rounds before `round` is
 * worn out and dropped wherever it sat. Throws on a fact that can't apply, so
 * a bad log never half-applies.
 */
export function teamCardState(facts: SeasonFacts, teamId: string, round: number = currentRound(facts)): TeamCardState {
  const pool = poolFor(facts);
  const roster = draftState(pool, facts.draftPicks).rosters[teamId];
  if (!roster) throw new Error(`pack: unknown team ${teamId}`);
  const carried = facts.setup.carry?.teamId === teamId ? facts.setup.carry.cards : null;
  // Deal round per gear card id (the latest copy's), to know what has worn out.
  const dealtAt: Record<string, number> = { ...(carried?.gearDealt ?? {}) };
  const worn = (id: string) => dealtAt[id] !== undefined && gearLeft(dealtAt[id], round) <= 0;
  const state: TeamCardState = {
    drivers: Object.fromEntries(roster.driverIds.map(id => {
      const c = carried?.drivers[id];
      return [id, { traits: cards(c?.traits ?? []), equipment: cards((c?.equipment ?? []).filter(x => !worn(x))) }];
    })),
    car: { traits: cards(carried?.car.traits ?? []), upgrade: cards((carried?.car.upgrade ?? []).filter(x => !worn(x))) },
    team: { traits: cards(carried?.team.traits ?? []), facility: cards((carried?.team.facility ?? []).filter(x => !worn(x))) },
    locker: cards((carried?.locker ?? []).filter(x => !worn(x))),
    slots: slotsFor([]),
    mileage: {},
  };
  state.slots = slotsFor(allTraits(state));
  for (const f of facts.cardFacts) {
    if (f.teamId !== teamId || f.round > round) continue;
    if (f.type === 'curse') continue; // the curse lives on the effects (#332)
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
        state.slots = slotsFor(allTraits(state));
      } else {
        if (!fits(c, f.target)) throw new Error(`pack: ${c.kind} does not fit a ${f.target.kind}`);
        dealtAt[c.id] = f.round;
        if (gearLeft(f.round, round) <= 0) continue; // worn out by now: never arrives in this fold
        const slot = gearSlot(state, f.target);
        if (slot.length >= capacity(state, f.target)) {
          if (!f.replaces) throw new Error('pack: the slot is full; name what the card replaces');
          state.locker.push(take(slot, f.replaces));
        } else if (f.replaces && !worn(f.replaces)) {
          throw new Error('pack: nothing to replace; the slot has room');
        }
        slot.push(c);
      }
    } else {
      // A move: find the card wherever it sits on this team, then place it.
      const sources: Card[][] = [state.locker, ...Object.values(state.drivers).map(d => d.equipment), state.car.upgrade, state.team.facility];
      const from = f.from ? (f.from === 'locker' ? state.locker : gearSlot(state, f.from)) : sources.find(s => s.some(x => x.id === f.cardId));
      if (worn(f.cardId) && !(from && from.some(x => x.id === f.cardId))) continue; // moving gear that has since worn out
      if (from && !from.some(x => x.id === f.cardId)) throw new Error(`pack: card ${f.cardId} is not there`);
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
  const held = [...state.locker, ...Object.values(state.drivers).flatMap(d => d.equipment), ...state.car.upgrade, ...state.team.facility];
  for (const g of held) if (dealtAt[g.id] !== undefined) state.mileage[g.id] = gearLeft(dealtAt[g.id], round);
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

/** Gear mileage as display infos per driver (#627): the gear racing with
 * them (own equipment, the car's upgrade, the team's facility) and its races left. */
export function gearInfos(facts: SeasonFacts, round: number): Record<number, EffectInfo[]> {
  const pool = poolFor(facts);
  const rosters = draftState(pool, facts.draftPicks).rosters;
  const out: Record<number, EffectInfo[]> = {};
  const info = (c: Card, left: number): EffectInfo => ({ id: c.id, name: c.name, emoji: '🧰', source: 'gear', left: `${left} race${left === 1 ? '' : 's'} left` });
  for (const t of pool.teams) {
    if (!teamGetsPack(facts, t.id)) continue;
    const s = teamCardState(facts, t.id, round);
    const shared = [...s.car.upgrade, ...s.team.facility];
    for (const id of rosters[t.id].driverIds) {
      const mine = [...s.drivers[id].equipment, ...shared].filter(c => s.mileage[c.id] !== undefined);
      if (mine.length) out[id] = mine.map(c => info(c, s.mileage[c.id]));
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Applying, with validation

/** Has this team opened its pack this round (or has none to open)? */
export function packOpened(facts: SeasonFacts, round: number, teamId: string): boolean {
  if (!teamGetsPack(facts, teamId)) return true;
  return facts.cardFacts.some(f => (f.type === 'pack' || f.type === 'curse') && f.round === round && f.teamId === teamId);
}

/** The offer waiting for the team on the clock, or null. */
export function pendingOffer(facts: SeasonFacts): PackOffer | null {
  const state = seasonState(facts);
  if (state.phase !== 'paddock' || !state.whoseTurn) return null;
  if (packOpened(facts, state.round, state.whoseTurn)) return null;
  return packOffer(facts, state.round, state.whoseTurn);
}

/** The first pack of the pending offer, dealt (a curse offer has none). Tests and the quick path. */
export function pendingPack(facts: SeasonFacts, kind?: PackKind): DealtPack | null {
  const offer = pendingOffer(facts);
  if (!offer || offer.kind === 'curse') return null;
  const pick = kind ?? offer.packs[0];
  return offer.packs.includes(pick) ? dealPack(facts, offer.round, offer.teamId, pick) : null;
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
  const offer = packOffer(facts, app.round, app.teamId);
  if (!offer) return `${app.teamId} gets no pack`;
  if (packOpened(facts, app.round, app.teamId)) return 'the pack is already open';
  if (offer.kind === 'curse') return 'the offer is a Curse pack; take the curse';
  if (!app.pack) return `name the pack picked (${offer.packs.join(' or ')})`;
  if (!offer.packs.includes(app.pack)) return `the offer is ${offer.packs.join(' or ')}, not ${app.pack}`;
  const dealt = dealPack(facts, app.round, app.teamId, app.pack)!;
  if (app.tier !== dealt.tier) return `the pack is ${dealt.tier}, not ${app.tier}`;
  const ids = dealt.cards.map(c => c.id);
  if (!app.dealt || app.dealt.join(',') !== ids.join(',')) return `the pack dealt ${ids.join(', ')}; record all three`;
  if (!ids.includes(app.cardId)) return `${app.cardId} was not in the pack (${ids.join(', ')})`;
  return tryApply(facts, app);
}

export function validateCurse(facts: SeasonFacts, app: CurseApplication): string | null {
  const clock = onTheClock(facts, app);
  if (clock) return clock;
  const offer = packOffer(facts, app.round, app.teamId);
  if (!offer) return `${app.teamId} gets no pack`;
  if (packOpened(facts, app.round, app.teamId)) return 'the pack is already open';
  if (offer.kind !== 'curse') return 'the offer is not a Curse pack';
  if (app.effectId !== offer.curse!.id) return `the curse is ${offer.curse!.id}`;
  return null;
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

/** Take the forced curse (#627): the fact, and the effect it is. Pure; throws when it isn't yours to take. */
export function applyCurse(facts: SeasonFacts, app: CurseApplication): SeasonFacts {
  const why = validateCurse(facts, app);
  if (why) throw new Error(`pack: ${why}`);
  const curse = packOffer(facts, app.round, app.teamId)!.curse!;
  return { ...facts, cardFacts: [...facts.cardFacts, app], effectFacts: [...(facts.effectFacts ?? []), curse] };
}

/** Move gear between the locker and your slots. Pure; throws on an illegal move. */
export function moveGear(facts: SeasonFacts, move: GearMove): SeasonFacts {
  const why = validateGearMove(facts, move);
  if (why) throw new Error(`pack: ${why}`);
  return { ...facts, cardFacts: [...facts.cardFacts, move] };
}
