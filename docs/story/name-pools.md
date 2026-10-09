# Name pools: proposal

*📻 Radio with Pax, Oct 9, 2026 ([Name pools](https://github.com/GrizzlyPax/Parabolica/issues/466)). Not canon. Hub lands it in code ([#467](https://github.com/GrizzlyPax/Parabolica/issues/467)). Ids and numbers don't change; this is word lists and tier weights only.*

## TL;DR
- **Grounded, with a twist.** Most drivers keep real names from around the world; the joke comes from a few names where one half is absurd: *Hollyhock Abenov*, *Aditya Undefined*.
- **New tier: hybrid** (one absurd half on a real name). **Full-absurd names drop** from 17% to 8%.
- **The mononym list retires.** Instead, any name has a tiny (about 1%) chance of showing as one word: *Gustavo*, *Okonkwo*, *Ottoman*.
- **More of the world** in real names: 16 new traditions.
- **New absurd words:** almanac and farm (*Thistle*, *Hedgerow*), household objects (*Doily*, *Sideboard*).
- **League names:** add understated (*The Adequate Cup*) and countryside (*The Harvest Rally*) to today's dramatic ones.
- **Backstories and quirks: parked.** No Season screen shows them yet (only the old league Grid screen, which is going).

## What a grid looks like
A representative 16-car grid with the new pools and mix (new words in **bold**):

| Pos | Driver | Kind |
|---|---|---|
| P1 | **Ingrid** Chen | |
| P2 | Kiprono Habib | |
| P3 | **Aibek** Sato | |
| P4 | Matthias Wolf | |
| P5 | **Hollyhock** **Abenov** | hybrid |
| P6 | **Lerato** **Tupou** | |
| P7 | Anan Klein | |
| P8 | **Madina** **Doyle** | |
| P9 | **Ottoman** | one word |
| P10 | Riku Nasser | |
| P11 | Aditya Undefined | hybrid |
| P12 | **Giulia** **Kamau** | |
| P13 | Quandary **Stubble** | absurd |
| P14 | **Emre** Okafor | |
| P15 | Hannah **Quispe** | |
| P16 | **Siobhan** Nakamura | |

*(Kiprono, Lerato, Anan, Riku… are new; Habib, Sato, Nasser are today's. Real names mix freely across traditions, as today.)*

## Tier mix (proposal)
| Kind | Today | Proposed | Example |
|---|---|---|---|
| Real (international) | 72% | **78%** | Giulia Kamau |
| Hybrid (new): absurd first + real last, or real first + absurd last, 50/50 | — | **12%** | Hollyhock Abenov · Aditya Undefined |
| Absurd (both halves) | 17% | **8%** | Quandary Stubble |
| Mononym (own list) | 9% | **retired** | — |
| Glitch (corrupted real name) | 2% | 2% | (unchanged transform) |
| **One word** (new rule, on top of the above) | — | **~1%** of names | Ottoman · Okonkwo |

- **One-word rule:** after any non-glitch name is rolled, a ~1% chance keeps one half: the first name most of the time (say 3 in 4), otherwise the last. So *any* name can come up as a one-name legend (Pax: "very rare, and not one-word-name specific").
- **Retire `MONONYMS`** (the 40-word list). Tests that check the mononym tier need updating to the one-word rule.
- Hybrid reuses the existing pools, so it needs no new list.

## Real names: 16 new traditions
Added to `INTL_FIRST_NAMES` / `INTL_LAST_NAMES` (169 / 166 → 273 / 270). Flat, independent draws, as today.

| Tradition | First names | Last names |
|---|---|---|
| Italian | Luca, Giulia, Marco, Chiara, Lorenzo, Francesca, Matteo, Elena | Rossi, Russo, Esposito, Bianchi, Romano, Colombo, Ricci, Greco |
| Nordic + Finnish | Erik, Astrid, Lars, Ingrid, Magnus, Sigrid, Anders, Freya | Johansson, Andersen, Nilsson, Berg, Halvorsen, Lund, Dahl, Virtanen |
| Irish + Scottish | Ciarán, Niamh, Declan, Aoife, Callum, Isla, Fergus, Siobhan | Murphy, Byrne, O'Neill, Gallagher, MacLeod, Fraser, Doyle, Quinn |
| Dutch + Flemish | Daan, Sanne, Bram, Fleur, Joris, Anouk | de Vries, Janssen, Bakker, Visser, van Dijk, Peeters |
| Greek | Nikos, Eleni, Yannis, Dimitra, Kostas, Katerina | Papadopoulos, Georgiou, Nikolaidis, Karras, Vlachos, Antonopoulos |
| Turkish | Emre, Elif, Burak, Zeynep, Mert, Ayşe | Yılmaz, Kaya, Demir, Şahin, Çelik, Aydın |
| Persian | Dariush, Shirin, Kian, Parisa, Arash, Leila | Hosseini, Tehrani, Karimi, Moradi, Jafari, Rostami |
| Hebrew | Noa, Eitan, Tamar, Ari, Yael, Itai | Cohen, Levi, Mizrahi, Friedman, Shapiro, Peretz |
| East African | Wanjiru, Kiprono, Abebe, Selam, Baraka, Amani, Tesfaye, Neema | Otieno, Kamau, Mwangi, Haile, Tadesse, Wanyama, Njoroge, Mutua |
| Southern African | Thabo, Lerato, Sipho, Nandi, Themba, Zanele | Dlamini, Nkosi, Mokoena, Ndlovu, Khumalo, Mahlangu |
| Filipino | Paolo, Bea, Jericho, Angelica, Marlon, Kristine | Reyes, dela Cruz, Bautista, Villanueva, Aquino, Dizon |
| Thai | Somchai, Malee, Anan, Ploy, Kittisak, Nok | Srisuk, Chaiyaporn, Wongsakul, Boonmee, Rattanakorn, Saelim |
| Pacific (Māori, Samoan, Tongan, Hawaiian) | Tama, Aroha, Wiremu, Moana, Sione, Leilani | Ngata, Parata, Tuilagi, Faleolo, Tupou, Kealoha |
| Andean (Quechua / Aymara) | Inti, Killa, Wayra, Ccori, Amaru, Sisa | Mamani, Quispe, Condori, Huamán, Choque, Apaza |
| Hungarian | Bence, Réka, Levente, Zsófia, Gergő, Dóra | Nagy, Tóth, Szabó, Horváth, Varga, Kiss |
| Central Asian | Aibek, Aigerim, Timur, Dana, Ruslan, Madina | Abenov, Seitkali, Nurlanov, Tokayev, Iskakov, Bekova |

**Watch the spelling:** keep the diacritics (Ciarán, Yılmaz, Şahin, Huamán, Zsófia, Gergő, Réka, Dóra, Ayşe, Çelik, Aydın) and the particles (de Vries, van Dijk, dela Cruz, O'Neill). Particles stay lowercase; short names ("Bea", "Noa") are intentional.

## Absurd names: two new flavours
Pax picked **almanac + farm** and **household objects**. These feed both the absurd tier and the hybrid tier.

| Pool | Added | Count |
|---|---|---|
| `ABSURD_FIRST_NAMES` (almanac + farm) | Harvest, Solstice, Equinox, Bramble, Thistle, Barley, Turnip, Sleet, Gale, Hollyhock | +10 |
| `ABSURD_FIRST_NAMES` (household) | Doily, Teaspoon, Lampshade, Ottoman, Thimble, Colander, Kettle, Duvet, Spatula, Doorstop | +10 |
| `ABSURD_LAST_NAMES` (almanac + farm) | Furrow, Hedgerow, Haybale, Millpond, Weathervane, Scarecrow, Almanac, Plowshare, Turnipseed, Stubble | +10 |
| `ABSURD_LAST_NAMES` (household) | Sideboard, Doormat, Breadbin, Coathook, Mantelpiece, Footstool, Hatstand, Tablecloth | +8 |

Totals: absurd firsts 64 → 84, lasts 56 → 74. **No cuts.**

Sample names: *Thistle Hedgerow* · *Doily Okonkwo* · *Emre Sideboard* · *Kettle Weathervane* · *Barley Mantelpiece* · *Grace Haybale*.

## League names
Pax picked **understated** and **countryside**, to deflate today's drama now and then ("The Molten Circuit" stays).

| Pool | Added | Count |
|---|---|---|
| `LEAGUE_ADJECTIVES` (understated) | Modest, Reasonable, Adequate, Moderate, Regional, Municipal, Local, Seasonal, Fair-to-middling, Satisfactory | +10 |
| `LEAGUE_ADJECTIVES` (countryside) | Harvest, Midsummer, Midwinter, Weathered, Threadbare, Provincial, Rural, Hedgerow, Lamplit, Rainward | +10 |
| `LEAGUE_NOUNS` (fairs + gatherings) | Fair, Fête, Gathering, Muster, Pilgrimage, Show, Moot, Wake, Feast, Harvest Run | +10 |
| `LEAGUE_NOUNS` (old racing words) | Rally, Enduro, Hillclimb, Shield, Plate, Stakes, Challenge, Memorial, Trophy Run, Concours | +10 |

Totals: adjectives 90 → 110, nouns 66 → 86. **No cuts.**

Samples: *The Adequate Hillclimb* · *The Harvest Rally* · *The Municipal Grand Prix* · *The Midsummer Fête* · *The Reasonable Memorial* · *The Hollow Muster* · *The Provincial Enduro*.

## Parked: backstories and quirks
- **Why:** no Season Mode screen shows them. Today only the old league Grid screen displays a driver's backstory and quirk, and that screen is being removed. New lines would go nowhere.
- **When they come back:** once a driver card shows them (Draft, Paddock or a driver sheet). Pit decides if and when.
- **Ready when needed:** draft directions Pax saw on the review board (not picked yet): straight motorsport with one odd detail ("Third-generation driver. The first two generations are not discussed."), superstitions ("Touches the left mirror three times before every start"), paddock habits ("Names every set of tyres").

## For the builder (#467)
1. Append the real-name lists by tradition (keep the `// Tradition` comment headers).
2. Append the absurd and league words.
3. Tier weights: `international 0.78 · hybrid 0.12 · absurd 0.08 · corrupted 0.02`; drop `mononym`.
4. Hybrid: 50/50 between (absurd first + real last) and (real first + absurd last).
5. One-word rule: ~1% of non-corrupted names keep one half (first 3 in 4, else last); `shortName` follows the one-word path.
6. Determinism: new draws change every seeded grid, so this moves generated rosters for a given seed. Treat it as an intended content change (version bump, fingerprint update per `ship-pr`).

Review board used in the session (all candidates, including ones not picked): [Name Pools](https://claude.ai/artifact/HZ5J3T5Zgx31GdaQM2VAeB).


## Update, Oct 10: mostly American, fewer silly-plus-silly

*Pax, Oct 10: "quite international… rein it in, more Americanized or English-speaking." Review page: [American Grid](https://claude.ai/artifact/ScYntAXwNjiR3jyUd1GaNB) (today vs proposed, reroll).*

**What Pax asked about:** "first and last name always pulled from the same family?" For real names, no: the two halves are already drawn independently from the whole pool, and a matched pair like "Giulia Rossi" only happens by chance (~4%). What he noticed was the **full-absurd tier**, where both halves are silly ("Thistle Hedgerow"). That tier shrinks below.

### Decisions (Pax, Oct 10)
- **About 80% English-speaking, American flavour.**
- **Each half picks its own source:** a real first name is American 80% of the time, otherwise international; the last name rolls the same way, **separately**. Result: mostly "Tyler Brooks", sometimes America's own mix ("Diego Parker", "Megan Okafor"), occasionally fully international ("Kiprono Habib").
- **Fewer silly-plus-silly:** full-absurd 8% → **2%**, hybrid 12% → **16%** (so "Thistle Hedgerow" mostly becomes "Thistle Johnson").

### Tier weights (replaces the table above)
| Kind | Was | Now |
|---|---|---|
| Real | 78% | **80%** (each half 80% American / 20% international) |
| Hybrid (one absurd half on a real name) | 12% | **16%** (the real half follows the same 80/20 rule) |
| Absurd (both halves) | 8% | **2%** |
| Glitch | 2% | 2% |
| One word | ~1% on top | unchanged |

### New pools
- **`US_FIRST_NAMES` (104):** Tyler, Megan, Brandon, Ashley, Jake, Kayla, Cody, Dustin, Chase, Hunter, Brittany, Kevin, Jessica, Ryan, Amanda, Derek, Travis, Kyle, Shane, Bobby, Ricky, Dale, Darrell, Tony, Danny, Mike, Chris, Matt, Josh, Justin, Brad, Lauren, Taylor, Madison, Morgan, Casey, Jordan, Riley, Avery, Logan, Mason, Caleb, Wyatt, Colton, Brooke, Hailey, Savannah, Jenna, Kelsey, Rachel, Molly, Katie, Erin, Marcus, Darius, Andre, Terrence, Jamal, Keisha, Tasha, Luis, Miguel, Rosa, Nick, Joey, Becky, Tammy, Wade, Clint, Rusty, Buck, Earl, Jimmy, Dwayne, Stacy, Crystal, Amber, Heather, Nicole, Brian, Scott, Jeff, Greg, Todd, Lisa, Kim, Tina, Donna, James, Mary, William, Sarah, Thomas, Emily, George, Grace, Henry, Alice, Edward, Charlotte, Oliver, Amelia, Arthur, Florence
- **`US_LAST_NAMES` (89):** Johnson, Williams, Brown, Jones, Miller, Davis, Wilson, Anderson, Thomas, Taylor, Moore, Jackson, Martin, Thompson, White, Harris, Clark, Lewis, Robinson, Young, Allen, King, Wright, Scott, Hill, Green, Adams, Baker, Nelson, Carter, Mitchell, Roberts, Turner, Phillips, Campbell, Parker, Evans, Edwards, Collins, Stewart, Morris, Murphy, Cook, Rogers, Morgan, Cooper, Peterson, Bailey, Kelly, Howard, Cox, Ward, Richardson, Watson, Wood, Gray, James, Sullivan, McCoy, O'Brien, Dawson, Hayes, Brooks, Walker, Coleman, Foster, Bennett, Barnes, Reed, Ford, Lane, Holt, Webb, Shaw, Wells, Hughes, Smith, Price, Russell, Griffin, Wallace, Fisher, Henderson, Simmons, Jenkins, Perry, Powell, Long, Patterson
- Today's 16 English/Anglophone first and last names move into the US pools; the international pools keep everything else (257 / 253).

### For the builder
1. Add the two US pools; remove the 16 English entries from `INTL_FIRST_NAMES` / `INTL_LAST_NAMES` (they now live in the US pools).
2. Real-name halves: `first = rng() < 0.8 ? pick(US_FIRST) : pick(INTL_FIRST)`, same for last, independently. Keep a fixed number of draws per name so the stream doesn't shift by outcome.
3. Hybrid: the real half uses the same 80/20 rule.
4. Weights: `international 0.80 · hybrid 0.16 · absurd 0.02 · corrupted 0.02` (rename the `international` tier to `real` if convenient).
5. Names are on their own stream (v0.5.1), so this changes names only, never stats.
