# Parabolica Story Workstream — handoff for any agent or collaborator

*Plain markdown so anyone can read it: a human, Claude, ChatGPT, Codex, Cursor, whoever. If you have never heard of Parabolica, start at §0. If you are here to do a pass, jump to §6 for the prompt that matches your job.*

> **State as of Oct 6, 2026 — read this first; it overrides anything older below.**
> - **Gods are parked.** Founding a league no longer asks for one (leagues are silently founded under the first god in `src/league/gods.ts`). The gods' names, epithets and hungers are still content you can rewrite, but nothing on screen shows them right now; Pax has a different mechanic in mind for them later. Don't build story *on* gods yet.
> - **Fantasy teams exist** (`src/fantasy/`, `docs/FANTASY.md`). Players name 2–6 teams, pick colours, and snake-draft 3 drivers each. Team names are player-made, not World Deck content; the draft copy and labels ("front third", "midfield", "back third") are strings you can restyle.
> - **Leagues are online** (`docs/LEAGUE_SERVER.md`): a published league is watched from any device by code or link. No story impact, but seasons are now long-running and shared, so the season chronicle and headlines are read by more than one person.
> - **Names in the UI are white**; team colour lives on the marbles. Flavour that relied on coloured names won't show.

---

## 0. Orientation: what Parabolica is

Parabolica is a browser game: a Formula 1-shaped racing simulation in the spirit of **Blaseball** — a sport that runs itself, with strange rules, odd characters and a universe that accrues story as it plays. Pax (`GrizzlyPax` on GitHub) is building it; Claude has been the main engineering partner. It is live at **playparabolica.com**.

How it plays today:
- **Quick Race**: pick a seed, a track and some cards (rules), look at the grid, watch a 3–4 minute race with a live timing tower, map, speed column and commentary feed. A copyable race report at the end.
- **Commissioner Mode**: found a league that runs on the real clock — races fire whether you watch or not — with standings, a chronicle, and interventions.
- **The World Deck** (menu → World Deck): every team, track, tag, card, rule, weather, god and flavour pool in the game, read straight from the data. It has an **+ Add** tab (draft a tag or team, copy as code or as a prompt) and a **💡 Inbox** (ideas captured in play).

The key idea for story people: **drivers, cars and teams carry *tags*** — small oddities like 👻 Haunted, 💎 Glass Cannon, 🧈 Butterfingers — that bend a race a little and give it character. Tags are born with a driver, earned by results, picked up mid-race, or spread between drivers. Everything in that vocabulary is data an agent can write.

### Where things are

| Thing | Where |
|---|---|
| Code | `https://github.com/GrizzlyPax/Parabolica` (private — you need access). Default branch `main`, deploys to playparabolica.com on push. |
| **The content contract** — shapes, rules, voice, how to add anything | `docs/WORLD_DECK.md` ← read this before touching content |
| **Everything that exists today**, generated from the data | `docs/GLOSSARY.md` (regenerate with `npm run glossary`) |
| **The story bible** — theme, voice, anchors (Pax's document) | `docs/STORY_BIBLE.md` |
| How the race actually works (physics, numbers) | `docs/SIM_MECHANICS.md` |
| Design docs for tags, conditions, commissioner mode | `docs/TAG_SYSTEM.md`, `docs/CONDITIONS_LAYER.md`, `docs/COMMISSIONER_MODE.md` |
| Work queue | GitHub issues. Epic **#252** = World Deck content tasks. Labels: `world-deck`, `story`, `idea`, `bug`, `balance`, `eng`. |
| Content files | `src/data/*.ts` (tags, teams, cards, weather, inflictions, acquisitions, inRace), `src/generators/*.ts` (tracks, names, drivers' backstories, cars), `src/league/gods.ts`, `src/feed/commentary.ts` |
| Checks | `npm test` (content checks live in `src/data/worldDeck.test.ts`), `npm run glossary` |

### Vocabulary you'll meet

- **Tag** — an oddity on a driver, car or team. Five dials (speed, consistency, luck, crash safety, pit time), an optional gate (only while raining / in the top 3 / on worn tyres…), a rarity (common/uncommon/rare/legendary — only affects how often it's rolled at birth), and optional after-race actions (spread to a teammate, pass to a rival, upgrade, burn out).
- **Genesis** — tags a driver is born with (three slots: driver, car, team). **Acquired** — earned after a race by a rule. **In-race** — picked up mid-race (Damaged, Spun, Cooked Tyres). **Condition** — stamped by weather or track events.
- **Card** — a rule the player picks before a run ("Rain", "No Pit Rules", "Tag Soup").
- **Track character** — a circuit's lean (High-Speed, Technical, Hazardous). **Infliction** — a mid-race strike a condition can land (Electrocuted in rain).
- **God** — a league's patron; today a voice and an appetite, mechanics later.
- **The Void, the Unsafety Car, the Commissionary** — the existing lore's load-bearing nouns. Keep or replace deliberately.
- **Seed** — every race replays exactly from a number. Reports carry it; bug reports and "that race was great" both point at it.

---

## 1. The shape of it

Three roles, one contract.

- **Pax owns the story.** Theme, tone, who these people are, what the gods want, why Breadbowl exists. The current content is placeholder written to prove the machine works; treat all of it as replaceable.
- **Agents own the typing.** Every word a player reads lives in a data file with a documented shape (`docs/WORLD_DECK.md`). Any agent can rewrite those files from the bible without touching the engine.
- **Engineering owns the machine.** Tyre life, pass rolls, the stop rule, how a tag's numbers bend a race. Story can *ask* for a new lever; it cannot assume one exists.

The World Deck is the contract between the three: it says what exists, what shape it has, and what each field does. A story idea becomes real the moment it is written into that shape, tested, and regenerated into the deck. Nothing else counts as done.

## 2. What is fixed, what is flexible

Dream from the real edges. Almost everything is dressing; the machinery underneath has a small, known set of levers.

| Layer | Flexible (rewrite freely, no engineering) | Fixed (needs an engine task) |
|---|---|---|
| **Words** | Every name, description, blurb, headline, commentary line, lights-out line, god's hunger. The pun on each track. The vibe of each team. | Nothing. Even UI labels ("Boxes — ahead of the cliff") are strings an agent can change. |
| **Who exists** | Teams, tracks, gods, driver name pools, backstory templates, quirks, car names. Add, remove, rename. | A fifth tag slot, a third driver per team, a track with two layouts. |
| **Tags** | Any number; name, emoji, line, rarity, which of the five dials it turns, when it is on (position, lap, weather, tyre wear, damage), what it does after a race (spread, pass to a rival, upgrade, burn out). | A new dial ("tyre wear rate", "pass chance"), a new trigger ("when overtaken"), a new condition ("when a teammate is ahead"). Each is a small engine task; ask for it by name. |
| **The race** | Which weather exists and how often; how hard each track is to pass on (via character); the odds of every rarity; what cards exist. | How tyres wear, how a pass is rolled, how pits cost time, what the stop rule is. These are physics — tunable by number, not by story. |
| **The season** | Why a tag is awarded (streak, climb, crash, fastest lap, lottery) and what the headline says. Gods' names and appetites. | What gods *do* (not built yet), decrees, interventions beyond attaching a tag. |

Two honest constraints on the dreaming:
- **A tag is five dials and a gate.** Any oddity you can express as "faster / steadier / luckier / safer / quicker in the pits, while X" is a day's work for an agent. An oddity that needs the race to *do* something new (teleport, swap cars, skip a lap) is an engine conversation first.
- **Numbers are claims.** A story can say a tag is huge; the lab decides what huge costs. Write the fiction, propose the number, flag it. Even ±3% is loud now that the soft→hard tyre gap is 3%.

## 3. Two kinds of change

**A flavour pass** rewrites the words inside the existing shapes. Rename the teams, rewrite every tag line in a new voice, replace the pun tracks with a new set, give the gods new hungers. One agent, one issue per content type, each a normal World Deck PR. Nothing in the engine moves; the race plays identically with new dressing. This is the cheap, repeatable kind, and it is most of what a theme change actually is.

**A theme change** is a flavour pass plus a short list of *new levers* — things the new world needs the race to do that the old one didn't. Write that list separately and keep it short. Example: a theme where weather is the whole story needs the wet-tyre pass (already planned); a theme built on rivalries needs per-tag memory (deferred from #233). Each lever is one scoped engine issue with the story reason on it, built when engineering has room; the flavour pass never waits for it.

| | Flavour pass | New lever |
|---|---|---|
| Where it's written | The bible → one issue per content type under epic #252 | One issue per lever, labelled `eng` (+ `balance` if it moves results), story reason in the first line |
| Who does it | Any agent, from `docs/WORLD_DECK.md` | Engineering |
| "Done" means | PR merged, `npm test` green, `docs/GLOSSARY.md` regenerated, deck shows it | Lever documented in `SIM_MECHANICS.md`, probe number attached, World Deck doc gains the new field |
| Risk | None to results; everything to tone | Results change; needs a probe gate |

One rule that keeps both safe: **ids never change.** A team can be renamed from Breadbowl to anything, but `breadbowl` stays its id because saved leagues reference it. A clean-slate theme retires old ids and adds new ones; it does not rewrite them.

## 4. The loop

```
muse → bible → issues → passes → deck → play → muse
```

1. **Muse.** Pax talks, in whatever shape it comes. The 💡 idea box catches small ones in play (seed and track attached); a longer session goes in a chat or a doc. No shaping required.
2. **Bible.** `docs/STORY_BIBLE.md`: the theme in a paragraph, the voice rules, a section per content type with what it should *feel* like and 3–5 anchor examples. The only document a flavour agent needs besides the World Deck. It is Pax's; agents propose edits as PRs, never silently.
3. **Issues.** Each pass is one issue: *"Flavour pass: team descriptions, in the bible's voice"*. Labels `world-deck` + `story`. New levers get an `eng` issue with the story reason. The idea inbox feeds this step through triage.
4. **Passes.** An agent takes the issue, reads bible + World Deck, rewrites the data file, runs `npm test` and `npm run glossary`, opens a PR. Pax reads the PR as prose — the `GLOSSARY.md` diff is the review surface.
5. **Deck.** Merged content is the world. The in-game World Deck shows it; a league founded tomorrow uses it.
6. **Play.** Races in the new world throw off new ideas. Back to 1.

Cadence for a weekend project: muse whenever; one bible edit per theme decision; passes in batches of two or three issues; inbox triage weekly or on request.

## 5. The theme question

Decide these before any flavour pass; every content type hangs off them. Each is a paragraph in the bible, not an essay.

1. **What is this sport?** Literal motorsport with a strange sky (Blaseball's move), or something else wearing racing's shape? Sets what a "car", a "pit stop" and a "tyre" are called, and whether the km/h column says km/h.
2. **Who are the teams, really?** Today: real-world subcultures as racing teams. Keep that engine (funny, endlessly extensible) or replace it with factions of the world. Decides the team deck and the name pools.
3. **What is the horror, and how cozy?** Today: bureaucratic absurdism with affectionate dread (the Void, the Unsafety Car, "something followed them home"). Dial it or replace it. Decides acquired-tag headlines, gods, commentary.
4. **Who speaks?** Three voices exist: the Booth, Mister Marbles, the Track. Keep, rename, add a fourth. Every feed line is written in one of them.
5. **What do the gods want?** Their hungers should be things a race digest can measure (carnage, order, upsets, weather, pit drama) so they can be scored later.
6. **What is a tag, in-world?** A curse, a sponsorship, a rumour, a mutation, a licence condition? One word here changes how every tag line and every acquisition headline reads.

Answer these and thirty tags, eleven teams and twenty-four tracks become a mechanical rewrite an agent can do in a sitting. Skip them and every pass argues with the last one.

## 6. Prompts to hand an agent

Paste one of these, plus the links from §0, into any model.

**Muse session (no repo access needed — give it this file)**
> You are a story collaborator on Parabolica, a racing sim in the spirit of Blaseball. Read the orientation in docs/STORY_WORKSTREAM.md (pasted below). I'll talk through theme ideas. Your job: ask the six theme questions one at a time (what is the sport, who are the teams really, what is the horror and how cozy, who speaks, what do the gods want, what is a tag in-world), push back when an answer is vague, and at the end write the answers as a one-page bible draft in my words, in the structure of docs/STORY_BIBLE.md. Don't invent content yet — lock the frame.

**Bible to issues (repo access)**
> Read docs/STORY_BIBLE.md and docs/WORLD_DECK.md. Compare the bible against docs/GLOSSARY.md and list every content type that no longer matches the bible's theme or voice. File one GitHub issue per type under epic #252, labelled world-deck + story, each stating: the file, the count to rewrite, the bible section to follow, and three anchor examples. Separately list anything the bible needs that the engine can't do today (see §2 of docs/STORY_WORKSTREAM.md) and file each as one eng issue with the story reason in the first line. Do not rewrite content in this task.

**A flavour pass (repo access)**
> Read docs/STORY_BIBLE.md, docs/WORLD_DECK.md and docs/GLOSSARY.md. Take issue #___ (one content type). Rewrite every record in that file to the bible's voice, keeping ids unchanged and every numeric field exactly as it is. Run npm test and npm run glossary; commit the file with docs/GLOSSARY.md; open a PR whose description shows five records before/after so it reads as prose.

**Inbox triage (repo access)**
> Triage Parabolica's open `idea` issues on GitHub. For each: if it's content, build it per docs/WORLD_DECK.md in the bible's voice and PR it; if it needs a new engine lever, rewrite it as a scoped eng issue with the story reason; if it's a bug, reproduce it from the seed in the issue. Link what you made and close the idea with one line.

**Playtest read (no repo access — give it a race report)**
> Here is a Parabolica race report (copied from the game's Race Complete bar). Read it as a story editor: which names, lines and events landed, which read as placeholder, and where the world was silent when it should have spoken. Give me ten specific rewrites in the bible's voice, each tied to a record id from the report.

## 7. Guardrails for any agent

- Never change an `id`. Never change a number in a flavour pass. Never edit `docs/GLOSSARY.md` by hand — regenerate it.
- Run `npm test` before opening a PR; `src/data/worldDeck.test.ts` will tell you exactly what's wrong.
- One content type per PR. Small PRs get read as prose; big ones don't get read.
- Match the voice in the bible, not the voice in your head. When the bible is silent, match the ten nearest lines in `docs/GLOSSARY.md`.
- If a pass needs the engine to do something new, stop and file the lever as an issue instead of faking it in data.
