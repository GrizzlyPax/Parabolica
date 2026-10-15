// Stamps and Parcels (#704; Steward's build spec and Pax's answers, Oct 15; docs/RUN.md).
//
// The deck builder, slimmed: each DRIVER CARD and your CAR CARD build up over
// the run with STAMPS. A stamp is a card from the run deck (cards/runDeck.ts)
// held on one driver or the car. applyCards is unchanged: a stamp is a held
// card at the player's scale (`playerCard`: the run deck as written, gear × 2;
// a grid-deck card × 3). Two kinds (Pax: "permanent plus fading ink"):
//   PERMANENT  a trait card: for the rest of the run.
//   INK        a gear card (equipment / upgrade / facility): × GEAR_STRENGTH,
//              and it FADES after GEAR_LIFE races wherever it sits (today's
//              mileage math); its slot is free the race after it fades.
//
// SLOTS: STAMP_SLOTS.driver per driver card, STAMP_SLOTS.car on the car card
// (the car and the garage share it: car and team cards both go there).
// Permanent and ink stamps share the slots. A full card means a stamp is
// SCRAPED OFF to make room: the Parcel fact names what it `replaces`, and
// that stamp is gone (no locker, no moving stamps between cards). Title
// stamps and smudges take no slot.
//
// PARCELS arrive before every race: pick 1 of 3 from the whole run deck (a
// trait with STAMP_TRAIT_CHANCE, else ink; the metal by your table position,
// as packs were: leader Common, last Legendary, round 1 Uncommon). One roll
// decides the Parcel's kind: SMUDGED (SMUDGE_ODDS: you still pick 1 of 3,
// and a curse is stamped over the car card for one race, forced, no slot),
// else a WATCHER GIFT (GIFT_ODDS by step: none at Locals; the legendary
// metal odds), else league issue. A Parcel can be left in the box.
//
// TITLE STAMPS: winning a title puts a stamp on the ribbon, outside the
// slots: each driver picks a stat, +TITLE_STAMP_LEVELS levels, on
// TITLE_STAMP_STATS stats for the step (one at Locals, two at State). The run
// records the picks on the TitleFact; they reach the next step through the
// carry (`titles`).
//
// Facts: the Parcel is derived (seed + standings → the same three stamps);
// the PARCEL fact records what was dealt, what was kept and where (or that it
// was left), what it replaced, and whether it was a gift; a smudged Parcel's
// curse is an EffectFact written with it. Rivals never get Parcels (#478)
// and keep their genesis traits.

import { mulberry32, deriveSeed } from '../engine/rng';
import { RUN_DECK, RUN_CURSES, cardById, cardsBy, pickCard, GEAR_KIND, type Card, type CardTarget, type DriverStatKey } from '../cards';
import type { RarityOdds } from '../cards/rarity';
import type { CarriedCards, SeasonCards } from './genesis';
import { draftState } from './draft';
import { constructorStandings, isHuman, poolFor, seasonState, type SeasonFacts } from './season';
import { isOut } from './format';
import type { EffectFact } from './effects';
import type { EffectInfo } from '../RaceEngine';
import { POINTS_PER_LEVEL } from './grades';
import { stepName, type Step } from '../look/step';

/** Stamps a card holds: four on a driver card, five on the car card (car + garage). */
export const STAMP_SLOTS = { driver: 4, car: 5 } as const;
/** Stamps a Parcel holds; the player keeps one. */
export const PARCEL_SIZE = 3;
/** A dealt stamp is a trait (permanent) this often; else gear (ink). */
export const STAMP_TRAIT_CHANCE = 0.5;
/** Ink (#627 mileage): gear is this many times stronger, and gone after GEAR_LIFE races. */
export const GEAR_STRENGTH = 2;
export const GEAR_LIFE = 3;
/** Of 100 Parcels, how many are Watcher gifts, by step (none at Locals); a season without a step counts as State. */
export const GIFT_ODDS: Partial<Record<Step, number>> & { default: number } = { locals: 0, state: 10, nationals: 15, default: 10 };
/** Of 100 Parcels, how many are smudged, at every step. */
export const SMUDGE_ODDS = 10;
/** Where a stamp is for: a driver (either), the car, the garage; weights. */
export const PLACE_ODDS: Record<CardTarget, number> = { driver: 2, car: 1, team: 1 };
/** A smudge (a curse, #647): one of RUN_CURSES, for this many races. */
export const SMUDGE_LIFE = 1;
/** A title stamp: this many levels on each stat picked; stats per step. */
export const TITLE_STAMP_LEVELS = 6;
export const TITLE_STAMP_STATS: Partial<Record<Step, number>> = { locals: 1, state: 2 };
/** A grid-deck card (deck.ts) at the player's scale (#627); the run deck is written as held. The Glossary shows grid cards this way. */
export const PLAYER_CARD_SCALE = 3;

export type ParcelTier = 'common' | 'uncommon' | 'rare' | 'legendary';
export const PARCEL_TIERS: ParcelTier[] = ['common', 'uncommon', 'rare', 'legendary'];
export const FIRST_PARCEL_TIER: ParcelTier = 'uncommon';
/** Odds of a stamp's metal, per tier (B/S/G/I). Data; tune here. A gift deals at the legendary odds. */
export const PARCEL_METAL: Record<ParcelTier, RarityOdds> = {
  common: { bronze: 60, silver: 30, gold: 9, iridium: 1 },
  uncommon: { bronze: 52, silver: 32, gold: 13, iridium: 3 },
  rare: { bronze: 43, silver: 34, gold: 18, iridium: 5 },
  legendary: { bronze: 35, silver: 35, gold: 22, iridium: 8 },
};

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

export type CardFact = ParcelFact;

/** What is on the doorstep this round. */
export interface Parcel {
  round: number;
  teamId: string;
  tier: ParcelTier;
  kind: 'plain' | 'gift' | 'smudged';
  /** PARCEL_SIZE distinct stamps. */
  cards: Card[];
  /** A smudged Parcel's curse: on the car card for SMUDGE_LIFE races, written when the Parcel is opened. */
  smudge?: EffectFact;
}

/** A team's stamps, derived from the log: per driver card, the car card, the title stamps on each ribbon, and each ink stamp's races left. */
export interface StampState {
  drivers: Record<number, Card[]>;
  car: Card[];
  titles: Record<number, Card[]>;
  /** Ink mileage: races left per ink stamp id held (≤ 0 never appears: it has faded). */
  mileage: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Cards at the player's scale

const isGear = (c: Card) => c.kind === 'equipment' || c.kind === 'upgrade' || c.kind === 'facility';
/** Ink or permanent? */
export const isInk = isGear;

/** A card as the player holds it: a run-deck card as written, × GEAR_STRENGTH for ink; a grid-deck card × PLAYER_CARD_SCALE, and × GEAR_STRENGTH again for gear. */
export function playerCard(c: Card): Card {
  const k = (c.deck === 'run' ? 1 : PLAYER_CARD_SCALE) * (isGear(c) ? GEAR_STRENGTH : 1);
  return k === 1 ? c : { ...c, stats: c.stats.map(s => ({ ...s, pct: s.pct * k })) };
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

/** A stamp by id, at the player's scale: a run-deck (or grid) card, or a title stamp. */
export function stampById(id: string): Card | undefined {
  if (id.startsWith(TITLE_STAMP_PREFIX)) {
    const m = /^title-([a-z]+)-([A-Za-z]+)$/.exec(id);
    return m ? titleStamp(m[1] as Step, m[2] as DriverStatKey) : undefined;
  }
  const c = cardById(id);
  return c && playerCard(c);
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

/** The curse a smudged Parcel carries: one of the eight named curses, uniform on its own stream, on the car card for SMUDGE_LIFE races. */
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
  const pool = rng() < STAMP_TRAIT_CHANCE ? cardsBy({ kind: 'trait', target: place }, RUN_DECK) : cardsBy({ kind: GEAR_KIND[place] }, RUN_DECK);
  const card = pickCard(pool, odds, rng);
  if (!card) throw new Error(`stamps: empty pool for ${place}`);
  return playerCard(card);
}

/** Gift odds at a step (none at Locals). */
export function giftOddsFor(facts: SeasonFacts): number {
  const step = facts.setup.league?.step;
  if (!step) return GIFT_ODDS.default;
  return GIFT_ODDS[step] ?? GIFT_ODDS.default;
}

/**
 * The Parcel for a team this round: seeded on its own stream. One roll for
 * its kind (smudged at the top of the range, then the gift chance, else
 * league issue), then PARCEL_SIZE distinct stamps, each on its own
 * sub-stream, redrawn on a duplicate or a stamp the team already holds
 * (#723: one copy per id). Null for a team that gets no Parcel.
 */
export function parcelFor(facts: SeasonFacts, round: number, teamId: string): Parcel | null {
  if (!teamGetsParcel(facts, teamId)) return null;
  const tier = parcelTierFor(facts, round, teamId);
  const rng = mulberry32(deriveSeed(facts.setup.seed, 'season', 'parcel', round, teamId));
  const roll = rng() * 100;
  const kind: Parcel['kind'] = roll >= 100 - SMUDGE_ODDS ? 'smudged' : roll < giftOddsFor(facts) ? 'gift' : 'plain';
  const odds = kind === 'gift' ? PARCEL_METAL.legendary : PARCEL_METAL[tier];
  const held = heldStamps(facts, teamId, round);
  const cards: Card[] = [];
  for (let i = 0; i < PARCEL_SIZE; i++) {
    const r = mulberry32(deriveSeed(facts.setup.seed, 'season', 'parcel', round, teamId, 'stamp', i));
    let c = dealOne(r, odds);
    for (let tries = 0; (cards.some(x => x.id === c.id) || held.has(c.id)) && tries < 40; tries++) c = dealOne(r, odds);
    cards.push(c);
  }
  return { round, teamId, tier, kind, cards, ...(kind === 'smudged' ? { smudge: dealSmudge(facts, round, teamId) } : {}) };
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

/** Races an ink stamp dealt in `dealt` still has in `round` (≤ 0 = faded). */
export const inkLeft = (dealt: number, round: number) => dealt + GEAR_LIFE - round;

const ids = (xs: Card[]) => xs.map(c => c.id);

/** Every stamp a team holds going into `round`, by id (slots and ribbons; faded ink is not held). */
export function heldStamps(facts: SeasonFacts, teamId: string, round: number): Set<string> {
  const s = teamStamps(facts, teamId, round);
  return new Set([...Object.values(s.drivers).flat(), ...s.car, ...Object.values(s.titles).flat()].map(c => c.id));
}

/** A team's stamps as ids by card, each ink stamp's deal round re-dated to the league after (≤ 0), so its races left hold: what carries up a run. */
export function carriedStamps(state: StampState): CarriedCards {
  const gearDealt: Record<string, number> = {};
  for (const [id, left] of Object.entries(state.mileage)) gearDealt[id] = left - GEAR_LIFE;
  return {
    drivers: Object.fromEntries(Object.entries(state.drivers).map(([id, d]) => [id, ids(d)])),
    car: ids(state.car),
    titles: Object.fromEntries(Object.entries(state.titles).map(([id, d]) => [id, ids(d)])),
    gearDealt,
  };
}

/**
 * Fold the team's log through `round` (inclusive) onto its cards, starting
 * from the stamps it carried into this league (#597), with ink mileage: an
 * ink stamp dealt GEAR_LIFE or more rounds before `round` has faded and is
 * dropped wherever it sat. Throws on a fact that can't apply, so a bad log
 * never half-applies.
 */
export function teamStamps(facts: SeasonFacts, teamId: string, round: number = currentRound(facts)): StampState {
  const pool = poolFor(facts);
  const roster = draftState(pool, facts.draftPicks).rosters[teamId];
  if (!roster) throw new Error(`stamps: unknown team ${teamId}`);
  const carried = facts.setup.carry?.teamId === teamId ? facts.setup.carry.cards : null;
  // Deal round per ink stamp id (the latest copy's), to know what has faded.
  const dealtAt: Record<string, number> = { ...(carried?.gearDealt ?? {}) };
  const faded = (id: string) => dealtAt[id] !== undefined && inkLeft(dealtAt[id], round) <= 0;
  const live = (xs: string[] | undefined) => (xs ?? []).filter(id => !faded(id)).map(stamp);
  const state: StampState = {
    drivers: Object.fromEntries(roster.driverIds.map(id => [id, live(carried?.drivers[id])])),
    car: live(carried?.car),
    titles: Object.fromEntries(roster.driverIds.map(id => [id, live(carried?.titles?.[id])])),
    mileage: {},
  };
  for (const f of facts.cardFacts) {
    if (f.teamId !== teamId || f.round > round) continue;
    if (f.cardId === null) continue; // a box left shut
    if (!f.holder) throw new Error('stamps: say where the stamp goes');
    const c = stamp(f.cardId);
    if (!holderFits(c, f.holder)) throw new Error(`stamps: a ${c.target} stamp does not go on the ${f.holder.kind} card`);
    const slot = cardOf(state, f.holder);
    // The scrape happened in its own round: it holds whatever has faded since, and it holds even if the new ink has faded too.
    if (f.replaces) {
      const i = slot.findIndex(x => x.id === f.replaces);
      if (i >= 0) slot.splice(i, 1);
      else if (f.round === round) throw new Error(slot.length >= slotsOf(f.holder) ? `stamps: ${f.replaces} is not on that card` : 'stamps: nothing to scrape off; the card has room');
    } else if (slot.length >= slotsOf(f.holder)) {
      throw new Error('stamps: the card is full; name the stamp it replaces');
    }
    if (isInk(c)) {
      dealtAt[c.id] = f.round;
      if (inkLeft(f.round, round) <= 0) continue; // faded by now: never arrives in this fold
    }
    slot.push(c);
  }
  for (const c of [...Object.values(state.drivers).flat(), ...state.car]) if (dealtAt[c.id] !== undefined) state.mileage[c.id] = inkLeft(dealtAt[c.id], round);
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

/** Ink mileage as display infos per driver: the ink racing with them (their own, and the car card's) and its races left. */
export function inkInfos(facts: SeasonFacts, round: number): Record<number, EffectInfo[]> {
  const pool = poolFor(facts);
  const rosters = draftState(pool, facts.draftPicks).rosters;
  const out: Record<number, EffectInfo[]> = {};
  const info = (c: Card, left: number): EffectInfo => ({ id: c.id, name: c.name, emoji: '', source: 'gear', left: `${left} race${left === 1 ? '' : 's'} left` });
  for (const t of pool.teams) {
    if (!isHuman(facts, t.id)) continue;
    const s = teamStamps(facts, t.id, round);
    for (const id of rosters[t.id].driverIds) {
      const mine = [...(s.drivers[id] ?? []), ...s.car].filter(c => s.mileage[c.id] !== undefined);
      if (mine.length) out[id] = mine.map(c => info(c, s.mileage[c.id]));
    }
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

/** Open the Parcel: keep a stamp onto a card (scraping one off when it is full), or leave it. A smudged Parcel's curse lands either way. Pure; throws on an illegal fact. */
export function openParcel(facts: SeasonFacts, f: ParcelFact): SeasonFacts {
  const why = validateParcel(facts, f);
  if (why) throw new Error(`stamps: ${why}`);
  const smudge = parcelFor(facts, f.round, f.teamId)!.smudge;
  return { ...facts, cardFacts: [...facts.cardFacts, f], ...(smudge ? { effectFacts: [...(facts.effectFacts ?? []), smudge] } : {}) };
}
