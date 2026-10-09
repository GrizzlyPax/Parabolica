import { describe, it, expect } from 'vitest';
import { wearBand } from './WearPill';
import { BASE_DECK_TRACKS } from '../data/deckTracks';

describe('tyre-wear pill (#547)', () => {
  it('bands the dial: < 0.95 low · 0.95–1.05 normal · > 1.05 high', () => {
    expect(wearBand(0.85)).toBe('low');
    expect(wearBand(0.95)).toBe('normal');
    expect(wearBand(1.0)).toBe('normal');
    expect(wearBand(1.05)).toBe('normal');
    expect(wearBand(1.1)).toBe('high');
    expect(wearBand(1.25)).toBe('high');
  });
  it('every deck track has a dial the pill can read', () => {
    for (const t of BASE_DECK_TRACKS) expect(typeof t.tyreWear).toBe('number');
  });
});
