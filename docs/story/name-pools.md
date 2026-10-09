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
