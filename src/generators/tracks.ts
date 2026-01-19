// Track generation system - 20 fixed tracks with unique events

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
  | { type: 'lap'; laps: number[] }           // Specific laps (e.g., [3, 8, 'final'])
  | { type: 'interval'; every: number }        // Every N laps
  | { type: 'random'; chance: number }         // % chance per lap
  | { type: 'halfway' }                        // At halfway point
  | { type: 'condition'; condition: string }   // Special condition (e.g., 'leader_3_laps')
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
  description: string;            // Short description for UI
  flavorText: string;             // What shows in notification
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
// THE 20 TRACKS
// ============================================

export const ALL_TRACKS: Track[] = [
  // 1. Caldera Circuit - Eruption
  {
    id: 'caldera-circuit',
    name: 'Caldera Circuit',
    description: 'Ancient volcanic crater, dormant but restless',
    emoji: '🌋',
    length: 800,
    laps: 15,
    layout: LAYOUTS.oval,
    event: {
      id: 'eruption',
      name: 'Eruption',
      emoji: '🌋',
      description: 'Every 5 laps: Bottom 4 lose progress',
      flavorText: 'The volcano erupts! Lava engulfs the back of the pack!',
      trigger: { type: 'interval', every: 5 },
      effect: { type: 'progress_loss', targets: 'bottom', count: 4, amount: [5, 10] },
    },
  },
  // 2. Frostfang Pass - Avalanche
  {
    id: 'frostfang-pass',
    name: 'Frostfang Pass',
    description: 'Carved through glacier mountains',
    emoji: '❄️',
    length: 700,
    laps: 16,
    layout: LAYOUTS.triangle,
    event: {
      id: 'avalanche',
      name: 'Avalanche',
      emoji: '❄️',
      description: 'Laps 3, 8, final: 3 random drivers spin',
      flavorText: 'AVALANCHE! Ice and snow cascade onto the track!',
      trigger: { type: 'lap', laps: [3, 8, -1] }, // -1 = final lap
      effect: { type: 'spin', targets: 'random', count: 3, timeLoss: [2, 4] },
    },
  },
  // 3. Sirensong Bay - High Tide
  {
    id: 'sirensong-bay',
    name: 'Sirensong Bay',
    description: 'Coastal track that floods twice per race',
    emoji: '🌊',
    length: 780,
    laps: 17,
    layout: LAYOUTS.stadium,
    event: {
      id: 'high-tide',
      name: 'High Tide',
      emoji: '🌊',
      description: 'Halfway: Gaps compress to leader',
      flavorText: 'The tide rises! Water sweeps across the track, bunching the field!',
      trigger: { type: 'halfway' },
      effect: { type: 'gap_compress', within: 5 },
    },
  },
  // 4. Tempest Spire - Lightning Strike
  {
    id: 'tempest-spire',
    name: 'Tempest Spire',
    description: 'Tower peak where storms gather',
    emoji: '⚡',
    length: 750,
    laps: 18,
    layout: LAYOUTS.diamond,
    event: {
      id: 'lightning-strike',
      name: 'Lightning Strike',
      emoji: '⚡',
      description: '15% per lap: Random driver gets speed boost',
      flavorText: 'LIGHTNING STRIKE! Raw energy courses through a driver!',
      trigger: { type: 'random', chance: 15 },
      effect: { type: 'speed_boost', targets: 'random', count: 1, amount: 20, duration: 1 },
    },
  },
  // 5. Dune Sea Drift - Sandstorm
  {
    id: 'dune-sea-drift',
    name: 'Dune Sea Drift',
    description: 'Endless golden sands, visibility drops without warning',
    emoji: '🏜️',
    length: 950,
    laps: 14,
    layout: LAYOUTS.oval,
    event: {
      id: 'sandstorm',
      name: 'Sandstorm',
      emoji: '🏜️',
      description: 'Laps 4-7: Pit stops take 50% longer',
      flavorText: 'A SANDSTORM engulfs the pits! Crews struggle to see!',
      trigger: { type: 'lap', laps: [4, 5, 6, 7] },
      effect: { type: 'pit_delay', modifier: 1.5, duration: 4 },
    },
  },
  // 6. Wraithwood Run - Ghost Lap
  {
    id: 'wraithwood-run',
    name: 'Wraithwood Run',
    description: 'Haunted forest where drivers see things',
    emoji: '👻',
    length: 850,
    laps: 15,
    layout: LAYOUTS.rectangle,
    event: {
      id: 'ghost-lap',
      name: 'Ghost Lap',
      emoji: '👻',
      description: '12% per lap: Last place teleports to P10',
      flavorText: 'A GHOST possesses the last place driver and hurls them forward!',
      trigger: { type: 'random', chance: 12 },
      effect: { type: 'position_shuffle', targets: 'random', positions: [20, 10] },
    },
  },
  // 7. Jester's Gambit - Wheel of Fate
  {
    id: 'jesters-gambit',
    name: "Jester's Gambit",
    description: 'Carnival grounds, nothing is predictable',
    emoji: '🎪',
    length: 680,
    laps: 20,
    layout: LAYOUTS.stadium,
    event: {
      id: 'wheel-of-fate',
      name: 'Wheel of Fate',
      emoji: '🎪',
      description: '20% per lap: Random driver gains or loses 2 positions',
      flavorText: 'The WHEEL OF FATE spins! Fortune smiles... or frowns!',
      trigger: { type: 'random', chance: 20 },
      effect: { type: 'position_shuffle', targets: 'random', positions: [-2, 2] },
    },
  },
  // 8. Thornheart Trail - Fallen Tree
  {
    id: 'thornheart-trail',
    name: 'Thornheart Trail',
    description: 'Dense ancient forest, nature fights back',
    emoji: '🌲',
    length: 720,
    laps: 18,
    layout: LAYOUTS.triangle,
    event: {
      id: 'fallen-tree',
      name: 'Fallen Tree',
      emoji: '🌲',
      description: '10% per lap: Random driver forced into pit',
      flavorText: 'A TREE crashes onto the track! Emergency pit stop required!',
      trigger: { type: 'random', chance: 10 },
      effect: { type: 'forced_pit', targets: 'random', count: 1 },
    },
  },
  // 9. Prismatic Hollow - Crystal Resonance
  {
    id: 'prismatic-hollow',
    name: 'Prismatic Hollow',
    description: 'Crystal caves that hum with strange energy',
    emoji: '💎',
    length: 900,
    laps: 14,
    layout: LAYOUTS.diamond,
    event: {
      id: 'crystal-resonance',
      name: 'Crystal Resonance',
      emoji: '💎',
      description: 'Leader for 3+ laps gets speed penalty',
      flavorText: 'The CRYSTALS resonate against dominance! The leader is slowed!',
      trigger: { type: 'condition', condition: 'leader_3_laps' },
      effect: { type: 'speed_penalty', targets: 'leader', count: 1, amount: 5, duration: 2 },
    },
  },
  // 10. Lunar Terrace - Moonphase Shift
  {
    id: 'lunar-terrace',
    name: 'Lunar Terrace',
    description: 'Elevated plateau bathed in moonlight',
    emoji: '🌙',
    length: 800,
    laps: 16,
    layout: LAYOUTS.rectangle,
    event: {
      id: 'moonphase-shift',
      name: 'Moonphase Shift',
      emoji: '🌙',
      description: 'Every 4 laps: Top 5 slowed, bottom 5 boosted',
      flavorText: 'The MOON shifts phase! Fortune reverses for leaders and stragglers!',
      trigger: { type: 'interval', every: 4 },
      effect: { type: 'speed_boost', targets: 'bottom', count: 5, amount: 10, duration: 1 },
    },
  },
  // 11. Emberclaw Descent - Dragon's Breath
  {
    id: 'emberclaw-descent',
    name: 'Emberclaw Descent',
    description: 'Volcanic slopes where dragons once nested',
    emoji: '🐉',
    length: 750,
    laps: 17,
    layout: LAYOUTS.triangle,
    event: {
      id: 'dragons-breath',
      name: "Dragon's Breath",
      emoji: '🐉',
      description: 'Lap 1 & final 3: +50% crash risk',
      flavorText: "DRAGON'S BREATH scorches the track! Drive carefully!",
      trigger: { type: 'lap', laps: [1, -3, -2, -1] }, // 1 and final 3
      effect: { type: 'crash_risk', modifier: 1.5, duration: 1 },
    },
  },
  // 12. Astral Fields - Star Shower
  {
    id: 'astral-fields',
    name: 'Astral Fields',
    description: 'Open plains under infinite stars',
    emoji: '⭐',
    length: 820,
    laps: 16,
    layout: LAYOUTS.oval,
    event: {
      id: 'star-shower',
      name: 'Star Shower',
      emoji: '⭐',
      description: '8% per lap: All drivers get random speed modifier',
      flavorText: 'STARS rain down! Cosmic energy affects everyone differently!',
      trigger: { type: 'random', chance: 8 },
      effect: { type: 'speed_boost', targets: 'random', count: 20, amount: 10, duration: 1 },
    },
  },
  // 13. Maelstrom Marina - Whirlpool
  {
    id: 'maelstrom-marina',
    name: 'Maelstrom Marina',
    description: 'Harbor track built over restless waters',
    emoji: '🌀',
    length: 780,
    laps: 17,
    layout: LAYOUTS.stadium,
    event: {
      id: 'whirlpool',
      name: 'Whirlpool',
      emoji: '🌀',
      description: 'Halfway: Positions 8-12 shuffle randomly',
      flavorText: 'A WHIRLPOOL churns beneath the track! The midpack scrambles!',
      trigger: { type: 'halfway' },
      effect: { type: 'position_shuffle', targets: 'midpack', positions: [8, 12] },
    },
  },
  // 14. Solara Heights - Solar Flare
  {
    id: 'solara-heights',
    name: 'Solara Heights',
    description: 'Sun-scorched peaks, blinding and purifying',
    emoji: '☀️',
    length: 850,
    laps: 15,
    layout: LAYOUTS.diamond,
    event: {
      id: 'solar-flare',
      name: 'Solar Flare',
      emoji: '☀️',
      description: 'Every 6 laps: All boosts/penalties reset',
      flavorText: 'A SOLAR FLARE washes over the track! All effects neutralized!',
      trigger: { type: 'interval', every: 6 },
      effect: { type: 'speed_boost', targets: 'all' as any, count: 20, amount: 0, duration: 0 },
    },
  },
  // 15. Shatterstone Ridge - Tremor
  {
    id: 'shatterstone-ridge',
    name: 'Shatterstone Ridge',
    description: 'Unstable mountain pass, cracks form mid-race',
    emoji: '🏔️',
    length: 770,
    laps: 16,
    layout: LAYOUTS.rectangle,
    event: {
      id: 'tremor',
      name: 'Tremor',
      emoji: '🏔️',
      description: '15% per lap: Random team loses progress',
      flavorText: 'TREMOR! The ground shakes and cracks open!',
      trigger: { type: 'random', chance: 15 },
      effect: { type: 'progress_loss', targets: 'random', count: 2, amount: [2, 5] },
    },
  },
  // 16. Misthollow Bend - Fog Bank
  {
    id: 'misthollow-bend',
    name: 'Misthollow Bend',
    description: 'Valley that fills with dense mist',
    emoji: '🌫️',
    length: 800,
    laps: 16,
    layout: LAYOUTS.oval,
    event: {
      id: 'fog-bank',
      name: 'Fog Bank',
      emoji: '🌫️',
      description: 'Laps 2-4: Crash risk increases',
      flavorText: 'FOG rolls in! Visibility drops to near zero!',
      trigger: { type: 'lap', laps: [2, 3, 4] },
      effect: { type: 'crash_risk', modifier: 1.4, duration: 3 },
    },
  },
  // 17. Crimson Eclipse - Blood Moon
  {
    id: 'crimson-eclipse',
    name: 'Crimson Eclipse',
    description: 'Cursed grounds where the moon turns red',
    emoji: '🔴',
    length: 750,
    laps: 17,
    layout: LAYOUTS.triangle,
    event: {
      id: 'blood-moon',
      name: 'Blood Moon',
      emoji: '🔴',
      description: 'Final 2 laps: DNF chance doubles',
      flavorText: 'The BLOOD MOON rises! Danger lurks in every corner!',
      trigger: { type: 'final_laps', count: 2 },
      effect: { type: 'crash_risk', modifier: 2.0, duration: 2 },
    },
  },
  // 18. Clover Crossing - Fortune's Favor
  {
    id: 'clover-crossing',
    name: 'Clover Crossing',
    description: 'Lucky track where close battles are rewarded',
    emoji: '🍀',
    length: 800,
    laps: 16,
    layout: LAYOUTS.stadium,
    event: {
      id: 'fortunes-favor',
      name: "Fortune's Favor",
      emoji: '🍀',
      description: 'When P1 & P2 within 0.5s: Both get speed boost',
      flavorText: "FORTUNE'S FAVOR! Close racing is rewarded!",
      trigger: { type: 'condition', condition: 'close_battle' },
      effect: { type: 'speed_boost', targets: 'top' as any, count: 2, amount: 10, duration: 1 },
    },
  },
  // 19. Riftgate Ruins - Arcane Surge
  {
    id: 'riftgate-ruins',
    name: 'Riftgate Ruins',
    description: 'Ancient magical site with unpredictable energy',
    emoji: '🔮',
    length: 820,
    laps: 16,
    layout: LAYOUTS.diamond,
    event: {
      id: 'arcane-surge',
      name: 'Arcane Surge',
      emoji: '🔮',
      description: '10% per lap: Random driver gets instant pit',
      flavorText: 'ARCANE SURGE! Magic grants an instant pit stop!',
      trigger: { type: 'random', chance: 10 },
      effect: { type: 'instant_pit', targets: 'random', count: 1 },
    },
  },
  // 20. Thunderhoof Plains - Stampede
  {
    id: 'thunderhoof-plains',
    name: 'Thunderhoof Plains',
    description: 'Wild grasslands where underdogs thrive',
    emoji: '🦬',
    length: 780,
    laps: 17,
    layout: LAYOUTS.rectangle,
    event: {
      id: 'stampede',
      name: 'Stampede',
      emoji: '🦬',
      description: 'Every 3 laps: Bottom 6 get speed boost',
      flavorText: 'STAMPEDE! The pack charges forward with renewed energy!',
      trigger: { type: 'interval', every: 3 },
      effect: { type: 'speed_boost', targets: 'bottom', count: 6, amount: 8, duration: 1 },
    },
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate a dynamic event description based on total laps
 * Replaces hardcoded lap numbers with actual lap numbers for the race
 */
export function getDynamicEventDescription(event: TrackEvent, totalLaps: number): string {
  const trigger = event.trigger;

  switch (trigger.type) {
    case 'lap': {
      // Convert negative lap numbers (final laps) to actual numbers
      const laps = trigger.laps.map(lap => lap < 0 ? totalLaps + lap + 1 : lap);
      const sortedLaps = [...laps].sort((a, b) => a - b);

      // Format the lap list nicely
      const lapStr = formatLapList(sortedLaps, totalLaps);

      // Get the effect description
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
      // Condition-based triggers keep their original descriptions
      return event.description;
    }

    default:
      return event.description;
  }
}

/**
 * Format a list of laps into a readable string
 */
function formatLapList(laps: number[], totalLaps: number): string {
  if (laps.length === 0) return 'No laps';
  if (laps.length === 1) {
    return laps[0] === totalLaps ? 'Final lap' : `Lap ${laps[0]}`;
  }

  // Check if it's a consecutive range
  const isConsecutive = laps.every((lap, i) => i === 0 || lap === laps[i - 1] + 1);
  if (isConsecutive && laps.length > 2) {
    const hasFinal = laps[laps.length - 1] === totalLaps;
    if (hasFinal) {
      return `Laps ${laps[0]}-final`;
    }
    return `Laps ${laps[0]}-${laps[laps.length - 1]}`;
  }

  // Format as list, replacing final lap with "final"
  const formatted = laps.map(lap => lap === totalLaps ? 'final' : lap.toString());
  if (formatted.length === 2) {
    return `Laps ${formatted[0]} & ${formatted[1]}`;
  }
  return `Laps ${formatted.slice(0, -1).join(', ')} & ${formatted[formatted.length - 1]}`;
}

/**
 * Get a short description of an effect
 */
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

// For backwards compatibility - generates a random track from the fixed list
export function generateTrack(): Track {
  return ALL_TRACKS[Math.floor(Math.random() * ALL_TRACKS.length)];
}

// Generate a season of unique tracks
export function generateSeason(numTracks: number = 5): Track[] {
  return getRandomTracks(Math.min(numTracks, ALL_TRACKS.length));
}
