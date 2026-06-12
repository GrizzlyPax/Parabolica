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
  via `usedCompounds`.
- Starting compound is **deterministic from stats** (`selectStartingTires`):
  speed>1.08 → soft, endurance>1.08 → hard, else medium. *(Lab's "soft
  starters win 6.9%" is therefore confounded — soft starters ARE the fast
  drivers.)*
- Pit decision: probabilistic per lap-ish (`basePitChance 0.20` + wear bonus
  +30%, luck adjustment), NOT an optimizing strategist.
- Pit crew (1–5★): slow-stop chance 42%−7%/★, quick-stop 3%+5%/★. Real but
  small (lab Δ+1.7%).

## 5. THE STAT TRUTH TABLE

| Stat | Where it acts | Lab Δ (Q1→Q5 win) | Verdict |
|---|---|---|---|
| **Car Power** | speed multiplier | **+7.0%** | ✅ Works — *dominant* |
| **Consistency** | variance shrink + crash avoidance | **+4.3%** | ✅ Works |
| **Speed (driver)** | speed multiplier (compressed ×0.12) | **+4.0%** | ✅ Works |
| **Endurance** | late-race decay resistance | +1.5% | 🟡 Mild |
| **Pit Crew** | slow/quick stop odds | +1.7% | 🟡 Mild |
| **Reliability** | mechanical failures | +1.1% | 🟡 Mild (survival, not wins) |
| **Grip** | multiplies consistency only | +0.7% | 🟠 Second-order; nearly invisible |
| **Luck** | tiny speed procs + crash/mech savings | +0.3% | 🟠 Flavor, not force |
| **Aggression** | +tire wear, +blowouts. **No upside is implemented.** | **−1.5%, DNF 18.9→25.3%** | ❌ **Backwards** — "risk/reward" with the reward missing |
| **Acceleration** | **NEVER READ BY THE ENGINE** | −0.4% (noise) | ❌ **Dead stat** |
| **Tire Mgmt (team)** | **NEVER READ BY THE ENGINE** | −0.3% (noise) | ❌ **Dead stat** |

### Tags are destiny, not spice (lab, 2,000 races)

| Tag | Win% | Baseline ≈4.5% |
|---|---|---|
| 🌧️ Rain Dancer | **41.5%** | 9× baseline |
| 👑 Front Runners | 23.1% | 5× |
| 💎 Glass Cannon | 14.8% | 3× |
| 🐢 Sunday Driver | 0.1% | death sentence |
| 👻 Cursed Chassis | 0.04% | death sentence |

A rolled tag currently outweighs every stat on the sheet combined. For the
coming tag system this is the **first balance lever to grab**: tags should
bend seasons, not decide them at genesis.

### Other lab observations
- **SC Lap % 0.4%** — suspiciously low for 1.6 crashes/race; either pileups
  rarely chain (15% participation) or the lab metric undercounts. Verify.
- **TRACK EVENTS table is empty** — the lab does not wire `eventTrigger`/
  `eventEffect` when configuring tracks (settle and live do). The lab is
  blind to a whole system it should be measuring. Fix before trusting
  per-track numbers.
- Track DNF spread 17.5%–28.8% — good, tracks have personality.

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
