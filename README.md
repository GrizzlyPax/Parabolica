# Parabolica

**Racing, where everything is fine.**

Parabolica is a browser-based racing simulation and betting game. Watch procedurally generated drivers compete across fictional tracks while you place bets with virtual marbles. It's part idle game, part sports betting satire, and entirely chaotic.

---

## Table of Contents

- [Play the Game](#play-the-game)
- [What is Parabolica?](#what-is-parabolica)
- [Game Modes](#game-modes)
- [How Betting Works](#how-betting-works)
- [For Developers](#for-developers)
- [How This Project is Built](#how-this-project-is-built)
- [Contributing](#contributing)

---

## Play the Game

**[playparabolica.com](https://playparabolica.com)**

No download required. Works on desktop and mobile browsers.

---

## What is Parabolica?

Parabolica simulates racing with procedurally generated:

- **Drivers** with unique names, stats, and quirks
- **Teams** with distinctive personalities and car quality
- **Tracks** with special events (safety cars, rain, chaos)
- **Cars** that affect performance based on power, grip, and reliability

You don't control anything. You just watch... and bet.

The game satirizes sports gambling culture with an AI bookie named "Mister Marbles" who offers commentary that ranges from encouraging to unsettlingly accurate.

---

## Game Modes

### Single Race
One race. Random drivers. Random track. Place your bets and see what happens.

### Season Mode
A multi-race championship with:
- Consistent driver/team roster across all races
- Championship standings
- Cumulative marble earnings
- Season-end summary you can share

### Prohibition Mode
Toggle off gambling entirely if you just want to watch racing without the betting layer.

---

## How Betting Works

Each race, you receive **100 marbles** to bet with. You can place multiple bets on different drivers with different bet types:

| Bet Type | What It Means | Base Payout |
|----------|---------------|-------------|
| **Win** | Driver finishes 1st | 10x |
| **Podium** | Driver finishes top 3 | 4x |
| **Points** | Driver finishes top 10 | 2x |
| **Finishes** | Driver completes the race | 1.5x |
| **DNF** | Driver crashes/retires | 3x |

Payouts are modified by driver strength:
- **Favorites** (purple tier): Lower payouts, safer bets
- **Contenders** (green tier): Moderate payouts
- **Longshots** (yellow tier): Higher payouts, riskier
- **Wildcards** (red tier): Huge payouts if they win

Your **bankroll** accumulates across a season. At the end, you can share your results in a Wordle-style format.

---

## For Developers

### Tech Stack

- **React 18** with TypeScript
- **Vite** for development and builds
- **Pure CSS** (no frameworks)
- **No backend** - entirely client-side

### Local Development

```bash
# Clone the repo
git clone https://github.com/GrizzlyPax/Parabolica.git
cd Parabolica

# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

The dev server runs at `http://localhost:5173` (or next available port).

### Project Structure

```
src/
├── App.tsx              # Main app component, screen routing
├── MainMenu.tsx         # Title screen
├── LeagueSetup.tsx      # Pre-race team/track selection
├── MarbleMode.tsx       # Betting interface
├── WatchMode.tsx        # Race viewing + leaderboard
├── SeasonSetup.tsx      # Season configuration
├── SeasonStandings.tsx  # Championship table
├── SeasonComplete.tsx   # End-of-season summary
├── Compendium.tsx       # Reference/lore viewer
├── RaceEngine.ts        # Core simulation logic
├── generators/          # Procedural generation (drivers, cars, tracks)
├── data/                # Static data (teams, names, quirks)
├── components/          # Shared UI components
├── types/               # TypeScript type definitions
└── utils/               # Helper functions
```

---

## How This Project is Built

### AI-Assisted Development with Claude Code

This project is developed using **Claude Code**, Anthropic's CLI tool for AI-assisted software development. Here's how the workflow operates:

#### The Setup

1. **Claude Code CLI** runs in the terminal with access to the local filesystem
2. **GitHub CLI (`gh`)** is authenticated for issue tracking and PR management
3. Claude can read/write files, run commands, and interact with GitHub directly

#### What This Enables

**Live Issue Tracking**
```bash
# Claude fetches open issues directly from GitHub
gh issue list --state open
```

Claude can:
- Read issue descriptions and requirements
- Comment on issues with progress updates
- Close issues when work is complete
- Create pull requests with proper formatting

**File Operations**
Claude reads and modifies source code directly, understanding the full context of the codebase. When you describe a feature, Claude can:
- Search for relevant files
- Understand existing patterns
- Implement changes across multiple files
- Maintain consistent code style

**Iterative Development**
A typical session looks like:
1. User describes what they want ("add shareable race summaries")
2. Claude explores the codebase to understand current implementation
3. Claude implements the feature across relevant files
4. Claude can run builds to verify changes work
5. Claude commits and pushes when requested
6. Claude updates relevant GitHub issues

#### Example Session

```
User: "Add a share button that copies race results"

Claude:
1. Reads WatchMode.tsx to understand race result structure
2. Adds generateShareText() function
3. Adds clipboard API with fallback
4. Adds Share button to finish modal
5. Adds CSS for the new button
6. Tests the build
7. Commits: "Add shareable race summaries"
8. Comments on GitHub issue #25 with implementation details
```

#### Why This Works

- **Context preservation**: Claude maintains understanding across a conversation
- **Tool access**: Direct file/git/GitHub access means less copy-pasting
- **Iterative refinement**: Easy to say "also do X" and Claude adds to existing work
- **Documentation**: Claude can explain what it changed and why

#### For Non-Technical Readers

Think of it like pair programming with an AI that:
- Never forgets what files exist in the project
- Can look up any file instantly
- Writes code in the same style as the rest of the project
- Checks in with you before making big changes
- Keeps track of what's done vs. what's still TODO

The human provides direction and approval. Claude handles implementation details, repetitive tasks, and cross-file coordination.

---

## Contributing

This is a personal project but issues and suggestions are welcome.

### Reporting Bugs
Open an issue at [github.com/GrizzlyPax/Parabolica/issues](https://github.com/GrizzlyPax/Parabolica/issues) with:
- What you expected to happen
- What actually happened
- Browser/device info if relevant

### Feature Ideas
Same place! Describe what you'd like to see and why it would be fun.

---

## Credits

Created by [@GrizzlyPax](https://github.com/GrizzlyPax)

Built with assistance from Claude (Anthropic)

*"Everything is fine."*
