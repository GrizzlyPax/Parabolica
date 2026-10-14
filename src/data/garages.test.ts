// #695: rival garages are generic and local (family names and places),
// seeded, never twice in one field, with the deck colours' ink and a town
// each at State.
import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../engine/rng';
import { garageName, rivalGarages, GARAGE_FAMILIES, GARAGE_FIRSTS, GARAGE_PLACES, GARAGE_LOGOS } from './garages';
import { DECK_COLOURS } from './teamColours';
import { inkFor } from '../icons/ink';
import { resolveIcon } from '../icons/registry';

describe('rival garages (#695)', () => {
  it('names come from the bible\'s shapes, seeded', () => {
    const rng = mulberry32(1);
    const names = Array.from({ length: 200 }, () => garageName(rng));
    expect(names).toEqual(Array.from({ length: 200 }, (r => () => garageName(r))(mulberry32(1))));
    const shape = /^(.+ & Sons|.+ Brothers|.+ Motors|.+'s Garage|.+ Motor Works|.+ Garage|The .+ Pump|.+ Speed Shop)$/;
    for (const n of names) expect(n).toMatch(shape);
    const words = [...GARAGE_FAMILIES, ...GARAGE_FIRSTS, ...GARAGE_PLACES];
    for (const n of names) expect(words.some(w => n.includes(w))).toBe(true);
    expect(new Set(names.map(n => n.replace(/^The /, '').split(/ (?=&|Brothers|Motors|Garage|Motor|Pump|Speed)/)[0])).size).toBeGreaterThan(40);
  });

  it('a field has no name twice, deck colours with inkFor ink, a creator logo, and a town each at State', () => {
    const towns = ['Akron', 'Dayton', 'Canton'];
    const field = rivalGarages(mulberry32(7), 20, towns, ['Kettle Street Garage']);
    expect(field).toHaveLength(20);
    expect(new Set(field.map(g => g.name)).size).toBe(20);
    expect(field.some(g => g.name === 'Kettle Street Garage')).toBe(false);
    for (const g of field) {
      expect(DECK_COLOURS.some(c => c.hex === g.color)).toBe(true);
      expect(g.ink).toBe(inkFor(g.color));
      expect(GARAGE_LOGOS).toContain(g.iconId);
      expect(resolveIcon(g.iconId)).toBeTruthy();
      expect(towns).toContain(g.town);
    }
    expect(new Set(field.slice(0, 20).map(g => g.color)).size).toBe(20);
    expect(rivalGarages(mulberry32(7), 5).every(g => g.town === undefined)).toBe(true);
  });
});
