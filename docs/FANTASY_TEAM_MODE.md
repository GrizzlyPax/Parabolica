# Team Mode — game design spec

*Oct 2026. Game-design spec (no technical content) for the principal/results fantasy mode. Child of `docs/FANTASY_MODES.md` (read §7 Principles first). One mode per league.*

---

## 1. The fantasy

**You are a team principal.** You hold one two-driver team and win by **results** — constructor points over the season. This is the competitor's mode: "I'll run the best team on the grid." Pace matters, strategy matters, and beating a rival is the whole point.

## 2. The loop (hopeful)

```
  BETWEEN RACES                 RACE                      AFTER
  open mystery box  ───▶  your pair races  ───▶  points + standings move
  set strategy lean        (you watch)            development earned
        ▲                                                │
        └────────────────────────────────────────────────┘
                     "next race I close the gap"
```

- **Per-race beat** (principle 1, 4): a box to open and a strategy lean to set — small, meaningful, *not* individually decisive.
- **Season arc:** climb to the constructor title; a closed ending (the finale) makes the run a story (principle 8).
- **The hook:** the standings gap is always one good race from closing, and the box is the between-race variable-reward beat (principle 2).

## 3. The power curve — the thing we have to get right

A principal who merely *owns* a fixed team has **no growth curve**: they're exactly as good as their genesis roll, the season plays out, and a losing player has nothing to do but watch (principle 4's failure mode — the #1 fantasy-dropout driver). Team Mode therefore needs a **progression vector**: something the principal grows across the season.

Candidates (pick one as the spine):
- **Team development points** — earned each race, spent to nudge car/driver stats or add tags. "Numbers go up" forward pull (principle 8).
- **Tag accretion** — your pair accumulates mystery-box tags, so the team gets stronger *and* more characterful over a season (feeds the story layer too).

**The balance knife-edge:** a progression vector that pays the *winner* most = snowball = the dominance trap we fought in the sim, now re-imported into fantasy. So development must be **catch-up-leaning or flat**, never pro-leader:
- development points scale with your **deficit** (or are equal-per-race), and
- the mystery-box tilt (worse standing → shinier box, see `FANTASY_MYSTERY_BOX.md`) is the main equalizer.

This is principle 5 applied: the catch-up is **skill-gated** (you still choose *what* to develop and *where* to aim the box), **bounded** (a genuinely great team stays ahead — we're compressing the gap, not erasing the lead), and it **creates decisions** rather than handing the laggard free speed.

## 4. Balance targets

| Concern | Target / lever |
|---|---|
| Dominance | *Allowed* (be the best team) but not a title decided by mid-season. Measure: champion shouldn't be mathematically safe before ~75% distance in the median league. Lever: deficit-leaning development + box tilt. |
| Skill over luck | A good principal beats a lucky one across a season (principle 3). The decisions (develop-what, box-whom, strategy lean) must swing enough races to show over the schedule — but no single race decisive. |
| Engagement when losing | A trailing principal always has a live lever (shinier boxes, bigger development) and a visible "catching up" signal. |
| Two-driver texture | Both seats score (constructor sum). A clear #1/#2 or a rivalry *within* your team is narrative fuel — worth surfacing, not hiding. |

## 5. Open design questions

1. **Origin** — adopt one of the grid's real 11 constructors (tighter theme, your skill is all in-season) **or** draft a two-driver pairing (keeps the beloved blind-draft moment + more agency, but the team races as an added entity)? *Lean: draft a pairing — the draft is a real skill/luck beat players love, and it's the current fantasy's DNA.*
2. **Progression spine** — development points vs tag accretion vs both? (Both is richer but two economies to balance; start with one.)
3. **Strategy lean as a real lever** — is "set your team's pit/aggression archetype" enough of a decision to feel like principal-ing, or does control need more (driver orders, develop focus)?
4. **Title shape** — pure constructor points, or points + a bonus for beating your pre-season projected finish (a built-in underdog/skill reward that further decouples from raw package)?

## 6. Why this mode earns its place

It's the **competitor's fantasy** and the simplest to make legible (points are points). Its whole design risk is the power curve — get the progression catch-up-leaning and it's a tense season-long climb; get it pro-winner and it's the dominance procession wearing a team hat. The levers (deficit development, box tilt) are already in our vocabulary, so the mode is mostly *scoring + a progression economy*, not new simulation.

---

*Sources (principles, see `FANTASY_MODES.md` §7): [FPL skill study](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7928501/), [fantasy season-engagement patent](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/11351465), [rubber-band theory (Lipka)](https://lawofgamedesign.com/2014/08/25/theory-rubber-bands/), [rubber-banding AI](https://game-wisdom.com/critical/rubber-banding-ai-game-design), [incremental escalation / Universal Paperclips](https://en.wikipedia.org/wiki/Universal_Paperclips), [compulsion/core loop](https://gameanalytics.com/blog/the-compulsion-loop-explained/).*