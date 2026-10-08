// #331: the card sheet. Yours shows every card; a rival shows metal dots only.
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CardSheet } from './CardSheet';
import { SAMPLE_SHEET } from './sample';

const render = (view: 'mine' | 'rival', data = SAMPLE_SHEET) => renderToStaticMarkup(createElement(CardSheet, { data, view }));
const allCards = [...SAMPLE_SHEET.driver.traits, ...SAMPLE_SHEET.car.traits, ...SAMPLE_SHEET.team.traits,
  SAMPLE_SHEET.driver.equipment, SAMPLE_SHEET.car.upgrade, SAMPLE_SHEET.team.facility, ...SAMPLE_SHEET.team.locker].filter(Boolean);

describe('CardSheet', () => {
  it('your sheet: every card by name in its metal, traits / gear / effects / locker', () => {
    const out = render('mine');
    for (const c of allCards) expect(out).toContain(c!.name.replace('&', '&amp;'));
    for (const label of ['Traits', 'Gear', 'Effects', 'Locker']) expect(out).toContain(label);
    expect(out).toContain('metal-iridium');
    expect(out).toContain('#7');
  });

  it('empty gear slots stay visible and the free count is right', () => {
    const out = render('mine');
    expect(out).toContain('Empty slot');
    expect(out).toContain('1 of 3 slots free');
    expect(out).toContain('No car trait.');
    expect(out).toContain('Effects arrive in v0.6');
  });

  it('a rival sheet shows metal dots only: no card names, one dot per card', () => {
    const out = render('rival');
    for (const c of allCards) expect(out).not.toContain(c!.name);
    expect((out.match(/class="cs-dot /g) ?? []).length).toBe(allCards.length);
    expect(out).toContain('Empty slot');
  });

  it('a benched driver says so and keeps their gear', () => {
    const out = render('mine', { ...SAMPLE_SHEET, driver: { ...SAMPLE_SHEET.driver, benched: true } });
    expect(out).toContain('Bench');
    expect(out).toContain('keeps their gear');
    expect(out).toContain(SAMPLE_SHEET.driver.equipment!.name);
  });
});
