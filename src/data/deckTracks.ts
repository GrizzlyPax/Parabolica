// The six stat-combo tracks (Tracks & Weather v2, dry half in v0.5; Pax, Oct
// 8; docs/TRACKS_WEATHER.md). Each favours one driver stat and one car/team
// stat by +10% for the race, field-wide. Plain names for now.
//
// Data only (#408): the World Deck shows these, but races still use the 31
// themed tracks in src/generators/tracks.ts until Apex's swap (#359), which
// applies `favours` through the card math (src/cards/apply.ts).
import type { CardStat, StatKey } from '../cards/types';

/** The placeholder favour: a favoured stat counts +10% (calibration later). */
export const FAVOUR_PCT = 10;

export interface DeckTrack {
  id: string;
  name: string;
  /** Existing layout drawing (src/generators/tracks.ts LAYOUTS); no new art. */
  layoutId: 'power' | 'technical' | 'street' | 'flowing' | 'modern' | 'classic';
  /** Driver stat first, then the car or team stat; same shape as a card's stats. */
  favours: CardStat[];
}

const fav = (...stats: StatKey[]): CardStat[] => stats.map(stat => ({ stat, pct: FAVOUR_PCT }));

export const BASE_DECK_TRACKS: DeckTrack[] = [
  { id: 'speed-power', name: 'Speed + Power', layoutId: 'power', favours: fav('baseSpeed', 'power') },
  { id: 'consistency-grip', name: 'Consistency + Grip', layoutId: 'technical', favours: fav('consistency', 'grip') },
  { id: 'aggression-reliability', name: 'Aggression + Reliability', layoutId: 'street', favours: fav('aggression', 'reliability') },
  { id: 'endurance-tyre-management', name: 'Endurance + Tyre Management', layoutId: 'flowing', favours: fav('endurance', 'tireManagement') },
  { id: 'acceleration-pit-crew', name: 'Acceleration + Pit Crew', layoutId: 'modern', favours: fav('acceleration', 'pitCrew') },
  { id: 'luck-reliability', name: 'Luck + Reliability', layoutId: 'classic', favours: fav('luck', 'reliability') },
];

export function getDeckTrackById(id: string): DeckTrack | undefined {
  return BASE_DECK_TRACKS.find(t => t.id === id);
}
