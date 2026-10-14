import { describe, it, expect } from 'vitest';
import { US_PLACES, placeById, fieldSize, fieldLine, FIELD_STEPS, DEFAULT_LOOK } from './states';
import { inkFor } from '../icons/ink';

const HEX = /^#[0-9A-F]{6}$/;

describe('Ace America places (#695)', () => {
  it('has 50 states, DC and Puerto Rico, each once', () => {
    expect(US_PLACES.filter(p => p.kind === 'state')).toHaveLength(50);
    expect(placeById('dc')?.kind).toBe('district');
    expect(placeById('PR')?.kind).toBe('territory');
    expect(new Set(US_PLACES.map(p => p.id)).size).toBe(52);
    for (const p of US_PLACES) expect(p.id).toBe(p.abbr.toLowerCase());
  });

  it('fills Ohio, Arizona, Vermont and Texas from the #698 mock-ups; the default look has inkFor ink', () => {
    expect(US_PLACES.filter(p => p.look).map(p => p.id).sort()).toEqual(['az', 'oh', 'tx', 'vt']);
    expect(DEFAULT_LOOK.ink).toBe(inkFor(DEFAULT_LOOK.primary));
  });

  it('every place has a population and a pool of at least eight real towns, no town twice', () => {
    for (const p of US_PLACES) {
      expect(p.population).toBeGreaterThan(0);
      expect(p.cities.length).toBeGreaterThanOrEqual(8);
      expect(new Set(p.cities).size).toBe(p.cities.length);
    }
    expect(placeById('OH')!.cities).toContain('Toledo');
    expect(placeById('CA')!.population).toBeGreaterThan(placeById('VT')!.population);
  });

  it('the field follows population: 5 / 10 / 20 towns (Vermont · Iowa · Ohio); the line is honest', () => {
    expect(FIELD_STEPS).toEqual({ ten: 2.5, twenty: 8 });
    expect([fieldSize(placeById('vt')!), fieldSize(placeById('ia')!), fieldSize(placeById('oh')!)]).toEqual([5, 10, 20]);
    expect(fieldLine(placeById('vt')!)).toBe('5 towns compete');
    const counts = { 5: 0, 10: 0, 20: 0 };
    for (const p of US_PLACES) counts[fieldSize(p)]++;
    expect(counts[5]).toBeGreaterThan(8); expect(counts[10]).toBeGreaterThan(8); expect(counts[20]).toBeGreaterThan(5);
  });

  it('every filled look has hex colours, inkFor ink and its wheel-flag', () => {
    for (const p of US_PLACES) {
      if (!p.look) continue;
      for (const c of [p.look.primary, p.look.secondary, p.look.accent]) expect(c).toMatch(HEX);
      expect(p.look.ink).toBe(inkFor(p.look.primary));
      expect(p.look.flag.id).toBe(`wheel-flag-${p.id}`);
      expect(p.look.flag.note.length).toBeGreaterThan(0);
    }
  });
});
