// #628: the ladder screen's view of a run: the league in play is open, a won
// league remembers its runner-up, and from league 2 you face the nemesis.
import { describe, it, expect } from 'vitest';
import { newRun, currentLeague, withCurrentLeague, runState, promote, runnerUp, type RunFacts } from './run';
import { emptyMeta, grant } from './meta';
import { ladderView } from './ladderView';
import { seasonState, setLineup, settleRound, poolFor } from '../season/season';
import { draftState } from '../season/draft';
import { openPack } from '../season/testHelpers';
import { rookieRun, TEST_TEAM } from './testHelpers';

const TEAMS = 5, RACES = 2;
const runFor = (seed: number): RunFacts => rookieRun(seed, TEAMS, RACES);
function playLeague(run: RunFacts): RunFacts {
  let facts = currentLeague(run);
  while (seasonState(facts).phase !== 'finished') {
    const state = seasonState(facts);
    if (state.phase === 'paddock') {
      const roster = draftState(poolFor(facts), facts.draftPicks).rosters[state.whoseTurn!];
      facts = openPack(setLineup(facts, { round: state.round, teamId: state.whoseTurn!, driverIds: [roster.driverIds[0], roster.driverIds[1]] }));
    } else facts = settleRound(facts);
  }
  return withCurrentLeague(run, facts);
}
function findRun(phase: 'league-won' | 'run-lost'): RunFacts {
  for (let seed = 11; seed < 200; seed++) {
    const run = playLeague(runFor(seed));
    if (runState(run).phase === phase) return run;
  }
  throw new Error(`no ${phase} seed`);
}

describe('league ladder view (#628)', () => {
  it('a fresh run: Juniors open with no races run, the rest ahead, every unlock listed', () => {
    const v = ladderView(runFor(7), grant(emptyMeta(), 'next-difficulty'));
    expect(v.rungs.map(r => [r.name, r.status])).toEqual([['Juniors', 'current'], ['Regional', 'ahead'], ['National', 'ahead'], ['Top flight', 'ahead']]);
    expect(v.rungs[0].races).toEqual({ done: 0, total: RACES });
    expect(v.rungs[0].you?.team.name).toBe('Kitty Hut');
    // The Juniors' rival is their real nemesis (#660).
    expect(v.rungs[0].rival?.nemesis).toBe(true);
    // Before the rookie pick the Juniors are open but empty.
    const fresh = ladderView(newRun({ seed: 7, teamCount: TEAMS, races: RACES, team: TEST_TEAM }), emptyMeta());
    expect(fresh.phase).toBe('start');
    expect(fresh.rungs[0]).toEqual({ index: 0, name: 'Juniors', status: 'current' });
    expect(v.unlocks).toHaveLength(5);
    expect(v.unlocks.filter(u => u.got).map(u => u.id)).toEqual(['next-difficulty']);
  });

  it('won and promoted: Juniors remembers its runner-up, who is the nemesis in Regional', () => {
    const won = findRun('league-won');
    const up = runnerUp(currentLeague(won))!;
    const v = ladderView(promote(won), emptyMeta());
    expect(v.rungs[0]).toMatchObject({ status: 'won', memory: `${up.name} were runners-up and came up with you.` });
    expect(v.rungs[1].status).toBe('current');
    expect(v.rungs[1].rival).toMatchObject({ nemesis: true, team: { name: up.name } });
    expect(v.rungs[1].races).toEqual({ done: 0, total: RACES });
  });

  it('lost: the rung says where you finished and that the run ended', () => {
    const v = ladderView(findRun('run-lost'), emptyMeta());
    expect(v.phase).toBe('run-lost');
    expect(v.rungs[0].status).toBe('lost');
    expect(v.rungs[0].memory).toMatch(/^Finished \d+(st|nd|rd|th) with \d+ pts\. The run ended here\.$/);
  });
});
