import { describe, it, expect } from 'vitest';
import { PORTRAITS, VEHICLES, portraitFor, vehicleFor } from './avatars';
import { resolveIcon } from '../icons/registry';
import { generateSeasonPool } from '../season/genesis';

describe('car vehicles + driver portraits (#489)', () => {
  it("Radio's tables: weights sum to 100, every icon vendored, 90% normal", () => {
    for (const table of [VEHICLES, PORTRAITS]) {
      expect(table.reduce((s, p) => s + p.weight, 0)).toBeCloseTo(100, 9);
      expect(table[0].weight).toBe(90);
      for (const p of table) expect(resolveIcon(p.id)?.id, p.id).toBe(p.id);
    }
    expect(VEHICLES[0].id).toBe('f1-car');
    expect(PORTRAITS[0].id).toBe('full-motorcycle-helmet');
  });

  it('the roll is stable per (seed, id) and lands near the odds', () => {
    expect(vehicleFor(7, 'car-3')).toBe(vehicleFor(7, 'car-3'));
    expect(portraitFor(7, 12)).toBe(portraitFor(7, 12));
    let race = 0, helmet = 0;
    const n = 4000;
    for (let s = 0; s < n; s++) {
      if (vehicleFor(s, 'car-0') === 'f1-car') race++;
      if (portraitFor(s, 1) === 'full-motorcycle-helmet') helmet++;
    }
    expect(race / n).toBeGreaterThan(0.87);
    expect(race / n).toBeLessThan(0.93);
    expect(helmet / n).toBeGreaterThan(0.87);
    expect(helmet / n).toBeLessThan(0.93);
  });

  it('rolling icons never moves genesis: the pool is identical with and without the roll', () => {
    const before = generateSeasonPool(4242, 10);
    for (const c of before.cars) vehicleFor(before.seed, c.id);
    for (const d of before.drivers) portraitFor(before.seed, d.id);
    expect(generateSeasonPool(4242, 10)).toEqual(before);
    // Nothing new on the pool (so nothing new in saves).
    expect(JSON.stringify(before)).not.toMatch(/portrait|vehicle/);
  });
});
