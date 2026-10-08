# Icons & team theming — design change

*Pax, Oct 8. Emoji are out; [game-icons.net](https://game-icons.net) is in, everywhere. Epic: [Art pass](https://github.com/GrizzlyPax/Parabolica/issues/182).*

## TL;DR
- **Every emoji in the app becomes a game-icons.net icon:** teams, cards, weather, tracks, rule cards, the feed, menus and controls. One art style everywhere.
- **Icons are single-colour SVGs, so they take any colour.** That's what makes the next point work.
- **The game wears your team's colours.** Once you've picked a team, the UI accents *and the icons* shift to your primary/secondary colours. Rivals keep theirs.

## Why
- Emoji render differently on every device, can't be recoloured, and read as placeholder art.
- game-icons.net has ~4,000 icons in one consistent silhouette style, covering motorsport and the weirder themed decks we've planned (Horror, Fantasy).
- License: **CC BY 3.0.** Free, but we credit the authors on a Credits page (World Deck → Credits), generated from the icon registry.

## Rules
1. **One icon per meaning.** Code asks for a *meaning* (`weather.rain`, `stat.speed`, `ui.close`), never a file. A registry maps meaning → icon, so swapping art is a data change.
2. **Icons are always `currentColor`.** An icon has no colour of its own; it takes the colour of its context.
3. **Colour comes from roles, not hexes.** Each screen asks for a role:
   - `--team-primary`, `--team-secondary` (the active team: yours in Season Mode, otherwise a neutral);
   - `--rarity-*` (🔴 common · 🟡 uncommon · 🟢 rare · 🟣 legendary, for card chips);
   - the existing `--pw-*` Pit Wall tokens for everything neutral.
4. **Team logos = icon + colour:** the icon in the secondary colour on a primary-colour tile. No badge shapes.
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
| Season Mode chrome | neutral | your team's primary/secondary |

## Who does what
- **Team icons + palette:** 📻 Radio with Pax (in progress).
- **Icon map for everything else:** 🎤 Pit drafts it from the meaning list the sweep finds; Pax approves.
- **Build:** 🛞 Hub. Icon system (registry, `<GameIcon>`, `<TeamLogo>`, credits, theming tokens) → emoji sweep. 🔧 Wrench adds icon ids to content data.

## Later
Hand-tuned icons for headline teams · animated icon states (box reveal) · themed-deck icon packs.

## Appendix: icon map (UI)

*📻 Radio with Pax, Oct 8 ([Icon map](https://github.com/GrizzlyPax/Parabolica/issues/349)). Meaning → game-icons.net icon for the UI. Review board: [Team Logo Scouting](https://claude.ai/artifact/QztBfCMQSzmLa99ptQrXWL) (top section).*

**Scope**
- **In:** race events (feed, notifications, tower and map markers), commentary voices, race-screen views, controls, and the new v0.5 pieces: card stats, card types, Season screens.
- **Out, because they're replaced before the next update:** tracks, track events, tags, weather, gods, the old league screens (Founding, League, Grid, dev console) and the Race Control lab. Team logos live in [story/team-identity.md](story/team-identity.md).
- **Inline glyphs stay as text** (Pax): arrows, ticks and stars inside text, like `Start race →`, `▲3` in the tower or `★★★☆☆`, keep their character. Standalone controls and markers (☰ ⏸ ▶ ↺ ✕ ⚔ ✗) become icons.
- **Played straight** (Pax): the safety car is a siren everywhere, including the Unsafety Car and its map marker.
- **One icon per meaning.** No icon repeats in this table, and none is used by a team logo.

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
| `stat.luck` | Luck | Card chips, card sheet | — | [`clover`](https://game-icons.net/1x1/lorc/clover.html) |
| `stat.acceleration` | Acceleration | Card chips, card sheet | — | [`sprint`](https://game-icons.net/1x1/lorc/sprint.html) |
| `stat.endurance` | Endurance | Card chips, card sheet | — | [`heart-beats`](https://game-icons.net/1x1/delapouite/heart-beats.html) |
| `stat.aggression` | Aggression | Card chips, card sheet | — | [`fist`](https://game-icons.net/1x1/lorc/fist.html) |
| `stat.power` | Power | Card chips, card sheet | — | [`turbine`](https://game-icons.net/1x1/delapouite/turbine.html) |
| `stat.grip` | Grip | Card chips, card sheet | — | [`tyre`](https://game-icons.net/1x1/lorc/tyre.html) |
| `stat.reliability` | Reliability | Card chips, card sheet | — | [`checked-shield`](https://game-icons.net/1x1/lorc/checked-shield.html) |
| `stat.tyre_management` | Tyre management | Card chips, card sheet | — | [`car-wheel`](https://game-icons.net/1x1/delapouite/car-wheel.html) |
| `stat.pit_crew` | Pit crew | Card chips, card sheet | — | [`toolbox`](https://game-icons.net/1x1/delapouite/toolbox.html) |
| **Card types (new)** | | | | |
| `card.equipment` | Equipment (driver gear) | Card frame, locker, box reveal | — | [`full-motorcycle-helmet`](https://game-icons.net/1x1/delapouite/full-motorcycle-helmet.html) |
| `card.upgrade` | Upgrade (car gear) | Card frame, locker, box reveal | — | [`gear-hammer`](https://game-icons.net/1x1/lorc/gear-hammer.html) |
| `card.facility` | Facility (team gear) | Card frame, locker, box reveal | — | [`mechanic-garage`](https://game-icons.net/1x1/delapouite/mechanic-garage.html) |
| `card.trait` | Trait (permanent) | Card frame, card sheet | — | [`dna1`](https://game-icons.net/1x1/lorc/dna1.html) |
| `card.effect` | Effect (timed, v0.6) | Card frame | — | [`hourglass`](https://game-icons.net/1x1/lorc/hourglass.html) |
| `card.rule` | Rule card | Run Setup | — | [`scroll-unfurled`](https://game-icons.net/1x1/lorc/scroll-unfurled.html) |
| **Season (new)** | | | | |
| `season.box` | Mystery box (metal = tint) | Paddock | — | [`locked-chest`](https://game-icons.net/1x1/lorc/locked-chest.html) |
| `season.box_open` | Box reveal | Box reveal | — | [`open-chest`](https://game-icons.net/1x1/skoll/open-chest.html) |
| `season.locker` | Team locker | Paddock, card sheet | — | [`lockers`](https://game-icons.net/1x1/delapouite/lockers.html) |
| `season.draft` | Draft | Draft board | — | [`card-draw`](https://game-icons.net/1x1/faithtoken/card-draw.html) |
| `season.bench` | Bench (3rd driver) | Paddock lineup | — | [`park-bench`](https://game-icons.net/1x1/delapouite/park-bench.html) |
| `season.cpu` | CPU team badge | Standings, draft | — | [`vintage-robot`](https://game-icons.net/1x1/lorc/vintage-robot.html) |
| `season.handoff` | Hotseat hand-off | Hand-off screen | — | [`back-forth`](https://game-icons.net/1x1/lorc/back-forth.html) |
| `season.champion` | Champion | Finale, standings | — | [`laurels-trophy`](https://game-icons.net/1x1/delapouite/laurels-trophy.html) |

Rarity stays a colour (`--rarity-*`), not an icon. Box metals (Bronze, Silver, Gold, Iridium) tint `season.box`; they don't need their own icons.
