# Fantasy Mystery Box — design

*Oct 2026. Design for the between-races mystery box ([#296](https://github.com/GrizzlyPax/Parabolica/issues/296)). Analytics-owned design, for ENG pickup. Companion to `docs/FANTASY.md`. Pax's steer: the box is **both good and bad — a real tag drawn from the glossary** that you place on any driver.*

---

## TL;DR

- Between races, each fantasy owner opens a box and is **dealt one real tag from the glossary** (good, bad, or mixed), drawn on the genesis rarity odds.
- They **choose a driver to put it on** — buff your own, or dump a bad one on a rival. The tag is the dice; the *target* is the decision.
- It rides rails that already exist: the box tag becomes an **`attach-tag` intervention**, the one fact every device already replays. No new physics, no new persistence model.
- **Why it matters beyond fun:** fantasy today is one blind draft pick, then you spectate. The box is the **first in-season decision a fantasy owner makes** — it's what turns fantasy from a draw into a game.

---

## 1. The idea

A fantasy owner's only move today is the draft, and the draft is deliberately blind (front/mid/back third + rarity dots). So who wins fantasy is largely *who blindly drafted the season's strongest driver* — luck, not skill. The mystery box adds the first lever an owner **plays** after lights-out.

The loop:

1. **Between races**, each owner gets a box (cadence in §4).
2. The box **reveals one tag** drawn from the glossary pool on the rarity odds (60/30/9/1 common/uncommon/rare/legendary).
3. The owner **picks any driver** on the grid and confirms.
4. It lands as a **decree before the next race**, so every device replays the same outcome. The tag shows as **fantasy-given** in the feed and the driver's tag stack.

The tag you draw dictates the move: draw **Steady Hands**, you buff one of your own; draw **Cursed Chassis**, you hand it to the leader. The skill is reading what you got and aiming it well.

## 2. Why it matters (and the dominance read)

Fantasy inherits the sim's dominance directly — scoring is just the sum of your drivers' F1 points. Pax's first fantasy season had one driver win 9 of 16 (318 pts vs 172), and in a blind draft the owner who happened to land that driver effectively won the title at the draft.

The box is the first thing that can **loosen a runaway mid-season** — a trailing owner who draws a bad tag can aim it at the dominant driver. The symmetric "both good and bad" draw already cuts both ways, but Pax's call makes the catch-up explicit: **the worse your fantasy standing, the better your box's rarity odds** (§4). So a trailing owner draws stronger tags more often — bigger buffs for their own squad, nastier curses for the leader. That's a real, legible rubber-band aimed squarely at the dominance fantasy inherits from the sim.

The one anti-pattern to prevent: **everyone stacking good tags on a single driver.** The **4-tag slot cap** (#231) plus the temporary expiry that every-race cadence forces (§4) are the natural guards.

## 3. How it rides existing rails

Everything the box needs already exists — this is wiring, not new systems:

| Need | Existing rail |
|---|---|
| Change a driver's tags for future races | `Intervention` type `attach-tag` (`src/league/types.ts`) — already the **only** fact-level intervention |
| Replay identically on every device | `decreesOf()` → server → `rosterStateAt()` (`src/league/remote.ts`, `league.ts`) already ships `attach-tag` decrees to all devices |
| Draw a tag by rarity | `pickTagByRarity(pool, rarityOdds, rng)` + `poolTags(rs)` (`src/rules/genesis.ts`) — the exact draw the draft uses |
| Determinism | box **contents** = seeded draw `deriveSeed(leagueSeed, 'mysterybox', raceIndex, teamId)` under a rarity table derived from fantasy standings-to-date (a pure function of settled digests); box **target** = the owner's decree. All facts; the race replays the same everywhere |

**So a mystery box is literally: roll a tag from the pool (seeded), let the owner pick `targetDriverId`, append an `attach-tag` intervention with `atRaceIndex = nextRace`.** The settle loop and fantasy standings recompute with zero new plumbing.

Two integration points ENG should confirm, both small:
- **Tag stacking:** `rosterStateAt` must *append into* the driver's tag stack (up to the cap, #231), not overwrite `driverTag` the way the original single-tag code did. Verify the current stack-application path.
- **Mark the source:** the intervention (or the applied tag) needs a `fantasyGiven` / source marker so the feed and tag card can show "handed to X by \<team\>."

## 4. The rules (recommendations on #296's open questions)

- **Pool: all three target types (driver, car, team)** — Pax's call. Cars are independent per driver now (genesis rolls a car tag per seat, not per constructor), so **a driver *or* car tag lands cleanly on one driver** — two distinct, meaningful choices. A **team tag hits both teammates** — that's not a bug to hide, it's the "curse the whole pairing / lift your two-driver stack" play. The box respects the tag's `target`: driver/car → the chosen driver; team → the chosen driver's constructor (both seats), surfaced plainly.
- **Cadence: every race** — Pax's call. This is the big driver of the rules below: a steady per-race drip of chaos, lots of feed moments, the box always in your hands. The cost is **saturation** — 4 owners × 16 races = 64 boxes against 88 total slots (22 drivers × cap 4), which permanent tags would overflow by mid-season. So:
- **Expiry: box tags are temporary — last ~2 races, then fade.** This is the fix for every-race saturation (distinct from genesis tags, which stay). Steady state ≈ 2 active box tags per owner (~8 on a 4-owner grid) — plenty of presence, still legible, and it makes *timing* matter (spend it when it bites). The one expiry number (1 / 2 / 3 races) is the main dial left for Pax.
- **Catch-up tilt = the box's metal** — Pax's call. The tilt isn't a hidden percentage; it's **the colour/grade of the box itself**, assigned by the owner's fantasy standing. Four tiers, each a rarity table (common/uncommon/rare/legendary odds), worse standing → shinier box:

  | Box | Who gets it | Rarity odds (illustrative — §8 tunes) |
  |---|---|---|
  | 🥉 Bronze | leader | 60 / 30 / 9 / 1 (base) |
  | 🥈 Silver | upper-mid | 52 / 32 / 13 / 3 |
  | 🥇 Gold | lower-mid | 43 / 34 / 18 / 5 |
  | 💠 Platinum | last place | 35 / 35 / 22 / 8 |

  Standing maps to a tier (`floor((rank−1)/teams × 4)`, so last always = platinum, leader = bronze, spread between; with 2–3 teams only the end tiers appear). The metal shows **before** you open — you see how good your draw is, then open to see the actual tag. Standings are pure from settled digests, so the tier (and the seeded draw under it) stays deterministic. The four tables' numbers are the dial (§8).
- **Reveal, then target.** Show the drawn tag, *then* let the owner choose who gets it. Sealed-until-applied removes the only decision the box offers (you can't aim a curse you can't see).
- **Full slot (cap 4): replace the weakest, don't fizzle.** A wasted box feels awful. Let the owner bump the lowest-impact existing tag, surfaced in the feed ("\<team\> bumped Y off Z to apply X"). Temporary expiry makes this rarer, but it still needs a rule.
- **Targeting: any driver** (buff your own, curse a rival) — per #296, confirmed.

Magnitude reality check (keeps expectations honest): calibration puts a common tag at roughly **+1–2 finishing places**, rares uneven. One box nudges a driver; it does not single-handedly flip a season — which is the right weight, and why the catch-up tilt leans on *rarity frequency* (more rares for the trailing team over many boxes) rather than on any single box being decisive.

## 5. Legibility

- **Two rarity-colour systems that must not be confused.** The draft ([#297](https://github.com/GrizzlyPax/Parabolica/issues/297)) colours a sealed "?" by the *tag's* rarity — hidden info about what a driver already carries. The mystery box's **metal (bronze→platinum) grades the box's own odds** — set by your standing, shown before opening. Same "shininess = better" instinct, different meaning; keep the palettes distinct (metallic ramp for the box, the existing rarity-chip colours for tags) so a gold box ≠ a gold tag.
- **The metal is the catch-up made visible.** Seeing a rival in last place holding a platinum box *is* the rubber-band on screen — social drama, no stats panel. Lean into it (the reveal can show the metal first, then the tag).
- **Feed / check-in reel line:** "\<team\> handed \<driver\> a mystery tag" (and the bump line when a slot was full).
- **Tag card** marks it fantasy-given with the giving team's colour, so a driver's stack reads "who did this to me."
- The box itself: reveal animation optional, but the tag's **name, rarity and effect** should be plain once revealed — the obfuscation is a *draft* mechanic; by box time, information is the reward.

## 6. Dependencies & phasing

- **Single-device works today.** Decrees require the `commissionerKey`, which lives only on the publishing device (`postDecree`: "Only the device that published this league can decree."). So **v1 = the commissioner runs each owner's box** on the host device — fully functional, no new backend.
- **Multi-device boxes need accounts** ([#237](https://github.com/GrizzlyPax/Parabolica/issues/237)): for each owner to open their own box from their own phone, a non-commissioner device must be able to post a decree. That's the accounts/auth work already queued. Design the box so it's **commissioner-run in v1 and owner-run once accounts land** — same intervention either way.
- Pairs with the planned "spend points on gifts/curses" in `docs/FANTASY.md` — the box is the free/random version; spending points is the earned version. Same application path.

## 7. Decisions — settled, with the dials still open

Settled with Pax: **all three tag targets** · **every race** · **any driver** · **catch-up tilt via rarity-by-standing**. What's left is numbers to set in the lab, not shape:

1. **Expiry length** — 1, 2, or 3 races? (2 is the recommendation; it's what keeps every-race cadence from saturating.)
2. **The four metal tables** — the bronze→platinum odds (how much shinier last place really is). Starting point in §4; set by §8.
3. **Tilt basis** — season-to-date fantasy standings (persistent rubber-band, recommended) or last-race-only (reactive)?
4. **Full-slot rule confirm** — replace-weakest (recommended) vs owner-picks-which-to-bump.

## 8. Validation (deferred, per Pax)

Not building a probe now. When we want numbers, the **fantasy-dominance probe** sets the two dials above: simulate the blind snake draft across many universes, measure how often the strongest driver's owner wins the title, then sweep (a) expiry length and (b) the tilt endpoints to find the pair that most closes the title gap *without* making last place a lock. That's the quantitative sign-off on the catch-up curve. ~30 min when greenlit.
