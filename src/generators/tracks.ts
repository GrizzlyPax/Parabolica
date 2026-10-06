// Parabolica Track System - F1-Inspired Racing Venues

import { Rng, pick, shuffle } from '../engine/rng';

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
  funEmoji: string;      // Fun/theme emoji
  length: number;
  laps: number;
  layout: TrackLayout;
  event?: TrackEvent;    // Optional - to be assigned per track
  isHistoric?: boolean;  // Historic tracks (unlockable)
}

// ============================================
// TRACK LAYOUTS - F1-Inspired Circuit Designs
// Each layout has distinct character with proper corners
// Pit lane midpoint aligns with start/finish line
// ============================================

export const LAYOUTS: Record<string, TrackLayout> = {
  // Monaco-style: Tight street circuit, technical corners
  // Character: Slow, twisty, lots of 90-degree turns
  street: {
    id: 'street',
    name: 'Street Circuit',
    // S/F at x=300, top straight, clockwise
    trackPath: `
      M 300 55
      L 480 55
      Q 520 55, 520 95
      L 520 140
      Q 520 170, 490 170
      L 400 170
      Q 370 170, 370 200
      L 370 270
      Q 370 300, 340 300
      L 260 300
      Q 230 300, 230 270
      L 230 200
      Q 230 170, 200 170
      L 110 170
      Q 80 170, 80 140
      L 80 95
      Q 80 55, 120 55
      L 300 55
      Z
    `.replace(/\s+/g, ' ').trim(),
    straightStart: { x: 120, y: 55 },
    straightEnd: { x: 480, y: 55 },
    // Pit lane: straight horizontal line below main straight, left to right (entry → exit)
    pitLanePath: 'M 150 85 L 450 85',
    totalLength: 1100,
    startFinishPosition: 0,
  },

  // Monza-style: Power circuit with long straights and chicanes
  // Character: High speed, minimal corners, chicane complexes
  power: {
    id: 'power',
    name: 'Power Circuit',
    // Long straights with chicanes breaking them up
    trackPath: `
      M 300 50
      L 520 50
      Q 560 50, 560 90
      L 560 120
      Q 560 140, 540 150
      L 510 165
      Q 490 175, 510 185
      L 540 200
      Q 560 210, 560 230
      L 560 270
      Q 560 310, 520 310
      L 80 310
      Q 40 310, 40 270
      L 40 90
      Q 40 50, 80 50
      L 300 50
      Z
    `.replace(/\s+/g, ' ').trim(),
    straightStart: { x: 80, y: 50 },
    straightEnd: { x: 520, y: 50 },
    pitLanePath: 'M 120 80 L 480 80',
    totalLength: 1400,
    startFinishPosition: 0,
  },

  // Silverstone-style: Fast flowing with sweeping corners
  // Character: High-speed sweepers, Maggots/Becketts-style esses
  flowing: {
    id: 'flowing',
    name: 'Flowing Circuit',
    // Sweeping curves, wide radius turns
    trackPath: `
      M 300 60
      L 450 60
      Q 530 60, 550 120
      Q 570 180, 520 220
      L 450 260
      Q 400 290, 340 280
      Q 280 270, 260 290
      Q 240 310, 200 300
      L 120 270
      Q 60 250, 50 190
      Q 40 130, 80 90
      Q 120 50, 180 55
      L 300 60
      Z
    `.replace(/\s+/g, ' ').trim(),
    straightStart: { x: 180, y: 55 },
    straightEnd: { x: 450, y: 60 },
    pitLanePath: 'M 180 90 L 420 90',
    totalLength: 1300,
    startFinishPosition: 0,
  },

  // Bahrain/Abu Dhabi-style: Modern tilke circuit
  // Character: Mix of tight infield and flowing sections
  modern: {
    id: 'modern',
    name: 'Modern Circuit',
    // Technical infield, flowing outer section
    trackPath: `
      M 300 50
      L 480 50
      Q 540 50, 540 100
      L 540 160
      Q 540 200, 500 200
      L 420 200
      Q 380 200, 380 240
      L 380 280
      Q 380 310, 340 310
      L 200 310
      Q 160 310, 160 280
      L 160 220
      Q 160 190, 130 190
      L 80 190
      Q 40 190, 40 150
      L 40 100
      Q 40 50, 100 50
      L 300 50
      Z
    `.replace(/\s+/g, ' ').trim(),
    straightStart: { x: 100, y: 50 },
    straightEnd: { x: 480, y: 50 },
    pitLanePath: 'M 130 80 L 450 80',
    totalLength: 1350,
    startFinishPosition: 0,
  },

  // Suzuka-style: Figure-8 inspired with famous esses
  // Character: Flowing esses, crossover feel (simplified)
  technical: {
    id: 'technical',
    name: 'Technical Circuit',
    // S-curves (esses), tight hairpin, flowing back section
    trackPath: `
      M 300 55
      L 420 55
      Q 480 55, 500 90
      Q 520 125, 490 150
      Q 460 175, 490 200
      Q 520 225, 500 260
      Q 480 295, 420 295
      L 180 295
      Q 100 295, 80 240
      Q 60 185, 100 150
      Q 140 115, 100 80
      Q 60 45, 120 45
      L 300 55
      Z
    `.replace(/\s+/g, ' ').trim(),
    straightStart: { x: 120, y: 45 },
    straightEnd: { x: 420, y: 55 },
    pitLanePath: 'M 160 85 L 400 85',
    totalLength: 1250,
    startFinishPosition: 0,
  },

  // Spa-style: Long fast circuit with variety
  // Character: Fast straights, elevation changes implied by corner variety
  classic: {
    id: 'classic',
    name: 'Classic Circuit',
    // Mix of everything: hairpin, fast kink, chicane, sweeper
    trackPath: `
      M 300 45
      L 500 45
      Q 560 45, 560 100
      L 560 150
      Q 560 180, 530 190
      Q 500 200, 520 230
      Q 540 260, 500 290
      L 350 320
      Q 300 330, 250 320
      L 100 290
      Q 50 280, 50 230
      L 50 180
      Q 50 140, 90 130
      Q 130 120, 110 90
      Q 90 60, 130 50
      L 300 45
      Z
    `.replace(/\s+/g, ' ').trim(),
    straightStart: { x: 130, y: 50 },
    straightEnd: { x: 500, y: 45 },
    pitLanePath: 'M 150 75 L 470 75',
    totalLength: 1450,
    startFinishPosition: 0,
  },
};

// ============================================
// CURRENT SEASON TRACKS (24)
// F1-Inspired with punny names and aesthetics
// ============================================

export const CURRENT_TRACKS: Track[] = [
  // 1. Bahrain - Venhir (Modern tilke-style)
  {
    id: 'venhir',
    name: 'Venhir',
    description: 'Fangs gleaming under the lights, dentist chairs in every garage, open wide for inspection, floss mandatory.',
    emoji: '🇧🇭',
    funEmoji: '🦷',
    length: 850,
    laps: 15,
    layout: LAYOUTS.modern,
  },
  // 2. Saudi Arabia - Cheddah (Street circuit, fast walls)
  {
    id: 'cheddah',
    name: 'Cheddah',
    description: 'Cheese caves as far as the eye can see, wheels aging in silence, the sharpest place on earth, brie breezes.',
    emoji: '🇸🇦',
    funEmoji: '🧀',
    length: 900,
    laps: 14,
    layout: LAYOUTS.power,
  },
  // 3. Australia - All Bird Park (Flowing street circuit)
  {
    id: 'all-bird-park',
    name: 'All Bird Park',
    description: 'Feathers everywhere, constant squawking, birds judging your racing line, someone\'s cracker got stolen.',
    emoji: '🇦🇺',
    funEmoji: '🦜',
    length: 820,
    laps: 16,
    layout: LAYOUTS.flowing,
  },
  // 4. Japan - Choo-Choo-Ka (Technical, Suzuka-style)
  {
    id: 'choo-choo-ka',
    name: 'Choo-Choo-Ka',
    description: 'Train heaven, steam galore, where all your ticket-punching dreams come true, eternal platform announcements.',
    emoji: '🇯🇵',
    funEmoji: '🚂',
    length: 880,
    laps: 15,
    layout: LAYOUTS.technical,
  },
  // 5. China - Fang High (Modern circuit)
  {
    id: 'fang-high',
    name: 'Fang High',
    description: 'Lockers full of capes, prom is at midnight, the cafeteria only serves red, yearbook photos won\'t develop.',
    emoji: '🇨🇳',
    funEmoji: '🧛',
    length: 850,
    laps: 15,
    layout: LAYOUTS.modern,
  },
  // 6. Miami - Spyami (Street circuit)
  {
    id: 'spyami',
    name: 'Spyami',
    description: 'Trench coats in the shadows, dead drops in the pit lane, everyone\'s got a handler, the walls have ears.',
    emoji: '🇺🇸',
    funEmoji: '🕵️‍♂️',
    length: 800,
    laps: 16,
    layout: LAYOUTS.street,
  },
  // 7. Imola - Grimola (Classic old-school)
  {
    id: 'grimola',
    name: 'Grimola',
    description: 'Fog rolling through the chicanes, skulls grinning from the grandstands, beautiful but haunted, don\'t look back.',
    emoji: '🇮🇹',
    funEmoji: '💀',
    length: 780,
    laps: 17,
    layout: LAYOUTS.classic,
  },
  // 8. Monaco - Monacoco (Tight street circuit)
  {
    id: 'monacoco',
    name: 'Monacoco',
    description: 'Chocolate waterfalls, cocoa fog in the streets, everything melts eventually, sweet sweet surrender.',
    emoji: '🇲🇨',
    funEmoji: '🍫',
    length: 700,
    laps: 18,
    layout: LAYOUTS.street,
  },
  // 9. Spain - Cattylosers (Technical, flowing)
  {
    id: 'cattylosers',
    name: 'Cattylosers',
    description: 'Scratching posts for miles, hairball alley, where trophies go to fall, eternal hissing in the distance.',
    emoji: '🇪🇸',
    funEmoji: '🐱',
    length: 820,
    laps: 16,
    layout: LAYOUTS.technical,
  },
  // 10. Canada - Mini-Vanada (Power circuit, walls)
  {
    id: 'mini-vanada',
    name: 'Mini-Vanada',
    description: 'Sliding doors and Cheerios in the seats, snack distribution from the front, "don\'t make me turn this around."',
    emoji: '🇨🇦',
    funEmoji: '🚙',
    length: 800,
    laps: 16,
    layout: LAYOUTS.power,
  },
  // 11. Austria - Eelburg (Short, fast)
  {
    id: 'eelburg',
    name: 'Eelburg',
    description: 'Electric eels in the walls, everything\'s buzzing, don\'t touch the barriers, shockingly fast.',
    emoji: '🇦🇹',
    funEmoji: '⚡️',
    length: 720,
    laps: 18,
    layout: LAYOUTS.flowing,
  },
  // 12. Great Britain - Silverclone (Fast flowing, Silverstone-style)
  {
    id: 'silverclone',
    name: 'Silverclone',
    description: 'Robots everywhere, uncanny valley vibes, everyone looks familiar, are you the original or the copy?',
    emoji: '🇬🇧',
    funEmoji: '🤖',
    length: 880,
    laps: 15,
    layout: LAYOUTS.flowing,
  },
  // 13. Belgium - Spa Frankenstein (Classic, long, Spa-style)
  {
    id: 'spa-frankenstein',
    name: 'Spa Frankenstein',
    description: 'Frankenstein runs a surprisingly lovely spa here, hot springs and lightning therapy, monster hospitality, bolts on the house.',
    emoji: '🇧🇪',
    funEmoji: '🧟‍♂️',
    length: 950,
    laps: 14,
    layout: LAYOUTS.classic,
  },
  // 14. Hungary - Tonguearoring (Technical, twisty)
  {
    id: 'tonguearoring',
    name: 'Tonguearoring',
    description: 'Flavor country, everything is a taste test, suspiciously sticky grandstands, lick at your own risk.',
    emoji: '🇭🇺',
    funEmoji: '👅',
    length: 780,
    laps: 17,
    layout: LAYOUTS.technical,
  },
  // 15. Netherlands - Sandforts (Modern banked turns)
  {
    id: 'sandforts',
    name: 'Sandforts',
    description: 'Moats around every corner, bucket and spade engineering, tides come in without warning, your castle will fall.',
    emoji: '🇳🇱',
    funEmoji: '🏖️',
    length: 760,
    laps: 17,
    layout: LAYOUTS.modern,
  },
  // 16. Italy - Monsta (Power circuit, Monza-style)
  {
    id: 'monsta',
    name: 'Monsta',
    description: 'Something roaring in the temple, speed demons welcome, the creature under the track hungers, feed it laps.',
    emoji: '🇮🇹',
    funEmoji: '🧌',
    length: 900,
    laps: 14,
    layout: LAYOUTS.power,
  },
  // 17. Azerbaijan - Snapbaku (Street circuit, long straight)
  {
    id: 'snapbaku',
    name: 'Snapbaku',
    description: 'Hats flying everywhere, brims bent just right, backwards cap energy, fitted or nothing.',
    emoji: '🇦🇿',
    funEmoji: '🧢',
    length: 920,
    laps: 14,
    layout: LAYOUTS.street,
  },
  // 18. Singapore - Subpoena Day (Street circuit, night)
  {
    id: 'subpoena-day',
    name: 'Subpoena Day',
    description: 'Court is in session, gavels banging, everyone\'s serving papers, the verdict is always dramatic.',
    emoji: '🇸🇬',
    funEmoji: '👩‍⚖️',
    length: 850,
    laps: 15,
    layout: LAYOUTS.street,
  },
  // 19. Austin - MOTA (Modern, COTA-style)
  {
    id: 'mota',
    name: 'MOTA',
    description: 'Castle on a hill, drawbridge pit entry, jousting but faster, someone brought a trebuchet.',
    emoji: '🇺🇸',
    funEmoji: '🏰',
    length: 880,
    laps: 15,
    layout: LAYOUTS.modern,
  },
  // 20. Mexico - T-Rex & Co. (Flowing, stadium section)
  {
    id: 't-rex-and-co',
    name: 'T-Rex & Co.',
    description: 'Family business since the Jurassic, tiny arms big dreams, the siblings run this town, meteor-proof since \'65.',
    emoji: '🇲🇽',
    funEmoji: '🦖',
    length: 800,
    laps: 16,
    layout: LAYOUTS.flowing,
  },
  // 21. Brazil - Winter Igloos (Classic old-school)
  {
    id: 'winter-igloos',
    name: 'Winter Igloos',
    description: 'Frozen paradise, penguins in the paddock, everything\'s chill, ice sculptures judging you.',
    emoji: '🇧🇷',
    funEmoji: '🧊',
    length: 780,
    laps: 17,
    layout: LAYOUTS.classic,
  },
  // 22. Las Vegas - Las PEMDAS (Street circuit, night)
  {
    id: 'las-pemdas',
    name: 'Las PEMDAS',
    description: 'Please excuse my dear aunt Sally, parentheses everywhere, order of operations strictly enforced, show your work.',
    emoji: '🇺🇸',
    funEmoji: '🧮',
    length: 920,
    laps: 14,
    layout: LAYOUTS.power,
  },
  // 23. Qatar - Rainbowha (Modern, night)
  {
    id: 'rainbowha',
    name: 'Rainbowha',
    description: 'Unicorns grazing in the infield, glitter in the air vents, manes flowing at 200mph, sparkle mandatory.',
    emoji: '🇶🇦',
    funEmoji: '🦄',
    length: 850,
    laps: 15,
    layout: LAYOUTS.modern,
  },
  // 24. Abu Dhabi - Yas Christina! (Modern, twilight)
  {
    id: 'yas-christina',
    name: 'Yas Christina!',
    description: 'Dance floor pit stops, someone\'s always spinning, heels on the podium, the crowd moves as one.',
    emoji: '🇦🇪',
    funEmoji: '💃',
    length: 880,
    laps: 15,
    layout: LAYOUTS.modern,
  },
];

// ============================================
// HISTORIC TRACKS (10)
// ============================================

export const HISTORIC_TRACKS: Track[] = [
  {
    id: 'bendy-500',
    name: 'Bendy 500',
    description: 'Contortionists in every corner, limbo under the checkered flag, stretch before entry, flexibility required.',
    emoji: '🇺🇸',
    funEmoji: '🤸',
    length: 850,
    laps: 15,
    layout: LAYOUTS.power, // Indy-style power circuit
    isHistoric: true,
  },
  {
    id: 'hamburgring',
    name: 'Hamburgring',
    description: 'Patties sizzling in the paddock, ketchup or mustard wars, the grill never closes, medium rare only.',
    emoji: '🇩🇪',
    funEmoji: '🍔',
    length: 950,
    laps: 14,
    layout: LAYOUTS.classic, // Nurburgring-style classic
    isHistoric: true,
  },
  {
    id: 'bachenheim',
    name: 'Bachenheim',
    description: 'Orchestras in the grandstands, engines tuned to concert pitch, classical gas, the conductor sets the pace.',
    emoji: '🇩🇪',
    funEmoji: '🎻',
    length: 800,
    laps: 16,
    layout: LAYOUTS.technical, // Hockenheim-style technical
    isHistoric: true,
  },
  {
    id: 'paul-the-guard',
    name: 'Paul-the-Guard',
    description: 'Security everywhere, badge checks at every corner, "papers please," Paul sees all.',
    emoji: '🇫🇷',
    funEmoji: '👮‍♂️',
    length: 880,
    laps: 15,
    layout: LAYOUTS.flowing, // Paul Ricard flowing
    isHistoric: true,
  },
  {
    id: 'see-change',
    name: 'See Change?',
    description: 'Coins rolling through the paddock, interest rates posted at every turn, the bank always wins, exact change only.',
    emoji: '🇲🇾',
    funEmoji: '🪙',
    length: 870,
    laps: 15,
    layout: LAYOUTS.modern, // Sepang modern
    isHistoric: true,
  },
  {
    id: 'pielami',
    name: 'Pielami',
    description: 'Crusts flaking in the wind, filling debates that never end, lattice or solid top discourse, à la mode mandatory.',
    emoji: '🇿🇦',
    funEmoji: '🥧',
    length: 780,
    laps: 17,
    layout: LAYOUTS.flowing, // Kyalami flowing
    isHistoric: true,
  },
  {
    id: 'portimouse',
    name: 'Portimouse',
    description: 'Tiny paws on tiny wheels, cheese at every checkpoint, squeaking through the chicanes, the cat is always watching.',
    emoji: '🇵🇹',
    funEmoji: '🐭',
    length: 820,
    laps: 16,
    layout: LAYOUTS.classic, // Portimao classic
    isHistoric: true,
  },
];

// All tracks combined
export const ALL_TRACKS: Track[] = [...CURRENT_TRACKS, ...HISTORIC_TRACKS];

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

// Get current tracks only (for standard seasons)
export function getCurrentTracks(): Track[] {
  return CURRENT_TRACKS;
}

// Get historic tracks only (for special modes)
export function getHistoricTracks(): Track[] {
  return HISTORIC_TRACKS;
}

export function getRandomTracks(count: number, rng: Rng = Math.random): Track[] {
  return shuffle(CURRENT_TRACKS, rng).slice(0, Math.min(count, CURRENT_TRACKS.length));
}

export function getRandomTracksIncludingHistoric(count: number, rng: Rng = Math.random): Track[] {
  return shuffle(ALL_TRACKS, rng).slice(0, Math.min(count, ALL_TRACKS.length));
}

export function generateTrack(rng: Rng = Math.random): Track {
  return pick(CURRENT_TRACKS, rng);
}

export function generateSeason(numTracks: number = 5, rng: Rng = Math.random): Track[] {
  return getRandomTracks(Math.min(numTracks, CURRENT_TRACKS.length), rng);
}
