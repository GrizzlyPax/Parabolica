# Parabolica Race Engine

Formula 1 race simulation with betting odds system.

## Project Location
`/Users/pax/race-engine`

## Structure
- `src/` - All source code
  - `MarbleMode.tsx` - Main race/betting UI
  - `Compendium.tsx` - Lab tools navigation (SimLab, BetLab)
  - `simlab/` - Monte Carlo race simulation
  - `betlab/` - Betting odds analysis
  - `betting/utils.ts` - Pure betting calculation utilities
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

## Known Issues
- #139: Bet Lab progress bar doesn't update during simulation
