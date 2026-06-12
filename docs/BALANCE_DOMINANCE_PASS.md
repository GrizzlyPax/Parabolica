# Balance Pass — Season Dominance ("Even Max Isn't Perfect")

*June 2026. Analytics design doc — for engineering pickup. Companion to
`SIM_MECHANICS.md` (the formulas this doc tunes) and the season-dominance
probe (`scripts/season-probe.mjs`). Design owner: balance/analytics; this doc
specifies WHAT and WHY plus target numbers — implementation choices are the
engineer's.*

---

## 1. The problem

The SimLab rolls a fresh grid every race, so it measures *marginal* stat
power across rosters. A league locks **one grid for a whole season** — and
there, deterministic pace edges never average out while dice do (race-level
pace noise ≈ 0.3% vs package edges of 1–4%). The best package wins nearly
every clean race; the only forces that shuffle order today are DNFs, crash
damage, and pit luck.

Evidence (24-race league, seed 419549001, v0.3.19): champion won 16/24 with
23/24 fastest laps and a 201-point gap. Probe (150 headless seasons, current
canon, 11 teams × 24 races):

| Metric | Current canon |
|---|---|
| Champion win share | mean 38%, p75 46%, p95 63% |
| Universes with a >50% winner | 23% |
| Universes with a ≥2/3 winner | 4% |
| Distinct race winners per season | 6.8 of 22 |
| P1–P2 points gap | mean 70 |

**Design verdict (Pax):** dominating seasons are allowed — a generational
talent in a generational car SHOULD run away with it. The problem is the
*median* season being a procession and 1-in-4 universes being runaways. Tame
the middle, keep the legends.

**Explicitly out of scope** (deferred to the conditions/tags roadmap): track
personalities / per-track stat affinities, weather expansion, tag work. This
pass touches the core sim only.

## 2. Why the median is a procession (the analytic core)

1. **Noise averages out, stats don't.** A race is ~2,250 ticks; the ±33%
   per-tick roll shrinks to ~0.3% at race scale (CLT). Any persistent pace
   edge ≥ ~1% is therefore close to deterministic over a race distance.
2. **There are no non-terminal mistakes.** Real seasons stay alive because
   leaders lock up, spin, flat-spot, and run wide. Parabolica's only
   "mistakes" are crashes (DNF or permanent −15% damage) and slow pit stops.
   A clean race has zero idiosyncratic shocks — so clean races are processions.
3. **Finding worth recording: consistency is secretly a mean-pace stat.**
   `consistencyEffect = 1 − (variance × (1−c_eff) × 0.35)` *multiplies* the
   roll it corrects, so it carries a Jensen penalty: E[speed] drops by
   `κ·Var(roll)` where `κ = (1−c_eff) × 0.35`. Across the consistency range
   that's a ~5% expected-pace spread — comparable to car power's 7.6%. Its
   lab win-rate Δ is substantially a hidden flat-speed effect, not variance
   shrink. (No change proposed here; it informs calibration in §3 and should
   be folded into SIM_MECHANICS.)

## 3. Mechanism A — the mistakes layer (the headline change)

A small per-tick chance that a racing driver makes a **non-terminal error**:
a spin, lock-up, or wide moment that costs real time but not the car.

### Behavior

- Per tick, per racing driver, roll `pMistake`. On hit: apply a temporary
  speed penalty through the **existing unified-effect system** (same path as
  inflictions — expiry, timing-tower icon, feed event all come free) and log
  a feed event (flavor variants: spin / lock-up / ran wide / flat spot).
- **One at a time**: no new mistake while one is active, plus a refractory
  window after recovery (prevents chain-stacking on low-consistency drivers).
- **Suppressed under the Unsafety Car** (consistent with crash/blowout/mech
  suppression).
- **Determinism invariant**: when the gate knob is 0, draw NO RNG — the seed
  stream must be byte-identical to today (same pattern as `accelEffect`).

### Formula (proposed)

```
normC = (consistency − 0.3) / 0.5        // 0–1
normA = (aggression  − 0.3) / 0.5        // 0–1
pMistake = mistakeBaseChance
         × (1 + (1 − normC) × mistakeConsistencyWeight)
         × (1 + normA × mistakeAggressionWeight)
```

### Knobs (SimVariables.performance, canon-neutral defaults)

| Knob | Canon (dormant) | First lab value | Meaning |
|---|---|---|---|
| `mistakeBaseChance` | **0** | 1.5e-4 /tick | gate; 0 = today's behavior |
| `mistakeConsistencyWeight` | 0 | 1.5 | low consistency → more mistakes |
| `mistakeAggressionWeight` | 0 | 0.5 | pushing harder → more mistakes |
| `mistakeSpeedPenalty` | 1.0 | 0.85 | speed multiplier while recovering |
| `mistakeDurationTicks` | 0 | 150 | ~15s broadcast time |
| `mistakeCooldownTicks` | 0 | 300 | refractory window |

At first-lab values: expected mistakes/driver/race ≈ 0.34 (consistency 0.8,
calm) → ~1.2 (consistency 0.3, aggressive). One mistake ≈ 0.15–0.2 laps lost.

### Why this matches the steer

Race margin between the top two packages in a *median* universe is ~0.1–0.2
laps — **one mistake flips that race**. A generational outlier (this season's
champion: 3.5% pace edge ≈ 0.5 laps/race margin) shrugs off a single spin.
Same mechanism: tames the middle, spares the legends, and every mistake is a
feed story ("BELL SPINS AT TURN 4!") rather than silent math.

### Side effects to watch (lab)

- **Consistency's win Δ will rise** (it now also gates mistakes). It must not
  pass Car Power as the #1 force — if it does, rebalance via
  `mistakeConsistencyWeight` ↓ or shift weight to `mistakeAggressionWeight`.
- Aggression's DNF-flavored gamble gains a non-fatal cost channel — its
  win Δ should stay positive (≥ +1%) or its traffic reward needs a bump.
- DNF rate must stay 21–23% (mistakes are time, not attrition).

## 4. Mechanism B — narrow the car-power gap

Compress the per-star spread while **keeping the 3★ midpoint identical** (no
field-pace shift, replays of 3★-heavy grids barely move):

| Knob | Current | Proposed |
|---|---|---|
| `carStats.powerPerStar` | 0.018 | 0.014 |
| `carStats.powerBase` | 0.93 | 0.942 |

Spread 1★→5★ goes 7.6% → 5.6%. Power should remain the #1 deterministic
force (target lab Δ ~+4 to 5%, from ~+5.7%).

*Probe finding (see `BALANCE_RECOMMENDATION.md` §4): compression is a
**car-vs-driver parity** lever (#162), not a dominance lever — it shifts
championships from car-led to driver-led packages (champ 5★-power share
41%→31%) but barely moves win concentration. The mistakes layer (§3) carries
the dominance targets.*

**Required follow-ups when this flips canon:** recalibrate
`betting.strengthWeights` (documented as outcome-calibrated) and update the
SIM_MECHANICS §2 table.

## 5. Mechanism C — genesis star budget (HELD: probe-tested, within noise)

*Status update: paired-universe A/B (`scripts/dominance-ab.mjs`) measured no
dominance effect beyond noise — the clamp shaves support stats but leaves
5★-power champions unchanged. Recommendation: do not build now; keep for a
future genesis-variety pass. Original design retained below for that day.*

A gentle birth rule: clamp a team's total hardware stars
(power+grip+reliability+tireMgmt+pitCrew) to a budget band (proposal:
**≤ 18 of 25**; current distribution: mean 15, σ ≈ 2.4 — this trims roughly
the top ~10% of god-rolls). On breach, re-roll the lowest-impact stat down
rather than the whole car (keeps the 5★ power identity, shaves the perfect
support package).

Notes: lives in the generators, not SimVariables; **only affects newly
founded universes** (existing leagues replay from their stored roster);
driver-stat rolls stay untouched — a generational driver can still land in a
strong car, which is the fun kind of outlier.

## 6. Validation plan & acceptance targets

Workflow per house rules: build gated → SimLab A/B (≥1,000 races) → season
probe (`npx tsx scripts/season-probe.mjs 150`) → flip canon only when targets
hit.

| Metric | Current | Target (A+B; C optional) |
|---|---|---|
| Median champion win share | 38% | **27–32%** |
| Universes with >50% winner | 23% | **~8–12%** |
| Universes with ≥2/3 winner | 4% | 1–2% (rare, NOT zero) |
| Distinct winners/season | 6.8 | 8–10 |
| DNF rate | 22.2% | 21–23% (unchanged) |
| Stat truth ordering | Power #1 | Power #1, Consistency ≤ Power |
| Race duration / lead-lap % / leader margin | — | within ±10% of current |

Tuning order if targets miss: `mistakeBaseChance` is the primary (and per
the A/B probe, effectively the only) dominance dial; `powerPerStar` tunes
car-vs-driver parity alongside it; the star budget is held.

## 7. Open questions

1. Mistake magnitude model: flat 0.85×150t, or roll severity (minor lock-up
   0.92×80t … big spin 0.75×250t)? Severity rolls read better in the feed;
   start flat, add severity in a flavor pass?
2. Should damaged cars mistake more (damage → scrappiness)? Cheap and
   thematic; defaults can ship at 0.
3. Star-budget band: is ≤18 the right ceiling, and should there be a floor
   (≥12) so no team is born hopeless? The Scrap Heap may have opinions.
4. Event type: new `driver_error` RaceEventType vs riding
   `track_event_effect`? (Analytics prefers a dedicated type — the lab and
   season digests can then count mistakes directly.)
