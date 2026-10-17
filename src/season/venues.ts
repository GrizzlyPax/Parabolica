// Tracks named by step (#750; Radio's patterns, docs/story/tracks.md): every
// kind races at every step and the name grows with it. Locals is named for
// your town (Toledo Boards), State for a real town in your state (Akron Board
// Speedway; the state's own name where the pattern says so), Nationals for a
// landmark (the deck track's name). Quick Race and the lab (no league) race
// the landmarks. The kind is the subtitle everywhere. Display only: track ids
// never change, and the {City} draw runs on its own seeded stream.
import { deriveSeed, mulberry32, shuffle } from '../engine/rng';
import { placeById } from '../data/states';
import { getDeckTrackById } from '../data/deckTracks';
import { getTrackById, type Track } from '../generators/tracks';
import type { SeasonFacts, SeasonSetup } from './season';

export interface Venue { name: string; kind: string }
/** What a venue needs of a setup: the seed (the {City} draw), the calendar, the step and locale. A step not yet played has these (#778: the road shows what's coming). */
export type VenueSetup = Pick<SeasonSetup, 'seed' | 'calendar' | 'league'>;

/** The Locals pattern per kind: {Town}. */
export const LOCALS_PATTERN: Record<string, (town: string) => string> = {
  'Fairgrounds': town => `${town} Fairgrounds`,
  'Street Circuit': town => `Main Street, ${town}`,
  'Hill-climb': town => `${town} Hill Road`,
  'Brickyard': town => `${town} Brickworks`,
  'Board Track': town => `${town} Boards`,
  'Salt Flats': town => `${town} Flats`,
};
/** The State pattern per kind: {City} (another town in the state) or {State}. */
export const STATE_PATTERN: Record<string, { city: true; name: (city: string) => string } | { city: false; name: (state: string) => string }> = {
  'Fairgrounds': { city: false, name: state => `${state} State Fair Mile` },
  'Street Circuit': { city: true, name: city => `Downtown ${city}` },
  'Hill-climb': { city: true, name: city => `${city} Hill Climb` },
  'Brickyard': { city: true, name: city => `${city} Brickyard` },
  'Board Track': { city: true, name: city => `${city} Board Speedway` },
  'Salt Flats': { city: false, name: state => `${state} Speed Trials` },
};

/** The {City} for each round of a State season: the state's other towns, shuffled on their own stream, no repeat until every town has had a race. */
function cityFor(setup: VenueSetup, round: number, town: string, cities: readonly string[]): string | undefined {
  const pool = cities.filter(c => c !== town);
  if (!pool.length) return undefined;
  const order = shuffle(pool, mulberry32(deriveSeed(setup.seed, 'season', 'venues')));
  // The n-th round that wants a city takes the n-th town of the order.
  let n = 0;
  for (let r = 0; r < round; r++) {
    const kind = getDeckTrackById(setup.calendar[r])?.kind;
    if (kind && STATE_PATTERN[kind]?.city) n++;
  }
  return order[n % order.length];
}

/** The venue a round is raced at: its name for the step, and its kind. */
export function venueFor(facts: SeasonFacts, round: number): Venue {
  return venueForSetup(facts.setup, round);
}

/** The same from a setup alone (a step ahead on the road has one before it is played). */
export function venueForSetup(setup: VenueSetup, round: number): Venue {
  const id = setup.calendar[round];
  const deck = getDeckTrackById(id);
  if (!deck) return { name: getTrackById(id)?.name ?? id, kind: '' };
  const step = setup.league?.step;
  const locale = setup.league?.locale;
  const place = locale ? placeById(locale.stateId) : undefined;
  if (step === 'locals' && locale) return { name: (LOCALS_PATTERN[deck.kind] ?? (t => `${t} ${deck.kind}`))(locale.town), kind: deck.kind };
  if (step === 'state' && locale && place) {
    const p = STATE_PATTERN[deck.kind];
    if (p?.city) { const city = cityFor(setup, round, locale.town, place.cities); if (city) return { name: p.name(city), kind: deck.kind }; }
    else if (p) return { name: p.name(place.name), kind: deck.kind };
  }
  return { name: deck.name, kind: deck.kind };
}

/** The round's Track, wearing the venue's name: the one object every race path (live, headless, the Paddock) builds from. */
export function trackForRound(facts: SeasonFacts, round: number): Track | undefined {
  const track = getTrackById(facts.setup.calendar[round]);
  return track ? { ...track, name: venueFor(facts, round).name } : undefined;
}
