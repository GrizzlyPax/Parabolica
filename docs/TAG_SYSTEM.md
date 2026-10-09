# The Tag System — Design Framework

> **History (v0.6, #334 / #541):** tags were retired; cards are the only system now (docs/CARDS.md). This doc is kept as design history.

*June 2026. The working framework for Commissioner Mode's core engine.
GDD pillar 6: "the additive tag engine IS the fun" (the Mewgenics instinct).
This doc is the starting point for the design session — §6 is the interview.*

---

## 1. Where we are

**Today's system** (`src/data/tags.ts`, wired through the engine):
- 9 active tags: 3 driver (Rain Dancer, Sunday Driver, Clutch Performer),
  3 car (Glass Cannon, Cursed Chassis, Pit Lane Special), 3 team
  (Front Runners, Chaotic Energy, Underdog Spirit)
- One tag slot per entity (`driverTag` / `carTag` / `teamTag`), rolled once
  at genesis (15% chance per slot), permanent for life
- Condition tags exist for track events — orphaned, since no track defines
  an event yet
- Trigger vocabulary already rich: `passive, race_start, pit_stop, overtake,
  crash_proximity, final_lap, track_event` + `triggerChance` + activation
  text (which already flows into digests and the live feed)
- Effect vocabulary: speed / consistency / luck / crashResistance / pitSpeed
  modifiers
- Interventions (league core, shipped): `attach-tag` log entries applied via
  `rosterStateAt` — append-only, provably can't rewrite history

**The lab truths that constrain design** (SIM_MECHANICS.md):
- Tags are *destiny, not spice*: Rain Dancer wins ~40% of races (9× base),
  Cursed Chassis ~0%. One genesis roll outweighs the whole stat sheet.
- We now have a calibrated stat economy (rebalance v2) and a lab workflow
  that measures any tag's true effect size in one batch.

## 2. The five sources of tags

Every tag enters the world through one of these doors. The door shapes the
fiction:

| Source | Who's the author | Exists today? |
|---|---|---|
| **Genesis** | the universe, at founding | ✅ 15% rolls |
| **Acquired** | the simulation itself — earned/inflicted by what happens in races, and *sticks* | ❌ the big build |
| **Intervention** | the Commissionary (spend a token) | engine ✅, UI pending (old PR 7) |
| **Decree** | pick-1-of-3 at season milestones | ❌ |
| **Divine/track** | gods and track events (condition tags are the mechanism) | mechanism ✅, content ❌ |

## 3. The magnitude ladder (the destiny fix)

Tags need tiers, lab-calibrated. Proposal:

| Tier | Win-rate multiple | Role | Example |
|---|---|---|---|
| **Quirk** | ~1× (±0–1%) | pure story; feed/digest flavor | *Hums while driving* |
| **Trait** | ~1.2× | noticeable lean | *Late Braker* |
| **Power** | ~1.5–2× | build-around; what most acquired tags are | *Clutch Performer* |
| **Destiny** | ~3×+ | rare, season-warping; the current 9 live here | *Rain Dancer* |

Rule: **every tag ships with a lab batch** proving its tier. The Tag
interface grows a `tier` field; genesis rolls draw mostly Quirks/Traits,
Destinies become rare events the whole league talks about.

## 4. Architecture (determinism makes acquired tags nearly free)

The load-bearing idea: **a race is a pure function of its seed, so what a
race *awards* can be a pure function too.**

- `evaluateAcquisitions(digest, roster, rng) → Intervention[]` — a pure
  function run by the settle loop after each race, reading the digest
  (finish order, DNFs, highlights, stat lines) plus a derived seed
  (`deriveSeed(leagueSeed, 'tags', raceIndex)`) for any randomness.
- Acquisitions are appended to the same log as commissioner interventions
  (new entry types: `acquire-tag`, `expire-tag`), so `rosterStateAt`
  already applies them in race order and history stays unrewritable.
  They're derived-but-cached, like digests — recomputable from inputs.
- **Multi-tag**: `driverTag: Tag` becomes `tags: Tag[]` with a slot cap
  (interview question). Engine modifier getters sum/multiply across tags —
  the additive engine, literally.
- **Duration classes**: `permanent | season | races(n) | race(1)` — expiry
  is just an `expire-tag` log entry the settle loop emits when due.
  Condition tags slot in as `race(1)`.
- Save schema: append-only entry types + roster shape change → schema bump
  (archive-don't-migrate covers us pre-1.0).

## 5. Acquisition rules — the fun part (sketch vocabulary)

Rules read the digest. Three families:

- **Earned** (thresholds): win 3 straight → *Front Runner* pressure tag;
  survive a 4-car pileup → *Unkillable*; biggest climber 2 races running →
  *The Charger*; fastest lap on dead tires → *Tire Whisperer*
- **Inflicted** (trauma): cause a pileup → *Marked by the Void*; 3 DNFs in
  a row → *Haunted*; crash with the same driver twice → **paired rivalry
  tags** (*Nemesis: <name>*) — cross-race memory the digests already store
- **Cosmic** (rolled): low-probability per-race lottery from the derived
  seed — the universe simply decides someone now *Hears the Track*

Every acquisition is a digest headline ("**Update Parking** is now 👻
*Haunted*") — the check-in moment's drama, recovered properly.

## 6. The design interview (next session starts here)

1. **Authorship balance** — of the five sources, which dominates? Is this a
   game about *reading* a universe that tags itself, or *building* drivers
   via interventions?
2. **Slot cap** — how many tags before a driver is soup? (Mewgenics says:
   lots, and the soup is the point. Legibility says 3–4.)
3. **Loss & evolution** — can tags be lost/cleansed (commissioner verb? god
   price?) — and can they *evolve* (Haunted → Cursed → The Void's Own)?
4. **Secrets** — are some tags hidden, discovered only by watching behavior
   ("why does she always crash at Monacoco?"), revealed later?
5. **Pace** — roughly how many acquisitions per 12-race season feels right?
   One per race league-wide? One per driver per season?
6. **Tone of acquisition copy** — earned-heroic, cosmic-arbitrary, or both
   by family (Earned vs Cosmic)?

## 7. Build order (proposal)

1. **T1 — Multi-tag plumbing + tiers**: `tags: Tag[]`, slot cap, engine
   getters sum across tags, `tier` field, retune the existing 9 with lab
   batches. (Mechanical, unblocks everything.)
2. **T2 — Acquisition engine**: `evaluateAcquisitions` in settle, log entry
   types, digest announcements, ~6 launch rules (2 per family).
3. **T3 — Durations + conditions**: expiry entries, `race(1)` conditions,
   first track events as content (the orphaned system comes alive).
4. **T4 — Commissioner tokens UI** (old PR 7): the attach-tag verb with a
   fixed allowance, drawing from a curated pool.
5. **T5 — Content wave + gods**: tag pools per god, decree-granted tags,
   rivalry/evolution chains.
