# Parabolica World Deck

*Everything in the sim and the world, generated from the data modules by `npm run glossary` — do not edit by hand; edit the source files named in each section and re-run. Engine v0.5.0. How to add content: docs/WORLD_DECK.md.*

28 teams · 6 tracks · 43 tags (30 genesis · 8 acquired · 5 in-race) · 12 rule cards · 12 rules · 6 weathers · 3 gods

## Base-deck teams

*Source: `src/data/deckTeams.ts` (from docs/story/team-identity.md; not canon yet). The 28 world factions, seven of each kind: Quick Race draws its 11 and Season Mode its CPU teams from these. Logo = the icon in `ink` on the team colour.*

### Works manufacturers

| Team | Colour · ink | Icon | Line |
|---|---|---|---|
| **Vantor Motorwerke** `vantor-motorwerke` | #E8242F · #FFFFFF | `charging-bull` | Industrial giant. Every car is built on the same night of the year. |
| **Halcyon** `halcyon` | #006EBE · #FFFFFF | `eagle-emblem` | Grand tourers. No Halcyon has ever been sold; they are only raced. |
| **Orsa** `orsa` | #087C77 · #FFFFFF | `bear-head` | Northern marque. The factory clocks run eleven minutes slow, by policy. |
| **Corvane** `corvane` | #9B8AFE · #0A0A0C | `raven` | Luxury house. The badge was redrawn after the founder dreamed it. |
| **Calloway** `calloway` | #F4EEDE · #0A0A0C | `steering-wheel` | Every Calloway is road-tested on the same nine miles of road, at dawn. |
| **Brisa** `brisa` | #0BAEE0 · #FFFFFF | `scooter` | Scooter maker gone racing. Every car leaves the factory with a full tank and a bell. |
| **Arden** `arden` | #FFB000 · #0A0A0C | `pocket-watch` | Clocks and engines in the same building. Both are wound by hand on Mondays. |

### Privateer garages

| Team | Colour · ink | Icon | Line |
|---|---|---|---|
| **Seven Bolt Racing** `seven-bolt-racing` | #C31851 · #FFFFFF | `hexagonal-nut` | Every wheel has seven bolts. Nobody remembers why. |
| **Low Tide Racing** `low-tide-racing` | #1BB4B8 · #FFFFFF | `anchor` | The garage sits below the tideline. They work between tides. |
| **Kiln Lane Motorsport** `kiln-lane-motorsport` | #945F0E · #FFFFFF | `anvil` | Brick sheds and a forge. The engine is started with a match. |
| **Tinplate** `tinplate` | #B6BBC1 · #0A0A0C | `race-car` | A car that looks like a toy and is faster than it should be. |
| **Ostler & Finch** `ostler-finch` | #B47B46 · #FFFFFF | `horse-head` | Was a coaching inn. The stable doors still get locked at night. |
| **Cinder Row** `cinder-row` | #718295 · #FFFFFF | `poker-hand` | Six garages on one street share one car. Who drives is settled by a card game. |
| **Glasshouse** `glasshouse` | #8DCC6E · #0A0A0C | `sprout` | The garage is an old greenhouse. Every car has a plant in the cockpit. |

### Family dynasties

| Team | Colour · ink | Icon | Line |
|---|---|---|---|
| **Hargreave** `hargreave` | #507B07 · #FFFFFF | `stag-head` | The founder's chair stays in the garage, empty, facing the track. |
| **Moreau-Tallis** `moreau-tallis` | #8F3DC0 · #FFFFFF | `scorpion` | A marriage of two rival teams. The garage still has a line down the middle. |
| **Kanzaki** `kanzaki` | #E63281 · #FFFFFF | `checkered-diamond` | The family crest changes slightly every ten years. |
| **Achterberg** `achterberg` | #C0502A · #FFFFFF | `ribbon` | Run by a widow and her four sons. The whole crew wears a black armband, always. |
| **Valcourt** `valcourt` | #D95FFC · #FFFFFF | `champagne-cork` | Old wine family. They pour one glass on the grid before every start. |
| **Ishida** `ishida` | #FF4DB8 · #FFFFFF | `pine-tree` | Every new driver plants a tree at the family track. The oldest ones are very tall. |
| **Pell & Pell** `pell-pell` | #5454EA · #FFFFFF | `envelope` | Brothers who haven't spoken in twenty years. They run the team by letter. |

### Regional / city teams

| Team | Colour · ink | Icon | Line |
|---|---|---|---|
| **Corriva** `corriva` | #F8767A · #0A0A0C | `sun` | Coast city that keeps siesta. They never test before 4pm. |
| **Lumen** `lumen` | #DED903 · #0A0A0C | `light-bulb` | A city whose lights have never gone off. |
| **Fennick Downs** `fennick-downs` | #4EBB05 · #FFFFFF | `rabbit` | Farm country. The whole crew are related, and nobody admits how. |
| **Ambergate** `ambergate` | #C2A02A · #0A0A0C | `castle` | A walled town. The gates close at dusk, and the team must be back inside. |
| **Saint Orrin** `saint-orrin` | #5E9EFD · #FFFFFF | `lighthouse` | Island city. The ferry waits for the team, never the other way round. |
| **Caldera** `caldera` | #F87103 · #FFFFFF | `volcano` | A city built inside an old crater. Race day starts with the bells. |
| **Tessaly** `tessaly` | #0DB98E · #FFFFFF | `water-drop` | Spa town. Drivers take the waters before every race and won't say why. |

## Tracks

*Source: `src/data/deckTracks.ts` (docs/TRACKS_WEATHER.md). Six stat-combo tracks; each favours one driver stat and one car/team stat for the race, field-wide (+10%, through the card math at race build). Every race and season calendar draws from these; the 31 themed circuits, track events and track characters retired with Tracks & Weather v2.*

| Track | Favours | Layout |
|---|---|---|
| **Speed + Power** `speed-power` | +10% Speed · +10% Power | power |
| **Consistency + Grip** `consistency-grip` | +10% Consistency · +10% Grip | technical |
| **Aggression + Reliability** `aggression-reliability` | +10% Aggression · +10% Reliability | street |
| **Endurance + Tyre Management** `endurance-tyre-management` | +10% Endurance · +10% Tyre Management | flowing |
| **Acceleration + Pit Crew** `acceleration-pit-crew` | +10% Acceleration · +10% Pit Crew | modern |
| **Luck + Reliability** `luck-reliability` | +10% Luck · +10% Reliability | classic |

## Weather

*Source: `src/data/deckWeather.ts`. Neutral + five dry weathers, favours × intensity, stacking with the track. No rain until Wet arrives in v0.6; the old weathers and the inflictions retired (the inflictions are parked as Horror-deck material).*

| Weather | Odds | Favours |
|---|---|---|
| **Neutral** `neutral` | 60% | — |
| **Speed + Tyre Management** `speed-tyre-management` | 8% | +10% Speed · +10% Tyre Management |
| **Consistency + Pit Crew** `consistency-pit-crew` | 8% | +10% Consistency · +10% Pit Crew |
| **Acceleration + Reliability** `acceleration-reliability` | 8% | +10% Acceleration · +10% Reliability |
| **Endurance + Power** `endurance-power` | 8% | +10% Endurance · +10% Power |
| **Aggression + Grip** `aggression-grip` | 8% | +10% Aggression · +10% Grip |


## Gods (retiring)

*Source: `src/league/gods.ts`. Parked: founding no longer asks, and gods retire with Commissioner leagues (#339). Not shown in the World Deck.*

| God | Epithet | Hunger | Appetite |
|---|---|---|---|
| 🔥 **The Scrap Heap** `the-scrap-heap` | That Which Collects | Bring me the bent chassis and the blown engine. A clean race is a wasted race. | Hungers for carnage — crashes, blowouts, DNFs. Safe seasons starve it. |
| ⚖️ **The Stewards** `the-stewards` | The Ones Who Watch | Order. Procession. The strong shall finish ahead of the weak, as is written. | Hungers for order — favorites winning, clean finishes. Chaos offends it. |
| 📸 **The Photo Finish** `the-photo-finish` | Witness of the Margin | Let no one pull away. I want ten winners in sixteen races and a title decided by a lap. | Hungers for parity — different winners, tight championships. Dynasties bore it. |

## How genesis tags are rolled

Each driver gets three slots: driver, car (their own chassis), team (one roll, shared by teammates). Per slot:

1. **Does it hit?** 1 in 6.
2. **Which bucket?** 60% bronze · 30% silver · 9% gold · 1% iridium. Fixed odds — adding tags to a bucket never changes how often it comes up, only which tag you get.
3. **Which tag?** An even pick inside the bucket. An empty bucket falls to the next more common one.

Bucket sizes in the default pool: bronze 12 · silver 9 · gold 6 · iridium 3. Cards change the hit chance and the odds.

## How tags enter the world

| Door | What it means |
|---|---|
| Genesis | Rolled when a driver, car or team is born (chance and pool set by the ruleset) |
| Commissionary | Attached by you, from the next race (`attach-tag`) |
| Acquired | Awarded by the settle loop for what happened in a race (`acquire-tag`), from the next race |
| In-race | Picked up mid-race from a race event; may expire by lap, at the next stop, or carry over |

## Genesis tags

Measured: each tag alone on one driver over 200 seeded races vs the same races untagged (Race Control → Tag calibration; `npm run calibrate`, batch 2026).

| Tag | Rarity | Target | Fires | Effect | Lasts | After a race | How you get it | Measured |
|---|---|---|---|---|---|---|---|---|
| 🎯 **Clutch Performer** `clutch-performer` — Raises their game when it matters most | silver | driver | on the final lap (70% chance) | +8% speed, +15% consistency | for good | — | born with it (in the genesis pool), or granted by the Commissionary | +0.3 places · 1.7× wins · 20% DNF (field 20%) |
| 🌧️ **Rain Dancer** `rain-dancer` — Mysteriously faster when the skies open | gold | driver | while in rain | +8% consistency, −15% crash risk | for good | — | born with it (in the genesis pool), or granted by the Commissionary | no measurable effect · 1.0× wins · 20% DNF (field 20%) |
| 🐢 **Sunday Driver** `sunday-driver` — Slow starter who builds to a strong finish | silver | driver | while last 40% of the race | +5% speed | for good | — | born with it (in the genesis pool), or granted by the Commissionary | +1.1 places · 3.0× wins · 17% DNF (field 20%) |
| 🧤 **Steady Hands** `steady-hands` — Rarely puts a wheel wrong | bronze | driver | always on | +4% consistency | for good | — | born with it (in the genesis pool), or granted by the Commissionary | +2.5 places · 4.2× wins · 10% DNF (field 20%) |
| 🛑 **Late Braker** `late-braker` — Brave into the corners. Sometimes too brave | bronze | driver | always on | +1% speed, +3% crash risk | for good | — | born with it (in the genesis pool), or granted by the Commissionary | +0.2 places · 1.5× wins · 17% DNF (field 20%) |
| 🚦 **Quick Starter** `quick-starter` — Lights out and gone | bronze | driver | at the start | +5% speed | for good | — | born with it (in the genesis pool), or granted by the Commissionary | +0.7 places · 1.8× wins · 15% DNF (field 20%) |
| 🙌 **Crowd Favourite** `crowd-favourite` — Things just seem to go their way | bronze | driver | always on | +10% luck | for good | — | born with it (in the genesis pool), or granted by the Commissionary | +0.5 places · 1.7× wins · 16% DNF (field 20%) |
| 🌂 **Rain Shy** `rain-shy` — Would rather be indoors when it rains | silver | driver | while in rain | -3% speed | for good | — | born with it (in the genesis pool), or granted by the Commissionary | no measurable effect · 1.0× wins · 20% DNF (field 20%) |
| 🧊 **Ice Veins** `ice-veins` — Unflappable with the lead in sight | gold | driver | while running top 3 | +8% consistency | for good | — | born with it (in the genesis pool), or granted by the Commissionary | +1.0 places · 4.5× wins · 18% DNF (field 20%) |
| ⭐ **The Natural** `the-natural` — Born for this. Everyone can tell | iridium | driver | always on | +3% speed, +5% consistency, +10% luck | for good | — | born with it (in the genesis pool), or granted by the Commissionary | +2.9 places · 6.8× wins · 14% DNF (field 20%) |
| 💎 **Glass Cannon** `glass-cannon` — Blazingly fast but fragile | silver | car | always on | +3% speed, +25% crash risk | for good | — | born with it (in the genesis pool), or granted by the Commissionary | +0.8 places · 3.3× wins · 21% DNF (field 20%) |
| 👻 **Cursed Chassis** `cursed-chassis` — Something is wrong with this car. Nobody knows what. | silver | car | always on | -2% consistency, -12% luck | for good | — | born with it (in the genesis pool), or granted by the Commissionary | -0.8 places · 1.0× wins · 18% DNF (field 20%) |
| 🔧 **Pit Lane Special** `pit-lane-special` — Optimized for quick pit stops | bronze | car | on a pit stop | -25% pit time | for good | — | born with it (in the genesis pool), or granted by the Commissionary | +1.2 places · 2.2× wins · 16% DNF (field 20%) |
| 🔋 **Big Engine** `big-engine` — More horsepower than manners | bronze | car | always on | +1% speed | for good | — | born with it (in the genesis pool), or granted by the Commissionary | +1.4 places · 2.5× wins · 16% DNF (field 20%) |
| 🛡️ **Built Like a Tank** `built-like-a-tank` — Shrugs off contact that would end other cars | bronze | car | always on | −6% crash risk | for good | — | born with it (in the genesis pool), or granted by the Commissionary | +0.0 places · 1.0× wins · 20% DNF (field 20%) |
| 🪶 **Light-Footed** `light-footed` — Flies on fresh rubber | bronze | car | while tyre wear under 40% | +2% speed | for good | — | born with it (in the genesis pool), or granted by the Commissionary | +1.0 places · 2.2× wins · 16% DNF (field 20%) |
| 🌡️ **Runs Hot** `runs-hot` — Hates a scorcher | silver | car | while in scorcher | -4% speed | for good | — | born with it (in the genesis pool), or granted by the Commissionary | no measurable effect · 1.0× wins · 20% DNF (field 20%) |
| 🌧️ **Wet Weather Package** `wet-weather-package` — Built for the rain; sure-footed when it pours | gold | car | while in rain | +3% speed, −5% crash risk | for good | — | born with it (in the genesis pool), or granted by the Commissionary | no measurable effect · 1.0× wins · 20% DNF (field 20%) |
| 🛸 **Spaceship** `spaceship` — Nobody is sure how it works, including the team | gold | car | always on | +3% speed, -10% luck | for good | — | born with it (in the genesis pool), or granted by the Commissionary | +0.8 places · 3.3× wins · 21% DNF (field 20%) |
| 🦄 **The Unicorn** `the-unicorn` — The car every team dreams of building once | iridium | car | always on | +3% speed, +4% consistency, −5% crash risk | for good | — | born with it (in the genesis pool), or granted by the Commissionary | +2.3 places · 5.7× wins · 17% DNF (field 20%) |
| 🐕 **Underdog Spirit** `underdog-spirit` — Performs better when behind | bronze | team | while bottom 50% of the field | +3% speed, +10% luck | for good | — | born with it (in the genesis pool), or granted by the Commissionary | +0.8 places · 1.1× wins · 15% DNF (field 18%) |
| 👑 **Front Runners** `front-runners` — Thrives when leading the pack | bronze | team | while running top 5 | +4% consistency, −8% crash risk | for good | — | born with it (in the genesis pool), or granted by the Commissionary | +0.8 places · 2.1× wins · 16% DNF (field 18%) |
| 🌀 **Chaotic Energy** `chaotic-energy` — Unpredictable - could be brilliant or disastrous | silver | team | at the start (50% chance) | -20% consistency | for good | — | born with it (in the genesis pool), or granted by the Commissionary | -0.4 places · 0.9× wins · 20% DNF (field 18%) |
| 🔧 **Drilled Crew** `drilled-crew` — Every stop rehearsed a hundred times | bronze | team | always on | -8% pit time | for good | — | born with it (in the genesis pool), or granted by the Commissionary | +0.8 places · 1.0× wins · 16% DNF (field 18%) |
| 🍲 **Home Cooking** `home-cooking` — Well fed, well loved, a little lucky | bronze | team | always on | +8% luck | for good | — | born with it (in the genesis pool), or granted by the Commissionary | +0.3 places · 0.9× wins · 19% DNF (field 18%) |
| 🌱 **Late Bloomers** `late-bloomers` — Find their pace when the race gets long | silver | team | while last 30% of the race | +1% speed | for good | — | born with it (in the genesis pool), or granted by the Commissionary | +0.2 places · 1.1× wins · 18% DNF (field 18%) |
| 🧈 **Butterfingers** `butterfingers` — Something always rolls under the car | silver | team | always on | +15% pit time | for good | — | born with it (in the genesis pool), or granted by the Commissionary | -0.7 places · 0.4× wins · 18% DNF (field 18%) |
| 🏰 **Siege Mentality** `siege-mentality` — Defend the lead at all costs | gold | team | while running top 3 | +3% consistency, −8% crash risk | for good | — | born with it (in the genesis pool), or granted by the Commissionary | +0.6 places · 1.8× wins · 16% DNF (field 18%) |
| 🕳️ **Void-Touched** `void-touched` — Fast, and the Void is watching | gold | team | always on | +2% speed, -15% luck | for good | — | born with it (in the genesis pool), or granted by the Commissionary | +0.8 places · 1.8× wins · 19% DNF (field 18%) |
| 👑 **Dynasty** `dynasty` — Generations of winning, and it shows everywhere | iridium | team | always on | +2% speed, +3% consistency, +5% luck, -5% pit time | for good | — | born with it (in the genesis pool), or granted by the Commissionary | +2.4 places · 2.6× wins · 16% DNF (field 18%) |

## Acquired tags

| Tag | Rarity | Target | Fires | Effect | Lasts | After a race | How you get it |
|---|---|---|---|---|---|---|---|
| 🔥 **Hot Streak** `hot-streak` — Two wins on the bounce. Everything is coming easy. | silver | driver | always on | +2% speed, +5% consistency | 3 races | 15%: gives 🐎 The Charger to themselves | earned: 2 wins in a row |
| 🐎 **The Charger** `the-charger` — Came through the field like it owed them money. Faster in traffic. | silver | driver | while bottom 50% of the field | +3% speed | rest of the season | — | earned: gained 10+ places from the grid and finished top 5; passed on by 🔥 Hot Streak |
| 🛡️ **Unkillable** `unkillable` — Walked away from a wreck and kept racing. Harder to put out now. | silver | driver | always on | −12% crash risk | for good | — | earned: damaged in a crash and still classified in the top 8 |
| 👻 **Haunted** `haunted` — Three retirements in a row. Something followed them home. | gold | driver | always on | -20% luck, +5% crash risk | 4 races | 10%: gives 👻 Haunted to their teammate | inflicted: 3 retirements in a row; passed on by 👻 Haunted |
| 😵 **Shaken** `shaken` — Crashed out last time. The hands are not quite steady yet. | silver | driver | always on | -6% consistency | 2 races | 50%: gives 👊 Bad Blood to whoever they crashed with | inflicted: retired in a crash |
| 👂 **Hears the Track** `hears-the-track` — They say the asphalt talks to them. It has not said anything useful yet. | bronze | driver | always on | — | rest of the season | always: shakes off 😵 Shaken | cosmic: 0.5% lottery per driver per race |
| 🕳️ **Marked by the Void** `marked-by-the-void` — The universe simply decided. Fortune looks the other way for a while. | silver | driver | always on | -10% luck | 2 races | 10%: gives 🕳️ Marked by the Void to a random driver; 10%: wears off | cosmic: 0.3% lottery per driver per race; passed on by 🕳️ Marked by the Void |
| 👊 **Bad Blood** `bad-blood` — Someone is driving angry. Quicker, and less careful about it. | silver | driver | always on | +2% speed, +6% crash risk | 3 races | — | passed on by 😵 Shaken |

## In-race tags

| Tag | Rarity | Target | Fires | Effect | Lasts | After a race | How you get it |
|---|---|---|---|---|---|---|---|
| 🔧 **Damaged** `damaged` — Survived a crash. The car is 15% slower for the rest of the race. | gold | driver | always on | -15% speed | rest of the race | — | mid-race, after surviving a crash |
| 🌀 **Spun** `spun` — Just swapped ends. The next couple of laps are ragged. | silver | driver | always on | -10% consistency | 2 laps | — | mid-race, after a driver error |
| 🔥 **Cooked Tyres** `cooked-tyres` — Past the cliff. Slower until the next stop. | silver | driver | always on | -3% speed | until the next pit stop | — | mid-race, after tyres falling off the cliff |
| 🐢 **Sulking** `sulking` — That stop was slow and everyone knows it. | bronze | driver | always on | -4% consistency | 1 lap | — | mid-race, after a slow pit stop |
| ⚡ **Fired Up** `fired-up` — A lightning stop. The whole crew is buzzing. | bronze | driver | always on | +1% speed | 1 lap | — | mid-race, after a lightning pit stop |

## Rule cards

| Rule card | Scope | Weight | Does |
|---|---|---|---|
| 🌬️ **Grip Weather** `rain` | race | wild | This race favours Aggression and Grip. |
| 🌤️ **Steady Weather** `fog` | race | mild | This race favours Consistency and Pit Crew. |
| ☀️ **Neutral Skies** `clear-skies` | race | mild | No weather favours this race. |
| 🌬️ **Always Grip Weather** `always-raining` | season | wild | Every race favours Aggression and Grip. |
| 🌪️ **Wild Weather** `wild-weather` | season | wild | Neutral skies become rare; every dry weather is as likely. |
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

## Flavour pools

*Names, backstories, quirks. Each is a plain list in the file named; add lines, keep the voice.*

| Pool | Size | Where | Samples |
|---|---|---|---|
| **Driver first names · international (72% of drivers)** | 169 | `src/generators/names.ts INTL_FIRST_NAMES` | James · Mary · William · Sarah · Thomas · Emily · George · Grace |
| **Driver last names · international** | 166 | `src/generators/names.ts INTL_LAST_NAMES` | Smith · Walker · Hughes · Foster · Bennett · Coleman · Hayes · Wells |
| **Driver first names · absurd (17%)** | 64 | `src/generators/names.ts ABSURD_FIRST_NAMES` | Brisket · Sandwich · Crouton · Noodle · Pretzel · Waffle · Dumpling · Peanut |
| **Driver last names · absurd** | 56 | `src/generators/names.ts ABSURD_LAST_NAMES` | Marshall · Lamppost · Sidewalk · Elevator · Hallway · Cubicle · Vestibule · Mezzanine |
| **Driver mononyms (9%)** | 40 | `src/generators/names.ts MONONYMS` | Indigo · Blaze · Nugget · Vesper · Echo · Onyx · Sol · Wren |
| **League names · adjectives ("The ___ Circuit")** | 90 | `src/generators/leagueName.ts LEAGUE_ADJECTIVES` | Molten · Hollow · Furious · Gilded · Fractured · Relentless · Gleaming · Radiant |
| **League names · nouns** | 66 | `src/generators/leagueName.ts LEAGUE_NOUNS` | Circuit · Grand Prix · Compact · Order · Assembly · Commission · Collective · Championship |
| **Driver backstory templates ({slot} fills below)** | 15 | `src/generators/drivers.ts BACKSTORY_TEMPLATES` | Appeared one day in the {place}. Nobody asked questions. · Claims to have been born {age} ago in {location}. Records say otherwise. · Found driving a {vehicle} through {place} with no explanation. · Woke up one morning knowing how to race. Previously was a {profession}. |
| **Backstory fills (21 slots)** | 115 | `src/generators/drivers.ts BACKSTORY_FILLS` | {place}: the parking lot / aisle 7 / the storage unit · {age}: several Tuesdays / an undisclosed amount of time / 47 minutes · {location}: a place that no longer exists / somewhere overhead / the back of a receipt · {vehicle}: a shopping cart / a office chair / a moving walkway |
| **Driver quirks** | 25 | `src/generators/drivers.ts QUIRKS` | Only races during approved hours · Their car makes a sound no one can describe · Technically two drivers in an agreement · Receives instructions from somewhere · Has never been photographed from the left |
| **Car quirks** | 24 | `src/generators/cars.ts CAR_QUIRKS` | The engine hums at a frequency only dogs can hear. · Assembled entirely on a Tuesday. Nobody knows why that matters. · The previous owner was a time traveler. Probably. · Handles corners like it knows something you don't. |
| **Car name parts (prefix · suffix · acronym)** | 71 | `src/generators/cars.ts CAR_PREFIXES_GENERIC / CAR_SUFFIXES / CAR_ACRONYMS` | Apex · Vector · Pulse · GT · RS · LM · XR · GT · RS |
| **Procedural team emoji** | 48 | `src/generators/teamIdentity.ts IDENTITY_EMOJI` | 🦆 · 🔥 · 🦂 · 🐙 · 🦅 · 🐊 · 🦊 · 🐺 · 🦉 · 🦇 |
