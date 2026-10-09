# Car names

*📻 Radio with Pax, Oct 10, 2026 ([Car names](https://github.com/GrizzlyPax/Parabolica/issues/568)). Hub builds it ([#569](https://github.com/GrizzlyPax/Parabolica/issues/569)). Mock-up: [Car Names](https://claude.ai/artifact/VPXHRZN55XSCHeMnQuhFAt). Not canon; word lists and weights only.*

## TL;DR
- **Retire the sci-fi pool.** No more "Zenith XR-22": the 32 prefixes, 19 suffixes, 20 two-letter codes and 6 formats in `src/generators/cars.ts` all go.
- **Name cars the way real teams do, in five styles** (Pax picked all):
  - **People's names** (what the crew calls her): *Bessie*, *Old Margaret*, *Big Stanley*
  - **Heritage and model years:** *Type 56*, *Corriva Special*, *Mk III*
  - **Workshop nicknames:** *The Brick*, *Old Faithful*, *The Mule*
  - **Plain chassis codes:** *P24*, *SR-3*
  - **Farm and household words, rarely:** *Teapot*, *Wheelbarrow*
- **Mix A (balanced):** people 35 · heritage 20 · nicknames 20 · codes 15 · farm + household 10.

## A sample rack
| Car | Style |
|---|---|
| Bessie | people |
| Type 56 | heritage |
| The Brick | nickname |
| Old Margaret | people |
| P24 | code |
| Corriva Special | heritage |
| Big Stanley | people |
| Old Faithful | nickname |
| Mk III | heritage |
| Teapot | farm + household |

## Mix (weights out of 100)
| Style | Weight |
|---|---|
| People's names | 35 |
| Heritage + model years | 20 |
| Workshop nicknames | 20 |
| Plain chassis codes | 15 |
| Farm + household words | 10 |

## Styles, pools and formats
Formats use `{tokens}`; each style picks a format by weight, then fills the tokens.

### 1. People's names
- **Names (40):** Bessie · Margaret · Doris · Mabel · Agnes · Edna · Peggy · Rosie · Dot · Gladys · Ivy · Hilda · Betty · Lottie · Winnie · Nell · Elsie · Maud · Vera · Sylvia · Pearl · Florrie · Connie · Marjorie · Beryl · Hattie · Ida · Mavis · Queenie · Nancy · Gus · Stanley · Albert · Barnaby · Reggie · Clive · Norman · Wilf · Dennis · Percy
- **Prefixes (8):** Old · Big · Little · Lady · Auntie · Miss · Dear Old · Sweet
- **Roman numerals:** II · III · IV · V · VI · VII

| Format | Weight |
|---|---|
| `{name}` | 60 |
| `{pre} {name}` | 30 |
| `{name} {roman}` | 10 |

### 2. Heritage and model years
- **Words (10):** Type · Model · Series · Mark · Special · Sprint · Tourer · Grand Prix · Competition · Club
- **Places (12):** Corriva · Saint Orrin · Lumen · Ambergate · Calder · Kestrel · Moorland · Harbour · Quarry · Old Hill · Tessaly · Caldera (soft canon from [team-identity](team-identity.md) and the spares; not final, see Traps)
- `num2` = 2–98 · `num4` = one of 1100 · 1300 · 1500 · 1750 · 2000 · 2500 · 3000 · `year` = '50 to '98 · `roman` as above

| Format | Weight |
|---|---|
| `{word} {num2}` | 35 |
| `{place} Special` | 20 |
| `Mk {roman}` | 15 |
| `{word} {year}` | 15 |
| `{place} {num4}` | 15 |

### 3. Plain chassis codes
- **Letters (14):** A · B · C · D · F · H · K · M · P · R · S · T · V · W
- **Pairs (10):** SR · TR · GP · RS · LM · MR · DB · JW · HB · CK
- `num1` = 1–9 · `num2` = 2–98

| Format | Weight |
|---|---|
| `{L}{num2}` | 50 |
| `{PAIR}-{num1}` | 30 |
| `{L}{num1}{L2}` | 20 |

### 4. Workshop nicknames (28)
The Brick · Old Faithful · The Bathtub · The Toaster · The Biscuit Tin · The Wardrobe · The Mule · The Spare · Number Two · The Wedge · The Kettle · Sunday Best · Tin Lizzie · Green Bean · The Bus · The Pram · Lead Sled · The Lump · The Shoebox · Big Red · The Plank · The Banger · The Old Girl · The Beast · The Rocket · Sixpence · The Trolley · The Lunchbox

### 5. Farm and household words (20)
Teapot · Wheelbarrow · Hayrick · Colander · Doorstop · Mangle · Butter Churn · Scarecrow · Haybale · Milk Churn · Toast Rack · Coal Scuttle · Bread Bin · Washboard · Pitchfork · Sheepdog · Egg Cup · Mustard Pot · Hot Water Bottle · Tea Cosy

## Rules for the builder (#569)
1. **Own seed stream first** (as driver names did in v0.5.1): car names must not draw from the car-stats roll, so stats and the fingerprint don't move. Then swap the pools.
2. **One draw:** pick the style by the mix, then the format by its weights, then fill the tokens.
3. **No duplicates in one season's rack:** if a name repeats, redraw (on the same names stream).
4. **Delete** `CAR_PREFIXES_GENERIC`, `CAR_SUFFIXES`, `CAR_ACRONYMS` and the old 6-format switch; update any glossary/World Deck listing and tests that import them.
5. **Length:** the longest names ("Hot Water Bottle", "Ambergate Special") fit the 220px name column with the vehicle icon; check one on a phone.

## Traps
- **Places are soft canon.** The heritage pool reuses the world's place names (Corriva, Saint Orrin, Lumen, Ambergate…). If #370 renames tracks or the bible renames places, update this pool to match.
- **Codes stay plain on purpose:** no XR/ZX/QX-style letters. Pax called those "garbledy-gook".
