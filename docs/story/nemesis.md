# The nemesis: how the rival team talks

**Status:** Pax's picks, Oct 10 2026 (#624). Not canon until it moves into `docs/STORY_BIBLE.md`. Samples: [The Nemesis](https://claude.ai/artifact/2vAFqTDirhv81ZbyPYL4XK) (pick each driver's personality, read one run).

**TL;DR:** The nemesis is a **rival team, Pokémon-rival style**: snot-nosed, a step ahead, little bits of attitude, nothing crazy. They talk in the **Paddock**, **one line per visit**. The team has **two drivers, and each rolls one of five personalities**, so every rival team sounds a little different. When they end your run, the debrief is a **newspaper headline**.

## Pax's picks

| Question | Pick |
|---|---|
| Tone | A Pokémon rival. "Maybe snot-nosed… couple different personalities… nothing crazy, just little bits." Gloves on: no strangeness here. |
| Where they talk | **The Paddock.** Not the Booth. Race-feed lines could come later; **team radio eventually**, not yet. |
| Marking | **Rival team = team name + a NEMESIS tag** (standings, tower, Paddock). Team Rocket energy. |
| Run-over debrief | **A newspaper headline** (#595). |
| Personalities | **Per driver, not per team** ("there's two drivers… two personalities over there"). Go wide: a Spanish speaker and a brooder who just goes "Hmph." |
| How often | **Once per Paddock visit.** |

## The rules

- **Two drivers, two rolls.** At the start of the run, each nemesis driver rolls one of the five personalities. Equal odds; doubles are allowed. The roll travels with the driver when the team is promoted.
- **One line per Paddock visit,** picked by the moment (table below). Pick a line at random from that moment's pool, seeded, never the same line twice in a row.
- **The driver who matters speaks:** whoever finished ahead of you last race; if neither did, their higher-placed driver; at a league start, whoever placed higher last league.
- **Boss race:** both drivers speak before lights out (the one moment they both do). After it, their better finisher speaks.
- **The double act:** if both drivers roll Show-off, they speak as "we" (Team Rocket nod) wherever a double-act line exists; elsewhere the speaker uses their own Show-off line. At the boss race they share one line.
- **Spanish lines** show a small English line underneath.
- **Attribution:** "Madina Doyle · Kanzaki" (driver · team); the double act reads "Doyle & Castillo · Kanzaki".
- **Tokens:** `{you}` your team · `{nemesis}` their team · `{driver}` the speaking driver · `{gap}` points between you. Headlines also use `{LEAGUE}` (without "the") and `{TRACK}`, in capitals.

### The moments

| Moment | When it shows |
|---|---|
| Their return | First Paddock visit of a league, after they were promoted with you |
| They lead you | They're ahead of you in the league table (and nothing below applies) |
| You lead them | You're ahead of them in the table (and nothing below applies) |
| They beat you | After a race where their speaker finished ahead of both your drivers (beats the table moments) |
| You beat them | After a race where your best driver finished ahead of both of theirs |
| Boss build-up | Before race 6 of a league |
| Boss result | After race 6: you win (you go up) or they win (the run ends) |

## The five personalities

### The Brat

_Snot-nosed, always a step ahead. The Pokémon rival._

| Moment | Lines |
|---|---|
| Their return (start of a league) | Oh. You got promoted too? Cute. · Took you long enough. · Look who followed me up. |
| They lead you in the table | {gap} points ahead. Try to keep up. · Still behind me? Classic. · I'd slow down for you, but I don't know how. |
| You lead them in the table | Enjoy it. It won't last. · {gap} points? That's one race. · Lucky. Everyone saw it. |
| After they finish ahead of you | Smell you later, {you}. · Did you even see which way I went? · I'll wait for you at the finish next time too. |
| After you finish ahead of them | Whatever. My car was set up wrong. · I let you have that one. · Fine. FINE. |
| Boss race, before lights out | Last race. Try not to cry. · Win this and you go up. Spoiler: you won't. |
| Boss race, you win | ...I'll be back. And I'll be better. · See you in the next league. Obviously. |
| Boss race, they win | Told you. Smell you later! · Better luck next run, {you}. |

### The Show-off

_Loves the cameras more than the racing._

| Moment | Lines |
|---|---|
| Their return (start of a league) | Did you miss me? Everyone misses me. · New league, new helmet, same incredible {driver}. · Back, and twice as shiny. |
| They lead you in the table | {gap} points clear. Smile for the cameras. Oh, they're pointing at me. · Top of the table looks good on me. Everything does. |
| You lead them in the table | A temporary setback. Great for ratings. · {gap} points behind? I call that a comeback story. · I'm saving the good bit for later. |
| After they finish ahead of you | And THAT is how it's done. Wave to the crowd! · Another one for the highlights reel. |
| After you finish ahead of them | I meant to do that. It's called a plot twist. · The crowd loves an underdog. Enjoy your moment. |
| Boss race, before lights out | The final! Lights, cameras, me! · I've rehearsed the celebration. |
| Boss race, you win | This isn't over. It's barely the second act. |
| Boss race, they win | And scene! Thank you, you've been wonderful. |

### The Old Hand

_Gruff veteran. Seen it all, unimpressed by you._

| Moment | Lines |
|---|---|
| Their return (start of a league) | Second last time. Not happening twice. · Promoted with you. Don't make a thing of it. |
| They lead you in the table | {gap} points. That's experience. · Steady wins it. Always has. |
| You lead them in the table | Long season. Don't count your points yet. · Fast car. Young team. Seen it before. |
| After they finish ahead of you | Told you. Experience. · Nice try, kid. · That's racing. |
| After you finish ahead of them | Fair enough. Good drive. · Hm. You're getting better. |
| Boss race, before lights out | Last race. Let's see what you've learned. · Been here before. Have you? |
| Boss race, you win | Good race. You earned that. · See you in the next league. I'm not done. |
| Boss race, they win | That's experience, kid. · Well raced. Come back when you're ready. |

### The Brooder

_Says almost nothing. Mostly "Hmph."_

| Moment | Lines |
|---|---|
| Their return (start of a league) | Hmph. · ... · You again. |
| They lead you in the table | Hmph. · Expected. · ... |
| You lead them in the table | Hmph. · Not for long. · ... |
| After they finish ahead of you | Hmph. · Obviously. |
| After you finish ahead of them | ... · Hmph. · Next time. |
| Boss race, before lights out | Hmph. · Finally. |
| Boss race, you win | ...Hmph. · Next league. |
| Boss race, they win | Hmph. · As expected. |

### The Spanish speaker

_Only speaks Spanish. Short lines anyone can follow._

| Moment | Lines |
|---|---|
| Their return (start of a league) | ¿Otra vez tú? _(You again?)_ · Hola de nuevo, {you}. _(Hello again, {you}.)_ · Subimos juntos. Qué casualidad. _(We came up together. What a coincidence.)_ |
| They lead you in the table | {gap} puntos. Tranquilo, que aún queda temporada. _({gap} points. Relax, there's still a season left.)_ · Vamos bien. Muy bien. _(We're doing well. Very well.)_ |
| You lead them in the table | Esto no ha terminado. _(This isn't over.)_ · Paciencia. La temporada es larga. _(Patience. The season is long.)_ |
| After they finish ahead of you | ¡Hasta luego, {you}! _(See you later, {you}!)_ · ¡Vamos! _(Let's go!)_ · Así se hace. _(That's how it's done.)_ |
| After you finish ahead of them | Bah. Suerte. _(Bah. Luck.)_ · Bien hecho. Esta vez. _(Well done. This time.)_ |
| Boss race, before lights out | Última carrera. Que gane el mejor. _(Last race. May the best one win.)_ · Hoy no, amigo. _(Not today, friend.)_ |
| Boss race, you win | Nos vemos en la próxima liga. _(See you in the next league.)_ |
| Boss race, they win | ¡Adiós, {you}! _(Goodbye, {you}!)_ · Te lo dije. _(I told you.)_ |

### The double act (two Show-offs)

| Moment | Lines |
|---|---|
| Their return (start of a league) | Did you miss us? Everyone misses us. · Prepare for a proper season. {nemesis} are back, and twice as shiny. |
| After they finish ahead of you | And THAT is how it's done. Wave to the crowd, both of us! |
| Boss race, before lights out | The final! Lights, cameras, {nemesis}! |
| Boss race, they win | We're blasting off to the next league! Bye! |

Every other moment uses the Show-off line from the driver who speaks.

### Debrief headlines (team level, #595)

- {NEMESIS} END THE RUN AT {TRACK}
- {NEMESIS} TAKE {LEAGUE}, {YOU} GO HOME
- SECOND TO {NEMESIS}, WHEN IT COUNTED
- {NEMESIS} HAVE THE LAST WORD

## Gaps Radio drafted (Pax to check)

The Juniors has a nemesis too (#626 gives it an offset), but there's no "last league" for them to return from, and the Top flight boss has no "next league". Draft lines:

| Personality | First meeting (Juniors, replaces "their return") | You win the Top flight boss (replaces "you win") |
|---|---|---|
| The Brat | So you're the new kid. I'm faster. · Hi. I'm going to beat you all year. | ...Fine. You're the best. For now. |
| The Show-off | You must be new. You'll want my autograph. · Hello! Yes, it's me. | A finale worthy of me. Congratulations, I suppose. |
| The Old Hand | Rookies. Every year. · Keep out of my mirrors, kid. | Champion. You earned every inch. |
| The Brooder | Hmph. · ... | ...Hmph. Well driven. |
| Spanish speaker | ¿Y tú quién eres? _(And who are you?)_ · Bienvenido, novato. _(Welcome, rookie.)_ | Campeón. Te lo has ganado. _(Champion. You've earned it.)_ |
| Double act | Hello! Yes, it's us. | A finale worthy of us. Fine. You can have a bow too. |

## The debrief (#595)

When the nemesis ends your run, the debrief opens like a newspaper: masthead **The Paddock Almanac · Run over**, one headline from the pool above, then a one-line dek with the facts:

> **KANZAKI END THE RUN AT HARBOUR STREETS**
> Low Tide Racing's run ends in the National league, race 6, at Harbour Streets. 3 leagues entered, 2 won.

If a different team ends your run, the headline names that team the same way. (Track names in samples are drafts; #370 is paused.)

## Later, not now

- **More personalities.** Pax: "we can get pretty wide." Ideas: the Polite one (overly sorry), the Superstitious one (blames omens), the Rookie fan (thinks you're great, beats you anyway), the Sponsor bot (every line is an ad).
- **Race feed lines** from the nemesis (a jab when they pass you), then **team radio**.
- **Rivalry memory:** a line that remembers last league ("Second last time. Not happening twice." already does this lightly).
