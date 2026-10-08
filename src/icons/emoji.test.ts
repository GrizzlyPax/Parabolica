// Emoji sweep (#352, docs/ICONS.md): UI code outside the race view draws
// game-icons, never emoji. Content emoji still come from data fields
// (tracks, weather, old teams, gods) until their replacements land, so this
// scans component source for emoji *literals* only. The race view joins the
// list in #397.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = join(__dirname, '..');

// The race view keeps its emoji until #397 (after Apex's race colours, #381).
const RACE_VIEW = [/^components\/race\//, /^WatchMode\.tsx$/, /^RaceStartCountdown\.tsx$/];

const EMOJI = /\p{Extended_Pictographic}/u;

function uiFiles(): string[] {
  return (readdirSync(SRC, { recursive: true }) as string[])
    .map(f => f.split('\\').join('/'))
    .filter(f => f.endsWith('.tsx') && !f.includes('.test.'))
    .filter(f => !RACE_VIEW.some(re => re.test(f)));
}

function withoutComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('Emoji sweep: UI outside the race view uses game-icons', () => {
  const files = uiFiles();

  it('finds the UI files', () => {
    expect(files).toContain('MainMenu.tsx');
    expect(files).toContain('league/ui/LeagueScreen.tsx');
    expect(files.some(f => f.startsWith('components/race/'))).toBe(false);
  });

  for (const file of files) {
    it(`${file} has no emoji literals`, () => {
      const code = withoutComments(readFileSync(join(SRC, file), 'utf8'));
      const hits = code.split('\n').filter(l => EMOJI.test(l.replace(/[©®™]/g, ''))).map(l => l.trim());
      expect(hits, relative(SRC, join(SRC, file))).toEqual([]);
    });
  }
});
