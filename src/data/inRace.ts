// In-race acquisition (#232b): tags a driver picks up DURING a race because
// of something that just happened — damage, a spin, cooked tyres, a fumbled
// stop. Same Tag vocabulary as everything else, so the TAGS column, the card,
// the effect stack and the history all show them with no new UI.
//
// Rules key off race event types: every notable moment already passes
// through RaceEngine.logEvent, which is the one seam the engine needs.

import type { RaceEventType } from '../RaceEngine';

export type InRaceDuration =
  /** Ends when the driver's lap counter has advanced this many laps. */
  | { laps: number }
  /** Until the driver next leaves the pits. */
  | 'until-pit'
  /** Rest of this race. */
  | 'race'
  /** Rest of this race AND carried into the next N races via the league log. */
  | { races: number };

export interface InRaceRule {
  id: string;
  /** The event that triggers it. */
  on: RaceEventType;
  /** Optional: only when the event's description matches (e.g. the mistake flavour). */
  match?: RegExp;
  tagId: string;
  duration: InRaceDuration;
  /** Feed line; the driver's name is prepended by the event system. */
  text: string;
}

export const IN_RACE_RULES: InRaceRule[] = [
  { id: 'damage', on: 'crash', tagId: 'damaged', duration: 'race',
    text: 'limps on with a damaged car' },
  { id: 'spin', on: 'driver_error', match: /^Spin/, tagId: 'spun', duration: { laps: 2 },
    text: 'is rattled after the spin' },
  { id: 'cliff', on: 'tire_warning', tagId: 'cooked-tyres', duration: 'until-pit',
    text: 'is nursing cooked tyres to the pits' },
  { id: 'fumble', on: 'slow_pit_stop', tagId: 'sulking', duration: { laps: 1 },
    text: 'is sulking about that stop' },
  { id: 'lightning', on: 'quick_pit_stop', tagId: 'fired-up', duration: { laps: 1 },
    text: 'is fired up after a lightning stop' },
];
