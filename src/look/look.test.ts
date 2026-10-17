// #705: the design system's geometry and themes. The sash is one centre
// curve (the band, pinstripes and wheels follow it); a step's theme sets the
// state's colours with ink from inkFor; the fonts are stored with the app.
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Sash } from './Look';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SASH_BOX, SASH_CURVE, bezierPoint, bezierTangent, sashGeometry, sashTextSpan, shifted, spokes } from './sash';
import { STATE_CODES, STEPS, STEP_IDS, programNumber, ribbonStep, stateLook, stepThemeVars } from './step';
import { DEFAULT_LOOK, US_PLACES, placeById } from '../data/states';
import { inkFor } from '../icons/ink';

describe('the sash: one centre curve', () => {
  it('the band and pinstripes are offsets of the centre; the wheels sit on it', () => {
    const g = sashGeometry();
    expect(g.box).toEqual(SASH_BOX);
    expect(g.centre).toBe('M20 58 C82 43 178 73 240 58');
    // The band: the top curve, down the right end, back along the bottom curve.
    expect(g.band).toBe('M20 38 C82 23 178 53 240 38 L240 78 C178 93 82 63 20 78 Z');
    expect(g.pins).toEqual(['M20 43 C82 28 178 58 240 43', 'M20 73 C82 58 178 88 240 73']);
    for (const [i, w] of g.wheels.entries()) {
      const t = i === 0 ? 0.07 : 0.93;
      const [x, y] = bezierPoint(SASH_CURVE, t);
      expect(w[0]).toBeCloseTo(x, 9); expect(w[1]).toBeCloseTo(y, 9);
    }
    expect(g.wheels[0][0]).toBeCloseTo(33.5, 0);
    expect(g.wheels[1][0]).toBeCloseTo(226.5, 0);
    expect(g.wheelR).toBe(10);
    // Everything stays inside the box at the default sizes.
    for (const [x, y] of g.wheels) { expect(x - g.wheelR).toBeGreaterThan(0); expect(y + g.wheelR).toBeLessThan(SASH_BOX.h); }
  });

  it('a different curve or band moves everything together', () => {
    const curve = shifted(SASH_CURVE, 10);
    const g = sashGeometry({ curve, band: 20, pin: 4, wheelAt: 0.1, wheelR: 6 });
    expect(g.centre).toBe('M20 68 C82 53 178 83 240 68');
    expect(g.band.startsWith('M20 58 ')).toBe(true);
    expect(g.pins[0].startsWith('M20 62 ')).toBe(true);
    expect(g.wheels[0]).toEqual(bezierPoint(curve, 0.1));
    expect(g.wheelAngles[0]).toBeCloseTo((Math.atan2(...[bezierTangent(curve, 0.1)[1], bezierTangent(curve, 0.1)[0]]) * 180) / Math.PI, 9);
    expect(spokes(10)).toHaveLength(8);
    expect(spokes(10)[0]).toEqual([10, 0]);
    expect(spokes(10)[2]).toEqual([0, 10]);
  });

  it('the words sit straight on the middle of the band, within the room between the wheels (#778)', () => {
    const g = sashGeometry();
    const span = sashTextSpan(g);
    expect(span.x).toBe(130); expect(span.y).toBe(58);
    expect(span.max).toBeCloseTo(g.wheels[1][0] - g.wheels[0][0] - 2 * g.wheelR - 16, 2);
    expect(span.max).toBeGreaterThan(150);
    // Drawn: a plain <text> at that point, never a textPath (a script's joins break on a curve).
    const out = renderToStaticMarkup(createElement(Sash, { text: 'Ace Fredericksburg' }));
    expect(out).not.toContain('textPath');
    expect(out).toContain('x="130"');
    expect(out).toContain('Ace Fredericksburg');
  });
});

describe('one theme per step', () => {
  it('five steps, ids as decided (nationals, not theNationals); ribbons take three looks', () => {
    expect(STEP_IDS).toEqual(['locals', 'state', 'nationals', 'globals', 'galacticals']);
    expect(STEPS.map(s => s.name)).toEqual(['Locals', 'State', 'Nationals', 'Globals', 'Galacticals']);
    expect(['locals', 'state', 'nationals', 'globals', 'galacticals'].map(s => ribbonStep(s as never))).toEqual(['locals', 'state', 'nationals', 'nationals', 'nationals']);
  });

  it('a state supplies its colours as vars; the ink is inkFor, never a guess; other steps set nothing inline', () => {
    expect(STATE_CODES).toHaveLength(52);
    expect(STATE_CODES).toEqual(US_PLACES.map(p => p.abbr));
    for (const code of STATE_CODES) {
      const s = stateLook(code);
      expect(s.ink).toBe(inkFor(s.primary));
      for (const c of [s.primary, s.secondary, s.accent]) expect(c).toMatch(/^#[0-9a-f]{6}$/i);
      expect(s.name).toBe(placeById(code)!.name);
    }
    // Every place wears its own look since #740; none falls back to the default.
    expect(stateLook('WY')).toMatchObject({ primary: placeById('WY')!.look!.primary, code: 'WY', name: 'Wyoming' });
    expect(STATE_CODES.filter(c => stateLook(c).primary === DEFAULT_LOOK.primary)).toEqual(['OH']);
    const oh = stateLook('OH');
    expect(stepThemeVars('state', oh)).toEqual({ '--ace-state-primary': oh.primary, '--ace-state-secondary': oh.secondary, '--ace-state-accent': oh.accent, '--ace-state-ink': oh.ink, '--ace-state-ground': oh.ground });
    const pale = stateLook('OH', { primary: '#f5f0e0' });
    expect(pale.ink).toBe(inkFor('#f5f0e0'));
    expect(pale.ink).not.toBe(oh.ink);
    expect(stepThemeVars('locals', oh)).toEqual({});
    expect(stepThemeVars('nationals')).toEqual({});
    expect(() => stateLook('ZZ')).toThrow(/no state/);
    expect(programNumber(0)).toBe(1); expect(programNumber(98)).toBe(99); expect(programNumber(99)).toBe(1); expect(programNumber(-5)).toBe(6);
  });

  it('the tokens map a state onto the accents only, and Locals onto black and white', () => {
    const css = readFileSync(join(__dirname, 'tokens.css'), 'utf8');
    const state = css.slice(css.indexOf("[data-step='state']"), css.indexOf("[data-step='nationals']"));
    expect(state).toContain('--ace-accent: var(--ace-state-primary)');
    expect(state).toContain('--ace-accent-ink: var(--ace-state-ink)');
    expect(state).toContain('--ace-sash-edge: var(--ace-state-primary)');
    expect(state).toContain('--ace-ground: var(--ace-state-ground, var(--ace-navy))');
    expect(state).not.toMatch(/--ace-paper:/); // the paper and the ink never change with a state
    const locals = css.slice(css.indexOf("[data-step='locals']"), css.indexOf("[data-step='state']"));
    expect(locals).toContain('--ace-accent: #3d3d3d');
    expect(locals).toContain('--ace-btn: var(--ace-paper)');
    for (const t of ['--ace-script:', '--ace-disp:', '--ace-cond:', '--ace-body:', '--ace-mono:', '--ace-gutter: 16px']) expect(css).toContain(t);
    expect(css).toContain("'Playball'");
  });

  it('the fonts are stored with the app, not loaded from Google Fonts', () => {
    const root = join(__dirname, '..', '..');
    const html = readFileSync(join(root, 'index.html'), 'utf8');
    expect(html).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com/);
    const fonts = readFileSync(join(__dirname, 'fonts.ts'), 'utf8');
    for (const pkg of ['alfa-slab-one', 'playball', 'oswald', 'old-standard-tt', 'special-elite']) {
      expect(fonts).toContain(`@fontsource/${pkg}/`);
      expect(existsSync(join(root, 'node_modules', '@fontsource', pkg, 'latin-400.css'))).toBe(true);
    }
  });
});
