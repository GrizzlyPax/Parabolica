// #331: the card sheet. Yours shows every card; a rival shows metal dots only.
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CardSheet, type CardSheetData } from './CardSheet';
import { getDeckTeamById } from '../data/deckTeams';
import { CARDS_BY_ID } from './deck';

// Every state: traits on two of three holders, a filled and an empty gear slot, a locker.
const card = (id: string) => CARDS_BY_ID.get(id)!;
const SAMPLE_SHEET: CardSheetData = {
  driver: { name: 'Yuki Okafor', number: 7, traits: [card('tr-driver-gold-speed+consistency')], equipment: card('eq-silver-luck') },
  car: { name: 'Vantor GT-7', traits: [], upgrade: null },
  team: {
    ...getDeckTeamById('vantor-motorwerke')!,
    traits: [card('tr-team-bronze-pit-crew')],
    facility: card('fa-iridium-tyre-management+pit-crew'),
    locker: [card('eq-bronze-aggression'), card('up-gold-power+grip')],
  },
};

const render = (view: 'mine' | 'rival', data = SAMPLE_SHEET) => renderToStaticMarkup(createElement(CardSheet, { data, view }));
const allCards = [...SAMPLE_SHEET.driver.traits, ...SAMPLE_SHEET.car.traits, ...SAMPLE_SHEET.team.traits,
  SAMPLE_SHEET.driver.equipment, SAMPLE_SHEET.car.upgrade, SAMPLE_SHEET.team.facility, ...SAMPLE_SHEET.team.locker].filter(Boolean);

describe('CardSheet', () => {
  it('your sheet: gear and traits as cards, the locker as a face-down deck with its count', () => {
    const out = render('mine');
    const faceUp = [...SAMPLE_SHEET.driver.traits, ...SAMPLE_SHEET.car.traits, ...SAMPLE_SHEET.team.traits, SAMPLE_SHEET.driver.equipment!, SAMPLE_SHEET.team.facility!];
    for (const c of faceUp) expect(out).toContain(c.name);
    for (const c of SAMPLE_SHEET.team.locker) expect(out).not.toContain(c.name);
    expect(out).toContain('cs-deckcount">' + SAMPLE_SHEET.team.locker.length);
    for (const label of ['Gear', 'Traits', 'Effects', 'Locker']) expect(out).toContain(label);
    expect(out).toContain('#7');
  });

  it('an empty gear slot is a dashed card outline and the free count is right', () => {
    const out = render('mine');
    expect(out).toContain('Empty upgrade slot');
    expect(out).toContain('1 of 3 slots free');
    expect(out).toContain('Effects arrive in v0.6');
  });

  it('a rival sheet: gear as card backs, traits as dots, no card names', () => {
    const out = render('rival');
    for (const c of allCards) expect(out).not.toContain(c!.name);
    const traits = SAMPLE_SHEET.driver.traits.length + SAMPLE_SHEET.car.traits.length + SAMPLE_SHEET.team.traits.length;
    expect((out.match(/class="card-dot /g) ?? []).length).toBe(traits);
    expect(out).toContain('Face-down');
    expect(out).toContain('cs-deckcount');
  });

  it('a benched driver says so and keeps their gear', () => {
    const out = render('mine', { ...SAMPLE_SHEET, driver: { ...SAMPLE_SHEET.driver, benched: true } });
    expect(out).toContain('Bench');
    expect(out).toContain('keeps their gear');
    expect(out).toContain(SAMPLE_SHEET.driver.equipment!.name);
  });
});
