// Fantasy teams: the first gamification layer. A few people each draft a
// small squad of drivers before the season (or a quick race); a team scores
// the sum of its drivers' race points, the same F1 table the league uses.
// Everything here is facts — it travels inside LeagueSetupConfig, so a
// published league carries its fantasy teams to every device.
import type { RaceDigest } from '../league/types';
import { calculatePointsForPosition } from '../types/season';

export const SQUAD_SIZE = 3;
export const MIN_FANTASY_TEAMS = 2;
export const MAX_FANTASY_TEAMS = 6;

/** Preset team colours — chosen for contrast against each other and the dark UI. */
export const FANTASY_COLORS = [
  { id: 'magenta', name: 'Magenta', hex: '#ff4fd8' },
  { id: 'cyan', name: 'Cyan', hex: '#2fd5ff' },
  { id: 'lime', name: 'Lime', hex: '#a7f542' },
  { id: 'amber', name: 'Amber', hex: '#ffb020' },
  { id: 'violet', name: 'Violet', hex: '#9d7bff' },
  { id: 'coral', name: 'Coral', hex: '#ff6a5c' },
  { id: 'mint', name: 'Mint', hex: '#3ff0b0' },
  { id: 'sky', name: 'Sky', hex: '#6ab4ff' },
] as const;
export type FantasyColorId = typeof FANTASY_COLORS[number]['id'];

export function fantasyHex(id: FantasyColorId | string): string {
  return FANTASY_COLORS.find(c => c.id === id)?.hex ?? '#ffffff';
}

export interface FantasyTeam {
  id: string;
  name: string;
  color: FantasyColorId;
  /** Driver ids, in draft order. */
  driverIds: number[];
}

export interface FantasyConfig {
  squadSize: number;
  teams: FantasyTeam[];
}

/** Driver id → the fantasy team that drafted them. */
export function fantasyOwners(cfg: FantasyConfig | undefined | null): Map<number, FantasyTeam> {
  const m = new Map<number, FantasyTeam>();
  for (const t of cfg?.teams ?? []) for (const id of t.driverIds) m.set(id, t);
  return m;
}

/**
 * Snake draft order: 1,2,3,3,2,1,1,2,3… for `teams` teams and `rounds` rounds.
 * Returns team indexes, one per pick, in picking order.
 */
export function snakeOrder(teams: number, rounds: number): number[] {
  const order: number[] = [];
  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < teams; i++) order.push(r % 2 === 0 ? i : teams - 1 - i);
  }
  return order;
}

/** Whose pick is it, given picks made so far; null when the draft is complete. */
export function onTheClock(cfg: FantasyConfig): { teamIndex: number; pick: number; of: number } | null {
  const order = snakeOrder(cfg.teams.length, cfg.squadSize);
  const made = cfg.teams.reduce((n, t) => n + t.driverIds.length, 0);
  if (made >= order.length) return null;
  return { teamIndex: order[made], pick: made + 1, of: order.length };
}

export function draftComplete(cfg: FantasyConfig): boolean {
  return cfg.teams.length >= MIN_FANTASY_TEAMS && cfg.teams.every(t => t.driverIds.length === cfg.squadSize);
}

export interface FantasyDriverLine { driverId: number; points: number; perRace: number[] }
export interface FantasyStandingLine {
  team: FantasyTeam;
  points: number;
  /** Points this team scored in each settled race, in race order. */
  perRace: number[];
  drivers: FantasyDriverLine[];
  rank: number;
}

/** Points a driver earned in one race digest: F1 top-10 table; DNF = 0. */
export function driverPointsInRace(digest: Pick<RaceDigest, 'finishOrder' | 'dnfDriverIds'>, driverId: number): number {
  if (digest.dnfDriverIds.includes(driverId)) return 0;
  const pos = digest.finishOrder.indexOf(driverId);
  return pos < 0 ? 0 : calculatePointsForPosition(pos + 1);
}

/** Season standings for the fantasy teams from the settled race digests. */
export function fantasyStandings(cfg: FantasyConfig, digests: Pick<RaceDigest, 'finishOrder' | 'dnfDriverIds'>[]): FantasyStandingLine[] {
  const lines = cfg.teams.map(team => {
    const drivers = team.driverIds.map(driverId => {
      const perRace = digests.map(d => driverPointsInRace(d, driverId));
      return { driverId, perRace, points: perRace.reduce((a, b) => a + b, 0) };
    });
    const perRace = digests.map((_, i) => drivers.reduce((a, d) => a + d.perRace[i], 0));
    return { team, drivers, perRace, points: perRace.reduce((a, b) => a + b, 0), rank: 0 };
  });
  // Ties: more race wins by the team's drivers, then name.
  const wins = (l: FantasyStandingLine) => digests.filter(d => l.team.driverIds.includes(d.finishOrder[0])).length;
  lines.sort((a, b) => b.points - a.points || wins(b) - wins(a) || a.team.name.localeCompare(b.team.name));
  lines.forEach((l, i) => { l.rank = i + 1; });
  return lines;
}
