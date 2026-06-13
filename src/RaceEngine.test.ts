import { describe, it, expect } from 'vitest';
import RaceEngine, { TIRE_COMPOUNDS, RosterDriver } from './RaceEngine';
import { CANON_VARIABLES } from './simlab/types';
import { generateRoster, GeneratedDriver } from './generators/drivers';
import { generateCarsForKingdoms, GeneratedCar } from './generators/cars';
import { ALL_TRACKS, Track } from './generators/tracks';
import { TEAMS } from './data/teams';
import { Tag, getTagById } from './data/tags';
import { rollWeather } from './data/weather';

function createRosterWithCars(roster: GeneratedDriver[], cars: Map<string, GeneratedCar>) {
  return roster.map(driver => {
    const car = cars.get(driver.kingdomId);
    return {
      ...driver,
      carStats: car?.stats,
      carName: car?.name,
      teamStats: car?.teamStats,
      driverTag: driver.tag,
      carTag: car?.carTag,
      teamTag: car?.teamTag,
    };
  });
}

function runOneRace(track: Track) {
  const engine = RaceEngine.createForWorker(CANON_VARIABLES);
  const roster = generateRoster();
  const cars = generateCarsForKingdoms(TEAMS.map(t => t.id));
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
    const cars = generateCarsForKingdoms(TEAMS.map(t => t.id));
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
    const roster = generateRoster();
    const cars = generateCarsForKingdoms(TEAMS.map(t => t.id));
    return createRosterWithCars(roster, cars).map(d => ({
      ...d, driverTag: undefined, carTag: undefined, teamTag: undefined,
    }));
  }

  function run(base: RosterDriver[], seed: number, driverTag: Tag | undefined, conditions: string[] = []) {
    const grid = structuredClone(base);
    grid[0].driverTag = driverTag; // only driver 0's tag varies between runs
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
      target: 'driver', trigger: 'passive', condition: { when: 'lapProgress', after: 0 },
      effects: { speedModifier: 1.2 },
    };
    const base = cleanRoster();
    const baseline = run(base, 0xBEEF, undefined);
    const boosted = run(base, 0xBEEF, boost);
    expect(boosted.events).not.toEqual(baseline.events);
  });

  function runWithTrackTags(base: RosterDriver[], seed: number, trackTags: Parameters<RaceEngine['setTrackTags']>[0], driverTag?: Tag) {
    const grid = structuredClone(base);
    grid[0].driverTag = driverTag;
    const engine = RaceEngine.createForWorker(CANON_VARIABLES, seed);
    engine.loadGeneratedRoster(grid);
    engine.updateConfig({ totalLaps: track.laps, lapLength: track.length });
    engine.setTrackInfo({ id: track.id, name: track.name, emoji: track.emoji,
      funEmoji: track.funEmoji, description: track.description, laps: track.laps });
    engine.setTrackTags(trackTags);
    return engine.runHeadless();
  }

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

  it('strategy archetypes + SC opportunism are live when gated on, inert at canon — #195', () => {
    // Both knobs ship canon-0 and must (a) leave the race byte-identical when
    // dormant — they draw from a side seed stream / draw no main RNG — and
    // (b) actually change races when flipped on. The wear-lean is the binding
    // strategy lever: the wear trigger times ~all stops at canon, so leaning
    // it per-archetype is what un-herds the field.
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

    // (a) dormant: a deep-copied canon (knobs explicitly 0) replays byte-identically
    const canonRun = runWith(CANON_VARIABLES, 0x195);
    const dormant = runWith(withVars({ strategyWearLean: 0, scPitChance: 0 }), 0x195);
    expect(dormant.events).toEqual(canonRun.events);
    expect(dormant.raceState.finishOrder).toEqual(canonRun.raceState.finishOrder);

    // (b) live: each gate independently diverges on at least one of a few seeds
    for (const pits of [{ strategyWearLean: 0.12 }, { scPitChance: 0.25 }]) {
      let diverged = false;
      for (const seed of [0x195, 0x196, 0x197, 0x198]) {
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

  it('a track tag passive lean changes the race', () => {
    const base = cleanRoster();
    const plain = run(base, 0x7AC, undefined);
    // A field-wide pace lean touches every tick — guaranteed divergence.
    const tagged = runWithTrackTags(base, 0x7AC, [{ id: 'high-speed', name: 'High-Speed', emoji: '🏎️',
      passive: { speedModifier: 1.02 } }]);
    expect(tagged.events).not.toEqual(plain.events);
  });

  it('a track tag stamps conditions that condition-gated tags react to', () => {
    // The cross-layer trigger: a driver tag gated on 'debris-hazard' must be
    // inert on a plain track but bite when the track stamps that condition.
    const debrisLover: Tag = {
      id: 'test-scavenger', name: 'Scavenger', emoji: '🦅', description: 'thrives in debris',
      target: 'driver', trigger: 'passive', condition: { when: 'condition', has: 'debris-hazard' },
      effects: { speedModifier: 1.15 },
    };
    const hazardTag = { id: 'hazardous', name: 'Hazardous', emoji: '⚠️', conditions: ['debris-hazard'] };
    const base = cleanRoster();
    // Same track tag both runs; only the driver tag differs. On a stamping
    // track, the gated tag must fire and change the race.
    const withoutDriverTag = runWithTrackTags(base, 0x7AD, [hazardTag]);
    const withDriverTag = runWithTrackTags(base, 0x7AD, [hazardTag], debrisLover);
    expect(withDriverTag.events).not.toEqual(withoutDriverTag.events);
    // And on a non-stamping track the gated tag is fully inert (no condition).
    const plainNoTag = runWithTrackTags(base, 0x7AD, []);
    const plainWithTag = runWithTrackTags(base, 0x7AD, [], debrisLover);
    expect(plainWithTag.events).toEqual(plainNoTag.events);
  });

  it('inflictions strike only when their condition is active, and land as events', () => {
    const base = cleanRoster();
    // Dry races (no weather, no track tags): zero inflictions, ever.
    for (const seed of [11, 22, 33]) {
      const dry = run(base, seed, undefined);
      expect(dry.events.some(e => e.description.includes('Electrocuted'))).toBe(false);
    }
    // Rainy races: ⚡ Electrocuted strikes show up across a handful of seeds
    // (per-tick chance ≈ 0.6 expected/race — any single race may be clean).
    const rain = rollWeather(() => 0.99);
    let struck = 0;
    for (const seed of [11, 22, 33, 44, 55, 66, 77, 88]) {
      const grid = structuredClone(base);
      const engine = RaceEngine.createForWorker(CANON_VARIABLES, seed);
      engine.loadGeneratedRoster(grid);
      // Full event log — the 500-event UI cap can evict an early strike,
      // which made this assertion flaky.
      engine.updateConfig({ totalLaps: track.laps, lapLength: track.length, maxStoredEvents: Number.MAX_SAFE_INTEGER });
      engine.setTrackInfo({ id: track.id, name: track.name, emoji: track.emoji,
        funEmoji: track.funEmoji, description: track.description, laps: track.laps });
      engine.setWeather(rain);
      const wet = engine.runHeadless();
      if (wet.events.some(e => e.description.includes('Electrocuted'))) struck++;
    }
    expect(struck).toBeGreaterThan(0);
  });

  it('getActiveTagIds reports a conditional tag only while its gate is open', () => {
    const base = cleanRoster();
    const prep = (weather: ReturnType<typeof rollWeather> | null) => {
      const grid = structuredClone(base);
      grid[0].driverTag = getTagById('rain-dancer');
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
    expect(prep(rollWeather(() => 0.99)).getActiveTagIds(base[0].id)).toContain('rain-dancer');
  });

  it('setWeather wakes a rain-dancer (the real C2 path, not just raw conditions)', () => {
    const rain = rollWeather(() => 0.99); // lands in the rain bucket at high intensity
    expect(rain.id).toBe('rain');
    const base = cleanRoster();
    const dry = run(base, 0xDDD, getTagById('rain-dancer'));
    // setWeather applies the field-wide lean AND stamps 'rain' so the tag fires.
    const grid = structuredClone(base);
    grid[0].driverTag = getTagById('rain-dancer');
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

    expect(drivers.length).toBe(TEAMS.length * 2);
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
