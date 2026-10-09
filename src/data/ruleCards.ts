// Rule cards — the rules you pick before a run (#241). ("Card" alone now means a
// deck card: gear / traits / effects, docs/CARDS.md.) Data only; adding one is a
// toss-in. Each card's `readout` is the plain-words effect shown on the card;
// `patch` is what it actually does to the ruleset (see rules/ruleset.ts).
//
// Two scopes (Pax, Oct 5): a RACE card is "Rain"; a SEASON card is "Always
// Raining". Underneath they're the same lever — for one race, odds = certainty.

import type { RuleCard } from '../rules/ruleset';

// Weather v2 (dry) ids: neutral + five stat-combo weathers (src/data/deckWeather.ts).
const DRY = ['speed-tyre-management', 'consistency-pit-crew', 'acceleration-reliability', 'endurance-power', 'aggression-grip'];
const ONLY = (id: string) => ({ neutral: 0, ...Object.fromEntries(DRY.map(d => [d, 0])), [id]: 100 });

export const RULE_CARDS: RuleCard[] = [
  // ---- Weather ------------------------------------------------------------
  // Remapped to Weather v2's dry weathers (#359): no rain in v0.5. The ids are
  // kept so saved presets and the ledger still resolve; names are utilitarian
  // until a flavour pass.
  { id: 'rain', name: 'Crosswind', emoji: '🌬️', scope: 'race', weight: 'wild',
    blurb: 'A day for the brave and the planted.',
    readout: 'This race favours Aggression and Grip.',
    patch: { weather: ONLY('aggression-grip'), quickRaceWeather: true } },
  { id: 'fog', name: 'Overcast', emoji: '🌤️', scope: 'race', weight: 'mild',
    blurb: 'Nothing to see; keep it tidy.',
    readout: 'This race favours Consistency and Pit Crew.',
    patch: { weather: ONLY('consistency-pit-crew'), quickRaceWeather: true } },
  { id: 'clear-skies', name: 'Calm', emoji: '☀️', scope: 'race', weight: 'mild',
    blurb: 'Nothing in the forecast but racing.',
    readout: 'No weather favours this race.',
    patch: { weather: ONLY('neutral'), quickRaceWeather: true } },
  { id: 'always-raining', name: 'Windswept', emoji: '🌬️', scope: 'season', weight: 'wild',
    blurb: 'The league moved somewhere with a climate.',
    readout: 'Every race favours Aggression and Grip.',
    patch: { weather: ONLY('aggression-grip') } },
  { id: 'wild-weather', name: 'Changeable', emoji: '🌪️', scope: 'season', weight: 'wild',
    blurb: 'Four seasons in one calendar.',
    readout: 'Neutral skies become rare; every dry weather is as likely.',
    patch: { weather: { neutral: 10, ...Object.fromEntries(DRY.map(d => [d, 18])) } } },

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
    patch: { scale: [['tires.soft.lifeLaps', 2], ['tires.medium.lifeLaps', 2], ['tires.hard.lifeLaps', 2]] } },
  { id: 'fast-pit-crews', name: 'Fast Pit Crews', emoji: '🏎️', scope: 'both', weight: 'mild',
    blurb: 'Every crew drilled all winter.',
    readout: 'Pit stops 25% quicker; fewer fumbled stops.',
    patch: { scale: [['pits.basePitDuration', 0.75], ['pits.slowStopBase', 0.5]] } },
  { id: 'no-pit-rules', name: 'No Pit Rules', emoji: '🔓', scope: 'both', weight: 'wild',
    blurb: 'The stewards went home. Run one hard set all day or stop six times for softs.',
    readout: 'No minimum stops, no compound rule. Anything goes.',
    patch: { simVars: { pits: { minStops: 0, requireAllCompounds: false } } } },
];

export const RULE_CARDS_BY_ID: Map<string, RuleCard> = new Map(RULE_CARDS.map(c => [c.id, c]));

export function ruleCardsForScope(scope: 'race' | 'season'): RuleCard[] {
  return RULE_CARDS.filter(c => c.scope === scope || c.scope === 'both');
}
