# Race Control — the lab

Race Control is the in-game lab (main menu → Race Control, no longer locked). Its one rule: **a lab race is a league race.** Every number it shows was produced by the same engine, the same setup path and a seed you can replay anywhere.

## The parity rule

`src/racecontrol/runner.ts` is the only way the lab builds a race:

```
labSpec(batchSeed, i, cardIds, trackMode)   → { seed, teamIds, trackId, cardIds }
runLabRace(spec, { variables?, override? })  → createLeague(seed, …) + prepareScheduledRace(engine, league, 0, track, simVars)
                                               engine.runHeadless(league.schedule[0].seed)
```

`createLeague` and `prepareScheduledRace` are the two calls the live broadcast (`App.handleWatchLive`) and the wall-clock settle (`settle.ts`) use. So a lab race has a genesis roster (11 teams × 2, cars per driver, team shared, genesis tags rolled under the card hand), a current track, seeded weather (`weatherForRace`), the track's intrinsic tags, and the ruleset's simVars. Nothing in the lab touches `Math.random`.

Race *i* of a batch derives from `deriveSeed(batchSeed, 'lab', i)` — universe seed, team shuffle, track pick — so one race can be rebuilt on its own.

## Running where workers are blocked

Every lab job goes through `src/racecontrol/labRunner.ts`: it uses a Web Worker when the page allows one and falls back to the main thread when it doesn't (the artifact preview blocks workers). The UI says "running on the main thread" when that happens. Either way the same code and the same seeds run.

## Fingerprints

`raceFingerprint(result)` hashes finish order + DNFs + race length; `batchFingerprint` hashes the batch. Sim Lab shows `#xxxxxxxx` beside its seed; `npm run lab -- <seed> <races> all [cards…]` prints the same one from the terminal. Equal fingerprints = the same races were run. Different = the engine changed (or a card/variable differs).

## Tag calibration

**Question:** what does a tag do to the driver who carries it?

**Method (paired, solo):** for race *i* of batch 2026 (200 races, card `no-tags`), run it untagged, then again with one tag forced onto roster slot *i mod 22* (a team tag lands on the teammate too). Same seed, grid, weather — only the tag differs. Read the carrier:

| Column | Meaning |
|---|---|
| Places gained | finish position untagged − finish position tagged, averaged (+ = better); ± is the standard error |
| Wins / Podiums / DNF | carrier's rate, with the untagged rate beside it ("field") |
| Procs / race | `tag_activation` events for the carrier per race (passive tags don't log) |

**Bands** (`CALIBRATION_BANDS` in `src/racecontrol/calibrate.ts`): |places| ≤ 6, DNF ≤ 60%, wins ≤ 50%.

**Where it lives:** `src/data/tagCalibration.json` (generated) → `src/data/tagCalibration.ts` → the Race Control table, the World Deck tag detail ("Measured"), and the Measured column of `docs/GLOSSARY.md`.

**The gate:** `src/data/worldDeck.test.ts` fails when a genesis tag is missing from the file, when its mechanical definition (target, trigger, effects, condition, chance, duration — `effectsHash`) changed since it was measured, or when it is out of band. Fix: tune the tag → `npm run calibrate` → commit the tag, the JSON and `npm run glossary`.

**Replicate in the browser:** Race Control → Tag calibration → "Replicate it here" runs one tag's calibration in a worker. With the full 200 races the numbers must equal the file exactly; fewer races gives a noisier read.

## Commands

| | |
|---|---|
| `npm run lab -- 2026 100 all` | replay a Sim Lab batch, print fingerprint + headline numbers |
| `npm run lab -- 2026 100 all no-tags rain` | …under a card hand |
| `npm run calibrate` | re-measure every genesis tag, rewrite the JSON (~15 min) |
| `npm run calibrate -- 50 glass-cannon the-natural` | quick read of named tags, nothing written |
| `npx tsx scripts/mechanics-probe.mjs 200` | the no-tag mechanics gates (#246) |

## Exports

- Calibration: Copy as markdown (the table with seed, cards, fingerprint) · Download JSON (the file itself).
- Sim Lab: JSON and TSV; the config block carries seed, cards and fingerprint.

## Known gaps (parked)

- The Heretic's variables replace the ruleset's simVars wholesale, so a card that patches simVars (tough-tyres) is overridden in a heretic run. Canon honours the card.
- Sim Lab's safety-car count reads `unsafety_car_deployed`, which the engine logs twice (#246); halve it.
- BetLab (odds) was removed from the app (git history has it); `src/betting/utils.ts` keeps the odds math for the NPC-crowd work.
- Calibration measures a tag solo in a tag-free field. A tag's value in a real grid (other tags, cards) is a different question — the Sim Lab tags tab answers it, noisily.
