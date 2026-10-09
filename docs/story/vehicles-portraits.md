# Car vehicles + driver portraits

*📻 Radio with Pax, Oct 9, 2026 ([Car vehicles + driver portraits](https://github.com/GrizzlyPax/Parabolica/issues/488)). Hub builds it ([#489](https://github.com/GrizzlyPax/Parabolica/issues/489)). Mock-up: [Cars and Portraits](https://claude.ai/artifact/Gy74b53hd5N9d3Rc2R9ETk).*

## TL;DR
- **Every rack car rolls a vehicle icon and every driver a portrait icon at genesis.** Shown in the team colour, no box, in the Paddock, the draft board and the race driver panel. Undrafted drivers and cars show it in white.
- **90% normal** (Pax): race cars and racing helmets almost always. The other 10% is road/works vehicles and paddock faces (8%), plus rare oddballs (2%).
- **Per season** (10 teams = 30 drivers, 10 cars): about **3 drivers** without a helmet (usually a cap or mustache) and about **1 car** that isn't a race car. Pax: "one or two per season, maybe a couple more."
- **Gloves on:** tanks, emergency vehicles, wagons and every fantasy or horror face are **held back for themed decks** ([#485](https://github.com/GrizzlyPax/Parabolica/issues/485)).
- **Logo picker swap:** `f1-car` becomes the car icon, so it leaves the team-creator logo picker; `speed-boat` replaces it.

## Vehicles (weights sum to 100)
| Tier | Icon | Weight |
|---|---|---|
| Race car | [`f1-car`](https://game-icons.net/1x1/skoll/f1-car.html) | 90 |
| Road + works | [`city-car`](https://game-icons.net/1x1/delapouite/city-car.html) | 1 |
| Road + works | [`jeep`](https://game-icons.net/1x1/delapouite/jeep.html) | 1 |
| Road + works | [`truck`](https://game-icons.net/1x1/delapouite/truck.html) | 1 |
| Road + works | [`tow-truck`](https://game-icons.net/1x1/delapouite/tow-truck.html) | 1 |
| Road + works | [`farm-tractor`](https://game-icons.net/1x1/delapouite/farm-tractor.html) | 1 |
| Road + works | [`food-truck`](https://game-icons.net/1x1/delapouite/food-truck.html) | 1 |
| Road + works | [`surfer-van`](https://game-icons.net/1x1/delapouite/surfer-van.html) | 0.5 |
| Road + works | [`bus`](https://game-icons.net/1x1/delapouite/bus.html) | 0.5 |
| Road + works | [`steamroller`](https://game-icons.net/1x1/caro-asercion/steamroller.html) | 0.5 |
| Road + works | [`caravan`](https://game-icons.net/1x1/delapouite/caravan.html) | 0.25 |
| Road + works | [`forklift`](https://game-icons.net/1x1/delapouite/forklift.html) | 0.25 |
| Rare oddballs | [`kick-scooter`](https://game-icons.net/1x1/delapouite/kick-scooter.html) | 0.4 |
| Rare oddballs | [`dutch-bike`](https://game-icons.net/1x1/delapouite/dutch-bike.html) | 0.4 |
| Rare oddballs | [`aero-bike`](https://game-icons.net/1x1/delapouite/aero-bike.html) | 0.4 |
| Rare oddballs | [`unicycle`](https://game-icons.net/1x1/delapouite/unicycle.html) | 0.2 |
| Rare oddballs | [`shopping-cart`](https://game-icons.net/1x1/delapouite/shopping-cart.html) | 0.2 |
| Rare oddballs | [`mine-truck`](https://game-icons.net/1x1/delapouite/mine-truck.html) | 0.2 |
| Rare oddballs | [`bulldozer`](https://game-icons.net/1x1/delapouite/bulldozer.html) | 0.2 |

**Held back for themed decks:** [`tank`](https://game-icons.net/1x1/lorc/tank.html), [`battle-tank`](https://game-icons.net/1x1/lorc/battle-tank.html), [`ambulance`](https://game-icons.net/1x1/delapouite/ambulance.html), [`police-car`](https://game-icons.net/1x1/delapouite/police-car.html), [`chariot`](https://game-icons.net/1x1/cathelineau/chariot.html), [`old-wagon`](https://game-icons.net/1x1/delapouite/old-wagon.html), [`steam-locomotive`](https://game-icons.net/1x1/delapouite/steam-locomotive.html), [`coal-wagon`](https://game-icons.net/1x1/delapouite/coal-wagon.html), [`mine-wagon`](https://game-icons.net/1x1/delapouite/mine-wagon.html).

**Not used:** [`race-car`](https://game-icons.net/1x1/skoll/race-car.html) (Tinplate's team logo) and [`scooter`](https://game-icons.net/1x1/delapouite/scooter.html) (Brisa's), so a car never looks like a team.

## Portraits (weights sum to 100)
| Tier | Icon | Weight |
|---|---|---|
| Racing helmet | [`full-motorcycle-helmet`](https://game-icons.net/1x1/delapouite/full-motorcycle-helmet.html) | 90 |
| Paddock faces + hats | [`billed-cap`](https://game-icons.net/1x1/delapouite/billed-cap.html) | 2 |
| Paddock faces + hats | [`plane-pilot`](https://game-icons.net/1x1/delapouite/plane-pilot.html) | 1.5 |
| Paddock faces + hats | [`mustache`](https://game-icons.net/1x1/delapouite/mustache.html) | 1 |
| Paddock faces + hats | [`sunglasses`](https://game-icons.net/1x1/delapouite/sunglasses.html) | 1 |
| Paddock faces + hats | [`beard`](https://game-icons.net/1x1/lorc/beard.html) | 0.5 |
| Paddock faces + hats | [`western-hat`](https://game-icons.net/1x1/delapouite/western-hat.html) | 0.5 |
| Paddock faces + hats | [`steampunk-goggles`](https://game-icons.net/1x1/delapouite/steampunk-goggles.html) | 0.5 |
| Paddock faces + hats | [`outback-hat`](https://game-icons.net/1x1/delapouite/outback-hat.html) | 0.25 |
| Paddock faces + hats | [`winter-hat`](https://game-icons.net/1x1/delapouite/winter-hat.html) | 0.25 |
| Paddock faces + hats | [`skimmer-hat`](https://game-icons.net/1x1/delapouite/skimmer-hat.html) | 0.25 |
| Paddock faces + hats | [`captain-hat-profile`](https://game-icons.net/1x1/delapouite/captain-hat-profile.html) | 0.25 |
| Rare oddballs | [`baby-face`](https://game-icons.net/1x1/delapouite/baby-face.html) | 0.4 |
| Rare oddballs | [`astronaut-helmet`](https://game-icons.net/1x1/delapouite/astronaut-helmet.html) | 0.4 |
| Rare oddballs | [`diving-helmet`](https://game-icons.net/1x1/delapouite/diving-helmet.html) | 0.4 |
| Rare oddballs | [`mining-helmet`](https://game-icons.net/1x1/delapouite/mining-helmet.html) | 0.4 |
| Rare oddballs | [`flower-hat`](https://game-icons.net/1x1/delapouite/flower-hat.html) | 0.2 |
| Rare oddballs | [`party-hat`](https://game-icons.net/1x1/delapouite/party-hat.html) | 0.2 |

**Held back for themed decks:** [`dwarf-face`](https://game-icons.net/1x1/delapouite/dwarf-face.html), [`pig-face`](https://game-icons.net/1x1/lorc/pig-face.html), [`bear-face`](https://game-icons.net/1x1/sparker/bear-face.html), [`monk-face`](https://game-icons.net/1x1/delapouite/monk-face.html), [`nun-face`](https://game-icons.net/1x1/cathelineau/nun-face.html), [`doctor-face`](https://game-icons.net/1x1/lorc/doctor-face.html), [`clown`](https://game-icons.net/1x1/delapouite/clown.html), [`cyborg-face`](https://game-icons.net/1x1/delapouite/cyborg-face.html), [`witch-face`](https://game-icons.net/1x1/cathelineau/witch-face.html), [`wizard-face`](https://game-icons.net/1x1/delapouite/wizard-face.html), [`ninja-head`](https://game-icons.net/1x1/darkzaitzev/ninja-head.html), [`pirate-hat`](https://game-icons.net/1x1/delapouite/pirate-hat.html), [`viking-helmet`](https://game-icons.net/1x1/delapouite/viking-helmet.html), [`samurai-helmet`](https://game-icons.net/1x1/delapouite/samurai-helmet.html), [`spartan-helmet`](https://game-icons.net/1x1/delapouite/spartan-helmet.html), [`visored-helm`](https://game-icons.net/1x1/lorc/visored-helm.html), [`plague-doctor-profile`](https://game-icons.net/1x1/delapouite/plague-doctor-profile.html), [`hooded-figure`](https://game-icons.net/1x1/darkzaitzev/hooded-figure.html), [`executioner-hood`](https://game-icons.net/1x1/delapouite/executioner-hood.html), [`brodie-helmet`](https://game-icons.net/1x1/skoll/brodie-helmet.html), [`robot-helmet`](https://game-icons.net/1x1/delapouite/robot-helmet.html).

**Cut (Pax):** [`helmet`](https://game-icons.net/1x1/sbed/helmet.html), illegible and not a racing helmet. Also passed: `helmet-head-shot` (reads as an explosion), `american-football-helmet` (another sport), `top-hat` (already Mister Marbles in the UI).

## Rules for the builder (#489)
1. **Roll at genesis**, one weighted draw per driver (portrait) and per car (vehicle), from the tables above. Store nothing new in saves: the icon re-derives from the seed, so it never changes mid-season (Pit, Oct 9, per #489).
2. **Seed stream:** the icons' own stream (e.g. `deriveSeed(seed, 'icons')`, per #489), never the stats stream, so adding icons never changes stats or the fingerprint.
3. **Colour:** the owning team's primary, `currentColor`, no tile or badge. Undrafted = white. Rivals follow the info rule (their colour on their own marks).
4. **Size:** at least **20px**. Vehicles are wide silhouettes, so `f1-car` gets thin below 20px; car rows can go to 24–26px.
5. **Credits:** vendor all icons (including the held-back ones only when a themed deck uses them) through the icon registry, so World Deck → Credits lists their authors.
6. **The helmet is shared on purpose:** `full-motorcycle-helmet` already means "driver" in the [icon map](../ICONS.md). Portraits use the same icon, which is consistent.

## Knock-on: team-creator logo picker
`f1-car` leaves the 20-icon logo picker in [team-identity](team-identity.md) and [`speed-boat`](https://game-icons.net/1x1/delapouite/speed-boat.html) takes its place (Machines). No other change.
