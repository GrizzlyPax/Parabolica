import { describe, it, expect } from 'vitest';
import { pickHighlights, HIGHLIGHTS_PER_RACE } from './highlights';
import { RaceEvent, RaceEventType } from '../RaceEngine';

let nextTick = 0;
function ev(type: RaceEventType, magnitude: number, tick?: number): RaceEvent {
  return {
    tick: tick ?? nextTick++,
    type,
    driverId: 1,
    driverName: 'Test Driver',
    emoji: '🏎️',
    description: `${type} event`,
    impact: 'neutral',
    magnitude,
  };
}

describe('digest highlight curation', () => {
  it('rations leader noise: many lead changes and surges reduce to the decisive few', () => {
    nextTick = 0;
    const events = [
      ...Array.from({ length: 10 }, () => ev('lead_change', 0.8)),
      ...Array.from({ length: 10 }, () => ev('overtake', 0.9)),
      ev('crash', 1.0),
      ev('race_finish', 1.0),
    ];
    const picked = pickHighlights(events);

    expect(picked.filter(e => e.type === 'lead_change')).toHaveLength(1);
    expect(picked.filter(e => e.type === 'overtake')).toHaveLength(2);
    expect(picked.filter(e => e.type === 'crash')).toHaveLength(1);
    expect(picked.filter(e => e.type === 'race_finish')).toHaveLength(1);
  });

  it('keeps the LAST lead change — the race-winning move, not the lap-1 scramble', () => {
    nextTick = 0;
    const early = ev('lead_change', 0.8, 10);
    const decisive = ev('lead_change', 0.8, 900);
    const picked = pickHighlights([early, decisive, ev('race_finish', 1.0, 1000)]);
    const leads = picked.filter(e => e.type === 'lead_change');
    expect(leads).toEqual([decisive]);
  });

  it('canon events (wreckage, the weird) always make the cut over texture', () => {
    nextTick = 0;
    const events = [
      ev('crash', 1.0),
      ev('tire_failure', 0.9),
      ev('mechanical_failure', 0.9),
      ev('tag_activation', 0.3), // low magnitude but characterful — still in
      ev('track_event', 0.5),
      ...Array.from({ length: 20 }, () => ev('overtake', 1.0)),
    ];
    const picked = pickHighlights(events);
    for (const type of ['crash', 'tire_failure', 'mechanical_failure', 'tag_activation', 'track_event']) {
      expect(picked.some(e => e.type === type), `${type} missing`).toBe(true);
    }
  });

  it('excludes pure texture types entirely', () => {
    nextTick = 0;
    const events = [
      ev('lap_complete', 0.9),
      ev('pit_entry', 0.9),
      ev('pit_exit', 0.9),
      ev('tire_warning', 0.9),
      ev('luck_trigger', 0.9),
      ev('endurance_decay', 0.9),
      ev('crash', 1.0),
    ];
    const picked = pickHighlights(events);
    expect(picked).toHaveLength(1);
    expect(picked[0].type).toBe('crash');
  });

  it('caps at the budget and returns chronological order', () => {
    nextTick = 0;
    const events = [
      ...Array.from({ length: 20 }, () => ev('crash', 1.0)),
      ev('race_finish', 1.0),
    ];
    const picked = pickHighlights(events);
    expect(picked.length).toBeLessThanOrEqual(HIGHLIGHTS_PER_RACE);
    for (let i = 1; i < picked.length; i++) {
      expect(picked[i].tick).toBeGreaterThanOrEqual(picked[i - 1].tick);
    }
  });

  it('takes one each of pit drama and the closest call', () => {
    nextTick = 0;
    const events = [
      ev('slow_pit_stop', 0.5), ev('slow_pit_stop', 0.9),
      ev('quick_pit_stop', 0.4), ev('quick_pit_stop', 0.7),
      ev('close_call', 0.3), ev('close_call', 0.8),
    ];
    const picked = pickHighlights(events);
    expect(picked.filter(e => e.type === 'slow_pit_stop')).toHaveLength(1);
    expect(picked.find(e => e.type === 'slow_pit_stop')!.magnitude).toBe(0.9);
    expect(picked.filter(e => e.type === 'quick_pit_stop')).toHaveLength(1);
    expect(picked.filter(e => e.type === 'close_call')).toHaveLength(1);
  });
});
