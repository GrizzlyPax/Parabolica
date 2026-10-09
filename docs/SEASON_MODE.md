# Season Mode — v0.5 "Spa" build spec

*The build cut for v0.5. Source: Dev's design artifact (Fantasy Design, "v0.5 · Spa" tab), with the design reasoning in [#305 fantasy modes](https://github.com/GrizzlyPax/Parabolica/pull/305) and [#303 mystery box (now card packs)](https://github.com/GrizzlyPax/Parabolica/pull/303). Where this doc and Pax disagree, Pax wins; tell Pit.*

## TL;DR
- **Season Mode replaces Commissioner leagues entirely** (Pax, Oct 8): founding, the wall-clock league screens and open-by-code are removed in v0.5. **Live seasons** (wall clock, any device) return for Season Mode in v0.6. Quick Race and Race Control stay.
- It's a **Team-Mode auto-battler**: League Setup → snake **draft** (all teams, AI simmed) → **[Paddock turn → Race] × calendar** → champion.
- **Local and session-based:** you advance it yourself, no wall clock. **Single-player** (#588, Oct 10): one human against the CPU teams; hotseat was removed until real online multiplayer.
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
| Player-controlled | 1 | You (single-player since #588; hotseat removed) |
| CPU teams | auto | = teams − humans; deck teams (e.g. For Rory) with a CPU badge; dumb AI |
| Calendar | random, 10 races (from the 6 stat-combo tracks, so tracks repeat) | Random from the pool or hand-picked; reuses existing tracks |

Fixed (not settings): squad 2, both race (no bench since #585) · car rack = team count · reverse-standings Paddock order · points championship, no elimination · one draft opacity for everyone.

## 2. Genesis changes shape
**Racing numbers:** every driver rolls a number 2–99, unique on the grid, kept forever, weighted like F1 (single digits almost always taken, doubles like 44 favoured, high numbers rare; #1 reserved). Marbles show the number, so teammates sharing a colour stay distinguishable.
Team stats (tyre management, pit crew) belong to the **competitor team**; a rack car is car stats only (Pax, Oct 8).
Instead of 2 drivers pre-assigned to each named team, the seed summons a **shared pool**: teams × 2 drivers + a rack of `teams` cars. The draft distributes the pool. Team identities are human-named or CPU-generated.

## 3. Draft
- One **snake draft for all teams**, interleaved by pick order; AI picks are simmed alongside the humans.
- Each team takes **2 drivers + 1 car**: rounds 1–2 drivers, **round 3 cars** (snake continues; 3 drivers until #585). Scarcity makes draft order matter. The draft itself goes in v0.7 (#594).
- **AI heuristic is dumb:** take the highest tier available, fill the car. Opening order is seeded.
- **Quick Draft:** "sim the whole draft", auto-picking for humans too. Manual is the default.
- **Board opacity (decided):** the driver's name, a 🟢/🟡/🔴 read across core stats (no numbers), and sealed rarity dots for rolled tags (severity only, never which tag). Cars get the same RYG read. **Rivals stay dark:** you only see detail on your own picks.

## 4. The Paddock (before every race)
- Turn-based, in **reverse-standings order** (last place goes first; the opening order is seeded).
- **CPU turns are no-ops in v0.5:** build the framework and per-team hook only. CPU actions come later with no rework.
- Your turn is **Open pack → Lock in**. Both your drivers race every round (#585: the lineup step and the bench are gone).
  - **Open your card pack:** its **tier** is set by standing (**Common** pack for the leader → Uncommon → Rare → **Legendary** for last place; no colour). It deals **three cards** of that tier (each a **gear card**, or about **1 in 4** times a **trait card**, from the 🏁 Motorsport deck, [docs/CARDS.md](CARDS.md)); **you keep one** (v0.6, #533). It **opens in place in a strip at the top of Paddock → Team** (bordered in the pack's tier colour; v0.6, #552 / PR #576): three small cards flip, tap one to lift it, then **Keep** (tap again for its full face). **Gear goes to your locker**; a trait asks once who gets it. **Later** closes the strip with the pack still sealed. The other two go back. The fact records all three dealt (in deal order) and the one kept. Gear into a full slot **swaps**; the old card goes to your **team locker**.
- **Gear management:** in any Paddock you can equip from the locker, move equipment between your two drivers, or unequip to the locker. Free, unlimited.
- Pack rules: dealt every race · gear lasts until swapped, traits are permanent · teams start each season with no gear and 1 slot of each kind (fixed in v0.5).
- **Your Paddock turn ends** when the pack is opened and you tap **Lock in**. CPU turns are no-ops.
- **Card rarity is a metal: Bronze · Silver · Gold · Iridium** (Pax, Oct 8). Pack odds for the card's metal (B/S/G/I, illustrative): Common pack 60/30/9/1 · Uncommon 52/32/13/3 · Rare 43/34/18/5 · Legendary 35/35/22/8. **The first pack is Uncommon** for everyone.

## 5. Race & standings
- The **existing engine** races the drafted drivers, cars and tags, with no new physics. Each race **holds for "Go"**, then you **watch live or skip to the result**.
- **Score:** two championships, like F1 (Pax, Oct 9, #509): **Constructors'** = your 2 racers' points combined; **Drivers'** = each driver's own. No bonus. A finale crowns both champions.
- **The in-race UI hides rivals' detailed stats**, matching the draft opacity.

## 6. Look & feel
- **The game wears your team's colour:** the UI is black + white, and your team's primary is the only accent (see docs/ICONS.md → colour system). (It used to double as the hotseat turn cue; hotseat is gone since #588.)
- **The card pack reveal is an over-the-top pack-opening moment** that escalates with the pack tier: a Common pack is a quick pop, a Legendary pack a full build-up.

## Decided (Pax, Oct 8, round 2)
- ~~Hotseat ships in v0.5~~: removed in #588 (Oct 10). Season Mode is single-player; hotseat saves are archived (they don't load).
- **One save slot:** a new season overwrites the old one (asks first).
- ~~Drivers'-champion bonus = 50 points~~ retired (#509): it flipped the title in 28% of seasons after v0.5.1.
- **After the finale:** "Play again" = League Setup with a fresh seed and draft. No carry-over in v0.5.
- **No Rule cards** in Season Mode v0.5 (default ruleset).
- **Race view:** Go opens the live broadcast; Skip to result is always one tap away.
- **Phone first:** every Season Mode screen is designed and tested at phone width; desktop must still work.
- **Name:** the mode is called **Season** ("Play a Season").
- **Your team:** pick a pre-made deck team, or build your own: logo picker, **one primary colour**, name ([#346](https://github.com/GrizzlyPax/Parabolica/issues/346)).
- **Shipping:** no formal gate. Pieces merge to main as they land, since nobody else is on prod yet.
- ~~Bench: the 3rd driver sits out~~: gone in #585 (Oct 10). Two drivers, both race; 3-driver saves are archived (save schema 2).
- **CPU teams** are deck teams (e.g. For Rory) with a CPU badge: no persona, no owner name.
- **Menu:** Season Mode is the main Play button.
- **Rival cards:** rarity dots only.
- **Draft board:** no AI-pick animation; taken drivers and cars are **faded out** and AI picks resolve instantly.

## Out of scope (hooks only)
Effect cards from the sim (v0.6) · Patron Mode · CPU Paddock actions · free agents / transfers · events · spend economy · online / wall-clock / accounts · views-followers metric · cosmetic/story tag content.

## Decided (Pax, Oct 8)
- **Pack expiry:** none on the pack. Gear lasts until swapped, traits forever (Cards revamp, docs/CARDS.md).
- ~~Lineups: free choice of your 2 racers~~: gone with the bench (#585).
- **Drivers'-champ bonus:** worth more than one race win; Telemetry proposes the exact value.
- **Grid size:** 5–10 teams, default 10.

## Done when
League Setup → draft against simmed AI → a session of Paddock + race cycles across the calendar → standings to a champion. Single-player (#588). Deterministic and replayable throughout.
