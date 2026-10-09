// The look (#323, docs/ICONS.md): screens outside the race view take every
// colour from tokens, so the team theme re-colours them at once. A hex or
// rgba() in these files is a colour the theme can't reach.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const THEMED = [
  'MainMenu.css',
  'RunSetup.css',
  'Glossary.css',
  'racecontrol/RaceControl.css',
  'fantasy/Fantasy.css',
  'IdeaBox.css',
  'components/Tooltip.css',
  'cards/CardSheet.css',
  'cards/CardFace.css',
  'cards/CardChip.css',
  'season/ui/Season.css',
];

// Race rendering inside a themed file stays with Apex (#381) until it moves.
const RACE_BLOCKS: Record<string, [string, string]> = {
};

const COLOUR = /#[0-9a-fA-F]{3,8}\b|rgba?\(/;

function themedCss(file: string): string {
  let css = readFileSync(join(__dirname, '..', file), 'utf8');
  const block = RACE_BLOCKS[file];
  if (block) {
    const a = css.indexOf(block[0]);
    const b = css.indexOf(block[1]);
    if (a >= 0 && b > a) css = css.slice(0, a) + css.slice(b);
  }
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

describe('The look: themed screens use tokens only', () => {
  for (const file of THEMED) {
    it(`${file} has no hard-coded colours`, () => {
      const bad = themedCss(file).split('\n').filter(l => COLOUR.test(l));
      expect(bad).toEqual([]);
    });
  }

  it('the root defines the theme tokens', () => {
    const root = readFileSync(join(__dirname, '..', 'App.css'), 'utf8');
    for (const t of ['--team-primary', '--team-ink', '--signal-red', '--signal-green', '--rarity-bronze', '--rarity-iridium', '--look-display', '--look-serif', '--look-data']) {
      expect(root).toContain(`${t}:`);
    }
  });
});
