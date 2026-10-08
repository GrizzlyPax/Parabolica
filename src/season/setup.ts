// League Setup (#317, docs/SEASON_MODE.md §1): the choices a season starts
// from, as pure helpers. The screen (ui/LeagueSetup.tsx) only edits these.
//
// Humans take the first N pool slots. The draft order is a seeded shuffle of
// the slots (draft.ts), so slot 0 is no better than any other.
import { deriveSeed, mulberry32, shuffle } from '../engine/rng';
import { CURRENT_TRACKS, getTrackById } from '../generators/tracks';
import { BASE_DECK_TRACKS } from '../data/deckTracks';
import { leagueNameForSeed } from '../generators/leagueName';
import { DEFAULT_TEAMS, MAX_TEAMS, MIN_TEAMS, generateSeasonPool, type SeasonPool } from './genesis';
import { DEFAULT_CALENDAR_LENGTH, type SeasonHuman, type SeasonSetup } from './season';

export const MIN_RACES = 3;
export const MAX_RACES = 20;

/** The tracks a calendar draws from: the six stat-combo tracks once the sim
 * runs on them (the v0.5 bundle), the current tracks until then. */
export function calendarTrackIds(): string[] {
  const deck = BASE_DECK_TRACKS.map(t => t.id);
  return deck.every(id => getTrackById(id)) ? deck : CURRENT_TRACKS.map(t => t.id);
}

/** `length` races from the seed: whole shuffles of the tracks back to back,
 * never the same track twice in a row. */
export function seasonCalendar(seed: number, length: number = DEFAULT_CALENDAR_LENGTH, ids: string[] = calendarTrackIds()): string[] {
  const rng = mulberry32(deriveSeed(seed, 'season', 'calendar'));
  const out: string[] = [];
  while (out.length < length) {
    const lap = shuffle(ids, rng);
    if (lap.length > 1 && lap[0] === out[out.length - 1]) lap.push(lap.shift()!);
    out.push(...lap);
  }
  return out.slice(0, length);
}

/** The next track after `id` in the list (tap a race to change it). */
export function nextTrack(id: string, ids: string[] = calendarTrackIds()): string {
  return ids[(ids.indexOf(id) + 1) % ids.length];
}

/** Humans sit in the first `count` slots and wear that slot's team for now
 * (the team creator, #346, lets them name their own). */
export function humansFor(pool: SeasonPool, count: number): SeasonHuman[] {
  return pool.teams.slice(0, count).map(t => ({ teamId: t.id, name: t.name, color: t.color, ink: t.ink, iconId: t.iconId }));
}

export function randomSeasonSeed(): number {
  return Math.floor(Math.random() * 1_000_000_000);
}

export const clampTeams = (n: number) => Math.min(MAX_TEAMS, Math.max(MIN_TEAMS, Math.round(n)));
export const clampRaces = (n: number) => Math.min(MAX_RACES, Math.max(MIN_RACES, Math.round(n)));

/** The league's name comes from its seed ("The Molten Circuit"), so it
 * needs no field of its own and rerolls with the seed. */
export function seasonName(setup: Pick<SeasonSetup, 'seed'>): string {
  return leagueNameForSeed(setup.seed);
}

/** Every default from one seed: the one-tap season. */
export function defaultSetup(seed: number): SeasonSetup {
  const humans = humansFor(generateSeasonPool(seed, DEFAULT_TEAMS), 1);
  return { seed, teamCount: DEFAULT_TEAMS, humans, calendar: seasonCalendar(seed) };
}
