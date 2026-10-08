# v0.5 Spa — the plan

*Master plan for the current release. Owner: 🎤 Pit. Tasks, owners and dates live in Asana ([🏁 Parabolica → 🇧🇪 v0.5 Spa](https://app.asana.com/1/1219276824761487/project/1219276019625158)); build specs live in the GitHub issues each task links. If this doc and Asana disagree on a date, Asana wins.*

## What v0.5 is
**Season Mode:** set up a league, snake-draft against the AI, then play **Paddock → Race** turns to a champion. It's local and hotseat, and it replaces the old Commissioner leagues. It ships with:
- **gear and trait cards** (the first half of the Cards revamp);
- **the 28 new teams**;
- **game-icons.net replacing emoji**, with the game taking your team's colours.

Target: **Fri Oct 31.** Pieces merge to `main` as they land; there's no formal ship gate.

**Specs:** [SEASON_MODE](SEASON_MODE.md) · [CARDS](CARDS.md) · [ICONS](ICONS.md) · [story/team-identity](story/team-identity.md)

## How we work through it
**Rule 1: playable before pretty.** Get one ugly solo season running end to end first, then add the box, then polish. Every milestone is something Pax can play on his phone.

**Rule 2: Apex is the critical path.** Every screen waits on Apex's core. Fable time goes only to his chain; everything else runs on Opus or smaller in parallel.

**Rule 3: two Hub chats at most at once.** **Hub-A** builds the Season screens (one after another, since they share files). **Hub-B** does plumbing and cleanup (icons, renames, removals), which rarely touches the same files.

**Rule 4: one fingerprint bump.** The two content changes that move race results (Quick Race on trait cards + the 28 teams) land together in one PR that Pax merges. Nothing else should move the golden fingerprint.

## Milestones
| # | Milestone | Pax can… | Target |
|---|---|---|---|
| **M1** | **Core** | (nothing visible) A whole season runs headless in tests and replays identically | **Mon Oct 13** |
| **M2** | **Playable** | Play a full solo season on his phone: setup → draft → pick racers → watch/skip → standings → champion | **Thu Oct 16** |
| **M3** | **The box** | Open a mystery box every race, equip gear and traits, manage the locker; see his cards | **Tue Oct 21** |
| **M4** | **Identity** | Build his own team (icon + colours), race the 28 new teams, Quick Race on cards (one bump, Pax merges), the screen in his colours | **Fri Oct 24** |
| **M5** | **Clean-up + ship** | Old leagues gone, no emoji left anywhere, hotseat checked, balance read done | **Thu Oct 30** |

## The lanes
**🏎️ Apex (Fable) is the critical path, in order:**
1. Card model + generated base deck · Oct 9
2. Shared-pool genesis · Oct 9
3. Draft engine · Oct 10
4. Season loop · Oct 13 → **M1**
5. Mystery box logic + team locker · Oct 14
6. Quick Race on trait cards **+** the 28 teams, in one PR · Oct 15 (Pax merges)

**🛞 Hub-A (Opus): the Season screens, in order:**
1. League Setup · Oct 13 (needs genesis)
2. Draft board · Oct 14 (needs the draft engine)
3. Paddock screen (pick racers, hotseat hand-off) · Oct 15
4. Race view (watch / skip, rivals dark) + scoring, standings and finale · Oct 16 → **M2**
5. Card sheet + locker · Oct 17
6. Box reveal + targeting · Oct 20 → **M3**
7. Team creator · Oct 22

**🛞 Hub-B (Opus): plumbing and cleanup:**
1. Rename to Rule cards · Oct 9
2. Icon system (registry, GameIcon, TeamLogo, theming tokens, credits) · Oct 10
3. Remove Commissioner leagues · Oct 21 (after League Setup works)
4. Emoji sweep, screen by screen · Oct 27

**🔧 Wrench:** content icon ids · Oct 17 (after the icon map) · the game wears your team colours · Oct 23 → **M4**

**🎤 Pit:** icon map (every non-team emoji) · Oct 10 · keep this doc and Asana current

**📻 Radio + 👤 Pax:** team-creator palette + logo-picker icons · Oct 14

**📈 Telemetry:** Season Mode balance read (titles open? champ bonus at 25 / 50 / 75) · Oct 24

**👤 Pax:** playtest at each milestone · merge the fingerprint PR · approve the icon map

## Kickoff (Fable credits return Thu Oct 9)
**Wed Oct 8, no Fable needed:**
- Hub-B: rename to Rule cards (#330), then the icon system (#350).
- Pit: icon map (#349).
- Radio + Pax: team-creator palette + logo-picker icons.

**Thu Oct 9, Apex in ONE Fable chat** (keeps the context, so it costs fewer credits). Paste the kickoff prompt from the Asana task "Cards: card model + generated Motorsport base deck". Apex works the chain in order, **one PR per issue**, merging each when green. He stops and reports if any existing test changes, or if he's at roughly half his budget.

**As soon as genesis merges:** Hub-A starts League Setup (#317). Draft board follows once the draft engine merges.

**Fri Oct 10 / Mon Oct 13:** Apex continues in the same chat (draft engine → season loop → box logic). If the chat gets long, start a fresh one with the same kickoff prompt; it picks up from Asana and GitHub.

## Risks
- **Apex slips → everything slips.** If the season loop isn't done by Oct 13, Pit moves Hub-A to the card sheet and Hub-B tasks first.
- **Fable limits.** Apex's chain is 6 tasks over 5 working days. If the limit hits, the box logic can drop to Opus with Apex reviewing; the season loop can't.
- **Hub-A is busy:** 7 screens in about 7 working days. If it slips, the team creator and box reveal polish move to a v0.5.x patch, not the core.
- **Hotseat** touches every screen. Each Hub-A screen checks two humans before merging.

## Out of v0.5 (on purpose)
Effect cards and the engine hook · Tracks & Weather v2 · live seasons (wall clock, any device) · CPU Paddock actions · Rule cards in Season Mode · Patron Mode · events and economy. All of these are in v0.6 / Queued / Icebox.

## Decision log (Pax, Oct 8)
Teams 5–10, default 10 · 10-race default · free lineups · bench keeps gear · box: own team only, no expiry, gear swaps go to an uncapped locker with free moves · Iridium replaces Platinum · first box Silver · cars drafted in a fixed last round · team stats belong to the team · champ bonus 50 · hotseat in v0.5 · one save slot · Play again = fresh seed · no Rule cards in Season Mode · watch live with Skip · phone first · rivals show rarity dots only · CPU teams are plain deck teams · Season is the main Play button · mode named "Season" · old 22 teams removed · old leagues removed (live seasons return in v0.6) · game-icons.net everywhere, Phosphor dropped.
