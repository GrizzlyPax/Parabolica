# Parabolica Balance — Unified Recommendation

*June 2026. The umbrella balance program: synthesizes the season-dominance
pass (`BALANCE_DOMINANCE_PASS.md`, #220) with engineering's open flags
(`BALANCE_HANDOFF.md`: #162, #195, #82, #106) into one sequenced plan with
owners, targets, and queued validations. Analytics owns this doc; engineering
owns implementation. Issue #220 tracks it.*

---

## 1. The one frame: the variance budget

Every balance question below is the same question: **how much idiosyncratic,
per-race variance exists relative to deterministic package edges?**

- Race-level pace noise is ~0.3% (the ±33% tick roll CLTs away over ~2,250
  ticks). Package edges are 1–4%. So **clean races are processions**; the
  median league champion wins 38% of races and 23% of universes produce a
  >50% winner (150-season probe, current canon).
- Today's only order-shufflers: DNFs (~22%), crash damage, and pit-stop RNG.
- Every workstream below either **adds healthy variance** (mistakes #82,
  strategy variety #195), **shrinks edges** (power compression #162, genesis
  budget), or **risks amplifying edges** (morale #106 — see §5).

Design steer (Pax): tame the *median* season; generational runaways stay
possible. Targets in §6. Track personalities / weather expansion / tag waves
are explicitly deferred — core sim first.

## 2. The recommendation stack (sequenced)

| # | What | Issue | Owner | Status |
|---|---|---|---|---|
| R1 | Pit mechanics correctness + strategy refactor into knobs | #195 | Engineering (in flight) | duration-recording fix shipped v0.3.27; herding/strategy refactor pending |
| R2 | Re-baseline: 2,000-race SimLab batch on the post-R1 build | — | Pax (in-app) | **queued** — see §7 |
| R3 | Mistakes layer (spin-outs) — gated knobs, canon-neutral | #82 / #220 | Engineering builds, analytics calibrates | spec ready (`BALANCE_DOMINANCE_PASS.md` §3) |
| R4 | Car-power compression (parity lever, not a dominance lever) | #162 / #220 | One-line canon change after lab | **0.014 recommended** — §4 |
| R5 | Genesis star budget | #220 | — | **held** — dominance effect within noise (§4) |
| R6 | Strategy variety tuning (post-#195 knobs) | #195 | Analytics | blocked on R1 |
| R7 | Morale/confidence | #106 | Hold | needs anti-snowball redesign — §5 |

**Why this order:** R1 changes race outcomes (stop timing/strategy), so all
calibration after it lands measures the real baseline. R3 is the headline
variance source and the primary dial; R4 shrinks the edges that variance must
overcome — they're complements, calibrated jointly against §6. R5 is held in
reserve: it only trims genesis tails and costs new-universe variety.

## 3. How the passes interlock (the synthesis)

- **#82 ⇄ #220:** the dominance pass's "mistakes layer" IS #82 (spin-outs),
  proposed in January with the same factor list (consistency shields,
  aggression/wear raise). `BALANCE_DOMINANCE_PASS.md` §3 is now the
  formula-level spec for #82: knobs, neutral defaults, the no-RNG-while-
  dormant determinism rule, and the key property — one mistake ≈ 0.15–0.2
  laps, which flips a median race (~0.1–0.2-lap margins) but barely dents a
  generational package (~0.5-lap margins). Tames the middle, spares legends.
  #82's "tire wear / rain increase spin chance" factors: defer to a v2 of the
  mechanic — wear- and condition-scaling are flavor multipliers on the same
  knob surface, easy to add once base rates are calibrated.
- **#162 ⇄ #220:** same lever, two measurements. #162 measured Δ12.8%
  (2,000 races, v0.3.4) and proposes 0.010–0.012; SIM_MECHANICS §6 recorded
  Δ5.7% (1,000-race v2 A/B). Both predate the current build and can't be
  reconciled from history (different batch configs/eras; the 1★ bucket is
  only 8% of cars, so it's noisy). The R2 re-baseline batch settles the
  stat-impact number; the §4 paired probe settles the *dominance* impact,
  which is the decision driver.
- **#195 → dominance:** strategy herding means stops don't differentiate
  packages — and smarter strategy could cut either way (undercut battles add
  variance; optimal play removes pit RNG). Net effect unknown → that's why
  R2 re-baselines after it and `mistakeBaseChance` is the free dial that
  absorbs whatever #195 does to the variance budget.
- **SC restarts:** already acceleration's moment; mistakes under SC are
  suppressed (spec'd), so the two don't double-dip.

## 4. Paired-universe A/B results (150 seasons × 24 races per scenario)

Same meta-seed per scenario → identical universes; deltas are physics-only.
(`scripts/dominance-ab.mjs`.)

| Scenario | Median win% | p95 | >50% | ≥2/3 | Distinct W | P1–P2 gap | DNF | Champ 4★+ pwr | Champ 5★ pwr |
|---|---|---|---|---|---|---|---|---|---|
| canon (0.018) | 38% | 63% | 23% | 4.0% | 6.8 | 70 | 22.2% | 73% | 41% |
| power 0.014 | 38% | 63% | 17% | 4.0% | 7.4 | 63 | 22.7% | 61% | 31% |
| power 0.011 | 33% | 58% | 23% | 3.3% | 7.4 | 67 | 22.7% | 55% | 27% |
| clamp ≤18 | 33% | 58% | 23% | 4.0% | 6.8 | 64 | 22.7% | 73% | 40% |
| 0.014 + clamp | 38% | 67% | 20% | 6.0% | 7.3 | 69 | 22.8% | 60% | 30% |

*Noise notes: win share is quantized in 1/24 steps (median moves of "4–5pp"
are one step); the >50% column carries ±3–4pp sampling noise at n=150 even
with paired universes (same rosters, but changed physics re-rolls the races).*

**Reading & recommendation:**

1. **Edge-shrinking levers do not fix dominance.** Even #162's aggressive
   compression (0.011) moves the median champion one win-step (9 → 8 of 24)
   and leaves runaway frequency essentially unchanged. The math says why: a
   median universe's best package keeps a ~1% pace edge after compression,
   which still towers over ~0.3% race-level noise. Compression changes **who
   dominates** — champion 5★-power share drops 41% → 27–31%, shifting titles
   from car-led to driver-led packages — not **whether** someone dominates.
2. **Therefore the mistakes layer (R3/#82) is the load-bearing change** for
   the §6 dominance targets. Variance is the only lever that moves them.
3. **R4 (#162) should still ship, reframed**: it's the *car-vs-driver parity*
   lever, exactly as #162 originally framed it. Recommend **0.014** (champ
   5★-power 41%→31%; power stays the #1 single force per the design steer).
   Revisit 0.011 only if the R2 re-baseline batch still shows power Δ far
   above consistency.
4. **R5 (star clamp): hold — do not build now.** Its dominance effect is
   within noise (it shaves support stats but leaves 5★-power champions at
   73/40%, unchanged). Doesn't earn generator complexity; keep in the back
   pocket for a genesis-variety pass.

## 5. Morale (#106) — a flag before it's built

As written, morale is a **positive-feedback loop**: winners gain pace, losers
lose it. In a sim whose median season is already a procession, that amplifies
dominance — the champion's edge compounds race-over-race. Recommendation:
hold until after R3/R4 land, then design with anti-snowball constraints:
cap the swing small (≲1% pace), decay fast toward baseline, and consider an
asymmetry that *helps strugglers more than it helps winners* (slump-breaking
reads as story; frontrunner momentum reads as inevitability). Re-run the
season probe with morale active before any canon flip — acceptance targets
in §6 apply to it too.

## 6. Joint acceptance targets (the contract for the whole program)

Measured on `scripts/season-probe.mjs 150` + a 2,000-race SimLab batch,
after R3+R4 (and R5 if invoked), relative to the R2 re-baseline:

| Metric | Current | Target |
|---|---|---|
| Median champion win share | 38% | **27–32%** |
| Universes with >50% winner | 23% | **8–12%** |
| Universes with ≥2/3 winner | 4% | 1–2% (rare, NOT zero) |
| Distinct winners/season | 6.8 | 8–10 |
| DNF rate | 22.2% | 21–23% (unchanged — mistakes are time, not attrition) |
| Stat ordering | Power #1 | Power #1, Consistency ≤ Power |
| Field-spread guards (duration, lead-lap %, leader margin) | — | within ±10% |

Follow-ups on canon flip: recalibrate `betting.strengthWeights`, update
SIM_MECHANICS §2/§5/§6, note engine-version stamp implications for replays.

## 7. Queued validations

**For Pax (in-app, ~10 min):**
1. **R2 re-baseline:** Compendium → SimLab → 2,000 races, all tracks, on the
   post-#195 build → Copy → paste to analytics. Settles the 12.8-vs-5.7
   power-Δ discrepancy and becomes the program baseline.
2. After R3 lands: the same batch in **A/B mode** (Heretic = first-lab mistake
   values from `BALANCE_DOMINANCE_PASS.md` §3) → paste both.
3. One **race strategy report** (markdown) from any post-#195 race — analytics
   baselines stint variety for R6 targets.

**For analytics (scripted, repeatable):**
- `npx tsx scripts/season-probe.mjs 150` — dominance distribution.
- `npx tsx scripts/dominance-ab.mjs 150` — paired lever comparison.
- `npx tsx scripts/tag-probe.mjs 1500 rolled` — tag ladder regression check
  after any canon flip.

**For engineering:** the #82 build per spec; on completion, analytics runs
the calibration ladder (`mistakeBaseChance` ∈ {1.0, 1.5, 2.0}×10⁻⁴) against
§6 and returns the recommended canon set.

## 8. Cross-issue map

- **#220** — this program (master). • **#82** — mistakes layer (R3, spec in
  #220's doc). • **#162** — power compression (R4, value in §4). • **#195** —
  pit strategy (R1/R6, engineering-led). • **#106** — morale (R7, held, §5).
  • **#165** — node-runnable SimLab: endorsed; the probe scripts cover
  dominance metrics but not the full stat-impact table, which is the one
  thing still requiring in-app batches.
