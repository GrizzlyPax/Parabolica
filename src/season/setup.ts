// League Setup (#317, docs/SEASON_MODE.md §1): the choices a season starts
// from, as pure helpers. The screen (ui/LeagueSetup.tsx) only edits these.
//
// Each human picks a team from the pool (#440). A pick is the World Deck team
// (deckTeamId), so it survives a reroll whenever that team is drawn again.
// Where a team sits in the pool doesn't matter: the draft order is a seeded
// shuffle of the slots (draft.ts).
import { deriveSeed, mulberry32, shuffle } from '../engine/rng';
import { CURRENT_TRACKS } from '../generators/tracks';
import { leagueNameForSeed } from '../generators/leagueName';
import { DEFAULT_TEAMS, MAX_TEAMS, MIN_TEAMS, generateSeasonPool, type SeasonPool } from './genesis';
import { DEFAULT_CALENDAR_LENGTH, type SeasonHuman, type SeasonSetup } from './season';

export const MIN_RACES = 3;
export const MAX_RACES = 20;

/** The tracks a calendar draws from: the six stat-combo tracks. */
export function calendarTrackIds(): string[] {
  return CURRENT_TRACKS.map(t => t.id);
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

/** A human's pick: a World Deck team id, or null for "not picked yet". */
export type TeamPick = string | null;

const pickOf = (t: SeasonPool['teams'][number]): string => t.deckTeamId ?? t.id;

/** Each human's pool team. A pick that isn't in this pool, or that an earlier
 * human already holds, counts as unpicked; unpicked humans get the first free
 * teams in pool order, so Start always works. */
export function resolvePicks(pool: SeasonPool, picks: TeamPick[]): string[] {
  const taken = new Set<string>();
  const out: (string | null)[] = picks.map(p => {
    const team = p == null ? undefined : pool.teams.find(t => pickOf(t) === p);
    if (!team || taken.has(team.id)) return null;
    taken.add(team.id);
    return team.id;
  });
  const free = pool.teams.filter(t => !taken.has(t.id)).map(t => t.id);
  return out.map(id => id ?? free.shift()!);
}

/** Picks that still stand in `pool` (after a reroll or a team-count change); the rest go back to null. */
export function keepPicks(pool: SeasonPool, picks: TeamPick[]): TeamPick[] {
  return picks.map(p => (p != null && pool.teams.some(t => pickOf(t) === p) ? p : null));
}

/** Tap a team row: the picker takes it, or lets it go if it's already theirs.
 * A team another human holds can't be taken. */
export function tapTeam(pool: SeasonPool, picks: TeamPick[], picker: number, teamId: string): TeamPick[] {
  const team = pool.teams.find(t => t.id === teamId);
  if (!team) return picks;
  const pick = pickOf(team);
  if (picks[picker] === pick) return picks.map((p, i) => (i === picker ? null : p));
  if (picks.some((p, i) => i !== picker && p === pick)) return picks;
  return picks.map((p, i) => (i === picker ? pick : p));
}

/** Humans as the season stores them: each wears their picked team (the team
 * creator, #346, lets them build their own). */
export function humansFor(pool: SeasonPool, picks: TeamPick[]): SeasonHuman[] {
  return resolvePicks(pool, picks).map(id => {
    const t = pool.teams.find(x => x.id === id)!;
    return { teamId: t.id, name: t.name, color: t.color, ink: t.ink, iconId: t.iconId, deckTeamId: t.deckTeamId };
  });
}

/** The pick a new human starts with: the first team nobody holds. */
export function firstFreePick(pool: SeasonPool, picks: TeamPick[]): TeamPick {
  const held = new Set(resolvePicks(pool, picks));
  const t = pool.teams.find(x => !held.has(x.id));
  return t ? pickOf(t) : null;
}

export function randomSeasonSeed(): number {
  return Math.floor(Math.random() * 1_000_000_000);
}

export const clampTeams = (n: number) => Math.min(MAX_TEAMS, Math.max(MIN_TEAMS, Math.round(n)));
export const clampRaces = (n: number) => Math.min(MAX_RACES, Math.max(MIN_RACES, Math.round(n)));

/** The league's name comes from its seed ("The Molten Circuit"), so it
 * needs no field of its own and rerolls with the seed. In a run (#597) the
 * rung comes first: "Juniors · The Molten Circuit". */
export function seasonName(setup: Pick<SeasonSetup, 'seed' | 'league'>): string {
  const name = leagueNameForSeed(setup.seed);
  return setup.league ? `${setup.league.name} · ${name}` : name;
}

/** Every default from one seed: the one-tap season. */
export function defaultSetup(seed: number): SeasonSetup {
  const pool = generateSeasonPool(seed, DEFAULT_TEAMS);
  const humans = humansFor(pool, [pickOf(pool.teams[0])]);
  return { seed, teamCount: DEFAULT_TEAMS, humans, calendar: seasonCalendar(seed) };
}
