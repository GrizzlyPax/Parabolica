# The look: Ace America, the race program (#705)

*The design system every screen draws from (Pax locked the look Oct 10, [the locked page](https://claude.ai/artifact/DX3c8cStUC8sbBFkPxdoc3)). Apex built the system; Hub sweeps the screens onto it. The live catalogue: **Race Control → Style** (`#/race-control/style`), every component in every step theme.*

## The idea
- **A race program:** red, white and blue first, **gold as the highlight**; bunting, motorsport marks, an Official Program number; a **navy ground with cream (paper) panels**.
- **The sash is the title:** cream satin, a thin border, the words in Playball set straight across the band (#778: on a curve the script's joins broke), a gold wheel at each end, no crown. At the title moment it lands askew (`drape`) under confetti, with a rosette per title held (the pageant, Pax Oct 17).
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
| `look.css` | The components, **tokens only** (`icons/theme.test.ts` fails on a hex here): page, bunting, program line, type, rules, panels, buttons, dock, tabs, state bar, sash (and its `drape`), ribbons, honours (a rosette over its ribbon), confetti, a stage, roundel, levels, sheet, the `.rt` table on paper, menu rows, rungs, chips, strip, card, stamps, Parcel |
| `Look.tsx` | The React pieces: `StepTheme`, `Sash`, `Wheel`, `Bunting`, `Star`, `ProgramLine`, `Chequer`, `TitleRibbon`, `Rosette`, `Confetti`, `Pennant`, `StateBar`, `Racer`, `AceButton`, `Roundel`, `Level`, `Stamp`, `AceCard`, `CarCard`, `Parcel`, `ParcelStrip` |
| `sash.ts` | The sash's geometry: **one centre curve** (a gentle wave); the band and pinstripes are offsets of it, the wheels sit on points of it, the words sit straight on its middle (`sashTextSpan`: the room between the wheels; `Sash` measures the title once the font is in and shrinks a long one to fit, never a `textPath`) |
| `step.ts` | `Step` ids, `STEPS`, `stepName`, `StateLook` read from `data/states.ts` (`stateLook(code)`: the state's palette, `DEFAULT_LOOK` until Radio fills it, ink from `inkFor`), `stepThemeVars`, `ribbonStep`, `programNumber`. A screen's step and state come from the run (#696): `facts.setup.league.step` and `.locale.stateId` |
| `race.css` | **The race view (#716):** every rule scoped to `.ace-race`, the class `WatchMode`'s `StepTheme` wears. The header is the masthead on the ground (a gold rule, the program line in gold), the tower / feed / footer / lap chart / finish sheet are paper panels (the `--pw-*` tokens re-pointed inside each), the map stays on the ground. `look/race.test.ts` keeps it scoped |
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
- **Run screens share one header** (`season/ui/RunHeader.tsx`, #778): bunting, the program line, the state bar with the town pennant and the words every run screen says first (**the title you hold · going for the next · race N of M · your place**, from `run/where.ts` `runWhere(facts)`), then the row Menu · garage small · The road · End run, then the screen's `.ace-h1` and the chequer. The Paddock, the finale and the road use it; a new run screen starts with it. Identity is your title, not your garage: no logos anywhere in the run, a garage is its colour (a swatch) and its name small.
- **The race view** takes `step`, `state` and `program` props on `WatchMode` (App passes the Season race's step, its state and "State · Race 2 of 6"; Quick Race and the lab wear Nationals). From 1024px the track view runs **tower | map | feed** side by side and the detail view **table | feed**; a phone stacks them (map pinned under the header, then the tower, then the feed).
- **State accents use `inkFor`** (`icons/ink.ts`) for readable ink, never a per-state guess: `stateLook(code)` does it.
- The house data table (`.rt`, `season/ui/RosterTable.tsx`) sits on paper inside an `.ace-panel .rt-scroll` (its `--pw-*` tokens are re-pointed there).
- **Roles on the ground and on paper** (#778): besides `--ace-fg` / `--ace-muted` / `--ace-hair`, a stylesheet reads `--ace-bg` (the colour behind text here), `--ace-surface` / `--ace-raised` (a little lighter), `--ace-data` (the data face: Oswald on the ground, the typewriter on paper) and `--ace-purple` (S grades). `.ace-panel` and `.ace-paper-table` flip them all to paper and ink, so a component written once reads right in both places. A card is a dark plate wherever it sits: `--ace-plate` / `--ace-plate-ink` / `--ace-plate-muted`.
- The lab's frame (`RunSetup.css`, the `.rs-*` classes the World Deck, Race Control and the idea box share) reads the same tokens; `.rs-btn` is the program's button under the old name.

### The bridge (#715, retired for pages in #778)
Every page stylesheet reads `--ace-*` now; the `--pw-*` / `--look-*` re-pointing survives only on `.ace-race` (`look/race.css`) until the race view's own sweep moves `WatchMode.css` and `components/race/*.css` onto the tokens. Two cautions still hold:
- Old rules can beat `.ace-tab` on specificity: override them under the screen's own `.ace-page` class, never by raising the program's specificity.
- `.ace-paper-table` (or any `.ace-panel`) flips the roles to paper for whatever sits inside (the finale's crowns, the Paddock's sheets).

Frame children get `width` / `max-width` / `margin` at zero specificity (`:where`), so overlays and modals keep their own sizes; the bunting, the state bar and the dock opt out of the frame.

## The proof
- **The road** (`season/ui/RunLadder.tsx`): the run header, "The road to Ace America", the rungs as paper panels (the open one outlined in the accent, races as squares, the last chequered), your titles as ribbons, the dock. Out of the loop since #778 (the Paddock's header links to it).
- **The Paddock** (`season/ui/Paddock.tsx`, #778): the run header, then two columns from 1024px: your garage (the Parcel face up on arrival, the roster table) | the league's two tables. The dock: Leave it shut (ghost) + Go racing.
- **The finale** (`season/ui/Standings.tsx`, #778): the title moment from the locked look's frame 8, as a pageant: confetti, the town's pennant, "Congratulations, you are now" + the sash draped on, your car in your colour, the honours (a rosette over each title's ribbon); the Postmark struck (picks previewed as gold stamps), the deck that won it (every stamp in play as cards), the crowns, the chart and the tables, Up to State in the dock (straight into the next Paddock).
- **The race view** (`WatchMode.tsx`, #716): the masthead, paper tower and feed beside the map, the finish sheet with the sash.
- **The menu** (`MainMenu.tsx`): the program cover: bunting, the program line, the sash as the title, the racer, the chequer, contents rows.
- **The program number** (the `No. 51 · 10¢` line): the covers (the menu, the World Deck, Race Control, Credits) carry the edition, `programNo(version)`; a run's screens carry the run's own number, `programNumber(seed)`, one per run.
- **Dead CSS** (#778): a rule whose classes no TSX uses is dead; the sweep removed ~3,000 lines (the old dashboard, leaderboard, hover cards, finish modal, packs, the draft board). Before adding a class, check Race Control → Style for the component.

## Hub's sweep checklist
1. Wrap the screen: `StepTheme` + `.ace-page`; the step and state from the run (`facts.setup.league?.step`, `.locale?.stateId`).
2. Top: a run screen uses `RunHeader`; anything else `Bunting` → `ProgramLine` → `StateBar` (the step and the title) → `.ace-h1` → `Chequer`.
3. Content in `.ace-panel`s; tables inside `.rt-scroll`; the one action in `.ace-dock`.
4. Titles under drivers: `TitleRibbon`; the driver card: `AceCard` with `art` (the commissioned-art slot) and `Stamp`s (#704); Parcels: `Parcel` / `ParcelStrip`.
5. Copy from **Race Control → Style**; add a component there when you need a new one, in every theme.
6. No hex in a themed CSS file (`icons/theme.test.ts`); no emoji or ★ glyphs in TSX (`icons/emoji.test.ts`; `Star` draws one).
