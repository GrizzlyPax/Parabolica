// The driver card's data (#476): who a driver is, from the season facts.
// Pure. Your own drivers get levels (the same sums the Paddock shows: rolls,
// traits, gear, rank-up cards, live effects); rivals get who they are and
// their traits as sealed dots, never their levels.
import type { Card, StatKey } from '../cards/types';
import type { IconId } from '../icons/registry';
import { portraitFor } from '../generators/avatars';
import { draftState } from './draft';
import { poolFor, type SeasonFacts } from './season';
import { teamCardState } from './pack';
import { effectCards } from './effects';
import { driverRanks, RANKS } from './xp';
import { readStat, type StatReading } from './grades';
import { teamsOf } from './ui/teams';

export const DRIVER_CARD_STATS: StatKey[] = ['baseSpeed', 'consistency', 'luck', 'acceleration', 'endurance', 'aggression'];

export interface DriverCardData {
  id: number;
  name: string;
  number?: number;
  teamName: string;
  color: string;
  ink?: string;
  portrait?: IconId;
  backstory?: string;
  quirk?: string;
  /** "Qualifier", once the rookie start (#660) gives drivers an archetype. */
  archetype?: string;
  rank?: { name: string; xp: number; next: number | null; nextName?: string };
  /** Your own drivers only. */
  readings?: StatReading[];
  cards: Card[];
  sealed: boolean;
}

export function driverCardOf(facts: SeasonFacts, driverId: number, round: number = facts.results.length): DriverCardData | null {
  const pool = poolFor(facts);
  const d = pool.drivers.find(x => x.id === driverId);
  if (!d) return null;
  const rosters = draftState(pool, facts.draftPicks).rosters;
  const teamId = Object.keys(rosters).find(t => rosters[t].driverIds.includes(driverId));
  const team = teamId ? teamsOf(facts)[teamId] : undefined;
  const mine = !!teamId && facts.setup.humans.some(h => h.teamId === teamId);
  const r = driverRanks(facts)[driverId];
  const ri = r ? RANKS.findIndex(x => x.name === r.rank) : -1;
  const base: DriverCardData = {
    id: d.id, name: d.fullName, number: d.number, teamName: team?.name ?? '', color: team?.color ?? '#718295', ink: team?.ink,
    portrait: portraitFor(pool.seed, d.id), backstory: d.backstory, quirk: d.quirk,
    archetype: (d as { archetype?: string }).archetype,
    rank: r ? { name: r.rank, xp: r.xp, next: r.next, nextName: RANKS[ri + 1]?.name } : undefined,
    cards: [...d.traits], sealed: !mine,
  };
  if (!mine || !teamId) return base;
  const held = teamCardState(facts, teamId, round).drivers[driverId];
  const fx = effectCards(facts, teamId, round, { kind: 'driver', id: driverId });
  const cards = [...d.traits, ...(held?.traits ?? []), ...(held?.equipment ?? []), ...fx];
  return { ...base, cards, readings: DRIVER_CARD_STATS.map(s => readStat(s, d.stats[s as keyof typeof d.stats], cards)) };
}
