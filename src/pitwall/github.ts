// The Pit Wall's GitHub client. Reads need no login (the repo is public);
// writes use a token the user pastes once per device. Polling is cheap:
// every read sends the last ETag, and GitHub doesn't count a 304 against
// the rate limit.
import { linkedIssues, type Move, type PwIssue } from './lanes';

export const REPO = 'GrizzlyPax/Parabolica';
const API = `https://api.github.com/repos/${REPO}`;
const TOKEN_KEY = 'parabolica.pitwall.token';
export const UNLOCK_KEY = 'parabolica.pitwall.unlocked';
const DONE_WINDOW_DAYS = 21;

export function loadToken(): string | null { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } }
export function saveToken(t: string | null) {
  try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch { /* private window */ }
}
export function isUnlocked(): boolean { try { return localStorage.getItem(UNLOCK_KEY) === '1' || !!localStorage.getItem(TOKEN_KEY); } catch { return false; } }
export function unlock() { try { localStorage.setItem(UNLOCK_KEY, '1'); } catch { /* private window */ } }

export interface RateInfo { remaining: number; limit: number; resetAt: number }
export class GitHubError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

const etags = new Map<string, { etag: string; data: unknown }>();
let lastRate: RateInfo | null = null;
export const rateInfo = () => lastRate;

async function gh<T>(path: string, init: RequestInit = {}, token = loadToken()): Promise<T> {
  const url = path.startsWith('http') ? path : `${API}${path}`;
  const method = (init.method ?? 'GET').toUpperCase();
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (init.body) headers['Content-Type'] = 'application/json';
  const cached = method === 'GET' ? etags.get(url) : undefined;
  if (cached) headers['If-None-Match'] = cached.etag;
  const res = await fetch(url, { ...init, headers: { ...headers, ...(init.headers as Record<string, string> | undefined) } });
  const rem = res.headers.get('x-ratelimit-remaining');
  if (rem !== null) lastRate = { remaining: +rem, limit: +(res.headers.get('x-ratelimit-limit') ?? 0), resetAt: +(res.headers.get('x-ratelimit-reset') ?? 0) * 1000 };
  if (res.status === 304 && cached) return cached.data as T;
  if (!res.ok) {
    let msg = `GitHub said ${res.status}.`;
    if (res.status === 401) msg = 'GitHub rejected the token. Paste a new one in Settings.';
    else if (res.status === 403 && rem === '0') msg = `Out of GitHub reads until ${new Date((lastRate?.resetAt ?? 0)).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}. Add a token to get 5,000 an hour.`;
    else if (res.status === 403 || res.status === 404) msg = token ? 'This token cannot change issues on Parabolica. It needs Issues: read and write.' : 'GitHub refused the request.';
    else if (res.status === 422) { try { msg = ((await res.json()) as { message?: string }).message ?? msg; } catch { /* keep */ } }
    throw new GitHubError(msg, res.status);
  }
  if (res.status === 204) return undefined as T;
  const data = (await res.json()) as T;
  const etag = res.headers.get('etag');
  if (method === 'GET' && etag) etags.set(url, { etag, data });
  return data;
}

interface GhLabel { name: string }
interface GhIssue {
  number: number; title: string; body: string | null; html_url: string; state: 'open' | 'closed';
  state_reason?: string | null; labels: (GhLabel | string)[]; milestone: { title: string } | null;
  updated_at: string; closed_at: string | null; comments: number; pull_request?: unknown;
}
interface GhPull { number: number; title: string; body: string | null; html_url: string; draft: boolean; head: { ref: string }; merged_at: string | null; closed_at: string | null }

export interface PwPull { number: number; title: string; url: string; draft: boolean; mergedAt: string | null; issues: number[] }
export interface Snapshot { issues: PwIssue[]; pulls: PwPull[]; merged: PwPull[]; at: number }

const toIssue = (g: GhIssue): PwIssue => ({
  number: g.number, title: g.title, body: g.body ?? '', url: g.html_url, state: g.state, stateReason: g.state_reason,
  labels: g.labels.map(l => (typeof l === 'string' ? l : l.name)), milestone: g.milestone?.title ?? null,
  updatedAt: g.updated_at, closedAt: g.closed_at, comments: g.comments, prs: [],
});
const toPull = (p: GhPull): PwPull => ({
  number: p.number, title: p.title, url: p.html_url, draft: p.draft, mergedAt: p.merged_at,
  issues: linkedIssues({ title: p.title, body: p.body, head: p.head.ref }),
});

async function pages<T>(path: string, max = 3): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; page <= max; page++) {
    const sep = path.includes('?') ? '&' : '?';
    const batch = await gh<T[]>(`${path}${sep}per_page=100&page=${page}`);
    out.push(...batch);
    if (batch.length < 100) break;
  }
  return out;
}

/** Everything the board shows, in 3–5 requests (most come back 304 when nothing changed). */
export async function loadBoard(): Promise<Snapshot> {
  const since = new Date(Date.now() - DONE_WINDOW_DAYS * 864e5).toISOString();
  const [open, closed, openPulls, closedPulls] = await Promise.all([
    pages<GhIssue>('/issues?state=open&sort=updated'),
    pages<GhIssue>(`/issues?state=closed&since=${since}&sort=updated`, 1),
    gh<GhPull[]>('/pulls?state=open&per_page=50'),
    gh<GhPull[]>('/pulls?state=closed&sort=updated&direction=desc&per_page=30'),
  ]);
  const pulls = openPulls.map(toPull);
  const issues = [...open, ...closed.filter(i => i.closed_at && i.closed_at >= since)]
    .filter(i => !i.pull_request)
    .map(toIssue)
    .map(i => ({ ...i, prs: i.state === 'open' ? pulls.filter(p => p.issues.includes(i.number)).map(p => p.number) : [] }));
  const merged = closedPulls.filter(p => p.merged_at).map(toPull).sort((a, b) => (b.mergedAt ?? '').localeCompare(a.mergedAt ?? ''));
  return { issues, pulls, merged, at: Date.now() };
}

export interface PwComment { id: number; author: string; body: string; at: string; url: string }
export async function loadComments(n: number): Promise<PwComment[]> {
  const list = await gh<{ id: number; user: { login: string } | null; body: string; created_at: string; html_url: string }[]>(`/issues/${n}/comments?per_page=100`);
  return list.map(c => ({ id: c.id, author: c.user?.login ?? 'someone', body: c.body, at: c.created_at, url: c.html_url }));
}

// ---- writes (token required) ----

/** Check a token can write issues here. Resolves to the GitHub login. */
export async function checkToken(token: string): Promise<string> {
  const me = await gh<{ login: string }>('https://api.github.com/user', {}, token);
  const repo = await gh<{ permissions?: { push?: boolean; triage?: boolean } }>('', {}, token);
  if (repo.permissions && !repo.permissions.push && !repo.permissions.triage) throw new GitHubError(`${me.login} can't change issues on Parabolica.`, 403);
  return me.login;
}

export async function createIssue(title: string, body: string, labels: string[]): Promise<PwIssue> {
  return toIssue(await gh<GhIssue>('/issues', { method: 'POST', body: JSON.stringify({ title, body, labels }) }));
}

export async function updateIssue(n: number, patch: { title?: string; body?: string; labels?: string[]; state?: 'open' | 'closed' }): Promise<PwIssue> {
  return toIssue(await gh<GhIssue>(`/issues/${n}`, { method: 'PATCH', body: JSON.stringify(patch) }));
}

/** Apply a lane move: one PATCH carrying the whole new label set (and state). */
export async function applyMoveRemote(i: PwIssue, m: Move): Promise<PwIssue> {
  const labels = i.labels.filter(l => !m.removeLabels.includes(l)).concat(m.addLabels);
  return updateIssue(i.number, { labels, ...(m.state ? { state: m.state } : {}) });
}

export async function addComment(n: number, body: string): Promise<void> {
  await gh(`/issues/${n}/comments`, { method: 'POST', body: JSON.stringify({ body }) });
}
