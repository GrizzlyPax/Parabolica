// The driver card's data (#476): who a driver is, from the season facts.
// Pure. Your own drivers get levels (the same sums the Paddock shows: rolls,
// traits, gear, live effects); rivals get who they are and their traits as
// sealed dots, never their levels. Ranks and XP went with #696: titles do
// that job (the ribbons, #699).
import { placeById } from '../data/states';
import { STEP_IDS, stepName, type Step } from '../look/step';
import { levelDelta } from './grades';
import { STAT_LABELS } from '../cards/deck';
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
  /**
   * The titles this driver has won, oldest first (#699, the ribbon rules):
   * each as a ribbon in its step's look, with the Postmark struck on it. Your
   * own drivers in a run only; rivals carry none (fresh each step).
   */
  titles?: { step: Step; name: string; postmark: string; stateId?: string }[];
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
  return { ...base, cards, titles: titlesOf(facts, held.titles[driverId] ?? []), readings: DRIVER_CARD_STATS.map(s => readStat(s, d.stats[s as keyof typeof d.stats], cards)) };
}

/** A driver's titles from their Postmarks (title stamps, `title-<step>-<stat>`): one ribbon per step, oldest first. */
export function titlesOf(facts: SeasonFacts, postmarks: Card[]): NonNullable<DriverCardData['titles']> {
  const locale = facts.setup.league?.locale;
  const state = locale ? placeById(locale.stateId) : undefined;
  const place: Partial<Record<Step, string>> = { locals: locale?.town, state: state?.name, nationals: 'America' };
  return STEP_IDS.flatMap(step => {
    const marks = postmarks.filter(c => c.id.startsWith(`title-${step}-`));
    if (!marks.length) return [];
    const where = place[step] ?? stepName(step);
    const stats = marks.flatMap(c => c.stats.map(s => `${levelDelta(s.pct)} ${STAT_LABELS[s.stat]}`)).join(', ');
    return [{ step, name: `Ace ${where}`, postmark: `${where} Postmark · ${stats}`, ...(step === 'state' && locale ? { stateId: locale.stateId } : {}) }];
  });
}
