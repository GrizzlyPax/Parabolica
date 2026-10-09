// #606: Quick Race is a one-race Season. Same seed, same race; and the race
// it shows is the race a Season would record for those facts.
import { describe, it, expect } from 'vitest';
import RaceEngine from '../RaceEngine';
import { prepareScheduledRace } from '../league/settle';
import { CANON_VARIABLES } from '../simlab/types';
import { quickRace } from './quickRace';
import { seasonState, settleRound } from './season';

describe('Quick Race on the Season pipeline', () => {
  it('a seed builds the same one-race field every time; seeds differ', () => {
    const a = quickRace(7), b = quickRace(7);
    expect(a.league.roster).toEqual(b.league.roster);
    expect(a.track.id).toBe(b.track.id);
    expect(quickRace(8).league.roster.map(d => d.fullName)).not.toEqual(a.league.roster.map(d => d.fullName));
    expect(a.facts.setup.calendar).toHaveLength(1);
    expect(a.facts.setup.humans).toEqual([]);
    expect(seasonState(a.facts).phase).toBe('ready-for-go');
    // Two drivers per team on the grid.
    const teams = new Set(a.league.roster.map(d => d.kingdomId));
    for (const t of teams) expect(a.league.roster.filter(d => d.kingdomId === t)).toHaveLength(2);
  });

  it('the race on screen is the race the Season pipeline records', () => {
    const q = quickRace(31337);
    const engine = RaceEngine.createForWorker();
    prepareScheduledRace(engine, q.league, 0, q.track, CANON_VARIABLES);
    engine.reset();
    engine.fastForward(Infinity);
    const recorded = settleRound(q.facts).results[0];
    expect(engine.getRaceState().finishOrder).toEqual(recorded.finishOrder);
    expect(engine.getRaceState().totalTicks).toBe(recorded.totalTicks);
  });
});
