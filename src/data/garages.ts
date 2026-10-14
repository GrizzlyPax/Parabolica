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

/**
 * `count` rival garages for a field, no name or colour twice (redraws on a
 * duplicate, up to a limit). `towns`, when given, hands each garage its own
 * town in order (the State step); fewer towns than garages wrap.
 */
export function rivalGarages(rng: Rng, count: number, towns?: readonly string[], excludeNames: readonly string[] = [], colours?: readonly (string | null)[]): Garage[] {
  const names = new Set(excludeNames);
  const taken = new Set<string>();
  const out: Garage[] = [];
  for (let i = 0; i < count; i++) {
    let name = garageName(rng);
    for (let tries = 0; names.has(name) && tries < 30; tries++) name = garageName(rng);
    names.add(name);
    let colour = pick(DECK_COLOURS, rng).hex;
    for (let tries = 0; taken.has(colour) && tries < 30 && taken.size < DECK_COLOURS.length; tries++) colour = pick(DECK_COLOURS, rng).hex;
    // A seat with its own colour (a state's look at Nationals, #694) wears it instead.
    colour = colours?.[i] ?? colour;
    taken.add(colour);
    const iconId = pick(GARAGE_LOGOS, rng);
    out.push({ name, color: colour, ink: inkFor(colour), iconId, ...(towns?.length ? { town: towns[i % towns.length] } : {}) });
  }
  return out;
}
