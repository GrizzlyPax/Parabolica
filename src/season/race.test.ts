// #322: the season race view plays the round live (or fast-forwards it on
// Skip); the round is recorded by settleRound. They must be the same race.
import { describe, it, expect } from 'vitest';
import RaceEngine from '../RaceEngine';
import { prepareScheduledRace } from '../league/settle';
import { getTrackById } from '../generators/tracks';
import { CANON_VARIABLES } from '../simlab/types';
import { draftState, quickDraft } from './draft';
import { leagueForRound, newSeason, poolFor, seasonState, setLineup, settleRound } from './season';
import { defaultSetup } from './setup';
import { openPack } from './testHelpers';

describe('Season race: Skip shows the race that gets recorded', () => {
  it('reset → fastForward to the finish matches settleRound, round after round', () => {
    let facts = newSeason(defaultSetup(31337));
    facts = { ...facts, draftPicks: quickDraft(poolFor(facts)) };
    for (let r = 0; r < 2; r++) {
      const human = seasonState(facts).whoseTurn!;
      const roster = draftState(poolFor(facts), facts.draftPicks).rosters[human];
      facts = openPack(setLineup(facts, { round: r, teamId: human, driverIds: [roster.driverIds[1], roster.driverIds[0]] }));
      const state = seasonState(facts);
      expect(state.phase).toBe('ready-for-go');
      const engine = RaceEngine.createForWorker();
      prepareScheduledRace(engine, leagueForRound(facts, state.round), state.round, getTrackById(facts.setup.calendar[state.round])!, CANON_VARIABLES);
      engine.reset();
      engine.fastForward(Infinity);
      facts = settleRound(facts);
      const settled = facts.results[r];
      expect(engine.getRaceState().finishOrder).toEqual(settled.finishOrder);
      expect(engine.getRaceState().totalTicks).toBe(settled.totalTicks);
      // Both drivers race (#585: no bench).
      for (const id of roster.driverIds) expect([...settled.finishOrder, ...settled.dnfDriverIds]).toContain(id);
    }
  });
});
