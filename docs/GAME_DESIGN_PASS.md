# Parabolica — Game Designer's Pass: The Live Race Experience

*June 2026. Based on playing through the game (bet → race → finish, all
three race views, several full races) plus a read of the issue backlog,
HOW_IT_WORKS.txt, and README. Correction from an earlier draft: with a bet
actually placed, the live bet UI (YOUR BETS chips, auto-focus on bet
drivers, bet settlement in the results popup) all exists and works — the
gaps below are the real ones.*

## The one-sentence diagnosis

The simulation is deep, the vibes are excellent, and the bet-tracking UI is
already solid — but **the race itself has no voice**: nothing on screen
narrates what's happening, so between your bet chips changing color there's
no story to follow, no moments to react to, and nothing accumulating meaning
race over race.

## What's already working (don't touch)

- **The voice in the content.** "Safety Carl," "Subpoena Day," "Mister
  Marbles," drivers named "Eventually Frequent" — the Blaseball DNA is
  genuinely there in the writing.
- **The betting screen.** Tiered cards, flip-to-bet, per-type payouts — the
  most game-like screen in the app.
- **Live bet tracking.** The YOUR BETS chips with live red/green payout
  status, bet drivers auto-focused with labeled glowing markers on the map
  and expanded rows in the tower — this is exactly the right foundation.
  (Worth protecting: it's the rooting loop.)
- **The #111 redesign bones.** Universal header, view switcher, the whole
  track turning yellow with an SC marble during a safety car.

## The four real gaps (in priority order)

### 1. The race has no narrator — the feed is the missing organ
In the Track/Detail views, **nothing announces anything**. Safety cars
deploy, drivers crash, leads change — the evidence is a header chip
changing and dots shuffling. Blaseball was *literally a text feed* and
people wept over it; the feed isn't decoration around a simulation, it IS
the gamification layer.

You already specced this: **issue #76 (Race Events → social feed)**. I'd
promote it to the next major feature. Concretely:

- A vertical feed in the empty space below YOUR BETS (desktop) / below the
  tower (mobile), newest on top.
- Every engine event becomes a persona-voiced line: an announcer calls
  overtakes and crashes, Mister Marbles reacts to *your bets specifically*
  ("your podium pick just dropped to P8" — issue #55 folds in here), the
  track event gets its own voice. The engine already emits typed
  `RaceEvent`s — this is a presentation layer, not an engine change.
- Big moments (crash, lead change, final lap) pin/linger.

The YOUR BETS chips tell you *how* you're doing; the feed tells you *why* —
and gives you something to read while the train of dots circulates.

### 2. The midfield is a featureless train — manufacture legibility and drama
Mid-race, the tower reads `+0.0s, +0.0s, +0.0s` down the field and
unfocused cars are identical small dots. Focus solves it for *chosen*
drivers; nothing creates drama you didn't pre-select. Broadcast-style tools:

- **Δ position flashes**: when a driver gains/loses a place, pulse the row
  green/red with ▲2 for a few seconds (the Δ Pos column from the #111 spec,
  but as an *animation*, not a static number).
- **Battle detection**: the engine already does crash-proximity checks
  within 3% track distance — surface the same check positively as a
  "⚔️ BATTLE for P4" chip on the pair (tower + map). Gives the eye a place
  to go, and feeds the narrator.
- **Final-lap ritual**: "FINAL LAP" banner, feed goes rapid-fire, and
  auto-slow from 10x to 1x for the last lap so fast-forwarding never robs
  the ending. Races need a crescendo; right now the checkered flag just
  happens.

### 3. Bet settlement works, but it's bookkeeping, not a payoff
The Race Complete popup does show your bets settled (✓) — as a compact
static list. This is the emotional climax of the loop and it currently
reads like a receipt. When you do **#123 (end-of-race redesign)**, make
settlement the dramatic center:

1. Podium celebration (keep, inline per #123 rather than a modal),
2. each bet card revealed one at a time — green ka-ching with marbles
   counting up, or red stamp — a Wordle-style reveal,
3. net marbles + share card (#54's bet-type emoji line slots in here).

That sequence is what makes "NEXT RACE" feel like "one more pull."

### 4. Nothing persists, so nothing accumulates meaning
The deepest Blaseball gap. Blaseball dots were sacred because they
*persisted* — history, stats, lore. Every Quick Race rolls a fresh universe
(each page load = brand-new grid), so no driver can become "your guy"
across sessions. The pieces are all in the backlog: #43 (persistence), #106
(morale), #6 (persistent tags), #147 (content epic). The design framing:
**one canonical universe of teams/drivers that endures**, Quick Race draws
from it, results accrue ("Comfort Phillips has DNF'd 4 straight races").
That's when feed personas have material and the betting screen has lore.

## Suggested order of attack

| # | Move | Existing issues | Size |
|---|---|---|---|
| 1 | Event feed with personas, incl. bet-aware lines | #76, #75, #55 | M |
| 2 | Δ-pos flashes, battle chips, final-lap ritual | #111 leftovers | S–M |
| 3 | End-of-race bet-settlement reveal sequence | #123, #54 | M |
| 4 | Finish Standings view (incl. Marble Bets section) | #111 | S |
| 5 | Persistent universe (the big one — design doc first) | #43, #106, #6, #147 | L |

Items 1–2 are presentation-layer — no engine changes, low regression risk,
and the test suite guards the engine math underneath.

## Smaller observations from playing

- Quick Race auto-starts on arrival — consider letting the countdown
  (`RaceStartCountdown` exists) play so the race has a starting-gun moment.
- Detail view's STS column rendered "–" for every driver all race; if
  in-race tag states are that rare, feed moments would showcase tags better
  than a mostly-empty column.
- Standings view says "STANDINGS COMING SOON" (at least in single race) —
  inside an otherwise polished nav, a stub view feels worse than not
  listing it yet.
- The bet-confirm button inside a flipped card has the same label ("Place
  Bet") as the 22 card-front buttons — fine for humans, but it also hints
  the cards could distinguish "open" vs "confirm" affordances more
  strongly (e.g., "Lock it in 🔒").
