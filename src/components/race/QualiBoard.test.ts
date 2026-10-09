// #599–#601: the qualifying show runs in real time at 1× and overlaps hot laps.
import { describe, it, expect } from 'vitest';
import { qualiSchedule, qualiSeconds } from './QualiBoard';

describe('qualifying show schedule', () => {
  const laps = [{ id: 1, score: 1.0, ruined: false }, { id: 2, score: 1.05, ruined: false }, { id: 3, score: 0.95, ruined: true }];
  const nominal = 105; // ticks: a 10.5 s lap at score 1.0

  it('a hot lap takes its own lap time at 1× (the race view\'s real time)', () => {
    const s = qualiSchedule(laps, nominal);
    expect(s[0].lapMs).toBeCloseTo(qualiSeconds(1.0, nominal) * 1000);
    expect(s[0].lapMs).toBeCloseTo(10500);
  });

  it('the next car goes out as the car ahead clears sector 1', () => {
    const s = qualiSchedule(laps, nominal);
    expect(s[0].out).toBe(0);
    expect(s[1].out).toBeCloseTo(s[0].lapMs / 3);
    expect(s[2].out).toBeCloseTo(s[1].out + s[1].lapMs / 3);
    // Overlap: car 2 is out before car 1 is back
    expect(s[1].out).toBeLessThan(s[0].out + s[0].lapMs);
  });
});
