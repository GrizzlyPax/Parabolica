# v0.8 Indianapolis — Ace America

*The next release, after v0.7 Suzuka ships. Owner: 🎤 Pit. Epic: [#702](https://github.com/GrizzlyPax/Parabolica/issues/702). Milestone `v0.8 Indianapolis · Ace America` holds the work until v0.8 is current; then it splits into the numbered milestones below. The story: [ace-america](story/ace-america.md) (direction until Pax moves it into the [bible](STORY_BIBLE.md)).*

## What v0.8 is
**Parabolica becomes Ace America.** An alternate 1920s where, since the Watchers' Accord, the world settles its quarrels on the track, and America runs its circuit like baseball. You're a team principal hired by a local garage. Win your city (**Ace Toledo**), then your state (**Ace Ohio**), then the 50-state Nationals (**Ace America**). The title is your identity. Deco gold on black. New name, new site: **playaceamerica.com** (Pax registered it Oct 10; playparabolica.com redirects).

**A whole version, not a reskin** (Pax, Oct 10): the run, the world data, the look, the words and the name all change. The sim and the deck engine stay.

## Phases (become milestones when v0.8 is current)
| # | Phase | Issues | Pax can… |
|---|---|---|---|
| **1** | **Lock** | #692 story → bible (📻) · #693 run design (🏛️) · #694 the Nationals (🏛️, then one 🏎️ read) | Read the world as canon; pick the run's shape |
| **2** | **The world** | #695 regions, states, garages (🛞) · #696 run core (🏎️) · #697 new run screen (🛞) | Name himself, pick a Toledo garage, climb City → State |
| **3** | **The look and the words** | #698 deco look, mock-ups first (🛞 + 📻) · #699 Parcels, titles, card names (🛞) · #700 the caller and the Interval (📻) · #370 six American tracks (📻) | See and hear Ace America |
| **4** | **Ship** | #701 rename + playaceamerica.com (🛞) · the Nationals build (filed after #694) | Play it at playaceamerica.com, end to end |

## Rules
- **The gate:** the domain is done; nothing in `src/` renames before #693's steers are answered.
- **Story first:** bible → data → screens. Radio proposes, Pax locks.
- **The race stays the race:** cards change inputs, never results; names that reach the race move the fingerprint, so bump the version.
- **Park, don't delete:** the nemesis and boss races come back with multi-season play; build seams, not removals.
- **Apex is scarce:** #696 is the one Apex build; #694's 100-car read is short.

## What v0.7 hands over
- The run engine (`run/`), XP and stat levels, the 60-card run deck, packs and curses, the ladder screen, the driver card.
- **Changes:** four leagues → three steps; `LEAGUE_LADDER` → field size from geography; the rookie start meets the garage pick (#693 decides); the 28 deck teams retire; the driver rank "Ace" gets renamed.

## Decision log
| Date | Call |
|---|---|
| Oct 10 | World B, the National Pastime, wins the story round (Radio + Pax) |
| Oct 10 | The rebrand is a whole version (Pax) |
| Oct 10 | playaceamerica.com registered on Cloudflare (Pax) |
| Oct 10 | No rivals or nemesis in the slice; the 28 deck teams are scrapped (Pax, via Radio) |
