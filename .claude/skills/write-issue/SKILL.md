---
name: write-issue
description: Write, clean up, triage or close a Parabolica GitHub issue in the house shape, and mark it `ready` for building. Use whenever creating or rewriting an issue, turning an idea-box issue into a buildable one, closing stale issues, or opening a follow-up issue for out-of-scope work found while building.
---

# Write an issue

## Shape (every issue)

```
**TL;DR:** one or two sentences.

**To do**
- short bullets

**Where:** screen → button, and/or file path, when known
**Out of scope:** what this deliberately does not do
**Done when:** one line Pax can check in the game
**Related:** [#N Title](link) — always with titles, never bare numbers

<details><summary>Original idea</summary>…idea-box text, unedited…</details>
```

- Title says the thing ("Season report: add fantasy section"), not "Idea: so here's one…".
- Start smaller than feels exciting. Ship the smallest thing that proves it; list the rest under Out of scope.
- Open design questions go in the issue as multiple choice (A / B / C, pick marked). The issue is **not** `ready` until Pax answers.

## Labels

- Kind: `bug`, `enhancement`, `idea`, `balance`, `content`, `story`, `research`.
- Area: `area: …` labels (`area: leagues`, `area: timing-tower`, `area: race-views`, `area: end-of-race`, `area: navigation`, `area: track-gen`, …).
- **`ready`** = scoped well enough to build without guessing. It is the only handoff to the builder. Remove it if a question comes up.
- Check `docs/HANDOFF_*.md` (newest) "Open work" before inventing priority.

## Commands (REST only — GraphQL is blocked in sessions)

```bash
# search before creating (avoid duplicates)
gh api "search/issues?q=repo:GrizzlyPax/Parabolica+is:issue+is:open+<words>" -q '.items[] | "\(.number) \(.title)"'

# create: write the JSON to a file so quotes/arrows don't break the shell
gh api repos/GrizzlyPax/Parabolica/issues --input issue.json      # {"title","body","labels":[...]}

# edit / relabel
gh api -X PATCH repos/GrizzlyPax/Parabolica/issues/N --input patch.json
gh api repos/GrizzlyPax/Parabolica/issues/N/labels -f 'labels[]=ready'

# close stale: one-line note, then close with a reason
gh api repos/GrizzlyPax/Parabolica/issues/N/comments -f body='Done in #M (Title).'
gh api -X PATCH repos/GrizzlyPax/Parabolica/issues/N -f state=closed -f state_reason=completed   # or not_planned
```

Closing note forms: "Done in [#M Title]", "Replaced by [#M Title]", "Parked: <why>".

## Milestone, crew, paste line (required)

- **Milestone:** the current release's step (`v0.5 · 1 Core` … `5 Ship`) or a later release (`v0.6 Monza`, `v0.7 Suzuka`). Not in a release → no milestone + label `queued` or `icebox`.
- **Crew label** (current release only): `crew: apex` (Fable-only work) · `crew: hub` · `crew: radio` (story, identity, icons) · `crew: steward` (game design, balance, fun) · `crew: pit` · `crew: pax` (needs a decision).
- **First line of the body:** `> **Paste (<model>):** <crew opener> Issue: #N. When done, write Pax a handoff for Pit.` Openers are in CLAUDE.md.
- **Order:** a `**Depends on:**` line linking the issues that must close first. No due dates.

## Lane

Issue and `docs/` work only. Never edit `src/`, `server/`, `scripts/`, configs or tests while doing this — if code is needed, that is a new issue.
