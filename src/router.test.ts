// #186: every screen has an address.
import { describe, it, expect } from 'vitest';
import { parseHash, routeHash, SEASON_SCREENS, type Route } from './router';

describe('router', () => {
  it('round-trips every route through its address', () => {
    const routes: Route[] = [
      { name: 'menu' }, { name: 'quick-race' }, { name: 'race' }, { name: 'credits' },
      { name: 'world-deck' }, { name: 'world-deck', tab: 'teams' }, { name: 'race-control', tab: 'physics' },
      ...SEASON_SCREENS.map(screen => ({ name: 'season', screen }) as Route),
    ];
    for (const r of routes) expect(parseHash(routeHash(r)), routeHash(r)).toEqual(r);
  });

  it('the bare site and "#/" are the menu', () => {
    expect(parseHash('')).toEqual({ name: 'menu' });
    expect(parseHash('#/')).toEqual({ name: 'menu' });
  });

  it('leaves non-route hashes alone (old #league=CODE links)', () => {
    expect(parseHash('#league=ABCD')).toBeNull();
    expect(parseHash('#something')).toBeNull();
  });

  it('unknown pages fall back sensibly', () => {
    expect(parseHash('#/nope')).toEqual({ name: 'menu' });
    expect(parseHash('#/league/grid')).toEqual({ name: 'menu' }); // Commissioner leagues are gone (#339)
    expect(parseHash('#/season/nope')).toEqual({ name: 'season', screen: 'setup' });
    expect(parseHash('#/world-deck/<b>')).toEqual({ name: 'world-deck', tab: undefined });
  });
});
