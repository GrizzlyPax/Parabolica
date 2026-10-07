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

The box is the first thing that can **loosen a runaway mid-season** — a trailing owner who draws a bad tag can aim it at the dominant driver. That's healthy. The symmetric design Pax chose ("both good and bad") means it cuts both ways: the leader's owner can also draw a good tag and pile it on their monster. Net, that's **added variance, not a systematic tilt** — which mildly *helps* dominance (less deterministic runaways) as long as nothing lets the rich systematically get richer.

The one anti-pattern to prevent: **everyone stacking good tags on a single driver.** The existing **4-tag slot cap** (#231) is the natural guard; §4 handles the full-slot case. A gentle catch-up tilt (trailing teams draw from a slightly kinder table) is a **tunable we can add later** if a fantasy-dominance probe shows runaways — kept out of v1 to honor the symmetric steer, but called out so the knob has a home.

## 3. How it rides existing rails

Everything the box needs already exists — this is wiring, not new systems:

| Need | Existing rail |
|---|---|
| Change a driver's tags for future races | `Intervention` type `attach-tag` (`src/league/types.ts`) — already the **only** fact-level intervention |
| Replay identically on every device | `decreesOf()` → server → `rosterStateAt()` (`src/league/remote.ts`, `league.ts`) already ships `attach-tag` decrees to all devices |
| Draw a tag by rarity | `pickTagByRarity(pool, rarityOdds, rng)` + `poolTags(rs)` (`src/rules/genesis.ts`) — the exact draw the draft uses |
| Determinism | box **contents** = seeded draw `deriveSeed(leagueSeed, 'mysterybox', raceIndex, teamId)`; box **target** = the owner's decree. Both are facts; the race replays the same everywhere |

**So a mystery box is literally: roll a tag from the pool (seeded), let the owner pick `targetDriverId`, append an `attach-tag` intervention with `atRaceIndex = nextRace`.** The settle loop and fantasy standings recompute with zero new plumbing.

Two integration points ENG should confirm, both small:
- **Tag stacking:** `rosterStateAt` must *append into* the driver's tag stack (up to the cap, #231), not overwrite `driverTag` the way the original single-tag code did. Verify the current stack-application path.
- **Mark the source:** the intervention (or the applied tag) needs a `fantasyGiven` / source marker so the feed and tag card can show "handed to X by \<team\>."

## 4. The rules (recommendations on #296's open questions)

- **Pool: driver-target tags only, v1.** The glossary has driver/car/team tags; a car or team tag would spill onto a teammate and muddy "I put it on *this driver*." Drawing from the driver-target pool keeps the box one-driver-clean and legible. (Revisit car/team boxes once the base loop feels good.)
- **Cadence: every 3–4 races, not every race.** Per-race floods the grid with fantasy tags and dilutes the genesis-tag identities the content pass just calibrated. Scarcity makes each box an event and keeps the tower readable.
- **Reveal, then target.** Show the drawn tag, *then* let the owner choose who gets it. Sealed-until-applied removes the only decision the box offers (you can't aim a curse you can't see).
- **Full slot (cap 4): replace the weakest, don't fizzle.** A wasted box feels awful. Let the owner bump the lowest-impact existing tag, and surface it in the feed ("\<team\> bumped Y off Z to apply X"). "Knock their good tag off" is a real, fun decision.
- **Expiry: lasts the rest of the season (permanent), v1.** Matches how genesis tags behave; simpler to reason about than timed tags. Revisit if permanence makes late-season boxes too swingy.

Magnitude reality check (keeps expectations honest): calibration puts a common tag at roughly **+1–2 finishing places**, rares uneven. One box nudges a driver; it does not single-handedly flip a season — which is the right weight. It should feel like a meaningful poke, not a hammer.

## 5. Legibility

- **Draft + box share one visual language** ([#297](https://github.com/GrizzlyPax/Parabolica/issues/297)): the sealed "?" box coloured by rarity (legendary glows). The between-races box is that same object, opened.
- **Feed / check-in reel line:** "\<team\> handed \<driver\> a mystery tag" (and the bump line when a slot was full).
- **Tag card** marks it fantasy-given with the giving team's colour, so a driver's stack reads "who did this to me."
- The box itself: reveal animation optional, but the tag's **name, rarity and effect** should be plain once revealed — the obfuscation is a *draft* mechanic; by box time, information is the reward.

## 6. Dependencies & phasing

- **Single-device works today.** Decrees require the `commissionerKey`, which lives only on the publishing device (`postDecree`: "Only the device that published this league can decree."). So **v1 = the commissioner runs each owner's box** on the host device — fully functional, no new backend.
- **Multi-device boxes need accounts** ([#237](https://github.com/GrizzlyPax/Parabolica/issues/237)): for each owner to open their own box from their own phone, a non-commissioner device must be able to post a decree. That's the accounts/auth work already queued. Design the box so it's **commissioner-run in v1 and owner-run once accounts land** — same intervention either way.
- Pairs with the planned "spend points on gifts/curses" in `docs/FANTASY.md` — the box is the free/random version; spending points is the earned version. Same application path.

## 7. Open decisions for Pax

1. **Pool** — driver-target tags only (recommended, clean), or respect target type so a car tag hits the constructor (richer, but teammate spillover)?
2. **Cadence** — every 3 races, every 4, or tied to something narrative (e.g. after each "round" of the calendar)?
3. **Can you box your *own* drafted drivers only, any driver, or any driver *except* your own?** ("Any driver" is the most expressive and what #296 says; worth confirming the curse-a-rival path is explicitly wanted.)
4. **Catch-up tilt** — ship purely symmetric (Pax's current steer), or leave a gated knob for a mild trailing-team bonus if a later probe shows fantasy runaways?

## 8. Validation (deferred, per Pax)

Not building a probe now. When we want numbers, the one worth running: a **fantasy-dominance probe** — simulate the blind snake draft across many universes, measure how often the strongest driver's owner wins the title, and how much a symmetric box vs a catch-up-tilted box closes the gap. That tells us whether the symmetric design needs the §2 tilt knob turned on. ~30 min when greenlit.
