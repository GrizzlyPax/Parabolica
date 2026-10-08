// Weather v2, dry half (#359): Neutral + five dry weathers that favour stats.
import { describe, it, expect } from 'vitest';
import { rollWeather, weatherForRace, WEATHER_TYPES, isNeutralWeather, NEUTRAL_WEATHER_ID } from './weather';
import { BASE_DECK_WEATHER } from './deckWeather';
import { FAVOUR_PCT } from './deckTracks';
import { mulberry32 } from '../engine/rng';

describe('rollWeather', () => {
  it('is Neutral about 60% of the time; the five dry weathers share the rest', () => {
    const counts = new Map<string, number>();
    const rng = mulberry32(12345);
    for (let i = 0; i < 5000; i++) {
      const w = rollWeather(rng);
      counts.set(w.id, (counts.get(w.id) ?? 0) + 1);
    }
    const neutral = counts.get(NEUTRAL_WEATHER_ID) ?? 0;
    expect(neutral / 5000).toBeGreaterThan(0.56);
    expect(neutral / 5000).toBeLessThan(0.64);
    for (const w of BASE_DECK_WEATHER.filter(x => x.id !== NEUTRAL_WEATHER_ID)) {
      expect((counts.get(w.id) ?? 0) / 5000, w.id).toBeGreaterThan(0.05);
      expect((counts.get(w.id) ?? 0) / 5000, w.id).toBeLessThan(0.11);
    }
    expect(counts.has('rain')).toBe(false); // no rain in v0.5
  });

  it('produces valid states: a deck id, intensity in range, no engine leans, no conditions', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 500; i++) {
      const w = rollWeather(rng);
      const type = WEATHER_TYPES.find(t => t.id === w.id)!;
      expect(type).toBeDefined();
      expect(w.intensity).toBeGreaterThanOrEqual(type.minIntensity);
      expect(w.intensity).toBeLessThanOrEqual(1);
      expect(w.conditions).toEqual([]);
      expect(w.effects).toEqual({});
    }
  });

  it('neutral is inert (no favours); a dry weather favours its two stats × intensity', () => {
    const neutral = rollWeather(() => 0);
    expect(neutral.id).toBe(NEUTRAL_WEATHER_ID);
    expect(isNeutralWeather(neutral)).toBe(true);
    expect(neutral.favours).toEqual([]);
    const dryType = WEATHER_TYPES.find(t => t.id === 'speed-tyre-management')!;
    const lo = rollWeather(seqRng([offsetOf('speed-tyre-management'), 0]));  // intensity = minIntensity
    const hi = rollWeather(seqRng([offsetOf('speed-tyre-management'), 1]));  // full intensity
    expect(lo.id).toBe('speed-tyre-management');
    expect(hi.id).toBe('speed-tyre-management');
    expect(isNeutralWeather(hi)).toBe(false);
    expect(hi.favours).toEqual(dryType.favours.map(f => ({ stat: f.stat, pct: FAVOUR_PCT })));
    expect(lo.favours.map(f => f.pct)).toEqual(dryType.favours.map(() => FAVOUR_PCT * dryType.minIntensity));
    expect(hi.favours.map(f => f.stat)).toEqual(['baseSpeed', 'tireManagement']);
  });

  it('rule-card weights steer it: a single id at 100 always lands there', () => {
    const only = Object.fromEntries(WEATHER_TYPES.map(w => [w.id, w.id === 'aggression-grip' ? 100 : 0]));
    for (let i = 0; i < 20; i++) expect(weatherForRace(5, i, only).id).toBe('aggression-grip');
  });
});

describe('weatherForRace (deterministic universe)', () => {
  it('is fully determined by (leagueSeed, raceIndex)', () => {
    expect(weatherForRace(999, 3)).toEqual(weatherForRace(999, 3));
  });

  it('different races and different leagues roll independently', () => {
    const seasonA = Array.from({ length: 16 }, (_, i) => weatherForRace(42, i).id);
    const seasonB = Array.from({ length: 16 }, (_, i) => weatherForRace(43, i).id);
    expect(seasonA).not.toEqual(seasonB);
    expect(new Set(seasonA).size).toBeGreaterThan(1);
  });
});

// --- helpers: a deterministic rng that returns a fixed sequence then loops ---
function seqRng(values: number[]) {
  let i = 0;
  return () => values[i++ % values.length];
}
/** First rng draw that lands mid-bucket for the given weather id. */
function offsetOf(id: string): number {
  const total = WEATHER_TYPES.reduce((s, w) => s + w.weight, 0);
  let before = 0;
  for (const w of WEATHER_TYPES) {
    if (w.id === id) break;
    before += w.weight;
  }
  return (before + 0.5) / total;
}
