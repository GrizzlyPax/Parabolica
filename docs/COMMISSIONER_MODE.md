# Parabolica — Commissioner Mode: Game Design Doc

*June 2026. Drafted from a design interview with Pax. This is the gamification
north star for Parabolica: what the game actually IS, with the existing
race/betting build recast as the foundation it always secretly was.*

## The theory of the case

Blaseball's magic was the ghost in the machine: a sim that ran whether or not
you were watching, generating emergent narrative that fans turned into lore.
But the people who had the *most* fun with Blaseball were almost certainly the
developers — the ones adding names, tweaking rules, throwing new horrors into
the machine and watching what happened.

**Commissioner Mode gives every player that job.** You are not a bettor, not a
fan, not a team owner. You are the commissioner of your own small racing
league — your own ant farm — running in real time in the background of your
life. You set it up, you make limited interventions, you answer to powers
above you, and you watch what your choices do to the little world you're
responsible for.

The tone is already in the build: Safety Carl, Subpoena Day, Mister Marbles.
The commissioner sits one rung below the eldritch and one rung above the
drivers, and both rungs have opinions about their job performance.

## Design pillars

1. **You are the commissioner, not a player.** Every mechanic should answer
   "what would the person running the league do?" — never "what would a
   bettor do?" You don't pick winners; you build the conditions and live with
   the results.
2. **The league runs on wall-clock time.** Races happen at real moments
   whether you're watching or not. The world not waiting for you is the
   feature. Coming back to find out what happened is the core dopamine.
3. **A season is a run.** Roguelite structure: set up a season, survive it (or
   don't), get a score, archive the chronicle, start fresh. Runs are
   self-contained stories, not stages of a power curve.
4. **Interventions are scarce and consequential.** Cookie Clicker check-in
   cadence, but what you do in a check-in is a *decision*, not a harvest.
   Limited interaction is what makes the sim feel alive rather than driven.
5. **One level above the dials.** The commissioner never touches sim variables
   directly. Decrees, gods, and league rules have knock-on effects on the
   physics underneath (`CANON_VARIABLES` is the implementation layer), but
   the player-facing choice is always fictional: "appease the Tortoise" never
   "tire wear ×0.8".

## The shape of a run

A run is one season: **~12–16 races over 2–3 real days**, one race firing
every ~3 wall-clock hours. Races run overnight too — waking up to a digest of
what happened while you slept is the ant farm working as intended.

### 1. Season setup (the deck-build moment)

The commissioner founds the league:

- **Choose your patron god** — one of several eldritch powers, each with a
  personality, a demand structure, and a relationship to the sim. (Examples
  to riff: *The Stewards* demand order — too many crashes displeases them.
  *The Scrap Heap* feeds on attrition — too *few* DNFs displeases it. *The
  Long Now* cares about streaks and records.) The god choice is the run's
  difficulty modifier and win condition in one.
- **Select the teams** that may compete (which of the generated/known teams
  get grid slots).
- **Select the tracks** and their order — the calendar is the schedule of
  real-world race times.
- Later: league rules (points systems, weird formats), rival gods, fan
  factions.

Setup should take five minutes and feel like shuffling a tarot deck, not
filling out a form.

### 2. The season runs (wall-clock, with check-ins)

Races fire at their scheduled real-world times. Between races, the
commissioner can check in — a check-in is 1–3 minutes and offers:

- **The digest**: persona-voiced recap of every race since you last looked
  (the `feed/commentary.ts` engine pointed at past races instead of live
  ones). This screen IS the in-app notification system for the MVP.
- **The league pulse**: god displeasure meter, fan mood, standings, who's on
  a streak, who's cursed.
- **Interventions** ("throw things in"): a scarce resource — inject a new
  driver mid-season, attach a tag to someone, schedule a track event, rename
  a thing. Interventions are *committed before the next race fires*; if you
  don't check in, the slot passes unused. That's the roguelite pressure of
  limited interaction.
- **Watch live**: if you happen to be present when a race fires, you get the
  full WatchMode broadcast. Optional, never required.

### 3. Decrees (the mid-run draft)

At fixed milestones (e.g., ⅓ and ⅔ through the calendar), the god hands down
**a choice of three decrees** — pick one, it takes effect for the rest of the
season. Decrees are the Slay the Spire card-reward moment: fictional on the
surface ("Decree of the Hungry Asphalt: the track remembers every crash"),
mechanical underneath (crash debris effects persist between races). This is
the *only* way season physics change, which keeps the player one level above
the dials by construction.

### 4. The god can end you

The patron god has a **displeasure meter**. Demands arrive with deadlines
("three DNFs at Subpoena Day by week 6"). Fail enough and the run ends early
in catastrophe — and a smiting must be *spectacle*: the feed goes apocalyptic,
the league is consumed, the chronicle records exactly how. Losing should
produce a better story than a mediocre win.

### 5. Score and the Hall of Seasons

Every run — completed or smited — produces:

- **A score** (proposed components, to tune: god satisfaction, fan mood at
  finale, drama generated [the sim already emits the events to count],
  feats/records set, survival bonus).
- **A chronicle**: champion, final standings, records, the weirdest three
  events, the decrees taken, cause of death if applicable. Auto-written by
  the commentary personas.

**Meta-progression is the museum, not power.** The Hall of Seasons is an
archive of chronicles you can revisit and share. No carried currency, no
permanent upgrades, no persistent universe across runs — each season is a
sealed jar. (This deliberately diverges from the "one canonical universe"
framing in `GAME_DESIGN_PASS.md` §4: that persistence instinct was right, but
it lives *within* a run — drivers accrue history across the 16 races of your
season — and the chronicle is what survives. If a persistent shared universe
ever exists, it's the Big Leagues, below.)

## Where betting goes

Betting is no longer the player's job — **the NPC crowds bet**. Odds movement
and crowd money become a readout of public mood in your league: the fans
making a doomed darling the favorite is content, and fan mood can feed the
score and the god pressure. All the betting math survives as simulation
instrumentation (BetLab already proves the odds are honest); it just stops
being the player-facing core loop.

**The far-future split**: one official, public, always-running Parabolica
league — live, joinable, bettable by everyone, the actual Blaseball
descendant — alongside your private commissioner leagues. Betting becomes the
mass-audience verb for the Big Leagues; commissioning is the deep verb. This
is explicitly not MVP, but the architecture note below keeps the door open.

## Why the wall-clock league needs no server

This is the technical unlock that makes the whole vision cheap: **a seeded,
deterministic sim means real time is an illusion you get for free.**

A season is generated up front as a schedule: `(raceIndex, scheduledAt,
seed)` for every race, plus the league state. When the app opens, any race
whose `scheduledAt` has passed is simulated *instantly and headlessly* (the
labs already run hundreds of headless races in seconds) and its results,
feed lines, and god-meter effects are backfilled. The race "happened" at 3am;
the universe just evaluated lazily. Interventions stay honest automatically:
they can only be committed in-app, and the app settles all past races before
accepting new ones, so you can never intervene in a race whose time has
passed.

Consequences:

- No backend, no cron, no hosting bill. `localStorage` persistence (issue
  #43) is the entire infrastructure.
- The same architecture works *unchanged* if a push server or native wrapper
  arrives later — a server would just evaluate the same deterministic
  schedule eagerly and send pings.
- The hard prerequisite is the **seeded RNG** item from
  `ARCHITECTURE_REVIEW.md` Phase 1. It was already the top refactor
  priority; it is now the foundation of the entire game.

## Platform & notifications

**In-app first.** The digest screen is the notification system for the MVP.
But every digest-worthy beat (god demand issued, demand failed, smiting
imminent, race upset, season finale) gets logged as a typed `NotificationEvent`
from day one — so when this becomes a home-screen PWA with web push, or a
Capacitor-wrapped iOS app with scheduled local notifications, the content
pipeline already exists and only the delivery channel is new. iOS local
notifications are a particularly good fit later: the race schedule is known
at season setup, so pings can be scheduled on-device without any server.

## Repo verdict: stay in Parabolica

Do **not** split to a new repository. The commissioner game is a new shell
around assets this repo already has and the new game needs every one of:

- `RaceEngine.ts` — the sim itself (and the labs prove it runs headless).
- `generators/` — drivers, teams, tracks, names: the season-setup deck.
- `feed/commentary.ts` — the persona engine that writes digests and
  chronicles.
- `betting/` — becomes the NPC crowd model.
- The test suite — the safety net for the refactors below.

A new repo would mean forking ~9k lines of working, tested sim. Worse, the
existing roadmap (`ARCHITECTURE_REVIEW.md`) already points at exactly the
prerequisites Commissioner Mode needs — the two visions converge rather than
compete. Quick Race + betting stays as a mode (it's the live-broadcast layer
the commissioner uses to watch races anyway).

## Build sequence

### Phase 0 — prerequisites (already on the roadmap)
1. **Seeded RNG** in `RaceEngine` (ARCH review Phase 1.2). Non-negotiable
   first step.
2. **Headless race entry point**: one function, `runRace(leagueState, seed) →
   results + events`, shared by labs, live mode, and backfill. Mostly a
   formalization of what the workers already do.
3. **Persistence** (`#43`): league state + schedule + results in
   `localStorage`.

### Phase 1 — the minimum viable season
The smallest thing that is recognizably the game:
- Season setup: pick **one of three gods**, pick teams and tracks.
- Wall-clock schedule + lazy backfill on app open.
- The digest screen (feed personas over past races).
- God demand tracking, displeasure meter, early-end smiting.
- **One** intervention type (inject a driver or tag between races).
- **One** decree beat at mid-season (pick 1 of 3).
- Final score + a Hall of Seasons screen with the chronicle.

Deliberately cut from MVP: fan mood, NPC betting crowds, multiple
intervention types, push notifications, rival gods.

### Phase 2 — texture
NPC crowd betting + fan mood as a second pressure gauge; more gods, decrees,
and intervention types; chronicle share cards (#54 energy); notification
event log → PWA push.

### Phase 3 — the horizon
Capacitor iOS wrapper with scheduled local notifications; the Big Leagues
(public persistent league, server-evaluated, bettable, joinable).

## Open design questions (for the next interview)

1. **Intervention economy**: fixed allowance per season? Earned by pleasing
   the god? Priced in something fans give you? (Leaning: god grants them —
   keeps the god relationship central.)
2. **God demand legibility**: fully explicit ("3 DNFs by race 10") vs.
   partially cryptic (the god speaks in riddles, the feed interprets)?
   Cryptic is more Blaseball; explicit is better game design. Probably
   explicit demands, cryptic *voice*.
3. **Score chasing**: is there a global/shared leaderboard eventually, or is
   score purely personal? (Affects how seriously to take seeded fairness —
   same god/teams/seed could be a shareable "daily run".)
4. **Quiet hours**: races overnight are good ambience, but should the finale
   be guaranteed to land at a waking hour? (Probably yes — the season finale
   is an appointment.)
5. **What's the player called in-fiction?** "Commissioner" is the working
   title; the gods presumably have a less flattering word for it.
