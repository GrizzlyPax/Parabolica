# v0.8 Indianapolis — Ace America

*The current release (since Oct 10; v0.7 shipped trimmed as v0.7.4). Owner: 🎤 Pit. Epic: [#702](https://github.com/GrizzlyPax/Parabolica/issues/702). Milestones `v0.8 · 1 Lock + the look` → `2 Foundations` → `3 Screens + words` → `4 Ship`; `v0.8 Indianapolis · Ace America` holds v0.8 work not yet placed. The story: the [bible](STORY_BIBLE.md) (**canon** since #712), with the working notes in [ace-america](story/ace-america.md).*

## What v0.8 is
**Parabolica becomes Ace America.** An alternate 1920s where, since the Watchers' Accord, the world settles its quarrels on the track. You're a team principal: pick your state on a map of all 52, name your garage. Three steps, **Locals → State → Nationals** (plain "Nationals", never with "the"; later **Globals** and **Galacticals**): win your city (**Ace Toledo**), then your state (**Ace Ohio**), then Nationals, all 50 states (**Ace America**); later Ace Earth and Ace Universe. The title is your identity. The look is **a race program**: red, white and blue first, gold as the highlight, one theme per step; **the sash is the title**. New name, new site: **playaceamerica.com** (Pax registered it Oct 10; playparabolica.com redirects).

**A whole version, not a reskin** (Pax, Oct 10): the run, the world data, **the look of every screen**, the words and the name all change. **The deck builder slims down:** each driver card and your car card build up over the run with **stamps**, delivered in **Parcels** (the league's issue, or a gift from the Watchers). The sim and the card engine underneath stay.

## Milestones
| # | Milestone | Issues | Pax can… |
|---|---|---|---|
| **1** | **Lock + the look** | ✅ #692 story → bible (📻, canon) · #693 run design (🏛️) · #704 cards become stamps (🏛️) · #694 Nationals (🏛️, then one 🏎️ read) · #698 the look, three directions (🛞, mock-ups) | Read the world as canon; pick the run's shape, the stamps and the look |
| **2** | **Foundations** | ✅ #705 the design system (🏎️, PR #713; guide: `docs/LOOK.md`, catalogue: Race Control → Style) · #695 52 places, population, cities, generic garages (🛞; part 1 ✅) · #696 run core (🏎️) | See the style page and the Ladder in the new look; climb Locals → State |
| **3** | **Screens + words** | Hub's look sweeps: #715 Paddock · #716 race view · #717 standings + finale · #718 World Deck · #719 Race Control shell · #697 new run screen (🛞) · #699 Parcels, titles, stamp names (🛞) · #700 the caller and the Interval (📻) · #370 six American tracks (📻) | Every screen in Ace America's look and voice |
| **4** | **Ship** | #701 rename + playaceamerica.com (🛞) · #629 re-probe (🏛️) · Nationals build (filed after #694) | Play it at playaceamerica.com, end to end |

## Rules
- **The gate:** the domain is done; nothing in `src/` renames before #693's steers are answered.
- **Story first:** bible → data → screens. Radio proposes, Pax locks.
- **The race stays the race:** cards change inputs, never results; names that reach the race move the fingerprint, so bump the version.
- **Park, don't delete:** the nemesis and boss races come back with multi-season play; build seams, not removals.
- **Apex is scarce:** two builds in v0.8, the design system (#705, Pax: "the full firepower") and the run core (#696); #694's 100-car read is short. Hub does the mock-ups and the screen sweeps.
- **The look is the focus** (Pax, Oct 10): an aesthetic pass on everything, race view included.

## What v0.7 hands over
- The run engine (`run/`), XP and stat levels, the 60-card run deck, packs and curses, the ladder screen, the driver card.
- **Changes:** four leagues → three steps; `LEAGUE_LADDER` → field size from geography; the rookie start meets the state pick (#693 decides); the 28 deck teams retire; the driver rank "Ace" gets renamed.

## Decision log
| Date | Call |
|---|---|
| Oct 10 | World B, the National Pastime, wins the story round (Radio + Pax) |
| Oct 10 | The rebrand is a whole version (Pax) |
| Oct 10 | playaceamerica.com registered on Cloudflare (Pax) |
| Oct 10 | No rivals or nemesis in the slice; the 28 deck teams are scrapped (Pax, via Radio) |
| Oct 10 | v0.7 trimmed and shipped as v0.7.4; v0.8 is current (Pax) |
| Oct 10 | Slim the deck builder: driver and car cards earn stamps over the run, Parcels from the Watchers deliver them (Pax) |
| Oct 10 | Steps: **Locals, State, Nationals**, later Globals and Galacticals; never "the Nationals" (Pax, via Hub) |
| Oct 10 | **The look is the race program** (#698): red, white and blue first, gold as the highlight (not yellow); bunting, motorsport marks, an Official Program number; no "national pastime" subtitle |
| Oct 10 | **The sash is the title:** cream satin, a thin border, Playball script, a gold wheel at each end, no crown (a crown on the car, maybe later). Script font: Playball |
| Oct 10 | **One theme per step:** Locals black and white; State takes the state's colours as accents only (the ground stays dark); Nationals Americana. Menus: navy ground, cream panels (Hub's picks on "lock it in"; Pax can flip) |
| Oct 10 | **Driver card:** the face is a slot for commissioned art; titles sit under the driver as ribbons (Ace Toledo white, Ace Ohio state colour, Ace America navy and gold). Parcels and stamps as mocked |
| Oct 10 | All 50 states + DC + Puerto Rico get theme colours and a wheel-flag, designed by Pax + Radio (#708) |
| Oct 10 | The ladder beyond: Ace Earth, then Ace Universe (later; Radio, #707) |
| Oct 10 | **The story bible is canon: Ace America** ("This rules. I like it as canon."; #712). The old lore (the Booth, gods, tags, the 28 deck teams) retires |
| Oct 10 | **No regions:** you pick your start from any of the 52 on a map, then name your garage; rival garages are generic (family names and places) |
| Oct 10 | **The caller grows as you climb:** fairground PA at Locals, the state station at State, the national network at Nationals. Venues too: dirt, proper circuits, grandstands |
| Oct 10 | **The Watchers, very rarely:** gifts in Parcels and the Interval (a global message, slightly discordant, barely); none at Locals, more as you climb |
| Oct 10 | **No baseball in the lore** (on the bible's Never list) |
| Oct 10 | No version bump for data the race doesn't read yet (Hub, #711; Pax can overrule); the bump comes with garage and driver names |
| Oct 10 | Apex's calls in #713 (Pax to confirm): the sash's wheels stay gold in every theme; a dark ground tint per state (optional `ground`); the menu sash says "Parabolica" until #701; the program number is the version's digits (0.7.4 → No. 74); four stamp slots on the card frame as a shape only (#704 decides) |
| Oct 10 | Focus on the look: an aesthetic pass on every screen; Apex builds the design system, Hub sweeps the screens (Pax) |
