// #661: the rookie pick reads the decided spec in levels, and Start waits
// for two rookies and a car setup.
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import RookiePick from './RookiePick';
import { SETUPS, rookieCard, setupView, type Archetype, type RookieOffer } from '../rookieView';
import { ARCHETYPE_INFO, ROOKIE_GRADE } from '../rookies';

const flat = (a: Archetype, id: number): RookieOffer => {
  const points: RookieOffer['points'] = { baseSpeed: 25, consistency: 25, luck: 25, acceleration: 25, endurance: 25, aggression: 25 };
  for (const [s, p] of Object.entries(ARCHETYPE_INFO[a].nudge)) points[s as keyof typeof points] = ROOKIE_GRADE + p!;
  return { id, name: `Rookie ${id}`, archetype: a, points, flavour: 'Has never once lifted.' };
};
const OFFER: RookieOffer[] = (['qualifier', 'brawler', 'tyre-saver', 'glass-cannon', 'qualifier', 'brawler'] as Archetype[]).map(flat);
const noop = () => {};

describe('rookie pick (#661)', () => {
  it('archetype leans read as the report\'s levels', () => {
    expect(rookieCard(OFFER[0]).lean).toEqual([{ stat: 'acceleration', level: 7 }, { stat: 'consistency', level: 8 }]);
    expect(rookieCard(OFFER[1]).lean).toEqual([{ stat: 'aggression', level: 7 }, { stat: 'luck', level: 8 }]);
    expect(rookieCard(OFFER[2]).lean).toEqual([{ stat: 'endurance', level: 9 }, { stat: 'consistency', level: 8 }]);
    expect(rookieCard(OFFER[3]).lean).toEqual([{ stat: 'baseSpeed', level: 8 }, { stat: 'aggression', level: 7 }, { stat: 'consistency', level: 3 }]);
    expect(rookieCard(OFFER[0]).others).toEqual({ min: 5, max: 5 });
  });

  it('car setups: Power 7, Grip 9, Reliability 9 on a level-5 car', () => {
    expect(SETUPS.map(s => setupView(s.id))).toEqual([
      { stat: 'power', level: 7, others: 5 }, { stat: 'grip', level: 9, others: 5 }, { stat: 'reliability', level: 9, others: 5 },
    ]);
  });

  it('Start waits for two rookies and a setup; a third rookie is locked; the re-roll runs out', () => {
    const render = (picked: number[], setup: 'twisty' | null, rerolls: number) => renderToStaticMarkup(createElement(RookiePick, {
      league: 'Juniors', offer: OFFER, picked, rerollsLeft: rerolls, setup, onToggle: noop, onReroll: noop, onSetup: noop, onStart: noop,
    }));
    const none = render([], null, 1);
    expect(none).toContain('Pick 2 of 6 · 1 re-roll left');
    expect(none).toContain('Pick 2 more');
    const two = render([0, 2], null, 1);
    expect(two).toContain('Pick a car setup');
    expect((two.match(/disabled=""/g) ?? []).length).toBe(5); // 4 locked rookies + Start
    const ready = render([0, 2], 'twisty', 0);
    expect(ready).toContain('Start the run →');
    expect(ready).toContain('0 re-rolls left');
    expect(ready).toMatch(/<button type="button" class="rs-btn rs-btn-ghost" disabled="">Re-roll rookies/);
  });
});
