// Stamps and Parcels (#704; Steward's spec Oct 14, Pax: two drivers; docs/RUN.md).
//
// The deck builder, slimmed: each DRIVER CARD and your CAR CARD build up over
// the run with STAMPS. A stamp is a card from the run deck (cards/runDeck.ts)
// held for good on one driver or the car: gear and traits merge, nothing
// wears out, no locker, no hand. applyCards is unchanged: a stamp is a held
// card, written as the player reads it (a Bronze "+3 Speed" is 15 points).
//
// SLOTS: STAMP_SLOTS.driver per driver card, STAMP_SLOTS.car on the car card
// (the car and the garage share it: car gear, car traits, team gear and team
// traits all go there). A full card means a stamp is SCRAPED OFF to make room:
// the Parcel fact names what it `replaces`, and that stamp is gone.
//
// PARCELS arrive before every race: pick 1 of 3 (the metal odds follow your
// table position, as packs did: leader Common, last Legendary, round 1
// Uncommon). Sometimes it is a WATCHER GIFT (Gold and Iridium odds; never at
// Locals), sometimes it is SMUDGED: no stamp, a bad one for one race (one of
// the eight named curses, an effect, #332). A Parcel can be left in the box.
//
// TITLE STAMPS: winning a title puts a stamp on the ribbon, outside the slots:
// each driver picks a stat, +TITLE_STAMP_LEVELS levels, on TITLE_STAMP_STATS
// stats for the step (one at Locals, two at State). The run records the picks
// on the TitleFact; they reach the next step through the carry (`titles`).
//
// Facts: the Parcel is derived (seed + standings → the same three stamps);
// the PARCEL fact records what was dealt, what was kept and where (or that it
// was left), and what it replaced; a SMUDGE fact records the smudge taken.
// Rivals never get Parcels (#478) and keep their genesis traits.

import { mulberry32, deriveSeed } from '../engine/rng';
import { RUN_DECK, RUN_CURSES, cardById, cardsBy, pickCard, GEAR_KIND, type Card, type CardTarget, type DriverStatKey } from '../cards';
import type { RarityOdds } from '../cards/rarity';
import type { CarriedCards, SeasonCards } from './genesis';
import { draftState } from './draft';
import { constructorStandings, isHuman, poolFor, seasonState, type SeasonFacts } from './season';
import { isOut } from './format';
import type { EffectFact } from './effects';
import { POINTS_PER_LEVEL } from './grades';
import { stepName, type Step } from '../look/step';

/** Stamps a card holds: four on a driver card, five on the car card (car + garage). */
export const STAMP_SLOTS = { driver: 4, car: 5 } as const;
/** Stamps a Parcel holds; the player keeps one. */
export const PARCEL_SIZE = 3;
/** Of 100 Parcels: Watcher gifts (none at Locals) and smudged ones. The rest are league issue. */
export const PARCEL_ODDS = { gift: 10, smudge: 10 };
/** Where a stamp is for: a driver (either), the car, the garage; weights. */
export const PLACE_ODDS: Record<CardTarget, number> = { driver: 2, car: 1, team: 1 };
export const TRAIT_CHANCE = 0.25;
/** A smudge (a curse, #647): one of RUN_CURSES, for this many races. */
export const SMUDGE_LIFE = 1;
/** A title stamp: this many levels on each stat picked; stats per step. */
export const TITLE_STAMP_LEVELS = 6;
export const TITLE_STAMP_STATS: Partial<Record<Step, number>> = { locals: 1, state: 2 };
/** History: a grid-deck card (deck.ts) at the player's scale (#627). Stamps come from the run deck, written as held; the Glossary still shows grid cards this way. */
export const PLAYER_CARD_SCALE = 3;

export type ParcelTier = 'common' | 'uncommon' | 'rare' | 'legendary';
export const PARCEL_TIERS: ParcelTier[] = ['common', 'uncommon', 'rare', 'legendary'];
export const FIRST_PARCEL_TIER: ParcelTier = 'uncommon';
/** Odds of a stamp's metal, per tier (B/S/G/I). Data; tune here. */
export const PARCEL_METAL: Record<ParcelTier, RarityOdds> = {
  common: { bronze: 60, silver: 30, gold: 9, iridium: 1 },
  uncommon: { bronze: 52, silver: 32, gold: 13, iridium: 3 },
  rare: { bronze: 43, silver: 34, gold: 18, iridium: 5 },
  legendary: { bronze: 35, silver: 35, gold: 22, iridium: 8 },
};
/** A Watcher gift: Gold and Iridium only. */
export const GIFT_METAL: RarityOdds = { bronze: 0, silver: 0, gold: 70, iridium: 30 };

/** Where a stamp goes: one of your drivers, or the car card (car and garage). */
export type StampHolder = { kind: 'driver'; id: number } | { kind: 'car' };

export interface ParcelFact {
  type: 'parcel';
  round: number;
  teamId: string;
  tier: ParcelTier;
  gift?: boolean;
  /** The PARCEL_SIZE stamps dealt, in deal order. */
  dealt: string[];
  /** The stamp kept, or null: left in the box. */
  cardId: string | null;
  holder?: StampHolder;
  /** A full card: the stamp scraped off to make room. */
  replaces?: string;
}

/** A smudged Parcel, taken. The smudge itself is an EffectFact on the same facts. */
export interface SmudgeFact {
  type: 'smudge';
  round: number;
  teamId: string;
  effectId: string;
}

export type CardFact = ParcelFact | SmudgeFact;

/** What is on the doorstep this round. */
export interface Parcel {
  round: number;
  teamId: string;
  tier: ParcelTier;
  kind: 'plain' | 'gift' | 'smudged';
  /** PARCEL_SIZE distinct stamps (none when smudged). */
  cards: Card[];
  smudge?: EffectFact;
}

/** A team's stamps, derived from the log: per driver card, the car card, and the title stamps on each ribbon. */
export interface StampState {
  drivers: Record<number, Card[]>;
  car: Card[];
  titles: Record<number, Card[]>;
}

// ---------------------------------------------------------------------------
// Title stamps

export const TITLE_STAMP_PREFIX = 'title-';

/** The stamp a title puts on a driver's ribbon: +TITLE_STAMP_LEVELS levels on one stat. Pure in (step, stat); the id carries both. */
export function titleStamp(step: Step, stat: DriverStatKey): Card {
  return {
    id: `${TITLE_STAMP_PREFIX}${step}-${stat}`, name: `${stepName(step)} title`, kind: 'trait', target: 'driver', rarity: 'gold',
    stats: [{ stat, pct: TITLE_STAMP_LEVELS * POINTS_PER_LEVEL }], tag: 'any', deck: 'run',
  };
}

/** A stamp by id: a run-deck (or grid) card, or a title stamp. */
export function stampById(id: string): Card | undefined {
  if (id.startsWith(TITLE_STAMP_PREFIX)) {
    const m = /^title-([a-z]+)-([A-Za-z]+)$/.exec(id);
    return m ? titleStamp(m[1] as Step, m[2] as DriverStatKey) : undefined;
  }
  return cardById(id);
}

function stamp(id: string): Card {
  const c = stampById(id);
  if (!c) throw new Error(`stamps: no card ${id}`);
  return c;
}

// ---------------------------------------------------------------------------
// The Parcel

/** Hook: who gets a Parcel. CPU teams don't (#478: kit is the player's edge). */
export function teamGetsParcel(facts: SeasonFacts, teamId: string): boolean {
  return isHuman(facts, teamId) && !isOut(facts, teamId);
}

/** Standing rank → tier, in quarters of the grid: leader Common, last Legendary. */
export function parcelTierForRank(rank: number, teamCount: number): ParcelTier {
  const q = Math.min(3, Math.floor(((rank - 1) * 4) / teamCount));
  return PARCEL_TIERS[q];
}

/** The facts as they stood before `round` was raced (for replaying a deal). */
function factsThrough(facts: SeasonFacts, round: number): SeasonFacts {
  return facts.results.length <= round ? facts : { ...facts, results: facts.results.slice(0, round) };
}

export function parcelTierFor(facts: SeasonFacts, round: number, teamId: string): ParcelTier {
  if (round === 0) return FIRST_PARCEL_TIER;
  const standings = constructorStandings(factsThrough(facts, round));
  const rank = standings.find(s => s.teamId === teamId)?.rank;
  if (!rank) throw new Error(`stamps: unknown team ${teamId}`);
  return parcelTierForRank(rank, facts.setup.teamCount);
}

/** The smudge behind a smudged Parcel: one of the eight named curses, uniform on its own stream, SMUDGE_LIFE races. */
export function dealSmudge(facts: SeasonFacts, round: number, teamId: string): EffectFact {
  const rng = mulberry32(deriveSeed(facts.setup.seed, 'season', 'smudge', round, teamId));
  const c = RUN_CURSES[Math.floor(rng() * RUN_CURSES.length)];
  return {
    type: 'effect', round, teamId, id: `smudge-${round}`, name: c.name, emoji: '', source: 'curse',
    target: { kind: c.target }, stats: c.stats.map(s => ({ ...s })), timer: { races: SMUDGE_LIFE },
  };
}

const PLACES: CardTarget[] = ['driver', 'car', 'team'];

/** One stamp off a stream: three draws (place, trait or gear, the pick by metal). */
function dealOne(rng: () => number, odds: RarityOdds): Card {
  const total = PLACES.reduce((s, p) => s + PLACE_ODDS[p], 0);
  let x = rng() * total;
  let place: CardTarget = PLACES[PLACES.length - 1];
  for (const p of PLACES) { x -= PLACE_ODDS[p]; if (x < 0) { place = p; break; } }
  const pool = rng() < TRAIT_CHANCE ? cardsBy({ kind: 'trait', target: place }, RUN_DECK) : cardsBy({ kind: GEAR_KIND[place] }, RUN_DECK);
  const card = pickCard(pool, odds, rng);
  if (!card) throw new Error(`stamps: empty pool for ${place}`);
  return card;
}

/**
 * The Parcel for a team this round: seeded on its own stream. Its kind first
 * (a Watcher gift never at Locals; a smudge comes with its curse drawn), then
 * PARCEL_SIZE distinct stamps, each on its own sub-stream, redrawn on a
 * duplicate or a stamp the team already holds (#723: one copy per id). Null
 * for a team that gets no Parcel.
 */
export function parcelFor(facts: SeasonFacts, round: number, teamId: string): Parcel | null {
  if (!teamGetsParcel(facts, teamId)) return null;
  const tier = parcelTierFor(facts, round, teamId);
  const rng = mulberry32(deriveSeed(facts.setup.seed, 'season', 'parcel', round, teamId));
  const roll = rng() * 100;
  const gift = facts.setup.league?.step === 'locals' ? 0 : PARCEL_ODDS.gift;
  const kind: Parcel['kind'] = roll < gift ? 'gift' : roll < gift + PARCEL_ODDS.smudge ? 'smudged' : 'plain';
  if (kind === 'smudged') return { round, teamId, tier, kind, cards: [], smudge: dealSmudge(facts, round, teamId) };
  const odds = kind === 'gift' ? GIFT_METAL : PARCEL_METAL[tier];
  const held = heldStamps(facts, teamId, round);
  const cards: Card[] = [];
  for (let i = 0; i < PARCEL_SIZE; i++) {
    const r = mulberry32(deriveSeed(facts.setup.seed, 'season', 'parcel', round, teamId, 'stamp', i));
    let c = dealOne(r, odds);
    for (let tries = 0; (cards.some(x => x.id === c.id) || held.has(c.id)) && tries < 40; tries++) c = dealOne(r, odds);
    cards.push(c);
  }
  return { round, teamId, tier, kind, cards };
}

// ---------------------------------------------------------------------------
// A team's stamps, derived from the log

/** The round the facts stand at: the one in play (results so far). */
export function currentRound(facts: SeasonFacts): number {
  return facts.results.length;
}

/** The card a holder is: the driver's stamps or the car card's. */
export function cardOf(state: StampState, holder: StampHolder): Card[] {
  if (holder.kind === 'car') return state.car;
  const d = state.drivers[holder.id];
  if (!d) throw new Error(`stamps: driver ${holder.id} is not on this team`);
  return d;
}

/** Whether a stamp fits a holder: driver stamps on a driver card, car and garage stamps on the car card. */
export function holderFits(c: Card, holder: StampHolder): boolean {
  return holder.kind === 'driver' ? c.target === 'driver' : c.target !== 'driver';
}

export const slotsOf = (holder: StampHolder): number => STAMP_SLOTS[holder.kind];

const ids = (xs: Card[]) => xs.map(c => c.id);
const cards = (xs: string[]) => xs.map(stamp);

/** Every stamp a team holds going into `round`, by id (slots and ribbons). */
export function heldStamps(facts: SeasonFacts, teamId: string, round: number): Set<string> {
  const s = teamStamps(facts, teamId, round);
  return new Set([...Object.values(s.drivers).flat(), ...s.car, ...Object.values(s.titles).flat()].map(c => c.id));
}

/** A team's stamps as ids by card: what carries up a run. */
export function carriedStamps(state: StampState): CarriedCards {
  return {
    drivers: Object.fromEntries(Object.entries(state.drivers).map(([id, d]) => [id, ids(d)])),
    car: ids(state.car),
    titles: Object.fromEntries(Object.entries(state.titles).map(([id, d]) => [id, ids(d)])),
  };
}

/**
 * Fold the team's log through `round` (inclusive) onto its cards, starting
 * from the stamps it carried into this league (#597). Throws on a fact that
 * can't apply, so a bad log never half-applies.
 */
export function teamStamps(facts: SeasonFacts, teamId: string, round: number = currentRound(facts)): StampState {
  const pool = poolFor(facts);
  const roster = draftState(pool, facts.draftPicks).rosters[teamId];
  if (!roster) throw new Error(`stamps: unknown team ${teamId}`);
  const carried = facts.setup.carry?.teamId === teamId ? facts.setup.carry.cards : null;
  const state: StampState = {
    drivers: Object.fromEntries(roster.driverIds.map(id => [id, cards(carried?.drivers[id] ?? [])])),
    car: cards(carried?.car ?? []),
    titles: Object.fromEntries(roster.driverIds.map(id => [id, cards(carried?.titles?.[id] ?? [])])),
  };
  for (const f of facts.cardFacts) {
    if (f.teamId !== teamId || f.round > round) continue;
    if (f.type === 'smudge' || f.cardId === null) continue; // the smudge lives on the effects (#332); a box left shut
    if (!f.holder) throw new Error('stamps: say where the stamp goes');
    const c = stamp(f.cardId);
    if (!holderFits(c, f.holder)) throw new Error(`stamps: a ${c.target} stamp does not go on the ${f.holder.kind} card`);
    const slot = cardOf(state, f.holder);
    if (slot.length >= slotsOf(f.holder)) {
      if (!f.replaces) throw new Error('stamps: the card is full; name the stamp it replaces');
      const i = slot.findIndex(x => x.id === f.replaces);
      if (i < 0) throw new Error(`stamps: ${f.replaces} is not on that card`);
      slot.splice(i, 1);
    } else if (f.replaces) {
      throw new Error('stamps: nothing to scrape off; the card has room');
    }
    slot.push(c);
  }
  return state;
}

/** Every team's stamps for a round, in the shape seasonRoster takes: car-card stamps split by where they apply. */
export function seasonCardsFor(facts: SeasonFacts, round: number): SeasonCards {
  const pool = poolFor(facts);
  const rosters = draftState(pool, facts.draftPicks).rosters;
  const out: Required<SeasonCards> = { driver: {}, car: {}, team: {} };
  for (const t of pool.teams) {
    const s = teamStamps(facts, t.id, round);
    for (const [id, d] of Object.entries(s.drivers)) out.driver[Number(id)] = [...d, ...(s.titles[Number(id)] ?? [])];
    if (rosters[t.id].carId) out.car[rosters[t.id].carId!] = s.car.filter(c => c.target === 'car');
    out.team[t.id] = s.car.filter(c => c.target === 'team');
  }
  return out;
}

// ---------------------------------------------------------------------------
// Applying, with validation

/** Has this team opened its Parcel this round (or has none to open)? */
export function parcelOpened(facts: SeasonFacts, round: number, teamId: string): boolean {
  if (!isHuman(facts, teamId) || isOut(facts, teamId, round)) return true;
  return facts.cardFacts.some(f => f.round === round && f.teamId === teamId);
}

/** The Parcel waiting for the team on the clock, or null. */
export function pendingParcel(facts: SeasonFacts): Parcel | null {
  const state = seasonState(facts);
  if (state.phase !== 'paddock' || !state.whoseTurn) return null;
  if (parcelOpened(facts, state.round, state.whoseTurn)) return null;
  return parcelFor(facts, state.round, state.whoseTurn);
}

/** Only the team on the clock, in the current round, touches its stamps. */
function onTheClock(facts: SeasonFacts, f: CardFact): string | null {
  const state = seasonState(facts);
  if (state.phase !== 'paddock') return `not in the Paddock (${state.phase})`;
  if (f.round !== state.round) return `round ${f.round} is not the current round (${state.round})`;
  if (f.teamId !== state.whoseTurn) return `${f.teamId} is not on the clock (${state.whoseTurn} is)`;
  return null;
}

export function validateParcel(facts: SeasonFacts, f: ParcelFact): string | null {
  const clock = onTheClock(facts, f);
  if (clock) return clock;
  const parcel = parcelFor(facts, f.round, f.teamId);
  if (!parcel) return `${f.teamId} gets no Parcel`;
  if (parcelOpened(facts, f.round, f.teamId)) return 'the Parcel is already open';
  if (parcel.kind === 'smudged') return 'the Parcel is smudged; take the smudge';
  if (f.tier !== parcel.tier) return `the Parcel is ${parcel.tier}, not ${f.tier}`;
  if (!!f.gift !== (parcel.kind === 'gift')) return parcel.kind === 'gift' ? 'the Parcel is a gift; say so' : 'the Parcel is league issue, not a gift';
  const dealt = parcel.cards.map(c => c.id);
  if (f.dealt.join(',') !== dealt.join(',')) return `the Parcel dealt ${dealt.join(', ')}; record all three`;
  if (f.cardId === null) return f.holder || f.replaces ? 'a Parcel left in the box goes nowhere' : null;
  if (!dealt.includes(f.cardId)) return `${f.cardId} was not in the Parcel (${dealt.join(', ')})`;
  if (!f.holder) return 'say where the stamp goes';
  try {
    teamStamps({ ...facts, cardFacts: [...facts.cardFacts, f] }, f.teamId);
    return null;
  } catch (e) {
    return (e as Error).message.replace(/^stamps: /, '');
  }
}

export function validateSmudge(facts: SeasonFacts, f: SmudgeFact): string | null {
  const clock = onTheClock(facts, f);
  if (clock) return clock;
  const parcel = parcelFor(facts, f.round, f.teamId);
  if (!parcel) return `${f.teamId} gets no Parcel`;
  if (parcelOpened(facts, f.round, f.teamId)) return 'the Parcel is already open';
  if (parcel.kind !== 'smudged') return 'the Parcel is not smudged';
  if (f.effectId !== parcel.smudge!.id) return `the smudge is ${parcel.smudge!.id}`;
  return null;
}

/** Open the Parcel: keep a stamp onto a card (scraping one off when it is full), or leave it. Pure; throws on an illegal fact. */
export function openParcel(facts: SeasonFacts, f: ParcelFact): SeasonFacts {
  const why = validateParcel(facts, f);
  if (why) throw new Error(`stamps: ${why}`);
  return { ...facts, cardFacts: [...facts.cardFacts, f] };
}

/** Take the smudge: the fact, and the effect it is. Pure; throws when it isn't yours to take. */
export function takeSmudge(facts: SeasonFacts, f: SmudgeFact): SeasonFacts {
  const why = validateSmudge(facts, f);
  if (why) throw new Error(`stamps: ${why}`);
  const smudge = parcelFor(facts, f.round, f.teamId)!.smudge!;
  return { ...facts, cardFacts: [...facts.cardFacts, f], effectFacts: [...(facts.effectFacts ?? []), smudge] };
}
