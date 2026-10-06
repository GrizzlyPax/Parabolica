import { describe, it, expect } from 'vitest';
import { createLeague } from './league';
import { settleLeague } from './settle';
import { CURRENT_TEAMS } from '../data/teams';
import { CURRENT_TRACKS } from '../generators/tracks';
describe('replay determinism', () => {
  it('settling all at once equals settling race by race', () => {
    const setup = { name: 'x', godId: 'g', teamIds: CURRENT_TEAMS.slice(0, 11).map(t => t.id), trackIds: CURRENT_TRACKS.slice(0, 3).map(t => t.id), raceIntervalMs: 1000, createdAt: 0 };
    const a = createLeague(4242, setup);
    const b = createLeague(4242, setup);
    const all = settleLeague(a, { now: 100000 }).league;
    let step = b;
    for (let t = 1; t <= 5; t++) step = settleLeague(step, { now: t * 1500 }).league;
    expect(all.settledThrough).toBe(step.settledThrough);
    expect(JSON.stringify(all.interventionLog)).toBe(JSON.stringify(step.interventionLog));
    expect(JSON.stringify(all.digests.map(d => d.finishOrder))).toBe(JSON.stringify(step.digests.map(d => d.finishOrder)));
  });
});
