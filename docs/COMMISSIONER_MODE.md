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
6. **The additive engine is the fun.** The base simulation is the stage; tags,
   track events, and injected oddities stacking into combinatorial chaos are
   the game (the Mewgenics instinct). When prioritizing systems, the question
   is always: does this make the tag layer richer? The MVP intervention verb,
   the decree implementations, and most future content should all resolve to
   "things that attach tags to things."

In-fiction, the player is **the Commissionary** — the title keeps it sporty
while implying the weird religious office it actually is. The UI can say
"Commissioner" where clarity wins; the gods and the feed say Commissionary.

## The shape of a run

A run is one season: **~12–16 races over 2–3 real days**, one race firing
every ~3 wall-clock hours. The clock is fully indifferent — races run
overnight too, and waking up to a digest of what happened while you slept is
the ant farm working as intended.

The one exception to the indifferent clock: **full stops** (Phase 2). Rare
random events can bring the entire season to a halt — a stewards' inquiry, a
scandal, a god's ultimatum — and the league stays frozen until the
Commissionary returns and rules on it. Time only resumes when you decide.
Full stops are the pressure valve on the 24/7 clock (the league can wait for
you, but only when something dramatic forces it) and the single best
push-notification moment in the design ("THE LEAGUE IS HELD. YOUR RULING IS
REQUIRED."). Deferred past MVP so decrees and demands can prove the
decision loop first.

### 1. Season setup (the deck-build moment)

The commissioner founds the league:

- **Choose your patron god** — the pantheon is **appetite gods**: each god
  hungers for a different shape of season *statistics*, deliberately not
  one-to-one with any single dial. (Sketches: *The Scrap Heap* feeds on
  attrition — too few DNFs starves it. *The Stewards* demand order — clean
  races, no carnage. *The Photo Finish* craves parity — a championship
  decided by inches; domination displeases it.) Appetites key off the highs
  and lows of the season's stat lines, so pleasing a god is about shaping
  conditions, not pressing a button that increments a meter. The god choice
  is the run's difficulty modifier and win condition in one.
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
- **Interventions** ("throw things in"): a scarce resource — attach a tag to
  a driver or team, and later: inject a new driver mid-season, schedule a
  track event, rename a thing. **Economy: a fixed allowance of tokens per
  season** (simple, predictable, pure roguelite; a god-granted favor economy
  is a possible later evolution). Interventions are *committed before the
  next race fires*; if you don't check in, the opportunity to influence that
  race passes. That's the roguelite pressure of limited interaction.
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
("three DNFs at Subpoena Day by week 6"). **Demands are explicit, the voice
is cryptic**: the demand UI always shows exact terms and live progress
("DNFs: 1/3 — two races remain"), so a smiting never feels like a rules
ambush — but the god's feed lines are riddles and menace, and the personas
interpret. Fail enough and the run ends early in catastrophe — and a smiting
must be *spectacle*: the feed goes apocalyptic, the league is consumed, the
chronicle records exactly how. Losing should produce a better story than a
mediocre win.

### 5. Score and the Hall of Seasons

Every run — completed or smited — produces:

- **A score** (proposed components, to tune: god satisfaction, fan mood at
  finale, drama generated [the sim already emits the events to count],
  feats/records set, survival bonus).
- **A chronicle**: champion, final standings, records, the weirdest three
  events, the decrees taken, cause of death if applicable. Auto-written by
  the commentary personas.

**Score is personal — but seasons are seed-reproducible from day one.** No
leaderboard in the MVP; the Hall of Seasons is your museum. But because a
season is fully determined by `(seed, god, setup choices, intervention log)`,
a shared "daily run" — same god, same grid, same seed for everyone, compare
scores — can exist later without rearchitecting. That door stays open free
of charge.

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
- Season setup: pick **one of three appetite gods**, pick teams and tracks.
- Wall-clock schedule + lazy backfill on app open.
- The digest screen (feed personas over past races).
- God demand tracking (explicit terms + progress UI, cryptic feed voice),
  displeasure meter, early-end smiting.
- **One** intervention type: **attach a tag** to a driver or team, from a
  fixed token allowance per season. (Chosen deliberately — the tag system is
  the additive engine the whole game bets on, and it's the cheapest verb to
  build because tags already exist in the sim.)
- **One** decree beat at mid-season (pick 1 of 3).
- Final score + a Hall of Seasons screen with the chronicle.

Deliberately cut from MVP: full stops, fan mood, NPC betting crowds,
multiple intervention types, push notifications, rival gods.

### Phase 2 — texture
**Full stops** (season-halting decision events — start with one type, e.g.
the stewards' inquiry, then grow the table); NPC crowd betting + fan mood as
a second pressure gauge; more gods, decrees, and intervention types
(driver injection, track events, renaming); chronicle share cards (#54
energy); notification event log → PWA push.

### Phase 3 — the horizon
Capacitor iOS wrapper with scheduled local notifications; the Big Leagues
(public persistent league, server-evaluated, bettable, joinable).

## Resolved in interview #2 (June 2026)

1. **Intervention economy**: fixed token allowance per season (simplicity
   first; god-granted favor is a possible later evolution).
2. **God demand legibility**: explicit demands with progress UI, cryptic
   voice in the feed.
3. **Score**: personal museum number now; seasons seed-reproducible from day
   one so shared "daily runs"/leaderboards remain possible later.
4. **The clock**: fully 24/7 and indifferent — no quiet hours. The eventual
   counterweight is **full stops** (Phase 2): rare pausing events that freeze
   the season until the Commissionary returns to rule on something.
5. **The player is the Commissionary** — religious office, sporty register.
6. **MVP intervention verb**: tag attachment — chosen because the tag system
   is the additive engine the whole design bets on (pillar 6).
7. **Pantheon flavor**: appetite gods keyed to season-statistic shapes
   (carnage, order, parity/closeness, domination...), never one-to-one with
   a single dial.

## Still open (small, can be settled during the build)

1. **Token allowance size** — how many tag interventions per season? (Gut:
   3–4, so each is an event. Tune in playtesting.)
2. **The three MVP gods' final names and exact appetite formulas** — needs a
   writing pass plus a stat audit of what the engine already tracks per race.
3. **Tag taxonomy for the MVP** — which existing tags are commissioner-
   grantable, and do we author a few intervention-only ones (curses/boons)?
4. **Front door** — does the app open into Commissionary Mode with Quick
   Race demoted to a side mode, or keep Quick Race as the front door until
   the MVP proves itself?
