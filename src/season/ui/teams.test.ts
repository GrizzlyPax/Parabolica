// #778 (Pax, Oct 17): no garage names after Locals. A garage is named by the
// title of its place: its name at Locals, Ace <town> at State, Ace <state> at
// Nationals; the ribbon says which. Rivals' places follow the badges' seats.
import { describe, it, expect } from 'vitest';
import { garageLabels, teamNameLabels, teamsOf } from './teams';
import { testRun } from '../../run/testHelpers';
import { currentLeague, promote, runState, townOf, withCurrentLeague, type RunFacts } from '../../run/run';
import { draftState } from '../draft';
import { poolFor, type SeasonFacts } from '../season';
import { placeById } from '../../data/states';

/** Every race won, scripted: your pair first, then the rest. */
function won(run: RunFacts): RunFacts {
  const f = currentLeague(run);
  const mine = draftState(poolFor(f), f.draftPicks).rosters[f.setup.humans[0].teamId].driverIds;
  const others = poolFor(f).drivers.map(d => d.id).filter(id => !mine.includes(id));
  const results = f.setup.calendar.map((trackId, index) => ({ index, trackId, trackName: 't', trackEmoji: '', finishOrder: [...mine, ...others], dnfDriverIds: [], fastestLapDriverId: null, totalTicks: 1000, highlights: [] })) as unknown as SeasonFacts['results'];
  const next = withCurrentLeague(run, { ...f, results });
  expect(runState(next).phase).toBe('league-won');
  return next;
}

describe('garage names after Locals (#778)', () => {
  const run = testRun(21, 'oh');
  const you = currentLeague(run).setup.humans[0].teamId;

  it('Locals: every garage by its name, no ribbon', () => {
    const labels = garageLabels(currentLeague(run));
    expect(labels[you]).toEqual({ name: 'Kettle Street Garage' });
    for (const t of Object.values(teamsOf(currentLeague(run)))) expect(labels[t.id]).toEqual({ name: t.name });
  });

  it('State: the title of each town, a Locals ribbon; yours is your town', () => {
    const state = promote(won(run));
    const facts = currentLeague(state);
    const labels = garageLabels(facts);
    expect(labels[you]).toEqual({ name: `Ace ${townOf(run)}`, ribbon: { step: 'locals' } });
    const rivals = Object.values(teamsOf(facts)).filter(t => t.id !== you);
    expect(rivals.length).toBeGreaterThan(0);
    for (const t of rivals) expect(labels[t.id]).toEqual({ name: `Ace ${t.town}`, ribbon: { step: 'locals' } });
    expect(new Set(Object.values(labels).map(l => l.name)).size).toBe(Object.keys(labels).length);
    // The race view's map: the data name the engine carries → the label.
    expect(teamNameLabels(facts)['Kettle Street Garage']).toBe(`Ace ${townOf(run)}`);
  });

  it('Nationals: the title of each state, a State ribbon in that state; yours is Ohio', () => {
    const nationals = promote(won(promote(won(run))));
    const facts = currentLeague(nationals);
    const labels = garageLabels(facts);
    expect(labels[you]).toEqual({ name: 'Ace Ohio', ribbon: { step: 'state', stateId: 'oh' } });
    const seats = facts.setup.league!.locale!.rivals!;
    const rivals = Object.values(labels).filter((_, i) => Object.keys(labels)[i] !== you);
    expect(rivals).toHaveLength(seats.length);
    for (const l of rivals) {
      expect(l.ribbon?.step).toBe('state');
      expect(l.name).toBe(`Ace ${placeById(l.ribbon!.stateId!)!.name}`);
    }
    expect(new Set(rivals.map(l => l.ribbon!.stateId)).size).toBe(seats.length);
    expect(rivals.some(l => l.ribbon!.stateId === 'oh')).toBe(false);
  });
});
