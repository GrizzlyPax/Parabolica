# Patron Mode — game design spec

*Oct 2026. Game-design spec (no technical content) for the channel/ratings fantasy mode. Child of `docs/FANTASY_MODES.md` (read §7 Principles first) and the story frame in `docs/story/2026-10-06-ideation.md`. One mode per league.*

---

## 1. The fantasy

**You are running a channel.** You back a stable of drivers not for speed but for **show**, and your score is the **audience you draw**. The bible's line: *"Ratings are the score."* The skill is a different read of the grid — not "who's fastest" but "who's *television*": the villain, the underdog, the crasher, the comeback artist.

This is the mode that makes fantasy **its own game** rather than a mirror of the standings — because "best driver" and "best show" are different questions, and a flag-to-flag runaway is *boring*, so Patron Mode is **immune to the sim's dominance** by construction.

**The metric is a social-media allegory (Pax's steer): views / followers.** Your drivers accumulate an audience — views on their drama, followers who stick around — and that *is* the score. It fits the bible's Management/paperclip texture (you're optimizing engagement numbers you don't fully understand), and it's the honest shape of "ratings." It also needs real work to get right — see §9. Framed this way, a crash isn't "points," it's a *clip that goes viral*; a season-long underdog arc is a *follower count that compounds*. The currency and the allegory are the same object.

## 2. The draft (stage one)

Patron leagues open with the same **snake-draft** ritual, but you draft a **three-driver stable** — and the point is you're reading a *different axis*. Pace barely matters to a showrunner; what matters is who makes *television*.

**What you're reading: drama potential, not speed.** The cards hide the pace tier Team Mode shows and surface **temperament** instead, deliberately vague:
- a **volatility** read (Steady ↔ Volatile) — how swingy their races run;
- a **scrapper** hint — do they fight? (→ battles, overtakes);
- a **fragility** hint — crash/DNF-prone? (→ chaos, the Crowd's favourite);
- **tag slots** as sealed rarity boxes, same as Team — tags are drama content.

So a back-of-grid underdog who spins spectacularly can be a *better* Patron pick than a clean front-runner who wins from pole and bores everyone. **The draft is where "opposite reads of the same grid" begins:** in Team you draft the green lights; in Patron you might deliberately draft the red-light scrapper.

## 3. The loop (hopeful)

```
  ── THE IN-BETWEEN ──         ── THE RACE ──
  open your mystery box  ───▶  drivers make TV  ───▶  views / followers rise
  program the next show        (events fire)          Management re-targets
        ▲                                                  │
        └──────────────────────────────────────────────────┘
               "what show am I programming next?"
```

Same two-phase structure as Team (`FANTASY_MODES.md` §loop): **the Race** (your drivers make television) and **the In-Between** (where you program — open the box, manufacture drama, manage the stable). Pax flagged the In-Between as a phase to really develop; for a showrunner it's the writers' room.

- **Per-race beat:** events fire from your drivers (overtakes, battles, crashes, comebacks); the box lets you *manufacture* drama in the In-Between (a chaos tag on a frontrunner is appointment TV).
- **Season arc — the paperclip escalation (principle 8):** Management keeps **re-targeting** what's hot — chaos this week, spectacle next, sponsor the next. The target keeps moving; the numbers keep climbing; you never quite know what it all means. The escalation *is* the story.
- **The hook:** variable reward (you can't fully predict which drama your drivers throw off) + a moving goal.

## 4. Scoring — built from the spectacle research (principle 6)

Base: a **weighted sum over your drivers' race events** — the engine already emits a categorized, magnitude-scored log (overtake, battle, close call, lead change, comeback, fastest lap, crash, DNF). The signal exists; this is a scoring lens, not new sim. On top of the base, the spectacle patterns:

- **Multiplicative drama chains.** A driver stringing events across a race builds a combo multiplier (Tony Hawk) — one wild drive is worth more than its parts. **Risk/reward:** a DNF *breaks the chain*, so you can't farm chaos risk-free.
- **Diminishing returns on repeats.** The 5th overtake is worth less than the 1st (Devil May Cry / *Death of a Wish*) — you're rewarded for *variety* of drama, which pushes you to back drivers who make *different* kinds of television.
- **Heat / decay.** A driver who goes quiet cools; ratings want sustained show, which keeps every lap live.
- **Tiered ranks.** Drivers hit rating tiers (a visible goal to chase), and the tier is a surface the box metal already speaks.
- **Link to the economy.** Ratings should be the currency you later *spend* (gifts/curses/features, per `FANTASY.md`) — the meter matters past the scoreboard (the Juul principle: a valued outcome pulls effort).

## 5. The perverse-incentive trap, solved twice

A naive drama economy makes you root for your **own** drivers to crash (crash = points). That feels bad and inverts the sim's attrition meaning. Two overlapping guards:

1. **Chains punish self-destruction:** a crash/DNF *ends* that driver's combo and their show for the race, so an all-crash stable caps out fast.
2. **Opposed audiences (the plates):** the chaos crowd loves the wreck, but the sponsor hates it. Drama becomes a **trade**, not a button.

## 6. Spinning plates — the depth layer (principle 7)

Multiple **audiences** as opposed meters, each scoring the event log differently:

| Audience | Loves (scores high) | Hates |
|---|---|---|
| 📺 The Crowd | *chaos* — crashes, near-misses, wild swings | processions |
| 🎭 The God of Spectacle | *excitement* — overtakes, battles, lead changes, comebacks | nothing happening |
| 💼 The Sponsor | *results/visibility* — your driver at the front, clean finishes | DNFs, anonymity |

They **conflict by design** (a crash thrills the Crowd, tanks the Sponsor), so every draft pick and every box is a trade-off — that's the tension (Reigns/Frostpunk).

**Two hard lessons from the research, both load-bearing:**
- **One legible goal at a time.** Don't score all three plates at once as a soup of numbers. **Management sets a target audience each stretch** — you're scored mostly on *that* audience right now. So there's always ONE clear thing to optimize (readable stakes, Frostpunk's single gauge), even as the target rotates (the paperclip re-target). This is the mechanic *and* the story in one move.
- **Add complexity gradually.** Frostpunk 2 overwhelmed players by stacking systems on day one. So: **ship Patron Mode as a single "excitement" rating first**, prove the loop and the decoupling-from-pace, then layer in the audiences as the depth upgrade. (This resolves the earlier single-vs-plates fork: single first, plates as v2.)

## 7. Power curve & balance

- **Escalation with a brake.** Ratings naturally compound (bigger audience → more spend → more drama → bigger audience — principle 8's forward pull). That's a *new* dominance axis: the most-dramatic stable could run away, same shape as the sim problem on a different stat. Brakes: the mystery-box catch-up tilt (worse → shinier), diminishing returns (can't spam one trick), and the **re-target itself** — when Management changes the scored audience, last week's optimal stable is no longer optimal, so leads don't ossify. Re-targeting doubles as a built-in, *diegetic* rubber band (principle 5) that creates a decision rather than punishing the leader.
- **Skill over luck (principle 3).** Drama events must be frequent and spread enough that *picking entertaining drivers* reliably beats a single lucky crash across a season. If one wreck can win a title, we've built a slot machine — tune event weights so the season rewards a read, not a jackpot.
- **Legibility.** Drama scoring is inherently murkier than F1 points ("why 340 ratings?"). Non-negotiable: a per-race **ratings breakdown** (the race report's highlights are the raw material) so a player can see what their show earned.

## 8. Balance targets

| Concern | Target / lever |
|---|---|
| Decoupling from pace | A field-leading (fastest) stable should *not* reliably top ratings. Measure: correlation between a stable's finishing pace and its ratings should be near zero. |
| New-axis dominance | Most-dramatic patron not mathematically safe before ~75% distance. Levers: box tilt, diminishing returns, re-target cadence. |
| Perverse incentives | An all-crash stable should underperform a balanced one over a season (chains + sponsor plate). |
| Legibility | Every rating point traceable to named events in the race breakdown. |

## 9. Open design questions

1. ~~Ship order~~ **Confirmed (Pax):** single number first (framed as views/followers), audiences as v2. Caveat he flagged: the views/followers metric itself needs *a lot* of design work — it's the mode's hardest and most important artifact.
2. **Re-target cadence & who sets it** — every race, every N, or narrative beats? Management-authored list vs rolled? (This is the paperclip dial and the main anti-snowball lever.)
3. **Stable size & control** — same draft-3 as today, or different? Do you ever *cut/swap* a driver who stopped being interesting (a programming decision), or is the stable fixed for the season?
4. **Event weights** — the actual spectacle table (overtake vs battle vs comeback vs crash vs fastest lap…). This is the core tuning artifact; it wants a drama-probe pass (defer, like the dominance probe) before numbers are set.
5. **Naming** — Patron / Sponsor / Channel / Showrunner (ties to the bible's Management voice).

## 10. Why this mode is the north star

It's the one that fulfills the bible, and the one that **structurally cannot inherit sim dominance** — so it's where fantasy becomes a distinct game with its own skill. It's also mostly *scoring design over existing data* (the event log + highlights), so the hard part is the weights and the plates, not new simulation. Single-number first keeps the first build small; the audiences and the re-target arc are where it becomes unmistakably *Parabolica*.

---

*Sources (principles, see `FANTASY_MODES.md` §7): [style/spectacle scoring patent](https://patents.justia.com/patent/6604008), [Tony Hawk combo scoring](https://support.activision.com/tony-hawks-pro-skater-1-2/articles/tony-hawks-pro-skater-1-2-scoring-and-combos), [style meters / Death of a Wish](https://www.gamedeveloper.com/design/style-meters-and-play-aesthetics-in-death-of-a-wish), [Frostpunk 2 factions/tension](https://www.gosugamers.net/entertainment/features/73298-frostpunk-2-review-a-fun-but-stressful-city-building-survival-game), [Universal Paperclips](https://en.wikipedia.org/wiki/Universal_Paperclips), [rubber-band theory (Lipka)](https://lawofgamedesign.com/2014/08/25/theory-rubber-bands/), [FPL skill study](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7928501/).*