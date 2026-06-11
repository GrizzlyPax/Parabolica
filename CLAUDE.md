# Parabolica Race Engine

Formula 1 race simulation with betting odds system.

## Project Location
`/Users/pax/parabolica`

## Structure
- `src/` - All source code
  - `MarbleMode.tsx` - Main race/betting UI
  - `WatchMode.tsx` - Live race screen (track/detail/standings views)
  - `Compendium.tsx` - Lab tools navigation (SimLab, BetLab)
  - `simlab/` - Monte Carlo race simulation
  - `betlab/` - Betting odds analysis
  - `betting/utils.ts` - Pure betting calculation utilities
  - `feed/commentary.ts` - Race feed persona/commentary engine
  - `RaceEngine.ts` - Core race simulation engine
- `dist/` - Production build output
- `public/` - Static assets

## Commands
- `npm run dev` - Start dev server (localhost:5173)
- `npm run build` - Production build
- `npm test` - Run vitest suite (betting math + race engine invariants)
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
