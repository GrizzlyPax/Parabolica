// #704: stamps and Parcels. A Parcel is derived (seed + standings), its
// three stamps distinct and never a copy of one held; gifts are gold at
// least and never at Locals; a smudge is a one-race curse. The fold puts a
// stamp on the right card, scrapes one off a full card only when told which,
// and the title stamps read in the race build outside the slots.
import { describe, it, expect } from 'vitest';
import { newSeason, poolFor, leagueForRound, seasonState, setLineup, turnDone, type SeasonFacts } from './season';
import { quickDraft, draftState } from './draft';
import { CURRENT_TRACKS } from '../generators/tracks';
import {
  parcelFor, pendingParcel, openParcel, takeSmudge, teamStamps, seasonCardsFor, carriedStamps, titleStamp, stampById, parcelTierForRank,
  STAMP_SLOTS, PARCEL_SIZE, PARCEL_ODDS, TITLE_STAMP_LEVELS, GIFT_METAL, type ParcelFact, type StampHolder,
} from './stamps';
import { RUN_DECK, applyCards } from '../cards';
import { POINTS_PER_LEVEL } from './grades';
import { activeEffects } from './effects';
import { openParcelQuick } from './testHelpers';
import type { Step } from '../look/step';
import { carriedTeam } from '../run/run';
import type { CarriedCards } from './genesis';

/** The same season with your team carried in wearing `cards` (redrafted, as a run step is). */
function withCarry(facts: SeasonFacts, cards: CarriedCards): SeasonFacts {
  const carry = { ...carriedTeam(facts), cards };
  // The next step up: fresh ids start a stride higher, so the carried team's don't collide (as a run promotes).
  const next: SeasonFacts = { ...facts, setup: { ...facts.setup, carry, league: { ...facts.setup.league!, index: facts.setup.league!.index + 1 } } };
  return { ...next, draftPicks: quickDraft(poolFor(next)) };
}

function paddock(seed: number, step: Step = 'state'): { facts: SeasonFacts; you: string; drivers: number[] } {
  const probe = newSeason({ seed, teamCount: 5, humans: [], calendar: CURRENT_TRACKS.slice(0, 3).map(t => t.id), league: { index: 1, step, name: 'State', fieldShift: 0, nemesisShift: 0, bossRound: 2 } });
  const you = poolFor(probe).teams[0].id;
  let facts = newSeason({ seed, teamCount: 5, humans: [{ teamId: you, name: 'You', color: '#123456' }], calendar: CURRENT_TRACKS.slice(0, 3).map(t => t.id), league: { index: 1, step, name: 'State', fieldShift: 0, nemesisShift: 0, bossRound: 2 } });
  facts = { ...facts, draftPicks: quickDraft(poolFor(facts)) };
  return { facts, you, drivers: draftState(poolFor(facts), facts.draftPicks).rosters[you].driverIds };
}
const fact = (facts: SeasonFacts, you: string, cardId: string | null, holder?: StampHolder, replaces?: string): ParcelFact => {
  const p = parcelFor(facts, 0, you)!;
  return { type: 'parcel', round: 0, teamId: you, tier: p.tier, gift: p.kind === 'gift' || undefined, dealt: p.cards.map(c => c.id), cardId, holder, replaces };
};

describe('the Parcel', () => {
  it('is derived: three distinct run-deck stamps, the same twice, Uncommon in round 1, by table position after', () => {
    const { facts, you } = paddock(1);
    const p = parcelFor(facts, 0, you)!;
    expect(p).toEqual(parcelFor(facts, 0, you));
    expect(p.tier).toBe('uncommon');
    expect(p.kind === 'smudged' || p.cards.length === PARCEL_SIZE).toBe(true);
    if (p.kind !== 'smudged') {
      expect(new Set(p.cards.map(c => c.id)).size).toBe(PARCEL_SIZE);
      expect(p.cards.every(c => RUN_DECK.some(r => r.id === c.id))).toBe(true);
    }
    expect(parcelFor(facts, 0, poolFor(facts).teams[1].id)).toBeNull(); // rivals get none
    expect([1, 2, 3, 4, 5].map(r => parcelTierForRank(r, 5))).toEqual(['common', 'common', 'uncommon', 'rare', 'legendary']);
  });

  it('about one in ten is a Watcher gift (gold at least), one in ten smudged (a one-race curse); no gifts at Locals', () => {
    const { facts, you } = paddock(2);
    const kinds = { plain: 0, gift: 0, smudged: 0 };
    for (let round = 0; round < 400; round++) {
      const p = parcelFor({ ...facts, setup: { ...facts.setup, seed: 1000 + round } }, 0, you)!;
      kinds[p.kind]++;
      if (p.kind === 'gift') expect(p.cards.every(c => c.rarity === 'gold' || c.rarity === 'iridium')).toBe(true);
      if (p.kind === 'smudged') expect(p.smudge).toMatchObject({ source: 'curse', timer: { races: 1 }, round: 0, teamId: you });
    }
    expect(kinds.gift / 400).toBeGreaterThan(PARCEL_ODDS.gift / 100 - 0.05);
    expect(kinds.gift / 400).toBeLessThan(PARCEL_ODDS.gift / 100 + 0.05);
    expect(kinds.smudged / 400).toBeGreaterThan(PARCEL_ODDS.smudge / 100 - 0.05);
    expect(GIFT_METAL.bronze + GIFT_METAL.silver).toBe(0);
    const locals = paddock(2, 'locals');
    for (let round = 0; round < 200; round++) expect(parcelFor({ ...locals.facts, setup: { ...locals.facts.setup, seed: 1000 + round } }, 0, locals.you)!.kind).not.toBe('gift');
  });

  it('never deals a copy of a stamp the team holds', () => {
    const { facts, you, drivers } = paddock(3);
    let held: string[] = [];
    let f = facts;
    for (let i = 0; i < 6; i++) {
      const seeded = { ...f, setup: { ...f.setup, seed: 50 + i } };
      const p = parcelFor(seeded, 0, you)!;
      if (p.kind === 'smudged') continue;
      for (const c of p.cards) expect(held).not.toContain(c.id);
      held = [...held, p.cards[0].id];
      f = withCarry(facts, { drivers: { [drivers[0]]: held.filter(id => stampById(id)!.target === 'driver') }, car: held.filter(id => stampById(id)!.target !== 'driver'), titles: {} });
    }
  });
});

describe('stamps on the cards', () => {
  it('a stamp goes on its card for good; the car card takes car and garage stamps; the turn waits for the Parcel', () => {
    const { facts, you, drivers } = paddock(4);
    const p = parcelFor(facts, 0, you)!;
    if (p.kind === 'smudged') return;
    const c = p.cards[0];
    const holder: StampHolder = c.target === 'driver' ? { kind: 'driver', id: drivers[0] } : { kind: 'car' };
    const wrong: StampHolder = c.target === 'driver' ? { kind: 'car' } : { kind: 'driver', id: drivers[0] };
    expect(() => openParcel(facts, fact(facts, you, c.id, wrong))).toThrow(/does not go on/);
    expect(() => openParcel(facts, fact(facts, you, 'rd-nope', holder))).toThrow(/not in the Parcel/);
    expect(() => openParcel(facts, fact(facts, you, c.id))).toThrow(/where the stamp goes/);
    const next = openParcel(facts, fact(facts, you, c.id, holder));
    const s = teamStamps(next, you);
    expect((holder.kind === 'driver' ? s.drivers[drivers[0]] : s.car).map(x => x.id)).toEqual([c.id]);
    expect(() => openParcel(next, fact(next, you, c.id, holder))).toThrow(/already open/);
    expect(turnDone(next, 0, you)).toBe(false);
    const lined = setLineup(next, { round: 0, teamId: you, driverIds: [drivers[0], drivers[1]] });
    expect(turnDone(lined, 0, you)).toBe(true);
    expect(seasonState(lined).phase).toBe('ready-for-go');
    // The race build reads it where it applies.
    const cards = seasonCardsFor(next, 0);
    if (c.target === 'driver') expect(cards.driver![drivers[0]].map(x => x.id)).toEqual([c.id]);
    else if (c.target === 'car') expect(Object.values(cards.car!)[0].map(x => x.id)).toEqual([c.id]);
    else expect(cards.team![you].map(x => x.id)).toEqual([c.id]);
  });

  it('a box left shut keeps nothing; a full card scrapes a named stamp off, never silently', () => {
    const { facts, you, drivers } = paddock(5);
    const p = parcelFor(facts, 0, you)!;
    if (p.kind === 'smudged') return;
    expect(() => openParcel(facts, fact(facts, you, null, { kind: 'car' }))).toThrow(/left in the box/);
    const shut = openParcel(facts, fact(facts, you, null));
    expect(teamStamps(shut, you)).toEqual(teamStamps(facts, you));
    // Four driver stamps carried in: the fifth needs a scrape.
    const driverStamps = RUN_DECK.filter(c => c.target === 'driver').slice(0, STAMP_SLOTS.driver).map(c => c.id);
    const full = withCarry(facts, { drivers: { [drivers[0]]: driverStamps }, car: [], titles: {} });
    const incoming = parcelFor(full, 0, you)!;
    if (incoming.kind === 'smudged') return;
    const c = incoming.cards.find(x => x.target === 'driver');
    if (!c) return;
    const on = (replaces?: string): ParcelFact => ({ ...fact(full, you, c.id, { kind: 'driver', id: drivers[0] }, replaces), dealt: incoming.cards.map(x => x.id), tier: incoming.tier, gift: incoming.kind === 'gift' || undefined });
    expect(() => openParcel(full, on())).toThrow(/full; name the stamp/);
    expect(() => openParcel(full, on('rd-nope'))).toThrow(/not on that card/);
    const scraped = openParcel(full, on(driverStamps[1]));
    expect(teamStamps(scraped, you).drivers[drivers[0]].map(x => x.id)).toEqual([driverStamps[0], driverStamps[2], driverStamps[3], c.id]);
    expect(() => openParcel(facts, { ...fact(facts, you, p.cards[0].id, p.cards[0].target === 'driver' ? { kind: 'driver', id: drivers[0] } : { kind: 'car' }, 'rd-x') })).toThrow(/nothing to scrape/);
  });

  it('a smudge is taken as a one-race effect on the car or the garage', () => {
    for (let seed = 10; seed < 400; seed++) {
      const { facts, you } = paddock(seed);
      const p = parcelFor(facts, 0, you)!;
      if (p.kind !== 'smudged') continue;
      expect(() => openParcel(facts, { type: 'parcel', round: 0, teamId: you, tier: p.tier, dealt: [], cardId: null })).toThrow(/smudged/);
      const next = takeSmudge(facts, { type: 'smudge', round: 0, teamId: you, effectId: p.smudge!.id });
      expect(activeEffects(next, you, 0).map(e => [e.id, e.left])).toEqual([[p.smudge!.id, 1]]);
      expect(activeEffects(next, you, 1)).toEqual([]);
      expect(pendingParcel(next)).toBeNull();
      return;
    }
    throw new Error('no smudged seed');
  });

  it('a title stamp is +6 levels on its stat, outside the slots, and reads in the race build', () => {
    const { facts, you, drivers } = paddock(6);
    const t = titleStamp('locals', 'aggression');
    expect(t.stats).toEqual([{ stat: 'aggression', pct: TITLE_STAMP_LEVELS * POINTS_PER_LEVEL }]);
    expect(stampById(t.id)).toEqual(t);
    const driverStamps = RUN_DECK.filter(c => c.target === 'driver').slice(0, STAMP_SLOTS.driver).map(c => c.id);
    const titled = withCarry(facts, { drivers: { [drivers[0]]: driverStamps }, car: [], titles: { [drivers[0]]: [t.id] } });
    const carry = titled.setup.carry!;
    const s = teamStamps(titled, you);
    expect(s.drivers[drivers[0]]).toHaveLength(STAMP_SLOTS.driver);
    expect(s.titles[drivers[0]].map(c => c.id)).toEqual([t.id]);
    expect(carriedStamps(s).titles).toEqual({ [drivers[0]]: [t.id], [drivers[1]]: [] });
    const d = poolFor(titled).drivers.find(x => x.id === drivers[0])!;
    const built = leagueForRound(titled, 0).roster.find(r => r.id === drivers[0])!;
    const plain = leagueForRound({ ...titled, setup: { ...titled.setup, carry: { ...carry, cards: { ...carry.cards, titles: {} } } } }, 0).roster.find(r => r.id === drivers[0])!;
    expect(built.stats.aggression).toBeCloseTo(applyCards({ driver: plain.stats, car: built.carStats!, team: built.teamStats! }, [t]).driver!.aggression, 6);
    expect(built.stats.aggression).toBeGreaterThan(d.stats.aggression);
  });

  it('the quick path plays a season through its Parcels', () => {
    const { facts, drivers, you } = paddock(7);
    let f = facts;
    while (seasonState(f).phase === 'paddock') f = openParcelQuick(setLineup(f, { round: seasonState(f).round, teamId: you, driverIds: [drivers[0], drivers[1]] }));
    expect(seasonState(f).phase).toBe('ready-for-go');
    expect(f.cardFacts).toHaveLength(1);
  });
});
