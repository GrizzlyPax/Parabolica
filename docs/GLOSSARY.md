# Parabolica World Deck

*Everything in the sim and the world, generated from the data modules by `npm run glossary` — do not edit by hand; edit the source files named in each section and re-run. Engine v0.7.1. How to add content: docs/WORLD_DECK.md.*

28 teams · 6 tracks · 94 cards (36 traits · 36 gear · 22 effects) · 5 in-race effects · 12 rule cards · 6 weathers

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

*Source: `src/data/deckTracks.ts` (docs/TRACKS_WEATHER.md). Six stat-combo tracks; each favours one driver stat and one car/team stat for the race, field-wide (+10 grade points, through the card math at race build). Each has a tyre-wear dial (#536): wear per tick × `tyreWear`. Every race and season calendar draws from these; the 31 themed circuits, track events and track characters retired with Tracks & Weather v2.*

| Track | Favours | Tyre wear | Layout |
|---|---|---|---|
| **Speed + Power** `speed-power` | +10 Speed · +10 Power | ×0.85 | power |
| **Consistency + Grip** `consistency-grip` | +10 Consistency · +10 Grip | ×1.1 | technical |
| **Aggression + Reliability** `aggression-reliability` | +10 Aggression · +10 Reliability | ×1 | street |
| **Endurance + Tyre Management** `endurance-tyre-management` | +10 Endurance · +10 Tyre Management | ×1.25 | flowing |
| **Acceleration + Pit Crew** `acceleration-pit-crew` | +10 Acceleration · +10 Pit Crew | ×1.15 | modern |
| **Luck + Reliability** `luck-reliability` | +10 Luck · +10 Reliability | ×0.95 | classic |

## Weather

*Source: `src/data/deckWeather.ts`. Neutral + five dry weathers, favours (grade points) × intensity, stacking with the track. No rain until Wet arrives in v0.6; the old weathers and the inflictions retired (the inflictions are parked as Horror-deck material).*

| Weather | Odds | Favours |
|---|---|---|
| **Neutral** `neutral` | 60% | — |
| **Speed + Tyre Management** `speed-tyre-management` | 8% | +10 Speed · +10 Tyre Management |
| **Consistency + Pit Crew** `consistency-pit-crew` | 8% | +10 Consistency · +10 Pit Crew |
| **Acceleration + Reliability** `acceleration-reliability` | 8% | +10 Acceleration · +10 Reliability |
| **Endurance + Power** `endurance-power` | 8% | +10 Endurance · +10 Power |
| **Aggression + Grip** `aggression-grip` | 8% | +10 Aggression · +10 Grip |


## How genesis traits are rolled

Each driver gets three slots: driver, car (their own chassis), team (one roll, shared by teammates). Per slot:

1. **Does it hit?** 1 in 6.
2. **Which metal?** 60% bronze · 30% silver · 9% gold · 1% iridium. Fixed odds — adding cards to a metal never changes how often it comes up, only which card you get.
3. **Which card?** An even pick among that metal's trait cards for the slot. An empty metal falls to the next more common one.

A card adds grade points to its stats at race build (src/cards/apply.ts): bronze 1 stat × +5 · silver 1 stat × +10 · gold 2 stats × +10 · iridium 3 stats × +15. Rule cards change the hit chance and the odds. Season Mode deals gear from packs the same way (docs/CARDS.md).

## The Motorsport deck

*Source: `src/cards/deck.ts` (docs/CARDS.md), generated from the stat grid. Traits are born with (genesis); gear (equipment, upgrades, facilities) comes from packs; effects are one-race modifiers.*

| Card | Kind | On | Metal | Does |
|---|---|---|---|---|
| **Bronze Speed** `eq-bronze-speed` | equipment | driver | bronze | +5 Speed |
| **Bronze Consistency** `eq-bronze-consistency` | equipment | driver | bronze | +5 Consistency |
| **Bronze Luck** `eq-bronze-luck` | equipment | driver | bronze | +5 Luck |
| **Bronze Acceleration** `eq-bronze-acceleration` | equipment | driver | bronze | +5 Acceleration |
| **Bronze Endurance** `eq-bronze-endurance` | equipment | driver | bronze | +5 Endurance |
| **Bronze Aggression** `eq-bronze-aggression` | equipment | driver | bronze | +5 Aggression |
| **Silver Speed** `eq-silver-speed` | equipment | driver | silver | +10 Speed |
| **Silver Consistency** `eq-silver-consistency` | equipment | driver | silver | +10 Consistency |
| **Silver Luck** `eq-silver-luck` | equipment | driver | silver | +10 Luck |
| **Silver Acceleration** `eq-silver-acceleration` | equipment | driver | silver | +10 Acceleration |
| **Silver Endurance** `eq-silver-endurance` | equipment | driver | silver | +10 Endurance |
| **Silver Aggression** `eq-silver-aggression` | equipment | driver | silver | +10 Aggression |
| **Gold Speed + Consistency** `eq-gold-speed+consistency` | equipment | driver | gold | +10 Speed · +10 Consistency |
| **Gold Consistency + Luck** `eq-gold-consistency+luck` | equipment | driver | gold | +10 Consistency · +10 Luck |
| **Gold Luck + Acceleration** `eq-gold-luck+acceleration` | equipment | driver | gold | +10 Luck · +10 Acceleration |
| **Gold Acceleration + Endurance** `eq-gold-acceleration+endurance` | equipment | driver | gold | +10 Acceleration · +10 Endurance |
| **Gold Endurance + Aggression** `eq-gold-endurance+aggression` | equipment | driver | gold | +10 Endurance · +10 Aggression |
| **Gold Aggression + Speed** `eq-gold-aggression+speed` | equipment | driver | gold | +10 Aggression · +10 Speed |
| **Iridium Speed + Acceleration + Aggression** `eq-iridium-speed+acceleration+aggression` | equipment | driver | iridium | +15 Speed · +15 Acceleration · +15 Aggression |
| **Iridium Consistency + Endurance + Luck** `eq-iridium-consistency+endurance+luck` | equipment | driver | iridium | +15 Consistency · +15 Endurance · +15 Luck |
| **Bronze Power** `up-bronze-power` | upgrade | car | bronze | +5 Power |
| **Bronze Grip** `up-bronze-grip` | upgrade | car | bronze | +5 Grip |
| **Bronze Reliability** `up-bronze-reliability` | upgrade | car | bronze | +5 Reliability |
| **Silver Power** `up-silver-power` | upgrade | car | silver | +10 Power |
| **Silver Grip** `up-silver-grip` | upgrade | car | silver | +10 Grip |
| **Silver Reliability** `up-silver-reliability` | upgrade | car | silver | +10 Reliability |
| **Gold Power + Grip** `up-gold-power+grip` | upgrade | car | gold | +10 Power · +10 Grip |
| **Gold Grip + Reliability** `up-gold-grip+reliability` | upgrade | car | gold | +10 Grip · +10 Reliability |
| **Gold Reliability + Power** `up-gold-reliability+power` | upgrade | car | gold | +10 Reliability · +10 Power |
| **Iridium Power + Grip + Reliability** `up-iridium-power+grip+reliability` | upgrade | car | iridium | +15 Power · +15 Grip · +15 Reliability |
| **Bronze Tyre Management** `fa-bronze-tyre-management` | facility | team | bronze | +5 Tyre Management |
| **Bronze Pit Crew** `fa-bronze-pit-crew` | facility | team | bronze | +5 Pit Crew |
| **Silver Tyre Management** `fa-silver-tyre-management` | facility | team | silver | +10 Tyre Management |
| **Silver Pit Crew** `fa-silver-pit-crew` | facility | team | silver | +10 Pit Crew |
| **Gold Tyre Management + Pit Crew** `fa-gold-tyre-management+pit-crew` | facility | team | gold | +10 Tyre Management · +10 Pit Crew |
| **Iridium Tyre Management + Pit Crew** `fa-iridium-tyre-management+pit-crew` | facility | team | iridium | +15 Tyre Management · +15 Pit Crew |
| **Bronze Speed** `tr-driver-bronze-speed` | trait | driver | bronze | +5 Speed |
| **Bronze Consistency** `tr-driver-bronze-consistency` | trait | driver | bronze | +5 Consistency |
| **Bronze Luck** `tr-driver-bronze-luck` | trait | driver | bronze | +5 Luck |
| **Bronze Acceleration** `tr-driver-bronze-acceleration` | trait | driver | bronze | +5 Acceleration |
| **Bronze Endurance** `tr-driver-bronze-endurance` | trait | driver | bronze | +5 Endurance |
| **Bronze Aggression** `tr-driver-bronze-aggression` | trait | driver | bronze | +5 Aggression |
| **Silver Speed** `tr-driver-silver-speed` | trait | driver | silver | +10 Speed |
| **Silver Consistency** `tr-driver-silver-consistency` | trait | driver | silver | +10 Consistency |
| **Silver Luck** `tr-driver-silver-luck` | trait | driver | silver | +10 Luck |
| **Silver Acceleration** `tr-driver-silver-acceleration` | trait | driver | silver | +10 Acceleration |
| **Silver Endurance** `tr-driver-silver-endurance` | trait | driver | silver | +10 Endurance |
| **Silver Aggression** `tr-driver-silver-aggression` | trait | driver | silver | +10 Aggression |
| **Gold Speed + Consistency** `tr-driver-gold-speed+consistency` | trait | driver | gold | +10 Speed · +10 Consistency |
| **Gold Consistency + Luck** `tr-driver-gold-consistency+luck` | trait | driver | gold | +10 Consistency · +10 Luck |
| **Gold Luck + Acceleration** `tr-driver-gold-luck+acceleration` | trait | driver | gold | +10 Luck · +10 Acceleration |
| **Gold Acceleration + Endurance** `tr-driver-gold-acceleration+endurance` | trait | driver | gold | +10 Acceleration · +10 Endurance |
| **Gold Endurance + Aggression** `tr-driver-gold-endurance+aggression` | trait | driver | gold | +10 Endurance · +10 Aggression |
| **Gold Aggression + Speed** `tr-driver-gold-aggression+speed` | trait | driver | gold | +10 Aggression · +10 Speed |
| **Iridium Speed + Acceleration + Aggression** `tr-driver-iridium-speed+acceleration+aggression` | trait | driver | iridium | +15 Speed · +15 Acceleration · +15 Aggression |
| **Iridium Consistency + Endurance + Luck** `tr-driver-iridium-consistency+endurance+luck` | trait | driver | iridium | +15 Consistency · +15 Endurance · +15 Luck |
| **Bronze Power** `tr-car-bronze-power` | trait | car | bronze | +5 Power |
| **Bronze Grip** `tr-car-bronze-grip` | trait | car | bronze | +5 Grip |
| **Bronze Reliability** `tr-car-bronze-reliability` | trait | car | bronze | +5 Reliability |
| **Silver Power** `tr-car-silver-power` | trait | car | silver | +10 Power |
| **Silver Grip** `tr-car-silver-grip` | trait | car | silver | +10 Grip |
| **Silver Reliability** `tr-car-silver-reliability` | trait | car | silver | +10 Reliability |
| **Gold Power + Grip** `tr-car-gold-power+grip` | trait | car | gold | +10 Power · +10 Grip |
| **Gold Grip + Reliability** `tr-car-gold-grip+reliability` | trait | car | gold | +10 Grip · +10 Reliability |
| **Gold Reliability + Power** `tr-car-gold-reliability+power` | trait | car | gold | +10 Reliability · +10 Power |
| **Iridium Power + Grip + Reliability** `tr-car-iridium-power+grip+reliability` | trait | car | iridium | +15 Power · +15 Grip · +15 Reliability |
| **Bronze Tyre Management** `tr-team-bronze-tyre-management` | trait | team | bronze | +5 Tyre Management |
| **Bronze Pit Crew** `tr-team-bronze-pit-crew` | trait | team | bronze | +5 Pit Crew |
| **Silver Tyre Management** `tr-team-silver-tyre-management` | trait | team | silver | +10 Tyre Management |
| **Silver Pit Crew** `tr-team-silver-pit-crew` | trait | team | silver | +10 Pit Crew |
| **Gold Tyre Management + Pit Crew** `tr-team-gold-tyre-management+pit-crew` | trait | team | gold | +10 Tyre Management · +10 Pit Crew |
| **Iridium Tyre Management + Pit Crew** `tr-team-iridium-tyre-management+pit-crew` | trait | team | iridium | +15 Tyre Management · +15 Pit Crew |
| **Speed Up** `ef-speed-up` | effect | driver | — | Speed up |
| **Speed Down** `ef-speed-down` | effect | driver | — | Speed down |
| **Consistency Up** `ef-consistency-up` | effect | driver | — | Consistency up |
| **Consistency Down** `ef-consistency-down` | effect | driver | — | Consistency down |
| **Luck Up** `ef-luck-up` | effect | driver | — | Luck up |
| **Luck Down** `ef-luck-down` | effect | driver | — | Luck down |
| **Acceleration Up** `ef-acceleration-up` | effect | driver | — | Acceleration up |
| **Acceleration Down** `ef-acceleration-down` | effect | driver | — | Acceleration down |
| **Endurance Up** `ef-endurance-up` | effect | driver | — | Endurance up |
| **Endurance Down** `ef-endurance-down` | effect | driver | — | Endurance down |
| **Aggression Up** `ef-aggression-up` | effect | driver | — | Aggression up |
| **Aggression Down** `ef-aggression-down` | effect | driver | — | Aggression down |
| **Power Up** `ef-power-up` | effect | car | — | Power up |
| **Power Down** `ef-power-down` | effect | car | — | Power down |
| **Grip Up** `ef-grip-up` | effect | car | — | Grip up |
| **Grip Down** `ef-grip-down` | effect | car | — | Grip down |
| **Reliability Up** `ef-reliability-up` | effect | car | — | Reliability up |
| **Reliability Down** `ef-reliability-down` | effect | car | — | Reliability down |
| **Tyre Management Up** `ef-tyre-management-up` | effect | team | — | Tyre Management up |
| **Tyre Management Down** `ef-tyre-management-down` | effect | team | — | Tyre Management down |
| **Pit Crew Up** `ef-pit-crew-up` | effect | team | — | Pit Crew up |
| **Pit Crew Down** `ef-pit-crew-down` | effect | team | — | Pit Crew down |

## In-race effects

*Source: `src/RaceEngine.ts` IN_RACE_EFFECTS. Timed states a race puts on a car; they show in the timing tower and the feed and expire on their own.*

| Effect | After | Does | Lasts |
|---|---|---|---|
| 🔧 **Damaged** `damaged` — limps on with a damaged car | surviving a crash | -15% speed | rest of the race |
| 🌀 **Spun** `spun` — is rattled after the spin | a driver error (Spin) | -10% consistency | 2 laps |
| 🔥 **Cooked Tyres** `cooked-tyres` — is nursing cooked tyres to the pits | tyres falling off the cliff | -3% speed | until the next pit stop |
| 🐢 **Sulking** `sulking` — is sulking about that stop | a slow pit stop | -4% consistency | 1 lap |
| ⚡ **Fired Up** `fired-up` — is fired up after a lightning stop | a lightning pit stop | +1% speed | 1 lap |

## Rule cards

| Rule card | Scope | Weight | Does |
|---|---|---|---|
| 🌬️ **Crosswind** `rain` | race | wild | This race favours Aggression and Grip. |
| 🌤️ **Overcast** `fog` | race | mild | This race favours Consistency and Pit Crew. |
| ☀️ **Calm** `clear-skies` | race | mild | No weather favours this race. |
| 🌬️ **Windswept** `always-raining` | season | wild | Every race favours Aggression and Grip. |
| 🌪️ **Changeable** `wild-weather` | season | wild | Neutral skies become rare; every dry weather is as likely. |
| 🍲 **Trait Soup** `tag-soup` | both | wild | Most slots (driver, car, team) are born with a trait card. |
| 🧼 **No Traits** `no-tags` | both | mild | Nobody is born with a trait card. |
| 💥 **Demolition Derby** `demolition-derby` | both | cursed | Crashes 2.5× more likely. |
| 🧨 **Unreliable Cars** `unreliable-cars` | both | cursed | Engines fail 3× as often. |
| 🪨 **Tough Tyres** `tough-tyres` | both | mild | Tyres wear half as fast. Fewer stops. |
| 🏎️ **Fast Pit Crews** `fast-pit-crews` | both | mild | Pit stops 25% quicker; fewer fumbled stops. |
| 🔓 **No Pit Rules** `no-pit-rules` | both | wild | No minimum stops, no compound rule. Anything goes. |

## Flavour pools

*Names, backstories, quirks. Each is a plain list in the file named; add lines, keep the voice.*

| Pool | Size | Where | Samples |
|---|---|---|---|
| **Driver first names · American (80% of drivers have a real name; each half is American 80% of the time)** | 104 | `src/generators/names.ts US_FIRST_NAMES` | Tyler · Megan · Brandon · Ashley · Jake · Kayla · Cody · Dustin |
| **Driver last names · American** | 89 | `src/generators/names.ts US_LAST_NAMES` | Johnson · Williams · Brown · Jones · Miller · Davis · Wilson · Anderson |
| **Driver first names · international (the other 20% of each real half)** | 257 | `src/generators/names.ts INTL_FIRST_NAMES` | Mateo · Sofía · Santiago · Valentina · Diego · Camila · Alejandro · Lucía |
| **Driver last names · international** | 254 | `src/generators/names.ts INTL_LAST_NAMES` | García · Martínez · Rodríguez · López · González · Hernández · Ramírez · Torres |
| **Driver first names · absurd (2% both halves, 16% one half on a real name; 1% of all names show as one word)** | 84 | `src/generators/names.ts ABSURD_FIRST_NAMES` | Brisket · Sandwich · Crouton · Noodle · Pretzel · Waffle · Dumpling · Peanut |
| **Driver last names · absurd** | 74 | `src/generators/names.ts ABSURD_LAST_NAMES` | Marshall · Lamppost · Sidewalk · Elevator · Hallway · Cubicle · Vestibule · Mezzanine |
| **League names · adjectives ("The ___ Circuit")** | 110 | `src/generators/leagueName.ts LEAGUE_ADJECTIVES` | Molten · Hollow · Furious · Gilded · Fractured · Relentless · Gleaming · Radiant |
| **League names · nouns** | 86 | `src/generators/leagueName.ts LEAGUE_NOUNS` | Circuit · Grand Prix · Compact · Order · Assembly · Commission · Collective · Championship |
| **Driver backstory templates ({slot} fills below)** | 15 | `src/generators/drivers.ts BACKSTORY_TEMPLATES` | Appeared one day in the {place}. Nobody asked questions. · Claims to have been born {age} ago in {location}. Records say otherwise. · Found driving a {vehicle} through {place} with no explanation. · Woke up one morning knowing how to race. Previously was a {profession}. |
| **Backstory fills (21 slots)** | 115 | `src/generators/drivers.ts BACKSTORY_FILLS` | {place}: the parking lot / aisle 7 / the storage unit · {age}: several Tuesdays / an undisclosed amount of time / 47 minutes · {location}: a place that no longer exists / somewhere overhead / the back of a receipt · {vehicle}: a shopping cart / a office chair / a moving walkway |
| **Driver quirks** | 25 | `src/generators/drivers.ts QUIRKS` | Only races during approved hours · Their car makes a sound no one can describe · Technically two drivers in an agreement · Receives instructions from somewhere · Has never been photographed from the left |
| **Car quirks** | 24 | `src/generators/cars.ts CAR_QUIRKS` | The engine hums at a frequency only dogs can hear. · Assembled entirely on a Tuesday. Nobody knows why that matters. · The previous owner was a time traveler. Probably. · Handles corners like it knows something you don't. |
| **Car names · a sample rack (people 35 · heritage 20 · nicknames 20 · codes 15 · household 10)** | 100 | `src/generators/cars.ts generateCarName (docs/story/car-names.md)` | Competition 22 · The Mule · The Wedge · The Lump · Tin Lizzie · Sylvia · Moorland 1100 · Mavis III · Washboard · Series '75 |
| **Car names · people's names** | 40 | `src/generators/cars.ts CAR_PEOPLE_NAMES` | Bessie · Margaret · Doris · Mabel · Agnes · Edna · Peggy · Rosie |
| **Car names · workshop nicknames** | 28 | `src/generators/cars.ts CAR_NICKNAMES` | The Brick · Old Faithful · The Bathtub · The Toaster · The Biscuit Tin · The Wardrobe |
| **Car names · farm and household words** | 20 | `src/generators/cars.ts CAR_HOUSEHOLD` | Teapot · Wheelbarrow · Hayrick · Colander · Doorstop · Mangle |
| **Procedural team emoji** | 48 | `src/generators/teamIdentity.ts IDENTITY_EMOJI` | 🦆 · 🔥 · 🦂 · 🐙 · 🦅 · 🐊 · 🦊 · 🐺 · 🦉 · 🦇 |
