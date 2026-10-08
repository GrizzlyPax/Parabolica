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
| **Signal colours** | only where they carry meaning: rarity (🔴 common · 🟡 uncommon · 🟢 rare · 🟣 legendary), draft traffic lights, gains/losses | **red · yellow · green · purple** |
| **Other teams** | only on a rival's own mark: their logo tile and row edge | **their primary** |

- **Teams have one colour: the primary.** No secondary colour. A team logo is a **white or near-black icon on the primary**, whichever reads (an `ink` value, picked automatically or stored per team).
- **Default (no team picked yet, Quick Race, menus):** the accent falls back to a neutral (white).
- **Names stay white** (house rule).
- **One token drives it:** `--team-primary` (plus `--team-ink` for icons on it). Change the team, and every accent and icon re-colours. Nothing else in the UI hard-codes a colour; signal colours come from `--rarity-*` / `--signal-*` tokens.

## Why
- Emoji render differently on every device, can't be recoloured, and read as placeholder art.
- game-icons.net has ~4,000 icons in one consistent silhouette style, covering motorsport and the weirder themed decks we've planned (Horror, Fantasy).
- License: **CC BY 3.0.** Free, but we credit the authors on a Credits page (World Deck → Credits), generated from the icon registry.

## Rules
1. **One icon per meaning.** Code asks for a *meaning* (`weather.rain`, `stat.speed`, `ui.close`), never a file. A registry maps meaning → icon, so swapping art is a data change.
2. **Icons are always `currentColor`.** An icon has no colour of its own; it takes the colour of its context.
3. **Colour comes from roles, not hexes.** Each screen asks for a role:
   - `--team-primary` (+ `--team-ink` for icons drawn on it): the active team, yours in Season Mode, otherwise a neutral;
   - `--rarity-*` (🔴 common · 🟡 uncommon · 🟢 rare · 🟣 legendary, for card chips);
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
- **Team icons + palette:** 📻 Radio with Pax (in progress).
- **Icon map for everything else:** 🎤 Pit drafts it from the meaning list the sweep finds; Pax approves.
- **Build:** 🛞 Hub. Icon system (registry, `<GameIcon>`, `<TeamLogo>`, credits, theming tokens) → emoji sweep. 🔧 Wrench adds icon ids to content data.

## Later
Hand-tuned icons for headline teams · animated icon states (box reveal) · themed-deck icon packs.
