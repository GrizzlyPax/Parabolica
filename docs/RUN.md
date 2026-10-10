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

## Rival levels + the nemesis (#626)
- **One table:** `LEAGUE_LADDER` in `src/run/run.ts`: Juniors −25 / +12 · Regional −5 / +12 · National +10 / +14 · Top flight +22 / +12 (Steward's fit, Pax Oct 10; re-fit after #592 / #593 / #594). `field` is grade points added to **every stat** (driver, car, team) of every rival **at race build** (`seasonRoster` → `shiftStats`, the card math), after cards; the player's team is never shifted. Stars are floored at `STAR_FLOOR` (0.5★), so a Juniors 1★ car still runs. Stand-alone seasons and Quick Race (no `LeagueContext`) shift nothing.
- **The nemesis** is the league's runner-up (P2 in the Constructors'), carried up as a **look only** (`CarriedTeam.nemesis`, `runnerUp(prev)`): it wears the first fresh slot in the next pool (`CompetitorTeam.nemesis = true`, the deck never deals that look twice), rolls fresh drivers, car and stats, and gets `nemesis` points on top of the field shift. Rivals keep genesis traits only: no packs, no mid-league levelling (as before).
- Shifting at race build (not in the pool) keeps the draft board honest and the pool unchanged; the pool's grades are the rolls, the race is the level. `rivalShifts(facts)` gives the UI the per-team points (Hub: stat levels, #623).

## Timed effects (#332)
- **An effect** (`src/season/effects.ts`, `EffectFact`): a target (one driver, the car or the team: car and team reach both drivers), grade points per stat (negative = a curse), a **timer** in **races** (`{ races: n }`) or **laps** (`{ laps: n, fromLap? }`), a source (`gear` · `curse` · `event`) and an id. Dealt with `addEffect(facts, e)` into `SeasonFacts.effectFacts`; the dealer (a pack, a curse, an event) owns the clock rules.
- **Facts, not ticks:** live in round R iff `round ≤ R < round + races`; a lap effect lives in its own round. Nothing is written per race, so saves and replays need nothing more. `activeEffects(facts, teamId, round)` gives what is live with `left` ("2 races left", `describeLeft`); `roundEffects` feeds the roster builder.
- **Race timers** apply at race build through the card math (`applyPercents`), after cards and before the rival shift. **Lap timers** go to the engine as `RosterDriver.lapEffects` in raw units (`rawDeltas`): the engine keeps `baseStats`, rebuilds driver / car / team stats at every lap boundary from base + live windows, logs `effect_applied` / `effect_expired`, and `reset()` restores the base. No RNG touched either way.
- **Display:** `RosterDriver.effects` / `Driver.effects` carry `EffectInfo { name, emoji, source, left }` for chips and sheets (Hub).
- **Carrying up a run:** `carriedEffects(prev, teamId)` re-dates live race timers by the races already used (`round − calendar length`), so what had 2 races left still has 2; lap effects don't carry. `CarriedTeam.effects` → `effectFactsOf(facts)` folds them before the league's own.
- Nothing deals an effect yet: race results don't move until #627 (gear mileage, curses).

## Cards + packs for the run (#627)
All in `src/season/pack.ts`, data at the top:
- **3× louder, player only** (`PLAYER_CARD_SCALE`): every card the player is dealt carries the deck's grade points × 3 (`playerCard`), so the Paddock's sums and the sim read the same number. Rivals never open packs (#478) and race their genesis traits at 1×; the player's genesis traits are 1× too (drafted from the same pool).
- **Gear mileage** (`GEAR_STRENGTH` 2, `GEAR_LIFE` 3): gear is × 2 again (so × 6) and **worn out after 3 races** wherever it sits (slot or locker); `teamCardState(facts, team, round)` drops it from the fold, `mileage` says the races left per gear card, `gearInfos` puts "2 races left" on the roster (`RosterDriver.effects`, source `gear`). Carried up a run with its deal round re-dated (`CarriedCards.gearDealt`).
- **The pack offer** (`packOffer`, `OFFER_ODDS` 60 / 30 / 10 on its own stream): **pick 1 of 2 packs**, **one pack**, or a **forced Curse pack**. A pack is named by its **place** (Driver · Car · Team pack: a trait or that place's gear), never its metal; the tier (standing quarters, round 1 Uncommon) shows when it opens. `dealPack(facts, round, team, kind)` deals three distinct cards of that place; `PackApplication.pack` records the pick.
- **Curses** (`dealCurse`, `CURSE_POINTS` −10 × 3, `CURSE_LIFE` 3): all bad, on the **car or the team** (both drivers; benching can't dodge it), one stat, three races, an **effect** (#332). Taking it writes a `CurseApplication` fact and the `EffectFact`. In the Paddock the live curse reads in the stat sums as a red line (`effectCards`) and under the offer ("🪦 Butterfingers: 3 races left").
- **Not built:** "packs lean to your plan" (needs the archetype deck list, #565).

## Screens (#628)
- **The run's first step** is League Setup ("New run"): your team (the creator, #346) on top, then the league, teams and calendar. **Start the run** lands on the ladder.
- **The ladder** (`#/season/run`, `season/ui/RunLadder.tsx`; Pax picked A) is the run's home: four leagues stacked, Top flight on top. The league in play is open (race squares, the last one gold for the boss race; you vs your nemesis, or the nearest team in the Juniors; how you go up); won leagues keep one line ("X were runners-up and came up with you"); leagues ahead are dimmed; the unlocks strip lists `UNLOCKS` (none granted until #596). Its button goes to the draft or the Paddock, **Up to <next> →** when the league is won, **New run** when the run is over. The view is pure: `run/ladderView.ts`.
- Menu → Season opens a saved run on its ladder. The draft and the Paddock go **← The run**; the finale's **Up to <next> →** promotes and lands on the ladder.

## Hooks left on purpose
- **Boss race (#593):** `LeagueContext.bossRound` (the last round).
- **Rookie pick (#594):** `RunSetup.start` ('draft' today); the draft is the run's start until then.
- **XP (#592):** a fact log on `RunFacts`, keyed by the stable driver id.
- **Stakes (#596):** `RunSetup.stake`, `UnlockId 'next-difficulty'`.
- **Timers (#332):** gear and curses carry with the cards; their timers are the next PR.

## Traps
- Never save a `SeasonSetup` of a run league: it is derived. `withCurrentLeague` strips it.
- `seasonFactsFor` memoises per `RunFacts` object: build a new run object on every change (the screens do).
- A derived carry walks the leagues below it; keep `carriedTeam` cheap (no settles).
