// #329: the card model + generated Motorsport base deck + applyCards.
import { describe, it, expect } from 'vitest';
import { MOTORSPORT_DECK, motorsportDeck, cardsBy, pickCard, slotsFor, METAL_LADDER, CARDS_BY_ID, DRIVER_STATS, CAR_STATS, TEAM_STATS } from './deck';
import { applyCards, cardPercents } from './apply';
import { DEFAULT_RARITY_ODDS, RARITIES } from './rarity';
import { mulberry32 } from '../engine/rng';
import type { Card, CardTarget, StatKey } from './types';

const byKind = (kind: Card['kind'], target?: CardTarget) => cardsBy({ kind, target }).length;

describe('Motorsport base deck', () => {
  it('has exactly 94 cards in the spec pools (slot traits cut, Oct 8)', () => {
    expect(MOTORSPORT_DECK).toHaveLength(94);
    expect(byKind('equipment')).toBe(20);
    expect(byKind('upgrade')).toBe(10);
    expect(byKind('facility')).toBe(6);
    expect(byKind('trait')).toBe(36);
    expect(byKind('trait', 'driver')).toBe(20);
    expect(byKind('trait', 'car')).toBe(10);
    expect(byKind('trait', 'team')).toBe(6);
    expect(byKind('effect')).toBe(22);
    expect(byKind('effect', 'driver')).toBe(12);
    expect(byKind('effect', 'car')).toBe(6);
    expect(byKind('effect', 'team')).toBe(4);
  });

  it('ids are unique and stable', () => {
    expect(new Set(MOTORSPORT_DECK.map(c => c.id)).size).toBe(94);
    expect(MOTORSPORT_DECK.map(c => c.id)).toEqual(motorsportDeck().map(c => c.id));
    for (const id of ['eq-bronze-speed', 'eq-gold-speed+consistency', 'eq-iridium-speed+acceleration+aggression', 'up-iridium-power+grip+reliability', 'fa-gold-tyre-management+pit-crew', 'tr-driver-silver-luck', 'tr-team-iridium-tyre-management+pit-crew', 'ef-pit-crew-down']) {
      expect(CARDS_BY_ID.get(id), id).toBeTruthy();
    }
    expect(CARDS_BY_ID.get('eq-gold-speed+consistency')!.name).toBe('Gold Speed + Consistency');
  });

  it('every card follows the ladder; gear and traits are upside only', () => {
    for (const c of MOTORSPORT_DECK) {
      if (c.kind === 'effect') {
        expect(c.rarity, c.id).toBeUndefined();
        expect(['up', 'down'], c.id).toContain(c.direction);
        continue;
      }
      const rung = METAL_LADDER[c.rarity!];
      expect(c.stats.every(s => s.pct === rung.pct), c.id).toBe(true);
      expect(c.stats.length, c.id).toBe(c.target === 'team' && c.rarity === 'iridium' ? 2 : rung.stats);
    }
  });

  it('each target only touches its own stats', () => {
    const own: Record<CardTarget, StatKey[]> = { driver: DRIVER_STATS, car: CAR_STATS, team: TEAM_STATS };
    for (const c of MOTORSPORT_DECK) for (const s of c.stats) expect(own[c.target], c.id).toContain(s.stat);
  });

  it('every stat appears evenly at gold and at iridium', () => {
    for (const kind of ['equipment', 'upgrade', 'facility', 'trait'] as const) {
      for (const target of ['driver', 'car', 'team'] as CardTarget[]) {
        for (const rarity of ['gold', 'iridium'] as const) {
          const cards = cardsBy({ kind, target, rarity });
          if (!cards.length) continue;
          const counts = new Map<StatKey, number>();
          for (const c of cards) for (const s of c.stats) counts.set(s.stat, (counts.get(s.stat) ?? 0) + 1);
          const stats = { driver: DRIVER_STATS, car: CAR_STATS, team: TEAM_STATS }[target];
          expect(stats.every(s => counts.has(s)), `${kind} ${target} ${rarity}`).toBe(true);
          expect(new Set(counts.values()).size, `${kind} ${target} ${rarity}`).toBe(1);
        }
      }
    }
  });

  it('every stat has a bronze and a silver card per gear and trait pool', () => {
    for (const s of [...DRIVER_STATS, ...CAR_STATS, ...TEAM_STATS]) {
      for (const r of ['bronze', 'silver'] as const) {
        expect(MOTORSPORT_DECK.filter(c => c.kind !== 'effect' && c.kind !== 'trait' && c.rarity === r && c.stats[0].stat === s), `${s} ${r} gear`).toHaveLength(1);
        expect(MOTORSPORT_DECK.filter(c => c.kind === 'trait' && c.rarity === r && c.stats[0].stat === s), `${s} ${r} trait`).toHaveLength(1);
      }
    }
  });
});

describe('applyCards', () => {
  const driver = { baseSpeed: 1, consistency: 0.5, luck: 0.6, acceleration: 1.1, endurance: 0.9, aggression: 0.4 };
  const car = { power: 3, grip: 4, reliability: 2 };
  const team = { tireManagement: 3, pitCrew: 5 };
  const card = (id: string) => CARDS_BY_ID.get(id)!;

  it('adds grade points within a stat (#335): pct × the stat span / 100 (hand-computed)', () => {
    // Gold Speed+Consistency (+10/+10) and Bronze Speed trait (+5): speed +15 grade = +0.045 on a 0.30 span,
    // consistency +10 grade = +0.05 on a 0.5 span.
    const out = applyCards({ driver }, [card('eq-gold-speed+consistency'), card('tr-driver-bronze-speed')]);
    expect(out.driver!.baseSpeed).toBeCloseTo(1.045, 10);
    expect(out.driver!.consistency).toBeCloseTo(0.55, 10);
    expect(out.driver!.luck).toBe(0.6);
  });

  it('car and team cards add stars: +10 grade = +0.4★ on the 1–5 scale', () => {
    const out = applyCards({ car, team }, [card('up-gold-power+grip'), card('fa-iridium-tyre-management+pit-crew')]);
    expect(out.car!.power).toBeCloseTo(3.4, 10);
    expect(out.car!.grip).toBeCloseTo(4.4, 10);
    expect(out.car!.reliability).toBe(2);
    expect(out.team!.tireManagement).toBeCloseTo(3.6, 10);
    expect(out.team!.pitCrew).toBeCloseTo(5.6, 10);
  });

  it('is pure and ignores effects (v0.6)', () => {
    const before = JSON.stringify({ driver, car, team });
    const a = applyCards({ driver, car, team }, [card('ef-speed-up'), card('eq-iridium-speed+acceleration+aggression')]);
    const b = applyCards({ driver, car, team }, [card('ef-speed-up'), card('eq-iridium-speed+acceleration+aggression')]);
    expect(JSON.stringify({ driver, car, team })).toBe(before);
    expect(a).toEqual(b);
    expect(cardPercents([card('ef-speed-up')])).toEqual({});
    expect(a.driver!.baseSpeed).toBeCloseTo(1.045, 10);
    expect(a.driver!.aggression).toBeCloseTo(0.475, 10);
  });

  it('no cards → the same stats', () => {
    expect(applyCards({ driver, car, team }, [])).toEqual({ driver, car, team });
  });
});

describe('pickCard / slotsFor', () => {
  it('uses exactly two rng() draws, hit or miss', () => {
    for (const pool of [cardsBy({ kind: 'trait', target: 'driver' }), [] as Card[]]) {
      let calls = 0;
      const base = mulberry32(1);
      const rng = () => { calls++; return base(); };
      pickCard(pool, DEFAULT_RARITY_ODDS, rng);
      expect(calls).toBe(2);
    }
  });

  it('same seed → same picks; metals land near the odds', () => {
    const pool = cardsBy({ kind: 'trait' });
    const run = (seed: number) => { const rng = mulberry32(seed); return Array.from({ length: 4000 }, () => pickCard(pool, DEFAULT_RARITY_ODDS, rng)!.id); };
    expect(run(7)).toEqual(run(7));
    const picks = run(7).map(id => CARDS_BY_ID.get(id)!.rarity!);
    const share = (r: string) => picks.filter(x => x === r).length / picks.length;
    expect(share('bronze')).toBeGreaterThan(0.55);
    expect(share('iridium')).toBeLessThan(0.03);
    expect(RARITIES.every(r => picks.includes(r))).toBe(true);
  });

  it('an empty metal falls to the commoner one', () => {
    const silverOnly = cardsBy({ kind: 'equipment', rarity: 'silver' });
    const rng = mulberry32(3);
    for (let i = 0; i < 50; i++) expect(pickCard(silverOnly, { bronze: 0, silver: 0, gold: 0, iridium: 1 }, rng)!.rarity).toBe('silver');
  });

  it('one slot of each kind in v0.5', () => {
    expect(slotsFor(cardsBy({ kind: 'trait' }))).toEqual({ equipment: 1, upgrade: 1, facility: 1 });
  });
});
