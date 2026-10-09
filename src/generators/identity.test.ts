import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../engine/rng';
import { generateDriverName, NAME_TIER_WEIGHTS, NameTier, ABSURD_FIRST_NAMES, ABSURD_LAST_NAMES, INTL_FIRST_NAMES, INTL_LAST_NAMES, ONE_WORD_CHANCE } from './names';
import { generateLeagueName, leagueNameForSeed, LEAGUE_ADJECTIVES, LEAGUE_NOUNS } from './leagueName';
import { generateTeamIdentities, teamIdentitiesForSeed } from './teamIdentity';

describe('driver names (#191)', () => {
  it('is deterministic from the seed', () => {
    const a = mulberry32(123);
    const b = mulberry32(123);
    for (let i = 0; i < 50; i++) {
      expect(generateDriverName(a).fullName).toBe(generateDriverName(b).fullName);
    }
  });

  it('tier weights come out within tolerance over many draws', () => {
    const rng = mulberry32(7);
    const counts: Record<NameTier, number> = { international: 0, hybrid: 0, absurd: 0, corrupted: 0 };
    const N = 50000;
    for (let i = 0; i < N; i++) counts[generateDriverName(rng).tier]++;
    for (const tier of Object.keys(counts) as NameTier[]) {
      const actual = counts[tier] / N;
      expect(Math.abs(actual - NAME_TIER_WEIGHTS[tier])).toBeLessThan(0.02);
    }
    // International must dominate; corrupted must stay genuinely rare.
    expect(counts.international / N).toBeGreaterThan(0.6);
    expect(counts.corrupted / N).toBeLessThan(0.04);
  });

  it('one-word names (~1%, any tier but corrupted) have no last name and a clean short name', () => {
    const rng = mulberry32(99);
    let oneWord = 0;
    const N = 40000;
    for (let i = 0; i < N; i++) {
      const n = generateDriverName(rng);
      if (!n.oneWord) continue;
      oneWord++;
      expect(n.isCorrupted).toBe(false);
      expect(n.lastName).toBe('');
      expect(n.fullName).toBe(n.firstName);
      expect(n.shortName).toBe(n.firstName.length > 10 ? n.firstName.slice(0, 10) : n.firstName);
    }
    expect(Math.abs(oneWord / N - ONE_WORD_CHANCE * 0.98)).toBeLessThan(0.003);
  });

  it('hybrid names put one absurd half on a real name, either way round', () => {
    const rng = mulberry32(31);
    let absurdFirst = 0, absurdLast = 0;
    for (let i = 0; i < 20000; i++) {
      const n = generateDriverName(rng);
      if (n.tier !== 'hybrid' || n.oneWord) continue;
      if (ABSURD_FIRST_NAMES.includes(n.firstName) && INTL_LAST_NAMES.includes(n.lastName)) absurdFirst++;
      else if (INTL_FIRST_NAMES.includes(n.firstName) && ABSURD_LAST_NAMES.includes(n.lastName)) absurdLast++;
      else throw new Error(`not a hybrid: ${n.fullName}`);
    }
    expect(absurdFirst / (absurdFirst + absurdLast)).toBeGreaterThan(0.45);
    expect(absurdFirst / (absurdFirst + absurdLast)).toBeLessThan(0.55);
  });

  it('no name ever produces an "undefined" short name (the mononym bug guard)', () => {
    const rng = mulberry32(555);
    for (let i = 0; i < 5000; i++) {
      const n = generateDriverName(rng);
      expect(n.shortName).not.toContain('undefined');
      expect(n.shortName.length).toBeGreaterThan(0);
    }
  });

  it('corrupted names are flagged, rare, and actually altered', () => {
    const rng = mulberry32(2026);
    let corrupted = 0;
    for (let i = 0; i < 5000; i++) {
      const n = generateDriverName(rng);
      if (!n.isCorrupted) continue;
      corrupted++;
      expect(n.fullName.length).toBeGreaterThan(0);
      // A corrupted name should not be a clean ASCII-only string.
      expect(/^[\x20-\x7E]*$/.test(n.fullName)).toBe(false);
    }
    expect(corrupted).toBeGreaterThan(0);
  });
});

describe('league names (#185)', () => {
  it('matches the "The [Adjective] [Noun]" template', () => {
    const rng = mulberry32(1);
    for (let i = 0; i < 200; i++) {
      const name = generateLeagueName(rng);
      expect(name.startsWith('The ')).toBe(true);
      const rest = name.slice(4);
      const adj = LEAGUE_ADJECTIVES.find(a => rest.startsWith(a + ' '));
      expect(adj, name).toBeTruthy();
      const noun = rest.slice(adj!.length + 1);
      expect(LEAGUE_NOUNS).toContain(noun);
    }
  });

  it('is deterministic from a league seed', () => {
    expect(leagueNameForSeed(424242)).toBe(leagueNameForSeed(424242));
    // Different seeds should usually differ (sanity, not a guarantee per-seed).
    const names = new Set(Array.from({ length: 50 }, (_, i) => leagueNameForSeed(i * 7919)));
    expect(names.size).toBeGreaterThan(20);
  });
});

describe('team identity (#183)', () => {
  it('produces the right count, distinct emojis, and valid hex colors', () => {
    const ids = generateTeamIdentities(mulberry32(11), 11);
    expect(ids).toHaveLength(11);
    expect(new Set(ids.map(i => i.emoji)).size).toBe(11); // no repeats across the grid
    for (const id of ids) {
      expect(id.color).toMatch(/^#[0-9a-f]{6}$/);
      expect(['#ffffff', '#0b0b0c']).toContain(id.ink);
    }
  });

  it('spaces hues so no two teams read as the same color', () => {
    const ids = teamIdentitiesForSeed(98765, 11);
    const hue = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
      if (d === 0) return 0;
      let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h *= 60; return (h + 360) % 360;
    };
    const hues = ids.map(i => hue(i.color)).sort((a, b) => a - b);
    // Smallest circular gap between adjacent hues should be comfortably > 0.
    let minGap = 360;
    for (let i = 0; i < hues.length; i++) {
      const next = hues[(i + 1) % hues.length];
      let gap = next - hues[i];
      if (i === hues.length - 1) gap = next + 360 - hues[i];
      minGap = Math.min(minGap, gap);
    }
    expect(minGap).toBeGreaterThan(8); // no near-identical hues in the field
  });

  it('is deterministic from a league seed', () => {
    expect(teamIdentitiesForSeed(321, 11)).toEqual(teamIdentitiesForSeed(321, 11));
  });
});
