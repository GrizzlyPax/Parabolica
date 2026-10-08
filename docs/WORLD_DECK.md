# The World Deck — how to add to Parabolica's world

*The World Deck is everything in the universe: teams, tracks, drivers' names and backstories, tags, cards, weather, gods, the commentary voices. This doc is the contributor's guide: where each thing lives, the exact shape of a record, the rules it has to follow, the voice to write in, and how to check your work. It is written so a person or an agent with no engine knowledge can add content safely.*

**The generated deck** — every record currently in the game, with sources — is `docs/GLOSSARY.md` (`npm run glossary`). The in-game Glossary screen renders the same model. Read it first to see what exists and match the voice.

## Capturing ideas (the inbox)

Inspiration strikes while playing, not while editing TypeScript. So the game has a **💡 idea box** on every screen (bottom-right, or ⌘⇧I): type or dictate a few sentences, pick what kind of thing it is (tag, team, track, card, rule, commentary, bug), and either:

- **Send to GitHub →** opens a prefilled issue (labels `idea` + `world-deck`/`balance`/`bug`) with the screen, race seed and track attached; you press Submit. This is the queue.
- **Keep for later** holds it in the browser; World Deck → **💡 Inbox** lists them, sends them one by one, or copies the batch as a triage prompt.

**Triage** (an agent or Claude, on a cadence or when asked): take every open `idea` issue, decide *World Deck record* (build it from the shape in this doc, PR it, link the issue) · *engine task* (rewrite as a scoped issue, link the mechanic) · *bug* (reproduce from the seed). Close the idea with a one-line "became X". Small ones get built on the spot; the author's wording stays in the record's PR so the voice survives.

Prompt for a triage agent: *"Triage Parabolica's open `idea` issues on GitHub (GrizzlyPax/Parabolica). For each: build it as a World Deck record per docs/WORLD_DECK.md if it is content and small, otherwise rewrite it as a scoped engine issue or confirm the bug from the seed. Link what you made, close the idea with one line."*

## The one workflow

1. Pick a content type below. Open the file it names.
2. Add records to the exported array (or lines to the pool). Copy the shape exactly; every field is explained.
3. Run `npm test`. `src/data/worldDeck.test.ts` checks ids, references, colours, ranges and duplicates; `glossary.test.ts` fails until you regenerate.
4. Run `npm run glossary` so `docs/GLOSSARY.md` carries the new content.
5. Commit the source file **and** `docs/GLOSSARY.md` together. PR title: `World Deck: <type> — <what you added>`.

Rules that apply to everything:
- `id` is kebab-case, unique across its registry, and never changes once shipped (saves reference it).
- `name` is what players read. `emoji` is one character. Both required.
- Flavour text is one line, under ~110 characters, no trailing period on chip text, present tense. Specific beats generic ("ketchup or mustard wars" not "a food-themed team").
- Nothing in content changes race results except the numeric fields documented under **Effect**. If you are not sure a number is safe, use the ranges given and leave a note in the PR.
- Numbers you add are *claims* until the lab checks them. Say so in the PR; don't tune by feel.

## The voice

Parabolica is Blaseball-adjacent: bureaucratic absurdism with real affection. Sentences are short, flat and confident; the joke is in the specificity, never in exclamation marks. Horror is cozy ("Something followed them home"). The sim never winks. Team descriptions read like a friend describing a subculture they love. Tag descriptions are the one line a commentator would say when the chip lights up. When in doubt, read ten existing lines in the deck and write the eleventh.

---

## 1. Teams — `src/data/teams.ts`

Two drivers each. Colours are the livery everywhere (tower, map, chips). `CURRENT_TEAMS` is the default grid; `HISTORIC_TEAMS` are unlockable.

```ts
{
  id: 'breadbowl',               // kebab-case, unique, permanent
  name: 'Breadbowl',             // what players see
  emoji: '🍞',                   // the team marble
  color: '#3671C6',              // primary livery, hex
  accentColor: '#E63946',        // secondary, hex, must differ from primary
  description: 'Sourdough starters with names, carb worship, "she\'s been fermenting for six years."',
  isHistoric: true,              // only on HISTORIC_TEAMS entries
}
```

- **description**: 3–4 comma-separated images of the subculture, one quoted line of overheard speech. ~100 chars.
- Colours: pick a primary that reads at 7px on black; avoid near-duplicates of existing teams (the deck lists all).
- Every team is an F1-team-shaped joke about a real-world tribe (horse girls, mad scientists, cargo-shorts dads). Keep it loving.
- Future (not yet wired): `tags?: string[]` for team-flavoured genesis tags; a riskiness axis for pit plans (#246 pass 4).

## 2. Tracks — `src/generators/tracks.ts`

Each is a pun on a real circuit. `emoji` is the real venue's flag; `funEmoji` is the pun.

```ts
// 8. Monaco - Monacoco (tight street circuit)
{
  id: 'monacoco',
  name: 'Monacoco',
  description: 'Chocolate waterfalls, cocoa fog in the streets, everything melts eventually, sweet sweet surrender.',
  emoji: '🇲🇨',                  // country flag of the real venue
  funEmoji: '🍫',                // the pun
  length: 700,                   // lap length in metres, 500–1500 (short street ↔ long power track)
  laps: 18,                      // 10–30; ~16 is a normal race. Tyre life is in laps, so more laps = more stops
  layout: LAYOUTS.street,        // street | power | flowing | modern | technical | classic
  isHistoric: true,              // HISTORIC_TRACKS only
}
```

- **Character** (High-Speed / Technical / Hazardous) is currently assigned by hashing the id. Declaring it per track is a small engine task — if you have a strong opinion, put it in the PR description as "Character: technical".
- **Layout** picks the drawn shape and, after the corner-profile pass, the braking zones and passing difficulty. Street and technical = hard to pass; power = easy.
- `event` (a track-specific happening) is designed but no track has one yet — see §9.
- Lap length × laps sets race length; keep length×laps between ~10,000 and ~16,000 so races stay 3–4 minutes live.

## 3. Driver names — `src/generators/names.ts`

Plain string lists. A name is drawn first + last independently, so each list must read well against any partner.

| Pool | Share of drivers | What goes in |
|---|---|---|
| `INTL_FIRST_NAMES` / `INTL_LAST_NAMES` | 72% | Real-world first and last names across traditions (groups are commented in the file). Keep traditions balanced; a name must be plausible on its own. |
| `ABSURD_FIRST_NAMES` / `ABSURD_LAST_NAMES` | 17% | Food, virtues, objects, corporate words, placeholders. "Brisket Lamppost" is the target energy. |
| `MONONYMS` | 9% | One word, no last name. "Nugget", "Indigo". |
| corrupted | 2% | Automatic (flipped / Cyrillic-swapped / glitched versions of real names). No pool. |

Rules: no duplicates within a pool (test enforces), no real living public figures, nothing that reads as a slur in any language we can think of, first names ≤ 8 characters show in full on the tower.

## 4. Driver backstories & quirks — `src/generators/drivers.ts`

- `BACKSTORY_TEMPLATES`: sentences with `{slot}` holes. `"Appeared one day in the {place}. Nobody asked questions."`
- `BACKSTORY_FILLS`: a map of slot → options. Every slot a template uses must exist with ≥ 3 options (test enforces). Add slots freely.
- `QUIRKS`: one-line traits, no period. `"The tires know something"`. These are flavour only — they do nothing in the sim. If a quirk *should* do something, it's a tag (§6).

Voice: deadpan HR file. The driver is a person something strange happened to, described by someone filling in a form.

## 5. Cars — `src/generators/cars.ts`

- `CAR_QUIRKS`: one-line car flavour. `'The engine hums at a frequency only dogs can hear.'`
- `CAR_PREFIXES_GENERIC` / `CAR_SUFFIXES` / `CAR_ACRONYMS`: parts for generated names like "Apex GT-7". Prefixes are words, suffixes are alphanumerics, acronyms are 2–3 letters.

Car *stats* are rolled (power / grip / reliability, 1–5★) — not content.

## 6. Tags — `src/data/tags.ts`

The main oddity vocabulary. One record shape for every kind; most tags leave most fields blank.

```ts
{
  id: 'haunted',
  name: 'Haunted',
  emoji: '👻',
  description: 'Three retirements in a row. Something followed them home.',   // the commentator's line
  target: 'driver',              // driver | car | team | condition
  trigger: 'passive',            // when the effect applies: passive (always/while condition) | race_start | pit_stop | overtake | crash_proximity | final_lap | track_event
  rarity: 'rare',                // common | uncommon | rare | legendary — ONLY the genesis draw reads this
  sources: ['acquired'],         // which doors hand it out: genesis | acquired | in-race | intervention | decree | divine. Omit = genesis + intervention
  duration: { races: 4 },        // permanent | season | { races: n }. Omit = permanent
  condition: { when: 'condition', has: 'rain' },   // optional gate: effects apply only while true
  effects: { luckModifier: 0.8, crashResistance: -0.05 },
  triggerChance: 0.7,            // optional, for triggered (non-passive) tags
  activationText: 'finds another gear for the final lap!',   // feed line when a triggered tag fires
  afterRace: [                   // optional: things it DOES after a race
    { do: 'attach-tag', tagId: 'haunted', to: 'teammate', chance: 0.1, headline: 'Whatever is 👻 haunting {driver} crosses the garage to {target}' },
  ],
}
```

**Which list to put it in:** `DRIVER_TAGS` / `CAR_TAGS` / `TEAM_TAGS` (genesis, by target) · `ACQUIRED_TAGS` (earned after races; needs a rule in §7 or an `afterRace` giver) · `IN_RACE_TAGS` (mid-race, needs a rule in §8) · `CONDITION_TAGS` (stamped by track events, §9).

**Effect** (the only numbers that touch results). Multipliers, 1.0 = nothing:

| Field | Safe range | What it feels like |
|---|---|---|
| `speedModifier` | 0.95–1.05 | ±3% is a big tag now that the compound gap is 3% |
| `consistencyModifier` | 0.92–1.08 | currently acts mostly as a flat pace change (audit bug); keep small |
| `luckModifier` | 0.8–1.2 | flavour: luck procs and survival |
| `crashResistance` | −0.15–+0.15 | positive = safer |
| `pitSpeedModifier` | 0.75–1.25 | scales stationary pit time |

Story-only tags (`effects: {}`) are welcome and shown as "story only".

**Conditions** you can gate on: `position {min,max}`, `positionFraction {top,bottom}`, `lapProgress {after,before}` (0–1), `condition {has}` (a weather/track id: rain, fog, windy, scorcher, debris-hazard), `damaged`, `tireWear {below,above}`.

**Actions** (`afterRace`): `attach-tag` to self / teammate / rival (the car you crashed with this race) / random, `expire-self`, `remove-tag`. Each with a `chance` and a `headline` using `{driver}`, `{target}`, `{tag}`.

Rarity buckets today (genesis pool): common 3 · uncommon 5 · rare 1 · legendary 0. **Common is the hungriest bucket** — 60% of hits land there and it has three tags.

## 7. Acquisition rules — `src/data/acquisitions.ts`

How the sim hands out an `ACQUIRED_TAGS` entry after a race.

```ts
{ id: 'two-wins', family: 'earned',          // earned | inflicted | cosmic
  tagId: 'hot-streak',
  when: { on: 'streak', stat: 'win', count: 2 },
  headline: '{driver} is on a {tag} — two wins on the bounce' }
```
Triggers: `streak {stat: win|podium|dnf, count}` · `climb {places, finishedTop?}` (grid is real now) · `crashed-out` · `survived-crash {finishedTop?}` · `fastest-lap` · `lottery {chance}`. New trigger kinds are an engine task — ask.

Pacing guide: ~3 acquisitions per race across a 22-car grid feels right. A lottery at 0.003 fires about once per season per driver.

## 8. In-race rules — `src/data/inRace.ts`

A race event → a temporary `IN_RACE_TAGS` entry.
```ts
{ id: 'spin', on: 'driver_error', match: /^Spin/, tagId: 'spun', duration: { laps: 2 }, text: 'is rattled after the spin' }
```
`on` is any race event type (crash, driver_error, tire_warning, slow_pit_stop, quick_pit_stop, overtake, battle, penalty…). Durations: `{laps}` · `'until-pit'` · `'race'` · `{races}` (carries into the next races via the league log).

## 9. Track events — `src/generators/tracks.ts` (`TrackEvent`) — **empty, wants content**

Fully built, zero content. A track event fires on a trigger and stamps a `CONDITION_TAGS` entry on some drivers.
```ts
event: {
  id: 'cocoa-fog', name: 'Cocoa Fog', emoji: '🍫',
  description: 'Visibility drops in the chocolate mist.',
  flavorText: 'The streets steam. Someone is making hot chocolate at scale.',
  trigger: { type: 'halfway' },                 // lap {laps[]} | interval {every} | random {chance} | halfway | final_laps {count}
  effect: { type: 'apply_tag', triggerTag: 'low-visibility', targets: 'random', count: 3, duration: 2 },  // targets: random | leader | last | top | bottom; duration in laps
}
```
17 condition tags already exist to use (low-visibility, slippery-surface, slipstream-boost, in-the-zone, pit-congestion…). Known engine bug to fix before shipping: duration is read in ticks ×10, not laps.

## 10. Weather — `src/data/weather.ts`

```ts
{ id: 'rain', name: 'Rain', emoji: '🌧️', weight: 6, conditions: ['rain'], minIntensity: 0.5,
  baseEffects: { crashResistance: -0.10, speedModifier: 0.96, consistencyModifier: 0.97 } }
```
`weight` is relative odds (clear 60 is the anchor; dramatic weather should stay rare). `conditions` are the ids tags and inflictions gate on. Effects are field-wide at intensity 1 and scale down. Wet tyres and lap-by-lap rain are a later engine pass; a new weather type today is a field-wide lean plus a condition id.

## 11. Track characters — `src/data/trackTags.ts`

Three today (High-Speed, Technical, Hazardous). A character is a field-wide lean plus optional stamped conditions. New ones are cheap; assigning them per track (instead of by hash) is a small engine task.

## 12. Inflictions — `src/data/inflictions.ts`

Mid-race strikes that need a condition to be active.
```ts
{ id: 'electrocuted', name: 'Electrocuted', emoji: '⚡', requiresCondition: ['rain'], perTickChance: 0.0004,
  durationTicks: 300, effects: { speedModifier: 0.92 }, activationText: 'is struck by the storm!', impact: 'negative' }
```
`perTickChance` 0.0004 ≈ one strike per race while active; `durationTicks` 300 ≈ 30 s (a couple of laps). `activationText` follows the driver's name.

## 13. Rule cards — `src/data/ruleCards.ts`

Rules the player picks before a run. A card is fiction + one plain-words effect + a patch.
```ts
{ id: 'demolition-derby', name: 'Demolition Derby', emoji: '💥', scope: 'both',   // race | season | both
  weight: 'cursed',                                                             // mild | wild | cursed (a badge)
  blurb: 'The stewards have gone home.',                                        // the fiction, one line
  readout: 'Crashes 2.5× more likely.',                                         // the effect, one line, no jargon
  patch: { scale: [['crashes.baseCrashChance', 2.5]] } }
```
Patches: `weather` (weight overrides), `tags` (`only/add/remove`, `genesisChance`, `rarityOdds`, `slotCap`), `simVars` (deep-partial physics), `scale` (multiply a numeric path). Name cards for what they *do* ("Rain", "No Pit Rules"), not for a mood. Pax's bar: a card's name must be obvious at a glance.

## 14. Gods — `src/league/gods.ts`

Three today; appetites and smiting are a later system, so for now a god is a voice.
```ts
{ id: 'the-scrap-heap', name: 'The Scrap Heap', emoji: '🔥', epithet: 'That Which Collects',
  hunger: 'Bring me the bent chassis and the blown engine. A clean race is a wasted race.',   // its own voice
  appetite: 'Hungers for carnage — crashes, blowouts, DNFs. Safe seasons starve it.' }        // plain hint for the player
```
A good god wants something measurable in a race digest (DNFs, lead changes, margins, underdogs, pit stops, weather) so it can be scored later.

## 15. League names — `src/generators/leagueName.ts`

"The {adjective} {noun}". Two lists. Adjectives: evocative, one word ("Molten", "Hollow"). Nouns: racing or civic ("Circuit", "Grand Prix", "Accord").

## 16. Commentary — `src/feed/commentary.ts`

Three voices: **The Booth** (🎙️ broadcast, dry), **Mister Marbles** (🎩 the gambler, bet swings), **The Track** (🏟️ the venue itself, for track events). Lines are inline arrays per event type; add lines to the array for that type. Template vars: `${name(n)}` (driver), `n.message`, `ctx.lap`. New event types worth lines: `overtake` (real passes now), `battle`, `penalty`, `grid_set`, `pit_entry` reasons.

## 17. Lights-out lines — `src/RaceStartCountdown.tsx` `LIGHTS_OUT_MESSAGES`

Ten today. One line, caps allowed, this is the one place exclamation marks live.

---

## What's hungry (content backlog, by appetite)

| Priority | Type | Why |
|---|---|---|
| 1 | **Common genesis tags** (driver, car, team) | 3 commons carry 60% of all hits. 10–15 more, small effects or story-only |
| 1 | **Track events** | A whole system with zero content; every track could have one |
| 2 | **Commentary lines** for passes, battles, penalties, pit reasons, pole | New events have no voice yet |
| 2 | **Teams** (current + historic) | More tribes; also give each a riskiness note for pass 4 |
| 2 | **Tracks** | More puns; declare a character and layout for each |
| 3 | **Acquired tags with actions** | Spread / rival / upgrade stories |
| 3 | **Gods** | 5–8 more voices with measurable appetites |
| 3 | **Backstory slots & templates, quirks, car quirks, name pools** | Depth; never urgent, always welcome |
| 4 | **Weather types, inflictions, track characters** | After the wets pass |

## Prompt you can hand an agent

> You are adding content to Parabolica's World Deck. Read `docs/WORLD_DECK.md` for the rules and `docs/GLOSSARY.md` to see what exists and match the voice. Add **{N} {type}** to `{file}` following the record shape in §{n}. Keep ids kebab-case and unique, flavour under 110 characters, effects inside the safe ranges. Then run `npm test` and `npm run glossary`, and commit the source file with `docs/GLOSSARY.md`. In the PR, list each new record in one line and flag any number you'd like the lab to check.
