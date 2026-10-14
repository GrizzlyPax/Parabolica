import { describe, it, expect } from 'vitest';
import { US_PLACES, placeById, fieldSize, fieldLine, FIELD_STEPS, DEFAULT_LOOK } from './states';
import { inkFor, INK_DARK } from '../icons/ink';

const SASH_CREAM = '#f6f0e2', NAVY = '#111a33';
function lum(hex: string): number {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
/** WCAG contrast ratio. */
const contrast = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

const HEX = /^#[0-9A-F]{6}$/;

describe('Ace America places (#695)', () => {
  it('has 50 states, DC and Puerto Rico, each once', () => {
    expect(US_PLACES.filter(p => p.kind === 'state')).toHaveLength(50);
    expect(placeById('dc')?.kind).toBe('district');
    expect(placeById('PR')?.kind).toBe('territory');
    expect(new Set(US_PLACES.map(p => p.id)).size).toBe(52);
    for (const p of US_PLACES) expect(p.id).toBe(p.abbr.toLowerCase());
  });

  it('all 52 wear their own look (#740): distinct primaries; the fallback has inkFor ink', () => {
    expect(US_PLACES.every(p => p.look)).toBe(true);
    expect(new Set(US_PLACES.map(p => p.look!.primary)).size).toBe(52);
    expect(placeById('az')!.look!.primary).toBe('#A6491B');
    expect(placeById('oh')!.look!.accent).toBe('#EFE6D2');
    expect(DEFAULT_LOOK.ink).toBe(inkFor(DEFAULT_LOOK.primary));
  });

  it("Radio's checks hold for every look: ink as the table says, contrast on the sash, the ground and the navy", () => {
    const DARK_INK = new Set(['co', 'dc', 'fl', 'ga', 'hi', 'ia', 'ks', 'md', 'mn', 'mo', 'mt', 'nc', 'nd', 'ne', 'nj', 'nm', 'pr', 'sd', 'va', 'wi']);
    for (const p of US_PLACES) {
      const l = p.look!;
      expect(l.ink === INK_DARK, p.id).toBe(DARK_INK.has(p.id));
      expect(contrast(l.secondary, SASH_CREAM), `${p.id} secondary on the sash`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(l.accent, l.ground!), `${p.id} accent on its ground`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(l.accent, NAVY), `${p.id} accent on navy`).toBeGreaterThanOrEqual(3);
    }
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
      for (const c of [p.look.primary, p.look.secondary, p.look.accent, p.look.ground!]) expect(c).toMatch(HEX);
      expect(p.look.ink).toBe(inkFor(p.look.primary));
      expect(p.look.flag.id).toBe(`wheel-flag-${p.id}`);
      expect(p.look.flag.note.length).toBeGreaterThan(0);
    }
  });
});
