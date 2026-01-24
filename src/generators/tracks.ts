// Parabolica Track System - F1-Inspired Racing Venues

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
// CURRENT SEASON TRACKS (24)
// F1-Inspired with punny names and aesthetics
// ============================================

export const CURRENT_TRACKS: Track[] = [
  // 1. Bahrain - Venhir
  {
    id: 'venhir',
    name: 'Venhir',
    description: 'Fangs gleaming under the lights, dentist chairs in every garage, open wide for inspection, floss mandatory.',
    emoji: '🇧🇭',
    funEmoji: '🦷',
    length: 850,
    laps: 15,
    layout: LAYOUTS.diamond,
  },
  // 2. Saudi Arabia - Cheddah
  {
    id: 'cheddah',
    name: 'Cheddah',
    description: 'Cheese caves as far as the eye can see, wheels aging in silence, the sharpest place on earth, brie breezes.',
    emoji: '🇸🇦',
    funEmoji: '🧀',
    length: 900,
    laps: 14,
    layout: LAYOUTS.rectangle,
  },
  // 3. Australia - All Bird Park
  {
    id: 'all-bird-park',
    name: 'All Bird Park',
    description: 'Feathers everywhere, constant squawking, birds judging your racing line, someone\'s cracker got stolen.',
    emoji: '🇦🇺',
    funEmoji: '🦜',
    length: 820,
    laps: 16,
    layout: LAYOUTS.stadium,
  },
  // 4. Japan - Choo-Choo-Ka
  {
    id: 'choo-choo-ka',
    name: 'Choo-Choo-Ka',
    description: 'Train heaven, steam galore, where all your ticket-punching dreams come true, eternal platform announcements.',
    emoji: '🇯🇵',
    funEmoji: '🚂',
    length: 880,
    laps: 15,
    layout: LAYOUTS.diamond,
  },
  // 5. China - Fang High
  {
    id: 'fang-high',
    name: 'Fang High',
    description: 'Lockers full of capes, prom is at midnight, the cafeteria only serves red, yearbook photos won\'t develop.',
    emoji: '🇨🇳',
    funEmoji: '🧛',
    length: 850,
    laps: 15,
    layout: LAYOUTS.oval,
  },
  // 6. Miami - Spyami
  {
    id: 'spyami',
    name: 'Spyami',
    description: 'Trench coats in the shadows, dead drops in the pit lane, everyone\'s got a handler, the walls have ears.',
    emoji: '🇺🇸',
    funEmoji: '🕵️‍♂️',
    length: 800,
    laps: 16,
    layout: LAYOUTS.rectangle,
  },
  // 7. Imola - Grimola
  {
    id: 'grimola',
    name: 'Grimola',
    description: 'Fog rolling through the chicanes, skulls grinning from the grandstands, beautiful but haunted, don\'t look back.',
    emoji: '🇮🇹',
    funEmoji: '💀',
    length: 780,
    laps: 17,
    layout: LAYOUTS.triangle,
  },
  // 8. Monaco - Monacoco
  {
    id: 'monacoco',
    name: 'Monacoco',
    description: 'Chocolate waterfalls, cocoa fog in the streets, everything melts eventually, sweet sweet surrender.',
    emoji: '🇲🇨',
    funEmoji: '🍫',
    length: 700,
    laps: 18,
    layout: LAYOUTS.rectangle,
  },
  // 9. Spain - Cattylosers
  {
    id: 'cattylosers',
    name: 'Cattylosers',
    description: 'Scratching posts for miles, hairball alley, where trophies go to fall, eternal hissing in the distance.',
    emoji: '🇪🇸',
    funEmoji: '🐱',
    length: 820,
    laps: 16,
    layout: LAYOUTS.stadium,
  },
  // 10. Canada - Mini-Vanada
  {
    id: 'mini-vanada',
    name: 'Mini-Vanada',
    description: 'Sliding doors and Cheerios in the seats, snack distribution from the front, "don\'t make me turn this around."',
    emoji: '🇨🇦',
    funEmoji: '🚙',
    length: 800,
    laps: 16,
    layout: LAYOUTS.oval,
  },
  // 11. Austria - Eelburg
  {
    id: 'eelburg',
    name: 'Eelburg',
    description: 'Electric eels in the walls, everything\'s buzzing, don\'t touch the barriers, shockingly fast.',
    emoji: '🇦🇹',
    funEmoji: '⚡️',
    length: 720,
    laps: 18,
    layout: LAYOUTS.triangle,
  },
  // 12. Great Britain - Silverclone
  {
    id: 'silverclone',
    name: 'Silverclone',
    description: 'Robots everywhere, uncanny valley vibes, everyone looks familiar, are you the original or the copy?',
    emoji: '🇬🇧',
    funEmoji: '🤖',
    length: 880,
    laps: 15,
    layout: LAYOUTS.stadium,
  },
  // 13. Belgium - Spa Frankenstein
  {
    id: 'spa-frankenstein',
    name: 'Spa Frankenstein',
    description: 'Frankenstein runs a surprisingly lovely spa here, hot springs and lightning therapy, monster hospitality, bolts on the house.',
    emoji: '🇧🇪',
    funEmoji: '🧟‍♂️',
    length: 950,
    laps: 14,
    layout: LAYOUTS.diamond,
  },
  // 14. Hungary - Tonguearoring
  {
    id: 'tonguearoring',
    name: 'Tonguearoring',
    description: 'Flavor country, everything is a taste test, suspiciously sticky grandstands, lick at your own risk.',
    emoji: '🇭🇺',
    funEmoji: '👅',
    length: 780,
    laps: 17,
    layout: LAYOUTS.oval,
  },
  // 15. Netherlands - Sandforts
  {
    id: 'sandforts',
    name: 'Sandforts',
    description: 'Moats around every corner, bucket and spade engineering, tides come in without warning, your castle will fall.',
    emoji: '🇳🇱',
    funEmoji: '🏖️',
    length: 760,
    laps: 17,
    layout: LAYOUTS.stadium,
  },
  // 16. Italy - Monsta
  {
    id: 'monsta',
    name: 'Monsta',
    description: 'Something roaring in the temple, speed demons welcome, the creature under the track hungers, feed it laps.',
    emoji: '🇮🇹',
    funEmoji: '🧌',
    length: 900,
    laps: 14,
    layout: LAYOUTS.oval,
  },
  // 17. Azerbaijan - Snapbaku
  {
    id: 'snapbaku',
    name: 'Snapbaku',
    description: 'Hats flying everywhere, brims bent just right, backwards cap energy, fitted or nothing.',
    emoji: '🇦🇿',
    funEmoji: '🧢',
    length: 920,
    laps: 14,
    layout: LAYOUTS.rectangle,
  },
  // 18. Singapore - Subpoena Day
  {
    id: 'subpoena-day',
    name: 'Subpoena Day',
    description: 'Court is in session, gavels banging, everyone\'s serving papers, the verdict is always dramatic.',
    emoji: '🇸🇬',
    funEmoji: '👩‍⚖️',
    length: 850,
    laps: 15,
    layout: LAYOUTS.rectangle,
  },
  // 19. Austin - MOTA
  {
    id: 'mota',
    name: 'MOTA',
    description: 'Castle on a hill, drawbridge pit entry, jousting but faster, someone brought a trebuchet.',
    emoji: '🇺🇸',
    funEmoji: '🏰',
    length: 880,
    laps: 15,
    layout: LAYOUTS.diamond,
  },
  // 20. Mexico - T-Rex & Co.
  {
    id: 't-rex-and-co',
    name: 'T-Rex & Co.',
    description: 'Family business since the Jurassic, tiny arms big dreams, the siblings run this town, meteor-proof since \'65.',
    emoji: '🇲🇽',
    funEmoji: '🦖',
    length: 800,
    laps: 16,
    layout: LAYOUTS.stadium,
  },
  // 21. Brazil - Winter Igloos
  {
    id: 'winter-igloos',
    name: 'Winter Igloos',
    description: 'Frozen paradise, penguins in the paddock, everything\'s chill, ice sculptures judging you.',
    emoji: '🇧🇷',
    funEmoji: '🧊',
    length: 780,
    laps: 17,
    layout: LAYOUTS.triangle,
  },
  // 22. Las Vegas - Las PEMDAS
  {
    id: 'las-pemdas',
    name: 'Las PEMDAS',
    description: 'Please excuse my dear aunt Sally, parentheses everywhere, order of operations strictly enforced, show your work.',
    emoji: '🇺🇸',
    funEmoji: '🧮',
    length: 920,
    laps: 14,
    layout: LAYOUTS.rectangle,
  },
  // 23. Qatar - Rainbowha
  {
    id: 'rainbowha',
    name: 'Rainbowha',
    description: 'Unicorns grazing in the infield, glitter in the air vents, manes flowing at 200mph, sparkle mandatory.',
    emoji: '🇶🇦',
    funEmoji: '🦄',
    length: 850,
    laps: 15,
    layout: LAYOUTS.oval,
  },
  // 24. Abu Dhabi - Yas Christina!
  {
    id: 'yas-christina',
    name: 'Yas Christina!',
    description: 'Dance floor pit stops, someone\'s always spinning, heels on the podium, the crowd moves as one.',
    emoji: '🇦🇪',
    funEmoji: '💃',
    length: 880,
    laps: 15,
    layout: LAYOUTS.diamond,
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
    layout: LAYOUTS.oval,
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
    layout: LAYOUTS.diamond,
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
    layout: LAYOUTS.stadium,
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
    layout: LAYOUTS.rectangle,
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
    layout: LAYOUTS.diamond,
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
    layout: LAYOUTS.triangle,
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
    layout: LAYOUTS.stadium,
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

export function getRandomTracks(count: number): Track[] {
  const shuffled = [...CURRENT_TRACKS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, CURRENT_TRACKS.length));
}

export function getRandomTracksIncludingHistoric(count: number): Track[] {
  const shuffled = [...ALL_TRACKS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, ALL_TRACKS.length));
}

export function generateTrack(): Track {
  return CURRENT_TRACKS[Math.floor(Math.random() * CURRENT_TRACKS.length)];
}

export function generateSeason(numTracks: number = 5): Track[] {
  return getRandomTracks(Math.min(numTracks, CURRENT_TRACKS.length));
}
