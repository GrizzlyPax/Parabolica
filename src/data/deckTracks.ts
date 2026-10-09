// The six stat-combo tracks (Tracks & Weather v2, dry half in v0.5; Pax, Oct
// 8; docs/TRACKS_WEATHER.md). Each favours one driver stat and one car/team
// stat by +10 grade points for the race, field-wide, through the card math
// (src/cards/apply.ts, applied at race build), and has its own tyre-wear dial
// (#536: Steward's measured values, Oct 9) so strategy differs by track.
// Plain names for now.
import type { CardStat, StatKey } from '../cards/types';

/** The favour: a favoured stat gains +10 grade points (Steward re-measures per bump). */
export const FAVOUR_PCT = 10;

export interface DeckTrack {
  id: string;
  name: string;
  /** Existing layout drawing (src/generators/tracks.ts LAYOUTS); no new art. */
  layoutId: 'power' | 'technical' | 'street' | 'flowing' | 'modern' | 'classic';
  /** Driver stat first, then the car or team stat; same shape as a card's stats. */
  favours: CardStat[];
  /** Tyre wear per tick × this. 1.0 = the canon compound lives; 0.85 gentle, 1.25 hungry. */
  tyreWear: number;
}

const fav = (...stats: StatKey[]): CardStat[] => stats.map(stat => ({ stat, pct: FAVOUR_PCT }));

export const BASE_DECK_TRACKS: DeckTrack[] = [
  { id: 'speed-power', name: 'Speed + Power', layoutId: 'power', favours: fav('baseSpeed', 'power'), tyreWear: 0.85 },
  { id: 'consistency-grip', name: 'Consistency + Grip', layoutId: 'technical', favours: fav('consistency', 'grip'), tyreWear: 1.1 },
  { id: 'aggression-reliability', name: 'Aggression + Reliability', layoutId: 'street', favours: fav('aggression', 'reliability'), tyreWear: 1.0 },
  { id: 'endurance-tyre-management', name: 'Endurance + Tyre Management', layoutId: 'flowing', favours: fav('endurance', 'tireManagement'), tyreWear: 1.25 },
  { id: 'acceleration-pit-crew', name: 'Acceleration + Pit Crew', layoutId: 'modern', favours: fav('acceleration', 'pitCrew'), tyreWear: 1.15 },
  { id: 'luck-reliability', name: 'Luck + Reliability', layoutId: 'classic', favours: fav('luck', 'reliability'), tyreWear: 0.95 },
];

export function getDeckTrackById(id: string): DeckTrack | undefined {
  return BASE_DECK_TRACKS.find(t => t.id === id);
}
