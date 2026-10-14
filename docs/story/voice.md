# The voice: callers and the Interval (#700)

How races sound in Ace America. Pax's picks, Oct 14, from [Voice and Venues](https://claude.ai/artifact/8oPhkQEARBkNwKs23N8Cw4). Exact strings for `src/feed/commentary.ts` (and the lights-out lines in `src/RaceStartCountdown.tsx`). Not canon until it is in `docs/STORY_BIBLE.md`; the bible's voice rules apply.

## The rules (Pax, Oct 14)

- **The caller is a role, not a person.** The feed names the institution, and it grows with the step:
  - Locals: **The PA** (megaphone icon)
  - State: **{State} Radio**, e.g. *Ohio Radio* (radio-tower icon)
  - Nationals: **The Network** (old-microphone icon)
  - Your drivers are the only names that matter. They replace The Booth, Mister Marbles and The Track in the Ace America run.
- **The Interval feels barely wrong:** polite, a little too formal, a little out of time. Never a threat, never knowing, never explained.
- **The Interval is rare and comes after big moments.** Never at Locals. At State and Nationals it can cut in only right after a moment worth hearing (the list below). It is rarer at State and less rare at Nationals. **Steward sets the odds.** At most one per race.
- **The caller never mentions the Interval.** The next line carries on as if nothing happened.

## Placeholders

| Token | Means |
|---|---|
| `{driver}` | the driver the moment is about |
| `{driver2}` | the other driver (overtakes) |
| `{no}` | the car's racing number |
| `{town}` | Locals: your town. State: the driver's home town (each driver is their town's Ace). Nationals: your town |
| `{state}` | State: the state you race in. Nationals: the driver's state |
| `{track}` | the track's name ([tracks.md](tracks.md)) |
| `{lap} / {laps}` | this lap / the race's laps |
| `{garage}` | your garage's name |

New data the feed needs: each driver's **home town** at State and **home state** at Nationals.

## The line pools

The engine picks one line per moment, as `pick(pool, seed)` does today. Big moments (crash, pileup, lead change, final lap, finish, title) keep the dark `story-big` style. The title line uses the sash script.

### Locals · The PA

| Moment | Lines |
|---|---|
| Lights out | `And they're off! Folks along the fence, mind your elbows.` · `There goes the flag. Somebody tell Gus he can stop waving it now.` · `Away they go! Hot dogs are a nickel at the stand by the gate.` |
| Overtake | `{driver} goes by {driver2}. Nice and tidy.` · `Ooh, {driver} sneaks past {driver2} on the inside!` · `Number {no} is through. {driver2} didn't care for that.` |
| Lead change | `{driver} leads now, folks! Leads!` · `New leader: {driver}. Write that on your program.` · `{driver} out front! Didn't see that coming, and I've got the best seat in the house.` |
| Quick pit stop | `Quick stop for {driver}. Those boys have been practising behind the barn.` · `{driver} in and out, faster than the ticket line.` |
| Slow pit stop | `Slow one for {driver}. Somebody's dropped the wheel nut in the hay.` · `{driver} still sitting in the pits. Take your time, fellas. We're not going anywhere.` |
| Fastest lap | `Quickest lap of the day to {driver}. Somebody check that stopwatch.` · `{driver} with the fastest one yet. Stopwatch says so, and the stopwatch don't lie.` |
| Halfway | `Halfway, folks. Lap {lap} of {laps}. Pie judging right after.` · `Uh, number {no} is still going, folks. Hot dogs are a nickel.` · `That's halfway. If you're parked by the cattle barn, you're fine.` |
| Crash | `{driver}'s into the hay bales. They're waving. They're fine.` · `Uh oh, {driver} is off into the fence. Nobody hurt but the fence.` |
| Pileup | `Oh, that's a pile of 'em. Everybody's up and out. Tow truck to turn two, please.` · `Three cars in a heap at the far turn. All fine, all embarrassed.` |
| Blowout | `{driver} has lost a tire. If it rolled into your picnic, please bring it back.` · `Tire's gone on number {no}. That's {driver}'s afternoon.` |
| Mechanical | `{driver} is coasting. Something under that hood just quit for the day.` · `Smoke from {driver}'s car. That's a long walk back, friend.` |
| Rain | `Bit of rain, folks. Racing goes on. Cover your pie.` · `Here comes the rain. Drivers, ease up. Everybody else, the cattle barn is dry.` |
| Final lap | `Last lap! Everybody up off the hay bales!` · `White flag! One more time around.` |
| Finish | `{driver} wins it! Ribbons at the grandstand, folks.` · `And that's {driver}! Somebody find the fella with the trophy.` |
| Title won | `That's the season! Congratulations, {garage}. You are now Ace {town}.` · `Folks, {garage} wins it all. Say hello to Ace {town}! Somebody find them a sash.` |

### State · {State} Radio

| Moment | Lines |
|---|---|
| Lights out | `Green flag at {track}! Good afternoon, {state}, and they're away.` · `And the field is off! A fine day for it here at {track}.` · `They're away, and what a sight from up here in the booth.` |
| Overtake | `{driver} goes past {driver2}, and the {town} car moves up!` · `Lovely move by {driver}. {driver2} never saw it coming.` · `Through goes {driver}! They'll be talking about that pass in {town}.` |
| Lead change | `{driver} takes the lead! The {town} car is giving the capital something to think about!` · `A new leader: {driver}! You'll want to turn the set up for this.` · `{driver} to the front, and the whole state is leaning toward the radio.` |
| Quick pit stop | `A smart stop by {driver}'s crew. That's championship work.` · `In and out for {driver}. Somebody give that crew a medal.` |
| Slow pit stop | `Trouble in the pits for {driver}. Precious seconds, listeners.` · `A long stop for {driver}. The crew will hear about that one on the drive home.` |
| Fastest lap | `Fastest lap to {driver}! The timekeepers are reaching for a fresh pencil.` · `{driver} sets the best lap of the day. The {town} car is flying.` |
| Halfway | `Halfway at {track}, lap {lap} of {laps}. Stay with us, {state}.` · `Halfway home. This broadcast comes to you courtesy of your local garage.` |
| Crash | `{driver} is off and into the barrier! A hand is up. They're all right.` · `Contact, and {driver} is out! Hard luck for {town}.` |
| Pileup | `Several cars tangled at the hairpin! Everyone is climbing out, thank goodness.` · `A tangle at the first turn! The marshals are waving them all clear.` |
| Blowout | `A tire gone on {driver}'s car! That's a hard way to end a day.` · `Blowout for {driver}! The {town} car limps for the pits.` |
| Mechanical | `{driver} slows, smoke from the engine. A sad sight for {town}.` · `The engine has let go for {driver}. They'll push it home tonight.` |
| Rain | `Rain over {track}! Careful now, gentlemen. Careful.` · `The rain has arrived, and the order may be about to change.` |
| Final lap | `Final lap at {track}! Turn it up, {state}!` · `White flag! One lap for the points.` |
| Finish | `{driver} wins at {track}! What a day for {town}!` · `Checkered flag, and it's {driver}! {town} will be ringing the bells tonight.` |
| Title won | `From {town}, ladies and gentlemen: the new Ace {state}! Congratulations, {garage}.` · `That's the title! {garage} of {town} is Ace {state}, and they're going to Nationals.` |

### Nationals · The Network

| Moment | Lines |
|---|---|
| Lights out | `Good afternoon, America, and anyone listening further out! They're away!` · `From coast to coast: the green flag flies at {track}!` · `Fifty-two states, one field, and they're off!` |
| Overtake | `{driver} through on {driver2}! {state} is on the move.` · `There's a move, old sport! {driver} by {driver2}!` · `{driver} goes past {driver2}. A lovely bit of driving.` |
| Lead change | `{driver} leads Nationals! Somewhere in {state}, a whole town just stood up.` · `The lead changes hands! {driver}, for {state}!` · `{driver} to the front! Hold on to your hats, America.` |
| Quick pit stop | `A splendid stop by {driver}'s crew. Seconds, ladies and gentlemen. Seconds.` · `In and out for {driver}. {state} builds them quick.` |
| Slow pit stop | `Oh, a costly stop for {driver}. The whole nation felt that one.` · `A slow stop for {driver}. Somewhere in {state}, a radio has been switched off in disgust.` |
| Fastest lap | `Fastest lap of Nationals to {driver}! They'll be talking about that one in {state}.` · `{driver} with the lap of the day. Simply splendid.` |
| Halfway | `Halfway at Nationals, lap {lap} of {laps}. Fifty-two states holding their breath.` · `Halfway at {track}. If you're just tuning in, America: it's wonderful.` |
| Crash | `{driver} is into the wall! They're out and waving to the grandstand. Splendid.` · `Contact! {driver} is out, and {state}'s hopes with them.` |
| Pileup | `A tangle at the first turn, several cars! Everyone is all right. The grandstand applauds them out.` · `Three cars together at the far end! All out, all walking, all furious.` |
| Blowout | `A tire has burst on {driver}'s car! A cruel end for {state}.` · `Blowout! {driver} wrestles it home on three good wheels.` |
| Mechanical | `{driver} slows to a stop. The engine has given all it had, old sport.` · `Smoke from {driver}'s car. {state} will have to wait another year.` |
| Rain | `Rain at {track}! Now we shall see who can really drive.` · `The heavens open over {track}, and America leans closer to the set.` |
| Final lap | `Final lap of Nationals! America, this is the one.` · `The white flag! One lap for Ace America.` |
| Finish | `{driver} wins for {state}!` · `Checkered flag! {driver} wins at {track}, and {state} goes wild!` |
| Title won | `Ladies and gentlemen, the new Ace America! Congratulations, {garage}.` · `From {town}, {state}, to the top of the country. {garage}: you are Ace America.` |

**Moment → today's notification:** lights out = the countdown's go message; overtake = `overtake`; lead change = `lead_change`; quick / slow pit stop = `quick_pit_stop` / `slow_pit_stop`; fastest lap = `fastest_lap`; halfway / final lap = `milestone` (HALFWAY / FINAL LAP); crash / pileup / blowout / mechanical = `crash` (by title); rain = the wet weather turning on; finish = `finish`; title won = the race that wins the step's title (new).

The canon title line stays on the sash screen: *"Congratulations, you are now Ace Ohio."*

## The Interval

Shown as its own feed item. **Persona:** The Interval (musical-notes icon). **Lap:** "Lap —".

- Before the line: *The coverage stops. A short tune.*
- After the line: *The tune again. The coverage resumes.*
- **Look (proposal, Hub's call):** a pale grey-green panel off the program's palette (`#dfe4d8`, ink `#26324a`), a double rule on the left, typewriter text (Special Elite), the persona spaced a little too wide.

| No. | Line | Can follow |
|---|---|---|
| 1 | `We are enjoying the season very much. Congratulations, {state}. Carry on.` | A title won (State or Nationals) |
| 2 | `Good afternoon. That was a very good lap. Thank you. That is all.` | A fastest lap |
| 3 | `We have been listening since 1908. Lap {lap} is our favourite so far.` | Any lap (the plain random one) |
| 4 | `A short message for {driver}: well driven. You need not reply.` | A last-lap lead change |
| 5 | `It is raining at {track}. We did not do that. We do like it, though.` | Rain arrives |
| 6 | `They tell us the cars are no faster this year. Good. We like them as they are.` | Lights out at Nationals |
| 7 | `Everyone is all right. We checked. Please continue.` | A pileup everyone walks away from |
| 8 | `Hello again, America. The grandstands look very full. Good.` | Lights out at Nationals |
| 9 | `To the crew of {driver}: that was very quick. We counted. Thank you.` | A quick pit stop |
| 10 | `Every quarrel this week was settled fairly, on a circuit. We are proud of you all. Carry on.` | The final race of a step |

**Big moments it can follow:** a fastest lap, rain arriving, a last-lap lead change, a pileup everyone walks away from, a quick pit stop, the final race of a step, a title won, and lights out at Nationals. No. 3 is the plain one for any of these.

## Not in this pass

- Named callers (Pax: roles for now).
- Commentary for in-race effects (`effect_applied` passes through as today).
- Mister Marbles' bet lines (betting is retired).
