// #449: Season races have no Reset on purpose, so the header must not show ↺
// unless it is given a Reset handler (Quick Race passes one; the Season race
// in App.tsx does not). #778: the views are tabs in the masthead, and Skip to
// result shows only when a race offers it.
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import UniversalHeader from './UniversalHeader';

const base = { currentLap: 1, totalLaps: 10, sessionState: 'racing' as const, trackName: 'Speed + Power', elapsedTime: 0, activeView: 'track' as const, onViewChange: () => {}, onStart: () => {}, onStop: () => {} };

describe('race header Reset (#449)', () => {
  it('shows ↺ only when given onReset', () => {
    expect(renderToStaticMarkup(createElement(UniversalHeader, base))).not.toContain('uh-reset');
    expect(renderToStaticMarkup(createElement(UniversalHeader, { ...base, onReset: () => {} }))).toContain('uh-reset');
  });

  it('the Season race passes no onReset', () => {
    const app = readFileSync(join(__dirname, '../../App.tsx'), 'utf8');
    const start = app.indexOf('<WatchMode', app.indexOf('if (onSeasonRace) {'));
    const block = app.slice(start, app.indexOf('/>', start));
    expect(block).toContain('<WatchMode');
    expect(block).not.toContain('onReset');
  });
});

describe('the masthead (#778)', () => {
  it('shows the three views as tabs, the way out, and Skip only when offered', () => {
    const html = renderToStaticMarkup(createElement(UniversalHeader, { ...base, onExit: () => {}, exitLabel: 'Paddock', onSkip: () => {} }));
    expect(html).toContain('Track');
    expect(html).toContain('Detail');
    expect(html).toContain('Lap chart');
    expect(html).toContain('Paddock');
    expect(html).toContain('Skip to result');
    expect(renderToStaticMarkup(createElement(UniversalHeader, base))).not.toContain('Skip to result');
    expect(renderToStaticMarkup(createElement(UniversalHeader, { ...base, onSkip: () => {}, raceFinished: true }))).not.toContain('Skip to result');
  });
});
