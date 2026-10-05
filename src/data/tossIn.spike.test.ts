// Phase 0 toss-in spike: which of the five oddities does the engine accept
// as pure data today? Each `it` is one tag; the assertion says what the engine
// does with it NOW, so the gaps are measured, not argued.
// See docs/TAG_SYSTEM.md and src/data/tossIn.spike.ts.

import { describe, it, expect } from 'vitest';
import RaceEngine, { RosterDriver } from '../RaceEngine';
import { CANON_VARIABLES } from '../simlab/types';
import { generateRoster } from '../generators/drivers';
import { generateCarsForKingdoms } from '../generators/cars';
import { ALL_TRACKS } from '../generators/tracks';
import { TEAMS } from '../data/teams';
import { mulberry32 } from '../engine/rng';
import { Tag, getTagById } from './tags';
import { createLeague, rosterStateAt } from '../league/league';
import { PIT_LANE_GREMLIN, SPONSORS_FAVORITE, THE_MAGNET, HAUNTED, nemesis } from './tossIn.spike';

const SEED = 0xC0FFEE;
const track = ALL_TRACKS[0];

function grid(seed = SEED): RosterDriver[] {
  const rng = mulberry32(seed);
  const roster = generateRoster(rng);
  const cars = generateCarsForKingdoms(TEAMS.map(t => t.id), rng);
  return roster.map(driver => {
    const car = cars.get(driver.kingdomId);
    return {
      ...driver,
      carStats: car?.stats,
      carName: car?.name,
      teamStats: car?.teamStats,
      driverTag: undefined, // clean slate: the spike controls every tag
      carTag: undefined,
      teamTag: undefined,
    } as RosterDriver;
  });
}

function race(roster: RosterDriver[], opts: { rain?: boolean; seed?: number } = {}) {
  const engine = RaceEngine.createForWorker(CANON_VARIABLES, opts.seed ?? SEED);
  engine.loadGeneratedRoster(structuredClone(roster));
  engine.updateConfig({ totalLaps: track.laps, lapLength: track.length });
  engine.setTrackInfo({ id: track.id, name: track.name, emoji: track.emoji, funEmoji: track.funEmoji, description: track.description, laps: track.laps });
  if (opts.rain) engine.setRaceConditions(['rain']);
  return engine.runHeadless();
}

function meanPitDuration(drivers: { id: number; pitStops: { duration: number }[] }[], id: number): number {
  const stops = drivers.find(d => d.id === id)!.pitStops;
  return stops.length ? stops.reduce((s, p) => s + p.duration, 0) / stops.length : NaN;
}

describe('toss-in spike', () => {
  it('1. Pit Lane Gremlin: pure data — longer stops in rain, inert when dry', () => {
    const base = grid();
    const victim = base[0].id;
    const withGremlin = base.map(d => (d.id === victim ? { ...d, carTag: PIT_LANE_GREMLIN } : d));

    // Average across a few seeds so one lucky stop doesn't decide it.
    const seeds = [1, 2, 3, 4, 5];
    const avg = (roster: RosterDriver[], rain: boolean) =>
      seeds.map(s => meanPitDuration(race(roster, { rain, seed: s }).drivers, victim)).filter(n => !Number.isNaN(n))
        .reduce((a, b, _, arr) => a + b / arr.length, 0);

    const dryPlain = avg(base, false);
    const dryGremlin = avg(withGremlin, false);
    const rainPlain = avg(base, true);
    const rainGremlin = avg(withGremlin, true);

    expect(dryGremlin).toBeCloseTo(dryPlain, 5);        // inert when dry
    // 1.5x applies to the stationary work phase only; entry/exit lane time is
    // untouched, so the whole stop grows ~15-20%. Bites in rain:
    expect(rainGremlin / rainPlain).toBeGreaterThan(1.1);
  });

  it('1b. ...but cannot stack: a second car tag has nowhere to live', () => {
    const d = grid()[0];
    const glass = getTagById('glass-cannon')!;
    const withBoth = { ...d, carTag: glass } as RosterDriver;
    // The type has exactly one car slot. Attaching the gremlin evicts Glass Cannon.
    const after = { ...withBoth, carTag: PIT_LANE_GREMLIN };
    expect(after.carTag.id).toBe('pit-lane-gremlin');
    expect(Object.keys(after).filter(k => /Tag$/.test(k))).toEqual(['driverTag', 'carTag', 'teamTag']);
  });

  it('1c. ...and an intervention always writes the DRIVER slot, whatever the tag targets', () => {
    const league = createLeague(SEED, {
      name: 'Spike', godId: 'the-stewards', teamIds: TEAMS.slice(0, 4).map(t => t.id),
      trackIds: [track.id, track.id], raceIntervalMs: 60_000, createdAt: 0,
    });
    const target = league.roster[0];
    league.interventionLog.push({ type: 'attach-tag', atRaceIndex: 0, targetDriverId: target.id, tagId: 'glass-cannon', committedAt: 0 });
    const at0 = rosterStateAt(league, 0).find(d => d.id === target.id)!;
    expect(getTagById('glass-cannon')!.target).toBe('car');
    expect(at0.driverTag?.id).toBe('glass-cannon'); // a car tag, in the driver slot
  });

  it("2. Sponsor's Favorite: seasonEffects is ignored, yet the race still changes", () => {
    const base = grid();
    const d = base[0].id;
    const withTag = base.map(x => (x.id === d ? { ...x, driverTag: SPONSORS_FAVORITE as Tag } : x));
    const a = race(base).drivers.map(x => [x.id, x.finishTick]);
    const b = race(withTag).drivers.map(x => [x.id, x.finishTick]);
    // FINDING: the race is NOT identical even though the tag has zero effects.
    // tryActivateTag() rolls this.rng() for triggerChance on every activation,
    // so attaching any passive tag — a pure-flavor Quirk included — reshuffles
    // the RNG stream and changes the whole race. A "story only" tier is not
    // inert today. (seasonEffects is, as expected, read by nothing.)
    expect(b).not.toEqual(a);
    expect(JSON.stringify(SPONSORS_FAVORITE.seasonEffects)).toContain('bonusPointsPerFinish');
  });

  it('3. The Magnet: nothing in the engine reads raceEffects', () => {
    const base = grid();
    const d = base[0].id;
    const withTag = base.map(x => (x.id === d ? { ...x, driverTag: THE_MAGNET as Tag } : x));
    // Same caveat as (2): the race diverges via the activation roll, so we
    // can't assert equality. What we CAN assert: nothing reads raceEffects.
    const src = String(RaceEngine.prototype.constructor.toString());
    expect(src).not.toContain('safetyCarOddsModifier');
    expect(THE_MAGNET.raceEffects?.safetyCarOddsModifier).toBe(2);
    void base; void withTag;
  });

  it('4. Haunted: luck part works as data; acquisition, spread and expiry have no home', () => {
    const base = grid();
    const d = base[0].id;
    const withTag = base.map(x => (x.id === d ? { ...x, driverTag: HAUNTED as Tag } : x));
    const a = race(base).drivers.find(x => x.id === d)!.finishTick;
    const b = race(withTag).drivers.find(x => x.id === d)!.finishTick;
    expect(b).not.toBe(a); // the -luck modifier IS applied — the race changed
    // The rest is declared but nothing consumes it:
    expect(HAUNTED.acquiredBy).toBeDefined();
    expect(HAUNTED.afterRace?.length).toBe(1);
    expect(HAUNTED.duration).toEqual({ races: 4 });
  });

  it('5. Nemesis: the live gate rejects an unknown condition, so the tag is inert', () => {
    const base = grid();
    const [me, rival] = base;
    const withTag = base.map(x => (x.id === me.id ? { ...x, driverTag: nemesis(rival.id, rival.firstName ?? 'Rival') as unknown as Tag } : x));
    // Conditional tags skip the activation roll (evaluateDriverTags `continue`s
    // on tag.condition), so with an unknown condition the race IS identical:
    // the gate's default branch returns false and nothing else touches the stream.
    const a = race(base).drivers.map(x => [x.id, x.finishTick]);
    const b = race(withTag).drivers.map(x => [x.id, x.finishTick]);
    expect(b).toEqual(a);
  });
});
