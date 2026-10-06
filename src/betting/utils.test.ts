import { describe, it, expect } from 'vitest';
import {
  calcDriverStrength,
  computeDriverRankings,
  calculateDriverOdds,
  fieldRanks,
  rankTone,
  ordinal,
  driverSkillScore,
} from './utils';
import { Driver } from '../RaceEngine';

// Minimal driver factory — only the fields the betting utils read
function makeDriver(overrides: Partial<{
  id: number;
  baseSpeed: number;
  consistency: number;
  luck: number;
  aggression: number;
  power: number;
  grip: number;
  reliability: number;
  pitCrew: number;
}> = {}): Driver {
  const {
    id = 1,
    baseSpeed = 1.0,
    consistency = 0.55,
    luck = 0.55,
    aggression = 0.55,
    power = 3,
    grip = 3,
    reliability = 3,
    pitCrew = 3,
  } = overrides;
  return {
    id,
    stats: { baseSpeed, consistency, luck, aggression },
    carStats: { power, grip, reliability },
    teamStats: { pitCrew },
  } as unknown as Driver;
}

describe('calcDriverStrength', () => {
  it('rates a maxed-out driver above a bottom-tier driver', () => {
    const ace = makeDriver({ baseSpeed: 1.15, consistency: 0.8, luck: 0.8, power: 5, grip: 5, reliability: 5, pitCrew: 5 });
    const backmarker = makeDriver({ baseSpeed: 0.85, consistency: 0.3, luck: 0.3, power: 1, grip: 1, reliability: 1, pitCrew: 1 });
    expect(calcDriverStrength(ace)).toBeGreaterThan(calcDriverStrength(backmarker));
  });

  it('is deterministic for the same driver', () => {
    const d = makeDriver();
    expect(calcDriverStrength(d)).toBe(calcDriverStrength(d));
  });
});

describe('computeDriverRankings', () => {
  it('assigns each driver a unique rank from 1 to N', () => {
    const drivers = Array.from({ length: 20 }, (_, i) =>
      makeDriver({ id: i + 1, baseSpeed: 0.85 + (i % 7) * 0.04, power: (i % 5) + 1 })
    );
    const rankings = computeDriverRankings(drivers);
    const ranks = [...rankings.values()].sort((a, b) => a - b);
    expect(ranks).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });

  it('ranks the strongest driver first', () => {
    const weak = makeDriver({ id: 1, baseSpeed: 0.85, power: 1 });
    const strong = makeDriver({ id: 2, baseSpeed: 1.15, power: 5, grip: 5, reliability: 5 });
    const rankings = computeDriverRankings([weak, strong]);
    expect(rankings.get(2)).toBe(1);
    expect(rankings.get(1)).toBe(2);
  });

  it('breaks strength ties deterministically by id', () => {
    const a = makeDriver({ id: 7 });
    const b = makeDriver({ id: 3 });
    const rankings = computeDriverRankings([a, b]);
    expect(rankings.get(3)).toBe(1);
    expect(rankings.get(7)).toBe(2);
  });
});

describe('calculateDriverOdds', () => {
  it('offers strictly longer win odds as rank worsens', () => {
    const d = makeDriver();
    let prev = 0;
    for (let rank = 1; rank <= 20; rank++) {
      const odds = calculateDriverOdds(d, rank, 20);
      expect(odds.win).toBeGreaterThan(prev);
      prev = odds.win;
    }
  });

  it('returns positive odds for every bet type', () => {
    for (const rank of [1, 5, 10, 15, 20]) {
      const odds = calculateDriverOdds(makeDriver(), rank, 20);
      for (const value of Object.values(odds)) {
        expect(value).toBeGreaterThan(0);
      }
    }
  });

  it('prices a DNF bet on a reliable car higher than on an unreliable car', () => {
    const reliable = makeDriver({ reliability: 5, aggression: 0.3 });
    const fragile = makeDriver({ reliability: 1, aggression: 0.8 });
    const reliableOdds = calculateDriverOdds(reliable, 10, 20);
    const fragileOdds = calculateDriverOdds(fragile, 10, 20);
    expect(reliableOdds.dnf).toBeGreaterThan(fragileOdds.dnf);
    // ...and the inverse for "finishes" bets
    expect(fragileOdds.finishes).toBeGreaterThan(reliableOdds.finishes);
  });

  it('is stable across repeated calls (no random resorting on re-render)', () => {
    const d = makeDriver();
    expect(calculateDriverOdds(d, 4, 20)).toEqual(calculateDriverOdds(d, 4, 20));
  });
});

describe('field rank', () => {
  it('orders drivers by skill, best first', () => {
    const ace = makeDriver({ id: 1, baseSpeed: 1.15, consistency: 0.8, luck: 0.8 });
    const mid = makeDriver({ id: 2, baseSpeed: 1.0, consistency: 0.55, luck: 0.55 });
    const dud = makeDriver({ id: 3, baseSpeed: 0.85, consistency: 0.3, luck: 0.3 });
    const r = fieldRanks([dud, ace, mid], d => driverSkillScore(d));
    expect([r.get(1)!.rank, r.get(2)!.rank, r.get(3)!.rank]).toEqual([1, 2, 3]);
    expect(r.get(1)!.tone).toBe('best');
    expect(r.get(3)!.tone).toBe('low');
    expect(r.get(1)!.of).toBe(3);
  });
  it('ties share a rank and the next rank skips (1, 2, 2, 4)', () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
    const score: Record<number, number> = { 1: 0.9, 2: 0.5, 3: 0.5, 4: 0.1 };
    const r = fieldRanks(items, t => score[t.id]);
    expect([1, 2, 3, 4].map(id => r.get(id)!.rank)).toEqual([1, 2, 2, 4]);
    expect(r.get(2)!.tied && r.get(3)!.tied).toBe(true);
    expect(r.get(1)!.tied || r.get(4)!.tied).toBe(false);
  });
  it('colours a 22-car grid: 1st purple, then thirds green / yellow / red', () => {
    const tones = Array.from({ length: 22 }, (_, i) => rankTone(i + 1, 22));
    expect(tones[0]).toBe('best');
    expect(tones.slice(1, 8).every(t => t === 'high')).toBe(true);   // 2nd–8th
    expect(tones.slice(8, 15).every(t => t === 'mid')).toBe(true);   // 9th–15th
    expect(tones.slice(15).every(t => t === 'low')).toBe(true);      // 16th–22nd
  });
  it('writes ordinals', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101, 111].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '101st', '111th']);
  });
});
