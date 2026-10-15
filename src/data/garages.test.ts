// #695: rival garages are generic and local (family names and places),
// seeded, never twice in one field, with the deck colours' ink and a town
// each at State.
import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../engine/rng';
import { garageName, rivalGarages, colourDistance, TOO_CLOSE, GARAGE_FAMILIES, GARAGE_FIRSTS, GARAGE_PLACES, GARAGE_LOGOS } from './garages';
import { currentLeague } from '../run/run';
import { testRun } from '../run/testHelpers';
import { poolFor } from '../season/season';
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

describe('rivals skip your colour (#638)', () => {
  it('for every deck colour as yours: no rival within TOO_CLOSE; names and logos stay where the seed put them', () => {
    for (const mine of DECK_COLOURS) {
      for (let seed = 1; seed <= 6; seed++) {
        const plain = rivalGarages(mulberry32(seed), 20);
        const kept = rivalGarages(mulberry32(seed), 20, undefined, [], mine.hex);
        expect(kept.map(g => g.name)).toEqual(plain.map(g => g.name));
        expect(kept.map(g => g.iconId)).toEqual(plain.map(g => g.iconId));
        for (const g of kept) expect(colourDistance(g.color, mine.hex), `${mine.name} vs ${g.color}`).toBeGreaterThanOrEqual(TOO_CLOSE);
        expect(new Set(kept.map(g => g.color)).size).toBe(kept.length);
      }
    }
  });

  it('a run: no rival garage at Locals wears your colour or one too close to it', () => {
    const facts = currentLeague(testRun(5, 'oh'));
    const you = facts.setup.humans[0];
    for (const t of poolFor(facts).teams.filter(t => t.id !== you.teamId)) expect(colourDistance(t.color, you.color)).toBeGreaterThanOrEqual(TOO_CLOSE);
  });
});
