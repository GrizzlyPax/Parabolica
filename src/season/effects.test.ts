// #332: timed effects. A race timer is live for its rounds and gone after;
// a lap timer moves a driver's stats for its laps inside the race and no
// longer; both replay exactly; live effects carry up a run with their races
// left intact.
import { describe, it, expect } from 'vitest';
import RaceEngine from '../RaceEngine';
import { prepareScheduledRace } from '../league/settle';
import { getTrackById } from '../generators/tracks';
import { CANON_VARIABLES } from '../simlab/types';
import { draftState, quickDraft } from './draft';
import { leagueForRound, newSeason, poolFor, seasonState, setLineup, settleRound, type SeasonFacts } from './season';
import { defaultSetup } from './setup';
import { openPack } from './testHelpers';
import { activeEffects, addEffect, carriedEffects, describeLeft, rawDeltas, roundEffects, validateEffect, type EffectFact } from './effects';

function ready(seed: number): SeasonFacts {
  let facts = newSeason({ ...defaultSetup(seed), calendar: defaultSetup(seed).calendar.slice(0, 3) });
  facts = { ...facts, draftPicks: quickDraft(poolFor(facts)) };
  const human = seasonState(facts).whoseTurn!;
  const roster = draftState(poolFor(facts), facts.draftPicks).rosters[human];
  facts = openPack(setLineup(facts, { round: 0, teamId: human, driverIds: [roster.driverIds[0], roster.driverIds[1]] }));
  return facts;
}
const you = (f: SeasonFacts) => f.setup.humans[0].teamId;
const mine = (f: SeasonFacts) => draftState(poolFor(f), f.draftPicks).rosters[you(f)].driverIds;

describe('race timers', () => {
  it('a curse on the car hits both drivers for its rounds, then is gone; the rest of the grid is untouched', () => {
    const base = ready(41);
    const curse: EffectFact = { type: 'effect', round: 0, teamId: you(base), id: 'curse-grip', name: 'Soft tyres', emoji: '🫠', source: 'curse', target: { kind: 'car' }, stats: [{ stat: 'grip', pct: -10 }], timer: { races: 2 } };
    const facts = addEffect(base, curse);
    expect(activeEffects(facts, you(facts), 0).map(e => e.left)).toEqual([2]);
    expect(activeEffects(facts, you(facts), 1).map(e => e.left)).toEqual([1]);
    expect(activeEffects(facts, you(facts), 2)).toEqual([]);
    expect(describeLeft(activeEffects(facts, you(facts), 1)[0])).toBe('1 race left');
    const [a, b] = mine(facts);
    const plain = leagueForRound(base, 0).roster, cursed = leagueForRound(facts, 0).roster;
    for (const id of [a, b]) {
      const p = plain.find(d => d.id === id)!, c = cursed.find(d => d.id === id)!;
      expect(c.carStats!.grip).toBeCloseTo(p.carStats!.grip - 0.4, 10); // −10 grade = −0.4★
      expect(c.carStats!.power).toBe(p.carStats!.power);
      expect(c.stats).toEqual(p.stats);
      expect(c.effects).toEqual([{ id: 'curse-grip', name: 'Soft tyres', emoji: '🫠', source: 'curse', left: '2 races left' }]);
    }
    for (const d of plain) if (d.kingdomId !== you(facts)) expect(cursed.find(x => x.id === d.id)).toEqual(d);
    // Round 2: back to normal.
    expect(roundEffects(facts, 2)).toEqual({ points: {}, laps: {}, infos: {} });
    // A driver effect reaches one driver only.
    const boost = addEffect(base, { ...curse, id: 'gear-speed', source: 'gear', target: { kind: 'driver', id: a }, stats: [{ stat: 'baseSpeed', pct: 20 }], timer: { races: 3 } });
    const grid = leagueForRound(boost, 0).roster;
    expect(grid.find(d => d.id === a)!.stats.baseSpeed).toBeCloseTo(plain.find(d => d.id === a)!.stats.baseSpeed + 0.06, 10);
    expect(grid.find(d => d.id === b)!.stats).toEqual(plain.find(d => d.id === b)!.stats);
  });

  it('changes the race, replays exactly, and settles the same race the live view shows', () => {
    const base = ready(42);
    const facts = addEffect(base, { type: 'effect', round: 0, teamId: you(base), id: 'fx', name: 'Fired up', emoji: '🔥', source: 'event', target: { kind: 'team' }, stats: [{ stat: 'baseSpeed', pct: 30 }, { stat: 'pitCrew', pct: 20 }], timer: { races: 1 } });
    const a = settleRound(facts), b = settleRound(facts);
    expect(b.results[0]).toEqual(a.results[0]);
    expect(a.results[0].finishOrder).not.toEqual(settleRound(base).results[0].finishOrder);
    const engine = RaceEngine.createForWorker();
    prepareScheduledRace(engine, leagueForRound(facts, 0), 0, getTrackById(facts.setup.calendar[0])!, CANON_VARIABLES);
    engine.reset(); engine.fastForward(Infinity);
    expect(engine.getRaceState().finishOrder).toEqual(a.results[0].finishOrder);
  });

  it('refuses a bad effect', () => {
    const base = ready(43);
    const ok: EffectFact = { type: 'effect', round: 0, teamId: you(base), id: 'x', name: 'x', emoji: 'x', source: 'event', target: { kind: 'team' }, stats: [{ stat: 'luck', pct: 5 }], timer: { races: 1 } };
    expect(validateEffect(base, ok)).toBeNull();
    expect(validateEffect(base, { ...ok, teamId: 'nope' })).toMatch(/unknown team/);
    expect(validateEffect(base, { ...ok, target: { kind: 'driver', id: 9999 } })).toMatch(/not on/);
    expect(validateEffect(base, { ...ok, stats: [] })).toMatch(/at least one stat/);
    expect(validateEffect(base, { ...ok, timer: { races: 0 } })).toMatch(/at least 1/);
    expect(validateEffect(addEffect(base, ok), ok)).toMatch(/already/);
    expect(() => addEffect(base, { ...ok, stats: [] })).toThrow();
  });
});

describe('lap timers', () => {
  it('moves the stats for its laps only, logs it, replays, and reset restores the base', () => {
    const base = ready(44);
    const [a] = mine(base);
    const facts = addEffect(base, { type: 'effect', round: 0, teamId: you(base), id: 'spurt', name: 'Spurt', emoji: '⚡', source: 'event', target: { kind: 'driver', id: a }, stats: [{ stat: 'baseSpeed', pct: 50 }, { stat: 'grip', pct: 25 }], timer: { laps: 3, fromLap: 2 } });
    expect(rawDeltas([{ stat: 'baseSpeed', pct: 50 }, { stat: 'grip', pct: 25 }])).toEqual({ driver: { baseSpeed: 0.15 }, car: { grip: 1 }, team: {} });
    const roster = leagueForRound(facts, 0).roster;
    const me = roster.find(d => d.id === a)!;
    expect(me.lapEffects).toEqual([{ id: 'spurt', name: 'Spurt', emoji: '⚡', fromLap: 2, laps: 3, driver: { baseSpeed: 0.15 }, car: { grip: 1 }, team: {} }]);
    expect(me.effects![0].left).toBe('3 laps');
    // Race-timed stats are untouched by a lap effect before it starts.
    expect(me.stats).toEqual(leagueForRound(base, 0).roster.find(d => d.id === a)!.stats);

    const engine = RaceEngine.createForWorker();
    prepareScheduledRace(engine, leagueForRound(facts, 0), 0, getTrackById(facts.setup.calendar[0])!, CANON_VARIABLES);
    engine.reset();
    const d = () => engine.getDrivers().find(x => x.id === a)!;
    const base0 = { ...d().stats }, grip0 = d().carStats!.grip;
    let seen: Record<number, [number, number]> = {};
    for (let guard = 0; guard < 20000 && d().status === 'racing' && d().currentLap < 7; guard++) {
      engine.fastForward(engine.getRaceState().totalTicks + 1); // one more tick (fastForward runs to a total)
      seen[d().currentLap] = [d().stats.baseSpeed, d().carStats!.grip];
    }
    expect(seen[1]).toEqual([base0.baseSpeed, grip0]);
    for (const lap of [2, 3, 4]) if (seen[lap]) { expect(seen[lap][0]).toBeCloseTo(base0.baseSpeed + 0.15, 10); expect(seen[lap][1]).toBeCloseTo(grip0 + 1, 10); }
    if (seen[5]) expect(seen[5]).toEqual([base0.baseSpeed, grip0]);
    const events = engine.getFullEvents().filter(e => e.driverId === a && (e.type === 'effect_applied' || e.type === 'effect_expired') && /Spurt/.test(e.description));
    // Applied at lap 2; expired at lap 5 unless the driver's race ended first.
    expect(events.map(e => e.type)).toEqual(d().currentLap >= 5 ? ['effect_applied', 'effect_expired'] : ['effect_applied']);
    // reset: the base again
    engine.reset();
    expect(d().stats).toEqual(base0);
    expect(d().carStats!.grip).toBe(grip0);
    // and the recorded race is the live one (a fresh prepare: reset() keeps the seed stream where the stepping left it)
    prepareScheduledRace(engine, leagueForRound(facts, 0), 0, getTrackById(facts.setup.calendar[0])!, CANON_VARIABLES);
    engine.reset();
    engine.fastForward(Infinity);
    expect(settleRound(facts).results[0].finishOrder).toEqual(engine.getRaceState().finishOrder);
    expect(settleRound(facts).results[0].finishOrder).not.toEqual(settleRound(base).results[0].finishOrder);
    seen = {};
  });
});

describe('carrying up a run', () => {
  it('a live effect keeps its races left; a spent one and a lap effect do not carry', () => {
    const base = ready(45); // 3 rounds
    let facts = addEffect(base, { type: 'effect', round: 1, teamId: you(base), id: 'long', name: 'L', emoji: 'L', source: 'gear', target: { kind: 'team' }, stats: [{ stat: 'pitCrew', pct: 10 }], timer: { races: 4 } });
    facts = addEffect(facts, { type: 'effect', round: 0, teamId: you(base), id: 'short', name: 'S', emoji: 'S', source: 'curse', target: { kind: 'car' }, stats: [{ stat: 'grip', pct: -10 }], timer: { races: 2 } });
    facts = addEffect(facts, { type: 'effect', round: 2, teamId: you(base), id: 'laps', name: 'P', emoji: 'P', source: 'event', target: { kind: 'team' }, stats: [{ stat: 'luck', pct: 10 }], timer: { laps: 2 } });
    const carried = carriedEffects(facts, you(facts));
    expect(carried.map(e => e.id)).toEqual(['long']);
    // dealt round 1 of 3 with 4 races: rounds 1 and 2 used, 2 left → re-dated to start at −2 (live at 0 and 1)
    expect(carried[0].round).toBe(-2);
    const next: SeasonFacts = { ...base, effectFacts: [], setup: { ...base.setup, carry: { teamId: you(base), drivers: [], car: poolFor(base).cars[0], team: poolFor(base).teams[0], cards: { drivers: {}, car: { traits: [], upgrade: [] }, team: { traits: [], facility: [] }, locker: [] }, effects: carried } } };
    expect(activeEffects(next, you(base), 0).map(e => [e.id, e.left])).toEqual([['long', 2]]);
    expect(activeEffects(next, you(base), 1).map(e => [e.id, e.left])).toEqual([['long', 1]]);
    expect(activeEffects(next, you(base), 2)).toEqual([]);
  });
});
