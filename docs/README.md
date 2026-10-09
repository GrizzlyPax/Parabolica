# Parabolica docs

Parabolica is an F1-style race sim: draft a team, race a Season, chase two championships. Play it at **[playparabolica.com](https://playparabolica.com)**.

**New here? Read in this order:** [the latest handoff](HANDOFF_2026-10-08.md) → [`CLAUDE.md`](../CLAUDE.md) → the doc for the area you're touching.

## Start here
| Doc | What it's for |
|---|---|
| [V05_PLAN](V05_PLAN.md) | **The v0.5 Spa plan:** milestones, lanes, order, risks, decision log |
| [HANDOFF_2026-10-08](HANDOFF_2026-10-08.md) | Oct 8: GitHub-only planning, the crew, the Almanac look, icons, metals, numbers, what's next |
| [HANDOFF_2026-10-07](HANDOFF_2026-10-07.md) | What shipped Oct 5–7, how the pieces fit, traps, open work |
| [GLOSSARY](GLOSSARY.md) | Every team, track, tag, card, rule, weather and flavour pool (**generated**: `npm run glossary`) |

## Game systems
| Doc | What it's for |
|---|---|
| [SIM_MECHANICS](SIM_MECHANICS.md) | The stat truth: formulas, magnitudes, rebalance history |
| [CARDS](CARDS.md) | **Cards revamp:** tags become gear / traits / effects; the Motorsport base deck |
| [TAG_SYSTEM](TAG_SYSTEM.md) | Tags (being replaced by Cards): five sources, magnitude ladder, acquisition engine |
| [TRACKS_WEATHER](TRACKS_WEATHER.md) | 6 stat-combo tracks + dry weathers (**v0.5**); lap-by-lap Wet + wet tyre (**v0.6**) |
| [CONDITIONS_LAYER](CONDITIONS_LAYER.md) | Track tags + weather (being replaced by Tracks & Weather v2) |
| [SEASON_MODE](SEASON_MODE.md) | **v0.5 Spa build spec:** League Setup, draft, Paddock loop |
| [FUN_CHECK](FUN_CHECK.md) | **Is a season fun?** Six signals with probe targets, playtest look-fors, red flags |
| [BALANCE_REPORT_2026-10-09](BALANCE_REPORT_2026-10-09.html) | **Steward's balance report (Oct 9):** stat parity, tracks & weather, how Season titles are decided; findings only ([published copy](https://claude.ai/artifact/MC5fwYaqd6KJD8Gk9q8E94)) |
| [BALANCE_DIALS_2026-10-09](BALANCE_DIALS_2026-10-09.html) | **Steward: raw-stat balance philosophy:** king stat vs emperor, stat balance vs competitive balance, the three dials ([published copy](https://claude.ai/artifact/SBycLd28QF1vfPtihJLWmd)) |
| [BALANCE_PASS_ONE_2026-10-09](BALANCE_PASS_ONE_2026-10-09.html) | **Steward: recommended balance pass (draft 2):** 23 existing dials tuned to Pax's Oct 9 calls, measured; the dial sheet ([published copy](https://claude.ai/artifact/3E8HBPYh8sz4F9zSHwuwML)) |
| [FANTASY](FANTASY.md) | Fantasy teams: snake draft, obfuscated draft info, scoring |
| [ICONS](ICONS.md) | **Design change:** game-icons.net replaces every emoji; icons + UI take your team's colours |
| [PROCEDURAL_IDENTITY](PROCEDURAL_IDENTITY.md) | Generated driver names, league names, team identity |

## Leagues & online
*History / north star: Commissioner leagues (founding, the league screen, open by code, gods) were removed from the game in #339; Season Mode replaces them. The engine pieces (`createLeague`, `prepareScheduledRace`, `settle.ts`, `remote.ts`, `server/`) stay, and "live" (wall clock, watch from any device) comes back for Season Mode in v0.6.*

| Doc | What it's for |
|---|---|
| [COMMISSIONER_MODE](COMMISSIONER_MODE.md) | History / north star: wall-clock roguelite seasons, decrees |
| [COMMISSIONER_MODE_TECH](COMMISSIONER_MODE_TECH.md) | History: seeded RNG, persistence, settle loop (the engine half is still live) |
| [LEAGUE_SERVER](LEAGUE_SERVER.md) | One league, every device: facts, decrees, digests (the server stays for v0.6 live seasons) |

## Lab & balance
| Doc | What it's for |
|---|---|
| [RACE_CONTROL](RACE_CONTROL.md) | The lab: parity rule, fingerprints, tag calibration bands |
| [BALANCE_HANDOFF](BALANCE_HANDOFF.md) | Data exports, tuning surface, balance workflow |
| [BALANCE_RECOMMENDATION](BALANCE_RECOMMENDATION.md) | June 2026 umbrella balance plan (shipped as Canon v3) |
| [BALANCE_DOMINANCE_PASS](BALANCE_DOMINANCE_PASS.md) | June 2026 season-dominance pass (shipped) |

## Content & story
| Doc | What it's for |
|---|---|
| [WORLD_DECK](WORLD_DECK.md) | How to add teams, tracks, names, tags, cards, weather, commentary |
| [STORY_WORKSTREAM](STORY_WORKSTREAM.md) | Orientation for anyone working on story and flavour |
| [STORY_BIBLE](STORY_BIBLE.md) | Pax's theme and voice bible. Canon lives here |
| [story/](story/README.md) | Brainstorms and notes (**not canon**) |

## Architecture & history
| Doc | What it's for |
|---|---|
| [ARCHITECTURE_REVIEW](ARCHITECTURE_REVIEW.md) | Refactor roadmap: seeded RNG, persistence, engine split |
| [GAME_DESIGN_PASS](GAME_DESIGN_PASS.md) | Early live-race design roadmap (betting parts are retired) |

---
*Keeping this current: any PR that adds, renames or retires a doc updates this index and the Docs list in `CLAUDE.md`. Where a doc and the code disagree, the code wins. Fix the doc.*
