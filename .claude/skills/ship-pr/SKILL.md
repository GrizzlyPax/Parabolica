---
name: ship-pr
description: Build a `ready` Parabolica issue and ship it — branch, implement, test, open the PR, merge when green. Use when picking up a `ready` issue or any time code is about to be committed, PR'd or merged in this repo.
---

# Ship a PR

## Before you start

- Only build issues labelled **`ready`** (or one Pax names). Read the whole issue and its linked issues.
- Build what it says. Bugs or ideas outside it → open a short issue (see `write-issue`), don't build them.
- Ambiguous enough to guess? Comment the question on the issue, remove `ready`, stop.
- Read the newest `docs/HANDOFF_*.md` once per session ("How the pieces fit" and "Traps").

## Rules that bite

- **Determinism:** seeded RNG only (`src/engine/rng.ts`). Never loosen these tests: `src/RaceEngine.test.ts` (golden fingerprint), `src/league/replay.test.ts`, `src/league/remote.test.ts`.
- **Intended physics/content/RNG-order change** → bump `package.json` version, then `GOLDEN_UPDATE=1 npx vitest run -t fingerprint`, and say so in the PR.
- **Facts, not state:** anything that must persist or be shared goes into league facts (`LeagueSetupConfig`, intervention log), never a derived snapshot.
- **One way to build a race:** `createLeague` + `prepareScheduledRace` (`src/league/settle.ts`). Don't hand-build an engine.
- **Tuning is data:** knobs in `src/simlab/types.ts` / `src/racecontrol/knobs.ts`, rules in `src/data/cards.ts`.
- **Names are white.** Team colour lives on marble, dot, chart line, row edge only. Grep `color:`, `fill:` (incl. SVG style objects), `fill=` on `<text>`, `var(--team-color)`.
- **Use `--pw-*` tokens** from `src/App.css`, not hex.
- CSS cleanup: exact-match edits, never regex deletes.

## Steps

```bash
git fetch origin main && git checkout -b <short-branch> origin/main
# … build …
npm test && npm run build
npm run glossary            # if you touched src/data or src/generators
npm run calibrate           # only if a genesis tag changed (~15 min)
git status                  # check for stray files (rc-*.mjs, server/.wrangler/)
git add <files by name>
git commit -F msg.txt       # -F, not -m: quotes/arrows break -m
git push -u origin HEAD
```

PR (REST only):

```bash
# pr.json: {"title","head","base":"main","body"}
gh api repos/GrizzlyPax/Parabolica/pulls --input pr.json
gh api -X PUT repos/GrizzlyPax/Parabolica/pulls/N/merge -f merge_method=squash
```

PR body: what changed · **where Pax sees it** (screen → button) · `Closes #N` · fingerprint/version note if any.

## Picking work

- Take the first open issue with your `crew:` label in the earliest milestone (`v0.5 · 1 Core` → … → `5 Ship`) whose **Depends on** issues are closed.
- The PR body says `Closes #N`, so merging closes the issue. No other status update is needed.

## Merging

- Merging to `main` deploys playparabolica.com. Merge only green, self-contained PRs.
- **Leave unmerged and say why:** save-format changes, `server/` changes, sim balance shifts.
- Workflow dispatch is blocked (403). To redeploy the API, push a change under `server/`.
- UI changes: check in the browser (Playwright from repo root, `executablePath: '/opt/pw-browsers/chromium'`). Then run `republish-preview`.
