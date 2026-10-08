import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ICONS, ICON_AUTHORS, MEANINGS, iconBody, iconCredits, resolveIcon, vendoredIconFiles } from './registry';
import { GameIcon, TeamLogo, teamThemeVars } from './GameIcon';

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);

describe('icon registry (#350)', () => {
  it('every registered icon has a vendored SVG, and every vendored SVG is registered', () => {
    const files = vendoredIconFiles().sort();
    expect(ICONS.map(i => i.file).sort()).toEqual(files);
    for (const i of ICONS) {
      expect(i.file, i.id).toBe(`${i.id}.svg`);
      expect(iconBody(i), i.id).toMatch(/<path/);
      expect(ICON_AUTHORS[i.author], `${i.id} author`).toBeDefined();
    }
  });

  it('vendored SVGs are single-colour: currentColor, no background, no hard-coded colour', () => {
    for (const i of ICONS) {
      const svg = readFileSync(join(__dirname, '../assets/icons', i.file), 'utf8');
      expect(svg, i.id).toContain('fill="currentColor"');
      expect(svg, i.id).not.toContain('M0 0h512v512H0z');
      expect(svg.replace(/xmlns="[^"]*"/, ''), `${i.id} has a hex colour`).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });

  it('every meaning points at a registered icon; ids resolve directly too', () => {
    for (const [meaning, id] of Object.entries(MEANINGS)) expect(resolveIcon(meaning)?.id, meaning).toBe(id);
    expect(resolveIcon('raining')?.id).toBe('raining');
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
    const out = html(createElement(GameIcon, { name: 'weather.rain', size: 24 }));
    expect(out).toMatch(/^<svg/);
    expect(out).toContain('width="24"');
    expect(out).toContain('fill="currentColor"');
    expect(out).toContain('aria-hidden="true"');
  });

  it('falls back to the old emoji when a meaning has no icon yet; nothing without one', () => {
    expect(html(createElement(GameIcon, { name: 'weather.hail', fallback: '🌨️' }))).toContain('🌨️');
    expect(html(createElement(GameIcon, { name: 'weather.hail' }))).toBe('');
  });

  it('labels the icon when given a title', () => {
    expect(html(createElement(GameIcon, { name: 'ui.close', title: 'Close' }))).toContain('aria-label="Close"');
  });

  it('TeamLogo: secondary-colour icon on a primary-colour tile; emoji fallback', () => {
    const team = { name: 'Test', emoji: '🦆', color: '#112233', accentColor: '#445566' };
    const plain = html(createElement(TeamLogo, { team }));
    expect(plain).toContain('background:#112233');
    expect(plain).toContain('color:#445566');
    expect(plain).toContain('🦆');
    const iconned = html(createElement(TeamLogo, { team: { ...team, secondaryColor: '#778899', iconId: 'race-car' } }));
    expect(iconned).toContain('color:#778899');
    expect(iconned).toContain('<svg');
  });

  it('theme vars: a team sets --team-primary/secondary; none stays neutral', () => {
    expect(teamThemeVars({ color: '#111111', accentColor: '#222222' })).toEqual({ '--team-primary': '#111111', '--team-secondary': '#222222' });
    expect(teamThemeVars(null)).toEqual({});
  });
});
