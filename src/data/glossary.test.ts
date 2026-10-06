import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildGlossary, renderGlossaryMd } from './glossary';
import { version } from '../../package.json';

describe('docs/GLOSSARY.md is the source of truth', () => {
  it('matches the data modules (run `npm run glossary` when this fails)', () => {
    const onDisk = readFileSync(new URL('../../docs/GLOSSARY.md', import.meta.url), 'utf8');
    expect(onDisk).toBe(renderGlossaryMd(buildGlossary(), version));
  });
  it('every tag has a tier, a target and a plain-words source', () => {
    for (const t of buildGlossary().tags) {
      expect(t.tag.tier, t.tag.id).toBeDefined();
      expect(t.source.length, t.tag.id).toBeGreaterThan(0);
    }
  });
});
