// Action hooks (#233): tags that spread, pair, upgrade and burn out.
import { describe, it, expect } from 'vitest';
import { createLeague } from './league';
import { evaluateActions } from './actions';
import { LeagueSetupConfig, LeagueState, RaceDigest } from './types';
import { TEAMS } from '../data/teams';
import { CURRENT_TRACKS } from '../generators/tracks';
import { ALL_TAGS, getTagById } from '../data/tags';

const HOUR = 3_600_000;
const T0 = 1_750_000_000_000;

function makeSetup(overrides: Partial<LeagueSetupConfig> = {}): LeagueSetupConfig {
  return {
    name: 'Action League', godId: 'the-scrap-heap',
    teamIds: TEAMS.slice(0, 6).map(t => t.id), trackIds: CURRENT_TRACKS.slice(0, 8).map(t => t.id),
    raceIntervalMs: HOUR, createdAt: T0, ...overrides,
  };
}
function fakeDigest(index: number, league: LeagueState, over: Partial<RaceDigest> = {}): RaceDigest {
  const ids = league.roster.map(d => d.id);
  return { index, trackId: 't', trackName: 'T', trackEmoji: '🏁', finishOrder: ids, dnfDriverIds: [], fastestLapDriverId: null,
    totalTicks: 1000, gridOrder: ids, damagedDriverIds: [], crashPairs: [], highlights: [], ...over };
}
const tag = (id: string) => { const t = getTagById(id); if (!t) throw new Error(id); return t; };
/** Roster with only the given tags, so nothing else fires. */
function bare(league: LeagueState, give: Record<number, string[]>) {
  return league.roster.map(d => ({ ...d, tags: (give[d.id] ?? []).map(tag) }));
}

describe('tag actions are well-formed', () => {
  it('every action points at a real tag and a sane chance', () => {
    for (const t of ALL_TAGS) for (const a of t.afterRace ?? []) {
      expect(a.chance).toBeGreaterThan(0); expect(a.chance).toBeLessThanOrEqual(1);
      expect(a.headline.length).toBeGreaterThan(0);
      if (a.do !== 'expire-self') expect(getTagById(a.tagId), `${t.id} → ${a.tagId}`).toBeDefined();
    }
  });
});

describe('evaluateActions', () => {
  it('Haunted spreads to the teammate, deterministically, from a seed that hits', () => {
    // Scan seeds for one where the 20% roll lands, then assert it replays.
    let hit: { seed: number; league: LeagueState } | null = null;
    for (let seed = 1; seed < 60 && !hit; seed++) {
      const league = createLeague(seed, makeSetup());
      const d = league.roster[0];
      const res = evaluateActions(league, fakeDigest(0, league), bare(league, { [d.id]: ['haunted'] }));
      if (res.changes.length) hit = { seed, league };
    }
    expect(hit).not.toBeNull();
    const { league } = hit!;
    const d = league.roster[0];
    const mate = league.roster.find(x => x.id !== d.id && (x.kingdomId ?? x.teamName) === (d.kingdomId ?? d.teamName))!;
    const a = evaluateActions(league, fakeDigest(0, league), bare(league, { [d.id]: ['haunted'] }));
    const b = evaluateActions(league, fakeDigest(0, league), bare(league, { [d.id]: ['haunted'] }));
    expect(a).toEqual(b);
    expect(a.changes).toEqual([expect.objectContaining({ kind: 'acquire', driverId: mate.id, tagId: 'haunted' })]);
    expect(a.entries.map(e => e.type)).toEqual(['acquire-tag', 'expire-tag']);
    expect(a.entries[0]).toMatchObject({ atRaceIndex: 1, targetDriverId: mate.id });
    expect(a.entries[1]).toMatchObject({ atRaceIndex: 5, targetDriverId: mate.id }); // 4 races
    expect(a.changes[0].headline).toContain(mate.fullName);
  });

  it('Shaken passes Bad Blood to the driver they crashed with (rival from crashPairs)', () => {
    let found = false;
    for (let seed = 1; seed < 60 && !found; seed++) {
      const league = createLeague(seed, makeSetup());
      const [a, b] = league.roster;
      const digest = fakeDigest(0, league, { crashPairs: [[a.id, b.id]] });
      const res = evaluateActions(league, digest, bare(league, { [a.id]: ['shaken'] }));
      if (!res.changes.length) continue;
      found = true;
      expect(res.changes[0]).toMatchObject({ kind: 'acquire', driverId: b.id, tagId: 'bad-blood' });
      // No crash partner → nothing to pass it to.
      const none = evaluateActions(league, fakeDigest(0, league), bare(league, { [a.id]: ['shaken'] }));
      expect(none.changes).toEqual([]);
    }
    expect(found).toBe(true);
  });

  it('Hears the Track removes Shaken, always', () => {
    const league = createLeague(7, makeSetup());
    const d = league.roster[0];
    const res = evaluateActions(league, fakeDigest(0, league), bare(league, { [d.id]: ['hears-the-track', 'shaken'] }));
    const removal = res.changes.filter(c => c.kind === 'expire' && c.tagId === 'shaken');
    expect(removal).toHaveLength(1);
    expect(res.entries).toContainEqual({ type: 'expire-tag', atRaceIndex: 1, targetDriverId: d.id, tagId: 'shaken' });
    // Without Shaken present there's nothing to remove.
    const nothing = evaluateActions(league, fakeDigest(0, league), bare(league, { [d.id]: ['hears-the-track'] }));
    expect(nothing.changes.filter(c => c.tagId === 'shaken')).toEqual([]);
  });

  it('respects the slot cap, counting entries this settle already made', () => {
    const league = createLeague(7, makeSetup());
    const d = league.roster[0];
    const full = ['hot-streak', 'the-charger', 'unkillable', 'haunted']; // cap 4
    const mate = league.roster.find(x => x.id !== d.id && (x.kingdomId ?? x.teamName) === (d.kingdomId ?? d.teamName))!;
    const roster = bare(league, { [d.id]: ['haunted'], [mate.id]: full });
    // Scan for a seed where Haunted would spread; the full teammate must block it.
    for (let seed = 1; seed < 60; seed++) {
      const lg = createLeague(seed, makeSetup());
      const r = roster.map(x => ({ ...x }));
      const res = evaluateActions(lg, fakeDigest(0, lg), r);
      for (const c of res.changes) expect(c.driverId === mate.id && c.kind === 'acquire').toBe(false);
    }
  });
});
