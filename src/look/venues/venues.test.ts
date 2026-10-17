// #778: the venues, drawn. Six kinds, one scene each; every deck track has
// one; the racing line is closed and starts at the line; the pit lane is a
// straight the map can walk; the scenery renders on paper.
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SceneDefs, VENUE_KINDS, sceneForKind, sceneForTrackId } from './scenes';
import { BASE_DECK_TRACKS } from '../../data/deckTracks';

describe('the venues, drawn (#778)', () => {
  it('six kinds, each with its own scene, line, lane and surface', () => {
    expect(VENUE_KINDS).toHaveLength(6);
    for (const kind of VENUE_KINDS) {
      const s = sceneForKind(kind)!;
      expect(s.kind).toBe(kind);
      expect(s.box).toEqual({ w: 600, h: 360 });
      expect(s.path.startsWith('M ')).toBe(true);
      expect(s.path.trim().endsWith('Z')).toBe(true);
      expect(s.pitLane).toMatch(/^M -?[\d.]+ -?[\d.]+ L -?[\d.]+ -?[\d.]+$/);
      expect(s.surface.width).toBeGreaterThan(10);
      expect(s.surface.fill).toMatch(/var\(--ace-|color-mix\(/);
      expect(s.dust).toMatch(/^var\(--ace-/);
    }
    expect(new Set(VENUE_KINDS.map(k => sceneForKind(k)!.path)).size).toBe(6);
    expect(sceneForKind('Moon')).toBeUndefined();
  });

  it('every deck track races on its kind\'s scene', () => {
    for (const t of BASE_DECK_TRACKS) expect(sceneForTrackId(t.id)?.kind).toBe(t.kind);
    expect(sceneForTrackId('nope')).toBeUndefined();
    expect(sceneForTrackId(undefined)).toBeUndefined();
  });

  it('the scenery draws on paper with the state and the title, in tokens', () => {
    const svg = (inner: unknown) => renderToStaticMarkup(createElement('svg', null, createElement(SceneDefs), inner as never));
    for (const kind of VENUE_KINDS) {
      const s = sceneForKind(kind)!;
      const out = svg(s.under({ stateName: 'Ohio', title: 'Ace Toledo' }));
      expect(out).toContain('OHIO');
      expect(out).toContain('Ace Toledo');
      expect(out).toContain('fill="var(--ace-paper)"');
      expect(out).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
      if (s.over) expect(svg(s.over({}))).toContain('<');
    }
  });
});
