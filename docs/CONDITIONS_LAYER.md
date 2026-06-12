# The Conditions Layer — Design Build

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

1. **C1 — Predicate hook.** Expose `RaceContext` to tag evaluation; convert
   the four broken conditional tags to read it. Ships the #156 fix and the
   Tier B foundation with zero new content.
2. **C2 — Weather.** `WeatherState`, derived-seed roll, weighted-mild
   frequency, condition stamping via the existing path. Re-home Rain Dancer.
3. **C3 — Track tags.** Generalize `track.event` → `tags: TrackTag[]`;
   author 1–2 per track; wire emission. The orphaned condition tags come
   alive.
4. **C4 — Changeable weather + genesis-rolled track tags.** The variety and
   spectacle pass.

⚠️ **Prereq** (`SIM_MECHANICS.md`): the SimLab doesn't wire `eventTrigger`/
`eventEffect`, so it's currently blind to condition/track-event tags. Fix
before lab-validating anything in this layer, or the batches lie.

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
