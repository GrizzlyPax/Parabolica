# The Conditions Layer — Design Build

> **History (v0.6, #334 / #541):** tags were retired; cards are the only system now (docs/CARDS.md). This doc is kept as design history.

*June 2026. Companion to `TAG_SYSTEM.md`. Where the tag system meets the
world: a track has character, weather rolls on top, and both speak to racer
tags through one shared signal. The constructive half of the #156 balance
flag — gating, not nerfing, is how Rain Dancer gets honest.*

---

## 1. The one idea

**Track character, weather, and racer tags are independent layers that
compose into a single "conditions" signal.**

```
TRACK TAGS      intrinsic track character, always present, emits track events
   │ compose
WEATHER         rolled per-race on top, independent dimension
   │ both stamp the field as…
CONDITION TAGS  temporary per-driver effects        ← already exist
   │ read by…
DRIVER/CAR/TEAM TAGS   Rain Dancer finally has a real signal to react to
```

Nothing here reaches down and rewrites the engine's physics. Every layer
resolves into the same currency — a **condition tag stamped on a driver for
a while** — and the engine already knows how to apply those.

## 2. Where we are

Two of the three seams are half-built:

- **`CONDITION_TAGS`** (`src/data/tags.ts`) — low-visibility, slippery-surface,
  headwind, cooling-issues, tire-graining, dust-cloud, adrenaline-surge,
  slipstream-boost, in-the-zone… ~20 effects, `target: 'condition'`,
  `trigger: 'track_event'`. **Orphaned today** — no track emits them. They
  are precisely the temporary effects weather and track tags want to stamp.
- **`track.event`** (one per track, `eventTrigger` + `eventEffect`, wired
  through `settle.ts` and `App.tsx`) — a proto-track-tag. Generalize
  `event` → `tags: TrackTag[]` and a track gets real personality.
- **Missing:** weather entirely; the state hook that lets racer tags *read*
  active conditions (the #156 gap — condition-gated passives don't exist).

So this is **wiring built halves to a new source**, not a green field.

## 3. Track tags — the track's permanent fingerprint

A track tag is a persistent identity that (a) bends the race's character and
(b) may periodically emit condition tags onto the field.

```ts
interface TrackTag {
  id: string;
  name: string;
  emoji: string;
  // Standing lean on the whole race (optional)
  passive?: { /* same modifier vocab as Tag.effects, field-wide or stat-gated */ };
  // Periodic condition emission (optional) — reuses the existing event machinery
  emits?: { conditionId: string; trigger: TagTrigger; triggerChance: number };
}
```

| Track tag | Bends toward | Emits |
|---|---|---|
| 🏎️ Temple of Speed | car power matters more, low downforce | slipstream-boost |
| 🧱 Processional | track position king, overtaking brutal | — (passive: defenders strong) |
| 🛞 Tire Shredder | extra stops, tire-mgmt shines | tire-graining |
| 🎢 Rollercoaster | more lead changes, more chaos | adrenaline-surge / crashes |
| 🌫️ Misty Valley | visibility events common | low-visibility |
| 🏜️ Dust Bowl | grip events | dust-cloud |
| 🌊 Marathon Lap | few laps, each priceless; DNF stings | — (passive: endurance) |
| 🪨 Street Bumps | higher crash baseline, rewards consistency | debris-hazard |

Tracks ship with 1–2 authored tags **or** roll them at genesis from a derived
seed, so each universe's "Cattylosers" differs a little. Authored is the safer
v1 (designed identities); rolled is the variety upgrade later.

## 4. Weather — the roll on top

An independent per-race roll, resolved at founding (see §6, determinism) and
stamped over whatever the track is already doing.

| Weather | Frequency | Stamps | Rewards |
|---|---|---|---|
| ☀️ Clear | common | — | baseline |
| 💨 Windy | common | headwind | consistency |
| 🔥 Scorcher | uncommon | cooling-issues, tire-graining | tire-mgmt, reliability |
| 🌫️ Fog | uncommon | low-visibility | careful drivers |
| 🌧️ Rain | rarer | slippery-surface, lower speed, more crashes | Rain Dancer, high-consistency |
| 🌦️ Changeable | rare | shifts mid-race | chaos-lovers; spectacle weather |

**Frequency is the balance knob.** Weather must skew mild — most races Clear
or Windy, the dramatic stuff rare — so weather-reactive tags are *spice, not
destiny*. A weighted draw from the derived seed; intensity can scale too
(light vs heavy Rain).

```ts
interface WeatherState {
  id: string;            // 'clear' | 'rain' | …
  intensity: number;     // 0–1, scales stamped effect magnitudes
  changeable?: boolean;  // re-rolls mid-race at set lap fractions
}
```

## 5. The conditions seam — one resolver

Track tags and weather both produce the same thing: **condition tags applied
to drivers for a window.** A single resolver runs each race:

1. Track tags `emit` per their triggers (already the event machinery).
2. Weather stamps its condition set (Rain → slippery-surface + a field-wide
   speed/ crash lean), scaled by `intensity`.
3. Both funnel into the engine's existing condition-tag application path
   (`activeTagEffects` / the unified effect store) — **no new physics.**

The win: the engine already knows how to *apply* a condition tag. We're only
adding **sources** that produce them and a **reader** that lets racer tags
see them.

## 6. The race-state predicate hook (the one real build)

Almost every interesting tag — and all of §3–4 reading back — wants the same
missing thing: **a per-tick predicate surface the engine exposes to tag
evaluation.**

```ts
interface RaceContext {
  position: number;           // current running order
  fieldSize: number;
  lapProgress: number;        // 0–1 over the race
  gapAhead: number; gapBehind: number;
  inTraffic: boolean;
  tireWear: number; tireCompound: TireCompound;
  isDamaged: boolean;         // already on the driver object
  safetyCar: boolean;
  conditions: string[];       // active condition tag ids ← weather + track
}
```

This single hook:
1. **Fixes the four broken tags** in #156 — Front Runner (`position ≤ 5`),
   Underdog (`position > fieldSize/2`), Sunday Driver (`lapProgress` ramp),
   Rain Dancer (`conditions.includes('rain')`). They stop being always-on.
2. **Unlocks Tier B** of the wishlist (#157): Clean Air Merchant, Hunter,
   The Closer, The Wall, Tire Geek, Limps Home.

`tireWear` and `isDamaged` already live on the driver, so a couple of these
are nearly free even before the general hook lands.

## 7. Determinism (non-negotiable)

The #149 contract: the live broadcast and the headless settle must be the
same race. So:

- **Weather rolls from a derived seed** — `deriveSeed(leagueSeed, 'weather',
  raceIndex)` — fixed at founding, knowable in advance like the calendar.
  Changeable weather re-rolls from a further-derived stream at set laps.
- **Track-tag emissions** roll from the race seed stream, same as today's
  track events.
- The predicate hook reads engine state, which is already deterministic per
  tick — no new nondeterminism introduced.

A league's weather is therefore part of its fixed universe: two viewers of
the same race see the same storm.

## 8. Why this re-homes Rain Dancer

Today Rain Dancer is 9× (lab) because it's a permanent +12% consistency +30%
crash-resistance. In this model it's **only live when `conditions` includes
rain**, which only rolls sometimes, on top of whatever the track does. Same
magnitudes — the *gate* does the balancing:

> A Rain Dancer is a dead-average driver most weekends and a god when the
> skies open. Destiny earned by the dice, not handed at genesis.

This is the synergy with `TAG_SYSTEM.md` §3's tier ladder: tiers cap *how
big*, conditions control *how often*. Both levers, together, turn destinies
into stories.

## 9. Build order (proposal)

1. **C1 — Predicate hook. ✅ shipped (v0.3.3).** `RaceContext` +
   `evaluateTagCondition` in `tags.ts`; engine gates conditional passives live
   each tick (`rebuildRaceContexts`, no RNG). The four broken tags now read it:
   Front Runner (top-5), Underdog (bottom-half), Sunday Driver (late-race
   surge), Rain Dancer (gated to `rain` → dormant until C2). `tier` field added
   to the Tag interface and all entity tags. Magnitudes still pending lab
   calibration (needs the SimLab condition-blindness fix below).
2. **C2 — Weather. ✅ shipped (v0.3.5).** `WeatherState` + `rollWeather` +
   `weatherForRace(leagueSeed, raceIndex)` (`data/weather.ts`); rolled into the
   shared `prepareScheduledRace`, so live and settle get the same storm. Field-
   wide lean (crash/variance/speed, intensity-scaled) folded into the engine;
   `setWeather` stamps conditions so Rain Dancer wakes (4% dry → 35% in rain,
   1.1× blended). SimLab rolls weather per race; digests + season report +
   league UI surface it. Frequency skews mild (60% clear, 6% rain).
3. **C3 — Track tags. ✅ backend shipped (v0.3.8); flavor/content pass pending.**
   `data/trackTags.ts`: `TrackTag` (passive field-wide lean + condition
   stamping), `intrinsicTrackTags(trackId)` — one tag per track by default,
   tied to the place (stable across universes), extensible to multiple and to
   dynamic additions later (e.g. a season event attaching a tag to a future
   race). Engine unifies weather + track tags into shared environment getters;
   conditions are the union of both layers, so condition-gated racer tags react
   to either (cross-layer trigger proven by test). Wired through settle (the
   deterministic seam), SimLab (Track Tag column), and the probe. **Deliberately
   minimal flavor** — 3 functional tags (pace/variance/hazard) prove the
   mechanisms; real track identities + balance are a partnered future pass,
   alongside the UI pass that makes weather + track tags visible in-app.
4. **C4 — Changeable weather + genesis-rolled track tags.** The variety and
   spectacle pass.

Note: the SimLab **does** wire `eventTrigger`/`eventEffect` (`simLabWorker.ts`)
and now also rolls weather per race — so it measures the conditions layer. The
empty `TRACK EVENTS` table is just a content gap (no track defines an event
yet); it fills in once C3 ships track tags. (Earlier docs called the lab
"blind" here — that note was stale.)

## 10. Open questions

1. **Authored vs rolled track tags** for v1 — designed identities first, or
   genesis variety from the start?
2. **Weather frequency curve** — what share of races should be non-Clear?
   (Gut: ~25–30%, with Rain in the low single digits.)
3. **Changeable weather** — worth the mid-race re-roll complexity in v1, or a
   later spectacle upgrade?
4. **Stacking** — when a Tire Shredder track meets a Scorcher, do tire effects
   add, cap, or take-the-max? (Take-the-max is legible; additive is brutal.)
5. **Visibility** — does weather show in the UI before the race (a forecast on
   the calendar) or only reveal at lights-out? Forecast invites strategy;
   surprise invites drama.
