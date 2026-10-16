// #418: CardFace, the one way a deck card is drawn (docs/ICONS.md → Cards).
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CardFace, CardDot, EmptySlot, cardNumber, nameSize, cardHeight, CARD_BOX, artIcon, INK_RACES, WHERE_ICON } from './CardFace';
import { RUN_DECK } from './runDeck';
import { GEAR_LIFE } from '../season/stamps';
import { resolveIcon } from '../icons/registry';
import { CARDS_BY_ID, MOTORSPORT_DECK } from './deck';

const card = (id: string) => CARDS_BY_ID.get(id)!;
const html = (props: Parameters<typeof CardFace>[0]) => renderToStaticMarkup(createElement(CardFace, props));

describe('CardFace', () => {
  it('the face (card-names.md, #699): the corner badge, where it applies, name banner, the art, every change, the number; no metal word', () => {
    const out = html({ card: card('eq-gold-speed+consistency'), size: 'full' });
    expect(out).toContain('Gold Speed + Consistency');
    // Ink: the races left in the corner (new = 3); where it applies: a driver's helmet, the word only in its title.
    expect(out).toMatch(/class="cf-corner cf-corner-ink"[^>]*>3</);
    expect(out).toContain('cf-where');
    expect(out).not.toMatch(/>Equipment</);
    expect(out).toContain('<b>+2</b> Speed'); // #623: levels (10 grade points = +2)
    expect(out).toContain('Consistency');
    expect(out).toContain('013');
    expect(out).toContain('metal-gold');
    expect((out.match(/class="game-icon/g) ?? []).length).toBe(3); // the where mark + the art + the back's flag
    expect(out).not.toMatch(/>gold</i);
    expect(out).not.toMatch(/>(Driver|Car|Team)</);
    expect(html({ card: card('eq-gold-speed+consistency'), size: 'full', left: 1 })).toMatch(/cf-corner-ink"[^>]*>1</);
  });

  it('#526 / #699: a Seal reads as a Seal (the DNA mark in the corner, dashed frame); Ink as Ink; a stamp wears its own icon', () => {
    const trait = MOTORSPORT_DECK.find(c => c.kind === 'trait')!;
    const t = html({ card: trait, size: 'full' });
    expect(t).toContain('cf-trait');
    expect(t).toContain('cf-corner-seal');
    expect(t).toContain('aria-label="Seal"');
    expect(html({ card: card('eq-gold-speed+consistency'), size: 'full' })).toContain('cf-gear');
    expect(html({ card: trait, faceDown: true })).not.toContain('cf-trait'); // the back hides the kind
    const boots = RUN_DECK.find(c => c.id === 'rd-fresh-gloves')!;
    expect(boots.name).toBe('Thin-Sole Boots');
    expect(artIcon(boots)).toBe('leather-boot');
    expect(INK_RACES).toBe(GEAR_LIFE);
    for (const c of RUN_DECK) expect(resolveIcon(artIcon(c)), c.id).toBeDefined();
    for (const w of Object.values(WHERE_ICON)) expect(resolveIcon(w), w).toBeDefined();
  });

  it('the back says ACE AMERICA · Base deck and hides nothing', () => {
    const out = html({ card: card('fa-iridium-tyre-management+pit-crew'), faceDown: true });
    expect(out).toContain('ACE AMERICA');
    expect(out).toContain('Base deck');
    expect(out).not.toContain('Tyre Management');
    expect(out).toContain('metal-iridium');
    expect(out).toContain('cf-flipped');
  });

  it('one card, scaled: every size is the 210 × 294 card scaled to its width', () => {
    for (const [size, w] of [['full', 210], ['small', 108], ['mini', 40]] as const) {
      const out = html({ card: card('eq-bronze-luck'), size });
      expect(out).toContain(`width:${w}px`);
      expect(out).toContain(`height:${cardHeight(size)}px`);
      expect(out).toContain(`width:${CARD_BOX.w}px;height:${CARD_BOX.h}px;transform:scale(${w / CARD_BOX.w})`);
    }
  });

  it('the mini is one centred icon, no name', () => {
    const out = html({ card: card('eq-gold-speed+consistency'), size: 'mini' });
    expect(out).toContain('cf-miniface');
    expect(out).not.toContain('cf-banner');
  });

  it('effects show their direction and no metal', () => {
    const out = html({ card: card('ef-speed-down'), size: 'full' });
    expect(out).toContain('▼ down');
    expect(out).toContain('metal-none');
  });

  it('your card is a button (the fidget flip); a face-down card is not', () => {
    expect(html({ card: card('eq-bronze-luck') })).toContain('role="button"');
    expect(html({ card: card('eq-bronze-luck'), faceDown: true })).not.toContain('role="button"');
  });

  it('numbers follow the deck order; long names get smaller', () => {
    expect(cardNumber(MOTORSPORT_DECK[0])).toBe('001');
    expect(cardNumber(MOTORSPORT_DECK[93])).toBe('094');
    expect(nameSize('Bronze Luck')).toBeGreaterThan(nameSize('Iridium Tyre Management + Pit Crew'));
  });

  it('dots and empty slots', () => {
    expect(renderToStaticMarkup(createElement(CardDot, { card: card('tr-driver-silver-luck') }))).toContain('metal-silver');
    expect(renderToStaticMarkup(createElement(EmptySlot, { label: 'Empty upgrade slot' }))).toContain('Empty upgrade slot');
  });
});
