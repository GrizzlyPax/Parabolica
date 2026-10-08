# Cards — the tag system becomes a deck

*Build spec for the Cards revamp. Source: Dev's design artifact "Cards Revamp" (tabs: The Change, Gear, Traits, Effects, Roadmap, Before). Where this doc and Pax disagree, Pax wins; tell Pit.*

## TL;DR
- **Tags become cards.** Every piece is a typed card: **Gear** (capped slots, swappable), **Traits** (permanent, uncapped), **Effects** (timed, sim-dealt). Today's rule modifiers are renamed **Rule cards**.
- **One placeholder ladder:** common +2% (1 stat) · uncommon +5% (1) · rare +10% (2 stats) · legendary +15% (3). Calibration replaces it later.
- **The 🏁 Motorsport base deck (97 cards) is generated from a grid,** not hand-written: one card per stat at common/uncommon, combos at rare/legendary with every stat represented evenly.
- **Ships in two steps:** v0.5 Spa = gear + traits in Season Mode, and **Quick Race on trait cards** (Pax, Oct 8). v0.6 = effects, the engine hook, and retiring tags in leagues, Race Control and World Deck.

## Card types
| Card | What | Lasts | Slot |
|---|---|---|---|
| Driver · Car · Team | the drafted entities | season | — |
| **Equipment** (driver) · **Upgrade** (car) · **Facility** (team, both drivers) | gear | until swapped | capped |
| **Trait** (driver / car / team / slot) | a core value, always on | forever | uncapped |
| **Effect** | one stat up or down, from the race | a timer | none |
| **Rule card** | changes the rules (No Pit Rules, Rain) | league / race | — |

## Stats (11)
Driver: Speed · Consistency · Luck · Acceleration · Endurance · Aggression. Car: Power · Grip · Reliability. Team: Tyre Management · Pit Crew.

## The base deck (97)
- **Equipment 20:** 6 common + 6 uncommon (one per driver stat) · 6 rare pairs (Spd+Con, Con+Lck, Lck+Acc, Acc+End, End+Agg, Agg+Spd) · 2 legendary (Spd+Acc+Agg, Con+End+Lck).
- **Upgrades 10:** 3 + 3 · rare Pow+Grp, Grp+Rel, Rel+Pow · legendary Pow+Grp+Rel.
- **Facilities 6:** 2 + 2 · rare TM+PC · legendary TM+PC (+15%).
- **Traits 39:** the same grids again for driver (20), car (10) and team (6), plus 3 rare **slot traits** (Extra Equipment / Upgrade / Facility Slot).
- **Effects 22:** every stat Up and Down (driver 12 · car 6 · team 4).
- Names are utilitarian for now ("Rare Speed + Consistency"). Gear and traits are **upside only**; downsides live in effects. Straight motorsport tone; supernatural tags leave the base deck (→ a later Horror deck).

## How cards arrive
- **Genesis:** traits only (what a driver, car or team is born with), on the existing roll shape (1 in 6 per slot, rarity 60/30/9/1). **Zero gear at season start**, with one empty slot of each kind.
- **Mystery boxes** (every race, Paddock): metal by standing **Bronze · Silver · Gold · 🟣 Iridium** (worse standing = shinier). Deals a **gear card** or, **about 1 in 4, a trait card**. Never effects.
- **The sim:** effect cards (v0.6).
- **Slots:** start with 1 equipment, 1 upgrade and 1 facility slot. Slot traits add one each. A new gear card into a full slot = **swap** (the old card is discarded).

## Effects (v0.6)
Size by how big the moment is (minor ±2 / notable ±5 / major ±10 / huge ±15). The duration comes from the source (laps · until the next pit · rest of race · N races). **Repeats reset the clock, never stack.** Weather = a field-wide effect for the race. Triggers: lightning pit (Speed Up, minor, 2 laps) · slow pit (Consistency Down, minor, 2 laps) · spin (Consistency Down, notable, 2 laps) · tyres past the cliff (Speed Down, notable, until pit) · crash damage (Speed Down, major, rest of race) · mechanical scare (Reliability Down, notable, rest of race) · win (Consistency Up, notable, 2 races) · 10+ place climb (Aggression Up, notable, 2 races) · crashed out (Consistency Down, notable, 2 races) · 3 DNFs in a row (Luck Down, major, 3 races).

## Build notes
- **Gear and traits are static for a race,** so they apply by **baking % multipliers into stats at roster build**. No engine change is needed, and that's why they can ship in v0.5.
- **Effects need an engine hook:** "raise/lower stat X by N% until T". Today the engine reads `driver.stats.*`, `carStats`, `teamStats` directly in many places, and timed tag effects only reach speed, consistency and luck (`activeTagEffects`). v0.6 adds one effective-stat accessor that every read goes through.
- **Name clash:** `Card` already means a rule modifier (`src/data/cards.ts`, `rules/ruleset.ts`, Run Setup). Rename that to **RuleCard** first.

## Later (not in either step)
Flavour pass (names + one-line backstories, personal & superstitious voice) · cosmetic helmet slot · themed decks (Horror, Fantasy, Elements) · families, rivalries, staff, forced cards, base-stat traits.
