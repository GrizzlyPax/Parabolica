// Weather v2, dry half (#359, docs/TRACKS_WEATHER.md). A per-race roll from
// the league seed, so the broadcast and the headless settle see the same sky.
// Neutral most races; otherwise one of five dry weathers that FAVOUR two stats
// (+pct × intensity each, field-wide) through the card math at race build,
// stacking with the track's favours. No rain in v0.5: Wet (lap by lap, a wet
// tyre, the pit rule suspended) arrives in v0.6. The data is
// src/data/deckWeather.ts; this module rolls it.

import { Rng, mulberry32, deriveSeed } from '../engine/rng';
import { BASE_DECK_WEATHER, type DeckWeather } from './deckWeather';
import type { CardStat } from '../cards/types';

/** Field-wide engine leans. Empty for every dry weather; Wet brings them back in v0.6. */
export interface WeatherEffects {
  crashResistance?: number;
  speedModifier?: number;
  consistencyModifier?: number;
}

export interface WeatherState {
  id: string;
  name: string;
  emoji: string;
  intensity: number;        // 0-1
  /** Condition ids stamped on the field (none in v0.5; Wet stamps 'rain' in v0.6). */
  conditions: string[];
  effects: WeatherEffects;  // already scaled by intensity
  /** Favoured stats at this intensity (pct already scaled). */
  favours: CardStat[];
}

export interface WeatherType {
  id: string;
  name: string;
  emoji: string;
  /** game-icon id or meaning (src/icons/registry.ts); falls back to emoji. */
  iconId?: string;
  /** Relative frequency (percent of races, from the deck). */
  weight: number;
  conditions: string[];
  baseEffects: WeatherEffects;
  /** Floor for the rolled intensity; favours scale with it. */
  minIntensity: number;
  favours: CardStat[];
}

export const NEUTRAL_WEATHER_ID = 'neutral';

/** Placeholder glyphs until the icon map names these (docs/ICONS.md). */
const WEATHER_EMOJI: Record<string, string> = {
  neutral: '☀️', 'speed-tyre-management': '🔥', 'consistency-pit-crew': '🌤️',
  'acceleration-reliability': '💨', 'endurance-power': '🌡️', 'aggression-grip': '🌬️',
};

function weatherFromDeck(w: DeckWeather): WeatherType {
  return {
    id: w.id, name: w.name, emoji: WEATHER_EMOJI[w.id] ?? '🌤️', weight: w.odds, conditions: [], baseEffects: {},
    minIntensity: w.favours.length ? 0.5 : 1, favours: w.favours,
  };
}

export const WEATHER_TYPES: WeatherType[] = BASE_DECK_WEATHER.map(weatherFromDeck);

export function isNeutralWeather(w: Pick<WeatherState, 'id'> | null | undefined): boolean {
  return !w || w.id === NEUTRAL_WEATHER_ID;
}

/** Roll a weather state from a weighted draw + intensity. Always two rng draws. */
export function rollWeather(rng: Rng = Math.random, weights?: Record<string, number>): WeatherState {
  const wOf = (w: WeatherType) => weights?.[w.id] ?? w.weight;
  const total = WEATHER_TYPES.reduce((s, w) => s + Math.max(0, wOf(w)), 0);
  let r = rng() * total;
  let type = WEATHER_TYPES[0];
  if (total > 0) {
    for (const w of WEATHER_TYPES) {
      if (r < wOf(w)) { type = w; break; }
      r -= Math.max(0, wOf(w));
    }
  }
  const intensity = type.minIntensity + rng() * (1 - type.minIntensity);
  return {
    id: type.id,
    name: type.name,
    emoji: type.emoji,
    intensity,
    conditions: type.conditions,
    effects: {},
    favours: type.favours.map(f => ({ stat: f.stat, pct: f.pct * intensity })),
  };
}

/** Deterministic per-race weather — part of a league's fixed universe, so the
 * live broadcast and the headless settle agree (the #149 contract). */
export function weatherForRace(leagueSeed: number, raceIndex: number, weights?: Record<string, number>): WeatherState {
  return rollWeather(mulberry32(deriveSeed(leagueSeed, 'weather', raceIndex)), weights);
}
