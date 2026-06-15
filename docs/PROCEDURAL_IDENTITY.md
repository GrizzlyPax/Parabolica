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

## 3. Team identity (#183) — generator + grid composition at founding

The procedural generator (`src/generators/teamIdentity.ts`,
`generateTeamIdentities(rng, count)` → `{ emoji, color, accentColor }`, hues
spread evenly so 11 teams stay distinguishable across a 22-car field, tested
min hue gap > 8°) is **not** a silent override of the hand-crafted teams.
Instead, per Pax's steer, it powers **grid composition at league founding**:

**The Founding screen now lets you build the grid** (`FoundingScreen.tsx`):
- Toggle the preset 11 (`CURRENT_TEAMS`, all selected by default) in/out.
- Toggle in **historic outfits** (`HISTORIC_TEAMS`).
- **＋ Create a team** — name, emoji, and two native colour pickers (primary +
  accent), with a 🎲 button that rolls a fresh look from
  `generateTeamIdentities`. The procedural generator is the *suggestion* here,
  never a forced override.
- Flexible grid: **2–12 teams** (default 11). The count + car total is shown
  live; founding is gated until it's valid.

**Data flow.** Custom teams ride in `LeagueSetupConfig.customTeams: Team[]`
(`makeCustomTeam()` mints a slugged, collision-safe id with `isCustom: true`).
`generateGenesisRoster(seed, teamIds, customTeams)` resolves the grid as
`getTeamsByIds(teamIds) ++ customTeams` and runs the normal seeded driver+car
generation over it — so a custom team gets a procedurally-generated lineup and
cars like anyone else. **Custom teams never enter the static registry**; their
identity is baked into the generated roster (`driver.color/emoji/teamName`),
which is what persistence stores and the league UI already falls back to
(`team?.emoji ?? lead?.emoji`). No persistence migration needed.

**Still open (your eyes / future):**
- Emoji pool for the 🎲 helper is chaotic-fun (🦆🔥🦂🐙) — swap to a real icon
  set with #182.
- A "🎲 surprise me — fill the grid with random teams" button (whole-grid
  procedural) is a natural add on top of the generator.
- #184 pre-season screen is the place to *re-roll/rename* a team after founding.

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
