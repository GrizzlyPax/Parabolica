# Fantasy teams — the first gamification layer

**Where:** Found a League → *Fantasy teams* (replaces the gods step; gods are parked in `gods.ts` for a later mechanic) and Quick Race → Run Setup → *Fantasy*. Code: `src/fantasy/`.

## The game
A few of you name a team each (2–6 teams, preset colours), then **snake-draft** three drivers from the actual grid — exclusive picks, order reverses each round. A team scores the **sum of its drivers' race points** on the league's F1 table (25-18-15…, top 10, DNF = 0). Standings live on the league page (and the fantasy champion in the finale); in a quick race the Race Complete bar shows each team's points.

## What drafters see (on purpose, not much)
- The driver's and the car's **third of the field** (front / midfield / back), from the same skill and package scores the timing tower ranks by. Cars are per constructor, so teammates read the same.
- **Tag dots** coloured by rarity — that a driver carries a common / rare / legendary tag, not which. Risk inference is the point.
- No raw numbers, no tag names, no overall rating.

## In the race
Drafted drivers' rows in the timing tower carry their fantasy colour (tint + right-edge stripe); the detail view and the expanded row show the team badge.

## Facts, not state
`FantasyConfig` (`{squadSize, teams: [{id, name, color, driverIds}]}`) sits in `LeagueSetupConfig.fantasy`, so a **published league carries its fantasy teams to every device** and every device computes the same standings from the same digests. The founding seed is now chosen on the founding screen (`FoundingChoices.leagueSeed`) so the draft sees the real grid; *Re-roll the grid* gives a new universe and clears picks.

## Later (Pax's direction)
Spend points: gifts for your drivers, curses for rivals, features for the league. Multi-device drafting. More colours as teams grow.
