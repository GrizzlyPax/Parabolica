# Fun Check — is a v0.5 season fun?

*Owner: 🏛️ Steward. How we judge a Season Mode season ([SEASON_MODE](SEASON_MODE.md), [V05_PLAN](V05_PLAN.md), [CARDS](CARDS.md)). Numbers are measured on seeded headless seasons by the balance read, [#324 Season Mode: balance read (dumb AI + pack tilt keep titles open?)](https://github.com/GrizzlyPax/Parabolica/issues/324). Bands are first guesses: the first read sets the baseline, and Pax's playtest overrules any number.*

## TL;DR
- **A fun season = the title is still alive late, the lead moves, your Paddock calls matter, the pack makes moments, and the next season feels different.**
- Six signals, each with a number we can measure and a feel Pax can check.
- **Numbers say "not broken". Only playtesting says "fun".** Both have to pass.

## How we measure
- **Probe:** 200 seeded headless seasons on the defaults (10 teams, 30 drivers, 10 races, champ bonus 50, pack every race).
- **Seat 1 = "you", played by a bot:** *plain* (random 2 of 3, equips any pack card into an empty slot, otherwise keeps) and *sharp* (greedy picks, best swap). The other 9 seats are the dumb AI.
- **Counterfactuals are cheap:** the sim is deterministic, so "with vs without this card" or "lineup A vs B" is the same seed run twice.

## The six signals
| # | Signal | Proxy (per season, over 200 seeds) | Target band |
|---|---|---|---|
| 1 | **Title alive late** | Clinch race: first race after which the leader can't be caught (points left incl. the 50 bonus) | Median clinch **≥ race 8**; clinched by race 6 in **≤ 15%**; decided in the finale in **≥ 30%** |
| 2 | **Comebacks** | Lead changes after race 3 · champion who was **3rd or worse at halfway** | Median **2–4** lead changes; comeback champion in **20–40%** |
| 3 | **Paddock choices matter** | Points spread between best and worst 2-of-3 lineup each race · how often the benched racer was the right call | Spread **≥ 3 pts/race** on average; bench was right **≥ 25%** of races (no auto-pick) |
| 4 | **Pack moments** | Races where a pack card moves its holder **≥ 1 place** (with vs without) · gold+ and iridium pulls · trait pulls | Pack swing in **20–40%** of races; a gold+ in **≥ 80%** of seasons; an iridium in **20–40%**; **~2–3** traits/season |
| 5 | **Fair fight** | Champion rate: plain bot vs sharp bot vs a dumb-AI seat · trailing third vs top third pack gain | Plain **~10%** (1 in 10, like anyone), sharp **15–30%** (skill pays, no stomp); trailers gain **more** from packs than leaders, but packs are **< 20%** of the champion's points |
| 6 | **Variety** | Distinct race winners per season · top driver's win share · champion rate per draft slot · champion's first pick | **≥ 5** winners of 10; top driver **≤ 40%** of wins; every draft slot **5–20%**; no single driver or car champion in **> 15%** of seeds |

**Champ bonus check (Pax's 25 / 50 / 75 question):** the bonus should flip the title in **5–20%** of seasons. Under 5% = it's decoration; over 20% = the drivers' title is the real game.

## Playtest: what Pax should feel
**M2 Playable** (setup → draft → pick racers → watch/skip → champion, on the phone)
- **Feel:** "one more race". You finish a season in one sitting and want to start another.
- **Look for:** the draft makes you hesitate at least twice · picking 2 of 3 is a real choice, not "the obvious two" · standings after each race tell a story (who's rising, who's collapsing) · Go / skip pacing never drags · the last two races still matter to you.

**M3 The pack** (open a pack every race, equip gear and traits, locker)
- **Feel:** anticipation. You *want* to open the pack, and the metal colour already tells you something.
- **Look for:** a trailing team gets Iridium and it **feels like a lifeline, not a pity prize** · at least one card per season you remember by name · a swap that's a real dilemma (keep or bench to the locker) · you can see **in the race result** that a card did something · the card sheet reads at a glance on a phone.

## Red flags: not fun yet
- **Champion safe by race 5–6** in most seasons, or the same team leads from race 1 to 10.
- **One driver wins 6+ of 10**, or the same driver or car is champion across many seeds.
- **Choices don't matter:** the best lineup is always the top two by stars; skipping the pack changes nothing.
- **The pack is invisible:** cards never show in results, or you can't tell what you got.
- **The pack is the game:** one iridium pull decides the season.
- **The AI stomps you, or you stomp the AI** with plain play.
- **Every season feels the same:** same draft order of picks, same shape of standings.
- **Dead time:** skipping races because watching them is a chore, not because you're excited for the Paddock.

*When a red flag shows: Steward writes the finding and the recommended knob (champ bonus, pack odds, catch-up tilt, compression); Pit turns it into an issue.*
