# Card names: the run's deck

*📻 Radio with Pax, Oct 10 2026 ([#370](https://github.com/GrizzlyPax/Parabolica/issues/370), deck list [#565](https://github.com/GrizzlyPax/Parabolica/issues/565)). Pages: [Name the Deck](https://claude.ai/artifact/WSWtvRWPmUBYyy7nbHYiLE) (names, icons, badge) · [Five Worlds](https://claude.ai/artifact/QZBSzFg5MEStyg5826jLwV) (the card look and the world, still open). Not canon until it moves into the [bible](../STORY_BIBLE.md); the strings below are what the build uses.*

## TL;DR
- **Voice: kit with a wink.** Real kit and real paddock slang, with an odd but true detail every few cards. Titles stay tight; later decks get weirder.
- **Curses bite a little** (what went wrong in the garage). **Rank-up stat jumps are named by rank:** Step Up (Pro) · Breakthrough (Ace) · Peak Form (Legend).
- **Every card has its own icon** (game-icons.net id below).
- **Every card has a corner badge, top-left, big:** the races it lasts (gear **3**, curses **1**), or the **DNA mark** when you keep it (traits, rank-up cards). The DNA badge is inverted so traits stand out.
- **A "where it applies" circle** replaces the old type box: helmet = driver, car = car, garage = team. Curses show their target the same way.
- **Archetypes stay in the back end.** No plan tag on the card; the ids keep them (`qualifier`, `brawler`, `tyre-saver`, `glass-cannon`, `any`).
- **Open:** the card look itself and the world behind it ([Five Worlds](https://claude.ai/artifact/QZBSzFg5MEStyg5826jLwV)). Until Pax picks, build on today's Almanac Plate: gear black, traits paper, metal only on the name banner.

## Pax's calls (Oct 10)
| Question | Pick |
|---|---|
| Card voice | **Kit with a wink**, titles kept tight ("they'll get weirder as we go on") |
| Archetype names | **Back end only** ("those are more for us"); internal names unchanged |
| Colour | **Less metal:** the whole card no longer fills with its metal ("all of it on rarity might be a little much") |
| Timer | **Big, in the corner, like a mana cost:** gear 3, curses 1 |
| Traits | **The DNA mark in the same corner** ("every card has the same thing at the top"), made to stand out |
| Type box | **Gone.** A circle shows where the card applies: driver helmet, car, team |
| Small cards | Later ("don't worry about it") |
| Curses, rank-up names | Radio's leans (Pax: "these work well"); flip any of them in a later pass |

## Card ids
The deck isn't built yet, so these ids are proposed: `<archetype>-<metal>-<target>-<kind>-<first stat>`. They don't change when a card is renamed. Curses are `curse-<target>-<stat>[-shape]`; wild cards and stat jumps keep today's ids in `src/season/xp.ts`; signatures are `sig-<name>`.

### Qualifier (back end)

| id | Name | Was | Icon | Does |
|---|---|---|---|---|
| `qualifier-bronze-driver-gear-accel` | **Thin-Sole Boots** | Fresh Gloves | `leather-boot` | Bronze driver gear: +6 Accel |
| `qualifier-bronze-driver-gear-speed` | **Visor Tear-offs** |  | `protection-glasses` | Bronze driver gear: +6 Speed |
| `qualifier-bronze-car-gear-grip` | **Stiffer Springs** |  | `spring` | Bronze car gear: +12 Grip |
| `qualifier-bronze-team-gear-pit-crew` | **Quick-Lift Jacks** | Garage Drill | `hand-truck` | Bronze team gear: +12 Pit Crew |
| `qualifier-bronze-driver-trait-accel` | **Quick Off the Line** | Hot Lapper | `sprint` | Bronze driver trait: +3 Accel |
| `qualifier-silver-driver-gear-accel` | **Launch Gloves** | Lights Out | `gloves` | Silver driver gear: +24 Accel (first half of the race) |
| `qualifier-silver-car-gear-power` | **Quali Mode** |  | `stopwatch` | Silver car gear: +12 Power |
| `qualifier-silver-team-gear-pit-crew` | **Out-Lap Crew** |  | `tire-tracks` | Silver team gear: +24 Pit Crew |
| `qualifier-silver-driver-trait-accel` | **Saturday Specialist** | Pole Sitter | `podium-winner` | Silver driver trait: +6 Accel |
| `qualifier-gold-driver-gear-speed` | **Low-Drag Helmet** | Slipstream Helmet | `paper-plane` | Gold driver gear: +12 Speed, +12 Accel |
| `qualifier-gold-car-trait-grip` | **Glued to the Road** |  | `magnet` | Gold car trait: +18 Grip, +6 Power, −6 Reliability |
| `qualifier-iridium-driver-trait-accel` | **One-Lap Wonder** | Front-Row Lockout | `comet-spark` | Iridium driver trait: +12 Accel, +12 Speed, +9 Consistency, −6 Endurance |

### Brawler (back end)

| id | Name | Was | Icon | Does |
|---|---|---|---|---|
| `brawler-bronze-driver-gear-aggression` | **Elbow Pads** |  | `elbow-pad` | Bronze driver gear: +6 Aggression |
| `brawler-bronze-driver-gear-accel` | **Steel-Toe Boots** | Launch Control | `steeltoe-boots` | Bronze driver gear: +6 Accel |
| `brawler-bronze-car-gear-reliability` | **Reinforced Nose** | Iron Bodywork | `armor-upgrade` | Bronze car gear: +12 Reliability |
| `brawler-bronze-team-gear-pit-crew` | **Spare Front Wings** |  | `wooden-crate` | Bronze team gear: +12 Pit Crew |
| `brawler-bronze-driver-trait-aggression` | **Late Braker** |  | `stop-sign` | Bronze driver trait: +3 Aggression |
| `brawler-silver-driver-gear-aggression` | **Dive-Bomb Helmet** |  | `falling-bomb` | Silver driver gear: +24 Aggression (first half of the race) |
| `brawler-silver-car-gear-power` | **Torque Map** |  | `gears` | Silver car gear: +12 Power |
| `brawler-silver-team-gear-pit-crew` | **Bodyshop** |  | `claw-hammer` | Silver team gear: +24 Pit Crew |
| `brawler-silver-driver-trait-aggression` | **Never Lifts** | Elbows Out | `boot-stomp` | Silver driver trait: +6 Aggression |
| `brawler-gold-car-gear-power` | **Battering Ram** |  | `bulldozer` | Gold car gear: +12 Power, +24 Reliability |
| `brawler-gold-driver-trait-aggression` | **Red Mist** |  | `angry-eyes` | Gold driver trait: +9 Aggression, +6 Accel, −4 Consistency |
| `brawler-iridium-driver-trait-aggression` | **No Prisoners** |  | `mailed-fist` | Iridium driver trait: +12 Aggression, +9 Speed, +9 Accel, −4 Consistency |

### Tyre Saver (back end)

| id | Name | Was | Icon | Does |
|---|---|---|---|---|
| `tyre-saver-bronze-driver-gear-consistency` | **Kid Gloves** | Smooth Gloves | `winter-gloves` | Bronze driver gear: +10 Consistency |
| `tyre-saver-bronze-driver-gear-endurance` | **Moulded Seat** | Endurance Seat | `car-seat` | Bronze driver gear: +12 Endurance |
| `tyre-saver-bronze-car-gear-grip` | **Soft Suspension** |  | `bouncing-spring` | Bronze car gear: +12 Grip |
| `tyre-saver-bronze-team-gear-tyre` | **Tyre Blankets** |  | `blanket` | Bronze team gear: +6 Tyre Mgmt |
| `tyre-saver-bronze-driver-trait-endurance` | **Never Tires** | Gentle Feet | `lungs` | Bronze driver trait: +6 Endurance |
| `tyre-saver-silver-driver-gear-speed` | **Drinks Bottle** | Second Wind | `water-bottle` | Silver driver gear: +24 Speed (second half of the race) |
| `tyre-saver-silver-car-gear-grip` | **Long-Run Setup** | Kind Suspension | `mountain-road` | Silver car gear: +24 Grip |
| `tyre-saver-silver-team-gear-tyre` | **Heat-Cycled Sets** | Heat Cycling | `thermometer-hot` | Silver team gear: +12 Tyre Mgmt |
| `tyre-saver-silver-driver-trait-consistency` | **Metronome** |  | `clockwork` | Silver driver trait: +9 Consistency |
| `tyre-saver-gold-team-gear-tyre` | **Strategy Room** |  | `pencil-ruler` | Gold team gear: +12 Tyre Mgmt, +24 Pit Crew |
| `tyre-saver-gold-team-trait-tyre` | **One-Stop Crew** | Long Stint Specialists | `turtle` | Gold team trait: +15 Tyre Mgmt, −6 Pit Crew |
| `tyre-saver-iridium-team-trait-tyre` | **Tyre Whisperers** |  | `barn-owl` | Iridium team trait: +18 Tyre Mgmt, +18 Pit Crew |

### Glass Cannon (back end)

| id | Name | Was | Icon | Does |
|---|---|---|---|---|
| `glass-cannon-bronze-driver-gear-speed` | **Lightweight Helmet** |  | `feather` | Bronze driver gear: +6 Speed |
| `glass-cannon-bronze-driver-gear-aggression` | **Thin Gloves** |  | `hand` | Bronze driver gear: +6 Aggression |
| `glass-cannon-bronze-car-gear-power` | **Lightened Flywheel** | Stripped Interior | `big-gear` | Bronze car gear: +6 Power |
| `glass-cannon-bronze-team-gear-pit-crew` | **Skeleton Crew** |  | `skeleton-key` | Bronze team gear: +12 Pit Crew |
| `glass-cannon-bronze-driver-trait-speed` | **Heavy Right Foot** | Hothead | `footprint` | Bronze driver trait: +3 Speed |
| `glass-cannon-silver-driver-gear-speed` | **Double Espresso** | Adrenaline | `coffee-cup` | Silver driver gear: +18 Speed, −8 Consistency |
| `glass-cannon-silver-car-gear-power` | **Grenade Engine** | Glass Engine | `grenade` | Silver car gear: +18 Power, −12 Reliability |
| `glass-cannon-silver-team-gear-pit-crew` | **Gamblers' Pit Wall** |  | `rolling-dice-cup` | Silver team gear: +36 Pit Crew, −6 Tyre Mgmt |
| `glass-cannon-silver-driver-trait-aggression` | **Fearless** |  | `jump-across` | Silver driver trait: +9 Aggression, −4 Luck |
| `glass-cannon-gold-driver-gear-speed` | **Lead Boots** | Throttle Stomper | `weight` | Gold driver gear: +18 Speed, +12 Accel, −8 Consistency |
| `glass-cannon-gold-driver-trait-speed` | **All or Nothing** |  | `coinflip` | Gold driver trait: +9 Speed, +9 Aggression, −9 Consistency |
| `glass-cannon-iridium-car-trait-power` | **Rocket Ship** |  | `rocket-flight` | Iridium car trait: +18 Power, +24 Grip, −6 Reliability |

### Any team (back end)

| id | Name | Was | Icon | Does |
|---|---|---|---|---|
| `any-bronze-car-trait-reliability` | **Old Faithful** | Reliable Unit | `oil-can` | Bronze car trait: +6 Reliability |
| `any-bronze-team-trait-pit-crew` | **Pit Drills** |  | `drill` | Bronze team trait: +6 Pit Crew |
| `any-bronze-driver-gear-luck` | **Lucky Socks** | Lucky Seven | `socks` | Bronze driver gear: +10 Luck |
| `any-bronze-car-gear-reliability` | **Fresh Gearbox** |  | `gear-stick` | Bronze car gear: +12 Reliability |
| `any-bronze-team-gear-pit-crew` | **Spare Parts** |  | `cardboard-box` | Bronze team gear: +12 Pit Crew |
| `any-bronze-driver-trait-consistency` | **Steady Hands** |  | `hand-ok` | Bronze driver trait: +5 Consistency |
| `any-silver-car-trait-grip` | **Balanced Chassis** |  | `scales` | Silver car trait: +12 Grip |
| `any-silver-team-trait-pit-crew` | **Two-Second Crew** | Pit Lane Ghost | `heavy-timer` | Silver team trait: +12 Pit Crew |
| `any-silver-driver-gear-luck` | **Four-Leaf Clover** |  | `clover` | Silver driver gear: +18 Luck |
| `any-gold-car-gear-power` | **Factory Upgrade** |  | `factory` | Gold car gear: +12 Power, +24 Grip |
| `any-gold-car-trait-grip` | **Works Chassis** |  | `wrench` | Gold car trait: +12 Grip, +12 Reliability |
| `any-iridium-driver-trait-speed` | **The Full Package** | Complete Driver | `laurel-crown` | Iridium driver trait: +9 Speed, +14 Consistency, +18 Endurance |

### Curses (one race each)

| id | Name | Was | Icon | Does |
|---|---|---|---|---|
| `curse-car-reliability` | **Gremlins** | Haunted Gearbox | `goblin-head` | Car: −12 Reliability |
| `curse-car-power` | **Someone Changed the Map** | Wrong Fuel Map | `treasure-map` | Car: −6 Power |
| `curse-car-grip` | **Kerb Damage** | Bent Floor | `edge-crack` | Car: −12 Grip |
| `curse-car-power-reliability` | **Last Year's Engine** | Rusty Engine | `barrel-leak` | Car: −3 Power, −6 Reliability |
| `curse-team-pit-crew` | **Butterfingers** | Butterfingers | `butter` | Team: −12 Pit Crew |
| `curse-team-pit-crew-sharp` | **Work Experience Day** | Sticky Wheel Nut | `propeller-beanie` | Team: −18 Pit Crew |
| `curse-team-tyre` | **Forgot the Blankets** | Cold Tyres | `thermometer-cold` | Team: −9 Tyre Mgmt |
| `curse-team-tyre-lingering` | **Budget Cuts** | Bad Contract | `scissors` | Team: −3 Tyre Mgmt |

### Rank-up cards (never in packs)

| id | Name | Was | Icon | Does |
|---|---|---|---|---|
| `jump-1-<stat>` | **Step Up: <Stat>** | Speed jump | `stairs` | Pro: +6 levels to one stat |
| `jump-2-<stat>+<stat>` | **Breakthrough: <Stat> + <Stat>** | Speed + Luck jump | `broken-wall` | Ace: +6 to two stats |
| `jump-3-<stat>+<stat>+<stat>` | **Peak Form: <Stat> + <Stat> + <Stat>** | … jump | `mountaintop` | Legend: +9 to three stats |
| `wild-showboat` | **Showboat** |  | `sunglasses` | Points earn 1.5× XP |
| `wild-mentor` | **Mentor** |  | `teacher` | Your teammate also earns 25% of your XP |
| `wild-grudge-match` | **Grudge Match** |  | `boxing-glove` | +3 to every stat in the boss race |
| `wild-home-hero:<trackId>` | **Home Hero: <Track>** |  | `family-house` | +6 to every stat at one track |
| `sig-last-lap-hero` | **Last-Lap Hero** |  | `checkered-flag` | +9 Speed in the last 13% of every race |
| `sig-iron-man` | **Mechanical Sympathy** | Iron Man | `monkey-wrench` | Never retires from a mechanical failure |
| `sig-pole-or-bust` | **Pole or Bust** |  | `flag-objective` | Always qualifies in the top 3, −6 Endurance |
| `sig-underdog` | **Underdog** |  | `sitting-dog` | +4 Speed when starting outside the top 10 |

Stat words in a jump's name are the card's stat labels (Speed, Acceleration, Consistency, Luck, Endurance, Aggression), joined with " + ". Icon ids are game-icons.net names; `mechanical-sympathy` keeps the id `sig-iron-man` until the signature is built (#653).

## The card face (what every card shows)
1. **Corner badge, top-left, big:** `3` on gear, `1` on curses (red), the DNA mark (`dna1`) on anything kept: traits, stat jumps, wild cards, signatures. The DNA badge is inverted (dark disc, light mark).
2. **Where it applies:** a circle with `full-motorcycle-helmet` (driver), `race-car` (car) or `mechanic-garage` (team). Replaces the type box.
3. **Name** in the banner, the card's own **icon** in the art window, **what it does** in plain numbers.
4. **Metal kept quiet:** on the name banner only (today's lean), not the whole card. The final look waits on [Five Worlds](https://claude.ai/artifact/QZBSzFg5MEStyg5826jLwV).

## Not in this pass
- The **6 track names** (#370 keeps them for later).
- **Flavour lines** per card. Samples on the Five Worlds page ("Handle the car like it bruises.") show the voice if we want them.
- **Small-card readability** (chips and minis): later, per Pax.

