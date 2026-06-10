# Parabolica — Architecture Review & Restructuring Proposal

*June 2026. Findings verified against the running app (dev + production builds) and a new automated test suite (`npm test`).*

## Verified bugs found (and fixed in this pass)

### 1. Live races ran different tire physics than the labs ⚠️ (fixed)
Commit `b6cce06` ("balance: reduce DNF rate from ~70% to ~20%") lowered tire
blowout risk in `CANON_VARIABLES` (`src/simlab/types.ts`) — but missed the
hardcoded `TIRE_COMPOUNDS` table in `src/RaceEngine.ts`. Live races use
`RaceEngine.getInstance()`, which never sets `simVars`, so
`getTireCompound()` fell back to the stale table: **5× the blowout risk that
SimLab and BetLab calibrate against** (soft: 0.0015 vs 0.0003).

Every odds calibration produced by BetLab was for a game your players weren't
playing. Fix: `TIRE_COMPOUNDS` now aliases `CANON_VARIABLES.tires`, and a
regression test (`src/RaceEngine.test.ts`) fails if they ever drift again.

### 2. Betting odds could invert between adjacent ranks (fixed)
`calculateDriverOdds()` applied deterministic jitter of ±10%, but the gap
between adjacent rank modifiers at the longshot end is only ~6%. Result: a
rank-18 driver could show *shorter* win odds than the rank-17 driver
(verified: 37.8× vs 37.4×). Jitter is now capped at ±3%, below the smallest
adjacent-rank gap, with a test asserting win odds are strictly increasing in
rank.

### 3. Stale "20 drivers" assumptions (fixed)
The grid is 22 drivers (11 teams × 2), but BetLab's bet-count estimate said
"× 20 drivers" and `betLabWorker.ts` used `?? 20` as a rank fallback. Both
now derive from actual roster size.

### 4. Issue #139 (BetLab progress bar) — could not reproduce
Tested in a real browser (Chromium via Playwright) against both the dev
server and the production build: the progress bar fills smoothly from the
first 500ms (0% → 1% → 3% → … → 98%) with track names updating, over a ~25s
500-race run. The mitigations already in `betLabWorker.ts` (initial progress
post + 5ms yields per interval) are working. Recommend re-testing on the
original machine/browser and closing if it no longer reproduces.

## What's structurally sound

- Clean TypeScript throughout — zero `as any` / `@ts-ignore`.
- The Web Worker split for Monte Carlo simulation is the right architecture.
- `betting/utils.ts` as pure functions was a good instinct — it's why it was
  trivially testable.
- The `SimVariables`/`CANON_VARIABLES` config system is a genuinely good
  design; the problem is only that it isn't yet the *only* source of truth.

## Restructuring proposal (in priority order)

### Phase 1 — Safety net (partially done in this pass)
1. **Test suite**: vitest is now wired up (`npm test`, 14 tests covering
   betting math and headless race invariants, incl. a DNF-rate sanity check).
   Grow this before any large refactor — especially around `RaceEngine.tick()`.
2. **Seeded RNG**: `Math.random()` is called directly throughout
   `RaceEngine.ts`. Add an injectable PRNG (e.g. mulberry32) so races are
   reproducible. This unlocks: shareable race replays (issue #40), regression
   tests with exact expected outcomes, and "same race, different bets"
   debugging. ~Half-day job; do it before splitting the engine.

### Phase 2 — Single source of truth for tuning
Move the remaining hardcoded constants in `RaceEngine.ts` (pit speed limits,
unsafety-car laps, crash thresholds in `DEFAULT_CONFIG`, etc.) into
`CANON_VARIABLES`, and make the singleton engine read `CANON_VARIABLES` by
default rather than maintaining fallback tables. The tire bug above is the
canonical example of why two sources of truth eventually disagree.
`simlab/types.ts` (655 lines) should also be split: worker message types,
results types, and the `CANON_VARIABLES` config belong in separate modules —
config probably in `src/config/canon.ts` so importing it doesn't drag lab
types into the engine.

### Phase 3 — Break up RaceEngine.ts (2,892 lines)
It's a god object: movement, tire wear, crashes, pit strategy, tag effects,
track events, safety car, event logging, and three parallel effect-storage
systems (`activeTrackEffects`, `unifiedEffects`, `activeTagEffects`).
Suggested seams, extracted one at a time with tests green between each step:

```
src/engine/
  RaceEngine.ts      // coordinator: tick loop, state machine, subscriptions
  tires.ts           // wear, cliff, blowout
  pits.ts            // pit decisions + phases  (issue #138 wants this anyway)
  incidents.ts       // crashes, spins, mechanical DNFs  (enables issue #82)
  effects.ts         // ONE effect system replacing the three parallel ones
```

Issue #138 (pit strategy revamp) and #82 (spin-outs) both become much easier
after this split — that's the time to do it, not before.

### Phase 4 — App shell: routing + persistence
- **Persistence (issue #43, high priority)**: nothing is saved — zero
  `localStorage` usage in the codebase. Add a small `src/utils/persistence.ts`
  that snapshots season state (standings, bankroll, race index) on change and
  offers Resume/Start-over on load. Race-in-progress restore can come later;
  season-level persistence is most of the user value and a fraction of the
  effort.
- **Routing (epic #145)**: `App.tsx` is a 9-screen state machine with heavy
  prop drilling and no URLs. Given the app's size, URL hash/search-param
  routing (or a ~1.5kB router like wouter) beats pulling in react-router.
  Do this together with #145's universal-header work, not separately.

### Phase 5 — Deduplicate
- `WatchMode.tsx` and `MarbleMode.tsx` both implement share-text generation,
  bet resolution and race subscriptions (~30% overlap). Extract
  `src/utils/shareText.ts` and `src/betting/resolveBets.ts` first — issues
  #54 and #95 both touch share text, so this pays for itself immediately.
- `simLabWorker.ts` and `betLabWorker.ts` duplicate `createRosterWithCars`,
  tier logic, and the message protocol helpers. Extract
  `src/workers/common.ts`.

### Deliberately NOT recommended
- A state-management library (Redux/Zustand): prop drilling is annoying but
  the app is small enough that routing + a couple of contexts solves it.
- A UI framework rewrite: the CSS is large (240kB) but works; defer until the
  #111 race-view redesign forces component consolidation anyway.

## Suggested sequencing against open issues

| Step | Unblocks |
|---|---|
| Seeded RNG + tests | #40 shareable recaps, safe refactoring |
| Persistence | #43 (priority: high) |
| Engine split (pits/incidents) | #138, #82, #106 morale |
| Routing + universal header | #145, #129–131, #111 |
| Share/bet-resolution extraction | #54, #95, #55 |
