# The venues: six American track kinds (#370)

Where races are run in Ace America. Pax's pick, Oct 14, from [Voice and Venues](https://claude.ai/artifact/8oPhkQEARBkNwKs23N8Cw4): **every kind at every step, dressed up per step.** Each kind keeps its stat pair, layout and tire wear from `src/data/deckTracks.ts`; only the name and the dressing change. Not canon until it is in `docs/STORY_BIBLE.md`.

## The rule

- **Locals (dirt):** the track takes **your town's** name: *Toledo Boards*.
- **State (proper circuits):** the track takes **a real town in your state**, drawn from that state's `cities` in `src/data/states.ts` (or the state's own name where the pattern says {State}): *Akron Board Speedway*.
- **Nationals (grandstands):** six **real landmarks**, the same for every run.
- The kind name is the track's subtitle everywhere: *Akron Board Speedway · Board Track*.

## The six kinds

| Track id | Kind | Favours | Tires | One line |
|---|---|---|---|---|
| `acceleration-pit-crew` | Fairgrounds | Acceleration + Pit Crew | Hard on tires | A short oval round the barns. Quick off the turns, quicker in the pits. |
| `aggression-reliability` | Street Circuit | Aggression + Reliability | Normal tire wear | Closed roads, hay bales and curbs. Elbows out, and the car has to take it. |
| `consistency-grip` | Hill-climb | Consistency + Grip | Hard on tires | Up the hill one turn at a time. Neat hands and good grip. |
| `endurance-tyre-management` | Brickyard | Endurance + Tire Management | Hungry for tires | Bricks eat tires. The long game wins here. |
| `luck-reliability` | Board Track | Luck + Reliability | Easy on tires | Banked wooden planks: fast, loud and splintery. Luck and a sound car. |
| `speed-power` | Salt Flats | Speed + Power | Gentle on tires | Flat out and a long way. Pure speed and a big engine. |

## Names by step

`{Town}` = your town · `{City}` = another real town in your state · `{State}` = your state. Samples are for a Toledo, Ohio run.

| Kind | Locals (dirt) | State (proper circuit) | Nationals (grandstands) |
|---|---|---|---|
| Fairgrounds | **{Town} Fairgrounds**<br>*A half-mile of dirt round the cattle barns.*<br>e.g. Toledo Fairgrounds | **{State} State Fair Mile**<br>*A mile oval at the state fair, a wooden grandstand.*<br>e.g. Ohio State Fair Mile | **The Springfield Mile, Illinois**<br>*The great dirt mile. Twenty thousand in the grandstand.* |
| Street Circuit | **Main Street, {Town}**<br>*Shut for the afternoon. Hay bales at the corners.*<br>e.g. Main Street, Toledo | **Downtown {City}**<br>*Proper curbs, shop windows boarded up for the day.*<br>e.g. Downtown Cleveland | **Times Square, New York**<br>*Where the Great Race started in 1908.* |
| Hill-climb | **{Town} Hill Road**<br>*Gravel up the only hill in the county.*<br>e.g. Toledo Hill Road | **{City} Hill Climb**<br>*Paved hairpins up from the river.*<br>e.g. Cincinnati Hill Climb | **Pikes Peak, Colorado**<br>*156 turns to the clouds.* |
| Brickyard | **{Town} Brickworks**<br>*A lap round the kiln yard, on the firm's own bricks.*<br>e.g. Toledo Brickworks | **{City} Brickyard**<br>*A brick oval with a timing tower.*<br>e.g. Dayton Brickyard | **The Brickyard, Indianapolis**<br>*Three million bricks and a long afternoon.* |
| Board Track | **{Town} Boards**<br>*Planks from the lumber yard, nailed round a field.*<br>e.g. Toledo Boards | **{City} Board Speedway**<br>*A banked wooden saucer. Mind the splinters.*<br>e.g. Akron Board Speedway | **Atlantic City Board Speedway, New Jersey**<br>*A mile and a half of pine by the sea.* |
| Salt Flats | **{Town} Flats**<br>*A dry riverbed. Out, round the post, and back.*<br>e.g. Toledo Flats | **{State} Speed Trials**<br>*A closed highway and a measured mile.*<br>e.g. Ohio Speed Trials | **Bonneville Salt Flats, Utah**<br>*White to the horizon.* |

## For the builder

- The engine needs the run's step plus your town and state to name a track. Quick Race and the lab wear Nationals, so they use the landmarks.
- Pick `{City}` with the race seed, never your own town, and don't repeat a town within one State season where possible.
- Tire-wear words come from the dial: 0.85 gentle · 0.95 easy · 1.0 normal · 1.1–1.15 hard · 1.25 hungry.
- Ids stay `speed-power` and the rest; saves reference them.
