// #716: the race view's look stays inside .ace-race (WatchMode's StepTheme),
// so nothing here leaks onto other screens; its colours are tokens only
// (icons/theme.test.ts covers that).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('the race view in the race program (#716)', () => {
  it('every rule in race.css is scoped to .ace-race', () => {
    const css = readFileSync(join(__dirname, 'race.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const selectors = css.split('}').flatMap(block => {
      const head = block.split('{')[0].trim();
      if (!head || head.startsWith('@')) return block.includes('{') ? [block.slice(block.indexOf('{') + 1).split('{')[0].trim()].filter(Boolean) : [];
      return head.split(',').map(s => s.trim()).filter(Boolean);
    });
    expect(selectors.length).toBeGreaterThan(40);
    for (const s of selectors) expect(s, s).toContain('.ace-race');
  });
});
