// #675: wild cards have no stat line; their face, readout and chip say their rule.
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { rankUpCard, WILD_CARDS, HOME_HERO_LEVELS } from '../season/xp';
import { CardFace } from './CardFace';
import { CardChip } from './CardChip';
import { cardReadout } from './CardMarks';

describe('wild-card faces (#675)', () => {
  it('every wild card carries its rule; the face shows it as a rule (full and small), the readout and chip tooltip too', () => {
    for (const [id, w] of Object.entries(WILD_CARDS)) {
      const card = rankUpCard(`wild-${id}`);
      expect(card.stats).toEqual([]);
      expect(card.rule).toBe(w.blurb);
      expect(cardReadout(card)).toBe(w.blurb);
      for (const size of ['full', 'small'] as const) {
        const html = renderToStaticMarkup(createElement(CardFace, { card, size }));
        expect(html).toContain('class="cf-rule-text"');
        expect(html).toContain(w.blurb);
      }
      const chip = renderToStaticMarkup(createElement(CardChip, { card }));
      expect(chip).toContain(`title="${card.name}: ${w.blurb}"`);
    }
  });

  it('Home Hero names its track', () => {
    const card = rankUpCard('wild-home-hero:speed-power');
    expect(card.rule).toMatch(new RegExp(`^\\+${HOME_HERO_LEVELS} levels to every stat at .+\\.$`));
  });
});
