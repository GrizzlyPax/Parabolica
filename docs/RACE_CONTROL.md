# Race Control — the lab

Race Control is the in-game lab (main menu → Race Control, no longer locked). Its one rule: **a lab race is a league race.** Every number it shows was produced by the same engine, the same setup path and a seed you can replay anywhere.

## The parity rule

`src/racecontrol/runner.ts` is the only way the lab builds a race:

```
labSpec(batchSeed, i, cardIds, trackMode)   → { seed, trackId, cardIds }
runLabRace(spec, { variables? })            → oneRaceSeason(seed, trackId, ruleset) + prepareScheduledRace(engine, league, 0, track, simVars)
                                               engine.runHeadless(league.schedule[0].seed)
```

Since #612 the lab's field is the **Season pool**: `oneRaceSeason` (`src/season/quickRace.ts`) generates the pool for the seed (10 teams × 2 drivers, a rack of cars, genesis traits under the card hand), lets the CPU draft it, and shapes round 0 with `leagueForRound`; `prepareScheduledRace` is what the Season race view and the settle use. Quick Race is the same call with a seed-picked track. So the lab measures the field players race, with seeded weather (`weatherForRace`) and the ruleset's simVars. Nothing in the lab touches `Math.random`. (Before #612 the lab raced 11 World Deck teams through `createLeague`; fingerprints from then are a different field. The ad-hoc probes in `scripts/` still build their own leagues.)

Race *i* of a batch derives from `deriveSeed(batchSeed, 'lab', i)` — universe seed, track pick — so one race can be rebuilt on its own.

## Running where workers are blocked

Every lab job goes through `src/racecontrol/labRunner.ts`: it uses a Web Worker when the page allows one and falls back to the main thread when it doesn't (the artifact preview blocks workers). The UI says "running on the main thread" when that happens. Either way the same code and the same seeds run.

## Fingerprints

`raceFingerprint(result)` hashes finish order + DNFs + race length; `batchFingerprint` hashes the batch. The Physics tab shows `#xxxxxxxx` beside its seed; `npm run lab -- <seed> <races> all [cards…]` prints the same one from the terminal. Equal fingerprints = the same races were run. Different = the engine changed (or a card/variable differs).

## Physics calibration

**Question:** do the race rules produce racing? `src/racecontrol/physics.ts` runs a seeded batch of card-free races (card `no-tags`, No Traits, 100 races by default, current tracks in order) and reads the mechanics-probe metrics: pace→finish and grid→finish Spearman, pole wins, top-3-package wins, passes, battles, distinct leaders, winning margin, stops per finisher, first-stop distance, stop-lap spread, quick/slow stop share, DNF rate and split, safety cars, close calls, lapped and penalised finishers, race length. Each has a plain-words meaning and a band; out-of-band rows are flagged.

The knobs table lists every `SimVariables` entry (`src/racecontrol/knobs.ts`: path, label, meaning, format, range). Click a knob, edit it (field or slider), **Measure**: the same seeded batch runs with your variables and the metrics table gains Yours and Δ columns (Δ above 10% is highlighted). Edits accumulate; **Copy as code** gives `path: value` lines for `CANON_VARIABLES`. **Re-roll** changes the seed so you can see how much of a number is dice.

## Cards (no calibration)

Tags retired in #334 (the map is on the issue). A card is arithmetic on a stat at roster build (`src/cards/apply.ts`), so there is nothing to measure per card: the stat's weight under Physics is the card's weight. **Race Control → Deck** lists every card with its numbers. The five in-race states that used to be tags (Damaged, Spun, Cooked tyres, Sulking, Fired up) are now plain timed effects in the engine (`IN_RACE_EFFECTS` in `src/RaceEngine.ts`); the World Deck → Effects tab lists them.

## Working changes, presets and the notebook

Physics edits one set of **working changes** (knob values). Name the set in the strip → **Save as preset**. Presets and every finished measurement (seed, races, preset, full result) live in this browser's **Notebook** tab (`src/racecontrol/notebook.ts`, localStorage `parabolica.lab.notebook`, last 60 runs); download it as JSON to keep or share, copy any run as markdown.

**Race under a preset:** Race Control → Run setup → *Lab preset* (Run setup moved here from Quick Race in #605; Quick Race now starts a one-race Season with no setup). Quick Race and Season build their fields with the Season pool (`generateSeasonPool` → `leagueForRound`), while the lab measures `createLeague` fields: both go through `prepareScheduledRace`, but the fields differ in shape (11 deck teams vs the Season pool). `applyLabPreset(ruleset, preset)` (`src/rules/ruleset.ts`) patches `simVars` with the knob edits. The rules readout names the preset.

## The shared ledger (any device, readable by agents)

The repo is the database. **Notebook → Send N new** opens one prefilled GitHub issue labelled `ledger` carrying every unsent run and preset as a JSON batch (compact; split across presses past ~7 KB). You press Submit. `.github/workflows/ledger.yml` runs `scripts/ledger-ingest.mjs`: it appends runs to `public/ledger/runs.jsonl` (deduped by id), upserts presets into `public/ledger/presets.json`, commits to main, comments a receipt and closes the issue. Main redeploys, the site serves `/ledger/*`, and the Notebook's **Shared ledger** section (and Run Setup's preset picker, as "(shared)") shows it everywhere. Closed `ledger` issues are receipts, not clutter. Agents read it with `cat public/ledger/runs.jsonl`.

## Commands

| | |
|---|---|
| `npm run lab -- 2026 100 all no-tags` | replay a Physics batch, print fingerprint + headline numbers |
| `npm run lab -- 2026 100 all no-tags rain` | …under a card hand |
| `npx tsx scripts/mechanics-probe.mjs 200` | the card-free mechanics gates (#246) |

## Exports

- Physics: Copy as code for edited knobs; the seed, race count and fingerprint are on screen and in `npm run lab`.

## Known gaps (parked)

- The Heretic's variables replace the ruleset's simVars wholesale, so a card that patches simVars (tough-tyres) is overridden in a heretic run. Canon honours the card.
- The safety-car count reads `unsafety_car_deployed`, which the engine logs twice (#246); the lab halves it.
- BetLab (odds) was removed from the app (git history has it); `src/betting/utils.ts` keeps the odds math for the NPC-crowd work.
- Calibration measures a tag solo in a tag-free field. A tag's value in a real grid (other tags, cards) is a different question, not yet measured.
