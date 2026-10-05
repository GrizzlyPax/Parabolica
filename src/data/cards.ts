// Cards — the rules you pick before a run (#241). Data only; adding one is a
// toss-in. Each card's `readout` is the plain-words effect shown on the card;
// `patch` is what it actually does to the ruleset (see rules/ruleset.ts).
//
// Two scopes (Pax, Oct 5): a RACE card is "Rain"; a SEASON card is "Always
// Raining". Underneath they're the same lever — for one race, odds = certainty.

import type { Card } from '../rules/ruleset';

const ONLY = (id: string) => ({ clear: 0, windy: 0, scorcher: 0, fog: 0, rain: 0, [id]: 100 });

export const CARDS: Card[] = [
  // ---- Weather ------------------------------------------------------------
  { id: 'rain', name: 'Rain', emoji: '🌧️', scope: 'race', weight: 'wild',
    blurb: 'The skies open before the formation lap.',
    readout: 'This race is wet. Rain Dancer wakes; crashes more likely.',
    patch: { weather: ONLY('rain'), quickRaceWeather: true } },
  { id: 'fog', name: 'Fog', emoji: '🌫️', scope: 'race', weight: 'mild',
    blurb: 'You can see the car ahead. Probably.',
    readout: 'This race is foggy: slightly slower, more close calls.',
    patch: { weather: ONLY('fog'), quickRaceWeather: true } },
  { id: 'clear-skies', name: 'Clear Skies', emoji: '☀️', scope: 'race', weight: 'mild',
    blurb: 'Nothing in the forecast but racing.',
    readout: 'No weather this race.',
    patch: { weather: ONLY('clear'), quickRaceWeather: true } },
  { id: 'always-raining', name: 'Always Raining', emoji: '🌧️', scope: 'season', weight: 'wild',
    blurb: 'The league moved somewhere with a climate problem.',
    readout: 'Every race is wet.',
    patch: { weather: ONLY('rain') } },
  { id: 'wild-weather', name: 'Wild Weather', emoji: '🌪️', scope: 'season', weight: 'wild',
    blurb: 'Four seasons in one calendar.',
    readout: 'Clear skies become rare; rain, fog, wind and heat are all as likely.',
    patch: { weather: { clear: 10, windy: 20, scorcher: 20, fog: 20, rain: 20 } } },

  // ---- Tags ---------------------------------------------------------------
  { id: 'tag-soup', name: 'Tag Soup', emoji: '🍲', scope: 'both', weight: 'wild',
    blurb: 'Everyone arrives with baggage.',
    readout: 'Most drivers are born with tags; up to 6 each.',
    patch: { tags: { genesisChance: 0.45, slotCap: 6 } } },
  { id: 'no-tags', name: 'No Tags', emoji: '🧼', scope: 'both', weight: 'mild',
    blurb: 'A clean grid. Pure stats, nothing weird.',
    readout: 'Nobody is born with a tag.',
    patch: { tags: { genesisChance: 0 } } },

  // ---- Physics ------------------------------------------------------------
  { id: 'demolition-derby', name: 'Demolition Derby', emoji: '💥', scope: 'both', weight: 'cursed',
    blurb: 'The stewards have gone home.',
    readout: 'Crashes 2.5× more likely.',
    patch: { scale: [['crashes.baseCrashChance', 2.5]] } },
  { id: 'unreliable-cars', name: 'Unreliable Cars', emoji: '🧨', scope: 'both', weight: 'cursed',
    blurb: 'Built fast. Built once.',
    readout: 'Engines fail 3× as often.',
    patch: { scale: [['mechanical.baseFailureChance', 3]] } },
  { id: 'tough-tyres', name: 'Tough Tyres', emoji: '🪨', scope: 'both', weight: 'mild',
    blurb: 'A rubber compound from a kinder era.',
    readout: 'Tyres wear half as fast. Fewer stops.',
    patch: { scale: [['tires.soft.wearRate', 0.5], ['tires.medium.wearRate', 0.5], ['tires.hard.wearRate', 0.5]] } },
  { id: 'fast-pit-crews', name: 'Fast Pit Crews', emoji: '🏎️', scope: 'both', weight: 'mild',
    blurb: 'Every crew drilled all winter.',
    readout: 'Pit stops 25% quicker; fewer fumbled stops.',
    patch: { scale: [['pits.basePitDuration', 0.75], ['pits.slowStopBase', 0.5]] } },
];

export const CARDS_BY_ID: Map<string, Card> = new Map(CARDS.map(c => [c.id, c]));

export function cardsForScope(scope: 'race' | 'season'): Card[] {
  return CARDS.filter(c => c.scope === scope || c.scope === 'both');
}
