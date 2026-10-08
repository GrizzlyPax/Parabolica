# Icons, colour & team theming — design change

*Pax, Oct 8. Emoji are out; [game-icons.net](https://game-icons.net) is in, everywhere. Epic: [Art pass](https://github.com/GrizzlyPax/Parabolica/issues/182).*

## TL;DR
- **Every emoji in the app becomes a game-icons.net icon:** teams, cards, weather, tracks, rule cards, the feed, menus and controls. One art style everywhere.
- **Icons are single-colour SVGs, so they take any colour.** That's what makes the next point work.
- **The game wears your team's colour.** The UI is black + white; once you've picked a team its **primary** colour becomes the only accent, icons included. Rivals keep theirs on their own marks.

## The colour system (Pax, Oct 8)
The whole UI is **black and white plus one colour: your team's.** Everything else is earned.

**Touchstone: Blaseball** (Pax). Stark black and white, confident type, lots of negative space, one flat colour per team, no gradients or chrome. The strangeness lives in the words, not the visuals. When unsure, take colour away.

| Layer | Where | Colour |
|---|---|---|
| **Base** | backgrounds, panels, text, icons, borders, most of every screen | **black + white** (greys only as shades of these) |
| **Your team** | accents: active states, buttons, highlights, your rows, your icons, the hotseat cue | **your team's primary**, one colour |
| **Signal colours** | only where they carry meaning: draft traffic lights, gains/losses, best / fastest (purple) | **red · yellow · green · purple** |
| **Rarity** | card and tag rarity: chips, draft dots, card sheet | **metals: bronze · silver · gold · iridium** (Pax, Oct 8; see The look) |
| **Other teams** | only on a rival's own mark: their logo tile and row edge | **their primary** |

- **Teams have one colour: the primary.** No secondary colour. A team logo is a **white or near-black icon on the primary**, whichever reads (an `ink` value, picked automatically or stored per team).
- **Default (no team picked yet, Quick Race, menus):** the accent is **Parabolica purple** (`#a98bff`, the fastest-lap purple; Pax, Oct 8).
- **Names stay white** (house rule).
- **One token drives it:** `--team-primary` (plus `--team-ink` for icons on it). Change the team, and every accent and icon re-colours. Nothing else in the UI hard-codes a colour; signal colours come from `--signal-*` tokens and rarity from `--rarity-*` (metals).

## The look (Pax, Oct 8)

*Picked from the look tests: **direction B, "Almanac"**, the one closest to Blaseball (typefaces since swapped; see below). Review page: [Parabolica Look Tests](https://claude.ai/artifact/BTW6FEB4RQhtdRK4Wz3EGq) (tick "B Almanac", rarity look "Metals"). This is the spec the colour system ([#323](https://github.com/GrizzlyPax/Parabolica/issues/323)) and the emoji sweep ([#352](https://github.com/GrizzlyPax/Parabolica/issues/352)) build to. Phone first: every value below is set at 390 px.*

**In one line:** white rules on black, an old textbook serif for headings and names, every number and label in a worn typewriter, square corners, lots of air. The team colour appears as **flat blocks** and nowhere else. No gradients, no shadows, no rounded cards.

**Type: "Pulp Almanac" (Pax, Oct 8).** The first pick (Archivo + Source Serif 4) read slick, like a magazine; Pax wanted Blaseball's handmade feel. Picked from [Parabolica Type Tests](https://claude.ai/artifact/WVsivr593kRTZ2Fqb116gM), option C: *a stewards' report typed up and pasted into a farmers' almanac.*

### Typefaces (Google Fonts)
| Role | Face | Use |
|---|---|---|
| **Display** | **Old Standard TT** 700 | screen titles, buttons, the wordmark, big numbers (racing numbers on cards) |
| **Body** | **Old Standard TT** 400, *italic 400* | driver and team names, running text; *italic* for flavour lines (team one-liners, backstories, readouts) |
| **Data / labels** | **Special Elite** 400 (a worn typewriter; monospaced, so digits line up) | gaps, times, points, positions, stat reads; caps labels |

Fallbacks: Old Standard TT → `Georgia, serif`; Special Elite → `'Courier New', monospace`. Tokens: `--look-display`, `--look-serif`, `--look-data`. Both faces come in one weight each for their role, so **hierarchy is size, case and rules, not weight**.

### Type scale (px / line-height)
| Name | Size | Spec | Example |
|---|---|---|---|
| Hero | 50 / 0.9 | Old Standard 700, −0.02em | the wordmark on the menu |
| Title | 24 / 1.05 | Old Standard 700 | screen titles ("The Paddock") |
| Button | 17 / 1 | Old Standard 700 | primary and row buttons |
| Body | 16 / 1.4 | Old Standard 400 | running text |
| Name | 16 / 1.15 | Old Standard 400 | drivers, teams, card names |
| Flavour | 15 / 1.35 | Old Standard *italic* 400 | one-liners, readouts, sub-lines |
| Data | 13 / 1.2 | Special Elite | +1.284 · ▲3 · L14/24 |
| Label | 10–11 / 1.2 | Special Elite, caps, +0.06em | column heads, rarity words, section eyebrows |

### Spacing and shape
- **Scale:** 4 · 8 · 14 · 20 · 32 · 48. Screen gutter **20**; gap between stacked blocks **14**; menu sections **22**.
- **Radius: 0** everywhere (buttons, chips, panels, logo tiles). Round things stay round only where they are objects: marbles and tyre badges.
- **Structure is lines, not boxes:** a **1px white rule** separates major sections and list items on menus; a **1px hairline** (`#2a2a2e`) separates rows in dense lists (tower, card list). Cards that need a frame get a 1px white outline, no fill.
- **Tower row:** 7px × 20px padding, a 3px left edge in the row's team colour.

### Theming a screen (built in #323)
- Put `teamThemeVars(team)` (src/icons/GameIcon.tsx) on a screen's root `style`: it sets `--team-primary` and `--team-ink` (white or near-black, picked by contrast unless the team stores `ink`). No team → the `:root` purple.
- Season Mode screens pass **your** team; hotseat passes **whoever's turn it is**. Everything that reads the two tokens re-colours at once.
- Fonts come from `--look-display` / `--look-serif` / `--look-data`; never name a face in a component.
- Race rendering (marbles, track map, charts, tower rows, chronicle lap chart) is Apex's [#381](https://github.com/GrizzlyPax/Parabolica/issues/381) and still uses the old tokens and fonts.

### Colour tokens
| Token | Value | Role |
|---|---|---|
| `--pw-ground` | `#0b0b0c` | screen background |
| `--pw-surface` | `#151517` | the rare raised panel |
| `--pw-text-1` | `#ffffff` | text, icons, white rules |
| `--pw-text-2` | `#b4b4ba` | secondary text |
| `--pw-text-3` | `#7c7c84` | labels, captions |
| `--pw-hairline` | `#2a2a2e` | row separators |
| `--pw-border-strong` | `#4a4a50` | quiet outlines |
| `--team-primary` | the active team's primary (no team: purple `#a98bff`) | the one accent |
| `--team-ink` | the team's `ink` (no team: `#0b0b0c`) | text and icons drawn **on** the primary |
| `--signal-red` · `--signal-yellow` · `--signal-green` · `--signal-purple` | `#ff5a4f` · `#f2c230` · `#34d27a` · `#a98bff` | traffic lights, gains (green) / losses (red), best / fastest (purple) |
| `--rarity-bronze` · `--rarity-silver` · `--rarity-gold` · `--rarity-iridium` | `#C98B5B` · `#9FB4C8` · `#E6BE4A` · `#B7A3FF` | card and tag rarity (the rename is [#385](https://github.com/GrizzlyPax/Parabolica/issues/385); until it lands, today's `--rarity-common`… carry these values) |

**Silver is a cool steel tone on purpose:** a true near-white silver vanished on the black + white UI.

### How colour is applied
- **Your team = flat blocks:** the primary button (team primary, `--team-ink` text), the Paddock header (also the hotseat "your turn" cue), your logo tile, a Draft button you can press. Secondary buttons are **white** blocks with black text, or white-ruled rows.
- **Your rows** in the tower get a 14% wash of the primary plus the edge; nothing else changes.
- **Rivals:** their colour only on their marble and their 3px row edge. Names stay white.
- **Rarity:** the metal as a **word** (Label style, coloured) plus a **1px outline** on chips; sealed draft dots in the metal colour. Rarity always shows its word, so the three teams that wear metal colours (Ostler & Finch, Tinplate, Ambergate) still read.
- **Mystery boxes have no colour:** they are Common → Uncommon → Rare → Legendary boxes by standing; the box icon stays white.
- **Icons:** `currentColor` always. 16 px inline, 20 px in rows, 24–26 px on tools; `--team-ink` when drawn on the primary.

## Why
- Emoji render differently on every device, can't be recoloured, and read as placeholder art.
- game-icons.net has ~4,000 icons in one consistent silhouette style, covering motorsport and the weirder themed decks we've planned (Horror, Fantasy).
- License: **CC BY 3.0.** Free, but we credit the authors on a Credits page (World Deck → Credits), generated from the icon registry.

## Rules
1. **One icon per meaning.** Code asks for a *meaning* (`weather.rain`, `stat.speed`, `ui.close`), never a file. A registry maps meaning → icon, so swapping art is a data change.
2. **Icons are always `currentColor`.** An icon has no colour of its own; it takes the colour of its context.
3. **Colour comes from roles, not hexes.** Each screen asks for a role:
   - `--team-primary` (+ `--team-ink` for icons drawn on it): the active team, yours in Season Mode, otherwise Parabolica purple;
   - `--rarity-*` (metals: bronze · silver · gold · iridium, for card and tag chips; the word always shows);
   - the existing `--pw-*` Pit Wall tokens for everything neutral.
4. **Team logos = icon on primary:** a white or near-black icon on the team's primary tile. No badge shapes, no secondary colour.
5. **Your team themes the screen; rivals don't.** In Season Mode the Paddock, your draft panel and your card sheet use your colours. Rival rows in the tower use *their* team colour on the row edge and logo only. Names stay white (house rule).
6. **Hotseat:** the theme switches to whoever's turn it is, so the colour shift is the "your turn" cue.
7. **Fallback:** a meaning with no icon yet shows its old emoji, so screens migrate one at a time without breaking. The sweep ends with a test that fails on any emoji in UI code.

## What changes where
| Area | Today | After |
|---|---|---|
| Team logos | emoji | `<TeamLogo>`: game-icon on the team colour |
| Cards / tags | emoji per tag | stat icon + card-type mark, tinted by rarity |
| Weather, tracks, track events, rule cards | emoji | game-icons by meaning |
| Feed event markers, tower markers | emoji | game-icons by meaning |
| Menus, buttons, controls | emoji / text glyphs | game-icons by meaning |
| Season Mode chrome | coloured accents everywhere | black + white, your team's primary as the only accent |

## Who does what
- **Team icons + palette:** 📻 Radio with Pax, done: 28 deck teams, the creator's 28 colours and 20 logo-picker icons in [story/team-identity.md](story/team-identity.md).
- **Icon map for everything else:** 🎤 Pit drafts it from the meaning list the sweep finds; Pax approves.
- **Build:** 🛞 Hub. Icon system (registry, `<GameIcon>`, `<TeamLogo>`, credits, theming tokens) → emoji sweep. 🔧 Wrench adds icon ids to content data.

## Later
Hand-tuned icons for headline teams · animated icon states (box reveal) · themed-deck icon packs.

## Appendix: icon map (UI)

*📻 Radio with Pax, Oct 8 ([Icon map](https://github.com/GrizzlyPax/Parabolica/issues/349)). Meaning → game-icons.net icon for the UI. Approved by Pax. Review page: [UI Icon Map](https://claude.ai/artifact/N23VYQXj6EaAbHZN88kMJ2).*

**Scope**
- **In:** race events (feed, notifications, tower and map markers), commentary voices, race-screen views, controls, and the new v0.5 pieces: card stats, card types, drivers, Season screens.
- **Out, because they're replaced before the next update:** tracks, track events, tags, weather, gods, the old league screens (Founding, League, Grid, dev console) and the Race Control lab. Team logos live in [story/team-identity.md](story/team-identity.md).
- **Inline glyphs stay as text** (Pax): arrows, ticks and stars inside text, like `Start race →`, `▲3` in the tower or `★★★☆☆`, keep their character. Standalone controls and markers (☰ ⏸ ▶ ↺ ✕ ⚔ ✗) become icons.
- **Played straight** (Pax): the safety car is a siren everywhere, including the Unsafety Car and its map marker.
- **The helmet means "driver"** (Pax): it's kept for driver ratings and driver cards, so Equipment (driver gear) is gloves.
- **One icon per meaning.** No icon repeats in this table, and none is used by a team logo.
- **Watch the names:** game-icons' `clover` is a card-suit flower, not a clover; Luck uses `shamrock`.

| Meaning | What | Where it shows | Was | Icon |
|---|---|---|---|---|
| **Race events** | | | | |
| `race.finish` | Checkered flag / winner | Feed + notification, race complete bar, countdown fallback | 🏁 | [`checkered-flag`](https://game-icons.net/1x1/delapouite/checkered-flag.html) |
| `race.lead_change` | Lead change | Notification | 🔄 | [`crown`](https://game-icons.net/1x1/badges/crown.html) |
| `race.halfway` | Halfway | Notification | 🔔 | [`ringing-bell`](https://game-icons.net/1x1/lorc/ringing-bell.html) |
| `race.final_lap` | Final lap (white flag) | Notification | 🏳️ | [`flying-flag`](https://game-icons.net/1x1/lorc/flying-flag.html) |
| `race.fastest_lap` | Fastest lap | Notification | ⚡ | [`stopwatch`](https://game-icons.net/1x1/lorc/stopwatch.html) |
| `race.safety_car` | Safety car (incl. the Unsafety Car) | Feed, conditions list, track map marker | 🚨 🕳️ 🧍‍♂️ | [`siren`](https://game-icons.net/1x1/skoll/siren.html) |
| `race.crash` | Crash (car damaged) | Feed, notification | 💥 | [`spiky-explosion`](https://game-icons.net/1x1/lorc/spiky-explosion.html) |
| `race.dnf` | Retired / DNF | Feed, map marker, lap chart end mark | 💥 ✗ | [`cross-mark`](https://game-icons.net/1x1/lorc/cross-mark.html) |
| `race.tire_failure` | Tyre blowout | Feed, map marker | 💨 | [`flat-tire`](https://game-icons.net/1x1/delapouite/flat-tire.html) |
| `race.mechanical` | Mechanical failure | Feed, map marker | ⚙️ | [`cogsplosion`](https://game-icons.net/1x1/lorc/cogsplosion.html) |
| `race.spin` | Spin | Feed (driver incident) | 🌀 | [`spiral-arrow`](https://game-icons.net/1x1/lorc/spiral-arrow.html) |
| `race.lockup` | Lock-up | Feed (driver incident) | 🛞 | [`skid-mark`](https://game-icons.net/1x1/lorc/skid-mark.html) |
| `race.wide` | Wide moment | Feed (driver incident) | ↩️ | [`return-arrow`](https://game-icons.net/1x1/lorc/return-arrow.html) |
| `race.flatspot` | Flat spot | Feed (driver incident) | 🫨 | [`tire-tracks`](https://game-icons.net/1x1/delapouite/tire-tracks.html) |
| `race.pit_stop` | Pit stop / pit lane | Feed, track strip pit label | 🛞 🔧 | [`spanner`](https://game-icons.net/1x1/lorc/spanner.html) |
| `race.battle` | Battle (attacking) | Timing tower gap, map marker | ⚔ | [`crossed-swords`](https://game-icons.net/1x1/lorc/crossed-swords.html) |
| `race.card_trigger` | A card fires mid-race | Notification (was tag activation) | 🏷️ | [`card-play`](https://game-icons.net/1x1/quoting/card-play.html) |
| **Voices** | | | | |
| `voice.booth` | The Booth | Feed speaker | 🎙️ | [`microphone`](https://game-icons.net/1x1/delapouite/microphone.html) |
| `voice.marbles` | Mister Marbles | Feed speaker | 🎩 | [`top-hat`](https://game-icons.net/1x1/lorc/top-hat.html) |
| `voice.track` | The Track | Feed speaker | 🏟️ | [`arena`](https://game-icons.net/1x1/sbed/arena.html) |
| **Race screen** | | | | |
| `view.track` | Track view | Race → menu → views | 🏁 | [`path-distance`](https://game-icons.net/1x1/delapouite/path-distance.html) |
| `view.detail` | Detail view | Race → menu → views | 📊 | [`histogram`](https://game-icons.net/1x1/delapouite/histogram.html) |
| `view.lapchart` | Lap chart | Race → menu → views, lap chart title | 📈 | [`chart`](https://game-icons.net/1x1/delapouite/chart.html) |
| `ui.feed` | Race feed | Feed header | 📡 | [`satellite-communication`](https://game-icons.net/1x1/delapouite/satellite-communication.html) |
| **Controls** | | | | |
| `ui.menu` | Menu | Race header | ☰ | [`hamburger-menu`](https://game-icons.net/1x1/delapouite/hamburger-menu.html) |
| `ui.close` | Close | Menus, panels | ✕ | [`cancel`](https://game-icons.net/1x1/sbed/cancel.html) |
| `ui.done` | Done / copied | Menu check, Copy report, draft complete | ✓ ✅ | [`check-mark`](https://game-icons.net/1x1/delapouite/check-mark.html) |
| `ui.home` | Home / main menu | Race → menu → exit | 🏠 | [`house`](https://game-icons.net/1x1/delapouite/house.html) |
| `ui.pause` | Pause | Race header | ⏸ | [`pause-button`](https://game-icons.net/1x1/guard13007/pause-button.html) |
| `ui.play` | Play | Race header | ▶ | [`play-button`](https://game-icons.net/1x1/guard13007/play-button.html) |
| `ui.restart` | Restart | Race header | ↺ | [`anticlockwise-rotation`](https://game-icons.net/1x1/delapouite/anticlockwise-rotation.html) |
| `ui.copy` | Copy report | Race complete | 📋 | [`papers`](https://game-icons.net/1x1/lorc/papers.html) |
| `ui.idea` | Idea box | Floating button, World Deck inbox | 💡 | [`brainstorm`](https://game-icons.net/1x1/lorc/brainstorm.html) |
| `ui.dictate` | Dictate an idea | Idea box | 🎤 | [`sound-waves`](https://game-icons.net/1x1/skoll/sound-waves.html) |
| **Card stats (new)** | | | | |
| `stat.speed` | Speed | Card chips, card sheet | — | [`speedometer`](https://game-icons.net/1x1/delapouite/speedometer.html) |
| `stat.consistency` | Consistency | Card chips, card sheet | — | [`metronome`](https://game-icons.net/1x1/delapouite/metronome.html) |
| `stat.luck` | Luck | Card chips, card sheet | — | [`shamrock`](https://game-icons.net/1x1/delapouite/shamrock.html) |
| `stat.acceleration` | Acceleration | Card chips, card sheet | — | [`afterburn`](https://game-icons.net/1x1/lorc/afterburn.html) |
| `stat.endurance` | Endurance | Card chips, card sheet | — | [`heart-beats`](https://game-icons.net/1x1/delapouite/heart-beats.html) |
| `stat.aggression` | Aggression | Card chips, card sheet | — | [`fist`](https://game-icons.net/1x1/lorc/fist.html) |
| `stat.power` | Power | Card chips, card sheet | — | [`turbine`](https://game-icons.net/1x1/delapouite/turbine.html) |
| `stat.grip` | Grip | Card chips, card sheet | — | [`tyre`](https://game-icons.net/1x1/lorc/tyre.html) |
| `stat.reliability` | Reliability | Card chips, card sheet | — | [`checked-shield`](https://game-icons.net/1x1/lorc/checked-shield.html) |
| `stat.tyre_management` | Tyre management | Card chips, card sheet | — | [`car-wheel`](https://game-icons.net/1x1/delapouite/car-wheel.html) |
| `stat.pit_crew` | Pit crew | Card chips, card sheet | — | [`toolbox`](https://game-icons.net/1x1/delapouite/toolbox.html) |
| **Card types (new)** | | | | |
| `card.equipment` | Equipment (driver gear) | Card frame, locker, box reveal | — | [`gloves`](https://game-icons.net/1x1/delapouite/gloves.html) |
| `card.upgrade` | Upgrade (car gear) | Card frame, locker, box reveal | — | [`gear-hammer`](https://game-icons.net/1x1/lorc/gear-hammer.html) |
| `card.facility` | Facility (team gear) | Card frame, locker, box reveal | — | [`mechanic-garage`](https://game-icons.net/1x1/delapouite/mechanic-garage.html) |
| `card.trait` | Trait (permanent) | Card frame, card sheet | — | [`dna1`](https://game-icons.net/1x1/lorc/dna1.html) |
| `card.effect` | Effect (timed, v0.6) | Card frame | — | [`hourglass`](https://game-icons.net/1x1/lorc/hourglass.html) |
| `card.rule` | Rule card | Run Setup | — | [`scroll-unfurled`](https://game-icons.net/1x1/lorc/scroll-unfurled.html) |
| **Season (new)** | | | | |
| `entity.driver` | Driver (ratings, driver cards) | Draft board, Paddock lineup, card sheet | — | [`full-motorcycle-helmet`](https://game-icons.net/1x1/delapouite/full-motorcycle-helmet.html) |
| `season.box` | Mystery box (metal = tint) | Paddock | — | [`locked-chest`](https://game-icons.net/1x1/lorc/locked-chest.html) |
| `season.box_open` | Box reveal | Box reveal | — | [`open-chest`](https://game-icons.net/1x1/skoll/open-chest.html) |
| `season.locker` | Team locker | Paddock, card sheet | — | [`lockers`](https://game-icons.net/1x1/delapouite/lockers.html) |
| `season.draft` | Draft | Draft board | — | [`card-draw`](https://game-icons.net/1x1/faithtoken/card-draw.html) |
| `season.bench` | Bench (3rd driver) | Paddock lineup | — | [`park-bench`](https://game-icons.net/1x1/delapouite/park-bench.html) |
| `season.cpu` | CPU team badge | Standings, draft | — | [`vintage-robot`](https://game-icons.net/1x1/lorc/vintage-robot.html) |
| `season.handoff` | Hotseat hand-off | Hand-off screen | — | [`back-forth`](https://game-icons.net/1x1/lorc/back-forth.html) |
| `season.champion` | Champion | Finale, standings | — | [`laurels-trophy`](https://game-icons.net/1x1/delapouite/laurels-trophy.html) |

Rarity is a metal colour (`--rarity-*`: bronze · silver · gold · iridium), not an icon. Mystery boxes are Common → Uncommon → Rare → Legendary (a property of `season.box`, renamed in [#385](https://github.com/GrizzlyPax/Parabolica/issues/385)); boxes carry no colour, just the white box icon and the word.
