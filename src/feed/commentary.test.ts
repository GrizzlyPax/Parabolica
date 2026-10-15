import { describe, it, expect } from 'vitest';
import { voiceNotification, voiceBetSwing, reactToBetSwing, voiceTitle, lightsOutLine, callerFor, CALLER_POOLS, FeedContext, BetSwingInfo } from './commentary';
import type { RaceNotification, NotificationType } from '../WatchMode';

const ctx: FeedContext = { lap: 7, totalLaps: 18, trackName: 'Subpoena Day', trackEmoji: '👩‍⚖️' };

function makeNotification(overrides: Partial<RaceNotification> = {}): RaceNotification {
  return {
    id: 1,
    type: 'crash',
    title: 'CRASH!',
    message: 'Comfort Phillips is in the wall',
    emoji: '💥',
    tick: 1234,
    expiresAt: Date.now() + 12000,
    drivers: [{ id: 3, name: 'Comfort Phillips', emoji: '🍞' }],
    color: '#e8a13c',
    ...overrides,
  };
}

describe('voiceNotification', () => {
  const coveredTypes: Array<{ type: NotificationType; title: string }> = [
    { type: 'crash', title: 'CRASH!' },
    { type: 'crash', title: 'PILEUP!' },
    { type: 'crash', title: 'BLOWOUT!' },
    { type: 'crash', title: 'MECHANICAL!' },
    { type: 'lead_change', title: 'LEAD CHANGE' },
    { type: 'slow_pit_stop', title: 'Slow Stop' },
    { type: 'quick_pit_stop', title: 'Fast Stop' },
    { type: 'fastest_lap', title: 'FASTEST LAP' },
    { type: 'milestone', title: 'FINAL LAP' },
    { type: 'milestone', title: 'HALFWAY' },
    { type: 'finish', title: 'CHECKERED FLAG' },
    { type: 'effect_applied', title: '🔧 Comfort Phillips' },
    { type: 'track_event', title: 'Monsoon Season' },
  ];

  it.each(coveredTypes)('voices $type "$title" with non-empty text', ({ type, title }) => {
    const item = voiceNotification(makeNotification({ type, title }), ctx);
    expect(item).not.toBeNull();
    expect(item!.text.length).toBeGreaterThan(8);
    expect(item!.lap).toBe(7);
  });

  it('track events pass through in the caller\'s name (The Track is retired)', () => {
    const item = voiceNotification(makeNotification({ type: 'track_event', title: 'Monsoon Season' }), ctx);
    expect(item!.persona).toBe('network');
    expect(item!.text).toContain('Monsoon Season');
  });

  it('marks crashes, lead changes, finishes, and final lap as big moments', () => {
    for (const { type, title } of [
      { type: 'crash' as const, title: 'CRASH!' },
      { type: 'lead_change' as const, title: 'LEAD CHANGE' },
      { type: 'finish' as const, title: 'CHECKERED FLAG' },
      { type: 'milestone' as const, title: 'FINAL LAP' },
    ]) {
      expect(voiceNotification(makeNotification({ type, title }), ctx)!.emphasis).toBe('big');
    }
    expect(voiceNotification(makeNotification({ type: 'quick_pit_stop', title: 'Fast Stop' }), ctx)!.emphasis).toBe('normal');
  });

  it('is deterministic for the same notification', () => {
    const n = makeNotification();
    expect(voiceNotification(n, ctx)!.text).toBe(voiceNotification(n, ctx)!.text);
  });

  it('varies templates across different ticks', () => {
    const texts = new Set(
      [0, 1, 2, 3, 4, 5].map(tick =>
        voiceNotification(makeNotification({ type: 'lead_change', title: 'LEAD CHANGE', tick }), { ...ctx, voice: { cars: { 3: { state: 'Ohio' } } } })!.text
      )
    );
    expect(texts.size).toBeGreaterThan(1);
  });

  it('includes the driver name in driver-centric lines', () => {
    const item = voiceNotification(makeNotification({ type: 'lead_change', title: 'LEAD CHANGE' }), ctx);
    expect(item!.text).toContain('Comfort Phillips');
  });

  it('passes through unknown types factually instead of dropping them', () => {
    const item = voiceNotification(
      makeNotification({ type: 'info' as NotificationType, title: 'PIT WINDOW', message: 'It opens' }),
      ctx
    );
    expect(item!.text).toContain('PIT WINDOW');
  });
});

describe('bet swing reactions', () => {
  const base: BetSwingInfo = {
    swing: 'now_losing',
    driverName: 'Thomas Associates',
    betLabel: 'PODIUM',
    amount: 50,
    potential: 100,
    position: 6,
  };

  it('produces a line for every swing type, mentioning the driver', () => {
    for (const swing of ['now_winning', 'now_losing', 'bet_dead', 'dnf_bet_hit'] as const) {
      const text = reactToBetSwing({ ...base, swing }, 1);
      expect(text).toContain('Thomas Associates');
      expect(text.length).toBeGreaterThan(15);
    }
  });

  it('voices swings as Mister Marbles, with dead bets as big moments', () => {
    const dead = voiceBetSwing({ ...base, swing: 'bet_dead' }, ctx, 1);
    expect(dead.persona).toBe('marbles');
    expect(dead.emphasis).toBe('big');
    const losing = voiceBetSwing({ ...base, swing: 'now_losing' }, ctx, 1);
    expect(losing.emphasis).toBe('normal');
  });
});

describe('the callers by step (#749, docs/story/voice.md)', () => {
  const voice = { town: 'Toledo', garage: 'Kettle Street Garage', cars: { 3: { no: 7, town: 'Akron', state: 'Vermont' }, 4: { no: 9, town: 'Dayton', state: 'Texas' } } };
  const at = (step?: FeedContext['step']): FeedContext => ({ ...ctx, step, stateName: step === 'state' ? 'Ohio' : undefined, voice });

  it('Locals is The PA, an Ohio State race is Ohio Radio, Nationals and Quick Race are The Network', () => {
    expect(callerFor('locals')).toBe('pa');
    expect(callerFor('state')).toBe('radio');
    expect(callerFor('nationals')).toBe('network');
    expect(callerFor(undefined)).toBe('network');
    const n = makeNotification({ type: 'lead_change', title: 'LEAD CHANGE' });
    expect(voiceNotification(n, at('locals'))).toMatchObject({ persona: 'pa', personaName: 'The PA', personaEmoji: 'voice.pa' });
    expect(voiceNotification(n, at('state'))).toMatchObject({ persona: 'radio', personaName: 'Ohio Radio', personaEmoji: 'voice.radio' });
    expect(voiceNotification(n, at())).toMatchObject({ persona: 'network', personaName: 'The Network', personaEmoji: 'voice.network' });
  });

  it("every line in every pool is Radio's: one per moment at least, and all fill with a full cast", () => {
    for (const caller of ['pa', 'radio', 'network'] as const) {
      for (const [moment, pool] of Object.entries(CALLER_POOLS[caller])) {
        expect(pool.length, `${caller} ${moment}`).toBeGreaterThan(0);
        for (const line of pool) expect(line).not.toMatch(/tyre|VOID|Unsafety/);
      }
    }
  });

  it('placeholders: State uses the driver\'s home town and the state raced for; Nationals the driver\'s state', () => {
    const crash = makeNotification({ type: 'crash', title: 'CRASH!' });
    for (let tick = 0; tick < 12; tick++) {
      const s = voiceNotification({ ...crash, tick }, at('state'))!.text;
      expect(s).not.toMatch(/\{|\}/);
      if (s.includes('Hard luck')) expect(s).toContain('Akron');
      const n = voiceNotification({ ...crash, tick }, at('nationals'))!.text;
      if (n.includes('hopes')) expect(n).toContain('Vermont');
    }
  });

  it('a line whose placeholder is unknown is skipped, never shown half-filled', () => {
    const bare: FeedContext = { ...ctx, step: 'nationals' };
    for (let tick = 0; tick < 20; tick++) {
      const t = voiceNotification(makeNotification({ type: 'lead_change', title: 'LEAD CHANGE', tick }), bare)!.text;
      expect(t).not.toMatch(/\{|\}|undefined/);
      expect(t).not.toContain('for !');
    }
  });

  it('rain, the title and lights out speak in the caller\'s voice', () => {
    expect(voiceNotification(makeNotification({ type: 'weather', title: 'RAIN', message: 'Rain begins', tick: 1 }), at('locals'))!.text).toMatch(/rain/i);
    const title = voiceTitle(at('locals'), 1);
    expect(title.emphasis).toBe('big');
    expect(title.text).toMatch(/Ace Toledo/);
    expect(voiceTitle(at('state'), 0).text).toMatch(/Ace Ohio/);
    expect(CALLER_POOLS.pa.lightsOut).toContain(lightsOutLine({ step: 'locals', trackName: 'Fairgrounds' }, 2));
  });
});

describe('names without emoji (#763)', () => {
  it('an effect line names the driver plainly, never the toast\'s emoji title', () => {
    const t = voiceNotification(makeNotification({ type: 'effect_applied', title: '🔧 Comfort Phillips', message: 'limps on with a damaged car' }), ctx)!.text;
    expect(t).toBe('Comfort Phillips: limps on with a damaged car');
    expect(t).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});
