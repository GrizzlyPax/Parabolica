// The weather layer (C2 of the conditions stack — see docs/CONDITIONS_LAYER.md).
// A per-race roll, on top of the track, resolved deterministically from the
// league seed so the broadcast and the headless settle see the same storm.
// Weather does two things: applies a field-wide lean (crash/variance, scaled by
// intensity) and stamps condition ids that condition-gated tags read (Rain
// Dancer wakes on 'rain'). Pure data; the engine consumes a resolved WeatherState.

import { Rng, mulberry32, deriveSeed } from '../engine/rng';

/** Field-wide effects applied to every driver (already intensity-scaled). */
export interface WeatherEffects {
  /** Negative = more crashes for everyone (rain, fog). */
  crashResistance?: number;
  /** <1 = slower race. Field-wide, so it changes duration, not finish order. */
  speedModifier?: number;
  /** <1 = more variance — rewards consistent drivers (and Rain Dancers). */
  consistencyModifier?: number;
}

export interface WeatherState {
  id: string;
  name: string;
  emoji: string;
  intensity: number;       // 0-1
  conditions: string[];    // condition ids stamped on the field (tags read these)
  effects: WeatherEffects;  // already scaled by intensity
}

interface WeatherType {
  id: string;
  name: string;
  emoji: string;
  /** Relative frequency. Skewed hard toward mild so dramatic weather is rare
   * and weather-reactive tags stay spice, not destiny (CONDITIONS_LAYER §4). */
  weight: number;
  conditions: string[];
  /** Effects at intensity 1; scaled down by the rolled intensity. */
  baseEffects: WeatherEffects;
  /** Floor so e.g. Rain is always at least somewhat wet. */
  minIntensity: number;
}

export const WEATHER_TYPES: WeatherType[] = [
  { id: 'clear', name: 'Clear', emoji: '☀️', weight: 60, conditions: [], baseEffects: {}, minIntensity: 1 },
  { id: 'windy', name: 'Windy', emoji: '💨', weight: 18, conditions: ['windy'], baseEffects: { consistencyModifier: 0.98 }, minIntensity: 0.5 },
  { id: 'scorcher', name: 'Scorcher', emoji: '🔥', weight: 9, conditions: ['scorcher'], baseEffects: { speedModifier: 0.99, crashResistance: -0.03 }, minIntensity: 0.5 },
  { id: 'fog', name: 'Fog', emoji: '🌫️', weight: 7, conditions: ['fog'], baseEffects: { crashResistance: -0.06, speedModifier: 0.98 }, minIntensity: 0.5 },
  { id: 'rain', name: 'Rain', emoji: '🌧️', weight: 6, conditions: ['rain'], baseEffects: { crashResistance: -0.10, speedModifier: 0.96, consistencyModifier: 0.97 }, minIntensity: 0.5 },
];

/** Scale an effect set toward neutral by k (0 = neutral, 1 = full). */
function scaleEffects(e: WeatherEffects, k: number): WeatherEffects {
  const out: WeatherEffects = {};
  if (e.crashResistance !== undefined) out.crashResistance = e.crashResistance * k;
  if (e.speedModifier !== undefined) out.speedModifier = 1 - (1 - e.speedModifier) * k;
  if (e.consistencyModifier !== undefined) out.consistencyModifier = 1 - (1 - e.consistencyModifier) * k;
  return out;
}

/** Roll a weather state from a weighted draw + intensity. */
export function rollWeather(rng: Rng = Math.random): WeatherState {
  const total = WEATHER_TYPES.reduce((s, w) => s + w.weight, 0);
  let r = rng() * total;
  let type = WEATHER_TYPES[0];
  for (const w of WEATHER_TYPES) {
    if (r < w.weight) { type = w; break; }
    r -= w.weight;
  }
  const intensity = type.minIntensity + rng() * (1 - type.minIntensity);
  return {
    id: type.id,
    name: type.name,
    emoji: type.emoji,
    intensity,
    conditions: type.conditions,
    effects: type.id === 'clear' ? {} : scaleEffects(type.baseEffects, intensity),
  };
}

/** Deterministic per-race weather — part of a league's fixed universe, so the
 * live broadcast and the headless settle agree (the #149 contract). */
export function weatherForRace(leagueSeed: number, raceIndex: number): WeatherState {
  return rollWeather(mulberry32(deriveSeed(leagueSeed, 'weather', raceIndex)));
}
