# v0.6 Monza — the plan

*Master plan for the current release. Owner: 🎤 Pit. The work lives in GitHub: milestones `v0.6 · 1 Choices` → `2 The bump` → `3 Ship`, one issue per task, a `crew:` label for the owner, and a Paste line at the top of each issue. The v0.5 record and its full decision log: [V05_PLAN](V05_PLAN.md).*

## What v0.6 is
**Real choices for the team owner.** Pax's playtest (Oct 10): "you kind of always have the best choice"; the only interesting call was which driver gets a card, and qualifying decided a lot but was invisible. Steward's [10/9 Owner Choices Report](https://claude.ai/artifact/SwjizYrejSE8Nvp52A3DWd) turned that into five builds:
- **Pick 1 of 3** from every pack (the first new owner choice).
- **Cards add grade points**, so every metal means the same on every stat.
- **Acceleration doubles as qualifying pace**, with fewer ruined laps; and you can **watch qualifying**.
- **Real-F1 pit rule** (1 stop, change compound) with **tyre life as a share of the race**, hidden tyre luck, and **a wear dial per track**.
- **Gear and traits look different** at a glance.
- **Tags retire** (pulled up from v0.7, Pax, Oct 10): cards become the only system.

## Milestones
| # | Milestone | Pax can… |
|---|---|---|
| **1** | **Choices** (no fingerprint move) | Keep 1 of 3 from a pack, tell gear from traits, watch qualifying fill a timing board |
| **2** | **The bump** (one fingerprint bump, Pax merges) | Race on grade-point cards, a grid that rewards Acceleration, sane pit stops that differ by track |
| **3** | **Ship** | Steward's re-probe says the build is in band; track favours checked; no tags left on any screen |

## The lanes
**🛞 Hub — milestone 1, in order:**
1. Gear vs trait at a glance (#526): one mock-up page first
2. Pick 1 of 3 from a pack (#533): mock-up first; record the pick as a fact
3. Qualifying show (#495): display only; mock-ups first

**🏛️ Steward — before and after the bump:**
1. Measure the per-track wear values (#537, part 1) → Apex builds final numbers
2. Re-probe the bump build (#537, part 2) and the track favours (#362) → "OK to merge"

**🏎️ Apex — milestone 2, ONE PR, Pax merges:**
- Cards add grade points (#335)
- Acceleration as one-lap pace + fewer ruined laps (#496)
- Real-F1 pit rule + tyre life as a share of the race (#534)
- Tyre luck ±10% per set, own seeded stream (#535)
- Per-track wear dial (#536), after Steward's values
- **Retire tags (#334)**: map first; aim for no fingerprint move; if results must move, fold into the bump PR

**🛞 Hub — milestone 3:** retire tags from the screens (#541), after #334

Milestone 1 and 2 run in parallel: Hub's work moves no fingerprint.

## Rules
- **One fingerprint bump** for v0.6 (milestone 2). Nothing else moves race results.
- **Every new random draw gets its own seeded stream** (tyre luck, qualifying), or replays drift.
- **Mock-ups first, one page per decision.** Pax picks; then build.
- **Handoffs in a ```text block** so Pax can copy them on mobile.

## Moved to v0.7 Suzuka (Pax, Oct 10)
Live seasons (#340, #288, #523) · Wet weather (#360, #358) · pit-stop damage (#479) · CPU packs (#478) · build your own team (#346) · driver card (#476) · Quick Race in the Season look (#520) · next owner levers (#538: tyre plan, push-or-bank qualifying, risk-or-safe gear).

## Decision log (Pax, 10/9, [Owner Choices Report](https://claude.ai/artifact/SwjizYrejSE8Nvp52A3DWd))
First owner choice = **pick 1 of 3 from a pack**; other levers wait for a balance check · CPU packs not yet · **cards add grade points: Bronze +5 (1 stat) · Silver +10 (1) · Gold +10 (2) · Iridium +15 (3)** · **qualifying: Acceleration doubles as one-lap pace, ~+1% per step (~2 grid places)**; ruined laps 1 in 5 → ~1 in 12 · **pit rule: real F1**, 1 stop minimum, compound must change · **tyre life is a share of the race**: soft 1/3 · medium ~1/2 · hard 3/5 · end window ~last 13% · **tyre luck ±10% per new set, hidden** · **one wear dial per track** · reports are named "MM/DD <Subject> Report"

**Oct 10 (Pax, via Hub, PR #532):** iridium a notch deeper (`--rarity-iridium` #9479ee, sheen #63bfb1) · iridium traits carry one sheen across the whole card face


**Oct 10 (Pax, [Monza Roadmap](https://claude.ai/artifact/3MxTvzbH62QcwuQd4YgWhS)):** **car and team cards keep helping both drivers** (worth twice a driver card; those slots become the prized picks) · **everything outside owner choices moves to v0.7** · **retire tags pulls up into v0.6** (#334 engine/data/lab, #541 screens) · v0.6 scope locked

**Oct 10 (Pax, via Hub, #533 / PR #543):** keep 1 of 3 works by **"try them on"**: the reveal flips all three, all three come into your hand on the Paddock table, rows glow and grades flash, you place one and the other two go back · turn steps read Open pack · Keep one · Pick 2 · Lock in · ✅ **milestone 1 (Choices) done**
