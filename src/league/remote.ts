// A league on the server: publish, open by code, keep in step.
//
// The server (server/src/index.ts) holds the facts — seed, setup, decrees —
// and the canonical results. Every device rebuilds the league from the facts
// with createLeague and settles it on the shared clock, so they all land on
// the same race at the same lap. This module is the only client code that
// talks to it.
import { createLeague } from './league';
import type { Intervention, LeagueSetupConfig, LeagueState, RaceDigest } from './types';
import { version as engineVersion } from '../../package.json';

/** Same origin on the real site; the deployed API elsewhere (localhost, the preview). */
export const API_BASE: string = (import.meta.env?.VITE_API_BASE as string | undefined)
  ?? (typeof location !== 'undefined' && /(^|\.)playparabolica\.com$/.test(location.hostname) ? '/api' : 'https://playparabolica.com/api');

/** Everything a device needs to rebuild the league. Opaque to the server. */
export interface LeagueDefinition {
  engineVersion: string;
  leagueSeed: number;
  setup: LeagueSetupConfig;
}

export interface RemoteLeague {
  code: string;
  createdAt: number;
  definition: LeagueDefinition;
  decrees: Intervention[];
  digests: Record<string, { fingerprint: string; digest: RaceDigest; postedAt: number }>;
  version: number;
  serverNow: number;
}

/** What a LeagueState remembers about its server copy (persisted with it). */
export interface RemoteLink {
  code: string;
  /** Only the device that published it holds the key. */
  commissionerKey?: string;
  version: number;
}

export class RemoteError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) } });
  } catch {
    throw new RemoteError('The league server could not be reached.', 0);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new RemoteError((body as { error?: string }).error ?? `HTTP ${res.status}`, res.status);
  return body as T;
}

export function definitionOf(league: LeagueState): LeagueDefinition {
  return { engineVersion: league.engineVersion, leagueSeed: league.leagueSeed, setup: league.setup };
}

/** Commissioner decrees are facts: the whole intervention log, since #334 retired the sim's own entries. */
export function decreesOf(league: LeagueState): Intervention[] {
  return league.interventionLog;
}

/** Publish this league. Returns the same league with its server link attached. */
export async function publishLeague(league: LeagueState): Promise<LeagueState> {
  const r = await call<{ code: string; commissionerKey: string; version: number }>('/leagues', { method: 'POST', body: JSON.stringify({ definition: definitionOf(league) }) });
  let out: LeagueState = { ...league, remote: { code: r.code, commissionerKey: r.commissionerKey, version: r.version } };
  // Decrees made before publishing travel with it.
  for (const d of decreesOf(league)) out = await postDecree(out, d);
  return out;
}

export async function fetchRemote(code: string): Promise<RemoteLeague> {
  return call<RemoteLeague>(`/leagues/${encodeURIComponent(code.toUpperCase())}`);
}

/** Rebuild a league from the server's facts. Settling happens where it always does. */
export function leagueFromRemote(remote: RemoteLeague, keepKey?: string): LeagueState {
  const base = createLeague(remote.definition.leagueSeed, remote.definition.setup);
  return {
    ...base,
    engineVersion: remote.definition.engineVersion,
    interventionLog: [...remote.decrees],
    remote: { code: remote.code, commissionerKey: keepKey, version: remote.version },
  };
}

/** Open a league by code: fetch and rebuild. */
export async function openLeague(code: string): Promise<LeagueState> {
  return leagueFromRemote(await fetchRemote(code));
}

export async function postDecree(league: LeagueState, decree: Intervention): Promise<LeagueState> {
  if (!league.remote?.commissionerKey) throw new RemoteError('Only the device that published this league can decree.', 403);
  const r = await call<{ version: number }>(`/leagues/${league.remote.code}/decrees`, { method: 'POST', headers: { 'X-Commissioner-Key': league.remote.commissionerKey }, body: JSON.stringify({ decree }) });
  return { ...league, remote: { ...league.remote, version: r.version } };
}

/** A short, stable digest of a settled race: finish order, DNFs, length. Devices must agree on it. */
export function digestFingerprint(d: RaceDigest): string {
  const s = [d.finishOrder.join(','), [...d.dnfDriverIds].sort((a, b) => a - b).join(','), d.totalTicks, d.fastestLapDriverId ?? ''].join('|');
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

export type DigestPost = 'stored' | 'matched' | 'conflict';

/** Offer a settled race as the canonical record. 'conflict' means another device saw a different race. */
export async function postDigest(league: LeagueState, digest: RaceDigest): Promise<DigestPost> {
  if (!league.remote) return 'matched';
  try {
    const r = await call<{ result: DigestPost }>(`/leagues/${league.remote.code}/digests`, { method: 'POST', body: JSON.stringify({ index: digest.index, fingerprint: digestFingerprint(digest), digest }) });
    return r.result;
  } catch (e) {
    if (e instanceof RemoteError && e.status === 409) return 'conflict';
    throw e;
  }
}

/**
 * Pull anything new from the server: decrees made elsewhere. Returns the
 * league to use (same object when nothing changed) and how the clocks differ.
 */
export async function syncRemote(league: LeagueState): Promise<{ league: LeagueState; changed: boolean; clockSkewMs: number }> {
  if (!league.remote) return { league, changed: false, clockSkewMs: 0 };
  const v = await call<{ version: number; serverNow: number }>(`/leagues/${league.remote.code}/version`);
  const clockSkewMs = v.serverNow - Date.now();
  if (v.version === league.remote.version) return { league, changed: false, clockSkewMs };
  const remote = await fetchRemote(league.remote.code);
  const have = new Set(league.interventionLog.map(keyOf));
  const fresh = remote.decrees.filter(d => !have.has(keyOf(d)));
  const next: LeagueState = {
    ...league,
    interventionLog: fresh.length ? [...league.interventionLog, ...fresh] : league.interventionLog,
    remote: { ...league.remote, version: remote.version },
  };
  return { league: next, changed: true, clockSkewMs };
}

function keyOf(i: Intervention): string {
  return `${i.type}|${i.atRaceIndex}|${i.targetDriverId ?? ''}|${i.tagId ?? ''}|${i.committedAt ?? ''}`;
}

export function leagueLink(code: string): string {
  return `https://playparabolica.com/#league=${code}`;
}

/** The code in the page URL, if someone opened a league link. */
export function codeFromLocation(): string | null {
  if (typeof location === 'undefined') return null;
  const m = location.hash.match(/league=([A-Za-z0-9]{4,12})/);
  return m ? m[1].toUpperCase() : null;
}

export { engineVersion };
