# Season Mode — v0.5 "Spa" build spec

*The build cut for v0.5. Source: Dev's design artifact (Fantasy Design, "v0.5 · Spa" tab), with the design reasoning in [#305 fantasy modes](https://github.com/GrizzlyPax/Parabolica/pull/305) and [#303 mystery box](https://github.com/GrizzlyPax/Parabolica/pull/303). Where this doc and Pax disagree, Pax wins; tell Pit.*

## TL;DR
- **Season Mode replaces Commissioner founding + wall-clock settle** as the way you play a season. Quick Race and Race Control are untouched.
- It's a **Team-Mode auto-battler**: League Setup → snake **draft** (all teams, AI simmed) → **[Paddock turn → Race] × calendar** → champion.
- **Local and session-based:** you advance it yourself, no wall clock. Several humans = **hotseat**.
- **Deterministic throughout:** every Paddock action is a fact locked before the race.

## Flow
```
LEAGUE SETUP ─▶ DRAFT ─▶ [ PADDOCK turn ─▶ RACE ] × calendar ─▶ FINALE
 (new page)    (all teams,   (your 2 decisions)  (engine, holds   (champion)
               AI simmed)                          for "Go")
```

## 1. League Setup (new front door)
One page with defaults, so a solo player can hit Start immediately.

| Setting | Default | Notes |
|---|---|---|
| League name | generated | Editable; flavour only |
| Universe seed | random | Enter or reroll; generates the driver + car pool and track character |
| Teams | 10 | **5–10** (Pax). **Drivers = teams × 3, cars = teams** |
| Player-controlled | 1 | Each human names and colours their team. >1 = local hotseat |
| CPU teams | auto | = teams − humans; generated identities; dumb AI |
| Calendar | random, ~16 | Random from the pool or hand-picked; reuses existing tracks |

Fixed (not settings): squad 3 / race 2 / bench 1 · car rack = team count · reverse-standings Paddock order · points championship, no elimination · one draft opacity for everyone.

## 2. Genesis changes shape
Instead of 2 drivers pre-assigned to each named team, the seed summons a **shared pool**: teams × 3 drivers + a rack of `teams` cars. The draft distributes the pool. Team identities are human-named or CPU-generated.

## 3. Draft
- One **snake draft for all teams**, interleaved by pick order; AI picks are simmed alongside the humans.
- Each team takes **3 drivers + 1 car**. Scarcity makes draft order matter.
- **AI heuristic is dumb:** take the highest tier available, fill the car. Opening order is seeded.
- **Quick Draft:** "sim the whole draft", auto-picking for humans too. Manual is the default.
- **Board opacity (decided):** the driver's name, a 🟢/🟡/🔴 read across core stats (no numbers), and sealed rarity dots for rolled tags (severity only, never which tag). Cars get the same RYG read. **Rivals stay dark:** you only see detail on your own picks.

## 4. The Paddock (before every race)
- Turn-based, in **reverse-standings order** (last place goes first; the opening order is seeded).
- **CPU turns are no-ops in v0.5:** build the framework and per-team hook only. CPU actions come later with no rework.
- Each human's turn has **two decisions**:
  1. **Pick who races:** 2 of your 3 start, and the 3rd is benched.
  2. **Apply your mystery box:** the box has a **metal** (severity, set by standing: Bronze leader → Platinum last) and a **slot** (driver / car / team). Open it (a loot-box reveal), then choose the recipient (any driver, car or team, yours or a rival's).
- Box rules: dealt every race · **the box has no expiry: how long a reward lasts belongs to the tag itself** (Pax). Some rewards are equipment, some are permanent traits; that split comes from the tag revamp. Until a tag declares a duration, box tags are permanent · cap 4 tags, replacing the weakest · it's an `attach-tag` intervention, so no new physics.
- Metal odds (C/U/R/L, illustrative): Bronze 60/30/9/1 · Silver 52/32/13/3 · Gold 43/34/18/5 · Platinum 35/35/22/8.

## 5. Race & standings
- The **existing engine** races the drafted drivers, cars and tags, with no new physics. Each race **holds for "Go"**, then you **watch live or skip to the result**.
- **Score:** constructor points (your 2 racers combined) plus a **drivers'-champion bonus**. Pax wants it worth *more* than one race win; Telemetry sets the number from seeded seasons. A finale crowns the champion.
- **The in-race UI hides rivals' detailed stats**, matching the draft opacity.

## 6. Look & feel
- **The game wears your team's primary colour** in a few key places (a bar or background block). This doubles as the hotseat "whose turn is it" cue.
- **The mystery box reveal is an over-the-top loot-box moment** that escalates with the metal: Bronze is a quick pop, Platinum a full build-up.

## Out of scope (hooks only)
Patron Mode · CPU Paddock actions · free agents / transfers · events · spend economy · online / wall-clock / accounts · views-followers metric · cosmetic/story tag content.

## Decided (Pax, Oct 8)
- **Box expiry:** none on the box; duration lives on the tag/reward (equipment vs permanent traits, from the tag revamp).
- **Lineups:** free choice of your 2 racers every race.
- **Drivers'-champ bonus:** worth more than one race win; Telemetry proposes the exact value.
- **Grid size:** 5–10 teams, default 10.

## Done when
League Setup → draft against simmed AI → a session of Paddock + race cycles across the calendar → standings to a champion. Solo first; hotseat if humans > 1. Deterministic and replayable throughout.
