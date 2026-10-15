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
RunSetup = { seed, stateId ('oh'), garage (your look; teamId is PLAYER_TEAM_ID 'you'), ruleset?, kit: 'stamps', stake? }
TitleFact = { step, name, stamps? }  (written by `promote(run, picks)`, and `claimTitles` when the run is won; stamps = each driver's title stamp stats, #704)
LeagueFacts = SeasonFacts without its setup: { draftPicks, lineups, cardFacts, effectFacts, results }
```
Each step's `SeasonSetup` is **derived**, never saved (`seasonFactsFor(run, i)`, memoised per run object):
- seed: step 0 = the run seed; step i = `deriveSeed(seed, 'run', 'league', i)`; calendar `seasonCalendar(seed, STEP_PLAN[i].races)`;
- `teamCount` = the step's field + you; `humans` = your garage;
- `league: LeagueContext` = { index, step, name, fieldShift, nemesisShift (0), bossRound, **locale** { stateId, town, rivalTowns } }: the pool names the rival garages from `locale`, the theme reads `step` and `stateId`;
- `carry: CarriedTeam` = step 0: the dealt rookies as a team (`startingTeam`); above: your garage at the end of the step below (`carriedTeam(prev)`): drivers, car and team with their ids, stats, numbers and faces, plus every stamp they hold (`CarriedCards`: per driver card, the car card, the title stamps) and live effects.

The pool generator (`generateSeasonPool(seed, teams, rs, { carry, league, rookies })`) puts the carried team first, **reserves** its drivers and car for it (`reservedFor`), and fills the other slots with fresh rookie garages whose ids start at `league.index × LEAGUE_ID_STRIDE` (100). `draftPicks` stay the roster facts, but no one drafts: the CPU draft (`quickDraft`, reservations honoured) fills every step behind the scenes, in `newRun` for step 0 and `promote` above, so each step opens in the Paddock.

`runState(run)` → `{ leagueIndex, phase: 'league' | 'league-won' | 'run-won' | 'run-lost', league, ladder (3 rungs with `step`, `title`, `later`), won }`. `titlesOf(run)` = the titles recorded plus the one just won. `replayRun(run)` re-settles every step from its facts; the test pins it equal to the recorded digests.

## Saves (`src/run/run.ts`, `src/run/meta.ts`, `src/run/current.ts`)
- **Run:** `parabolica.run.v1`, **schema 5** (a v0.7 run, a v0.8.0 run on packs or a v0.8.1 run on all-permanent stamps is archived, not loaded), one slot: `{ schemaVersion, savedAt, data: RunFacts }`.
- **Meta:** `parabolica.meta.v1`: `{ unlocks: UnlockId[], runs: RunRecord[] }`. Loading reads only the data's own schema version, never the engine version, so a version bump keeps every unlock (tested). `unlocksEarned(run)` grants nothing until Steward's #596. `recordRun` writes a finished run once (by seed).
- **The screens** keep working on a `SeasonFacts`: `loadCurrentLeague` / `saveCurrentLeague` (write back into the run; a won run claims its titles, a finished run is recorded in the meta), `startRun({ seed, stateId, garage })`, `promoteCurrentRun`, `currentRunState`, `clearRun`.

## Parked behind seams (Pax, Oct 10: park, don't delete)
- **The nemesis** (#626, #635): `NEMESIS_IN_RUN = false`; `carriedTeam` carries no runner-up, so no garage is flagged and `nemesisLine` says nothing. The module, the lines and the race-view tag stay; flip the seam with multi-season play.
- **Boss rounds** (#593): `LeagueContext.bossRound` is still the last round; nothing reads it as a twist.
- **Driver ranks and XP** (#646) are gone: titles do that job (ribbons, #699). Archetypes and car setups (#660) are gone with the rookie pick.

## Timed effects (#332)
- **An effect** (`src/season/effects.ts`, `EffectFact`): a target (one driver, the car or the team: car and team reach both drivers), grade points per stat (negative = a curse), a **timer** in **races** (`{ races: n }`) or **laps** (`{ laps: n, fromLap? }`), a source (`gear` · `curse` · `event`) and an id. Dealt with `addEffect(facts, e)` into `SeasonFacts.effectFacts`; the dealer (a pack, a curse, an event) owns the clock rules.
- **Facts, not ticks:** live in round R iff `round ≤ R < round + races`; a lap effect lives in its own round. Nothing is written per race, so saves and replays need nothing more. `activeEffects(facts, teamId, round)` gives what is live with `left` ("2 races left", `describeLeft`); `roundEffects` feeds the roster builder.
- **Race timers** apply at race build through the card math (`applyPercents`), after cards and before the rival shift. **Lap timers** go to the engine as `RosterDriver.lapEffects` in raw units (`rawDeltas`): the engine keeps `baseStats`, rebuilds driver / car / team stats at every lap boundary from base + live windows, logs `effect_applied` / `effect_expired`, and `reset()` restores the base. No RNG touched either way.
- **Display:** `RosterDriver.effects` / `Driver.effects` carry `EffectInfo { name, emoji, source, left }` for chips and sheets (Hub).
- **Carrying up a run:** `carriedEffects(prev, teamId)` re-dates live race timers by the races already used (`round − calendar length`), so what had 2 races left still has 2; lap effects don't carry. `CarriedTeam.effects` → `effectFactsOf(facts)` folds them before the league's own.
- The smudged Parcel deals one (#704); window stamps run as lap effects.

## Stamps and Parcels (#704; Steward's build spec and Pax's answers, Oct 15)
All in `src/season/stamps.ts`, data at the top; the stamp pool is the run deck (`src/cards/runDeck.ts`, #647: 60 cards, three price bands, half-race window cards) at the player's scale (`playerCard`: the run deck as written, gear × 2; a grid card × 3).
- **A stamp** is a run-deck card held on one **driver card** or the **car card** (the car and the garage share it: car and team cards both go there). `applyCards` is unchanged: `seasonCardsFor` hands the race build each driver's stamps (plus their title stamps) and splits the car card by where a stamp applies. Two kinds (Pax: "permanent plus fading ink"): a **trait is permanent**; **gear is ink**: × `GEAR_STRENGTH` 2 and gone after `GEAR_LIFE` 3 races wherever it sits (today's mileage math; `StampState.mileage`, "2 races left" on the roster via `inkInfos`), its slot free the race after it fades. Carried up a run with each ink stamp's deal round re-dated (`CarriedCards.gearDealt`).
- **Slots:** `STAMP_SLOTS` **4 per driver card, 5 on the car card** (13), permanent and ink together. A full card means a stamp is **scraped off** for the next: the fact names what it `replaces`, and that stamp is gone; a scrape holds whatever fades after it. No locker, no hand, no moves.
- **Parcels** (`parcelFor`, own stream `'season','parcel',round,team`): **one before every race, pick 1 of 3** from the whole deck (a trait with `STAMP_TRAIT_CHANCE` 0.5, else ink; a driver stamp 2 : car 1 : garage 1), the metal by your table position (`parcelTierFor`: leader Common → last Legendary, round 1 Uncommon; `PARCEL_METAL`), each stamp on its own sub-stream, redrawn on a duplicate or a stamp you hold. **One roll** for the kind: **smudged** (`SMUDGE_ODDS` 10%, every step: you still pick 1 of 3, and one of the eight named curses lands on the car or the garage for **one race**, an effect, no slot, whatever you keep), else a **Watcher gift** (`GIFT_ODDS`: Locals 0 · State 10 · Nationals 15%; the legendary metal odds), else league issue. A Parcel can be **left in the box** (`cardId: null`). Rivals get none.
- **Title stamps** (`titleStamp`, `TITLE_STAMP_LEVELS` 6, `TITLE_STAMP_STATS` locals 1 · state 2): winning a title, **each driver picks a stat** (two at State) and wears **+6 levels** on it **on the ribbon, outside the slots**, for good. The Ladder asks before "Up to State"; `promote(run, picks)` records them on the `TitleFact`; the next step's carry puts them on (`CarriedCards.titles`). Steward measured the Locals stamp at +14 points of State win chance.
- **Facts:** `ParcelFact { round, teamId, tier, gift?, dealt, cardId | null, holder?, replaces? }` in the one ordered `cardFacts` log (a smudge's curse is an `EffectFact` written with it); `teamStamps(facts, team, round)` folds them from the carry; `openParcel` validates (on the clock, the Parcel as dealt, the stamp fits the card, a full card names its scrape).
- **Cut** (the spec): the locker, the three-card hand, gear slots by trait, the pack offer's place choice, the curse pack. Old runs (schema ≤ 4) and seasons (schema ≤ 3) are archived.

## Facts, not state (`src/run/run.ts`)
```
RunFacts = { setup: RunSetup; titles: TitleFact[]; leagues: LeagueFacts[] }
RunSetup = { seed, stateId ('oh'), garage (your look; teamId is PLAYER_TEAM_ID 'you'), ruleset?, kit: 'stamps', stake? }
TitleFact = { step, name, stamps? }  (written by `promote(run, picks)`, and `claimTitles` when the run is won; stamps = each driver's title stamp stats, #704)
LeagueFacts = SeasonFacts without its setup: { draftPicks, lineups, cardFacts, effectFacts, results }
```
Each step's `SeasonSetup` is **derived**, never saved (`seasonFactsFor(run, i)`, memoised per run object):
- seed: step 0 = the run seed; step i = `deriveSeed(seed, 'run', 'league', i)`; calendar `seasonCalendar(seed, STEP_PLAN[i].races)`;
- `teamCount` = the step's field + you; `humans` = your garage;
- `league: LeagueContext` = { index, step, name, fieldShift, nemesisShift (0), bossRound, **locale** { stateId, town, rivalTowns } }: the pool names the rival garages from `locale`, the theme reads `step` and `stateId`;
- `carry: CarriedTeam` = step 0: the dealt rookies as a team (`startingTeam`); above: your garage at the end of the step below (`carriedTeam(prev)`): drivers, car and team with their ids, stats, numbers and faces, plus every stamp they hold (`CarriedCards`: per driver card, the car card, the title stamps) and live effects.

The pool generator (`generateSeasonPool(seed, teams, rs, { carry, league, rookies })`) puts the carried team first, **reserves** its drivers and car for it (`reservedFor`), and fills the other slots with fresh rookie garages whose ids start at `league.index × LEAGUE_ID_STRIDE` (100). `draftPicks` stay the roster facts, but no one drafts: the CPU draft (`quickDraft`, reservations honoured) fills every step behind the scenes, in `newRun` for step 0 and `promote` above, so each step opens in the Paddock.

`runState(run)` → `{ leagueIndex, phase: 'league' | 'league-won' | 'run-won' | 'run-lost', league, ladder (3 rungs with `step`, `title`, `later`), won }`. `titlesOf(run)` = the titles recorded plus the one just won. `replayRun(run)` re-settles every step from its facts; the test pins it equal to the recorded digests.

## Saves (`src/run/run.ts`, `src/run/meta.ts`, `src/run/current.ts`)
- **Run:** `parabolica.run.v1`, **schema 5** (a v0.7 run, a v0.8.0 run on packs or a v0.8.1 run on all-permanent stamps is archived, not loaded), one slot: `{ schemaVersion, savedAt, data: RunFacts }`.
- **Meta:** `parabolica.meta.v1`: `{ unlocks: UnlockId[], runs: RunRecord[] }`. Loading reads only the data's own schema version, never the engine version, so a version bump keeps every unlock (tested). `unlocksEarned(run)` grants nothing until Steward's #596. `recordRun` writes a finished run once (by seed).
- **The screens** keep working on a `SeasonFacts`: `loadCurrentLeague` / `saveCurrentLeague` (write back into the run; a won run claims its titles, a finished run is recorded in the meta), `startRun({ seed, stateId, garage })`, `promoteCurrentRun`, `currentRunState`, `clearRun`.

## Parked behind seams (Pax, Oct 10: park, don't delete)
- **The nemesis** (#626, #635): `NEMESIS_IN_RUN = false`; `carriedTeam` carries no runner-up, so no garage is flagged and `nemesisLine` says nothing. The module, the lines and the race-view tag stay; flip the seam with multi-season play.
- **Boss rounds** (#593): `LeagueContext.bossRound` is still the last round; nothing reads it as a twist.
- **Driver ranks and XP** (#646) are gone: titles do that job (ribbons, #699). Archetypes and car setups (#660) are gone with the rookie pick.

## Timed effects (#332)
- **An effect** (`src/season/effects.ts`, `EffectFact`): a target (one driver, the car or the team: car and team reach both drivers), grade points per stat (negative = a curse), a **timer** in **races** (`{ races: n }`) or **laps** (`{ laps: n, fromLap? }`), a source (`gear` · `curse` · `event`) and an id. Dealt with `addEffect(facts, e)` into `SeasonFacts.effectFacts`; the dealer (a pack, a curse, an event) owns the clock rules.
- **Facts, not ticks:** live in round R iff `round ≤ R < round + races`; a lap effect lives in its own round. Nothing is written per race, so saves and replays need nothing more. `activeEffects(facts, teamId, round)` gives what is live with `left` ("2 races left", `describeLeft`); `roundEffects` feeds the roster builder.
- **Race timers** apply at race build through the card math (`applyPercents`), after cards and before the rival shift. **Lap timers** go to the engine as `RosterDriver.lapEffects` in raw units (`rawDeltas`): the engine keeps `baseStats`, rebuilds driver / car / team stats at every lap boundary from base + live windows, logs `effect_applied` / `effect_expired`, and `reset()` restores the base. No RNG touched either way.
- **Display:** `RosterDriver.effects` / `Driver.effects` carry `EffectInfo { name, emoji, source, left }` for chips and sheets (Hub).
- **Carrying up a run:** `carriedEffects(prev, teamId)` re-dates live race timers by the races already used (`round − calendar length`), so what had 2 races left still has 2; lap effects don't carry. `CarriedTeam.effects` → `effectFactsOf(facts)` folds them before the league's own.
- The smudged Parcel deals one (#704); window stamps run as lap effects.

## Stamps and Parcels (#704; Steward's spec Oct 14, Pax: two drivers)
All in `src/season/stamps.ts`, data at the top; the stamp pool is the run deck (`src/cards/runDeck.ts`, #647: 60 cards, three price bands, half-race window cards; written as held, never scaled).
- **A stamp** is a run-deck card held for good on one **driver card** or the **car card** (the car and the garage share it: car gear, car traits, team gear and team traits all go there). Gear and traits merge; nothing wears out; no locker, no hand, no moves. `applyCards` is unchanged: `seasonCardsFor` hands the race build each driver's stamps (plus their title stamps) and splits the car card by where a stamp applies.
- **Slots:** `STAMP_SLOTS` **4 per driver card, 5 on the car card** (13). A full card means a stamp is **scraped off** for the next: the fact names what it `replaces`, and that stamp is gone (Steward: slots are about choices, not power).
- **Parcels** (`parcelFor`, own stream `'season','parcel',round,team`): **one before every race, pick 1 of 3**. The three stamps are each on their own sub-stream, any place (driver 2 : car 1 : garage 1), a trait 1 in 4, the metal by your table position (`parcelTierFor`: leader Common → last Legendary, round 1 Uncommon; `PARCEL_METAL`), redrawn on a duplicate or a stamp you already hold. **1 in 10 is a Watcher gift** (`GIFT_METAL`: Gold or Iridium; **never at Locals**), **1 in 10 is smudged**: no stamp, one of the eight named curses on the car or the garage for **one race** (`dealSmudge`, an effect, #332). A Parcel can be **left in the box** (`cardId: null`). Rivals get none.
- **Title stamps** (`titleStamp`, `TITLE_STAMP_LEVELS` 6, `TITLE_STAMP_STATS` locals 1 · state 2): winning a title, **each driver picks a stat** (two at State) and wears **+6 levels** on it **on the ribbon, outside the slots**, for good. The Ladder asks before "Up to State"; `promote(run, picks)` records them on the `TitleFact`; the next step's carry puts them on (`CarriedCards.titles`). Steward measured the Locals stamp at +14 points of State win chance: the growth spurt rank-ups used to give.
- **Facts:** `ParcelFact { round, teamId, tier, gift?, dealt, cardId | null, holder?, replaces? }` and `SmudgeFact { effectId }` in the one ordered `cardFacts` log; `teamStamps(facts, team, round)` folds them from the carry; `openParcel` / `takeSmudge` validate (on the clock, the Parcel as dealt, the stamp fits the card, a full card names its scrape).
- **Cut** (the spec): gear mileage, the locker, the three-card hand, gear slots by trait, the pack offer's place choice, the curse pack. Old runs (schema 3) and seasons (schema 2) are archived.

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
