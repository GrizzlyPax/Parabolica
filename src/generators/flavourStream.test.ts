import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../engine/rng';
import { generatePoolDriver } from './drivers';
import { INTL_FIRST_NAMES, ABSURD_LAST_NAMES } from './names';

// #467: names, backstories and quirks draw on their own stream, so growing a
// name pool (or a name roll taking more draws) never moves a driver's stats.
describe('flavour stream (#467)', () => {
  const grid = () => { const rng = mulberry32(2026); return Array.from({ length: 30 }, (_, i) => generatePoolDriver(i, rng)); };

  it('changing the name pools leaves every stat identical', () => {
    const before = grid();
    const firsts = INTL_FIRST_NAMES as string[];
    const lasts = ABSURD_LAST_NAMES as string[];
    firsts.unshift('Probe', 'Testa', 'Zed');
    lasts.push('Teapot');
    try {
      const after = grid();
      expect(after.map(d => d.stats)).toEqual(before.map(d => d.stats));
      expect(after.map(d => d.fullName)).not.toEqual(before.map(d => d.fullName));
    } finally {
      firsts.splice(0, 3);
      lasts.pop();
    }
    expect(grid()).toEqual(before);
  });
});
