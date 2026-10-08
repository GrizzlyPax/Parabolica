// Weather v2, dry half (v0.5; Pax, Oct 8; docs/TRACKS_WEATHER.md): Neutral
// plus five dry weathers, each favouring two stats at +10% × intensity. No
// rain in v0.5: Wet (lap by lap, wet tyre) arrives in v0.6, and its share of
// the odds is spread across the five dry weathers for now.
//
// Data only (#408): races still roll the old weathers (src/data/weather.ts)
// until Apex's swap (#359). A weather's combo can match the track's; favours stack.
import type { CardStat, StatKey } from '../cards/types';
import { FAVOUR_PCT } from './deckTracks';

export interface DeckWeather {
  id: string;
  name: string;
  /** Percent of races (sums to 100). */
  odds: number;
  /** Full-intensity favours; the race scales pct by its intensity. */
  favours: CardStat[];
  /** Dry weathers are steady for the whole race. Volatile (Wet) comes in v0.6. */
  kind: 'consistent';
}

const fav = (...stats: StatKey[]): CardStat[] => stats.map(stat => ({ stat, pct: FAVOUR_PCT }));

export const BASE_DECK_WEATHER: DeckWeather[] = [
  { id: 'neutral', name: 'Neutral', odds: 60, favours: [], kind: 'consistent' },
  { id: 'speed-tyre-management', name: 'Speed + Tyre Management', odds: 8, favours: fav('baseSpeed', 'tireManagement'), kind: 'consistent' },
  { id: 'consistency-pit-crew', name: 'Consistency + Pit Crew', odds: 8, favours: fav('consistency', 'pitCrew'), kind: 'consistent' },
  { id: 'acceleration-reliability', name: 'Acceleration + Reliability', odds: 8, favours: fav('acceleration', 'reliability'), kind: 'consistent' },
  { id: 'endurance-power', name: 'Endurance + Power', odds: 8, favours: fav('endurance', 'power'), kind: 'consistent' },
  { id: 'aggression-grip', name: 'Aggression + Grip', odds: 8, favours: fav('aggression', 'grip'), kind: 'consistent' },
];
