# Ace America (repo: Parabolica)

The game is **Ace America** at **playaceamerica.com** since #701 (playparabolica.com redirects; docs/DOMAIN.md). The repo, code identifiers and save keys (`parabolica.*`) keep the old name.


Formula 1 race simulation becoming a single-player roguelite: **auto-battler × sports sim × roguelike deck builder** (Balatro-like inputs, a realistic sim; design pillars in `docs/V07_PLAN.md`). Commissioner leagues were removed in #339.
Player betting was retired in June 2026 (git history has it); odds math survives in betting/utils
for the future NPC-crowd system (BetLab was removed Oct 2026; git history has it).

## Project Location
`/Users/pax/parabolica`

## Structure
- `src/` - All source code
  - `App.tsx` - Screen switch driven by the URL
  - `router.ts` - URL routes (#186): hash addresses `#/world-deck/<tab>`, `#/race-control/<tab>`, `#/season/<screen>` (`SEASON_SCREENS`), `useRoute` with `navigate` / `back`
  - `WatchMode.tsx` - Live race screen (track/detail views); the finish is `components/race/FinishSheet.tsx`
  - `racecontrol/` - Race Control, the lab (unlocked from the menu): `runner.ts` is the ONE way a lab race is built (createLeague + prepareScheduledRace = live parity, fully seeded); `physics.ts` measures what the rules produce (mechanics-probe metrics); `knobs.ts` is the simVars registry; `labRunner.ts` runs jobs in a worker or on the main thread; `notebook.ts` keeps presets + runs in localStorage and sends batches to the shared ledger (`public/ledger/*`, fed by `ledger` issues via `.github/workflows/ledger.yml` + `scripts/ledger-ingest.mjs`) (Race Control → Run setup → Lab preset races under one via `applyLabPreset`); `RaceControl.tsx` hosts Physics calibration, Run setup, Deck, Notebook, Method
  - `fantasy/types.ts` - Fantasy teams' maths (snake order, F1-table scoring; the season's draft and points read it). The draft UI, marbles and standings went in #778 (git history; docs/FANTASY.md); the tower's `fantasy` tint plumbing is unreachable until a mode uses it
  - `simlab/types.ts` - `SimVariables` + `CANON_VARIABLES` (the engine's tuning surface; the old Sim Lab UI was folded into Race Control → Physics)
  - `cards/` - `Card` type (`tag`, `window`, `deck`), the 🏁 Motorsport grid deck (`motorsportDeck()`, 94 cards: genesis traits for stand-alone seasons, Quick Race and the lab), **`runDeck.ts` (#647): the 60-card run deck Parcels deal as stamps (`RUN_DECK`, archetype tags, three price bands `PRICE_BAND` / `METAL_BUDGET`, half-race window cards, the 8 named `RUN_CURSES`, `cardById`; display names live in `STAMP_NAMES` / `SMUDGE_NAMES` and icons in `STAMP_ICONS`, keyed by id (#699): **never rename a card by editing its ROWS name, the id is that name's slug**)**, `METAL_LADDER`, `applyCards`, `rawDeltas`, `slotsFor`, `pickCard`, `CardFace.tsx` (the Almanac Plate card: full / small / mini, back, flip; since #699 a corner badge (Ink races left via `INK_RACES` = `GEAR_LIFE`, the Seal DNA mark) and a where-it-applies circle), `CardChip.tsx` (compact square chip for tables) (docs/CARDS.md). The deck shows in World Deck + Race Control → Deck; the sim runs on cards since v0.5.0
  - Quick Race (#605/#606): one tap, a one-race Season league (`season/quickRace.ts`: `generateSeasonPool` → CPU draft → `leagueForRound`), random track + weather, qualifying, optional team to follow (#607), nothing saved
  - `season/` - Season Mode core (Apex, M1): `genesis.ts` (`generateSeasonPool`, `seasonRoster`), `draft.ts` (`draftState`, `applyPick`, `aiPick`, `quickDraft`, `advanceCpu`), `season.ts` (`seasonState`, `setLineup`, `settleRound`, `leagueForRound`, `saveSeason`/`loadSeason`), `stamps.ts` (#704: the Parcel `parcelFor` / `pendingParcel`, `openParcel`, the fold `teamStamps` with ink mileage, `STAMP_SLOTS` 4 / 4 / 5, title stamps `titleStamp`; the pack system it replaced is in git history); one ordered `cardFacts` log. Hub (M2): `setup.ts` (`humansFor`, team picks), `scoring.ts` (race points; Drivers' + Constructors' tables; no champion bonus since #509), `grades.ts` (the dynamic 0–100 scale read from the generators' ranges `DRIVER_STAT_ROLLS` / `STAR_RATING`, stat levels 1–20 since #623 (`level`, `levelTone`, `levelDelta`), `readStat`, `overall`; `grades.test.ts` pins grade points = `applyCards`), `race.test.ts` (the race you watch = the race recorded; never loosen), `badges.ts` (#725: tier identifiers, display only: entry numbers at Locals, town codes at State, state code + 1 / 2 at Nationals (`OH1`, #694), state codes at Quick Race; a car's `number` can be a string), `ui/` (`SeasonScreen` remounts per screen, `StartRun` (the run's start, #697: page 1 a tile map of the 52 (`stateMap.ts`), page 2 the flavour page: garage, colour, logo, rename the dealt drivers and the chassis; rookies are dealt since #696), `Paddock` (#778: one screen, your garage | the league tables; the Parcel face up on arrival as a pack (`ParcelPick`: brown paper, string, the typed label, the three flipping in turn), keep or leave, then Go racing: the lineup is written with the Parcel, no Lock in; "Your deck" under the roster: every stamp in play as a card), `SeasonChart.tsx`, `LeagueTables.tsx` (both league tables: the Paddock's right column + the finale), `RosterTable.tsx` (`GradeCell`, `ReadingSheet`, the shared stat-column constants, `.rt` styles: the house style for data screens), `Standings` (the finale, #778: the title moment (sash, Postmark picks, Up to the next step → its Paddock), two crowns, the chart, the tables), `RunHeader.tsx` (#778: the one header every run screen wears: the title you hold · going for · race N of M · your place, from `run/where.ts`), `RunLadder` (the road, out of the loop), `teams.ts`; single-player since #588, no hotseat / Handoff). The live Season race renders in `App.tsx` (shared engine); rivals hidden via WatchMode's `sealedDriverIds`
  - (driver XP and ranks were removed in #696: titles do that job)
  - `season/format.ts` - A season's format (#694): the Hundred with its lap cuts (`hundred: { race, lapCuts }`, the engine cuts: `RaceConfig.lapCuts`, status `'eliminated'`), a car that doesn't finish it is out, the Final on fresh points from `finalFrom`; `aliveAt`, `stageOf`, `scoredRounds`, `lapCutsFor` / `gridFor` (the Final's first grid = the Hundred's finish) (Nationals' schedule lives on the run)
  - `season/effects.ts` - Timed effects (#332): `EffectFact` (race or lap timers, grade points, driver / car / team), `activeEffects`, `roundEffects` → roster, `carriedEffects`; lap timers run in the engine (`RosterDriver.lapEffects`, `baseStats`) (docs/RUN.md)
  - `run/` - **The run (v0.8, #696, #694): Locals → State → Nationals** (docs/RUN.md): `run.ts` (`RunFacts` = setup (seed, state, garage) + titles + per-step facts, `STEP_PLAN` (5 / 6 / 4), `HUNDRED_CUTS` (30 / 20 / 10 states after laps 1 / 2 / 3) + `NATIONALS_FORMAT` + `rivalStates` (every state's Ace at +40), `STATE_FIELD` (+20 / +27 / +34 by state size), derived `SeasonSetup`s with the carried garage, `townOf` / `titleFor`, `promote(run, picks)` (records the title and its stamps), `runState`, `replayRun`, run save schema 4), `meta.ts` (unlocks + run records, survives version bumps), `current.ts` (the screens' facade: `loadCurrentLeague` / `saveCurrentLeague` / `startRun` / `promoteCurrentRun`), `ladderView.ts` (the road's view; since #778 each rung's `route`: every race's venue and kind, your place once run, `routeAhead` for a step not yet played), `where.ts` (#778: `runWhere(facts)`, the title held / going for / race / place a screen says first; `heldTitles`); the nemesis is parked behind `NEMESIS_IN_RUN`
  - `season/rookies.ts` - Dealt rookies (#696): every run driver, car and team at level 5 ± a wobble, no traits, American names; `dealRookies(seed)` deals your pair and car on the run seed. `data/states.ts` (52 places: population → `fieldSize` 5 / 10 / 20, a town pool, the State looks), `data/garages.ts` (generic rival garage names + colours + logos)
  - `look/` - **The look, v0.8 (#705): Ace America, the race program** (docs/LOOK.md): `tokens.css` (the `--ace-*` roles; one theme per step via `[data-step]`), `look.css` (the components, tokens only), `Look.tsx` (`StepTheme`, `Sash`, `Bunting`, `TitleRibbon`, `Rosette`, `Confetti`, `StateBar`, `AceCard`, `Stamp`, `Parcel`…), `sash.ts` (one centre curve; the words sit straight on it since #778, never a textPath), `step.ts` (`Step` ids, the state-look stub, `stepThemeVars`, `stepForLeague`), `fonts.ts` (the five faces stored with the app); Race Control → Style shows every component in every theme; the Ladder and the menu are the proof
  - `icons/` - game-icons registry + meaning map, `GameIcon`, `TeamLogo`, `ink.ts` (white / near-black ink on a team colour), `RaceNumber.tsx` (the only way to draw a centred racing number), theme tokens
  - `data/deckTeams.ts` · `deckTracks.ts` · `deckWeather.ts` - the 28 base-deck teams, 6 stat-combo tracks (since #750 each a kind named for its Nationals landmark; `season/venues.ts` names the kind for a run's step: your town at Locals, a town in your state at State, `venueFor` / `venueForSetup` / `trackForRound`), Neutral + 5 dry weathers (the sim runs on them from the v0.5 bundle PR; `trackTags.ts` / `inflictions.ts` are gone)
  - `betting/utils.ts` - Pure odds/rating utilities (kept for NPC crowds later)
  - `feed/commentary.ts` - Race feed persona/commentary engine; `feed/interval.ts` (#751): the Interval, the Watchers' rare broadcast after a big moment (one roll per race on its own stream, Steward's odds `INTERVAL_ODDS`, never at Locals, at most one per race; Radio's ten lines)
  - `RaceEngine.ts` - Core race simulation engine (seedable: setSeed / runHeadless(seed)); `RaceConfig.lapCuts` (#694: the Hundred's cuts, status `'eliminated'` ≠ DNF, `isOutOfRace`), `RaceConfig.gridOrder` (a fixed grid, no qualifying), a `'weather'` event when rain arrives (#762)
  - `engine/rng.ts` - Seeded RNG (mulberry32, deriveSeed, shuffle) — determinism foundation
  - `storage/persistence.ts` - Versioned localStorage league save; `storage/carry.ts` - the one-tap save move from playparabolica.com to playaceamerica.com (#701, docs/DOMAIN.md)
  - `league/` - the league engine Season Mode reuses: `league.ts` (`createLeague`, `rosterStateAt`), `settle.ts` (`prepareScheduledRace`, settle loop), `types.ts`, interventions/acquisition/highlights. Commissioner leagues' UI, gods and the dev console were removed in #339
    - `remote.ts` - the league server client (publish, open by code, sync, digests; docs/LEAGUE_SERVER.md). No UI uses it now; kept for v0.6 live seasons
- `server/` - The league service: Cloudflare Worker + Durable Object (`wrangler.toml`, `src/index.ts`); deployed by `.github/workflows/deploy-api.yml`; `cd server && npx wrangler dev --local` to run it locally
- `dist/` - Production build output
- `public/` - Static assets

## Commands
- `npm run dev` - Start dev server (localhost:5173)
- `npm run build` - Production build
- `npm test` - Run vitest suite (engine determinism, league invariants, persistence)
- `npm run glossary` - Regenerate docs/GLOSSARY.md from the data modules (a test fails when it is stale)
- `npm run lab -- <seed> <races> all [cards…]` - Replay a Race Control batch in the terminal and print its fingerprint
- GitHub: `gh api` REST only (GraphQL is blocked in sessions) — see the `write-issue` and `ship-pr` skills

## Tech Stack
- Vite + React + TypeScript
- Web Workers for heavy simulations
- GitHub: GrizzlyPax/Parabolica

## How we work
- **Read first:** `docs/V08_PLAN.md` (the current release: v0.8 Indianapolis, Ace America), then `docs/STORY_BIBLE.md` (the world, **canon**: Ace America) and `docs/story/ace-america.md` (working notes), then `docs/V07_PLAN.md` (the roguelite run it builds on), then the newest `docs/HANDOFF_*.md` (`HANDOFF_2026-10-17.md`: the UI pass; `HANDOFF_2026-10-16.md`: how the pieces fit, traps). v0.6's record and the run's design decisions: `docs/V06_PLAN.md`; v0.5's: `docs/V05_PLAN.md`.
- **Skills (`.claude/skills/`)** hold the procedures: `write-issue` (issue shape, triage, `ready`), `ship-pr` (build → test → PR → merge rules), `republish-preview`, `balance-read`, `season-report`.
- **GitHub is the task system. Every thread, every crew member.** No Asana, no TODO docs; the issue is the task.
  - **Milestones = sequence.** Each release splits into numbered milestones worked in order (v0.6 was `1 Choices` → `2 The bump` → `3 Ship`). v0.5 Spa shipped Oct 9, v0.6 Monza Oct 10; v0.7 Suzuka shipped Oct 10 (v0.7.4, trimmed); v0.8 is `1 Lock + the look` → `2 Foundations` → `3 Screens + words` → `4 Ship`, and `v0.8 Indianapolis · Ace America` holds v0.8 work not yet placed (`v0.7 Suzuka` still holds older unplaced work). No due dates.
  - **Crew = a label:** `crew: apex` · `crew: hub` · `crew: radio` · `crew: steward` · `crew: pit` · `crew: pax` (needs Pax's call). Only current-release issues carry crew labels.
  - **Not in a release:** label `queued` (committed) or `icebox` (maybe / needs Pax).
  - **Order inside a milestone:** each issue's "Depends on" line. Pick the first open issue in the earliest milestone with your crew label whose dependencies are closed.
  - **Hand-off:** every current-release issue starts with a `> **Paste (model):** …` line. Pax opens a chat on that model and pastes it.
  - **When work ships:** the PR says `Closes #N`; merging closes the issue. That's the whole status update.
- **`ready` label is the handoff.** Scope an issue until it can be built without guessing, then label it `ready`. Build only `ready` issues (or one Pax names). Out-of-scope finds become new issues, not extra code.
- **Planning sessions** (issues, scoping, docs) don't edit `src/`, `server/`, `scripts/` or tests. **Build sessions** do one issue per branch/PR.
- **Talking to Pax:** Smart Brevity — TL;DR first, bullets, bold the key bit, plain words. Anchor changes to where he sees them (screen → button). Link issues with titles, never bare numbers. Questions as multiple choice (A / B / C, pick marked). Story and theme are Pax's — capture, don't invent canon.
- **Copy-ready text goes in a code block (Pax, Oct 10):** every paste prompt, kickoff and handoff meant for another chat goes inside a ```text fenced block (plain text, no markdown inside), so Pax can tap the copy button on mobile.
- **Show, don't tell (Pax, Oct 9):** for any decision, report or layout, make a claude.ai **artifact** (a mock-up, a live demo, a chart, a report page) instead of a wall of text. Layouts: 2–3 mock-ups Pax reacts to live. Balance reads: charts. Names / flavour: samples as they'd appear in the game. Link the artifact in the issue comment and the handoff. On his phone, Pax prefers **3–4 big multiple-choice steers** (or just talking it through) over boards of toggles; if a page saves answers, test **un-selecting** before you share it. Put every option for one decision on **one page** (one publish = one approval, not one per board).
- **Pit keeps Pax oriented:** whenever the plan moves (a handoff lands, an issue moves, a milestone closes), Pit's reply includes **where we are**: a milestone table (✅ done / 🟡 now / what's left, with issue links and crew) and **when Pax can play it** ("after #N you can …"). Pull the numbers live from GitHub milestones; close a milestone when its last issue closes.
- **Spotter sweep (Pax, Oct 10):** whenever Pit plans, scopes or processes a handoff, it first lists `idea` issues created since the last sweep (`gh api "repos/GrizzlyPax/Parabolica/issues?labels=idea&sort=created&direction=desc"`) and triages each: slot into a release (milestone + crew + `ready` when buildable), fold into an existing issue, or leave in the icebox with a one-line note. Bugs Spotter files go straight into the current release. Pit's reply names what it slotted.
- **Desktop first (Pax, Oct 10):** screens are built for a big screen (design at 1440 × 900); the phone view is a smaller version that must not break, not the priority. (Pax still reads artifacts and steers on his phone.)
- **Done** = merged, live on playaceamerica.com, and (for UI) checked in the browser.

## The crew
Every current-release issue has a `crew:` label saying who (and which model) should take it, and starts with a Paste line Pax uses to open the chat.

| Crew | Model | Takes | Opener |
|---|---|---|---|
| 🎤 Pit | Opus | Planning, issues, milestones, `docs/` | "You're 🎤 Pit, the PM. Calm, short, always has the plan. Issues and docs only; never code." |
| 🏎️ Apex | Fable | Sim physics, determinism, server, architecture, multi-file changes | "You're 🏎️ Apex, senior engineer. Measure twice; protect the golden fingerprint. Build <task> with `ship-pr`." |
| 🛞 Hub | Opus | Scoped features and bugs with a clear `ready` spec (UI screens, contained fixes) | "You're 🛞 Hub, the workhorse. Small clean PRs. Build <task> with `ship-pr`." |
| 📻 Radio | Opus | Story + identity: the story bible, teams (names, colours, icons), driver/card flavour, lore. Brainstorms with Pax | "You're 📻 Radio, the storyteller. Read docs/STORY_BIBLE.md + docs/STORY_WORKSTREAM.md first. Brainstorm, write docs and World Deck proposals; never code. Hand data changes to Pit as issues." |
| 🏛️ Steward | Opus | Game design: how the game plays. Systems (the season loop, cards, tracks & weather, modes), balance, and the **fun check**. Writes design specs with Pax, runs balance probes and season reads, recommends numbers | "You're 🏛️ Steward, the game designer. You own how the game plays: systems, balance and whether it's fun. Use `balance-read` / `season-report`. Recommend; never change code. Pit turns your specs into issues." |
| 🔭 Spotter | Sonnet | Quick idea capture from anywhere (Pax, Oct 10): turns a stray thought into an `idea` issue in seconds | "You're 🔭 Spotter. Pax will throw quick ideas at you. For each: search open issues for a duplicate (comment there if found), else file a short `idea` + `icebox` issue in the write-issue shape (TL;DR, his words in Original idea, a few open questions, Related links). No scoping, no milestones, no code. Reply in one line with the issue link." |
| 👤 Pax | — | Decisions, playtesting, story | Team principal. |

- **Routing rule (Pit):** Fable time is scarce, so only tasks that need it go to Apex; everything else that touches code goes to Hub. Design questions (how it plays, is it fun, what the numbers should be) go to Steward first; Pit turns the answer into issues.
- **Story is Pax's:** Radio proposes and captures; nothing is canon until Pax moves it into `docs/STORY_BIBLE.md`.
- **Stay in your lane:** if a task turns out bigger than its crew, stop, comment why on the issue, and hand it back to Pit to re-route.
- Start every message with your emoji and name (e.g. "🛞 Hub:").
- **End every session with a handoff to Pit**, ready for Pax to paste, headed `<emoji> <Name> → 🎤 Pit: handoff (<date>)`:
  - **TL;DR** (2–3 lines)
  - **Shipped:** issue · PR · what, and where Pax sees it
  - **Decisions** Pax made (for the decision log)
  - **Issue edits needed:** stale text, new follow-ups, scope changes
  - **Traps** the next person should know
  - **Next:** what you'd pick up, and what's blocked on whom
  Check what Pit already handled before listing it.

## Docs
- `docs/V08_PLAN.md` - **The v0.8 Indianapolis plan (current):** Ace America, the rebrand, stamps and the City → State → Nationals run; milestones, rules, decision log
- `docs/V07_PLAN.md` - The v0.7 Suzuka plan (shipped Oct 10, v0.7.4, trimmed): the roguelite run; milestones, lanes, design pillars
- `docs/V06_PLAN.md` - The v0.6 Monza plan (shipped Oct 10, v0.6.1): owner choices; milestones, lanes, decision log, v0.7 direction
- `docs/V05_PLAN.md` - The v0.5 Spa plan (shipped Oct 9, v0.5.1): milestones, crew lanes, build order, risks, decision log
- `docs/README.md` - Index of every doc, grouped by area (update it when a doc is added, renamed or retired)
- `docs/ARCHITECTURE_REVIEW.md` - Refactor roadmap (seeded RNG, persistence, engine split)
- `docs/GAME_DESIGN_PASS.md` - Live-race design roadmap (drama beats, bet settlement, persistence)
- `docs/COMMISSIONER_MODE.md` - History / north star: wall-clock roguelite seasons, gods, decrees (leagues removed in #339)
- `docs/COMMISSIONER_MODE_TECH.md` - History: technical plan (seeded RNG, persistence, settle/scheduler, league runtime)
- `docs/SIM_MECHANICS.md` - The stat truth doc: formulas, magnitudes, rebalance history, lab workflow
- `docs/BALANCE_REPORT_2026-10-09.html` - Steward's balance report: stat parity, tracks & weather, how Season titles are decided (findings; recommendations follow)
- `docs/BALANCE_DIALS_2026-10-09.html` - Steward's raw-stat balance philosophy: king stat vs emperor, stat balance vs competitive balance
- `docs/BALANCE_PASS_ONE_2026-10-09.html` - Steward's recommended pass: 23 dials tuned to Pax's Oct 9 targets, measured, with the dial sheet
- `docs/BALANCE_HANDOFF.md` - Game-dev handoff: data exports, tuning surface, balance state, workflow
- `docs/CARDS.md` - Cards revamp: tags → gear / traits / effects, placeholder ladder, Motorsport base deck, two-step rollout
- `docs/TAG_SYSTEM.md` - History: the tag system (retired in v0.6, #334 / #541; cards replaced it)
- `docs/TRACKS_WEATHER.md` - 6 stat-combo tracks + Neutral and 5 dry weathers (live in v0.5); lap-by-lap Wet with a wet tyre (v0.6)
- `docs/CONDITIONS_LAYER.md` - History: track tags + weather (retired in v0.6; see TRACKS_WEATHER)
- `docs/STORY_WORKSTREAM.md` - Handoff for ANY agent/collaborator: orientation, where things are, fixed vs flexible, flavour pass vs theme change, the loop, prompts
- `docs/STORY_BIBLE.md` - **Canon:** Ace America (since #712). Pax's theme/voice bible; agents read it before any flavour pass; change it only by PR with Pax's say-so
- `docs/story/` - Story brainstorms and working notes (NOT canon until moved into the bible); index in `docs/story/README.md`
- `docs/WORLD_DECK.md` - Content framework: how to add teams, tracks, names, tags, cards, weather, gods, commentary (shapes, rules, voice, backlog, agent prompt)
- `docs/GLOSSARY.md` - GENERATED World Deck: every team, track, card, rule, weather and flavour pool (`npm run glossary`; `src/data/worldDeck.test.ts` checks content)
- `docs/SEASON_MODE.md` - v0.5 Spa build spec: Season Mode (League Setup, snake draft, Paddock → Race loop, card packs)
- `docs/FANTASY.md` - Fantasy teams: snake draft, obfuscated draft info, scoring, where it shows
- `docs/DOMAIN.md` - Moving to playaceamerica.com (#701): serve both domains, the one-tap save move, then the 301; Cloudflare click-by-click
- `docs/LEAGUE_SERVER.md` - One league, every device: the server holds facts + decrees + canonical digests; devices replay; publish / open by code / link; deploy secrets
- `docs/RACE_CONTROL.md` - The lab: parity rule, seeds and fingerprints, physics calibration, how to replicate and export
- `docs/ICONS.md` - Design change: game-icons.net replaces every emoji (meaning registry, currentColor), and the UI + icons take your team's colours
- `docs/PROCEDURAL_IDENTITY.md` - Procedural universe identity (driver names #191, league names #185, team identity #183)
- `docs/HANDOFF_2026-10-17.md` - **Oct 17: the UI pass (#778)** (read first): the run loop in fewer taps, one design system on `src/look`, the race view, tracks named by step and the Interval; what moved on every screen, how `RunHeader` / `where.ts` / `venues.ts` / `interval.ts` fit, the traps, what's left
- `docs/HANDOFF_2026-10-16.md` - **Oct 16: v0.8 playable end to end** (read first): what v0.8 is and where Pax sees it, how the run, stamps, Nationals, the look, badges and the voice fit, this week's traps, what's left with the paste lines
- `docs/HANDOFF_2026-10-08.md` - Oct 8: GitHub-only planning, the crew, the Almanac look, icons, metal rarity, racing numbers, what's next
- `docs/HANDOFF_2026-10-07.md` - Week of Oct 5–7 handoff for code agents: what shipped, how the pieces fit, traps, open work (read first)
