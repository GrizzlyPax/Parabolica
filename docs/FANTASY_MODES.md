# Fantasy Modes — Team vs Patron

*Oct 2026. Design exploration (doc only, no code). A fork in how fantasy works, from Pax: fantasy isn't one scoring argument — it's **two game modes** over the same races. Companion to `docs/FANTASY.md` (what ships today), `docs/FANTASY_MYSTERY_BOX.md` (#296), and the story frame in `docs/story/2026-10-06-ideation.md`.*

---

## TL;DR

- Stop choosing between "results" and "ratings" scoring — **make them two modes.**
- **Team Mode** (principal): you run a two-driver team; you win by *results*. Competitive, legible, sim-true. Dominance is *fine here* — being the best team is the point.
- **Patron Mode** (the TV channel): you back a stable for how *entertaining* they are; you win by *ratings*. Spectacle, chaos, story. **Immune to sim dominance** — the boring winner draws no eyeballs.
- Same deterministic races, same event log, **two scoring lenses** — so this is two games for the price of one sim, and dominance is handled *per mode* instead of globally.

---

## 1. The one idea

A race produces two independent signals: **who finished where** (results) and **what was worth watching** (drama). Fantasy has been trying to serve both with one score. Split them:

| | Team Mode | Patron Mode |
|---|---|---|
| You are | a team principal | a channel / patron / sponsor |
| Opens with | a draft — reading **pace** | a draft — reading **drama** |
| You hold | a two-driver team (drafted pairing) | a three-driver stable |
| You win by | **results** (points, podiums, titles) | **ratings** (excitement, chaos, story) |
| Best pick is | the fastest package | the most *watchable* driver |
| Relationship to dominance | embraces it (be the best) | immune to it (pace ≠ ratings) |
| Story frame | the sport | "the work is mysterious and important" |

The magic: they reward **opposite reads of the same grid** — and that split starts at the **draft**, which both modes open with. Team Mode drafts for pace (you want the 5★ monster); Patron Mode drafts for drama (you might *fade* that monster — he wins from pole and nobody watches — and take the midfield lunatic who makes every lap television). Same ritual, opposite skill. Each spec's §2 details its draft.

## 2. Team Mode — the principal

**What it is.** You take the chair of a two-seat team and live or die by its results, F1-constructor style (both drivers' points). This is the grounded, competitive fantasy: "I built/run the best team."

**What "control" means** (the sim races autonomously, so control is the *management layer*, not driving):
- strategy lean (your team's pit/aggression archetype),
- the mystery box used as a team tool (buff your pair, sabotage a rival),
- between-race decrees/roster moves as they come online.

**Dominance stance: embraced.** Team Mode is explicitly the competitive mode, so a strong team running away with it is a *feature*, not the bug we fought in the sim. The June dominance work still matters for *sim health* (races should be good to watch), but Team Mode doesn't need the fantasy layer to launder it.

**Open fork — where your team comes from:**
- **(a) Adopt a constructor:** you take one of the grid's real 11 teams (its car, its two seats, its tags). Most sim-true; your fate is tied to that package's genesis roll.
- **(b) Draft a pairing:** you snake-draft two drivers (+ a car?) into a team that races as its own entity. More agency, less "real grid," needs the drafted team slotted into the field.
- *(The current shipped fantasy — draft 3, score F1 points, no control — is the ancestor of this mode. Team Mode tightens it to a controllable two-driver team.)*

## 3. Patron Mode — the channel

**What it is.** The bible's frame: *"You're running a TV channel. Ratings are the score."* You back a stable of drivers not for speed but for **show**. Your score is the audience you draw.

**Scoring basis — already in the engine.** Every race emits a categorized, magnitude-scored event log (`RaceEvent`: `overtake`, `battle`, `close_call`, `lead_change`, `crash`, `fastest lap`, comebacks, DNFs…), and `pickHighlights` already ranks the best of it. **Ratings = a weighted sum over your drivers' events.** The drama signal exists; the design work is the *weights*, not new simulation.

**Depth dial — one meter or spinning plates:**
- **One "excitement" number** — a single weighted blend. Simple, still fully decoupled from pace.
- **Spinning plates** (the bible's vision) — multiple **audiences**, each scoring differently and never all satisfiable at once:
  - **the crowd / viewers** → *chaos*: crashes, near-misses, wild swings;
  - **the god of spectacle** → *excitement*: overtakes, battles, lead changes, comebacks;
  - **the sponsor** → *results/visibility*: your driver seen at the front, clean finishes.
  Patron Mode's real game is **which show am I programming this week** — and Management keeps re-targeting (the paperclip arc), so the right answer keeps moving.

**The perverse-incentive trap, and why plates fix it.** If "crash = points," you'd root for your own drivers to wreck — which both feels bad and inverts the sim's attrition meaning. The plates dissolve it: the chaos-crowd *loves* the crash, but the sponsor *hates* it and a DNF ends that driver's show early. Drama becomes a **tradeoff you balance**, not a button you spam. (If we ever ship a single-number version first, split "good drama" — fights, overtakes, comebacks — from "self-destruction" — DNF, last — so it doesn't just reward carnage.)

**Dominance stance: immune by construction.** A flag-to-flag runaway generates almost no drama events, so it scores *low* in Patron Mode. Fantasy value here has no relationship to pace — which is exactly why this mode is the long-term-interesting one, and why it never inherits the sim's dominance.

## 4. Why two modes beats one scoring system

1. **Two games, one sim.** Both read the same deterministic digests + event log. No new physics; Patron Mode is a second scoring pass over data we already keep.
2. **Dominance solved locally.** Team Mode wants a best team; Patron Mode can't see pace. We stop trying to make one number serve both masters.
3. **Different skills, different players.** Team Mode is for the competitor ("I'll build the best team"); Patron Mode is for the showrunner ("I'll find the most entertaining chaos"). The same friend group can run both and argue about which is "real" fantasy.
4. **It's the story's two halves.** Team Mode is the sport the drivers think they're in; Patron Mode is Management watching for ratings. The modes *are* the paperclip arc — you can start as a principal and "graduate" to patron.

## 5. Mystery box across the modes

The box (#296) works in both, but *means* different things:
- **Team Mode:** a competitive tool — buff your pairing, curse the rival ahead of you. Catch-up tilt as designed.
- **Patron Mode:** a **programming** tool — manufacture drama. A chaos tag on a frontrunner is appointment television. The box's bronze→platinum metal fits the channel aesthetic perfectly.
The catch-up tilt (worse standing → shinier box) stays sensible in both; the *standing* it reads is just that mode's leaderboard.

## 6. Decided + open

**Decided (Pax):** **one mode per league** — you pick Team or Patron when you found it, and it's that kind of league. Cleaner mental model, and it lets each mode's scoring/UI commit fully instead of sharing a screen. (The "both leaderboards over one race set" idea is parked as a possible later crossover.)

Also decided: **both modes open with a snake draft** — Team drafts a two-driver pairing reading pace, Patron a three-driver stable reading drama (resolves the Team origin fork toward drafting, not adopting a constructor).

Still open (doc-stage): whether a Team pairing also drafts a car (Team spec §6), Patron scoring depth (single number vs plates — resolved toward *single-first* per the complexity-gradient research), and naming ("Patron" / "Sponsor" / "Channel").

## 7. Design principles (from research — sourced)

The per-mode specs lean on these; gathered here once so both can cite them.

1. **Hopeful loop.** A core loop is an action → immediate feedback → progression toward a longer goal; it works when it's short, satisfying, and anchored to a season arc. Every mode needs a per-race beat that feeds a season climb. [gameanalytics, mwm.ai]
2. **Variable reward, ethically.** Unpredictable payoffs (the mystery box) drive anticipation — but the bible's rule is bragging rights, not gambling, so we use the *shape* (surprise, "could be great") without money or dark-pattern pressure. [gameanalytics, psu.com]
3. **Skill must out-run luck over a season.** Persistence is the test — a good manager should keep winning across many races. High-variance one-off events (a crash) add spice but weaken the skill link; enough races + enough events let skill show. Don't let one lucky race decide a title. [FPL study, FanDuel persistence study]
4. **Give frequent meaningful actions.** Fantasy dropout comes from a rigid roster + a losing team you can't affect. A per-race decision (box, strategy, lineup) that *isn't* individually decisive keeps a trailing player engaged. [fantasy-scoring patents]
5. **Catch-up that respects skill.** Comebacks keep late seasons alive, but raw handouts negate skill and breed resentment. Good catch-up is *skill-gated* (you must set up the payoff), *bounded* (a big earned lead still matters), and *creates new decisions* rather than just punishing the leader. [Lipka/lawofgamedesign, game-wisdom, bugnet]
6. **Spectacle scoring patterns.** Multiplicative chains (risk/reward: longer = worth more, breaks hurt), diminishing returns on repeats (forces variety), decay/"heat" (keep moving), tiered ranks (visible goal), and linking the meter to outside rewards (it matters past the scoreboard). [Tony Hawk wiki, Death of a Wish / gamedeveloper.com, Pizza Tower]
7. **Spinning plates = opposed meters.** Factions/audiences that conflict make every choice a zero-sum trade (that's the tension); keep one legible failure/goal gauge so it stays readable; **add complexity gradually** — stacking many systems at once overwhelms (Frostpunk 2's lesson). Tension from decisions, not busywork. [Frostpunk 2 reviews, Reigns, Universal Paperclips]
8. **Escalation pulls.** A rising *rate* (not just a rising number) creates forward pull; staged gates give clear next targets; theme and math should reinforce each other; a closed ending makes a run feel like a story with a climax. [Universal Paperclips analyses]

## 8. The two specs

- **`docs/FANTASY_TEAM_MODE.md`** — the principal / results mode.
- **`docs/FANTASY_PATRON_MODE.md`** — the channel / ratings mode.

## 9. Status

Design exploration only — **no code, by Pax's direction.** This doc is the fork and the shared principles; the two specs develop each mode's loop, power curve and balance.
