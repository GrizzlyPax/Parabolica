# Team identity: the base-deck grid

*📻 Radio with Pax, Oct 8, 2026. **Not canon** until Pax moves it into [the bible](../STORY_BIBLE.md); Pax approved this grid "for now" as the starting point. Working board (stars, the 10-team race check, icon shelves): [Team Logo Scouting](https://claude.ai/artifact/QztBfCMQSzmLa99ptQrXWL). Design rules: [ICONS.md](../ICONS.md).*

## TL;DR
- **28 new base-deck teams replace the 22 pun teams** (For Rory, Breadbowl…). They are **world factions of Parabolica**, traditional-motorsport flavoured, **seven of each kind**: works manufacturers · privateer garages · family dynasties · regional/city teams.
- **Each team is three things: an icon, a primary colour, one line.** The logo is the icon on the primary colour, no badge. The icon is drawn in white or near-black, whichever reads on that colour (stored as `secondaryColor` so `<TeamLogo>` just works).
- **No two teams share a colour.** The 28 colours are spread as far apart as the dark UI allows. Only two are light (Cream, Silver), because pale colours blur together on black (Pax).
- **The strangeness is a hint:** straight motorsport with one odd house rule or ritual per team. **Folk custom, not ghost story.** Pax kept the rituals (clocks set slow, seven bolts, the empty chair) and passed on the openly supernatural (an ageless priest, a coin from the future).

## Decisions (Pax, Oct 8)
- **Who the teams are:** world factions, in-universe. Away from the old F1-flavoured puns.
- **Count:** about 30. Pax starred exactly 28 over two name rounds, 7 per kind; Radio recommends staying at 28.
- **Names:** a mix of founder surnames, invented marques and place names, like a real grid.
- **Places** (Lumen, Corriva, Saint Orrin…) are invented and **soft canon**: they'll become story canon later, and the tracks get rethemed to match down the road.
- **Per team:** icon + primary colour + one line. That's enough to start a grid.
- **Colours:** spread evenly across 28 with no overlaps, and not too many light/white/yellow ones.

## The grid
### Works manufacturers

| Team | id | Colour | Primary | Icon (ink) | Icon | Line |
|---|---|---|---|---|---|---|
| **Vantor Motorwerke** | `vantor-motorwerke` | Rosso | `#E8242F` | `#FFFFFF` | [`charging-bull`](https://game-icons.net/1x1/delapouite/charging-bull.html) | Industrial giant. Every car is built on the same night of the year. |
| **Halcyon** | `halcyon` | Cobalt | `#006EBE` | `#FFFFFF` | [`eagle-emblem`](https://game-icons.net/1x1/lorc/eagle-emblem.html) | Grand tourers. No Halcyon has ever been sold; they are only raced. |
| **Orsa** | `orsa` | Petrol | `#087C77` | `#FFFFFF` | [`bear-head`](https://game-icons.net/1x1/delapouite/bear-head.html) | Northern marque. The factory clocks run eleven minutes slow, by policy. |
| **Corvane** | `corvane` | Violet | `#9B8AFE` | `#0A0A0C` | [`raven`](https://game-icons.net/1x1/lorc/raven.html) | Luxury house. The badge was redrawn after the founder dreamed it. |
| **Calloway** | `calloway` | Cream | `#F4EEDE` | `#0A0A0C` | [`steering-wheel`](https://game-icons.net/1x1/delapouite/steering-wheel.html) | Every Calloway is road-tested on the same nine miles of road, at dawn. |
| **Brisa** | `brisa` | Cyan | `#0BAEE0` | `#FFFFFF` | [`scooter`](https://game-icons.net/1x1/delapouite/scooter.html) | Scooter maker gone racing. Every car leaves the factory with a full tank and a bell. |
| **Arden** | `arden` | Amber | `#FFB000` | `#0A0A0C` | [`pocket-watch`](https://game-icons.net/1x1/skoll/pocket-watch.html) | Clocks and engines in the same building. Both are wound by hand on Mondays. |

### Privateer garages

| Team | id | Colour | Primary | Icon (ink) | Icon | Line |
|---|---|---|---|---|---|---|
| **Seven Bolt Racing** | `seven-bolt-racing` | Crimson | `#C31851` | `#FFFFFF` | [`hexagonal-nut`](https://game-icons.net/1x1/delapouite/hexagonal-nut.html) | Every wheel has seven bolts. Nobody remembers why. |
| **Low Tide Racing** | `low-tide-racing` | Aqua | `#1BB4B8` | `#FFFFFF` | [`anchor`](https://game-icons.net/1x1/lorc/anchor.html) | The garage sits below the tideline. They work between tides. |
| **Kiln Lane Motorsport** | `kiln-lane-motorsport` | Saddle | `#945F0E` | `#FFFFFF` | [`anvil`](https://game-icons.net/1x1/badges/anvil.html) | Brick sheds and a forge. The engine is started with a match. |
| **Tinplate** | `tinplate` | Silver | `#B6BBC1` | `#0A0A0C` | [`race-car`](https://game-icons.net/1x1/skoll/race-car.html) | A car that looks like a toy and is faster than it should be. |
| **Ostler & Finch** | `ostler-finch` | Bronze | `#B47B46` | `#FFFFFF` | [`horse-head`](https://game-icons.net/1x1/delapouite/horse-head.html) | Was a coaching inn. The stable doors still get locked at night. |
| **Cinder Row** | `cinder-row` | Slate | `#718295` | `#FFFFFF` | [`poker-hand`](https://game-icons.net/1x1/lorc/poker-hand.html) | Six garages on one street share one car. Who drives is settled by a card game. |
| **Glasshouse** | `glasshouse` | Leaf | `#8DCC6E` | `#0A0A0C` | [`sprout`](https://game-icons.net/1x1/lorc/sprout.html) | The garage is an old greenhouse. Every car has a plant in the cockpit. |

### Family dynasties

| Team | id | Colour | Primary | Icon (ink) | Icon | Line |
|---|---|---|---|---|---|---|
| **Hargreave** | `hargreave` | Moss | `#507B07` | `#FFFFFF` | [`stag-head`](https://game-icons.net/1x1/lorc/stag-head.html) | The founder's chair stays in the garage, empty, facing the track. |
| **Moreau-Tallis** | `moreau-tallis` | Purple | `#8F3DC0` | `#FFFFFF` | [`scorpion`](https://game-icons.net/1x1/lorc/scorpion.html) | A marriage of two rival teams. The garage still has a line down the middle. |
| **Kanzaki** | `kanzaki` | Raspberry | `#E63281` | `#FFFFFF` | [`checkered-diamond`](https://game-icons.net/1x1/lorc/checkered-diamond.html) | The family crest changes slightly every ten years. |
| **Achterberg** | `achterberg` | Rust | `#C0502A` | `#FFFFFF` | [`ribbon`](https://game-icons.net/1x1/lorc/ribbon.html) | Run by a widow and her four sons. The whole crew wears a black armband, always. |
| **Valcourt** | `valcourt` | Orchid | `#D95FFC` | `#FFFFFF` | [`champagne-cork`](https://game-icons.net/1x1/delapouite/champagne-cork.html) | Old wine family. They pour one glass on the grid before every start. |
| **Ishida** | `ishida` | Hot Pink | `#FF4DB8` | `#FFFFFF` | [`pine-tree`](https://game-icons.net/1x1/lorc/pine-tree.html) | Every new driver plants a tree at the family track. The oldest ones are very tall. |
| **Pell & Pell** | `pell-pell` | Indigo | `#5454EA` | `#FFFFFF` | [`envelope`](https://game-icons.net/1x1/lorc/envelope.html) | Brothers who haven't spoken in twenty years. They run the team by letter. |

### Regional / city teams

| Team | id | Colour | Primary | Icon (ink) | Icon | Line |
|---|---|---|---|---|---|---|
| **Corriva** | `corriva` | Coral | `#F8767A` | `#0A0A0C` | [`sun`](https://game-icons.net/1x1/badges/sun.html) | Coast city that keeps siesta. They never test before 4pm. |
| **Lumen** | `lumen` | Signal | `#DED903` | `#0A0A0C` | [`light-bulb`](https://game-icons.net/1x1/lorc/light-bulb.html) | A city whose lights have never gone off. |
| **Fennick Downs** | `fennick-downs` | Lime | `#4EBB05` | `#FFFFFF` | [`rabbit`](https://game-icons.net/1x1/delapouite/rabbit.html) | Farm country. The whole crew are related, and nobody admits how. |
| **Ambergate** | `ambergate` | Gold | `#C2A02A` | `#0A0A0C` | [`castle`](https://game-icons.net/1x1/delapouite/castle.html) | A walled town. The gates close at dusk, and the team must be back inside. |
| **Saint Orrin** | `saint-orrin` | Cornflower | `#5E9EFD` | `#FFFFFF` | [`lighthouse`](https://game-icons.net/1x1/delapouite/lighthouse.html) | Island city. The ferry waits for the team, never the other way round. |
| **Caldera** | `caldera` | Papaya | `#F87103` | `#FFFFFF` | [`volcano`](https://game-icons.net/1x1/lorc/volcano.html) | A city built inside an old crater. Race day starts with the bells. |
| **Tessaly** | `tessaly` | Jade | `#0DB98E` | `#FFFFFF` | [`water-drop`](https://game-icons.net/1x1/sbed/water-drop.html) | Spa town. Drivers take the waters before every race and won't say why. |

## The colours

**How they were picked:** 12 vivid hues around the wheel, 6 deep tones, and a few neutrals and metallics (Cream, Silver, Bronze, Slate), plus 6 saturated mid-tones that replaced the pale tints. Every colour passes 3:1 contrast on the game's `#0a0a0c` background. Spacing was measured in OKLab with a colour-blind check (deuteranopia/protanopia simulation). Teams were then placed by story, one colour each: Cinder Row in ash **Slate**, Pell & Pell in ink **Indigo**, Ambergate in honey-stone **Gold**.

**Honest limits**
- **Closest pair for everyone:** Aqua vs Cyan (Low Tide vs Brisa), then Jade vs Aqua.
- **Colour-blind players:** some blue/purple pairs (Cornflower vs Violet, Cobalt vs Purple) and Saddle vs Moss look nearly the same. With 28 colours on a dark screen that can't be fully avoided, so the **icon and name carry those teams**. The 12–16 colour team-creator palette (below) can be strict about it.

### The 28 colours

| Colour | Hex | Contrast on the UI | Team |
|---|---|---|---|
| Rosso | `#E8242F` | 4.5:1 | Vantor Motorwerke |
| Papaya | `#F87103` | 6.9:1 | Caldera |
| Amber | `#FFB000` | 10.8:1 | Arden |
| Signal | `#DED903` | 13.2:1 | Lumen |
| Lime | `#4EBB05` | 7.9:1 | Fennick Downs |
| Jade | `#0DB98E` | 7.9:1 | Tessaly |
| Aqua | `#1BB4B8` | 7.8:1 | Low Tide Racing |
| Cyan | `#0BAEE0` | 7.7:1 | Brisa |
| Cornflower | `#5E9EFD` | 7.3:1 | Saint Orrin |
| Violet | `#9B8AFE` | 7.0:1 | Corvane |
| Orchid | `#D95FFC` | 6.6:1 | Valcourt |
| Hot Pink | `#FF4DB8` | 6.6:1 | Ishida |
| Crimson | `#C31851` | 3.4:1 | Seven Bolt Racing |
| Saddle | `#945F0E` | 3.7:1 | Kiln Lane Motorsport |
| Moss | `#507B07` | 3.9:1 | Hargreave |
| Petrol | `#087C77` | 3.9:1 | Orsa |
| Cobalt | `#006EBE` | 3.7:1 | Halcyon |
| Purple | `#8F3DC0` | 3.4:1 | Moreau-Tallis |
| Cream | `#F4EEDE` | 17.1:1 | Calloway |
| Silver | `#B6BBC1` | 10.2:1 | Tinplate |
| Bronze | `#B47B46` | 5.5:1 | Ostler & Finch |
| Slate | `#718295` | 5.0:1 | Cinder Row |
| Indigo | `#5454EA` | 3.6:1 | Pell & Pell |
| Leaf | `#8DCC6E` | 10.4:1 | Glasshouse |
| Coral | `#F8767A` | 7.4:1 | Corriva |
| Raspberry | `#E63281` | 4.8:1 | Kanzaki |
| Gold | `#C2A02A` | 7.9:1 | Ambergate |
| Rust | `#C0502A` | 4.2:1 | Achterberg |

## Still to do (from the original brief)
1. **Team-creator palette** (the 12–16 preset colours a player picks from in [the team creator](https://github.com/GrizzlyPax/Parabolica/issues/346)), plus good and bad pairings. It can borrow from the 28, but it must hold up when a player pairs any two. Not started.
2. **Logo picker set** (~60 icons for the team creator, grouped by theme). The board's six shelves (flags & signals, car & parts, garage & tools, speed & air, crests & beasts, trophies & marks) are a first cut. Pax hasn't starred icons yet.
3. **Story pass:** the one-liners are drafts. Teams, places and founders become canon when Pax writes them into the bible.

## Spares (passed in the name rounds; reuse freely)
- **Works manufacturers:** Kessler-Mott (Trucks and tractors, now racing. Their test driver has never been photographed) · Marrow & Vane (Aircraft makers. They still file a flight plan before every race) · Brandt Ostwerk (Engines first, cars second. The paint is mixed with something they won't list) · Aurelian (Old money. Every car carries a coin dated to a year that hasn't happened yet) · Ferro Vela (Shipbuilders. They christen each chassis with a bottle, and the bottle never breaks) · Nordhaven Motors (Rally roots. Their cars always face north when parked, even when someone moves them) · Sterne (Racing since the first race. Nobody has the founding paperwork, Sterne included) · Quell Dynamics (The new money. Their wind tunnel sometimes runs with nothing in it) · Pyrene (Built in a fireworks factory. They still close for the summer festival) · Ostrander (Sewing machines, then motorbikes, then this. The factory whistle still blows at shift change, Sundays included) · Kardos (Tractor works. Every new engine is left running overnight in the town square)
- **Privateer garages:** Lamp Street Garage (Built under a single bulb that has never been changed) · Ninth Gear (The gearbox has nine gears. They have never used the ninth) · Halfmoon Works (Small shop. It only opens after dark) · Spare Parts Club (Nothing on the car is newer than the driver) · Backlot Autosport (Races out of a film studio's backlot. Sometimes the sets are still up) · Radio Hill (A garage that runs its own pirate station. The station calls the races) · Pellworth Speed Shop (Tuners. Their stopwatches all disagree by the same amount) · Bellwether (The paddock copies their tyre calls. Nobody knows why it works) · Lantern & Hook (A workshop under a bridge. They hang a lantern on the car before every night race) · Quarry Nine (Built in an old quarry. They only test in the rain)
- **Family dynasties:** Castellane (Four generations. The grandmother still signs every driver herself) · Lindqvist (Every Lindqvist driver is told the same secret on day one) · Vasquez Hermanos (Two brothers founded it. Two brothers still run it, always) · Adeyemi (Built from one workshop to a works rival. Every car is named after an aunt) · Brannigan (Loud, lucky, famous for comebacks. Never misses a wake or a podium) · Duvall (Old aristocracy. Every car is blessed by the same priest, who never seems to age) · Ostrova (Run by twin sisters. Nobody has seen them both in the paddock at once) · Marchetti (Founded by a coachbuilder. Their drivers sign a contract written in pencil) · Okafor & Daughters (Three daughters, three cars. The fourth seat is for whoever the hive chooses) · Ferrand (Five generations of wheelwrights. The eldest still makes each car's first wheel by hand) · Sorensen-Bly (Two families who now share one surname and still argue about the order) · Okonjo (The founder's toolbox travels to every race, still locked. Nobody has the key)
- **Regional / city teams:** Port Calder (Harbour city. Every worker gets race day off, by law) · Grey Hollow (A town that isn't on any map they sell) · Saltmere (Salt-flat city that races on its own lake bed) · Ironvale (Steel country. The team is paid in the mill's own scrip) · Highmarsh (Fen country. Their mechanics walk to the track on stilts) · Ashby Cross (A crossroads town that lives on the circuit) · Kestrel Bay (Seaside resort. The pier band plays when they win, even if no one tells them) · North Ostern (Rail-junction city. Everything there runs to timetable, races included) · Velmora (Hill city with a cathedral and a racing club older than both) · Wrenmoor (Moor country. The team's sheep are on the payroll) · Northwick (Canal city. The team arrives at every race by boat)

## Credits
Team icons from [game-icons.net](https://game-icons.net) (CC BY 3.0), by Delapouite, Lorc, Skoll and the other artists linked in the tables above. The World Deck Credits page ([icon system](https://github.com/GrizzlyPax/Parabolica/issues/350)) will list them from the registry.
