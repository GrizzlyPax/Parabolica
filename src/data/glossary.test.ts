import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildGlossary, renderGlossaryMd } from './glossary';
import { version } from '../../package.json';

describe('docs/GLOSSARY.md is the source of truth', () => {
  it('matches the data modules (run `npm run glossary` when this fails)', () => {
    const onDisk = readFileSync(new URL('../../docs/GLOSSARY.md', import.meta.url), 'utf8');
    expect(onDisk).toBe(renderGlossaryMd(buildGlossary(), version));
  });
  it('every deck card and in-race effect has a name', () => {
    const g = buildGlossary();
    for (const c of g.deck) expect(c.name.length, c.id).toBeGreaterThan(0);
    for (const e of g.inRaceEffects) expect(e.text.length, e.id).toBeGreaterThan(0);
  });
});
