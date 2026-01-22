// Parabolica Track System - absurdist racing venues

// ============================================
// TRACK LAYOUT SYSTEM
// ============================================

export interface TrackPoint {
  x: number;
  y: number;
}

export interface TrackLayout {
  id: string;
  name: string;
  trackPath: string;
  straightStart: TrackPoint;
  straightEnd: TrackPoint;
  pitLanePath: string;
  totalLength: number;
  startFinishPosition: number;
}

// ============================================
// TRACK EVENT SYSTEM
// ============================================

export type TrackEventTrigger =
  | { type: 'lap'; laps: number[] }           // Specific laps
  | { type: 'interval'; every: number }        // Every N laps
  | { type: 'random'; chance: number }         // % chance per lap
  | { type: 'halfway' }                        // At halfway point
  | { type: 'condition'; condition: string }   // Special condition
  | { type: 'final_laps'; count: number };     // Final N laps

export type TrackEventEffect =
  | { type: 'progress_loss'; targets: 'bottom' | 'random' | 'all'; count: number; amount: [number, number] }
  | { type: 'spin'; targets: 'random'; count: number; timeLoss: [number, number] }
  | { type: 'gap_compress'; within: number }
  | { type: 'speed_boost'; targets: 'random' | 'leader' | 'last' | 'bottom'; count: number; amount: number; duration: number }
  | { type: 'speed_penalty'; targets: 'random' | 'leader' | 'top'; count: number; amount: number; duration: number }
  | { type: 'position_shuffle'; targets: 'midpack' | 'random'; positions: [number, number] }
  | { type: 'forced_pit'; targets: 'random'; count: number }
  | { type: 'instant_pit'; targets: 'random'; count: number }
  | { type: 'crash_risk'; modifier: number; duration: number }
  | { type: 'swap_positions'; who: 'first_last' | 'random_pair' }
  | { type: 'pit_delay'; modifier: number; duration: number };

export interface TrackEvent {
  id: string;
  name: string;
  emoji: string;
  description: string;
  flavorText: string;
  trigger: TrackEventTrigger;
  effect: TrackEventEffect;
}

export interface Track {
  id: string;
  name: string;
  description: string;
  emoji: string;
  length: number;
  laps: number;
  layout: TrackLayout;
  event: TrackEvent;
}

// ============================================
// TRACK LAYOUTS (5 shapes)
// ============================================

const LAYOUTS: Record<string, TrackLayout> = {
  oval: {
    id: 'oval',
    name: 'Oval',
    trackPath: 'M 150 60 L 450 60 Q 550 60, 550 150 Q 550 240, 450 240 L 150 240 Q 50 240, 50 150 Q 50 60, 150 60 Z',
    straightStart: { x: 150, y: 60 },
    straightEnd: { x: 450, y: 60 },
    pitLanePath: 'M 430 60 Q 500 80, 520 120 Q 530 160, 500 190',
    totalLength: 1200,
    startFinishPosition: 0,
  },
  rectangle: {
    id: 'rectangle',
    name: 'Rectangle',
    trackPath: 'M 120 60 L 480 60 Q 540 60, 540 100 L 540 200 Q 540 240, 480 240 L 120 240 Q 60 240, 60 200 L 60 100 Q 60 60, 120 60 Z',
    straightStart: { x: 120, y: 60 },
    straightEnd: { x: 480, y: 60 },
    pitLanePath: 'M 460 60 L 500 80 L 500 180',
    totalLength: 1300,
    startFinishPosition: 0,
  },
  triangle: {
    id: 'triangle',
    name: 'Triangle',
    trackPath: 'M 150 60 L 450 60 Q 480 60, 490 85 L 350 240 Q 300 270, 250 240 L 110 85 Q 120 60, 150 60 Z',
    straightStart: { x: 150, y: 60 },
    straightEnd: { x: 450, y: 60 },
    pitLanePath: 'M 440 65 Q 470 90, 460 130 L 420 180',
    totalLength: 1100,
    startFinishPosition: 0,
  },
  diamond: {
    id: 'diamond',
    name: 'Diamond',
    trackPath: 'M 200 50 L 400 50 Q 430 50, 450 80 L 530 150 Q 550 170, 530 190 L 450 260 Q 430 290, 400 290 L 200 290 Q 170 290, 150 260 L 70 190 Q 50 170, 70 150 L 150 80 Q 170 50, 200 50 Z',
    straightStart: { x: 200, y: 50 },
    straightEnd: { x: 400, y: 50 },
    pitLanePath: 'M 380 55 Q 430 70, 470 120 L 500 170',
    totalLength: 1400,
    startFinishPosition: 0,
  },
  stadium: {
    id: 'stadium',
    name: 'Stadium',
    trackPath: 'M 180 80 L 420 80 Q 520 80, 520 150 Q 520 220, 420 220 L 180 220 Q 80 220, 80 150 Q 80 80, 180 80 Z',
    straightStart: { x: 180, y: 80 },
    straightEnd: { x: 420, y: 80 },
    pitLanePath: 'M 400 85 Q 480 100, 490 150 Q 480 200, 420 215',
    totalLength: 1150,
    startFinishPosition: 0,
  },
};

// ============================================
// THE 20 ABSURDIST TRACKS
// ============================================

export const ALL_TRACKS: Track[] = [
  // 1. Parking Structure
  {
    id: 'parking-structure',
    name: 'The Parking Structure',
    description: 'Level 4. The elevator is broken.',
    emoji: '🅿️',
    length: 800,
    laps: 15,
    layout: LAYOUTS.rectangle,
    event: {
      id: 'sprinklers',
      name: 'Sprinklers',
      emoji: '💦',
      description: '20% per lap: Gaps compress',
      flavorText: 'SPRINKLERS ACTIVATE! The wet floor bunches everyone up!',
      trigger: { type: 'random', chance: 20 },
      effect: { type: 'gap_compress', within: 4 },
    },
  },
  // 2. Loading Zone
  {
    id: 'loading-zone',
    name: 'Loading Zone',
    description: 'No parking any time. Results may vary.',
    emoji: '🚛',
    length: 700,
    laps: 16,
    layout: LAYOUTS.oval,
    event: {
      id: 'forklift-traffic',
      name: 'Forklift Traffic',
      emoji: '🚜',
      description: 'Every 4 laps: Bottom 3 lose progress',
      flavorText: 'FORKLIFT CROSSING! Stragglers get held up!',
      trigger: { type: 'interval', every: 4 },
      effect: { type: 'progress_loss', targets: 'bottom', count: 3, amount: [3, 8] },
    },
  },
  // 3. The Roundabout
  {
    id: 'roundabout',
    name: 'The Roundabout',
    description: 'Nobody knows who has right of way.',
    emoji: '🔄',
    length: 780,
    laps: 17,
    layout: LAYOUTS.stadium,
    event: {
      id: 'fog-rolls-in',
      name: 'Fog Rolls In',
      emoji: '🌫️',
      description: 'Halfway: +40% crash risk for 2 laps',
      flavorText: 'FOG ROLLS IN! Visibility drops dramatically!',
      trigger: { type: 'halfway' },
      effect: { type: 'crash_risk', modifier: 1.4, duration: 2 },
    },
  },
  // 4. Office Park
  {
    id: 'office-park',
    name: 'Office Park Circuit',
    description: 'Between buildings C and D. Mind the speed bumps.',
    emoji: '🏢',
    length: 850,
    laps: 15,
    layout: LAYOUTS.oval,
    event: {
      id: 'fire-drill',
      name: 'Fire Drill',
      emoji: '🔔',
      description: 'Laps 5 & 10: All drivers slowed 5%',
      flavorText: 'FIRE DRILL! Everyone must evacuate calmly!',
      trigger: { type: 'lap', laps: [5, 10] },
      effect: { type: 'speed_penalty', targets: 'random', count: 20, amount: 5, duration: 1 },
    },
  },
  // 5. Construction Zone
  {
    id: 'construction-zone',
    name: 'Active Construction',
    description: 'Work has been ongoing for several years.',
    emoji: '🚧',
    length: 750,
    laps: 17,
    layout: LAYOUTS.triangle,
    event: {
      id: 'dust-cloud',
      name: 'Dust Cloud',
      emoji: '💨',
      description: '15% per lap: +30% crash risk for 1 lap',
      flavorText: 'DUST CLOUD! A passing truck kicks up debris!',
      trigger: { type: 'random', chance: 15 },
      effect: { type: 'crash_risk', modifier: 1.3, duration: 1 },
    },
  },
  // 6. The Mall
  {
    id: 'the-mall',
    name: 'The Mall',
    description: 'Past the food court, near the defunct Sears.',
    emoji: '🛒',
    length: 900,
    laps: 14,
    layout: LAYOUTS.rectangle,
    event: {
      id: 'ac-breakdown',
      name: 'AC Breakdown',
      emoji: '🥵',
      description: 'Final 3 laps: +25% crash risk',
      flavorText: 'AC BREAKS DOWN! The heat is getting to everyone!',
      trigger: { type: 'final_laps', count: 3 },
      effect: { type: 'crash_risk', modifier: 1.25, duration: 3 },
    },
  },
  // 7. Airport Terminal
  {
    id: 'airport-terminal',
    name: 'Departures Level',
    description: 'Flight delayed. Racing continues.',
    emoji: '✈️',
    length: 820,
    laps: 16,
    layout: LAYOUTS.oval,
    event: {
      id: 'runway-closure',
      name: 'Runway Closure',
      emoji: '🛬',
      description: 'Every 5 laps: Pits 40% slower',
      flavorText: 'RUNWAY CLOSURE! All ground operations delayed!',
      trigger: { type: 'interval', every: 5 },
      effect: { type: 'pit_delay', modifier: 1.4, duration: 1 },
    },
  },
  // 8. The Warehouse
  {
    id: 'warehouse',
    name: 'The Warehouse',
    description: 'Aisle 7. Product location unknown.',
    emoji: '📦',
    length: 720,
    laps: 18,
    layout: LAYOUTS.triangle,
    event: {
      id: 'lights-out',
      name: 'Lights Out',
      emoji: '🔦',
      description: 'Halfway: Midpack positions shuffle',
      flavorText: 'LIGHTS OUT! Everyone loses their bearings!',
      trigger: { type: 'halfway' },
      effect: { type: 'position_shuffle', targets: 'midpack', positions: [7, 14] },
    },
  },
  // 9. Server Room
  {
    id: 'server-room',
    name: 'Server Room B',
    description: 'Temperature controlled. The hum is normal.',
    emoji: '🖥️',
    length: 800,
    laps: 15,
    layout: LAYOUTS.diamond,
    event: {
      id: 'thermal-throttle',
      name: 'Thermal Throttle',
      emoji: '🌡️',
      description: 'Final 2 laps: Top 5 slowed 5%',
      flavorText: 'THERMAL THROTTLE! The leaders are overheating!',
      trigger: { type: 'final_laps', count: 2 },
      effect: { type: 'speed_penalty', targets: 'top', count: 5, amount: 5, duration: 2 },
    },
  },
  // 10. The Waiting Room
  {
    id: 'waiting-room',
    name: 'The Waiting Room',
    description: 'Now serving: eventually.',
    emoji: '🪑',
    length: 800,
    laps: 16,
    layout: LAYOUTS.stadium,
    event: {
      id: 'number-called',
      name: 'Number Called',
      emoji: '🎫',
      description: '12% per lap: Last place boosted 6%',
      flavorText: 'NUMBER CALLED! The back of the line gets attention!',
      trigger: { type: 'random', chance: 12 },
      effect: { type: 'speed_boost', targets: 'last', count: 1, amount: 6, duration: 2 },
    },
  },
  // 11. Expressway
  {
    id: 'expressway',
    name: 'Express Lane',
    description: '10 items or less. Nobody counts.',
    emoji: '🛣️',
    length: 680,
    laps: 20,
    layout: LAYOUTS.oval,
    event: {
      id: 'rain-shower',
      name: 'Rain Shower',
      emoji: '🌧️',
      description: '20% per lap: Gaps compress',
      flavorText: 'RAIN SHOWER! Everyone slows and bunches up!',
      trigger: { type: 'random', chance: 20 },
      effect: { type: 'gap_compress', within: 5 },
    },
  },
  // 12. The Buffet
  {
    id: 'buffet',
    name: 'The Buffet',
    description: 'All you can eat. Results may vary.',
    emoji: '🍽️',
    length: 680,
    laps: 20,
    layout: LAYOUTS.stadium,
    event: {
      id: 'fresh-tray',
      name: 'Fresh Tray',
      emoji: '🍕',
      description: 'Every 4 laps: Bottom 5 boosted 5%',
      flavorText: 'FRESH TRAY OUT! Stragglers find new energy!',
      trigger: { type: 'interval', every: 4 },
      effect: { type: 'speed_boost', targets: 'bottom', count: 5, amount: 5, duration: 2 },
    },
  },
  // 13. Basement Level
  {
    id: 'basement',
    name: 'Basement Level',
    description: 'The lights flicker. This is normal.',
    emoji: '🔦',
    length: 850,
    laps: 15,
    layout: LAYOUTS.rectangle,
    event: {
      id: 'power-flicker',
      name: 'Power Flicker',
      emoji: '💡',
      description: 'Final 2 laps: +60% crash risk',
      flavorText: 'POWER FLICKER! The basement grows unstable!',
      trigger: { type: 'final_laps', count: 2 },
      effect: { type: 'crash_risk', modifier: 1.6, duration: 2 },
    },
  },
  // 14. Breakroom
  {
    id: 'breakroom',
    name: 'The Breakroom',
    description: 'The coffee is questionable.',
    emoji: '☕',
    length: 800,
    laps: 16,
    layout: LAYOUTS.diamond,
    event: {
      id: 'coffee-spill',
      name: 'Coffee Spill',
      emoji: '☕',
      description: '15% per lap: Random driver loses progress',
      flavorText: 'COFFEE SPILL! Someone hits a slick spot!',
      trigger: { type: 'random', chance: 15 },
      effect: { type: 'progress_loss', targets: 'random', count: 1, amount: [5, 12] },
    },
  },
  // 15. Fire Station
  {
    id: 'fire-station',
    name: 'Fire Station',
    description: 'This is only a test. Probably.',
    emoji: '🚒',
    length: 770,
    laps: 16,
    layout: LAYOUTS.oval,
    event: {
      id: 'false-alarm',
      name: 'False Alarm',
      emoji: '🚨',
      description: 'Laps 3-5: +35% crash risk',
      flavorText: 'FALSE ALARM! Everyone panics anyway!',
      trigger: { type: 'lap', laps: [3, 4, 5] },
      effect: { type: 'crash_risk', modifier: 1.35, duration: 3 },
    },
  },
  // 16. Rush Hour
  {
    id: 'rush-hour',
    name: 'Rush Hour',
    description: 'Everyone is late.',
    emoji: '⏰',
    length: 850,
    laps: 15,
    layout: LAYOUTS.diamond,
    event: {
      id: 'gridlock',
      name: 'Gridlock',
      emoji: '🚗',
      description: 'Halfway: Gaps compress tightly',
      flavorText: 'GRIDLOCK! Traffic brings everyone together!',
      trigger: { type: 'halfway' },
      effect: { type: 'gap_compress', within: 3 },
    },
  },
  // 17. Night Shift
  {
    id: 'night-shift',
    name: 'Night Shift',
    description: 'The fluorescent lights never stop.',
    emoji: '🌙',
    length: 780,
    laps: 17,
    layout: LAYOUTS.stadium,
    event: {
      id: 'drowsiness',
      name: 'Drowsiness',
      emoji: '😴',
      description: 'Final 3 laps: All slowed 3%',
      flavorText: 'DROWSINESS SETS IN! Everyone is getting tired!',
      trigger: { type: 'final_laps', count: 3 },
      effect: { type: 'speed_penalty', targets: 'random', count: 20, amount: 3, duration: 3 },
    },
  },
  // 18. Bike Lane
  {
    id: 'bike-lane',
    name: 'The Bike Lane',
    description: 'Shared space. Mind the pedestrians.',
    emoji: '🚲',
    length: 770,
    laps: 16,
    layout: LAYOUTS.triangle,
    event: {
      id: 'pedestrian-crossing',
      name: 'Pedestrian Crossing',
      emoji: '🚶',
      description: '18% per lap: 2 random lose progress',
      flavorText: 'PEDESTRIAN CROSSING! Brief delay for some!',
      trigger: { type: 'random', chance: 18 },
      effect: { type: 'progress_loss', targets: 'random', count: 2, amount: [3, 7] },
    },
  },
  // 19. DMV
  {
    id: 'dmv',
    name: 'The DMV',
    description: 'Take a number. Wait.',
    emoji: '📝',
    length: 950,
    laps: 14,
    layout: LAYOUTS.rectangle,
    event: {
      id: 'system-down',
      name: 'System Down',
      emoji: '🖥️',
      description: 'Laps 5-8: Pits 50% slower',
      flavorText: 'SYSTEM DOWN! Everything takes longer!',
      trigger: { type: 'lap', laps: [5, 6, 7, 8] },
      effect: { type: 'pit_delay', modifier: 1.5, duration: 4 },
    },
  },
  // 20. Lost and Found
  {
    id: 'lost-and-found',
    name: 'Lost and Found',
    description: 'Unclaimed items will be donated.',
    emoji: '🔍',
    length: 780,
    laps: 17,
    layout: LAYOUTS.oval,
    event: {
      id: 'lucky-find',
      name: 'Lucky Find',
      emoji: '🎁',
      description: 'Every 4 laps: Last place boosted 8%',
      flavorText: 'LUCKY FIND! Someone at the back finds something useful!',
      trigger: { type: 'interval', every: 4 },
      effect: { type: 'speed_boost', targets: 'last', count: 1, amount: 8, duration: 2 },
    },
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate a dynamic event description based on total laps
 */
export function getDynamicEventDescription(event: TrackEvent, totalLaps: number): string {
  const trigger = event.trigger;

  switch (trigger.type) {
    case 'lap': {
      const laps = trigger.laps.map(lap => lap < 0 ? totalLaps + lap + 1 : lap);
      const sortedLaps = [...laps].sort((a, b) => a - b);
      const lapStr = formatLapList(sortedLaps, totalLaps);
      const effectDesc = getEffectDescription(event.effect);
      return `${lapStr}: ${effectDesc}`;
    }

    case 'interval': {
      const effectDesc = getEffectDescription(event.effect);
      return `Every ${trigger.every} laps: ${effectDesc}`;
    }

    case 'random': {
      const effectDesc = getEffectDescription(event.effect);
      return `${trigger.chance}% per lap: ${effectDesc}`;
    }

    case 'halfway': {
      const halfwayLap = Math.floor(totalLaps / 2);
      const effectDesc = getEffectDescription(event.effect);
      return `Lap ${halfwayLap}: ${effectDesc}`;
    }

    case 'final_laps': {
      const startLap = totalLaps - trigger.count + 1;
      const effectDesc = getEffectDescription(event.effect);
      if (trigger.count === 1) {
        return `Final lap: ${effectDesc}`;
      }
      return `Laps ${startLap}-${totalLaps}: ${effectDesc}`;
    }

    case 'condition': {
      return event.description;
    }

    default:
      return event.description;
  }
}

function formatLapList(laps: number[], totalLaps: number): string {
  if (laps.length === 0) return 'No laps';
  if (laps.length === 1) {
    return laps[0] === totalLaps ? 'Final lap' : `Lap ${laps[0]}`;
  }

  const isConsecutive = laps.every((lap, i) => i === 0 || lap === laps[i - 1] + 1);
  if (isConsecutive && laps.length > 2) {
    const hasFinal = laps[laps.length - 1] === totalLaps;
    if (hasFinal) {
      return `Laps ${laps[0]}-final`;
    }
    return `Laps ${laps[0]}-${laps[laps.length - 1]}`;
  }

  const formatted = laps.map(lap => lap === totalLaps ? 'final' : lap.toString());
  if (formatted.length === 2) {
    return `Laps ${formatted[0]} & ${formatted[1]}`;
  }
  return `Laps ${formatted.slice(0, -1).join(', ')} & ${formatted[formatted.length - 1]}`;
}

function getEffectDescription(effect: TrackEventEffect): string {
  switch (effect.type) {
    case 'progress_loss':
      return `${effect.targets === 'bottom' ? `Bottom ${effect.count}` : effect.targets === 'all' ? 'All' : `${effect.count} random`} lose progress`;
    case 'spin':
      return `${effect.count} random drivers spin`;
    case 'gap_compress':
      return 'Gaps compress to leader';
    case 'speed_boost':
      if (effect.targets === 'bottom') return `Bottom ${effect.count} get speed boost`;
      if (effect.targets === 'last') return 'Last place gets speed boost';
      if (effect.targets === 'leader') return 'Leader gets speed boost';
      return `${effect.count} random get speed boost`;
    case 'speed_penalty':
      if (effect.targets === 'leader') return 'Leader gets speed penalty';
      if (effect.targets === 'top') return `Top ${effect.count} get speed penalty`;
      return `${effect.count} random get speed penalty`;
    case 'position_shuffle':
      return effect.targets === 'midpack' ? 'Midpack shuffles randomly' : 'Positions shuffle randomly';
    case 'forced_pit':
      return `${effect.count} random forced to pit`;
    case 'instant_pit':
      return `${effect.count} random get instant pit`;
    case 'crash_risk':
      const pct = Math.round((effect.modifier - 1) * 100);
      return `+${pct}% crash risk`;
    case 'pit_delay':
      const delayPct = Math.round((effect.modifier - 1) * 100);
      return `Pit stops take ${delayPct}% longer`;
    case 'swap_positions':
      return effect.who === 'first_last' ? 'First and last swap' : 'Random pair swap';
    default:
      return 'Special effect';
  }
}

export function getTrackById(id: string): Track | undefined {
  return ALL_TRACKS.find(t => t.id === id);
}

export function getTracksByIds(ids: string[]): Track[] {
  return ids.map(id => getTrackById(id)).filter((t): t is Track => t !== undefined);
}

export function getRandomTracks(count: number): Track[] {
  const shuffled = [...ALL_TRACKS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function generateTrack(): Track {
  return ALL_TRACKS[Math.floor(Math.random() * ALL_TRACKS.length)];
}

export function generateSeason(numTracks: number = 5): Track[] {
  return getRandomTracks(Math.min(numTracks, ALL_TRACKS.length));
}
