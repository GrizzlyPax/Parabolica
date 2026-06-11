# Commissioner Mode — Technical Plan

*June 2026. Companion to `COMMISSIONER_MODE.md` (the what/why); this is the
how. Grounded in a full audit of the current codebase — every claim below
about existing code was verified against source, with locations cited.*

## Build status

| PR | Status |
|---|---|
| 1 — Seeded RNG core | ✅ shipped (`src/engine/rng.ts`, engine injection, golden-master tests) |
| 2 — Deterministic generation | ✅ shipped (rng threaded through `generators/` + `maybeAssignTag`) |
| 3 — Storage layer + resume current game | ✅ shipped (`src/storage/persistence.ts`, Resume Season card; closes #43; browser-verified) |
| 4 — League core: schedule + settle | ✅ shipped (`src/league/`: createLeague, settle loop, interventions, event-cap fix, fake-clock tests) |
| 5 — Gods, demands, smiting | placeholder shipped (`league/gods.ts`: 3 gods' identity + voice; appetite evaluators/smiting still to build) |
| 6 — League UI shell | ✅ shipped (`league/ui/`: FoundingScreen + LeagueScreen — check-in reel, live countdown settle, standings, The Grid, calendar, chronicle digests; browser-verified). Hall of Seasons + commentary-voiced digests still pending. |
| 6.5 — Live broadcasts | ✅ shipped: races occupy real-time windows (`LIVE_TICK_MS`/tick, broadcasts queue — never overlap). Check in mid-window → 🔴 LIVE card → `engine.fastForward()` joins the race at the true current tick, spectator mode (no controls). Determinism guarantees the live view and headless settle are the same race (under test). The inaugural race airs at founding. |
| 7 — Interventions UI + decree beat | not started (intervention *engine* shipped in PR 4: `rosterStateAt` + append-only log) |

*Note vs. plan: settle shipped as a pure synchronous function with a progress
callback (`settleLeague(league, {now, onRaceSettled})`) rather than inside a
worker — the worker is a thin wrapper to add with the backfill UI in PR 6.
Headless races measured fast enough (~tens of ms each) that the worker is
about UI smoothness, not feasibility. In practice the synchronous settle also
proved fine for the PR 6 check-in reel; the worker remains an option if long
backfills (16-race Classic-cadence sleeps) ever stutter.*

*June 2026 scope change: player betting was retired entirely (decision: the
GDD demotes betting to far-future NPC crowds). Deleted: MarbleMode betting
screens, Full Season mode (SeasonSetup/SeasonStandings/SeasonComplete), the
season snapshot save, the locked Parabolica 1 / Feeder Series menu teasers.
Kept: `betting/utils.ts` odds math + BetLab (the calibration workshop), the
bet-swing persona lines in `feed/commentary.ts` — all future NPC-crowd fuel.
Commissioner Mode replaced Full Season as the menu's hero card. UI build
order was deliberately flipped: PR 6 shell shipped before PR 5 god mechanics
so the loop is playable with placeholder gods.*

## What we're building on

The audit found the foundation is better than expected. Two things we
assumed we'd have to build already exist:

| Asset | Where | Why it matters |
|---|---|---|
| **Headless race execution** | `RaceEngine.runHeadless()` (`RaceEngine.ts:2869`) — synchronous tick loop, no DOM, no listeners, returns `{drivers, raceState, events}` | This *is* the backfill primitive. The labs already run it thousands of times per batch. |
| **Deterministic post-hoc commentary** | `feed/commentary.ts` — zero `Math.random()`; template choice is hash-seeded from `(tick, type, driverId)` | Digests for missed races are just `voiceNotification()` over a stored event log. No new tech. |
| **Engine-from-config** | `RaceEngine.createForWorker(simVars)` (`RaceEngine.ts:2855`) bypasses the singleton and accepts injected `SimVariables` | Per-league physics (decrees!) without touching `CANON_VARIABLES` globally. |
| **Typed event log** | 19-variant `RaceEventType` union (`RaceEngine.ts:179`) with impact/magnitude | God appetites and digests both consume this; nothing new to emit for MVP. |
| **Pure tick-time** | Race duration is tick-count, not wall-clock; the engine's only real-clock read is UI notify throttling (`RaceEngine.ts:2473`), which doesn't touch sim state | Replay at any speed from the same seed gives the same race. |

And the gaps, which are exactly the four problems this document plans:

1. **No determinism** — 59 `Math.random()` call sites; zero seed concept
   anywhere in the sim.
2. **No save states** — zero `localStorage`/`sessionStorage`/`indexedDB`
   usage. `SeasonState` lives in React state in `App.tsx`; refresh = total
   amnesia.
3. **No scheduler** — nothing relates races to wall-clock time.
4. **No league runtime** — gods, demands, decrees, interventions, scoring
   don't exist as systems.

---

## Problem 1 — Determinism (seeded RNG)

### The call-site map (audited)

| Where | Count | Sim-critical? |
|---|---|---|
| `RaceEngine.ts` | 20 (speed rolls, luck, crashes, blowouts, pit durations, track events, tag triggers, flavor-message picks) | **Yes** |
| `data/tags.ts` | 2 (tag trigger + random tag assignment) | **Yes** |
| `generators/` (drivers 5, cars 9, names 6, tracks 3) | 23 | **Yes** (roster identity must be reproducible) |
| Workers (`simLabWorker`, `betLabWorker`) | 3 (random track picks) | Lab-only — seed for reproducible lab runs, low priority |
| UI flavor (`MarbleMode` 7, `WatchMode` 1, `App.tsx` 2) | 10 | **No** — quotes, bet IDs; can stay unseeded |

So the real surface is **45 call sites** (22 engine+tags, 23 generators),
and the replacement is mechanical.

### Plan

- **`src/engine/rng.ts`**: a tiny module, no dependency —
  `mulberry32(seed)` (~10 lines), `deriveSeed(parent, ...labels)` (hash
  mixing, so one league seed fans out into per-race and per-generation
  streams), and `shuffle(arr, rng)` (Fisher–Yates — which also fixes the
  three `.sort(() => Math.random() - 0.5)` biased-shuffle sites).
- **Inject, don't refactor**: `RaceEngine` gets a `private rng: () => number
  = Math.random` field and a `setSeed(seed)`/constructor param. All 22
  engine+tags call sites become `this.rng()`. The 2,892-line god object gets
  *no other changes* — the ARCHITECTURE_REVIEW engine split stays a separate,
  later project. Default remains `Math.random`-backed so Quick Race and the
  labs behave identically until they opt in.
- **Generators take an `rng` parameter** (defaulting to `Math.random`):
  `generateRosterFromTeams(teamIds, rng)`, etc. League setup passes a stream
  derived from the league seed, so the same seed always births the same
  drivers, names, quirks, cars, and tags.
- **Two stream families per league**: `deriveSeed(leagueSeed, 'genesis')`
  for generation, `deriveSeed(leagueSeed, 'race', i)` for race *i*. Race
  seeds are fixed at season creation — interventions change the *roster
  state* a race runs with, never its seed.

### Determinism leaks (checked)

- `performance.now()` in the engine only throttles listener notification —
  no sim impact. Nothing else reads the clock in the tick path.
- `Map` iteration is insertion-ordered and `Array.sort` is stable in every
  target engine — no cross-browser hazard from those.
- JS floating-point arithmetic is IEEE-754-deterministic for identical
  operation sequences — same seed, same race, on every machine. (This is
  also what makes a shared "daily run" possible later with no server.)

### Tests (the contract)

- **Golden-master**: run `runHeadless()` with seed `X` and a fixed roster;
  assert exact finish order + a hash of the event log. Any engine change
  that breaks replay compatibility now fails loudly — which matters because
  **saved leagues are replayed from seeds** (see Problem 2), so engine
  changes are save-breaking changes and the test suite is what tells us.
- Same-seed-twice equality, different-seed inequality, generator
  reproducibility.

---

## Problem 2 — Save states (persistence)

### The insight: determinism IS the save file

Once races are seed-reproducible, we don't need to persist *outcomes* — we
persist *inputs* and can recompute everything. The canonical save is tiny
and append-only:

```ts
interface LeagueSave {
  schemaVersion: number;        // migration gate
  engineVersion: string;        // npm version that created it (replay compat)
  leagueSeed: number;
  setup: SeasonSetup;           // god, team ids, track ids, cadence, createdAt
  schedule: ScheduledRace[];    // { index, scheduledAt, seed } — fixed at creation
  interventionLog: Intervention[]; // append-only: {atRaceIndex, type, payload, committedAt}
  settledThrough: number;       // last race index whose results are final
  cache: DerivedCache;          // standings, stat lines, god meter, chronicle-so-far
}
```

The `cache` exists purely so app-open doesn't re-simulate the whole season;
it can be deleted and rebuilt from the inputs at any time. That property —
*the cache is disposable* — is the design's whole safety story: corruption,
schema drift in derived data, or bugs in incremental accumulation all have
the same fix (recompute from inputs).

### Storage layer

- **`src/storage/persistence.ts`**: a thin module over `localStorage` with a
  versioned envelope, `JSON.parse` guarded, and one namespace key per
  concern (`parabolica.league.v1`, `parabolica.hall.v1`,
  `parabolica.settings.v1`). Wrapped behind an interface so a later move to
  IndexedDB (or a sync backend for Big Leagues) is a swap, not a rewrite.
- **Serialization trap (audited)**: `SeasonState.driverStats` is a
  `Map<number, DriverSeasonStats>` (`types/season.ts`) — `JSON.stringify`
  silently turns Maps into `{}`. The storage module owns
  encode/decode (Maps ⇄ entry arrays), and a round-trip test
  (`decode(encode(x)) deep-equals x`) guards every persisted type.
- **Write triggers**: after every settle, after every commissioner action,
  and on `visibilitychange`→hidden. Writes are small (the save is inputs +
  one cache object), so no debouncing heroics needed.
- **Quota**: localStorage gives ~5MB. The inputs-only save is a few KB. The
  one fat object is per-race event logs for digests — see retention policy
  under Problem 3. Even keeping *every* event of a 16-race season (~19
  event types, a few hundred events/race × ~150 bytes) is well under 1MB.
  Fine for MVP; revisit for the Hall if chronicles hoard full logs (they
  shouldn't — a chronicle stores its highlights, not its ticks).
- **Migration policy (pre-1.0)**: `schemaVersion` mismatch or
  `engineVersion` replay-compat break does **not** attempt migration — the
  league is archived to the Hall as-is with cause of death "consumed by a
  shifting universe" and the player starts fresh. In-fiction graceful, zero
  migration-code burden while the schema is hot. Post-1.0, real migrations.
- **Multi-tab**: a `storage`-event listener detects a second tab settling
  the same league; MVP response is a "the league is open elsewhere"
  lockout banner, not conflict resolution.
- **Quick win en route**: this same module + a snapshot of the *existing*
  season mode closes issue #43 (persistence, priority: high) before
  Commissioner Mode even ships — and proves the layer on the current game.

### What about mid-race state?

We never save it. A race is atomic: either it hasn't fired (only its seed
exists) or it's settled (its outcomes are in the cache). A live *broadcast*
is just a replay of an already-determined race (see Problem 3), so closing
the tab mid-broadcast loses nothing — reopen and the race is simply settled.
This deletes the entire hardest class of persistence bugs (serializing the
2,892-line engine's internal state) for free.

## Problem 3 — The wall-clock scheduler

### Settle: the one function that makes time real

```
settle(league, now):
  for each race r with r.scheduledAt <= now, in order, not yet settled:
    roster = rosterStateAt(r.index)            // genesis + interventions so far
    result = runHeadless(roster, r.seed, leagueSimVars)
    accumulate: standings, stat lines, god appetite, demand progress
    persist event log (per retention policy) + derived cache
    if god displeasure exceeds threshold → smiting: truncate schedule, end run
  return digest of everything that just happened
```

Called on app open, on `visibilitychange`→visible, and on a coarse interval
while the tab sits open. Commissioner commands (interventions, decree picks)
are **only accepted when `settledThrough` is current** — the app settles
first, then listens. That single ordering rule is what makes it impossible
to intervene in a race whose time has passed, with no clock-integrity
machinery at all.

### Settle runs in a worker

Audited cost: a headless race computes in roughly 1–2s. A fully missed
16-race season is therefore **up to ~30s of compute** — unacceptable on the
main thread, and *exactly* the pattern the codebase already has twice
(`simLabWorker`, `betLabWorker`: create engine → run headless → post
progress). Settle becomes a third worker, and the backfill progress bar is
a content moment, not a spinner: races resolve one at a time on screen,
newest digest lines streaming in — *the league remembering itself*.

### Watching live = replaying the present

A race's outcome is determined the moment `scheduledAt` passes — but
determinism means presentation is decoupled from computation:

- **Present at fire time**: run the same seed through the engine on the
  normal `setInterval` path (`start()`, `RaceEngine.ts:814`) and the user
  watches "live" in WatchMode. It's a replay that happens to be of the
  present. Same code path, same race, same result as headless settle —
  the golden-master test guarantees it.
- **Arrive mid-race**: tick-time makes joining trivial — compute
  `elapsedTicks = (now - scheduledAt) / tickInterval`, `runHeadless` to that
  tick, then continue on the interval. (Post-MVP polish; MVP can offer
  replay-from-start or just the digest.)
- **Clock tampering**: not defended. Single-player toy; rolling your system
  clock forward fast-forwards your ant farm. The one guard worth having: if
  `now` regresses *behind* `settledThrough`'s timestamp, refuse to settle
  (never re-run history) and let already-settled results stand.

### Event-log retention (one real bug to fix)

The engine **caps its event log at the last 500 events**
(`RaceEngine.ts:2467`) to protect long-running live UI. For settle/backfill
that's a silent digest-eater — early-race events vanish. Fix: make the cap
a config field; headless league runs set it `Infinity` (or better, settle
drains events per-race anyway). Retention: full logs for the most recent
~3 unviewed races (rich digest), distilled highlights (the
top-`magnitude` events the chronicle and god evaluators care about) for
older ones.

## Problem 4 — The league runtime

All new code lives in **`src/league/`** — pure TypeScript, no React, every
piece unit-testable headlessly:

```
src/league/
  types.ts        // LeagueSave, ScheduledRace, Intervention, Demand, Decree, Chronicle
  schedule.ts     // season creation: seeds, scheduledAt cadence
  settle.ts       // the settle loop (worker entry point wraps this)
  gods.ts         // appetite evaluators + demand generation + displeasure
  decrees.ts      // decree definitions → tag bundles / SimVariables deltas
  interventions.ts// token accounting + applying tags to roster state
  score.ts        // run scoring + chronicle assembly
  persistence.ts  // (or src/storage/ shared with #43 work)
```

- **Gods are pure functions over stat lines.** An appetite evaluator takes
  the accumulated per-race stats (crash/DNF counts, points spread between
  P1–P2, lead changes — all derivable from existing `RaceEvent`s and
  results) and returns appetite satisfaction. Demands are generated from
  the same vocabulary with explicit, checkable terms. No engine changes:
  the 19 event types already carry what MVP gods eat.
- **Decrees and interventions both resolve to data the engine already
  consumes**: tag attachments (the 35-tag system in `data/tags.ts`, applied
  via roster state) and, for decrees that bend physics, a per-league
  `SimVariables` override passed through the existing
  `createForWorker(simVars)` seam. The GDD's pillar 6 ("everything resolves
  to tags") is also the cheapest implementation path — intervention =
  append `{type:'attach-tag', driverId, tagId}` to the log; the next
  `rosterStateAt()` includes it.
- **The singleton stays out of it.** Live mode's `RaceEngine.getInstance()`
  keeps serving Quick Race untouched; the league path always creates fresh
  engine instances (worker-style) per settle and per broadcast. Killing the
  singleton entirely remains an ARCHITECTURE_REVIEW Phase 3 concern, not a
  prerequisite.
- **UI shell**: four screens (Founding/setup, Digest, League pulse, Hall of
  Seasons) added to the existing `App.tsx` state machine. This *will*
  aggravate the prop-drilling the review flagged — if epic #145's hash
  routing lands first, great; if not, add the screens the boring way and
  let #145 clean up. Don't gate the game on a routing refactor.

---

## PR-by-PR build plan

Ordered so every PR lands value alone and nothing blocks on a refactor:

| # | PR | Contents | Size |
|---|---|---|---|
| 1 | **Seeded RNG core** | `src/engine/rng.ts`; inject into `RaceEngine` + `data/tags.ts` (22 sites); golden-master + determinism tests | S–M (the half-day ARCH estimate + tests) |
| 2 | **Deterministic generation** | `rng` param through `generators/` (23 sites); seeded Fisher–Yates replaces biased shuffles; reproducible-roster tests | S |
| 3 | **Storage layer + resume current game** | `src/storage/`; Map-safe serialization; existing season mode snapshots/resumes — **closes #43** | M |
| 4 | **League core: schedule + settle** | `src/league/` types, schedule, settle-in-worker, event-cap config fix, fake-clock test suite | M–L |
| 5 | **Gods, demands, smiting** | `gods.ts` evaluators over stat lines; explicit-demand UI data; smiting truncation + chronicle stub | M |
| 6 | **League UI shell** | Founding, Digest (commentary over stored logs), Pulse, Hall screens in the App state machine | M–L |
| 7 | **Interventions + decree beat** | Tag tokens, the mid-season pick-1-of-3, decree → tags/simVars plumbing | M |

PRs 1–3 are pure infrastructure with standalone payoff (reproducible labs,
shareable seeds toward #40, season persistence #43). The MVP is PRs 1–7;
nothing in the list requires the Phase 3 engine split, the routing epic, or
any UI framework change.

## Risk register

- **Engine changes break replay.** Highest structural risk: any tweak to
  tick logic changes what a seed produces, invalidating saved leagues'
  recomputability. Mitigations: golden-master tests make breaks loud;
  `engineVersion` stamp + the pre-1.0 archive-don't-migrate policy makes
  them graceful; the derived cache means already-settled results survive
  even when replay compat breaks (only *unsettled* races need the engine).
- **Hidden nondeterminism in 2,892 unread lines.** The audit found the RNG
  sites and clock reads, but the golden-master test is the real proof.
  Write it in PR 1 and run it cross-browser (vitest + one Playwright pass)
  before trusting the architecture.
- **Backfill compute.** ~1–2s/race is fine in a worker for 16 races; if
  seasons grow or devices disappoint, headless races have obvious fat to
  trim (the 500-event UI cap logic, listener machinery) — defer until
  measured.
- **localStorage fragility** (private browsing, storage clears). Accepted
  for MVP; the export/import of a `LeagueSave` as a JSON blob is nearly
  free to add and doubles as the first share mechanism (a save *is* a
  seed + choices — it's a replay file).
- **Scope adhesion.** The league layer will tempt engine refactors
  (singleton removal, the effect-system merge). The plan deliberately
  touches the engine in exactly two ways — RNG injection and the event-cap
  config — everything else composes around it.

## Open technical questions

1. **Cadence math**: fixed every-3-hours vs. a schedule template with
   jitter ("races at :00, gods willing") — cosmetic, decide at PR 4.
2. **Where does Quick Race's roster come from post-PR-2** — keep fresh
   random per load (current behavior, `rng` defaulted) or offer "today's
   grid" from a date-derived seed as a free daily-run prototype?
3. **Worker code sharing**: settle worker will be the third copy of the
   create-engine-and-run pattern — extract `src/workers/common.ts` then
   (ARCH review Phase 5 item), or tolerate a third copy until after MVP?
4. **Digest length budget**: how many feed lines per missed race before
   summarization kicks in? (Design question wearing a technical hat —
   answer in playtesting.)
