import { describe, it, expect } from 'vitest';
import { US_PLACES, placeById } from './states';
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

  it('fills Ohio, Arizona and Vermont from the #698 mock-ups', () => {
    expect(US_PLACES.filter(p => p.look).map(p => p.id).sort()).toEqual(['az', 'oh', 'vt']);
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
