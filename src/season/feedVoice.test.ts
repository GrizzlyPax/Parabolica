// #749: the callers' who's who, from a league's facts.
import { describe, it, expect } from 'vitest';
import { feedVoiceFor } from './feedVoice';
import { currentLeague } from '../run/run';
import { testRun, TEST_GARAGE } from '../run/testHelpers';
import { quickRace } from './quickRace';
import { US_PLACES } from '../data/states';

describe('feed voice (#749)', () => {
  it('a Locals race: your town and garage; every car its entry number and your town', () => {
    const facts = currentLeague(testRun(11));
    const v = feedVoiceFor(facts);
    expect(v.town).toBe(facts.setup.league!.locale!.town);
    expect(v.garage).toBe(TEST_GARAGE.name);
    const cars = Object.values(v.cars!);
    expect(cars.length).toBeGreaterThan(2);
    for (const c of cars) expect(String(c.no)).toMatch(/^\d+$/);
  });

  it('a Quick Race (The Network): every driver has a home state from the code on the car', () => {
    const names = new Set(US_PLACES.map(p => p.name));
    for (const c of Object.values(feedVoiceFor(quickRace(4242).facts).cars!)) expect(names.has(c.state!)).toBe(true);
  });
});
