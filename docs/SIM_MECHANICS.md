# Sim Mechanics — How the Stats Actually Work

*June 2026. Written from a line-by-line read of `RaceEngine.ts`, reconciled
against a 2,000-race SimLab batch (44,000 driver-races). Every claim cites
the formula. This is the foundation doc for rebalancing and for tag design —
when a tag says "+10% speed," this is what that means.*

All tunables live in `CANON_VARIABLES` (`src/simlab/types.ts`) and are
injectable per-engine via `createForWorker(simVars)` — which is also the
hook for per-league physics later.

---

## 1. The tick pipeline

Every 100ms (live) or as fast as possible (headless), `tick()` runs, in order:

1. **Tag triggers** — race_start (tick 1), final_lap, crash_proximity, etc.
2. **Crash detection** — find proximity pairs, roll crash risk *(before movement)*
3. **Unsafety Car** — movement/recall if active
4. **Per driver**: pit handling → speed calculation → tire wear → blowout
   check → mechanical check → move forward
5. **Bookkeeping** — lap completions, finish detection, lead changes,
   overtake events

A race is ~2,200–2,400 ticks (lab: avg 2,250 ≈ 3.75 min live).

## 2. The speed formula (the heart)

`calculateSpeed()` (RaceEngine.ts ~948), per driver per tick:

```
finalSpeed = baseRoll × statsModifier × consistencyEffect × luckBonus
           × enduranceFactor × trackEventModifier × tagSpeedModifier
           (then × tireModifier, applied in tick())
```

Factor by factor, with canon numbers and **effective magnitude**:

| Factor | Formula | Effective swing |
|---|---|---|
| `baseRoll` | uniform 5–10 (`baseSpeedMin/Max`) | ±33% around mean — **the noise floor everything fights against** |
| `statsModifier` | `(1 + (baseSpeed−1)×0.12) × (0.942 + power×0.014)` | driver speed stat (0.85–1.15): **±1.8%**. Car power (1–5★): **0.956→1.012, a 5.6% spread — still the biggest deterministic factor** (compressed from 7.6% in rebalance v3, #162) |
| `consistencyEffect` | shrinks the baseRoll's variance by `consistency × gripMod` (grip: 0.82+0.045/★ → 0.865–1.045) | consistency (0.3–0.8) recovers up to ~35% of variance (`consistencyWeight 0.35`). Grip only multiplies consistency — a **second-order stat by construction** |
| `luckBonus` | 2.5%/tick proc; boost = 2–8% base + luck-scaled up to ~23% | expected value ≈ **+0.3% speed** — cosmetically exciting, statistically invisible |
| `enduranceFactor` | penalty grows with lap progress, scaled by `(2 − endurance)`, capped −15% | endurance (0.85–1.15) swings the late-race penalty ±~1.5% avg — **mild but real** |
| `tireModifier` | soft ×1.08 / med ×1.00 / hard ×0.94, degraded by wear cliff (precliff −5% from 40% wear; cliff up to −40%, floor 0.60) | **±8–14%** — huge, but partially self-cancelling via pit strategy |

**Reading: the speed race is `car power > consistency ≈ tires > driver speed
stat > endurance >> luck`. Confirmed by lab Q1→Q5 win deltas: Power +7.0,
Consistency +4.3, Speed +4.0, Endurance +1.5, Luck +0.3.**

*Correction (June 2026, dominance pass): consistency is not just variance
shrink — because `consistencyEffect` multiplies the roll it corrects, it
carries a Jensen penalty of `κ·Var(roll)` (κ = (1−c_eff)×0.35) in expected
speed. Across the stat range that's ~5% of mean pace, comparable to power's
7.6%. Its win impact is substantially a hidden flat-speed effect. See
`BALANCE_DOMINANCE_PASS.md` §2.*

## 3. Attrition (the Scrap Heap's domain)

Lab: 21.2% DNF rate, 4.7 DNFs/race, 48% of DNFs in the first third.

### Crashes (~36% of DNFs)
`detectProximityPairs()` → drivers within 2.5% of a lap of each other (after
a 50-tick grace period — why DNFs skew early is *not* the grace period; it's
that the field is bunched early, creating many proximity pairs).

Per pair per tick: `baseCrashChance 0.00008`
× `(1 + (0.4 − avgConsistency))` — low consistency drivers crash more
× `(1 + avgWear/200)` — worn tires crash more
× `(1 − avgLuck×0.3)` — luck saves
On crash: 70% survive with damage (−15% speed permanently); pileups chain
with 15% participation per nearby driver; pileups (2+) summon the Unsafety
Car. Under SC, crash risk ×0.05.

### Tire blowouts (~33% of DNFs)
Zero risk below the compound's `criticalAt` (70/75/80%). Past it, risk grows
quadratically up to 5× base (`riskExponent 2, riskMultiplier 4`).
**Aggression adds up to +50% blowout chance** (`aggressionBonus 0.5`).
Lab: soft 3.06% blowout/stint, hard 1.01%.

### Mechanicals (~31% of DNFs)
Per tick: `0.00005 / (0.4 + reliability×0.2) × (1.4 − luck×0.75)`.
Reliability 1★→5★ roughly halves failures (lab DNF: 23.7%→19.2%).

## 4. Tires & pits — rewritten v0.4.0 (#246 pass 1, #249)

*The audit (Oct 2026, `claude/mechanics-audit`) found tyre life was a share
of race distance, a stop cost ~60% of a lap, soft→hard was a 15% pace gap,
and the "pit window" was dead code. All four are gone.*

- **Life is in laps.** `lifeLaps` per compound = laps from fresh to the
  cliff (`criticalAt`) at mid aggression and 3★ tyre management: **soft 5,
  medium 7, hard 9**. Wear/tick = `criticalAt/lifeLaps × lapFraction ×
  aggF × mgmtF`. A 32-lap race needs twice the stops of a 16-lap one.
- **Pace gap 3%**: soft 1.015 / medium 1.00 / hard 0.985. Pre-cliff fade
  (−5% from 40% wear) means a 60%-worn soft is already slower than a fresh
  medium — that is the crossover the stop decision reads.
- **The cliff hurts on every compound**: severity S 0.85 / M 0.7 / H 0.6
  (hard was 0.3 and softer than a worn medium). One lap past the cliff on a
  soft is roughly −16% pace plus blowout exposure.
- **A stop costs ~25% of a lap all-in** (was ~60%): pit-lane speed limit 6
  (was 4), stationary work 24 ticks (was 60; slow ×1.5, quick ×0.75). Under
  the Unsafety Car the field runs half pace so the same stop costs ~half.
- **The stop rule (#249)**: `pits.minStops 2`, `pits.requireAllCompounds
  true`, enforced at the flag: each unmet stop or compound adds
  `penaltyLapFraction` (0.5) of the driver's own average lap to their finish
  time. Classification sorts lead-lap finishers by `finishTick +
  penaltyTicks`; a `penalty` event and `Driver.penaltyReason` carry the why.
  The **No Pit Rules** card sets both to off.
- **The decision (`shouldDriverPit`)**, once per lap at the pit-entry zone,
  every path a radio line (logged in the `pit_entry` event):
  1. never on the last lap;
  2. **cliff** — wear ≥ `criticalAt × (1 + archetype × strategyWearLean)`;
  3. **ahead of the cliff** — wear + this driver's wear-per-lap would cross
     it before the next chance (so stops land a lap *before* the cliff;
     the archetype lean 0.1 lets aggressive camps dip into it and
     conservative camps pit a lap early);
  4. **safety car** — a stop is owed and the SC is out: `scPitChance 0.5`;
  5. **the rule** — a stop is owed and `lapsLeft − buffer ≤ owed`.
  No random window roll remains; the old `basePitChance/wearPitBonus/
  windowOffsetPerStat/windowHalfWidth/luckPit*` knobs are deleted.
- **Compound choice (`selectNewTires`)**: from the compounds still owed (or
  anything but the one coming off), score = shortfall vs the stint it has to
  cover (laps left ÷ stops still owed + 1) × 4 + pace penalty + archetype
  tie-break (aggressive softer, conservative harder).
- **Unsafety Car trigger** (also here): a stranded car brings it out with
  `safetyCar.deployChancePerDnf` (0.5); 3+ cars always. Every crash used to.

Probe (`scripts/mechanics-probe.mjs 150 1`, no tags): stops/finisher
3.0→2.1, pit lane time 0.87→0.53 lap (net ~0.2), blowouts 29%→4% of DNFs,
winning margin 14%→6% of a lap, top-3 package wins 36%→46%, SC/race
0.97→0.75, stops by reason: ahead of the cliff 68% · safety car 28% · the
rule 3%. Plans seen: M→S→H, S→M→H, M→H→S, H→S→M, H→M→S.

Still open from the audit: no grid, no overtaking, no undercut (position
has no value yet), weather/wets, the consistency formula.

## 4b. Qualifying, the grid and overtaking — new in v0.4.1–0.4.2 (#246 passes 2–3)

**Qualifying (`runQualifying`, tick 1).** One scored hot lap per driver:
`packagePace × (1 + z·qualiNoise·(1.2 − consistency)) × flub × (0.98 + 0.02·grip)`,
z ~ N(0,1) from `deriveSeed(seed,'quali',id)` (a side stream; the race RNG
is untouched), `qualiFlubChance` 6% of a ruined lap (×0.95). The grid
staggers the start: P1 on the line, each slot `grid.slotSpacing` (0.5%) of
a lap back. `engine.getGridOrder()`; the lap-0 snapshot is the grid.
Measured: grid vs package Spearman 0.70.

**Overtaking (`resolveOvertake`).** Drivers move front-to-back each tick.
A chaser that would come within `followGap` (0.6% of a lap) of the racing
car directly ahead *on the same lap* is held there until a per-tick pass
roll lands:

```
p = attemptBase (0.008)
  × max(0, 1 + (steadyPace_chaser / steadyPace_ahead − 1) × paceWeight (15))
  × (1 + (wear_ahead − wear_chaser)/100 × tyreWeight (1))
  × (0.6 … 1.4 by aggression)
  ÷ (1 + (consistency_ahead − 0.55) × defenderWeight (1.2))
  ÷ track difficulty (high-speed 0.75 · technical 1.5 · hazardous 1.1)
```
`steadyPace` = package × tyre modifier (not the tick's noisy roll). Under
the Unsafety Car p = 0. A held car runs in dirty air next tick (−3%).
After `battleTicks` (20) stuck behind the same car the feed logs a
`battle`; a pass logs `overtake` ("passes X after a fight"). Lapping is
free (different lap). Cars held in line crash at ×`heldCrashFactor`
(0.25) — the risk lives in the pass, not the queue. `engine.getBattles()`
feeds the tower (⚔ on the attacker's interval) and the map (pulsing ring
on the defender).

Measured (100 no-tag races): grid→finish 0.35 → **0.66**, pole wins 13% →
**26%**, package→finish 0.43 → **0.61**, ~70 passes and ~50 battles a race,
DNF 17.6%, SC 0.72/race. Leader margin widened (12% of a lap): clean air
is worth something now. Lapped finishers 34% — trains hold the midfield
back; a DRS-style straight-line boost and the grid/launch pass are the
next levers.

## 5. THE STAT TRUTH TABLE

*Numbers below are the **rebalance v3 canon** (v0.3.31: #162 power
compression + #82 mistakes live): 1,500-race CLI probe
(`scripts/stat-impact.mjs`), fresh rosters, rolled weather. This is the
authoritative current baseline. Where v0.3.30 (pre-flip, Pax's 2,000-race
batch) differed materially it's noted in-row.*

| Stat | Where it acts | Lab Δ (Q1→Q5 win) | Verdict |
|---|---|---|---|
| **Car Power** | speed multiplier (compressed, #162) | **+10.2%** (1.0→11.2) | ✅ #1 — was **+13.2%** uncompressed (v0.3.30) |
| **Consistency** | variance shrink + Jensen mean-pace + mistake avoidance (#82) | **+8.9%** (1.1→10.0) | ✅ #2 — mistakes lifted it from +7.4%; **Power margin now ~1.15×, watch it** |
| **Speed (driver)** | speed multiplier (compressed ×0.12) | **+5.7%** (2.0→7.7) | ✅ Works |
| **Acceleration** | launch / pit-exit / SC-restart windows | **+5.5%** (2.1→7.6) | ✅ **Alive** (was a dead stat; accelEffect, rebalance v2) |
| **Pit Crew** | slow/quick stop odds | +3.6% (2.7→6.3) | 🟡 Mild but real |
| **Grip** | multiplies consistency only | +3.0% (3.0→6.0) | 🟠 Second-order |
| **Tire Mgmt (team)** | tire wear rate | +2.9% (3.1→6.0) | ✅ **Alive** (was a dead stat) |
| **Aggression** | traffic reward vs wear/blowout/mistake cost (#82 adds a non-fatal cost) | **+2.0%** (2.7→4.7) | ✅ Both-sided gamble (≥ +1% acceptance held) |
| **Endurance** | late-race decay resistance | +1.5% (3.9→5.4) | 🟡 Mild |
| **Luck** | tiny speed procs + crash/mech savings | +0.8% | 🟠 Flavor, not force |
| **Reliability** | mechanical failures | −0.5% (DNF Q1 27.7→Q5 21.1 at v0.3.30) | 🟡 Survival, not wins |

*History of the Car Power number:* uncompressed canon measured **13.2%**
(v0.3.30 re-baseline, 2,000 races) — essentially the old #162 figure (12.8%);
it never shrank with rebalance v2 (the "+7.0%"/"~5.7%" readings were
smaller/older batches, retired). That was the empirical case for the v3
compression, which brought it to ~+10% while keeping it #1. The §2 pace
spread (5.6% post-compression) is a different axis — an input, not a win Δ.

### Tags: destiny → spice (FIXED, v0.3.3–v0.3.4, #156)

**Before** (2,000-race lab): a rolled tag outweighed every stat combined —
Rain Dancer **41.5%** win (9×), Front Runners 23.1% (5×), Glass Cannon 14.8%
(3×), while Sunday Driver (0.1%) and Cursed Chassis (0.04%) were death
sentences. The cause: "conditional" tags were passive-but-ungated (always-on),
and the always-on passives sat at unladdered magnitudes.

**Fix:** C1 added live conditional gating (`evaluateTagCondition` per tick, no
RNG) + a `tier` field; then a magnitude-calibration pass on the always-on
passives. After (1,500-race headless probe, `scripts/tag-probe.mjs`):

| Tag | Win% | × base (≈4.5%) | Tier |
|---|---|---|---|
| 🐢 Sunday Driver | 11.9% | 2.6× | power (late-race surge) |
| 💎 Glass Cannon | 11.0% | 2.4× | power (was 4.5×) |
| 👑 Front Runners | 10.8% | 2.4× | power, gated top-5 (was 5×) |
| 🎯 Clutch Performer | 9.0% | 2.0× | power |
| 🔧 Pit Lane Special | 6.1% | 1.3× | trait |
| 🐕 Underdog Spirit | 4.9% | 1.1× | trait, gated bottom-half |
| 🌧️ Rain Dancer | 5.1% blended | 1.1× | destiny in the wet (C2): **4% dry → 35% in rain**, rain ~6% of races |
| 🌀 Chaotic Energy | 2.8% | 0.6× | power (swingy) |
| 👻 Cursed Chassis | 1.7% | 0.4× | cursed, not doomed (was 0.04×) |

A smooth ladder (2.6× → 0.4×), no destinies, no death sentences. Top band is
slightly above the ~2× Power ceiling — acceptable for now. **Rain Dancer can't
be fully validated until the weather layer exists** (it gates on `rain`); and
the lab is still blind to track-event tags (`TRACK EVENTS` empty). Calibrate
those once C2/C3 land.

### Other lab observations (post-#195 re-baseline, v0.3.30)
- **SC Lap % now 12.3%** (was a flagged 0.4% undercount) — sensible for 5.1
  DNFs/race; the earlier suspiciously-low reading is resolved.
- **DNF 23.2%**, 5.1/race — at the top of the 21–23% target band. Phase split
  early/mid/late 45/29/25% (crash-front-loaded). Weather lifts it: rain 26.4%
  vs clear 22.8%.
- **Tyres:** usage S45/M23/H32%; stints S2.7/M3.9/H5.3 laps; blowout rate
  S3.0/M1.7/H1.0% — the soft sprint/hard endurance trade reads correctly.
  Avg 2.80 stops/race (mandatory 2). No M→M distortion after the v0.3.30 fix.
- **TRACK EVENTS table is empty** — the lab does not wire `eventTrigger`/
  `eventEffect` when configuring tracks (settle and live do). The lab is
  blind to a whole system it should be measuring. Fix before trusting
  per-track numbers.
- Track DNF spread 21.8%–30.5% — good, tracks have personality.

## 6. Rebalance — CANON v3 (June 2026, v0.3.31: the #220 dominance flip)

The season-dominance pass (#220, `BALANCE_DOMINANCE_PASS.md`) flipped two
mechanisms into canon together:

| Change | Values | Validated effect |
|---|---|---|
| **#82 mistakes layer** | `mistakeBaseChance 1.5e-4`, consistency weight 1.5, aggression weight 0.5, 0.85× for 150t, 300t refractory | 80-paired-universe A/B: >50%-runaway universes 18%→**10%** (target 8–12), median champ win share 38%→33%, DNF flat 22.9%. The `mistakeBaseChance` sweep was pure noise above 1.5e-4 — more mistakes ≠ less dominance, just feed spam. ~0.4 mistakes/driver/race on broadcast. |
| **#162 power compression** | `powerPerStar 0.018→0.014`, `powerBase 0.93→0.942` (3★ midpoint preserved) | Car Power win Δ 13.2%→~10.2%, still #1; champions shift car-led → driver-led (5★-power champ share ~36%→34%). Parity lever, not a dominance lever — the mistakes carry the dominance targets. |

Acceptance gates at flip (1,500-race CLI probe, `scripts/stat-impact.mjs`):
Power #1 ≥ Consistency ✅ (+10.2 vs +8.9 — margin ~1.15×, down from 1.8×;
**anything that further lifts Consistency risks inverting it**), Aggression
≥ +1% ✅ (+2.0), DNF in band ✅ (23.3%).

## 6b. Rebalance — CANON since v2 (June 2026)

Philosophy: **every stat must answer "when is your moment?"** Stats shouldn't
be flat multipliers fighting the same noise — each gets a situation where it
decides outcomes. Acceleration owns the launches; aggression owns traffic
(reward now matches its existing risk); tire management owns the long stint;
luck stays a gambler's stat but with enough magnitude to notice. All new
mechanics are gated behind variables whose **canon defaults are neutral
(zero)** — live leagues and the golden master are byte-identical until canon
is flipped after lab validation.

| Change | Mechanism | New knob (canon) |
|---|---|---|
| Acceleration wired | speed × `1+(accel−1)×effect` during the launch (first N ticks), for N ticks after each pit exit, and for the whole field at SC restarts | `performance.accelLaunchTicks` (80), `performance.accelEffect` (0) |
| Aggression's reward | aggressive drivers gain speed while in crash-proximity traffic — the same situation that risks wrecking them. True gamble stat. | `performance.aggressionTrafficBoost` (0) |
| Team tire mgmt wired | tire wear × `1+(3−stars)×k` — 3★ neutral, 5★ preserves rubber, 1★ shreds it | `tires.teamTireMgmtWearPerStar` (0) |
| Luck with teeth | raise proc rate + top-end magnitude via existing knobs | (preset only) |

**Status: v2 values are CANON** (verified in a 1,000-race A/B):

| Stat | Old Δ | v2 Δ | Notes |
|---|---|---|---|
| Acceleration | −0.1% | **+2.6%** | clean monotonic gradient Q1→Q5 |
| Aggression | −1.2% | **+1.4%** | and DNF% still climbs 18.3→23.5 — the gamble profile, exactly as designed; winner avg aggression rose 0.531→0.569 |
| Tire Mgmt (team) | 0.0% | **+2.0%** | monotonic |
| Luck | 0.6% | ~0.4% | win impact stays flat at any sane magnitude; its real identity is **survival** (DNF 22.2%→19.4% Q1→Q5) + spectacle. Accepted as such. |
| Power / Consistency / Speed | 6.8 / 4.9 / 4.5 | 5.7 / 3.6 / 4.0 | compressed slightly as the new stats take share — power still king |

Canon values: `accelEffect 0.5`, `aggressionTrafficBoost 0.10`,
`teamTireMgmtWearPerStar 0.03`, `luckProcChance 0.045`,
`luckMaxBoostPerStat 0.25`. Side effect worth knowing: **racing got
closer** — leader margin 6.8%→3.3% of a lap, lead-lap finishers
39.8%→46%, more lead changes. The launch differentiation also trims
early-race crash carnage slightly.

*Lab integrity note: metrics derived from the event log (quick stops, SC
counts, tag events) were garbage before June 2026 — the lab left the
500-event live-UI cap on and luck procs alone log ~1,200 events/race,
so the buffer wrapped repeatedly. Fixed (maxStoredEvents uncapped in the
lab worker). Post-fix reality: SC laps ≈ 11%, quick stops ≈ 19% of stops.*

*Track events: the TRACK EVENTS table is empty because no track defines an
`event` — the engine system (triggers/effects/lab measurement) is fully
built with zero content. Open content opportunity.*

Still open: **tag magnitude pass** alongside the tag system design (tags
currently outweigh the whole stat sheet).

## 7. League-seed physics (the "every universe is different" hook)

Already architecturally free: `settleLeague`/`liveRaceSnapshot`/broadcast all
accept `simVars`. Derive a league's physics deterministically:

```
physicsRng = mulberry32(deriveSeed(leagueSeed, 'physics'))
leagueVars = CANON ± bounded rolls   // never stored — pure f(seed)
```

Candidate dials (safe, characterful ranges): baseCrashChance ×0.5–2 ("this
universe is hungry"), blowout risk ×0.5–2, luckProcChance ×0.5–3, endurance
decay ×0.5–1.5, pit duration ±25%, compound speed gaps. Surface them on the
league screen as **"Laws of this Universe"** — three or four flavored lines
("Tires here are brittle. The void is patient."), which doubles as the
god-flavor surface later. Quick Race keeps CANON.
```
