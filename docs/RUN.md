# The run — core (#597, #696, v0.8 Ace America)

*How a run is built, saved and replayed. Design: docs/V08_PLAN.md and docs/STORY_BIBLE.md → The run. Screens: the Ladder (`season/ui/RunLadder.tsx`), the start (`season/ui/StartRun.tsx`; Hub's #697 designs the map).*

## The shape (#696)
- **Three steps:** `STEP_PLAN` in `src/run/run.ts`: **Locals 5 races · State 6 · Nationals** (a slot: `races: 0` until #694's build; winning State wins the run today, `LAST_BUILT_STEP`). Each step is a Season (`SeasonFacts`): the same Paddock, packs, races and standings. **Win the table (P1) and you take the step's title** and go up with your whole garage; anything else ends the run.
- **Titles:** Ace <town> · Ace <state> · Ace America (`titleFor`). Your town is drawn from your state's pool on the run seed (`townOf`); at State the rival garages are the other towns' Aces (`rivalTowns`, each garage carries its `town`).
- **Geography is the difficulty:** at Locals you race **5 garages of your town** at your own level (`LOCALS_SHIFT` 0); at State **every town's Ace**: 5 / 10 / 20 of them by the state's population (`fieldSize`, `src/data/states.ts`: ≥ 8M → 20, ≥ 2.5M → 10, else 5), lifted at race build by `STATE_FIELD` **+20 / +27 / +34** grade points on every rival stat (Steward's fit, #693). A 20-town State is 21 garages, 42 cars (`MAX_TEAMS` 21).
- **Rookies are dealt, near-identical** (`src/season/rookies.ts`): every driver, car and team in a run rolls at `ROOKIE_GRADE` 25 points (level 5) ± `ROOKIE_WOBBLE` 5 per stat, no genesis traits, American two-word names (`generateAmericanDriverName`). Your pair, car and team stats roll on the run seed's own stream (`dealRookies`, ids 900 / 901, `car-you`) and become step 0's carried team. No pick, no archetypes, no car setups (Pax, #693). The field rolls on the pool's `'rookies'` streams.
- **Rival garages** (`src/data/garages.ts`): generic names from the bible's shapes (Kowalski & Sons · Mabel's Garage · Riverside Motor Works · The Corner Pump…), deck colours with `inkFor` ink, the creator's logos, on the pool's `'garages'` stream; never a name twice in a field. The 28 deck teams no longer race in a run (Quick Race and the lab still draw them: the golden fingerprint).

## Facts, not state (`src/run/run.ts`)
```
RunFacts = { setup: RunSetup; titles: TitleFact[]; leagues: LeagueFacts[] }
RunSetup = { seed, stateId ('oh'), garage (your look; teamId is PLAYER_TEAM_ID 'you'), ruleset?, kit: 'packs', stake? }
TitleFact = { step, name }           (written by `promote`, and `claimTitles` when the run is won)
LeagueFacts = SeasonFacts without its setup: { draftPicks, lineups, cardFacts, effectFacts, results }
```
Each step's `SeasonSetup` is **derived**, never saved (`seasonFactsFor(run, i)`, memoised per run object):
- seed: step 0 = the run seed; step i = `deriveSeed(seed, 'run', 'league', i)`; calendar `seasonCalendar(seed, STEP_PLAN[i].races)`;
- `teamCount` = the step's field + you; `humans` = your garage;
- `league: LeagueContext` = { index, step, name, fieldShift, nemesisShift (0), bossRound, **locale** { stateId, town, rivalTowns } }: the pool names the rival garages from `locale`, the theme reads `step` and `stateId`;
- `carry: CarriedTeam` = step 0: the dealt rookies as a team (`startingTeam`); above: your garage at the end of the step below (`carriedTeam(prev)`): drivers, car and team with their ids, stats, numbers and faces, plus every card they hold (`CarriedCards`) and live effects.

The pool generator (`generateSeasonPool(seed, teams, rs, { carry, league, rookies })`) puts the carried team first, **reserves** its drivers and car for it (`reservedFor`), and fills the other slots with fresh rookie garages whose ids start at `league.index × LEAGUE_ID_STRIDE` (100). `draftPicks` stay the roster facts, but no one drafts: the CPU draft (`quickDraft`, reservations honoured) fills every step behind the scenes, in `newRun` for step 0 and `promote` above, so each step opens in the Paddock.

`runState(run)` → `{ leagueIndex, phase: 'league' | 'league-won' | 'run-won' | 'run-lost', league, ladder (3 rungs with `step`, `title`, `later`), won }`. `titlesOf(run)` = the titles recorded plus the one just won. `replayRun(run)` re-settles every step from its facts; the test pins it equal to the recorded digests.

## Saves (`src/run/run.ts`, `src/run/meta.ts`, `src/run/current.ts`)
- **Run:** `parabolica.run.v1`, **schema 3** (a v0.7 run is archived, not loaded), one slot: `{ schemaVersion, savedAt, data: RunFacts }`.
- **Meta:** `parabolica.meta.v1`: `{ unlocks: UnlockId[], runs: RunRecord[] }`. Loading reads only the data's own schema version, never the engine version, so a version bump keeps every unlock (tested). `unlocksEarned(run)` grants nothing until Steward's #596. `recordRun` writes a finished run once (by seed).
- **The screens** keep working on a `SeasonFacts`: `loadCurrentLeague` / `saveCurrentLeague` (write back into the run; a won run claims its titles, a finished run is recorded in the meta), `startRun({ seed, stateId, garage })`, `promoteCurrentRun`, `currentRunState`, `clearRun`.

## Parked behind seams (Pax, Oct 10: park, don't delete)
- **The nemesis** (#626, #635): `NEMESIS_IN_RUN = false`; `carriedTeam` carries no runner-up, so no garage is flagged and `nemesisLine` says nothing. The module, the lines and the race-view tag stay; flip the seam with multi-season play.
- **Boss rounds** (#593): `LeagueContext.bossRound` is still the last round; nothing reads it as a twist.
- **Stamps** (#704): packs are dealt as before (`RunSetup.kit: 'packs'`); `cardsForRound` is where stamps land.
- **Driver ranks and XP** (#646) are gone: titles do that job (ribbons, #699). Archetypes and car setups (#660) are gone with the rookie pick.

## Timed effects (#332)
- **An effect** (`src/season/effects.ts`, `EffectFact`): a target (one driver, the car or the team: car and team reach both drivers), grade points per stat (negative = a curse), a **timer** in **races** (`{ races: n }`) or **laps** (`{ laps: n, fromLap? }`), a source (`gear` · `curse` · `event`) and an id. Dealt with `addEffect(facts, e)` into `SeasonFacts.effectFacts`; the dealer (a pack, a curse, an event) owns the clock rules.
- **Facts, not ticks:** live in round R iff `round ≤ R < round + races`; a lap effect lives in its own round. Nothing is written per race, so saves and replays need nothing more. `activeEffects(facts, teamId, round)` gives what is live with `left` ("2 races left", `describeLeft`); `roundEffects` feeds the roster builder.
- **Race timers** apply at race build through the card math (`applyPercents`), after cards and before the rival shift. **Lap timers** go to the engine as `RosterDriver.lapEffects` in raw units (`rawDeltas`): the engine keeps `baseStats`, rebuilds driver / car / team stats at every lap boundary from base + live windows, logs `effect_applied` / `effect_expired`, and `reset()` restores the base. No RNG touched either way.
- **Display:** `RosterDriver.effects` / `Driver.effects` carry `EffectInfo { name, emoji, source, left }` for chips and sheets (Hub).
- **Carrying up a run:** `carriedEffects(prev, teamId)` re-dates live race timers by the races already used (`round − calendar length`), so what had 2 races left still has 2; lap effects don't carry. `CarriedTeam.effects` → `effectFactsOf(facts)` folds them before the league's own.
- Nothing deals an effect yet: race results don't move until #627 (gear mileage, curses).

## Cards + packs for the run (#627, #647)
All in `src/season/pack.ts`, data at the top; the deck in `src/cards/runDeck.ts`.
- **The run deck** (#647, Pax Oct 10, Steward's Deck List Report; the priced list on #565): **60 cards** that packs and rank-ups deal in a run (`RUN_DECK`, `deck: 'run'`, ids `rd-<name>`): four archetypes × 12 (5 Bronze / 4 Silver / 2 Gold / 1 Iridium) + 12 Any-team (6 / 3 / 2 / 1). **Written as held:** a card's `pct` is its grade points as the player reads it (a Bronze "+3 Speed" is 15 points; 5 points a level), so nothing scales a run-deck trait; `playerCard` only doubles gear. **Tags only** (`Card.tag`: qualifier · brawler · tyre-saver · glass-cannon · any), no set bonuses, no pack lean; the tag feeds the rank-up trait slot. **Three price bands** (`PRICE_BAND`: king ×1 Power / Speed / Accel / Aggression / Tyre Mgmt · mid ×1.5 Consistency / Luck · weak ×2 Pit Crew / Endurance / Grip / Reliability, minuses too) against `METAL_BUDGET` 3 / 6 / 12 / 27 levels; `runDeck.test.ts` pins every card to its budget. **Rarity buys complexity:** Bronze plain · Silver plain, a half-race window or a trade · Gold two stats or a trade · Iridium a build-around. Names are placeholders (Radio, #370). The grid deck (`MOTORSPORT_DECK`, 94) stays the genesis deck of stand-alone seasons, Quick Race and the lab (the golden fingerprint); a grid card the player holds (old saves) is still × `PLAYER_CARD_SCALE`. `cardById` resolves either deck.
- **Window cards** (`Card.window` 'first' | 'second': Lights Out, Dive-Bomb Helmet, Second Wind; silver driver gear, +12 for half the race): never in the race-build sum (`cardPercents` and `readStat` skip them; the face shows the rule), they become **lap effects** at race build (`windowEffects` in `seasonRoster`, given the track's `laps` by `leagueForRound`): the first half rounds up (`windowLaps`), the engine applies and logs them like any lap timer (#332), the roster's `effects` says "first half".
- **Gear mileage** (`GEAR_STRENGTH` 2, `GEAR_LIFE` 3): gear is × 2 and **worn out after 3 races** wherever it sits (slot or locker); `teamCardState(facts, team, round)` drops it from the fold, `mileage` says the races left per gear card, `gearInfos` puts "2 races left" on the roster (`RosterDriver.effects`, source `gear`). Carried up a run with its deal round re-dated (`CarriedCards.gearDealt`).
- **The pack offer** (`packOffer`, `OFFER_ODDS` 60 / 30 / 10 on its own stream): **pick 1 of 2 packs**, **one pack**, or a **forced Curse pack**. A pack is named by its **place** (Driver · Car · Team pack: a trait or that place's gear), never its metal; the tier (standing quarters, round 1 Uncommon) shows when it opens. `dealPack(facts, round, team, kind)` deals three distinct cards of that place; `PackApplication.pack` records the pick.
- **Curses** (`dealCurse`, `RUN_CURSES`, `CURSE_LIFE` 1): **eight named curses** (Haunted Gearbox −12 Reliability · Wrong Fuel Map −6 Power · Bent Floor −12 Grip · Rusty Engine −3 Power / −6 Reliability · Butterfingers −12 Pit Crew · Sticky Wheel Nut −18 Pit Crew · Cold Tyres −9 Tyre Mgmt · Bad Contract −3 Tyre Mgmt, in levels), one drawn uniformly on the `'curse'` stream, all bad, on the **car or the team** (both drivers; benching can't dodge it), **one race** (Pax: "3 races is steep"), an **effect** (#332). Taking it writes a `CurseApplication` fact and the `EffectFact`. In the Paddock the live curse reads in the stat sums as a red line (`effectCards`) and under the offer ("🪦 Butterfingers: 1 race left"). Driver curses are a follow-up if Pax wants them.
- **No pack lean** (Pax, Oct 10): later, a way to see or steer what a pack leans to.

## Screens (#628)
- **The run's first step** is League Setup ("New run"): your team (the creator, #346) on top, then the league, teams and calendar. **Start the run** lands on the ladder.
- **The ladder** (`#/season/run`, `season/ui/RunLadder.tsx`; Pax picked A) is the run's home: four leagues stacked, Top flight on top. The league in play is open (race squares, the last one gold for the boss race; you vs your nemesis; how you go up); won leagues keep one line ("X were runners-up and came up with you"); leagues ahead are dimmed; the unlocks strip lists `UNLOCKS` (none granted until #596). Its button goes to the rookie pick (#660) or the Paddock, **Up to <next> →** when the league is won, **New run** when the run is over. The view is pure: `run/ladderView.ts`.
- Menu → Season opens a saved run on its ladder. The rookie pick and the Paddock go **← The run**; the finale's **Up to <next> →** promotes and lands on the ladder.

## The nemesis talks (#635)
- `season/nemesis.ts`, flavour only (every roll on its own `'nemesis-voice'` stream; nothing saved, no sim change). Lines are verbatim from `docs/story/nemesis.md` (a test mirrors the doc).
- **Who:** the flagged nemesis (`CompetitorTeam.nemesis`) from the Regional up; in the Juniors, a **voice-only rival** picked on the voice stream (no level bump; it says the "first meeting" lines). The ladder (#628) shows the same team.
- **Personalities** belong to the nemesis **seats** (#665): `personalityOf(runKey, look, seat)`, keyed to the run (your carried drivers' names), the team's look and seat 0/1; equal odds, doubles allowed. The nemesis rolls fresh drivers each league, but the same Brat and Old Hand come back.
- **One line per Paddock visit** (`nemesisLine(facts)`): the moment from the doc's table, the speaker by the doc's rule, a seeded pick never repeating the last round's; both drivers before the boss race; two Show-offs speak as "we". Spanish lines carry the English underneath.
- **NEMESIS tag:** the Paddock line, the constructors' table, the tower (team name in the detail view, the driver panel, a red stripe on the row in the track view).

## Hooks left on purpose
- **Nationals (#694):** `STEP_PLAN[2]` with `races: 0`; `leagueSetup` throws "not built" until the cut rules land; `LAST_BUILT_STEP` moves up by itself.
- **Globals / Galacticals:** `Step` ids exist (`src/look/step.ts`); `titleFor` already names Ace Earth / Ace Universe.
- **Stakes (#596):** `RunSetup.stake`, `UnlockId 'next-difficulty'`.
- **The 52 looks (#708):** `US_PLACES[].look` is null for 48 places; `stateLook` wears `DEFAULT_LOOK` until then.

## Traps
- Never save a `SeasonSetup` of a run step: it is derived. `withCurrentLeague` strips it.
- `poolFor` passes `rookies: true` whenever the setup has a `league`: a hand-built `SeasonFacts` with a league context gets a rookie field of generic garages (`locale` names them; without it, deck teams).
- Your pair's ids are 900 / 901 and the car `car-you`; fresh ids per step are index × 100. Don't add a fourth step without checking `ROOKIE_ID_BASE`.
- `seasonFactsFor` memoises per `RunFacts` object: build a new run object on every change (the screens do).
- A derived carry walks the leagues below it; keep `carriedTeam` cheap (no settles).
