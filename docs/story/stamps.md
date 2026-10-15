# Stamps by post: the names (#704)

What the stamp system calls things. Pax's picks, Oct 15, from [Stamps by Post](https://claude.ai/artifact/PZhek2RC36KgDCoCKD33vG). System: Steward's Oct 15 build spec on [#704](https://github.com/GrizzlyPax/Parabolica/issues/704). Card names come from [card-names.md](card-names.md) (Pax, Oct 10). Not canon until it is in `docs/STORY_BIBLE.md`.

## Pax's picks (Oct 15)

| Question | Pick |
|---|---|
| The two kinds of stamp | **Seal** (permanent) and **Ink** (fades after 3 races) |
| The two good Parcels | **League Issue** (before every race) and **No Return Address** (the rare gift) |
| The black Parcel | **Watcher Box** (Pax's own name, over Radio's "Postage Due") |
| The title stamp | **the Postmark**: *Toledo Postmark* (Locals), *Ohio Postmark* (State) |

## The words

| Word | What it is | On screen |
|---|---|---|
| **Stamp** | Any card held on a driver card (4 slots) or the car card (5 slots) | "Stamps · 3 of 4" |
| **Seal** | A permanent stamp (a `trait` card). Pressed into the card; stays for the run | "Seal · keeps"; the DNA mark |
| **Ink** | A gear stamp (`equipment` / `upgrade` / `facility`). Fades after 3 races, then frees its slot | "Ink · 2 races left"; the number in the corner (3 · 2 · 1); fainter each race |
| **Scrape off** | Remove a stamp to make room. Gone for good | "No room. Scrape one off?" |
| **Parcel** | What arrives before every race: pick 1 of 3, or pass | "A Parcel for {garage}" · buttons **Stamp it** / **Pass** |
| **League Issue** | The usual Parcel. Brown paper, cream string | Label: `LEAGUE ISSUE` / `To: {garage}, {town}, {state}` / `From: the League` |
| **No Return Address** | The rare gift (State 10%, Nationals 15%, never at Locals). Navy paper, gold string; legendary odds | Label: `NO RETURN ADDRESS` / `To: {garage}, {town}, {state}` / `From:` (left blank) |
| **Watcher Box** | The black Parcel (10% at every step). Still pick 1 of 3, and a smudge goes on the car card | Label: `WATCHER BOX` / `To: {garage}, {town}, {state}` |
| **Smudge** | The one-race curse from a Watcher Box: a black ink blot over the car card, no slot | "{smudge name} · this race only" |
| **Postmark** | The title stamp. Round, struck on the driver's title ribbon, no slot, for good | *Toledo Postmark · +6 Speed* · *Ohio Postmark · +6 Aggression, +6 Accel* |

**Title screen copy:** *"Congratulations, you are now Ace Toledo."* then *"Pick a stat for June's Toledo Postmark."* (State: *"Pick two stats for June's Ohio Postmark."*)

**Voice note:** the gift hints and never names its sender; the Watcher Box names the Watchers on the box. That is Pax's call. Keep its copy plain (the label and the smudge), and never explain why it comes.

## Every stamp, by id

**Ids never change.** The game derives `rd-<slug>` ids from Steward's placeholder names, and saves hold them. Show the names below and keep the ids as they are (a fixed id column, not a re-slug). Names in *italics* change spelling to American (Tire, Curb, Molded).

| Id (kept) | Name | Kind | Sits on | Metal | Icon |
|---|---|---|---|---|---|
| `rd-fresh-gloves` | Thin-Sole Boots | Ink | Driver card | bronze | `leather-boot` |
| `rd-visor-tear-offs` | Visor Tear-offs | Ink | Driver card | bronze | `protection-glasses` |
| `rd-stiffer-springs` | Stiffer Springs | Ink | Car card | bronze | `spring` |
| `rd-garage-drill` | Quick-Lift Jacks | Ink | Car card | bronze | `hand-truck` |
| `rd-hot-lapper` | Quick Off the Line | Seal | Driver card | bronze | `sprint` |
| `rd-lights-out` | Launch Gloves | Ink | Driver card | silver | `gloves` |
| `rd-quali-mode` | Quali Mode | Ink | Car card | silver | `stopwatch` |
| `rd-out-lap-crew` | Out-Lap Crew | Ink | Car card | silver | `tire-tracks` |
| `rd-pole-sitter` | Saturday Specialist | Seal | Driver card | silver | `podium-winner` |
| `rd-slipstream-helmet` | Low-Drag Helmet | Ink | Driver card | gold | `paper-plane` |
| `rd-glued-to-the-road` | Glued to the Road | Seal | Car card | gold | `magnet` |
| `rd-front-row-lockout` | One-Lap Wonder | Seal | Driver card | iridium | `comet-spark` |
| `rd-elbow-pads` | Elbow Pads | Ink | Driver card | bronze | `elbow-pad` |
| `rd-launch-control` | Steel-Toe Boots | Ink | Driver card | bronze | `steeltoe-boots` |
| `rd-iron-bodywork` | Reinforced Nose | Ink | Car card | bronze | `armor-upgrade` |
| `rd-spare-front-wings` | Spare Front Wings | Ink | Car card | bronze | `wooden-crate` |
| `rd-late-braker` | Late Braker | Seal | Driver card | bronze | `stop-sign` |
| `rd-dive-bomb-helmet` | Dive-Bomb Helmet | Ink | Driver card | silver | `falling-bomb` |
| `rd-torque-map` | Torque Map | Ink | Car card | silver | `gears` |
| `rd-bodyshop` | Bodyshop | Ink | Car card | silver | `claw-hammer` |
| `rd-elbows-out` | Never Lifts | Seal | Driver card | silver | `boot-stomp` |
| `rd-battering-ram` | Battering Ram | Ink | Car card | gold | `bulldozer` |
| `rd-red-mist` | Red Mist | Seal | Driver card | gold | `angry-eyes` |
| `rd-no-prisoners` | No Prisoners | Seal | Driver card | iridium | `mailed-fist` |
| `rd-smooth-gloves` | Kid Gloves | Ink | Driver card | bronze | `winter-gloves` |
| `rd-endurance-seat` | *Molded Seat* | Ink | Driver card | bronze | `car-seat` |
| `rd-soft-suspension` | Soft Suspension | Ink | Car card | bronze | `bouncing-spring` |
| `rd-tyre-blankets` | *Tire Blankets* | Ink | Car card | bronze | `blanket` |
| `rd-gentle-feet` | Never Tires | Seal | Driver card | bronze | `lungs` |
| `rd-second-wind` | Drinks Bottle | Ink | Driver card | silver | `water-bottle` |
| `rd-kind-suspension` | Long-Run Setup | Ink | Car card | silver | `mountain-road` |
| `rd-heat-cycling` | Heat-Cycled Sets | Ink | Car card | silver | `thermometer-hot` |
| `rd-metronome` | Metronome | Seal | Driver card | silver | `clockwork` |
| `rd-strategy-room` | Strategy Room | Ink | Car card | gold | `pencil-ruler` |
| `rd-long-stint-specialists` | One-Stop Crew | Seal | Car card | gold | `turtle` |
| `rd-tyre-whisperers` | *Tire Whisperers* | Seal | Car card | iridium | `barn-owl` |
| `rd-lightweight-helmet` | Lightweight Helmet | Ink | Driver card | bronze | `feather` |
| `rd-thin-gloves` | Thin Gloves | Ink | Driver card | bronze | `hand` |
| `rd-stripped-interior` | Lightened Flywheel | Ink | Car card | bronze | `big-gear` |
| `rd-skeleton-crew` | Skeleton Crew | Ink | Car card | bronze | `skeleton-key` |
| `rd-hothead` | Heavy Right Foot | Seal | Driver card | bronze | `footprint` |
| `rd-adrenaline` | Double Espresso | Ink | Driver card | silver | `coffee-cup` |
| `rd-glass-engine` | Grenade Engine | Ink | Car card | silver | `grenade` |
| `rd-gamblers-pit-wall` | Gamblers' Pit Wall | Ink | Car card | silver | `rolling-dice-cup` |
| `rd-fearless` | Fearless | Seal | Driver card | silver | `jump-across` |
| `rd-throttle-stomper` | Lead Boots | Ink | Driver card | gold | `weight` |
| `rd-all-or-nothing` | All or Nothing | Seal | Driver card | gold | `coinflip` |
| `rd-rocket-ship` | Rocket Ship | Seal | Car card | iridium | `rocket-flight` |
| `rd-reliable-unit` | Old Faithful | Seal | Car card | bronze | `oil-can` |
| `rd-pit-drills` | Pit Drills | Seal | Car card | bronze | `drill` |
| `rd-lucky-seven` | Lucky Socks | Ink | Driver card | bronze | `socks` |
| `rd-fresh-gearbox` | Fresh Gearbox | Ink | Car card | bronze | `gear-stick` |
| `rd-spare-parts` | Spare Parts | Ink | Car card | bronze | `cardboard-box` |
| `rd-steady-hands` | Steady Hands | Seal | Driver card | bronze | `hand-ok` |
| `rd-balanced-chassis` | Balanced Chassis | Seal | Car card | silver | `scales` |
| `rd-pit-lane-ghost` | Two-Second Crew | Seal | Car card | silver | `heavy-timer` |
| `rd-four-leaf-clover` | Four-Leaf Clover | Ink | Driver card | silver | `clover` |
| `rd-factory-upgrade` | Factory Upgrade | Ink | Car card | gold | `factory` |
| `rd-works-chassis` | Works Chassis | Seal | Car card | gold | `wrench` |
| `rd-complete-driver` | The Full Package | Seal | Driver card | iridium | `laurel-crown` |

### Smudges (from a Watcher Box, one race)

| Id (kept) | Name | Does | Icon |
|---|---|---|---|
| `curse-haunted-gearbox` | Gremlins | Car: −12 Reliability | `goblin-head` |
| `curse-wrong-fuel-map` | Someone Changed the Map | Car: −6 Power | `treasure-map` |
| `curse-bent-floor` | *Curb Damage* | Car: −12 Grip | `edge-crack` |
| `curse-rusty-engine` | Last Year's Engine | Car: −3 Power, −6 Reliability | `barrel-leak` |
| `curse-butterfingers` | Butterfingers | Team: −12 Pit Crew | `butter` |
| `curse-sticky-wheel-nut` | Work Experience Day | Team: −18 Pit Crew | `propeller-beanie` |
| `curse-cold-tyres` | Forgot the Blankets | Team: −9 Tyre Mgmt | `thermometer-cold` |
| `curse-bad-contract` | Budget Cuts | Team: −3 Tyre Mgmt | `scissors` |

The effect text for each stamp is in [card-names.md](card-names.md) ("Does"); the numbers are the game's.

## Not in this pass

- The look of a seal, an ink stamp, a smudge and a postmark: the page's shapes are proposals for Hub (`Stamp`, `Parcel` in `src/look/Look.tsx`).
- Rank-up cards, wild cards and signatures in card-names.md: retired with ranks (#696).
