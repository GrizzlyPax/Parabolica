# v0.7 Suzuka — the plan

*Master plan for the current release. Owner: 🎤 Pit. The work lives in GitHub: milestones `v0.7 · 1 Run core` → `2 Run screens` → `3 Ship`, one issue per task, a `crew:` label for the owner, and a Paste line at the top of each issue. v0.6's record, its decision log and the full v0.7 direction: [V06_PLAN](V06_PLAN.md). Roadmap page: [Suzuka Roadmap](https://claude.ai/artifact/KqtZyQjwMaHcC9TNNKuV8F).*

## What v0.7 is
**Parabolica becomes a single-player roguelite run.** You start in the Juniors with two rookies, race **4 leagues × 6 races**, and **win each league to move up**; each league ends in a **boss race** against your **nemesis** (last league's runner-up, promoted with you). Lose and the run ends; you keep **unlocks** (content and starting options, never raw power). Cards are **3× louder and yours alone**; gear has **mileage**; packs offer **choices and the odd forced curse**. A normal run is won **about 1 in 3**. Touchstones: Balatro, Slay the Spire.

Already live from v0.7's first two waves (engine v0.6.3): single-player Season, two drivers, one-tap Quick Race, race debrief, real-pace qualifying on one shared tower, new car and driver names.

## Milestones
| # | Milestone | Pax can… |
|---|---|---|
| **1** | **Run core** (Apex builds, Steward designs) | (mostly under the hood) a run that climbs leagues, carries your team up, faces a nemesis, and runs on 3× cards, gear mileage and curses |
| **2** | **Run screens** (Hub) | See the run: the league ladder, your team, the nemesis, level-ups and rookie picks as their designs land |
| **3** | **Ship** | Play a full run; Steward's re-probe says it's in band |

## The lanes
**🏎️ Apex — milestone 1, in order (one PR each; Pit tests and merges):**
1. ✅ Run core: the league ladder, promotion, run + meta saves (#597, PR #633)
2. ✅ Rival levels + the nemesis (#626, PR #637; engine v0.7.0)
3. ✅ Timed effects engine (#332, PR #642)
4. ✅ Cards + packs for the run: 3×, gear mileage, the pack offer, curses (#627, PR #644; v0.7.1)
5. ✅ The lab races the Season pool (#612, PR #645)
6. ✅ Driver XP, ranks and the rank-up pick (#646, PR #651; v0.7.2) · next: packs lean to your plan (#647, after #565), the rookie pick (after #594), boss twists (after #593), Legend signatures (#653)

**🏛️ Steward — milestone 1 design, in order:**
1. Driver XP + level-ups (#592) **and** stat levels replacing letter grades (#623), one page: what a "level" means
2. The ~60-card deck list with archetype tags (#565)
3. The rookie pick (#594) → boss twists (#593) → the run debrief (#595) → stakes + unlocks (#596)

**🛞 Hub — milestone 2:**
1. Accented driver codes (#621)
2. Build your own team as the run's start (#346)
3. The league ladder screen (#628), after #597
4. Then screens as designs land: stat levels (#623), level-up pick (#592), rookie pick (#594), run debrief (#595)

- **Oct 10:** Pit merged #633 → #637 (rebased #637 onto main after the squash) once 388 tests + tsc passed; preview v91. A league is won by finishing **P1 in the Constructors'**; league 0 is exactly today's Season; rival shifts apply at race build (never to your team; stars floored at 0.5★), so the draft board shows true rolls.

- **Oct 10, levels and XP (Pax, via Steward, [Levels and XP Report](https://claude.ai/artifact/WokZK6U7XXFRR9sAW7uLK4)):** **stat levels 1–20** (5 grade points a level; past 20 shows purple, replacing S; red 1–6 · yellow 7–11 · green 12–20 · purple 21+; display only) · card text in levels: Bronze +3 · Silver +6 · Gold +6/+6 · Iridium +9 ×3 · curse −6 · **one vocabulary: stats have levels, drivers have ranks (Rookie, Pro, Ace, Legend), leagues are tiers** · rival ranks are labels by tier (the nemesis one rank ahead) · **XP = championship points only** (Pro 100 · Ace 220 · Legend 400); the number two is the sidekick by design · **a rank-up deals 3, pick 1:** a stat jump, a trait from your main archetype (Brawler, Glass Cannon, Qualifier, Tyre Saver) or a wild card, sized Pro = Silver, Ace = Gold, Legend = Iridium or a signature · builds: #623 (Hub), #646 (Apex), #647 (packs lean, after #565).
- **Apex's stack built (Oct 10):** #642 timed effects · #644 cards + packs (3×, gear mileage, the pack offer, curses) · #645 the lab on the Season pool (versions 0.7.0 → 0.7.1); merged by Pit Oct 10 (397 tests + tsc green on main; each rebased onto main in turn; preview v92). Apex's calls for Pax: genesis traits stay 1×, only dealt cards are 3× (gear 6×); curses −30 points (= −6 levels); carried gear keeps its mileage; the run honours League Setup's race count (default 6).

- **Oct 10 (Apex, #646; Pax to confirm):** a rank reached in a league's last race is taken in the next league's first Paddock · held wild cards are never dealt again · Home Hero's track is drawn on the rank-up stream · Grudge Match fires only in a run's boss race · Mentor's 25% is of the teammate's earned XP. Pit merged #651 (411 tests + tsc green; a docs-only RUN.md conflict resolved keeping both sections); Hub's ladder (#628) and nemesis voice (#635) are live; preview v93.

**📻 Radio — milestone 2:** ✅ the nemesis's voice (#624) · **🛞 Hub** builds it (#635) after #626

**🏛️ Steward — milestone 3:** re-probe a full run on the build (#629)

## Rules
- **Pit tests and merges** anything that moves race results or saves (one version bump per PR; `npm test` + `tsc` on the merge with main).
- **Every new random draw gets its own seeded stream.**
- **Mock-ups first, one page per decision; handoffs in a ```text block.**
- **Spotter sweep** at every planning step.

## Decision log
The run's decisions (Oct 9–10: run shape, rival levels + nemesis, cards and packs, single-player, two drivers) are logged in [V06_PLAN → v0.7 direction](V06_PLAN.md). New ones go here.
- **Oct 10:** Apex builds the run core (#597, #626, #332, #627, #612); Hub builds the screens on top; v0.7 split into Run core → Run screens → Ship.
- **Oct 10, the nemesis's voice (Pax, via Radio, #624, [docs/story/nemesis.md](story/nemesis.md)):** a Pokémon-style rival (snot-nosed, a little attitude, gloves on) · it talks **in the Paddock, one line per visit** (race feed maybe later, team radio eventually) · a **NEMESIS tag** on the rival team in standings, the tower and the Paddock · each of its two drivers rolls **one of five personalities** (the Brat, the Show-off, the Old Hand, a Spanish speaker, a "Hmph." brooder) · when the nemesis ends your run, the debrief opens with a **newspaper headline** ("The Paddock Almanac · Run over") · build: #635 (Hub, after #626).
- **Oct 10 (Pax, via Hub):** team creator on one page, default build-your-own, "Or race as a deck team" (#346, PR #632) · the league ladder layout = 4 stacked leagues, your league open with 6 race squares (gold = boss), you vs the nemesis, won leagues keep a one-line memory, an unlocks strip (#628, [mock-up](https://claude.ai/artifact/WtpDV8xJG7PbYk4WAZrDKv)) · accented driver codes fold to base letters (#621) · Pit: Radio's ink table wins over `inkFor()` (#639).
