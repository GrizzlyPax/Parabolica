import { describe, it, expect } from 'vitest';
import RaceEngine, { TIRE_COMPOUNDS, RosterDriver } from './RaceEngine';
import { CANON_VARIABLES } from './simlab/types';
import { generateRoster, GeneratedDriver } from './generators/drivers';
import { generateCarsForKingdoms, GeneratedCar } from './generators/cars';
import { ALL_TRACKS, CURRENT_TRACKS, Track } from './generators/tracks';
import { generateGenesisRoster } from './league/league';
import { TEAMS } from './data/teams';
import type { WeatherState } from './data/weather';
import { RULE_CARDS_BY_ID } from './data/ruleCards';

/** A hand-built wet race (what Wet, v0.6, will roll): stamps 'rain', leans the field. */
const WET: WeatherState = { id: 'wet', name: 'Wet', emoji: '🌧️', intensity: 1, conditions: ['rain'], effects: { crashResistance: -0.1, speedModifier: 0.96, consistencyModifier: 0.97 }, favours: [] };
import { mulberry32, randomSeed } from './engine/rng';
import { buildRoster } from './rules/genesis';

/** A standard grid: 11 of the 28 teams, like Quick Race. */
const GRID_TEAM_IDS = TEAMS.slice(0, 11).map(t => t.id);
import { Ruleset, defaultRuleset, resolveRuleset } from './rules/ruleset';

function createRosterWithCars(roster: GeneratedDriver[], cars: Map<string, GeneratedCar>, seed: number = randomSeed(), rs: Ruleset = defaultRuleset()) {
  return buildRoster(roster, cars, seed, rs);
}
/** The No Traits rule card: a grid with no genesis cards, pure stats. */
const NO_CARDS = resolveRuleset(['no-traits'], RULE_CARDS_BY_ID);

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

describe('engine layers on a card-free grid', () => {
  const track = ALL_TRACKS[0];

  // One card-free grid (the No Traits card), reused across runs so only the
  // thing under test varies.
  function cleanRoster(): RosterDriver[] {
    // Seeded so these gate tests are deterministic (unseeded rosters made the
    // "diverges on at least one of four seeds" assertions flaky).
    const rng = mulberry32(0x156);
    const roster = generateRoster(rng);
    const cars = generateCarsForKingdoms(GRID_TEAM_IDS, rng);
    return createRosterWithCars(roster, cars, 0x156, NO_CARDS);
  }

  function run(base: RosterDriver[], seed: number, weather: WeatherState | null = null) {
    const engine = RaceEngine.createForWorker(CANON_VARIABLES, seed);
    engine.loadGeneratedRoster(structuredClone(base));
    engine.updateConfig({ totalLaps: track.laps, lapLength: track.length });
    engine.setTrackInfo({
      id: track.id, name: track.name, emoji: track.emoji,
      funEmoji: track.funEmoji, description: track.description, laps: track.laps,
    });
    engine.setWeather(weather);
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

  it('lastPitShare is a live knob (no farcical final-lap stops) — #195 / #534', () => {
    // The pit-window decision routes the late-race cutoff through one knob
    // (pits.lastPitShare, a share of the race) instead of inline literals. Cranking
    // it up must change races: it suppresses non-critical stops in the closing
    // laps (a stop you can't recover the pit-loss from before the flag is
    // strictly worse than running a compound short — there's no penalty for
    // unmet compound variety). At least one of a handful of seeds must diverge.
    const base = cleanRoster();
    const wideBuffer = {
      ...CANON_VARIABLES,
      pits: { ...CANON_VARIABLES.pits, lastPitShare: 0.5 },
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

  it('setWeather leans the whole field (the C2 path): a wet race is a different race', () => {
    // No weather rolls rain in v0.5 (Wet returns in v0.6), so this is the state
    // Wet will set: a field-wide speed / consistency / crash lean.
    const base = cleanRoster();
    const dry = run(base, 0xDDD);
    const wet = run(base, 0xDDD, WET);
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
      cards: r.drivers.map(d => (d.cards ?? []).map(c => c.id)),
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

describe('in-race effects (#232b, kept through #334)', () => {
  const track = ALL_TRACKS[0];
  function cleanGrid(seed: number): RosterDriver[] {
    const rng = mulberry32(seed);
    const roster = generateRoster(rng);
    const cars = generateCarsForKingdoms(GRID_TEAM_IDS, rng);
    return createRosterWithCars(roster, cars, seed, NO_CARDS);
  }
  function run(grid: RosterDriver[], seed: number) {
    const engine = RaceEngine.createForWorker(CANON_VARIABLES, seed);
    engine.loadGeneratedRoster(structuredClone(grid));
    engine.updateConfig({ totalLaps: track.laps, lapLength: track.length });
    engine.setTrackInfo({ id: track.id, name: track.name, emoji: track.emoji, funEmoji: track.funEmoji, description: track.description, laps: track.laps });
    return { engine, result: engine.runHeadless() };
  }

  it('damage is an effect: a crash survivor carries 🔧 Damaged for the rest of the race', () => {
    for (const seed of [31, 32, 33, 34, 35, 36, 37, 38]) {
      const { engine, result } = run(cleanGrid(seed), seed);
      const survivor = result.drivers.find(d => d.isDamaged && d.status !== 'dnf');
      if (!survivor) continue;
      expect(engine.getEffectStack(survivor.id).some(e => e.source === 'effect' && e.id === 'damaged')).toBe(true);
      expect(result.events.some(e => e.type === 'effect_applied' && e.driverId === survivor.id && e.description.startsWith('Damaged'))).toBe(true);
      expect(result.events.some(e => e.type === 'effect_expired' && e.driverId === survivor.id && e.description.startsWith('Damaged'))).toBe(false);
      return;
    }
    throw new Error('no crash survivor in eight seeds');
  });

  it('a spin attaches 🌀 Spun and it wears off two laps later', () => {
    for (const seed of [41, 42, 43, 44, 45, 46, 47, 48]) {
      const { result } = run(cleanGrid(seed), seed);
      const got = result.events.find(e => e.type === 'effect_applied' && e.description.startsWith('Spun'));
      if (!got) continue;
      const gone = result.events.find(e => e.type === 'effect_expired' && e.driverId === got.driverId && e.description.startsWith('Spun') && e.tick > got.tick);
      expect(gone, 'Spun should expire').toBeDefined();
      expect((gone!.lap ?? 0) - (got.lap ?? 0)).toBeGreaterThanOrEqual(1);
      expect((gone!.lap ?? 0) - (got.lap ?? 0)).toBeLessThanOrEqual(3);
      // and the driver's final stack no longer carries it (unless they spun again late)
      return;
    }
    throw new Error('no spin in eight seeds');
  });

  it('in-race effects are deterministic and leave the race replayable', () => {
    const grid = cleanGrid(51);
    const a = run(grid, 9), b = run(grid, 9);
    expect(b.result.events).toEqual(a.result.events);
    expect(a.result.events.some(e => e.type === 'effect_applied')).toBe(true);
    expect(b.result.drivers.map(d => b.engine.getEffectStack(d.id).map(e => e.id))).toEqual(a.result.drivers.map(d => a.engine.getEffectStack(d.id).map(e => e.id)));
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

  it('at canon (#534, real F1) every classified driver stops once on two compounds, or is penalised', () => {
    let penalised = 0;
    for (const seed of [0x249, 0x24a, 0x24b]) {
      const { drivers } = run({}, seed);
      const finishers = drivers.filter(d => d.status === 'finished');
      expect(finishers.length).toBeGreaterThan(5);
      for (const d of finishers) {
        const ok = d.pitStops.length >= 1 && new Set(d.usedCompounds).size >= 2;
        if (ok) expect(d.penaltyTicks).toBe(0);
        else { penalised++; expect(d.penaltyTicks).toBeGreaterThan(0); expect(d.penaltyReason).toBeTruthy(); }
      }
    }
    // The rule is met by racing, not by penalties: nearly everyone stops and changes.
    expect(penalised).toBeLessThan(3);
  });

  it('the last planned stop stays out of the closing window (#534)', () => {
    // pit_entry logs the decision with lap = currentLap + 1, so laps left at the
    // decision = laps − lap + 1. A planned stop ("ahead of the cliff", "the rule",
    // "safety car") needs more than the window left; only the cliff may box later.
    const window = Math.max(1, Math.round(CANON_VARIABLES.pits.lastPitShare * track.laps));
    let planned = 0;
    for (const seed of [0x249, 0x24a, 0x24b, 0x24c]) {
      const { events } = run({}, seed);
      for (const e of events.filter(e => e.type === 'pit_entry')) {
        const lapsLeft = track.laps - (e.lap ?? 0) + 1;
        if (!/— cliff$/.test(e.description)) { planned++; expect(lapsLeft, `${e.description} with ${lapsLeft} laps left`).toBeGreaterThan(window); }
      }
    }
    expect(planned).toBeGreaterThan(20);
  });

  it('a penalty is time, not laps: it reorders within the lead lap', () => {
    // Tyres that never wear and no room to pit voluntarily → nobody stops,
    // everyone owes the rule; the classification must follow finishTick + penalty.
    const { drivers, raceState } = run({ minStops: 1, requireCompoundChange: false, requireAllCompounds: false, lastPitShare: 1, penaltyLapFraction: 0.5 }, 0x249,
      { soft: { ...CANON_VARIABLES.tires.soft, lifeShare: 10 }, medium: { ...CANON_VARIABLES.tires.medium, lifeShare: 10 }, hard: { ...CANON_VARIABLES.tires.hard, lifeShare: 10 } });
    const byId = new Map(drivers.map(d => [d.id, d]));
    const lead = raceState.finishOrder.map(id => byId.get(id)!).filter(d => d.status === 'finished' && d.lapsBehind === 0);
    expect(lead.some(d => d.penaltyTicks > 0)).toBe(true);
    for (let i = 1; i < lead.length; i++) {
      expect(lead[i].finishTick! + lead[i].penaltyTicks).toBeGreaterThanOrEqual(lead[i - 1].finishTick! + lead[i - 1].penaltyTicks);
    }
  });

  it('No Pit Rules: no minimum, no compound rule → no penalties; the tyres alone still make people stop', () => {
    const strict = run({});
    const loose = run({ minStops: 0, requireCompoundChange: false, requireAllCompounds: false });
    expect(loose.drivers.every(d => d.penaltyTicks === 0)).toBe(true);
    const stops = (r: typeof strict) => r.drivers.filter(d => d.status === 'finished').reduce((s, d) => s + d.pitStops.length, 0) / Math.max(1, r.drivers.filter(d => d.status === 'finished').length);
    // Since #534 the canon rule is one stop + a change, which the tyres force
    // anyway (soft lasts a third of the race), so No Pit Rules barely moves stops.
    expect(stops(loose)).toBeLessThanOrEqual(stops(strict));
    expect(stops(loose)).toBeGreaterThan(0.5);
  });

  it('tyre life is a share of the race (#534): a 2× longer race plans about the same stops', () => {
    const go = (laps: number) => {
      const engine = RaceEngine.createForWorker(CANON_VARIABLES, 7);
      engine.loadGeneratedRoster(generateGenesisRoster(7, TEAMS.slice(0, 6).map(t => t.id)));
      engine.updateConfig({ totalLaps: laps, lapLength: track.length });
      const { drivers } = engine.runHeadless(7);
      const f = drivers.filter(d => d.status === 'finished');
      return f.reduce((s, d) => s + d.pitStops.length, 0) / Math.max(1, f.length);
    };
    expect(Math.abs(go(32) - go(16))).toBeLessThan(1);
  });

  it('tyre luck (#535) is hidden, seeded and off-stream: turning it off changes races but not the replay', () => {
    const a = run({}, 0x535), b = run({}, 0x535);
    expect(b.events).toEqual(a.events);
    const noLuck = (() => {
      const engine = RaceEngine.createForWorker({ ...CANON_VARIABLES, tires: { ...CANON_VARIABLES.tires, setLifeLuck: 0 } }, 0x535);
      engine.loadGeneratedRoster(generateGenesisRoster(0x535, TEAMS.slice(0, 6).map(t => t.id)));
      engine.updateConfig({ totalLaps: track.laps, lapLength: track.length, maxStoredEvents: Number.MAX_SAFE_INTEGER });
      return engine.runHeadless(0x535);
    })();
    expect(noLuck.events).not.toEqual(a.events);
  });

  it('the track wear dial (#536) is live: a hungrier track means more stops', () => {
    const go = (tyreWear: number) => {
      let stops = 0, n = 0;
      for (const seed of [0x536, 0x537, 0x538]) {
        const engine = RaceEngine.createForWorker(CANON_VARIABLES, seed);
        engine.loadGeneratedRoster(generateGenesisRoster(seed, TEAMS.slice(0, 6).map(t => t.id)));
        engine.updateConfig({ totalLaps: track.laps, lapLength: track.length, tyreWear });
        const { drivers } = engine.runHeadless(seed);
        for (const d of drivers.filter(d => d.status === 'finished')) { stops += d.pitStops.length; n++; }
      }
      return stops / Math.max(1, n);
    };
    expect(go(1.6)).toBeGreaterThan(go(0.7));
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
    // Mostly package: at least two of the top-3 packages start in the top half
    // (qualifying has noise, so one can miss; #569 moved seed 11's cars)
    const byPace = [...drivers].sort((a, b) => pace(b) - pace(a)).slice(0, 3);
    expect(byPace.filter(d => grid.indexOf(d.id) < drivers.length / 2).length).toBeGreaterThanOrEqual(2);
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
    for (const seed of [41, 42, 43, 44, 45, 46, 47, 48, 49, 50]) {
      const { engine, raceState } = run(seed);
      const pole = engine.getGridOrder()[0];
      const pos = raceState.finishOrder.indexOf(pole);
      if (pos >= 0) { n++; if (pos < raceState.finishOrder.length / 2) topHalf++; }
    }
    expect(topHalf / n).toBeGreaterThan(0.6);
  });
});

describe('qualifying show (#495)', () => {
  it('qualifyingLaps() before the start sorts into exactly the grid the race uses, and moves nothing', () => {
    const track = ALL_TRACKS[0];
    const build = () => {
      const engine = RaceEngine.createForWorker(CANON_VARIABLES, 77);
      engine.loadGeneratedRoster(buildRoster(generateRoster(mulberry32(77)), generateCarsForKingdoms(TEAMS.slice(0, 11).map(t => t.id), mulberry32(78)), 77, defaultRuleset()));
      engine.updateConfig({ totalLaps: track.laps, lapLength: track.length });
      return engine;
    };
    const watched = build();
    const laps = watched.qualifyingLaps();
    expect(laps.length).toBeGreaterThan(10);
    expect(watched.nominalLapTicks()).toBeGreaterThan(0);
    const preview = [...laps].sort((a, b) => b.score - a.score).map(l => l.id);
    const a = watched.runHeadless();
    expect(watched.getGridOrder()).toEqual(preview);
    // Reading the laps first doesn't change the race.
    const b = build().runHeadless();
    expect(a.raceState.finishOrder).toEqual(b.raceState.finishOrder);
    expect(a.raceState.totalTicks).toBe(b.raceState.totalTicks);
  });
});

describe('acceleration doubles as one-lap pace (#496)', () => {
  const track = CURRENT_TRACKS[0];
  it('a higher Acceleration qualifies better on the same seed; the weight is a live knob', () => {
    const quali = (acc: number, weight = CANON_VARIABLES.grid.qualiAccelWeight) => {
      const engine = RaceEngine.createForWorker({ ...CANON_VARIABLES, grid: { ...CANON_VARIABLES.grid, qualiAccelWeight: weight } }, 0x496);
      const roster = generateGenesisRoster(0x496, GRID_TEAM_IDS).map((d, i) => i === 0 ? { ...d, stats: { ...d.stats, acceleration: acc } } : d);
      engine.loadGeneratedRoster(roster);
      engine.updateConfig({ totalLaps: track.laps, lapLength: track.length });
      return engine.qualifyingLaps()[0].score;
    };
    expect(quali(1.15)).toBeGreaterThan(quali(0.85));
    // ~+1% per 0.1 step at the canon weight
    expect(quali(1.1) / quali(1.0)).toBeCloseTo(1 + 0.1 * CANON_VARIABLES.grid.qualiAccelWeight, 6);
    // weight 0 → acceleration is not a one-lap stat
    expect(quali(1.15, 0)).toBeCloseTo(quali(0.85, 0), 9);
  });
});
