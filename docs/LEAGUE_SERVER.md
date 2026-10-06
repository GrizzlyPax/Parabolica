# The league server — one league, every device

**Where:** `server/` (Cloudflare Worker + one Durable Object per league), deployed by `.github/workflows/deploy-api.yml` to `https://playparabolica.com/api/*`. Client: `src/league/remote.ts`.

## The idea

A league is a few KB of facts: seed, setup (teams, calendar, interval, start time, ruleset) and the commissioner's decrees. Everything else — roster, tags, every race result, standings — is computed from those facts by a deterministic engine on the wall clock. `src/league/replay.test.ts` pins this: a season settled all at once is byte-identical to one settled race by race; `src/league/remote.test.ts` pins that a league rebuilt from the server's facts settles to the same results as the device that founded it.

So the server **never runs the sim**. It holds the facts, hands out a clock everyone agrees on (`serverNow`), takes decrees instantly, and keeps the canonical record: the first device to settle a race posts its digest, and every later device must match its fingerprint. A mismatch is reported as engine drift, which is what it is.

## Flow

1. Found a league as before (local). On the league screen: **Publish — watch from anywhere** → `POST /api/leagues` → the league gets a **code** (e.g. `A2YCFE`) and this device keeps the **commissioner key**.
2. Anywhere else: main menu → **Open a league by code**, or the link `https://playparabolica.com/#league=CODE`. The device fetches the facts, rebuilds the league with `createLeague`, settles to now, and saves it as its local league. It is a *watcher*: same races, same clock; decrees belong to the commissioner's device.
3. Every device polls `GET /api/leagues/:code/version` every 30 s; a bump pulls new decrees. After settling a race it `POST`s the digest; the server stores the first and compares the rest.
4. Dev-console decrees (`window.league.attach(...)`) on the commissioner's device are posted with the key, so every device applies them from the same race.

## API

| | |
|---|---|
| `POST /api/leagues` `{definition}` | → `{code, commissionerKey, version, serverNow}` |
| `GET /api/leagues/:code` | → `{definition, decrees, digests, version, serverNow}` |
| `POST /api/leagues/:code/decrees` `{decree}` + `X-Commissioner-Key` | → `{decrees, version}` |
| `POST /api/leagues/:code/digests` `{index, fingerprint, digest}` | → `stored` / `matched` / `conflict` (409, with the canonical digest) |
| `GET /api/leagues/:code/version` | → `{version, serverNow}` (the cheap poll) |
| `GET /api/health` | → `{ok, serverNow}` |

CORS is open (nothing is secret but the key), so localhost and the preview artifact talk to the deployed API; `VITE_API_BASE` overrides the base for local testing against `wrangler dev`.

## Deploy

Two repo secrets: `CLOUDFLARE_API_TOKEN` (template "Edit Cloudflare Workers") and `CLOUDFLARE_ACCOUNT_ID`. Any push to main that touches `server/` deploys; `workflow_dispatch` deploys on demand. Local: `cd server && npx wrangler dev --local`.

## Limits and what's next (#237)

- The local slot holds one league; opening a code replaces it (with a confirm if it was an unpublished league of this device's own).
- The commissioner key lives only on the publishing device. Accounts (magic link / passkeys) would let the commissioner decree from any device — that's the next step on #237.
- Clock skew over 20 s is shown on the league screen; a race may appear to start early or late on that device.
- The server does not settle races itself (free-plan CPU limits make headless races in a Worker impractical). The record is written by whichever device settles first; a season nobody opens has no record until someone does. Server-side settle on an alarm is possible on the paid plan.
- Ledger (#245): a settled season's digests already live on the server; exporting them to `public/ledger/` is a small follow-up.
