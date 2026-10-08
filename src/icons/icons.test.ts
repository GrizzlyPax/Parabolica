import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  CARD_KIND_ICONS, ICONS, ICON_AUTHORS, MEANINGS, STAT_ICONS,
  iconBody, iconCredits, iconViewBox, resolveIcon, vendoredIconFiles,
} from './registry';
import { GameIcon, TeamLogo, inkFor, teamThemeVars } from './GameIcon';

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);
const doc = (p: string) => readFileSync(join(__dirname, '../../docs', p), 'utf8');
/** game-icons.net/1x1/<author>/<id>.html links in a doc line. */
const LINK = /game-icons\.net\/1x1\/([a-z0-9-]+)\/([a-z0-9-]+)\.html/;

describe('icon registry (#350, #351)', () => {
  it('every registered icon has a vendored SVG, and every vendored SVG is registered', () => {
    expect(ICONS.map(i => i.file).sort()).toEqual(vendoredIconFiles().sort());
    for (const i of ICONS) {
      expect(i.file, i.id).toBe(`${i.id}.svg`);
      expect(iconBody(i), i.id).toMatch(/<path/);
      expect(iconViewBox(i), i.id).toMatch(/^\d+ \d+ \d+ \d+$/);
      expect(ICON_AUTHORS[i.author], `${i.id} author`).toBeDefined();
    }
  });

  it('vendored SVGs are single-colour: currentColor, no background, no hard-coded colour', () => {
    for (const i of ICONS) {
      const svg = readFileSync(join(__dirname, '../assets/icons', i.file), 'utf8');
      expect(svg, i.id).toContain('="currentColor"');
      expect(svg, i.id).not.toMatch(/M0 0h(512|256)v(512|256)H0z/);
      expect(svg.replace(/xmlns="[^"]*"/, ''), `${i.id} has a hard colour`).not.toMatch(/#[0-9a-fA-F]{3,8}\b|(fill|stroke)="(?!currentColor|none)/);
      // Every shape draws in currentColor. A shape with no fill/stroke of its
      // own would inherit and paint over the glyph (the Badges disc bug).
      for (const shape of svg.match(/<(path|circle|rect|ellipse|polygon|polyline)\b[^>]*>/g) ?? []) {
        expect(shape, `${i.id}: shape without currentColor`).toMatch(/(fill|stroke)="currentColor"/);
      }
    }
  });

  it('the meaning map matches the approved table in docs/ICONS.md exactly', () => {
    const fromDoc: Record<string, { id: string; author: string }> = {};
    for (const line of doc('ICONS.md').split('\n')) {
      const m = /^\|\s*`([a-z_.]+)`\s*\|/.exec(line);
      const l = LINK.exec(line);
      if (m && l) fromDoc[m[1]] = { id: l[2], author: l[1] };
    }
    expect(Object.keys(fromDoc).length).toBe(60);
    expect(Object.fromEntries(Object.entries(fromDoc).map(([k, v]) => [k, v.id]))).toEqual(MEANINGS);
    for (const [meaning, { id, author }] of Object.entries(fromDoc)) {
      const entry = resolveIcon(meaning);
      expect(entry?.id, meaning).toBe(id);
      expect(entry?.author, `${meaning} author`).toBe(author);
    }
  });

  it('every team icon in docs/story/team-identity.md is vendored, by the right author', () => {
    // Only "The grid" (the 28 base-deck teams). Later sections list other
    // icons, e.g. the team-creator logo picker (#415), vendored separately.
    const md = doc('story/team-identity.md');
    const grid = md.slice(md.indexOf('## The grid'), md.indexOf('\n## ', md.indexOf('## The grid') + 1));
    const teams = grid.split('\n')
      .filter(l => /^\|\s*\*\*/.test(l) && LINK.test(l))
      .map(l => LINK.exec(l)!);
    expect(teams.length).toBe(28);
    for (const [, author, id] of teams) {
      const entry = resolveIcon(id);
      expect(entry?.id, id).toBe(id);
      expect(entry?.author, `${id} author`).toBe(author);
    }
  });

  it('every card stat and card kind has an icon', () => {
    for (const meaning of [...Object.values(STAT_ICONS), ...Object.values(CARD_KIND_ICONS)]) {
      expect(resolveIcon(meaning), meaning).toBeDefined();
    }
  });

  it('meanings resolve; raw ids resolve directly; unknowns do not', () => {
    expect(resolveIcon('race.crash')?.id).toBe('spiky-explosion');
    expect(resolveIcon('spiky-explosion')?.id).toBe('spiky-explosion');
    expect(resolveIcon('weather.hail')).toBeUndefined();
    expect(resolveIcon(undefined)).toBeUndefined();
  });

  it('credits list every vendored icon exactly once', () => {
    const credited = iconCredits().flatMap(c => c.icons).sort();
    expect(credited).toEqual(ICONS.map(i => i.id as string).sort());
  });
});

describe('<GameIcon> / <TeamLogo>', () => {
  it('renders a known meaning as an inline currentColor SVG at the asked size', () => {
    const out = html(createElement(GameIcon, { name: 'race.crash', size: 24 }));
    expect(out).toMatch(/^<svg/);
    expect(out).toContain('width="24"');
    expect(out).toContain('fill="currentColor"');
    expect(out).toContain('aria-hidden="true"');
  });

  it("uses each icon's own viewBox (Badges glyphs are cropped to 48 48 160 160)", () => {
    expect(html(createElement(GameIcon, { name: 'race.lead_change' }))).toContain('viewBox="48 48 160 160"');
    expect(html(createElement(GameIcon, { name: 'race.finish' }))).toContain('viewBox="0 0 512 512"');
  });

  it('falls back to the old emoji when a meaning has no icon yet; nothing without one', () => {
    expect(html(createElement(GameIcon, { name: 'weather.hail', fallback: '🌨️' }))).toContain('🌨️');
    expect(html(createElement(GameIcon, { name: 'weather.hail' }))).toBe('');
  });

  it('labels the icon when given a title', () => {
    expect(html(createElement(GameIcon, { name: 'ui.close', title: 'Close' }))).toContain('aria-label="Close"');
  });

  it('TeamLogo: icon on a primary-colour tile; emoji fallback', () => {
    const team = { name: 'Test', emoji: '🦆', color: '#112233' };
    const plain = html(createElement(TeamLogo, { team }));
    expect(plain).toContain('background:#112233');
    expect(plain).toContain('🦆');
    const iconned = html(createElement(TeamLogo, { team: { ...team, iconId: 'race-car' } }));
    expect(iconned).toContain('<svg');
  });

  it('theme vars: a team sets the theme; none stays neutral', () => {
    expect(teamThemeVars({ color: '#111111' })).toEqual({ '--team-primary': '#111111', '--team-ink': '#ffffff' });
    expect(teamThemeVars({ color: '#111111', ink: '#0b0b0c' })).toEqual({ '--team-primary': '#111111', '--team-ink': '#0b0b0c' });
    expect(teamThemeVars(null)).toEqual({});
  });

  it('ink: white on dark colours, near-black on light ones', () => {
    expect(inkFor('#0b0b0c')).toBe('#ffffff');
    expect(inkFor('#ffffff')).toBe('#0b0b0c');
    expect(inkFor('#f2c230')).toBe('#0b0b0c');
    expect(inkFor('#1e3a8a')).toBe('#ffffff');
    expect(inkFor('var(--x)')).toBe('#ffffff');
  });
});
