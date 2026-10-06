# Parabolica Glossary

*Generated from the data modules by `npm run glossary` — do not edit by hand. Engine v0.4.0.*

39 tags (9 genesis · 8 acquired · 5 in-race · 17 condition) · 12 cards · 12 rules · 5 weathers · 3 track characters · 5 inflictions · 24 tracks

## How genesis tags are rolled

Each driver gets three slots: driver, car (their own chassis), team (one roll, shared by teammates). Per slot:

1. **Does it hit?** 1 in 6.
2. **Which bucket?** 60% common · 30% uncommon · 9% rare · 1% legendary. Fixed odds — adding tags to a bucket never changes how often it comes up, only which tag you get.
3. **Which tag?** An even pick inside the bucket. An empty bucket falls to the next more common one.

Bucket sizes in the default pool: common 3 · uncommon 5 · rare 1 · legendary 0. Cards change the hit chance and the odds.

## How tags enter the world

| Door | What it means |
|---|---|
| Genesis | Rolled when a driver, car or team is born (chance and pool set by the ruleset) |
| Commissionary | Attached by you, from the next race (`attach-tag`) |
| Acquired | Awarded by the settle loop for what happened in a race (`acquire-tag`), from the next race |
| In-race | Picked up mid-race from a race event; may expire by lap, at the next stop, or carry over |
| Condition | Stamped on drivers by a track event for that race only |

## Genesis tags

| Tag | Rarity | Target | Fires | Effect | Lasts | After a race | How you get it |
|---|---|---|---|---|---|---|---|
| 🎯 **Clutch Performer** `clutch-performer` — Raises their game when it matters most | uncommon | driver | on the final lap (70% chance) | +8% speed, +15% consistency | for good | — | born with it (in the genesis pool), or granted by the Commissionary |
| 🌧️ **Rain Dancer** `rain-dancer` — Mysteriously faster when the skies open | rare | driver | while in rain | +8% consistency, −15% crash risk | for good | — | born with it (in the genesis pool), or granted by the Commissionary |
| 🐢 **Sunday Driver** `sunday-driver` — Slow starter who builds to a strong finish | uncommon | driver | while last 40% of the race | +5% speed | for good | — | born with it (in the genesis pool), or granted by the Commissionary |
| 💎 **Glass Cannon** `glass-cannon` — Blazingly fast but fragile | uncommon | car | always on | +3% speed, +25% crash risk | for good | — | born with it (in the genesis pool), or granted by the Commissionary |
| 👻 **Cursed Chassis** `cursed-chassis` — Something is wrong with this car. Nobody knows what. | uncommon | car | always on | -2% consistency, -12% luck | for good | — | born with it (in the genesis pool), or granted by the Commissionary |
| 🔧 **Pit Lane Special** `pit-lane-special` — Optimized for quick pit stops | common | car | on a pit stop | -25% pit time | for good | — | born with it (in the genesis pool), or granted by the Commissionary |
| 🐕 **Underdog Spirit** `underdog-spirit` — Performs better when behind | common | team | while bottom 50% of the field | +3% speed, +10% luck | for good | — | born with it (in the genesis pool), or granted by the Commissionary |
| 👑 **Front Runners** `front-runners` — Thrives when leading the pack | common | team | while running top 5 | +4% consistency, −8% crash risk | for good | — | born with it (in the genesis pool), or granted by the Commissionary |
| 🌀 **Chaotic Energy** `chaotic-energy` — Unpredictable - could be brilliant or disastrous | uncommon | team | at the start (50% chance) | -20% consistency | for good | — | born with it (in the genesis pool), or granted by the Commissionary |

## Acquired tags

| Tag | Rarity | Target | Fires | Effect | Lasts | After a race | How you get it |
|---|---|---|---|---|---|---|---|
| 🔥 **Hot Streak** `hot-streak` — Two wins on the bounce. Everything is coming easy. | uncommon | driver | always on | +2% speed, +5% consistency | 3 races | 15%: gives 🐎 The Charger to themselves | earned: 2 wins in a row |
| 🐎 **The Charger** `the-charger` — Came through the field like it owed them money. Faster in traffic. | uncommon | driver | while bottom 50% of the field | +3% speed | rest of the season | — | earned: gained 10+ places from the grid and finished top 5; passed on by 🔥 Hot Streak |
| 🛡️ **Unkillable** `unkillable` — Walked away from a wreck and kept racing. Harder to put out now. | uncommon | driver | always on | −12% crash risk | for good | — | earned: damaged in a crash and still classified in the top 8 |
| 👻 **Haunted** `haunted` — Three retirements in a row. Something followed them home. | rare | driver | always on | -20% luck, +5% crash risk | 4 races | 10%: gives 👻 Haunted to their teammate | inflicted: 3 retirements in a row; passed on by 👻 Haunted |
| 😵 **Shaken** `shaken` — Crashed out last time. The hands are not quite steady yet. | uncommon | driver | always on | -6% consistency | 2 races | 50%: gives 👊 Bad Blood to whoever they crashed with | inflicted: retired in a crash |
| 👂 **Hears the Track** `hears-the-track` — They say the asphalt talks to them. It has not said anything useful yet. | common | driver | always on | — | rest of the season | always: shakes off 😵 Shaken | cosmic: 0.5% lottery per driver per race |
| 🕳️ **Marked by the Void** `marked-by-the-void` — The universe simply decided. Fortune looks the other way for a while. | uncommon | driver | always on | -10% luck | 2 races | 10%: gives 🕳️ Marked by the Void to a random driver; 10%: wears off | cosmic: 0.3% lottery per driver per race; passed on by 🕳️ Marked by the Void |
| 👊 **Bad Blood** `bad-blood` — Someone is driving angry. Quicker, and less careful about it. | uncommon | driver | always on | +2% speed, +6% crash risk | 3 races | — | passed on by 😵 Shaken |

## In-race tags

| Tag | Rarity | Target | Fires | Effect | Lasts | After a race | How you get it |
|---|---|---|---|---|---|---|---|
| 🔧 **Damaged** `damaged` — Survived a crash. The car is 15% slower for the rest of the race. | rare | driver | always on | -15% speed | rest of the race | — | mid-race, after surviving a crash |
| 🌀 **Spun** `spun` — Just swapped ends. The next couple of laps are ragged. | uncommon | driver | always on | -10% consistency | 2 laps | — | mid-race, after a driver error |
| 🔥 **Cooked Tyres** `cooked-tyres` — Past the cliff. Slower until the next stop. | uncommon | driver | always on | -3% speed | until the next pit stop | — | mid-race, after tyres falling off the cliff |
| 🐢 **Sulking** `sulking` — That stop was slow and everyone knows it. | common | driver | always on | -4% consistency | 1 lap | — | mid-race, after a slow pit stop |
| ⚡ **Fired Up** `fired-up` — A lightning stop. The whole crew is buzzing. | common | driver | always on | +1% speed | 1 lap | — | mid-race, after a lightning pit stop |

## Condition tags

| Tag | Rarity | Target | Fires | Effect | Lasts | After a race | How you get it |
|---|---|---|---|---|---|---|---|
| 🌫️ **Low Visibility** `low-visibility` — Fog, mist, or smoke reducing driver visibility | common | condition | on a track event | -8% consistency, +15% crash risk | one race | — | stamped by a track event for one race |
| 💧 **Slippery Surface** `slippery-surface` — Oil, water, or debris on the track | rare | condition | on a track event | -12% consistency, +20% crash risk | one race | — | stamped by a track event for one race |
| ⚠️ **Debris Hazard** `debris-hazard` — Track debris creating danger | rare | condition | on a track event | +25% crash risk | one race | — | stamped by a track event for one race |
| 💨 **Dust Cloud** `dust-cloud` — Kicked-up dust reducing visibility | uncommon | condition | on a track event | -6% consistency, +12% crash risk | one race | — | stamped by a track event for one race |
| ⚡ **Adrenaline Surge** `adrenaline-surge` — A burst of speed from the excitement | uncommon | condition | on a track event | +8% speed | one race | — | stamped by a track event for one race |
| 🌀 **Slipstream Boost** `slipstream-boost` — Caught a powerful slipstream | common | condition | on a track event | +5% speed | one race | — | stamped by a track event for one race |
| 📈 **Track Evolution** `track-evolution` — Track grip improving with rubber buildup | common | condition | on a track event | +4% speed, +5% consistency | one race | — | stamped by a track event for one race |
| 🍃 **Headwind** `headwind` — Strong headwind reducing straight-line speed | uncommon | condition | on a track event | -6% speed | one race | — | stamped by a track event for one race |
| 🌡️ **Cooling Issues** `cooling-issues` — High temperatures forcing reduced pace | uncommon | condition | on a track event | -8% speed, -5% consistency | one race | — | stamped by a track event for one race |
| 🛞 **Tire Graining** `tire-graining` — Temporary loss of tire grip | uncommon | condition | on a track event | -5% speed, +8% crash risk | one race | — | stamped by a track event for one race |
| 😵 **Distracted** `distracted` — Lost focus, making small mistakes | uncommon | condition | on a track event | -4% speed, -10% consistency | one race | — | stamped by a track event for one race |
| 🎯 **In The Zone** `in-the-zone` — Perfect focus, hitting every apex | uncommon | condition | on a track event | +6% speed, +10% consistency | one race | — | stamped by a track event for one race |
| 😰 **Rattled** `rattled` — Shaken up, driving cautiously | uncommon | condition | on a track event | -7% speed, −15% crash risk | one race | — | stamped by a track event for one race |
| 🔥 **Desperate Push** `desperate-push` — Nothing to lose, pushing hard | rare | condition | on a track event | +10% speed, +20% crash risk | one race | — | stamped by a track event for one race |
| 🚧 **Pit Congestion** `pit-congestion` — Heavy pit lane traffic | uncommon | condition | on a track event | +25% pit time | one race | — | stamped by a track event for one race |
| 🔧 **Equipment Malfunction** `equipment-malfunction` — Pit equipment issues causing delays | rare | condition | on a track event | +40% pit time | one race | — | stamped by a track event for one race |
| 👐 **Fast Hands** `fast-hands` — Pit crew on fire today | uncommon | condition | on a track event | -20% pit time | one race | — | stamped by a track event for one race |

## Cards

| Card | Scope | Weight | Does |
|---|---|---|---|
| 🌧️ **Rain** `rain` | race | wild | This race is wet. Rain Dancer wakes; crashes more likely. |
| 🌫️ **Fog** `fog` | race | mild | This race is foggy: slightly slower, more close calls. |
| ☀️ **Clear Skies** `clear-skies` | race | mild | No weather this race. |
| 🌧️ **Always Raining** `always-raining` | season | wild | Every race is wet. |
| 🌪️ **Wild Weather** `wild-weather` | season | wild | Clear skies become rare; rain, fog, wind and heat are all as likely. |
| 🍲 **Tag Soup** `tag-soup` | both | wild | Most drivers are born with tags; up to 6 each. |
| 🧼 **No Tags** `no-tags` | both | mild | Nobody is born with a tag. |
| 💥 **Demolition Derby** `demolition-derby` | both | cursed | Crashes 2.5× more likely. |
| 🧨 **Unreliable Cars** `unreliable-cars` | both | cursed | Engines fail 3× as often. |
| 🪨 **Tough Tyres** `tough-tyres` | both | mild | Tyres wear half as fast. Fewer stops. |
| 🏎️ **Fast Pit Crews** `fast-pit-crews` | both | mild | Pit stops 25% quicker; fewer fumbled stops. |
| 🔓 **No Pit Rules** `no-pit-rules` | both | wild | No minimum stops, no compound rule. Anything goes. |

## Acquisition rules (after a race)

| Rule | Family | Trigger | Awards |
|---|---|---|---|
| `two-wins` | earned | 2 wins in a row | 🔥 Hot Streak |
| `big-climb` | earned | gained 10+ places from the grid and finished top 5 | 🐎 The Charger |
| `walked-away` | earned | damaged in a crash and still classified in the top 8 | 🛡️ Unkillable |
| `three-dnfs` | inflicted | 3 retirements in a row | 👻 Haunted |
| `crashed-out` | inflicted | retired in a crash | 😵 Shaken |
| `the-whisper` | cosmic | 0.5% lottery per driver per race | 👂 Hears the Track |
| `the-marking` | cosmic | 0.3% lottery per driver per race | 🕳️ Marked by the Void |

## In-race rules (during a race)

| Rule | After | Awards | Lasts |
|---|---|---|---|
| `damage` | surviving a crash | 🔧 Damaged | rest of the race |
| `spin` | a driver error (Spin) | 🌀 Spun | 2 laps |
| `cliff` | tyres falling off the cliff | 🔥 Cooked Tyres | until the next pit stop |
| `fumble` | a slow pit stop | 🐢 Sulking | 1 lap |
| `lightning` | a lightning pit stop | ⚡ Fired Up | 1 lap |

## Weather

| Weather | Odds (default) | Stamps | Field-wide at full intensity |
|---|---|---|---|
| ☀️ **Clear** `clear` | 60% | — | — |
| 💨 **Windy** `windy` | 18% | windy | -2% consistency |
| 🔥 **Scorcher** `scorcher` | 9% | scorcher | -1% speed, +3% crash risk |
| 🌫️ **Fog** `fog` | 7% | fog | -2% speed, +6% crash risk |
| 🌧️ **Rain** `rain` | 6% | rain | -4% speed, -3% consistency, +10% crash risk |

## Track characters

| Character | Field-wide | Stamps |
|---|---|---|
| 🏎️ **High-Speed** `high-speed` | +2% speed | — |
| 🌀 **Technical** `technical` | -2% consistency | — |
| ⚠️ **Hazardous** `hazardous` | +5% crash risk | debris-hazard |

## Inflictions (mid-race, from conditions)

| Infliction | Needs | Effect | Lasts |
|---|---|---|---|
| ⚡ **Electrocuted** `electrocuted` | rain | -8% speed | 300 ticks |
| 🌫️ **Lost in Fog** `lost-in-fog` | fog | -12% consistency | 350 ticks |
| 🥵 **Overheating** `overheating` | scorcher | -6% speed | 250 ticks |
| 🌬️ **Tailwind** `tailwind` | windy | +6% speed | 200 ticks |
| 🪨 **Debris Strike** `debris-strike` | debris-hazard | -5% speed, +10% crash risk | 250 ticks |

## Tracks

| Track | Laps | Length | Character | Event |
|---|---|---|---|---|
| 🦷 **Venhir** `venhir` | 15 | 850m | 🏎️ High-Speed | — |
| 🧀 **Cheddah** `cheddah` | 14 | 900m | 🏎️ High-Speed | — |
| 🦜 **All Bird Park** `all-bird-park` | 16 | 820m | ⚠️ Hazardous | — |
| 🚂 **Choo-Choo-Ka** `choo-choo-ka` | 15 | 880m | 🏎️ High-Speed | — |
| 🧛 **Fang High** `fang-high` | 15 | 850m | 🌀 Technical | — |
| 🕵️‍♂️ **Spyami** `spyami` | 16 | 800m | ⚠️ Hazardous | — |
| 💀 **Grimola** `grimola` | 17 | 780m | 🌀 Technical | — |
| 🍫 **Monacoco** `monacoco` | 18 | 700m | ⚠️ Hazardous | — |
| 🐱 **Cattylosers** `cattylosers` | 16 | 820m | ⚠️ Hazardous | — |
| 🚙 **Mini-Vanada** `mini-vanada` | 16 | 800m | ⚠️ Hazardous | — |
| ⚡️ **Eelburg** `eelburg` | 18 | 720m | 🌀 Technical | — |
| 🤖 **Silverclone** `silverclone` | 15 | 880m | 🏎️ High-Speed | — |
| 🧟‍♂️ **Spa Frankenstein** `spa-frankenstein` | 14 | 950m | 🏎️ High-Speed | — |
| 👅 **Tonguearoring** `tonguearoring` | 17 | 780m | 🌀 Technical | — |
| 🏖️ **Sandforts** `sandforts` | 17 | 760m | ⚠️ Hazardous | — |
| 🧌 **Monsta** `monsta` | 14 | 900m | 🏎️ High-Speed | — |
| 🧢 **Snapbaku** `snapbaku` | 14 | 920m | 🏎️ High-Speed | — |
| 👩‍⚖️ **Subpoena Day** `subpoena-day` | 15 | 850m | 🌀 Technical | — |
| 🏰 **MOTA** `mota` | 15 | 880m | 🏎️ High-Speed | — |
| 🦖 **T-Rex & Co.** `t-rex-and-co` | 16 | 800m | 🌀 Technical | — |
| 🧊 **Winter Igloos** `winter-igloos` | 17 | 780m | 🏎️ High-Speed | — |
| 🧮 **Las PEMDAS** `las-pemdas` | 14 | 920m | 🏎️ High-Speed | — |
| 🦄 **Rainbowha** `rainbowha` | 15 | 850m | ⚠️ Hazardous | — |
| 💃 **Yas Christina!** `yas-christina` | 15 | 880m | ⚠️ Hazardous | — |
