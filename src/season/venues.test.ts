// Tracks named by step (#750): the kind takes your town's name at Locals, a
// town in your state at State (never your own; no repeat until every town has
// raced), the landmark at Nationals and outside a run. Ids never change; the
// record says the venue you watched.
import { describe, it, expect } from 'vitest';
import { BASE_DECK_TRACKS } from '../data/deckTracks';
import { newRun, seasonFactsFor } from '../run/run';
import { settleRound, newSeason, poolFor } from './season';
import { quickDraft } from './draft';
import { LOCALS_PATTERN, STATE_PATTERN, trackForRound, venueFor } from './venues';
import { placeById } from '../data/states';

const run = newRun({ seed: 4101, stateId: 'oh', garage: { name: 'Kettle Street Garage', color: '#006EBE' } });
const locals = seasonFactsFor(run, 0);
const town = locals.setup.league!.locale!.town;

describe('venues by step (#750)', () => {
  it('every deck track is a kind with a landmark name, and every kind has a pattern per step', () => {
    for (const t of BASE_DECK_TRACKS) {
      expect(t.kind).toBeTruthy();
      expect(t.name).not.toContain('+');
      expect(LOCALS_PATTERN[t.kind]).toBeDefined();
      expect(STATE_PATTERN[t.kind]).toBeDefined();
    }
  });

  it("Locals: the kind takes your town's name", () => {
    for (let r = 0; r < locals.setup.calendar.length; r++) {
      const v = venueFor(locals, r);
      const kind = BASE_DECK_TRACKS.find(t => t.id === locals.setup.calendar[r])!.kind;
      expect(v.kind).toBe(kind);
      expect(v.name).toBe(LOCALS_PATTERN[kind](town));
      expect(v.name).toContain(town);
    }
  });

  it('State: a real town in your state, never yours, no repeat while towns remain; {State} where the pattern says so', () => {
    // A State season with the run's locale (the field is the state's garages; no human, so nothing waits on a turn).
    const stateFacts = newSeason({ ...locals.setup, humans: [], carry: undefined, league: { ...locals.setup.league!, index: 1, step: 'state', name: 'State' } });
    const place = placeById('oh')!;
    const used: string[] = [];
    for (let r = 0; r < stateFacts.setup.calendar.length; r++) {
      const v = venueFor(stateFacts, r);
      const kind = BASE_DECK_TRACKS.find(t => t.id === stateFacts.setup.calendar[r])!.kind;
      const p = STATE_PATTERN[kind];
      if (p.city) {
        const city = place.cities.find(c => c !== town && v.name === p.name(c));
        expect(city, v.name).toBeDefined();
        expect(city).not.toBe(town);
        if (used.length < place.cities.length - 1) expect(used).not.toContain(city);
        used.push(city!);
      } else {
        expect(v.name).toBe(p.name('Ohio'));
      }
    }
  });

  it('Nationals and a plain season race the landmarks; the Track carries the venue name; ids never change', () => {
    const plain = newSeason({ seed: 1, teamCount: 4, humans: [], calendar: ['speed-power', 'luck-reliability'] });
    expect(venueFor(plain, 0)).toEqual({ name: 'Bonneville Salt Flats, Utah', kind: 'Salt Flats' });
    const nationals = newSeason({ ...plain.setup, league: { index: 2, step: 'nationals', name: 'Nationals', fieldShift: 0, nemesisShift: 0, bossRound: 0, locale: { stateId: 'oh', town, rivalTowns: [] } } });
    expect(venueFor(nationals, 1).name).toBe('Atlantic City Board Speedway, New Jersey');
    const t = trackForRound(locals, 0)!;
    expect(t.id).toBe(locals.setup.calendar[0]);
    expect(t.name).toBe(venueFor(locals, 0).name);
  });

  it('the record says the venue you watched', () => {
    // The same Locals, raced by the CPU alone (no turn to wait on): the digest carries the venue's name.
    const base = newSeason({ ...locals.setup, humans: [], carry: undefined });
    const cpu = { ...base, draftPicks: quickDraft(poolFor(base)) };
    const f = settleRound(cpu);
    expect(f.results[0].trackName).toBe(venueFor(cpu, 0).name);
    expect(f.results[0].trackName).toBe(venueFor(locals, 0).name);
    expect(f.results[0].trackId).toBe(locals.setup.calendar[0]);
  });
});
