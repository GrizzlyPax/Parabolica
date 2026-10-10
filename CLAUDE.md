# Parabolica Race Engine

Formula 1 race simulation with Season Mode (draft, Paddock, two championships). Commissioner leagues were removed in #339; live seasons return in v0.6.
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
  - `fantasy/` - Fantasy teams: `types.ts` (config, snake order, F1-table scoring), `DraftPanel.tsx` (teams + obfuscated draft), `TeamMarble.tsx`, `FantasyStandings.tsx` (unused since #339); config lives in `LeagueSetupConfig.fantasy` (travels with a published league); timing tower tints drafted rows (docs/FANTASY.md)
  - `simlab/types.ts` - `SimVariables` + `CANON_VARIABLES` (the engine's tuning surface; the old Sim Lab UI was folded into Race Control → Physics)
  - `cards/` - the 🏁 Motorsport deck: `Card` type, `motorsportDeck()` (94 cards from the stat grid), `METAL_LADDER`, `applyCards`, `slotsFor`, `pickCard`, `CardFace.tsx` (the Almanac Plate card: full / small / mini, back, flip), `CardChip.tsx` (compact square chip for tables) + `CardSheet.tsx` (one racer's cards: hand, trait pile, locker deck; mine vs rival view; lives in the Season Paddock) (docs/CARDS.md). The deck shows in World Deck + Race Control → Deck; the sim runs on cards since v0.5.0
  - Quick Race (#605/#606): one tap, a one-race Season league (`season/quickRace.ts`: `generateSeasonPool` → CPU draft → `leagueForRound`), random track + weather, qualifying, optional team to follow (#607), nothing saved
  - `season/` - Season Mode core (Apex, M1): `genesis.ts` (`generateSeasonPool`, `seasonRoster`), `draft.ts` (`draftState`, `applyPick`, `aiPick`, `quickDraft`, `advanceCpu`), `season.ts` (`seasonState`, `setLineup`, `settleRound`, `leagueForRound`, `saveSeason`/`loadSeason`), `pack.ts` (`pendingPack`, `applyPack`, `moveGear`, `teamCardState`); one ordered `cardFacts` log. Hub (M2): `setup.ts` (`humansFor`, team picks), `scoring.ts` (race points; Drivers' + Constructors' tables; no champion bonus since #509), `grades.ts` (the dynamic 0–100 scale read from the generators' ranges `DRIVER_STAT_ROLLS` / `STAR_RATING`, F…A+ / S grades, `readStat`, `overall`; `grades.test.ts` pins grade points = `applyCards`), `race.test.ts` (the race you watch = the race recorded; never loosen), `ui/` (`SeasonScreen` remounts per screen, `LeagueSetup`, `DraftBoard`, `Paddock` (Team / League tabs, one roster table, one card in hand), `SeasonChart.tsx`, `LeagueTables.tsx` (both league tables: Paddock League tab + finale), `RosterTable.tsx` (`GradeCell`, `ReadingSheet`, the shared stat-column constants, `.rt` styles: the house style for data screens), `Standings` (finale only: two crowns), `teams.ts`; single-player since #588, no hotseat / Handoff). The live Season race renders in `App.tsx` (shared engine); rivals hidden via WatchMode's `sealedDriverIds`
  - `run/` - The roguelite run (v0.7, #597): `run.ts` (`RunFacts` = setup + per-league facts, derived `SeasonSetup`s with the carried team, `promote`, `runState`, `replayRun`, run save), `meta.ts` (unlocks + run records, survives version bumps), `current.ts` (the screens' facade: `loadCurrentLeague` / `saveCurrentLeague` / `startRun` / `promoteCurrentRun`) (docs/RUN.md)
  - `icons/` - game-icons registry + meaning map, `GameIcon`, `TeamLogo`, `ink.ts` (white / near-black ink on a team colour), `RaceNumber.tsx` (the only way to draw a centred racing number), theme tokens
  - `data/deckTeams.ts` · `deckTracks.ts` · `deckWeather.ts` - the 28 base-deck teams, 6 stat-combo tracks, Neutral + 5 dry weathers (the sim runs on them from the v0.5 bundle PR; `trackTags.ts` / `inflictions.ts` are gone)
  - `betting/utils.ts` - Pure odds/rating utilities (kept for NPC crowds later)
  - `feed/commentary.ts` - Race feed persona/commentary engine
  - `RaceEngine.ts` - Core race simulation engine (seedable: setSeed / runHeadless(seed))
  - `engine/rng.ts` - Seeded RNG (mulberry32, deriveSeed, shuffle) — determinism foundation
  - `storage/persistence.ts` - Versioned localStorage league save
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
- **Read first:** `docs/V07_PLAN.md` (the current release: v0.7 Suzuka, the roguelite run), then the newest `docs/HANDOFF_*.md` (how the pieces fit, traps). v0.6's record and the run's design decisions: `docs/V06_PLAN.md`; v0.5's: `docs/V05_PLAN.md`.
- **Skills (`.claude/skills/`)** hold the procedures: `write-issue` (issue shape, triage, `ready`), `ship-pr` (build → test → PR → merge rules), `republish-preview`, `balance-read`, `season-report`.
- **GitHub is the task system. Every thread, every crew member.** No Asana, no TODO docs; the issue is the task.
  - **Milestones = sequence.** Each release splits into numbered milestones worked in order (v0.6 was `1 Choices` → `2 The bump` → `3 Ship`). v0.5 Spa shipped Oct 9, v0.6 Monza Oct 10; v0.7 is `1 Run core` → `2 Run screens` → `3 Ship`, and `v0.7 Suzuka` holds v0.7 work not yet placed. No due dates.
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
- **Done** = merged, live on playparabolica.com, and (for UI) checked in the browser.

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
- `docs/V07_PLAN.md` - **The v0.7 Suzuka plan (current):** the roguelite run; milestones, lanes, rules
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
- `docs/STORY_BIBLE.md` - Pax's theme/voice bible; agents read it before any flavour pass (story workstream)
- `docs/story/` - Story brainstorms and working notes (NOT canon until moved into the bible); index in `docs/story/README.md`
- `docs/WORLD_DECK.md` - Content framework: how to add teams, tracks, names, tags, cards, weather, gods, commentary (shapes, rules, voice, backlog, agent prompt)
- `docs/GLOSSARY.md` - GENERATED World Deck: every team, track, card, rule, weather and flavour pool (`npm run glossary`; `src/data/worldDeck.test.ts` checks content)
- `docs/SEASON_MODE.md` - v0.5 Spa build spec: Season Mode (League Setup, snake draft, Paddock → Race loop, card packs)
- `docs/FANTASY.md` - Fantasy teams: snake draft, obfuscated draft info, scoring, where it shows
- `docs/LEAGUE_SERVER.md` - One league, every device: the server holds facts + decrees + canonical digests; devices replay; publish / open by code / link; deploy secrets
- `docs/RACE_CONTROL.md` - The lab: parity rule, seeds and fingerprints, physics calibration, how to replicate and export
- `docs/ICONS.md` - Design change: game-icons.net replaces every emoji (meaning registry, currentColor), and the UI + icons take your team's colours
- `docs/PROCEDURAL_IDENTITY.md` - Procedural universe identity (driver names #191, league names #185, team identity #183)
- `docs/HANDOFF_2026-10-08.md` - Oct 8: GitHub-only planning, the crew, the Almanac look, icons, metal rarity, racing numbers, what's next (read first)
- `docs/HANDOFF_2026-10-07.md` - Week of Oct 5–7 handoff for code agents: what shipped, how the pieces fit, traps, open work (read first)
