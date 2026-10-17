// #581: the race debrief is facts read off the race record, nothing judged.
import { describe, it, expect } from 'vitest';
import RaceEngine, { type Driver } from '../../RaceEngine';
import { prepareScheduledRace } from '../../league/settle';
import { getTrackById } from '../../generators/tracks';
import { CANON_VARIABLES } from '../../simlab/types';
import { quickDraft } from '../../season/draft';
import { leagueForRound, newSeason, poolFor } from '../../season/season';
import { defaultSetup } from '../../season/setup';
import { driverDebrief, strategyOf, winnerEdge, type DebriefInput } from './debrief';

function race(seed: number): DebriefInput {
  let facts = newSeason(defaultSetup(seed));
  facts = { ...facts, draftPicks: quickDraft(poolFor(facts)) };
  const engine = RaceEngine.createForWorker();
  prepareScheduledRace(engine, leagueForRound(facts, 0), 0, getTrackById(facts.setup.calendar[0])!, CANON_VARIABLES);
  const r = engine.runHeadless();
  return { drivers: r.drivers, samples: engine.getLapHistory(), events: r.events, grid: engine.getGridOrder(), finishOrder: r.raceState.finishOrder };
}

describe('race debrief', () => {
  const races = [11, 44, 55].map(race);

  it('grid → finish, strategy and at most three moments in lap order, for every driver', () => {
    for (const input of races) {
      const all = driverDebrief(input, input.drivers.map(d => d.id));
      expect(all).toHaveLength(input.drivers.length);
      for (const db of all) {
        const d = input.drivers.find(x => x.id === db.driverId)!;
        expect(db.grid).toBe(input.grid.indexOf(d.id) + 1);
        expect(db.finish).toBe(d.status === 'dnf' ? 0 : input.finishOrder.indexOf(d.id) + 1);
        expect(db.strategy).toBe(strategyOf(d));
        expect(db.moments.length).toBeLessThanOrEqual(3);
        expect(db.moments.map(m => m.lap)).toEqual([...db.moments.map(m => m.lap)].sort((a, b) => a - b));
        // A retirement is always in the list; a slow stop shows unless three bigger moments beat it.
        if (d.status === 'dnf') expect(db.moments.some(m => m.what === 'Retired')).toBe(true);
      }
    }
  });

  it('a slow stop reads its time against a normal stop', () => {
    const input = races.find(r => r.drivers.some(d => d.pitStops.some(p => p.wasSlowStop)))!;
    const d = input.drivers.find(x => x.pitStops.some(p => p.wasSlowStop))!;
    const m = driverDebrief(input, [d.id])[0].moments.find(x => x.what === 'Slow stop');
    expect(m?.detail).toMatch(/^\d+\.\ds slower than a normal stop$/);
  });

  it('the winner line: their grid slot, strategy and laps led', () => {
    for (const input of races) {
      const w = winnerEdge(input)!;
      expect(w.driverId).toBe(input.finishOrder[0]);
      expect(w.led).toBeGreaterThanOrEqual(1);
      expect(w.led).toBeLessThanOrEqual(w.laps);
    }
  });

  it('strategy names the stops and the tyres', () => {
    const d = { usedCompounds: ['medium'], pitStops: [{ tiresAfter: 'hard' }] } as unknown as Driver;
    expect(strategyOf(d)).toBe('one stop: medium, then hard');
    expect(strategyOf({ usedCompounds: ['soft'], pitStops: [] } as unknown as Driver)).toBe('no stops, on softs');
    expect(strategyOf({ usedCompounds: ['medium'], pitStops: [{ tiresAfter: 'hard' }, { tiresAfter: 'soft' }, { tiresAfter: 'medium' }] } as unknown as Driver)).toBe('three stops: medium, hard, soft, medium');
  });
});
