// The driver card's data (#476): who a driver is, from the season facts.
// Pure. Your own drivers get levels (the same sums the Paddock shows: rolls,
// traits, gear, live effects); rivals get who they are and their traits as
// sealed dots, never their levels. Ranks and XP went with #696: titles do
// that job (the ribbons, #699).
import { raceBadges } from './badges';
import type { Card, StatKey } from '../cards/types';
import type { IconId } from '../icons/registry';
import { portraitFor } from '../generators/avatars';
import { draftState } from './draft';
import { poolFor, type SeasonFacts } from './season';
import { teamStamps } from './stamps';
import { effectCards } from './effects';
import { readStat, type StatReading } from './grades';
import { teamsOf } from './ui/teams';

export const DRIVER_CARD_STATS: StatKey[] = ['baseSpeed', 'consistency', 'luck', 'acceleration', 'endurance', 'aggression'];

export interface DriverCardData {
  id: number;
  name: string;
  number?: number | string;
  teamName: string;
  color: string;
  ink?: string;
  portrait?: IconId;
  backstory?: string;
  quirk?: string;
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
  const base: DriverCardData = {
    id: d.id, name: d.fullName, number: raceBadges(facts)[d.id] ?? d.number, teamName: team?.name ?? '', color: team?.color ?? '#718295', ink: team?.ink,
    portrait: portraitFor(pool.seed, d.id), backstory: d.backstory, quirk: d.quirk,
    cards: [...d.traits], sealed: !mine,
  };
  if (!mine || !teamId) return base;
  const held = teamStamps(facts, teamId, round);
  const fx = effectCards(facts, teamId, round, { kind: 'driver', id: driverId });
  const cards = [...d.traits, ...(held.drivers[driverId] ?? []), ...(held.titles[driverId] ?? []), ...fx];
  return { ...base, cards, readings: DRIVER_CARD_STATS.map(s => readStat(s, d.stats[s as keyof typeof d.stats], cards)) };
}
