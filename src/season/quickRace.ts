// One race on the Season pipeline (#606, #612): the Season pool generator,
// the CPU draft and leagueForRound build it, prepareScheduledRace sets up the
// engine, so it races exactly like a Season round. Quick Race (one tap, random
// track and weather from the seed; nothing saved) and the lab (Race Control,
// its own track pick and rule-card hand) both come through here, so what the
// lab measures is the field players race.
import { DEFAULT_TEAMS } from './genesis';
import { quickDraft } from './draft';
import { leagueForRound, newSeason, poolFor, type SeasonFacts } from './season';
import { seasonCalendar } from './setup';
import { getTrackById, type Track } from '../generators/tracks';
import type { LeagueState } from '../league/types';
import type { Ruleset } from '../rules/ruleset';

export interface QuickRace { facts: SeasonFacts; league: LeagueState; track: Track }

/** A one-race Season with no humans on `trackId`, drafted by the CPU, under `ruleset` (default rules when absent). */
export function oneRaceSeason(seed: number, trackId: string, ruleset?: Ruleset): QuickRace {
  const track = getTrackById(trackId);
  if (!track) throw new Error(`oneRaceSeason: unknown track '${trackId}'`);
  const base = newSeason({ seed, teamCount: DEFAULT_TEAMS, humans: [], calendar: [trackId], ruleset });
  const facts = { ...base, draftPicks: quickDraft(poolFor(base)) };
  return { facts, league: leagueForRound(facts, 0), track };
}

export function quickRace(seed: number): QuickRace {
  return oneRaceSeason(seed, seasonCalendar(seed, 1)[0]);
}
