// Moment posters (#778): which notification becomes which poster, and that every moment has its hold.
import { describe, it, expect } from 'vitest';
import { POSTER_MS, POSTER_PRIORITY, posterFor } from './MomentPoster';

const d = { name: 'Matt Coleman', color: 'var(--ace-accent)', number: 12, team: "Ernie's Garage" };

describe('posterFor', () => {
  it('maps the big beats', () => {
    expect(posterFor('lead_change', 'LEAD CHANGE', 'Matt Coleman takes the lead!', d)).toMatchObject({ moment: 'leadChange', head: 'Takes the lead', driver: d });
    expect(posterFor('finish', 'CHECKERED FLAG', 'Matt Coleman wins the race!', d, true)).toMatchObject({ moment: 'flag', head: 'The flag', mine: true });
    expect(posterFor('quick_pit_stop', 'Fast Stop', 'Matt Coleman', d)).toMatchObject({ moment: 'quickStop', head: 'Fast stop' });
    expect(posterFor('weather', 'RAIN', 'The sky opens over Zanesville', undefined)).toMatchObject({ moment: 'rain', head: 'Rain', sub: 'The sky opens over Zanesville' });
    expect(posterFor('milestone', 'FINAL LAP', 'White flag! Last lap of the race')).toMatchObject({ moment: 'lastLap', head: 'White flag', sub: 'The last lap' });
  });

  it('reads the crash family and the cut', () => {
    expect(posterFor('crash', 'CRASH!', 'Matt Coleman', d)).toMatchObject({ moment: 'crash', head: 'Crash', sub: undefined });
    expect(posterFor('crash', 'PILEUP!', 'Matt Coleman, Jake Cooper')).toMatchObject({ moment: 'crash', head: 'Pileup', sub: 'Matt Coleman, Jake Cooper' });
    expect(posterFor('crash', 'BLOWOUT!', 'Matt Coleman - tire failure!', d)).toMatchObject({ moment: 'crash', head: 'Blowout', sub: 'Tyre Failure' });
    expect(posterFor('milestone', 'THE CUT AFTER LAP 1', '30 states go on, 20 cars out')).toMatchObject({ moment: 'cut', head: 'The cut', sub: 'After lap 1 · 30 states go on, 20 cars out' });
    expect(posterFor('info', 'OUT', 'Matt Coleman is out: the cut after lap 2', d)).toMatchObject({ moment: 'out', head: 'Out', sub: 'the cut after lap 2', mine: true });
  });

  it('leaves the small beats to the feed', () => {
    expect(posterFor('milestone', 'HALFWAY', 'Matt Coleman leads at the halfway point')).toBeNull();
    expect(posterFor('fastest_lap', 'FASTEST LAP', 'Matt Coleman sets the pace!', d)).toBeNull();
    expect(posterFor('overtake', 'PASS', 'x passes y')).toBeNull();
    expect(posterFor('info', 'NOTE', 'anything')).toBeNull();
  });

  it('holds and ranks every moment', () => {
    const moments = ['lightsOut', 'leadChange', 'crash', 'out', 'cut', 'lastLap', 'flag', 'quickStop', 'rain'] as const;
    for (const m of moments) { expect(POSTER_MS[m]).toBeGreaterThan(1500); expect(POSTER_PRIORITY[m]).toBeGreaterThan(0); }
    expect(POSTER_PRIORITY.flag).toBeGreaterThan(POSTER_PRIORITY.leadChange);
  });
});
