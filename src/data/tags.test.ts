import { describe, it, expect } from 'vitest';
import {
  evaluateTagCondition, RaceContext, TagCondition,
  getTagById,
} from './tags';

function ctx(overrides: Partial<RaceContext> = {}): RaceContext {
  return {
    position: 10,
    fieldSize: 20,
    lapProgress: 0.5,
    gapAhead: 100,
    gapBehind: 100,
    inTraffic: false,
    tireWear: 30,
    isDamaged: false,
    safetyCar: false,
    conditions: [],
    ...overrides,
  };
}

describe('evaluateTagCondition', () => {
  it('position: respects min/max bounds (1-based)', () => {
    const top5: TagCondition = { when: 'position', max: 5 };
    expect(evaluateTagCondition(top5, ctx({ position: 1 }))).toBe(true);
    expect(evaluateTagCondition(top5, ctx({ position: 5 }))).toBe(true);
    expect(evaluateTagCondition(top5, ctx({ position: 6 }))).toBe(false);

    const midfield: TagCondition = { when: 'position', min: 6, max: 12 };
    expect(evaluateTagCondition(midfield, ctx({ position: 5 }))).toBe(false);
    expect(evaluateTagCondition(midfield, ctx({ position: 9 }))).toBe(true);
    expect(evaluateTagCondition(midfield, ctx({ position: 13 }))).toBe(false);
  });

  it('positionFraction: bottom half is strictly the back of the field', () => {
    const bottomHalf: TagCondition = { when: 'positionFraction', bottom: 0.5 };
    // 20-car field: positions 11-20 are the bottom half
    expect(evaluateTagCondition(bottomHalf, ctx({ position: 10, fieldSize: 20 }))).toBe(false);
    expect(evaluateTagCondition(bottomHalf, ctx({ position: 11, fieldSize: 20 }))).toBe(true);
    expect(evaluateTagCondition(bottomHalf, ctx({ position: 20, fieldSize: 20 }))).toBe(true);

    const topHalf: TagCondition = { when: 'positionFraction', top: 0.5 };
    expect(evaluateTagCondition(topHalf, ctx({ position: 10, fieldSize: 20 }))).toBe(true);
    expect(evaluateTagCondition(topHalf, ctx({ position: 11, fieldSize: 20 }))).toBe(false);
  });

  it('lapProgress: after/before windows', () => {
    const lateRace: TagCondition = { when: 'lapProgress', after: 0.6 };
    expect(evaluateTagCondition(lateRace, ctx({ lapProgress: 0.5 }))).toBe(false);
    expect(evaluateTagCondition(lateRace, ctx({ lapProgress: 0.6 }))).toBe(true);
    expect(evaluateTagCondition(lateRace, ctx({ lapProgress: 1 }))).toBe(true);

    const earlyRace: TagCondition = { when: 'lapProgress', before: 0.3 };
    expect(evaluateTagCondition(earlyRace, ctx({ lapProgress: 0.1 }))).toBe(true);
    expect(evaluateTagCondition(earlyRace, ctx({ lapProgress: 0.3 }))).toBe(false);
  });

  it('condition: matches active weather/track ids', () => {
    const rain: TagCondition = { when: 'condition', has: 'rain' };
    expect(evaluateTagCondition(rain, ctx({ conditions: [] }))).toBe(false);
    expect(evaluateTagCondition(rain, ctx({ conditions: ['fog'] }))).toBe(false);
    expect(evaluateTagCondition(rain, ctx({ conditions: ['rain', 'windy'] }))).toBe(true);
  });

  it('damaged and tireWear', () => {
    expect(evaluateTagCondition({ when: 'damaged' }, ctx({ isDamaged: true }))).toBe(true);
    expect(evaluateTagCondition({ when: 'damaged' }, ctx({ isDamaged: false }))).toBe(false);

    const freshTires: TagCondition = { when: 'tireWear', below: 25 };
    expect(evaluateTagCondition(freshTires, ctx({ tireWear: 10 }))).toBe(true);
    expect(evaluateTagCondition(freshTires, ctx({ tireWear: 25 }))).toBe(false);
  });
});

describe('the four #156 tags are gated', () => {
  it('rain-dancer is gated to rain (dormant until weather)', () => {
    const t = getTagById('rain-dancer')!;
    expect(t.condition).toEqual({ when: 'condition', has: 'rain' });
    expect(t.rarity).toBe(6);
  });

  it('sunday-driver surges late instead of a permanent penalty', () => {
    const t = getTagById('sunday-driver')!;
    expect(t.condition).toEqual({ when: 'lapProgress', after: 0.6 });
    expect(t.effects.speedModifier).toBeGreaterThan(1); // was 0.95 always-on
  });

  it('front-runners gates to top-5, underdog gates to the back', () => {
    expect(getTagById('front-runners')!.condition).toEqual({ when: 'position', max: 5 });
    expect(getTagById('underdog-spirit')!.condition).toEqual({ when: 'positionFraction', bottom: 0.5 });
  });
});
