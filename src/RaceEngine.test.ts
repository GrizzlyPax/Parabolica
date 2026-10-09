import { describe, it, expect } from 'vitest';
import RaceEngine, { TIRE_COMPOUNDS, RosterDriver } from './RaceEngine';
import { CANON_VARIABLES } from './simlab/types';
import { generateRoster, GeneratedDriver } from './generators/drivers';
import { generateCarsForKingdoms, GeneratedCar } from './generators/cars';
import { ALL_TRACKS, CURRENT_TRACKS, Track } from './generators/tracks';
import { generateGenesisRoster } from './league/league';
import { TEAMS } from './data/teams';
import { Tag, getTagById } from './data/tags';
import type { WeatherState } from './data/weather';

/** A hand-built wet race (what Wet, v0.6, will roll): stamps 'rain', leans the field. */
const WET: WeatherState = { id: 'wet', name: 'Wet', emoji: '🌧️', intensity: 1, conditions: ['rain'], effects: { crashResistance: -0.1, speedModifier: 0.96, consistencyModifier: 0.97 }, favours: [] };
import { mulberry32, randomSeed } from './engine/rng';
import { buildRoster } from './rules/genesis';

/** A standard grid: 11 of the 28 teams, like Quick Race. */
const GRID_TEAM_IDS = TEAMS.slice(0, 11).map(t => t.id);
import { Ruleset, defaultRuleset } from './rules/ruleset';

function createRosterWithCars(roster: GeneratedDriver[], cars: Map<string, GeneratedCar>, seed: number = randomSeed(), rs: Ruleset = defaultRuleset()) {
  return buildRoster(roster, cars, seed, rs);
}

function runOneRace(track: Track) {
  const engine = RaceEngine.createForWorker(CANON_VARIABLES);
  const roster = generateRoster();
  const cars = generateCarsForKingdoms(GRID_TEAM_IDS);
  engine.loadGeneratedRoster(createRosterWithCars(roster, cars));
  engine.updateConfig({ totalLaps: track.laps, lapLength: track.length });
  engine.setTrackInfo({
    id: track.id,
    name: track.name,
    emoji: track.emoji,
    funEmoji: track.funEmoji,
    description: track.description,
    laps: track.laps,
  });
  return engine.runHeadless();
}

describe('tire tuning consistency', () => {
  it('keeps the live-race tire table identical to CANON_VARIABLES (labs vs live drift)', () => {
    expect(TIRE_COMPOUNDS).toEqual(CANON_VARIABLES.tires);
  });
});

describe('determinism (golden master)', () => {
  const track = ALL_TRACKS[0];

  // Build one roster, then deep-clone it per engine so both runs start from
  // byte-identical inputs (generators are seeded separately).
  function makeRosterWithCars() {
    const roster = generateRoster();
    const cars = generateCarsForKingdoms(GRID_TEAM_IDS);
    return createRosterWithCars(roster, cars);
  }

  function runSeeded(rosterWithCars: ReturnType<typeof makeRosterWithCars>, seed: number) {
    const engine = RaceEngine.createForWorker(CANON_VARIABLES, seed);
    engine.loadGeneratedRoster(structuredClone(rosterWithCars));
    engine.updateConfig({ totalLaps: track.laps, lapLength: track.length });
    engine.setTrackInfo({
      id: track.id,
      name: track.name,
      emoji: track.emoji,
      funEmoji: track.funEmoji,
      description: track.description,
      laps: track.laps,
    });
    return engine.runHeadless();
  }

  it('replays the identical race for the same seed and roster', () => {
    const rosterWithCars = makeRosterWithCars();
    const a = runSeeded(rosterWithCars, 0xC0FFEE);
    const b = runSeeded(rosterWithCars, 0xC0FFEE);

    expect(b.raceState.finishOrder).toEqual(a.raceState.finishOrder);
    expect(b.raceState.totalTicks).toBe(a.raceState.totalTicks);
    expect(b.raceState.leadChanges).toBe(a.raceState.leadChanges);
    expect(b.events).toEqual(a.events);
    expect(b.drivers.map(d => ({ id: d.id, status: d.status, lap: d.currentLap })))
      .toEqual(a.drivers.map(d => ({ id: d.id, status: d.status, lap: d.currentLap })));
  });

  it('produces a different race for a different seed', () => {
    const rosterWithCars = makeRosterWithCars();
    const a = runSeeded(rosterWithCars, 1);
    const b = runSeeded(rosterWithCars, 2);

    // The full event log differing is the loosest possible assertion that
    // still proves the seed actually drives the simulation.
    expect(b.events).not.toEqual(a.events);
  });

  it('seeded runs do not disturb each other (independent engine instances)', () => {
    const rosterWithCars = makeRosterWithCars();
    const a = runSeeded(rosterWithCars, 7);
    runSeeded(rosterWithCars, 99); // interleaved unrelated run
    const c = runSeeded(rosterWithCars, 7);
    expect(c.raceState.finishOrder).toEqual(a.raceState.finishOrder);
  });
});

describe('conditional tags (#156 gate)', () => {
  const track = ALL_TRACKS[0];

  // One tag-free grid, reused across runs (generators use Math.random, so the
  // roster must be fixed up-front — only the tag under test may vary).
  function cleanRoster(): RosterDriver[] {
    // Seeded so these gate tests are deterministic (unseeded rosters made the
    // "diverges on at least one of four seeds" assertions flaky).
    const rng = mulberry32(0x156);
    const roster = generateRoster(rng);
    const cars = generateCarsForKingdoms(GRID_TEAM_IDS, rng);
    return createRosterWithCars(roster, cars).map(d => ({ ...d, tags: [] }));
  }

  function run(base: RosterDriver[], seed: number, driverTag: Tag | undefined, conditions: string[] = []) {
    const grid = structuredClone(base);
    grid[0].tags = driverTag ? [driverTag] : []; // only driver 0's tag varies between runs
    const engine = RaceEngine.createForWorker(CANON_VARIABLES, seed);
    engine.loadGeneratedRoster(grid);
    engine.updateConfig({ totalLaps: track.laps, lapLength: track.length });
    engine.setTrackInfo({
      id: track.id, name: track.name, emoji: track.emoji,
      funEmoji: track.funEmoji, description: track.description, laps: track.laps,
    });
    if (conditions.length) engine.setRaceConditions(conditions);
    return engine.runHeadless();
  }

  it('a rain-dancer in the dry is completely inert (the 9x fix)', () => {
    // Gated to rain with no rain present → must not perturb the race at all,
    // including the RNG stream (so it matches the no-tag baseline byte-for-byte).
    const base = cleanRoster();
    const baseline = run(base, 0xDDD, undefined);
    const withDancer = run(base, 0xDDD, getTagById('rain-dancer'));
    expect(withDancer.raceState.finishOrder).toEqual(baseline.raceState.finishOrder);
    expect(withDancer.raceState.totalTicks).toBe(baseline.raceState.totalTicks);
    expect(withDancer.events).toEqual(baseline.events);
  });

  it('the same rain-dancer DOES bite once it is raining', () => {
    const base = cleanRoster();
    const dry = run(base, 0xDDD, getTagById('rain-dancer'));
    const wet = run(base, 0xDDD, getTagById('rain-dancer'), ['rain']);
    // Switching the gate on changes the race — proves the live path applies.
    expect(wet.events).not.toEqual(dry.events);
  });

  it('an always-satisfied conditional tag changes the race vs no tag', () => {
    const boost: Tag = {
      id: 'test-rocket', name: 'Test Rocket', emoji: '🚀', description: 'always on',
      target: 'driver', trigger: 'passive', rarity: 'bronze', condition: { when: 'lapProgress', after: 0 },
      effects: { speedModifier: 1.2 },
    };
    const base = cleanRoster();
    const baseline = run(base, 0xBEEF, undefined);
    const boosted = run(base, 0xBEEF, boost);
    expect(boosted.events).not.toEqual(baseline.events);
  });

  it('records a complete lap-position history from lap 1 (the lap chart / #173 trace)', () => {
    const grid = structuredClone(cleanRoster());
    const engine = RaceEngine.createForWorker(CANON_VARIABLES, 0x1A9);
    engine.loadGeneratedRoster(grid);
    engine.updateConfig({ totalLaps: track.laps, lapLength: track.length });
    engine.setTrackInfo({ id: track.id, name: track.name, emoji: track.emoji,
      funEmoji: track.funEmoji, description: track.description, laps: track.laps });
    engine.runHeadless();
    const history = engine.getLapHistory();
    // Complete from the lap-0 starting grid to (near) the full distance, monotonic.
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].lap).toBe(0);
    expect(history[1].lap).toBe(1);
    expect(history[history.length - 1].lap).toBeGreaterThanOrEqual(track.laps - 1);
    for (let i = 1; i < history.length; i++) {
      expect(history[i].lap).toBeGreaterThan(history[i - 1].lap);
    }
    // Every snapshot ranks the whole field.
    expect(history[0].order.length).toBe(grid.length);
  });

  it('records true pit-lane durations (regression: stops 2+ logged the stint length)', () => {
    // The old duration formula subtracted the PREVIOUS stop's tick, so any
    // stop after the first recorded ~40-90s. Real pit-lane time (entry→exit)
    // is bounded: lane transit at the speed limit + stationary work.
    const grid = structuredClone(cleanRoster());
    const engine = RaceEngine.createForWorker(CANON_VARIABLES, 0x917);
    engine.loadGeneratedRoster(grid);
    engine.updateConfig({ totalLaps: track.laps, lapLength: track.length });
    engine.setTrackInfo({ id: track.id, name: track.name, emoji: track.emoji,
      funEmoji: track.funEmoji, description: track.description, laps: track.laps });
    const { drivers } = engine.runHeadless();
    const stops = drivers.flatMap(d => d.pitStops ?? []);
    expect(stops.length).toBeGreaterThan(10);
    for (const s of stops) {
      expect(s.duration, `stop at L${s.lap}`).toBeGreaterThan(0);
      expect(s.duration, `stop at L${s.lap}`).toBeLessThan(250); // ≤ 25s incl. slow stops
    }
  });

  it('lastPitLapBuffer is a live knob (no farcical final-lap stops) — #195', () => {
    // The pit-window decision now routes the late-race cutoff through one knob
    // (pits.lastPitLapBuffer) instead of inconsistent inline literals. Cranking
    // it up must change races: it suppresses non-critical stops in the closing
    // laps (a stop you can't recover the pit-loss from before the flag is
    // strictly worse than running a compound short — there's no penalty for
    // unmet compound variety). At least one of a handful of seeds must diverge.
    const base = cleanRoster();
    const wideBuffer = {
      ...CANON_VARIABLES,
      pits: { ...CANON_VARIABLES.pits, lastPitLapBuffer: 8 },
    };
    const runWith = (vars: typeof CANON_VARIABLES, seed: number) => {
      const grid = structuredClone(base);
      const engine = RaceEngine.createForWorker(vars, seed);
      engine.loadGeneratedRoster(grid);
      engine.updateConfig({ totalLaps: track.laps, lapLength: track.length });
      engine.setTrackInfo({ id: track.id, name: track.name, emoji: track.emoji,
        funEmoji: track.funEmoji, description: track.description, laps: track.laps });
      return engine.runHeadless();
    };
    let diverged = false;
    for (const seed of [0x517, 0x518, 0x519, 0x51A]) {
      const canon = runWith(CANON_VARIABLES, seed);
      const wide = runWith(wideBuffer, seed);
      if (JSON.stringify(canon.events) !== JSON.stringify(wide.events)) diverged = true;
    }
    expect(diverged).toBe(true);
  });

  it('strategy archetypes + SC opportunism are live at canon and each changes races — #195/#246', { timeout: 60_000 }, () => {
    // Both knobs are canon-on since #246 (lean 0.1, SC stops 0.5). Each must
    // (a) replay byte-identically for a fixed seed and (b) actually change
    // races when turned off, so neither is a dead knob.
    const base = cleanRoster();
    const withVars = (pits: Partial<typeof CANON_VARIABLES.pits>) => ({
      ...CANON_VARIABLES,
      pits: { ...CANON_VARIABLES.pits, ...pits },
    });
    const runWith = (vars: typeof CANON_VARIABLES, seed: number) => {
      const grid = structuredClone(base);
      const engine = RaceEngine.createForWorker(vars, seed);
      engine.loadGeneratedRoster(grid);
      engine.updateConfig({ totalLaps: track.laps, lapLength: track.length });
      engine.setTrackInfo({ id: track.id, name: track.name, emoji: track.emoji,
        funEmoji: track.funEmoji, description: track.description, laps: track.laps });
      return engine.runHeadless();
    };

    // (a) replay
    const once = runWith(CANON_VARIABLES, 0x195);
    const again = runWith(CANON_VARIABLES, 0x195);
    expect(again.events).toEqual(once.events);
    expect(again.raceState.finishOrder).toEqual(once.raceState.finishOrder);

    // (b) live: turning each gate off diverges on at least one of a few seeds
    for (const pits of [{ strategyWearLean: 0 }, { scPitChance: 0 }]) {
      let diverged = false;
      // The new tracks are shorter (14–16 laps), so a safety car needs a few more seeds to show up.
      for (const seed of [0x195, 0x196, 0x197, 0x198, 0x199, 0x19a, 0x19b, 0x19c]) {
        const a = runWith(CANON_VARIABLES, seed);
        const b = runWith(withVars(pits), seed);
        if (JSON.stringify(a.events) !== JSON.stringify(b.events)) diverged = true;
      }
      expect(diverged, `gate ${JSON.stringify(pits)} should change races`).toBe(true);
    }
  });

  it('#82 mistakes layer: gate-0 draws no RNG; live at canon (v0.3.31) it bites', () => {
    // The determinism invariant from BALANCE_DOMINANCE_PASS §3: with
    // mistakeBaseChance 0 the mistake path must draw NO RNG and ignore every
    // other mistake knob (same pattern as accelEffect) — two configs that
    // differ only in non-gate mistake knobs must replay byte-identically.
    // Mistakes are CANON since v0.3.31 (rebalance v3), so the live contract
    // (driver_error events, one-at-a-time + refractory) is asserted on canon
    // itself.
    const base = cleanRoster();
    const withMistakes = (perf: Partial<typeof CANON_VARIABLES.performance>) => ({
      ...CANON_VARIABLES,
      performance: { ...CANON_VARIABLES.performance, ...perf },
    });
    const runWith = (vars: typeof CANON_VARIABLES, seed: number) => {
      const grid = structuredClone(base);
      const engine = RaceEngine.createForWorker(vars, seed);
      engine.loadGeneratedRoster(grid);
      engine.updateConfig({ totalLaps: track.laps, lapLength: track.length, maxStoredEvents: 100000 });
      engine.setTrackInfo({ id: track.id, name: track.name, emoji: track.emoji,
        funEmoji: track.funEmoji, description: track.description, laps: track.laps });
      return engine.runHeadless();
    };

    // Gate closed: zero base chance, wildly different other knobs → byte-identical
    const gateA = runWith(withMistakes({ mistakeBaseChance: 0 }), 0x82);
    const gateB = runWith(withMistakes({
      mistakeBaseChance: 0, mistakeConsistencyWeight: 9, mistakeAggressionWeight: 9,
      mistakeSpeedPenalty: 0.1, mistakeDurationTicks: 999, mistakeCooldownTicks: 999,
    }), 0x82);
    expect(gateB.events).toEqual(gateA.events);
    expect(gateB.raceState.finishOrder).toEqual(gateA.raceState.finishOrder);
    expect(gateA.events.some(e => e.type === 'driver_error')).toBe(false);

    // Live: mistakes happen, spaced by duration+cooldown per driver, none fatal
    let sawMistake = false;
    for (const seed of [0x82, 0x83, 0x84]) {
      const live = runWith(CANON_VARIABLES, seed);
      const errors = live.events.filter(e => e.type === 'driver_error');
      if (errors.length === 0) continue;
      sawMistake = true;
      const lastByDriver = new Map<number, number>();
      for (const e of errors) {
        const prev = lastByDriver.get(e.driverId);
        if (prev !== undefined) {
          expect(e.tick - prev).toBeGreaterThanOrEqual(450); // duration + cooldown
        }
        lastByDriver.set(e.driverId, e.tick);
      }
    }
    expect(sawMistake).toBe(true);
  });

  it('getActiveTagIds reports a conditional tag only while its gate is open', () => {
    const base = cleanRoster();
    const prep = (weather: WeatherState | null) => {
      const grid = structuredClone(base);
      grid[0].tags = [getTagById('rain-dancer')!];
      const engine = RaceEngine.createForWorker(CANON_VARIABLES, 0xACE);
      engine.loadGeneratedRoster(grid);
      engine.updateConfig({ totalLaps: track.laps, lapLength: track.length });
      engine.setTrackInfo({ id: track.id, name: track.name, emoji: track.emoji,
        funEmoji: track.funEmoji, description: track.description, laps: track.laps });
      engine.setWeather(weather);
      engine.reset();
      engine.fastForward(50); // contexts rebuilt per tick
      return engine;
    };
    expect(prep(null).getActiveTagIds(base[0].id)).not.toContain('rain-dancer');
    expect(prep(WET).getActiveTagIds(base[0].id)).toContain('rain-dancer');
  });

  it('setWeather wakes a rain-dancer (the real C2 path, not just raw conditions)', () => {
    // No weather rolls rain in v0.5 (Wet returns in v0.6), so this is the state
    // Wet will set: it stamps 'rain' and leans the field.
    const rain = WET;
    const base = cleanRoster();
    const dry = run(base, 0xDDD, getTagById('rain-dancer'));
    // setWeather applies the field-wide lean AND stamps 'rain' so the tag fires.
    const grid = structuredClone(base);
    grid[0].tags = [getTagById('rain-dancer')!];
    const engine = RaceEngine.createForWorker(CANON_VARIABLES, 0xDDD);
    engine.loadGeneratedRoster(grid);
    engine.updateConfig({ totalLaps: track.laps, lapLength: track.length });
    engine.setTrackInfo({ id: track.id, name: track.name, emoji: track.emoji,
      funEmoji: track.funEmoji, description: track.description, laps: track.laps });
    engine.setWeather(rain);
    const wet = engine.runHeadless();
    expect(wet.events).not.toEqual(dry.events);
  });
});

describe('headless race invariants', () => {
  const track = ALL_TRACKS[0];

  it('finishes within the tick safety limit', () => {
    const { raceState } = runOneRace(track);
    expect(raceState.raceFinished).toBe(true);
    expect(raceState.totalTicks).toBeLessThan(100000);
  });

  it('classifies every driver as finished or DNF, with a consistent finish order', () => {
    const { drivers, raceState } = runOneRace(track);

    expect(drivers.length).toBe(GRID_TEAM_IDS.length * 2);
    for (const d of drivers) {
      expect(['finished', 'dnf']).toContain(d.status);
    }

    // finishOrder holds unique driver ids
    expect(new Set(raceState.finishOrder).size).toBe(raceState.finishOrder.length);

    // every classified finisher appears in finishOrder exactly once
    const finishers = drivers.filter(d => d.status === 'finished');
    for (const d of finishers) {
      expect(raceState.finishOrder).toContain(d.id);
    }
  });

  it('produces a sane DNF rate over a batch (catches blowout/crash tuning regressions)', () => {
    // Post-balance tuning targets ~20% DNF. Allow generous noise bounds,
    // but fail if we drift back toward the old ~70% rates.
    const races = 15;
    let dnfs = 0;
    let total = 0;
    for (let i = 0; i < races; i++) {
      const { drivers } = runOneRace(ALL_TRACKS[i % ALL_TRACKS.length]);
      dnfs += drivers.filter(d => d.status === 'dnf').length;
      total += drivers.length;
    }
    const dnfRate = dnfs / total;
    expect(dnfRate).toBeLessThan(0.45);
  });
});

// === Pinned golden master (#231) ===
// The suite above proves same-seed-twice equality, which is necessary but
// does not catch an engine change that alters what EVERY seed produces — and
// that is the save-breaking case saved leagues care about. This pins one
// fully seeded race (seeded generators + seeded engine) to a fingerprint on
// disk. When it fails: the engine's output changed. If that was intended,
// bump the version in package.json (saves archive themselves) and regenerate
// with `GOLDEN_UPDATE=1 npx vitest run -t fingerprint`.
import { readFileSync, writeFileSync } from 'node:fs';

describe('golden fingerprint', () => {
  const FIXTURE = new URL('./engine/golden.fixture.json', import.meta.url);
  const SEED = 0x5EED;

  function fnv(str: string): string {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(16).padStart(8, '0');
  }

  function fingerprint() {
    const rng = mulberry32(SEED);
    const roster = generateRoster(rng);
    const cars = generateCarsForKingdoms(GRID_TEAM_IDS, rng);
    const track = ALL_TRACKS[0];
    const engine = RaceEngine.createForWorker(CANON_VARIABLES, SEED);
    engine.loadGeneratedRoster(createRosterWithCars(roster, cars, SEED));
    engine.updateConfig({ totalLaps: track.laps, lapLength: track.length });
    engine.setTrackInfo({ id: track.id, name: track.name, emoji: track.emoji, funEmoji: track.funEmoji, description: track.description, laps: track.laps });
    const r = engine.runHeadless();
    return {
      seed: SEED,
      track: track.id,
      rosterHash: fnv(JSON.stringify(roster.map(d => [d.fullName, d.stats]))),
      finishOrder: r.raceState.finishOrder,
      totalTicks: r.raceState.totalTicks,
      leadChanges: r.raceState.leadChanges,
      eventsHash: fnv(JSON.stringify(r.events.map(e => [e.tick, e.type, e.driverId, e.magnitude]))),
      tags: r.drivers.map(d => d.tags.map(t => t.id)),
    };
  }

  it('matches the pinned fingerprint', () => {
    const now = fingerprint();
    if (process.env.GOLDEN_UPDATE) {
      writeFileSync(FIXTURE, JSON.stringify(now, null, 2) + '\n');
      return;
    }
    const pinned = JSON.parse(readFileSync(FIXTURE, 'utf8'));
    expect(now, 'Engine output changed for a fixed seed. If intended: bump package.json version and run GOLDEN_UPDATE=1 npx vitest run -t fingerprint').toEqual(pinned);
  });
});

describe('tag stacks (#231)', () => {
  const track = ALL_TRACKS[0];
  function cleanGrid(seed: number): RosterDriver[] {
    const rng = mulberry32(seed);
    const roster = generateRoster(rng);
    const cars = generateCarsForKingdoms(GRID_TEAM_IDS, rng);
    return createRosterWithCars(roster, cars).map(d => ({ ...d, tags: [] }));
  }
  function run(grid: RosterDriver[], seed: number, conditions: string[] = []) {
    const engine = RaceEngine.createForWorker(CANON_VARIABLES, seed);
    engine.loadGeneratedRoster(structuredClone(grid));
    engine.updateConfig({ totalLaps: track.laps, lapLength: track.length });
    engine.setTrackInfo({ id: track.id, name: track.name, emoji: track.emoji, funEmoji: track.funEmoji, description: track.description, laps: track.laps });
    if (conditions.length) engine.setRaceConditions(conditions);
    return engine.runHeadless();
  }
  const sig = (r: ReturnType<typeof run>) => ({ order: r.raceState.finishOrder, ticks: r.raceState.totalTicks, events: r.events });

  it('two tags on one driver both bite (effects multiply across the stack)', () => {
    const base = cleanGrid(11);
    const d = base[0].id;
    const fast: Tag = { id: 't-fast', name: 'Fast', emoji: '1', description: '', target: 'driver', trigger: 'passive', rarity: 'bronze', condition: { when: 'lapProgress', after: 0 }, effects: { speedModifier: 1.1 } };
    const faster: Tag = { id: 't-faster', name: 'Faster', emoji: '2', description: '', target: 'car', trigger: 'passive', rarity: 'bronze', condition: { when: 'lapProgress', after: 0 }, effects: { speedModifier: 1.1 } };
    const with1 = base.map(x => x.id === d ? { ...x, tags: [fast] } : x);
    const with2 = base.map(x => x.id === d ? { ...x, tags: [fast, faster] } : x);
    // One tag bites in a real race: best lap over a few seeds (robust to DNFs
    // and safety-car laps).
    const best = (grid: RosterDriver[]) => Math.min(...[5, 6, 7].flatMap(seed => run(grid, seed).drivers.find(x => x.id === d)!.lapTimes));
    expect(best(with1)).toBeLessThan(best(base));
    // Two tags multiply. Since Balance Pass One (#481) late-race fade and
    // traffic swamp a best-lap read of the second tag, so read the modifier
    // the engine applies each tick instead.
    const speedMod = (grid: RosterDriver[]) => {
      const engine = RaceEngine.createForWorker(CANON_VARIABLES, 5);
      engine.loadGeneratedRoster(structuredClone(grid));
      engine.updateConfig({ totalLaps: track.laps, lapLength: track.length });
      engine.fastForward(30);
      return (engine as unknown as { getConditionalModifier(id: number, m: 'speedModifier'): number }).getConditionalModifier(d, 'speedModifier');
    };
    expect(speedMod(with1)).toBeCloseTo(1.1, 9);
    expect(speedMod(with2)).toBeCloseTo(1.21, 9);
  });

  it('a zero-effect tag leaves the race byte-identical (quiet quirks)', () => {
    const base = cleanGrid(12);
    const d = base[0].id;
    const quirk: Tag = { id: 't-hums', name: 'Hums while driving', emoji: '~', description: 'story only', target: 'driver', trigger: 'passive', rarity: 'bronze', effects: {} };
    const withQuirk = base.map(x => x.id === d ? { ...x, tags: [quirk] } : x);
    expect(sig(run(withQuirk, 9))).toEqual(sig(run(base, 9)));
  });

  it("a chance-based tag on one driver does not move another driver's rolls", () => {
    // Tag rolls live on per-driver side streams: adding a 50% final-lap tag to
    // driver A must not change whether driver B's own 50% tag fires.
    const base = cleanGrid(13);
    const [a, b] = base;
    const coin = (id: string): Tag => ({ id, name: id, emoji: '?', description: '', target: 'driver', trigger: 'final_lap', rarity: 'bronze', triggerChance: 0.5, effects: { speedModifier: 1.001 } });
    const onlyB = base.map(x => x.id === b.id ? { ...x, tags: [coin('coin-b')] } : x);
    const both = base.map(x => x.id === b.id ? { ...x, tags: [coin('coin-b')] } : x.id === a.id ? { ...x, tags: [coin('coin-a')] } : x);
    const firedB = (r: ReturnType<typeof run>) => r.events.some(e => e.type === 'tag_activation' && e.driverId === b.id);
    // Run a few seeds so this isn't one lucky coin.
    for (const seed of [21, 22, 23, 24, 25, 26]) {
      expect(firedB(run(both, seed))).toBe(firedB(run(onlyB, seed)));
    }
  });
});

describe('in-race acquisition (#232b)', () => {
  const track = ALL_TRACKS[0];
  function cleanGrid(seed: number): RosterDriver[] {
    const rng = mulberry32(seed);
    const roster = generateRoster(rng);
    const cars = generateCarsForKingdoms(GRID_TEAM_IDS, rng);
    return createRosterWithCars(roster, cars).map(d => ({ ...d, tags: [] }));
  }
  function run(grid: RosterDriver[], seed: number) {
    const engine = RaceEngine.createForWorker(CANON_VARIABLES, seed);
    engine.loadGeneratedRoster(structuredClone(grid));
    engine.updateConfig({ totalLaps: track.laps, lapLength: track.length });
    engine.setTrackInfo({ id: track.id, name: track.name, emoji: track.emoji, funEmoji: track.funEmoji, description: track.description, laps: track.laps });
    return { engine, result: engine.runHeadless() };
  }

  it('damage is a tag: a crash survivor carries 🔧 Damaged for the rest of the race', () => {
    for (const seed of [31, 32, 33, 34, 35, 36, 37, 38]) {
      const { result } = run(cleanGrid(seed), seed);
      const survivor = result.drivers.find(d => d.isDamaged && d.status !== 'dnf');
      if (!survivor) continue;
      expect(survivor.tags.some(t => t.id === 'damaged')).toBe(true);
      expect(result.events.some(e => e.type === 'tag_acquired' && e.driverId === survivor.id && e.description.startsWith('Damaged'))).toBe(true);
      return;
    }
    throw new Error('no crash survivor in eight seeds');
  });

  it('a spin attaches 🌀 Spun and it wears off two laps later', () => {
    for (const seed of [41, 42, 43, 44, 45, 46, 47, 48]) {
      const { result } = run(cleanGrid(seed), seed);
      const got = result.events.find(e => e.type === 'tag_acquired' && e.description.startsWith('Spun'));
      if (!got) continue;
      const gone = result.events.find(e => e.type === 'tag_expired' && e.driverId === got.driverId && e.description.startsWith('Spun') && e.tick > got.tick);
      expect(gone, 'Spun should expire').toBeDefined();
      expect((gone!.lap ?? 0) - (got.lap ?? 0)).toBeGreaterThanOrEqual(1);
      expect((gone!.lap ?? 0) - (got.lap ?? 0)).toBeLessThanOrEqual(3);
      // and the driver's final stack no longer carries it (unless they spun again late)
      return;
    }
    throw new Error('no spin in eight seeds');
  });

  it('in-race pickups are deterministic and leave the race replayable', () => {
    const grid = cleanGrid(51);
    const a = run(grid, 9).result, b = run(grid, 9).result;
    expect(b.events).toEqual(a.events);
    expect(b.drivers.map(d => d.tags.map(t => t.id))).toEqual(a.drivers.map(d => d.tags.map(t => t.id)));
  });
});

describe('the stop rule at the flag (#249 / #246)', () => {
  const track = CURRENT_TRACKS[0];
  const run = (pits: Partial<typeof CANON_VARIABLES.pits>, seed = 0x249, tires: Partial<typeof CANON_VARIABLES.tires> = {}) => {
    const engine = RaceEngine.createForWorker({ ...CANON_VARIABLES, pits: { ...CANON_VARIABLES.pits, ...pits }, tires: { ...CANON_VARIABLES.tires, ...tires } }, seed);
    engine.loadGeneratedRoster(generateGenesisRoster(seed, TEAMS.slice(0, 6).map(t => t.id)));
    engine.updateConfig({ totalLaps: track.laps, lapLength: track.length, maxStoredEvents: Number.MAX_SAFE_INTEGER });
    return engine.runHeadless(seed);
  };

  it('at canon every classified driver makes 2 stops on 3 compounds, or is penalised', () => {
    const { drivers } = run({});
    const finishers = drivers.filter(d => d.status === 'finished');
    expect(finishers.length).toBeGreaterThan(5);
    for (const d of finishers) {
      const ok = d.pitStops.length >= 2 && new Set(d.usedCompounds).size === 3;
      if (ok) expect(d.penaltyTicks).toBe(0);
      else { expect(d.penaltyTicks).toBeGreaterThan(0); expect(d.penaltyReason).toBeTruthy(); }
    }
  });

  it('a penalty is time, not laps: it reorders within the lead lap', () => {
    // Tyres that never wear and no room to pit voluntarily → nobody stops,
    // everyone owes the rule; the classification must follow finishTick + penalty.
    const { drivers, raceState } = run({ minStops: 1, requireAllCompounds: false, lastPitLapBuffer: 40, penaltyLapFraction: 0.5 }, 0x249,
      { soft: { ...CANON_VARIABLES.tires.soft, lifeLaps: 100 }, medium: { ...CANON_VARIABLES.tires.medium, lifeLaps: 100 }, hard: { ...CANON_VARIABLES.tires.hard, lifeLaps: 100 } });
    const byId = new Map(drivers.map(d => [d.id, d]));
    const lead = raceState.finishOrder.map(id => byId.get(id)!).filter(d => d.status === 'finished' && d.lapsBehind === 0);
    expect(lead.some(d => d.penaltyTicks > 0)).toBe(true);
    for (let i = 1; i < lead.length; i++) {
      expect(lead[i].finishTick! + lead[i].penaltyTicks).toBeGreaterThanOrEqual(lead[i - 1].finishTick! + lead[i - 1].penaltyTicks);
    }
  });

  it('No Pit Rules: minStops 0 and no compound rule → no penalties, fewer stops', () => {
    const strict = run({});
    const loose = run({ minStops: 0, requireAllCompounds: false });
    expect(loose.drivers.every(d => d.penaltyTicks === 0)).toBe(true);
    const stops = (r: typeof strict) => r.drivers.filter(d => d.status === 'finished').reduce((s, d) => s + d.pitStops.length, 0) / Math.max(1, r.drivers.filter(d => d.status === 'finished').length);
    expect(stops(loose)).toBeLessThan(stops(strict));
  });

  it('tyre life is in laps: a 2× longer race needs more stops', () => {
    const go = (laps: number) => {
      const engine = RaceEngine.createForWorker(CANON_VARIABLES, 7);
      engine.loadGeneratedRoster(generateGenesisRoster(7, TEAMS.slice(0, 6).map(t => t.id)));
      engine.updateConfig({ totalLaps: laps, lapLength: track.length });
      const { drivers } = engine.runHeadless(7);
      const f = drivers.filter(d => d.status === 'finished');
      return f.reduce((s, d) => s + d.pitStops.length, 0) / Math.max(1, f.length);
    };
    expect(go(32)).toBeGreaterThan(go(16) + 1);
  });
});

describe('qualifying and the grid (#246 pass 2)', () => {
  const track = CURRENT_TRACKS[0];
  const build = (seed: number) => {
    const engine = RaceEngine.createForWorker(CANON_VARIABLES, seed);
    engine.loadGeneratedRoster(generateGenesisRoster(seed, GRID_TEAM_IDS));
    engine.updateConfig({ totalLaps: track.laps, lapLength: track.length });
    return engine;
  };
  const pace = (d: { stats: { baseSpeed: number }; carStats?: { power: number } }) => (1 + (d.stats.baseSpeed - 1) * 0.12) * (0.942 + (d.carStats?.power ?? 3) * 0.014);

  it('sets a staggered grid on tick 1, from the seed, mostly by package', () => {
    const e = build(11);
    expect(e.getGridOrder()).toEqual([]);
    e.fastForward(1);
    const grid = e.getGridOrder();
    const drivers = e.getDrivers();
    expect(grid).toHaveLength(drivers.length);
    // Staggered: pole furthest forward, each slot behind the last
    const pos = grid.map(id => drivers.find(d => d.id === id)!.position);
    for (let i = 1; i < pos.length; i++) expect(pos[i]).toBeLessThan(pos[i - 1]);
    // Mostly package: the top-3 package is in the top half of the grid
    const byPace = [...drivers].sort((a, b) => pace(b) - pace(a)).slice(0, 3);
    for (const d of byPace) expect(grid.indexOf(d.id)).toBeLessThan(drivers.length / 2);
    // Replays
    const e2 = build(11); e2.fastForward(1);
    expect(e2.getGridOrder()).toEqual(grid);
    // Different seed, different grid
    const e3 = build(12); e3.fastForward(1);
    expect(e3.getGridOrder()).not.toEqual(grid);
  });

  it('the lap-0 snapshot is the grid, so digests and reports see a real grid', () => {
    const e = build(11);
    e.fastForward(5);
    expect(e.getLapHistory()[0].order).toEqual(e.getGridOrder());
    expect(e.getGridSlot(e.getGridOrder()[0])).toBe(1);
  });
});

describe('overtaking is an event (#246 pass 3)', () => {
  const track = CURRENT_TRACKS[0];
  const run = (seed: number, over: Partial<typeof CANON_VARIABLES.overtaking> = {}) => {
    const engine = RaceEngine.createForWorker({ ...CANON_VARIABLES, overtaking: { ...CANON_VARIABLES.overtaking, ...over } }, seed);
    engine.loadGeneratedRoster(generateGenesisRoster(seed, GRID_TEAM_IDS));
    engine.updateConfig({ totalLaps: track.laps, lapLength: track.length, maxStoredEvents: Number.MAX_SAFE_INTEGER });
    const out = engine.runHeadless(seed);
    return { engine, ...out };
  };

  it('passes are logged as events and a car is held until it earns one', () => {
    const { events } = run(31);
    const passes = events.filter(e => e.type === 'overtake' && /passes/.test(e.description));
    expect(passes.length).toBeGreaterThan(5);
    expect(events.some(e => e.type === 'battle')).toBe(true);
  });

  it('a harder track means fewer passes', () => {
    const easy = [1, 2, 3].reduce((n, s) => n + run(s, { attemptBase: 0.03 }).events.filter(e => e.type === 'overtake').length, 0);
    const hard = [1, 2, 3].reduce((n, s) => n + run(s, { attemptBase: 0.003 }).events.filter(e => e.type === 'overtake').length, 0);
    expect(hard).toBeLessThan(easy);
  });

  it('the grid predicts the result better than a lottery', () => {
    // Over a few seeds, the pole-sitter finishes in the top half far more often than 50%.
    let topHalf = 0, n = 0;
    for (const seed of [41, 42, 43, 44, 45, 46]) {
      const { engine, raceState } = run(seed);
      const pole = engine.getGridOrder()[0];
      const pos = raceState.finishOrder.indexOf(pole);
      if (pos >= 0) { n++; if (pos < raceState.finishOrder.length / 2) topHalf++; }
    }
    expect(topHalf / n).toBeGreaterThan(0.6);
  });
});
