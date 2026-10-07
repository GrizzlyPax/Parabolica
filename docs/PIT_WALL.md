# Pit Wall — the team's live work board

`playparabolica.com/#pitwall` (menu → Team → Pit Wall once this device has opened it).

It reads GitHub issues live, every 60 seconds while the tab is open. There's no copy of the data anywhere else: **a card's lane is its labels**, so Pit, Hub and the board can't disagree.

| Lane | Rule | Who acts |
|---|---|---|
| Inbox | open, no lane label | Pax or Pit sorts it |
| Next | `next` | Pit scopes it |
| Ready | `ready` | Hub builds it |
| Building | `in progress`, or an open PR that says "closes #N" or is branched `…/N-…` | Hub |
| Backlog | `backlog` | nobody, for now |
| Done | closed (last 21 days) | |

- **Needs Pax** = the `question` label. It shows as a yellow flag and sorts to the top of its lane.
- Epics (`epic`) stay off the board; filter by phase (milestone) instead.
- Moving a card swaps one lane label in one PATCH. Moving to Done closes the issue; moving out of Done reopens it.

## Editing

Watching needs nothing (the repo is public; GitHub allows 60 reads an hour per visitor, and unchanged polls come back 304 for free). To add, move and edit, paste a fine-grained token on that device: **only this repo, Issues: read and write**. It lives in that browser's localStorage only.

## Code
`src/pitwall/`: `lanes.ts` (lane rules, pure, tested), `github.ts` (REST client with ETag cache), `PitWall.tsx`, `PitWall.css`.
