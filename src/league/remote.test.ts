import { describe, it, expect } from 'vitest';
import { createLeague } from './league';
import { settleLeague } from './settle';
import { leagueFromRemote, definitionOf, digestFingerprint, decreesOf, type RemoteLeague } from './remote';
import { CURRENT_TEAMS } from '../data/teams';
import { CURRENT_TRACKS } from '../generators/tracks';

const setup = { name: 'Remote', godId: 'g', teamIds: CURRENT_TEAMS.slice(0, 11).map(t => t.id), trackIds: CURRENT_TRACKS.slice(0, 3).map(t => t.id), raceIntervalMs: 1000, createdAt: 0 };

describe('a published league replays identically on another device', () => {
  it('rebuilds from the definition + decrees and settles to the same results', () => {
    const home = createLeague(777, setup);
    // A legacy attach-tag decree (#334): a fact the server holds, inert today.
    const decree = { type: 'attach-tag', atRaceIndex: 1, targetDriverId: home.roster[4].id, tagId: 'steady-hands', committedAt: 5 };
    const homeWithDecree = { ...home, interventionLog: [decree] };
    const homeRun = settleLeague(homeWithDecree, { now: 3_600_000 });
    const homeSettled = homeRun.league;

    // What the server holds: the definition and the decrees, nothing derived.
    const remote: RemoteLeague = { code: 'ABC123', createdAt: 1, definition: definitionOf(home), decrees: decreesOf(homeSettled), digests: {}, version: 3, serverNow: 3_600_000 };
    const phone = leagueFromRemote(remote);
    expect(phone.remote?.code).toBe('ABC123');
    expect(phone.interventionLog).toEqual([decree]);
    const phoneRun = settleLeague(phone, { now: 3_600_000 });
    const phoneSettled = phoneRun.league;
    expect(phoneRun.newlySettled.map(digestFingerprint)).toEqual(homeRun.newlySettled.map(digestFingerprint));
    expect(phoneRun.newlySettled.length).toBe(3);

    expect(phoneSettled.settledThrough).toBe(homeSettled.settledThrough);
    expect(JSON.stringify(phoneSettled.interventionLog)).toBe(JSON.stringify(homeSettled.interventionLog));
    expect(phoneSettled.roster.map(d => (d.cards ?? []).map(c => c.id))).toEqual(homeSettled.roster.map(d => (d.cards ?? []).map(c => c.id)));
  });
  it('fingerprints differ when the result differs', () => {
    const a = settleLeague(createLeague(1, setup), { now: 3_600_000 }).newlySettled[0];
    const b = settleLeague(createLeague(2, setup), { now: 3_600_000 }).newlySettled[0];
    expect(digestFingerprint(a)).not.toBe(digestFingerprint(b));
    expect(digestFingerprint(a)).toBe(digestFingerprint({ ...a }));
  });
});
