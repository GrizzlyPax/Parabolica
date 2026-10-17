// The Interval (#751): Steward's pins. Zero at Locals; the odds per step within reach over many seeds; never two in one race; same seed, same Interval; the second-half rule.
import { describe, it, expect } from 'vitest';
import { INTERVAL_LINES, INTERVAL_ODDS, intervalArmed, intervalLine, intervalNext, intervalStart } from './interval';

const seeds = Array.from({ length: 4000 }, (_, i) => 1000 + i * 7919);
const rate = (f: (seed: number) => boolean) => seeds.filter(f).length / seeds.length;

describe('the Interval (#751)', () => {
  it('never at Locals, nor without a step', () => {
    expect(rate(s => intervalArmed(s, { step: 'locals', last: true, hundred: false }))).toBe(0);
    expect(rate(s => intervalArmed(s, { last: true, hundred: false }))).toBe(0);
  });

  it("lands near Steward's odds: State 8% / 25% on the title race, Nationals 25% / 50% / the Hundred 40%", () => {
    const near = (got: number, want: number) => expect(Math.abs(got - want)).toBeLessThan(0.02);
    near(rate(s => intervalArmed(s, { step: 'state', last: false, hundred: false })), INTERVAL_ODDS.state.race);
    near(rate(s => intervalArmed(s, { step: 'state', last: true, hundred: false })), INTERVAL_ODDS.state.last);
    near(rate(s => intervalArmed(s, { step: 'nationals', last: false, hundred: false })), INTERVAL_ODDS.nationals.race);
    near(rate(s => intervalArmed(s, { step: 'nationals', last: true, hundred: false })), INTERVAL_ODDS.nationals.last);
    near(rate(s => intervalArmed(s, { step: 'nationals', last: false, hundred: true })), INTERVAL_ODDS.nationals.hundred);
  });

  it('same seed, same Interval; at most one per race; only in the second half, the Hundred from lights out', () => {
    const seed = seeds.find(s => intervalArmed(s, { step: 'state', last: false, hundred: false }))!;
    let st = intervalStart(seed, { step: 'state', last: false, hundred: false });
    expect(st.armed).toBe(true);
    // Lap 3 of 15: too early.
    expect(intervalNext(st, seed, 'fastestLap', { lap: 3, totalLaps: 15 }).item).toBeUndefined();
    const a = intervalNext(st, seed, 'fastestLap', { lap: 9, totalLaps: 15 });
    expect(a.item?.persona).toBe('interval');
    expect(a.item?.text).toBe(intervalNext(st, seed, 'fastestLap', { lap: 9, totalLaps: 15 }).item?.text);
    st = a.state;
    // Nothing more this race, whatever happens.
    expect(intervalNext(st, seed, 'rain', { lap: 10, totalLaps: 15, track: 'Akron Board Speedway' }).item).toBeUndefined();
    expect(intervalNext(st, seed, 'title', { lap: 15, totalLaps: 15, state: 'Ohio' }).item).toBeUndefined();
    // The Hundred fires at lights out.
    const h = seeds.find(s => intervalArmed(s, { step: 'nationals', last: false, hundred: true }))!;
    expect(intervalNext(intervalStart(h, { step: 'nationals', last: false, hundred: true }), h, 'lightsOutNationals', { lap: 1, totalLaps: 15 }).item).toBeDefined();
  });

  it('a line that can follow the moment, every placeholder filled; no. 3 is the fallback', () => {
    for (const s of seeds.slice(0, 200)) {
      const rain = intervalLine(s, 'rain', { lap: 8, track: 'Downtown Dayton' });
      expect([INTERVAL_LINES[4].line.replace('{track}', 'Downtown Dayton'), 'We have been listening since 1908. Lap 8 is our favourite so far.']).toContain(rain);
      const title = intervalLine(s, 'title', { lap: 15, state: 'Ohio' });
      expect(title.includes('{')).toBe(false);
    }
    // A missing placeholder falls back to the plain line.
    expect(intervalLine(7, 'quickStop', { lap: 9 })).toBe('We have been listening since 1908. Lap 9 is our favourite so far.');
  });
});
