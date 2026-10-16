// #701: moving saves from playparabolica.com to playaceamerica.com in one tap.
import { describe, it, expect } from 'vitest';
import { carryLink, collectSaves, importCarry, onOldDomain } from './carry';

function store(init: Record<string, string> = {}) {
  const m = new Map(Object.entries(init));
  return {
    get length() { return m.size; },
    key: (i: number) => [...m.keys()][i] ?? null,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    map: m,
  };
}

describe('the save move (#701)', () => {
  it('offers the move only on the old domain', () => {
    expect(onOldDomain('playparabolica.com')).toBe(true);
    expect(onOldDomain('www.playparabolica.com')).toBe(true);
    expect(onOldDomain('playaceamerica.com')).toBe(false);
    expect(onOldDomain('localhost')).toBe(false);
  });

  it('carries every parabolica.* save, unicode and all, and nothing else', () => {
    const old = store({ 'parabolica.run.v1': '{"garage":"Mabel’s Garage ★"}', 'parabolica.meta.v1': '{"u":1}', 'other.key': 'x' });
    const saves = collectSaves(old);
    expect(Object.keys(saves).sort()).toEqual(['parabolica.meta.v1', 'parabolica.run.v1']);
    const link = carryLink(saves, 'https://playaceamerica.com');
    expect(link.startsWith('https://playaceamerica.com/#carry=')).toBe(true);
    const fresh = store();
    expect(importCarry(link.slice(link.indexOf('#')), fresh)).toBe(2);
    expect(fresh.getItem('parabolica.run.v1')).toBe('{"garage":"Mabel’s Garage ★"}');
    expect(fresh.getItem('other.key')).toBeNull();
  });

  it('never overwrites a save the new domain already has; a broken link writes nothing', () => {
    const link = carryLink({ 'parabolica.run.v1': 'old' }, 'https://x');
    const there = store({ 'parabolica.run.v1': 'new' });
    expect(importCarry(link.slice(link.indexOf('#')), there)).toBe(0);
    expect(there.getItem('parabolica.run.v1')).toBe('new');
    expect(importCarry('#carry=%%%', store())).toBeNull();
    expect(importCarry('#/season/run', store())).toBeNull();
  });
});
