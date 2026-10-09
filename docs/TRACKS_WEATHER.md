# Tracks & Weather v2 (dry in v0.5, Wet in v0.6)

*Build spec. Source: Dev's design artifact "Tracks & Weather v2" (Oct 8). **Two steps (Pax, Oct 8, revised):** the **dry half ships in v0.5** (6 tracks, Neutral + 5 dry weathers, favours, retiring the old content) inside the one fingerprint PR. **Wet** (lap by lap, wet tyre, forecast, pit rule suspended) ships in **v0.6**. **No rain in v0.5.** Where this doc and Pax disagree, Pax wins; tell Pit.*

## TL;DR
- **Audit:** today's tracks and weather change pace and passing, but **not who wins**.
- **v2 makes them decide which stats matter.** A favoured stat counts **+10 grade points** for the race (v0.6.0, #545: favours use the same grade-point math as cards; it was +10% before), and track and weather favours stack. Each track also has a **tyre-wear dial** (0.85–1.25, #536).
- **6 generic tracks replace all 31 themed ones** (one stat combo each, named for it). **6 weathers + Neutral replace the 5 old weathers.** Exactly one is **Wet**, which changes lap by lap and brings a wet tyre.
- **Retired:** track events, the 17 condition tags, the 5 old weathers, the 5 inflictions. The inflictions are parked as **Horror deck** material (Pax).

## Tracks (6)
| Track | Driver stat | Car / team stat | Layout drawing |
|---|---|---|---|
| Speed + Power | Speed | Power | power |
| Consistency + Grip | Consistency | Grip | technical |
| Aggression + Reliability | Aggression | Reliability | street |
| Endurance + Tyre Management | Endurance | Tyre Management | flowing |
| Acceleration + Pit Crew | Acceleration | Pit Crew | modern |
| Luck + Reliability | Luck | Reliability | classic |

- Each favoured stat counts +10 grade points (was +10%), field-wide. That widens the gap between drivers who are strong and weak in it.
- The six existing layout drawings map one-to-one, so no new art.
- Passing is normal everywhere for now; the per-track passing dial stays in the system.
- A 10-race season draws from 6 tracks, so tracks repeat.

## Weather (6 + Neutral)
| Weather | Odds | Favours | Kind |
|---|---|---|---|
| Neutral | 60% | — | consistent |
| Speed + Tyre Management | ~7% | Speed · TM | consistent |
| Consistency + Pit Crew | ~7% | Consistency · PC | consistent |
| Acceleration + Reliability | ~7% | Acceleration · Reliability | consistent |
| Endurance + Power | ~7% | Endurance · Power | consistent |
| Aggression + Grip | ~7% | Aggression · Grip | consistent |
| **Wet: Luck + Grip** | ~7% | Luck · Grip | **volatile** |

- Favour = +10 grade points × intensity on each stat (`FAVOUR_PCT`; was +10%). A weather's combo can match the track's.
- **Wet is the only volatile weather,** the only one that slows the race, and the only one with wet tyres and a suspended pit rule.
- **Wet patterns** (rolled from the race seed): passing shower · building storm · clearing · on and off.
- **One Wet compound:** fast in the wet, slow and quick-wearing when dry. **The sim makes the pit calls** using strategy archetypes (some teams jump early, some wait). You own the team, not the pit wall.
- **Rough forecast** before lights out ("rain likely mid-race"), never the exact laps.
- **The pit rule (2 stops, all 3 compounds) is suspended in any race where rain falls.**

**v0.5 odds:** Neutral 60% · each dry weather **8%** (Wet's share spread across them). Wet returns in v0.6.

**Weather rule cards, remapped in v0.5** (ids kept so presets and the ledger still load). **Names: Pax, Oct 9 ([#436](https://github.com/GrizzlyPax/Parabolica/issues/436)): one word, tight, simple.** Blurbs and readouts stay as they are; they still fit.

| Id (unchanged) | Was | **Name** | Scope | What it does (readout, unchanged) |
|---|---|---|---|---|
| `rain` | Grip Weather | **Crosswind** | race | This race favours Aggression and Grip. |
| `fog` | Steady Weather | **Overcast** | race | This race favours Consistency and Pit Crew. |
| `clear-skies` | Neutral Skies | **Calm** | race | No weather favours this race. |
| `always-raining` | Always Grip Weather | **Windswept** | season | Every race favours Aggression and Grip. |
| `wild-weather` | Wild Weather | **Changeable** | season | Neutral skies become rare; every dry weather is as likely. |

For the builder: change the five `name` strings in `src/data/ruleCards.ts` only (ids, blurbs, readouts and patches stay), then `npm run glossary`.

**Status (Oct 8):** the dry half is built in the v0.5 bundle PR (version 0.5.0, merged by Pax). Retired with it: the 31 tracks, track events, the 17 condition tags, the 3 track characters, the 5 inflictions (parked in `docs/story/2026-10-08-horror-deck-parked.md`).

## Build notes
- **Dry favours are static for the race,** so they apply like gear and traits: field-wide multipliers at race build, reusing the card math (`applyCards`).
- **Wet needs the engine hook** ([any stat ± N% on a timer](https://github.com/GrizzlyPax/Parabolica/issues/332)) plus lap-by-lap state, the wet tyre in tyre and pit logic, and the pit-rule suspension.
- **Deleting 31 tracks and the old weathers moves the golden fingerprint.** Intended content change: bump the version.
- Weather and track determinism stay as they are: same seed, same storm, on every device.

## Later
Volatile weathers in themed decks (raining frogs, blood moon) · more volatile weather (fog rolling in, gusts) · intermediates · more tracks + flavour names · calibration of the favour size (#362).
