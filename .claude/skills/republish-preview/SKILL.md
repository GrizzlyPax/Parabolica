---
name: republish-preview
description: Republish the Parabolica preview build to its claude.ai artifact after a merge. Use after merging a PR, or when Pax asks to update / see the preview.
---

# Republish the preview

The preview artifact is `TKD2w88SkEdAA7eWgszpoA` (check the newest `docs/HANDOFF_*.md` for the current id/version). It blocks Web Workers (the lab falls back to the main thread via `src/racecontrol/labRunner.ts`) and needs **relative** asset paths.

## Steps

1. Build from up-to-date `main`: `git checkout main && git pull && npm run build`.
2. Copy `dist/*` to the scratchpad.
3. Rewrite absolute asset paths to relative, in `index.html` **and** every `assets/index-*.js`:
   `"/assets/` → `"./assets/`
4. List the artifact's current files (`Artifact` tool, `action: list`, `scope: files`, `url` = the artifact).
5. Publish to the same `url` with a `files` map:
   - new `assets/*` paths → the rewritten files;
   - **previous asset hashes → `null`** so stale bundles are removed.
6. Note the new version in the PR (and the handoff doc if it records one).

## Gotchas

- Forgetting step 3 = blank page. Forgetting the `null`s = the artifact grows with dead bundles.
- Don't create a new artifact; always publish to the existing `url`.
