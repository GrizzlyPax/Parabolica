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
// TRACKS (Tracks & Weather v2, dry half — #359, docs/TRACKS_WEATHER.md)
// Six stat-combo tracks replace the 31 themed ones. A track favours one driver
// stat and one car/team stat for the race, field-wide, through the card math
// (src/cards/apply.ts) at race build. Track events, the themed circuits and
// their intrinsic "characters" are retired. Data: src/data/deckTracks.ts.
// ============================================

import { BASE_DECK_TRACKS, type DeckTrack } from '../data/deckTracks';
import type { CardStat } from '../cards/types';

export interface Track {
  id: string;
  name: string;
  description: string;
  emoji: string;
  funEmoji: string;      // Fun/theme emoji (fallback while screens migrate to icons)
  /** game-icon id or meaning (src/icons/registry.ts); falls back to funEmoji. */
  iconId?: string;
  length: number;
  laps: number;
  layout: TrackLayout;
  /** Stats that count +pct% here, field-wide. Weather favours stack on top. */
  favours: CardStat[];
  isHistoric?: boolean;  // No historic tracks in v0.5; kept for the type's consumers
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


/** Each layout drawing's race distance, and a placeholder glyph until icons land. */
const LAYOUT_SHAPE: Record<DeckTrack['layoutId'], { length: number; laps: number; funEmoji: string }> = {
  power: { length: 900, laps: 14, funEmoji: '⚡' },
  technical: { length: 800, laps: 16, funEmoji: '🌀' },
  street: { length: 850, laps: 15, funEmoji: '🏙️' },
  flowing: { length: 850, laps: 15, funEmoji: '🌊' },
  modern: { length: 850, laps: 15, funEmoji: '🏟️' },
  classic: { length: 900, laps: 14, funEmoji: '🏛️' },
};

function trackFromDeck(t: DeckTrack): Track {
  const shape = LAYOUT_SHAPE[t.layoutId];
  return {
    id: t.id,
    name: t.name,
    description: `${t.name}: both count +${t.favours[0]?.pct ?? 0}% for the race, field-wide.`,
    emoji: '🏁',
    funEmoji: shape.funEmoji,
    length: shape.length,
    laps: shape.laps,
    layout: LAYOUTS[t.layoutId],
    favours: t.favours,
  };
}

/** The six tracks every race and season draws from. */
export const CURRENT_TRACKS: Track[] = BASE_DECK_TRACKS.map(trackFromDeck);

/** None in v0.5 (the themed circuits retired with Tracks & Weather v2). */
export const HISTORIC_TRACKS: Track[] = [];

export const ALL_TRACKS: Track[] = [...CURRENT_TRACKS, ...HISTORIC_TRACKS];


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
