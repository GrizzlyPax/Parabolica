# Balance Handoff — context for the game dev

*June 2026. Everything you need to run a balance pass on Parabolica: the data
exports, the tuning surface, where balance stands today, and how we work
together. Companion to `SIM_MECHANICS.md` (the deep stat truth doc).*

---

## TL;DR

- Parabolica is a deterministic F1-style race sim. **A race is a pure function
  of its seed** — same seed + roster + config = the same race, every time.
- **All balance numbers live in one place**: `CANON_VARIABLES` in
  `src/simlab/types.ts`. That's the tuning surface.
- There are **three data exports** (all copy-to-clipboard, all plain text):
  the **SimLab batch report** (population balance), the **race strategy report**
  (single-race markdown), and the **season report** (one league). Details below.
- **Role split**: you recommend the tuning (what numbers, why); Claude builds
  the mechanical changes and validates them through the export loop. The
  exports are the interface between us.

---

## The three exports

### 1. SimLab batch report — the primary balance tool
**What:** population-level stats over N races (run 2,000 for stable signal).
**Where:** in-app → **Compendium → SimLab** → set batch size + tracks → Run →
**Copy** (TSV, pastes into a spreadsheet).
**Contains:**
- **STAT IMPACT** — each stat's Q1→Q5 win-rate delta (the headline balance
  table: how much each stat actually decides races).
- **TAG PERFORMANCE** (driver/car/team) — win/podium/DNF rate per tag.
- **TAG × WEATHER** matrix + **CONDITION-REACTIVE TAGS** (in-condition vs out).
- **TRACK TAG PERFORMANCE** (race-level: DNF%, crashes, lead changes).
- **WEATHER DISTRIBUTION**, **TRACK PERFORMANCE** (per-track DNF/crash/etc.),
  **TIRE** usage + stint + blowout, **DNF by phase**, **field spread**.
- **A/B mode**: edit variables ("Heretic") and the report shows canon-vs-edited
  deltas side by side — this is how you test a tuning change before committing.

This is where you'll spend most of your time. One batch ≈ the whole balance
picture.

### 2. Race strategy report — single-race diagnosis (markdown)
**What:** exactly how one race unfolded — classification with grid→finish
deltas, tyre stints with lap counts (`M4 → H5 → S3`), per-stop detail
(compound change, pit-lane time, slow-stop flags), safety-car periods, DNFs
with exit lap + reason.
**Where:** **Chronicle** (any settled race → "📋 Copy race report", a
deterministic replay) **or** the live **Lap view** header ("📋 Copy report",
works mid-race).
**For:** diagnosing *specific* behaviour the aggregates hide — e.g. "why did
8 of 12 cars run the identical strategy?" These are great to paste when
flagging a concrete issue.

### 3. Season report — one league's shape (TSV)
**What:** a finished league's per-driver **rolled stats + tags**, **car/team
hardware**, race-by-race results, and a **stat-vs-outcome Pearson** section
(each stat's correlation with points and DNFs over that season).
**Where:** a completed league → "📋 Copy season report".
**For:** sanity-checking that a real season's outcomes track the stats; good
for spotting a tag or car that over/under-performs in practice.

---

## The tuning surface: `CANON_VARIABLES`

`src/simlab/types.ts` → `CANON_VARIABLES`. Grouped knobs (all live-tunable in
SimLab's Heretic editor):

| Group | Controls |
|---|---|
| `tires` | per-compound speed bonus, wear rate, cliff, blowout risk; tire-mgmt effect |
| `crashes` | base crash chance, proximity threshold, pileup/survival odds, stat factors |
| `mechanical` | failure chance, reliability scaling, luck |
| `pits` | base pit chance, wear bonus, slow/quick-stop odds, durations |
| `performance` | luck proc chance + magnitude, endurance decay, accel/aggression effects |
| `carStats` | **powerBase/powerPerStar**, grip, reliability, tire-mgmt, pit-crew per-star |
| `blowouts`, `safetyCar`, `driverSpeed` | tire-failure model, SC behaviour, base speed range + **speedStatMultiplier** |

Two compression knobs matter most for the driver-vs-car balance:
`driverSpeed.speedStatMultiplier` (currently **0.12** — driver speed is heavily
compressed) and `carStats.powerPerStar` (currently **0.018**, *uncompressed* —
see #162 below).

**Tag magnitudes** live separately in `src/data/tags.ts` (each tag's
`effects` + `tier`); weather in `src/data/weather.ts`; track tags in
`src/data/trackTags.ts`.

---

## Where balance stands today

Read `docs/SIM_MECHANICS.md` §5 for the full stat truth table. Summary:

**Calibrated and healthy (rebalance v2):**
- Driver stats form a sensible ladder; Acceleration and Tire-Mgmt (formerly
  dead stats) are alive. Luck is flavour (~0.6% Δ), Reliability is survival.
- **Tags FIXED (#156)**: the old 9× destinies are gone — smooth 2.6×→0.4× win
  ladder, conditional gating + tiers. Validated at 2,000 races.
- **Conditions layer live**: weather + track tags, deterministic, with mid-race
  inflictions. All measurable in SimLab.

**Canon since v0.3.31 — rebalance v3 (the #220 dominance flip):**
- **#162 Car Power compression FLIPPED**: `powerPerStar 0.014` / `powerBase
  0.942` (3★ midpoint preserved; 1★→5★ spread 7.6%→5.6%). The re-baseline had
  confirmed uncompressed Power at Δ 13.2% (~1.8× the #2 stat); post-flip it
  reads ~+10%, still #1 but now ~1.2× Consistency — watch that margin when
  tuning anything that feeds Consistency.
- **#82 Mistakes layer LIVE**: `mistakeBaseChance 1.5e-4` (+ consistency 1.5 /
  aggression 0.5 weights, 0.85× for 150t, 300t refractory). Picked by an
  80-paired-universe `mistakeBaseChance` sweep: this value cuts >50%-runaway
  universes 18%→**10%** (target 8–12) and median champ win share 38%→33%, DNF
  flat — and raising it further bought nothing but feed spam (sweep was noise
  above 1.5e-4). Races now have ~0.4 mistakes/driver (spins, lock-ups — each
  one a feed story). Logged as `driver_error` events.

**Calibrated and healthy (rebalance v2):**
- Driver stats form a sensible ladder; Acceleration and Tire-Mgmt (formerly
  dead stats) are alive. Luck is flavour, Reliability is survival.
- **Tags FIXED (#156)**: the old 9× destinies are gone — smooth 2.6×→0.4× win
  ladder, conditional gating + tiers. Validated at 2,000 races.
- **Conditions layer live**: weather + track tags, deterministic, with mid-race
  inflictions. All measurable in SimLab.

**Open balance flags (your territory):**
- **#195 strategy variety levers — built, dormant, yours to tune**:
  `pits.strategyWearLean` (strategy archetypes — short/standard/long camps;
  0.12 → distinct strategies/race 8.2→9.8) and `pits.scPitChance` (cheap stops
  under the safety car; +0.15 → 10.6). Both byte-identical at canon 0. The
  window knobs (`basePitChance` etc.) are honest but nearly inert — don't
  expect them to move anything (the wear trigger times ~all stops; see
  `SIM_MECHANICS.md` §4).
- **#171 Content wave** — new tags across all layers are pending; each ships
  with a lab batch proving its tier (partnered flavour + balance).
- **#106 Morale** — on hold (snowball risk; redesign later).

---

## How we work together

```
You (game dev)                          Claude
──────────────                          ──────
run SimLab / read reports   ──────►
recommend tuning (numbers, why)  ──►    builds the mechanical change
                                        (engine + CANON_VARIABLES + tags)
                            ◄──────     ships it; runs the probe / asks you
                                        to re-run a batch
re-run batch, confirm/iterate ─────►    locks it in
```

- **You own**: which numbers to change and why (the balance judgement),
  reading the exports, proposing target metrics ("Car Power Δ should be ~6%,
  not 12.8%").
- **Claude owns**: mechanical correctness, building the changes safely
  (determinism, tests), and the legibility refactors that turn opaque logic
  into tunable knobs (like the simVars system, and the strategy module coming
  out of #195).
- **The interface**: the exports above + recommended `CANON_VARIABLES` deltas.
  Send a before/after SimLab batch with any proposal and it's unambiguous.

### What's most useful to send back
1. **SimLab batches** (before + after a proposed change) — the gold standard.
2. **Specific race reports** when flagging a behaviour ("this stint pattern is
   wrong").
3. **Recommended `CANON_VARIABLES` deltas** with target metrics.

### Fast local iteration (optional)
`scripts/tag-probe.mjs` runs a headless win-rate probe in ~10s
(`npx tsx scripts/tag-probe.mjs 1500 rolled`) — useful for quick tag/condition
checks without a full in-app batch. (A node-runnable full SimLab is tracked in
#165 if you'd want batch automation.)

---

## Key files to know
- `src/simlab/types.ts` — **`CANON_VARIABLES`** (the knobs) + the SimLab types.
- `src/RaceEngine.ts` — the simulation (speed formula, crashes, tires, pits).
- `src/data/{tags,weather,trackTags,inflictions}.ts` — content + magnitudes.
- `docs/SIM_MECHANICS.md` — the deep stat truth doc (formulas, magnitudes,
  rebalance history).
- `docs/TAG_SYSTEM.md`, `docs/CONDITIONS_LAYER.md` — the tag/conditions design.
