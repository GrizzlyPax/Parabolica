# Parked for a Horror deck: the inflictions and the condition tags

*Apex, Oct 8 (with the Tracks & Weather v2 swap, #359). Not canon; a parking note so nothing is lost. The code left `src/` in that PR; `git log -- src/data/inflictions.ts` has it.*

Tracks & Weather v2 retired the environmental layer that stamped **conditions** on a race (rain, fog, scorcher, windy, debris) and the two things that fed on them. Pax wants them back as **Horror-deck** material later, so here is what there was.

## The 5 inflictions (mid-race strikes on one driver)
| Infliction | Needed | Did |
|---|---|---|
| ⚡ Electrocuted | rain | *is struck by the storm!* — speed down for a while |
| 🌫️ Lost in Fog | fog | *has vanished into the fog!* — consistency down |
| 🔥 Overheating | scorcher | *is cooking in the cockpit!* — speed down |
| 💨 Tailwind | windy | *catches a monster tailwind!* — speed up (the one good one) |
| 🪨 Debris Strike | debris-hazard | *takes debris to the bodywork!* — crash risk up |

Shape: a rare per-tick roll while the condition was active, one racing driver struck, a timed effect on the unified-effect system, a feed line, a tower status icon.

## The 17 condition tags (stamped by track events for one race)
Low Visibility · Slippery Surface · Debris Hazard · Dust Cloud · Adrenaline Surge · Slipstream Boost · Track Evolution · Headwind · Cooling Issues · Tire Graining · Distracted · In The Zone · Rattled · Desperate Push · Pit Congestion · Equipment Malfunction · Fast Hands.

Shape: one-race tags a **track event** dropped on a few drivers (leader, last, random, top/bottom N) for N laps. Track events went with the 31 themed tracks.

## The 3 track characters
High-Speed (pace lean) · Technical (variance lean) · Hazardous (crash lean, stamped `debris-hazard`). Replaced by the six tracks' favoured stats.

## When they come back
In the Cards model these are **effect cards** (v0.6: timed, sim-dealt, one stat up or down) under a themed deck. Wet (v0.6) brings `rain` back as the first condition; the rest belong to whichever deck wants weather with teeth.
