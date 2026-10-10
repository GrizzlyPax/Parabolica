// #666: favours read in levels, like the rest of the game.
import { describe, it, expect } from 'vitest';
import { favourText, favourParts } from './favourText';

describe('favours in levels', () => {
  it('+10 grade points is +2 levels; track + weather on one stat are summed; partial weather keeps one decimal', () => {
    expect(favourText([{ stat: 'baseSpeed', pct: 10 }, { stat: 'power', pct: 10 }])).toBe('+2 Speed · +2 Power');
    expect(favourParts([{ stat: 'power', pct: 10 }, { stat: 'power', pct: 5 }])).toEqual(['+3 Power']);
    expect(favourText([{ stat: 'grip', pct: 7 }])).toBe('+1.4 Grip');
  });
});
