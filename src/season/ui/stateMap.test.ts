// #697: the start's map holds all 52 places, once each, inside the grid, no two on one square.
import { describe, it, expect } from 'vitest';
import { STATE_TILES, TILE_COLS, TILE_ROWS } from './stateMap';
import { US_PLACES } from '../../data/states';

describe('the state map (#697)', () => {
  it('every place once, on its own square, inside the grid', () => {
    expect(STATE_TILES.map(t => t.id).sort()).toEqual(US_PLACES.map(p => p.id).sort());
    expect(new Set(STATE_TILES.map(t => `${t.x},${t.y}`)).size).toBe(52);
    for (const t of STATE_TILES) { expect(t.x).toBeLessThan(TILE_COLS); expect(t.y).toBeLessThan(TILE_ROWS); }
  });
});
