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
| `statsModifier` | `(1 + (baseSpeed−1)×0.12) × (0.93 + power×0.018)` | driver speed stat (0.85–1.15): **±1.8%**. Car power (1–5★): **0.948→1.02, a 7.6% spread — the single biggest deterministic factor** |
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

## 4. Tires & pits

- Compounds: soft (fast, melts), medium, hard. Mandatory-variety rule tracked
  via `usedCompounds`. **There is no penalty for failing the variety rule** —
  it only shapes the pit *decision*, nothing checks it at the flag.
- Starting compound is **deterministic from stats** (`selectStartingTires`):
  speed>1.08 → soft, endurance>1.08 → hard, else medium. *(Lab's "soft
  starters win 6.9%" is therefore confounded — soft starters ARE the fast
  drivers.)*
- Pit crew (1–5★): slow-stop chance 42%−7%/★, quick-stop 3%+5%/★. Real but
  small (lab Δ+1.7%).

### The pit decision (`shouldDriverPit`) — corrected, v0.3.29 (#195)

The decision has four paths, checked at the pit-entry zone (85% of lap), in
priority order. **Measurement finding: the wear trigger decides ~all stops at
canon.** Zeroing `basePitChance` + `wearPitBonus` changes neither pits/race
(55.5 vs 54.8) nor stop timing (first stop at 26% distance either way) — the
"probabilistic pit window" this doc previously described is nearly inert.
Identical compounds hitting the same wear threshold on the same lap is **why
the field herds into one strategy.**

1. **Wear trigger (binding):** pit when `wear ≥ compound.criticalAt` (70/75/80
   for S/M/H). With `pits.strategyWearLean > 0`, each driver's stable per-race
   **archetype** (short/standard/long, ~⅓ of the field each, drawn from a side
   seed stream that never touches the main RNG) leans this threshold ±lean —
   aggressive camps sprint on fresher rubber, conservative camps stretch into
   the cliff. *Canon 0 = dormant, byte-identical.* At lean 0.12 + SC
   opportunism 0.15 (200 races): distinct strategies/race 8.2→10.6,
   biggest-herd share 31%→24%, DNF flat.
2. **Late-race guard:** no non-critical stop with `≤ pits.lastPitLapBuffer`
   laps left (canon 2). Single source of truth — fixed a v0.3.28 bug where the
   mandatory-compound force-pit ignored it and produced farcical
   second-to-last-lap stops.
3. **Unsafety-Car opportunism:** with `pits.scPitChance > 0` (canon 0 =
   dormant, draws no RNG), a driver who still owes a stop and has
   `wear ≥ scPitMinWear` rolls to take the cheap stop under the SC.
4. **Window roll (nearly inert at canon):** deterministic segment-split target
   ± personality stagger (`windowOffsetPerStat` — quantizes to ~0 for the
   whole field) over `windowHalfWidth`, then a per-tick roll of
   `basePitChance + wear×wearPitBonus` adjusted by luck. All literals are now
   knobs, but **tuning these moves almost nothing** unless the wear trigger is
   loosened first — measured: widening stagger/width 2×–3× moved first-stop
   spread by −0.05 laps.

Compound choice on a stop (`selectNewTires`): deterministic from
laps-remaining among unused compounds (≤3 soft, ≤5 medium, else hard) — so
two drivers stopping on the same lap always take the same tire; strategy
variety comes from *when* they stop (the archetype lean shifts this).
Fallback when all compounds are used can return the same compound late
(the "M→M" report flag) — open item.

## 5. THE STAT TRUTH TABLE

*Numbers below are the **post-#195 re-baseline**: 2,000-race SimLab batch on
v0.3.30 canon (all tracks, fresh rosters; #82 mistakes dormant). This is the
authoritative current baseline — it supersedes every earlier win-Δ figure.*

| Stat | Where it acts | Lab Δ (Q1→Q5 win) | Verdict |
|---|---|---|---|
| **Car Power** | speed multiplier | **+13.2%** (0.3→13.5) | ✅ Works — **over-dominant** (#162) |
| **Consistency** | variance shrink + hidden Jensen mean-pace | **+7.4%** (1.4→8.9) | ✅ Works — clear #2 |
| **Speed (driver)** | speed multiplier (compressed ×0.12) | **+5.5%** (2.1→7.5) | ✅ Works |
| **Acceleration** | launch / pit-exit / SC-restart windows | **+4.8%** (2.3→7.1) | ✅ **Alive** (was a dead stat; accelEffect, rebalance v2) |
| **Pit Crew** | slow/quick stop odds | +3.5% (2.9→6.4) | 🟡 Mild but real |
| **Tire Mgmt (team)** | tire wear rate | +3.5% (2.9→6.4) | ✅ **Alive** (was a dead stat) |
| **Aggression** | traffic speed reward vs +wear/+blowout cost | **+2.6%** (2.4→5.0), DNF 19.9→28.2% | ✅ **Fixed** — risk/reward now both-sided (was −1.5% backwards) |
| **Grip** | multiplies consistency only | +2.6% (3.2→5.8) | 🟠 Second-order |
| **Endurance** | late-race decay resistance | +1.6% (3.9→5.5) | 🟡 Mild |
| **Luck** | tiny speed procs + crash/mech savings | +0.3% | 🟠 Flavor, not force |
| **Reliability** | mechanical failures | −0.7% (DNF 27.7→21.1) | 🟡 Survival, not wins |

*Car Power Δ — reconciliation, settled by the re-baseline:* the fresh
2,000-race batch reads **13.2%**, essentially unchanged from the old #162
figure (12.8%). Car Power did **not** shrink with the tag fix / rebalance v2
— it is genuinely ~1.8× the next stat and the dominant deterministic force.
(The earlier "+7.0%" in this table and "~5.7%" in `BALANCE_DOMINANCE_PASS.md`
were a smaller/older batch and are now retired.) The 7.6% in §2 is a
different axis entirely — the 1★→5★ *pace spread* (an input), not a win Δ.
**This is the empirical case for the #162 compression** (`powerPerStar`
0.018→0.014).

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

## 6. Rebalance — CANON since v2 (June 2026)

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
