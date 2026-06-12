import { describe, it, expect } from 'vitest';
import { rollWeather, weatherForRace, WEATHER_TYPES } from './weather';
import { mulberry32 } from '../engine/rng';

describe('rollWeather', () => {
  it('skews mild — clear is the common case, dramatic weather is rare', () => {
    const counts = new Map<string, number>();
    const rng = mulberry32(12345);
    for (let i = 0; i < 5000; i++) {
      const w = rollWeather(rng);
      counts.set(w.id, (counts.get(w.id) ?? 0) + 1);
    }
    const clear = counts.get('clear') ?? 0;
    const rain = counts.get('rain') ?? 0;
    expect(clear / 5000).toBeGreaterThan(0.5);  // ~60% clear
    expect(rain / 5000).toBeLessThan(0.12);     // rain rare
    expect(clear).toBeGreaterThan(rain * 4);    // clear dwarfs rain
  });

  it('produces valid states: known id, intensity in range, scaled effects', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 500; i++) {
      const w = rollWeather(rng);
      const type = WEATHER_TYPES.find(t => t.id === w.id)!;
      expect(type).toBeDefined();
      expect(w.intensity).toBeGreaterThanOrEqual(type.minIntensity);
      expect(w.intensity).toBeLessThanOrEqual(1);
      expect(w.conditions).toEqual(type.conditions);
    }
  });

  it('clear weather is inert (no effects, no conditions)', () => {
    // Force the clear branch: weight 60 of 100 sits at the front of the table.
    const w = rollWeather(() => 0);
    expect(w.id).toBe('clear');
    expect(w.effects).toEqual({});
    expect(w.conditions).toEqual([]);
  });

  it('intensity scales effects toward neutral', () => {
    const rainType = WEATHER_TYPES.find(t => t.id === 'rain')!;
    // Build a low- and high-intensity rain by hand via the same scale path.
    const lo = rollWeather(seqRng([rainOffset(), 0]));   // intensity = minIntensity
    const hi = rollWeather(seqRng([rainOffset(), 1]));   // intensity = 1 (full storm)
    expect(lo.id).toBe('rain');
    expect(hi.id).toBe('rain');
    // Stronger storm = bigger (more negative) crash lean.
    expect(hi.effects.crashResistance!).toBeLessThan(lo.effects.crashResistance!);
    expect(Math.abs(hi.effects.crashResistance!)).toBeCloseTo(Math.abs(rainType.baseEffects.crashResistance!), 5);
  });
});

describe('weatherForRace (deterministic universe)', () => {
  it('is fully determined by (leagueSeed, raceIndex)', () => {
    const a = weatherForRace(999, 3);
    const b = weatherForRace(999, 3);
    expect(b).toEqual(a);
  });

  it('different races and different leagues roll independently', () => {
    const seasonA = Array.from({ length: 16 }, (_, i) => weatherForRace(42, i).id);
    const seasonB = Array.from({ length: 16 }, (_, i) => weatherForRace(43, i).id);
    expect(seasonA).not.toEqual(seasonB);          // different universe
    expect(new Set(seasonA).size).toBeGreaterThan(1); // a season has variety
  });
});

// --- helpers: a deterministic rng that returns a fixed sequence then loops ---
function seqRng(values: number[]) {
  let i = 0;
  return () => values[i++ % values.length];
}
/** First rng draw that lands inside the 'rain' weight bucket. */
function rainOffset(): number {
  const total = WEATHER_TYPES.reduce((s, w) => s + w.weight, 0);
  let before = 0;
  for (const w of WEATHER_TYPES) {
    if (w.id === 'rain') break;
    before += w.weight;
  }
  return (before + 0.5) / total; // mid-bucket for rain
}
