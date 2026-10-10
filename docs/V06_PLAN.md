# v0.6 Monza — the plan

> **✅ SHIPPED, Oct 10, 2026 (engine v0.6.1, live on playparabolica.com).** All three milestones closed (20 issues).
>
> **What you can play:** pick a pack's card in a strip at the top of the Paddock (gear to the locker, tier-coloured packs), cards that add grade points (the same on every stat; car and team cards help both drivers), gear and traits that look different, a qualifying show with marbles lapping the track (Acceleration now buys grid spots), real-F1 pit stops with tyre life as a share of the race, hidden tyre luck, a wear dial per track (shown as a pill), a cleaner race view (new speed graphic, every tower column at every width), and no tags anywhere.
>
> **Carried into v0.7 Suzuka:** louder, asymmetric cards with 4 archetypes, gear mileage, the new pack offer and curses (#565, #559, design below) · car names (#569, after Radio's #568) · team creator (#346) · driver card (#476) · Quick Race in the Season look (#520) · track favours (#362) · live seasons (#340) · rain (#360) · effects (#332, #333).

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

**🛞 Hub — milestone 3, in order:** v0.6.1 Acceleration fix (#550, moves race results; Pit/Pax merges) · **pack: pick 1 of 3 on the reveal screen; the pick goes to your locker (#552)** · locker fixes: duplicates clickable, tap an equipped card to unequip (#556) · pack backs coloured by tier (#558) · qualifying marbles on the track map (#555) · speed graphic rethink, mock-ups first (#557) · star glyph test fix (#546) · retire tags from the screens (#541) · tyre-wear pill (#547) · republish the preview

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

**Pack pick, final (Pax, Oct 10, PR #576):** tap, then **Keep**, in a strip at the top of the Paddock; no full-screen reveal, no pack animation; the sealed pack and the strip carry the tier colour (#558)

**Oct 10 (Pax, via Hub, #533 / PR #543):** keep 1 of 3 works by **"try them on"**: the reveal flips all three, all three come into your hand on the Paddock table, rows glow and grades flash, you place one and the other two go back · turn steps read Open pack · Keep one · Pick 2 · Lock in · ✅ **milestone 1 (Choices) done** · **then reversed in playtest (Oct 10):** try-on locks in on the first tap and aim-at-a-row is fiddly → pick one on the reveal screen instead (#552)

**Playtest 2 (Pax, Oct 10):** the picked card goes **to your locker** ("ghost your locker"), reassign any time (#552) · locker bugs: duplicate cards unclickable; tap an equipped card → locker pops to unequip (#556) · **pack backs coloured by tier: Common red · Uncommon yellow · Rare green · Legendary purple** (reverses Oct 8's "no colour", #558) · the km/h speed chart is too noisy and doesn't read as speed → Hub mock-ups (#557) · watch the marbles lap the track in qualifying (#555) · **Pit may merge v0.6.1 (#550) once tests pass** · **pack types → Steward + Pax design session** (gear vs trait packs, pick-a-pack Balatro-style, curse packs; #559, v0.7) · **cards stay as they are for v0.6**; next they get **louder and asymmetric** (#565, v0.7, Steward + Pax) · **Radio's naming pass (#370) paused** until then

**✅ The bump is merged (Oct 10): [PR #545](https://github.com/GrizzlyPax/Parabolica/pull/545), v0.6.0.** Pit merged it on Pax's word ("feel free to merge") after 356 tests + tsc passed on the merge with main; Steward re-probes on main (#537), and any tuning is a data-only follow-up. Built by Apex: Closes #335 #496 #534 #535 #536 #334; tags retired inside the one bump (card-free races are byte-identical; default grids move because cards now bake into stats). Apex's calls for Pax to confirm: track + weather favours use grade points too (+10 grade, ~1/3 of the old +10% on driver stats; Steward re-reads on #362) · decrees stay a generic record so old published leagues still parse · in-race effects (Damaged, Spun, Cooked tyres, Sulking, Fired up) stay as timed effects but are no longer digest highlights · rule-card ids kept: `tag-soup` = Trait Soup, `no-tags` = No Traits · wear shows in World Deck only for now (pill: #547)

**Steward's re-probe of v0.6.0 (10/9, [v0.6 Bump Re-probe Report](https://claude.ai/artifact/JzRcEimZkeBihSJkvy5MpU)):** wear values final (the starting set) · last stop with ≤2 laps left 35% → 19% · finishing on short hards 26% → 0% · final set's life used 47% → 67% · stops forced by the rule 12% → 2% · stops per car 1.39 (Speed+Power) → 1.91 (Accel+Pit Crew) · cards Bronze/Silver/Gold/Iridium ≈ 0.19 / 0.38 / 0.76 / 1.7 pts/race, car/team ~2× (as decided) · pole wins 18.5% → 24.5% · **one fix: Acceleration became the strongest stat → `accelEffect` 1.2 → 0.6 (v0.6.1, #550)** · ruined quali laps stay 1 in 12 · **the real-F1 pit rule costs some season variety** (5+ winner seasons 83% → 68%); catch-up between races (CPU packs #478, v0.7) is the lever · **track favours are inert under grade points**; sizing them up doesn't help → **#362 moves to v0.7** as a design call (A widen the gap, Steward's pick · B cosmetic · C drop)

## v0.7 direction (design, not built; Pax, Oct 10)
From Steward's [Pack Types](https://claude.ai/artifact/7sXEiVCHRUtMnAHETKqpUj) and [Card Design](https://claude.ai/artifact/EvKkGDcoSNaWq94aw98Ksz) reports (#559, #565):
- **Cards 3× louder.** **Rarity buys complexity + 4 archetypes** (lean into some things at the cost of others). Steward pitches **deck size and roguelike structure** next.
- **Gear has mileage:** double strength, gone after 3 races. Traits keep normal metal odds.
- **The pack offer:** often pick 1 of 2 packs, sometimes one pack, sometimes a **forced Curse pack** (draft odds 60 / 30 / 10). A pack shows **where** the card goes, not how good it is (metal hidden until opened).
- **Curses:** all bad, forced, on the car or team (both drivers), 3 races; they are **effects** (#333, on the #332 hook). Trade-off "power with a price" cards live in Rare / Legendary packs.
- **CPU packs held back** (#478, icebox): packs are the player's edge on purpose, "you versus that machine"; rivals with cards would hide why you lose.
- **Static cards first**; dynamic cards (traffic, late race, qualifying-only) come later, tied to **Paddock events** (e.g. "pick a deck" vs an interview, #369).
- Weird, specific rule-changer cards wanted. Card names (#370) wait for the final deck.
- **The big shift (Pax, Oct 10): a single-player roguelite.** Win a league to move up a ladder of leagues; lose and restart the run, keeping some permanent unlocks; Balatro-style difficulty scaling; builds where drivers get stranger over a run. Replaces the old "always on in the background" idea. Steward designs the run structure (#589).
- **Descopes:** single-player only, hotseat removed until online multiplayer (#588) · two drivers per team, no bench (#585).
- **Run design approved (Pax, 10/9, [Roguelite Run Report](https://claude.ai/artifact/WRrG18kfrcHPjfRNGGQZ5G), #589):** 4 leagues × 6 races, each ending in a **boss race** · win the league to move up · harder = **rival levels + curses** (packs don't shrink) · difficulty settings like Balatro stakes (Pressure, Tight purse, Works teams, Knockout) · keep the whole team inside a run; between runs unlock content and starting options, never raw power · **no draft: pick 2 level-1 rookies**, race points earn XP, level-ups pick 1 of 3 · **3× cards for the whole run, player only**; driver-led racing · ~60-card base deck, themed decks up the ladder · Knockout = a stake or boss twist; Paddock events replace a pack; decks unlock in a run.
- **Still to design (Steward):** rival levels (#591) · XP + level-ups (#592) · boss twists (#593) · rookie pick (#594) · run debrief (#595) · stakes + unlocks (#596). **Buildable now:** single-player shell (#588), two drivers (#585), race debrief (#581), car names (#569). **Apex:** run + meta saves (#597), after the design.
- **v0.7 first wave shipped (Oct 10, engine v0.6.2, preview v87):** single-player Season (#588) · two drivers, no bench (#585) · race debrief on the finish sheet (#581: **facts only**, grid → finish, stops and tyres, up to 3 moments, one line on the winner; no "because of X" judgments, Pax) · qualifying pass (#599–#601: real-time 1×, steps 1× → 2× → 10×, the next car leaves when the one ahead clears sector 1) · **Quick Race = one tap** (#605–#607: a one-race Season league, random track + weather; follow a team from the qualifying board; rivals not sealed in Quick Race; Run Setup lives in Race Control) · new car names on their own stream (#569). Pit merged #602 → #603 → #609 after 370 tests + tsc passed on main.
- **v0.7 second wave (Oct 10, engine v0.6.3, preview v89):** driver names mostly American, 80/20 US / international per half, fewer silly names (#615) · the timing tower's Pace column is gone, nothing replaces it (#616) · the qualifying board **is** the race timing tower (shared columns + rows, #617; the race tower's look wins) · km/h readout closed (#285) · follow-up: accented driver codes (#621).

