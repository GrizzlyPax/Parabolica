---
name: balance-read
description: Measure Parabolica's sim balance and report findings — run the mechanics probe, lab batches or tag calibration, compare against bands, and write up what moved. Use for balance questions, before/after a physics or tag change, or when asked "is X over/underpowered".
---

# Balance read

**Measure, don't guess.** Every claim needs a seeded run behind it, and before/after on the same seeds.

## Tools (pick the smallest that answers the question)

| Question | Run |
|---|---|
| Are the core mechanics in band? (pace→finish, grid→finish, pole wins, stops, DNF) | `npx tsx scripts/mechanics-probe.mjs 200` — the canonical gates |
| Overtakes / battles | `npx tsx scripts/action-probe.mjs` |
| Dominance / runaway seasons | `scripts/season-probe.mjs`, `scripts/dominance-ab.mjs` |
| Which stats matter | `scripts/stat-impact.mjs` |
| One tag's effect | `npm run calibrate -- 50 <tagId>` (quick, unwritten) |
| All genesis tags | `npm run calibrate` (~15 min, writes `src/data/tagCalibration.json`) |
| Reproduce a Race Control batch | `npm run lab -- <seed> <races> all [cards…]` (prints fingerprint) |

Bands and meanings: `docs/RACE_CONTROL.md`, `src/racecontrol/knobs.ts`, `docs/SIM_MECHANICS.md`.

## Method

1. State the question in one line and the metric that answers it.
2. Baseline on fixed seeds. Change one thing (a knob, a card, a preset). Re-run the **same** seeds.
3. Report Current / Yours / Δ, and whether Δ is beyond noise (re-roll on a fresh seed if unsure).
4. Weather tags measure ≈ 0 because rain is rare — measure them under the Rain card.
5. Safety-car events are logged twice; probes halve them. Don't "fix" one side.

## Write-up (post on the issue, or a new `balance` issue via `write-issue`)

```
**TL;DR:** what moved, by how much, in or out of band.
| Metric | Band | Before | After | Δ |
**Recommendation:** A / B / C (pick marked) — Pax decides.
**Repro:** commands + seeds + fingerprint
```

Recommend; don't change code. Tuning changes ship as a `ready` issue.
