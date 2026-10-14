// #725: tier identifiers. Locals: entry numbers; State: town codes; Nationals and Quick Race: state codes.
import { describe, it, expect } from 'vitest';
import { raceBadges, townCodes } from './badges';
import { currentLeague } from '../run/run';
import { testRun } from '../run/testHelpers';
import { draftState, quickDraft } from './draft';
import { leagueForRound, poolFor, type SeasonFacts } from './season';
import { quickRace } from './quickRace';
import { US_PLACES } from '../data/states';

const byTeam = (facts: SeasonFacts, badges: Record<number, string>) =>
  Object.values(draftState(poolFor(facts), facts.draftPicks).rosters).filter(r => r.driverIds.length).map(r => r.driverIds.map(id => badges[id]));

describe('tier identifiers (#725)', () => {
  it('town codes: first three letters; a clash takes the first letter and the next two consonants', () => {
    expect(townCodes(['Toledo'])).toEqual(['TOL']);
    expect(townCodes(['Toledo', 'Tolland'])).toEqual(['TOL', 'TLL']);
    expect(townCodes(['St. Augustine'])).toEqual(['STA']);
    const many = townCodes(['Mobile', 'Montgomery', 'Monroe', 'Montrose', 'Monterey']);
    expect(new Set(many).size).toBe(5);
    for (const c of many) expect(c).toMatch(/^[A-Z]{3}$/);
  });

  it('Locals: every car an entry number 1..N, once each', () => {
    const facts = currentLeague(testRun(11));
    expect(facts.setup.league?.step).toBe('locals');
    const b = raceBadges(facts);
    const all = byTeam(facts, b).flat();
    expect(all.map(Number).sort((x, y) => x - y)).toEqual(all.map((_, i) => i + 1));
  });

  it('State: both cars of a garage share its town code; every garage its own; yours is your town', () => {
    const locals = currentLeague(testRun(11));
    const lg = locals.setup.league!;
    const setup = { ...locals.setup, league: { ...lg, step: 'state' as const, locale: { ...lg.locale!, rivalTowns: US_PLACES.find(p => p.id === lg.locale!.stateId)!.cities.filter(c => c !== lg.locale!.town).slice(0, 4) } } };
    const draft = { ...locals, setup, draftPicks: [] as SeasonFacts['draftPicks'] };
    const facts = { ...draft, draftPicks: quickDraft(poolFor(draft)) };
    const teams = byTeam(facts, raceBadges(facts));
    for (const [a, c] of teams) { expect(a).toBe(c); expect(a).toMatch(/^[A-Z]{3}$/); }
    expect(new Set(teams.map(t => t[0])).size).toBe(teams.length);
    const you = draftState(poolFor(facts), facts.draftPicks).rosters[facts.setup.humans[0].teamId].driverIds[0];
    expect(raceBadges(facts)[you]).toBe(townCodes([lg.locale!.town])[0]);
  });

  it('Quick Race wears state codes, distinct per team, on the race roster; the race is the same race', () => {
    const { facts, league } = quickRace(4242);
    const teams = byTeam(facts, raceBadges(facts));
    for (const [a, c] of teams) { expect(a).toBe(c); expect(a).toMatch(/^[A-Z]{2}$/); }
    expect(new Set(teams.map(t => t[0])).size).toBe(teams.length);
    for (const d of leagueForRound(facts, 0).roster) expect(String(d.number)).toMatch(/^[A-Z]{2}$/);
    expect(league.roster.length).toBeGreaterThan(0);
  });
});
