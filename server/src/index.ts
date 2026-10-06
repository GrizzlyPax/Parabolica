// Parabolica league service — Cloudflare Worker + one Durable Object per league.
//
// The server never runs the sim. A league is a few KB of facts (seed, setup,
// start time, interval, decrees); every device replays the same deterministic
// engine from them and lands on the same race at the same lap (see
// src/league/replay.test.ts). What the server adds: instant publish, instant
// decrees, a clock everyone agrees on (`serverNow`), and the canonical record —
// the first device to settle a race posts its digest; later devices must
// match it (same fingerprint) or the engine has drifted and we say so.
//
// API (all JSON; CORS open — nothing here is secret except the commissioner key):
//   POST /api/leagues                      {definition}                → {code, commissionerKey, serverNow}
//   GET  /api/leagues/:code                                           → {definition, decrees, digests, version, serverNow}
//   POST /api/leagues/:code/decrees        {decree}  + X-Commissioner-Key → {decrees, version, serverNow}
//   POST /api/leagues/:code/digests        {index, fingerprint, digest}  → {stored|matched|conflict, version, serverNow}
//   GET  /api/leagues/:code/version                                   → {version, serverNow}   (cheap poll)
//   GET  /api/health                                                   → {ok, serverNow}

export interface Env {
  LEAGUE: DurableObjectNamespace;
}

interface LeagueRecord {
  code: string;
  createdAt: number;
  commissionerKey: string;
  /** Opaque to the server: whatever the client needs to rebuild the league. */
  definition: unknown;
  decrees: unknown[];
  /** Canonical results by race index: the first digest posted, with its fingerprint. */
  digests: Record<string, { fingerprint: string; digest: unknown; postedAt: number }>;
  /** Bumps on every change; clients poll it. */
  version: number;
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
function randomCode(len = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, b => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}
function randomKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, '').slice(0, 32);
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Commissioner-Key',
  'Access-Control-Max-Age': '86400',
};

function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...CORS, ...extra } });
}
function error(message: string, status: number): Response { return json({ error: message, serverNow: Date.now() }, status); }

const MAX_BODY = 256 * 1024;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '');

    if (path === '/api/health') return json({ ok: true, serverNow: Date.now() });

    if (path === '/api/leagues' && request.method === 'POST') {
      const body = await readJson(request);
      if (!body || typeof body !== 'object' || !('definition' in body)) return error('expected {definition}', 400);
      // A fresh code; the DO is addressed by name = code, so a clash would overwrite — check first.
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = randomCode();
        const stub = env.LEAGUE.get(env.LEAGUE.idFromName(code));
        const res = await stub.fetch(new Request(`https://league/create`, { method: 'POST', body: JSON.stringify({ code, definition: (body as { definition: unknown }).definition }), headers: { 'Content-Type': 'application/json' } }));
        if (res.status === 409) continue;
        return res;
      }
      return error('could not allocate a code', 503);
    }

    const m = path.match(/^\/api\/leagues\/([A-Z0-9]{4,12})(?:\/(decrees|digests|version))?$/i);
    if (m) {
      const code = m[1].toUpperCase();
      const stub = env.LEAGUE.get(env.LEAGUE.idFromName(code));
      const sub = m[2] ?? '';
      const target = new URL(`https://league/${sub || 'state'}`);
      return stub.fetch(new Request(target.toString(), request));
    }

    return error('not found', 404);
  },
};

async function readJson(request: Request): Promise<unknown> {
  const text = await request.text();
  if (text.length > MAX_BODY) return null;
  try { return JSON.parse(text); } catch { return null; }
}

export class LeagueObject {
  private state: DurableObjectState;
  constructor(state: DurableObjectState) { this.state = state; }

  private async load(): Promise<LeagueRecord | undefined> { return this.state.storage.get<LeagueRecord>('league'); }
  private async save(rec: LeagueRecord): Promise<void> { rec.version += 1; await this.state.storage.put('league', rec); }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const op = url.pathname.slice(1);
    const rec = await this.load();

    if (op === 'create') {
      if (rec) return error('code taken', 409);
      const body = await readJson(request) as { code: string; definition: unknown } | null;
      if (!body) return error('bad body', 400);
      const fresh: LeagueRecord = { code: body.code, createdAt: Date.now(), commissionerKey: randomKey(), definition: body.definition, decrees: [], digests: {}, version: 0 };
      await this.save(fresh);
      return json({ code: fresh.code, commissionerKey: fresh.commissionerKey, version: fresh.version, serverNow: Date.now() }, 201);
    }

    if (!rec) return error('no such league', 404);

    if (op === 'state' && request.method === 'GET') {
      return json({ code: rec.code, createdAt: rec.createdAt, definition: rec.definition, decrees: rec.decrees, digests: rec.digests, version: rec.version, serverNow: Date.now() });
    }
    if (op === 'version' && request.method === 'GET') {
      return json({ version: rec.version, serverNow: Date.now() });
    }
    if (op === 'decrees' && request.method === 'POST') {
      if (request.headers.get('X-Commissioner-Key') !== rec.commissionerKey) return error('not the commissioner', 403);
      const body = await readJson(request) as { decree?: unknown } | null;
      if (!body?.decree || typeof body.decree !== 'object') return error('expected {decree}', 400);
      rec.decrees.push(body.decree);
      await this.save(rec);
      return json({ decrees: rec.decrees, version: rec.version, serverNow: Date.now() });
    }
    if (op === 'digests' && request.method === 'POST') {
      const body = await readJson(request) as { index?: number; fingerprint?: string; digest?: unknown } | null;
      if (!body || typeof body.index !== 'number' || typeof body.fingerprint !== 'string' || body.digest === undefined) return error('expected {index, fingerprint, digest}', 400);
      const key = String(body.index);
      const have = rec.digests[key];
      if (!have) {
        rec.digests[key] = { fingerprint: body.fingerprint, digest: body.digest, postedAt: Date.now() };
        await this.save(rec);
        return json({ result: 'stored', version: rec.version, serverNow: Date.now() });
      }
      if (have.fingerprint === body.fingerprint) return json({ result: 'matched', version: rec.version, serverNow: Date.now() });
      // Two devices disagree about the same race: the engine differs between them.
      return json({ result: 'conflict', canonical: have, version: rec.version, serverNow: Date.now() }, 409);
    }
    return error('not found', 404);
  }
}
