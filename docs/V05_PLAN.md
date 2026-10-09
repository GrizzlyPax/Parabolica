# v0.5 Spa — the plan

*Master plan for the current release. Owner: 🎤 Pit. The work lives in GitHub: [milestones](https://github.com/GrizzlyPax/Parabolica/milestones) `v0.5 · 1 Core` → `5 Ship`, one issue per task, a `crew:` label for the owner, and a Paste line at the top of each issue.*

## What v0.5 is
**Season Mode:** set up a league, snake-draft against the AI, then play **Paddock → Race** turns to a champion. It's local and hotseat, and it replaces the old Commissioner leagues. It ships with:
- **gear and trait cards** (the first half of the Cards revamp);
- **the 28 new teams**;
- **game-icons.net replacing emoji**, with the game taking your team's colours.

**No dates: sequence.** GitHub milestones `v0.5 · 1 Core` → `5 Ship`, worked in order; inside each, every issue's "Depends on" line shows what's unblocked. Pieces merge to `main` as they land; there's no formal ship gate.

**Specs:** [SEASON_MODE](SEASON_MODE.md) · [CARDS](CARDS.md) · [ICONS](ICONS.md) · [story/team-identity](story/team-identity.md)

## How we work through it
**Rule 1: playable before pretty.** Get one ugly solo season running end to end first, then add the pack, then polish. Every milestone is something Pax can play on his phone.

**Rule 2: Apex is the critical path.** Every screen waits on Apex's core. Fable time goes only to his chain; everything else runs on Opus in parallel.

**Rule 3: one Hub chat, one queue.** Hub works the list below top to bottom, one PR per issue. (The two-Hub split was dropped on Oct 8: Pax runs one Hub thread.)

**Rule 4: one fingerprint bump.** The two content changes that move race results (Quick Race on trait cards + the 28 teams) land together in one PR that Pax merges. Nothing else should move the golden fingerprint. *(Used by #438. **Pax, Oct 9: a second and last v0.5 bump** = one PR with Balance Pass One + the Speed nudge (#481) and names on their own seed stream (#467). Pax merges.)*

## Milestones
| # | Milestone | Pax can… |
|---|---|---|
| **M1** | **Core** | (nothing visible) A whole season runs headless in tests and replays identically |
| **M2** | **Playable** | Play a full solo season on his phone: setup → draft → pick racers → watch/skip → standings → champion |
| **M3** | **The box** | Open a card pack every race, equip gear and traits, manage the locker; see his cards |
| **M4** | **Identity** | Build his own team (icon + colours), race the 28 new teams, Quick Race on cards (one bump, Pax merges), the screen in his colours |
| **M5** | **Clean-up + ship** | Old leagues gone, no emoji left anywhere, hotseat checked, balance read done |

**Playtest 1 (Oct 8):** the loop works; the Paddock reads badly (oversized on desktop, no driver stats, one driver at a time). Fixes go in **before** the pack reveal, so #320 isn't built twice: #451, #452, then #453 in M4.

**Status (Oct 9, late):** ✅ **v0.5.1 merged** (#503): Balance Pass One + Speed nudge + names on their own stream. Steward's re-measure: within noise (Speed 25% / Power 18%; favourite wins 58% of titles, was 74%). M4 left: #489, #361 (Run Setup), #453. M5 left: Hub clean-up + two championships (#509) + the Race Control pace-check fix (#507); Steward's Tracks & Weather re-probe (#362).

**Status (Oct 9):** ✅ **M1, M2, M3 done** (a full season with pack reveals). 🏛️ Steward's three balance reads are in ([Balance Report](BALANCE_REPORT_2026-10-09.html)): findings only; **Pax + Steward talk the options, then Steward writes the recommended passes, then Pit writes build issues.** Hub is on M4.

**Status (Oct 8, evening):** ✅ **M1 done.** ✅ **M2 done: a full season is playable** (Menu → Play a Season). ✅ The race-changing bundle (#438, v0.5.0) is merged. **Apex's v0.5 chain is complete**; Fable's next work is v0.6. Now: Hub on M3 (packs); Steward on the balance reads; Radio on weather card names.

## The lanes
**🏎️ Apex (Fable) is the critical path, in order:** ✅ all done (Oct 8)
1. Shared-pool genesis (#313), using Hub's card model
2. Draft engine (#314)
3. Season loop (#315) → **M1**
4. Card pack logic + team locker (#316)
5. One PR, merged by Pax: Quick Race on trait cards (#337) **+** grid swap to the 28 teams (#356) **+** race colours (#381) **+** Tracks & Weather v2 dry swap (#359)

**🛞 Hub (Opus) first, to clear Apex's path (no sim changes):** ✅ all done
1. Base-deck teams as data + World Deck display (#402)
2. Card model + generated Motorsport base deck (#329): Apex starts after this merges
2b. Tracks + weather as data + World Deck display (#408)
3. World Deck + Race Control show the card deck (#403)
4. Rarity becomes metals (#385)

**🛞 Hub (Opus): what's left, in order** (League Setup ✅, Rule cards rename ✅, icon system ✅)
1. ✅ Republish the preview (v65, then v66 with M2)
2. ✅ Pick your team (#440, PR #444)
3. ✅ Draft board (#318, PR #445)
4. ✅ Paddock screen (#319, PR #446): includes a plain pack step
5. ✅ Race view (#322, PR #447): watch / skip, rivals dark
6. ✅ Scoring, standings + champion finale (#321, PR #448) → **M2 ✅**
7. ✅ Race view playtest fixes (#451, PR #455)
8. ✅ Packs rename + pack icon (#421, PR #456)
9. ✅ Paddock redesign (#452, PR #458): roster table + letter grades, picked live with Pax
10. ✅ Pack opening reveal (#320) → **M3 ✅**
11. **Car vehicles + driver portraits (#489)**: next (Pax, Oct 9)
12. ✅ **The balance bump** (#481 + #467 → PR #503, v0.5.1)
12b. Race Control pace check reads live `simVars` (#507)
12c. **Two championships, no bonus** (#509): Drivers' + Constructors', finale mock-up first
13. The rest of favoured stats (#361): Run Setup only (race header done in #500)
14. The rest of roster tables (#453): Draft, finale, Setup, World Deck → **M4**
15. Race-view emoji become game-icons (#397)
16. Hide the Reset button in Season races (#449)
17. Weather rule cards: rename to Pax's one-word names (#473), strings only
18. Remove Commissioner leagues, gods and league routes (#339) → **M5**

*Moved to v0.6 (Pax, Oct 9): team creator, build your own (#346).*

**🎤 Pit:** keep this doc and the milestones current

**📻 Radio + 👤 Pax:** team-creator palette + logo-picker icons · icon map for everything else (#349)

**🏛️ Steward:** Season Mode balance + fun read (titles open? champ bonus at 25 / 50 / 75? is a season fun?)

**👤 Pax:** playtest at each milestone · merge the fingerprint PR · approve the icon map

## Kickoff
**Now, no Fable needed:** Hub (works the queue above) · Radio + Pax (palette, logo icons, icon map).

**When Fable credits are back:** paste the Apex kickoff (from Pit) into one Fable chat. Apex works his chain in order (one PR per issue, merging each when green) and stops to report if an existing test changes, something is unclear, or he's about half through his budget. If the chat gets long, start a fresh one with the same block; it picks up from GitHub.

**Apex's chain is done**, so every Hub screen has its engine behind it.

## Risks
- **Apex slips → everything slips.** If the season loop stalls, Pit moves Hub to the non-Season tasks first.
- **Fable limits.** Apex's chain is 6 tasks. If the limit hits, the pack logic can drop to Opus with Apex reviewing; the season loop can't.
- **Hub is busy:** one chat; see the list above. If it slips, the team creator and pack reveal polish move to a v0.5.x patch, not the core.
- **Hotseat** touches every screen. Each Season screen checks two humans before merging.

## Out of v0.5 (on purpose)
Effect cards and the engine hook · Wet weather + forecast · live seasons (wall clock, any device) · CPU Paddock actions · Rule cards in Season Mode · Patron Mode · events and economy. All of these are in v0.6 / Queued / Icebox.

## Decision log (Pax, Oct 8)
Teams 5–10, default 10 · 10-race default · free lineups · bench keeps gear · pack: own team only, no expiry, gear swaps go to an uncapped locker with free moves · cars drafted in a fixed last round · team stats belong to the team · champ bonus 50 · hotseat in v0.5 · one save slot · Play again = fresh seed · no Rule cards in Season Mode · watch live with Skip · phone first · rivals show rarity dots only · CPU teams are plain deck teams · Season is the main Play button · mode named "Season" · old 22 teams removed · old leagues removed (live seasons return in v0.6) · game-icons.net everywhere, Phosphor dropped · UI is black + white + your team colour (Blaseball touchstone), teams have one colour · racing numbers 2–99, weighted to single digits + doubles, shown on marbles. · **the look = Almanac** (docs/ICONS.md → The look) · **dry Tracks & Weather v2 in v0.5** (6 stat-combo tracks, Neutral + 5 dry weathers at +10% favours, old tracks/weather/events retired, weather rule cards remapped; **no rain until v0.6**) · **gods retire** with Commissioner leagues · **Credits** on their own screen (menu footer) · **World Deck pattern:** new content on top, old in collapsed "(retiring)" groups until each sim swap · **racing-number weight for single digits = 20** (12 left ~81% of grids missing one) · **slot traits cut from v0.5** (1 slot per driver/car/team; back in v0.6) · **a Paddock turn = lineup set + pack opened** · **weather rule cards remapped** (placeholder names) · **mystery boxes are now card packs** (Common → Legendary packs) · **rarity = metals** (bronze · silver · gold · iridium) for cards and tags; packs become Common → Legendary with no colour, so the first pack is Uncommon ([#385](https://github.com/GrizzlyPax/Parabolica/issues/385)) · **no team picked = purple accent** (the fastest-lap purple) · **type = Pulp Almanac** (Old Standard TT + Special Elite typewriter; Archivo read too slick) · **cards look like cards = Almanac Plate** (Slay the Spire layout: name banner over one icon, type tag, centred changes; one card scaled to every size; bold metal-stripe back reading "Base deck"; tap flips to the back as a fidget; rivals see backs + dots; docs/ICONS.md → Cards) · **pick your team moves to 2 Playable** (tap a deck team in League Setup, #440); build your own stays in 4 Identity (#346) · **one Hub chat, one queue** (no Hub-A / Hub-B) · **info rule: your own team = full stats everywhere; rivals = the read + rarity dots** (playtest 1) · **layout work starts as artifact mock-ups with Pax** · **show, don't tell: decisions, reports and demos come as artifacts, not text walls** (Oct 9)

**Names + weather (Pax, Oct 9, via Radio, #466 / #436; docs/story/name-pools.md):** names stay grounded (mostly real; the joke is a few odd ones) · new **hybrid** tier (one absurd half on a real name); mix real 78 · hybrid 12 · absurd 8 · glitch 2 · mononyms retire as a list (any name ~1% one-word) · real names add 16 traditions (→ 273 / 270) · absurd words: almanac + farm and household objects (→ 84 / 74), no cuts · league names add understated + countryside (→ 110 / 86) · a modest top-up, not a doubling · **backstories + quirks parked** (no Season screen shows them) · weather rule cards: **Crosswind · Overcast · Calm · Windswept · Changeable** · on mobile, steer with 3–4 big multiple-choice picks, not boards of toggles

**Raw-stat balance (Pax + Steward, Oct 9; [Balance Dials](BALANCE_DIALS_2026-10-09.html), [Balance Pass One](BALANCE_PASS_ONE_2026-10-09.html)):** raw stats first; card and trait sizes later · **Speed + Power decide ~45%** of a race; a clear king stat is fine (today Power is an emperor at 61%) · team strength **car / drivers / crew = 42 / 39 / 20** · **Reliability works through mechanical DNFs, not pace** (damage that forces a pit stop → v0.6, #479) · narrower car generation OK · **the paper favourite should win 30–45% of titles** · Pass One tunes 23 existing dials and lands 5 of 7 targets; the title gap (58%) closes with CPU packs between races (v0.6, #478) · **ship Pass One in v0.5, one bump with the names (#481 + #467)** · **CPU packs stay in v0.6** · **nudge Speed so it's clearly king**, in the same bump

**Story first instincts (Pax, Oct 9, via Radio; [grounding note](story/2026-10-09-grounding.md); NOT canon):** the sport is straight motorsport that runs the world · touchstone: early-season Blaseball · **base deck is "gloves on"**: motorsport with one small tweak; strangeness is opt-in by choosing decks (#485) · cards = kit and know-how; sponsorship and superstition packs later (#486) · undecided: who speaks, what a deck is in-world, whether the TV-channel / Management layer returns · the next flavour pass is the v0.6 effect cards (#333)

**Playtest pass 2 (Pax, Oct 9, via Hub; PRs #465 #468 #470 #475 #483 #491):** End season button (asks first, clears the save) · grades in the four F1 colours only · **Paddock = Team / League tabs** (standings live there; League shows every driver with Wins · Podiums · Points and a constructors' chart) · cards as compact square chips; holding a card flashes the grades it would change · number badges square in tables, marbles round in the race · the sealed pack sparkles · race view: no Cards column, your rows tinted, driver panel with OVR grades + history (bottom sheet on phone) · a mobile-first race view later, mock-ups first (#492) · **build-your-own team moves to v0.6** (#346); the balance bump and vehicles + portraits come first

**Race view (Pax, Oct 9, via Hub, PR #500):** a **scoreboard header** (carries the race's priority stats) · on phone the **track is pinned under the header** and the **driver panel opens inside the tower** (the bottom sheet is gone) · **your cars are always big, haloed and labelled** on the track

**Balance bump shipped (Pax, Oct 9):** v0.5.1 (#503), merged by Pit with Pax's OK · Speed nudge = **Speed 0.115 · Power 0.0078 · Grip 0.17** (Speed clearly king: 25% vs 18%) · known gap: the car is 33% of a team vs the 42% target (a separate pass if wanted) · **the champion bonus is axed: two championships, Drivers' and Constructors', like real F1** (#509; the +50 flipped 28% of titles)

**Qualifying (Pax, Oct 9):** both pieces open **v0.6**: Steward designs whether qualifying becomes a driver stat (#496) first, then Hub builds the qualifying show once (#495: drivers go out in turn, times drop onto a board, the grid forms; watch or skip)

**Vehicles + portraits (Pax, Oct 9, via Radio; [docs/story/vehicles-portraits.md](story/vehicles-portraits.md)):** 90% normal (f1-car · full-motorcycle-helmet) · 8% road / works vehicles and paddock faces · 2% oddballs, about 1–3 per season; don't drift the weights up · themed icons (tanks, clowns, plague doctors…) held back for themed decks (#485) · f1-car leaves the team-creator logo picker (speed-boat replaces it) · undrafted icons white, team colour once picked · **desktop matters, not just phone**

**Paddock layout session (Pax, Oct 8, #452):** stats are **letter grades F → A+, S** past the best possible roll (S purple · A green · C yellow · F red; B, D plain) · an **OVR** column · the **0–100 scale is dynamic** (0 = worst possible roll, 100 = best, read from the generator's ranges; must stay true after any re-tune; car/team stars use it too) · **13 even grade bands** (a 50 reads C+) · **roster table = house style for every data screen** (#453) · no field rank on the Paddock (belongs on a league-wide view) · **Car 1 / Car 2** instead of Races / Bench · the next race's favoured stats are a white column header + a plain-words line, not folded into totals · pack step inline (aim at a row, ▲/▼ preview); a step strip; drag on desktop, tap-then-tap on phone

**Hub's M2 calls (flagged in PRs; Pax can overrule):** unpicked players get the first free team ("auto"), so Start never blocks · a picked team survives Reroll if the new seed deals it again · the Paddock has a plain pack step until #320 · locking the lineup ends your turn (gear moves first) · the +50 champion bonus counts only in the final table (mid-season it reads "would go to <team>"); turn order uses race points only · leaving a race midway doesn't run it; only finishing (or Skip) records the round · in hotseat every human's drivers stay visible; only CPU teams are hidden · the league name comes from the seed (a name field could come with #346)
