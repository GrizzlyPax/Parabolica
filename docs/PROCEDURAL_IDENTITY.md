# Procedural Universe Identity

*June 2026. The "every league is its own universe" pass — procedural driver
names (#191), league names (#185), and team identity (#183). All deterministic
from the league seed, so a seed always births the same names, the same colors.
Companion to the seeded-RNG foundation (`engine/rng.ts`).*

---

## Why

Commissioner Mode is a wall-clock roguelite: a league is one seed's universe.
For that to *feel* like a distinct universe, the grid you meet should be
distinct — a believable international field with the odd one-name legend and a
once-in-a-blue-moon glitch name, racing under a league name and team colors
you've never seen in that exact combination. This pass makes the identity
layer procedural without touching the simulation.

Everything draws off the shared seeded streams (`deriveSeed(leagueSeed,
'genesis', …)`), so it's replay-safe and never disturbs roster/car/calendar
generation (each lives on its own derived stream).

---

## 1. Driver names (#191) — `src/generators/names.ts`

`generateDriverName(rng)` now draws in **four tiers** (one weighted rng roll
picks the tier, then the name is drawn within it):

| Tier | Weight | What |
|---|---|---|
| `international` | **72%** | common given/family names across many traditions (Spanish, Arabic, Chinese, Indian, Nigerian, Japanese, French, German, Eastern European, Korean/SE-Asian, English) — the believable base |
| `absurd` | 17% | the old Blaseball-style names, demoted to a minority so "Peanut Turnstile" stays a treat |
| `mononym` | 9% | one-name legends — "Indigo", "Fable", "Maverick" (no last name) |
| `corrupted` | 2% | a glitch in the universe — flagged `isCorrupted` |

Tier weights live in `NAME_TIER_WEIGHTS` (verified within ±2% by tests over
50k draws). Repeats across a 22-driver grid: ~4%.

**Mononyms** return `lastName: ''`, `fullName === firstName`, and a clean
`shortName` (the old inline `lastName[0]` logic broke on these — that's why
`shortName` now lives in `names.ts`, not `drivers.ts`).

**Corrupted names** corrupt an otherwise-normal international name with one of
three **layout-safe** techniques (no tall zalgo stacks):
- `flip` — upside-down Latin (U+0250 block), reversed: "Robert" → "ʇɹǝqoɹ"
- `swap` — 1–2 Cyrillic/Greek lookalike substitutions (a→а, e→е) — a subtle
  data-error that reads almost normal
- `glitch` — 2–3 combining marks, capped, for a light flicker

Corruption always alters the string (swap/glitch fall back to `flip` if they'd
no-op). **⚠️ Needs your eyes:** these are validated for determinism and
non-ASCII output, but I can't confirm they render cleanly at every UI font
size — check the timing tower, feed, and standings before trusting Tier 4.
Easy to dial down (`NAME_TIER_WEIGHTS.corrupted`) or restrict to `swap`-only
(the most legible) if any technique breaks a row.

## 2. League names (#185) — `src/generators/leagueName.ts`

`generateLeagueName(rng)` → "The [Adjective] [Noun]" ("The Molten Circuit",
"The Splintered Slipstream"). 88 adjectives × 67 nouns ≈ 5,900 combinations.
`leagueNameForSeed(seed)` is the deterministic per-league form.

**Wired in:** the Founding screen now passes a blank name through, and a league
founded without a name is christened by its seed (`App.tsx`). Players still
override by typing one. (Placeholder updated: "Leave blank to be named by the
seed…")

## 3. Team identity (#183) — `src/generators/teamIdentity.ts`

`generateTeamIdentities(rng, count)` returns `{ emoji, color, accentColor }`
per team, generated as a **batch** so hues are spread evenly around the wheel
(even spacing + seeded rotation + sub-step jitter) — 11 teams stay
distinguishable across a 22-car field (tested: min adjacent hue gap > 8°).
Colors are vivid and dark-broadcast-readable; the accent is an analogous,
lighter shift. `teamIdentitiesForSeed(seed, count)` is the deterministic form.

**Status: built + tested, NOT wired into the default flow.** The hand-crafted
`CURRENT_TEAMS` (with their curated colors, descriptions, tags) are still the
default — I didn't want to override beloved team looks unilaterally. The
existing color plumbing already consumes `driver.color`/`accentColor` (WatchMode
CSS vars, LapChart strokes), so flipping a league onto procedural identities is
a one-step override on the genesis roster.

**Your calls before wiring it in:**
- Replace hand-crafted team colors per-league, or keep names/colors and only
  procedurally tint *new* universes? (I lean: opt-in per league, default off.)
- Emoji pool: I went chaotic-fun (🦆🔥🦂🐙). Racing-themed instead? (#183 Q)
- Coordinate with the icon-library research (#182) before colors flow to charts
  everywhere.

---

## Verification

`npx tsx scripts/sample-identities.mjs [n]` prints sample universes (league
name + 22-driver grid + team swatches), the tier distribution over 200k draws,
corrupted samples, and the grid repeat-rate. Tests: `src/generators/identity.test.ts`
(determinism, tier weights, mononym/corrupted edge cases, hue spacing).

## Open / follow-ups
- **#182** icon library — would replace emoji with a real icon set.
- **#184** pre-season setup screen — the natural place to let players review and
  rename generated drivers / re-roll a team's look.
- Region-matched first/last pairing (currently independent draws — a mixed
  global grid, which reads fine) if more realism is ever wanted.
