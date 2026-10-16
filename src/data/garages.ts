// Rival garages (#695; docs/STORY_BIBLE.md → Garages): "generic and local, a
// mix of family names and places: Kowalski & Sons · Mabel's Garage ·
// Riverside Motor Works · The Corner Pump · Delgado Brothers · Two Bridges
// Garage." You name your own garage; everyone else's comes from here, seeded,
// never twice in one field. Colours come from the deck colours
// (data/teamColours.ts; inkFor reads them) and the logos from the team
// creator's twenty. The 28 deck teams no longer race in a run.
import { pick, type Rng } from '../engine/rng';
import { DECK_COLOURS } from './teamColours';
import { inkFor } from '../icons/ink';

/** American family names, the big melting pot of 1928. */
export const GARAGE_FAMILIES: readonly string[] = [
  'Kowalski', 'Delgado', 'Murphy', 'Schmidt', 'Rossi', 'Nakamura', 'Olsen', 'Washington', 'Haller', 'Okafor',
  'Brennan', 'Lindqvist', 'Marchetti', 'Novak', 'Duval', 'Petrov', 'Byrne', 'Vargas', 'Hoffmann', 'Kelly',
  'Sullivan', 'Garcia', 'Jensen', 'O\'Rourke', 'Fischer', 'Romero', 'Larsen', 'Costa', 'Doyle', 'Weber',
  'Moreno', 'Kaminski', 'Ferraro', 'Gallagher', 'Santos', 'Bauer', 'Reyes', 'Lund', 'Esposito', 'Walsh',
  'Hughes', 'Carter', 'Mitchell', 'Fletcher', 'Mason', 'Cooper', 'Turner', 'Baker', 'Porter', 'Shepherd',
];
/** First names for "Mabel's Garage". */
export const GARAGE_FIRSTS: readonly string[] = [
  'Mabel', 'Gus', 'Edna', 'Walt', 'Dot', 'Ernie', 'Pearl', 'Hank', 'Opal', 'Sal', 'Ruby', 'Mack', 'Vera', 'Lou', 'Ida', 'Buck', 'Nell', 'Otto', 'Hattie', 'Cy',
];
/** Local landmarks and streets. */
export const GARAGE_PLACES: readonly string[] = [
  'Riverside', 'Two Bridges', 'Corner', 'Mill Street', 'Depot', 'Hilltop', 'Lakeside', 'Main Street', 'Union', 'Harbor',
  'Kettle Street', 'Old Road', 'Northside', 'Ferry', 'Station', 'Quarry', 'Orchard', 'Canal', 'Foundry', 'Market',
  'Elm Street', 'Lone Pine', 'Prairie', 'Bayou', 'Summit', 'Creekside', 'Crossroads', 'Grove', 'Junction', 'Ridge',
];

type Form = (rng: Rng) => string;
/** The shapes, weighted; every form takes exactly one pick so a change never shifts the stream. */
const FORMS: readonly [weight: number, form: Form][] = [
  [20, r => `${pick(GARAGE_FAMILIES, r)} & Sons`],
  [14, r => `${pick(GARAGE_FAMILIES, r)} Brothers`],
  [14, r => `${pick(GARAGE_FAMILIES, r)} Motors`],
  [16, r => `${pick(GARAGE_FIRSTS, r)}'s Garage`],
  [14, r => `${pick(GARAGE_PLACES, r)} Motor Works`],
  [12, r => `${pick(GARAGE_PLACES, r)} Garage`],
  [6, r => `The ${pick(GARAGE_PLACES, r)} Pump`],
  [4, r => `${pick(GARAGE_PLACES, r)} Speed Shop`],
];
const FORM_TOTAL = FORMS.reduce((n, [w]) => n + w, 0);

/** One garage name: two rng draws (the form, the name). */
export function garageName(rng: Rng): string {
  let roll = rng() * FORM_TOTAL;
  let form: Form = FORMS[FORMS.length - 1][1];
  for (const [w, f] of FORMS) { if ((roll -= w) < 0) { form = f; break; } }
  return form(rng);
}

export interface Garage {
  name: string;
  color: string;
  ink: string;
  iconId: string;
  /** The town it races for (the State step: "Ace Akron"); absent at Locals, where every garage is your town's. */
  town?: string;
}

/** The team creator's logos, by id, for rival garages too. */
export const GARAGE_LOGOS: readonly string[] = [
  'fox-head', 'wolf-head', 'lion', 'owl', 'octopus', 'speed-boat', 'spark-plug', 'rocket', 'cog-badge',
  'seven-pointed-star', 'key', 'fleur-de-lys', 'lightning-helix', 'pirate-flag', 'traffic-cone', 'megaphone',
  'ghost', 'alien-stare', 'tentacle-heart', 'plastic-duck',
];

/** sRGB hex → CIE Lab (D65). */
function lab(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const x = f((r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047), y = f(r * 0.2126 + g * 0.7152 + b * 0.0722), z = f((r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

/** How far apart two colours look (CIE76 ΔE in Lab): under ~25 reads as "the same colour" on a marble. */
export function colourDistance(a: string, b: string): number {
  const [p, q] = [lab(a), lab(b)];
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

/** Rival garages skip a colour closer than this to yours (#638). */
export const TOO_CLOSE = 25;

/**
 * `count` rival garages for a field, no name or colour twice (redraws on a
 * duplicate, up to a limit). `towns`, when given, hands each garage its own
 * town in order (the State step); fewer towns than garages wrap. `avoid` is
 * your colour (#638): a rival whose drawn colour is too close to it takes the
 * next free deck colour that isn't, with no extra draws, so names and logos
 * stay where the seed put them. `colours`, when given, is a colour per seat
 * (a state's look at Nationals, #694): that seat wears it, whatever was drawn.
 */
export function rivalGarages(rng: Rng, count: number, towns?: readonly string[], excludeNames: readonly string[] = [], avoid?: string, colours?: readonly (string | null)[]): Garage[] {
  const names = new Set(excludeNames);
  // `drawn` drives the redraws (the seed's stream, unchanged by `avoid` or `colours`); `wornSet` is what the garages wear.
  const drawn = new Set<string>();
  const wornSet = new Set<string>();
  const ok = (hex: string) => !wornSet.has(hex) && !(avoid && colourDistance(hex, avoid) < TOO_CLOSE);
  const out: Garage[] = [];
  for (let i = 0; i < count; i++) {
    let name = garageName(rng);
    for (let tries = 0; names.has(name) && tries < 30; tries++) name = garageName(rng);
    names.add(name);
    let colour = pick(DECK_COLOURS, rng);
    for (let tries = 0; drawn.has(colour.hex) && tries < 30 && drawn.size < DECK_COLOURS.length; tries++) colour = pick(DECK_COLOURS, rng);
    drawn.add(colour.hex);
    if (avoid && !ok(colour.hex)) {
      const at = DECK_COLOURS.indexOf(colour);
      const next = DECK_COLOURS.map((_, k) => DECK_COLOURS[(at + k) % DECK_COLOURS.length]).find(c => ok(c.hex));
      if (next) colour = next;
    }
    // A seat with its own colour (a state's look at Nationals, #694) wears it instead; the draws above are untouched.
    const worn = colours?.[i] ?? colour.hex;
    wornSet.add(worn);
    const iconId = pick(GARAGE_LOGOS, rng);
    out.push({ name, color: worn, ink: inkFor(worn), iconId, ...(towns?.length ? { town: towns[i % towns.length] } : {}) });
  }
  return out;
}
