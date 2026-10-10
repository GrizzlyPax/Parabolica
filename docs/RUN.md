# The run — core (#597, v0.7 Suzuka)

*How a run is built, saved and replayed. Design: docs/V07_PLAN.md and the Roguelite Run Report (#589). Screens: Hub (#628).*

## The shape
- A **run** is a ladder of **4 leagues × 6 races** (`LEAGUES_PER_RUN`, `RACES_PER_LEAGUE`; League Setup's race count is honoured for all four). Rungs: Juniors · Regional · National · Top flight (`LEAGUE_LADDER`, each with a rival level for #626).
- A **league is a Season** (`SeasonFacts`): the same draft, Paddock, packs, races and standings. **Win it (P1 in the Constructors')** and you go up with your whole team; anything else ends the run.
- **League 0 is today's Season**: same seed, same pool, same calendar. The run core changed no race result.

## Facts, not state (`src/run/run.ts`)
```
RunFacts = { setup: RunSetup; leagues: LeagueFacts[] }
RunSetup = { seed, teamCount, team (the player's identity), races, ruleset?, start: 'draft', stake? }
LeagueFacts = SeasonFacts without its setup: { draftPicks, lineups, cardFacts, results }
```
Each league's `SeasonSetup` is **derived**, never saved (`seasonFactsFor(run, i)`, memoised per run object):
- seed: league 0 = the run seed; league i = `deriveSeed(seed, 'run', 'league', i)`;
- calendar: `seasonCalendar(leagueSeed, races)`;
- `league: LeagueContext` = { index, name, fieldShift, nemesisShift, bossRound } (hooks for #626 and #593; shifts are 0 today);
- `carry: CarriedTeam` = the player's team at the end of the league below (`carriedTeam(prev)`): drivers, car and team with their **ids, stats, traits, numbers and faces** (`avatarSeed`), plus every card they hold as ids by holder (`CarriedCards`: traits, gear in slots, the locker).

The pool generator (`generateSeasonPool(seed, teams, rs, { carry, league })`) puts the carried team first, **reserves** its drivers and car for it (`reservedFor`), and fills the other slots with fresh rivals whose ids start at `league.index × LEAGUE_ID_STRIDE` (100), so nothing collides and a carried driver keeps one id for the whole run (XP, #592, can key on it). Racing numbers skip the carried ones. The draft honours reservations: a team with reserved entities must take them, nobody else can, the CPU never sees them. `promote(run)` adds the next league with the whole draft settled, so it opens in the Paddock. `teamCardState` starts from the carried cards, then folds the new league's card facts.

`runState(run)` → `{ leagueIndex, phase: 'league' | 'league-won' | 'run-won' | 'run-lost', league, ladder, won }`.
`replayRun(run)` re-settles every league from its facts; the test pins it equal to the recorded digests.

## Saves (`src/run/run.ts`, `src/run/meta.ts`, `src/run/current.ts`)
- **Run:** `parabolica.run.v1`, schema 1, one slot: `{ schemaVersion, savedAt, data: RunFacts }`. The old Season save (`parabolica.season.v1`) is left in place, archived: nothing reads it.
- **Meta:** `parabolica.meta.v1`: `{ unlocks: UnlockId[], runs: RunRecord[] }`. Loading reads only the data's own schema version, never the engine version, so a version bump keeps every unlock (tested). `UNLOCKS` registers the first five (#589); **`unlocksEarned(run)` grants nothing until Steward's #596**. `recordRun` writes a finished run once (by seed).
- **The screens** keep working on a `SeasonFacts`: `loadCurrentLeague` / `saveCurrentLeague` (write back into the run; a finished run is recorded in the meta), `startRun` (League Setup → league 0), `promoteCurrentRun`, `currentRunState`, `clearRun`. The finale (Standings) offers **"Up to Regional →"** when the league is won, says the run is over when not.

## Hooks left on purpose
- **Rival levels (#626):** `LeagueContext.fieldShift` / `nemesisShift`; `LEAGUE_LADDER[i].level`.
- **Boss race (#593):** `LeagueContext.bossRound` (the last round).
- **Rookie pick (#594):** `RunSetup.start` ('draft' today); the draft is the run's start until then.
- **XP (#592):** a fact log on `RunFacts`, keyed by the stable driver id.
- **Stakes (#596):** `RunSetup.stake`, `UnlockId 'next-difficulty'`.
- **Timers (#332):** gear and curses carry with the cards; their timers are the next PR.

## Traps
- Never save a `SeasonSetup` of a run league: it is derived. `withCurrentLeague` strips it.
- `seasonFactsFor` memoises per `RunFacts` object: build a new run object on every change (the screens do).
- A derived carry walks the leagues below it; keep `carriedTeam` cheap (no settles).
