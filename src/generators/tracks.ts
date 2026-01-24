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

// All track effects apply condition tags to specific drivers
export interface TrackEventEffect {
  type: 'apply_tag';
  triggerTag: string;
  targets: 'random' | 'leader' | 'last' | 'top' | 'bottom';
  count: number;
  duration: number;
}

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
  // 1. Parking Structure - Slippery when wet
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
      description: '20%: 3 random slip (-20% crash resist)',
      flavorText: 'SPRINKLERS ACTIVATE! The floor is slick!',
      trigger: { type: 'random', chance: 20 },
      effect: { type: 'apply_tag', triggerTag: 'slippery-surface', targets: 'random', count: 3, duration: 2 },
    },
  },
  // 2. Loading Zone - Stragglers get blocked
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
      description: 'Every 4 laps: Bottom 3 slowed (-6%)',
      flavorText: 'FORKLIFT CROSSING! Stragglers get held up!',
      trigger: { type: 'interval', every: 4 },
      effect: { type: 'apply_tag', triggerTag: 'headwind', targets: 'bottom', count: 3, duration: 2 },
    },
  },
  // 3. The Roundabout - Random drivers lose visibility
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
      description: '15%: 4 random get fog (-15% crash resist)',
      flavorText: 'FOG ROLLS IN! Some drivers lose visibility!',
      trigger: { type: 'random', chance: 15 },
      effect: { type: 'apply_tag', triggerTag: 'low-visibility', targets: 'random', count: 4, duration: 2 },
    },
  },
  // 4. Office Park - Meetings make drivers lose focus
  {
    id: 'office-park',
    name: 'Office Park Circuit',
    description: 'Between buildings C and D. Mind the speed bumps.',
    emoji: '🏢',
    length: 850,
    laps: 15,
    layout: LAYOUTS.oval,
    event: {
      id: 'meeting-overrun',
      name: 'Meeting Overrun',
      emoji: '📋',
      description: 'Every 5 laps: 2 random distracted (-4% speed)',
      flavorText: 'MEETING OVERRUN! Someone is late getting back!',
      trigger: { type: 'interval', every: 5 },
      effect: { type: 'apply_tag', triggerTag: 'distracted', targets: 'random', count: 2, duration: 2 },
    },
  },
  // 5. Construction Zone - Dust affects random drivers
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
      description: '18%: 3 random get dust (-12% crash resist)',
      flavorText: 'DUST CLOUD! A truck kicks up debris!',
      trigger: { type: 'random', chance: 18 },
      effect: { type: 'apply_tag', triggerTag: 'dust-cloud', targets: 'random', count: 3, duration: 1 },
    },
  },
  // 6. The Mall - Leaders overheat from pushing
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
      description: 'Every 4 laps: Top 3 overheat (-8% speed)',
      flavorText: 'AC BREAKS DOWN! The leaders are feeling the heat!',
      trigger: { type: 'interval', every: 4 },
      effect: { type: 'apply_tag', triggerTag: 'cooling-issues', targets: 'top', count: 3, duration: 2 },
    },
  },
  // 7. Airport Terminal - Random pit delays
  {
    id: 'airport-terminal',
    name: 'Departures Level',
    description: 'Flight delayed. Racing continues.',
    emoji: '✈️',
    length: 820,
    laps: 16,
    layout: LAYOUTS.oval,
    event: {
      id: 'gate-change',
      name: 'Gate Change',
      emoji: '🛬',
      description: '15%: 3 random get pit delay (+25%)',
      flavorText: 'GATE CHANGE! Some crews are out of position!',
      trigger: { type: 'random', chance: 15 },
      effect: { type: 'apply_tag', triggerTag: 'pit-congestion', targets: 'random', count: 3, duration: 2 },
    },
  },
  // 8. The Warehouse - Random debris hazard
  {
    id: 'warehouse',
    name: 'The Warehouse',
    description: 'Aisle 7. Product location unknown.',
    emoji: '📦',
    length: 720,
    laps: 18,
    layout: LAYOUTS.triangle,
    event: {
      id: 'falling-boxes',
      name: 'Falling Boxes',
      emoji: '📦',
      description: '12%: 2 random hit debris (-25% crash resist)',
      flavorText: 'FALLING BOXES! Watch your head!',
      trigger: { type: 'random', chance: 12 },
      effect: { type: 'apply_tag', triggerTag: 'debris-hazard', targets: 'random', count: 2, duration: 1 },
    },
  },
  // 9. Server Room - Leaders throttle from heat
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
      description: 'Every 5 laps: Top 4 overheat (-8% speed)',
      flavorText: 'THERMAL THROTTLE! The leaders are overheating!',
      trigger: { type: 'interval', every: 5 },
      effect: { type: 'apply_tag', triggerTag: 'cooling-issues', targets: 'top', count: 4, duration: 2 },
    },
  },
  // 10. The Waiting Room - Last place gets desperate
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
      description: '15%: Last 2 push hard (+10% speed, +crash risk)',
      flavorText: 'NUMBER CALLED! Back of the pack gets desperate!',
      trigger: { type: 'random', chance: 15 },
      effect: { type: 'apply_tag', triggerTag: 'desperate-push', targets: 'last', count: 2, duration: 2 },
    },
  },
  // 11. Expressway - Random drivers catch slipstream
  {
    id: 'expressway',
    name: 'Express Lane',
    description: '10 items or less. Nobody counts.',
    emoji: '🛣️',
    length: 680,
    laps: 20,
    layout: LAYOUTS.oval,
    event: {
      id: 'drafting-zone',
      name: 'Drafting Zone',
      emoji: '🌀',
      description: '20%: 3 random catch slipstream (+5% speed)',
      flavorText: 'DRAFTING ZONE! Some drivers find clean air!',
      trigger: { type: 'random', chance: 20 },
      effect: { type: 'apply_tag', triggerTag: 'slipstream-boost', targets: 'random', count: 3, duration: 2 },
    },
  },
  // 12. The Buffet - Stragglers get energy boost
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
      description: 'Every 4 laps: Bottom 4 boosted (+8% speed)',
      flavorText: 'FRESH TRAY OUT! Stragglers find new energy!',
      trigger: { type: 'interval', every: 4 },
      effect: { type: 'apply_tag', triggerTag: 'adrenaline-surge', targets: 'bottom', count: 4, duration: 2 },
    },
  },
  // 13. Basement Level - Random visibility loss
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
      description: '15%: 4 random lose visibility (-15% crash resist)',
      flavorText: 'POWER FLICKER! The lights go out!',
      trigger: { type: 'random', chance: 15 },
      effect: { type: 'apply_tag', triggerTag: 'low-visibility', targets: 'random', count: 4, duration: 2 },
    },
  },
  // 14. Breakroom - Random drivers get energized
  {
    id: 'breakroom',
    name: 'The Breakroom',
    description: 'The coffee is questionable.',
    emoji: '☕',
    length: 800,
    laps: 16,
    layout: LAYOUTS.diamond,
    event: {
      id: 'coffee-kick',
      name: 'Coffee Kick',
      emoji: '☕',
      description: '18%: 2 random get focused (+6% speed, +10% consistency)',
      flavorText: 'COFFEE KICKS IN! Someone is locked in!',
      trigger: { type: 'random', chance: 18 },
      effect: { type: 'apply_tag', triggerTag: 'in-the-zone', targets: 'random', count: 2, duration: 3 },
    },
  },
  // 15. Fire Station - Leader gets urgency boost
  {
    id: 'fire-station',
    name: 'Fire Station',
    description: 'This is only a test. Probably.',
    emoji: '🚒',
    length: 770,
    laps: 16,
    layout: LAYOUTS.oval,
    event: {
      id: 'emergency-call',
      name: 'Emergency Call',
      emoji: '🚨',
      description: 'Every 4 laps: Leader boosted (+8% speed)',
      flavorText: 'EMERGENCY CALL! The leader pushes harder!',
      trigger: { type: 'interval', every: 4 },
      effect: { type: 'apply_tag', triggerTag: 'adrenaline-surge', targets: 'leader', count: 1, duration: 2 },
    },
  },
  // 16. Rush Hour - Random slippery surface
  {
    id: 'rush-hour',
    name: 'Rush Hour',
    description: 'Everyone is late.',
    emoji: '⏰',
    length: 850,
    laps: 15,
    layout: LAYOUTS.diamond,
    event: {
      id: 'fender-bender',
      name: 'Fender Bender',
      emoji: '🚗',
      description: '12%: 2 random hit slick (+crash risk, -consistency)',
      flavorText: 'FENDER BENDER! Debris on track!',
      trigger: { type: 'random', chance: 12 },
      effect: { type: 'apply_tag', triggerTag: 'slippery-surface', targets: 'random', count: 2, duration: 1 },
    },
  },
  // 17. Night Shift - Stragglers get second wind
  {
    id: 'night-shift',
    name: 'Night Shift',
    description: 'The fluorescent lights never stop.',
    emoji: '🌙',
    length: 780,
    laps: 17,
    layout: LAYOUTS.stadium,
    event: {
      id: 'second-wind',
      name: 'Second Wind',
      emoji: '💨',
      description: 'Every 5 laps: Bottom 3 boosted (+8% speed)',
      flavorText: 'SECOND WIND! The back-markers find new life!',
      trigger: { type: 'interval', every: 5 },
      effect: { type: 'apply_tag', triggerTag: 'adrenaline-surge', targets: 'bottom', count: 3, duration: 2 },
    },
  },
  // 18. Bike Lane - Random distraction
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
      description: '18%: 2 random distracted (-4% speed)',
      flavorText: 'PEDESTRIAN CROSSING! Some drivers hesitate!',
      trigger: { type: 'random', chance: 18 },
      effect: { type: 'apply_tag', triggerTag: 'distracted', targets: 'random', count: 2, duration: 1 },
    },
  },
  // 19. DMV - Random pit equipment issues
  {
    id: 'dmv',
    name: 'The DMV',
    description: 'Take a number. Wait.',
    emoji: '📝',
    length: 950,
    laps: 14,
    layout: LAYOUTS.rectangle,
    event: {
      id: 'system-glitch',
      name: 'System Glitch',
      emoji: '🖥️',
      description: 'Every 4 laps: 3 random get pit delay (+40%)',
      flavorText: 'SYSTEM GLITCH! Some equipment malfunctions!',
      trigger: { type: 'interval', every: 4 },
      effect: { type: 'apply_tag', triggerTag: 'equipment-malfunction', targets: 'random', count: 3, duration: 2 },
    },
  },
  // 20. Lost and Found - Random drivers get rattled
  {
    id: 'lost-and-found',
    name: 'Lost and Found',
    description: 'Unclaimed items will be donated.',
    emoji: '🔍',
    length: 780,
    laps: 17,
    layout: LAYOUTS.oval,
    event: {
      id: 'near-miss',
      name: 'Near Miss',
      emoji: '😰',
      description: '15%: 2 random rattled (-7% speed, safer)',
      flavorText: 'NEAR MISS! Some drivers back off to regroup!',
      trigger: { type: 'random', chance: 15 },
      effect: { type: 'apply_tag', triggerTag: 'rattled', targets: 'random', count: 2, duration: 2 },
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
  const targetDesc = effect.targets === 'leader' ? 'Leader'
    : effect.targets === 'last' ? `Last ${effect.count}`
    : effect.targets === 'top' ? `Top ${effect.count}`
    : effect.targets === 'bottom' ? `Bottom ${effect.count}`
    : `${effect.count} random`;
  return `${targetDesc} get ${effect.triggerTag} for ${effect.duration} lap${effect.duration > 1 ? 's' : ''}`;
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
