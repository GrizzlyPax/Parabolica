# The 52 looks: state colours (#708)

Every state, plus DC and Puerto Rico, as the **State step** wears it. Colours only; the wheel-flags come later, drawn by Pax in Figma. Picked by Pax on Oct 14 from [the 52 Looks page](https://claude.ai/artifact/Fgj4cdrEXPE9kUqzWUAy1v). This table is the **single source** for `src/data/states.ts` and the `STATE_LOOKS` stub in `src/look/step.ts`.

## The rules (Pax, Oct 14)

- **Flag plus identity.** A state's flag colours where the flag is distinctive (Maryland, New Mexico, Arizona). Where it is a seal on blue, the state's own thing instead: Georgia peach, Kansas sunflower, Maine blueberry.
- **Every state distinct.** No two primaries are near-twins (the closest pair, Illinois and Oregon, is a Lab ΔE of 5.5). Where primaries sit close, the accents differ.
- **A dark ground per state.** `ground` = the secondary mixed 40% into `#05070d`. Still dark, but each state's own. Blank would mean the navy `#111a33`.
- **Arizona is deep copper `#A6491B`** with cream ink, close to the feel of the mock-up. The bright `#CE5C17` took dark ink under the game's rule.
- **Ohio's accent is cream `#EFE6D2`** (the burgee's white O). It replaces the gold `#C99A3A` in `states.ts`.

## What each colour does

| Field | Where it shows (`src/look/tokens.css`, `[data-step='state']`) |
|---|---|
| primary | the state bar, buttons, the sash edge, bunting (`--ace-accent`, `--ace-sash-edge`) |
| secondary | sash lettering, button shadows, bunting (`--ace-sash-ink`, `--ace-navy-2`) |
| accent | highlights, the wheel, the "now" rung; pops on the dark ground |
| ground | the step's background (`--ace-state-ground`) |
| ink | automatic: `inkFor(primary)` (white or `#0b0b0c`). Listed here for reference only |

**Checks every row passes:** secondary on the sash cream `#f6f0e2` ≥ 4.5:1 · accent on its ground ≥ 4.5:1 · accent on navy ≥ 3:1.

## The table

In `look(id, primary, secondary, accent, note)` order, the way rows land in `src/data/states.ts`, plus `ground` and the ink `inkFor` gives.

### The Northeast

| id | state | primary | secondary | accent | ground | ink | note |
|---|---|---|---|---|---|---|---|
| me | Maine | `#4B3F8C` | `#1E1838` | `#E2533A` | `#0F0E1E` | white | Wild blueberries and a lobster-red accent; the flag's North Star is the wheel |
| nh | New Hampshire | `#5E6670` | `#23272C` | `#B9A2E0` | `#111419` | white | The Granite State's grey, with purple lilac (the state flower) |
| vt | Vermont | `#1B4D3E` | `#0F241C` | `#E8892E` | `#091313` | white | The Green Mountains, with a maple-in-October accent |
| ma | Massachusetts | `#A01C3F` | `#3A0A18` | `#F0C987` | `#1A0811` | white | Cranberry bogs, with the flag's gold-trimmed shield |
| ri | Rhode Island | `#2F7D7A` | `#0F3332` | `#EBC155` | `#09191C` | white | The Ocean State's sea glass, with the flag's gold anchor |
| ct | Connecticut | `#244A9A` | `#0F1F45` | `#95C15A` | `#091123` | white | The flag's royal blue shield, with its green grapevines |
| ny | New York | `#1D3570` | `#0D1838` | `#7FCBAE` | `#080E1E` | white | Empire blue, with the Statue of Liberty's copper-green |
| nj | New Jersey | `#E2C38E` | `#1F4E79` | `#7FB2E5` | `#0F2338` | dark | The flag's buff field and Jersey blue |
| pa | Pennsylvania | `#2B4C80` | `#132443` | `#D29143` | `#0B1323` | white | The Keystone flag's blue, with Liberty Bell bronze |
| de | Delaware | `#3A6E97` | `#14304A` | `#EBCB9E` | `#0B1725` | white | Colonial blue and buff, straight off the flag's diamond |
| md | Maryland | `#F0B323` | `#1A1A1A` | `#F04A55` | `#0D0F12` | dark | The Calvert gold and black, with the Crossland red |

### Pacific, DC and Puerto Rico

| id | state | primary | secondary | accent | ground | ink | note |
|---|---|---|---|---|---|---|---|
| dc | District of Columbia | `#F3EFE8` | `#9E1528` | `#FF6070` | `#420D18` | dark | The flag's white field with its red stars and bars |
| ak | Alaska | `#0F4C8A` | `#081F3B` | `#F5C518` | `#06111F` | white | The flag's deep blue, with the Big Dipper's gold |
| hi | Hawaii | `#13849A` | `#08343E` | `#F2D04B` | `#061921` | dark | Pacific blue, with the yellow hibiscus (the state flower) |
| pr | Puerto Rico | `#E4572E` | `#0B2C59` | `#79C2F2` | `#07162B` | dark | Flamboyán red-orange, with the light-blue triangle of 1895 |

### The Southeast

| id | state | primary | secondary | accent | ground | ink | note |
|---|---|---|---|---|---|---|---|
| va | Virginia | `#F0B9C8` | `#1A2B5C` | `#E8414B` | `#0D152D` | dark | Dogwood blossom, with the flag's blue and a cardinal red |
| wv | West Virginia | `#34363D` | `#16171B` | `#EAAA00` | `#0C0D13` | white | Coal country, with the old gold of the mountains |
| nc | North Carolina | `#5A9FD6` | `#13294B` | `#E04A4A` | `#0B1526` | dark | Carolina sky blue, with the flag's red bar |
| sc | South Carolina | `#2D2F7E` | `#13143A` | `#F3F1EA` | `#0B0C1F` | white | Indigo, the flag's own colour, with the white palmetto and crescent |
| ga | Georgia | `#F2A07B` | `#7A1D24` | `#F2C14E` | `#341016` | dark | Peach, with the flag's red stripes and gold arch |
| fl | Florida | `#F0861F` | `#7E1E14` | `#3CC7B6` | `#351010` | dark | Orange groves, with the Gulf's teal |
| al | Alabama | `#A8172E` | `#3A0911` | `#F4A9B8` | `#1A080F` | white | The flag's crimson saltire, with the camellia (the state flower) |
| ms | Mississippi | `#3B7D46` | `#14321B` | `#F4EBD3` | `#0B1813` | white | Magnolia leaves and the new flag's magnolia bloom |
| tn | Tennessee | `#9B1B30` | `#132E66` | `#BBA2EE` | `#0B1731` | white | The flag's red field and blue circle, with the iris (the state flower) |
| ky | Kentucky | `#C21E56` | `#3E0A1C` | `#86B9E8` | `#1C0813` | white | A garland of roses, with bluegrass blue |
| la | Louisiana | `#5B2A86` | `#24103A` | `#F2C14E` | `#110B1F` | white | Purple, green and gold, with the flag's pelican |
| ar | Arkansas | `#D23A4A` | `#1C2E6B` | `#EEF3FA` | `#0E1733` | white | The flag's red, blue-ringed white diamond (the Diamond State) |

### The Midwest

| id | state | primary | secondary | accent | ground | ink | note |
|---|---|---|---|---|---|---|---|
| oh | Ohio | `#B8312F` | `#1D2B4F` | `#EFE6D2` | `#0F1527` | white | Ohio's burgee: red stripes, the blue triangle, the white O as the wheel |
| mi | Michigan | `#2A7AB8` | `#0E2E4E` | `#F25466` | `#091727` | white | Great Lakes blue, with cherry red |
| in | Indiana | `#8E3B2A` | `#2E120C` | `#F2B33A` | `#150B0D` | white | The Brickyard's brick, with the flag's gold torch |
| il | Illinois | `#1F3E6E` | `#0E1D36` | `#EE7E2F` | `#09101D` | white | The eagle's shield blue, with a prairie-sunset orange |
| wi | Wisconsin | `#E9C46A` | `#5B3A1A` | `#7DB8E8` | `#271B12` | dark | Cheddar and dairy-barn brown, with Lake Michigan blue |
| mn | Minnesota | `#6FB2DD` | `#0B2545` | `#F7F5EF` | `#071323` | dark | The new flag: lake blue, the dark state shape, a white North Star |
| ia | Iowa | `#5F9230` | `#1F3510` | `#F2C94C` | `#0F190E` | dark | Corn in July, with corn-silk gold |
| mo | Missouri | `#B9C2CC` | `#111D45` | `#F2555A` | `#0A1023` | dark | The Gateway Arch's steel, with the flag's blue and red |

### The Plains and Mountains

| id | state | primary | secondary | accent | ground | ink | note |
|---|---|---|---|---|---|---|---|
| nd | North Dakota | `#D6B370` | `#2F4B7C` | `#E8749A` | `#162239` | dark | Wheat, with the flag's blue and a prairie rose |
| sd | South Dakota | `#C2814F` | `#3A2213` | `#7FB8E8` | `#1A120F` | dark | The Badlands' banded clay, with the flag's sky blue |
| ne | Nebraska | `#8F9440` | `#2C2E12` | `#E7B93A` | `#15170F` | dark | The Sandhills' prairie grass, with goldenrod (the state flower) |
| ks | Kansas | `#F2A900` | `#4E3214` | `#5C9BD6` | `#221810` | dark | The sunflower: petal gold and seed-head brown, with Kansas sky |
| ok | Oklahoma | `#A8437A` | `#3B1530` | `#79B9E6` | `#1B0D1B` | white | Redbud blossom, with the flag's sky blue |
| mt | Montana | `#4A8FD0` | `#0F2A4A` | `#E2B33C` | `#091525` | dark | Big Sky blue, with the motto's gold (Oro y Plata) |
| wy | Wyoming | `#6B4A2E` | `#2A1B10` | `#E8D3A6` | `#140F0E` | white | The bucking horse's saddle brown, with prairie straw |
| co | Colorado | `#6F7FCB` | `#1C2457` | `#F5C116` | `#0E132B` | dark | The columbine (the state flower), with the flag's gold disc |
| ut | Utah | `#BC4E2D` | `#3E1610` | `#F0E3C2` | `#1C0D0E` | white | Red rock country, with the beehive's honey cream |
| id | Idaho | `#5E1A2B` | `#250A12` | `#E3B04B` | `#12080F` | white | The star garnet, Idaho's gem, with gold |

### The Southwest and West

| id | state | primary | secondary | accent | ground | ink | note |
|---|---|---|---|---|---|---|---|
| tx | Texas | `#BF0A30` | `#002868` | `#9DB7F2` | `#031431` | white | The Lone Star flag's red and blue, with a bluebonnet accent |
| nm | New Mexico | `#FFD100` | `#9C1328` | `#35B9A8` | `#410C18` | dark | The flag's yellow and red Zia, with turquoise |
| az | Arizona | `#A6491B` | `#002868` | `#FED700` | `#031431` | white | Copper (the flag's star), with the flag's blue and sunburst gold |
| nv | Nevada | `#0B4FB0` | `#0A1F4D` | `#C9CFD8` | `#071127` | white | The flag's cobalt, with Silver State silver |
| ca | California | `#7A4E2D` | `#341F12` | `#F2B33D` | `#18110F` | white | The bear on the flag: grizzly brown, with Golden State gold |
| or | Oregon | `#123A63` | `#0A1D33` | `#F2C230` | `#07101C` | white | Navy and gold, the only flag with two sides |
| wa | Washington | `#1E6B46` | `#0B2A1B` | `#D8E9A8` | `#071513` | white | The Evergreen State, with new-growth green |

## For the builder

- `states.ts` has no `ground` field yet; `step.ts`'s `StateLook` does (`ground?`). Add it to `look()` or derive it the same way (secondary 40% into `#05070d`).
- Ohio and Arizona change from what is in `states.ts` today; Vermont's accent goes gold → maple `#E8892E`; Texas's accent goes cream → bluebonnet `#9DB7F2`.
- The notes are flavour for the State screen and the flag brief; Pax may rewrite them when he draws the flags.
