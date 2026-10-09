import { describe, it, expect } from 'vitest';
import { voiceNotification, voiceBetSwing, reactToBetSwing, FeedContext, BetSwingInfo } from './commentary';
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
    { type: 'track_event', title: 'THE VOID OPENS' },
  ];

  it.each(coveredTypes)('voices $type "$title" with non-empty text', ({ type, title }) => {
    const item = voiceNotification(makeNotification({ type, title }), ctx);
    expect(item).not.toBeNull();
    expect(item!.text.length).toBeGreaterThan(8);
    expect(item!.lap).toBe(7);
  });

  it('routes track events to the track persona, named after the track', () => {
    const item = voiceNotification(makeNotification({ type: 'track_event', title: 'Monsoon Season' }), ctx);
    expect(item!.persona).toBe('track');
    expect(item!.personaName).toBe('Subpoena Day');
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
        voiceNotification(makeNotification({ type: 'lead_change', title: 'LEAD CHANGE', tick }), ctx)!.text
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
      makeNotification({ type: 'weather' as NotificationType, title: 'RAIN', message: 'It begins' }),
      ctx
    );
    expect(item!.text).toContain('RAIN');
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
