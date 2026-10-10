// Driver XP, ranks and the rank-up pick (#646; design #592 / #623, Pax Oct 10).
//
// XP = championship points only, per driver, per race, from race facts (no
// moments, no catch-up: the number two is the sidekick by design). Ranks:
// Rookie → Pro 100 → Ace 220 → Legend 400. A rank-up deals THREE cards and
// the player picks one, in the Paddock before the next race: a STAT JUMP, a
// TRAIT (from the archetype they hold most of once #565's tags exist; any
// driver trait until then) or a WILD CARD. Size follows the metal ladder at
// the player's 3×: Pro = Silver (+6 levels to one stat), Ace = Gold (+6 to
// two), Legend = Iridium (+9 to three). A stat LEVEL is 5 grade points
// (#623), so +6 levels = +30 grade: exactly a Silver card at 3×.
//
// Facts, not state: the pick is a fact on the league (`SeasonFacts.rankUps`),
// keyed by the stable driver id, with the round it was made in; XP, ranks and
// what is pending derive from the results. A team carried up a run brings
// its XP and every pick (`CarriedTeam.xp` / `.rankUps`), so cards are for
// the whole run. Draws are seeded on their own streams.
//
// Wild cards (first pool; stat and XP rules only; names provisional, #370):
//   Showboat      points earn 1.5× XP
//   Mentor        the teammate gets 25% of your XP
//   Grudge Match  +3 levels to every stat in the boss race
//   Home Hero     +6 levels to every stat on one track
// Engine-hook signatures (Last-Lap Hero, Iron Man, Pole or Bust, Underdog)
// are a later issue.

import { mulberry32, deriveSeed, shuffle } from '../engine/rng';
import { cardsBy, CARDS_BY_ID, DRIVER_STATS, MOTORSPORT_DECK, type Card, type DriverStatKey } from '../cards';
import type { Rarity } from '../cards/rarity';
import { driverPointsInRace } from '../fantasy/types';
import { draftState } from './draft';
import { playerCard } from './pack';
import { isHuman, poolFor, seasonState, type SeasonFacts } from './season';
import { calendarTrackIds } from './setup';
import { getTrackById } from '../generators/tracks';

/** One stat level = this many grade points (#623). */
export const LEVEL_POINTS = 5;

export type RankName = 'Rookie' | 'Pro' | 'Ace' | 'Legend';
/** Ranks by XP; index = rank (0 Rookie … 3 Legend). The metal sizes the rank-up. */
export const RANKS: readonly { name: RankName; xp: number; metal: Rarity | null }[] = [
  { name: 'Rookie', xp: 0, metal: null },
  { name: 'Pro', xp: 100, metal: 'silver' },
  { name: 'Ace', xp: 220, metal: 'gold' },
  { name: 'Legend', xp: 400, metal: 'iridium' },
];
/** The stat jump per rank: how many stats, how many levels each (the metal ladder at 3×). */
export const JUMP: Record<1 | 2 | 3, { stats: number; levels: number }> = { 1: { stats: 1, levels: 6 }, 2: { stats: 2, levels: 6 }, 3: { stats: 3, levels: 9 } };

export type WildId = 'showboat' | 'mentor' | 'grudge-match' | 'home-hero';
export const WILD_CARDS: Record<WildId, { name: string; blurb: string }> = {
  'showboat': { name: 'Showboat', blurb: 'Championship points earn 1.5× XP.' },
  'mentor': { name: 'Mentor', blurb: 'Your teammate gets 25% of your XP.' },
  'grudge-match': { name: 'Grudge Match', blurb: '+3 levels to every stat in the boss race.' },
  'home-hero': { name: 'Home Hero', blurb: '+6 levels to every stat at one track.' },
};
export const SHOWBOAT_XP = 1.5;
export const MENTOR_SHARE = 0.25;
export const GRUDGE_LEVELS = 3;
export const HOME_HERO_LEVELS = 6;

/** A rank-up taken: the fact. `rank` is 1 Pro · 2 Ace · 3 Legend. */
export interface RankUpPick {
  type: 'rank-up';
  /** The round it was made in (the Paddock before that race): live from it. */
  round: number;
  teamId: string;
  driverId: number;
  rank: 1 | 2 | 3;
  /** The three card ids dealt, in deal order. */
  dealt: string[];
  cardId: string;
}

export interface DealtRankUp {
  round: number;
  teamId: string;
  driverId: number;
  rank: 1 | 2 | 3;
  rankName: RankName;
  cards: Card[];
}

const WILD_IDS: WildId[] = ['showboat', 'mentor', 'grudge-match', 'home-hero'];
const ALL_DRIVER = (levels: number) => DRIVER_STATS.map(stat => ({ stat, pct: levels * LEVEL_POINTS }));
const STAT_WORD: Record<DriverStatKey, string> = { baseSpeed: 'Speed', consistency: 'Consistency', luck: 'Luck', acceleration: 'Acceleration', endurance: 'Endurance', aggression: 'Aggression' };

/** The wild card an id names, and its track for Home Hero (`wild-home-hero:<trackId>`). */
export function wildOf(cardId: string): { wild: WildId; trackId?: string } | null {
  if (!cardId.startsWith('wild-')) return null;
  const [id, trackId] = cardId.slice(5).split(':');
  return WILD_IDS.includes(id as WildId) ? { wild: id as WildId, trackId } : null;
}

/** A rank-up card by id: a stat jump (`jump-<rank>-<stat>+<stat>`), a deck
 * trait at the player's scale, or a wild card (no stats of its own). */
export function rankUpCard(cardId: string): Card {
  const deck = CARDS_BY_ID.get(cardId);
  if (deck) return playerCard(deck);
  const jump = cardId.match(/^jump-([123])-(.+)$/);
  if (jump) {
    const rank = Number(jump[1]) as 1 | 2 | 3;
    const stats = jump[2].split('+') as DriverStatKey[];
    return {
      id: cardId, name: `${stats.map(s => STAT_WORD[s]).join(' + ')} jump`, kind: 'trait', target: 'driver', rarity: RANKS[rank].metal!,
      stats: stats.map(stat => ({ stat, pct: JUMP[rank].levels * LEVEL_POINTS })), deck: 'motorsport',
    };
  }
  const wild = wildOf(cardId);
  if (wild) {
    const track = wild.trackId ? getTrackById(wild.trackId) : undefined;
    const rule = track && wild.wild === 'home-hero' ? `+${HOME_HERO_LEVELS} levels to every stat at ${track.name}.` : WILD_CARDS[wild.wild].blurb;
    return { id: cardId, name: track ? `${WILD_CARDS[wild.wild].name}: ${track.name}` : WILD_CARDS[wild.wild].name, kind: 'trait', target: 'driver', stats: [], rule, deck: 'motorsport' };
  }
  throw new Error(`xp: no rank-up card ${cardId}`);
}

export function rankIndex(xp: number): 0 | 1 | 2 | 3 {
  let r = 0;
  for (let i = 1; i < RANKS.length; i++) if (xp >= RANKS[i].xp) r = i;
  return r as 0 | 1 | 2 | 3;
}
export const rankName = (xp: number): RankName => RANKS[rankIndex(xp)].name;

/** Every pick a driver holds: carried up the run, then this league's. */
export function rankUpsOf(facts: SeasonFacts, driverId?: number): RankUpPick[] {
  const all = [...(facts.setup.carry?.rankUps ?? []), ...(facts.rankUps ?? [])];
  return driverId === undefined ? all : all.filter(p => p.driverId === driverId);
}

/** Picks live in `round`: carried ones always, this league's from their round. */
function heldAt(facts: SeasonFacts, driverId: number, round: number): RankUpPick[] {
  const carried = facts.setup.carry?.rankUps?.filter(p => p.driverId === driverId) ?? [];
  return [...carried, ...(facts.rankUps ?? []).filter(p => p.driverId === driverId && p.round <= round)];
}
const holdsWild = (facts: SeasonFacts, driverId: number, round: number, wild: WildId) =>
  heldAt(facts, driverId, round).some(p => wildOf(p.cardId)?.wild === wild);

function teammateOf(facts: SeasonFacts, driverId: number): number | undefined {
  const rosters = draftState(poolFor(facts), facts.draftPicks).rosters;
  const team = Object.values(rosters).find(r => r.driverIds.includes(driverId));
  return team?.driverIds.find(id => id !== driverId);
}

/** XP a driver earned in one settled round: points (× Showboat), plus a
 * Mentor teammate's share. */
export function xpInRound(facts: SeasonFacts, driverId: number, round: number): number {
  const digest = facts.results[round];
  if (!digest) return 0;
  let xp = driverPointsInRace(digest, driverId) * (holdsWild(facts, driverId, round, 'showboat') ? SHOWBOAT_XP : 1);
  const mate = teammateOf(facts, driverId);
  if (mate !== undefined && holdsWild(facts, mate, round, 'mentor')) {
    xp += driverPointsInRace(digest, mate) * (holdsWild(facts, mate, round, 'showboat') ? SHOWBOAT_XP : 1) * MENTOR_SHARE;
  }
  return xp;
}

/** A driver's XP after `through` settled rounds (default: all), carried XP included. */
export function driverXp(facts: SeasonFacts, driverId: number, through: number = facts.results.length): number {
  let xp = facts.setup.carry?.xp?.[driverId] ?? 0;
  for (let r = 0; r < Math.min(through, facts.results.length); r++) xp += xpInRound(facts, driverId, r);
  return xp;
}

/** The next rank-up a driver is owed in `round` (ranks reached beyond picks taken), or null. */
export function pendingRankUp(facts: SeasonFacts, driverId: number, round: number): 1 | 2 | 3 | null {
  const reached = rankIndex(driverXp(facts, driverId, round));
  const taken = rankUpsOf(facts, driverId).length;
  return reached > taken ? ((taken + 1) as 1 | 2 | 3) : null;
}

/** The player's drivers with a rank-up to take this round, in roster order. CPU drivers never rank up. */
export function pendingRankUps(facts: SeasonFacts, round: number, teamId: string): { driverId: number; rank: 1 | 2 | 3 }[] {
  if (!isHuman(facts, teamId)) return [];
  const roster = draftState(poolFor(facts), facts.draftPicks).rosters[teamId];
  if (!roster) return [];
  return roster.driverIds.flatMap(driverId => { const rank = pendingRankUp(facts, driverId, round); return rank ? [{ driverId, rank }] : []; });
}

/**
 * The three cards a rank-up deals: a stat jump, a trait of the rank's metal,
 * a wild card not yet held. Seeded on (seed, 'season', 'rank-up', driver,
 * rank): the same driver's Pro deal is the same whenever it comes.
 */
export function dealRankUp(facts: SeasonFacts, driverId: number, rank: 1 | 2 | 3, round: number = facts.results.length): DealtRankUp {
  const rng = mulberry32(deriveSeed(facts.setup.seed, 'season', 'rank-up', driverId, rank));
  const metal = RANKS[rank].metal!;
  const stats = shuffle(DRIVER_STATS, rng).slice(0, JUMP[rank].stats);
  const jump = rankUpCard(`jump-${rank}-${[...stats].sort().join('+')}`);
  // Any driver trait of the metal until archetype tags land (#565 / #647).
  const traits = cardsBy({ kind: 'trait', target: 'driver', rarity: metal }, MOTORSPORT_DECK);
  const trait = playerCard(traits[Math.floor(rng() * traits.length)]);
  const held = new Set(rankUpsOf(facts, driverId).map(p => wildOf(p.cardId)?.wild));
  const pool = WILD_IDS.filter(w => !held.has(w));
  const wild = pool.length ? pool[Math.floor(rng() * pool.length)] : WILD_IDS[Math.floor(rng() * WILD_IDS.length)];
  const track = calendarTrackIds()[Math.floor(rng() * calendarTrackIds().length)];
  const wildCard = rankUpCard(wild === 'home-hero' ? `wild-home-hero:${track}` : `wild-${wild}`);
  const teamId = Object.entries(draftState(poolFor(facts), facts.draftPicks).rosters).find(([, r]) => r.driverIds.includes(driverId))?.[0] ?? '';
  return { round, teamId, driverId, rank, rankName: RANKS[rank].name, cards: [jump, trait, wildCard] };
}

export function validateRankUp(facts: SeasonFacts, pick: RankUpPick): string | null {
  const state = seasonState(facts);
  if (state.phase !== 'paddock') return `not in the Paddock (${state.phase})`;
  if (pick.round !== state.round) return `round ${pick.round} is not the current round (${state.round})`;
  if (pick.teamId !== state.whoseTurn) return `${pick.teamId} is not on the clock (${state.whoseTurn} is)`;
  const owed = pendingRankUps(facts, pick.round, pick.teamId).find(p => p.driverId === pick.driverId);
  if (!owed) return `driver ${pick.driverId} has no rank-up to take`;
  if (owed.rank !== pick.rank) return `the rank-up owed is ${RANKS[owed.rank].name}, not ${RANKS[pick.rank].name}`;
  const dealt = dealRankUp(facts, pick.driverId, pick.rank, pick.round).cards.map(c => c.id);
  if (pick.dealt.join(',') !== dealt.join(',')) return `the rank-up dealt ${dealt.join(', ')}; record all three`;
  if (!dealt.includes(pick.cardId)) return `${pick.cardId} was not dealt`;
  return null;
}

/** Take a rank-up. Pure; throws when it isn't yours to take. */
export function applyRankUp(facts: SeasonFacts, pick: RankUpPick): SeasonFacts {
  const why = validateRankUp(facts, pick);
  if (why) throw new Error(`xp: ${why}`);
  return { ...facts, rankUps: [...(facts.rankUps ?? []), pick] };
}

/** Has the team taken every rank-up it is owed this round? */
export function rankUpsTaken(facts: SeasonFacts, round: number, teamId: string): boolean {
  return pendingRankUps(facts, round, teamId).length === 0;
}

/**
 * Rank-up cards on each of the player's drivers for a round, for the roster
 * builder: stat jumps and traits as they are; Grudge Match as +3 levels to
 * every stat in the boss race; Home Hero as +6 levels at its track; the XP
 * wild cards carry no stats.
 */
export function rankUpCardsFor(facts: SeasonFacts, round: number): Record<number, Card[]> {
  const out: Record<number, Card[]> = {};
  const boss = facts.setup.league?.bossRound;
  const trackId = facts.setup.calendar[round];
  for (const p of rankUpsOf(facts)) {
    if (!(facts.setup.carry?.rankUps?.includes(p) || p.round <= round)) continue;
    const base = rankUpCard(p.cardId);
    const wild = wildOf(p.cardId);
    let card: Card | null = base;
    if (wild?.wild === 'grudge-match') card = boss !== undefined && round === boss ? { ...base, name: `${base.name} (boss race)`, stats: ALL_DRIVER(GRUDGE_LEVELS) } : null;
    if (wild?.wild === 'home-hero') card = wild.trackId === trackId ? { ...base, stats: ALL_DRIVER(HOME_HERO_LEVELS) } : null;
    if (wild?.wild === 'showboat' || wild?.wild === 'mentor') card = null;
    if (card) (out[p.driverId] ??= []).push(card);
  }
  return out;
}

/** XP and rank of every drafted driver, for sheets and tables. */
export function driverRanks(facts: SeasonFacts): Record<number, { xp: number; rank: RankName; next: number | null }> {
  const out: Record<number, { xp: number; rank: RankName; next: number | null }> = {};
  for (const d of poolFor(facts).drivers) {
    const xp = driverXp(facts, d.id);
    const i = rankIndex(xp);
    out[d.id] = { xp, rank: RANKS[i].name, next: i < 3 ? RANKS[i + 1].xp : null };
  }
  return out;
}

