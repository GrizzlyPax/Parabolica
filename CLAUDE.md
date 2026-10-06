# Parabolica Race Engine

Formula 1 race simulation, building toward Commissioner Mode (wall-clock roguelite leagues).
Player betting was retired in June 2026 (git history has it); odds math survives in betting/utils
and BetLab for the future NPC-crowd system.

## Project Location
`/Users/pax/parabolica`

## Structure
- `src/` - All source code
  - `App.tsx` - Screen router: main menu, quick race, founding, league, compendium
  - `WatchMode.tsx` - Live race screen (track/detail views, finish modal)
  - `Compendium.tsx` - Lab tools navigation (SimLab, BetLab)
  - `simlab/` - Monte Carlo race simulation
  - `betlab/` - Betting odds analysis (lab tool; player betting is retired)
  - `betting/utils.ts` - Pure odds/rating utilities (kept for NPC crowds later)
  - `feed/commentary.ts` - Race feed persona/commentary engine
  - `RaceEngine.ts` - Core race simulation engine (seedable: setSeed / runHeadless(seed))
  - `engine/rng.ts` - Seeded RNG (mulberry32, deriveSeed, shuffle) — determinism foundation
  - `storage/persistence.ts` - Versioned localStorage league save
  - `league/` - Commissioner Mode: seed → universe, wall-clock settle loop, interventions
    - `gods.ts` - Appetite gods (placeholder identities; evaluators are PR 5)
    - `ui/` - FoundingScreen, LeagueScreen (check-in reel, countdown, standings, chronicle)
    - `devConsole.ts` - window.league console (dev builds only)
- `dist/` - Production build output
- `public/` - Static assets

## Commands
- `npm run dev` - Start dev server (localhost:5173)
- `npm run build` - Production build
- `npm test` - Run vitest suite (engine determinism, league invariants, persistence)
- `npm run glossary` - Regenerate docs/GLOSSARY.md from the data modules (a test fails when it is stale)
- `gh issue list` - View GitHub issues
- `gh issue view <number>` - View specific issue

## Tech Stack
- Vite + React + TypeScript
- Web Workers for heavy simulations
- GitHub: GrizzlyPax/Parabolica

## Docs
- `docs/ARCHITECTURE_REVIEW.md` - Refactor roadmap (seeded RNG, persistence, engine split)
- `docs/GAME_DESIGN_PASS.md` - Live-race design roadmap (drama beats, bet settlement, persistence)
- `docs/COMMISSIONER_MODE.md` - Gamification north star (wall-clock roguelite seasons, gods, decrees)
- `docs/COMMISSIONER_MODE_TECH.md` - Technical plan (seeded RNG, persistence, settle/scheduler, league runtime)
- `docs/SIM_MECHANICS.md` - The stat truth doc: formulas, magnitudes, rebalance history, lab workflow
- `docs/BALANCE_HANDOFF.md` - Game-dev handoff: data exports, tuning surface, balance state, workflow
- `docs/TAG_SYSTEM.md` - Tag system design framework (five sources, magnitude ladder, acquisition engine, interview)
- `docs/CONDITIONS_LAYER.md` - Track tags + weather design build (the conditions stack; companion to TAG_SYSTEM)
- `docs/STORY_BIBLE.md` - Pax's theme/voice bible; agents read it before any flavour pass (story workstream)
- `docs/WORLD_DECK.md` - Content framework: how to add teams, tracks, names, tags, cards, weather, gods, commentary (shapes, rules, voice, backlog, agent prompt)
- `docs/GLOSSARY.md` - GENERATED World Deck: every team, track, tag, card, rule, weather, infliction, god and flavour pool (`npm run glossary`; `src/data/worldDeck.test.ts` checks content)
- `docs/PROCEDURAL_IDENTITY.md` - Procedural universe identity (driver names #191, league names #185, team identity #183)
