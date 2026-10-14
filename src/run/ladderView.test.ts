// #628, #696: the ladder screen's view of a run: three rungs with their
// titles, the step in play open, a won rung wearing its title, your state
// and town for the theme.
import { describe, it, expect } from 'vitest';
import { currentLeague, withCurrentLeague, runState, promote, townOf, type RunFacts } from './run';
import { emptyMeta, grant } from './meta';
import { ladderView } from './ladderView';
import { seasonState, setLineup, settleRound, poolFor } from '../season/season';
import { draftState } from '../season/draft';
import { openParcelQuick } from '../season/testHelpers';
import { testRun } from './testHelpers';

function playLeague(run: RunFacts): RunFacts {
  let facts = currentLeague(run);
  while (seasonState(facts).phase !== 'finished') {
    const state = seasonState(facts);
    if (state.phase === 'paddock') {
      const roster = draftState(poolFor(facts), facts.draftPicks).rosters[state.whoseTurn!];
      facts = openParcelQuick(setLineup(facts, { round: state.round, teamId: state.whoseTurn!, driverIds: [roster.driverIds[0], roster.driverIds[1]] }));
    } else facts = settleRound(facts);
  }
  return withCurrentLeague(run, facts);
}
function findRun(phase: 'league-won' | 'run-lost'): RunFacts {
  for (let seed = 11; seed < 400; seed++) {
    const run = playLeague(testRun(seed, 'vt'));
    if (runState(run).phase === phase) return run;
  }
  throw new Error(`no ${phase} seed`);
}

describe('the ladder view (#628, #696)', () => {
  it('a fresh run: Locals open with no races run, State ahead, Nationals ahead and later; your state and town; every unlock listed', () => {
    const run = testRun(7, 'oh');
    const v = ladderView(run, grant(emptyMeta(), 'next-difficulty'));
    expect(v.rungs.map(r => [r.name, r.status, r.title])).toEqual([['Locals', 'current', `Ace ${townOf(run)}`], ['State', 'ahead', 'Ace Ohio'], ['Nationals', 'ahead', 'Ace America']]);
    expect(v.rungs[2].later).toBe(true);
    expect(v.rungs[0].races).toEqual({ done: 0, total: 5 });
    expect(v.rungs[0].you?.team.name).toBe('Kettle Street Garage');
    expect(v.rungs[0].rival?.nemesis).toBe(false);
    expect(v).toMatchObject({ stateId: 'oh', town: townOf(run), titles: [] });
    expect(v.unlocks).toHaveLength(5);
    expect(v.unlocks.filter(u => u.got).map(u => u.id)).toEqual(['next-difficulty']);
  });

  it('won and promoted: Locals wears its title, State is open with six races', () => {
    const won = findRun('league-won');
    const v = ladderView(promote(won), emptyMeta());
    expect(v.rungs[0]).toMatchObject({ status: 'won', memory: `Ace ${townOf(won)}: yours.` });
    expect(v.titles).toMatchObject([{ step: 'locals', name: `Ace ${townOf(won)}` }]);
    expect(v.rungs[1].status).toBe('current');
    expect(v.rungs[1].races).toEqual({ done: 0, total: 6 });
    expect(v.rungs[1].rival?.team.name).toBeTruthy();
  });

  it('lost: the rung says where you finished and that the run ended', () => {
    const v = ladderView(findRun('run-lost'), emptyMeta());
    expect(v.phase).toBe('run-lost');
    expect(v.rungs[0].status).toBe('lost');
    expect(v.rungs[0].memory).toMatch(/^Finished \d+(st|nd|rd|th) with \d+ pts\. The run ended here\.$/);
  });
});
