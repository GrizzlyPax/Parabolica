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

`raceFingerprint(result)` hashes finish order + DNFs + race length; `batchFingerprint` hashes the batch. The Physics tab shows `#xxxxxxxx` beside its seed; `npm run lab -- <seed> <races> all [cards…]` prints the same one from the terminal. Equal fingerprints = the same races were run. Different = the engine changed (or a card/variable differs).

## Physics calibration

**Question:** do the race rules produce racing? `src/racecontrol/physics.ts` runs a seeded batch of untagged races (card `no-tags`, 100 races by default, current tracks in order) and reads the mechanics-probe metrics: pace→finish and grid→finish Spearman, pole wins, top-3-package wins, passes, battles, distinct leaders, winning margin, stops per finisher, first-stop distance, stop-lap spread, quick/slow stop share, DNF rate and split, safety cars, close calls, lapped and penalised finishers, race length. Each has a plain-words meaning and a band; out-of-band rows are flagged.

The knobs table lists every `SimVariables` entry (`src/racecontrol/knobs.ts`: path, label, meaning, format, range). Click a knob, edit it (field or slider), **Measure**: the same seeded batch runs with your variables and the metrics table gains Yours and Δ columns (Δ above 10% is highlighted). Edits accumulate; **Copy as code** gives `path: value` lines for `CANON_VARIABLES`. **Re-roll** changes the seed so you can see how much of a number is dice.

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

**Try a change:** click a tag row, edit its effect numbers (and trigger chance), **Measure**: your version is calibrated the same way (same seeds, same pairing) and shown beside the shipped row with a verdict (real change / within noise / out of band) and **Copy as code**. Leaving the numbers alone and measuring at 200 races lands exactly on the table's row — the parity check. **Re-roll** re-measures every tag on a fresh seed (25–100 races each) and adds a Δ column, flagged when the difference is beyond the noise.

## Working changes, presets and the notebook

Both tabs edit one shared set of **working changes** (tag definitions + knob values). Measure on either tab runs everything edited together — tag calibration runs under your knob edits too. Name the set in the strip → **Save as preset**. Presets and every finished measurement (seed, races, preset, full result) live in this browser's **Notebook** tab (`src/racecontrol/notebook.ts`, localStorage `parabolica.lab.notebook`, last 60 runs); download it as JSON to keep or share, copy any run as markdown.

**Race under a preset:** Quick Race → Run Setup → *Lab preset*. `applyLabPreset(ruleset, preset)` (`src/rules/ruleset.ts`) patches `simVars` with the knob edits and makes `poolTags` return the edited tag definitions, so genesis draws your versions. The rules readout names the preset. Acquired / in-race tags are not patched (presets edit genesis tags only).

## Commands

| | |
|---|---|
| `npm run lab -- 2026 100 all no-tags` | replay a Physics batch, print fingerprint + headline numbers |
| `npm run lab -- 2026 100 all no-tags rain` | …under a card hand |
| `npm run calibrate` | re-measure every genesis tag, rewrite the JSON (~15 min) |
| `npm run calibrate -- 50 glass-cannon the-natural` | quick read of named tags, nothing written |
| `npx tsx scripts/mechanics-probe.mjs 200` | the no-tag mechanics gates (#246) |

## Exports

- Calibration: Copy as markdown (the table with seed, cards, fingerprint) · Download JSON (the file itself).
- Physics: Copy as code for edited knobs; the seed, race count and fingerprint are on screen and in `npm run lab`.

## Known gaps (parked)

- The Heretic's variables replace the ruleset's simVars wholesale, so a card that patches simVars (tough-tyres) is overridden in a heretic run. Canon honours the card.
- The safety-car count reads `unsafety_car_deployed`, which the engine logs twice (#246); the lab halves it.
- BetLab (odds) was removed from the app (git history has it); `src/betting/utils.ts` keeps the odds math for the NPC-crowd work.
- Calibration measures a tag solo in a tag-free field. A tag's value in a real grid (other tags, cards) is a different question, not yet measured.
