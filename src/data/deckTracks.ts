// The six stat-combo tracks (Tracks & Weather v2, dry half in v0.5; Pax, Oct
// 8; docs/TRACKS_WEATHER.md). Each favours one driver stat and one car/team
// stat by +10 grade points for the race, field-wide, through the card math
// (src/cards/apply.ts, applied at race build), and has its own tyre-wear dial
// (#536: Steward's measured values, Oct 9) so strategy differs by track.
// Since #750 each is a KIND (Radio's six American venues, docs/story/tracks.md)
// whose `name` here is its Nationals landmark; Quick Race and the lab use
// these, and a run names the kind for its step (season/venues.ts: your town
// at Locals, a town in your state at State). Ids never change: saves hold them.
import type { CardStat, StatKey } from '../cards/types';

/** The favour: a favoured stat gains +10 grade points (Steward re-measures per bump). */
export const FAVOUR_PCT = 10;

export interface DeckTrack {
  id: string;
  /** The Nationals landmark (Quick Race and the lab race here). */
  name: string;
  /** The kind: Board Track, Brickyard, Salt Flats, Fairgrounds, Street Circuit, Hill-climb. */
  kind: string;
  /** Existing layout drawing (src/generators/tracks.ts LAYOUTS); no new art. */
  layoutId: 'power' | 'technical' | 'street' | 'flowing' | 'modern' | 'classic';
  /** Driver stat first, then the car or team stat; same shape as a card's stats. */
  favours: CardStat[];
  /** Tyre wear per tick × this. 1.0 = the canon compound lives; 0.85 gentle, 1.25 hungry. */
  tyreWear: number;
}

const fav = (...stats: StatKey[]): CardStat[] => stats.map(stat => ({ stat, pct: FAVOUR_PCT }));

export const BASE_DECK_TRACKS: DeckTrack[] = [
  { id: 'speed-power', name: 'Bonneville Salt Flats, Utah', kind: 'Salt Flats', layoutId: 'power', favours: fav('baseSpeed', 'power'), tyreWear: 0.85 },
  { id: 'consistency-grip', name: 'Pikes Peak, Colorado', kind: 'Hill-climb', layoutId: 'technical', favours: fav('consistency', 'grip'), tyreWear: 1.1 },
  { id: 'aggression-reliability', name: 'Times Square, New York', kind: 'Street Circuit', layoutId: 'street', favours: fav('aggression', 'reliability'), tyreWear: 1.0 },
  { id: 'endurance-tyre-management', name: 'The Brickyard, Indianapolis', kind: 'Brickyard', layoutId: 'flowing', favours: fav('endurance', 'tireManagement'), tyreWear: 1.25 },
  { id: 'acceleration-pit-crew', name: 'The Springfield Mile, Illinois', kind: 'Fairgrounds', layoutId: 'modern', favours: fav('acceleration', 'pitCrew'), tyreWear: 1.15 },
  { id: 'luck-reliability', name: 'Atlantic City Board Speedway, New Jersey', kind: 'Board Track', layoutId: 'classic', favours: fav('luck', 'reliability'), tyreWear: 0.95 },
];

export function getDeckTrackById(id: string): DeckTrack | undefined {
  return BASE_DECK_TRACKS.find(t => t.id === id);
}
