# The look: Ace America, the race program (#705)

*The design system every screen draws from (Pax locked the look Oct 10, [the locked page](https://claude.ai/artifact/DX3c8cStUC8sbBFkPxdoc3)). Apex built the system; Hub sweeps the screens onto it. The live catalogue: **Race Control → Style** (`#/race-control/style`), every component in every step theme.*

## The idea
- **A race program:** red, white and blue first, **gold as the highlight**; bunting, motorsport marks, an Official Program number; a **navy ground with cream (paper) panels**.
- **The sash is the title:** cream satin, a thin border, the words in Playball, a gold wheel at each end, no crown.
- **One theme per step,** not one global theme: **Locals** black and white · **State** that state's colours as accents only (the ground stays dark) · **Nationals** Americana (the menus wear it too). Ids are left for **Globals** and **Galacticals** (Americana until their own looks land). The step id is `nationals`, never `theNationals`.
- **Desktop first (Pax, Oct 10):** "for a racing game, the bigger the better." Design at 1440 × 900 and check 1280; pages use the full width (the frame below), not a phone column. The phone is a smaller version of the desktop layout: it must not break (one 16px gutter, `--ace-gutter`), but it is not the priority. Icons keep `currentColor`.
- **Nothing here touches the sim:** the golden fingerprint stays put.

## The frame (#722)
- **One centred frame:** `.ace-page` paints the ground edge to edge and centres its children at `--ace-max` (**1376px** = 1440 less two 32px gutters). `.ace-page.narrow` caps them at `--ace-narrow` (720px) for a reading column.
- **Gutters:** `--ace-gutter` is **32px from 1024px up**, 16px below.
- **Edge to edge:** the bunting (a repeating pattern, so the pennants keep their size), the state bar and the dock. The state bar's text still lines up with the frame.
- **Desktop sizes from 1024px:** the h1 is 40px, the logo 80px and the sash 340px; panels and the dock get roomier. Race Control → Style shows the components at these sizes on a desktop.
- **Columns:** lay a screen out with grid inside the frame; it stacks to one column below 1024px. The menu is cover | contents (6fr | 5fr, 64px gap). The Ladder runs its steps across the screen, Locals on the left, with the open step at double width.

## Where it lives (`src/look/`)
| File | What |
|---|---|
| `tokens.css` | **The one place a colour is written.** `--ace-*` roles (ground, paper, ink, accent, gold, sash…) and the five fonts; `[data-step='locals']` re-points them to black and white; `[data-step='state']` maps `--ace-state-*` (primary · secondary · accent · ink) onto the accents only |
| `look.css` | The components, **tokens only** (`icons/theme.test.ts` fails on a hex here): page, bunting, program line, type, rules, panels, buttons, dock, tabs, state bar, sash, ribbons, roundel, levels, sheet, the `.rt` table on paper, menu rows, rungs, chips, strip, card, stamps, Parcel |
| `Look.tsx` | The React pieces: `StepTheme`, `Sash`, `Wheel`, `Bunting`, `Star`, `ProgramLine`, `Chequer`, `TitleRibbon`, `Pennant`, `StateBar`, `Racer`, `AceButton`, `Roundel`, `Level`, `Stamp`, `AceCard`, `CarCard`, `Parcel`, `ParcelStrip` |
| `sash.ts` | The sash's geometry: **one centre curve**; the band and pinstripes are offsets of it, the words ride it (`textPath`), the wheels sit on points of it |
| `step.ts` | `Step` ids, `STEPS`, `StateLook` + a **stub** of four states (`STATE_LOOKS`: OH · AZ · VT · TX; #695 / #708 bring the data), `stateLook` (ink from `inkFor`), `stepThemeVars`, `ribbonStep`, `stepForLeague` (v0.7's four leagues onto three steps until #696), `programNumber` |
| `fonts.ts` | The five faces **stored with the app** (`@fontsource/*`, latin subsets): Alfa Slab One · Playball · Oswald · Old Standard TT · Special Elite. Nothing loads from Google Fonts |
| `look.test.ts` | Pins the geometry, the step ids, the state vars and ink rule, the token mapping, the self-hosted fonts |

## How a screen wears it
```tsx
import { StepTheme, Bunting, ProgramLine, StateBar, AceButton } from '../look/Look';
import { stateLook } from '../look/step';

<StepTheme step="state" state={stateLook('OH')} className="ace-page">
  <Bunting />
  <ProgramLine right="No. 51 · 10¢" />
  <StateBar>State · going for <b>Ace Ohio</b></StateBar>
  <h1 className="ace-h1">The Paddock</h1>
  <div className="ace-panel">…</div>
  <div className="ace-dock"><AceButton>Go racing</AceButton></div>
</StepTheme>
```
- `StepTheme` sets `data-step` and, for a state, the `--ace-state-*` vars; everything inside reads the tokens. Nest one for a panel that should show another step (a title ribbon takes its own `step`).
- **State accents use `inkFor`** (`icons/ink.ts`) for readable ink, never a per-state guess: `stateLook(code)` does it.
- The house data table (`.rt`, `season/ui/RosterTable.tsx`) sits on paper inside an `.ace-panel .rt-scroll` (its `--pw-*` tokens are re-pointed there).
- Old screens keep working: the `--pw-*` / `--look-*` tokens and the `.rs-*` frame are untouched. Hub moves a screen by wrapping it in `StepTheme` + `.ace-page` and swapping its pieces for the components.

### The bridge (#715)
Inside `.ace-page`, the old `--pw-*` / `--look-*` tokens point at the program's tokens, and `.rs-btn` / `.rs-btn-primary` take the program's buttons, so a screen that hasn't been swept still wears its step for free. Two cautions:
- Old rules can beat `.ace-tab` on specificity (the Paddock's `.pk-tabs button` did): override them under the screen's own `.ace-page` class, never by raising the program's specificity.
- `.ace-panel.ace-paper-table` re-points `--pw-*` to paper, for old components inside a paper panel (the finale's crowns use it).

Frame children get `width` / `max-width` / `margin` at zero specificity (`:where`), so overlays and modals keep their own sizes; the bunting, the state bar and the dock opt out of the frame.

## The proof
- **The Ladder** (`season/ui/RunLadder.tsx`): bunting, the program line, the state bar, "The road to Ace America", the rungs as paper panels (the open one outlined in the accent, races as squares, the last chequered), the sash when the run is won, the dock. Its step comes from `stepForLeague` (Juniors = Locals, Regional / National = State (Ohio stub), Top flight = Nationals).
- **The menu** (`MainMenu.tsx`): the program cover: bunting, the program line, the sash as the title, the racer, the chequer, contents rows.

## Hub's sweep checklist
1. Wrap the screen: `StepTheme` + `.ace-page`; the step from the run (`stepForLeague` today, #696's steps after).
2. Top: `Bunting` → `ProgramLine` → `StateBar` (the step and the title) → `.ace-h1` → `Chequer`.
3. Content in `.ace-panel`s; tables inside `.rt-scroll`; the one action in `.ace-dock`.
4. Titles under drivers: `TitleRibbon`; the driver card: `AceCard` with `art` (the commissioned-art slot) and `Stamp`s (#704); Parcels: `Parcel` / `ParcelStrip`.
5. Copy from **Race Control → Style**; add a component there when you need a new one, in every theme.
6. No hex in a themed CSS file (`icons/theme.test.ts`); no emoji or ★ glyphs in TSX (`icons/emoji.test.ts`; `Star` draws one).
