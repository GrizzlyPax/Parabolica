// #418: CardFace, the one way a deck card is drawn (docs/ICONS.md → Cards).
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CardFace, CardDot, EmptySlot, cardNumber, nameSize, cardHeight, CARD_BOX } from './CardFace';
import { CARDS_BY_ID, MOTORSPORT_DECK } from './deck';

const card = (id: string) => CARDS_BY_ID.get(id)!;
const html = (props: Parameters<typeof CardFace>[0]) => renderToStaticMarkup(createElement(CardFace, props));

describe('CardFace', () => {
  it('the face: name banner, one icon, type tag, every change, the number; no metal word or holder', () => {
    const out = html({ card: card('eq-gold-speed+consistency'), size: 'full' });
    expect(out).toContain('Gold Speed + Consistency');
    // #526: the type tag is the kind's icon (cog = gear), the word only in its title.
    expect(out).toContain('aria-label="Gear"');
    expect(out).not.toMatch(/>Equipment</);
    expect(out).toContain('<b>+2</b> Speed'); // #623: levels (10 grade points = +2)
    expect(out).toContain('Speed');
    expect(out).toContain('Consistency');
    expect(out).toContain('013');
    expect(out).toContain('metal-gold');
    expect((out.match(/class="game-icon/g) ?? []).length).toBe(3); // the art + the kind icon + the back's flag
    expect(out).not.toMatch(/>gold</i);
    expect(out).not.toMatch(/>(Driver|Car|Team)</);
  });

  it('#526: a trait reads as a trait (DNA icon, dashed frame class); gear as gear', () => {
    const trait = MOTORSPORT_DECK.find(c => c.kind === 'trait')!;
    const t = html({ card: trait, size: 'full' });
    expect(t).toContain('cf-trait');
    expect(t).toContain('aria-label="Trait"');
    expect(html({ card: card('eq-gold-speed+consistency'), size: 'full' })).toContain('cf-gear');
    expect(html({ card: trait, faceDown: true })).not.toContain('cf-trait'); // the back hides the kind
  });

  it('the back says PARABOLICA · Base deck and hides nothing', () => {
    const out = html({ card: card('fa-iridium-tyre-management+pit-crew'), faceDown: true });
    expect(out).toContain('PARABOLICA');
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
