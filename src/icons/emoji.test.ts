// Emoji sweep (#352, #397, docs/ICONS.md): UI code draws game-icons, never
// emoji, race view included. Content emoji still come from data fields
// (tracks, weather, old teams, tags, engine event strings) until their
// replacements land, so this scans source for emoji *literals* only.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = join(__dirname, '..');

// The feed's persona voices are UI too (the Booth, Mister Marbles, the Track).
const EXTRA = ['feed/commentary.ts'];

const EMOJI = /\p{Extended_Pictographic}/u;

function uiFiles(): string[] {
  return (readdirSync(SRC, { recursive: true }) as string[])
    .map(f => f.split('\\').join('/'))
    .filter(f => (f.endsWith('.tsx') || EXTRA.includes(f)) && !f.includes('.test.'));
}

function withoutComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('Emoji sweep: the UI uses game-icons (race view included, #397)', () => {
  const files = uiFiles();

  it('finds the UI files', () => {
    expect(files).toContain('MainMenu.tsx');
    expect(files).toContain('league/ui/LeagueScreen.tsx');
    expect(files).toContain('WatchMode.tsx');
    expect(files).toContain('components/race/TrackMap.tsx');
    expect(files).toContain('feed/commentary.ts');
  });

  for (const file of files) {
    it(`${file} has no emoji literals`, () => {
      const code = withoutComments(readFileSync(join(SRC, file), 'utf8'));
      const hits = code.split('\n').filter(l => EMOJI.test(l.replace(/[©®™]/g, ''))).map(l => l.trim());
      expect(hits, relative(SRC, join(SRC, file))).toEqual([]);
    });
  }
});
