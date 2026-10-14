// #647: the 60-card run deck. Counts, tags and metals as decided; every card
// priced to its metal's budget by the three bands; a half-race window card
// runs on the lap timer (first or second half) and never in the race-build
// sum; the eight curses are car / team, all bad; ids resolve in either deck.
import { describe, it, expect } from 'vitest';
import { RUN_DECK, RUN_CURSES, RUN_CARDS_BY_ID, METAL_BUDGET, PRICE_BAND, cardById, cardPrice, slug, CARDS_BY_ID, cardsBy, GEAR_KIND, applyCards, type CardTag, type CardTarget } from './index';
import { RARITIES } from './rarity';
import { newSeason, leagueForRound, poolFor, type SeasonFacts } from '../season/season';
import { quickDraft, draftState } from '../season/draft';
import { teamStamps } from '../season/stamps';
import { readStat } from '../season/grades';
import { windowLaps } from '../season/genesis';
import { CURRENT_TRACKS, getTrackById } from '../generators/tracks';
import RaceEngine from '../RaceEngine';
import { prepareScheduledRace } from '../league/settle';
import { CANON_VARIABLES } from '../simlab/types';

const count = <T,>(xs: readonly T[], f: (x: T) => boolean) => xs.filter(f).length;

describe('the run deck (#647)', () => {
  it('is 60 cards: four archetypes × 12 (5 / 4 / 2 / 1) + 12 Any-team (6 / 3 / 2 / 1) = 26 / 19 / 10 / 5, unique ids and names', () => {
    expect(RUN_DECK).toHaveLength(60);
    expect(new Set(RUN_DECK.map(c => c.id)).size).toBe(60);
    expect(new Set(RUN_DECK.map(c => c.name)).size).toBe(60);
    expect(RARITIES.map(r => count(RUN_DECK, c => c.rarity === r))).toEqual([26, 19, 10, 5]);
    for (const tag of ['qualifier', 'brawler', 'tyre-saver', 'glass-cannon'] as CardTag[]) {
      const own = RUN_DECK.filter(c => c.tag === tag);
      expect(own).toHaveLength(12);
      expect(RARITIES.map(r => count(own, c => c.rarity === r))).toEqual([5, 4, 2, 1]);
    }
    const any = RUN_DECK.filter(c => c.tag === 'any');
    expect(RARITIES.map(r => count(any, c => c.rarity === r))).toEqual([6, 3, 2, 1]);
    for (const c of RUN_DECK) {
      expect(c.deck).toBe('run');
      expect(c.id).toBe(`rd-${slug(c.name)}`);
      expect(c.stats.length).toBeGreaterThan(0);
      expect(['equipment', 'upgrade', 'facility', 'trait']).toContain(c.kind);
      if (c.kind !== 'trait') expect(GEAR_KIND[c.target]).toBe(c.kind);
      for (const s of c.stats) expect(Number.isInteger(s.pct / 5)).toBe(true); // whole levels
    }
    // Every place a pack can name has gear and a trait somewhere on the ladder.
    for (const target of ['driver', 'car', 'team'] as CardTarget[]) {
      expect(cardsBy({ kind: GEAR_KIND[target] }, RUN_DECK).length).toBeGreaterThan(0);
      expect(cardsBy({ kind: 'trait', target }, RUN_DECK).length).toBeGreaterThan(0);
    }
  });

  it('every card is priced to its metal\'s budget by the bands (king ×1, mid ×1.5, weak ×2, minuses too; a window halves it)', () => {
    expect(PRICE_BAND.baseSpeed).toBe(1); expect(PRICE_BAND.luck).toBe(1.5); expect(PRICE_BAND.grip).toBe(2);
    expect(METAL_BUDGET).toEqual({ bronze: 3, silver: 6, gold: 12, iridium: 27 });
    for (const c of RUN_DECK) expect(Math.abs(cardPrice(c) - METAL_BUDGET[c.rarity!]), `${c.name}: ${cardPrice(c)}`).toBeLessThanOrEqual(0.5);
    // A Bronze is +3 Speed, +5 Luck or +6 Grip.
    expect(RUN_CARDS_BY_ID.get('rd-visor-tear-offs')!.stats).toEqual([{ stat: 'baseSpeed', pct: 15 }]);
    expect(RUN_CARDS_BY_ID.get('rd-lucky-seven')!.stats).toEqual([{ stat: 'luck', pct: 25 }]);
    expect(RUN_CARDS_BY_ID.get('rd-stiffer-springs')!.stats).toEqual([{ stat: 'grip', pct: 30 }]);
    // Complexity by metal: a trade (a minus) is silver or better; windows are silver driver gear.
    for (const c of RUN_DECK) {
      if (c.stats.some(s => s.pct < 0)) expect(c.rarity).not.toBe('bronze');
      if (c.window) expect([c.rarity, c.kind, c.target, !!c.rule]).toEqual(['silver', 'equipment', 'driver', true]);
    }
    expect(RUN_DECK.filter(c => c.window).map(c => [c.id, c.window])).toEqual([['rd-lights-out', 'first'], ['rd-dive-bomb-helmet', 'first'], ['rd-second-wind', 'second']]);
  });

  it('eight named curses on the car or team, all bad, whole levels; ids resolve in either deck', () => {
    expect(RUN_CURSES).toHaveLength(8);
    expect(new Set(RUN_CURSES.map(c => c.id)).size).toBe(8);
    expect(RUN_CURSES.map(c => c.target)).toEqual(['car', 'car', 'car', 'car', 'team', 'team', 'team', 'team']);
    for (const c of RUN_CURSES) for (const s of c.stats) { expect(s.pct).toBeLessThan(0); expect(Number.isInteger(s.pct / 5)).toBe(true); }
    expect(cardById('rd-hothead')?.name).toBe('Hothead');
    expect(cardById('tr-driver-bronze-speed')).toBe(CARDS_BY_ID.get('tr-driver-bronze-speed'));
    expect(cardById('nope')).toBeUndefined();
  });

  it('a window card sits out of the race-build sum and runs as a lap effect over its half of the race', () => {
    const track = CURRENT_TRACKS[0];
    const seed = 647;
    const probe = newSeason({ seed, teamCount: 5, humans: [], calendar: [track.id] });
    const human = poolFor(probe).teams[0].id;
    let facts: SeasonFacts = newSeason({ seed, teamCount: 5, humans: [{ teamId: human, name: 'You', color: '#123456' }], calendar: [track.id] });
    facts = { ...facts, draftPicks: quickDraft(poolFor(facts)) };
    const [a] = draftState(poolFor(facts), facts.draftPicks).rosters[human].driverIds;
    const lightsOut = RUN_CARDS_BY_ID.get('rd-lights-out')!;
    const withCard: SeasonFacts = { ...facts, cardFacts: [{ type: 'parcel', round: 0, teamId: human, tier: 'uncommon', cardId: lightsOut.id, dealt: [lightsOut.id], holder: { kind: 'driver', id: a } }] };
    // Held as a stamp (+12 levels of Accel for the first half, as written), shown on the card, not in the sum.
    const held = teamStamps(withCard, human).drivers[a];
    expect(held.map(c => c.id)).toEqual([lightsOut.id]);
    expect(held[0].stats).toEqual([{ stat: 'acceleration', pct: 60 }]);
    expect(readStat('acceleration', 1, held).parts).toEqual([]);
    expect(applyCards({ driver: { acceleration: 1 } as never }, held).driver!.acceleration).toBe(1);
    // At race build: the static stats are unchanged, the lap effect covers the first half, the info says so.
    const plain = leagueForRound(facts, 0).roster.find(d => d.id === a)!;
    const me = leagueForRound(withCard, 0).roster.find(d => d.id === a)!;
    expect(me.stats).toEqual(plain.stats);
    const half = Math.ceil(track.laps / 2);
    expect(windowLaps('first', track.laps)).toEqual({ fromLap: 0, laps: half });
    expect(windowLaps('second', track.laps)).toEqual({ fromLap: half, laps: track.laps - half });
    expect(me.lapEffects).toEqual([{ id: lightsOut.id, name: 'Lights Out', emoji: '', fromLap: 0, laps: half, driver: { acceleration: 0.18 }, car: {}, team: {} }]);
    expect(me.effects).toContainEqual({ id: lightsOut.id, name: 'Lights Out', emoji: '', source: 'gear', left: 'first half' });
    expect(me.effects!.filter(e => e.id === lightsOut.id)).toHaveLength(1); // a stamp has no mileage (#704)
    // In the engine: +0.18 acceleration until the half, the base after; logged.
    const engine = RaceEngine.createForWorker();
    prepareScheduledRace(engine, leagueForRound(withCard, 0), 0, getTrackById(track.id)!, CANON_VARIABLES);
    engine.reset();
    const logged = engine.getFullEvents().length; // prepare's own ticks logged the window once already
    const d = () => engine.getDrivers().find(x => x.id === a)!;
    const base = plain.stats.acceleration;
    const seen = new Map<number, number>();
    for (let guard = 0; guard < 40000 && d().status !== 'finished' && d().status !== 'dnf'; guard++) {
      engine.fastForward(engine.getRaceState().totalTicks + 1);
      seen.set(d().currentLap, d().stats.acceleration);
    }
    // The driver may retire early: judge the laps seen.
    expect(seen.get(0)).toBeCloseTo(base + 0.18, 10);
    for (const [lap, acc] of seen) expect(acc, `lap ${lap}`).toBeCloseTo(lap < half ? base + 0.18 : base, 10);
    const log = engine.getFullEvents().slice(logged).filter(e => e.driverId === a && /Lights Out/.test(e.description) && (e.type === 'effect_applied' || e.type === 'effect_expired')).map(e => e.type);
    expect(log).toEqual(seen.has(half) ? ['effect_applied', 'effect_expired'] : ['effect_applied']);
  });
});
