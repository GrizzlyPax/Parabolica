import { describe, it, expect } from 'vitest';
import {
  calcDriverStrength,
  computeDriverRankings,
  calculateDriverOdds,
  getDriverRating,
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

describe('getDriverRating', () => {
  it('rates a maxed driver legendary and a floor driver hopeless', () => {
    const ace = makeDriver({ baseSpeed: 1.15, consistency: 0.8, luck: 0.8 });
    const dud = makeDriver({ baseSpeed: 0.85, consistency: 0.3, luck: 0.3 });
    expect(getDriverRating(ace).tier).toBe('legendary');
    expect(getDriverRating(dud).tier).toBe('hopeless');
  });
});
