// Quick Race on the Season pipeline (#606): one tap, one race, no setup. A
// Quick Race is a one-race Season with no humans: the Season pool generator,
// the CPU draft and leagueForRound build it, prepareScheduledRace sets up the
// engine, so it races exactly like a Season round. Random track and weather
// come from the seed; nothing is saved (Pit, Oct 10).
import { generateSeasonPool, DEFAULT_TEAMS } from './genesis';
import { quickDraft } from './draft';
import { leagueForRound, newSeason, type SeasonFacts } from './season';
import { seasonCalendar } from './setup';
import { getTrackById, type Track } from '../generators/tracks';
import type { LeagueState } from '../league/types';

export interface QuickRace { facts: SeasonFacts; league: LeagueState; track: Track }

export function quickRace(seed: number): QuickRace {
  const pool = generateSeasonPool(seed, DEFAULT_TEAMS);
  const facts = { ...newSeason({ seed, teamCount: DEFAULT_TEAMS, humans: [], calendar: seasonCalendar(seed, 1) }), draftPicks: quickDraft(pool) };
  const track = getTrackById(facts.setup.calendar[0]);
  if (!track) throw new Error(`quickRace: unknown track '${facts.setup.calendar[0]}'`);
  return { facts, league: leagueForRound(facts, 0), track };
}
